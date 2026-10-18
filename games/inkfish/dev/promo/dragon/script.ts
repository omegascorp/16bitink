import type { SfxId } from '../../../src/audio/recipes';
import {
  AND_AT, BLUE_AT, CHOMPS, FILL_ORDER, FINGERTIPS_AT, GULP_AT, IT_AT, litFrom, LOOP_S, MANS_AT, NOT_AT, OFF_AT, pluckStart, PLUCKS, SO_YES_AT, STEALS_AT,
  STING_AT, STINGERS_AT, THE_AT, THUMB_AT, UPSIDE_AT, WITHOUT_AT, WORSE_AT, YES_AT,
} from './story';
import { TEMPO, WORDS, type Word } from './words';

/** The captions (the voiceover word by word) and the sound effects under the voice, one set per mood. */

// ---------------------------------------------------------------- captions

export interface Line {
  readonly words: readonly Word[];
  /** Shown from its first word until the next line takes over. */
  readonly from: number;
  readonly to: number;
}

/** How many words each caption line takes: broken where the narrator breathes, at most four words. */
const LINE_WORDS: readonly number[] = [4, 4, 4, 3, 3, 3, 2, 3, 2, 4, 3, 3, 3, 3, 3, 3, 2, 3, 3, 2];

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

/** Tension: a clock ticking under "It swallows the stinging cells WITHOUT setting them off…". */
const ticks: SoundCue[] = Array.from({ length: Math.floor((OFF_AT + 0.35 - IT_AT) / 0.25) }, (_, k) => cue('click', IT_AT + k * 0.25, k % 2 ? 0.42 : 0.55, 0.42, k % 2 ? 0.25 : -0.25));

/** Quiet under the voice: it does the talking. Every cue sits inside the loop (the mix folds the tails back round). */
export const SOUNDS: readonly SoundCue[] = [
  // SHOCK: it chews, and CHOMPS on "EATS".
  cue('eat', CHOMPS[0]!, 0.7, 0.3, -0.3),
  cue('eatBig', CHOMPS[1]!, 0.85, 0.1, -0.3),
  cue('smash', CHOMPS[1]! + 0.01, 1.7, 0.05, -0.3),
  cue('lunge', CHOMPS[1]!, 1.3, 0.05, 0),
  cue('eat', CHOMPS[2]!, 0.65, 0.28, -0.3),
  // CHEEKY: plip, plip, plip, each stinger plucked, and a slurp.
  cue('suck', AND_AT + 0.1, 2.3, 0.07, -0.3),
  ...Array.from({ length: PLUCKS }, (_, i) => cue('drop', pluckStart(i) + 0.32, 0.85 + 0.09 * (i % 4), 0.2, -0.45 + 0.1 * i)),
  cue('eat', STINGERS_AT + 0.42, 1.5, 0.26, -0.3),
  // CALM WONDER: soft surf, a twinkle, the gulp of air.
  cue('splash', THE_AT - 0.05, 0.42, 0.13, -0.5),
  cue('grow', BLUE_AT + 0.1, 0.55, 0.07, 0.2),
  cue('splash', UPSIDE_AT, 0.36, 0.11, 0.5),
  cue('drop', GULP_AT + 0.05, 0.5, 0.24, -0.2),
  cue('eat', GULP_AT + 0.22, 0.55, 0.22, -0.2),
  // TENSION: ticking, a low thud on "WITHOUT".
  ...ticks,
  cue('boom', WITHOUT_AT, 0.45, 0.13, 0),
  // DRAMATIC: a rising note as each bunch lights up, a shimmer on "fingertips".
  ...FILL_ORDER.map((fan, k) => cue('drop', litFrom(fan), 0.75 + 0.16 * k, 0.17, fan >= 3 ? 0.35 : -0.35)),
  cue('powerup', FINGERTIPS_AT + 0.2, 0.8, 0.1, 0),
  // DANGER: a crackle on "sting", a roar rising into the red flash on "WORSE", a falling dread.
  cue('zap', STING_AT, 0.9, 0.16, 0.2),
  cue('suck', WORSE_AT - 0.85, 0.6, 0.15, 0),
  cue('boom', WORSE_AT + 0.02, 0.6, 0.2, 0),
  cue('zap', WORSE_AT + 0.02, 0.6, 0.12, -0.2),
  cue('lose', MANS_AT, 0.6, 0.11, 0.3),
  // LAUGH: the thumb swishes in, boing-boing.
  cue('dash', NOT_AT + 0.5, 0.55, 0.06, 0.6),
  cue('free', THUMB_AT + 0.05, 0.55, 0.3, 0.2),
  cue('free', THUMB_AT + 0.22, 0.78, 0.24, 0.2),
  cue('dash', SO_YES_AT - 0.1, 0.5, 0.05, 0.6),
  // Back to the bite for the loop.
  cue('eat', CHOMPS[3]!, 0.7, 0.28, -0.3),
  cue('click', YES_AT, 0.6, 0.2, -0.3),
].filter((c) => c.t >= 0 && c.t < LOOP_S);
