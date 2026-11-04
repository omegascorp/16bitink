import type { SfxId } from '../../../src/audio/recipes';
import {
  COUNTING_AT, DENMARK_AT, ENOUGH_AT, FINGERS_AT, FINGERS_FROM, FOURTEEN_AT, HOW_AT, LONG_AT, LOOP_S, LUNCH_AT, MEAL_AT, NOBODY_AT, ONE_AT, OPENS_AT, PORPOISES_AT, SCIENTIST_AT, SEA_FROM,
  SEALS_AT, SHORE_FROM, SMUG_FROM, SO_AT, STOMACH_AT, TEN_AT, THIRTEEN_AT, TOOK_AT, wrap, YEAR_AT,
} from './story';
import { TEMPO, WORDS, type Word } from './words';

/** What's written over the picture (positions) and the sound effects under the voice. */

/** Every text on the picture: baseline y and size, all inside the area the apps' buttons leave clear (y 270 to 1250). */
export const TEXT = {
  place: { y: 400, size: 130 },
  year: { y: 565, size: 200 },
  stomach: { y: 530, size: 120 },
  counterN: { y: 450, size: 210 },
  counterLabel: { y: 540, size: 96 },
  question: { y: 800, size: 420 },
  caption: { y: 1200, size: 96 },
} as const;

/** The two counters' centres. */
export const COUNTER_X = { porpoises: 320, seals: 760 } as const;

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
    const full = !last || last.length >= 4 || /[.,!?…:]$/.test(prev!.text) || [...last, w].map((x) => x.text).join(' ').length > 18;
    if (full) groups.push([w]);
    else last.push(w);
  }
  return groups.map((g, i) => ({
    words: g,
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

export interface SoundCue {
  readonly id: SfxId;
  readonly t: number;
  readonly pitch: number;
  readonly gain: number;
  readonly pan: number;
}

const cue = (id: SfxId, t: number, pitch: number, gain: number, pan = 0): SoundCue => ({ id, t, pitch, gain, pan });

/** One tick per outline counted, spread over the counting (the same ramp as story.ts's shownAt). */
const TICKS = Array.from({ length: 9 }, (_, i) => cue('click', COUNTING_AT + 0.25 + i * ((ENOUGH_AT - COUNTING_AT - 0.45) / 8), 1.2 + 0.08 * i, 0.07, i % 2 ? 0.3 : -0.3));

/**
 * Quiet under the voice, one mood a beat: a splash, gulps and a bright ding
 * for the hook (shock), a low boom and gull-like clicks for the shore
 * (dramatic), a pop and a ticking count for the stomach (surprise), a comic
 * bounce for the fingers (laugh), a nervous drop and a whoosh of sun and moon
 * for the dark sea, and a sly gulp, a clang on "lunch" and a whoosh back for
 * the cheeky beat.
 */
export const SOUNDS: readonly SoundCue[] = [
  // The hook: a splash, a gulp for each mouthful, a ding on the numbers.
  cue('splash', 0.1, 0.7, 0.14, -0.2),
  cue('eat', THIRTEEN_AT + 0.1, 0.8, 0.12, -0.1),
  cue('clang', THIRTEEN_AT, 1.5, 0.1),
  cue('eat', PORPOISES_AT + 0.45, 1.0, 0.12, 0.1),
  cue('clang', FOURTEEN_AT, 1.8, 0.1),
  cue('suck', FOURTEEN_AT + 0.1, 0.7, 0.1, 0.2),
  cue('powerup', SEALS_AT, 1.4, 0.1),
  // The shore: dread, then the year.
  cue('boom', SHORE_FROM, 0.4, 0.14),
  cue('click', DENMARK_AT, 1.2, 0.08, -0.2),
  cue('powerup', YEAR_AT, 1.2, 0.1),
  cue('rustle', SCIENTIST_AT, 0.6, 0.07, -0.3),
  // The stomach: it opens, the count ticks.
  cue('smash', OPENS_AT, 1.4, 0.08),
  cue('powerup', STOMACH_AT, 1.6, 0.12),
  ...TICKS,
  // Ten fingers: a comic bounce and a bright ding.
  cue('dash', FINGERS_FROM, 1.4, 0.1, 0.2),
  cue('clang', TEN_AT, 1.7, 0.12),
  cue('spotted', FINGERS_AT, 1.2, 0.1, -0.2),
  cue('drop', ENOUGH_AT, 0.7, 0.1),
  // The dark sea: nervous drops, then sun and moon.
  cue('drop', SEA_FROM, 0.4, 0.14),
  cue('drop', MEAL_AT, 0.35, 0.1, 0.2),
  cue('spotted', NOBODY_AT + 0.1, 0.7, 0.08, -0.2),
  cue('dash', HOW_AT - 0.05, 1.5, 0.12, -0.4),
  cue('dash', LONG_AT + 0.15, 1.1, 0.12, 0.4),
  cue('drop', TOOK_AT, 0.5, 0.1),
  // The cheeky beat: a sly sting, a clang on "lunch", the whoosh back.
  cue('dash', SMUG_FROM, 1.1, 0.12, -0.3),
  cue('rustle', ONE_AT + 0.3, 0.7, 0.07, 0.2),
  cue('suck', LUNCH_AT - 0.3, 0.6, 0.1, -0.1),
  cue('eatBig', LUNCH_AT, 0.8, 0.14, 0.1),
  cue('yuck', LUNCH_AT + 0.05, 1.5, 0.05, -0.2),
  cue('dash', SO_AT - 0.4, 1.6, 0.14, 0.4),
  cue('suck', SO_AT + 0.3, 0.6, 0.12, -0.1),
  cue('splash', LOOP_S - 0.3, 0.7, 0.1, 0.2),
];
