import { describe, expect, it } from 'vitest';
import { cropFor, easeToward } from '../src/logic/clips/crop';

describe('clip crop', () => {
  it('cuts a 9:16 strip out of a wide screen, full height, centred on the fish', () => {
    const r = cropFor(1920, 1080, 960, 540);
    expect(r.h).toBe(1080);
    expect(r.w / r.h).toBeCloseTo(9 / 16, 2);
    expect(r.x + r.w / 2).toBeCloseTo(960, 0);
    expect(r.y).toBe(0);
  });

  it('stays inside the screen when the fish is near an edge', () => {
    const left = cropFor(1920, 1080, 30, 540);
    expect(left.x).toBe(0);
    const right = cropFor(1920, 1080, 1900, 540);
    expect(right.x + right.w).toBe(1920);
  });

  it('on a tall phone screen, uses the full width and slides up and down', () => {
    const r = cropFor(1170, 2532, 585, 300);
    expect(r.w).toBe(1170);
    expect(r.h / r.w).toBeCloseTo(16 / 9, 2);
    expect(r.y).toBe(0);
    const low = cropFor(1170, 2532, 585, 2500);
    expect(low.y + low.h).toBe(2532);
  });

  it('uses whole pixels', () => {
    const r = cropFor(1366, 768, 683.4, 384.2);
    for (const v of [r.x, r.y, r.w, r.h]) expect(Number.isInteger(v)).toBe(true);
  });

  it('eases toward a target without overshooting', () => {
    expect(easeToward(0, 100, 0.016, 6)).toBeGreaterThan(0);
    expect(easeToward(0, 100, 0.016, 6)).toBeLessThan(100);
    expect(easeToward(0, 100, 10, 6)).toBe(100);
  });
});
