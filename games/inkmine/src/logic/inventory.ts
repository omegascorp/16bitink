import { addHold, EMPTY_HOLD, holdEntries, type Hold } from './hold';
import { ORES, type OreKey } from './ore';

/**
 * A slot inventory, No Man's Sky style: a grid of slots, each empty or
 * holding a stack of one ore up to `stack` pieces. The suit's bag and the
 * ship's cargo are both one; they differ in slots and stack size. A new ore
 * type needs a free slot, so a varied haul fills a bag faster than one vein.
 * Every change returns a new inventory.
 */
export interface Stack {
  readonly ore: OreKey;
  readonly n: number;
}

export interface Inventory {
  readonly slots: readonly (Stack | null)[];
  /** Most pieces a slot stacks. */
  readonly stack: number;
}

export function emptyInventory(slots: number, stack: number): Inventory {
  return { slots: Array.from({ length: slots }, () => null), stack };
}

/** The same contents in a grid of `slots` (more after an upgrade); stacks past the end, or over the stack size, are cut, so only ever grow it. */
export function resize(inv: Inventory, slots: number, stack = inv.stack): Inventory {
  const n = Math.max(slots, 0);
  const cap = (s: Stack): Stack => ({ ore: s.ore, n: Math.min(s.n, stack) });
  // Shrinking: stacks in the cut slots move into empty ones first; only what still doesn't fit is lost.
  const cut = inv.slots.slice(n).filter((s): s is Stack => s !== null);
  return {
    slots: Array.from({ length: n }, (_, i) => {
      const s = inv.slots[i] ?? cut.shift();
      return s ? cap(s) : null;
    }),
    stack,
  };
}

export function countIn(inv: Inventory, ore: OreKey): number {
  return inv.slots.reduce((n, s) => n + (s?.ore === ore ? s.n : 0), 0);
}

/** Everything in it, as counts by ore. */
export function contents(inv: Inventory): Hold {
  return inv.slots.reduce<Hold>((h, s) => (s ? addHold(h, { [s.ore]: s.n }) : h), EMPTY_HOLD);
}

export const usedSlots = (inv: Inventory): number => inv.slots.filter((s) => s !== null).length;
export const isEmpty = (inv: Inventory): boolean => inv.slots.every((s) => s === null);

/** How many more of `ore` fit: room on its stacks plus whole empty slots. */
export function roomFor(inv: Inventory, ore: OreKey): number {
  return inv.slots.reduce((n, s) => n + (s === null ? inv.stack : s.ore === ore ? inv.stack - s.n : 0), 0);
}

/** Puts in up to `n` of `ore`: topping up its stacks first, then filling empty slots. Returns the inventory and how many went in. */
export function addOre(inv: Inventory, ore: OreKey, n: number): { inv: Inventory; added: number } {
  let left = n;
  const slots = inv.slots.map((s) => {
    if (left <= 0 || !s || s.ore !== ore || s.n >= inv.stack) return s;
    const put = Math.min(left, inv.stack - s.n);
    left -= put;
    return { ore, n: s.n + put };
  });
  for (let i = 0; i < slots.length && left > 0; i++) {
    if (slots[i] !== null) continue;
    const put = Math.min(left, inv.stack);
    slots[i] = { ore, n: put };
    left -= put;
  }
  return { inv: { ...inv, slots }, added: n - left };
}

/** Takes out up to `n` of `ore`, from the smallest stacks first (so slots free up). Returns the inventory and how many came out. */
export function takeOre(inv: Inventory, ore: OreKey, n: number): { inv: Inventory; taken: number } {
  const order = inv.slots.map((s, i) => [s, i] as const).filter(([s]) => s?.ore === ore).sort(([a], [b]) => a!.n - b!.n).map(([, i]) => i);
  const slots = [...inv.slots];
  let left = n;
  for (const i of order) {
    if (left <= 0) break;
    const s = slots[i]!;
    const out = Math.min(left, s.n);
    left -= out;
    slots[i] = s.n - out > 0 ? { ore, n: s.n - out } : null;
  }
  return { inv: { ...inv, slots }, taken: n - left };
}

/** Puts in as much of a whole hold as fits; returns what didn't. */
export function addHoldTo(inv: Inventory, h: Hold): { inv: Inventory; left: Hold } {
  let next = inv;
  const left: Partial<Record<OreKey, number>> = {};
  for (const [ore, n] of holdEntries(h)) {
    const r = addOre(next, ore, n);
    next = r.inv;
    if (r.added < n) left[ore] = n - r.added;
  }
  return { inv: next, left };
}

/** Takes a whole hold out (as much as there is); returns what couldn't be found. */
export function takeHoldFrom(inv: Inventory, h: Hold): { inv: Inventory; short: Hold } {
  let next = inv;
  const short: Partial<Record<OreKey, number>> = {};
  for (const [ore, n] of holdEntries(h)) {
    const r = takeOre(next, ore, n);
    next = r.inv;
    if (r.taken < n) short[ore] = n - r.taken;
  }
  return { inv: next, short };
}

/**
 * Moves everything from `from` into `to` that fits, stack by stack, the
 * rarest ore first (it's worth the room). Returns both inventories and the
 * counts that moved.
 */
export function transferAll(from: Inventory, to: Inventory): { from: Inventory; to: Inventory; moved: Hold } {
  const ores = holdEntries(contents(from)).map(([ore]) => ore).sort((a, b) => ORES[b].value - ORES[a].value);
  let src = from;
  let dst = to;
  let moved: Hold = EMPTY_HOLD;
  for (const ore of ores) {
    const r = addOre(dst, ore, countIn(src, ore));
    if (!r.added) continue;
    dst = r.inv;
    src = takeOre(src, ore, r.added).inv;
    moved = addHold(moved, { [ore]: r.added });
  }
  return { from: src, to: dst, moved };
}

/** Keeps `share` (0..1) of every stack, rounded down: what a winch saves on a recall. */
export function keepShare(inv: Inventory, share: number): Inventory {
  return { ...inv, slots: inv.slots.map((s) => {
    const n = s ? Math.floor(s.n * share) : 0;
    return s && n > 0 ? { ore: s.ore, n } : null;
  }) };
}

export interface SlotRef {
  /** Which inventory: 0 or 1 of the pair being managed (the suit and the ship). */
  readonly bag: 0 | 1;
  readonly slot: number;
}

/**
 * Moves the stack in slot `a` onto slot `b`, either inventory to either:
 * into an empty slot, onto a stack of the same ore (as much as fits, the
 * rest stays), or swapping with a different ore (if each fits the other's
 * stack size). Returns the pair, unchanged when nothing can move.
 */
export function moveStack(pair: readonly [Inventory, Inventory], a: SlotRef, b: SlotRef): [Inventory, Inventory] {
  if (a.bag === b.bag && a.slot === b.slot) return [pair[0], pair[1]];
  const src = pair[a.bag].slots[a.slot];
  if (!src) return [pair[0], pair[1]];
  const dstInv = pair[b.bag];
  const dst = dstInv.slots[b.slot];
  if (dst === undefined) return [pair[0], pair[1]];
  const set = (p: [Inventory, Inventory], ref: SlotRef, s: Stack | null): [Inventory, Inventory] => {
    const out: [Inventory, Inventory] = [p[0], p[1]];
    const inv = out[ref.bag];
    out[ref.bag] = { ...inv, slots: inv.slots.map((x, i) => (i === ref.slot ? s : x)) };
    return out;
  };
  if (dst === null || dst.ore === src.ore) {
    const have = dst?.n ?? 0;
    const put = Math.min(src.n, dstInv.stack - have);
    if (put <= 0) return [pair[0], pair[1]];
    const placed = set([pair[0], pair[1]], b, { ore: src.ore, n: have + put });
    return set(placed, a, src.n - put > 0 ? { ore: src.ore, n: src.n - put } : null);
  }
  // A different ore: swap, if each stack fits where it's going.
  if (src.n > dstInv.stack || dst.n > pair[a.bag].stack) return [pair[0], pair[1]];
  return set(set([pair[0], pair[1]], b, src), a, dst);
}

/** Splits half of a stack (rounded down) into the first empty slot of the same inventory. */
export function splitStack(inv: Inventory, slot: number): Inventory {
  const s = inv.slots[slot];
  const free = inv.slots.indexOf(null);
  if (!s || s.n < 2 || free < 0) return inv;
  const half = Math.floor(s.n / 2);
  return { ...inv, slots: inv.slots.map((x, i) => (i === slot ? { ore: s.ore, n: s.n - half } : i === free ? { ore: s.ore, n: half } : x)) };
}

/** Throws a stack away. */
export function jettison(inv: Inventory, slot: number): Inventory {
  return { ...inv, slots: inv.slots.map((x, i) => (i === slot ? null : x)) };
}
