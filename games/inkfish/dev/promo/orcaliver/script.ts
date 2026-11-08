import type { SfxId } from '../../../src/audio/recipes';
import { window01 } from '../short';
import {
  A_AT, ALL_AT, AND_AT, BACK_AT, BECAUSE_AT, BODY_AT, DOWN_AT, EATERS_AT, ENERGY_AT, FAT_AT, FLIPPED_AT, GREAT_AT, LIMP_AT, LIVER_AT, LOOP_S, MEXICO_AT,
  OFF_AT, ONE_AT, ORCAS_AT, PICKY_AT, POD_AT, QUARTER_AT, SHARK_AT, STRAIGHT_AT, THEN_AT, UPSIDE_AT, WHITE_END, wrap, YES_AT, YOUNG_AT,
} from './story';
import { TEMPO, WORDS, type Word } from './words';

/** What's written over the picture (labels and captions), and the sound effects under the voice. */

// ---------------------------------------------------------------- labels

/** "Gulf of California" / "Mexico", from "Off" until the cut to the flip. */
export const placeLabel = (t: number): number => window01(wrap(t), OFF_AT - 0.05, A_AT - 0.12, 0.2);
/** "liver", pointing at it, from just after "LIVER!" until the split. */
export const liverLabel = (t: number): number => window01(wrap(t), LIVER_AT + 0.12, QUARTER_AT - 0.05, 0.15);
/** The "¼", popping up on "QUARTER" until the cut to the battery. */
export const quarterLabel = (t: number): number => window01(wrap(t), QUARTER_AT - 0.05, ALL_AT - 0.1, 0.15);
/** How long since the "¼" popped, s (for its overshoot). */
export const quarterSince = (t: number): number => wrap(t) - QUARTER_AT;
/** The three "z"s drifting up from the limp shark: each one's age in s (negative: not yet). */
export const zAges = (t: number): readonly number[] => [0, 0.22, 0.44].map((d) => wrap(t) - (LIMP_AT + 0.05 + d));
/** The "z"s fade as the orca charges in. */
export const zAlpha = (t: number): number => window01(wrap(t), LIMP_AT, THEN_AT + 0.3, 0.2);

/**
 * Where every line of text sits (baseline y and font size), so it can be
 * checked against the safe area: between y 270 and 1250. The "¼" pops up to
 * `quarterPop` times its size; the "z"s rise `zRise` px from `z.y`.
 */
export const TEXT = {
  caption: { y: 1200, size: 96 },
  place: { y: 400, size: 96 },
  placeSub: { y: 488, size: 74 },
  liver: { x: 540, y: 1060, size: 92 },
  quarter: { x: 540, y: 500, size: 210 },
  quarterPop: 1.2,
  z: { x: 830, y: 640, size: 120 },
  zRise: 260,
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

/** The game's own effects, plus a few made for this short in audio.ts. */
export type ExtraSfx = 'orca' | 'drone' | 'ding' | 'chime' | 'slide' | 'sting';

export interface SoundCue {
  readonly id: SfxId | ExtraSfx;
  readonly t: number;
  readonly pitch: number;
  readonly gain: number;
  readonly pan: number;
}

const cue = (id: SoundCue['id'], t: number, pitch: number, gain: number, pan = 0): SoundCue => ({ id, t, pitch, gain, pan });

/** A slow heartbeat under the tension, lub-dub. */
const HEART: readonly SoundCue[] = [0, 0.55, 1.05].flatMap((d, i) => [
  cue('boom', OFF_AT + 0.05 + d, 0.42, 0.11 + i * 0.02),
  cue('boom', OFF_AT + 0.22 + d, 0.5, 0.07 + i * 0.015),
]);

/**
 * Quiet under the voice: it does the talking. Menace in the hook (a deep
 * boom, an orca's call, water drawn into the open jaws), tension off Mexico
 * (a low drone, a slow heartbeat, a far call), action for the flip (whooshes,
 * the ram, a splash roll), an eerie drone and soft blips for the "z"s as the
 * shark goes limp, a whoosh and a "!" sting for the charge and the LIVER, a
 * ding on QUARTER, drips, a power-up chime and a zap for the battery, a comic
 * slide whistle and sting for the picky eater, and the orca swinging back in.
 */
export const SOUNDS: readonly SoundCue[] = [
  // Menace: something huge, its call, water drawn in.
  cue('boom', 0.02, 0.28, 0.2),
  cue('orca', ORCAS_AT + 0.25, 1, 0.07, 0.25),
  cue('suck', ONE_AT - 0.3, 0.55, 0.16),
  cue('lunge', GREAT_AT, 0.42, 0.12),
  // Tension: wide water, a drone, a heartbeat, a far call.
  cue('splash', WHITE_END + 0.15, 0.5, 0.1, -0.3),
  cue('drone', OFF_AT - 0.1, 0.9, 0.09),
  ...HEART,
  cue('orca', MEXICO_AT + 0.2, 1.15, 0.035, 0.5),
  // Action: the pod closes in, the ram, the splash roll.
  cue('dash', A_AT - 0.15, 0.8, 0.16, 0.3),
  cue('dash', POD_AT + 0.1, 0.7, 0.14, -0.3),
  cue('lunge', FLIPPED_AT, 0.5, 0.2),
  cue('smash', FLIPPED_AT + 0.25, 0.6, 0.1),
  cue('splash', YOUNG_AT + 0.1, 0.7, 0.16, -0.2),
  cue('splash', UPSIDE_AT - 0.1, 0.55, 0.2, 0.2),
  cue('splash', UPSIDE_AT + 0.2, 0.8, 0.14, -0.1),
  cue('dash', DOWN_AT, 0.5, 0.12),
  // Eerie: everything goes still.
  cue('drone', AND_AT - 0.15, 0.75, 0.12),
  cue('suck', SHARK_AT, 0.32, 0.12),
  cue('clang', BACK_AT, 0.6, 0.04, 0.3),
  cue('free', LIMP_AT + 0.08, 0.7, 0.07, 0.3),
  cue('free', LIMP_AT + 0.3, 0.85, 0.06, 0.35),
  cue('free', LIMP_AT + 0.52, 1.0, 0.05, 0.4),
  // Shock: the charge, the flash on LIVER.
  cue('dash', THEN_AT, 0.55, 0.2, -0.4),
  cue('lunge', STRAIGHT_AT, 0.45, 0.2, -0.2),
  cue('spotted', LIVER_AT - 0.04, 0.9, 0.12),
  cue('boom', LIVER_AT, 0.35, 0.22),
  // Excited: the split and a ding on QUARTER.
  cue('click', QUARTER_AT - 0.08, 1.2, 0.18),
  cue('ding', QUARTER_AT + 0.02, 1, 0.09, 0.15),
  cue('rustle', BODY_AT, 1.6, 0.06),
  // Hype: drips into the battery, a power-up chime, the zap.
  cue('drop', ALL_AT + 0.1, 1.3, 0.09, -0.1),
  cue('drop', FAT_AT, 1.5, 0.09, 0.1),
  cue('drop', FAT_AT + 0.2, 1.7, 0.08),
  cue('powerup', ENERGY_AT - 0.1, 1, 0.12),
  cue('chime', ENERGY_AT, 1, 0.08),
  cue('zap', ENERGY_AT + 0.05, 1.2, 0.08),
  // Comic: the nose goes up, a sting.
  cue('slide', PICKY_AT - 0.05, 1, 0.08, -0.2),
  cue('sting', EATERS_AT + 0.2, 1, 0.09),
  // The orca swinging back in over the shark.
  cue('dash', BECAUSE_AT - 0.3, 0.7, 0.14, 0.3),
  cue('boom', YES_AT, 0.26, 0.16),
  cue('suck', YES_AT + 0.2, 0.5, 0.14),
];
