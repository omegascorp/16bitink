import type { Side, Stack } from './battleTypes';
import { creature, type CreatureId } from './creatures';
import { colOf, distance, hexAt, neighbours, onField, rowOf, type Hex } from './hex';

/**
 * Two-hex ("double-wide") units, after VCMI's battle::Unit: a wide unit stands
 * on its head hex (`stack.hex`) and the hex behind it in the same row, its
 * tail. The attacker faces right, so its tail is one column left; the
 * defender faces left, its tail one column right. Facing never changes.
 */
export const isWide = (id: CreatureId): boolean => !!creature(id).wide;

/** VCMI's occupiedHex: the tail behind a wide unit's head, or null when it would leave the field (it never wraps rows). */
export function tailOf(head: Hex, side: Side): Hex | null {
  const c = colOf(head) + (side === 0 ? -1 : 1);
  const r = rowOf(head);
  return onField(c, r) ? hexAt(c, r) : null;
}

/** The hexes a unit would cover with its head on `head`, head first; null if it doesn't fit on the field. */
export function footprintAt(head: Hex, wide: boolean, side: Side): Hex[] | null {
  if (!wide) return [head];
  const tail = tailOf(head, side);
  return tail === null ? null : [head, tail];
}

/** The hexes a stack covers now, head first (one or two). */
export function occupiedHexes(s: Stack): Hex[] {
  return footprintAt(s.hex, isWide(s.creature), s.side) ?? [s.hex];
}

export const covers = (s: Stack, h: Hex): boolean => occupiedHexes(s).includes(h);

/** Maps a head hex to its tail for a unit of this kind, or undefined for a one-hex unit (for hex.ts's reachable/route). */
export function tailFn(id: CreatureId, side: Side): ((head: Hex) => Hex | null) | undefined {
  return isWide(id) ? (h) => tailOf(h, side) : undefined;
}

/** The hexes touching a group of hexes, without the group itself. */
export function around(hexes: readonly Hex[]): Hex[] {
  const out = new Set<Hex>();
  for (const h of hexes) for (const n of neighbours(h)) if (!hexes.includes(n)) out.add(n);
  return [...out];
}

/** Whether any hex of `a` is next to any hex of `b`. */
export function touching(a: readonly Hex[], b: readonly Hex[]): boolean {
  return a.some((h) => b.some((g) => distance(h, g) === 1));
}

/** Whether two stacks stand next to each other (either hex counts). */
export const adjacent = (a: Stack, b: Stack): boolean => touching(occupiedHexes(a), occupiedHexes(b));

/** Steps from the shooter's head to the nearest hex of the target (VCMI's isEnemyUnitWithinSpecifiedRange). */
export function shotDistance(shooter: Stack, target: Stack): number {
  return Math.min(...occupiedHexes(target).map((h) => distance(shooter.hex, h)));
}

/** x of a hex centre in half-hex units: odd rows sit half a hex right. */
const xOf = (h: Hex): number => colOf(h) * 2 + (rowOf(h) % 2);

/** VCMI's isHexInFront: `test` touches `h` on the side a unit of `side` faces (right for the attacker, left for the defender). */
export function inFront(h: Hex, test: Hex, side: Side): boolean {
  if (distance(h, test) !== 1) return false;
  return side === 0 ? xOf(test) > xOf(h) : xOf(test) < xOf(h);
}

/**
 * Whether a unit on `attacker` hexes strikes `target` hexes in its facing
 * direction; false means it turns round to strike (VCMI's !isToReverse) and
 * turns back after. Purely for animation: the rules don't change.
 */
export function facesTarget(side: Side, attacker: readonly Hex[], target: readonly Hex[]): boolean {
  return attacker.some((a) => target.some((d) => inFront(a, d, side)));
}

/** Where a wide unit's head stands when its tail is on `tail` (VCMI's cloneInDirection(headDirection)); null off the field. */
export function headOf(tail: Hex, side: Side): Hex | null {
  const c = colOf(tail) + (side === 0 ? 1 : -1);
  const r = rowOf(tail);
  return onField(c, r) ? hexAt(c, r) : null;
}
