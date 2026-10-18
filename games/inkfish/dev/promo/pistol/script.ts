import type { SfxId } from '../../../src/audio/recipes';
import {
  BANG_AT, BED, bedSnapTimes, BUBBLE_AT, BURSTS_AT, CLAW_AT, DEGREES_AT, FIVE_AT, FLASH_AT, IT_AT, LOOP_S, PISTOL_AT, PREY_AT, QUICK_PEAKS, QUICK_SNAPS, SNAP_FIRE,
  STUNS_AT, SUBMARINES_AT, SUN_AT,
} from './story';
import { TEMPO, WORDS, type Word } from './words';

/** The captions (the voiceover word by word) and the sound effects under the voice. */

// ---------------------------------------------------------------- captions

export interface Line {
  readonly words: readonly Word[];
  /** Shown from its first word until the next line takes over. */
  readonly from: number;
  readonly to: number;
}

/** How many words each caption line takes: broken where the narrator breathes, at most four words. */
const LINE_WORDS: readonly number[] = [3, 4, 3, 3, 3, 2, 4, 3, 2, 2, 3, 3, 4, 4, 2, 3, 3];

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

/** A quick snap: the claw's crack and the little bang of its bubble. */
const quickSnap = (snap: number, peak: number): SoundCue[] => [
  cue('click', snap + 0.03, 0.55, 0.9, 0.2),
  cue('smash', snap + 0.03, 1.5, 0.22, 0.25),
  cue('boom', peak, 1.7, 0.22, 0.35),
];

/** The bed's crackle: one tick per snap mark, panned to where it is. */
const crackle: SoundCue[] = bedSnapTimes().map(({ t, i }, k) =>
  cue('click', t, 0.7 + ((k * 37) % 9) * 0.08, 0.32, Math.max(-0.8, Math.min(0.8, (BED[i]!.x - 600) / 1800))),
);

/** Quiet under the voice: it does the talking. Every cue sits inside the loop (the mix folds the tails back round). */
export const SOUNDS: readonly SoundCue[] = [
  ...QUICK_SNAPS.flatMap((s, i) => quickSnap(s, ((QUICK_PEAKS[i]! - s + LOOP_S) % LOOP_S) + s)).map((c) => ({ ...c, t: c.t % LOOP_S })),
  cue('click', 0.85, 0.75, 0.35, 0.2),
  cue('powerup', SUN_AT, 0.9, 0.12, -0.3),
  cue('click', PISTOL_AT - 0.05, 0.75, 0.35, 0.2),
  cue('dash', PISTOL_AT + 0.1, 1.5, 0.06, 0.6),
  cue('click', CLAW_AT, 1.2, 0.25, 0),
  // Fired: the crack, the jet, the bubble.
  cue('click', SNAP_FIRE + 0.03, 0.5, 1, 0.1),
  cue('smash', SNAP_FIRE + 0.03, 1.2, 0.3, 0.1),
  cue('dash', SNAP_FIRE + 0.05, 0.75, 0.22, 0.3),
  cue('drop', BUBBLE_AT + 0.05, 0.7, 0.12, 0.4),
  // It bursts and heats up.
  cue('suck', BURSTS_AT, 1.6, 0.14, 0.4),
  cue('grow', FIVE_AT, 0.8, 0.12, 0.3),
  cue('zap', DEGREES_AT, 0.7, 0.12, 0.3),
  // Flash, BANG, a dizzy fish, tugged in.
  cue('zap', FLASH_AT, 1.4, 0.18, 0.3),
  cue('boom', BANG_AT + 0.04, 0.9, 0.24, 0.3),
  cue('smash', BANG_AT + 0.04, 0.7, 0.16, 0.3),
  cue('lose', STUNS_AT + 0.05, 1.4, 0.11, 0.4),
  cue('lunge', PREY_AT + 0.25, 1.5, 0.12, 0.1),
  // WWII: the bed crackles, a submarine's ping comes back muffled.
  ...crackle,
  cue('clang', SUBMARINES_AT + 0.1, 0.62, 0.13, -0.4),
  cue('clang', SUBMARINES_AT + 1.0, 0.62, 0.06, 0.2),
  // Cocked and locked for the loop's snap.
  cue('click', IT_AT, 0.75, 0.35, 0.2),
].filter((c) => c.t >= 0 && c.t < LOOP_S);
