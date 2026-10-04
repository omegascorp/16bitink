import { describe, expect, it } from 'vitest';
import { DUCK, nearestDecoy, riseStep } from '../src/logic/decoy';

const SURFACE = 60;

const rise = (y: number, surfaceY: number | null, seconds: number) => {
  let s = { y, vy: 0, afloat: false };
  for (let t = 0; t < seconds && !s.afloat; t += 0.05) s = riseStep(s.y, s.vy, 0.05, surfaceY);
  return s;
};

describe('rubber duck decoy', () => {
  it('lures from the nearest duck in reach only', () => {
    const a = { x: 100, y: 100 };
    const b = { x: 400, y: 100 };
    expect(nearestDecoy(350, 100, [a, b], DUCK.lure)).toBe(b);
    expect(nearestDecoy(120, 100, [a, b], DUCK.lure)).toBe(a);
    expect(nearestDecoy(5000, 100, [a, b], DUCK.lure)).toBeNull();
    expect(nearestDecoy(0, 0, [], DUCK.lure)).toBeNull();
  });

  it('pops up to the surface and stays there, never into the sky', () => {
    const s = rise(900, SURFACE, 30);
    expect(s.afloat).toBe(true);
    expect(s.y).toBe(SURFACE + DUCK.floatDepth);
    expect(riseStep(s.y, 0, 0.05, SURFACE)).toEqual({ y: SURFACE + DUCK.floatDepth, vy: 0, afloat: true });
  });

  it('keeps rising in the deep, where there is no surface to stop at', () => {
    const s = rise(900, null, 30);
    expect(s.afloat).toBe(false);
    expect(s.y).toBeLessThan(0);
    expect(s.vy).toBe(-DUCK.deepRiseSpeed);
  });

  it('rises slower in the deep so it lures on screen a while', () => {
    expect(DUCK.deepRiseSpeed).toBeLessThan(DUCK.riseSpeed);
  });
});
