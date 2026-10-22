import { describe, expect, it } from 'vitest';
import { creditAt } from '../dev/promo/credit';
import { captionAt, LINES, placeLabel, SOUNDS } from '../dev/promo/kayak/script';
import {
  adrianAt, alarmAt, balloonAt, blackoutAt, BONKS, bonkAt, boilAt, BOIL_STEPS, BURST_S, CAM0, cameraAt, CHILE_AT, cutawayAt, DAD_AT, dadAt, DARK_AT, FILMED_AT,
  gapeAt, GOOD_AT, gradeAt, insideAt, inMouth, KAYAKER_AT, LAND, LAND_AT, LOOP_S, NARROW_AT, OPENING, OPENING_RATE, PERSON_AT, phoneFillAt, phoneRectAt, phoneUpAt,
  recAt, replayAt, replayRate, REWIND, rewindAt, ringAt, SECONDS_AT, SHUT_S, slideAt, SO_YES_AT, SPAT_AT, stopwatchAt, storyAt, storyRate, THEN_AT, THROAT_AT,
  toScreen, whaleAt, whaleEyeAt, wrap,
} from '../dev/promo/kayak/story';
import { TEMPO, WORDS } from '../dev/promo/kayak/words';
import { BOIL_FPS, BOIL_FRAMES } from '../src/art/textures';

const END = LOOP_S - 1e-7;
const FRAME = 1 / 30;
/** Every frame of the loop, and one across the loop point. */
const FRAMES = Array.from({ length: Math.round(LOOP_S * 30) + 1 }, (_, i) => i * FRAME - FRAME);
const dist = (p: { x: number; y: number }, q: { x: number; y: number }): number => Math.hypot(q.x - p.x, q.y - p.y);

describe('promo short: this whale swallowed a kayaker (narrated)', () => {
  it('loops through Dad\'s phone: its screen fills the frame and shows frame 1 at the loop point', () => {
    expect(storyAt(0)).toBe(OPENING);
    expect(storyRate(0)).toBeCloseTo(OPENING_RATE, 6);
    // The replay on the phone arrives at frame 1's moment, at its pace.
    expect(replayAt(END)).toBeCloseTo(OPENING, 4);
    expect(replayRate(END)).toBeCloseTo(OPENING_RATE, 3);
    expect(phoneFillAt(END)).toBeCloseTo(1, 3);
    const screen = phoneRectAt(END, { x: 0, y: 0 });
    for (const [k, v] of [['x', 0], ['y', 0], ['w', 1080], ['h', 1920]] as const) expect(screen[k]).toBeCloseTo(v, 0);
    expect(recAt(END)).toBe(0);
    // The world on the phone (frame 1's camera) is the world at the start.
    const [a, b] = [whaleAt(replayAt(END), END), whaleAt(storyAt(0), 0)];
    for (const key of ['x', 'y', 'tilt', 'gape', 'balloon'] as const) expect(a[key]).toBeCloseTo(b[key], 2);
    const [p, q] = [adrianAt(replayAt(END), END)!, adrianAt(storyAt(0), 0)!];
    expect(dist(p, q)).toBeLessThan(1);
    expect(p.tilt).toBeCloseTo(q.tilt, 2);
    for (const key of ['x', 'y', 'zoom'] as const) expect(cameraAt(0)[key]).toBeCloseTo(CAM0[key], 6);
    const g = gradeAt(0);
    expect(g.cold + g.warm + g.rosy + g.sly).toBe(0);
  });

  it('never jumps: the story, the camera, the whale and Adrián move on smoothly, frame to frame and across the loop point', () => {
    for (const t of FRAMES) {
      const [s0, s1] = [storyAt(t), storyAt(t + FRAME)];
      const rewinding = rewindAt(t) > 0 || rewindAt(t + FRAME) > 0;
      const across = wrap(t + FRAME) < wrap(t);
      // Across the seam the main picture is under the phone's screen: the screen carries on (above).
      if (across) continue;
      expect(Math.abs(s1 - s0)).toBeLessThan(rewinding ? 0.5 : 0.1);
      const [v0, v1] = [cameraAt(t), cameraAt(t + FRAME)];
      expect(Math.abs(Math.log(v1.zoom / v0.zoom))).toBeLessThan(0.06);
      // The whip pan from Adrián to Dad is the quickest move.
      expect(dist(v0, v1) * v0.zoom).toBeLessThan(80);
      if (insideAt(t) || rewinding) continue;
      expect(dist(whaleAt(s0, t), whaleAt(s1, t + FRAME)) * v0.zoom).toBeLessThan(80);
      expect(Math.abs(gapeAt(s1) - gapeAt(s0))).toBeLessThan(0.25);
      const [a, b] = [adrianAt(s0, t), adrianAt(s1, t + FRAME)];
      // Thrown out of the mouth, he flies fastest.
      const thrown = s0 > SPAT_AT && s0 < LAND_AT ? 1.3 : 1;
      if (a && b) expect(dist(a, b) * v0.zoom).toBeLessThan(90 * thrown);
    }
    for (const t of FRAMES.filter((x) => x > FILMED_AT && x < END - FRAME)) {
      expect(Math.abs(replayAt(t + FRAME) - replayAt(t))).toBeLessThan(0.06);
      expect(phoneRectAt(t + FRAME, { x: 200, y: 900 }).w - phoneRectAt(t, { x: 200, y: 900 }).w).toBeLessThan(80);
    }
  });

  it('opens on the gulp alone: the jaws half shut round the kayak, the throat ballooned, nothing written but the words', () => {
    const s = storyAt(0);
    expect(gapeAt(s)).toBeGreaterThan(0.3);
    expect(gapeAt(s)).toBeLessThan(0.7);
    expect(balloonAt(s)).toBeGreaterThan(0.9);
    expect(whaleEyeAt(s)).toBe('wide');
    // Adrián sits in the mouth, near the middle of the frame, his head above the waterline.
    const w = whaleAt(s, 0);
    const kayak = adrianAt(s, 0)!;
    expect(dist(kayak, inMouth(w).at)).toBeLessThan(1);
    const on = toScreen(CAM0, kayak);
    expect(on.x).toBeGreaterThan(300);
    expect(on.x).toBeLessThan(800);
    expect(on.y).toBeGreaterThan(400);
    expect(on.y).toBeLessThan(1000);
    // The surface low in the frame, the whale's head big.
    expect(toScreen(CAM0, { x: 0, y: 0 }).y).toBeGreaterThan(1150);
    expect(CAM0.zoom).toBeGreaterThan(1.3);
    for (const f of [placeLabel, rewindAt, phoneUpAt, blackoutAt]) expect(f(0)).toBe(0);
    for (const f of [alarmAt, cutawayAt, stopwatchAt]) expect(f(s)).toBe(0);
    expect(creditAt(0, LOOP_S)).toBe(0);
  });

  it('shuts the jaws over him on "KAYAKER!", then rewinds to the calm strait', () => {
    const shutAt = [...Array(60).keys()].map((i) => i * 0.05).find((t) => gapeAt(storyAt(t)) < 0.02)!;
    expect(shutAt).toBeGreaterThan(KAYAKER_AT);
    expect(shutAt).toBeLessThan(KAYAKER_AT + 0.5);
    expect(rewindAt((REWIND.from + REWIND.to) / 2)).toBe(1);
    expect(storyRate((REWIND.from + REWIND.to) / 2)).toBeLessThan(-1);
    for (const t of [3, 5, 8, 12, 16]) expect(storyAt(t)).toBeCloseTo(t, 6);
  });

  it('paddles in Chile next to Dad, a shape rising below him, then the whale bursts up on "then" and it goes dark on "DARK"', () => {
    expect(placeLabel(CHILE_AT + 0.3)).toBe(1);
    expect(gradeAt(CHILE_AT + 0.3).cold).toBe(1);
    const v = cameraAt(DAD_AT);
    for (const p of [adrianAt(DAD_AT, DAD_AT)!, dadAt(DAD_AT, DAD_AT)]) {
      const q = toScreen(v, p);
      expect(q.x).toBeGreaterThan(0);
      expect(q.x).toBeLessThan(1080);
    }
    expect(dadAt(DAD_AT, DAD_AT).arms).toBe('phone');
    const below = whaleAt(DAD_AT, DAD_AT);
    expect(below.y).toBeGreaterThan(300);
    expect(toScreen(v, below).y).toBeLessThan(1920);
    expect(alarmAt(DAD_AT + 0.5)).toBeGreaterThan(0.9);
    expect(Math.abs(BURST_S - THEN_AT)).toBeLessThan(0.3);
    expect(adrianAt(6.2, 6.2)!.face).toBe('shock');
    expect(SHUT_S).toBeLessThan(DARK_AT);
    expect(blackoutAt(DARK_AT + 0.05)).toBeGreaterThan(0.5);
    expect(insideAt(DARK_AT + 0.5)).toBe(true);
    expect(insideAt(GOOD_AT + 0.05)).toBe(false);
  });

  it('rings the narrow throat on "throat", bonks the kayak on it twice on "too narrow for a person", then he shrugs', () => {
    expect(cutawayAt(GOOD_AT + 0.2)).toBe(1);
    expect(gradeAt(GOOD_AT + 0.3).rosy).toBe(1);
    expect(ringAt(THROAT_AT + 0.4)).toBe(1);
    expect(ringAt(THROAT_AT - 0.2)).toBe(0);
    expect(BONKS[0]).toBeGreaterThan(NARROW_AT - 0.1);
    expect(BONKS[1]).toBeLessThan(PERSON_AT);
    for (const b of BONKS) {
      expect(slideAt(b)).toBeCloseTo(1, 2);
      expect(bonkAt(b + 0.02)).toBeGreaterThan(0.8);
    }
    expect(whaleEyeAt(NARROW_AT)).toBe('squint');
  });

  it('ticks a stopwatch on "seconds later", spits him out on "spat", and lands him coughing then grinning', () => {
    expect(stopwatchAt(SECONDS_AT + 0.3)).toBe(1);
    expect(adrianAt(SPAT_AT - 0.1, SPAT_AT - 0.1)).toBeNull();
    expect(gapeAt(SPAT_AT + 0.3)).toBeGreaterThan(0.5);
    const flying = adrianAt(SPAT_AT + 0.4, SPAT_AT + 0.4)!;
    expect(flying.y).toBeLessThan(-100);
    const landed = adrianAt(LAND_AT + 0.1, LAND_AT + 0.1)!;
    expect(Math.abs(landed.x - LAND.x)).toBeLessThan(1);
    expect(landed.face).toBe('cough');
    expect(adrianAt(LAND_AT + 0.8, LAND_AT + 0.8)!.face).toBe('grin');
    expect(gradeAt(LAND_AT).warm).toBe(1);
  });

  it('shows Dad\'s phone recording on "filmed" and zooms into its screen on "So yes,"', () => {
    expect(dadAt(16, 16).face).toBe('smirk');
    expect(phoneUpAt(FILMED_AT - 0.2)).toBe(0);
    expect(phoneUpAt(FILMED_AT + 0.35)).toBe(1);
    expect(recAt(FILMED_AT + 0.5)).toBe(1);
    expect(phoneFillAt(SO_YES_AT - 0.05)).toBe(0);
    expect(gradeAt(16).sly).toBe(1);
  });

  it('finishes the voice just before the loop point, so the next loop finishes its sentence', () => {
    const last = WORDS[WORDS.length - 1]!;
    expect(last.text).toBe('yes,');
    const gap = LOOP_S - last.end / TEMPO + WORDS[0]!.start / TEMPO;
    expect(gap).toBeGreaterThan(0.2);
    expect(gap).toBeLessThan(0.5);
  });

  it('captions every spoken word, in short lines, the right line at each moment', () => {
    expect(LINES.flatMap((l) => l.words)).toEqual(WORDS);
    for (const l of LINES) expect(l.words.length).toBeLessThanOrEqual(4);
    for (const w of WORDS) {
      const now = captionAt(w.start / TEMPO + 0.01)!;
      expect(now.line.words[now.word]).toBe(w);
    }
    expect(captionAt(0)!.line).toBe(LINES[0]);
    expect(captionAt(END)!.line).toBe(LINES[LINES.length - 1]);
  });

  it('shows the credit around the payoff, never in the hook or at the seam', () => {
    expect(creditAt(GOOD_AT, LOOP_S)).toBeGreaterThan(0);
    expect(creditAt(END, LOOP_S)).toBe(0);
    expect(creditAt(3, LOOP_S)).toBe(0);
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
