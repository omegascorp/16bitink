import { describe, expect, it } from 'vitest';
import { creditAt } from '../dev/promo/credit';
import { captionAt, LINES, SOUNDS, TEXT } from '../dev/promo/brydes/script';
import {
  barAt, boilAt, BOIL_STEPS, bubbleAt, buddyAt, calfAt, CAM0, cameraAt, cardAt, CALVES_AT, CHASING_AT, COPY_AT, eyeAt, flashAt, FORTY_AT, GULF_AT, gapeAt, gradeAt,
  gullsAt, IN_AT, JAWS_AT, LOOP_S, NO2_AT, NO_AT, placeAt, shakeAt, SO_AT, splashAt, streamAt, bulgeAt, WAITS_AT, whaleAt, worryAt, wrap,
} from '../dev/promo/brydes/story';
import { TEMPO, WORDS } from '../dev/promo/brydes/words';
import { BOIL_FPS, BOIL_FRAMES } from '../src/art/textures';

const END = LOOP_S - 1e-7;
const FRAME = 1 / 30;
const FRAMES = Array.from({ length: Math.round(LOOP_S * 30) + 1 }, (_, i) => i * FRAME - FRAME);
const frac = (x: number): number => ((x % 1) + 1) % 1;

/** Every time-driven value the picture is drawn from, at video time t. */
function snapshot(t: number): Record<string, number> {
  const w = whaleAt(t);
  const v = cameraAt(t);
  const b = buddyAt(t);
  const c = calfAt(t);
  const g = gradeAt(t);
  const j = shakeAt(t);
  const bar = barAt(t);
  return {
    camX: v.x, camY: v.y, zoom: v.zoom, x: w.x, y: w.y, tilt: w.tilt, gape: w.gape, bulge: w.bulge,
    buddy: b.shown, buddyY: b.pose.y, calf: c.shown, calfY: c.pose.y, calfGape: c.pose.gape,
    stream: frac(streamAt(t)), worry: worryAt(t), gulls: gullsAt(t), place: placeAt(t), bar: bar.shown, barDraw: bar.draw,
    card0: cardAt(0, t).slide, card1: cardAt(1, t).slide, cross0: cardAt(0, t).cross, cross1: cardAt(1, t).cross,
    bubble0: bubbleAt(0, t), bubble1: bubbleAt(1, t), splash: splashAt(t), flash: flashAt(t), shakeX: j.x, shakeY: j.y,
    gradeR: g[0]!, gradeA: g[3]!, credit: creditAt(wrap(t), LOOP_S), boil: boilAt(t) % BOIL_FRAMES,
  };
}

describe('promo short: this whale just opens its mouth and waits (narrated)', () => {
  it('loops: every time-driven value at the loop point is where it was at the start', () => {
    const [a, b] = [snapshot(END), snapshot(0)];
    for (const key of Object.keys(b)) {
      if (key === 'boil') continue;
      // The stream's clock is a fraction of a transit: 0 and 1 are the same place.
      if (key === 'stream') {
        expect(Math.min(Math.abs(a[key]! - b[key]!), 1 - Math.abs(a[key]! - b[key]!)), key).toBeLessThan(1e-3);
        continue;
      }
      expect(a[key], key).toBeCloseTo(b[key]!, 3);
    }
    expect(eyeAt(END)).toBe(eyeAt(0));
    expect((a.boil! + 1) % BOIL_FRAMES).toBe(b.boil);
    for (const key of ['x', 'y', 'zoom'] as const) expect(cameraAt(0)[key]).toBeCloseTo(CAM0[key], 6);
  });

  it('never jumps from one frame to the next, across the loop point too', () => {
    for (const t of FRAMES) {
      const [v0, v1] = [cameraAt(t), cameraAt(t + FRAME)];
      expect(Math.abs(Math.log(v1.zoom / v0.zoom))).toBeLessThan(0.08);
      expect(Math.hypot(v1.x - v0.x, v1.y - v0.y) * v0.zoom).toBeLessThan(60);
      const [w0, w1] = [whaleAt(t), whaleAt(t + FRAME)];
      expect(Math.abs(w1.gape - w0.gape)).toBeLessThan(0.25);
      expect(Math.abs(w1.bulge - w0.bulge)).toBeLessThan(0.2);
      expect(Math.abs(w1.y - w0.y)).toBeLessThan(6);
      expect(Math.abs(calfAt(t + FRAME).shown - calfAt(t).shown)).toBeLessThan(0.2);
      expect(Math.abs(calfAt(t + FRAME).pose.y - calfAt(t).pose.y)).toBeLessThan(150);
      expect(Math.abs(barAt(t + FRAME).shown - barAt(t).shown)).toBeLessThan(0.3);
      // Every fish moves on by less than a fifth of its way a frame (it never pops back).
      const step = frac(streamAt(t + FRAME)) - frac(streamAt(t));
      expect(step < 0 ? step + 1 : step).toBeLessThan(0.2);
    }
  });

  it('opens on the hook alone: the jaw wide, the fish pouring in, nothing written but the words', () => {
    const w = whaleAt(0);
    expect(w.gape).toBeGreaterThan(0.95);
    expect(w.eye).toBe('sly');
    expect(streamAt(0)).toBeGreaterThanOrEqual(0);
    for (const v of [barAt(0).shown, placeAt(0), cardAt(0, 0).slide, cardAt(1, 0).slide, calfAt(0).shown, buddyAt(0).shown, gullsAt(0), creditAt(0, LOOP_S)]) expect(v).toBe(0);
    expect(cameraAt(0).zoom).toBeGreaterThan(1.1);
  });

  it('times each beat to its words', () => {
    // The jaw is wide until "in!", shuts on the gulp with the throat bulging and the splash, and reopens for the calf.
    expect(gapeAt(IN_AT - 0.3)).toBe(1);
    expect(gapeAt(IN_AT + 0.25)).toBeLessThan(0.05);
    expect(bulgeAt(IN_AT + 0.3)).toBeGreaterThan(0.8);
    expect(splashAt(IN_AT)).toBeGreaterThanOrEqual(0);
    expect(shakeAt(IN_AT + 0.1).x).not.toBe(0);
    expect(gapeAt(CALVES_AT + 0.5)).toBe(1);
    // The smug eye on "WAITS!", a gull circling.
    expect(eyeAt(WAITS_AT + 0.1)).toBe('smug');
    expect(gullsAt(WAITS_AT + 0.5)).toBe(1);
    // The place tag on "Gulf of Thailand"; "40 ft / 12 m" as "forty-foot" is said, gone as the jaws open.
    expect(placeAt(GULF_AT + 0.5)).toBe(1);
    expect(barAt(FORTY_AT + 0.8).draw).toBe(1);
    expect(barAt(FORTY_AT + 0.8).shown).toBe(1);
    expect(barAt(JAWS_AT + 0.4).shown).toBe(0);
    expect(buddyAt(7.6).shown).toBeGreaterThan(0.9);
    // Fish worry as they drift in, calm again after the gulp.
    expect(worryAt(IN_AT - 0.2)).toBeGreaterThan(0.9);
    expect(worryAt(IN_AT + 0.6)).toBe(0);
    // The gag cards each on their word, the ✗ stamped after.
    expect(cardAt(0, NO_AT + 0.4).slide).toBe(1);
    expect(cardAt(0, NO_AT + 0.7).cross).toBe(1);
    expect(cardAt(1, NO2_AT - 0.3).slide).toBe(0);
    expect(cardAt(1, NO2_AT + 0.4).slide).toBe(1);
    expect(cardAt(1, NO2_AT + 0.8).cross).toBe(1);
    expect(cardAt(0, CALVES_AT + 0.1).slide).toBe(0);
    // The bubble burp after the chasing line, the calf's mouth opens on "COPY", the lazy bubble in the sarcastic line.
    expect(bubbleAt(0, CHASING_AT + 0.3)).toBeGreaterThanOrEqual(0);
    expect(calfAt(COPY_AT - 0.6).pose.gape).toBe(0);
    expect(calfAt(COPY_AT + 0.5).pose.gape).toBe(1);
    expect(calfAt(COPY_AT + 0.5).shown).toBe(1);
    expect(bubbleAt(1, 17)).toBeGreaterThanOrEqual(0);
    expect(eyeAt(17)).toBe('lazy');
    // "So": the mouth opens again into frame 1.
    expect(eyeAt(SO_AT + 0.1)).toBe('sly');
    expect(gapeAt(SO_AT + 1)).toBeGreaterThan(0.95);
  });

  it('finishes the voice just before the loop point, so the next loop finishes its sentence', () => {
    const last = WORDS[WORDS.length - 1]!;
    expect(last.text).toBe('So');
    const gap = LOOP_S - last.end / TEMPO + WORDS[0]!.start / TEMPO;
    expect(gap).toBeGreaterThan(0.2);
    expect(gap).toBeLessThan(0.5);
  });

  it('captions every spoken word in short lines, the word being spoken highlighted', () => {
    expect(LINES.flatMap((l) => l.words)).toEqual(WORDS);
    for (const l of LINES) {
      expect(l.words.length).toBeLessThanOrEqual(4);
      expect(l.words.map((w) => w.text).join(' ').length).toBeLessThanOrEqual(18);
    }
    for (const [i, w] of WORDS.entries()) {
      const next = WORDS[i + 1];
      for (const t of [w.start / TEMPO + 0.005, next ? (w.start + next.start) / 2 / TEMPO : w.start / TEMPO + 0.1]) {
        const now = captionAt(t)!;
        expect(now.line.words[now.word]).toBe(w);
      }
    }
    expect(captionAt(0)!.line).toBe(LINES[0]);
    expect(captionAt(END)!.line).toBe(LINES[LINES.length - 1]);
  });

  it('keeps every line of text between y 270 and 1240, even as the length label pops', () => {
    const maxPop = Math.max(...FRAMES.map((t) => barAt(t).pop));
    for (const [key, line] of Object.entries(TEXT) as [keyof typeof TEXT, { y: number; size: number }][]) {
      const size = line.size * (1 + (key === 'feet' || key === 'metres' ? maxPop : 0));
      // Caveat's caps and ascenders reach ~0.75 of the size above the baseline, descenders ~0.3 below.
      expect(line.y - 0.75 * size, key).toBeGreaterThanOrEqual(270);
      expect(line.y + 0.3 * size, key).toBeLessThanOrEqual(1240);
    }
  });

  it('shows the credit around the payoff, never in the hook or at the seam', () => {
    expect(creditAt(IN_AT + 1, LOOP_S)).toBeGreaterThan(0);
    expect(creditAt(2, LOOP_S)).toBe(0);
    expect(creditAt(END, LOOP_S)).toBe(0);
  });

  it('lasts a whole number of video frames and line-boil cycles, with every sound inside the loop', () => {
    expect(Math.abs(Math.round(LOOP_S * 30) - LOOP_S * 30)).toBeLessThan(1e-6);
    expect(BOIL_STEPS % BOIL_FRAMES).toBe(0);
    expect(BOIL_STEPS / LOOP_S).toBe(BOIL_FPS);
    expect(boilAt(0)).toBe(0);
    expect(boilAt(END) % BOIL_FRAMES).toBe(BOIL_FRAMES - 1);
    expect(SOUNDS.length).toBeGreaterThan(20);
    for (const s of SOUNDS) {
      expect(s.t).toBeGreaterThanOrEqual(0);
      expect(s.t).toBeLessThan(LOOP_S);
      expect(s.gain).toBeGreaterThan(0);
      expect(s.gain).toBeLessThanOrEqual(0.5);
    }
  });
});
