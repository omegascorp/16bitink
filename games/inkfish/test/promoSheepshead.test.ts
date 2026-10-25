import { describe, expect, it } from 'vitest';
import { creditAt } from '../dev/promo/credit';
import { QUIET, QUIET_LIFT, RAMP_S, VOICE_RIDE } from '../dev/promo/sheepshead/audio';
import { CAPTION_SIZE, CAPTION_Y, molarsSpot, placardSpot, sheepsheadSpot, type TextSpot } from '../dev/promo/sheepshead/labels';
import { captionAt, LINES, SOUNDS } from '../dev/promo/sheepshead/script';
import {
  barsAt, BECAUSE_AT, BETTER_TEETH_AT, boilAt, BOIL_STEPS, cameraAt, capAt, CONVICT_AT, CONVICT_FISH_AT, CRAB_BITE, fishAt, flashAt, FOCUS, gradeAt, handAt,
  HUMAN_AT, KISSES_AT, kissAt, lampAt, LOOP_S, mirrorAt, molarsLabel, MOST_AT, mugAt, peopleAt, said, shakeAt, SHEEPSHEAD_AT, sheepsheadLabel, sparkleAt,
  STILL_AT, THEM_AT, toScreen, wrap, type FishPose,
} from '../dev/promo/sheepshead/story';
import { TEMPO, WORDS } from '../dev/promo/sheepshead/words';
import { BOIL_FPS, BOIL_FRAMES } from '../src/art/textures';

const END = LOOP_S - 1e-7;
const FRAME = 1 / 30;
/** Every frame of the loop, and one across the loop point. */
const FRAMES = Array.from({ length: Math.round(LOOP_S * 30) + 1 }, (_, i) => i * FRAME - FRAME);
const dist = (p: { x: number; y: number }, q: { x: number; y: number }): number => Math.hypot(q.x - p.x, q.y - p.y);

/** The pose's numbers that change smoothly (the jaw snaps shut on each bite, so it gets its own limit). */
const SMOOTH_KEYS = ['lips', 'smile', 'pucker', 'lid', 'happy', 'wide', 'lookX', 'lookY', 'brow', 'convict', 'squash', 'scale', 'tilt'] as const satisfies readonly (keyof FishPose)[];
/** Every time-driven 0 .. 1 cue on the picture. */
const CUES = { molarsLabel, sheepsheadLabel, mugAt, capAt, flashAt, barsAt, lampAt, mirrorAt, sparkleAt, peopleAt, kissAt, handAt } as const;

describe('promo short: this fish has HUMAN teeth (narrated)', () => {
  it('loops: the camera, the fish pose and every cue are where they started', () => {
    const [a, b] = [cameraAt(END), cameraAt(0)];
    for (const key of ['x', 'y', 'zoom'] as const) expect(a[key]).toBeCloseTo(b[key], 3);
    const [p, q] = [fishAt(END), fishAt(0)];
    for (const key of ['x', 'y', 'jaw', 'rows', ...SMOOTH_KEYS] as const) expect(p[key]).toBeCloseTo(q[key], 3);
    p.barGlow.forEach((g, i) => expect(g).toBeCloseTo(q.barGlow[i]!, 3));
    for (const f of Object.values(CUES)) expect(f(END)).toBeCloseTo(f(0), 3);
    gradeAt(END).forEach((c, i) => expect(c).toBeCloseTo(gradeAt(0)[i]!, 2));
    expect(shakeAt(END)).toEqual(shakeAt(0));
  });

  it('never jumps: the camera, the fish and every cue move on smoothly, frame to frame and across the loop point', () => {
    for (const t of FRAMES) {
      const [v, w] = [cameraAt(t), cameraAt(t + FRAME)];
      expect(Math.abs(Math.log(w.zoom / v.zoom))).toBeLessThan(0.12);
      expect(dist(v, w) * v.zoom).toBeLessThan(120);
      const [p, q] = [fishAt(t), fishAt(t + FRAME)];
      expect(dist(toScreen(v, p), toScreen(w, q))).toBeLessThan(140);
      for (const key of SMOOTH_KEYS) expect(Math.abs(q[key] - p[key]), `${key} at ${t.toFixed(3)}`).toBeLessThan(0.3);
      // The jaw snaps shut on each bite in a couple of frames, and the molar rows pop in.
      expect(Math.abs(q.jaw - p.jaw)).toBeLessThan(0.6);
      expect(Math.abs(q.rows - p.rows)).toBeLessThan(0.8);
      q.barGlow.forEach((g, i) => expect(Math.abs(g - p.barGlow[i]!)).toBeLessThan(0.4));
      for (const [name, f] of Object.entries(CUES)) {
        // The flash and the bars' slam are meant to hit at once.
        const limit = name === 'flashAt' || name === 'barsAt' ? 1 : 0.4;
        expect(Math.abs(f(t + FRAME) - f(t)), `${name} at ${t.toFixed(3)}`).toBeLessThan(limit);
      }
    }
  });

  it('opens on the big grinning face, teeth bare, with nothing written but the words', () => {
    const v = cameraAt(0);
    const p = fishAt(0);
    expect(v.zoom).toBeGreaterThan(1.4);
    expect(p.lips).toBeGreaterThan(0.7);
    expect(p.smile).toBeGreaterThan(0.4);
    expect(p.jaw).toBe(0);
    expect(p.pucker).toBe(0);
    expect(p.convict).toBe(0);
    const mouth = toScreen(v, p);
    expect(mouth.x).toBeGreaterThan(200);
    expect(mouth.x).toBeLessThan(FOCUS.x);
    expect(mouth.y).toBeGreaterThan(600);
    expect(mouth.y).toBeLessThan(1000);
    for (const f of Object.values(CUES)) expect(f(0)).toBe(0);
    expect(creditAt(0, LOOP_S)).toBe(0);
  });

  it('times every beat to its words', () => {
    // The grin widens on "HUMAN".
    expect(fishAt(HUMAN_AT + 0.15).lips).toBeGreaterThan(fishAt(HUMAN_AT - 0.2).lips + 0.15);
    // All five molar rows are out by "them!".
    expect(fishAt(THEM_AT + 0.2).rows).toBeCloseTo(5, 3);
    expect(fishAt(THEM_AT + 0.2).jaw).toBeGreaterThan(0.9);
    expect(sheepsheadLabel(SHEEPSHEAD_AT + 0.3)).toBe(1);
    expect(fishAt(CRAB_BITE).jaw).toBeLessThan(0.05);
    expect(fishAt(CRAB_BITE - 0.18).jaw).toBeGreaterThan(0.5);
    expect(flashAt(CONVICT_AT + 0.02)).toBeGreaterThan(0.8);
    expect(capAt(CONVICT_AT + 0.1)).toBe(1);
    expect(fishAt(CONVICT_AT + 0.2).convict).toBe(1);
    expect(barsAt(CONVICT_FISH_AT + 0.3)).toBe(1);
    expect(sparkleAt(BETTER_TEETH_AT + 0.35)).toBeGreaterThan(0.9);
    expect(peopleAt(MOST_AT + 0.3)).toBe(1);
    expect(fishAt(STILL_AT + 0.5).pucker).toBe(1);
    expect(handAt(KISSES_AT + 0.05)).toBeGreaterThanOrEqual(1);
    expect(fishAt(BECAUSE_AT + 0.5).pucker).toBe(0);
  });

  it('finishes the voice just before the loop point, so the next loop finishes its sentence', () => {
    const last = WORDS[WORDS.length - 1]!;
    expect(last.text).toBe('Because');
    const gap = LOOP_S - last.end / TEMPO + WORDS[0]!.start / TEMPO;
    expect(gap).toBeGreaterThan(0.2);
    expect(gap).toBeLessThan(0.5);
    expect(said('Because')).toBe(BECAUSE_AT);
  });

  it('captions every spoken word, in short lines, the spoken word highlighted', () => {
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

  it('keeps every piece of text between y 270 and 1240, inside the frame', () => {
    const inside = (s: TextSpot, label: string): void => {
      expect(s.y - 0.75 * s.size, label).toBeGreaterThanOrEqual(270);
      expect(s.y + 0.3 * s.size, label).toBeLessThanOrEqual(1240);
      expect(s.x, label).toBeGreaterThan(120);
      expect(s.x, label).toBeLessThan(960);
    };
    inside({ x: 540, y: CAPTION_Y, size: CAPTION_SIZE, shown: 1 }, 'caption');
    for (const t of FRAMES) {
      const u = wrap(t);
      const molars = molarsSpot(u);
      if (molars.shown > 0) inside(molars, `molars at ${u.toFixed(3)}`);
      const tag = sheepsheadSpot(u);
      if (tag.shown > 0) inside(tag, `sheepshead at ${u.toFixed(3)}`);
      // The board's lettering while it's up (it fades out as the camera swings away).
      const board = placardSpot(u);
      if (board.shown >= 0.5) inside(board, `placard at ${u.toFixed(3)}`);
    }
  });

  it('lifts the quiet "Still… no kisses." about 5 dB, from its first word to its last, ramped in the pauses', () => {
    const still = WORDS.find((w) => w.text === 'Still…')!;
    const kisses = WORDS.find((w) => w.text === 'kisses.')!;
    expect(QUIET.from).toBeCloseTo(still.start / TEMPO, 6);
    expect(QUIET.to).toBeCloseTo(kisses.end / TEMPO, 6);
    const db = 20 * Math.log10(QUIET_LIFT);
    expect(db).toBeGreaterThan(4);
    expect(db).toBeLessThan(6);
    expect(RAMP_S).toBeCloseTo(0.04, 6);
    // The ride: level before, up across the line, level after; times in order.
    const times = VOICE_RIDE.map(([t]) => t);
    expect([...times].sort((a, b) => a - b)).toEqual(times);
    const gainAt = (t: number): number => {
      let i = 0;
      while (i < VOICE_RIDE.length - 2 && t > VOICE_RIDE[i + 1]![0]) i++;
      const [[t0, a], [t1, b]] = [VOICE_RIDE[i]!, VOICE_RIDE[i + 1]!];
      return t <= t0 ? a : t >= t1 ? b : a + ((b - a) * (t - t0)) / (t1 - t0);
    };
    for (const w of WORDS) {
      const mid = (w.start + w.end) / 2 / TEMPO;
      const inLine = w.start >= still.start && w.end <= kisses.end;
      expect(gainAt(mid), w.text).toBeCloseTo(inLine ? QUIET_LIFT : 1, 6);
    }
    // The ramps sit in the pauses either side: no word is half lifted.
    const before = WORDS[WORDS.indexOf(still) - 1]!;
    const after = WORDS[WORDS.indexOf(kisses) + 1]!;
    expect(before.end / TEMPO).toBeLessThan(QUIET.from - RAMP_S);
    expect(after.start / TEMPO).toBeGreaterThan(QUIET.to + RAMP_S);
  });

  it('lasts a whole number of video frames and line-boil cycles, with every sound inside the loop', () => {
    expect(Math.abs(Math.round(LOOP_S * 30) - LOOP_S * 30)).toBeLessThan(1e-6);
    expect(BOIL_STEPS % BOIL_FRAMES).toBe(0);
    expect(BOIL_STEPS / LOOP_S).toBe(BOIL_FPS);
    expect(boilAt(0)).toBe(0);
    expect(boilAt(END) % BOIL_FRAMES).toBe(BOIL_FRAMES - 1);
    expect(wrap(LOOP_S)).toBe(0);
    for (const s of SOUNDS) {
      expect(s.t).toBeGreaterThanOrEqual(0);
      expect(s.t).toBeLessThan(LOOP_S);
    }
    expect(creditAt(END, LOOP_S)).toBe(0);
  });
});
