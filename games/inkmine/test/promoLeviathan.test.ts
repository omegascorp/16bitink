import { describe, expect, it, vi } from 'vitest';
import { withCredit } from '../dev/promo/credit';
import { VIDEO, type Short } from '../dev/promo/short';
import { boilAt } from '../dev/promo/sprites';
import { bubblesIn } from '../dev/promo/leviathan/bubbles';
import { CTA } from '../dev/promo/leviathan/cta';
import {
  arrowAt, blocksGone, BLOCKS_AT, CAVE_AT, chaseClock, ctaAt, CTA_FROM, CTA_TO, darkAt, digAt, EYE_AT, eyeOpenAt, EYE_OPEN_AT, fleeAt, headAt, hookAt, HIT_AT, LOOP_S, noiseAt, sceneAt, shakeAt, slamAt, wrap,
} from '../dev/promo/leviathan/story';

const FRAME = 1 / 30;
const END = LOOP_S - 1e-7;
const FRAMES = Array.from({ length: Math.round(LOOP_S * 30) + 1 }, (_, i) => i * FRAME - FRAME);
/** Everything on screen at t: frame 1 and the last frame must agree on all of it. */
const stateAt = (t: number) => ({
  scene: sceneAt(t), clock: chaseClock(t), head: headAt(t), flee: fleeAt(t), shake: shakeAt(t), hook: hookAt(t), cta: ctaAt(t), arrow: arrowAt(t), dark: darkAt(t), boil: boilAt(t),
});

describe('promo short: never drill near this (no voice)', () => {
  it('is 13.5 s, a multiple of 1.5 s (whole video frames and line-boil cycles)', () => {
    expect(LOOP_S).toBe(13.5);
    expect((LOOP_S / 1.5) % 1).toBe(0);
  });

  it('loops: the state at t=0 equals the state at t=LOOP_S', () => {
    expect(stateAt(LOOP_S)).toEqual(stateAt(0));
    const [a, b] = [stateAt(END), stateAt(0)];
    expect(a.scene).toBe(b.scene);
    expect(a.boil).toBe(boilAt(LOOP_S - FRAME));
    expect(a.clock).toBeCloseTo(b.clock, 5);
    for (const key of ['x', 'y', 'scale', 'gape', 'lit'] as const) expect(a.head[key]).toBeCloseTo(b.head[key], 3);
    for (const key of ['x', 'y', 'tilt'] as const) expect(a.flee[key]).toBeCloseTo(b.flee[key], 3);
    expect(a.shake.x).toBeCloseTo(b.shake.x, 3);
    expect(a.shake.y).toBeCloseTo(b.shake.y, 3);
    for (const key of ['hook', 'cta', 'arrow', 'dark'] as const) expect(a[key]).toBeCloseTo(b[key], 3);
  });

  it('the last video frame lands on frame 1: the camera is steady either side of the seam', () => {
    const [a, b] = [shakeAt(LOOP_S - FRAME), shakeAt(0)];
    expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeLessThan(3);
    expect(Math.abs(headAt(LOOP_S - FRAME).scale - headAt(0).scale)).toBeLessThan(0.005);
  });

  it('the bubbles close at the seam too', () => {
    const box = { x0: 0, x1: 1080, y0: 0, y1: 1900, rMin: 4, rMax: 12 };
    const [a, b] = [bubblesIn(END, 20, 3.1, box), bubblesIn(0, 20, 3.1, box)];
    a.forEach((p, i) => {
      expect(p.alpha).toBeCloseTo(b[i]!.alpha, 2);
      if (p.alpha > 0.01) expect(Math.hypot(p.x - b[i]!.x, p.y - b[i]!.y)).toBeLessThan(1);
    });
  });

  it('opens on the hook: the mouth wide, the caption up, no CTA', () => {
    const s = stateAt(0);
    expect(s.scene).toBe('chase');
    expect(s.head.scale).toBeCloseTo(1, 5);
    expect(s.head.gape).toBeGreaterThan(0.98);
    expect(s.hook).toBe(1);
    expect(s.cta).toBe(0);
  });

  it('never jumps inside the chase, across the seam included', () => {
    for (const t of FRAMES) {
      if (sceneAt(t) !== 'chase' || sceneAt(t + FRAME) !== 'chase') continue;
      const [a, b] = [headAt(t), headAt(t + FRAME)];
      expect(Math.abs(b.scale - a.scale)).toBeLessThan(0.03);
      expect(Math.hypot(b.x - a.x, b.y - a.y)).toBeLessThan(24);
      const [p, q] = [fleeAt(t), fleeAt(t + FRAME)];
      expect(Math.hypot(q.x - p.x, q.y - p.y)).toBeLessThan(30);
    }
  });

  it('runs the beats in order', () => {
    expect(sceneAt(0.6)).toBe('slam');
    expect(sceneAt(4)).toBe('cave');
    expect(sceneAt(5.9)).toBe('eye');
    expect(sceneAt(6.9)).toBe('wake');
    expect(sceneAt(9)).toBe('chase');
    expect(CAVE_AT).toBeLessThan(BLOCKS_AT[0]!);
  });

  it('the noise climbs with each block and is full on the last, before the eye', () => {
    let last = 0;
    for (const at of BLOCKS_AT) {
      const after = noiseAt(at + 0.3);
      expect(after).toBeGreaterThan(last);
      last = after;
    }
    expect(noiseAt(BLOCKS_AT[4]! + 0.3)).toBeGreaterThanOrEqual(0.99);
    expect(noiseAt(BLOCKS_AT[4]! + 0.3)).toBeLessThanOrEqual(1);
    expect(blocksGone(1.5)).toBe(0);
    expect(blocksGone(EYE_AT)).toBe(5);
    expect(digAt(EYE_AT).row).toBeCloseTo(5, 5);
  });

  it('the eye stays shut through the silence, then opens wide', () => {
    expect(eyeOpenAt(EYE_AT + 0.1)).toBe(0);
    expect(eyeOpenAt(EYE_OPEN_AT + 0.5)).toBe(1);
  });

  it('honest to the game: the body throws the prospector clear, it is never swallowed', () => {
    expect(slamAt(HIT_AT - 0.01).thrown).toBeNull();
    const thrown = slamAt(CAVE_AT - 0.1).thrown!;
    // Up and out past the frame's side, not into the mouth.
    expect(thrown.x).toBeGreaterThan(VIDEO.width);
  });

  it('keeps the CTA to the last 3 s, gone 0.6 s before the loop point', () => {
    expect(CTA_FROM).toBeCloseTo(LOOP_S - 3, 5);
    expect(CTA_TO).toBeCloseTo(LOOP_S - 0.6, 5);
    for (const t of FRAMES) {
      const u = wrap(t);
      if (u < CTA_FROM || u >= CTA_TO) expect(ctaAt(u)).toBe(0);
      if (u < CTA_FROM) expect(arrowAt(u)).toBe(0);
    }
    expect(ctaAt(11.5)).toBe(1);
    expect(hookAt(11.5)).toBe(0);
  });

  it('places the CTA where the Shorts UI leaves it clear', () => {
    expect(CTA.tip.x).toBeGreaterThanOrEqual(60);
    expect(CTA.tip.y).toBeLessThan(1480);
    expect(CTA.sub.y).toBeLessThan(1250);
    expect(CTA.line.y).toBeGreaterThan(270);
  });

  it('changes the credit for this short only', () => {
    const spoke: string[] = [];
    const ctx = { save: vi.fn(), restore: vi.fn(), strokeText: vi.fn(), fillText: (s: string) => spoke.push(s) } as unknown as CanvasRenderingContext2D;
    const short: Short = { loopSeconds: LOOP_S, draw: () => undefined, audio: async () => new Blob() };
    withCredit(short, ctx).draw(9);
    withCredit(short, ctx, undefined, 'InkMine · 16bit.ink/mine').draw(9);
    expect(spoke).toEqual(['InkMine · 16bit.ink', 'InkMine · 16bit.ink/mine']);
  });
});
