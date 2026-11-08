import type { SfxId } from '../../../src/audio/recipes';
import {
  AND_AT, CAMERAS_AT, CAUGHT_AT, CHOKED_AT, FOURTEEN_AT, GAGGED_AT, GAG_FROM, GILLS_AT, GILLS_FROM, GO_AT, HALF_AT, IT_AT, KNOT_AT, KNOT_FROM, LET_AT, LOOP_S, OFF_AT, REGRETTED_AT,
  SECOND_AT, SHARKS_AT, SHOT_AT, SLIME_AT, SLIME_FROM, STRAIGHT_AT, THEN_AT, TIED_AT, TIMES_AT, UNDER_AT, VIEW_FROM, WIPE_AT, YES_AT, wrap,
} from './story';
import { TEMPO, WORDS, type Word } from './words';

/** What's written over the picture (positions) and the sound effects under the voice. */

/** Every text on the picture: baseline y and size, all inside the area the apps' buttons leave clear (y 270 to 1250). */
export const TEXT = {
  stopwatch: { y: 780, size: 150 },
  count: { y: 510, size: 240 },
  countSub: { y: 585, size: 66 },
  zealand: { y: 690, size: 84 },
  rec: { y: 345, size: 64 },
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
 * Quiet under the voice, one mood a beat: a snap, a chomp and a ding on the
 * wide eye for the hook (excited, then comic); a tick-tick, a boom and a
 * burst of wet pops for the slime (dramatic); slurping gulps for the gills
 * (disgusted); a gag, a choke and a pop for the let-go (surprised); a spring,
 * a sliding squeak and a cheery chime for the knot (laughing); a camera click
 * and a sly creep for the viewfinder (mischievous).
 */
export const SOUNDS: readonly SoundCue[] = [
  // The hook: a snap, a chomp, a bright ding, then the eye goes wide.
  cue('smash', 0.06, 1.4, 0.1, 0.2),
  cue('suck', 0.2, 0.7, 0.12, 0.1),
  cue('splash', 1.0, 0.9, 0.07, -0.2),
  cue('click', 1.1, 1.4, 0.08),
  cue('clang', REGRETTED_AT - 0.05, 1.7, 0.1),
  cue('spotted', REGRETTED_AT + 0.05, 1.3, 0.12),
  cue('yuck', REGRETTED_AT + 0.2, 1.6, 0.06, 0.1),
  // The slime: a stopwatch ticks, a boom, a spray of wet pops.
  cue('boom', SLIME_FROM, 0.4, 0.12),
  cue('click', UNDER_AT, 1.5, 0.08),
  cue('click', UNDER_AT + 0.25, 1.6, 0.08),
  cue('click', HALF_AT + 0.1, 1.7, 0.08),
  cue('click', HALF_AT + 0.3, 1.8, 0.08),
  cue('powerup', SECOND_AT, 1.6, 0.08),
  cue('drop', SHOT_AT - 0.05, 0.5, 0.12),
  cue('frenzy', SHOT_AT, 1.5, 0.08),
  cue('splash', SHOT_AT, 0.55, 0.16, -0.2),
  cue('eat', SHOT_AT + 0.12, 1.5, 0.08, 0.3),
  cue('eat', SHOT_AT + 0.22, 1.2, 0.08, -0.3),
  cue('eat', SLIME_AT, 1.0, 0.08, 0.1),
  // The gills: slurping.
  cue('suck', GILLS_FROM, 0.45, 0.14),
  cue('yuck', STRAIGHT_AT + 0.1, 0.9, 0.1, -0.2),
  cue('suck', SHARKS_AT, 0.5, 0.12, 0.2),
  cue('yuck', GILLS_AT - 0.1, 1.1, 0.12),
  cue('rustle', GILLS_AT, 0.5, 0.1),
  // The gag.
  cue('hurt', GAG_FROM + 0.05, 0.7, 0.12),
  cue('yuck', IT_AT, 0.8, 0.12),
  cue('lunge', GAGGED_AT, 0.5, 0.12, -0.2),
  cue('hurt', CHOKED_AT, 0.6, 0.12, 0.2),
  cue('rustle', CHOKED_AT + 0.25, 0.6, 0.08),
  cue('free', LET_AT, 1.1, 0.14),
  cue('splash', LET_AT + 0.05, 1.0, 0.1, 0.2),
  cue('dash', GO_AT, 1.3, 0.12, 0.4),
  // The knot: cheerful.
  cue('dash', KNOT_FROM, 1.2, 0.1, -0.3),
  cue('powerup', THEN_AT + 0.15, 1.3, 0.08),
  cue('lash', TIED_AT, 1.3, 0.1, -0.2),
  cue('click', TIED_AT + 0.25, 1.5, 0.08),
  cue('grow', KNOT_AT - 0.1, 1.2, 0.1),
  cue('clang', KNOT_AT, 1.6, 0.1),
  cue('rustle', WIPE_AT, 1.6, 0.08, 0.2),
  cue('eat', WIPE_AT + 0.2, 1.7, 0.08, -0.2),
  cue('eat', WIPE_AT + 0.4, 1.8, 0.08, 0.2),
  cue('eat', WIPE_AT + 0.6, 1.9, 0.08, -0.1),
  cue('win', OFF_AT - 0.05, 1.4, 0.08),
  cue('splash', OFF_AT, 1.3, 0.08, 0.3),
  // The viewfinder: a click and a creep.
  cue('click', VIEW_FROM + 0.05, 1.2, 0.14),
  cue('spotted', CAMERAS_AT, 1.0, 0.1),
  cue('click', CAUGHT_AT, 1.8, 0.08),
  cue('click', FOURTEEN_AT, 1.5, 0.08),
  cue('click', FOURTEEN_AT + 0.12, 1.55, 0.08),
  cue('click', FOURTEEN_AT + 0.24, 1.6, 0.08),
  cue('click', FOURTEEN_AT + 0.36, 1.65, 0.08),
  cue('clang', TIMES_AT, 1.0, 0.1),
  cue('rustle', AND_AT, 0.6, 0.08, -0.3),
  cue('drop', YES_AT, 0.6, 0.1),
  cue('suck', LOOP_S - 0.25, 0.6, 0.1, 0.1),
];
