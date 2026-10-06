import { describe, expect, it } from 'vitest';
import { BEACH_1 } from '../src/level/beach1';
import { buildLevel, levelGoal, TILE_PX } from '../src/level/build';
import { boxHitsSolid } from '../src/logic/body';
import { Beach } from '../src/logic/sim';
import { SHELLS } from '../src/logic/shells';
import { isSolid, tileAt, TILE } from '../src/logic/terrain';

describe('beach 1', () => {
  it('has ten levels with unique, permanent-looking ids', () => {
    expect(BEACH_1).toHaveLength(10);
    const ids = BEACH_1.map((l) => l.id);
    expect(new Set(ids).size).toBe(10);
    for (const id of ids) expect(id).toMatch(/^[a-z]+(-[a-z]+)*$/);
  });

  it('asks for more growth as the beach goes on, ending at the biggest size', () => {
    for (let i = 1; i < BEACH_1.length; i++) expect(levelGoal(BEACH_1[i]!)).toBeGreaterThanOrEqual(levelGoal(BEACH_1[i - 1]!));
    expect(levelGoal(BEACH_1[0]!)).toBe(3);
    expect(levelGoal(BEACH_1[BEACH_1.length - 1]!)).toBe(8);
  });

  for (const def of BEACH_1) {
    describe(def.id, () => {
      const setup = buildLevel(def);

      it('starts a size-1 crab in a periwinkle', () => {
        const b = new Beach(setup);
        expect(b.crab.growth).toEqual({ size: 1, meter: 0, bank: 0 });
        expect(b.crab.shell).toBe('periwinkle');
      });

      it('has a shell to move into at every size on the way to the goal', () => {
        const kinds = ['periwinkle' as const, ...def.shells.map(([k]) => k)];
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
          if (item.buried) expect(tileAt(setup.terrain, col, row)).toBe(TILE.sand);
        }
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
    });
  }
});
