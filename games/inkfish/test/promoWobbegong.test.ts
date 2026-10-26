import { describe, expect, it } from 'vitest';
import { creditAt } from '../dev/promo/credit';
import { captionAt, LINES, nameLabel, placeLabel, sizeLabel, SOUNDS, tapeAt, TEXT, yearLabel } from '../dev/promo/wobbegong/script';
import { frontLandmarks } from '../dev/promo/wobbegong/front';
import { BODY, frontAt, PREY_LEN, type PreyPose, preySpine, tailTip } from '../dev/promo/wobbegong/shape';
import {
  arrowAt, BAMBOO_AT, frontCamAt, SHARK_END, topAt, barAt, boilAt, CARPET_AT, cameraAt, clockAt, diversAt, DOWN_AT, eyeAt, fillAt, gapeAt, gradeAt, GREAT_AT, HALFWAY_AT, HALFWAY_END, HEAD_AT,
  highlightAt, HOURS_AT, inAt, LATER_AT, LOOP_S, minutesAt, morningAt, NO_AT, rippleAt, rugAt, rugDrawAt, RUSH_AT, said, SCIENTISTS_AT, shadowAt, SHAGGY_AT, shagAt,
  shakeAt, SHARK_AT, sighAt, sunAt, tailAt, THIRTY_AT, toScreen, WHOLE_AT, WOBBEGONG_AT, wrap, xrayAt, YEAR_AT,
} from '../dev/promo/wobbegong/story';
import { TEMPO, WORDS } from '../dev/promo/wobbegong/words';
import { BOIL_FPS, BOIL_FRAMES } from '../src/art/textures';

const END = LOOP_S - 1e-7;
const FRAME = 1 / 30;
/** Every frame of the loop, and one across the loop point. */
const FRAMES = Array.from({ length: Math.round(LOOP_S * 30) + 1 }, (_, i) => i * FRAME - FRAME);
const dist = (p: { x: number; y: number }, q: { x: number; y: number }): number => Math.hypot(q.x - p.x, q.y - p.y);
const MOUTH = { x: 0, y: 0 };
/** The bamboo shark's spine at t (its pose from the clock). */
const poseAt = (t: number): PreyPose => {
  const tail = tailAt(t);
  return { inside: inAt(t), bend: tail.bend, flip: tail.flip, wave: tail.wave };
};
const spineAt = (t: number): ReturnType<typeof preySpine> => {
  const tail = tailAt(t);
  return preySpine({ inside: inAt(t), bend: tail.bend, flip: tail.flip, wave: tail.wave });
};
/** Where a world point is on screen at t. */
const onScreen = (t: number, p: { x: number; y: number }): { x: number; y: number } => toScreen(cameraAt(t), p);
/** Every 0 .. 1 value a frame draws from that runs on the clock. */
const SHOWN = [
  placeLabel, yearLabel, nameLabel, sizeLabel, tapeAt, shagAt, rugAt, highlightAt, xrayAt, arrowAt, clockAt, barAt, diversAt, morningAt,
  (t: number) => rippleAt(t).strength, (t: number) => sunAt(t).shown,
] as const;

describe('promo short: a wobbegong swallowing a bamboo shark (narrated)', () => {
  it('loops: the camera, the swallow, the tail, the face, the light and every clocked value are where they started', () => {
    const [fa, fb] = [frontCamAt(END), frontCamAt(0)];
    expect(fa.zoom).toBeCloseTo(fb.zoom, 5);
    expect(fa.sink).toBeCloseTo(fb.sink, 4);
    expect((frontCamAt(END).zoom - frontCamAt(END - 1e-4).zoom) / 1e-4).toBeCloseTo((frontCamAt(1e-4).zoom - frontCamAt(0).zoom) / 1e-4, 3);
    expect(topAt(END)).toBe(topAt(0));
    const [a, b] = [cameraAt(END), cameraAt(0)];
    expect(a.x).toBeCloseTo(b.x, 4);
    expect(a.y).toBeCloseTo(b.y, 4);
    expect(a.zoom).toBeCloseTo(b.zoom, 5);
    expect(a.rot).toBeCloseTo(b.rot, 5);
    // Moving the same way on both sides of the seam: the slow push in carries on.
    const h = 1e-4;
    expect((cameraAt(END).zoom - cameraAt(END - h).zoom) / h).toBeCloseTo((cameraAt(h).zoom - cameraAt(0).zoom) / h, 3);
    expect(inAt(END)).toBeCloseTo(inAt(0), 4);
    expect((inAt(END) - inAt(END - h)) / h).toBeCloseTo((inAt(h) - inAt(0)) / h, 1);
    expect(gapeAt(END)).toBeCloseTo(gapeAt(0), 4);
    const [ta, tb] = [tailAt(END), tailAt(0)];
    expect(ta.bend).toBeCloseTo(tb.bend, 4);
    expect(ta.flip).toBeCloseTo(tb.flip, 4);
    expect(Math.sin(ta.wave)).toBeCloseTo(Math.sin(tb.wave), 4);
    expect(Math.cos(ta.wave)).toBeCloseTo(Math.cos(tb.wave), 4);
    expect(dist(tailTip(spineAt(END)), tailTip(spineAt(0)))).toBeLessThan(0.05);
    expect(eyeAt(END)).toEqual(expect.objectContaining({ lid: expect.closeTo(eyeAt(0).lid, 4), lx: expect.closeTo(eyeAt(0).lx, 4), smug: expect.closeTo(eyeAt(0).smug, 4) }));
    const [ga, gb] = [gradeAt(END), gradeAt(0)];
    for (const k of ['tintA', 'vignette', 'caustics', 'spot', 'glowA', 'dim'] as const) expect(ga[k]).toBeCloseTo(gb[k], 4);
    for (let i = 0; i < 3; i++) expect(ga.tint[i]!).toBeCloseTo(gb.tint[i]!, 3);
    for (const f of SHOWN) expect(f(END)).toBeCloseTo(f(0), 4);
    expect(dist(shadowAt(END), shadowAt(0))).toBeLessThan(0.01);
    expect(sighAt(END)).toBe(sighAt(0));
    expect(shakeAt(END)).toEqual(shakeAt(0));
    expect(creditAt(END, LOOP_S)).toBe(creditAt(0, LOOP_S));
    // Values that end elsewhere are hidden at the seam.
    expect(rugAt(0)).toBe(0);
    expect(clockAt(0)).toBe(0);
    expect(barAt(0)).toBe(0);
    expect(sunAt(0).shown).toBe(0);
  });

  it('never jumps: the mouth, the tail and every value move on smoothly, frame to frame and across the loop point', () => {
    for (const t of FRAMES) {
      const q = t + FRAME;
      // The front view, while it shows: its mouth and the tail tip.
      if (topAt(t) < 1 || topAt(q) < 1) {
        const [m0, m1] = [frontLandmarks(t, poseAt(t)), frontLandmarks(q, poseAt(q))];
        expect(dist(m0.left, m1.left)).toBeLessThan(70);
        expect(dist(m0.tip, m1.tip)).toBeLessThan(110);
      }
      expect(Math.abs(topAt(q) - topAt(t))).toBeLessThan(0.1);
      // The whip to the clock shot on "Thirty" is the one fast move.
      const whip = wrap(t) > THIRTY_AT - 0.5 && wrap(t) < THIRTY_AT + 0.1 ? 2.2 : 1;
      expect(dist(onScreen(t, MOUTH), onScreen(q, MOUTH))).toBeLessThan(60 * whip);
      expect(dist(onScreen(t, tailTip(spineAt(t))), onScreen(q, tailTip(spineAt(q))))).toBeLessThan(95 * whip);
      // Zooms, even the pull back over the reef, at most an eighth a frame.
      expect(Math.abs(cameraAt(q).zoom / cameraAt(t).zoom - 1)).toBeLessThan(0.125);
      expect(Math.abs(inAt(q) - inAt(t))).toBeLessThan(3);
      expect(Math.abs(gapeAt(q) - gapeAt(t))).toBeLessThan(0.1);
      for (const f of SHOWN) expect(Math.abs(f(q) - f(t))).toBeLessThan(0.35);
      expect(Math.abs(eyeAt(q).lid - eyeAt(t).lid)).toBeLessThan(0.2);
      expect(Math.abs(gradeAt(q).vignette - gradeAt(t).vignette)).toBeLessThan(0.1);
      expect(Math.abs(gradeAt(q).dim - gradeAt(t).dim)).toBeLessThan(0.1);
      expect(dist(shadowAt(q), shadowAt(t))).toBeLessThan(8);
    }
  });

  it('opens low at its face, mid-gulp: the huge mouth gaping across the frame, the bamboo shark curling out of it, nothing written but the words', () => {
    expect(topAt(0)).toBe(0);
    const pose = poseAt(0);
    const m = frontLandmarks(0, pose);
    // The mouth alone is three quarters of the frame wide, in the middle band of the picture.
    expect(m.right.x - m.left.x).toBeGreaterThan(0.72 * 1080);
    expect((m.left.y + m.right.y) / 2).toBeGreaterThan(850);
    expect((m.left.y + m.right.y) / 2).toBeLessThan(1150);
    // The tail comes up out of it towards the top right, still in frame.
    expect(m.tip.y).toBeGreaterThan(300);
    expect(m.tip.y).toBeLessThan(500);
    expect(m.tip.x).toBeGreaterThan(540);
    expect(m.tip.x).toBeLessThan(1060);
    // About half of it in, the jaws open round it.
    expect(inAt(0) / PREY_LEN).toBeGreaterThan(0.45);
    expect(inAt(0) / PREY_LEN).toBeLessThan(0.55);
    expect(gapeAt(0)).toBeGreaterThan(0.4);
    expect(eyeAt(0).lid).toBe(0);
    for (const f of SHOWN) expect(f(0)).toBe(0);
    expect(creditAt(0, LOOP_S)).toBe(0);
  });

  it('rises from the front view to overhead on "Great Barrier Reef", and comes back down on "Because yes,"', () => {
    expect(topAt(SHARK_END)).toBe(0);
    expect(topAt(GREAT_AT + 0.6)).toBe(1);
    expect(frontCamAt(GREAT_AT + 0.4).sink).toBeGreaterThan(500);
    expect(topAt(said('Because'))).toBe(1);
    expect(topAt(said('yes,') + 0.3)).toBe(0);
    expect(topAt(END)).toBe(0);
  });

  it('jolts and flips the tail on "SHARK!"', () => {
    expect(Math.hypot(shakeAt(SHARK_AT + 0.12).x, shakeAt(SHARK_AT + 0.12).y)).toBeGreaterThan(5);
    expect(Math.abs(tailAt(SHARK_AT + 0.1).flip)).toBeGreaterThan(0.3);
    expect(gapeAt(SHARK_AT + 0.1)).toBeGreaterThan(0.95);
    expect(inAt(SHARK_AT + 0.5)).toBeGreaterThan(inAt(0) + 20);
  });

  it('puts each beat on screen as it is said', () => {
    expect(cameraAt(YEAR_AT + 0.1).zoom).toBeLessThan(0.45);
    expect(placeLabel(GREAT_AT + 0.25)).toBe(1);
    expect(yearLabel(YEAR_AT - 0.1)).toBe(0);
    expect(yearLabel(YEAR_AT + 0.25)).toBe(1);
    expect(nameLabel(WOBBEGONG_AT + 0.25)).toBe(1);
    expect(shagAt(SHAGGY_AT + 0.25)).toBe(1);
    expect(rugAt(CARPET_AT + 0.3)).toBe(1);
    expect(rugDrawAt(CARPET_AT + 0.4)).toBe(1);
    expect(rippleAt(CARPET_AT + 0.3).strength).toBe(1);
    expect(sizeLabel(WHOLE_AT + 0.25)).toBe(1);
    expect(highlightAt(BAMBOO_AT)).toBe(1);
    expect(xrayAt(BAMBOO_AT + 0.4)).toBeGreaterThan(0.5);
    expect(xrayAt(DOWN_AT + 0.1)).toBe(1);
    expect(arrowAt(HEAD_AT - 0.1)).toBe(0);
    expect(arrowAt(HEAD_AT + 0.35)).toBe(1);
    expect(clockAt(THIRTY_AT + 0.15)).toBe(1);
    expect(Math.abs(minutesAt(LATER_AT + 0.2) - 30)).toBeLessThan(1);
    expect(barAt(HALFWAY_AT)).toBe(1);
    expect(fillAt(HALFWAY_END)).toBeCloseTo(0.5, 6);
    expect(diversAt(SCIENTISTS_AT + 0.4)).toBe(1);
    expect(sunAt(HOURS_AT).shown).toBe(1);
    expect(sunAt(HOURS_AT).arc).toBeGreaterThan(0.4);
    expect(sunAt(HOURS_AT).arc).toBeLessThan(0.95);
    expect(cameraAt(RUSH_AT + 0.2).zoom).toBeGreaterThan(1.8);
    expect(eyeAt(RUSH_AT + 0.3).lid).toBeGreaterThan(0.6);
    expect(sighAt(NO_AT + 0.3)).toBeGreaterThan(0);
    // The bamboo shark slips back a little on "No rush", and is gulped back in frame 1.
    expect(inAt(said('Because') + 0.25)).toBeLessThan(inAt(NO_AT) - 30);
  });

  it('keeps the bamboo shark whole: a 1 m spine, its swallowed half straight down the throat, the rest in front of the jaw', () => {
    for (const t of [0, SHARK_AT + 0.1, 9, HALFWAY_AT + 0.25, 16.5]) {
      const spine = spineAt(t);
      const inside = inAt(t);
      let len = 0;
      for (let i = 1; i < spine.length; i++) len += dist(spine[i - 1]!, spine[i]!);
      expect(len).toBeGreaterThan(PREY_LEN - 25);
      expect(len).toBeLessThan(PREY_LEN + 5);
      for (const q of spine.filter((p) => p.s < inside)) expect(q.x).toBeCloseTo(0, 6);
      // Out of the mouth it heads away from the head (up the screen), never back into it.
      for (const q of spine.filter((p) => p.s > inside + 30)) expect(q.y).toBeLessThan(frontAt(q.x));
    }
    expect(BODY.length).toBeGreaterThan(20);
  });

  it('finishes the voice just before the loop point, so the next loop finishes its sentence', () => {
    const last = WORDS[WORDS.length - 1]!;
    expect(last.text).toBe('yes,');
    const tail = LOOP_S - last.end / TEMPO;
    expect(tail).toBeGreaterThan(0.2);
    expect(tail).toBeLessThan(0.5);
  });

  it('captions every spoken word in short lines, the spoken word highlighted', () => {
    expect(LINES.flatMap((l) => l.words)).toEqual(WORDS);
    for (const l of LINES) {
      expect(l.words.length).toBeLessThanOrEqual(4);
      if (l.words.length > 1) expect(l.words.map((w) => w.text).join(' ').length).toBeLessThanOrEqual(18);
    }
    for (const w of WORDS) {
      const now = captionAt(w.start / TEMPO + 0.01)!;
      expect(now.line.words[now.word]).toBe(w);
    }
    expect(captionAt(0)!.line).toBe(LINES[0]);
    expect(captionAt(END)!.line).toBe(LINES[LINES.length - 1]);
  });

  it('keeps every line of text between y 270 and 1240', () => {
    const inside = (y: number, size: number): void => {
      expect(y - 0.8 * size).toBeGreaterThanOrEqual(270);
      expect(y + 0.3 * size).toBeLessThanOrEqual(1240);
    };
    for (const k of ['caption', 'place', 'year', 'name', 'feet', 'metres', 'plus', 'pct'] as const) inside(TEXT[k].y, TEXT[k].size);
    // The clock and the bar, popping up to 1.2 times their size, stay inside too.
    expect(TEXT.clock.y - (TEXT.clock.r + 14) * 1.2).toBeGreaterThanOrEqual(270);
    expect(TEXT.bar.y + (TEXT.bar.h / 2) * 1.2).toBeLessThanOrEqual(1240);
  });

  it('lasts a whole number of video frames and line-boil cycles, with every sound inside the loop', () => {
    expect(Math.abs(Math.round(LOOP_S * 30) - LOOP_S * 30)).toBeLessThan(1e-6);
    expect((LOOP_S * BOIL_FPS) % BOIL_FRAMES).toBe(0);
    expect(boilAt(0)).toBe(0);
    expect(boilAt(END) % BOIL_FRAMES).toBe(BOIL_FRAMES - 1);
    expect(wrap(LOOP_S)).toBe(0);
    for (const s of SOUNDS) {
      expect(s.t).toBeGreaterThanOrEqual(0);
      expect(s.t).toBeLessThan(LOOP_S);
    }
  });
});
