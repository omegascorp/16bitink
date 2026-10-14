import { describe, expect, it } from 'vitest';
import { mouthOf, type Pose } from '../dev/promo/chain';
import { cloudBlots, cloudCover, CLOUD_LIFE_S } from '../dev/promo/inkcloud/cloud';
import {
  CAPTIONS, captionAlpha, CHOMP_AT, CLOUD_AT, cloudSince, INK_AT, inkButton, inklingAlarm, inklingEyes, inklingFish, inklingJaw, INKLING_LEN, LOOP_S,
  pikeAlarm, pikeFish, pikeJaw, pikePuzzled, PIKE_LEN, SNAP2_AT, SNAP_AT, SOUNDS, SPOT_AT, squirt, TURN_AWAY, TURN_BACK, turnSquash, viewAt, type View, type WorldFish,
} from '../dev/promo/inkcloud/story';
import { BOIL_FPS, BOIL_FRAMES } from '../src/art/textures';
import { ABILITY_INFO } from '../src/logic/abilities';

const END = LOOP_S - 1e-6;
const FRAME = 1 / 30;
const wrap = (angle: number): number => Math.atan2(Math.sin(angle), Math.cos(angle));

/** What the camera shows of a fish: screen offset from the focus, and length. */
const seen = (f: WorldFish, v: View) => ({ x: v.zoom * (f.x - v.x), y: v.zoom * (f.y - v.y), length: v.zoom * f.length });
const pose = (f: WorldFish): Pose => ({ j: 0, age: 0, ...f });
const frames = (from: number, to: number): number[] => Array.from({ length: Math.round((to - from) / FRAME) }, (_, i) => from + i * FRAME);

function expectSameOnScreen(a: WorldFish, va: View, b: WorldFish, vb: View): void {
  const sa = seen(a, va);
  const sb = seen(b, vb);
  expect(sb.x).toBeCloseTo(sa.x, 1);
  expect(sb.y).toBeCloseTo(sa.y, 1);
  expect(sb.length).toBeCloseTo(sa.length, 1);
  expect(b.facing).toBe(a.facing);
  expect(b.tilt).toBeCloseTo(a.tilt, 3);
  expect(b.effort).toBeCloseTo(a.effort, 3);
  expect(wrap(b.beat - a.beat)).toBeCloseTo(0, 3);
}

describe('promo short: throws smoke bomb (the ink escape)', () => {
  it('loops: the pike charging at the end is the pike charging at the start, everything where it was on screen', () => {
    expectSameOnScreen(inklingFish(0), viewAt(0), inklingFish(END), viewAt(END));
    expectSameOnScreen(pikeFish(0), viewAt(0), pikeFish(END), viewAt(END));
    expect(viewAt(END).zoom).toBe(viewAt(0).zoom);
    expect(pikeJaw(END)).toBeCloseTo(pikeJaw(0), 4);
    expect(pikeJaw(0)).toBe(1);
    expect(inklingAlarm(END)).toBeCloseTo(inklingAlarm(0), 4);
    expect(inklingAlarm(0)).toBeGreaterThan(0.9);
    expect(inklingJaw(END)).toBeCloseTo(inklingJaw(0), 6);
    expect(inklingEyes(END)).toBe(inklingEyes(0));
    expect(pikeAlarm(END)).toBe(0);
    expect(pikePuzzled(END)).toBe(0);
    expect(turnSquash(END)).toBe(1);
    expect(squirt(END)).toBe(0);
    expect(cloudBlots(cloudSince(END))).toHaveLength(0);
    expect(cloudBlots(cloudSince(0))).toHaveLength(0);
    expect(inkButton(END)).toEqual(inkButton(0));
    expect(inkButton(0).ready).toBe(1);
  });

  it('moves smoothly on screen: no frame jumps further than a dash, the camera included', () => {
    for (let t = 0; t < LOOP_S; t += FRAME) {
      const u = (t + FRAME) % LOOP_S;
      for (const fish of [inklingFish, pikeFish]) {
        const a = seen(fish(t), viewAt(t));
        const b = seen(fish(u), viewAt(u));
        expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeLessThan(45);
      }
      const v = viewAt(t);
      const w = viewAt(u);
      // The camera slides SHIFT px a loop: across the seam it jumps back by exactly that, which is the same picture.
      const dx = ((w.x - v.x) % 3000 + 4500) % 3000 - 1500;
      expect(Math.abs(v.zoom * dx)).toBeLessThan(40);
    }
  });

  it('keeps both fish big and in the frame, clear of the captions and the ink button', () => {
    expect(INKLING_LEN * viewAt(0).zoom).toBeGreaterThanOrEqual(170);
    for (let t = 0; t < LOOP_S; t += FRAME) {
      const v = viewAt(t);
      for (const f of [inklingFish(t), pikeFish(t)]) {
        const s = seen(f, v);
        const x = 540 + s.x;
        const y = 800 + s.y;
        expect(x - s.length / 2).toBeGreaterThan(-0.05 * s.length);
        expect(x + s.length / 2).toBeLessThan(1080 + 0.05 * s.length);
        expect(y).toBeGreaterThan(560);
        expect(y).toBeLessThan(1040);
      }
    }
  });

  it('only just misses at the start: the snap lands behind your tail', () => {
    const mouth = mouthOf(pose(pikeFish(SNAP_AT)));
    const you = inklingFish(SNAP_AT);
    const tail = you.x - INKLING_LEN / 2;
    expect(mouth.x).toBeLessThan(tail);
    expect(tail - mouth.x).toBeLessThan(60);
  });

  it('snaps again mid-chase and bites water: you jink up out of its jaws, and it has to come up after you', () => {
    expect(pikeJaw(SNAP2_AT - 0.15)).toBe(1);
    expect(pikeJaw(SNAP2_AT)).toBe(0);
    const mouth = mouthOf(pose(pikeFish(SNAP2_AT)));
    const you = inklingFish(SNAP2_AT);
    expect(mouth.y - you.y).toBeGreaterThan(70);
    expect(Math.abs(you.x - mouth.x)).toBeLessThan(INKLING_LEN);
    expect(pikeFish(SNAP2_AT + 0.4).y).toBeLessThan(pikeFish(SNAP2_AT).y - 40);
    expect(SOUNDS.some((s) => s.id === 'eat' && s.t === SNAP2_AT)).toBe(true);
  });

  it('moves the fish about the frame while they chase: the camera lags, so they drift and the gap closes on screen', () => {
    const at = (t: number) => {
      const v = viewAt(t);
      return { you: seen(inklingFish(t), v), pike: seen(pikeFish(t), v) };
    };
    const xs = frames(0.4, 4.0).map((t) => at(t).you.x);
    const ys = frames(0.4, 4.0).map((t) => at(t).you.y);
    expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(120);
    expect(Math.max(...ys) - Math.min(...ys)).toBeGreaterThan(120);
    const gap = (t: number): number => at(t).you.x - at(t).pike.x;
    expect(gap(3.0) - gap(INK_AT)).toBeGreaterThan(100);
  });

  it('squirts the ink with the pike’s jaws at your tail, and it bites the cloud where you were', () => {
    const mouth = mouthOf(pose(pikeFish(INK_AT)));
    const you = inklingFish(INK_AT);
    expect(you.x - INKLING_LEN / 2 - mouth.x).toBeLessThan(40);
    expect(pikeJaw(INK_AT)).toBe(1);
    expect(CLOUD_AT.x).toBeCloseTo(you.x, 6);
    const bite = mouthOf(pose(pikeFish(CHOMP_AT)));
    expect(Math.hypot(bite.x - CLOUD_AT.x, bite.y - CLOUD_AT.y)).toBeLessThan(60);
    expect(pikeJaw(CHOMP_AT)).toBe(0);
  });

  it('hides you in the ink while the pike goes through it, and the pike comes out the far side', () => {
    for (const t of frames(INK_AT + 0.25, CHOMP_AT + 0.6)) {
      const you = inklingFish(t);
      expect(cloudCover(cloudSince(t), you.x - CLOUD_AT.x, you.y - CLOUD_AT.y)).toBeGreaterThan(0.6);
    }
    const out = pikeFish(TURN_AWAY - 0.5);
    expect(out.x - PIKE_LEN / 2).toBeGreaterThan(CLOUD_AT.x);
    expect(CLOUD_LIFE_S).toBeLessThan(TURN_BACK - INK_AT);
  });

  it('keeps you behind its tail while it looks about, then face to face as it turns round', () => {
    const behind = (t: number): number => {
      const p = pikeFish(t);
      const y = inklingFish(t);
      return -p.facing * (y.x - p.x);
    };
    for (const t of frames(6.6, TURN_AWAY - 0.35)) expect(behind(t)).toBeGreaterThan(PIKE_LEN / 2);
    for (const t of frames(TURN_AWAY + 0.4, TURN_BACK - 0.15)) expect(behind(t)).toBeGreaterThan(PIKE_LEN / 2);
    expect(behind(SPOT_AT)).toBeLessThan(-PIKE_LEN / 2);
    expect(pikeFish(TURN_AWAY + 0.2).facing).toBe(-1);
    expect(pikeFish(SPOT_AT).facing).toBe(1);
    expect(pikeAlarm(SPOT_AT + 0.2)).toBeGreaterThan(0.9);
  });

  it('shows the ink button tapped as you squirt, recharging after, as the game does', () => {
    expect(ABILITY_INFO.ink.active).toBe(true);
    expect(inkButton(INK_AT - 0.01).ready).toBe(1);
    expect(inkButton(INK_AT + 0.01).ready).toBeLessThan(0.05);
    expect(inkButton(INK_AT).press).toBeGreaterThan(0);
  });

  it('shows the same words either side of the loop point, with something to read in the first frame', () => {
    for (const c of CAPTIONS) expect(captionAlpha(c, END)).toBeCloseTo(captionAlpha(c, 0), 3);
    expect(CAPTIONS.some((c) => captionAlpha(c, 0) === 1)).toBe(true);
    for (const c of CAPTIONS) {
      expect(c.y).toBeGreaterThan(270);
      expect(c.y).toBeLessThan(500);
    }
  });

  it('lasts a whole number of video frames and line-boil cycles, with every sound inside the loop', () => {
    expect((LOOP_S * 30) % 1).toBe(0);
    expect((LOOP_S * BOIL_FPS) % BOIL_FRAMES).toBe(0);
    for (const s of SOUNDS) {
      expect(s.t).toBeGreaterThanOrEqual(0);
      expect(s.t).toBeLessThan(LOOP_S);
    }
    expect(SOUNDS.some((s) => s.id === 'splash' && s.t === INK_AT && s.pitch === 0.6)).toBe(true);
  });
});
