import { describe, expect, it } from 'vitest';
import { BEACH_1 } from '../src/level/beach1';
import { BEACH_2 } from '../src/level/beach2';
import { BEACH_3 } from '../src/level/beach3';
import { BEACH_4 } from '../src/level/beach4';
import { BEACH_5 } from '../src/level/beach5';
import { BEACH_6 } from '../src/level/beach6';
import { BEACH_7 } from '../src/level/beach7';
import type { LevelDef } from '../src/level/types';
import { movementOf } from '../src/logic/species';
import { buildLevel, levelGoal, levelShells, smallFry, START_PATCH, START_SHELL, TILE_PX } from '../src/level/build';
import { boxHitsSolid } from '../src/logic/body';
import { pourStep } from '../src/logic/dunes';
import { Beach } from '../src/logic/sim';
import { SHELLS } from '../src/logic/shells';
import { isDiggable, isSolid, surfaceRow } from '../src/logic/terrain';
import { isLedge, isRoot, type Roots } from '../src/logic/roots';

const BEACHES: readonly { name: string; levels: readonly LevelDef[]; fry: string; firstGoal: number }[] = [
  { name: 'beach 1', levels: BEACH_1, fry: 'slater', firstGoal: 3 },
  { name: 'beach 2', levels: BEACH_2, fry: 'darkling', firstGoal: 4 },
  { name: 'beach 3', levels: BEACH_3, fry: 'shorecrab', firstGoal: 4 },
  { name: 'beach 4', levels: BEACH_4, fry: 'fiddler', firstGoal: 4 },
  { name: 'beach 5', levels: BEACH_5, fry: 'lavalizard', firstGoal: 4 },
  { name: 'beach 6', levels: BEACH_6, fry: 'kelpcrab', firstGoal: 4 },
  { name: 'beach 7', levels: BEACH_7, fry: 'porcelaincrab', firstGoal: 4 },
];

for (const { name, levels: BEACH, fry: FRY, firstGoal } of BEACHES) describe(name, () => {
  it('has ten levels with unique, permanent-looking ids', () => {
    expect(BEACH).toHaveLength(10);
    const ids = BEACH.map((l) => l.id);
    expect(new Set(ids).size).toBe(10);
    for (const id of ids) expect(id).toMatch(/^[a-z]+(-[a-z]+)*$/);
  });

  it('buries more food than it leaves on the surface from the second level on', () => {
    for (const def of BEACH.slice(1)) expect(def.food.buried).toBeGreaterThanOrEqual(def.food.surface * 0.7);
  });

  it('keeps food a dig or two down on every level, topped up as it is eaten', () => {
    for (const def of BEACH) {
      expect(def.food.shallow).toBeGreaterThanOrEqual(4);
      const beach = new Beach(buildLevel(def));
      const shallow = [...beach.items.values()].filter((i) => {
        if (!i.buried || i.kind.type !== 'food') return false;
        const col = Math.floor((i.x + i.w / 2) / TILE_PX);
        let top = 0;
        while (!isSolid(beach.terrain, col, top)) top++;
        return Math.floor((i.y + i.h / 2) / TILE_PX) - top <= 1;
      });
      expect(shallow.length).toBeGreaterThanOrEqual(def.food.shallow);
    }
  });

  it('hides every underground kind somewhere on the beach', () => {
    const kinds = new Set<string>(BEACH.flatMap((def) => buildLevel(def).items.filter((i) => i.buried && i.kind.type === 'food').map((i) => (i.kind.type === 'food' ? i.kind.food : ''))));
    for (const k of ['worm', 'molecrab', 'clam', 'hopper']) expect(kinds.has(k)).toBe(true);
  });

  it('asks for more growth as the beach goes on, ending at the biggest size', () => {
    for (let i = 1; i < BEACH.length; i++) expect(levelGoal(BEACH[i]!)).toBeGreaterThanOrEqual(levelGoal(BEACH[i - 1]!));
    expect(levelGoal(BEACH[0]!)).toBe(firstGoal);
    expect(levelGoal(BEACH[BEACH.length - 1]!)).toBe(8);
  });

  for (const def of BEACH) {
    describe(def.id, () => {
      const setup = buildLevel(def);

      it('starts a size-1 crab in a periwinkle', () => {
        const b = new Beach(setup);
        expect(b.crab.growth).toEqual({ size: 1, meter: 0, bank: 0 });
        expect(b.crab.shell).toBe('periwinkle');
      });

      it('has a shell to move into at every size on the way to the goal', () => {
        const kinds = ['periwinkle' as const, ...levelShells(def)];
        for (let size = 1; size < levelGoal(def); size++) {
          expect(kinds.some((k) => SHELLS[k].minSize <= size && SHELLS[k].maxSize > size), `size ${size}`).toBe(true);
        }
      });

      it('starts the crab standing on sand, in the open', () => {
        const b = new Beach(setup);
        expect(boxHitsSolid(setup.terrain, b.crab.body, TILE_PX)).toBe(false);
        // Sand somewhere below where it's dropped in.
        const col = Math.floor(setup.start.x / TILE_PX);
        expect(Array.from({ length: 6 }, (_, i) => isSolid(setup.terrain, col, Math.floor(setup.start.y / TILE_PX) + i)).some(Boolean)).toBe(true);
      });

      it('keeps every shell and buried item inside the sand, above bedrock', () => {
        for (const item of setup.items) {
          const col = Math.floor((item.x + item.w / 2) / TILE_PX);
          const row = Math.floor((item.y + item.h / 2) / TILE_PX);
          expect(col).toBeGreaterThanOrEqual(0);
          expect(col).toBeLessThan(def.width);
          if (item.buried) expect(isDiggable(setup.terrain, col, row)).toBe(true);
        }
      });

      it('buries plenty to eat, never two things in one tile', () => {
        const buried = setup.items.filter((i) => i.buried && i.kind.type === 'food');
        expect(buried.length).toBeGreaterThanOrEqual(Math.min(def.food.buried, 3));
        expect(buried.length).toBeLessThanOrEqual(def.food.buried + (def.food.clams?.length ?? 0) + Math.ceil((def.food.start ?? 0) / 2));
        const tiles = setup.items.filter((i) => i.buried).map((i) => `${Math.floor((i.x + i.w / 2) / TILE_PX)},${Math.floor((i.y + i.h / 2) / TILE_PX)}`);
        expect(new Set(tiles).size).toBe(tiles.length);
      });

      it('lets the crab outgrow every kind of creature in it before the goal', () => {
        const goal = levelGoal(def);
        const smallest = new Map<string, number>();
        for (const g of def.critters ?? []) smallest.set(g.species ?? 'ghostcrab', Math.min(smallest.get(g.species ?? 'ghostcrab') ?? 99, g.sizes[0]));
        for (const size of smallest.values()) expect(size).toBeLessThan(goal);
      });

      it('keeps small, timid prey about that is never a threat at the start', () => {
        const fry = setup.critters![0]!;
        expect(fry).toEqual(smallFry(def));
        expect(fry.species).toBe(FRY);
        expect(fry.count).toBeGreaterThanOrEqual(3);
        expect(fry.sizes[0]).toBe(1);
        expect(fry.sizes[1]).toBeLessThan(levelGoal(def));
        if (levelGoal(def) <= 3) expect(fry.sizes[1]).toBe(1);
      });

      it('has critters only of sizes that exist', () => {
        for (const g of def.critters ?? []) {
          expect(g.sizes[0]).toBeGreaterThanOrEqual(1);
          expect(g.sizes[1]).toBeLessThanOrEqual(8);
          expect(g.sizes[0]).toBeLessThanOrEqual(g.sizes[1]);
        }
      });

      it('settles without the crab falling out of the world', () => {
        const b = new Beach(setup);
        for (let i = 0; i < 120; i++) b.step({ moveX: 0, aimY: 0, jump: false, dig: false, place: false, interact: false, tapTile: null, hide: false }, 1 / 60);
        expect(b.crab.body.onGround).toBe(true);
        expect(b.outcome).toBe('playing');
      });

      it('starts its dunes at rest, so nothing pours until the crab digs', () => {
        const t = buildLevel(def).terrain;
        expect(pourStep(t, Array.from({ length: t.width }, (_, x) => x), () => false, false)).toEqual([]);
      });

      it('keeps antlions only where there are pits for them', () => {
        const antlions = (def.critters ?? []).filter((g) => g.species && movementOf(g.species) === 'lurk').reduce((n, g) => n + g.count, 0);
        expect(antlions).toBeLessThanOrEqual(def.pits?.length ?? 0);
        for (const [col, reach] of def.pits ?? []) {
          let rim = 0;
          while (!isSolid(setup.terrain, col - reach - 1, rim)) rim++;
          let bottom = 0;
          while (!isSolid(setup.terrain, col, bottom)) bottom++;
          expect(bottom - rim, `pit at ${col}`).toBeGreaterThanOrEqual(reach - 1);
        }
      });

      it('keeps octopuses only in dens, each a crevice opening onto water or air', () => {
        const octopuses = (def.critters ?? []).filter((g) => g.species && movementOf(g.species) === 'den').reduce((n, g) => n + g.count, 0);
        expect(octopuses).toBeLessThanOrEqual(def.dens?.length ?? 0);
        for (const [x, y] of def.dens ?? []) {
          expect(isSolid(setup.terrain, x, y), `den ${x},${y}`).toBe(false);
          const openSides = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => !isSolid(setup.terrain, x + dx!, y + dy!)).length;
          expect(openSides, `den ${x},${y}`).toBeGreaterThanOrEqual(1);
          // It opens onto a pool, so its arm reaches across the water.
          if (def.tide) expect(new Beach(setup).water!.wet.some((v, i) => v === 1 && Math.abs((i % def.width) - x) === 1 && Math.floor(i / def.width) === y), `den ${x},${y} by water`).toBe(true);
        }
      });

      it('starts with its pools full and the beach above low water dry', () => {
        if (!def.tide) return;
        const b = new Beach(setup);
        for (const [x0, w] of def.pools ?? []) {
          const wet = [...Array(w).keys()].some((i) => [...Array(def.height).keys()].some((y) => b.water!.wet[y * def.width + x0 + i] === 1));
          expect(wet, `pool at ${x0}`).toBe(true);
        }
        expect(b.crab.body.y + b.crab.body.h).toBeLessThan(def.tide.low * TILE_PX);
        expect(b.submerged(b.crab.body)).toBe(false);
      });

      it('has birds the crab can outgrow', () => {
        for (const g of def.birds ?? []) expect(g.size).toBeLessThanOrEqual(levelGoal(def));
      });
    });
  }
});

describe('every beach', () => {
  it('never reuses a level id', () => {
    const ids = BEACHES.flatMap((b) => b.levels.map((l) => l.id));
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('ravens', () => {
  it('never outgrow the crab: a full-grown crab can eat any of them', () => {
    for (const def of BEACHES.flatMap((b) => b.levels)) {
      for (const g of def.critters ?? []) if (g.species === 'raven') expect(g.sizes[1], def.id).toBeLessThan(levelGoal(def));
    }
  });
});

describe('sandstorm', () => {
  const def = BEACH_2.find((d) => d.id === 'sandstorm')!;
  const b = new Beach(buildLevel(def));
  const ravens = [...b.critters.values()].filter((k) => k.species === 'raven');
  const col = (x: number): number => Math.floor(x / TILE_PX);

  it('keeps its ravens on the far side of the dune, clear of the pits on the way in', () => {
    expect(ravens.length).toBe(2);
    for (const k of ravens) {
      const at = col(k.x + k.w / 2);
      expect(at).toBeLessThanOrEqual(60);
      for (const [pit, r] of def.pits ?? []) expect(Math.abs(at - pit)).toBeGreaterThan(r + 1);
    }
  });
});

describe('herons', () => {
  it('never outgrow the crab: a full-grown crab can eat any of them', () => {
    for (const def of BEACHES.flatMap((b) => b.levels)) {
      for (const g of def.critters ?? []) if (g.species === 'heron') expect(g.sizes[1], def.id).toBeLessThan(levelGoal(def));
    }
  });
});

/** Root tiles reachable by climbing from the mud: the tangle joined (diagonals too) to a root touching the ground. */
function climbable(roots: Roots, ground: (x: number) => number): Set<string> {
  const seen = new Set<string>();
  const queue: [number, number][] = [];
  for (let x = 0; x < roots.width; x++) {
    for (let y = ground(x) - 1; y <= ground(x); y++) if (isRoot(roots, x, y)) queue.push([x, y]);
  }
  while (queue.length) {
    const [x, y] = queue.pop()!;
    const key = `${x},${y}`;
    if (seen.has(key) || !isRoot(roots, x, y)) continue;
    seen.add(key);
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) queue.push([x + dx, y + dy]);
  }
  return seen;
}

describe('mangrove margins', () => {
  for (const def of BEACH_4) {
    describe(def.id, () => {
      const setup = buildLevel(def);
      const roots = setup.roots!;

      it('grows its mangroves and lays mud over the flats', () => {
        expect(roots).toBeDefined();
        expect(roots.cells.includes(1)).toBe(true);
        expect(setup.terrain.tiles.includes(5)).toBe(true);
      });

      it('perches its shells on root tops the crab can climb to from the mud', () => {
        const reach = climbable(roots, (x) => surfaceRow(setup.terrain, x));
        for (const [kind, col, depth] of def.shells) {
          if (depth >= 0) continue;
          const item = setup.items.find((i) => i.kind.type === 'shell' && i.kind.shell === kind)!;
          const row = Math.round((item.y + item.h) / TILE_PX);
          expect(isLedge(roots, col, row), `${kind} on a ledge`).toBe(true);
          expect(reach.has(`${col},${row}`), `${kind} reachable`).toBe(true);
          // Up off the ground: it takes a climb.
          expect(row, kind).toBeLessThan(surfaceRow(setup.terrain, col) - 2);
        }
      });

      it('keeps its trees, crowns included, inside the level', () => {
        for (const [x, y, r] of roots.leaves) {
          expect(x - r).toBeGreaterThan(0);
          expect(x + r).toBeLessThan(def.width);
          expect(y - r).toBeGreaterThan(-1);
        }
      });
    });
  }
});

describe('starter food', () => {
  const def = BEACH_5.find((d) => d.id === 'the-summit-vent')!;
  const nearStart = (d: LevelDef): number => {
    const setup = buildLevel(d);
    return setup.items.filter((i) => {
      const col = Math.floor((i.x + i.w / 2) / TILE_PX);
      return i.kind.type === 'food' && col >= d.startCol && col <= d.startCol + START_PATCH && (!i.buried || i.y < (surfaceRow(setup.terrain, col) + 3) * TILE_PX);
    }).length;
  };

  it('lays the start patch on top of the level\'s other food, within reach of the start', () => {
    const plain = { ...def, food: { ...def.food, start: 0 } };
    expect(def.food.start).toBeGreaterThan(0);
    expect(nearStart(def) - nearStart(plain)).toBe(def.food.start);
  });

  it('leaves a level without one as it was', () => {
    const plain = { ...def, food: { ...def.food, start: undefined } };
    const a = buildLevel(plain).items.map((i) => [i.x, i.y]);
    const b = buildLevel({ ...def, food: { ...def.food, start: 0 } }).items.map((i) => [i.x, i.y]);
    expect(a).toEqual(b);
  });
});

describe('fog & kelp', () => {
  for (const def of BEACH_6) {
    it(`${def.id}: keeps its kelp on the beach, clear of the start, and its hunters under the goal`, () => {
      for (const [col, width] of def.kelp ?? []) {
        expect(col, def.id).toBeGreaterThan(def.startCol + 4);
        expect(col + width, def.id).toBeLessThan(def.width - 2);
      }
      for (const g of def.critters ?? []) expect(g.sizes[1], def.id).toBeLessThan(levelGoal(def));
      for (const g of def.birds ?? []) expect(g.size, def.id).toBeLessThan(levelGoal(def));
    });
  }
});

describe('wreck cove', () => {
  /**
   * The sizes a crab can reach: from the periwinkle, any shell lying about
   * that it fits takes it up to that shell's cap, and a rival no bigger than
   * it can be rapped for its shell. Rivals tucked in their shells never move
   * into another (only rapped ones do, and those are no bigger than the crab).
   */
  function reach(def: LevelDef): { size: number; rapped: number } {
    let size = SHELLS[START_SHELL].maxSize;
    const loose = def.shells.map(([k]) => k);
    const left = [...(def.rivals ?? [])];
    for (let changed = true; changed;) {
      changed = false;
      for (const k of loose) if (SHELLS[k].minSize <= size && SHELLS[k].maxSize > size) [size, changed] = [SHELLS[k].maxSize, true];
      for (let i = left.length - 1; i >= 0; i--) {
        if (left[i]![1] > size) continue;
        loose.push(left[i]![0]);
        left.splice(i, 1);
        changed = true;
      }
    }
    return { size, rapped: (def.rivals?.length ?? 0) - left.length };
  }

  for (const def of BEACH_7) {
    it(`${def.id}: can be grown to its goal through its rivals, each one rappable in time`, () => {
      const r = reach(def);
      expect(r.size, def.id).toBeGreaterThanOrEqual(levelGoal(def));
      expect(r.rapped, def.id).toBe(def.rivals?.length ?? 0);
    });

    it(`${def.id}: keeps its hunters under the goal`, () => {
      for (const g of def.critters ?? []) expect(g.sizes[1], def.id).toBeLessThan(levelGoal(def));
      for (const g of def.birds ?? []) expect(g.size, def.id).toBeLessThan(levelGoal(def));
    });
  }
});
