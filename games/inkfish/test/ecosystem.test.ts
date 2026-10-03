import { describe, expect, it } from 'vitest';
import { canHunt, HUNT_RATIO } from '../src/logic/ecosystem';
import { keepInWater, waterBottom, waterTop, WATER } from '../src/logic/water';

describe('water band', () => {
  it('keeps a fish below the surface and above the seabed', () => {
    expect(waterTop(20)).toBeGreaterThan(WATER.surface);
    expect(waterBottom(1000, 20)).toBeLessThan(1000 - WATER.floorMargin);
  });

  it('pushes a fish that left the water back in and turns it around', () => {
    const above = keepInWater(10, -80, 20, 1000);
    expect(above.y).toBe(waterTop(20));
    expect(above.vy).toBeGreaterThan(0);
    const below = keepInWater(990, 50, 20, 1000);
    expect(below.y).toBe(waterBottom(1000, 20));
    expect(below.vy).toBeLessThan(0);
  });

  it('leaves fish inside the water untouched', () => {
    expect(keepInWater(400, -30, 20, 1000)).toEqual({ y: 400, vy: -30 });
  });
});

describe('ecosystem', () => {
  it('lets hunters eat clearly smaller fish', () => {
    expect(canHunt('pike', 40, 40 * HUNT_RATIO - 1)).toBe(true);
    expect(canHunt('pike', 40, 40 * HUNT_RATIO + 1)).toBe(false);
  });

  it('never lets grazers hunt', () => {
    expect(canHunt('minnow', 40, 5)).toBe(false);
    expect(canHunt('puffer', 40, 5)).toBe(false);
  });
});
