import { describe, expect, it } from 'vitest';
import { BASS, BASS_START, bassTucked, stepBass, type BassSense, type BassState } from '../src/logic/bosses/bass';

const sense = (over: Partial<BassSense> = {}): BassSense => ({
  now: 1000, rel: 'hunt', dist: 2000, seen: true, inPatch: null, playerPatch: null, goal: 2, ...over,
});

/** Runs steps in order, each with its own senses. */
const run = (start: BassState, steps: readonly Partial<BassSense>[]): BassState => steps.reduce((s, o) => stepBass(s, sense(o)), start);

describe('striped bass: hunting from the weed', () => {
  it('makes for the patch near you, then lies in wait inside it', () => {
    const heading = stepBass(BASS_START, sense());
    expect(heading).toMatchObject({ mode: 'roam', patch: 2 });
    expect(stepBass(heading, sense({ inPatch: 2 }))).toMatchObject({ mode: 'lurk', patch: 2 });
  });

  it('shivers the weed, then bursts out, then gets its breath back', () => {
    const lurking = run(BASS_START, [{}, { inPatch: 2 }]);
    const tense = stepBass(lurking, sense({ inPatch: 2, dist: 200 }));
    expect(tense.mode).toBe('tense');
    // Committed: the strike comes even if you've moved off.
    expect(stepBass(tense, sense({ now: 1000 + BASS.tenseMs - 1, dist: 900 })).mode).toBe('tense');
    const burst = stepBass(tense, sense({ now: 1000 + BASS.tenseMs, dist: 900 }));
    expect(burst.mode).toBe('burst');
    const tired = stepBass(burst, sense({ now: burst.until }));
    expect(tired.mode).toBe('recover');
    expect(stepBass(tired, sense({ now: tired.until })).mode).toBe('roam');
  });

  it('rests between strikes, going back to the weed first', () => {
    const tense = run(BASS_START, [{}, { inPatch: 2 }, { inPatch: 2, dist: 200 }]);
    const burst = stepBass(tense, sense({ now: tense.until }));
    const tired = stepBass(burst, sense({ now: burst.until }));
    const roaming = stepBass(tired, sense({ now: tired.until, dist: 150 }));
    expect(roaming.mode).toBe('roam');
    expect(stepBass(roaming, sense({ now: tired.until + 100, dist: 150 })).mode).toBe('roam');
    expect(stepBass(roaming, sense({ now: roaming.strikeAt, dist: 150 })).mode).toBe('tense');
  });

  it("doesn't strike at what it can't see", () => {
    const lurking = run(BASS_START, [{}, { inPatch: 2 }]);
    expect(stepBass(lurking, sense({ inPatch: 2, dist: 120, seen: false })).mode).toBe('lurk');
  });

  it('moves to weed nearer you when you swim far off', () => {
    const lurking = run(BASS_START, [{}, { inPatch: 2 }]);
    expect(stepBass(lurking, sense({ inPatch: 2, goal: 5, dist: 1200 }))).toMatchObject({ mode: 'roam', patch: 5 });
    expect(stepBass(lurking, sense({ inPatch: 2, goal: 5, dist: 600 })).mode).toBe('lurk');
  });

  it('lunges from open water when there is no weed', () => {
    expect(stepBass(BASS_START, sense({ goal: null, dist: 200 })).mode).toBe('tense');
  });

  it('leaves you be when you are its size', () => {
    const lurking = run(BASS_START, [{}, { inPatch: 2 }]);
    expect(stepBass(lurking, sense({ inPatch: 2, dist: 100, rel: 'even' })).mode).toBe('lurk');
  });

  it('is out of reach only while tucked in the weed', () => {
    expect(bassTucked('lurk') && bassTucked('tense') && bassTucked('tucked')).toBe(true);
    expect(bassTucked('burst') || bassTucked('flushed') || bassTucked('flee') || bassTucked('recover')).toBe(false);
  });
});

describe('striped bass: hiding once you are bigger', () => {
  it('bolts for weed and tucks itself in', () => {
    const fleeing = stepBass(BASS_START, sense({ rel: 'hide', goal: 3 }));
    expect(fleeing).toMatchObject({ mode: 'flee', patch: 3 });
    expect(stepBass(fleeing, sense({ rel: 'hide', goal: 3, inPatch: 3 })).mode).toBe('tucked');
  });

  it('is flushed out when you swim into its patch, and shuns that patch for a while', () => {
    const tucked = run(BASS_START, [{ rel: 'hide', goal: 3 }, { rel: 'hide', goal: 3, inPatch: 3 }]);
    const flushed = stepBass(tucked, sense({ rel: 'hide', goal: 3, inPatch: 3, playerPatch: 3 }));
    expect(flushed).toMatchObject({ mode: 'flushed', shunned: 3 });
    const onward = stepBass(flushed, sense({ rel: 'hide', goal: 4, now: flushed.until }));
    expect(onward).toMatchObject({ mode: 'flee', patch: 4, shunned: 3 });
    expect(stepBass(onward, sense({ rel: 'hide', goal: 4, now: flushed.shunUntil })).shunned).toBeNull();
  });

  it('stays put while you are in some other patch', () => {
    const tucked = run(BASS_START, [{ rel: 'hide', goal: 3 }, { rel: 'hide', goal: 3, inPatch: 3 }]);
    expect(stepBass(tucked, sense({ rel: 'hide', goal: 3, inPatch: 3, playerPatch: 1 })).mode).toBe('tucked');
  });

  it('drops its ambush the moment you outgrow it', () => {
    const tense = run(BASS_START, [{}, { inPatch: 2 }, { inPatch: 2, dist: 200 }]);
    expect(stepBass(tense, sense({ rel: 'hide', goal: 2 })).mode).toBe('flee');
  });
});
