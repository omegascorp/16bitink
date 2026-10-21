import { describe, expect, it } from 'vitest';
import { boardEndRoom, boardSideRoom, cardFit, hitSize, hudPlan, MIN_TOUCH, uprightScreen } from '../src/scenes/uiLayout';

const SIZES = { button: 54, margin: 14, meterH: 50 } as const;
/** The interface scale hidpi.uiScaleFor gives these screens. */
const scaleFor = (w: number, h: number): number => Math.min(1, Math.max(0.55, Math.min(w / 760, h / 560)));
const plan = (w: number, h: number, rail = false) => {
  const s = scaleFor(w, h);
  return { s, view: { width: w / s, height: h / s }, p: hudPlan({ width: w / s, height: h / s }, { width: w, height: h }, s, rail, SIZES) };
};

describe('cardFit', () => {
  it('shrinks a card to fit a short screen', () => {
    expect(cardFit({ width: 1200, height: 400 }, { w: 400, h: 480 })).toBeCloseTo(360 / 480);
  });

  it('never grows past `grow`, and only grows when asked', () => {
    expect(cardFit({ width: 2000, height: 2000 }, { w: 400, h: 400 })).toBe(1);
    expect(cardFit({ width: 2000, height: 2000 }, { w: 400, h: 400 }, 1.4)).toBe(1.4);
  });
});

describe('hitSize', () => {
  it('is at least MIN_TOUCH CSS px on screen', () => {
    for (const scale of [0.55, 0.7, 1]) expect(hitSize(40, scale) * scale).toBeGreaterThanOrEqual(MIN_TOUCH - 1e-9);
  });

  it('is never smaller than the part', () => {
    expect(hitSize(200, 1)).toBeGreaterThan(200);
  });
});

describe('board room', () => {
  it('finds the paper beside a landscape board', () => {
    // A 1440×700 screen fits the 1280×720 board by height: about 98 px either side.
    expect(boardSideRoom({ width: 1440, height: 700 }, 1)).toBeCloseTo((1440 - 1280 * (700 / 720)) / 2);
    expect(boardSideRoom({ width: 1280, height: 900 }, 1)).toBe(0);
    expect(boardSideRoom({ width: 390, height: 844 }, 0.55)).toBe(0);
  });

  it('keeps at least the HUD strip above an upright board', () => {
    expect(boardEndRoom({ width: 390, height: 844 }, 0.55) * 0.55).toBeGreaterThanOrEqual(56);
  });
});

describe('hudPlan', () => {
  it('stacks the buttons in the paper beside the board when they fit there', () => {
    const { view, p } = plan(844, 390);
    expect(p.upright).toBe(false);
    expect(p.buttons[0]!.x).toBe(p.buttons[1]!.x);
    expect(p.buttons[0]!.x).toBeGreaterThan(view.width - boardSideRoom({ width: 844, height: 390 }, scaleFor(844, 390)));
  });

  it('puts the buttons side by side when the board fills the width', () => {
    const { p } = plan(1280, 900);
    expect(p.buttons[0]!.y).toBe(p.buttons[1]!.y);
    expect(p.buttons[1]!.x).toBeLessThan(p.buttons[0]!.x);
  });

  it('upright: meter below the board, tag and buttons above it, all on screen', () => {
    const { view, p } = plan(390, 844);
    expect(p.upright).toBe(true);
    expect(p.k).toBeGreaterThan(1);
    expect(p.meter.y).toBeGreaterThan(view.height * 0.85);
    expect(p.meter.y + (SIZES.meterH * p.k) / 2).toBeLessThanOrEqual(view.height);
    for (const b of p.buttons) {
      expect(b.y - (SIZES.button * p.k) / 2).toBeGreaterThanOrEqual(0);
      expect(b.x + (SIZES.button * p.k) / 2).toBeLessThanOrEqual(view.width);
    }
    expect(p.hintY).toBeLessThan(p.meter.y);
  });

  it('upright: the top row stays in the strip above the board', () => {
    const { s, p } = plan(390, 844);
    const room = boardEndRoom({ width: 390, height: 844 }, s);
    expect(p.buttons[0]!.y + (SIZES.button * p.k) / 2).toBeLessThanOrEqual(room);
  });

  it('moves the hint off the bottom on rail levels, but not up onto the lines along the top', () => {
    const rail = plan(1440, 700, true);
    expect(rail.p.hintY).toBeLessThan(plan(1440, 700, false).p.hintY);
    expect(rail.p.hintY).toBeGreaterThan(rail.view.height * 0.3);
  });

  it('turns upright only when the screen is clearly taller than wide', () => {
    expect(uprightScreen(390, 844)).toBe(true);
    expect(uprightScreen(800, 900)).toBe(false);
  });
});
