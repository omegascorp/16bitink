import { describe, expect, it } from 'vitest';
import { shellPx } from '../src/logic/shells';
import { critterBox, makeCritter, stepCritter, type Critter, type Quarry } from '../src/logic/critters';
import { createRng } from '../src/logic/rng';
import { createTerrain, setTile, TILE, type Terrain } from '../src/logic/terrain';

const T = 16;

function flat(): Terrain {
  const t = createTerrain(60, 16);
  for (let x = 0; x < 60; x++) for (let y = 10; y < 16; y++) setTile(t, x, y, TILE.sand);
  return t;
}

const run = (t: Terrain, c: Critter, q: Quarry | null, seconds: number): Critter => {
  const rng = createRng(3);
  let out = c;
  for (let i = 0; i < seconds * 60; i++) out = stepCritter(t, out, q, 1 / 60, T, rng);
  return out;
};

/** A quarry standing on the sand at tile column `col`. */
const quarry = (col: number, size: number, hidden = false): Quarry => ({ box: { x: col * T, y: 10 * T - 12, w: 14, h: 12 }, size, hidden });

describe('ghost crabs', () => {
  it('chase a smaller crab they can see', () => {
    const c = makeCritter(1, 4, 20 * T, 10 * T, -1, 10);
    const after = run(flat(), c, quarry(24, 2), 0.5);
    expect(after.dir).toBe(1);
    expect(after.x).toBeGreaterThan(c.x);
  });

  it('run from a bigger crab', () => {
    const c = makeCritter(1, 1, 20 * T, 10 * T, 1, 10);
    const after = run(flat(), c, quarry(24, 3), 0.5);
    expect(after.dir).toBe(-1);
    expect(after.x).toBeLessThan(c.x);
  });

  it('ignore a crab hiding in its shell', () => {
    const c = makeCritter(1, 4, 20 * T, 10 * T, -1, 10);
    const after = run(flat(), c, quarry(24, 2, true), 0.5);
    expect(after.dir).toBe(-1);
  });

  it('ignore one out of sight', () => {
    const c = makeCritter(1, 4, 10 * T, 10 * T, -1, 10);
    expect(run(flat(), c, quarry(40, 2), 0.5).dir).toBe(-1);
  });

  it('turn round at a wall they cannot step up', () => {
    const t = flat();
    for (let y = 6; y < 10; y++) setTile(t, 24, y, TILE.sand);
    const c = makeCritter(1, 2, 21 * T, 10 * T, 1, 10);
    const after = run(t, c, null, 2);
    expect(after.dir).toBe(-1);
    expect(after.x + after.w).toBeLessThanOrEqual(24 * T);
  });

  it('turn back from a deep pit rather than walk in', () => {
    const t = flat();
    for (let x = 24; x < 27; x++) for (let y = 10; y < 15; y++) setTile(t, x, y, TILE.air);
    const c = makeCritter(1, 2, 21 * T, 10 * T, 1, 10);
    const after = run(t, c, null, 3);
    expect(after.y + after.h).toBeCloseTo(10 * T, 3);
  });

  it('are sized on the hermit crab scale', () => {
    expect(critterBox(4).w).toBeGreaterThan(critterBox(2).w);
  });

  it('draws every kind about as big as a crab in a shell of its size, so bigger looks bigger', () => {
    for (const species of ['ghostcrab', 'slater', 'beetle'] as const) expect(critterBox(5, species).w).toBeGreaterThanOrEqual(shellPx(5) * 0.95);
  });

  describe('kinds', () => {
    it('a sea slater never chases, even when it is bigger', () => {
      const c = makeCritter(1, 4, 20 * T, 10 * T, -1, 10, 'slater');
      expect(run(flat(), c, quarry(24, 2), 0.5).dir).toBe(-1);
    });

    it('a sea slater still runs from a bigger crab', () => {
      const c = makeCritter(1, 1, 20 * T, 10 * T, 1, 10, 'slater');
      expect(run(flat(), c, quarry(24, 3), 0.5).dir).toBe(-1);
    });

    it('a tiger beetle spots the crab from further off and dashes in bursts', () => {
      const t = flat();
      const beetle = makeCritter(1, 4, 20 * T, 10 * T, -1, 10, 'beetle');
      const crab = makeCritter(2, 4, 20 * T, 10 * T, -1, 10, 'ghostcrab');
      // 7 tiles off: past a ghost crab's sight, inside a beetle's.
      expect(run(t, beetle, quarry(27, 2), 0.3).dir).toBe(1);
      expect(run(t, crab, quarry(27, 2), 0.3).dir).toBe(-1);
      // Over a full run-and-rest cycle it covers ground, but stands still part of the time.
      const rng = createRng(1);
      let b: Critter = { ...beetle, dir: 1 };
      let still = 0;
      for (let i = 0; i < 72; i++) {
        const next = stepCritter(t, b, quarry(40, 2), 1 / 60, T, rng);
        if (Math.abs(next.x - b.x) < 1e-6) still++;
        b = next;
      }
      expect(still).toBeGreaterThan(15);
      expect(b.x).toBeGreaterThan(beetle.x);
    });

    it('come in their own shapes', () => {
      expect(critterBox(3, 'slater').h).toBeLessThan(critterBox(3, 'ghostcrab').h);
    });
  });
});
