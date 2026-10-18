import type { SfxId } from '../../../src/audio/recipes';
import {
  AND_AT, ANY_AT, BONES_AT, BRAIN_AT, BUT_AT, CUTER_AT, DAYS, GONE_AT, GROWS_AT, HEART_AT, HONESTLY_AT, LAPSE, LEG_AT, LEGS_AT, LOOP_S, MEXICO_AT, MINECRAFT_AT,
  MUSCLES_AT, PUPPY_AT, REAL_AT, toeAt, TOE_COUNT, WHAT_AT, WILD_AT, YES_AT,
} from './story';
import { TEMPO, WORDS, type Word } from './words';

/** The captions (the voiceover word by word) and the sound effects under the voice. */

// ---------------------------------------------------------------- captions

export interface Line {
  readonly words: readonly Word[];
  /** Shown from its first word until the next line takes over. */
  readonly from: number;
  readonly to: number;
}

/** How many words each caption line takes: broken where the narrator breathes, at most four words. */
const LINE_WORDS: readonly number[] = [2, 3, 3, 1, 3, 2, 3, 2, 3, 4, 2, 2, 4, 3, 3, 4, 3, 3, 2, 3, 4, 1, 2, 3, 4];

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

/** The line on screen at time t, and the word being spoken in it (-1: none yet). */
export function captionAt(t: number): { readonly line: Line; readonly word: number } | null {
  const line = LINES.find((l) => t >= l.from && t < l.to);
  if (!line) return null;
  let word = -1;
  line.words.forEach((w, i) => {
    if (t >= w.start / TEMPO) word = i;
  });
  return { line, word };
}

// ---------------------------------------------------------------- sounds

export interface SoundCue {
  readonly id: SfxId;
  readonly t: number;
  readonly pitch: number;
  readonly gain: number;
  readonly pan: number;
}

const cue = (id: SfxId, t: number, pitch: number, gain: number, pan = 0): SoundCue => ({ id, t, pitch, gain, pan });

/** The time-lapse: a soft rising note as each day dawns. */
const dawns: SoundCue[] = Array.from({ length: DAYS }, (_, i) => cue('free', LAPSE[0] + ((i + 0.05) / DAYS) * (LAPSE[1] - LAPSE[0]), 1.1 + i * 0.12, 0.07, -0.2));
/** A bright ding as each toe pops out, climbing. */
const dings: SoundCue[] = Array.from({ length: TOE_COUNT }, (_, i) => cue('clang', toeAt(i) + 0.03, 1.5 * 2 ** (([0, 4, 7, 12][i] ?? 0) / 12), 0.07, 0.15));

/** Quiet under the voice, matching each beat's mood. Every cue sits inside the loop (the mix folds the tails back round). */
export const SOUNDS: readonly SoundCue[] = [
  // Wonder: the bud twinkles, and shines on "LEGS!".
  cue('drop', 0.12, 1.5, 0.08, 0.15),
  cue('powerup', LEGS_AT, 1, 0.11, 0.1),
  // Laugh: the blocky one pops in, boops as they both wiggle, and bursts into cubes.
  cue('spotted', YES_AT, 1.3, 0.1, 0.4),
  cue('drop', YES_AT + 0.02, 0.8, 0.12, 0.4),
  cue('frenzy', MINECRAFT_AT + 0.1, 1.2, 0.09, 0.3),
  cue('free', REAL_AT - 0.15, 1.5, 0.06, -0.2),
  cue('click', REAL_AT + 0.37, 1.6, 0.3, 0.4),
  cue('click', REAL_AT + 0.45, 1.3, 0.25, 0.45),
  cue('drop', REAL_AT + 0.4, 0.6, 0.1, 0.4),
  // Curious: the dashed outline ticks on, the days go round, the new leg grows.
  cue('click', LEG_AT, 1, 0.3, 0.1),
  cue('click', LEG_AT + 0.12, 1.2, 0.22, 0.1),
  ...dawns,
  cue('grow', GROWS_AT, 1, 0.1, 0.1),
  // Delight: bones and muscle form, then a ding for each toe.
  cue('click', BONES_AT + 0.05, 0.8, 0.3, 0.15),
  cue('drop', BONES_AT + 0.25, 1.2, 0.07, 0.15),
  cue('rustle', MUSCLES_AT + 0.05, 1.2, 0.08, 0.15),
  ...dings,
  // Amazed: the heart and the brain mend, shimmering.
  cue('powerup', HEART_AT + 0.1, 0.85, 0.09, 0.2),
  cue('frenzy', BRAIN_AT + 0.1, 1.05, 0.09, 0.25),
  // Sad: a falling tune as the colour drains, a low one as it fades away.
  cue('lose', BUT_AT, 0.8, 0.1, 0),
  cue('suck', WILD_AT - 0.2, 0.45, 0.05, 0),
  cue('splash', MEXICO_AT - 0.3, 0.55, 0.035, -0.4),
  cue('lose', GONE_AT, 0.6, 0.09, 0),
  // Cheeky: whoosh back in, pop, sparkle on "cuter", the puppy's bubble and its huff.
  cue('dash', HONESTLY_AT - 0.08, 1.4, 0.07, 0),
  cue('drop', HONESTLY_AT + 0.05, 1.3, 0.12, 0),
  cue('frenzy', CUTER_AT, 1.35, 0.09, -0.1),
  cue('drop', ANY_AT - 0.3, 0.9, 0.12, 0.35),
  cue('yuck', PUPPY_AT + 0.15, 1.7, 0.06, 0.35),
  // Warm: the puppy floats off, the bud glows again into the loop.
  cue('free', AND_AT, 0.9, 0.07, 0.35),
  cue('drop', WHAT_AT, 1.25, 0.08, 0.1),
].filter((c) => c.t >= 0 && c.t < LOOP_S);
