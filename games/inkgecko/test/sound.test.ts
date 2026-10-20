import { describe, expect, it } from 'vitest';
import { canPlay, parseSoundSettings, pitchForCombo, SFX_IDS } from '../src/audio/recipes';
import { hasRecipe, LEVEL } from '../src/audio/synth';

describe('sound', () => {
  it('has a recipe and a level for every effect', () => {
    for (const id of SFX_IDS) {
      expect(hasRecipe(id), id).toBe(true);
      expect(LEVEL[id], id).toBeGreaterThan(0);
    }
  });

  it('pitches each combo link a step higher', () => {
    expect(pitchForCombo(0)).toBe(1);
    expect(pitchForCombo(1)).toBeGreaterThan(pitchForCombo(0));
    expect(pitchForCombo(4)).toBeGreaterThan(pitchForCombo(3));
    expect(pitchForCombo(50)).toBe(pitchForCombo(9));
  });

  it('throttles repeats', () => {
    const last = new Map<string, number>();
    expect(canPlay('pop', 0, last)).toBe(true);
    expect(canPlay('pop', 10, last)).toBe(false);
    expect(canPlay('pop', 100, last)).toBe(true);
  });

  it('reads saved settings defensively', () => {
    expect(parseSoundSettings(null).muted).toBe(false);
    expect(parseSoundSettings('{"muted":true}').muted).toBe(true);
    expect(parseSoundSettings('nonsense').muted).toBe(false);
  });
});
