import type { Side, Stack } from './battleTypes';
import { sizeOf, type CreatureId } from './creatures';
import { colOf, distance, hexAt, neighbours, onField, rowOf, type Hex } from './hex';

/**
 * Units of one, two or three hexes, after VCMI's battle::Unit (its
 * double-wide, run on to three): a unit stands on its head hex
 * (`stack.hex`) and the hexes behind it in the same row, its body. The
 * attacker faces right, so its body runs left; the defender faces left, its
 * body runs right. Facing never changes.
 */
export type UnitSize = 1 | 2 | 3;

export { sizeOf };

/** Whether a unit fills more than one hex. */
export const isWide = (id: CreatureId): boolean => sizeOf(id) > 1;

/** The hex `n` columns behind `h` for a unit of `side` (forward when `n` is negative), or null off the field (it never wraps rows). */
function behind(h: Hex, side: Side, n: number): Hex | null {
  const c = colOf(h) + (side === 0 ? -n : n);
  const r = rowOf(h);
  return onField(c, r) ? hexAt(c, r) : null;
}

/** VCMI's occupiedHex: the hex just behind a unit's head, or null when it would leave the field. */
export const tailOf = (head: Hex, side: Side): Hex | null => behind(head, side, 1);

/** The hexes a unit of `size` would cover with its head on `head`, head first; null if it doesn't fit on the field. */
export function footprintAt(head: Hex, size: number, side: Side): Hex[] | null {
  const out: Hex[] = [];
  for (let i = 0; i < size; i++) {
    const h = behind(head, side, i);
    if (h === null) return null;
    out.push(h);
  }
  return out;
}

/** The hexes a stack covers now, head first (one to three). */
export function occupiedHexes(s: Stack): Hex[] {
  return footprintAt(s.hex, sizeOf(s.creature), s.side) ?? [s.hex];
}

export const covers = (s: Stack, h: Hex): boolean => occupiedHexes(s).includes(h);

/** Maps a head hex to the rest of the body for a unit of this kind, or undefined for a one-hex unit (for hex.ts's reachable/route). */
export function bodyFn(id: CreatureId, side: Side): ((head: Hex) => Hex[] | null) | undefined {
  const size = sizeOf(id);
  return size > 1 ? (h) => footprintAt(h, size, side)?.slice(1) ?? null : undefined;
}

/** The heads that would put a unit of `size` over `h`: `h` itself, then one, two hexes forward (h its middle, then its last); those on the field. */
export function headsOver(h: Hex, size: number, side: Side): Hex[] {
  const out: Hex[] = [];
  for (let i = 0; i < size; i++) {
    const head = behind(h, side, -i);
    if (head !== null) out.push(head);
  }
  return out;
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

/** Whether two stacks stand next to each other (any of their hexes counts). */
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

/** Where a unit's head stands when the hex just behind it is `tail` (VCMI's cloneInDirection(headDirection)); null off the field. */
export const headOf = (tail: Hex, side: Side): Hex | null => behind(tail, side, -1);
