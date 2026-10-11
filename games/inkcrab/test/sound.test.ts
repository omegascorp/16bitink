import { describe, expect, it } from 'vitest';
import { canPlay, MIN_GAP_MS, parseSoundSettings, pitchForSize, SFX_IDS, spatial } from '../src/audio/recipes';
import { hasRecipe } from '../src/audio/synth';

describe('sound recipes', () => {
  it('has a recipe and a throttle for every sound', () => {
    for (const id of SFX_IDS) {
      expect(hasRecipe(id), id).toBe(true);
      expect(MIN_GAP_MS[id], id).toBeGreaterThan(0);
    }
  });

  it('crunches lower for a bigger meal, within a sane range', () => {
    expect(pitchForSize(1)).toBeGreaterThan(pitchForSize(6));
    for (const size of [0, 1, 4, 9, 40]) {
      expect(pitchForSize(size)).toBeGreaterThanOrEqual(0.6);
      expect(pitchForSize(size)).toBeLessThanOrEqual(1.5);
    }
  });

  it('pans sounds toward their side of the screen and fades them with distance', () => {
    const view = { left: 0, right: 1000, top: 0, bottom: 600 };
    const centre = spatial({ x: 500, y: 300 }, view);
    expect(centre.pan).toBeCloseTo(0);
    expect(centre.gain).toBeCloseTo(1);
    expect(spatial({ x: 950, y: 300 }, view).pan).toBeGreaterThan(0.5);
    expect(spatial({ x: 50, y: 300 }, view).pan).toBeLessThan(-0.5);
    expect(spatial({ x: 1100, y: 300 }, view).gain).toBeGreaterThan(spatial({ x: 3000, y: 300 }, view).gain);
    expect(spatial({ x: 3000, y: 300 }, view).gain).toBe(0);
  });

  it('keeps one sound from stacking up when many things happen at once', () => {
    const last = new Map<string, number>();
    expect(canPlay('dig', 1000, last)).toBe(true);
    expect(canPlay('dig', 1000 + MIN_GAP_MS.dig - 1, last)).toBe(false);
    expect(canPlay('dig', 1000 + MIN_GAP_MS.dig, last)).toBe(true);
    expect(canPlay('eat', 1000, last)).toBe(true);
  });

  it('reads saved settings safely, sound on by default', () => {
    expect(parseSoundSettings(null)).toEqual({ muted: false });
    expect(parseSoundSettings('{"muted":true}')).toEqual({ muted: true });
    expect(parseSoundSettings('{"muted":"yes"}')).toEqual({ muted: false });
    expect(parseSoundSettings('not json')).toEqual({ muted: false });
  });
});
