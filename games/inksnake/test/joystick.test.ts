import { describe, expect, it } from 'vitest';
import { inStickZone, knobOffset, STICK, stickAngle } from '../src/logic/joystick';

describe('joystick', () => {
  it('takes a thumb in the lower-left corner only', () => {
    const phone = { width: 390, height: 844 };
    expect(inStickZone(40, 800, phone)).toBe(true);
    expect(inStickZone(300, 800, phone)).toBe(false);
    expect(inStickZone(40, 200, phone)).toBe(false);
  });

  it('caps the corner on a big screen', () => {
    const desk = { width: 1920, height: 1080 };
    expect(inStickZone(STICK.zone.maxW - 1, 1070, desk)).toBe(true);
    expect(inStickZone(STICK.zone.maxW + 1, 1070, desk)).toBe(false);
    expect(inStickZone(10, 1080 - STICK.zone.maxH - 1, desk)).toBe(false);
  });

  it('ignores a resting thumb', () => {
    expect(stickAngle(0, 0)).toBeNull();
    expect(stickAngle(STICK.radius * STICK.deadZone * 0.9, 0)).toBeNull();
  });

  it('steers the way it is pulled', () => {
    expect(stickAngle(30, 0)).toBeCloseTo(0);
    expect(stickAngle(0, -30)).toBeCloseTo(-Math.PI / 2);
    expect(stickAngle(-30, 0)).toBeCloseTo(Math.PI);
  });

  it('keeps the knob inside the rim', () => {
    expect(knobOffset(10, 5)).toEqual({ x: 10, y: 5 });
    const k = knobOffset(0, 500);
    expect(k.x).toBeCloseTo(0);
    expect(k.y).toBeCloseTo(STICK.radius);
  });
});
