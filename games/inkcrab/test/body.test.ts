import { describe, expect, it } from 'vitest';
import { boxHitsSolid, jump, moveBody, type Body } from '../src/logic/body';
import { createTerrain, setTile, TILE, type Terrain } from '../src/logic/terrain';

const T = 16;

/** A flat floor at `floorRow` across a 20×12 beach. */
function flat(floorRow = 8): Terrain {
  const t = createTerrain(20, 12);
  for (let x = 0; x < 20; x++) for (let y = floorRow; y < 12; y++) setTile(t, x, y, TILE.sand);
  return t;
}

const body = (x: number, y: number, w = 20, h = 14): Body => ({ x, y, w, h, vx: 0, vy: 0, onGround: false });
const run = (t: Terrain, b: Body, intent: number, seconds: number, speed = 60): Body => {
  let cur = b;
  for (let i = 0; i < Math.round(seconds * 60); i++) cur = moveBody(t, cur, intent, speed, 1 / 60, T);
  return cur;
};

describe('tile physics', () => {
  it('detects boxes overlapping solid tiles', () => {
    const t = flat();
    expect(boxHitsSolid(t, { x: 10, y: 8 * T - 14, w: 20, h: 14 }, T)).toBe(false);
    expect(boxHitsSolid(t, { x: 10, y: 8 * T - 13, w: 20, h: 14 }, T)).toBe(true);
  });

  it('falls onto the floor and rests there', () => {
    const t = flat();
    const b = run(t, body(40, 10), 0, 2);
    expect(b.onGround).toBe(true);
    expect(b.y + b.h).toBeCloseTo(8 * T, 5);
    expect(b.vy).toBe(0);
  });

  it('walks along the floor', () => {
    const t = flat();
    const b = run(t, body(40, 8 * T - 14), 1, 1);
    expect(b.x).toBeGreaterThan(90);
    expect(b.onGround).toBe(true);
  });

  it('returns a new body rather than changing the old one', () => {
    const t = flat();
    const b = body(40, 8 * T - 14);
    const next = moveBody(t, b, 1, 60, 1 / 60, T);
    expect(next).not.toBe(b);
    expect(b.x).toBe(40);
  });

  it('steps up a one-tile ledge', () => {
    const t = flat();
    for (let x = 6; x < 20; x++) setTile(t, x, 7, TILE.sand);
    const b = run(t, body(40, 8 * T - 14), 1, 2);
    expect(b.x).toBeGreaterThan(6 * T);
    expect(b.y + b.h).toBeCloseTo(7 * T, 0);
  });

  it('is blocked by a wall taller than it can step', () => {
    const t = flat();
    for (let y = 4; y < 8; y++) setTile(t, 6, y, TILE.rock);
    const b = run(t, body(40, 8 * T - 14), 1, 2);
    expect(b.x + b.w).toBeCloseTo(6 * T, 5);
  });

  it('stops at the beach edges', () => {
    const t = flat();
    const b = run(t, body(10, 8 * T - 14), -1, 2);
    expect(b.x).toBeCloseTo(0, 5);
  });
});

describe('jumping', () => {
  it('leaps only from the ground', () => {
    const t = flat();
    const standing = run(t, body(40, 8 * T - 14), 0, 0.5);
    const up = jump(standing, 300);
    expect(up.vy).toBe(-300);
    expect(up.onGround).toBe(false);
    expect(jump(up, 300)).toBe(up);
  });

  it('bumps its head on a ceiling', () => {
    const t = flat();
    for (let x = 0; x < 20; x++) setTile(t, x, 6, TILE.rock);
    const b = moveBody(t, jump(run(t, body(40, 8 * T - 14), 0, 0.5), 300), 0, 60, 1 / 10, T);
    expect(b.y).toBeCloseTo(7 * T, 5);
    expect(b.vy).toBe(0);
  });
});
