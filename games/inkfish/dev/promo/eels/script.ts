import type { SfxId } from '../../../src/audio/recipes';
import { ramp, window01 } from '../short';
import {
  A_AT, BREED_AT, CHALK_FROM, EVER_AT, CHALK_TO, CUT_AT, EVERY_AT, FEMALE_AT, FREUD_AT, JAR_AT, JAR_EELS_AT, LAB_IN, LAB_OUT, LOOP_S, MAG_IN, MALE_AT, popIn,
  ROLL_FROM, ROLL_TO, SARGASSO_AT, SIGMUND_AT, SOLVE_AT, STILL_AT, SWIM_EELS_AT, TAG_AT, THERE_AT, THEY_AT, THOUSANDS_AT, VANISH_AT, YEAR_AT,
} from './story';
import { TEMPO, WORDS, type Word } from './words';

/** What's written over the picture (labels and captions), and the sound effects under the voice. */

// ---------------------------------------------------------------- labels

/** "Sigmund Freud" and "aged 19" by him, from "Sigmund" until the lab goes. */
export const freudLabel = (t: number): number => window01(t, SIGMUND_AT - 0.08, LAB_OUT + 0.2, 0.2);
/** A small "?" by his head on "tried to solve it", gone as the year is chalked up. */
export const puzzleAt = (t: number): number => popIn(t, SOLVE_AT - 0.05) * (1 - ramp(t, YEAR_AT - 0.1, YEAR_AT + 0.15));
/** The chalked count, "eels: 400", from "cut". */
export const countShown = (t: number): number => ramp(t, CUT_AT - 0.1, CUT_AT + 0.1);
/** "male?" by the magnifier, on "male". */
export const maleLabel = (t: number): number => window01(t, MALE_AT - 0.05, EVERY_AT, 0.15);
/** "all female!" over the shelves, stamped on "female". */
export const femaleLabel = (t: number): number => popIn(t, FEMALE_AT - 0.03, 0.22);
/** The map's names: "Europe" as it comes in, "~6,000 km" on "thousands", "Sargasso Sea" on "Sargasso", "breeding ground" on "breed". */
export const europeLabel = (t: number): number => ramp(t, SWIM_EELS_AT - 0.15, SWIM_EELS_AT + 0.15);
export const distanceLabel = (t: number): number => ramp(t, THOUSANDS_AT - 0.05, THOUSANDS_AT + 0.2);
export const sargassoLabel = (t: number): number => popIn(t, SARGASSO_AT - 0.05);
export const breedLabel = (t: number): number => popIn(t, BREED_AT - 0.05) * (1 - ramp(t, THEY_AT - 0.1, THEY_AT + 0.2));
/** "150 years later" under the rolling year, once it has landed. */
// It crossfades with the hook's signs on "still…", which follows "later," closely in this read.
export const laterLabel = (t: number): number => window01(t, ROLL_TO - 0.3, STILL_AT + 0.1, 0.2);

// ---------------------------------------------------------------- captions

export interface Line {
  readonly words: readonly Word[];
  /** Shown from its first word until the next line takes over. */
  readonly from: number;
  readonly to: number;
}

/** The voiceover cut into short lines: at most four words, broken after punctuation. */
export const LINES: readonly Line[] = (() => {
  const groups: Word[][] = [];
  for (const w of WORDS) {
    const last = groups[groups.length - 1];
    const prev = last?.[last.length - 1];
    const full = !last || last.length >= 4 || /[.,:…]$/.test(prev!.text) || [...last, w].map((x) => x.text).join(' ').length > 18;
    if (full) groups.push([w]);
    else last.push(w);
  }
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

/** The chalk squeaking across the board as "1876 · Trieste" is written. */
const CHALK: readonly SoundCue[] = Array.from({ length: 12 }, (_, k) => cue('click', CHALK_FROM + ((CHALK_TO - CHALK_FROM) * k) / 12, 0.75 + 0.05 * (k % 3), 0.08, -0.3));

/** A clink of glass for each jar going up on the shelf. */
const JARS: readonly SoundCue[] = JAR_AT.map((at, k) => cue('clang', at, 2.4 + 0.04 * k, 0.05, 0.4));

/** The surprise: a bright ding for each ♀ tag, climbing in pitch. */
const TAGS: readonly SoundCue[] = TAG_AT.map((at, k) => cue('clang', at, 1.5 + 0.07 * k, 0.11, 0.4));

/** The year's odometer ticking as 150 years roll by: quick, then slowing to a stop. */
const TICKS: readonly SoundCue[] = Array.from({ length: 12 }, (_, k) => cue('click', ROLL_FROM + (ROLL_TO - ROLL_FROM) * (1 - (1 - k / 12) ** 1.5), 1.15, 0.1));

/**
 * Quiet under the voice: it does the talking. Soft plips in the deep for
 * the curious hook, a playful pop for Freud's "?", chalk and glass in the
 * lab, bright climbing dings for the surprise, a gentle swell for the long
 * swim, falling plips as the eels vanish, and a low boom as 2026 lands.
 */
export const SOUNDS: readonly SoundCue[] = [
  cue('drop', 0.1, 1.7, 0.07, -0.3),
  cue('drop', EVER_AT + 0.45, 1.4, 0.06, 0.3),
  cue('rustle', LAB_IN, 1.0, 0.16, 0),
  cue('click', FREUD_AT, 1.3, 0.12, -0.4),
  cue('spotted', SOLVE_AT, 1.25, 0.14, -0.4),
  ...CHALK,
  ...JARS,
  cue('powerup', JAR_EELS_AT, 1.0, 0.13, 0.4),
  cue('dash', MAG_IN, 1.3, 0.1, 0.5),
  cue('spotted', MALE_AT, 0.95, 0.12, 0.3),
  ...TAGS,
  cue('powerup', FEMALE_AT + 0.05, 1.25, 0.16, 0.3),
  cue('rustle', LAB_OUT, 0.8, 0.18, 0),
  cue('dash', SWIM_EELS_AT, 0.7, 0.1, 0.4),
  cue('drop', THOUSANDS_AT, 0.9, 0.06, 0.2),
  cue('drop', SARGASSO_AT, 1.2, 0.08, -0.3),
  cue('grow', BREED_AT, 0.8, 0.12, -0.3),
  cue('dash', THERE_AT, 0.45, 0.14, 0),
  ...[0.9, 0.72, 0.56].map((pitch, k) => cue('drop', THEY_AT + 0.05 + 0.3 * k, pitch, 0.08, -0.2 + 0.2 * k)),
  ...TICKS,
  cue('boom', ROLL_TO, 0.6, 0.24, 0),
  cue('clang', ROLL_TO, 1.0, 0.1, 0),
  cue('grow', STILL_AT - 0.4, 0.6, 0.1, 0),
  cue('drop', A_AT - 0.4, 0.5, 0.06, 0),
  cue('drop', VANISH_AT + 0.6, 0.45, 0.05, 0),
];
