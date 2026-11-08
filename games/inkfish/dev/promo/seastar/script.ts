import type { SfxId } from '../../../src/audio/recipes';
import {
  A_AT, BACK_AT, BECAUSE_AT, BODY_END, CRACK_AT, DINNER_AT, IN_END, INTO_AT, IT2_AT, LIKE_AT, LOOP_S, LOT_END, MOUTH_AT, MUSSEL_AT, OPEN_AT, OUT_AT, OUTSIDE_AT,
  PAPER_AT, PARKING_AT, PUSHES_AT, REWIND, SHELL_AT, SLURPS_AT, STARFISH_AT, STOMACH_AT, STOMACH3_AT, TAKEOUT_AT, THEN2_AT, THIN_AT, TUGS_AT, wrap, YES_AT,
} from './story';
import { TEMPO, WORDS, type Word } from './words';

/** What's written over the picture (the captions), and the sound effects under the voice. */

/** Where every line of text sits (baseline y and font size), so it can be checked against the safe area: between y 270 and 1240. */
export const TEXT = {
  caption: { y: 1200, size: 96 },
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

/** The shell creaking as it gives: slow low clicks speeding up. */
const CREAK: readonly SoundCue[] = Array.from({ length: 12 }, (_, i) => cue('click', OPEN_AT - 0.42 + i * (0.05 - i * 0.002), 0.34 + i * 0.012, 0.09, 0.25));
/** A slow, tense heartbeat under the crack. */
const HEART: readonly SoundCue[] = [0.05, 0.62, 1.12].flatMap((d) => [cue('boom', A_AT + d, 0.38, 0.12), cue('boom', A_AT + d + 0.17, 0.46, 0.08)]);
/** Digesting: bubbles blipping up. */
const BLIPS: readonly SoundCue[] = [0.1, 0.32, 0.5, 0.78, 0.95, 1.2].map((d, i) => cue('drop', IT2_AT + d, 1.35 + (i % 3) * 0.22, 0.07, (i % 2 ? 0.3 : -0.3)));

/**
 * Quiet under the voice: it does the talking. Rock-pool water lapping and a
 * squelchy throb for the surprised hook, a tape-rewind whoosh, a heave and a
 * creak as the shell gives, a tense heartbeat and a paper rustle for the
 * crack, a squelchy-cute slide and a bright pop for "INTO the shell!",
 * bubble blips for the amused digesting, a car door, radio blips and static
 * for the takeout, a big slurp and a clean "ding", a whoosh on to the next
 * mussel and the squelch of frame 1.
 */
export const SOUNDS: readonly SoundCue[] = [
  // The hook: water lapping, a surprised sting, the stomach squelching and throbbing.
  cue('splash', 0.03, 0.45, 0.07, -0.3),
  cue('spotted', STARFISH_AT, 1.1, 0.05),
  cue('suck', STOMACH_AT - 0.05, 0.75, 0.13),
  cue('suck', OUTSIDE_AT, 0.95, 0.16),
  cue('grow', OUTSIDE_AT + 0.1, 1.3, 0.05),
  cue('splash', BODY_END - 0.3, 0.42, 0.06, 0.3),
  // Rewind.
  cue('dash', REWIND.from, 1.6, 0.14, -0.3),
  cue('rustle', REWIND.from + 0.05, 1.8, 0.1, -0.3),
  // The tug: a heave, strain, and the creak as the shell gives.
  cue('lash', TUGS_AT, 0.5, 0.1, 0.2),
  cue('lunge', TUGS_AT + 0.05, 0.4, 0.08, 0.2),
  cue('lash', MUSSEL_AT + 0.1, 0.45, 0.09, 0.2),
  ...CREAK,
  cue('clang', OPEN_AT + 0.05, 0.55, 0.06, 0.2),
  // The crack: a heartbeat, and the paper sliding in.
  ...HEART,
  cue('rustle', THIN_AT - 0.15, 1.5, 0.13, 0.4),
  cue('rustle', PAPER_AT, 1.25, 0.11, 0.2),
  cue('click', PAPER_AT + 0.1, 1.6, 0.08, 0.1),
  cue('boom', CRACK_AT, 0.3, 0.08),
  // The push: a squelchy slide out of the mouth, a pop INTO the shell.
  cue('suck', PUSHES_AT - 0.05, 0.55, 0.18),
  cue('suck', MOUTH_AT - 0.1, 0.72, 0.16),
  cue('grow', OUT_AT, 0.9, 0.07),
  cue('eatBig', INTO_AT, 0.95, 0.14),
  cue('free', SHELL_AT, 1.45, 0.08),
  cue('powerup', SHELL_AT + 0.08, 1.2, 0.05),
  // Digesting: water lapping, bubble blips.
  cue('splash', IT2_AT, 0.45, 0.06, -0.2),
  ...BLIPS,
  cue('drop', DINNER_AT, 1.9, 0.07),
  // Takeout: a car door, radio blips and static.
  cue('clang', LIKE_AT - 0.12, 0.5, 0.12, -0.2),
  cue('click', TAKEOUT_AT, 1.5, 0.1, 0.3),
  cue('zap', TAKEOUT_AT + 0.08, 1.8, 0.03, 0.3),
  cue('free', PARKING_AT, 1.7, 0.06, 0.3),
  cue('click', LOT_END - 0.05, 1.4, 0.08, 0.3),
  // The slurp, and the clean shell's ding.
  cue('suck', THEN2_AT + 0.3, 0.6, 0.08),
  cue('suck', SLURPS_AT - 0.05, 1.1, 0.28),
  cue('suck', SLURPS_AT + 0.25, 1.4, 0.2),
  cue('eat', STOMACH3_AT + 0.05, 0.9, 0.2),
  cue('powerup', BACK_AT, 1.6, 0.07),
  // On to the next mussel, and frame 1.
  cue('dash', IN_END + 0.05, 0.8, 0.12),
  cue('splash', BECAUSE_AT, 0.5, 0.08, 0.3),
  cue('suck', YES_AT, 0.7, 0.14),
  cue('grow', YES_AT + 0.1, 1.1, 0.04),
];
