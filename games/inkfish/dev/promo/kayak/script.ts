import type { SfxId } from '../../../src/audio/recipes';
import { window01 } from '../short';
import {
  ADRIAN_AT, ALL_AT, BONKS, BURST_S, CHILE_AT, DAD_AT, DARK_AT, EVERYTHING_AT, FILMED_AT, GOOD_AT, HIS_DAD_AT, HUMPBACKS_AT, KAYAK_AT, KAYAKER_AT, LAND_AT,
  LOOP_S, OUT_AT, PADDLING_AT, PERSON_AT, REWIND, SECONDS_AT, SO_AT, SO_YES_AT, SPAT_AT, THEN_AT, THROAT_AT, WHOLE_AT, wrap,
} from './story';
import { TEMPO, WORDS, type Word } from './words';

/** What's written over the picture (the place, the captions) and the sound effects under the voice. */

// ---------------------------------------------------------------- labels

/** "Chile, 2025" in the sky, from "Chile" until Dad is named. Never in the hook. */
export const placeLabel = (t: number): number => window01(wrap(t), CHILE_AT - 0.05, DAD_AT + 0.2, 0.2);

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

/** Paddle strokes, a soft splash each side. */
const STROKES: readonly SoundCue[] = Array.from({ length: 5 }, (_, i) => cue('splash', 2.7 + i * 0.69, 1.5 + 0.1 * (i % 2), 0.05, i % 2 ? 0.3 : -0.1));
/** The stopwatch ticking on "seconds later…". */
const TICKS: readonly SoundCue[] = Array.from({ length: 4 }, (_, i) => cue('click', SECONDS_AT + i * 0.27, 1.6, 0.16, 0.4));

/**
 * Quiet under the voice: it does the talking. Excitement in the hook (water
 * rushing into the mouth, the gulp and its boom as the jaws shut on
 * "KAYAKER!"), a tape-rewind whoosh, nervous paddling over a low rumble and
 * the "!", the burst and the gulp again for the surprise, drips and a hollow
 * rumble in the dark, a ding and two bonks for the cheek, ticks and a
 * chuckle-burp, the spit and the splash and a little cheer for the relief, the
 * phone's beep, and the zoom back round to the start.
 */
export const SOUNDS: readonly SoundCue[] = [
  // The hook: in the mouth, the jaws shutting.
  cue('suck', 0.05, 0.5, 0.2, 0.1),
  cue('splash', 0.3, 0.6, 0.16, 0.2),
  cue('rustle', 0.7, 0.7, 0.12, -0.2),
  cue('lunge', 1.0, 0.45, 0.18),
  cue('eatBig', KAYAKER_AT + 0.2, 0.45, 0.42),
  cue('boom', KAYAKER_AT + 0.22, 0.4, 0.18),
  cue('splash', KAYAKER_AT + 0.35, 0.5, 0.14, -0.2),
  // Rewind to the calm before.
  cue('dash', REWIND.from, 1.6, 0.2, -0.3),
  cue('rustle', REWIND.from + 0.1, 1.8, 0.12, -0.3),
  // Paddling on the strait; something rising from below.
  ...STROKES,
  cue('rustle', ADRIAN_AT, 0.6, 0.06, 0.3),
  cue('boom', PADDLING_AT, 0.25, 0.16),
  cue('lunge', DAD_AT - 0.2, 0.3, 0.16, 0.1),
  cue('spotted', DAD_AT + 0.25, 0.85, 0.16, 0.2),
  // The burst and the gulp.
  cue('splash', BURST_S, 0.45, 0.3, 0.1),
  cue('lunge', THEN_AT, 0.4, 0.24),
  cue('suck', EVERYTHING_AT, 0.55, 0.28, 0.1),
  cue('eatBig', DARK_AT - 0.05, 0.4, 0.4),
  cue('boom', DARK_AT, 0.3, 0.26),
  // The dark: a hollow rumble, drips.
  cue('boom', KAYAK_AT - 0.2, 0.2, 0.1),
  cue('drop', KAYAK_AT + 0.25, 0.55, 0.12, 0.3),
  cue('drop', ALL_AT + 0.3, 0.5, 0.1, 0.3),
  // Cheeky: the light snaps on, the throat ringed, the two bonks.
  cue('powerup', GOOD_AT, 1.3, 0.1, 0.1),
  cue('click', HUMPBACKS_AT, 1.2, 0.1),
  cue('lash', THROAT_AT, 1.4, 0.08, -0.2),
  cue('clang', BONKS[0], 0.7, 0.14, -0.2),
  cue('clang', BONKS[1], 0.6, 0.14, -0.2),
  cue('yuck', PERSON_AT + 0.1, 0.9, 0.1),
  // Chuckles: ticks, the cheeks puffing.
  ...TICKS,
  cue('suck', SO_AT + 0.6, 0.8, 0.1),
  cue('drop', SECONDS_AT + 1.0, 0.7, 0.12),
  // The spit, the landing, the cough, the cheer.
  cue('free', SPAT_AT, 0.8, 0.2, 0.2),
  cue('dash', SPAT_AT + 0.05, 0.9, 0.16, 0.3),
  cue('splash', LAND_AT, 0.8, 0.26, 0.3),
  cue('hurt', LAND_AT + 0.15, 1.6, 0.06, 0.3),
  cue('win', OUT_AT + 0.45, 1.1, 0.07, 0.2),
  // Mischief: the phone's beep, then the zoom into its screen and round to the start.
  cue('click', HIS_DAD_AT, 0.9, 0.08, -0.3),
  cue('powerup', FILMED_AT, 1.8, 0.08, -0.2),
  cue('spotted', WHOLE_AT, 1.2, 0.06),
  cue('dash', SO_YES_AT + 0.1, 1.4, 0.18),
  cue('suck', LOOP_S - 0.35, 0.5, 0.16, 0.1),
];
