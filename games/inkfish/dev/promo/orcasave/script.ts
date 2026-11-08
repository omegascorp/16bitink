import type { SfxId } from '../../../src/audio/recipes';
import {
  ANTARCTICA_AT, ARCHED_AT, CHEST_AT, CRASHED_AT, FLOE_AT, FLOE_FROM, HOOK_BACK, HUMPBACK_AT, HUMPBACKS_AT, HUNDRED_AT, IT_AT, KNOWS_AT, LANDED_AT, LIFTED_AT, LOOP_S, MONTAGE_FROM, NINE_AT,
  NOBODY_AT, ORCAS_AT, ORCAS_HOOK_AT, OVER_AT, ROLLED_AT, SAVE_FROM, SEAL_LAND_AT, SEAL_OFF_AT, TICK_AT, TIMES_AT, UP_AT, WASHED_AT, WATER_AT, WAVE_FROM, WHY_AT, WHY_FROM, wrap, BUT_AT,
} from './story';
import { SLIDE_FROM, SPLASH_T, WAVE_HIT } from './motion';
import { TEMPO, WORDS, type Word } from './words';

/** What's written over the picture (positions) and the sound effects under the voice. */

/** Every text on the picture: baseline y and size, all inside the area the apps' buttons leave clear (y 270 to 1250). */
export const TEXT = {
  place: { y: 360, size: 112 },
  year: { y: 500, size: 160 },
  count: { y: 470, size: 250 },
  countLabel: { y: 590, size: 84 },
  mark: { y: 590, size: 300 },
  caption: { y: 1200, size: 96 },
} as const;

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

export interface SoundCue {
  readonly id: SfxId;
  readonly t: number;
  readonly pitch: number;
  readonly gain: number;
  readonly pan: number;
}

const cue = (id: SfxId, t: number, pitch: number, gain: number, pan = 0): SoundCue => ({ id, t, pitch, gain, pan });

/** The counter's ticks, climbing in pitch. */
const TICKS: readonly SoundCue[] = TICK_AT.map((t, i) => cue('click', t, 1.1 + 0.1 * i, 0.12, 0.3));
/** The orca fins' low passes. */
const SWOOSH: readonly SoundCue[] = [0, 1, 2].map((i) => cue('rustle', ORCAS_AT + 0.2 + i * 0.45, 0.5 + 0.1 * i, 0.1, i - 1));

/**
 * Quiet under the voice, one mood a beat: a splash and a bright surprise ding in
 * the hook; low nervous notes for the cold floe; tense lunges and a splash as the
 * wave tips the seal off; a low boom and a rising whoosh for the roll and the
 * landing (dramatic); a swelling power-up and a splash for the lift (excited);
 * a bright ding per ten for the counter (curious); a soft, low note for the
 * question; and the whoosh back.
 */
export const SOUNDS: readonly SoundCue[] = [
  // The hook: a splash, a surprise ding on "whale", a clang on "ORCAS!".
  cue('splash', 0.12, 0.7, 0.12, -0.1),
  cue('spotted', 0.5, 1.5, 0.12, 0.1),
  cue('boom', ORCAS_HOOK_AT, 0.32, 0.16),
  cue('lunge', ORCAS_HOOK_AT - 0.06, 0.45, 0.14, 0.2),
  // Antarctica: cold, nervous.
  cue('dash', FLOE_FROM + 0.05, 0.8, 0.1, -0.3),
  cue('drop', ANTARCTICA_AT, 0.5, 0.1),
  cue('click', NINE_AT, 1.1, 0.08, 0.2),
  // Orcas wash the seal off.
  cue('lunge', WAVE_FROM + 0.1, 0.4, 0.16, -0.2),
  ...SWOOSH,
  cue('spotted', WASHED_AT, 0.7, 0.1, 0.2),
  cue('boom', WAVE_HIT, 0.35, 0.14, 0.2),
  cue('rustle', SLIDE_FROM, 1.1, 0.1, 0.3),
  cue('drop', SEAL_OFF_AT + 0.3, 0.6, 0.08),
  cue('drop', FLOE_AT, 0.5, 0.08),
  cue('splash', SPLASH_T, 0.8, 0.2, 0.3),
  // The humpback rises and rolls: dramatic.
  cue('dash', SAVE_FROM + 0.05, 0.6, 0.1, -0.3),
  cue('lunge', HUMPBACK_AT, 0.4, 0.16, -0.2),
  cue('rustle', ROLLED_AT, 0.55, 0.12, 0.1),
  cue('dash', OVER_AT - 0.2, 0.8, 0.12, 0.2),
  cue('splash', OVER_AT, 0.6, 0.12, -0.1),
  cue('spotted', SEAL_LAND_AT, 0.8, 0.12),
  cue('suck', LANDED_AT, 0.6, 0.1, 0.1),
  cue('boom', CHEST_AT, 0.28, 0.2),
  cue('clang', CHEST_AT + 0.05, 1.4, 0.1),
  // The lift: bright.
  cue('powerup', IT_AT, 1.1, 0.1, -0.1),
  cue('lunge', ARCHED_AT, 0.6, 0.16, 0.2),
  cue('dash', UP_AT, 1.2, 0.1, -0.3),
  cue('powerup', LIFTED_AT, 1.5, 0.1, 0.2),
  cue('splash', LIFTED_AT + 0.1, 1.0, 0.14, 0.3),
  cue('rustle', LIFTED_AT + 0.4, 1.4, 0.1, -0.3),
  cue('powerup', WATER_AT, 1.9, 0.12, 0.1),
  // The montage: curious.
  cue('dash', MONTAGE_FROM + 0.05, 1.2, 0.1, 0.3),
  cue('lunge', HUMPBACKS_AT, 0.5, 0.12, -0.3),
  cue('lunge', CRASHED_AT + 0.35, 0.6, 0.1, 0.3),
  ...TICKS,
  cue('clang', HUNDRED_AT + 0.05, 1.8, 0.12),
  cue('powerup', TIMES_AT, 1.3, 0.08, 0.1),
  // Why? Nobody knows…: soft.
  cue('drop', WHY_AT, 0.45, 0.1),
  cue('spotted', WHY_FROM + 0.1, 0.6, 0.08),
  cue('drop', NOBODY_AT, 0.4, 0.07, -0.1),
  cue('rustle', KNOWS_AT + 0.3, 0.5, 0.05),
  // And whip back.
  cue('dash', HOOK_BACK, 1.6, 0.12, 0.4),
  cue('lunge', BUT_AT, 0.5, 0.1, 0.2),
  cue('splash', LOOP_S - 0.3, 0.7, 0.1, 0.2),
  cue('splash', OVER_AT + 1.4, 0.7, 0.06, 0.2),
];
