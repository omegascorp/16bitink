import { damageTaken } from '../damage';
import { pointInShape, segmentHits } from '../geom';
import { inSmoke, smokeBlocks } from '../match/gadgets';
import type { Match } from '../match/match';
import type { StructRt, Tank } from '../match/types';
import { dps } from '../stats';
import { wrapAngle } from '../vec';

/** About one screen around a tank. */
export const VISION = 440;
/** Firing shows you for this long, even in a bush. */
export const REVEAL = 2;
/** An enemy this close spots you in a bush, a crop field or smoke (Tactics: was 100). */
export const SPOT_NEAR = 60;
/** A shot fired this close makes a calm bot suspicious of the spot. */
export const HEAR = 300;
/** A shot passes over low cover during its first this many px of flight. */
export const LOW_PASS = 50;
/** From a tank's centre to its muzzle, roughly (shots start there). */
const MUZZLE = 20;

/** Hidden: in a bush, crops, under a roof or in smoke, and not firing lately. Carrying the prototype never hides. */
export function hidden(m: Match, t: Tank): boolean {
  if (t.carrying || m.t - t.firedAt < REVEAL) return false;
  if (inSmoke(m.gadgets, t.x, t.y, m.t)) return true;
  const ids = m.grid.query({ x0: t.x - 1, y0: t.y - 1, x1: t.x + 1, y1: t.y + 1 });
  for (const i of ids) {
    const s = m.structs[i]!;
    if (s.state === 0 || !(s.def.cover || s.def.roof)) continue;
    if (pointInShape(s.def.shape, s.def.x, s.def.y, t.x, t.y)) return true;
  }
  return false;
}

export function enemies(m: Match, me: Tank): Tank[] {
  return m.tanks.filter((o) => o.alive && o.team !== me.team);
}

/** Blocks sight: standing structures that aren't cover, low or flattenable (walls, buildings, rocks, gates). */
const blocksSight = (s: StructRt): boolean => s.state !== 0 && !s.def.cover && !s.def.low && !s.def.flattenable;

/** Nothing solid and no smoke between a and b. */
export function sightClear(m: Match, ax: number, ay: number, bx: number, by: number): boolean {
  if (smokeBlocks(m.gadgets, ax, ay, bx, by, m.t)) return false;
  const ids = m.grid.query({ x0: Math.min(ax, bx), y0: Math.min(ay, by), x1: Math.max(ax, bx), y1: Math.max(ay, by) });
  for (const i of ids) {
    const s = m.structs[i]!;
    if (blocksSight(s) && segmentHits(s.def.shape, s.def.x, s.def.y, ax, ay, bx, by)) return false;
  }
  return true;
}

/**
 * A bot's eyes: within `range`, not through walls, buildings, rocks or smoke,
 * and within `cone` (radians, around the turret) when given. Within
 * SPOT_NEAR it spots you in any direction and in a bush; beyond, a hidden
 * tank stays hidden.
 */
export function canSee(m: Match, me: Tank, o: Tank, range = VISION, cone: number | null = null): boolean {
  const dx = o.x - me.x;
  const dy = o.y - me.y;
  const d2 = dx * dx + dy * dy;
  if (d2 > range * range) return false;
  if (d2 >= SPOT_NEAR * SPOT_NEAR) {
    if (hidden(m, o)) return false;
    if (cone !== null && Math.abs(wrapAngle(Math.atan2(dy, dx) - me.turret)) > cone / 2) return false;
  }
  return sightClear(m, me.x, me.y, o.x, o.y);
}

/** As a player sees the screen (the sim's stand-in): range and bushes, over walls, no cone. */
export function canSeeOpen(m: Match, me: Tank, o: Tank, range = VISION): boolean {
  const d2 = (o.x - me.x) ** 2 + (o.y - me.y) ** 2;
  if (d2 > range * range) return false;
  return d2 < SPOT_NEAR * SPOT_NEAR || !hidden(m, o);
}

/** My odds against `o`: their time to kill me over my time to kill them (above 1 favours me). */
export function odds(me: Tank, o: Tank): number {
  if (o.role === 'truck' || o.role === 'crew') return 10;
  const mine = dps(me.stats, o.stats, damageTaken);
  const theirs = o.role === 'boss' ? 0 : dps(o.stats, me.stats, damageTaken);
  const myTtk = o.hp / Math.max(0.01, mine);
  const theirTtk = me.hp / Math.max(0.01, theirs);
  return theirTtk / myTtk;
}

/**
 * The first structure a shot from a (a tank's centre) to b would hit, or
 * null: the shot rule in combat.ts. Cover (bushes) never stops a shot,
 * low cover only past the shot's first LOW_PASS px, and small flattenable
 * trees are shot through (they break). `ignore`: a target structure.
 */
export function shotBlocker(m: Match, ax: number, ay: number, bx: number, by: number, ignore: string | null = null): StructRt | null {
  const len = Math.hypot(bx - ax, by - ay) || 1;
  const ux = (bx - ax) / len;
  const uy = (by - ay) / len;
  const pass = Math.min(len, LOW_PASS + MUZZLE);
  const px = ax + ux * pass;
  const py = ay + uy * pass;
  const ids = m.grid.query({ x0: Math.min(ax, bx), y0: Math.min(ay, by), x1: Math.max(ax, bx), y1: Math.max(ay, by) });
  let best: StructRt | null = null;
  let bestK = Infinity;
  for (const i of ids) {
    const s = m.structs[i]!;
    if (s.state === 0 || s.def.cover || s.def.id === ignore || (s.def.flattenable && !s.def.low)) continue;
    const hits = s.def.low ? pass < len && segmentHits(s.def.shape, s.def.x, s.def.y, px, py, bx, by) : segmentHits(s.def.shape, s.def.x, s.def.y, ax, ay, bx, by);
    if (!hits) continue;
    const k = (s.def.x - ax) * ux + (s.def.y - ay) * uy;
    if (k < bestK) {
      bestK = k;
      best = s;
    }
  }
  return best;
}

/** A shot from a reaches b (see shotBlocker). */
export function losClear(m: Match, ax: number, ay: number, bx: number, by: number, ignore: string | null = null): boolean {
  return shotBlocker(m, ax, ay, bx, by, ignore) === null;
}

/** A fortress and its turrets are one body: their shots never hit each other. */
export function sameBody(a: Tank, b: Tank): boolean {
  return a.parent === b.id || b.parent === a.id || (a.parent !== null && a.parent === b.parent);
}

/**
 * Friendly fire (owner, Nov 14): an enemy's shot stops at the first tank it meets, its own side's
 * included; the player's side shoots through its own truck and crews. Never the shooter or its body.
 */
export function shotHits(shooter: Tank | null, shooterTeam: number, t: Tank): boolean {
  if (!t.alive || (shooter && (t.id === shooter.id || sameBody(shooter, t)))) return false;
  return t.team !== shooterTeam || shooterTeam !== 0;
}

/** One of my own side in my line of fire to (x, y): a bot holds fire rather than shoot through a friend. */
export function allyInLine(m: Match, me: Tank, x: number, y: number): boolean {
  if (me.team === 0) return false;
  const dx = x - me.x;
  const dy = y - me.y;
  const len2 = dx * dx + dy * dy;
  if (len2 < 1) return false;
  for (const o of m.tanks) {
    if (o === me || !o.alive || o.team !== me.team || sameBody(me, o)) continue;
    const k = ((o.x - me.x) * dx + (o.y - me.y) * dy) / len2;
    if (k <= 0 || k >= 1) continue;
    const r = o.stats.radius + 6;
    if ((o.x - (me.x + dx * k)) ** 2 + (o.y - (me.y + dy * k)) ** 2 < r * r) return true;
  }
  return false;
}
