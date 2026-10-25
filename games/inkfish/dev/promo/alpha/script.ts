import type { SfxId } from '../../../src/audio/recipes';
import { window01 } from '../short';
import {
  A_AT, ALL_AT, AN_AT, AND_AT, ATE_AT, AUSTRALIA_AT, BIGGER_AT, DUNK, FEET_AT, INSIDE_AT, IT_AT, KNOWS_AT, LOOP_S, MONTHS_AT, NINE_AT, NOBODY_AT, ORCA_AT,
  ORCA_END, PLUNGED_AT, SCIENTISTS_AT, SHUT_T, STOMACH_AT, TAGGED_AT, TURNED_AT, TWO_AT, WARM_AT, WATER_AT, wrap,
} from './story';
import { TEMPO, WORDS, type Word } from './words';

/** What's written over the picture (labels and captions), and the sound effects under the voice. */

// ---------------------------------------------------------------- labels

/** "Australia, 2003", from "two thousand three" until the cut to the dive. */
export const placeLabel = (t: number): number => window01(wrap(t), TWO_AT - 0.05, MONTHS_AT - 0.15, 0.2);
/** The "9 ft (2.7 m)" bar under the shark, from "nine-foot" until the cut. */
export const sizeBar = (t: number): number => window01(wrap(t), NINE_AT - 0.05, MONTHS_AT - 0.15, 0.18);

/**
 * Where every line of text sits (baseline y and font size), so it can be
 * checked against the safe area: between y 270 and 1240. The size bar's
 * label hangs `dy` below its bar; the "?"s pop up to 1.25 times their size.
 */
export const TEXT = {
  caption: { y: 1200, size: 96 },
  place: { y: 1050, size: 96 },
  sizeBar: { dy: 82, size: 86 },
  depth: { y: 380, size: 130 },
  depthFt: { y: 470, size: 80 },
  temp: { y: 400, size: 110 },
  questions: [{ x: 930, y: 510, size: 230 }, { x: 150, y: 900, size: 230 }],
  questionPop: 1.25,
} as const;

// ---------------------------------------------------------------- captions

export interface Line {
  readonly words: readonly Word[];
  /** Shown from its first word until the next line takes over. */
  readonly from: number;
  readonly to: number;
}

/** The voiceover cut into short lines: at most four words and 18 letters, broken after punctuation. */
export const LINES: readonly Line[] = (() => {
  const groups: Word[][] = [];
  for (const w of WORDS) {
    const last = groups[groups.length - 1];
    const prev = last?.[last.length - 1];
    const full = !last || last.length >= 4 || /[.,!?…]$/.test(prev!.text) || [...last, w].map((x) => x.text).join(' ').length > 18;
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
  const u = wrap(t);
  const line = LINES.find((l) => u >= l.from && u < l.to);
  if (!line) return null;
  let word = -1;
  line.words.forEach((w, i) => {
    if (u >= w.start / TEMPO) word = i;
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

/** The depth counter ticking as the tag falls. */
const COUNTER: readonly SoundCue[] = Array.from({ length: 12 }, (_, i) => cue('click', PLUNGED_AT + 0.1 + i * 0.12, 1.3 + i * 0.03, 0.07, 0.35));
/** A heartbeat, lub-dub, speeding up as the water warms. */
const HEART: readonly SoundCue[] = [0, 0.62, 1.12, 1.52, 1.84].flatMap((d, i) => [
  cue('boom', AND_AT + d, 0.42, 0.13 + i * 0.02),
  cue('boom', AND_AT + d + 0.17, 0.5, 0.08 + i * 0.015),
]);

/**
 * Quiet under the voice: it does the talking. A deep rumble and the gulp
 * in the nervous hook, a tape-rewind whoosh back to 2003, gulls and waves at
 * the boat for the curious surface, a falling whoosh, sonar pings and a
 * counter for the surprised dive, a quickening heartbeat and a warm swell on
 * "WARM", a low eerie drone for the stomach, playful "?" blips for the
 * suspects, a light surf for the beach, and the mouth rising again.
 */
export const SOUNDS: readonly SoundCue[] = [
  // The hook: something huge, water rushing in, the gulp.
  cue('boom', 0.02, 0.26, 0.2),
  cue('suck', ATE_AT - 0.5, 0.5, 0.2, 0.05),
  cue('lunge', ATE_AT, 0.4, 0.16),
  cue('suck', SHUT_T - 0.55, 0.62, 0.22),
  cue('eatBig', SHUT_T, 0.48, 0.32),
  cue('boom', SHUT_T + 0.02, 0.32, 0.22),
  cue('drop', SHUT_T + 0.3, 0.6, 0.12, -0.2),
  cue('drop', SHUT_T + 0.45, 0.7, 0.1, 0.2),
  // Rewind to 2003.
  cue('dash', 2.2, 1.6, 0.18, -0.3),
  cue('rustle', 2.3, 1.8, 0.12, -0.3),
  // The sunny surface: waves, gulls, the tag going on, the size bar.
  cue('splash', 2.75, 0.55, 0.1, 0.3),
  cue('squawk', TWO_AT + 0.1, 1.45, 0.05, -0.5),
  cue('squawk', TWO_AT + 0.45, 1.6, 0.04, -0.4),
  cue('splash', SCIENTISTS_AT, 0.5, 0.08, -0.2),
  cue('lash', TAGGED_AT - 0.15, 1.3, 0.06, 0.2),
  cue('click', TAGGED_AT + 0.12, 1.0, 0.2, 0.2),
  cue('free', TAGGED_AT + 0.18, 1.6, 0.06, 0.2),
  cue('click', NINE_AT + 0.05, 1.1, 0.16),
  cue('splash', AUSTRALIA_AT - 0.3, 0.55, 0.08, 0.3),
  cue('squawk', AUSTRALIA_AT + 0.2, 1.5, 0.045, 0.5),
  // Months later: a whoosh in to the tag, then the plunge.
  cue('dash', MONTHS_AT - 0.2, 0.9, 0.14),
  cue('lunge', PLUNGED_AT - 0.05, 0.45, 0.22),
  cue('dash', PLUNGED_AT, 0.45, 0.3),
  cue('dash', PLUNGED_AT + 0.45, 0.38, 0.22),
  ...COUNTER,
  cue('clang', PLUNGED_AT + 0.35, 1.25, 0.045, -0.4),
  cue('clang', PLUNGED_AT + 0.95, 1.18, 0.04, 0.4),
  cue('clang', PLUNGED_AT + 1.55, 1.1, 0.035, -0.3),
  cue('clang', FEET_AT + 0.05, 1.6, 0.07),
  // The water warms: a heartbeat speeding up, a warm swell on "WARM".
  ...HEART,
  cue('suck', TURNED_AT - 0.25, 0.85, 0.16),
  cue('grow', WARM_AT, 0.5, 0.1),
  cue('boom', WARM_AT + 0.05, 0.36, 0.14),
  cue('suck', WATER_AT, 0.4, 0.08),
  // Inside something's stomach: a low eerie drone and a slow beat.
  cue('suck', IT_AT - 0.1, 0.32, 0.22),
  cue('boom', INSIDE_AT, 0.3, 0.12),
  cue('lose', INSIDE_AT + 0.3, 0.42, 0.05),
  cue('suck', STOMACH_AT - 0.2, 0.28, 0.18),
  cue('boom', STOMACH_AT + 0.2, 0.3, 0.1),
  // The suspects: each slides in with a whoosh and a "?" blip.
  cue('dash', A_AT, 0.8, 0.12, -0.4),
  cue('free', BIGGER_AT + 0.25, 1.15, 0.12, 0.3),
  cue('dash', AN_AT - 0.05, 0.8, 0.12, 0.4),
  cue('free', ORCA_AT + 0.12, 1.45, 0.12, -0.3),
  // Nobody knows: a light surf, the crab's clicks, a gull.
  cue('splash', ORCA_END + 0.15, 0.45, 0.12),
  cue('squawk', NOBODY_AT - 0.2, 1.55, 0.04, 0.5),
  cue('click', NOBODY_AT + 0.05, 1.5, 0.12, 0.3),
  cue('click', NOBODY_AT + 0.2, 1.4, 0.12, 0.3),
  cue('click', KNOWS_AT, 1.6, 0.14, 0.2),
  cue('splash', KNOWS_AT + 0.2, 0.5, 0.12, -0.2),
  // Under again, and the mouth rising round the shark.
  cue('splash', DUNK.from, 0.75, 0.18),
  cue('dash', DUNK.from + 0.05, 0.6, 0.16),
  cue('boom', ALL_AT + 0.3, 0.24, 0.2),
  cue('suck', ALL_AT + 0.55, 0.5, 0.22, 0.05),
  cue('lunge', LOOP_S - 0.3, 0.42, 0.16),
];
