import { describe, expect, it } from 'vitest';
import { STICK } from '../src/logic/stick';
import { tipHoldMs, touchPlan, TOUCH_SIZES } from '../src/logic/touchLayout';

const STATUS_W = 260;
const SCREENS = [[844, 390], [932, 430], [667, 375], [740, 360], [390, 844], [430, 932], [375, 667]] as const;

/** Whether a control of radius r at p lies wholly in the edges the plan keeps off the board. */
const offBoard = (p: { x: number; y: number }, r: number, w: number, h: number, i: { top: number; right: number; bottom: number; left: number }): boolean =>
  p.x + r <= i.left + 1 || p.x - r >= w - i.right - 1 || p.y + r <= i.top + 1 || p.y - r >= h - i.bottom - 1;

describe('touchPlan', () => {
  it('keeps every control in the edges it reserves, so none lies over the board', () => {
    for (const [w, h] of SCREENS) {
      const p = touchPlan(w, h, STATUS_W);
      const s = TOUCH_SIZES;
      expect(offBoard(p.stick, STICK.radius, w, h, p.insets)).toBe(true);
      expect(offBoard(p.jump, s.jump / 2, w, h, p.insets)).toBe(true);
      for (const b of [p.map, p.restart]) expect(offBoard(b, s.button / 2, w, h, p.insets)).toBe(true);
      for (const b of [p.zoomIn, p.zoomOut, p.hint]) expect(offBoard(b, s.zoom / 2, w, h, p.insets)).toBe(true);
      expect(p.status.y + s.status).toBeLessThanOrEqual(p.insets.top);
    }
  });

  it('keeps every control on screen, the stick on the left and jump on the right', () => {
    for (const [w, h] of SCREENS) {
      const p = touchPlan(w, h, STATUS_W);
      expect(p.stick.x - STICK.radius).toBeGreaterThanOrEqual(0);
      expect(p.stick.y + STICK.radius).toBeLessThanOrEqual(h);
      expect(p.jump.x + TOUCH_SIZES.jump / 2).toBeLessThanOrEqual(w);
      expect(p.stick.x).toBeLessThan(w / 2);
      expect(p.jump.x).toBeGreaterThan(w / 2);
      expect(p.insets.touch).toBe(true);
    }
  });

  it('sideways: columns down the sides, a strip along the top; upright: the controls along the bottom', () => {
    const side = touchPlan(844, 390, STATUS_W);
    expect(side.insets.left).toBeGreaterThan(2 * STICK.radius);
    expect(side.insets.right).toBe(side.insets.left);
    const up = touchPlan(390, 844, STATUS_W);
    expect(up.insets.bottom).toBeGreaterThan(2 * STICK.radius);
    expect(up.insets.left).toBeLessThan(20);
  });

  it('drops the level name where the strip has no room for it', () => {
    expect(touchPlan(844, 390, STATUS_W).title).not.toBeNull();
    expect(touchPlan(560, 360, STATUS_W).title).toBeNull();
  });
});

describe('tipHoldMs', () => {
  it('gives a long tip longer, but never keeps one up for long', () => {
    expect(tipHoldMs('A short tip.')).toBeLessThan(tipHoldMs('A much longer tip that takes a good while to read through.'));
    expect(tipHoldMs('x'.repeat(1000))).toBe(9000);
  });
});
