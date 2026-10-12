import { describe, expect, it } from 'vitest';
import {
  anglerAt, CAPTIONS, captionAlpha, darkAt, depthAt, depthRate, HOLD_TO, LOOP_S, lureGlow, REACH_AT, SINK_TO, SOUNDS, surfaceY,
} from '../dev/promo/light/story';
import { BOIL_FPS, BOIL_FRAMES } from '../src/art/textures';

const END = LOOP_S - 1e-7;
const FRAME = 1 / 30;
const wrap = (angle: number): number => Math.atan2(Math.sin(angle), Math.cos(angle));

describe('promo short: there is a light, anglerfish', () => {
  it('loops: she is just as deep, rising just as fast, posed the same, at both ends', () => {
    expect(depthAt(END)).toBeCloseTo(depthAt(0), 3);
    expect(depthRate(END)).toBeCloseTo(depthRate(0), 2);
    const [a, b] = [anglerAt(0), anglerAt(END)];
    expect(b.x).toBeCloseTo(a.x, 3);
    expect(b.tilt).toBeCloseTo(a.tilt, 4);
    expect(b.effort).toBeCloseTo(a.effort, 4);
    expect(wrap(b.beat - a.beat)).toBeCloseTo(0, 4);
    expect(lureGlow(END)).toBeCloseTo(lureGlow(0), 4);
  });

  it('opens in the dark with her rising and her lure bright', () => {
    expect(darkAt(depthAt(0))).toBeGreaterThan(0.9);
    expect(depthRate(0)).toBeLessThan(-300);
    expect(anglerAt(0).tilt).toBeGreaterThan(0.6);
    expect(lureGlow(0)).toBeGreaterThan(0.8);
  });

  it('reaches the sunlit water under the surface by about 40% of the way in, and rests there', () => {
    expect(REACH_AT / LOOP_S).toBeLessThan(0.42);
    for (let t = REACH_AT; t <= HOLD_TO; t += 0.2) {
      expect(darkAt(depthAt(t))).toBeLessThan(0.08);
      // The surface is in the picture, above her, below the captions' sky.
      expect(surfaceY(t)).toBeGreaterThan(450);
      expect(surfaceY(t)).toBeLessThan(anglerAt(t).y - 200);
    }
  });

  it('sinks back into the dark before turning up again', () => {
    expect(darkAt(depthAt(SINK_TO))).toBeGreaterThan(0.95);
    expect(depthRate(SINK_TO - 1)).toBeGreaterThan(0);
    expect(depthRate(SINK_TO + 0.8)).toBeLessThan(0);
  });

  it('moves smoothly: no jump in her pose, and the sea never rushes past faster than a streak', () => {
    for (let t = 0; t + FRAME < LOOP_S; t += FRAME) {
      const [a, b] = [anglerAt(t), anglerAt(t + FRAME)];
      expect(Math.abs(b.x - a.x)).toBeLessThan(2);
      expect(Math.abs(b.tilt - a.tilt)).toBeLessThan(0.06);
      expect(Math.abs(depthRate(t)) * FRAME).toBeLessThan(55);
    }
  });

  it('shows the same words either side of the loop point, one set at a time', () => {
    for (const c of CAPTIONS) expect(captionAlpha(c, END)).toBeCloseTo(captionAlpha(c, 0), 3);
    expect(CAPTIONS.some((c) => captionAlpha(c, 0) === 1)).toBe(true);
    for (let t = 0; t < LOOP_S; t += 0.05) {
      const shown = new Set(CAPTIONS.filter((c) => captionAlpha(c, t) > 0).map((c) => `${c.from}`));
      expect(shown.size).toBeLessThanOrEqual(1);
    }
  });

  it('lasts a whole number of video frames and line-boil cycles, with every sound inside the loop', () => {
    expect((LOOP_S * 30) % 1).toBe(0);
    expect((LOOP_S * BOIL_FPS) % BOIL_FRAMES).toBe(0);
    for (const s of SOUNDS) {
      expect(s.t).toBeGreaterThanOrEqual(0);
      expect(s.t).toBeLessThan(LOOP_S);
    }
  });
});
