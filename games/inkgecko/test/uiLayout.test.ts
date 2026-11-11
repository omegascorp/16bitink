import { describe, expect, it } from 'vitest';
import { FULL_BOARD, type Box } from '../src/logic/framing';
import { cardFit, hitSize, hudPlan, MIN_TOUCH, stagePlan, TOUCH, uprightScreen } from '../src/scenes/uiLayout';

const SIZES = { button: 54, margin: 14, meterH: 50, tagW: 92, colW: 92, colH: 272 } as const;
/** The interface scale hidpi.uiScaleFor gives these screens. */
const scaleFor = (w: number, h: number): number => Math.min(1, Math.max(0.55, Math.min(w / 760, h / 560)));
/** A level whose lines and gecko leave bare ground above and below them. */
const LEVEL: Box = { x0: 90, y0: 86, x1: 1090, y1: 658 };
const plan = (w: number, h: number, o: { rail?: boolean; touch?: boolean; box?: Box } = {}) => {
  const s = scaleFor(w, h);
  const stage = stagePlan({ width: w, height: h }, s, o.box ?? FULL_BOARD, o.touch ?? false);
  const view = { width: w / s, height: h / s };
  return { s, view, stage, p: hudPlan(view, stage, s, o.rail ?? false, SIZES) };
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

describe('stagePlan', () => {
  it('shows a laptop the whole board, with the HUD over it', () => {
    const { stage } = plan(1440, 700, { box: LEVEL });
    expect(stage.mode).toBe('over');
    expect(stage.framing.zoom).toBeCloseTo(700 / 720);
  });

  it('draws a touch screen\'s board bigger by cutting the bare ground round the level', () => {
    const full = plan(844, 390, { touch: true });
    const cut = plan(844, 390, { touch: true, box: LEVEL });
    expect(cut.stage.framing.zoom).toBeGreaterThan(full.stage.framing.zoom * 1.15);
  });

  it('keeps the HUD off the board on a phone held sideways: in columns beside it, or a strip above it', () => {
    for (const [w, h] of [[844, 390], [932, 430], [667, 375], [740, 360], [1024, 768]] as const) {
      const { stage } = plan(w, h, { touch: true, box: LEVEL });
      const shown = { w: (LEVEL.x1 - LEVEL.x0) * stage.framing.zoom, h: (LEVEL.y1 - LEVEL.y0) * stage.framing.zoom };
      if (stage.mode === 'sides') expect(shown.w).toBeLessThanOrEqual(w - 2 * 60 + 1e-6);
      else {
        expect(stage.mode).toBe('top');
        expect(stage.shiftY).toBeGreaterThan(0);
        expect(shown.h).toBeLessThanOrEqual(h - stage.shiftY * 2 + 1e-6);
      }
    }
  });

  it('turns the board on an upright screen, laptop or phone', () => {
    expect(plan(390, 844).stage.turned).toBe(true);
    expect(plan(390, 844, { touch: true }).stage.mode).toBe('upright');
  });
});

describe('hudPlan', () => {
  it('stacks the buttons in the paper beside a laptop\'s board when they fit there', () => {
    const { p } = plan(1440, 700);
    expect(p.buttons[0]!.x).toBe(p.buttons[1]!.x);
  });

  it('puts the buttons side by side when the board fills the width', () => {
    const { p } = plan(1280, 900);
    expect(p.buttons[0]!.y).toBe(p.buttons[1]!.y);
    expect(p.buttons[1]!.x).toBeLessThan(p.buttons[0]!.x);
  });

  it('sideways phone: the clock and pause on the left, the meter down the right, sound on the pause card', () => {
    const { view, stage, p } = plan(844, 390, { touch: true, box: { x0: 0, y0: 44, x1: 1280, y1: 712 } });
    expect(stage.mode).toBe('sides');
    expect(p.meter.column).toBe(true);
    expect(p.tag.compact).toBe(true);
    expect(p.buttons).toHaveLength(1);
    expect(p.buttons[0]!.x).toBeLessThan(view.width * 0.1);
    expect(p.meter.x).toBeGreaterThan(view.width * 0.9);
  });

  it('puts the stick bottom-left and Spit bottom-right, Swap just above Spit, all on screen', () => {
    for (const [w, h, touch] of [[844, 390, true], [390, 844, true], [1440, 700, false]] as const) {
      const { s, view, p } = plan(w, h, { touch, box: LEVEL });
      const r = (css: number): number => css / s;
      expect(p.stick.x - r(TOUCH.stick)).toBeGreaterThanOrEqual(0);
      expect(p.stick.y + r(TOUCH.stick)).toBeLessThanOrEqual(view.height);
      expect(p.fire.x + r(TOUCH.fire)).toBeLessThanOrEqual(view.width);
      expect(p.fire.y + r(TOUCH.fire)).toBeLessThanOrEqual(view.height);
      expect(p.swap.y).toBeLessThan(p.fire.y - r(TOUCH.fire));
      expect(p.stick.x).toBeLessThan(view.width / 2);
      expect(p.fire.x).toBeGreaterThan(view.width / 2);
    }
  });

  it('sideways: the meter column stays on screen and clear of Swap, the bottom hint clear of the controls', () => {
    for (const [w, h] of [[844, 390], [1024, 768], [740, 320], [932, 430]] as const) {
      const { s, view, stage, p } = plan(w, h, { touch: true, box: { x0: 0, y0: 44, x1: 1280, y1: 712 } });
      if (stage.mode !== 'sides') continue;
      expect(p.meter.x + SIZES.colW / 2).toBeLessThanOrEqual(view.width);
      expect(p.meter.y + SIZES.colH * p.meter.scale).toBeLessThanOrEqual(p.swap.y - TOUCH.swap / s);
      expect(view.width / 2 - p.hintW / 2).toBeGreaterThanOrEqual(p.stick.x + TOUCH.stick / s);
      expect(view.width / 2 + p.hintW / 2).toBeLessThanOrEqual(p.fire.x - TOUCH.fire / s);
    }
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
    expect(p.stick.y).toBeLessThan(p.hintY);
  });

  it('upright: the top row stays in the strip above the board', () => {
    const { s, stage, p } = plan(390, 844, { touch: true, box: LEVEL });
    expect(p.buttons[0]!.y + (SIZES.button * p.k) / 2).toBeLessThanOrEqual(stage.room / s);
  });

  it('moves the hint off the bottom on rail levels, but not up onto the lines along the top', () => {
    const rail = plan(1440, 700, { rail: true });
    expect(rail.p.hintY).toBeLessThan(plan(1440, 700).p.hintY);
    expect(rail.p.hintY).toBeGreaterThan(rail.view.height * 0.3);
  });

  it('turns upright only when the screen is clearly taller than wide', () => {
    expect(uprightScreen(390, 844)).toBe(true);
    expect(uprightScreen(800, 900)).toBe(false);
  });
});
