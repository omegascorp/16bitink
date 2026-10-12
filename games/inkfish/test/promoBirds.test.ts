import { describe, expect, it } from 'vitest';
import { mouthOf } from '../dev/promo/chain';
import {
  CAPTIONS, captionAlpha, FEATHER_COUNT, featherAt, GRAB_AT, GRAB_POINT, GULP_AT, JACK_LEN, jackAt, jackVisible, LOOP_S, murk, SOUNDS, SPLASHES,
  SURFACE_Y, ternAt, TERN_ENTER, type TernPose,
} from '../dev/promo/birds/story';
import { VIDEO } from '../dev/promo/short';
import { BOIL_FPS, BOIL_FRAMES } from '../src/art/textures';

const END = LOOP_S - 1e-7;
const FRAME = 1 / 30;
const ternPose = (t: number): TernPose => {
  const s = ternAt(t);
  if (s.kind === 'gone') throw new Error(`no tern at ${t}`);
  return s.pose;
};
const dist = (a: { x: number; y: number }, b: { x: number; y: number }): number => Math.hypot(a.x - b.x, a.y - b.y);

describe('promo short: some fish eat birds', () => {
  it('loops: the next tern flies in exactly where and how the first one was', () => {
    const start = ternPose(0);
    const end = ternPose(END);
    expect(dist(start, end)).toBeLessThan(1e-3);
    expect(end.tilt).toBeCloseTo(start.tilt, 4);
    expect(end.frame).toBe(start.frame);
    expect(end.scale).toBe(start.scale);
  });

  it('keeps the trevally out of the picture across the loop point', () => {
    expect(jackVisible(0)).toBe(false);
    expect(jackVisible(END)).toBe(false);
    expect(jackVisible(TERN_ENTER)).toBe(false);
  });

  it('brings the trevally on and off out of sight, as a shadow in the dark', () => {
    for (const t of [0.8, 8.4]) {
      const p = jackAt(t);
      expect(p.x + JACK_LEN / 2 < 0 || p.y - JACK_LEN / 2 > VIDEO.height).toBe(true);
      expect(murk(p)).toBe(1);
    }
  });

  it('lurks as a dark shape under the tern, and is in plain sight once it leaps', () => {
    const lurking = jackAt(3.5);
    expect(murk(lurking)).toBeGreaterThan(0.9);
    expect(lurking.y).toBeGreaterThan(SURFACE_Y);
    expect(murk(jackAt(GRAB_AT))).toBeLessThan(0.15);
    expect(murk(jackAt(5.3))).toBe(0);
  });

  it('meets the tern mouth first, above the water', () => {
    expect(dist(mouthOf(jackAt(GRAB_AT)), GRAB_POINT)).toBeLessThan(1e-6);
    expect(dist(ternPose(GRAB_AT - 1e-9), GRAB_POINT)).toBeLessThan(0.5);
    expect(GRAB_POINT.y).toBeLessThan(SURFACE_Y - 40);
    // Leaping nose up to take it.
    expect(jackAt(GRAB_AT).tilt).toBeGreaterThan(0.6);
  });

  it('swallows the tern into the trevally, then it is gone', () => {
    expect(ternAt(GRAB_AT).kind).toBe('taken');
    const last = ternPose(GULP_AT - 1e-6);
    expect(dist(last, jackAt(GULP_AT))).toBeLessThan(0.3 * JACK_LEN);
    expect(ternAt(GULP_AT).kind).toBe('gone');
    expect(ternAt(TERN_ENTER - 1e-6).kind).toBe('gone');
  });

  it('breaks the surface on the way up and goes back in nose first', () => {
    const [exit, entry] = SPLASHES;
    expect(exit!.at).toBeLessThan(GRAB_AT);
    expect(entry!.at).toBeGreaterThan(GULP_AT);
    expect(jackAt(entry!.at).tilt).toBeLessThan(-0.4);
  });

  it('moves the fish and the tern smoothly: no frame jumps further than a leap', () => {
    for (let t = 0; t + FRAME < LOOP_S; t += FRAME) {
      if (jackVisible(t) && jackVisible(t + FRAME)) expect(dist(jackAt(t), jackAt(t + FRAME))).toBeLessThan(45);
      const a = ternAt(t);
      const b = ternAt(t + FRAME);
      if (a.kind !== 'gone' && b.kind !== 'gone') expect(dist(a.pose, b.pose)).toBeLessThan(45);
    }
  });

  it('lets the feathers settle on the water and fade before the loop comes round', () => {
    for (let i = 0; i < FEATHER_COUNT; i++) {
      expect(featherAt(i, GULP_AT - 0.01)).toBeNull();
      const floating = featherAt(i, 9.5)!;
      expect(Math.abs(floating.y - SURFACE_Y)).toBeLessThan(10);
      expect(featherAt(i, END)).toBeNull();
    }
  });

  it('shows the same words either side of the loop point', () => {
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
