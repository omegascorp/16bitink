import { describe, expect, it } from 'vitest';
import { inStickZone, knobOffset, STICK, stickCentre, stickVector } from '../src/logic/joystick';

describe('joystick', () => {
  it('sits in the bottom-left corner', () => {
    expect(stickCentre(800)).toEqual({ x: STICK.zone / 2, y: 800 - STICK.zone / 2 });
    expect(inStickZone(20, 790, 800)).toBe(true);
    expect(inStickZone(STICK.zone + 1, 790, 800)).toBe(false);
    expect(inStickZone(20, 800 - STICK.zone - 1, 800)).toBe(false);
  });

  it('ignores a resting thumb', () => {
    expect(stickVector(0, 0)).toEqual({ x: 0, y: 0 });
    expect(stickVector(STICK.radius * STICK.deadZone * 0.9, 0)).toEqual({ x: 0, y: 0 });
  });

  it('scales with the pull and caps at full speed', () => {
    const half = stickVector(0, -STICK.radius * 0.6);
    expect(half.x).toBeCloseTo(0);
    expect(half.y).toBeLessThan(0);
    expect(half.y).toBeGreaterThan(-1);
    const full = stickVector(STICK.radius * 3, 0);
    expect(full.x).toBeCloseTo(1);
    expect(full.y).toBeCloseTo(0);
  });

  it('keeps the knob inside the rim', () => {
    expect(knobOffset(10, 5)).toEqual({ x: 10, y: 5 });
    const k = knobOffset(0, 500);
    expect(k.x).toBeCloseTo(0);
    expect(k.y).toBeCloseTo(STICK.radius);
  });
});
