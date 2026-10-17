import { describe, expect, it } from 'vitest';
import { farSound, landGain, LAND_MIN_VY } from '../src/audio/hearing';
import { depthShade, MOODS, nextBell } from '../src/audio/mood';
import { newsSound } from '../src/audio/news';
import { canPlay, MIN_GAP_MS, orePitch, parseSoundSettings, SFX_IDS, SOUND_KEY, voicePlan } from '../src/audio/recipes';
import { SoundBoard } from '../src/audio/sound';
import { LEVEL } from '../src/audio/synth';
import { createRng } from '../src/logic/rng';
import { ORE_KINDS } from '../src/logic/ore';

/** A store kept in a map, as localStorage would be. */
function memoryStore(init: Record<string, string> = {}): { getItem(k: string): string | null; setItem(k: string, v: string): void; data: Map<string, string> } {
  const data = new Map(Object.entries(init));
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v) };
}

describe('sound effects', () => {
  it('every sound has a gap and a level', () => {
    for (const id of SFX_IDS) {
      expect(MIN_GAP_MS[id]).toBeGreaterThan(0);
      expect(LEVEL[id]).toBeGreaterThan(0);
    }
  });

  it('throttles a sound played again too soon, but not other sounds', () => {
    const last = new Map<string, number>();
    expect(canPlay('grindSoft', 1000, last)).toBe(true);
    expect(canPlay('grindSoft', 1000 + MIN_GAP_MS.grindSoft - 1, last)).toBe(false);
    expect(canPlay('ore', 1001, last)).toBe(true);
    expect(canPlay('grindSoft', 1000 + MIN_GAP_MS.grindSoft, last)).toBe(true);
  });

  it('keeps continuous drilling a gentle texture: at most about five grinds a second', () => {
    const last = new Map<string, number>();
    let played = 0;
    for (let t = 0; t < 1000; t += 16) if (canPlay('grindSoft', t, last)) played++;
    expect(played).toBeLessThanOrEqual(5);
    expect(played).toBeGreaterThanOrEqual(3);
  });

  it('gives each ore its own note of the pentatonic, and unknown ids the root', () => {
    const pitches = ORE_KINDS.map((o) => orePitch(o.id));
    expect(new Set(pitches).size).toBe(pitches.length);
    for (const p of pitches) expect(p).toBeGreaterThanOrEqual(1);
    expect(orePitch(0)).toBe(1);
    expect(orePitch(-3)).toBe(1);
    expect(orePitch(1.5)).toBe(1);
    expect(orePitch(18)).toBe(orePitch(1));
  });
});

describe('saved sound settings', () => {
  it('reads muted only when it says so; anything else is sound on', () => {
    expect(parseSoundSettings(JSON.stringify({ muted: true }))).toEqual({ muted: true });
    expect(parseSoundSettings(JSON.stringify({ muted: false }))).toEqual({ muted: false });
    expect(parseSoundSettings(null)).toEqual({ muted: false });
    expect(parseSoundSettings('not json')).toEqual({ muted: false });
    expect(parseSoundSettings('"muted"')).toEqual({ muted: false });
    expect(parseSoundSettings(JSON.stringify({ muted: 'yes' }))).toEqual({ muted: false });
  });

  it('the sound board remembers mute in storage and tells whoever listens, without Web Audio', () => {
    const store = memoryStore();
    const board = new SoundBoard(store);
    expect(board.muted).toBe(false);
    const heard: boolean[] = [];
    const stop = board.onMuteChange((m) => heard.push(m));
    board.setMuted(true);
    expect(board.muted).toBe(true);
    expect(parseSoundSettings(store.data.get(SOUND_KEY) ?? null).muted).toBe(true);
    stop();
    board.setMuted(false);
    expect(heard).toEqual([true]);
    expect(new SoundBoard(memoryStore({ [SOUND_KEY]: JSON.stringify({ muted: true }) })).muted).toBe(true);
    board.destroy();
  });

  it('never throws where there is no audio or storage is blocked', () => {
    const blocked = { getItem: (): string | null => { throw new Error('blocked'); }, setItem: (): void => { throw new Error('blocked'); } };
    const board = new SoundBoard(blocked);
    expect(() => {
      board.play('ore', { pitch: 2 });
      board.speak(9, 11);
      board.hold('jet', true);
      board.hold('jet', false);
      board.setMood('planet');
      board.setDepth(40);
      board.setMuted(true);
      board.destroy();
    }).not.toThrow();
    expect(new SoundBoard(undefined).muted).toBe(false);
  });
});

describe('the ambience', () => {
  it('is full at the surface, and quieter and darker the deeper you dig', () => {
    expect(depthShade(0)).toEqual({ level: 1, cutoff: 1, wind: 1 });
    let prev = depthShade(0);
    for (const d of [5, 20, 50, 90]) {
      const s = depthShade(d);
      expect(s.level).toBeLessThan(prev.level);
      expect(s.cutoff).toBeLessThan(prev.cutoff);
      prev = s;
    }
    expect(depthShade(500)).toEqual(depthShade(90));
    expect(depthShade(90).level).toBeGreaterThan(0.3);
  });

  it('hushes the wind a few metres down', () => {
    expect(depthShade(3).wind).toBeGreaterThan(0);
    expect(depthShade(10).wind).toBe(0);
  });

  it('treats a nonsense depth as the surface', () => {
    expect(depthShade(Number.NaN)).toEqual(depthShade(0));
    expect(depthShade(-4)).toEqual(depthShade(0));
  });

  it('only the planet has wind; the star map rings most often', () => {
    expect(MOODS.planet.wind).toBeGreaterThan(0);
    expect(MOODS.ship.wind).toBe(0);
    expect(MOODS.space.wind).toBe(0);
    expect(MOODS.space.bellGap[1]).toBeLessThan(MOODS.planet.bellGap[1]);
  });

  it('spaces far-off tones within the mood gap', () => {
    const [lo, hi] = MOODS.planet.bellGap;
    expect(nextBell(MOODS.planet, 0)).toBe(lo);
    expect(nextBell(MOODS.planet, 0.999)).toBeLessThanOrEqual(hi);
    expect(nextBell(MOODS.planet, 5)).toBe(hi);
  });
});

describe('the radio voice', () => {
  it('is the same line for the same seed, and a different one for another', () => {
    expect(voicePlan(9, 11, createRng)).toEqual(voicePlan(9, 11, createRng));
    expect(voicePlan(9, 12, createRng)).not.toEqual(voicePlan(9, 11, createRng));
  });

  it('speaks slow, low words one after another, with quiet between', () => {
    const plan = voicePlan(9, 11, createRng);
    expect(plan).toHaveLength(9);
    for (const [i, w] of plan.entries()) {
      expect(w.from).toBeLessThan(250);
      expect(w.dur).toBeGreaterThan(0.3);
      if (i > 0) expect(w.start).toBeGreaterThan(plan[i - 1]!.start + plan[i - 1]!.dur);
    }
  });

  it('keeps a line to a phrase', () => {
    expect(voicePlan(100, 1, createRng).length).toBeLessThanOrEqual(12);
    expect(voicePlan(-2, 1, createRng)).toEqual([]);
  });
});

describe('hearing the world', () => {
  it('a step down is silent; harder landings are louder', () => {
    expect(landGain(LAND_MIN_VY - 1)).toBe(0);
    expect(landGain(Number.NaN)).toBe(0);
    expect(landGain(300)).toBeGreaterThan(0);
    expect(landGain(500)).toBeGreaterThan(landGain(300));
    expect(landGain(10_000)).toBe(1);
  });

  it('a far blast is fainter, but never silent, and panned to its side', () => {
    expect(farSound(0, 0)).toEqual({ gain: 1, pan: 0 });
    expect(farSound(10, 0).gain).toBeLessThan(1);
    expect(farSound(100, 100).gain).toBe(0.25);
    expect(farSound(-20, 0).pan).toBeLessThan(0);
    expect(farSound(20, 0).pan).toBeGreaterThan(0);
  });
});

describe('news aboard', () => {
  it('a warm chord for anything printed, repaired or mended', () => {
    expect(newsSound('Printed: Drill Mk 1!')).toBe('mended');
    expect(newsSound('Printer repaired!')).toBe('mended');
    expect(newsSound('Telescope mended!')).toBe('mended');
    expect(newsSound('The drive core is in!')).toBe('mended');
  });

  it('a rising tone for a tank or the suit filled, a dull one for a no', () => {
    expect(newsSound('Tank filled')).toBe('fed');
    expect(newsSound("Ship's tank filled")).toBe('fed');
    expect(newsSound('Air + water ice')).toBe('fed');
    expect(newsSound('Life support is full')).toBe('dull');
    expect(newsSound('No graphite in the bag')).toBe('dull');
  });

  it('nothing for other news, or none', () => {
    expect(newsSound('Call recorded')).toBeNull();
    expect(newsSound(undefined)).toBeNull();
    expect(newsSound('')).toBeNull();
  });
});
