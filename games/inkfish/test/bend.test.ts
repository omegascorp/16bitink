import { describe, expect, it } from 'vitest';
import { alongBody, BEND, bendOffset, bendStyleOf, swayAt, inkedRows } from '../src/logic/bend';
import { bendsToSwim } from '../src/art/textures';

describe('bending swimmers', () => {
  it('measures along the body from the nose (facing right) to the tail tip', () => {
    expect(alongBody(228, 128, 100)).toBe(0);
    expect(alongBody(128, 128, 100)).toBe(0.5);
    expect(alongBody(28, 128, 100)).toBe(1);
    expect(alongBody(0, 128, 100)).toBe(1);
  });

  it('keeps the head steady and swings the tail most', () => {
    for (const style of [BEND.eel, BEND.taper]) {
      const nose = swayAt(0, 100, style);
      const mid = swayAt(0.5, 100, style);
      const tip = swayAt(1, 100, style);
      expect(nose).toBeLessThan(mid);
      expect(mid).toBeLessThan(tip);
    }
  });

  it('holds a tapering tail straight in front, and lets an eel ripple all along', () => {
    expect(swayAt(0.2, 100, BEND.taper)).toBe(0);
    expect(swayAt(0.2, 100, BEND.eel)).toBeGreaterThan(0);
  });

  it('runs the wave from head to tail as the stroke goes on', () => {
    const style = BEND.eel;
    // The crest at the head now reaches further down the body a moment later.
    const crestAt = (phase: number): number => {
      let best = 0;
      let at = 0;
      for (let t = 0; t <= 1; t += 0.01) {
        const y = bendOffset(t, 1, 1, phase, style);
        if (y > best) [best, at] = [y, t];
      }
      return at;
    };
    expect(crestAt(Math.PI / 2 + 1)).toBeGreaterThan(crestAt(Math.PI / 2 + 0.5));
  });

  it('ripples the longest, thinnest and wavy-drawn fish like eels, and sweeps the rest from mid-body', () => {
    expect(bendStyleOf(92, 8, false)).toBe(BEND.eel);
    expect(bendStyleOf(66, 31, true)).toBe(BEND.eel);
    expect(bendStyleOf(80, 13, false)).toBe(BEND.taper);
  });

  it('lies still with no beat', () => {
    expect(Math.abs(bendOffset(1, 50, 0, 1.2, BEND.taper))).toBe(0);
  });

  it('bends the fish that have no tail fin to swing, and only those', () => {
    for (const eel of ['snipeeel', 'cuskeel', 'rattail', 'ghostshark', 'moray', 'oarfish'] as const) expect(bendsToSwim(eel)).toBe(true);
    for (const finned of ['bristlemouth', 'angler', 'tripodfish', 'minnow'] as const) expect(bendsToSwim(finned)).toBe(false);
    // Long and thin with a tail fin: still bends, fin and all.
    for (const stick of ['pipefish', 'sandlance', 'needlefish', 'dragonfish'] as const) expect(bendsToSwim(stick)).toBe(true);
    expect(bendsToSwim('giantsquid')).toBe(false);
  });
});

describe('inked rows', () => {
  const image = (w: number, h: number, inked: readonly [number, number][]): Uint8ClampedArray => {
    const data = new Uint8ClampedArray(w * h * 4);
    for (const [x, y] of inked) data[(y * w + x) * 4 + 3] = 255;
    return data;
  };

  it('spans the first to the last row with ink', () => {
    expect(inkedRows(image(4, 10, [[1, 3], [2, 6], [0, 4]]), 4)).toEqual({ top: 3, bottom: 7 });
  });

  it('ignores faint specks and finds nothing in a blank image', () => {
    const faint = image(4, 10, []);
    faint[(5 * 4 + 1) * 4 + 3] = 5;
    expect(inkedRows(faint, 4)).toBeNull();
  });
});
