import type { SfxId } from '../../../src/audio/recipes';
import {
  AND_AT, BAIT_AT, BECAUSE_AT, BLINK_AT, blinkSwap, CLOSELY_AT, EATS_AT, FAKE_AT, FISH2_AT, FROGFISH_AT, IRIS, IT_AT, LENGTH_AT, LOOP_S, MOUTH_AT, PRETENDING_AT,
  SITS_AT, SLURPED_AT, SNAP_AT, SO_AT, SPONGE_AT, STILL_AT, STRIKE_AT, SWALLOWS_AT, THE_AT, THEN_AT, TWELVE_AT, TWICE_AT, BIGGER_AT, WATCH_AT, WIGGLES_AT, ALMOST_AT,
  HEAD_AT,
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

/** How many words each caption line takes: broken where the narrator breathes, "gone!" on its own. */
const LINE_WORDS: readonly number[] = [4, 4, 4, 3, 2, 4, 5, 3, 3, 1, 1, 3, 3, 2, 3, 1];

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

/** Hushed: a soft clock ticking under "and wiggles a little fake bait on its head". */
const ticks: SoundCue[] = Array.from({ length: Math.floor((THEN_AT - 0.1 - AND_AT) / 0.3) }, (_, k) => cue('click', AND_AT + k * 0.3, k % 2 ? 0.45 : 0.58, 0.3, k % 2 ? 0.25 : -0.25));
/** Dramatic: a slow heartbeat under "So watch closely, because". */
const heart: SoundCue[] = [WATCH_AT - 0.1, CLOSELY_AT + 0.25, BECAUSE_AT - 0.05].flatMap((at) => [cue('boom', at, 0.32, 0.14), cue('boom', at + 0.2, 0.28, 0.1)]);

/** Quiet under the voice: it does the talking. Every cue sits inside the loop (the mix folds the tails back round). */
export const SOUNDS: readonly SoundCue[] = [
  // THRILL: water roaring into the mouth in slow motion, the little fish thrashing; the blink, and a hidden gulp.
  cue('suck', 0.02, 0.42, 0.24, 0.2),
  cue('rustle', 0.3, 0.6, 0.12, 0.3),
  cue('lunge', EATS_AT, 0.45, 0.12, 0.2),
  cue('rustle', 1.1, 0.55, 0.1, 0.3),
  cue('click', BLINK_AT + 0.05, 0.9, 0.28),
  cue('eatBig', blinkSwap(0), 0.75, 0.3),
  cue('click', blinkSwap(0) + 0.12, 1.3, 0.18),
  // SNEAKY: tiptoe plinks, the wrasse swimming by, the frog's eye sliding after it.
  cue('drop', THE_AT + 0.05, 1.6, 0.14, -0.3),
  cue('drop', FROGFISH_AT + 0.2, 1.35, 0.12, 0.3),
  cue('dash', SITS_AT + 0.3, 0.7, 0.07, -0.6),
  cue('click', STILL_AT + 0.1, 1.5, 0.16, 0.2),
  cue('click', PRETENDING_AT + 0.25, 1.7, 0.16, 0.2),
  cue('drop', SPONGE_AT, 0.85, 0.16, 0),
  cue('rustle', SPONGE_AT + 0.2, 0.9, 0.08, 0.5),
  // HUSHED: the clock, a shimmer as the rod rises, the wrasse noticing the bait.
  ...ticks,
  cue('grow', WIGGLES_AT, 0.6, 0.05, 0.2),
  cue('spotted', FAKE_AT + 0.1, 1.15, 0.08, 0.4),
  cue('drop', BAIT_AT + 0.2, 1.9, 0.08, 0.3),
  cue('rustle', HEAD_AT, 1.1, 0.06, 0.4),
  // SHOCK: a jolt on "Then", water roaring in as the mouth balloons, a boom on "TWELVE", the snap and the gulp on "gone!", then an innocent whistle.
  cue('lunge', THEN_AT, 0.6, 0.22),
  cue('boom', THEN_AT + 0.01, 0.5, 0.18),
  cue('suck', MOUTH_AT, 0.36, 0.3, 0.1),
  cue('suck', TWELVE_AT - 0.2, 0.3, 0.26, 0.1),
  cue('boom', TWELVE_AT + 0.1, 0.36, 0.2),
  cue('rustle', BIGGER_AT, 0.5, 0.12, 0.2),
  cue('eatBig', SNAP_AT, 0.55, 0.42),
  cue('boom', SNAP_AT + 0.01, 0.42, 0.16),
  cue('smash', SNAP_AT + 0.02, 0.75, 0.08),
  cue('drop', SNAP_AT + 0.45, 1.7, 0.16, 0.2),
  cue('drop', SNAP_AT + 0.62, 2.0, 0.14, 0.2),
  cue('drop', SNAP_AT + 0.8, 1.8, 0.12, 0.2),
  // LAUGH: the blink, gulp after gulp, a boing on "TWICE", a last slurp and a burp.
  cue('click', IT_AT - 0.28, 0.9, 0.26),
  cue('eat', SWALLOWS_AT + 0.05, 0.6, 0.3),
  cue('eat', FISH2_AT + 0.05, 0.7, 0.26),
  cue('eat', ALMOST_AT + 0.05, 0.8, 0.26),
  cue('free', TWICE_AT + 0.1, 0.62, 0.3, 0.1),
  cue('free', TWICE_AT + 0.28, 0.82, 0.22, 0.1),
  cue('eat', LENGTH_AT + 0.05, 0.9, 0.26),
  cue('suck', LENGTH_AT + 0.1, 1.6, 0.18, 0.2),
  cue('eat', SLURPED_AT, 1.1, 0.3),
  cue('drop', SLURPED_AT + 0.25, 0.42, 0.3),
  // DRAMATIC: the light closes, a heartbeat, the bait wiggling; the strike, carried over the loop point into the opening's roar.
  cue('boom', IRIS.close, 0.38, 0.16),
  cue('dash', IRIS.hold, 0.45, 0.05, -0.5),
  ...heart,
  cue('grow', WATCH_AT + 0.2, 0.7, 0.04, 0.3),
  cue('lunge', STRIKE_AT, 0.7, 0.22, 0.1),
  cue('suck', STRIKE_AT + 0.02, 0.55, 0.22, 0.15),
  cue('eat', STRIKE_AT + 0.12, 1.2, 0.12, 0.2),
].filter((c) => c.t >= 0 && c.t < LOOP_S);
