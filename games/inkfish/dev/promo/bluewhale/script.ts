import type { SfxId } from '../../../src/audio/recipes';
import {
  BALANCE_IN, BALANCE_OUT, BIGGER_AT, BODY_AT, CALORIES_AT, HOOK_SHUT, KEEPS_AT, LOOP_S, LUNGES_AT, MILLION_AT, NEARLY_AT, OPENS_AT, OUT_AT,
  PARACHUTE_AT, POUNDS_AT, PUSHES_AT, REWINDS, SHUT_S, SO_AT, THROAT_AT, WATER_AT, WATER_LANDS, wrap, FOUR_AT, AND_ITS_AT, BALLOONS_AT, KRILL2_AT,
} from './story';
import { TEMPO, WORDS, type Word } from './words';

/** The captions, the words over the picture and where they sit, and the sound effects under the voice. */

/** Every line of text: its baseline (y) and its full size, px. All of it stays between y 270 and 1240. */
export const TEXT = {
  caption: { y: 1200, size: 96 },
  pounds: { y: 400, size: 128 },
  tonnes: { y: 490, size: 84 },
  calories: { y: 410, size: 136 },
  caloriesUnit: { y: 500, size: 88 },
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

export interface SoundCue {
  readonly id: SfxId;
  readonly t: number;
  readonly pitch: number;
  readonly gain: number;
  readonly pan: number;
}

const cue = (id: SfxId, t: number, pitch: number, gain: number, pan = 0): SoundCue => ({ id, t, pitch, gain, pan });

/** The ticker racing up: ticks quickening towards "calories". */
const TICKS: readonly SoundCue[] = Array.from({ length: 14 }, (_, i) => {
  const u = i / 13;
  return cue('click', NEARLY_AT + (CALORIES_AT - NEARLY_AT) * Math.sqrt(u), 1.2 + 0.6 * u, 0.12, 0.25);
});
/** "≈ 400,000" counting up from "Four". */
const COUNT: readonly SoundCue[] = Array.from({ length: 9 }, (_, i) => cue('click', FOUR_AT + ((POUNDS_AT - FOUR_AT) * i) / 9, 0.9 + 0.08 * i, 0.1, -0.2));
/** The water gushing out through the baleen: splashes in a row. */
const GUSH: readonly SoundCue[] = Array.from({ length: 6 }, (_, i) => cue('splash', PUSHES_AT - 0.1 + i * 0.32, 0.55 + 0.05 * (i % 3), 0.2, (i % 2 ? 0.3 : -0.2)));

/**
 * Quiet under the voice: it does the talking. A huge whoosh and a deep gulp
 * boom in the hook; a rewind; a rising swell for the lunge and a deep roar
 * as the jaw drops; a stretchy creak as the throat balloons and the
 * parachute's "fwump"; the gulp; the whip pan, the water landing on the
 * scale's pan with a heavy clunk and a "ding" on the number; the gushing
 * sieve and a burp of bubbles for the chuckle; the ticker's ticks and a
 * cash-register ding-ding for the calories; the rewind into the lunge.
 */
export const SOUNDS: readonly SoundCue[] = [
  // The hook: the water rushing in, the gulp.
  cue('suck', 0.02, 0.42, 0.3),
  cue('lunge', 0.05, 0.4, 0.22, 0.1),
  cue('dash', BIGGER_AT - 0.08, 0.7, 0.18, -0.2),
  cue('suck', BIGGER_AT + 0.1, 0.5, 0.16, 0.2),
  cue('eatBig', HOOK_SHUT - 0.02, 0.42, 0.3),
  cue('boom', HOOK_SHUT, 0.3, 0.2),
  cue('drop', BODY_AT + 0.55, 0.7, 0.12, -0.1),
  // Rewind.
  cue('dash', REWINDS[0].from, 1.6, 0.2, -0.3),
  cue('rustle', REWINDS[0].from + 0.1, 1.8, 0.12, -0.3),
  // The lunge: a rising swell, the fluke's thrusts, the jaw dropping.
  cue('suck', LUNGES_AT - 0.35, 0.36, 0.28),
  cue('lunge', LUNGES_AT, 0.45, 0.2, -0.15),
  cue('lunge', LUNGES_AT + 0.75, 0.5, 0.18, 0.15),
  cue('suck', OPENS_AT - 0.05, 0.5, 0.32, 0.1),
  cue('boom', OPENS_AT + 0.35, 0.36, 0.12),
  // The throat stretching (a creak), the pouch filling, the parachute's fwump.
  cue('zap', AND_ITS_AT + 0.25, 0.42, 0.1, 0.2),
  cue('yuck', THROAT_AT + 0.15, 0.55, 0.08, 0.2),
  cue('zap', BALLOONS_AT + 0.2, 0.36, 0.12, 0.2),
  cue('suck', BALLOONS_AT, 0.62, 0.2, 0.2),
  cue('lash', PARACHUTE_AT - 0.3, 0.55, 0.24, -0.35),
  cue('lunge', PARACHUTE_AT - 0.04, 0.9, 0.2, -0.35),
  cue('drop', PARACHUTE_AT + 0.25, 1.4, 0.14, -0.35),
  // The gulp.
  cue('eatBig', SHUT_S - 0.02, 0.4, 0.3),
  cue('boom', SHUT_S, 0.3, 0.2),
  // Whip down to the scale; the water lands with a heavy clunk; the beam swings.
  cue('dash', BALANCE_IN.from, 0.9, 0.22),
  cue('splash', WATER_LANDS - 0.02, 0.5, 0.3, 0.3),
  cue('clang', WATER_LANDS, 0.3, 0.3, 0.3),
  cue('boom', WATER_LANDS + 0.01, 0.45, 0.22, 0.3),
  cue('rustle', WATER_LANDS + 0.4, 0.6, 0.08, 0.2),
  cue('clang', WATER_AT + 0.05, 0.28, 0.12, 0.3),
  ...COUNT,
  cue('clang', POUNDS_AT, 1.2, 0.26),
  cue('boom', POUNDS_AT + 0.01, 0.5, 0.12),
  // Whip back: the water squirting out through the baleen; a satisfied burp of bubbles.
  cue('dash', BALANCE_OUT.from, 1.1, 0.2),
  ...GUSH,
  cue('suck', OUT_AT, 1.4, 0.1, 0.2),
  cue('drop', KEEPS_AT + 0.1, 0.9, 0.14),
  cue('drop', KRILL2_AT + 0.05, 1.1, 0.12),
  cue('eat', KRILL2_AT + 0.3, 0.7, 0.16),
  // The calories: ticks racing up, ding-ding, a sparkle.
  cue('dash', NEARLY_AT - 0.25, 1.3, 0.12, 0.2),
  ...TICKS,
  cue('powerup', MILLION_AT - 0.05, 1.0, 0.1, 0.2),
  cue('clang', CALORIES_AT + 0.02, 1.55, 0.2, 0.2),
  cue('clang', CALORIES_AT + 0.2, 1.85, 0.18, 0.2),
  // Rewind round into the lunge.
  cue('dash', REWINDS[1].from, 1.6, 0.2, -0.3),
  cue('rustle', REWINDS[1].from + 0.1, 1.8, 0.12, -0.3),
  cue('suck', SO_AT + 0.25, 0.4, 0.26),
  cue('lunge', REWINDS[1].to - 0.05, 0.42, 0.16, 0.1),
];
