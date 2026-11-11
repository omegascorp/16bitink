import { describe, expect, it } from 'vitest';
import { inStickReach, knobOffset, STICK, steer } from '../src/logic/stick';
import { clampZoom, zoomAbout, zoomRange, ZOOM_MAX } from '../src/logic/zoom';

describe('thumbstick', () => {
  it('takes a thumb that lands near its resting ring, and not one further off', () => {
    const rest = { x: 80, y: 600 };
    expect(inStickReach({ x: 80 + STICK.reach - 1, y: 600 }, rest)).toBe(true);
    expect(inStickReach({ x: 80, y: 600 - STICK.reach - 1 }, rest)).toBe(false);
  });

  it('keeps the knob inside the rim', () => {
    expect(knobOffset(10, 0)).toEqual({ x: 10, y: 0 });
    const far = knobOffset(300, 400);
    expect(Math.hypot(far.x, far.y)).toBeCloseTo(STICK.radius);
    expect(far.x / far.y).toBeCloseTo(300 / 400);
  });

  it('walks Nib left or right once out of the dead zone', () => {
    expect(steer(STICK.dead - 1, 0, false)).toEqual({ dir: 0, climb: 0 });
    expect(steer(STICK.dead + 1, 0, false)).toEqual({ dir: 1, climb: 0 });
    expect(steer(-40, 10, true)).toEqual({ dir: -1, climb: 0 });
  });

  it('climbs a vine when pushed mostly up or down, and only by a vine', () => {
    expect(steer(5, -40, true)).toEqual({ dir: 0, climb: -1 });
    expect(steer(-5, 40, true)).toEqual({ dir: 0, climb: 1 });
    expect(steer(5, -40, false)).toEqual({ dir: 0, climb: 0 });
    expect(steer(30, -40, false)).toEqual({ dir: 1, climb: 0 });
  });
});

describe('zoom', () => {
  it('zooms out as far as the whole level and in up to the cap', () => {
    expect(zoomRange(1.2, 0.5)).toEqual({ min: 0.5, max: 1.2 * ZOOM_MAX });
    // A level that already fits whole can't zoom out past its fit.
    expect(zoomRange(1, 1)).toEqual({ min: 1, max: ZOOM_MAX });
  });

  it('clamps a zoom to its range', () => {
    const range = { min: 0.5, max: 2 };
    expect(clampZoom(0.1, range)).toBe(0.5);
    expect(clampZoom(1.3, range)).toBe(1.3);
    expect(clampZoom(9, range)).toBe(2);
  });

  it('keeps the board point under the fingers where it is', () => {
    const half = { x: 200, y: 400 };
    const mid = { x: 1000, y: 500 };
    const at = { x: 300, y: 100 };
    const under = (m: { x: number; y: number }, z: number) => ({ x: m.x + (at.x - half.x) / z, y: m.y + (at.y - half.y) / z });
    const before = under(mid, 1);
    const after = under(zoomAbout(mid, at, half, 1, 2), 2);
    expect(after.x).toBeCloseTo(before.x);
    expect(after.y).toBeCloseTo(before.y);
    // Zooming about the screen's middle leaves the camera where it is.
    expect(zoomAbout(mid, half, half, 1, 3)).toEqual(mid);
  });
});
