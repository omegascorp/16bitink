import type { SfxId } from '../../../src/audio/recipes';
import { window01 } from '../short';
import {
  DROPS, FAIL_AT, FLIPS, FOOD_AT, GOLDFISH_CAN_AT, LEVER_AT, LOOP_S, MONTHS_AT, NOT_AT, ONE_AT, ONLY_AT, PAN_IN_FROM, PAN_OUT_FROM, PAN_OUT_TO, PUSH_AT, PUSH_IT_AT, PUSHES,
  SCIENTISTS_AT, SO_AT, TAUGHT_AT, WHEN_AT,
} from './story';
import { TEMPO, WORDS, type Word } from './words';

/** What's written over the picture (labels and captions), and the sound effects under the voice. */

// ---------------------------------------------------------------- labels

/** "scientists" by the lab-coat sleeve, from "Scientists" until the hand has gone. */
export const scientistsLabel = (t: number): number => window01(t, SCIENTISTS_AT - 0.05, PUSH_AT + 0.2, 0.2);
/** "lever" by the lever, from the first "lever" through the second. */
export const leverLabel = (t: number): number => window01(t, LEVER_AT - 0.05, ONLY_AT + 0.35, 0.2);
/** "food" beside the first pellet as it sinks. */
export const foodLabel = (t: number): number => window01(t, FOOD_AT - 0.08, DROPS[0]!.eaten, 0.12);
/** "1 hour a day" beside the clock, from "one hour" until the calendar comes (its label takes the place). */
export const hourLabel = (t: number): number => window01(t, ONE_AT - 0.05, GOLDFISH_CAN_AT, 0.2);
/** The red ✕ under the chute when the push outside the hour pays nothing. */
export const failMark = (t: number): number => window01(t, FAIL_AT + 0.12, WHEN_AT - 0.6, 0.12);
/** "months!" beside the calendar, on "MONTHS". */
export const monthsLabel = (t: number): number => window01(t, MONTHS_AT - 0.05, PAN_OUT_TO, 0.2);
/** The ding's starburst at the chute as a pellet comes out in its hour, 0 .. 1 over its life (null outside it). */
export function dingAt(t: number): number | null {
  const at = DROPS.slice(1).map((d) => (t - d.from) / 0.45).find((u) => u >= 0 && u < 1);
  return at ?? null;
}

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

/** The clock's hand ticking round as the months go by. */
const TICKS: readonly SoundCue[] = Array.from({ length: 10 }, (_, i) => cue('click', 11.2 + i * 0.2, 1.3, 0.1, 0.4));

/**
 * Quiet under the voice: it does the talking. Surprise in the hook (the
 * pen's two scratches and a clang for the cross), a curious lab (the
 * lever's clicks, a pellet's plop, a gulp), a little "uh-oh" when the lever
 * pays nothing, a bright ding when it pays in its hour, pages rustling and
 * a warm chime for the months, and a soft whoosh home.
 */
export const SOUNDS: readonly SoundCue[] = [
  cue('drop', 0.45, 0.55, 0.08, -0.1),
  cue('dash', NOT_AT - 0.02, 1.7, 0.22, -0.2),
  cue('dash', NOT_AT + 0.1, 1.9, 0.22, 0.1),
  cue('clang', NOT_AT + 0.12, 1.1, 0.16),
  cue('drop', 1.9, 0.6, 0.07, 0.1),
  cue('dash', PAN_IN_FROM, 0.6, 0.22, 0.4),
  cue('rustle', SCIENTISTS_AT, 0.8, 0.14, 0.5),
  cue('click', TAUGHT_AT + 0.05, 0.9, 0.22, 0.5),
  ...PUSHES.map((p) => cue('click', p, 0.75, 0.22, 0.4)),
  ...DROPS.map((d) => cue('drop', d.from + 0.04, 1, 0.16, 0.35)),
  ...DROPS.map((d) => cue('eat', d.eaten, 1.25, 0.2, 0.3)),
  cue('spotted', FAIL_AT + 0.14, 0.8, 0.12, 0.35),
  cue('free', WHEN_AT, 1.1, 0.12, 0.3),
  cue('clang', PUSH_IT_AT + 0.15, 1.8, 0.24, 0.35),
  cue('clang', DROPS[2]!.from, 1.8, 0.12, 0.35),
  cue('clang', DROPS[3]!.from, 1.8, 0.12, 0.35),
  ...TICKS,
  ...FLIPS.map((f) => cue('rustle', f, 1.1, 0.1, -0.4)),
  cue('grow', MONTHS_AT, 0.8, 0.14, -0.2),
  cue('dash', PAN_OUT_FROM, 0.5, 0.16, -0.4),
  cue('drop', SO_AT + 0.7, 0.55, 0.07, -0.1),
];
