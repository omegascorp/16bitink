import type { AlarmState } from '../bots/alarm';
import { createBrain, type Brain } from '../bots/brain';
import { botInput } from '../bots/control';
import { CH1_BOTS, PLAYER_BOT, type Difficulty } from '../bots/difficulty';
import { segmentHits } from '../geom';
import { buildLand, type Land } from '../land';
import type { LoadedLevel, ResolvedEnemy } from '../level/load';
import { rollCrate } from '../loot';
import { FlowCache } from '../nav/flow';
import { buildNav, passable, type NavGrid } from '../nav/grid';
import { createObjective } from '../objectives';
import type { Objective } from '../objectives/types';
import type { Loadout } from '../parts';
import { createRng, type Rng } from '../rng';
import type { Research } from '../stats';
import type { Pt } from '../vec';
import type { IntelBag } from '../workshop';
import { aimAndFire, stepShots } from './combat';
import { newGadgets, GADGET, type Gadgets } from './gadgets';
import { stepGadgets, useGadget } from './gadgetUse';
import { driveTank, placeMounted } from './movement';
import { repair, touchPickups } from './pickups';
import { addTank, spawnEnemy } from './spawn';
import { StructGrid } from './spatial';
import { IDLE, type GadgetKind, type MatchEvent, type MatchOver, type Pickup, type PickupKind, type Shot, type StructRt, type Tank, type TankInput } from './types';

export interface PlayerSetup {
  readonly loadout: Loadout;
  readonly research?: Research;
  readonly kits?: number;
  readonly name?: string;
  /** The gadget slot (picked in the briefing); none by default. */
  readonly gadget?: GadgetKind | null;
  readonly gadgetCharges?: number;
}

/** Tactics counters for the lab and the results. */
export interface TacticsStats {
  ambushHits: number;
  /** Times an enemy went from ? to ! on seeing you. */
  spotted: number;
}

export interface MatchConfig {
  readonly level: LoadedLevel;
  readonly seed: number;
  /** null: no player (enemies only, for tests and the stress page). */
  readonly player: PlayerSetup | null;
  /** A bot drives the player's tank (the headless sim). */
  readonly playerBot?: boolean;
  readonly difficulty?: Difficulty;
}

/** A level with no timer still ends here (a stuck sim run). */
export const HARD_CAP = 600;

/**
 * One level being played: its map, every tank, shot and pickup, the alarm
 * and the objective. Pure logic, no rendering: the mission scene and the
 * headless sim both drive it with `step`. The state is mutated in place
 * each step for speed; the rules it applies (stats, damage, loot,
 * objectives) are pure functions over it.
 */
export class Match {
  readonly level: LoadedLevel;
  readonly land: Land;
  readonly nav: NavGrid;
  readonly flow: FlowCache;
  readonly rng: Rng;
  readonly structs: StructRt[];
  readonly grid: StructGrid;
  readonly difficulty: Difficulty;
  readonly start: Pt;
  readonly brains = new Map<number, Brain>();
  readonly usedNames = new Set<string>();
  readonly objective: Objective;
  readonly alarm: AlarmState = { firstAt: null, count: 0 };
  readonly gadgets: Gadgets = newGadgets();
  readonly tactics: TacticsStats = { ambushHits: 0, spotted: 0 };
  t = 0;
  tanks: Tank[] = [];
  shots: Shot[] = [];
  pickups: Pickup[] = [];
  events: MatchEvent[] = [];
  over: MatchOver | null = null;
  intel: IntelBag = {};
  player: Tank | null = null;
  nextId = 1;
  private waves: ResolvedEnemy[];
  private readonly byId = new Map<number, Tank>();
  private dt = 1 / 60;

  constructor(readonly cfg: MatchConfig) {
    this.level = cfg.level;
    this.rng = createRng(cfg.seed);
    this.difficulty = cfg.difficulty ?? CH1_BOTS;
    this.land = buildLand(cfg.level.land);
    this.nav = buildNav(this.land);
    this.flow = new FlowCache(this.nav);
    this.structs = this.land.structures.map((def) => ({ def, hp: def.hp, state: 2 as const }));
    this.grid = new StructGrid(this.structs);
    this.start = cfg.level.start;
    for (const c of cfg.level.crates) this.addPickup({ kind: 'crate', content: c.content === 'kit' ? { kind: 'kit' } : c.content ? { kind: 'part', part: c.content } : rollCrate(this.rng, cfg.level.def.loot) }, c.at.x, c.at.y);
    if (cfg.player) this.player = this.spawnPlayer(cfg.player);
    this.objective = createObjective(this, cfg.level.def.objective);
    this.waves = cfg.level.enemies.filter((e) => e.role === 'wave');
    for (const e of cfg.level.enemies) if (e.role !== 'wave') spawnEnemy(this, e);
    this.drainEvents();
  }

  private spawnPlayer(p: PlayerSetup): Tank {
    const t = addTank(this, { name: p.name ?? 'You', clan: 'ink', team: 0, isPlayer: true, loadout: p.loadout, research: p.research, kits: p.kits ?? 1, maxKits: p.kits ?? 1, gadget: p.gadget ?? null, gadgetCharges: p.gadgetCharges ?? GADGET.charges, at: this.start, heading: this.level.def.startHeading ?? 0 });
    if (this.cfg.playerBot) this.brains.set(t.id, createBrain(t, null, PLAYER_BOT, this.rng.fork(999)));
    return t;
  }

  emit(e: MatchEvent): void {
    this.events.push(e);
    if (this.events.length > 4000) this.events.splice(0, 2000);
  }

  drainEvents(): MatchEvent[] {
    const out = this.events;
    this.events = [];
    return out;
  }

  tank(id: number): Tank | undefined {
    let t = this.byId.get(id);
    if (!t) {
      t = this.tanks.find((x) => x.id === id);
      if (t) this.byId.set(id, t);
    }
    return t;
  }

  point(key: string): Pt {
    const p = this.land.def.points[key];
    if (!p) throw new Error(`level ${this.level.def.number} has no point "${key}"`);
    return p;
  }

  road(key: string): readonly Pt[] {
    const r = this.land.def.roads[key];
    if (!r) throw new Error(`level ${this.level.def.number} has no road "${key}"`);
    return r;
  }

  addPickup(kind: PickupKind, x: number, y: number): Pickup {
    const p = { ...kind, id: this.nextId++, x, y, taken: false } as Pickup;
    this.pickups.push(p);
    return p;
  }

  /** A tank leaves the map by its exit (no wreck): a convoy truck, a runner, a crew reaching home. */
  escape(t: Tank): void {
    if (!t.alive) return;
    t.alive = false;
    t.escaped = true;
    t.deadAt = this.t;
    this.emit({ kind: 'escape', tank: t.id });
  }

  /** Waves still to come; `timedOnly` leaves out the ones waiting on the alarm or the objective. */
  pendingWaves(timedOnly = false): number {
    return timedOnly ? this.waves.filter((w) => typeof w.when === 'number').length : this.waves.length;
  }

  navPassable(x: number, y: number): boolean {
    return passable(this.nav, x, y);
  }

  /** Changes the player's gadget before the start (the briefing's picker); charges reset. */
  setPlayerGadget(kind: GadgetKind | null): void {
    const p = this.player;
    if (!p || this.t > 0) return;
    p.gadget = kind;
    p.gadgetCharges = kind ? GADGET.charges : 0;
  }

  /** The first solid structure crossing a→b (other than `ignore`), or null. */
  lineBlocker(ax: number, ay: number, bx: number, by: number, ignore: string | null): StructRt | null {
    const ids = this.grid.query({ x0: Math.min(ax, bx), y0: Math.min(ay, by), x1: Math.max(ax, bx), y1: Math.max(ay, by) });
    for (const i of ids) {
      const s = this.structs[i]!;
      if (s.state === 0 || s.def.cover || s.def.flattenable || s.def.id === ignore) continue;
      if (segmentHits(s.def.shape, s.def.x, s.def.y, ax, ay, bx, by)) return s;
    }
    return null;
  }

  private inputFor(t: Tank, playerInput: TankInput): TankInput {
    const own = this.objective.drive(t);
    if (own) return own;
    if (t.role === 'truck' && !this.brains.has(t.id)) return IDLE;
    if (t.isPlayer && !this.cfg.playerBot) return playerInput;
    const b = this.brains.get(t.id);
    return b ? botInput(this, b, t, this.dt) : IDLE;
  }

  step(dt: number, playerInput: TankInput = IDLE): void {
    if (this.over) return;
    this.dt = dt;
    this.t += dt;
    this.stepWaves();
    for (const t of this.tanks) {
      if (!t.alive) continue;
      const input = this.inputFor(t, playerInput);
      if (!t.alive) continue;
      driveTank(this, t, input, dt);
      placeMounted(this, t);
      aimAndFire(this, t, input, dt);
      repair(this, t, input, dt);
      if (input.gadget) useGadget(this, t);
      touchPickups(this, t, input, dt, input.swap);
    }
    stepShots(this, dt);
    stepGadgets(this);
    this.objective.step(dt);
    this.checkOver();
  }

  private stepWaves(): void {
    if (this.waves.length === 0) return;
    const ready = (w: ResolvedEnemy): boolean =>
      typeof w.when === 'number' ? this.t >= w.when : w.when === 'alarm' ? this.alarm.firstAt !== null : this.objective.staged();
    const due = this.waves.filter(ready);
    if (due.length === 0) return;
    this.waves = this.waves.filter((w) => !ready(w));
    for (const w of due) spawnEnemy(this, w);
  }

  private finish(passed: boolean, reason: string): void {
    this.over = { passed, reason, time: this.t };
    this.emit({ kind: 'over', passed, reason });
  }

  private checkOver(): void {
    const p = this.player;
    if (p && !p.alive) return this.finish(false, 'destroyed');
    const s = this.objective.status();
    if (s.failed) return this.finish(false, s.failed);
    if (s.done) return this.finish(true, 'objective');
    const limit = this.level.def.timeLimit;
    if (limit !== undefined && this.t >= limit) return this.finish(false, 'time');
    if (this.t >= HARD_CAP) this.finish(false, 'time');
  }

  /** Seconds left on the level's timer, or null when it has none. */
  timeLeft(): number | null {
    const limit = this.level.def.timeLimit;
    return limit === undefined ? null : Math.max(0, limit - this.t);
  }
}
