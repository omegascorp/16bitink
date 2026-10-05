import { describe, expect, it } from 'vitest';
import { capsuleOf, capsulesTouch, capsuleTouchesCircle, type Capsule } from '../src/logic/body';
import { createRng } from '../src/logic/rng';

// A slim fish: 4x longer than tall, drawn at scale 1.
const slim = { hl: 80, hh: 20 };
const at = (x: number, y: number, rotation = 0, flipped = false) => capsuleOf({ x, y, rotation, flipped, scale: 1 }, slim);

describe('fish body capsules', () => {
  it('spans nose to tail stalk along the facing', () => {
    const c = at(0, 0);
    expect(c.r).toBeCloseTo(18);
    expect(c.ax + c.r).toBeCloseTo(80);
    expect(c.bx - c.r).toBeCloseTo(-80);
    expect(c.ay).toBe(0);
    const left = at(0, 0, 0, true);
    expect(left.ax).toBeLessThan(0);
  });

  it('does not touch above a slim fish, where the old circle did', () => {
    // 50 px above the centre: inside an 80 px circle, clear of a 20 px tall body.
    expect(capsuleTouchesCircle(at(0, 0), 0, -50, 10)).toBe(false);
    expect(capsuleTouchesCircle(at(0, 0), 0, -25, 10)).toBe(true);
  });

  it('touches along the whole length, nose to tail', () => {
    expect(capsuleTouchesCircle(at(0, 0), 85, 0, 10)).toBe(true);
    expect(capsuleTouchesCircle(at(0, 0), -85, 0, 10)).toBe(true);
    expect(capsuleTouchesCircle(at(0, 0), 110, 0, 10)).toBe(false);
  });

  it('follows rotation (a fish hanging nose-up from a hook)', () => {
    const up = at(0, 0, -Math.PI / 2);
    expect(capsuleTouchesCircle(up, 0, -85, 10)).toBe(true);
    expect(capsuleTouchesCircle(up, 60, 0, 10)).toBe(false);
  });

  it('finds crossing, parallel and separated bodies', () => {
    expect(capsulesTouch(at(0, 0), at(0, 0, Math.PI / 2))).toBe(true);
    expect(capsulesTouch(at(0, 0), at(0, 30))).toBe(true);
    expect(capsulesTouch(at(0, 0), at(0, 45))).toBe(false);
    expect(capsulesTouch(at(0, 0), at(170, 0))).toBe(false);
    expect(capsulesTouch(at(0, 0), at(150, 0))).toBe(true);
  });

  it('demands a deeper overlap with a smaller factor', () => {
    expect(capsulesTouch(at(0, 0), at(0, 30), 1)).toBe(true);
    expect(capsulesTouch(at(0, 0), at(0, 30), 0.6)).toBe(false);
  });

  it('the far-apart early-out never changes an answer', () => {
    // Brute force: sample both segments densely and take the closest pair.
    const pointOn = (c: Capsule, t: number) => ({ x: c.ax + (c.bx - c.ax) * t, y: c.ay + (c.by - c.ay) * t });
    const STEPS = 200;
    const gap = (a: Capsule, b: Capsule): number => {
      let best = Infinity;
      for (let i = 0; i <= STEPS; i++) {
        const p = pointOn(a, i / STEPS);
        for (let k = 0; k <= STEPS; k += 4) {
          const q = pointOn(b, k / STEPS);
          best = Math.min(best, Math.hypot(p.x - q.x, p.y - q.y));
        }
      }
      return best;
    };
    const rng = createRng(7);
    const random = (): Capsule => capsuleOf(
      { x: rng() * 400, y: rng() * 400, rotation: rng() * Math.PI * 2, flipped: rng() < 0.5, scale: 0.3 + rng() * 1.5 }, slim);
    let checked = 0;
    for (let n = 0; n < 300; n++) {
      const a = random();
      const b = random();
      const d = gap(a, b);
      const reach = a.r + b.r;
      // Skip near-boundary pairs, where sampling error could flip the brute-force answer.
      if (Math.abs(d - reach) < 2) continue;
      expect(capsulesTouch(a, b)).toBe(d < reach);
      checked++;
    }
    expect(checked).toBeGreaterThan(200);
  });
});
