import { createBrain } from '../bots/brain';
import { ACE_BOT } from '../bots/difficulty';
import { isDrivable } from '../land';
import type { ResolvedEnemy } from '../level/load';
import type { Loadout } from '../parts';
import type { Rng } from '../rng';
import { tankStats, type Research } from '../stats';
import { nearestPassable } from '../nav/grid';
import { angleTo, type Pt } from '../vec';
import type { Match } from './match';
import { CLAN_CREW, crewName } from './names';
import type { Clan, GadgetKind, Tank, TankRole } from './types';

export interface TankSpec {
  readonly name: string;
  /** The crew's animal (default: the clan's). */
  readonly crew?: string;
  readonly clan: Clan;
  readonly team: number;
  readonly role?: TankRole;
  readonly isPlayer?: boolean;
  readonly ace?: boolean;
  readonly loadout: Loadout;
  readonly research?: Research;
  readonly kits?: number;
  readonly maxKits?: number;
  readonly hpMult?: number;
  readonly speedMult?: number;
  readonly at: Pt;
  readonly heading?: number;
  readonly gadget?: GadgetKind | null;
  readonly gadgetCharges?: number;
}

/** Enemy clans share one team: they fight you, not each other (clan wars come later). */
export const ENEMY_TEAM = 1;
/** A truck's body, in place of tank stats. */
export const TRUCK = { radius: 24, armour: 10 } as const;

export function addTank(m: Match, spec: TankSpec): Tank {
  const stats = tankStats(spec.loadout, spec.research);
  const maxHp = stats.maxHp * (spec.hpMult ?? 1);
  const heading = spec.heading ?? 0;
  const t: Tank = {
    id: m.nextId++, name: spec.name, crew: spec.crew ?? CLAN_CREW[spec.clan], clan: spec.clan, team: spec.team, role: spec.role ?? 'tank',
    isPlayer: spec.isPlayer ?? false, ace: spec.ace ?? false, loadout: spec.loadout, research: spec.research ?? {},
    stats: { ...stats, maxHp, speed: stats.speed * (spec.speedMult ?? 1) }, hpMult: spec.hpMult ?? 1, x: spec.at.x, y: spec.at.y, heading, turret: heading, speed: 0,
    hp: maxHp, alive: true, escaped: false, reload: 0, ammo: stats.gun.belt, beltT: 0, idleT: 0, burst: 0, burstT: 0,
    kits: spec.kits ?? 1, maxKits: spec.maxKits ?? 1, repairT: 0, firedAt: -99, kills: 0,
    lastHitBy: null, lastHitAt: -99, lastHitDrive: null, usedKit: false,
    hullsUsed: [spec.loadout.hull.family as Tank['hullsUsed'][number]], picks: [], swapT: 0, onPart: null, onFullKit: false, carrying: false,
    rolled: 0, parent: null, mount: null, victims: [], deadAt: -1,
    gadget: spec.gadget ?? null, gadgetCharges: spec.gadget ? (spec.gadgetCharges ?? 0) : 0, gadgetT: 0, trackBrokenUntil: -1, stunnedUntil: -1,
    ambushHits: 0, gadgetsUsed: 0, shotsFired: 0, shotsHit: 0, dealt: 0,
  };
  m.tanks.push(t);
  return t;
}

/** A random drivable point near `around` (within `spread`), snapped to the nav grid. */
export function drivableNear(m: Match, around: Pt, spread: number, rng: Rng): Pt {
  for (let i = 0; i < 30; i++) {
    const a = rng.range(0, Math.PI * 2);
    const d = Math.sqrt(rng.next()) * spread;
    const x = around.x + Math.cos(a) * d;
    const y = around.y + Math.sin(a) * d;
    if (isDrivable(m.land, x, y) && m.navPassable(x, y)) return { x, y };
  }
  return nearestPassable(m.nav, around.x, around.y, 30) ?? around;
}

/** Puts a level's enemy on the map with its role's brain. */
export function spawnEnemy(m: Match, e: ResolvedEnemy): Tank {
  const at = m.navPassable(e.at.x, e.at.y) ? e.at : (nearestPassable(m.nav, e.at.x, e.at.y, 8) ?? e.at);
  const route = e.route ? m.land.def.roads[e.route]! : null;
  const t = addTank(m, {
    name: e.name ?? crewName(m.rng, e.clan, m.usedNames), clan: e.clan, team: ENEMY_TEAM, role: e.truck ? 'truck' : 'tank',
    ace: e.ace, loadout: e.loadout, at, kits: e.kits ?? (e.ace ? 1 : 0), maxKits: e.kits ?? 1, hpMult: e.hpMult ?? (e.ace ? 1.5 : 1), speedMult: e.speedMult,
    heading: route ? angleTo(route[0]!, route[1]!) : angleTo(at, m.start),
  });
  if (e.truck) t.stats = { ...t.stats, radius: TRUCK.radius, armour: TRUCK.armour };
  m.brains.set(t.id, createBrain(t, e, e.ace ? ACE_BOT : m.difficulty, m.rng.fork(t.id), route));
  m.emit({ kind: 'spawn', tank: t.id });
  return t;
}
