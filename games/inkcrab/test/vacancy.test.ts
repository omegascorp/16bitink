import { describe, expect, it } from 'vitest';
import { carve } from '../src/level/carve';
import type { Critter } from '../src/logic/critters';
import { centre, makeItem, shell, type Item } from '../src/logic/items';
import { makeRival, RIVAL } from '../src/logic/rivals';
import { Beach, IDLE, type BeachSetup, type SimEvent } from '../src/logic/sim';
import type { ShellKind } from '../src/logic/shells';
import { planChains, roomier } from '../src/logic/vacancy';

const T = 16;
const GROUND = 12;
const W = 64;
const flat = () => carve({ width: W, height: 24, seed: 1, profile: [[0, GROUND], [W - 1, GROUND]] });

/** A loose shell lying on the sand at column `col`. */
function loose(id: number, kind: ShellKind, col: number): Item {
  const proto = makeItem(id, shell(kind), 0, 0, false);
  return { ...proto, x: col * T + T / 2 - proto.w / 2, y: GROUND * T - proto.h };
}

/** A beach with the crab far off at column 4 (size 1, so no rival is shy of it). */
function beach(over: Partial<BeachSetup> = {}): Beach {
  return new Beach({ terrain: flat(), items: [], start: { x: 4 * T, y: GROUND * T }, tileSize: T, startShell: 'periwinkle', seed: 1, surfaceFood: 0, ...over });
}

const run = (b: Beach, seconds: number): SimEvent[] => {
  const events: SimEvent[] = [];
  for (let i = 0; i < Math.round(seconds * 60); i++) events.push(...b.step(IDLE, 1 / 60));
  return events;
};

/** Each rival's shell, by size. */
const wearing = (b: Beach): Record<number, ShellKind | null> =>
  Object.fromEntries([...b.critters.values()].filter((k) => k.species === 'hermit').map((k) => [k.size, k.shell ?? null]));

describe('roomier', () => {
  it('is a shell that fits the rival and gives it more room than its own', () => {
    const r = (kind: ShellKind, size: number): Critter => makeRival(flat(), 1, [kind, size, 10], T);
    expect(roomier(r('tulip', 4), 'lightningwhelk')).toBe(true);
    expect(roomier(r('tulip', 3), 'lightningwhelk')).toBe(false);
    expect(roomier(r('tulip', 4), 'figshell')).toBe(false);
    expect(roomier(r('tulip', 4), 'tulip')).toBe(false);
  });
});

describe('a vacancy chain', () => {
  const t = flat();
  const r1 = makeRival(t, 1, ['tulip', 4, 30], T);
  const r2 = makeRival(t, 2, ['figshell', 3, 34], T);
  const r3 = makeRival(t, 3, ['nassa', 2, 37], T);
  const whelk = loose(10, 'lightningwhelk', 26);

  it('sends the biggest crab that fits to the empty shell, and lines the rest up behind it by size', () => {
    const plan = planChains([r3, r1, r2], [whelk], T, new Set());
    expect(plan.get(1)?.take?.id).toBe(10);
    expect(plan.get(2)?.take).toBeNull();
    expect(plan.get(3)?.take).toBeNull();
    // A line from the shell outwards: biggest nearest it, on the side they came from.
    const x = (id: number): number => plan.get(id)!.x;
    expect(x(1)).toBeCloseTo(centre(whelk).x);
    expect(x(2)).toBeGreaterThan(x(1));
    expect(x(3)).toBeGreaterThan(x(2));
  });

  it('leaves alone a shell the crab is at and could move into: it is next in line', () => {
    expect(planChains([r1, r2, r3], [whelk], T, new Set([10])).size).toBe(0);
  });

  it('runs down the line on the beach, each crab moving into the shell the one ahead left', () => {
    const b = beach({ items: [whelk], rivals: [['tulip', 4, 30], ['figshell', 3, 34], ['nassa', 2, 37]] });
    const events = run(b, 15);
    expect(wearing(b)).toEqual({ 4: 'lightningwhelk', 3: 'tulip', 2: 'figshell' });
    // The last shell left over lies loose on the sand.
    expect([...b.items.values()].map((i) => (i.kind.type === 'shell' ? i.kind.shell : null))).toEqual(['nassa']);
    expect(events.filter((e) => e.type === 'traded')).toHaveLength(3);
  });

  it('never trades down, or into a shell that doesn\'t fit', () => {
    const b = beach({ items: [loose(10, 'figshell', 26), loose(11, 'horseconch', 34)], rivals: [['tulip', 4, 30]] });
    run(b, 10);
    expect(wearing(b)).toEqual({ 4: 'tulip' });
    expect(b.items.size).toBe(2);
  });

  it('lets the crab take its turn: a rival won\'t take a shell the crab is at, if it fits the crab', () => {
    const b = beach({
      items: [loose(10, 'lightningwhelk', 21)], rivals: [['tulip', 5, 25]],
      start: { x: 20 * T, y: GROUND * T }, startGrowth: { size: 4, meter: 0, bank: 0 },
    });
    run(b, 6);
    expect(wearing(b)).toEqual({ 5: 'tulip' });
    expect(b.items.get(10)).toBeDefined();
  });

  it('starts when the crab changes shell: smaller crabs trade up behind it once it walks off', () => {
    const b = beach({
      items: [loose(10, 'lightningwhelk', 21)], start: { x: 20 * T, y: GROUND * T }, startShell: 'tulip', startGrowth: { size: 5, meter: 0, bank: 0 },
      rivals: [['figshell', 3, 26], ['nassa', 2, 29], ['periwinkle', 1, 32]],
    });
    for (let i = 0; i < 6 && !b.crab.swap; i++) b.step({ ...IDLE, interact: true }, 1 / 60);
    run(b, 2);
    expect(b.crab.shell).toBe('lightningwhelk');
    // Standing at its old tulip, which still fits it, the crab has first refusal.
    expect(wearing(b)[3]).toBe('figshell');
    for (let i = 0; i < 90; i++) b.step({ ...IDLE, moveX: -1 }, 1 / 60);
    run(b, 15);
    expect(wearing(b)).toEqual({ 3: 'tulip', 2: 'figshell', 1: 'nassa' });
    expect([...b.items.values()].map((i) => (i.kind.type === 'shell' ? i.kind.shell : null))).toEqual(['periwinkle']);
  });

  it('keeps a rival with nothing to do near home, so a line of neighbours is still there later', () => {
    const b = beach({ rivals: [['nassa', 2, 40]] });
    for (let i = 0; i < 6; i++) {
      run(b, 10);
      const k = [...b.critters.values()].find((r) => r.species === 'hermit')!;
      expect(Math.abs(centre(k).x - (40 * T + T / 2))).toBeLessThanOrEqual((RIVAL.roam + 1) * T);
    }
  });
});
