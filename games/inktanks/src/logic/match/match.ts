import { botInput } from '../bots/control';
import type { Brain } from '../bots/brain';
import { CH1_BOTS, PERSONALITIES, PLAYER_BOT, type Difficulty } from '../bots/personality';
import { segmentHits } from '../geom';
import { isDrivable, openCircle, openLand, scaleForArea, type LandDef, type OpenLand } from '../land';
import { CH1_LOOT, rollCrate, rollSupply, supplyTimes, SUPPLY_WARNING, type LootTable } from '../loot';
import type { MissionDef } from '../mission/types';
import { FlowCache } from '../nav/flow';
import { buildNav, passable, type NavGrid } from '../nav/grid';
import type { Loadout } from '../parts';
import { createRng, type Rng } from '../rng';
import type { Research } from '../stats';
import { calmStorm, insideCircle, planStorm, stormAt, type StormNow, type StormPlan } from '../storm';
import type { IntelBag } from '../workshop';
import type { Pt } from '../vec';
import { aimAndFire, killTank, stepShots } from './combat';
import { driveTank, placeMounted } from './movement';
import { mainDone, objectiveFailed, objectiveInput, setupObjective, stepObjective, type ObjectiveRt } from './objective';
import { repair, touchPickups } from './pickups';
import { addTank, chooseDrop, drivableNear, spawnBot } from './spawn';
import { StructGrid } from './spatial';
import { IDLE, type MatchEvent, type MatchOver, type Pickup, type PickupKind, type Shot, type StructRt, type Tank, type TankInput } from './types';
import { createBrain } from '../bots/brain';

export interface PlayerSetup {
  readonly loadout: Loadout;
  readonly research?: Research;
  readonly kits?: number;
  readonly name?: string;
  /** Where the player tapped to land; null lets the game choose. */
  readonly drop?: Pt | null;
}

export interface MatchConfig {
  readonly land: LandDef;
  readonly mission: MissionDef;
  readonly seed: number;
  /** null: bots only. */
  readonly player: PlayerSetup | null;
  /** A bot drives the player's tank (the headless sim). */
  readonly playerBot?: boolean;
  readonly difficulty?: Difficulty;
  readonly loot?: LootTable;
}

interface SupplyRt {
  readonly at: number;
  readonly x: number;
  readonly y: number;
  warned: boolean;
  landed: boolean;
}

/**
 * One mission being played: the land as open at its level, every tank, shot
 * and pickup, the storm and the objective. Pure logic, no rendering: the
 * mission scene and the headless sim both drive it with `step`.
 * The state is mutated in place each step for speed; the rules it applies
 * (stats, damage, storm, loot, objectives) are pure functions.
 */
export class Match {
  readonly land: OpenLand;
  readonly nav: NavGrid;
  readonly flow: FlowCache;
  readonly rng: Rng;
  readonly structs: StructRt[];
  readonly grid: StructGrid;
  readonly storm: StormPlan;
  readonly loot: LootTable;
  readonly difficulty: Difficulty;
  readonly brains = new Map<number, Brain>();
  readonly usedNames = new Set<string>();
  readonly objective: ObjectiveRt;
  readonly supplies: SupplyRt[];
  readonly length: number;
  /** Until then bots loot rather than pick fights. */
  readonly calmUntil: number;
  t = 0;
  tanks: Tank[] = [];
  shots: Shot[] = [];
  pickups: Pickup[] = [];
  events: MatchEvent[] = [];
  over: MatchOver | null = null;
  intel: IntelBag = {};
  aceIntelTaken = false;
  player: Tank | null = null;
  nextId = 1;
  nextTeam = 1;
  private stormPhase = -1;
  private readonly byId = new Map<number, Tank>();

  constructor(readonly cfg: MatchConfig) {
    this.rng = createRng(cfg.seed);
    this.loot = cfg.loot ?? cfg.mission.loot ?? CH1_LOOT;
    this.difficulty = cfg.difficulty ?? CH1_BOTS;
    this.land = openLand(cfg.land, cfg.mission.level);
    this.nav = buildNav(this.land);
    this.flow = new FlowCache(this.nav);
    this.structs = this.land.structures.map((def) => ({ def, hp: def.hp, state: 2 as const }));
    this.grid = new StructGrid(this.structs);
    this.length = cfg.mission.length ?? 330;
    this.calmUntil = cfg.mission.main.kind === 'royale' ? this.length * 0.4 : 15;
    const start = openCircle(this.land);
    this.storm = cfg.mission.storm === 'on'
      ? planStorm(start, this.rng.fork(1), { area: this.land.area, length: this.length, isValid: (x, y) => isDrivable(this.land, x, y) })
      : calmStorm(start);
    this.stormNow = stormAt(this.storm, 0);
    this.placeCrates();
    if (cfg.player) this.player = this.spawnPlayer(cfg.player);
    this.objective = setupObjective(this);
    const scale = scaleForArea(this.land.area);
    const bots = cfg.mission.bots ?? scale.bots;
    for (let i = 0; i < bots; i++) spawnBot(this, null, this.difficulty);
    this.supplies = supplyTimes(cfg.mission.supplyDrops, this.length).map((at) => {
      const p = drivableNear(this, this.stormNow.circle, this.stormNow.circle.r * 0.5, this.rng);
      return { at, x: p.x, y: p.y, warned: false, landed: false };
    });
    for (const t of this.tanks) this.byId.set(t.id, t);
  }

  stormNow: StormNow;

  private placeCrates(): void {
    const want = scaleForArea(this.land.area).crates;
    const spots = [...this.land.crateSpots];
    for (let i = spots.length - 1; i > 0; i--) {
      const j = this.rng.int(i + 1);
      [spots[i], spots[j]] = [spots[j]!, spots[i]!];
    }
    for (const s of spots.slice(0, want)) this.addPickup({ kind: 'crate', content: rollCrate(this.rng, this.loot) }, s.x, s.y);
  }

  private spawnPlayer(p: PlayerSetup): Tank {
    const at = p.drop && isDrivable(this.land, p.drop.x, p.drop.y) ? p.drop : chooseDrop(this, this.rng, true, []);
    const t = addTank(this, { name: p.name ?? 'You', clan: 'ink', team: 0, isPlayer: true, loadout: p.loadout, research: p.research, kits: p.kits ?? 1, maxKits: p.kits ?? 1, at });
    if (this.cfg.playerBot) this.brains.set(t.id, createBrain(t, PERSONALITIES.player, PLAYER_BOT, this.rng.fork(999)));
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

  addPickup(kind: PickupKind, x: number, y: number): Pickup {
    const p = { ...kind, id: this.nextId++, x, y, taken: false } as Pickup;
    this.pickups.push(p);
    return p;
  }

  navPassable(x: number, y: number): boolean {
    return passable(this.nav, x, y);
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
    if (t.role === 'truck' || t.role === 'boss') return objectiveInput(this, t) ?? IDLE;
    if (t.isPlayer && !this.cfg.playerBot) return playerInput;
    const b = this.brains.get(t.id);
    return b ? botInput(this, b, t, this.dt) : IDLE;
  }

  private dt = 1 / 60;

  step(dt: number, playerInput: TankInput = IDLE): void {
    if (this.over) return;
    this.dt = dt;
    this.t += dt;
    this.stormNow = stormAt(this.storm, this.t);
    if (this.stormNow.phase !== this.stormPhase) {
      this.stormPhase = this.stormNow.phase;
      this.emit({ kind: 'storm', phase: this.stormPhase });
    }
    this.stepSupplies();
    for (const t of this.tanks) {
      if (!t.alive) continue;
      if (t.dropT > 0) {
        t.dropT = Math.max(0, t.dropT - dt);
        continue;
      }
      const input = this.inputFor(t, playerInput);
      driveTank(this, t, input, dt);
      placeMounted(this, t);
      aimAndFire(this, t, input, dt);
      repair(this, t, input, dt);
      touchPickups(this, t, input, dt, input.swap);
    }
    stepShots(this, dt);
    this.stormDamage(dt);
    stepObjective(this, dt);
    for (const t of this.tanks) if (!this.byId.has(t.id)) this.byId.set(t.id, t);
    this.checkOver();
  }

  private stepSupplies(): void {
    for (const s of this.supplies) {
      if (!s.warned && this.t >= s.at - SUPPLY_WARNING) {
        s.warned = true;
        this.emit({ kind: 'supplyWarn', x: s.x, y: s.y, at: s.at });
      }
      if (!s.landed && this.t >= s.at) {
        s.landed = true;
        this.addPickup({ kind: 'part', part: rollSupply(this.rng, this.loot), supply: true }, s.x, s.y);
        this.emit({ kind: 'supply', x: s.x, y: s.y });
      }
    }
  }

  private stormDamage(dt: number): void {
    const s = this.stormNow;
    if (s.dps <= 0) return;
    for (const t of this.tanks) {
      if (!t.alive || t.dropT > 0 || t.role !== 'tank' || insideCircle(s.circle, t.x, t.y)) continue;
      const d = s.dps * dt;
      t.hp -= d;
      t.stormDamage += d;
      if (t.hp <= 0) killTank(this, t, t.lastHitBy !== null && this.t - t.lastHitAt < 5 ? (this.tank(t.lastHitBy) ?? null) : null, 'storm');
    }
  }

  /** Tanks still fighting for placement (no trucks or boss parts). */
  aliveTanks(): number {
    return this.tanks.reduce((n, t) => n + (t.alive && t.role === 'tank' ? 1 : 0), 0);
  }

  private finish(passed: boolean, reason: string): void {
    this.over = { passed, reason, time: this.t };
    if (this.player?.alive) this.player.placement = this.aliveTanks();
    this.emit({ kind: 'over', passed, reason });
  }

  private checkOver(): void {
    const main = this.cfg.mission.main;
    const p = this.player;
    const royale = main.kind === 'royale' || !p;
    if (p && !p.alive) return this.finish(main.kind === 'royale' && p.placement <= main.top, 'destroyed');
    if (royale) {
      if (this.aliveTanks() <= 1) return this.finish(!p || p.alive, 'last tank');
      if (this.t > Math.min(this.storm.end + 10, this.length + 120)) return this.finish(false, 'time');
      return;
    }
    const failed = objectiveFailed(this);
    if (failed) return this.finish(false, failed);
    if (mainDone(this)) return this.finish(true, 'objective');
    if (this.t > this.length + 120) this.finish(false, 'time');
  }
}
