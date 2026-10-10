import { describe, expect, it } from 'vitest';
import { shellOf } from '../src/logic/shells';
import { carve } from '../src/level/carve';
import { makeItem, shell } from '../src/logic/items';
import { RIVAL } from '../src/logic/rivals';
import { Beach, IDLE, type BeachSetup, type Input, type SimEvent } from '../src/logic/sim';
import { boxHitsSolid } from '../src/logic/body';
import { setTile, surfaceRow, TILE } from '../src/logic/terrain';

const T = 16;
const GROUND = 12;
const W = 64;

function beach(over: Partial<BeachSetup> = {}): Beach {
  const terrain = carve({ width: W, height: 24, seed: 1, profile: [[0, GROUND], [W - 1, GROUND]] });
  return new Beach({
    terrain, items: [], start: { x: 20 * T, y: GROUND * T }, tileSize: T, startShell: shellOf('periwinkle'), seed: 1, surfaceFood: 0,
    startGrowth: { size: 3, meter: 0 }, ...over,
  });
}

const run = (b: Beach, input: Partial<Input>, seconds: number): SimEvent[] => {
  const events: SimEvent[] = [];
  for (let i = 0; i < Math.round(seconds * 60); i++) events.push(...b.step({ ...IDLE, ...input }, 1 / 60));
  return events;
};

const rivalOf = (b: Beach) => [...b.critters.values()].find((k) => k.species === 'hermit')!;

/** Every shell on the beach: loose, worn by the crab, or worn by a rival. */
const shells = (b: Beach): string[] => [
  ...[...b.items.values()].flatMap((i) => (i.kind.type === 'shell' ? [i.kind.shell.kind] : [])),
  ...(b.crab.shell ? [b.crab.shell.kind] : []),
  ...[...b.critters.values()].flatMap((k) => (k.shell ? [k.shell.kind] : [])),
].sort();

describe('rival hermit crabs', () => {
  it('tuck into their shell when a crab their size or bigger comes close', () => {
    const b = beach({ rivals: [['figshell', 2, 21]] });
    run(b, {}, 0.3);
    expect(rivalOf(b).tucked).toBe(true);
    const far = beach({ rivals: [['figshell', 2, 40]] });
    run(far, {}, 0.3);
    expect(rivalOf(far).tucked).toBe(false);
  });

  it("ignore a smaller crab, and can't be rapped by it", () => {
    const b = beach({ rivals: [['tulip', 5, 21]] });
    const events = run(b, { interact: true }, 0.3);
    expect(rivalOf(b).tucked).toBe(false);
    expect(rivalOf(b).shell).toEqual(shellOf('tulip', 5));
    expect(events.some((e) => e.type === 'rapped')).toBe(false);
  });

  it('let go of their shell when rapped, and run off', () => {
    const b = beach({ rivals: [['figshell', 2, 21]] });
    run(b, {}, 0.2);
    const before = shells(b);
    const events = run(b, { interact: true }, 1 / 60);
    const rapped = events.find((e) => e.type === 'rapped');
    expect(rapped).toBeDefined();
    expect(rivalOf(b).shell).toBeNull();
    const loose = [...b.items.values()].find((i) => i.kind.type === 'shell');
    expect(loose?.kind).toEqual(shell('figshell', 2));
    expect(shells(b)).toEqual(before);
    const x = rivalOf(b).x;
    run(b, {}, RIVAL.fleeFor * 0.8);
    expect(Math.abs(rivalOf(b).x - x)).toBeGreaterThan(T / 2);
  });

  it('drop a rapped shell clear of the sand, even right by a step', () => {
    const b = beach({ rivals: [['horseconch', 3, 21]] });
    // A two-tile step just past the rival.
    for (const y of [GROUND - 2, GROUND - 1]) setTile(b.terrain, 22, y, TILE.sand);
    run(b, {}, 0.2);
    run(b, { interact: true }, 1 / 60);
    const loose = [...b.items.values()].find((i) => i.kind.type === 'shell')!;
    expect(loose).toBeDefined();
    expect(boxHitsSolid(b.terrain, loose, T)).toBe(false);
  });

  it('out of a shell, make for a loose one that fits and move in', () => {
    const b = beach({ rivals: [['figshell', 2, 40]] });
    const k = rivalOf(b);
    b.critters.set(k.id, { ...k, shell: null });
    const nassa = makeItem(500, shell('nassa', 2), 46 * T, surfaceRow(b.terrain, 46) * T - 10, false);
    b.items.set(500, { ...nassa, y: surfaceRow(b.terrain, 46) * T - nassa.h });
    const before = shells(b);
    run(b, {}, 6);
    expect(rivalOf(b).shell).toEqual(shellOf('nassa', 2));
    expect(b.items.has(500)).toBe(false);
    expect(shells(b)).toEqual(before);
  });

  it('never catch the crab, and are never eaten', () => {
    const big = beach({ rivals: [['horseconch', 7, 20]] });
    const events = run(big, { moveX: 0.3 }, 2);
    expect(events.some((e) => e.type === 'caught')).toBe(false);
    expect(big.lives).toBe(3);
    const small = beach({ rivals: [['nassa', 1, 20]] });
    run(small, { moveX: 0.3 }, 2);
    expect(rivalOf(small)).toBeDefined();
  });

  it('come second to a shell that fits: E moves the crab in rather than rapping', () => {
    const b = beach({ rivals: [['figshell', 2, 21]] });
    const tulip = makeItem(600, shell('tulip', 4), 20 * T, 0, false);
    b.items.set(600, { ...tulip, y: surfaceRow(b.terrain, 20) * T - tulip.h });
    run(b, {}, 0.2);
    const events = run(b, { interact: true }, 1 / 60);
    expect(events.some((e) => e.type === 'swapStart')).toBe(true);
    expect(events.some((e) => e.type === 'rapped')).toBe(false);
  });
});
