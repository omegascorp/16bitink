import { describe, expect, it } from 'vitest';
import { boilAt } from '../dev/promo/sprites';
import { DRIFT, pathAt, PERIOD } from '../dev/promo/gulphen/path';
import {
  alarmAt, BITE_AT, CAPTIONS, captionAlpha, CREDIT_TEXT, feathersAt, freeGape, GROW, groundAt, GULP_AT, headU, HEAVES, henAt, henBottom, HEN_LEN, henTop, jawsAt, LOOP_S, lumpSize,
  onlyFeetLeft, RIM_0, SOUNDS, sideView, toScreen, viewAt, wrap,
} from '../dev/promo/gulphen/story';

const END = LOOP_S - 1e-6;
const FRAME = 1 / 30;
const FRAMES = Array.from({ length: Math.round(LOOP_S * 30) }, (_, i) => i * FRAME);

/** The snake's head on screen. */
const headOnScreen = (t: number): { x: number; y: number } => toScreen(viewAt(t), pathAt(headU(t)));

describe('promo short: the corn snake and the hen (no voice, InkSnake)', () => {
  it('is 12 s, a multiple of 1.5 s, so the line boil loops too', () => {
    expect(LOOP_S).toBe(12);
    expect((LOOP_S / 1.5) % 1).toBe(0);
    expect(boilAt(LOOP_S)).toBe(boilAt(0));
    expect(wrap(LOOP_S + 0.5)).toBeCloseTo(0.5, 9);
  });

  it('loops: the last frame runs into frame 1 on screen', () => {
    const [a, b] = [headOnScreen(END), headOnScreen(0)];
    expect(a.x).toBeCloseTo(b.x, 1);
    expect(a.y).toBeCloseTo(b.y, 1);
    expect(viewAt(END).zoom).toBeCloseTo(viewAt(0).zoom, 4);
    expect(headU(END) - PERIOD).toBeCloseTo(headU(0), 1);
    const [j1, j2] = [jawsAt(END), jawsAt(0)];
    for (const key of ['tipTop', 'tipBottom', 'hingeTop', 'hingeBottom', 'reach'] as const) expect(j1[key], key).toBeCloseTo(j2[key], 0);
    expect(sideView(END)).toBe(1);
    expect(sideView(0)).toBe(1);
    expect(alarmAt(END)).toBeCloseTo(alarmAt(0), 3);
    expect(lumpSize(END)).toBe(0);
  });

  it('loops: the next hen stands where frame 1 finds the hen, on screen, in the same pose', () => {
    const [h1, h0] = [henAt(END)!, henAt(0)!];
    const [p1, p0] = [toScreen(viewAt(END), h1), toScreen(viewAt(0), h0)];
    expect(p1.x).toBeCloseTo(p0.x, 1);
    expect(p1.y).toBeCloseTo(p0.y, 1);
    expect(h1.tilt).toBeCloseTo(h0.tilt, 3);
    expect(h1.neck).toBeCloseTo(h0.neck, 3);
    expect(h1.alarm).toBe(h0.alarm);
    expect(h1.nearLeg).toBeCloseTo(h0.nearLeg, 1);
    expect(h1.farLeg).toBeCloseTo(h0.farLeg, 1);
  });

  it('loops: the ground ends as it starts, the bigger copy faded right in', () => {
    const [[a0], [, b1]] = [groundAt(0), groundAt(END)];
    expect(a0.alpha).toBe(1);
    expect(b1.alpha).toBeCloseTo(1, 6);
    expect(groundAt(0)[1].alpha).toBe(0);
    expect(b1.zoom).toBeCloseTo(a0.zoom, 3);
    expect(b1.x).toBeCloseTo(a0.x, 0);
    expect(b1.y).toBeCloseTo(a0.y, 0);
    expect(GROW).toBeGreaterThan(1);
  });

  it('never jumps: the head and camera move on smoothly, frame to frame, round the seam too', () => {
    for (const t of FRAMES) {
      const next = wrap(t + FRAME);
      const [a, b] = [headOnScreen(t), headOnScreen(next)];
      // The gulp and the strike are fast but not cuts.
      expect(Math.hypot(b.x - a.x, b.y - a.y), `head at ${t}`).toBeLessThan(90);
      expect(Math.abs(Math.log(viewAt(next).zoom / viewAt(t).zoom)), `zoom at ${t}`).toBeLessThan(0.1);
      expect(Math.abs(jawsAt(next).tipTop - jawsAt(t).tipTop), `gape at ${t}`).toBeLessThan(60);
      expect(Math.abs(jawsAt(next).reach - jawsAt(t).reach), `reach at ${t}`).toBeLessThan(50);
    }
  });

  it('crawls forward only: the path repeats, moved by one drift', () => {
    const [a, b] = [pathAt(300), pathAt(300 + PERIOD)];
    expect(b.x - a.x).toBeCloseTo(DRIFT.x, 3);
    expect(b.y - a.y).toBeCloseTo(DRIFT.y, 3);
    expect(b.heading).toBeCloseTo(a.heading, 6);
    for (const t of FRAMES.slice(1)) expect(headU(t) + 12).toBeGreaterThan(headU(t - FRAME));
  });

  it('has no caption on frame 1; the first starts at 0.15 s or later', () => {
    for (const c of CAPTIONS) expect(captionAlpha(c, 0), c.text).toBe(0);
    expect(Math.min(...CAPTIONS.map((c) => c.from))).toBeGreaterThanOrEqual(0.15);
    expect(captionAlpha(CAPTIONS[0]!, 0.15)).toBe(0);
    for (const c of CAPTIONS) expect(captionAlpha(c, END), c.text).toBe(0);
  });

  it('keeps every line of text inside the clear area, y 270..1250', () => {
    for (const c of CAPTIONS) {
      expect(c.y - c.size * 0.8, c.text).toBeGreaterThanOrEqual(270);
      expect(c.y + c.size * 0.3, c.text).toBeLessThanOrEqual(1250);
    }
    expect(CREDIT_TEXT.y).toBeLessThanOrEqual(1250);
    expect(CREDIT_TEXT.text).toBe('InkSnake · 16bit.ink');
  });

  it('says the three lines at their beats, one at a time', () => {
    expect(CAPTIONS.map((c) => c.text)).toEqual(['that’s a whole chicken', 'how did THAT fit', 'room for seconds?']);
    expect(CAPTIONS[0]!.to).toBeCloseTo(2.5, 6);
    expect(CAPTIONS[1]!.from).toBeGreaterThanOrEqual(GULP_AT);
    for (const t of FRAMES) expect(CAPTIONS.filter((c) => captionAlpha(c, t) > 0).length, `at ${t}`).toBeLessThanOrEqual(1);
  });

  it('swallows the hen as the beats say: the hen in the jaws, then only her feet, then gone', () => {
    expect(RIM_0).toBeGreaterThan(0);
    expect(jawsAt(0).tipTop).toBeGreaterThan(200);
    expect(headU(HEAVES[2] + 0.4)).toBeGreaterThan(headU(HEAVES[0]));
    expect(headU(BITE_AT)).toBeGreaterThan(headU(0));
    expect(onlyFeetLeft(4.25)).toBe(true);
    expect(onlyFeetLeft(2)).toBe(false);
    expect(henAt(5)).toBeNull();
    expect(lumpSize(GULP_AT + 1)).toBeGreaterThan(0.9);
    expect(freeGape(6.5)).toBe(0);
    expect(henTop(380) + henBottom(380)).toBeGreaterThan(3 * 122);
    expect(henTop(HEN_LEN + 1)).toBe(0);
    expect(feathersAt(HEAVES[1] + 0.3).length).toBeGreaterThan(2);
    expect(feathersAt(GULP_AT + 2).length).toBeGreaterThanOrEqual(1);
    expect(feathersAt(0).length).toBe(0);
  });

  it('uses the game’s own sound effects, on the loop', () => {
    for (const s of SOUNDS) {
      expect(s.t).toBeGreaterThanOrEqual(0);
      expect(s.t).toBeLessThan(LOOP_S);
    }
    expect(SOUNDS.some((s) => s.id === 'swallow' && s.t === GULP_AT)).toBe(true);
  });
});
