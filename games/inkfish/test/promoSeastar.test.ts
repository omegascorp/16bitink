import { describe, expect, it } from 'vitest';
import { gapeMiddle } from '../dev/promo/seastar/mussel';
import { musselsAt, starAt, stomachReach, underStar } from '../dev/promo/seastar/scene';
import { captionAt, LINES, SOUNDS, TEXT } from '../dev/promo/seastar/script';
import {
  BODY_END, boilAt, camAt, CRACK, curlAt, DINNER_AT, gapAt, glowAt, gradeAt, heaveAt, IN_END, INTO_AT, LIKE_AT, liftAt, LOOP_S, meatAt, MOUTH_AT, MUSSEL_AT,
  MUSSEL_SPACING, OPEN_AT, OUTSIDE_AT, panAt, PAPER_AT, paperAt, PARKING_AT, PUSHES_AT, REWIND, rewindAt, SHELL_AT, SLURPS_AT, sparkleAt, squashAt, STARFISH_AT,
  STOMACH3_AT, stomachAt, strainAt, TAKEOUT_AT, takeoutAt, THEN_AT, throbAt, TUGS_AT, wiggleAt, wrap, YES_AT,
} from '../dev/promo/seastar/story';
import { TEMPO, WORDS } from '../dev/promo/seastar/words';
import { creditAt } from '../dev/promo/credit';
import { BOIL_FPS, BOIL_FRAMES } from '../src/art/textures';

const END = LOOP_S - 1e-7;
const FRAME = 1 / 30;
/** Every frame of the loop, and one across the loop point. */
const FRAMES = Array.from({ length: Math.round(LOOP_S * 30) + 1 }, (_, i) => i * FRAME - FRAME);
/**
 * Every value a frame draws from that runs on the clock. (meatAt is the eaten
 * mussel's: after the glide a full one has taken its place; see the next test.)
 */
const CLOCKED = [stomachAt, throbAt, gapAt, heaveAt, strainAt, glowAt, takeoutAt, sparkleAt, rewindAt, liftAt, squashAt, curlAt, wiggleAt] as const;
const near = (a: number, b: number, eps = 1e-4): boolean => Math.abs(a - b) < eps;

describe('promo short: a sea star eats with its stomach outside its body (narrated)', () => {
  it('loops: every clocked value, the camera, the grade and the star are where they started', () => {
    for (const f of CLOCKED) expect(f(END)).toBeCloseTo(f(0), 4);
    // The rock slides on by exactly one mussel: the next one is where the eaten one was.
    expect(panAt(0)).toBe(0);
    expect(panAt(END)).toBeCloseTo(MUSSEL_SPACING, 4);
    const [a, b] = [camAt(END), camAt(0)];
    expect(a.zoom).toBeCloseTo(b.zoom, 4);
    expect(a.focus.x).toBeCloseTo(b.focus.x, 3);
    expect(a.focus.y).toBeCloseTo(b.focus.y, 3);
    expect(a.at).toEqual(b.at);
    expect(gradeAt(END)).toEqual(gradeAt(0));
    const [p1, p0] = [starAt(END), starAt(0)];
    for (const k of ['x', 'hump', 'curl', 'wiggle', 'strain', 'lift'] as const) expect(p1[k]).toBeCloseTo(p0[k], 4);
    expect(paperAt(END)).toEqual(paperAt(0));
    expect(creditAt(END, LOOP_S)).toBe(creditAt(0, LOOP_S));
  });

  it('the mussel under the star at the end is frame 1\'s: as wide open, as full, the stomach in it', () => {
    const [m0, m1] = [underStar(0), underStar(END)];
    expect(m1.x).toBeCloseTo(m0.x, 3);
    expect(m1.gape).toBeCloseTo(m0.gape, 4);
    expect(m1.meat).toBeCloseTo(m0.meat, 4);
    // Every mussel on screen matches one at the same place in frame 1.
    for (const m of musselsAt(END)) {
      const twin = musselsAt(0).find((n) => near(n.x, m.x, 1e-3));
      if (twin) expect([twin.gape, twin.meat]).toEqual([m.gape, m.meat].map((v) => expect.closeTo(v, 4)));
    }
    const [s0, s1] = [stomachReach(0), stomachReach(END)];
    expect(s1.extent).toBeCloseTo(s0.extent, 4);
    expect(s1.floor.x).toBeCloseTo(s0.floor.x, 3);
    expect(s1.floor.y).toBeCloseTo(s0.floor.y, 3);
  });

  it('never jumps: values and the camera move on smoothly, frame to frame and across the loop point', () => {
    for (const t of FRAMES) {
      const q = t + FRAME;
      // The rewind, the slurp and the push into the next mussel are quick on purpose.
      const quick = [REWIND.from - 0.1, SLURPS_AT - 0.1, YES_AT - 0.15].some((s) => wrap(t) > s && wrap(t) < s + 0.75) ? 2 : 1;
      expect(Math.abs(stomachAt(q) - stomachAt(t))).toBeLessThan(0.12 * quick);
      expect(Math.abs(gapAt(q) - gapAt(t))).toBeLessThan(0.12 * quick);
      for (const f of [glowAt, takeoutAt, sparkleAt, rewindAt, liftAt, strainAt, curlAt]) expect(Math.abs(f(q) - f(t))).toBeLessThan(0.3);
      if (t >= 0 && q < LOOP_S) expect(Math.abs(meatAt(q) - meatAt(t))).toBeLessThan(0.3);
      const [a, b] = [camAt(t), camAt(q)];
      expect(Math.abs(a.zoom - b.zoom)).toBeLessThan(0.12);
      expect(Math.hypot(a.focus.x - b.focus.x, a.focus.y - b.focus.y) * a.zoom).toBeLessThan(60);
      // The glide is a quick slide, but no teleport (and wraps by exactly one mussel at the seam).
      const dp = (((panAt(q) - panAt(t)) % MUSSEL_SPACING) + MUSSEL_SPACING) % MUSSEL_SPACING;
      expect(Math.min(dp, MUSSEL_SPACING - dp)).toBeLessThan(100);
    }
  });

  it('opens on the star humped over a gaping mussel, its stomach out in the shell, big in the frame, nothing written but the words', () => {
    expect(stomachAt(0)).toBe(1);
    expect(gapAt(0)).toBe(1);
    expect(meatAt(0)).toBe(1);
    const cam = camAt(0);
    // The star's arm span (about 760 scene px) fills well over 65% of the width.
    expect(760 * cam.zoom).toBeGreaterThan(0.65 * 1080);
    // The gape (where the stomach goes in) sits in the middle of the frame.
    const g = gapeMiddle(underStar(0).x, 1);
    const y = cam.at.y + (g.y - cam.focus.y) * cam.zoom;
    expect(y).toBeGreaterThan(350);
    expect(y).toBeLessThan(1250);
    for (const f of [takeoutAt, rewindAt, sparkleAt, glowAt]) expect(f(0)).toBe(0);
    expect(paperAt(0).alpha).toBe(0);
    expect(creditAt(0, LOOP_S)).toBe(0);
  });

  it('puts each beat on screen as it is said', () => {
    expect(STARFISH_AT).toBeLessThan(1);
    expect(throbAt(OUTSIDE_AT + 0.3)).not.toBe(0);
    expect(rewindAt(BODY_END + 0.25)).toBe(1);
    expect(stomachAt(REWIND.to + 0.05)).toBeCloseTo(0, 3);
    expect(gapAt(TUGS_AT)).toBeCloseTo(0, 3);
    expect(strainAt(MUSSEL_AT)).toBeGreaterThan(0.9);
    expect(gapAt(OPEN_AT + 0.25)).toBeCloseTo(CRACK, 3);
    expect(paperAt(PAPER_AT + 0.05).slide).toBe(1);
    expect(paperAt(PAPER_AT + 0.05).alpha).toBe(1);
    expect(paperAt(THEN_AT + 0.3).alpha).toBe(0);
    expect(stomachAt(PUSHES_AT - 0.1)).toBe(0);
    expect(stomachAt(MOUTH_AT)).toBeGreaterThan(0.3);
    expect(stomachAt(INTO_AT)).toBeGreaterThan(stomachAt(MOUTH_AT));
    expect(stomachAt(SHELL_AT + 0.2)).toBe(1);
    expect(glowAt(DINNER_AT)).toBe(1);
    expect(meatAt(LIKE_AT)).toBeLessThan(0.6);
    expect(takeoutAt(TAKEOUT_AT)).toBe(1);
    expect(takeoutAt(PARKING_AT)).toBe(1);
    expect(stomachAt(STOMACH3_AT + 0.2)).toBeLessThan(0.1);
    expect(meatAt(IN_END)).toBeCloseTo(0, 4);
    expect(sparkleAt(IN_END)).toBe(1);
    expect(panAt(YES_AT)).toBeCloseTo(MUSSEL_SPACING, 3);
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

  it('keeps every line of text between y 270 and 1250', () => {
    const { y, size } = TEXT.caption;
    expect(y - 0.8 * size).toBeGreaterThanOrEqual(270);
    expect(y + 0.3 * size).toBeLessThanOrEqual(1250);
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
