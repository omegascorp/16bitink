import { describe, expect, it } from 'vitest';
import { addOre, contents, countIn, emptyInventory, jettison, keepShare, moveStack, resize, roomFor, splitStack, takeOre, transferAll, type Inventory } from '../src/logic/inventory';

const filled = (stack: number, ...stacks: ([string, number] | null)[]): Inventory =>
  ({ stack, slots: stacks.map((s) => (s ? { ore: s[0] as 'copper', n: s[1] } : null)) });

describe('a slot inventory', () => {
  it('tops up a stack of the same ore before taking an empty slot, and spills into new slots', () => {
    const inv = filled(10, ['copper', 8], null, null);
    const r = addOre(inv, 'copper', 15);
    expect(r.added).toBe(15);
    expect(r.inv.slots).toEqual([{ ore: 'copper', n: 10 }, { ore: 'copper', n: 10 }, { ore: 'copper', n: 3 }]);
  });

  it('a new ore needs a free slot', () => {
    const inv = filled(10, ['copper', 3], ['galena', 10]);
    expect(roomFor(inv, 'copper')).toBe(7);
    expect(roomFor(inv, 'quartz')).toBe(0);
    expect(addOre(inv, 'quartz', 1).added).toBe(0);
  });

  it('takes from the smallest stacks first, freeing slots', () => {
    const inv = filled(10, ['copper', 10], ['copper', 2], ['galena', 4]);
    const r = takeOre(inv, 'copper', 5);
    expect(r.taken).toBe(5);
    expect(r.inv.slots).toEqual([{ ore: 'copper', n: 7 }, null, { ore: 'galena', n: 4 }]);
    expect(countIn(r.inv, 'copper')).toBe(7);
  });

  it('moves everything that fits into a bigger store, and leaves the rest', () => {
    const bag = filled(10, ['copper', 10], ['quartz', 2], ['galena', 5]);
    const cargo = filled(50, ['copper', 45], null);
    const r = transferAll(bag, cargo);
    // Quartz is rarest so goes first into the free slot; copper tops up its stack; galena finds no room.
    expect(r.moved).toEqual({ quartz: 2, copper: 5 });
    expect(contents(r.from)).toEqual({ copper: 5, galena: 5 });
    expect(contents(r.to)).toEqual({ copper: 50, quartz: 2 });
  });

  it('moves, merges and swaps stacks between two inventories', () => {
    const suit = filled(10, ['copper', 6], ['galena', 3]);
    const ship = filled(50, ['copper', 48], null);
    // Onto the same ore: as much as fits, the rest stays.
    const [s1, c1] = moveStack([suit, ship], { bag: 0, slot: 0 }, { bag: 1, slot: 0 });
    expect(c1.slots[0]).toEqual({ ore: 'copper', n: 50 });
    expect(s1.slots[0]).toEqual({ ore: 'copper', n: 4 });
    // Into an empty slot.
    const [s2, c2] = moveStack([s1, c1], { bag: 0, slot: 1 }, { bag: 1, slot: 1 });
    expect(s2.slots[1]).toBeNull();
    expect(c2.slots[1]).toEqual({ ore: 'galena', n: 3 });
    // A different ore swaps places.
    const [s3, c3] = moveStack([s2, c2], { bag: 1, slot: 1 }, { bag: 0, slot: 0 });
    expect(s3.slots[0]).toEqual({ ore: 'galena', n: 3 });
    expect(c3.slots[1]).toEqual({ ore: 'copper', n: 4 });
    // A big ship stack into an empty suit slot: only a suit stack's worth goes.
    const [s4, c4] = moveStack([s3, c3], { bag: 1, slot: 0 }, { bag: 0, slot: 1 });
    expect(s4.slots[1]).toEqual({ ore: 'copper', n: 10 });
    expect(c4.slots[0]).toEqual({ ore: 'copper', n: 40 });
    // It can't swap with a suit stack: 40 won't fit a suit slot. Nothing moves.
    expect(moveStack([s4, c4], { bag: 1, slot: 0 }, { bag: 0, slot: 0 })).toEqual([s4, c4]);
  });

  it('splits a stack in two and jettisons one', () => {
    const inv = filled(10, ['copper', 7], null);
    const split = splitStack(inv, 0);
    expect(split.slots).toEqual([{ ore: 'copper', n: 4 }, { ore: 'copper', n: 3 }]);
    expect(jettison(split, 1).slots).toEqual([{ ore: 'copper', n: 4 }, null]);
  });

  it('keeps a share of each stack (the winch), and grows without losing anything', () => {
    expect(keepShare(filled(10, ['copper', 7], ['galena', 1]), 0.5).slots).toEqual([{ ore: 'copper', n: 3 }, null]);
    const grown = resize(filled(10, ['copper', 7]), 3);
    expect(grown.slots).toEqual([{ ore: 'copper', n: 7 }, null, null]);
    expect(emptyInventory(2, 10).slots).toEqual([null, null]);
  });
});
