import { describe, expect, it } from 'vitest';
import { shellPx } from '../src/logic/shells';
import { breached, critterBox, makeCritter, stepCritter, swimmable, type Critter, type Quarry } from '../src/logic/critters';
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

/** Flat sand from row 10 to bedrock at rows 14–15, with a tunnel in row 12 from column 30 to 40. */
function dug(): Terrain {
  const t = flat();
  for (let x = 0; x < 60; x++) for (let y = 14; y < 16; y++) setTile(t, x, y, TILE.rock);
  for (let x = 30; x <= 40; x++) setTile(t, x, 12, TILE.air);
  return t;
}

const underground = (col: number, size: number): Quarry => ({ box: { x: col * T, y: 12 * T + 2, w: 14, h: 12 }, size, hidden: false, buried: true });

describe('sandfish', () => {
  const skink = (size: number, col: number, row: number): Critter => makeCritter(1, size, col * T, row * T + 8, 1, 10, 'skink');

  it('swims through solid sand, never out of it or into rock', () => {
    const t = dug();
    let c = skink(3, 10, 11);
    const rng = createRng(5);
    for (let i = 0; i < 60 * 20; i++) {
      c = stepCritter(t, c, null, 1 / 60, T, rng);
      expect(swimmable(t, c, T)).toBe(true);
    }
    expect(Math.abs(c.x - 10 * T)).toBeGreaterThan(T);
  });

  it('homes in on a smaller crab down in a tunnel', () => {
    const t = dug();
    const c = skink(5, 26, 12);
    const after = run(t, c, underground(34, 2), 1.5);
    expect(after.x).toBeGreaterThan(c.x + T);
  });

  it('leaves a crab on the open surface alone', () => {
    const t = dug();
    const c = skink(5, 26, 12);
    const q: Quarry = { ...quarry(28, 2), buried: false };
    const after = stepCritter(t, c, q, 1 / 60, T, createRng(1));
    const hunting = stepCritter(t, c, underground(28, 2), 1 / 60, T, createRng(1));
    expect(Math.abs(after.vy)).toBeLessThan(Math.abs(hunting.vy) + Math.abs(hunting.vx));
    expect(after.dir).toBe(c.dir);
  });

  it('doesn\'t flee when it\'s the smaller one, so it can be dug out', () => {
    const t = dug();
    const c = skink(1, 28, 12);
    const after = stepCritter(t, c, underground(30, 4), 1 / 60, T, createRng(1));
    expect(after.dir).toBe(1);
  });

  it('shows itself only where it breaks into a tunnel', () => {
    const t = dug();
    expect(breached(t, skink(2, 10, 11), T)).toBe(false);
    expect(breached(t, { ...skink(2, 34, 12), y: 12 * T + 4 }, T)).toBe(true);
  });

  it('dives back into the sand when a shaft is dug past it', () => {
    const t = dug();
    let c = skink(2, 10, 11);
    for (let y = 10; y <= 12; y++) for (let x = 9; x <= 12; x++) setTile(t, x, y, TILE.air);
    const rng = createRng(2);
    for (let i = 0; i < 120 && !swimmable(t, c, T); i++) c = stepCritter(t, c, null, 1 / 60, T, rng);
    expect(swimmable(t, c, T)).toBe(true);
  });
});

describe('ravens', () => {
  it('hop up a wall a ghost crab would turn back at', () => {
    const t = flat();
    for (let y = 8; y < 10; y++) setTile(t, 24, y, TILE.sand);
    const highest = (c: Critter): number => {
      const rng = createRng(3);
      let top = c.y + c.h;
      for (let i = 0; i < 180; i++) {
        c = stepCritter(t, c, null, 1 / 60, T, rng);
        top = Math.min(top, c.y + c.h);
      }
      return top;
    };
    expect(highest(makeCritter(1, 6, 20 * T, 10 * T, 1, 10, 'raven'))).toBeLessThanOrEqual(8 * T + 1);
    expect(highest(makeCritter(2, 6, 20 * T, 10 * T, 1, 10))).toBeGreaterThan(9 * T);
  });
});

describe('a creature walled in', () => {
  /** Sand from row 6, with a pit three deep around column 10. */
  const pit = (): Terrain => {
    const t = createTerrain(20, 12);
    for (let x = 0; x < 20; x++) for (let y = 6; y < 12; y++) setTile(t, x, y, TILE.sand);
    for (let x = 7; x <= 13; x++) for (let y = 6; y < 9 - Math.abs(x - 10); y++) setTile(t, x, y, TILE.air);
    return t;
  };
  const facings = (c: Critter): Set<number> => {
    const t = pit();
    const rng = createRng(1);
    const dirs = new Set<number>();
    for (let i = 0; i < 60; i++) {
      c = stepCritter(t, c, null, 1 / 60, T, rng);
      if (i > 10) dirs.add(c.dir);
    }
    return dirs;
  };

  it('stays facing one way at the bottom of a pit (an antlion)', () => {
    expect(facings(makeCritter(1, 4, 10 * T + 8, 9 * T, 1, 10, 'antlion')).size).toBe(1);
  });

  it('stands still rather than flickering round when boxed in (a beetle down a hole)', () => {
    expect(facings(makeCritter(1, 3, 10 * T + 8, 9 * T, 1, 10, 'darkling')).size).toBe(1);
  });
});

describe('antlions', () => {
  it('stay put at the bottom of their pit', () => {
    const c = makeCritter(1, 5, 20 * T, 10 * T, 1, 10, 'antlion');
    const after = run(flat(), c, quarry(22, 2), 2);
    expect(after.x).toBeCloseTo(c.x);
  });
});
