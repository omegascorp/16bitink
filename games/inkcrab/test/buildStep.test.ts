import { describe, expect, it } from 'vitest';
import { stepTarget } from '../src/logic/dig';
import { Beach, IDLE, type Input } from '../src/logic/sim';
import { shellOf } from '../src/logic/shells';
import { createTerrain, setTile, tileAt, TILE, type Terrain } from '../src/logic/terrain';

const T = 16;

/** A flat beach (surface at row 10) with the crab settled at column 5, facing right, carrying `sand`; `wallAt` raises a bank from that column on. */
function beach(sand: number, wallAt?: number, roof?: readonly [number, number]): Beach {
  const terrain: Terrain = createTerrain(40, 24);
  for (let x = 0; x < 40; x++) for (let y = 10; y < 24; y++) setTile(terrain, x, y, TILE.sand);
  if (wallAt !== undefined) for (let x = wallAt; x < 40; x++) for (let y = 6; y < 10; y++) setTile(terrain, x, y, TILE.sand);
  if (roof) setTile(terrain, roof[0], roof[1], TILE.sand);
  const b = new Beach({ terrain, items: [], start: { x: 5 * T + 2, y: 10 * T - 14 }, tileSize: T, startShell: shellOf('periwinkle'), seed: 1, surfaceFood: 0 });
  for (let i = 0; i < 60; i++) b.step(IDLE, 1 / 60);
  b.crab = { ...b.crab, sand, facing: 1 };
  return b;
}

const press = (b: Beach, input: Partial<Input>): void => {
  b.step({ ...IDLE, ...input }, 1 / 60);
};

/** Where the crab's feet are, in tiles from the top. */
const feetRow = (b: Beach): number => Math.round((b.crab.body.y + b.crab.body.h) / T);

describe('building a step', () => {
  it('C facing a bank too high to jump puts sand under the crab and lifts it onto it', () => {
    const b = beach(3, 6);
    press(b, { place: true });
    expect(tileAt(b.terrain, 5, 9)).toBe(TILE.placed);
    expect(feetRow(b)).toBe(9);
    expect(b.crab.sand).toBe(2);
  });

  it('↑ + C builds a step in the open too, while plain C still drops sand in front', () => {
    const up = beach(3);
    press(up, { place: true, aimY: -1 });
    expect(tileAt(up.terrain, 5, 9)).toBe(TILE.placed);
    expect(feetRow(up)).toBe(9);
    const front = beach(3);
    press(front, { place: true });
    expect(tileAt(front.terrain, 6, 9)).toBe(TILE.placed);
    expect(feetRow(front)).toBe(10);
  });

  it('holding C at a bank builds steps up to its top', () => {
    const b = beach(10, 6);
    for (let i = 0; i < 240; i++) press(b, { place: true });
    expect(feetRow(b)).toBeLessThanOrEqual(6);
  });

  it("won't build with no sand or no headroom", () => {
    const empty = beach(0, 6);
    press(empty, { place: true });
    expect(feetRow(empty)).toBe(10);
    expect(stepTarget(beach(3, undefined, [5, 8]).terrain, beach(3, undefined, [5, 8]).crab.body, T)).toBeNull();
  });

  it('on touch, the stick pushed up with dig builds a step, carrying sand', () => {
    const b = beach(3);
    press(b, { work: true, aimY: -1 });
    expect(tileAt(b.terrain, 5, 9)).toBe(TILE.placed);
    expect(feetRow(b)).toBe(9);
  });

  it('on touch, dig facing a bank still digs into it, and builds once there is no room for more sand', () => {
    const dig = beach(3, 6);
    press(dig, { work: true });
    expect(dig.crab.sand).toBeGreaterThan(3);
    const full = beach(0, 6);
    full.crab = { ...full.crab, sand: full.sandCapacity };
    press(full, { work: true });
    expect(tileAt(full.terrain, 5, 9)).toBe(TILE.placed);
    expect(feetRow(full)).toBe(9);
  });
});
