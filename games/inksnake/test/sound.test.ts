import { describe, expect, it } from 'vitest';
import { canPlay, MIN_GAP_MS, parseSoundSettings, pitchForMeal, SFX_IDS } from '../src/audio/recipes';
import { hasRecipe, LEVEL } from '../src/audio/synth';

describe('sound', () => {
  it('has a recipe, a level and a gap for every effect', () => {
    for (const id of SFX_IDS) {
      expect(hasRecipe(id), id).toBe(true);
      expect(LEVEL[id], id).toBeGreaterThan(0);
      expect(MIN_GAP_MS[id], id).toBeGreaterThan(0);
    }
  });

  it('has no recipe or level left over for a sound that does not exist', () => {
    expect(Object.keys(LEVEL).sort()).toEqual([...SFX_IDS].sort());
    expect(hasRecipe('pop')).toBe(false);
  });

  it('pitches small meals higher than big ones, within bounds', () => {
    expect(pitchForMeal(13)).toBeGreaterThan(pitchForMeal(30));
    expect(pitchForMeal(1)).toBeLessThanOrEqual(1.5);
    expect(pitchForMeal(1000)).toBeGreaterThanOrEqual(0.55);
  });

  it('throttles repeats', () => {
    const last = new Map<string, number>();
    expect(canPlay('gulp', 0, last)).toBe(true);
    expect(canPlay('gulp', 10, last)).toBe(false);
    expect(canPlay('gulp', MIN_GAP_MS.gulp + 1, last)).toBe(true);
  });

  it('reads saved settings defensively', () => {
    expect(parseSoundSettings(null).muted).toBe(false);
    expect(parseSoundSettings('{"muted":true}').muted).toBe(true);
    expect(parseSoundSettings('{"muted":"yes"}').muted).toBe(false);
    expect(parseSoundSettings('null').muted).toBe(false);
    expect(parseSoundSettings('nonsense').muted).toBe(false);
  });
});
