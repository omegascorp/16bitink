import type { SfxId } from '../../../src/audio/recipes';
import type { CustomId } from './sounds';
import { AT, LOOP_S } from './story';
import { TEMPO, WORDS, type Word } from './words';

/** The captions (the voiceover a few words at a time) and the sound cues under the voice. */

// ---------------------------------------------------------------- captions

export interface Line {
  readonly words: readonly Word[];
  /** Shown from its first word until the next line takes over. */
  readonly from: number;
  readonly to: number;
}

/** Words per line, broken where the narrator breathes, at most four; "BLACK." and "WRONG." get lines of their own. */
const LINE_WORDS: readonly number[] = [3, 3, 3, 1, 3, 2, 3, 3, 3, 2, 4, 2, 2, 2, 3, 2, 2, 2, 2, 1, 2, 3, 1, 2, 4];

export const LINES: readonly Line[] = (() => {
  const groups: Word[][] = [];
  let at = 0;
  for (const n of LINE_WORDS) {
    groups.push(WORDS.slice(at, at + n));
    at += n;
  }
  if (at !== WORDS.length) throw new Error(`the caption lines take ${at} words, the voiceover has ${WORDS.length}`);
  return groups.map((g, i) => ({
    words: g,
    // The first line is up from the loop's first frame.
    from: i === 0 ? 0 : g[0]!.start / TEMPO,
    to: i + 1 < groups.length ? groups[i + 1]![0]!.start / TEMPO : LOOP_S,
  }));
})();

/** The line on screen at time t, and the word being said in it (-1: none yet). */
export function captionAt(t: number): { readonly line: Line; readonly word: number } | null {
  const line = LINES.find((l) => t >= l.from && t < l.to);
  if (!line) return null;
  // The loop opens on the hook's first word, a moment before the voice reaches it.
  let word = line === LINES[0] ? 0 : -1;
  line.words.forEach((w, i) => {
    if (t >= w.start / TEMPO) word = i;
  });
  return { line, word };
}

// ---------------------------------------------------------------- sounds

export interface SoundCue {
  /** One of the game's own effects, or one of this short's (sounds.ts). */
  readonly id: SfxId | CustomId;
  readonly t: number;
  readonly pitch: number;
  readonly gain: number;
  readonly pan: number;
}

const cue = (id: SfxId | CustomId, t: number, pitch: number, gain: number, pan = 0): SoundCue => ({ id, t: ((t % LOOP_S) + LOOP_S) % LOOP_S, pitch, gain, pan });

/** Twinkles across the starfield as the red dwarfs flare: a high, scattered pentatonic. */
const TWINKLES: readonly SoundCue[] = [0, 1, 2, 3, 4, 5, 6].map((k) =>
  cue('twinkle', AT.red - 0.1 + k * 0.19, [1, 9 / 8, 5 / 4, 3 / 2, 5 / 3, 2, 3 / 2][k]!, 0.5, ((k * 5) % 7) / 3.5 - 1));

/** The colours sinking into the black leaf: a soft shimmer each, falling as the light goes. */
const SINKS: readonly SoundCue[] = [0, 1, 2, 3, 4, 5].map((i) => cue('shimmer', AT.soak + 0.5 + i * 0.17, 1.2 - i * 0.06, 0.5, -0.6 + i * 0.24));

/**
 * Quiet under the voice, but each beat its own mood: the low drone of the
 * red sun (bed.ts) with a deep hit on "BLACK"; a whoosh out to the stars and
 * twinkles; shimmers as the colours sink into the leaf; a bright sting for
 * the page; a comic boing; a hard stamp thud and a deflating wah; a hush
 * back into the forest.
 */
export const SOUNDS: readonly SoundCue[] = [
  cue('hit', AT.black + 0.02, 1, 0.5),
  cue('blast', AT.black + 0.02, 0.8, 0.22),
  cue('whoosh', AT.most - 0.05, 1, 0.8),
  cue('swell', AT.most + 0.3, 0.5, 0.7),
  ...TWINKLES,
  cue('dull', AT.dim, 0.7, 0.5),
  cue('rise', AT.a - 0.35, 1, 0.6),
  cue('swell', AT.a + 0.2, 1, 0.7),
  ...SINKS,
  cue('swell', AT.pitch - 0.1, 0.75, 0.6),
  cue('sting', AT.nasa - 0.05, 1, 1),
  cue('mended', AT.nasa, 1.5, 0.6),
  cue('tick', AT.scientists + 0.1, 1, 1.2),
  cue('tick', AT.worked, 1.2, 1.2),
  cue('find', AT.out, 1.3, 0.6),
  cue('pop', AT.our - 0.05, 1, 1),
  cue('ore', AT.ourPlants + 0.05, 1.5, 0.5),
  cue('boing', AT.bounce, 1, 1),
  cue('boing', AT.straight + 0.05, 1.35, 0.6),
  cue('pop', AT.earths - 0.05, 1.3, 0.8),
  cue('stamp', AT.wrong, 1, 0.36),
  cue('crumbleHard', AT.wrong + 0.01, 0.7, 0.5),
  cue('wah', AT.wrong + 0.2, 1, 1),
  cue('hush', AT.outThere - 0.3, 1, 1),
  cue('swell', AT.outThere, 0.5, 0.6),
];
