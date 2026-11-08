import type { SfxId } from '../../../src/audio/recipes';
import {
  ABOUT_AT, ALIVE_AT, AND2_AT, AND_AT, BACKWARDS_AT, CUTS, EELS_AT, END_START, ESCAPED_AT, FISH_AT, FOUR_AT, GILLS_AT, HEARTBEATS, INSIDE_AT, JAPAN_AT, LOOP_S,
  MADE_AT, MINUTES_END, ONE_AT, OUT_AT, SCIENTISTS_AT, SHUT_T, SO_AT, SO_YES_AT, SQUEEZED_AT, STOMACH_AT, SWALLOWED_AT, SWAM_AT, THREE_AT, THROAT_AT, UP_AT,
  wrap, XRAYED_AT, YOUNG_AT,
} from './story';
import { TEMPO, WORDS, type Word } from './words';

/** What's written over the picture (labels and captions), and the sound effects under the voice. */

/**
 * Where every line of text sits (baseline y and font size), so it can be
 * checked against the safe area: between y 270 and 1250. "1 in 4" pops up
 * to `pop` times its size.
 */
export const TEXT = {
  caption: { y: 1200, size: 96 },
  japan: { x: 600, y: 432, size: 108 },
  timer: { x: 590, y: 452, size: 128 },
  ratio: { y: 446, size: 138 },
  pop: 1.2,
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

/** A heartbeat, lub-dub, quickening, under the stomach beat. */
const HEART: readonly SoundCue[] = HEARTBEATS.flatMap((b, i) => [cue('boom', b, 0.42, 0.13 + i * 0.012), cue('boom', b + 0.17, 0.5, 0.08 + i * 0.01)]);
/** The stopwatch ticking down, fast. */
const TICKS: readonly SoundCue[] = Array.from({ length: 22 }, (_, i) => cue('click', MINUTES_END + 0.05 + i * 0.11, 1.9 - (i % 2) * 0.25, 0.09, 0.3));
/** The X-ray's hum: soft zaps across the curious beat. */
const HUM: readonly SoundCue[] = [0, 0.9, 1.8, 2.7].map((d, i) => cue('zap', SCIENTISTS_AT + 0.4 + d, 0.42, 0.035, i % 2 ? 0.3 : -0.3));
/** The eel squirming in the gill slit. */
const SQUIRM: readonly SoundCue[] = [0, 0.22, 0.42, 0.6, 0.76].map((d, i) => cue('rustle', SQUEEZED_AT + d, 1.1 + i * 0.08, 0.09, 0.25));

/**
 * Quiet under the voice: it does the talking. A gulp and a slurp for the
 * thrilling hook and the shock, a pop and a bright cheer for "ESCAPED", an
 * electric scan and hum for the curious X-ray, a heartbeat and a ticking
 * clock for the nervous stomach, a low whoosh and boom for "BACKWARDS",
 * squirming and a pop for the gills, a ding on "one in four" and a soft sad
 * fall for the three, and the mouth sucking in again for the sly end.
 */
export const SOUNDS: readonly SoundCue[] = [
  // The hook: water rushing into the mouth, the slurp, the gulp.
  cue('suck', 0.02, 0.6, 0.2, -0.1),
  cue('lash', 0.25, 1.4, 0.06, -0.4),
  cue('suck', SWALLOWED_AT - 0.1, 0.75, 0.2, -0.1),
  cue('eatBig', SHUT_T, 0.62, 0.32),
  cue('boom', SHUT_T + 0.02, 0.36, 0.18),
  cue('drop', ALIVE_AT + 0.1, 0.8, 0.08, 0.2),
  cue('drop', ALIVE_AT + 0.35, 0.9, 0.07, -0.2),
  // "ESCAPED!": a pop at the gill and a bright cheer.
  cue('dash', AND_AT, 1.2, 0.08, 0.3),
  cue('free', ESCAPED_AT + 0.02, 1.25, 0.18, 0.3),
  cue('powerup', ESCAPED_AT + 0.12, 1.05, 0.08, 0.2),
  cue('splash', ESCAPED_AT + 0.05, 0.9, 0.08, 0.3),
  // The flip to the X-ray, and its scan.
  cue('zap', CUTS[0]![0], 0.7, 0.1),
  cue('dash', CUTS[0]![0] + 0.02, 1.5, 0.08),
  ...HUM,
  cue('click', JAPAN_AT, 1.5, 0.12, -0.3),
  cue('zap', XRAYED_AT - 0.05, 0.9, 0.09),
  cue('dash', XRAYED_AT, 1.8, 0.07),
  cue('click', FISH_AT + 0.05, 1.3, 0.1),
  cue('click', YOUNG_AT + 0.05, 1.7, 0.1),
  cue('grow', EELS_AT, 1.2, 0.06),
  // The stomach: a low swell, a heartbeat, the clock.
  cue('suck', INSIDE_AT - 0.15, 0.35, 0.18),
  cue('lose', STOMACH_AT + 0.2, 0.45, 0.045),
  ...HEART,
  cue('clang', THREE_AT + 0.05, 1.7, 0.06, -0.2),
  ...TICKS,
  // "BACKWARDS": a reversed whoosh and a low boom; the eel shuffling up the throat.
  cue('suck', SO_AT - 0.1, 0.3, 0.2),
  cue('boom', BACKWARDS_AT, 0.28, 0.2),
  cue('dash', SWAM_AT, 0.5, 0.14, 0.2),
  cue('dash', BACKWARDS_AT + 0.3, 0.45, 0.12, -0.2),
  cue('rustle', UP_AT, 0.7, 0.1),
  cue('rustle', THROAT_AT, 0.8, 0.1),
  // Back to colour: squirming, a pop on "GILLS", a splash as it swims off.
  cue('splash', AND2_AT - 0.05, 0.8, 0.1),
  ...SQUIRM,
  cue('lash', OUT_AT, 1.2, 0.08, 0.3),
  cue('free', GILLS_AT + 0.05, 1.45, 0.2, 0.3),
  cue('powerup', GILLS_AT + 0.15, 1.2, 0.08, 0.3),
  cue('splash', GILLS_AT + 0.3, 1.0, 0.12, 0.5),
  cue('dash', GILLS_AT + 0.5, 1.1, 0.1, 0.6),
  // One in four: four little plinks, a ding, a sparkle off and a sad fall.
  ...[0, 1, 2, 3].map((i) => cue('eat', ABOUT_AT - 0.15 + i * 0.09, 1.6 + i * 0.1, 0.07, -0.3 + i * 0.2)),
  cue('clang', ONE_AT, 2.1, 0.07),
  cue('clang', FOUR_AT + 0.02, 1.9, 0.11),
  cue('powerup', MADE_AT, 1.5, 0.09, -0.4),
  cue('lose', MADE_AT + 0.15, 0.95, 0.05, 0.2),
  // The sly end: under again and the mouth sucking in.
  cue('splash', END_START, 0.7, 0.1),
  cue('suck', SO_YES_AT + 0.2, 0.55, 0.2, -0.1),
  cue('lash', LOOP_S - 0.5, 1.3, 0.06, -0.4),
];
