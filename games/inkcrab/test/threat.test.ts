import { describe, expect, it } from 'vitest';
import { makeCritter, threatens } from '../src/logic/critters';
import { creatureNear } from '../src/logic/coach';
import { Beach, IDLE } from '../src/logic/sim';
import { shellOf } from '../src/logic/shells';
import { createTerrain, setTile, TILE } from '../src/logic/terrain';

const T = 16;

function beach(): Beach {
  const terrain = createTerrain(60, 30);
  for (let x = 0; x < 60; x++) for (let y = 10; y < 30; y++) setTile(terrain, x, y, TILE.sand);
  const b = new Beach({ terrain, items: [], start: { x: 5 * T, y: 10 * T }, tileSize: T, startShell: shellOf('periwinkle'), seed: 1, surfaceFood: 0 });
  b.step(IDLE, 1 / 60);
  return b;
}

describe('which creatures can catch the crab', () => {
  const ghost = (size: number) => makeCritter(1, size, 0, 0, 1, 10);

  it('in its shell: only bigger ones', () => {
    expect(threatens(ghost(3), 2, false)).toBe(true);
    expect(threatens(ghost(2), 2, false)).toBe(false);
    expect(threatens(ghost(1), 2, false)).toBe(false);
  });

  it('out of its shell: every one, however small', () => {
    expect(threatens(ghost(3), 2, true)).toBe(true);
    expect(threatens(ghost(2), 2, true)).toBe(true);
    expect(threatens(ghost(1), 2, true)).toBe(true);
  });
});

describe('creatures close by, for the warning before moving house', () => {
  it('sees a creature of any size within a few tiles', () => {
    const b = beach();
    expect(creatureNear(b)).toBe(false);
    b.critters.set(7, makeCritter(7, 1, b.crab.body.x + 4 * T, 10 * T, -1, 10));
    expect(creatureNear(b)).toBe(true);
  });

  it('ignores one far off', () => {
    const b = beach();
    b.critters.set(7, makeCritter(7, 1, b.crab.body.x + 30 * T, 10 * T, -1, 10));
    expect(creatureNear(b)).toBe(false);
  });
});
