import type { SfxId } from '../../../src/audio/recipes';
import { createRng } from '../../../src/logic/rng';
import { ramp, window01 } from '../short';
import {
  AND_AT, BELOW_AT, BIRD_AT, DROP_AT, EVERY_AT, FISH_AT, FIVE_AT, FLOATS_AT, FORTY_ONE_AT, FORTY_ONE_END, FOUND_AT, GULF_AT, HITS_AT, HUNDRED_AT, INSIDE_AT,
  LOOP_S, MILLIONS_AT, RIGHT_AT, SCIENTISTS_AT, SEA_AT, SO_AT, SONGBIRDS_AT, STORM_AT, TIGER_AT, WHATEVER_AT, wrap, YES_AT, YOUNG_AT,
} from './beats';
import { BREAKOUT_T, CRASH_T, SNAP_AT } from './story';
import { TEMPO, WORDS, type Word } from './words';

/** The captions (the voiceover word by word), the chart of 105 sharks, and the sound effects under the voice, one set per mood. */

// ---------------------------------------------------------------- captions

export interface Line {
  readonly words: readonly Word[];
  /** Shown from its first word until the next line takes over. */
  readonly from: number;
  readonly to: number;
}

/** How many words each caption line takes: broken where the narrator breathes, at most four words. */
const LINE_WORDS: readonly number[] = [4, 3, 3, 2, 3, 4, 4, 3, 3, 2, 3, 2, 2, 1, 3, 2, 2, 2, 2];

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
  const u = wrap(t);
  const line = LINES.find((l) => u >= l.from && u < l.to);
  if (!line) return null;
  let word = -1;
  line.words.forEach((w, i) => {
    if (u >= w.start / TEMPO) word = i;
  });
  return { line, word };
}

// ---------------------------------------------------------------- the chart

/** 105 young tiger sharks, seven to a row; 41 of them had songbirds inside. */
export const GRID = { cols: 7, rows: 15, total: 105, lit: 41 } as const;
/** The chart is up from "Scientists" until "Bird,". */
export const chartAt = (t: number): number => window01(wrap(t), SCIENTISTS_AT - 0.12, BIRD_AT + 0.1, 0.25);
/** When each shark of the chart pops in: row by row on "Scientists found". */
export const popAt = (i: number): number => SCIENTISTS_AT + 0.05 + Math.floor(i / GRID.cols) * 0.035 + (i % GRID.cols) * 0.008;

/** Which 41 light up, in the order they light. */
export const LIT_ORDER: readonly number[] = (() => {
  const rng = createRng(2019);
  const all = Array.from({ length: GRID.total }, (_, i) => i);
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [all[i], all[j]] = [all[j]!, all[i]!];
  }
  return all.slice(0, GRID.lit);
})();

/** When the k-th of them lights up: from "birds inside", faster and faster, the last as "FORTY-ONE" ends. */
export const litTime = (k: number): number => INSIDE_AT - 0.05 + (FORTY_ONE_END - 0.05 - INSIDE_AT + 0.05) * (k / (GRID.lit - 1)) ** 0.75;

/** How many have lit by time t (the count over the chart). */
export function litCount(t: number): number {
  const u = wrap(t);
  let n = 0;
  for (let k = 0; k < GRID.lit; k++) if (u >= litTime(k)) n++;
  return n;
}

/** "of 105" beside the count, from "hundred", popping on "five!". */
export const ofTotalAt = (t: number): number => ramp(wrap(t), HUNDRED_AT - 0.05, HUNDRED_AT + 0.12);
export const fivePop = (t: number): number => {
  const s = wrap(t) - FIVE_AT;
  return s < 0 || s > 0.35 ? 0 : Math.sin((Math.PI * s) / 0.35);
};

// ---------------------------------------------------------------- sounds

export interface SoundCue {
  readonly id: SfxId;
  readonly t: number;
  readonly pitch: number;
  readonly gain: number;
  readonly pan: number;
}

const cue = (id: SfxId, t: number, pitch: number, gain: number, pan = 0): SoundCue => ({ id, t, pitch, gain, pan });

/** A rising note as each lit shark comes on: every third one, so it climbs without drowning the words. */
const DINGS: readonly SoundCue[] = Array.from({ length: Math.ceil(GRID.lit / 3) }, (_, k) => cue('drop', litTime(k * 3), 0.9 + 0.07 * k, 0.16, k % 2 ? 0.3 : -0.3));
/** Ticks as the chart's rows pop in. */
const POPS: readonly SoundCue[] = Array.from({ length: 5 }, (_, k) => cue('click', popAt(k * 3 * GRID.cols), 1.2 + 0.1 * k, 0.12, -0.2 + 0.1 * k));

/**
 * Quiet under the voice: it does the talking. Each beat has its own:
 * SHOCK the lunge's rush, the spray, the CHOMP on "SKY!" with a thunderclap,
 * the crash back; TENDER a soft swell as the flock comes in; TENSE a thunder
 * crack on "hits", a tumbling fall, a little plop on "sea."; DREAD a deep
 * thud and slow passes below; NUMBER pops and rising dings, a cheer on
 * "FORTY-ONE"; CHEEKY a boing, a swish for the fish, a plop. (The rain,
 * the thunder rolls and the birdsong are synthesized in audio.ts.)
 */
export const SOUNDS: readonly SoundCue[] = [
  // SHOCK: the snap and the crash back (the lunge itself starts on "So", below).
  cue('lunge', 0.25, 0.5, 0.12, 0.1),
  cue('eatBig', SNAP_AT, 0.75, 0.42),
  cue('smash', SNAP_AT + 0.01, 1.4, 0.08),
  cue('boom', SNAP_AT + 0.03, 0.4, 0.2),
  cue('splash', SNAP_AT + 0.05, 1.5, 0.12, 0.2),
  cue('splash', CRASH_T, 0.6, 0.3, -0.1),
  cue('boom', CRASH_T + 0.02, 0.5, 0.1),
  cue('drop', 2.9, 0.6, 0.12),
  // TENDER: a soft swell under "Every autumn", a twinkle on "millions".
  cue('grow', EVERY_AT - 0.1, 0.5, 0.06, 0.2),
  cue('powerup', MILLIONS_AT + 0.05, 1.4, 0.035, -0.2),
  cue('rustle', SONGBIRDS_AT + 0.3, 1.6, 0.06, 0.4),
  cue('rustle', GULF_AT, 1.4, 0.05, -0.4),
  // TENSE: a gust, the thunder crack, birds tumbling, a plop on "sea.".
  cue('dash', AND_AT, 0.45, 0.08, -0.3),
  cue('boom', STORM_AT, 0.32, 0.12),
  cue('smash', HITS_AT + 0.02, 0.5, 0.1),
  cue('boom', HITS_AT + 0.04, 0.26, 0.22),
  cue('dash', DROP_AT, 0.7, 0.1, 0.2),
  cue('drop', DROP_AT + 0.2, 0.55, 0.12, 0.2),
  cue('splash', SEA_AT, 1.6, 0.16, 0),
  // DREAD: a deep thud as we go under, slow passes below.
  cue('splash', RIGHT_AT - 0.25, 0.5, 0.12),
  cue('boom', BELOW_AT, 0.24, 0.22),
  cue('lunge', YOUNG_AT, 0.3, 0.16, -0.4),
  cue('lunge', TIGER_AT + 0.3, 0.27, 0.14, 0.4),
  cue('spotted', TIGER_AT + 0.1, 0.55, 0.08),
  // NUMBER: pops, dings, a cheer on "FORTY-ONE" and a ta-da on "five!".
  ...POPS,
  cue('click', FOUND_AT, 1.4, 0.1),
  ...DINGS,
  cue('powerup', FORTY_ONE_AT + 0.05, 1.0, 0.1),
  cue('win', FIVE_AT, 1.1, 0.06),
  // CHEEKY: a boing, a swish for the little fish, a plop.
  cue('free', BIRD_AT + 0.05, 0.6, 0.22, 0.2),
  cue('dash', FISH_AT, 1.5, 0.08, 0.5),
  cue('free', WHATEVER_AT + 0.1, 0.8, 0.14, -0.2),
  cue('drop', FLOATS_AT + 0.15, 1.2, 0.16),
  // Round into the hook: it turns, rushes up and bursts out on "So yes,".
  cue('lunge', SO_AT, 0.55, 0.22, -0.1),
  cue('dash', SO_AT + 0.1, 0.6, 0.12),
  cue('splash', BREAKOUT_T, 0.7, 0.3, 0.1),
  cue('suck', YES_AT + 0.25, 0.5, 0.1),
].filter((c) => c.t >= 0 && c.t < LOOP_S);
