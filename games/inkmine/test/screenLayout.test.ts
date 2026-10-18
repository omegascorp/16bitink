import { describe, expect, it } from 'vitest';
import { CARD_FIT, cardFits, cardScale, cardWidest, PAD, padButtons, padCorner, STRIP_FIT, stripPlace } from '../src/logic/screenLayout';

/** A phone's screen in layout units, as hidpi.ts scales it (laid out for 760×560, never under 0.55). */
function phone(cssW: number, cssH: number): { width: number; height: number; scale: number } {
  const scale = Math.min(1, Math.max(0.55, Math.min(cssW / 760, cssH / 560)));
  return { width: cssW / scale, height: cssH / scale, scale };
}

const LANDSCAPE = phone(844, 390);
const PORTRAIT = phone(390, 844);
const SMALL_LANDSCAPE = phone(667, 375);
const MARGIN = 14;

const overlaps = (a: { l: number; r: number; t: number; b: number }, b: { l: number; r: number; t: number; b: number }): boolean =>
  a.l < b.r && b.l < a.r && a.t < b.b && b.t < a.b;

describe('padButtons', () => {
  it('stays the same size in CSS pixels however the interface is scaled', () => {
    const { jump, bag } = padButtons(LANDSCAPE.width, LANDSCAPE.height, LANDSCAPE.scale);
    expect(jump.r * LANDSCAPE.scale).toBeCloseTo(PAD.jump);
    expect(bag.r * LANDSCAPE.scale).toBeCloseTo(PAD.bag);
  });

  it('puts Jump in the bottom-right corner, inside the screen', () => {
    const { jump } = padButtons(PORTRAIT.width, PORTRAIT.height, PORTRAIT.scale);
    expect(jump.x + jump.r).toBeLessThan(PORTRAIT.width);
    expect(jump.y + jump.r).toBeLessThan(PORTRAIT.height);
    expect(jump.x).toBeGreaterThan(PORTRAIT.width / 2);
  });
});

describe('padCorner', () => {
  it('covers every button shown', () => {
    const { width, height, scale } = LANDSCAPE;
    const { jump, bag, pulse } = padButtons(width, height, scale);
    const plain = padCorner(width, height, scale, false);
    for (const d of [jump, bag]) {
      expect(width - (d.x - d.r)).toBeLessThanOrEqual(plain.side + 1e-9);
      expect(height - (d.y - d.r)).toBeLessThanOrEqual(plain.rise + 1e-9);
    }
    const armed = padCorner(width, height, scale, true);
    expect(height - (pulse.y - pulse.r)).toBeLessThanOrEqual(armed.rise + 1e-9);
    expect(armed.rise).toBeGreaterThan(plain.rise);
  });
});

describe('stripPlace', () => {
  const strip = (width: number, height: number, p: { x: number; w: number; lift: number }) => ({ l: p.x - p.w / 2, r: p.x + p.w / 2, t: height - p.lift - 104, b: height - p.lift });

  it('sits low and centred with no touch buttons', () => {
    expect(stripPlace(1200, null)).toEqual({ x: 600, w: STRIP_FIT.w, lift: STRIP_FIT.lift });
  });

  it.each([
    ['a phone on its side', LANDSCAPE],
    ['a small phone on its side', SMALL_LANDSCAPE],
    ['a phone held upright', PORTRAIT],
  ])('keeps clear of the buttons on %s', (_name, { width, height, scale }) => {
    for (const armed of [false, true]) {
      const corner = padCorner(width, height, scale, armed);
      const p = stripPlace(width, corner);
      const box = strip(width, height, p);
      const buttons = padButtons(width, height, scale);
      for (const d of armed ? [buttons.jump, buttons.bag, buttons.pulse] : [buttons.jump, buttons.bag]) {
        expect(overlaps(box, { l: d.x - d.r, r: d.x + d.r, t: d.y - d.r, b: d.y + d.r })).toBe(false);
      }
      expect(box.l).toBeGreaterThanOrEqual(0);
      expect(box.r).toBeLessThanOrEqual(width);
      expect(p.w).toBeGreaterThanOrEqual(STRIP_FIT.min);
    }
  });

  it('stays low on a phone on its side: narrowed between the buttons, or beside them', () => {
    for (const { width, height, scale } of [LANDSCAPE, SMALL_LANDSCAPE]) {
      expect(stripPlace(width, padCorner(width, height, scale, false)).lift).toBe(STRIP_FIT.lift);
    }
    const wide = stripPlace(LANDSCAPE.width, padCorner(LANDSCAPE.width, LANDSCAPE.height, LANDSCAPE.scale, false));
    expect(wide.x).toBeCloseTo(LANDSCAPE.width / 2);
    const small = stripPlace(SMALL_LANDSCAPE.width, padCorner(SMALL_LANDSCAPE.width, SMALL_LANDSCAPE.height, SMALL_LANDSCAPE.scale, false));
    expect(small.x).toBeLessThan(SMALL_LANDSCAPE.width / 2);
  });

  it('goes up over the buttons on a phone held upright', () => {
    const { width, height, scale } = PORTRAIT;
    const corner = padCorner(width, height, scale, false);
    expect(stripPlace(width, corner).lift).toBeGreaterThanOrEqual(corner.rise);
  });
});

describe('fitting cards', () => {
  it('leaves a card that fits at full size', () => {
    expect(cardFits(400, 560, MARGIN)).toBe(true);
    expect(cardScale(400, 560, MARGIN)).toBe(1);
  });

  it("shrinks a tall card so all of it, its button too, is on screen", () => {
    // The end of chapter 3's card, on a phone on its side.
    const h = 689;
    const k = cardScale(h, LANDSCAPE.height, MARGIN);
    expect(k).toBeLessThan(1);
    expect((h + MARGIN * 2) * k).toBeCloseTo(LANDSCAPE.height - CARD_FIT.gap * 2);
  });

  it('widens a card only as far as the screen allows', () => {
    expect(cardWidest(LANDSCAPE.width, MARGIN)).toBe(CARD_FIT.wide);
    expect(cardWidest(PORTRAIT.width, MARGIN)).toBeLessThan(PORTRAIT.width);
    expect(cardWidest(PORTRAIT.width, MARGIN)).toBeLessThan(CARD_FIT.wide);
  });
});
