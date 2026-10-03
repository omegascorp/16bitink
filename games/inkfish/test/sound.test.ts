import { describe, expect, it } from 'vitest';
import { canPlay, itemSfx, MIN_GAP_MS, parseSoundSettings, pitchForSize, spatial } from '../src/audio/recipes';
import { ITEM_IDS, ITEM_INFO } from '../src/levels/items';

describe('sound recipes', () => {
  it('gulps lower for bigger prey, within a sane range', () => {
    expect(pitchForSize(10)).toBeGreaterThan(pitchForSize(60));
    for (const size of [1, 10, 40, 200, 2000]) {
      expect(pitchForSize(size)).toBeGreaterThanOrEqual(0.5);
      expect(pitchForSize(size)).toBeLessThanOrEqual(1.6);
    }
  });

  it('pans sounds toward their side of the screen and fades them with distance', () => {
    const view = { left: 0, right: 1000, top: 0, bottom: 600 };
    const centre = spatial({ x: 500, y: 300 }, view);
    expect(centre.pan).toBeCloseTo(0);
    expect(centre.gain).toBeCloseTo(1);
    expect(spatial({ x: 950, y: 300 }, view).pan).toBeGreaterThan(0.5);
    expect(spatial({ x: 50, y: 300 }, view).pan).toBeLessThan(-0.5);
    const near = spatial({ x: 1100, y: 300 }, view).gain;
    const far = spatial({ x: 3000, y: 300 }, view).gain;
    expect(near).toBeGreaterThan(far);
    expect(far).toBe(0);
    for (const x of [-5000, 0, 500, 5000]) expect(Math.abs(spatial({ x, y: 300 }, view).pan)).toBeLessThanOrEqual(1);
  });

  it('keeps one sound from stacking up when many things happen at once', () => {
    const last = new Map<string, number>();
    expect(canPlay('zap', 1000, last)).toBe(true);
    expect(canPlay('zap', 1000 + MIN_GAP_MS.zap - 1, last)).toBe(false);
    expect(canPlay('zap', 1000 + MIN_GAP_MS.zap, last)).toBe(true);
    expect(canPlay('eat', 1000, last)).toBe(true);
  });

  it('reads saved settings safely, sound on by default', () => {
    expect(parseSoundSettings(null)).toEqual({ muted: false });
    expect(parseSoundSettings('{"muted":true}')).toEqual({ muted: true });
    expect(parseSoundSettings('{"muted":"yes"}')).toEqual({ muted: false });
    expect(parseSoundSettings('not json')).toEqual({ muted: false });
  });

  it('cheers every bonus with the power-up sound, never the harmful items', () => {
    for (const id of ITEM_IDS) expect(itemSfx(id)[0] === 'powerup', id).toBe(ITEM_INFO[id].good);
    expect(itemSfx('firecracker')).toEqual(['powerup', 'boom']);
    expect(itemSfx('bag')).toEqual(['yuck']);
  });
});
