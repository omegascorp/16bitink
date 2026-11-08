import type { SfxId } from '../../../src/audio/recipes';
import {
  AND_AT, AQUARIUM_AT, BARRY_AT, BRUSHES_AT, DARK_AT, DOWN_AT, ENGLISH_AT, FEELERS_AT, FEET_AT, FISH2_AT, FLIPS, GONE_AT, HID_AT, HIDES_AT, JAWS2_AT,
  JAWS_AT, KNOWS_AT, LOOP_S, LURK_SNAP_T, MONTHS_AT, MONTHS_END, ONE_AT, SAND_AT, SHOWING_AT, SLICE_AT, SNAP_AT, SNAP_T, TEN_AT, THEY_AT, UP_AT, WITH_AT,
  WORM_AT, wrap,
} from './story';
import { TEMPO, WORDS, type Word } from './words';

/** What's written over the picture (labels and captions), and the sound effects under the voice. */

/**
 * Where every line of text sits (baseline y and font size), so it can be
 * checked against the safe area: between y 270 and 1250. The bar's labels
 * sit beside it; the calendar's month and the name tag are drawn in the
 * scenes at these baselines (screen px when the camera is at rest, and the
 * tag at its most zoomed).
 */
export const TEXT = {
  caption: { y: 1200, size: 96 },
  barFt: { x: 948, y: 730, size: 100 },
  barM: { x: 948, y: 810, size: 70 },
  month: { y: 470, size: 74 },
  tag: { y: 760, size: 92 },
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
    const full = !last || last.length >= 4 || /[.,!?…:]$/.test(prev!.text) || [...last, w].map((x) => x.text).join(' ').length > 18;
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

/** Sounds made in audio.ts for things the game has no sound for. */
export type ExtraSfx = 'shink' | 'drone' | 'ding' | 'heart' | 'flip' | 'tada' | 'sparkle' | 'whoosh' | 'clack';

export interface SoundCue {
  readonly id: SfxId | ExtraSfx;
  readonly t: number;
  readonly pitch: number;
  readonly gain: number;
  readonly pan: number;
}

const cue = (id: SfxId | ExtraSfx, t: number, pitch: number, gain: number, pan = 0): SoundCue => ({ id, t, pitch, gain, pan });

/** A heartbeat quickening as the fish noses the feelers. */
const HEART: readonly SoundCue[] = [0, 0.55, 1.0, 1.36, 1.64, 1.88].map((d, i) => cue('heart', FISH2_AT - 0.2 + d, 1, 0.35 + i * 0.06));
/** The calendar's pages tearing off, one a flip. */
const FLIP_CUES: readonly SoundCue[] = Array.from({ length: FLIPS }, (_, i) =>
  cue('flip', MONTHS_AT - 0.35 + (i * (MONTHS_END + 0.6 - MONTHS_AT)) / FLIPS, 1 + i * 0.06, 0.55, -0.4 + i * 0.05));

/**
 * Quiet under the voice: it does the talking. A low dread drone, sand
 * bursting and the scissor "shink" in the hook; a creepy drone, sand
 * slithering and a bright ding on the number under the sand; a held breath
 * for the lurk, a quickening heartbeat as the fish noses in; the strike's
 * shink and boom; a whoosh down and an eerie fall for "gone"; bright pops,
 * a clack, a flag's ding and the calendar's flips for the comic aquarium;
 * a ta-da and sparkles for Barry; and a whoosh back into the dark.
 */
export const SOUNDS: readonly SoundCue[] = [
  // The hook: dread, sand bursting, the jaws shutting.
  cue('drone', 0.02, 0.8, 0.5),
  cue('boom', 0.02, 0.3, 0.14),
  cue('rustle', 0.05, 0.6, 0.1),
  cue('suck', JAWS_AT - 0.2, 0.55, 0.12),
  cue('lunge', SLICE_AT, 0.5, 0.12),
  cue('shink', SNAP_T - 0.02, 1, 0.75),
  cue('boom', SNAP_T + 0.01, 0.34, 0.2),
  cue('smash', SNAP_T + 0.02, 0.7, 0.05),
  // Under the sand: a creepy drone, the worm slithering, a ding on "ten feet".
  cue('whoosh', UP_AT - 0.25, 0.6, 0.35),
  cue('drone', UP_AT, 0.62, 0.45),
  cue('rustle', UP_AT + 0.1, 0.5, 0.1, -0.3),
  cue('ding', TEN_AT + 0.05, 1, 0.5, 0.35),
  cue('click', FEET_AT + 0.12, 1.2, 0.12, 0.35),
  cue('rustle', WORM_AT, 0.45, 0.1, 0.2),
  cue('rustle', HIDES_AT + 0.2, 0.42, 0.1, -0.2),
  cue('rustle', SAND_AT + 0.1, 0.4, 0.08),
  // The lurk: still, a low hum, the jaws ticking.
  cue('drone', WITH_AT - 0.1, 0.7, 0.35),
  cue('clack', JAWS2_AT + 0.05, 1.2, 0.35, 0.1),
  cue('clack', SHOWING_AT + 0.15, 1.15, 0.3, 0.1),
  // A fish noses the feelers: a heartbeat, a tick on each touch.
  ...HEART,
  cue('free', BRUSHES_AT + 0.05, 1.7, 0.04, -0.3),
  cue('click', FEELERS_AT, 1.6, 0.1, -0.3),
  cue('click', FEELERS_AT + 0.18, 1.7, 0.08, -0.3),
  // SNAP!
  cue('lunge', SNAP_AT - 0.12, 0.6, 0.18),
  cue('shink', LURK_SNAP_T - 0.03, 0.9, 0.95),
  cue('boom', LURK_SNAP_T, 0.3, 0.28),
  cue('smash', LURK_SNAP_T + 0.01, 0.6, 0.08),
  // Gone, down into the dark.
  cue('whoosh', GONE_AT, 0.4, 0.5),
  cue('drop', GONE_AT + 0.2, 0.5, 0.1),
  cue('rustle', GONE_AT + 0.3, 0.4, 0.12),
  cue('lose', DOWN_AT + 0.1, 0.45, 0.07),
  cue('drone', DARK_AT, 0.5, 0.4),
  // The aquarium: comic.
  cue('free', ONE_AT, 1.5, 0.08),
  cue('clack', HID_AT + 0.05, 1.4, 0.4, 0.2),
  cue('drop', HID_AT + 0.28, 1.3, 0.1, 0.2),
  cue('ding', ENGLISH_AT + 0.05, 1.35, 0.4, 0.4),
  cue('splash', AQUARIUM_AT, 1.1, 0.06),
  ...FLIP_CUES,
  // Barry: ta-da.
  cue('whoosh', THEY_AT, 1.3, 0.3),
  cue('tada', BARRY_AT, 1, 0.5),
  cue('sparkle', BARRY_AT + 0.08, 1, 0.35, 0.2),
  // And back into the dark: frame 1 again.
  cue('whoosh', AND_AT - 0.15, 0.55, 0.45),
  cue('drone', AND_AT + 0.05, 0.8, 0.45),
  cue('boom', AND_AT + 0.1, 0.28, 0.16),
  cue('rustle', KNOWS_AT - 0.35, 0.55, 0.12),
  cue('suck', KNOWS_AT, 0.5, 0.12),
  cue('lunge', LOOP_S - 0.3, 0.45, 0.12),
];
