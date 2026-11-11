import { describe, expect, it } from 'vitest';
import { inStickReach, knobOffset, pulled, STICK, stickAngle, stickRun } from '../src/logic/joystick';

describe('joystick', () => {
  const rest = { x: 80, y: 700 };

  it('takes a thumb near its ring only, so the rest of the board stays tap-to-aim', () => {
    expect(inStickReach({ x: 90, y: 690 }, rest)).toBe(true);
    expect(inStickReach({ x: rest.x + STICK.reach - 1, y: rest.y }, rest)).toBe(true);
    expect(inStickReach({ x: rest.x + STICK.reach + 1, y: rest.y }, rest)).toBe(false);
    expect(inStickReach({ x: 300, y: 300 }, rest)).toBe(false);
  });

  it('ignores a resting thumb', () => {
    expect(pulled(0, 0)).toBe(false);
    expect(stickAngle(STICK.radius * STICK.deadZone * 0.9, 0, 0)).toBeNull();
    expect(stickRun(STICK.radius * STICK.deadZone * 0.9, 0, 0)).toBe(0);
  });

  it('aims the way it is pulled', () => {
    expect(stickAngle(30, 0, 0)).toBeCloseTo(0);
    expect(stickAngle(0, -30, 0)).toBeCloseTo(-Math.PI / 2);
    expect(stickAngle(-30, 0, 0)).toBeCloseTo(Math.PI);
  });

  it('aims on the board as it lies turned on an upright phone', () => {
    // The board is turned a quarter: a pull straight down the screen points along the board's +x.
    expect(stickAngle(0, 30, Math.PI / 2)).toBeCloseTo(0);
  });

  it('runs along a branch as hard as it is pulled sideways', () => {
    expect(stickRun(STICK.radius, 0, 0)).toBeCloseTo(1);
    expect(stickRun(-STICK.radius * 2, 0, 0)).toBeCloseTo(-1);
    expect(stickRun(STICK.radius / 2, 0, 0)).toBeCloseTo(0.5);
    // Straight up the branch's axis: a stop (it spits straight up on letting go).
    expect(stickRun(0, -STICK.radius, 0)).toBe(0);
    // Upright phone: the branch runs down the screen.
    expect(stickRun(0, STICK.radius, Math.PI / 2)).toBeCloseTo(1);
  });

  it('keeps the knob inside the rim', () => {
    expect(knobOffset(10, 5)).toEqual({ x: 10, y: 5 });
    const k = knobOffset(0, 500);
    expect(k.x).toBeCloseTo(0);
    expect(k.y).toBeCloseTo(STICK.radius);
  });
});
