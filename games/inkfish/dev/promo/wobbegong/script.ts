import type { SfxId } from '../../../src/audio/recipes';
import { createRng } from '../../../src/logic/rng';
import { ramp, window01 } from '../short';
import {
  A_AT, BAMBOO_AT, BECAUSE_AT, CARPET_AT, DOWN_AT, FOUND_AT, GREAT_AT, GUESSED_AT, HALFWAY_AT, HEAD_AT, HOURS_AT, HOURS_END, LATER_AT, LOOP_S,
  NO_AT, ONLY_AT, REEF_AT, RUSH_AT, SCIENTISTS_AT, SHAGGY_AT, SHARK_AT, SWALLOWED_AT, THIRTY_AT, WAS_AT, WHOLE_AT, WOBBEGONG_AT, wrap, YEAR_AT, YES_AT,
} from './story';
import { TEMPO, WORDS, type Word } from './words';

/** What's written over the picture (labels and captions), and the sound effects under the voice. */

// ---------------------------------------------------------------- labels

/** "Great Barrier Reef", from "Great" until the playful beat. */
export const placeLabel = (t: number): number => window01(wrap(t), GREAT_AT - 0.05, A_AT - 0.1, 0.2);
/** "2011" under it, from its word. */
export const yearLabel = (t: number): number => window01(wrap(t), YEAR_AT - 0.05, A_AT - 0.1, 0.2);
/** "wobbegong", with an arrow to it, on its name. */
export const nameLabel = (t: number): number => window01(wrap(t), WOBBEGONG_AT - 0.05, WAS_AT - 0.1, 0.2);
/** "3 ft" / "1 m" by the tape, from "whole bamboo shark" to the whip. */
export const sizeLabel = (t: number): number => window01(wrap(t), WHOLE_AT - 0.05, THIRTY_AT - 0.2, 0.2);
/** The tape running out along the bamboo shark, 0 .. 1, gone with the label. */
export const tapeAt = (t: number): number => ramp(wrap(t), WHOLE_AT - 0.05, BAMBOO_AT + 0.7) * (1 - ramp(wrap(t), DOWN_AT - 0.1, HEAD_AT + 0.1));

/**
 * Where every line of text sits (baseline y and font size), so it can be
 * checked against the safe area: between y 270 and 1240.
 */
export const TEXT = {
  caption: { y: 1200, size: 96 },
  place: { y: 362, size: 104 },
  year: { y: 458, size: 92 },
  name: { x: 270, y: 420, size: 100 },
  feet: { x: 245, y: 410, size: 124 },
  metres: { x: 245, y: 492, size: 80 },
  clock: { x: 290, y: 440, r: 112 },
  plus: { x: 650, y: 470, size: 96 },
  bar: { x0: 170, x1: 910, y: 640, h: 80 },
  pct: { x: 760, y: 662, size: 66 },
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

/** The reef's crackle: snapping shrimp, tiny clicks all round, all the way through. */
const CRACKLE: readonly SoundCue[] = (() => {
  const rng = createRng(2011);
  return Array.from({ length: 70 }, () => cue('click', rng() * (LOOP_S - 0.1), 1.6 + rng() * 0.9, 0.03 + rng() * 0.04, rng() * 1.6 - 0.8));
})();
/** The comic clock: tick-tock, then a ding as it jumps. */
const TICKS: readonly SoundCue[] = Array.from({ length: 6 }, (_, i) => cue('click', THIRTY_AT - 0.05 + i * 0.16, i % 2 ? 1.05 : 1.45, 0.16, -0.3));
/** The progress bar loading: blips climbing, then a stall. */
const BLIPS: readonly SoundCue[] = Array.from({ length: 5 }, (_, i) => cue('drop', ONLY_AT + i * 0.1, 0.85 + i * 0.07, 0.1, 0.2));

/**
 * Quiet under the voice: it does the talking. A slow stretchy gulp and a
 * jolt for the shocked hook, a shimmer over the reef for the wonder, a
 * boing and a rustle for the playful carpet, a whoosh and an alert for the
 * excited bamboo shark, a tick-tock, a ding, loading blips and a "bwomp"
 * stall for the laugh, bubbles and a sad trombone for the sarcastic hours,
 * a contented sigh for "No rush", and the gulp coming back round. Under it
 * all, the reef's crackle.
 */
export const SOUNDS: readonly SoundCue[] = [
  ...CRACKLE,
  // The hook: a slow, stretchy gulp, the tail slapping on "SHARK!".
  cue('suck', 0.02, 0.42, 0.18),
  cue('suck', SWALLOWED_AT, 0.36, 0.14, 0.1),
  cue('eatBig', SHARK_AT + 0.08, 0.4, 0.3),
  cue('boom', SHARK_AT + 0.05, 0.3, 0.2),
  cue('lash', SHARK_AT + 0.12, 0.9, 0.1, 0.4),
  cue('splash', SHARK_AT + 0.35, 0.6, 0.08, 0.4),
  // The reef: a soft rush up and away, a shimmer.
  cue('dash', GREAT_AT - 0.1, 0.55, 0.14),
  cue('grow', REEF_AT + 0.1, 0.75, 0.05, -0.2),
  cue('grow', YEAR_AT + 0.15, 1, 0.04, 0.2),
  // Playful: bubbly plinks on its name, a rustle as the fringe fluffs, a boing for the carpet.
  cue('drop', WOBBEGONG_AT + 0.05, 0.8, 0.12, -0.3),
  cue('drop', WOBBEGONG_AT + 0.2, 1.05, 0.1, -0.2),
  cue('rustle', SHAGGY_AT, 1.2, 0.14),
  cue('free', CARPET_AT, 0.9, 0.12),
  cue('rustle', CARPET_AT + 0.25, 0.9, 0.1, 0.3),
  // Excited: a whoosh in, an alert as it lights up, the tape, a lunge on "HEAD-first".
  cue('dash', WAS_AT - 0.1, 1.1, 0.16),
  cue('spotted', FOUND_AT + 0.3, 1, 0.08),
  cue('click', WHOLE_AT + 0.1, 1.2, 0.14),
  cue('free', BAMBOO_AT + 0.2, 1.3, 0.08, 0.3),
  cue('suck', DOWN_AT - 0.1, 0.6, 0.16),
  cue('lunge', HEAD_AT + 0.05, 0.62, 0.18),
  // Laugh: tick-tock, a ding, loading blips, a stall.
  ...TICKS,
  cue('clang', LATER_AT + 0.05, 1.7, 0.07, -0.3),
  ...BLIPS,
  cue('yuck', HALFWAY_AT + 0.25, 0.75, 0.08, 0.2),
  cue('lash', HALFWAY_AT + 0.2, 1.1, 0.06, 0.4),
  // Sarcastic: the divers' bubbles, the sun sweeping over, a sad trombone.
  cue('drop', SCIENTISTS_AT + 0.1, 0.6, 0.1, -0.5),
  cue('drop', SCIENTISTS_AT + 0.35, 0.7, 0.09, 0.5),
  cue('drop', SCIENTISTS_AT + 0.7, 0.55, 0.08, -0.5),
  cue('dash', GUESSED_AT + 0.1, 0.4, 0.14, -0.4),
  cue('dash', HOURS_AT, 0.35, 0.12, 0.4),
  cue('lose', HOURS_END + 0.02, 0.8, 0.06),
  // Lazy: a contented sigh, bubbles.
  cue('suck', NO_AT, 0.3, 0.16),
  cue('drop', NO_AT + 0.25, 0.5, 0.08, 0.2),
  cue('drop', RUSH_AT + 0.15, 0.45, 0.07, 0.3),
  // Morning, and the gulp coming round again.
  cue('grow', BECAUSE_AT + 0.15, 1.2, 0.035),
  cue('dash', BECAUSE_AT + 0.1, 0.7, 0.12),
  cue('suck', YES_AT + 0.05, 0.42, 0.16),
];
