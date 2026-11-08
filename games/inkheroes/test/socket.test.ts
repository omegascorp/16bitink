import { describe, expect, it } from 'vitest';
import { drawPortrait, drawSocket, FACE, RIMS, SLOT } from '../src/scenes/battle/pixelFrames';

const at = (b: { data: Uint8ClampedArray; w: number }, x: number, y: number): number[] => [...b.data.subarray((y * b.w + x) * 4, (y * b.w + x) * 4 + 4)];

describe('a slot socket', () => {
  it('fills its whole square, warm and opaque', () => {
    const s = drawSocket(68, 'bronze');
    expect(s.w).toBe(68);
    for (let i = 3; i < s.data.length; i += 4) expect(s.data[i]).toBe(255);
    const [r, , b] = at(s, 34, 40);
    expect(r!).toBeGreaterThan(b!);
  });

  it('is lit from above: darker just under the top bevel than near the bottom', () => {
    const s = drawSocket(68, 'bronze');
    const row = (y: number): number => Array.from({ length: 30 }, (_, i) => at(s, 19 + i, y)[0]!).reduce((a, b) => a + b, 0);
    expect(row(5)).toBeLessThan(row(60));
  });

  it('takes the colour of its rim, and comes out the same each time', () => {
    expect(at(drawSocket(36, 'gold'), 10, 1)).not.toEqual(at(drawSocket(36, 'bronze'), 10, 1));
    expect(drawSocket(36, 'gold').data).toEqual(drawSocket(36, 'gold').data);
    expect(at(drawSocket(36, 'player'), 10, 1).slice(0, 3)).toEqual([...RIMS.player.light].slice(0, 3));
  });

  it('sits a face in it, with the well showing through where the face is clear', () => {
    const clear = { data: new Uint8ClampedArray(FACE * FACE * 4), w: FACE, h: FACE };
    const p = drawPortrait(clear, 'bronze', false, false);
    expect(p.w).toBe(SLOT);
    expect(p.data).toEqual(drawSocket(SLOT, 'bronze').data);
  });
});
