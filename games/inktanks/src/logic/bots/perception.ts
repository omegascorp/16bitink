import { damageTaken } from '../damage';
import { pointInShape } from '../geom';
import type { Match } from '../match/match';
import type { Tank } from '../match/types';
import { dps } from '../stats';

/** About one screen around a tank. */
export const VISION = 440;
export const REVEAL = 2;
const NEAR_SPOT = 100;

/** Hidden: in a bush, crops or under a roof, and not firing lately. Carrying the prototype never hides. */
export function hidden(m: Match, t: Tank): boolean {
  if (t.carrying || m.t - t.firedAt < REVEAL) return false;
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

export function canSee(m: Match, me: Tank, o: Tank, range = VISION): boolean {
  const d2 = (o.x - me.x) ** 2 + (o.y - me.y) ** 2;
  if (d2 > range * range) return false;
  return d2 < NEAR_SPOT * NEAR_SPOT || !hidden(m, o);
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

/** No solid structure (other than `ignore`) between the two points. */
export function losClear(m: Match, ax: number, ay: number, bx: number, by: number, ignore: string | null = null): boolean {
  return m.lineBlocker(ax, ay, bx, by, ignore) === null;
}
