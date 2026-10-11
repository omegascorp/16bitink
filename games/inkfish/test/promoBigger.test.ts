import { describe, expect, it } from 'vitest';
import { mouthOf, type Pose } from '../dev/promo/chain';
import {
  APPROACH_FROM, CAPTIONS, captionAlpha, GROUPER_LEN, grouperAt, grouperJaw, grouperVisible, GULP_AT, HOOK_REST, hookAt, lineBow, LOOP_S, murk,
  sharkAt, sharkJaw, SOUNDS, SWALLOW_FROM,
} from '../dev/promo/bigger/story';
import { BOIL_FPS, BOIL_FRAMES } from '../src/art/textures';

const END = LOOP_S - 1e-7;
const sharkPose = (t: number): Pose => {
  const s = sharkAt(t);
  if (s.kind === 'gone') throw new Error(`no shark at ${t}`);
  return s.pose;
};
const dist = (a: { x: number; y: number }, b: { x: number; y: number }): number => Math.hypot(a.x - b.x, a.y - b.y);
const wrap = (angle: number): number => Math.atan2(Math.sin(angle), Math.cos(angle));

describe('promo short: there’s always a bigger fish', () => {
  it('loops: the next shark bites the hook exactly where and how the first one was hooked', () => {
    const start = sharkPose(0);
    const end = sharkPose(END);
    expect(end.x).toBeCloseTo(start.x, 3);
    expect(end.y).toBeCloseTo(start.y, 3);
    expect(end.tilt).toBeCloseTo(start.tilt, 5);
    expect(end.facing).toBe(start.facing);
    expect(wrap(end.beat - start.beat)).toBeCloseTo(0, 4);
    expect(sharkJaw(END)).toBeCloseTo(sharkJaw(0), 4);
  });

  it('loops the hook and line too, the empty hook at rest when the next shark bites', () => {
    expect(dist(hookAt(0), HOOK_REST)).toBeLessThan(1e-6);
    expect(dist(hookAt(END), HOOK_REST)).toBeLessThan(1e-3);
    expect(dist(mouthOf(sharkPose(END)), HOOK_REST)).toBeLessThan(1e-3);
    expect(lineBow(END)).toBeCloseTo(lineBow(0), 3);
  });

  it('keeps the hook in the shark’s mouth while it is on the line and being swallowed', () => {
    for (let t = 0; t < GULP_AT; t += 0.13) expect(dist(mouthOf(sharkPose(t)), hookAt(t))).toBeLessThan(1e-6);
  });

  it('drags the shark from the line into the grouper’s mouth without a jump', () => {
    expect(dist(sharkPose(SWALLOW_FROM - 1e-6), sharkPose(SWALLOW_FROM))).toBeLessThan(0.1);
    // By the gulp it is down the throat, inside the grouper's head.
    const throat = sharkPose(GULP_AT - 1e-6);
    expect(dist(throat, grouperAt(GULP_AT))).toBeLessThan(0.2 * GROUPER_LEN);
    expect(grouperJaw(SWALLOW_FROM)).toBe(1);
    expect(sharkAt(GULP_AT).kind).toBe('gone');
  });

  it('moves the hook and fish smoothly: no frame jumps further than a fast swim (bar the gulp itself)', () => {
    const frame = 1 / 30;
    const gulping = (t: number): boolean => t > SWALLOW_FROM && t < GULP_AT + frame;
    for (let t = 0; t + frame < LOOP_S; t += frame) {
      if (!gulping(t)) expect(dist(hookAt(t), hookAt(t + frame))).toBeLessThan(45);
      if (grouperVisible(t) && grouperVisible(t + frame)) expect(dist(grouperAt(t), grouperAt(t + frame))).toBeLessThan(45);
    }
  });

  it('brings the grouper up out of the dark and takes it back there', () => {
    expect(murk(grouperAt(1.2))).toBe(1);
    expect(murk(grouperAt(GULP_AT))).toBe(0);
    expect(murk(grouperAt(10.3))).toBe(1);
    expect(grouperVisible(APPROACH_FROM)).toBe(false);
  });

  it('shows the same words either side of the loop point', () => {
    for (const c of CAPTIONS) expect(captionAlpha(c, END)).toBeCloseTo(captionAlpha(c, 0), 3);
    // Something to read in the very first frame.
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
