import { createBrain } from '../bots/brain';
import { PERSONALITIES, type Difficulty, type PersonalityId } from '../bots/personality';
import { isDrivable } from '../land';
import { rollLoadout } from '../loot';
import { nearestPassable } from '../nav/grid';
import type { Loadout } from '../parts';
import type { Rng } from '../rng';
import { tankStats, type Research } from '../stats';
import type { Pt } from '../vec';
import type { Match } from './match';
import { CLAN_CREW, CLAN_TASTE, crewName } from './names';
import type { Clan, Tank, TankRole } from './types';

export const DROP_TIME = 3;

export interface TankSpec {
  readonly name: string;
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
  readonly at: Pt;
  readonly drop?: boolean;
}

export function addTank(m: Match, spec: TankSpec): Tank {
  const stats = tankStats(spec.loadout, spec.research);
  const maxHp = stats.maxHp * (spec.hpMult ?? 1);
  const t: Tank = {
    id: m.nextId++, name: spec.name, crew: CLAN_CREW[spec.clan], clan: spec.clan, team: spec.team, role: spec.role ?? 'tank',
    isPlayer: spec.isPlayer ?? false, ace: spec.ace ?? false, loadout: spec.loadout, research: spec.research ?? {},
    stats: { ...stats, maxHp }, hpMult: spec.hpMult ?? 1, x: spec.at.x, y: spec.at.y, heading: m.rng.range(-Math.PI, Math.PI), turret: 0, speed: 0,
    hp: maxHp, alive: true, dropT: spec.drop === false ? 0 : DROP_TIME, reload: 0, burst: 0, burstT: 0,
    kits: spec.kits ?? 1, maxKits: spec.maxKits ?? 1, repairT: 0, firedAt: -99, kills: 0,
    lastHitBy: null, lastHitAt: -99, lastHitDrive: null, stormDamage: 0, usedKit: false,
    hullsUsed: [spec.loadout.hull.family as Tank['hullsUsed'][number]], picks: [], swapT: 0, onPart: null, carrying: false,
    rolled: 0, parent: null, mount: null, victims: [], deadAt: -1, placement: 0, shotsFired: 0, shotsHit: 0, dealt: 0,
  };
  t.turret = t.heading;
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

/** Bots land weighted towards loot: a looter picks the richest of several spots. */
export function chooseDrop(m: Match, rng: Rng, greedy: boolean, avoid: readonly Pt[]): Pt {
  const { x0, y0, x1, y1 } = m.land.bounds;
  let best: Pt | null = null;
  let bestScore = -Infinity;
  for (let i = 0; i < (greedy ? 8 : 4); i++) {
    const p = drivableNear(m, { x: rng.range(x0, x1), y: rng.range(y0, y1) }, 60, rng);
    if (!isDrivable(m.land, p.x, p.y)) continue;
    const loot = m.pickups.filter((c) => !c.taken && (c.x - p.x) ** 2 + (c.y - p.y) ** 2 < 300 * 300).length;
    const crowd = avoid.filter((o) => (o.x - p.x) ** 2 + (o.y - p.y) ** 2 < 350 * 350).length;
    const score = loot - crowd * 2.5 + rng.next();
    if (score > bestScore) {
      bestScore = score;
      best = p;
    }
  }
  return best ?? drivableNear(m, { x: (x0 + x1) / 2, y: (y0 + y1) / 2 }, 300, rng);
}

const CLANS: readonly Clan[] = ['boars', 'weasels', 'crows'];
const CLAN_PERS: Readonly<Record<Clan, readonly PersonalityId[]>> = {
  boars: ['camper', 'hunter', 'camper'],
  weasels: ['hunter', 'coward', 'hunter'],
  crows: ['looter', 'looter', 'hunter'],
  ink: ['hunter'],
};

export function spawnBot(m: Match, at: Pt | null, diff: Difficulty, opts: { clan?: Clan; drop?: boolean; goal?: Pt; personality?: PersonalityId } = {}): Tank {
  const rng = m.rng;
  const clan = opts.clan ?? rng.pick(CLANS);
  const pers = PERSONALITIES[opts.personality ?? rng.pick(CLAN_PERS[clan])];
  const place = at ?? chooseDrop(m, rng, pers.id === 'looter', m.tanks.map((t) => t));
  const t = addTank(m, {
    name: crewName(rng, clan, m.usedNames), clan, team: m.nextTeam++, loadout: rollLoadout(rng, m.loot, CLAN_TASTE[clan]), at: place, drop: opts.drop,
  });
  const b = createBrain(t, pers, diff, rng.fork(t.id));
  if (opts.goal) b.home = opts.goal;
  m.brains.set(t.id, b);
  return t;
}
