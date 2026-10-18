import { describe, expect, it } from 'vitest';
import { captionAt, LINES, SOUNDS } from '../dev/promo/manowar/cues';
import {
  blinkAt, boilAt, BOIL_STEPS, BUS, camAt, type CrabPose, crabAt, dimAt, eatJob, eyesAt, flashAt, floatJob, floatLabel, leftFloatAt, LOOP_S, mouthAt,
  nameLabel, puffAt, reachAt, rightFloatAt, sailLabel, said, sceneAt, SMALL_FLOAT, shrimpAt, stingJob, stingZapAt, swayAt, unisonAt, warmAt, zapAt,
} from '../dev/promo/manowar/story';
import { TEMPO, WORDS } from '../dev/promo/manowar/words';
import { BOIL } from '../src/art/palette';
import { BOIL_FPS } from '../dev/promo/sprites';

const END = LOOP_S - 1e-7;
const FRAME = 1 / 30;
const KEYS = ['x', 'y', 'hidden', 'rot'] as const;
const MOUTH = { x: 600, y: 800 };

const same = (a: CrabPose, b: CrabPose): void => {
  for (const key of KEYS) expect(a[key]).toBeCloseTo(b[key], 3);
};
const SCENES = ['beach', 'colony', 'road', 'sea'] as const;
/** How much of a scene shows at t: the incoming one is laid over the outgoing at `mix`. */
const weight = (id: string, t: number): number => {
  const s = sceneAt(t);
  return (s.base === id ? 1 - s.mix : 0) + (s.over === id ? s.mix : 0);
};
/** Whether t is on the beach with no cut fading over it. */
const onBeach = (t: number): boolean => {
  const s = sceneAt(t);
  return s.base === 'beach' && s.over === null;
};

describe('promo short: this is NOT a jellyfish (narrated)', () => {
  it('loops: the beach, the camera and the crab at the loop point are where they were at the start', () => {
    expect(sceneAt(END)).toEqual({ base: 'beach', over: null, mix: 0 });
    expect(sceneAt(0)).toEqual({ base: 'beach', over: null, mix: 0 });
    same(crabAt(END), crabAt(0));
    const [a, b] = [camAt(END), camAt(0)];
    expect(a.z).toBeCloseTo(b.z, 3);
    expect(a.x).toBeCloseTo(b.x, 2);
    expect(a.y).toBeCloseTo(b.y, 2);
    for (const f of [dimAt, zapAt, nameLabel, warmAt, floatJob, sailLabel]) expect(f(END)).toBeCloseTo(f(0), 4);
  });

  it('never jumps: the cuts fade, and the crab and the camera move on smoothly on the beach, frame to frame and across the loop point', () => {
    for (let t = -FRAME; t < LOOP_S; t += FRAME) {
      const [a, b] = [(t + LOOP_S) % LOOP_S, (t + FRAME + LOOP_S) % LOOP_S];
      if (!onBeach(a) || !onBeach(b)) continue;
      const [p, q] = [crabAt(a), crabAt(b)];
      // The backflip off the sting is the fastest move.
      expect(Math.hypot(q.x - p.x, q.y - p.y)).toBeLessThan(45);
      expect(Math.abs(q.rot - p.rot)).toBeLessThan(0.75);
      expect(Math.abs(q.hidden - p.hidden)).toBeLessThan(0.5);
      const [c, d] = [camAt(a), camAt(b)];
      expect(Math.abs(d.z - c.z)).toBeLessThan(0.12);
      // The jolt at the zap is the fastest.
      expect(Math.hypot(d.x - c.x, d.y - c.y)).toBeLessThan(26);
    }
    for (let t = 0; t < LOOP_S; t += FRAME) {
      for (const id of SCENES) expect(Math.abs(weight(id, t + FRAME) - weight(id, t))).toBeLessThan(0.3);
      expect(Math.abs(swayAt(3, t + FRAME) - swayAt(3, t))).toBeLessThan(0.05);
      if (weight('road', t) > 0) expect(Math.abs(reachAt(t + FRAME) - reachAt(t))).toBeLessThan(30);
    }
  });

  it('opens on the hook: the stranded man o\' war, the crab out and creeping at it, the whole hook line and no other text', () => {
    expect(crabAt(0).hidden).toBe(0);
    expect(Math.abs(crabAt(FRAME).x - crabAt(0).x)).toBeGreaterThan(0.1);
    expect(camAt(0).z).toBeLessThan(1.1);
    expect(nameLabel(0)).toBe(0);
    expect(dimAt(0)).toBe(0);
    expect(flashAt(0)).toBeLessThan(0);
    expect(captionAt(0)!.line.words.map((w) => w.text).join(' ')).toBe('This is NOT a jellyfish.');
  });

  it('dives into the colony on "man o\' war … COLONY", and the polyps open their eyes on "tiny animals"', () => {
    expect(nameLabel(said('war'))).toBe(1);
    expect(camAt(said('whole')).z).toBeGreaterThan(1.8);
    expect(sceneAt(said('COLONY') + 0.3).base).toBe('colony');
    expect(eyesAt(0, said('tiny') - 0.1)).toBe(0);
    expect(eyesAt(15, said('living'))).toBe(1);
  });

  it('sways them in step, warm, for "living as one", and they blink together on "one"', () => {
    expect(unisonAt(said('as'))).toBe(1);
    expect(warmAt(said('as'))).toBe(1);
    expect(swayAt(0, said('as'))).toBeCloseTo(swayAt(9, said('as')), 6);
    expect(blinkAt(said('one.') + 0.1)).toBe(1);
    expect(unisonAt(said('tiny'))).toBe(0);
  });

  it('shows its jobs in turn: the float puffs on "float", the stingers zap on "sting", a feeder gulps the shrimp on "eat"', () => {
    expect(floatJob(said('float,'))).toBe(1);
    expect(puffAt(said('float,') + 0.15)).toBeGreaterThan(0.5);
    expect(floatLabel(said('float,') + 0.1)).toBe(1);
    expect(stingJob(said('sting,'))).toBe(1);
    expect(floatJob(said('sting,'))).toBe(0);
    expect(stingZapAt(said('sting,') + 0.1)).toBe(1);
    expect(eatJob(said('eat…'))).toBe(1);
    expect(mouthAt(said('eat…'))).toBe(1);
    expect(shrimpAt(said('some', 2), MOUTH)!.alpha).toBe(1);
    expect(shrimpAt(said('eat…') + 0.5, MOUTH)).toBeNull();
  });

  it('stretches its tentacles past the bus\'s front on "BUS!"', () => {
    expect(sceneAt(said('tentacles')).base).toBe('road');
    expect(reachAt(said('longer'))).toBeLessThan(BUS.x1);
    expect(reachAt(said('BUS!') + 0.15)).toBeGreaterThan(BUS.x1);
    // Longer than the bus: from the float on the sand to well past the bus's length.
    expect(reachAt(said('BUS!') + 0.4) - SMALL_FLOAT.x).toBeGreaterThan(BUS.x1 - BUS.x0);
  });

  it('dims the beach for "Even dead on the sand…", then ZAPs the crab on "STILL" and it backflips into its shell', () => {
    expect(sceneAt(said('dead')).base).toBe('beach');
    expect(dimAt(said('sand…'))).toBe(1);
    expect(crabAt(said('sand…')).hidden).toBe(0);
    expect(crabAt(said('sand…')).x).toBeGreaterThan(crabAt(said('Even')).x);
    expect(zapAt(said('STILL') + 0.05)).toBe(1);
    expect(crabAt(said('STILL') + 0.15).hidden).toBe(1);
    expect(crabAt(said('sting!') + 0.5).x).toBeLessThan(crabAt(said('STILL')).x - 100);
    expect(dimAt(said('sting!'))).toBe(0);
  });

  it('sails two floats apart at sea: the left-leaning one goes left on "left", the right-leaning one right on "right"', () => {
    expect(sceneAt(said('sail?')).base).toBe('sea');
    expect(sailLabel(said('sail?') + 0.1)).toBe(1);
    expect(leftFloatAt(said('left…')).hi).toBe(1);
    expect(rightFloatAt(said('left…')).hi).toBe(0);
    expect(leftFloatAt(said('right.')).x).toBeLessThan(leftFloatAt(said('Some')).x - 50);
    expect(rightFloatAt(said('right.')).hi).toBe(1);
    expect(rightFloatAt(said('So') + 0.1).x).toBeGreaterThan(rightFloatAt(said('Some')).x + 80);
    expect(sceneAt(said('whatever')).base).toBe('beach');
  });

  it('finishes the voice just before the loop point, so the next loop finishes its sentence', () => {
    const last = WORDS[WORDS.length - 1]!;
    expect(last.text).toBe('remember:');
    expect(LOOP_S - last.end / TEMPO).toBeGreaterThanOrEqual(0.2);
    expect(LOOP_S - last.end / TEMPO + WORDS[0]!.start / TEMPO).toBeLessThan(0.5);
    expect(TEMPO).toBeGreaterThan(1.05);
    expect(TEMPO).toBeLessThan(1.15);
  });

  it('captions every spoken word, in short lines, the right line at each moment, never splitting "man o\' war"', () => {
    expect(LINES.flatMap((l) => l.words)).toEqual(WORDS);
    for (const l of LINES.slice(1)) expect(l.words.length).toBeLessThanOrEqual(4);
    expect(LINES.some((l) => l.words.map((w) => w.text).join(' ') === 'man o\' war')).toBe(true);
    for (const w of WORDS) {
      const now = captionAt(w.start / TEMPO + 0.01)!;
      expect(now.line.words[now.word]).toBe(w);
    }
    expect(captionAt(END)!.line).toBe(LINES[LINES.length - 1]);
  });

  it('lasts a whole number of video frames and line-boil cycles, with every sound inside the loop', () => {
    expect(Math.abs(Math.round(LOOP_S * 30) - LOOP_S * 30)).toBeLessThan(1e-6);
    expect(BOIL_STEPS % BOIL).toBe(0);
    expect(BOIL_STEPS / LOOP_S).toBe(BOIL_FPS);
    expect(boilAt(0)).toBe(0);
    expect(boilAt(END)).toBe(BOIL - 1);
    for (const s of SOUNDS) {
      expect(s.t).toBeGreaterThanOrEqual(0);
      expect(s.t).toBeLessThan(LOOP_S);
    }
  });
});
