import { describe, expect, it } from 'vitest';
import { BEACH_1 } from '../src/level/beach1';
import { BEACH_2 } from '../src/level/beach2';
import { BEACH_3 } from '../src/level/beach3';
import type { LevelDef } from '../src/level/types';
import { movementOf } from '../src/logic/species';
import { buildLevel, levelGoal, levelShells, smallFry, TILE_PX } from '../src/level/build';
import { boxHitsSolid } from '../src/logic/body';
import { pourStep } from '../src/logic/dunes';
import { Beach } from '../src/logic/sim';
import { SHELLS } from '../src/logic/shells';
import { isDiggable, isSolid } from '../src/logic/terrain';

const BEACHES: readonly { name: string; levels: readonly LevelDef[]; fry: string; firstGoal: number }[] = [
  { name: 'beach 1', levels: BEACH_1, fry: 'slater', firstGoal: 3 },
  { name: 'beach 2', levels: BEACH_2, fry: 'darkling', firstGoal: 4 },
  { name: 'beach 3', levels: BEACH_3, fry: 'shorecrab', firstGoal: 4 },
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
        expect(buried.length).toBeLessThanOrEqual(def.food.buried + (def.food.clams?.length ?? 0));
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
