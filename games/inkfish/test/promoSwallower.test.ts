import { describe, expect, it } from 'vitest';
import { MACKEREL_LEN, mackerelAt, sacAt, SWALLOWER_LEN, lipsAt, MACK_H } from '../dev/promo/swallower/swallow';
import {
  BLACK_AT, boilAt, BOIL_STEPS, cameraAt, captionAt, CAYMAN_AT, cmAt, coilTrace, compareAt, COILED_AT, DIVE_AT, DOWN_AT, EIGHTY_AT, eyeRing, EYES_AT, FLOAT,
  foldAt, FOLD_END, FOUR_AT, GULP_AT, IN_AT, INSIDE_AT, jawAt, LENGTH_AT, lightAt, LINES, LOOP_S, mealAt, metresAt, nameAt, NOPE_AT, placeAt, popAt, POPS,
  readoutAt, replayAt, said, shakeAt, SOUNDS, SEVEN_AT, stomachRing, STOMACH_AT, SURF, swallowerAt, TOO_AT, TWO_AT, xrayAt, yearAt,
} from '../dev/promo/swallower/story';
import { TEMPO, WORDS } from '../dev/promo/swallower/words';
import { BOIL_FPS, BOIL_FRAMES } from '../src/art/textures';

const END = LOOP_S - 1e-7;
const FRAME = 1 / 30;
/** Every frame of the loop, and one across the loop point. */
const FRAMES = Array.from({ length: Math.round(LOOP_S * 30) + 1 }, (_, i) => i * FRAME - FRAME);
const dist = (p: { x: number; y: number }, q: { x: number; y: number }): number => Math.hypot(q.x - p.x, q.y - p.y);

/** What's on screen at the deep end of the loop: the swallow, from the swallower (t) or its replay (t - LOOP_S). */
const swallowOf = (t: number): ReturnType<typeof swallowerAt> => {
  const r = replayAt(t);
  return r ?? swallowerAt(t);
};

describe('promo short: this fish swallowed a fish four times its length (narrated)', () => {
  it('loops: the swallow, the camera and every note are where they started', () => {
    const [a, b] = [swallowOf(END), swallowOf(0)];
    for (const key of ['x', 'y', 'tilt', 'roll', 'wag'] as const) expect(a[key]).toBeCloseTo(b[key], 3);
    expect(Math.cos(a.beat - b.beat)).toBeCloseTo(1, 3);
    const [m, n] = [mealAt(0, END - LOOP_S), mealAt(0, 0)];
    for (const key of ['fold', 'jaw', 'fill'] as const) expect(m[key]).toBeCloseTo(n[key], 3);
    for (const key of ['x', 'y', 'zoom', 'vy'] as const) expect(cameraAt(END)[key]).toBeCloseTo(cameraAt(0)[key], 3);
    for (const f of [compareAt, nameAt, readoutAt, yearAt, placeAt, xrayAt, cmAt]) expect(f(END)).toBeCloseTo(f(0), 4);
    for (const f of [coilTrace, eyeRing, stomachRing]) expect(f(END).alpha * f(END).drawn).toBeCloseTo(f(0).alpha * f(0).drawn, 4);
    expect(shakeAt(END)).toEqual(shakeAt(0));
    // The mackerel is where it was, sample for sample.
    const [s0, s1] = [mackerelAt(mealAt(0, 0)).spine, mackerelAt(mealAt(0, END - LOOP_S)).spine];
    s0.forEach((p, i) => expect(dist(p, s1[i]!)).toBeLessThan(0.5));
  });

  it('never jumps: the camera, the swallower and the mackerel move on smoothly, frame to frame and across the loop point', () => {
    for (const t of FRAMES) {
      const [c, d] = [cameraAt(t), cameraAt(t + FRAME)];
      expect(Math.abs(d.zoom - c.zoom)).toBeLessThan(0.05);
      // The dive back down is the fastest thing in it.
      expect(Math.hypot(d.x - c.x, d.y - c.y)).toBeLessThan(150);
      const [p, q] = [swallowOf(t), swallowOf(t + FRAME)];
      // Only where the replay takes over (far off screen above it, the floater) may the deep one appear.
      if (Math.abs(((t % LOOP_S) + LOOP_S) % LOOP_S - DIVE_AT) > FRAME * 1.5) expect(dist(p, q)).toBeLessThan(100);
    }
    // The swallow's mackerel, frame to frame through the swallow (and its replay).
    for (let u = -1.4; u < GULP_AT + 0.3; u += FRAME) {
      const [a, b] = [mackerelAt(mealAt(0, u)).spine, mackerelAt(mealAt(0, u + FRAME)).spine];
      const most = Math.max(...a.map((p, i) => dist(p, b[i]!)));
      expect(most).toBeLessThan(110);
    }
  });

  it('opens mid-swallow: jaws wide round a mackerel 4.3 times its length, folded in half, both ends still out', () => {
    expect(MACKEREL_LEN / SWALLOWER_LEN).toBeCloseTo(4.3, 5);
    const meal = mealAt(0, 0);
    expect(meal.jaw).toBeGreaterThan(0.9);
    expect(meal.fold).toBeGreaterThan(0.3);
    expect(meal.fold).toBeLessThan(0.5);
    const { spine } = mackerelAt(meal);
    // Its head and its tail are out in front of the mouth; its middle is in the stomach.
    const gate = lipsAt(meal.jaw).gate;
    expect(spine[0]!.depth).toBeLessThan(-100);
    expect(spine[spine.length - 1]!.depth).toBeLessThan(-100);
    expect(spine[0]!.x).toBeGreaterThan(gate.x + 50);
    expect(spine[spine.length - 1]!.x).toBeGreaterThan(gate.x + 50);
    const mid = spine[Math.round(spine.length / 2)]!;
    const sac = sacAt(meal.fill);
    expect(Math.hypot(mid.x - sac.cx, mid.y - sac.cy)).toBeLessThan(sac.r);
    // The opening is stretched round both halves: taller than two mackerels squeezed, many times the head.
    expect(lipsAt(meal.jaw).height).toBeGreaterThan(3 * MACK_H);
    // Nothing on screen but the fish: no notes in frame 1.
    for (const f of [compareAt, nameAt, readoutAt, yearAt, placeAt, cmAt]) expect(f(0)).toBe(0);
    for (const f of [coilTrace, eyeRing, stomachRing]) expect(f(0).alpha).toBe(0);
  });

  it('pops a swallower a word on "FOUR times its length", and swallows the lot by the gulp', () => {
    expect(compareAt(FOUR_AT - 0.15)).toBe(0);
    expect(compareAt(LENGTH_AT)).toBe(1);
    POPS.forEach((at, i) => {
      expect(popAt(at - 0.01, i)).toBe(0);
      expect(popAt(at + 0.3, i)).toBe(1);
    });
    expect(foldAt(FOUR_AT - 0.01)).toBeLessThan(0.6);
    expect(foldAt(GULP_AT)).toBe(FOLD_END);
    const { spine } = mackerelAt(mealAt(GULP_AT, GULP_AT));
    for (const p of spine) expect(p.depth).toBeGreaterThan(0);
    // The jaws shut on it, and the stomach is round the whole meal.
    expect(jawAt(GULP_AT + 0.4, GULP_AT + 0.4)).toBeLessThan(0.15);
    expect(sacAt(mealAt(GULP_AT + 1, GULP_AT + 1).fill).r).toBeGreaterThan(0.45 * SWALLOWER_LEN);
  });

  it('names it, and sinks to 2,000 m on "from two kilometres down"', () => {
    expect(nameAt(BLACK_AT + 0.3)).toBe(1);
    expect(readoutAt(DOWN_AT)).toBe(1);
    expect(metresAt(DOWN_AT + 0.3)).toBe(2000);
    expect(swallowerAt(DOWN_AT + 0.4).y).toBeGreaterThan(swallowerAt(BLACK_AT).y + 300);
    expect(lightAt(cameraAt(DOWN_AT))).toBe(0);
  });

  it('rolls belly up and floats to the surface by the island on "floated up off the Cayman Islands"', () => {
    expect(yearAt(TWO_AT + 0.3)).toBe(1);
    expect(swallowerAt(IN_AT - 0.2).roll).toBe(0);
    expect(swallowerAt(SEVEN_AT + 0.2).roll).toBe(1);
    const top = swallowerAt(CAYMAN_AT + 0.5);
    expect(top.y).toBeCloseTo(FLOAT.y, -1);
    expect(top.y).toBeGreaterThan(SURF);
    expect(placeAt(CAYMAN_AT + 0.4)).toBe(1);
    expect(lightAt(cameraAt(CAYMAN_AT + 0.5))).toBe(1);
  });

  it('x-rays the stomach on "eighty-six centimetre fish coiled inside", traces the coil, then lets it float in peace', () => {
    expect(xrayAt(EIGHTY_AT + 0.2)).toBe(1);
    expect(cmAt(EIGHTY_AT + 0.3)).toBe(1);
    expect(coilTrace(COILED_AT - 0.15).drawn).toBe(0);
    expect(coilTrace(INSIDE_AT + 0.2).drawn).toBe(1);
    expect(cameraAt(INSIDE_AT).zoom).toBeGreaterThan(1.4);
    expect(xrayAt(TOO_AT + 0.4)).toBe(0);
    expect(cameraAt(TOO_AT + 0.6).zoom).toBeLessThan(1);
  });

  it('rings its eye on "Eyes" and its stomach on "stomach?", gone on "Nope.", then dives back down to the swallow', () => {
    expect(eyeRing(EYES_AT + 0.35).drawn).toBe(1);
    expect(stomachRing(STOMACH_AT - 0.1).drawn).toBe(0);
    expect(stomachRing(STOMACH_AT + 0.45).drawn).toBe(1);
    expect(eyeRing(NOPE_AT + 0.4).alpha).toBe(0);
    expect(replayAt(DIVE_AT - 0.01)).toBeNull();
    expect(replayAt(DIVE_AT + 0.01)).not.toBeNull();
    expect(lightAt(cameraAt(LOOP_S - 0.2))).toBe(0);
  });

  it('finishes the voice just before the loop point, so the next loop finishes its sentence', () => {
    const last = WORDS[WORDS.length - 1]!;
    expect(last.text).toBe('Because');
    const gap = LOOP_S - last.end / TEMPO + WORDS[0]!.start / TEMPO;
    expect(gap).toBeGreaterThan(0.2);
    expect(gap).toBeLessThan(0.5);
    expect(said('Nope.')).toBe(NOPE_AT);
  });

  it('captions every spoken word, in short lines, the right line at each moment', () => {
    expect(LINES.flatMap((l) => l.words)).toEqual(WORDS);
    for (const l of LINES) expect(l.words.length).toBeLessThanOrEqual(4);
    for (const w of WORDS) {
      const now = captionAt(w.start / TEMPO + 0.01)!;
      expect(now.line.words[now.word]).toBe(w);
    }
    expect(captionAt(END)!.line).toBe(LINES[LINES.length - 1]);
    expect(captionAt(0)!.line).toBe(LINES[0]);
  });

  it('lasts a whole number of video frames and line-boil cycles, with every sound inside the loop', () => {
    expect(Math.abs(Math.round(LOOP_S * 30) - LOOP_S * 30)).toBeLessThan(1e-6);
    expect(BOIL_STEPS % BOIL_FRAMES).toBe(0);
    expect(BOIL_STEPS / LOOP_S).toBe(BOIL_FPS);
    expect(boilAt(0)).toBe(0);
    expect(boilAt(END) % BOIL_FRAMES).toBe(BOIL_FRAMES - 1);
    for (const s of SOUNDS) {
      expect(s.t).toBeGreaterThanOrEqual(0);
      expect(s.t).toBeLessThan(LOOP_S);
    }
  });
});
