import { ACE_BOT } from '../bots/personality';
import { createBrain } from '../bots/brain';
import { PERSONALITIES } from '../bots/personality';
import type { MainObjective } from '../mission/types';
import { nearestPassable } from '../nav/grid';
import { tankStats } from '../stats';
import { insideCircle, type Circle } from '../storm';
import { angleTo, type Pt } from '../vec';
import type { Match } from './match';
import { addTank, drivableNear, spawnBot } from './spawn';
import type { Tank, TankInput } from './types';

/** What the mission asks of a bot (the player's stand-in, or a hunter of the truck). */
export interface Hint {
  readonly goal?: Pt;
  readonly goalRadius?: number;
  readonly target?: number | null;
  /** Fight without leaving the goal circle (a hold zone, the truck). */
  readonly stay?: boolean;
  readonly shootAt?: { readonly x: number; readonly y: number; readonly id: string } | null;
}

export interface ObjectiveRt {
  readonly main: MainObjective;
  truckId: number | null;
  roadI: number;
  arrived: boolean;
  zone: Circle | null;
  holdT: number;
  wavesDone: number;
  aceId: number | null;
  protoId: number | null;
  pickupAt: Pt | null;
  delivered: boolean;
  bossId: number | null;
  targets: readonly string[];
}

const BOSS_TEAM = 900;
const BOSS_RELOAD = 1.8;
const TRUCK_LEASH = 480;
/** Bots leave the truck alone at first, then hunt it from this close. */
const TRUCK_GRACE = 20;
const TRUCK_HUNT = 500;
/** Seconds the player's stand-in loots before heading for the objective. */
const PREP = 40;

function point(m: Match, key: string): Pt {
  const p = m.land.def.points[key];
  if (!p) throw new Error(`land has no point "${key}"`);
  return p;
}

function road(m: Match, key: string): readonly Pt[] {
  const r = m.land.def.roads[key];
  if (!r || r.length < 2) throw new Error(`land has no road "${key}"`);
  return r;
}

export function setupObjective(m: Match): ObjectiveRt {
  const main = m.cfg.mission.main;
  const o: ObjectiveRt = { main, truckId: null, roadI: 1, arrived: false, zone: null, holdT: 0, wavesDone: 0, aceId: null, protoId: null, pickupAt: null, delivered: false, bossId: null, targets: [] };
  switch (main.kind) {
    case 'escort': {
      const r = road(m, main.road);
      const t = addTank(m, { name: 'Supply truck', clan: 'ink', team: 0, role: 'truck', loadout: { gun: { family: 'machinegun', mk: 1 }, hull: { family: 'medium', mk: 1 }, drive: { family: 'wheels', mk: 1 } }, at: r[0]!, drop: false });
      t.stats = { ...t.stats, maxHp: main.truckHp, speed: main.speed, radius: 24, armour: 10 };
      t.hp = main.truckHp;
      t.heading = angleTo(r[0]!, r[1]!);
      o.truckId = t.id;
      break;
    }
    case 'hold': {
      const p = point(m, main.point);
      o.zone = { x: p.x, y: p.y, r: main.radius };
      break;
    }
    case 'ace': {
      const a = main.ace;
      const at = drivableNear(m, m.land.region ? regionMid(m) : { x: m.land.width / 2, y: m.land.height / 2 }, 300, m.rng);
      const t = addTank(m, { name: a.name, clan: a.clan, team: m.nextTeam++, ace: true, loadout: a.loadout, at, hpMult: a.hpMult ?? 1.5 });
      m.brains.set(t.id, createBrain(t, PERSONALITIES.camper, ACE_BOT, m.rng.fork(77)));
      o.aceId = t.id;
      break;
    }
    case 'salvage': {
      const at = point(m, main.at);
      o.protoId = m.addPickup({ kind: 'proto' }, at.x, at.y).id;
      o.pickupAt = point(m, main.pickup);
      break;
    }
    case 'fortress': {
      const b = main.boss;
      const r = road(m, b.road);
      const body = addTank(m, { name: b.name, clan: 'boars', team: BOSS_TEAM, role: 'boss', loadout: { gun: { family: 'cannon', mk: 2 }, hull: { family: 'heavy', mk: 2 }, drive: { family: 'tracks', mk: 2 } }, at: r[0]!, drop: false });
      body.stats = { ...body.stats, maxHp: b.hp, speed: b.speed, radius: 70, armour: 14 };
      body.hp = b.hp;
      o.bossId = body.id;
      for (const tu of b.turrets) {
        const t = addTank(m, { name: `${b.name} ${tu.gun}`, clan: 'boars', team: BOSS_TEAM, role: 'bossTurret', loadout: { gun: { family: tu.gun, mk: 1 }, hull: { family: 'heavy', mk: 1 }, drive: { family: 'tracks', mk: 1 } }, at: r[0]!, drop: false });
        const st = tankStats(t.loadout);
        // Fortress guns are slow to reload: the boss is a puzzle of angles, not a wall of fire.
        t.stats = { ...st, maxHp: tu.hp, radius: 22, gun: { ...st.gun, reload: st.gun.reload * BOSS_RELOAD } };
        t.hp = tu.hp;
        t.parent = body.id;
        t.mount = { dx: tu.dx, dy: tu.dy };
        m.brains.set(t.id, createBrain(t, PERSONALITIES.camper, m.difficulty, m.rng.fork(t.id)));
      }
      break;
    }
    case 'raid': {
      o.targets = m.structs.filter((s) => s.def.tag === main.tag).map((s) => s.def.id);
      break;
    }
    default:
      break;
  }
  return o;
}

function regionMid(m: Match): Pt {
  const r = m.land.region!;
  const n = r.cells.length;
  return { x: (r.cells.reduce((s, [c]) => s + c + 0.5, 0) / n) * 960, y: (r.cells.reduce((s, [, row]) => s + row + 0.5, 0) / n) * 540 };
}

/** Raid targets still standing. */
export function targetsLeft(m: Match): number {
  return m.objective.targets.filter((id) => m.structs.find((s) => s.def.id === id)!.state > 0).length;
}

export function stepObjective(m: Match, dt: number): void {
  const o = m.objective;
  const main = o.main;
  const player = m.player;
  if (main.kind === 'hold' && o.zone) {
    if (player?.alive && player.dropT <= 0 && insideCircle(o.zone, player.x, player.y)) o.holdT += dt;
    const wave = main.waves[o.wavesDone];
    if (wave && m.t >= wave.at) {
      o.wavesDone++;
      for (let i = 0; i < wave.count; i++) {
        const a = m.rng.range(0, Math.PI * 2);
        const p = nearestPassable(m.nav, o.zone.x + Math.cos(a) * 800, o.zone.y + Math.sin(a) * 800, 20) ?? o.zone;
        const t = spawnBot(m, p, m.difficulty, { drop: false, goal: o.zone, personality: 'hunter' });
        m.emit({ kind: 'spawn', tank: t.id });
      }
    }
  }
  if (main.kind === 'salvage' && player?.carrying && o.pickupAt && Math.hypot(player.x - o.pickupAt.x, player.y - o.pickupAt.y) < 80) o.delivered = true;
}

/** Inputs for the tanks the mission drives itself: the truck and the boss body. */
export function objectiveInput(m: Match, t: Tank): TankInput | null {
  const o = m.objective;
  const main = o.main;
  if (t.role === 'truck' && main.kind === 'escort') {
    const r = road(m, main.road);
    const next = r[o.roadI];
    const player = m.player;
    const leash = !player?.alive || Math.hypot(player.x - t.x, player.y - t.y) > TRUCK_LEASH;
    if (!next || leash || o.arrived) return { move: null, aim: null, fire: false, swap: false, repair: false };
    if (Math.hypot(next.x - t.x, next.y - t.y) < 30) {
      o.roadI++;
      if (o.roadI >= r.length) o.arrived = true;
    }
    return { move: { kind: 'point', angle: angleTo(t, next), mag: 1 }, aim: null, fire: false, swap: false, repair: false };
  }
  if (t.role === 'boss' && main.kind === 'fortress') {
    const r = road(m, main.boss.road);
    const next = r[o.roadI % r.length]!;
    if (Math.hypot(next.x - t.x, next.y - t.y) < 50) o.roadI++;
    return { move: { kind: 'point', angle: angleTo(t, next), mag: 1 }, aim: null, fire: false, swap: false, repair: false };
  }
  return null;
}

export function mainDone(m: Match): boolean {
  const o = m.objective;
  switch (o.main.kind) {
    case 'raid':
      return o.targets.length - targetsLeft(m) >= o.main.need;
    case 'escort':
      return o.arrived;
    case 'hold':
      return o.holdT >= o.main.seconds;
    case 'ace':
      return m.aceIntelTaken || (o.aceId !== null && !m.tank(o.aceId)!.alive && m.player === null);
    case 'salvage':
      return o.delivered;
    case 'fortress':
      return o.bossId !== null && !m.tank(o.bossId)!.alive;
    case 'royale':
      return false;
  }
}

export function objectiveHint(m: Match, t: Tank): Hint | null {
  const o = m.objective;
  const main = o.main;
  if (t.team !== 0) {
    if (main.kind === 'escort' && o.truckId !== null && m.t > TRUCK_GRACE) {
      const truck = m.tank(o.truckId)!;
      if (truck.alive && Math.hypot(truck.x - t.x, truck.y - t.y) < TRUCK_HUNT) return { target: truck.id };
    }
    return null;
  }
  if (!t.isPlayer) return null;
  // Like a player, the stand-in loots a little before going for the objective (the truck and the hill can't wait).
  if (m.t < PREP && main.kind !== 'escort' && main.kind !== 'hold') return null;
  const range = t.stats.gun.range;
  switch (main.kind) {
    case 'raid': {
      const left = m.structs.filter((s) => o.targets.includes(s.def.id) && s.state > 0);
      const s = left.sort((a, b) => Math.hypot(a.def.x - t.x, a.def.y - t.y) - Math.hypot(b.def.x - t.x, b.def.y - t.y))[0];
      return s ? { goal: { x: s.def.x, y: s.def.y }, goalRadius: range * 0.6, shootAt: { x: s.def.x, y: s.def.y, id: s.def.id } } : null;
    }
    case 'escort': {
      const truck = o.truckId !== null ? m.tank(o.truckId) : null;
      return truck?.alive ? { goal: { x: truck.x + Math.cos(truck.heading) * 90, y: truck.y + Math.sin(truck.heading) * 90 }, goalRadius: 120, stay: true } : null;
    }
    case 'hold':
      return o.zone ? { goal: o.zone, goalRadius: o.zone.r * 0.5, stay: true } : null;
    case 'ace': {
      const ace = o.aceId !== null ? m.tank(o.aceId) : null;
      if (ace?.alive) return { goal: ace, goalRadius: range * 0.6, target: ace.id };
      const intel = m.pickups.find((p) => p.kind === 'intel' && p.ace && !p.taken);
      return intel ? { goal: intel, goalRadius: 4 } : null;
    }
    case 'salvage': {
      const proto = m.pickups.find((p) => p.id === o.protoId);
      if (proto && !proto.taken) return { goal: proto, goalRadius: 4 };
      return o.pickupAt ? { goal: o.pickupAt, goalRadius: 40 } : null;
    }
    case 'fortress': {
      const boss = o.bossId !== null ? m.tank(o.bossId) : null;
      if (!boss?.alive) return null;
      const turret = m.tanks.find((x) => x.parent === boss.id && x.alive);
      return { goal: boss, goalRadius: range * 0.75, target: (turret ?? boss).id };
    }
    default:
      return null;
  }
}

/** A failed mission's reason, or null. */
export function objectiveFailed(m: Match): string | null {
  const o = m.objective;
  if (o.truckId !== null && !m.tank(o.truckId)!.alive) return 'truck destroyed';
  return null;
}
