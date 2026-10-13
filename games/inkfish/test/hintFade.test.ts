import { describe, expect, it } from 'vitest';
import { behind, FADED, hintAlpha } from '../src/logic/hintFade';

const hint = { x: 100, y: 50, w: 200, h: 60 };

describe('behind', () => {
  it('is true when the player overlaps the hint', () => {
    expect(behind(hint, { x: 150, y: 70, w: 20, h: 20 }, 0)).toBe(true);
  });

  it('is false when the player is well clear', () => {
    expect(behind(hint, { x: 150, y: 300, w: 20, h: 20 }, 0)).toBe(false);
    expect(behind(hint, { x: 400, y: 70, w: 20, h: 20 }, 0)).toBe(false);
  });

  it('counts a player just outside the hint, within the margin', () => {
    const below = { x: 150, y: 120, w: 20, h: 20 };
    expect(behind(hint, below, 0)).toBe(false);
    expect(behind(hint, below, 16)).toBe(true);
  });
});

describe('hintAlpha', () => {
  it('fades towards FADED while the player is behind', () => {
    const a = hintAlpha(1, true, 50);
    expect(a).toBeLessThan(1);
    expect(a).toBeGreaterThan(FADED);
  });

  it('comes back towards solid once the player is clear', () => {
    const a = hintAlpha(FADED, false, 50);
    expect(a).toBeGreaterThan(FADED);
    expect(a).toBeLessThan(1);
  });

  it('settles on its target after a long frame, never overshooting', () => {
    expect(hintAlpha(1, true, 5000)).toBe(FADED);
    expect(hintAlpha(FADED, false, 5000)).toBe(1);
  });
});
