import { describe, expect, it } from 'vitest';
import { GULPER_BARE, mouthGeom, SNOUT } from '../dev/promo/gulper/mouth';
import {
  BIGGER_AT, BODY_AT, bodyRing, boilAt, BOIL_STEPS, cameraAt, captionAt, CLOSE_AT, DOWN_AT, eelAt, FOOD, foodAt, GILLS_AT, gillLabel, jetsAt, LINES, LOOP_S,
  metresAt, mouthAt, mouthRing, MOUTH_AT, OPEN_AT, OUT_AT, PART_AT, questionAt, readoutAt, said, shakeAt, SHUT_AT, sinkAt, snowScroll, SOUNDS, STILL_AT,
  STRANGE_AT, suctionAt, tailLabel, tailTipAt, THREE_AT, THROWS_AT, TINY_AT, tinyAt, tinyLabel, UP_AT, WATER_AT,
} from '../dev/promo/gulper/story';
import { TEMPO, WORDS } from '../dev/promo/gulper/words';
import { BOIL_FPS, BOIL_FRAMES } from '../src/art/textures';

const END = LOOP_S - 1e-7;
const FRAME = 1 / 30;
/** Every frame of the loop, and one across the loop point. */
const FRAMES = Array.from({ length: Math.round(LOOP_S * 30) + 1 }, (_, i) => i * FRAME - FRAME);
const dist = (p: { x: number; y: number }, q: { x: number; y: number }): number => Math.hypot(q.x - p.x, q.y - p.y);

describe('promo short: its mouth is bigger than its body (narrated)', () => {
  it('loops: the mouth, the eel, the camera, the snow and every note are where they started', () => {
    for (const key of ['jaw', 'fill'] as const) expect(mouthAt(END)[key]).toBeCloseTo(mouthAt(0)[key], 4);
    const [a, b] = [eelAt(END), eelAt(0)];
    for (const key of ['x', 'y', 'tilt', 'effort'] as const) expect(a[key]).toBeCloseTo(b[key], 4);
    expect(Math.cos(a.beat - b.beat)).toBeCloseTo(1, 4);
    for (const key of ['zoom', 'x', 'y'] as const) expect(cameraAt(END)[key]).toBeCloseTo(cameraAt(0)[key], 3);
    expect(dist(tailTipAt(END), tailTipAt(0))).toBeLessThan(0.01);
    // The snow scrolls exactly one screen a loop.
    expect(snowScroll(0)).toBeCloseTo(0, 6);
    expect(snowScroll(END)).toBeCloseTo(1, 4);
    for (const f of [suctionAt, jetsAt, readoutAt, tailLabel, gillLabel, questionAt, tinyLabel, sinkAt]) expect(f(END)).toBeCloseTo(f(0), 4);
    for (const f of [mouthRing, bodyRing]) expect(f(END).alpha * f(END).drawn).toBeCloseTo(f(0).alpha * f(0).drawn, 4);
    expect(shakeAt(END)).toEqual(shakeAt(0));
    // No shrimp at the seam: the tiny one is gulped on "Still,", the others long before.
    FOOD.forEach((_, i) => {
      expect(foodAt(i, END)).toBeNull();
      expect(foodAt(i, 0)).toBeNull();
    });
    expect(tinyAt(END)).toBeNull();
    expect(tinyAt(0)).toBeNull();
  });

  it('never jumps: the mouth, the camera, the eel and the shrimp move on smoothly, frame to frame and across the loop point', () => {
    for (const t of FRAMES) {
      const [p, q] = [mouthAt(t), mouthAt(t + FRAME)];
      // The jaws snap shut on "gulp" in a fifth of a second; nothing else is that quick.
      expect(Math.abs(q.jaw - p.jaw)).toBeLessThan(0.3);
      expect(Math.abs(q.fill - p.fill)).toBeLessThan(0.1);
      const [c, d] = [cameraAt(t), cameraAt(t + FRAME)];
      expect(Math.abs(d.zoom - c.zoom)).toBeLessThan(0.06);
      expect(Math.hypot(d.x - c.x, d.y - c.y)).toBeLessThan(30);
      expect(dist(eelAt(t), eelAt(t + FRAME))).toBeLessThan(5);
      expect(dist(tailTipAt(t), tailTipAt(t + FRAME))).toBeLessThan(30);
      const scroll = (snowScroll(t + FRAME) - snowScroll(t) + 1) % 1;
      expect(scroll).toBeLessThan(0.03);
      for (const shrimp of [...FOOD.map((_, i) => (u: number) => foodAt(i, u)), tinyAt]) {
        const [s, r] = [shrimp(t), shrimp(t + FRAME)];
        if (s && r) expect(dist(s, r)).toBeLessThan(60);
      }
    }
  });

  it('opens on the mouth ballooning open, and rings "mouth" then "body" as they are said', () => {
    expect(mouthAt(0).jaw).toBeGreaterThan(0.7);
    expect(mouthAt(FRAME).fill).toBeGreaterThan(mouthAt(0).fill);
    expect(suctionAt(0)).toBeGreaterThan(0.9);
    expect(mouthAt(BIGGER_AT)).toEqual({ jaw: 1, fill: 1 });
    expect(mouthRing(MOUTH_AT - 0.1).drawn).toBe(0);
    expect(mouthRing(BIGGER_AT).drawn).toBe(1);
    expect(bodyRing(BODY_AT - 0.1).drawn).toBe(0);
    expect(bodyRing(BODY_AT + 0.5).drawn).toBe(1);
    expect(mouthRing(BODY_AT + 0.5).alpha).toBe(1);
  });

  it('draws a mouth that really is bigger than the body: the full balloon is many times as deep', () => {
    const full = mouthGeom(1, 1);
    expect(2 * full.balloon.r).toBeGreaterThan(4 * 2 * GULPER_BARE.hh);
    // Shut and slack, the lower jaw lies along the upper and the pouch hugs the throat.
    const shut = mouthGeom(0, 0);
    expect(dist(shut.tip, SNOUT)).toBeLessThan(4);
    expect(Math.max(...shut.pouch.map((p) => p.y))).toBeLessThan(20);
  });

  it('sinks to 3,000 m on "lives up to three kilometres down"', () => {
    expect(sinkAt(THREE_AT)).toBe(1);
    expect(readoutAt(THREE_AT)).toBe(1);
    expect(metresAt(DOWN_AT + 0.3)).toBe(3000);
    expect(tailLabel(DOWN_AT)).toBe(1);
    expect(sinkAt(CLOSE_AT + 0.5)).toBe(0);
    // Shut and slack on the way down.
    expect(mouthAt(THREE_AT).jaw).toBeLessThan(0.1);
    expect(mouthAt(THREE_AT).fill).toBeLessThan(0.1);
  });

  it('throws its jaws open and balloons up on the words, swallows the shrimp, and snaps shut on "gulp"', () => {
    FOOD.forEach((_, i) => {
      const s = foodAt(i, CLOSE_AT + 0.8)!;
      expect(s.inside).toBe(false);
      expect(s.alpha).toBe(1);
    });
    expect(mouthAt(THROWS_AT).jaw).toBeLessThan(0.1);
    expect(mouthAt(OPEN_AT + 0.2).jaw).toBe(1);
    expect(mouthAt(UP_AT + 0.3).fill).toBe(1);
    expect(suctionAt(WATER_AT)).toBe(1);
    FOOD.forEach((_, i) => expect(foodAt(i, SHUT_AT)!.inside).toBe(true));
    expect(mouthAt(SHUT_AT + 0.05).jaw).toBe(0);
    expect(mouthAt(SHUT_AT + 0.05).fill).toBeGreaterThan(0.95);
  });

  it('squeezes the water out through its gills, and the shrimp go down', () => {
    expect(jetsAt(OUT_AT)).toBe(1);
    expect(mouthAt(OUT_AT).fill).toBeLessThan(0.9);
    expect(mouthAt(GILLS_AT + 0.4).fill).toBeLessThan(0.1);
    expect(gillLabel(GILLS_AT + 0.2)).toBe(1);
    FOOD.forEach((_, i) => expect(foodAt(i, GILLS_AT + 0.01)).toBeNull());
  });

  it('closes in on one tiny shrimp in the open mouth, with a "?", and gulps it on "Still,"', () => {
    expect(cameraAt(STRANGE_AT - 0.2).zoom).toBeCloseTo(1.1, 3);
    expect(cameraAt(TINY_AT).zoom).toBeCloseTo(1.9, 3);
    expect(questionAt(PART_AT + 0.2)).toBeGreaterThan(0.95);
    expect(mouthAt(TINY_AT).jaw).toBeGreaterThan(0.5);
    const tiny = tinyAt(TINY_AT)!;
    expect(tiny.inside).toBe(false);
    expect(tiny.len).toBeLessThan(FOOD[0]!.len);
    expect(tinyLabel(TINY_AT + 0.25)).toBe(1);
    expect(tinyAt(STILL_AT + 0.6)!.inside).toBe(true);
    expect(mouthAt(STILL_AT + 0.5).fill).toBeGreaterThan(mouthAt(STILL_AT).fill);
  });

  it('finishes the voice just before the loop point, so the next loop finishes its sentence', () => {
    const last = WORDS[WORDS.length - 1]!;
    expect(last.text).toBe('Still,');
    const gap = LOOP_S - last.end / TEMPO + WORDS[0]!.start / TEMPO;
    expect(gap).toBeGreaterThan(0.2);
    expect(gap).toBeLessThan(0.5);
    expect(said('Still,')).toBe(STILL_AT);
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
