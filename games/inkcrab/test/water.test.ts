import { describe, expect, it } from 'vitest';
import { highWaters, isLowWater, tidePhase, tideTurn, tideY, type TideSpec } from '../src/logic/tide';
import { createTerrain, setTile, TILE, tileAt, type Terrain } from '../src/logic/terrain';
import { createWater, isWet, updateWater, washStep } from '../src/logic/water';

const T = 16;
const SPEC: TideSpec = { low: 14, high: 8, period: 60 };

/**
 * 30 wide, 20 high: sand from row 10 on the left falling to row 16 on the
 * right (the sea side), with a rock basin (a pool) at columns 12–14 whose
 * floor is row 13 and rim row 10.
 */
function shore(): Terrain {
  const t = createTerrain(30, 20);
  for (let x = 0; x < 30; x++) {
    const top = x < 18 ? 10 : 16;
    for (let y = top; y < 20; y++) setTile(t, x, y, TILE.sand);
  }
  for (let x = 11; x <= 15; x++) for (let y = 10; y <= 13; y++) setTile(t, x, y, TILE.rock);
  for (let x = 12; x <= 14; x++) for (let y = 10; y <= 12; y++) setTile(t, x, y, TILE.air);
  return t;
}
const settle = (t: Terrain, w: ReturnType<typeof createWater>, seaY: number): void => {
  for (let i = 0; i < 60 && updateWater(t, w, seaY, T); i++);
};

describe('the tide', () => {
  it('starts at low water, is high at half period, low again after one', () => {
    expect(tideY(SPEC, 0, T)).toBeCloseTo(14 * T);
    expect(tideY(SPEC, 30, T)).toBeCloseTo(8 * T);
    expect(tideY(SPEC, 60, T)).toBeCloseTo(14 * T);
    expect(tidePhase(SPEC, 45)).toBeCloseTo(0.75);
  });

  it('says which way it is going and how long until it turns', () => {
    expect(tideTurn(SPEC, 10).rising).toBe(true);
    expect(tideTurn(SPEC, 10).seconds).toBeCloseTo(20);
    expect(tideTurn(SPEC, 40).rising).toBe(false);
    expect(tideTurn(SPEC, 40).seconds).toBeCloseTo(20);
  });

  it('counts high waters and knows the low half', () => {
    expect(highWaters(SPEC, 29)).toBe(0);
    expect(highWaters(SPEC, 31)).toBe(1);
    expect(highWaters(SPEC, 95)).toBe(2);
    expect(isLowWater(SPEC, 5)).toBe(true);
    expect(isLowWater(SPEC, 30)).toBe(false);
  });
});

describe('water', () => {
  it('floods open tiles the sea reaches below the tide line, and nothing above it', () => {
    const t = shore();
    const w = createWater(t);
    settle(t, w, 12 * T);
    expect(isWet(w, 25, 15)).toBe(true);
    expect(isWet(w, 25, 11)).toBe(false);
    // The pool is below the line but walled off by its rim: the sea can't get in yet.
    expect(isWet(w, 13, 12)).toBe(false);
  });

  it('fills a pool when the tide tops its rim, and leaves it full when the tide goes out', () => {
    const t = shore();
    const w = createWater(t);
    settle(t, w, 8 * T);
    expect(isWet(w, 13, 12)).toBe(true);
    expect(isWet(w, 13, 9)).toBe(true);
    settle(t, w, 16 * T);
    // Out at low water, the beach is dry...
    expect(isWet(w, 25, 15)).toBe(false);
    expect(isWet(w, 13, 9)).toBe(false);
    // ...but the pool holds its water up to the rim.
    for (const y of [10, 11, 12]) for (const x of [12, 13, 14]) expect(isWet(w, x, y)).toBe(true);
  });

  it('floods a tunnel dug below the tide line', () => {
    const t = shore();
    for (let x = 20; x < 30; x++) setTile(t, x, 17, TILE.air);
    const w = createWater(t);
    settle(t, w, 15 * T);
    expect(isWet(w, 21, 17)).toBe(true);
  });

  it('lets a pool drain into a hole dug under it', () => {
    const t = shore();
    const w = createWater(t);
    settle(t, w, 8 * T);
    settle(t, w, 15 * T);
    // Break through the pool's floor into a pocket below.
    setTile(t, 13, 13, TILE.air);
    setTile(t, 13, 14, TILE.air);
    setTile(t, 13, 15, TILE.air);
    settle(t, w, 15 * T);
    expect(isWet(w, 13, 15)).toBe(true);
    expect(isWet(w, 13, 10)).toBe(false);
  });

  it('pushes water out of tiles filled with sand', () => {
    const t = shore();
    const w = createWater(t);
    settle(t, w, 12 * T);
    setTile(t, 25, 15, TILE.placed);
    updateWater(t, w, 12 * T, T);
    expect(isWet(w, 25, 15)).toBe(false);
  });

  it('washes sand put down in the sea flat, without losing any', () => {
    const t = shore();
    for (let y = 12; y < 16; y++) setTile(t, 24, y, TILE.placed);
    const w = createWater(t);
    settle(t, w, 10 * T);
    const count = (): number => t.tiles.reduce((n, v) => n + (v === TILE.placed ? 1 : 0), 0);
    const before = count();
    for (let i = 0; i < 40; i++) {
      washStep(t, w, i % 2 === 0);
      updateWater(t, w, 10 * T, T);
    }
    expect(count()).toBe(before);
    expect(tileAt(t, 24, 12)).toBe(TILE.air);
  });
});
