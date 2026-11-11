import { addTroops, ARMY_SLOTS, emptyArmy, joinLike, type Army, type ArmySlot } from '../army';
import { armyStrength } from '../strength';

/**
 * How a lord's side shares its companies between two armies, as a player
 * would: at a meeting the leading army takes the strongest seven of both (like
 * ones joined), the other keeps the rest; at a gate the hero takes what of the
 * garrison fits beside his own. Without this a main
 * hero's slots fill with stacks of one line at different levels (raised in
 * one town, hired at another's level in the next) and he can take nothing
 * more, while his runners and garrisons hold the rest of the side's strength.
 */

const strengthOfSlot = (s: ArmySlot): number => armyStrength([s]);

/**
 * `lead` takes the strongest companies of `lead` and `other` together (seven at most, like ones joined); `other` keeps
 * the rest, and with `keepOne` never less than one company of its own (a hero can't ride with none). Null when `lead`
 * would gain nothing.
 */
export function strongestTo(lead: Army, other: Army, keepOne: boolean): { lead: Army; other: Army } | null {
  const pool = joinLike([...lead, ...other]).filter((s): s is ArmySlot => !!s).sort((x, y) => strengthOfSlot(y) - strengthOfSlot(x));
  const otherOwn = other.filter((s): s is ArmySlot => !!s);
  // The company `other` keeps when it would be left with none: its own weakest (a stack it led in), else nothing kept.
  const kept = keepOne && pool.length <= ARMY_SLOTS && otherOwn.length ? otherOwn.reduce((a, s) => (strengthOfSlot(s) < strengthOfSlot(a) ? s : a)) : null;
  // Kept back from the pool: where `lead` has the same creature, only `kept`'s own count stays behind.
  const rest = kept ? pool.flatMap((s) => (s.creature !== kept.creature ? [s] : s.count > kept.count ? [{ creature: s.creature, count: s.count - kept.count }] : [])) : pool;
  const top = rest.slice(0, ARMY_SLOTS);
  const left = [...(kept ? [kept] : []), ...rest.slice(ARMY_SLOTS)];
  // A company already in `lead` stays in its slot; the new ones fill the free slots in order.
  const ids = new Set(top.map((s) => s.creature));
  const stay = lead.map((s, i) => (s && ids.has(s.creature) && lead.findIndex((x) => x?.creature === s.creature) === i ? top.find((t) => t.creature === s.creature)! : null));
  const placed = new Set(stay.filter((s): s is ArmySlot => !!s).map((s) => s.creature));
  const incoming = top.filter((s) => !placed.has(s.creature));
  const next = stay.map((s) => s ?? incoming.shift() ?? null);
  if (armyStrength(next) <= armyStrength(lead) + 1e-9) return null;
  const otherNext = emptyArmy().map((_, i) => left[i] ?? null);
  return { lead: next, other: otherNext };
}

/** Of `src`, the companies that fit into `dst` (a like one, or a free slot), strongest first; the rest stay. Null when none fits. */
export function moveFitting(src: Army, dst: Army): { src: Army; dst: Army } | null {
  const order = src.flatMap((s, i) => (s ? [{ s, i }] : [])).sort((x, y) => strengthOfSlot(y.s) - strengthOfSlot(x.s));
  let from = src;
  let to = dst;
  for (const { s, i } of order) {
    const next = addTroops(to, s.creature, s.count);
    if (!next) continue;
    to = next;
    from = from.map((x, j) => (j === i ? null : x));
  }
  return to === dst ? null : { src: from, dst: to };
}
