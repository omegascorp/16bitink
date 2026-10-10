import { describe, expect, it } from 'vitest';
import { shellOf } from '../src/logic/shells';
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

/** A loose shell of a kind and size lying on the sand at column `col`. */
function loose(id: number, kind: ShellKind, size: number, col: number): Item {
  const proto = makeItem(id, shell(kind, size), 0, 0, false);
  return { ...proto, x: col * T + T / 2 - proto.w / 2, y: GROUND * T - proto.h };
}

/** A beach with the crab far off at column 4 (size 1, so no rival is shy of it). */
function beach(over: Partial<BeachSetup> = {}): Beach {
  return new Beach({ terrain: flat(), items: [], start: { x: 4 * T, y: GROUND * T }, tileSize: T, startShell: shellOf('periwinkle'), seed: 1, surfaceFood: 0, ...over });
}

const run = (b: Beach, seconds: number): SimEvent[] => {
  const events: SimEvent[] = [];
  for (let i = 0; i < Math.round(seconds * 60); i++) events.push(...b.step(IDLE, 1 / 60));
  return events;
};

/** Each rival's shell, by its size: "tulip 5". */
const wearing = (b: Beach): Record<number, string | null> =>
  Object.fromEntries([...b.critters.values()].filter((k) => k.species === 'hermit').map((k) => [k.size, k.shell ? `${k.shell.kind} ${k.shell.size}` : null]));

const looseShells = (b: Beach): string[] => [...b.items.values()].flatMap((i) => (i.kind.type === 'shell' ? [`${i.kind.shell.kind} ${i.kind.shell.size}`] : []));

/** A crab of size 5, full in a size-5 tulip shell, at column 20. */
const full5 = { start: { x: 20 * T, y: GROUND * T }, startShell: shellOf('tulip', 5), startGrowth: { size: 5, meter: 0, bank: 0 } } as const;

describe('roomier', () => {
  it('is the next size up, for a rival that has grown to fill its shell', () => {
    const r = (kind: ShellKind, size: number, body: number): Critter => makeRival(flat(), 1, [kind, size, 10, body], T);
    expect(roomier(r('tulip', 4, 4), shellOf('lightningwhelk', 5))).toBe(true);
    expect(roomier(r('tulip', 4, 3), shellOf('lightningwhelk', 5))).toBe(false);
    expect(roomier(r('tulip', 4, 4), shellOf('figshell', 4))).toBe(false);
    expect(roomier(r('tulip', 4, 4), shellOf('tulip', 6))).toBe(false);
  });
});

describe('a vacancy chain', () => {
  const t = flat();
  const r1 = makeRival(t, 1, ['tulip', 4, 30, 4], T);
  const r2 = makeRival(t, 2, ['figshell', 3, 34, 3], T);
  const r3 = makeRival(t, 3, ['nassa', 2, 37, 2], T);
  const whelk = loose(10, 'lightningwhelk', 5, 26);

  it('sends the crab the empty shell would suit to it, and lines the rest up behind by size', () => {
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

  it('leaves alone a shell the crab is at and would move up into: it is next in line', () => {
    expect(planChains([r1, r2, r3], [whelk], T, new Set([10])).size).toBe(0);
  });

  it('runs down the line on the beach, each crab moving into the shell the one ahead left', () => {
    const b = beach({ items: [whelk], rivals: [['tulip', 4, 30, 4], ['figshell', 3, 34, 3], ['nassa', 2, 37, 2]] });
    const events = run(b, 15);
    expect(wearing(b)).toEqual({ 4: 'lightningwhelk 5', 3: 'tulip 4', 2: 'figshell 3' });
    // The last shell left over lies loose on the sand.
    expect(looseShells(b)).toEqual(['nassa 2']);
    expect(events.filter((e) => e.type === 'traded')).toHaveLength(3);
  });

  it('never trades down, or into a shell two sizes up', () => {
    const b = beach({ items: [loose(10, 'figshell', 3, 26), loose(11, 'horseconch', 6, 34)], rivals: [['tulip', 4, 30, 4]] });
    run(b, 10);
    expect(wearing(b)).toEqual({ 4: 'tulip 4' });
    expect(b.items.size).toBe(2);
  });

  it('lets the crab take its turn: a rival won\'t take a shell the crab is at and would move up into', () => {
    const b = beach({
      items: [loose(10, 'lightningwhelk', 5, 21)], rivals: [['tulip', 4, 25, 4]],
      start: { x: 20 * T, y: GROUND * T }, startShell: shellOf('tulip', 4), startGrowth: { size: 4, meter: 0, bank: 0 },
    });
    run(b, 6);
    expect(wearing(b)).toEqual({ 4: 'tulip 4' });
    expect(b.items.get(10)).toBeDefined();
  });

  it('lines smaller crabs up behind the crab by size, each after the shell of the one ahead', () => {
    const b = beach({ ...full5, rivals: [['periwinkle', 2, 24, 2], ['figshell', 4, 26, 4], ['nassa', 3, 22, 3]] });
    run(b, 4);
    const x = (size: number): number => centre([...b.critters.values()].find((k) => k.species === 'hermit' && k.size === size)!).x;
    const crab = centre(b.crab.body).x;
    // Trailing on the left (it starts facing right): the fig shell nearest, then the nassa, then the periwinkle.
    expect(x(4)).toBeLessThan(crab);
    expect(x(3)).toBeLessThan(x(4));
    expect(x(2)).toBeLessThan(x(3));
    expect([...b.chains.values()].every((s) => s.follow)).toBe(true);
    expect(b.chains.size).toBe(3);
  });

  it('follows the crab along the beach, and swings round behind it when it turns', () => {
    const b = beach({ ...full5, rivals: [['figshell', 4, 24, 4]] });
    run(b, 3);
    for (let i = 0; i < 150; i++) b.step({ ...IDLE, moveX: 1 }, 1 / 60);
    run(b, 3);
    const follower = (): number => centre([...b.critters.values()].find((k) => k.species === 'hermit')!).x;
    expect(centre(b.crab.body).x - follower()).toBeGreaterThan(0);
    expect(centre(b.crab.body).x - follower()).toBeLessThan(3 * T);
    for (let i = 0; i < 120; i++) b.step({ ...IDLE, moveX: -1 }, 1 / 60);
    run(b, 3);
    expect(follower()).toBeGreaterThan(centre(b.crab.body).x);
  });

  it('keeps out of reach of a rap while it follows', () => {
    const b = beach({ ...full5, rivals: [['figshell', 4, 24, 4]] });
    run(b, 4);
    expect(b.nearbyRival).toBeNull();
  });

  it('trades up all down the line the moment the crab moves house', () => {
    const b = beach({ ...full5, items: [loose(10, 'lightningwhelk', 6, 21)], rivals: [['figshell', 4, 14, 4], ['nassa', 3, 12, 3], ['periwinkle', 2, 10, 2]] });
    run(b, 4);
    expect(b.chains.size).toBe(3);
    for (let i = 0; i < 6 && !b.crab.swap; i++) b.step({ ...IDLE, interact: true }, 1 / 60);
    const events = run(b, 6);
    expect(b.crab.shell).toEqual(shellOf('lightningwhelk', 6));
    expect(wearing(b)).toEqual({ 4: 'tulip 5', 3: 'figshell 4', 2: 'nassa 3' });
    expect(events.filter((e) => e.type === 'traded')).toHaveLength(3);
    expect(looseShells(b)).toEqual(['periwinkle 2']);
  });

  it('pays no heed to a crab whose shell it couldn\'t use', () => {
    const b = beach({ ...full5, rivals: [['lightningwhelk', 5, 24, 5], ['figshell', 4, 28, 3]] });
    run(b, 3);
    expect(b.chains.size).toBe(0);
  });

  it('keeps a rival with nothing to do near home, so a line of neighbours is still there later', () => {
    const b = beach({ rivals: [['nassa', 3, 40]] });
    for (let i = 0; i < 6; i++) {
      run(b, 10);
      const k = [...b.critters.values()].find((r) => r.species === 'hermit')!;
      expect(Math.abs(centre(k).x - (40 * T + T / 2))).toBeLessThanOrEqual((RIVAL.roam + 1) * T);
    }
  });
});
