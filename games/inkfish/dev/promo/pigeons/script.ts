import type { SfxId } from '../../../src/audio/recipes';
import {
  ALBI_AT, BECAUSE_AT, BURST_AT, FIVEFOOT_AT, FOUR_AT, GONE_AT, GRABS_AT, HUGE_AT, IGNORED_AT, LOOP_S, LUNCH_AT, LUNGE_FROM, MOVE_AT, NERVOUS_AT, NERVOUS_FROM, PIGEONS_AT,
  PLACE_FROM, SO_AT, STILL_AT, THEM_AT, TRICK_AT, WASHING_AT, WATER_AT, WHAM_AT, wrap,
} from './story';
import { TEMPO, WORDS, type Word } from './words';

/** What's written over the picture (positions) and the sound effects under the voice. */

/** Every text on the picture: baseline y and size, all inside the area the apps' buttons leave clear (y 270 to 1250). */
export const TEXT = {
  place: { y: 390, size: 130 },
  metric: { y: 440, size: 200 },
  us: { y: 550, size: 110 },
  timer: { y: 440, size: 210 },
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

/**
 * Quiet under the voice, one mood a beat: a crash and a splash for the shock,
 * a bright ding and light splashes for sunny Albi, a low drop and a boom for
 * the creeping shape, a smash and a splash for the WHAM, ticks and a gulp for
 * the timer, soft rustles for the statues, a click and a snap for the twitch,
 * a nervous drop, then the burst that lands on the loop's first frame.
 */
export const SOUNDS: readonly SoundCue[] = [
  // Frame 1: the water still falling, a crunch, the ding on "WATER" and "pigeons".
  cue('splash', 0.1, 0.8, 0.14, -0.2),
  cue('smash', 0.18, 1.3, 0.08, 0.2),
  cue('powerup', WATER_AT, 1.4, 0.1),
  cue('squawk', 0.6, 1.4, 0.07, 0.3),
  cue('clang', PIGEONS_AT, 1.6, 0.1),
  cue('dash', 2.1, 1.1, 0.1, -0.3),
  // Sunny Albi: a ding, splashes while the pigeons wash.
  cue('powerup', ALBI_AT, 1.5, 0.1),
  cue('click', ALBI_AT + 0.35, 1.7, 0.07, 0.2),
  cue('splash', WASHING_AT, 1.4, 0.07, -0.3),
  cue('splash', WASHING_AT + 0.5, 1.6, 0.06, 0.3),
  cue('rustle', WASHING_AT + 0.9, 1.3, 0.06, 0.2),
  cue('splash', WASHING_AT + 1.4, 1.5, 0.05, -0.2),
  // Nervous: a low drop, a creeping boom, a spotted sting.
  cue('drop', NERVOUS_FROM, 0.4, 0.14),
  cue('boom', HUGE_AT - 0.2, 0.4, 0.12, -0.3),
  cue('rustle', HUGE_AT + 0.4, 0.5, 0.07, -0.2),
  cue('spotted', THEM_AT - 0.2, 0.8, 0.09, 0.2),
  // WHAM: a smash, a big splash, a lunge, a ding on the length.
  cue('smash', WHAM_AT, 1.1, 0.16),
  cue('splash', WHAM_AT + 0.02, 0.6, 0.18, -0.1),
  cue('lunge', LUNGE_FROM + 0.2, 0.6, 0.12, 0.2),
  cue('squawk', WHAM_AT + 0.15, 1.5, 0.09, 0.3),
  cue('powerup', FIVEFOOT_AT + 0.4, 1.5, 0.1),
  // Laugh: ticks for the timer, a dash back, a splash and a bright ding on "lunch".
  ...[0, 1, 2, 3, 4, 5, 6, 7].map((i) => cue('click', FOUR_AT + 0.15 + i * 0.2, 1.4 + i * 0.07, 0.07, i % 2 ? 0.2 : -0.2)),
  cue('dash', FOUR_AT + 0.9, 0.9, 0.1, -0.3),
  cue('splash', GONE_AT, 0.8, 0.14, -0.2),
  cue('powerup', LUNCH_AT - 0.1, 1.6, 0.12),
  cue('yuck', LUNCH_AT + 0.1, 1.5, 0.05),
  // Cheeky: soft rustles as the whiskers pass, a sly click on "ignored".
  cue('rustle', TRICK_AT + 0.2, 0.7, 0.07, -0.3),
  cue('rustle', STILL_AT - 0.4, 0.6, 0.07, 0.2),
  cue('click', IGNORED_AT - 0.05, 1.3, 0.1),
  // Tension: twitches, then the snap on "MOVE".
  cue('click', GRABS_AT - 0.1, 1.8, 0.07, 0.3),
  cue('click', GRABS_AT + 0.3, 1.9, 0.08, 0.3),
  cue('click', MOVE_AT - 0.35, 2.0, 0.1, 0.3),
  cue('lash', MOVE_AT, 1.0, 0.14, -0.2),
  cue('dash', MOVE_AT + 0.05, 1.5, 0.08, -0.3),
  // Comic: a nervous drop and a sting, then the burst into frame 1.
  cue('drop', SO_AT, 0.5, 0.1),
  cue('spotted', NERVOUS_AT - 0.2, 0.9, 0.09, -0.2),
  cue('boom', BECAUSE_AT - 0.35, 0.35, 0.12),
  cue('rustle', BURST_AT - 0.2, 0.5, 0.08, -0.3),
  cue('smash', BURST_AT + 0.35, 1.2, 0.16),
  cue('splash', BURST_AT + 0.4, 0.6, 0.16, 0.1),
  cue('splash', LOOP_S - 0.02, 0.8, 0.1, -0.1),
  cue('lunge', BURST_AT + 0.1, 0.6, 0.1, -0.2),
];
