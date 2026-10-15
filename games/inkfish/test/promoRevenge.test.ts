import { describe, expect, it } from 'vitest';
import { mouthOf, type Pose } from '../dev/promo/chain';
import {
  CAPTIONS, captionAlpha, GULP_AT, growthBar, inklingAlarm, inklingFish, inklingJaw, inklingLength, LOOP_S, PERCH_LEN, perchAt, perchJaw, perchMenace,
  perchMurk, pullAt, SCALE, snacksAt, SOUNDS, SPURTS, SUCK_FROM, TIER_LEN, viewAt, type View, type WorldFish,
} from '../dev/promo/revenge/story';
import { BOIL_FPS, BOIL_FRAMES } from '../src/art/textures';

const END = LOOP_S - 1e-6;
const wrap = (angle: number): number => Math.atan2(Math.sin(angle), Math.cos(angle));

/** What the camera shows of a fish: screen offset from the focus, and length. */
const seen = (f: WorldFish, v: View) => ({ x: v.zoom * (f.x - v.x), y: v.zoom * (f.y - v.y), length: v.zoom * f.length });

const perchFish = (t: number): WorldFish => {
  const p = perchAt(t);
  if (p.kind === 'gone') throw new Error(`no perch at ${t}`);
  return p.fish;
};
const pose = (f: WorldFish): Pose => ({ j: 0, age: 0, ...f });

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

describe('promo short: remember this perch', () => {
  it('loops: the dad lunging at the end is the perch lunging at the start, scaled up by the camera’s pull-back', () => {
    expect(pullAt(END)).toBeCloseTo(pullAt(0) + 1, 6);
    expectSameOnScreen(inklingFish(0), viewAt(0), inklingFish(END), viewAt(END));
    expectSameOnScreen(perchFish(0), viewAt(0), perchFish(END), viewAt(END));
    expect(perchJaw(END)).toBeCloseTo(perchJaw(0), 4);
    expect(perchMenace(END)).toBe(perchMenace(0));
    expect(perchMurk(END)).toBe(0);
    expect(inklingAlarm(END)).toBeCloseTo(inklingAlarm(0), 4);
    expect(inklingJaw(END)).toBeCloseTo(inklingJaw(0), 6);
    expect(growthBar(END).alpha).toBe(0);
    expect(growthBar(0).alpha).toBe(0);
    expect(snacksAt(0)).toHaveLength(0);
  });

  it('moves smoothly on screen: no frame jumps further than a dash, the camera included', () => {
    const frame = 1 / 30;
    for (let t = 0; t + frame < LOOP_S + frame; t += frame) {
      const a = seen(inklingFish(t), viewAt(t));
      const b = seen(inklingFish((t + frame) % LOOP_S), viewAt((t + frame) % LOOP_S));
      expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeLessThan(40);
      const v = viewAt(t);
      const w = viewAt((t + frame) % LOOP_S);
      expect(Math.hypot(v.zoom * v.x - w.zoom * w.x, v.zoom * v.y - w.zoom * w.y)).toBeLessThan(40);
    }
  });

  it('grows you past the perch before you eat it, and to full size after', () => {
    expect(TIER_LEN[0]).toBeLessThan(PERCH_LEN / 1.8);
    expect(inklingLength(SUCK_FROM)).toBeGreaterThan(PERCH_LEN * 1.3);
    expect(inklingLength(SPURTS[2] + 2)).toBeCloseTo(TIER_LEN[0] * SCALE, 0);
  });

  it('drags the perch from its escape into your mouth, gone by the gulp', () => {
    const before = perchFish(SUCK_FROM - 1e-6);
    const after = perchFish(SUCK_FROM);
    expect(Math.hypot(before.x - after.x, before.y - after.y)).toBeLessThan(1);
    const mouth = mouthOf(pose(inklingFish(SUCK_FROM)));
    expect(Math.hypot(mouth.x - before.x, mouth.y - before.y)).toBeLessThan(PERCH_LEN);
    expect(perchAt(GULP_AT).kind).toBe('gone');
  });

  it('shows the same words either side of the loop point, with something to read in the first frame', () => {
    for (const c of CAPTIONS) expect(captionAlpha(c, END)).toBeCloseTo(captionAlpha(c, 0), 3);
    expect(CAPTIONS.some((c) => captionAlpha(c, 0) === 1)).toBe(true);
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
