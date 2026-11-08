import { describe, expect, it } from 'vitest';
import { boilAt } from '../dev/promo/sprites';
import {
  agamaAt, bodyPoint, CAPTIONS, captionAlpha, coreAt, CREDIT_TEXT, eagleAt, GRAB_D, headOf, LOOP_S, ringAt, scrollAt, SOUNDS, T_CATCH, T_DIVE, T_LOCK, T_NEW, TILE_H, W, wrap,
} from '../dev/promo/eaglesnatch/story';

const END = LOOP_S - 1e-6;
const FRAME = 1 / 30;
const FRAMES = Array.from({ length: Math.round(LOOP_S * 30) }, (_, i) => i * FRAME);

/** Frame 1 is the end of the loop's story: the snake's state at 12 s. */
const core = (t: number): ReturnType<typeof coreAt> => coreAt(t < T_NEW ? LOOP_S : t);
const head = (t: number): { x: number; y: number } => headOf(core(t));

describe('promo short: snake catches lizard, eagle catches snake (no voice, InkSnake)', () => {
  it('is 12 s, a multiple of 1.5 s, so the line boil loops too', () => {
    expect(LOOP_S).toBe(12);
    expect((LOOP_S / 1.5) % 1).toBe(0);
    expect(boilAt(LOOP_S)).toBe(boilAt(0));
    expect(wrap(LOOP_S + 0.5)).toBeCloseTo(0.5, 9);
  });

  it('loops: the last frame runs into frame 1 on screen (snake, lizard, eagle, ring, ground)', () => {
    const [a, b] = [head(END), head(0)];
    expect(a.x).toBeCloseTo(b.x, 1);
    expect(a.y).toBeCloseTo(b.y, 1);
    for (const d of [0, 200, 500, 800]) {
      const [p, q] = [bodyPoint(core(END), d), bodyPoint(core(0), d)];
      expect(p.x, `body at ${d}`).toBeCloseTo(q.x, 1);
      expect(p.y, `body at ${d}`).toBeCloseTo(q.y, 1);
    }
    const [m, n] = [agamaAt(END), agamaAt(0)];
    expect(m.x).toBeCloseTo(n.x, 1);
    expect(m.y).toBeCloseTo(n.y, 1);
    expect(m.angle).toBeCloseTo(n.angle, 1);
    const [e1, e0] = [eagleAt(END)!, eagleAt(0)!];
    expect(e1.x).toBeCloseTo(e0.x, 0);
    expect(e1.y).toBeCloseTo(e0.y, 0);
    expect(e1.pose).toBe(e0.pose);
    expect(e1.scale).toBeCloseTo(e0.scale, 3);
    expect(Math.cos(e1.heading)).toBeCloseTo(Math.cos(e0.heading), 3);
    expect(Math.sin(e1.heading)).toBeCloseTo(Math.sin(e0.heading), 3);
    const [r1, r0] = [ringAt(END)!, ringAt(0)!];
    expect(r1.alpha).toBeCloseTo(r0.alpha, 3);
    expect(r1.r).toBeCloseTo(r0.r, 3);
    // The ground slid two whole tiles, and mirrors every other one: it ends as it starts.
    const slid = (scrollAt(END) - scrollAt(0)) % (2 * TILE_H);
    expect(Math.min(slid, 2 * TILE_H - slid)).toBeCloseTo(0, 1);
  });

  it('never jumps: snake, lizard and eagle move on smoothly, frame to frame, round the seam too', () => {
    for (const t of FRAMES) {
      const next = wrap(t + FRAME);
      if (t + FRAME >= T_NEW - 1e-9 && t < T_NEW) continue;
      const [a, b] = [head(t), head(next)];
      expect(Math.hypot(b.x - a.x, b.y - a.y), `head at ${t}`).toBeLessThan(80);
      const [m, n] = [agamaAt(t), agamaAt(next)];
      expect(Math.hypot(n.x - m.x, n.y - m.y), `lizard at ${t}`).toBeLessThan(110);
      const [e, f] = [eagleAt(t), eagleAt(next)];
      if (e && f && t > 0.1) expect(Math.hypot(f.x - e.x, f.y - e.y), `eagle at ${t}`).toBeLessThan(260);
    }
  });

  it('frame 1 says it alone: talons on the snake, a lizard in its jaws, the red ring on it, a caption', () => {
    const t = 0.3;
    const e = eagleAt(t)!;
    const grab = bodyPoint(coreAt(LOOP_S), GRAB_D);
    // Close, big and centred: the eagle's feet are on the snake's swollen neck.
    expect(Math.hypot(e.x - grab.x, e.y - grab.y)).toBeLessThan(220);
    expect(e.feet).toBe(true);
    const h = head(t);
    const lizard = agamaAt(t);
    // The lizard sticks out past the head, tail up the screen.
    expect(h.y - lizard.y).toBeGreaterThan(80);
    expect(Math.abs(h.x - lizard.x)).toBeLessThan(120);
    expect(ringAt(t)!.alpha).toBeGreaterThan(0.5);
    expect(CAPTIONS.some((c) => captionAlpha(c, t) > 0.9)).toBe(true);
    for (const x of [h.x, grab.x, e.x]) expect(x).toBeGreaterThan(150);
  });

  it('lifts off: the eagle carries the snake up and out of frame by 3.2 s', () => {
    const [a, b] = [eagleAt(0.3)!, eagleAt(3.1)!];
    expect(b.y).toBeLessThan(a.y - 800);
    expect(b.x).toBeGreaterThan(1080);
    expect(eagleAt(3.6)!.alpha).toBeLessThan(1);
  });

  it('plays the hunt in order: strike, swallow, ring locks on, stoop', () => {
    expect(T_CATCH).toBeGreaterThan(T_NEW + 2);
    expect(T_LOCK).toBeGreaterThan(T_CATCH + 2);
    expect(T_DIVE).toBeGreaterThan(T_LOCK + 1);
    expect(ringAt(T_LOCK - 0.1)).toBeNull();
    expect(ringAt(T_LOCK + 0.2)!.r).toBeGreaterThan(ringAt(T_DIVE)!.r);
    expect(eagleAt(T_DIVE + 0.1)!.pose).toBe('stoop');
    expect(eagleAt(T_LOCK + 0.5)!.pose).toBe('hover');
    // The lizard is on the ground, then in the mouth, at the same place at the catch.
    const [before, after] = [agamaAt(T_CATCH - 0.01), agamaAt(T_CATCH + 0.01)];
    expect(Math.hypot(after.x - before.x, after.y - before.y)).toBeLessThan(40);
    // The new snake comes in from the bottom of the frame.
    expect(head(T_NEW).y).toBeGreaterThan(1500);
  });

  it('keeps every line of text inside the clear area, y 270..1250, and one at a time', () => {
    for (const c of CAPTIONS) {
      expect(c.y - c.size * 0.8, c.text).toBeGreaterThanOrEqual(270);
      expect(c.y + c.size * 0.3, c.text).toBeLessThanOrEqual(1250);
      expect(captionAlpha(c, END), c.text).toBe(0);
    }
    expect(CREDIT_TEXT.y).toBeLessThanOrEqual(1450);
    expect(CREDIT_TEXT.text).toBe('InkSnake · 16bit.ink/snake');
    for (const t of FRAMES) expect(CAPTIONS.filter((c) => captionAlpha(c, t) > 0).length, `at ${t}`).toBeLessThanOrEqual(1);
    expect(W).toBeGreaterThan(0);
  });

  it('says it with the game’s own sounds, on the loop, the strike and the eagle’s cry at their beats', () => {
    for (const s of SOUNDS) {
      expect(s.t).toBeGreaterThanOrEqual(0);
      expect(s.t).toBeLessThan(LOOP_S);
    }
    expect(SOUNDS.some((s) => s.id === 'strike' && s.t === T_CATCH)).toBe(true);
    expect(SOUNDS.some((s) => s.id === 'cry' && s.t > T_LOCK && s.t < T_DIVE)).toBe(true);
    expect(SOUNDS.some((s) => s.id === 'dive' && s.t < T_DIVE && s.t > T_LOCK)).toBe(true);
  });
});
