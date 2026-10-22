import type { SfxId } from '../../../src/audio/recipes';
import {
  AND2_AT, BACK_AT, BITE, DAYS, DIVE_AT, DOWN_AT, EATS_AT, EVER_AT, EVERY_AT, FACE_AT, FIGHTS_AT, FILMED_AT, GIANT_AT, HUNT_AT, IT2_AT, KILOMETER_AT, KRAKEN_AT,
  LOOP_S, NOBODY_AT, NOW_AT, PROBABLY_AT, REAL_AT, SCARS_AT, SO_AT, SOMEWHERE_AT, SPERM_AT, SUCKERS_AT, THERE_AT, THIS_AT, WHIP, wrap, ALL_AT, DAY_AT,
} from './story';
import { TEMPO, WORDS, type Word } from './words';

/** What's written over the picture (the captions), and the sound effects under the voice. */

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

/** The whale's sonar on the way down: clicks speeding up as it closes in. */
const SONAR: readonly SoundCue[] = Array.from({ length: 9 }, (_, i) => cue('click', KILOMETER_AT + 0.1 + i * 0.22 - i * i * 0.008, 0.62 + i * 0.02, 0.14, -0.2));
/** A scar popping up at each step of the cascade, rising. */
const POPS: readonly SoundCue[] = Array.from({ length: 7 }, (_, i) => cue('click', SCARS_AT - 0.05 + i * ((FACE_AT + 0.15 - SCARS_AT) / 7), 1.1 + i * 0.08, 0.16, (i % 2 ? 0.25 : -0.25)));
/** The sun and the moon going round, a ding a sunrise. */
const SUNRISES: readonly SoundCue[] = Array.from({ length: 4 }, (_, i) => cue('free', DAYS.from + 0.15 + i * 0.55, 1.2 + i * 0.12, 0.12, -0.3 + i * 0.2));

/**
 * Quiet under the voice, one mood a beat: epic thrashing, the booming toss
 * and the bite; a whoosh up to the surface; curious splashes, the blow, the
 * sinking whoosh and the whale's sonar clicks; a "!" and the chomp; tense
 * lashes and a heartbeat; the scars popping; dings as the days race by; the
 * submarine's click and a deadpan "womp"; a sly rumble back into the dark.
 */
export const SOUNDS: readonly SoundCue[] = [
  // The hook: thrashing, the toss on "REAL", the bite on "eats".
  cue('rustle', 0.05, 0.7, 0.16, 0.2),
  cue('lunge', KRAKEN_AT, 0.4, 0.2, -0.1),
  cue('boom', REAL_AT, 0.32, 0.26),
  cue('lash', REAL_AT + 0.25, 0.8, 0.12, 0.3),
  cue('rustle', THIS_AT - 0.1, 0.8, 0.14, -0.2),
  cue('eatBig', EATS_AT + 0.02, 0.45, 0.42),
  cue('boom', EATS_AT + 0.04, 0.38, 0.16),
  // Up to the surface.
  cue('dash', WHIP.from, 1.4, 0.22, -0.2),
  cue('rustle', WHIP.from + 0.1, 1.7, 0.12, 0.2),
  // The surface: a blow, the flukes, the dive and the sonar.
  cue('splash', SPERM_AT - 0.05, 1.1, 0.14, 0.3),
  cue('suck', SPERM_AT + 0.05, 1.4, 0.1, 0.3),
  cue('splash', DIVE_AT + 0.25, 0.65, 0.2, -0.2),
  cue('drop', DIVE_AT + 0.45, 0.6, 0.12),
  cue('dash', KILOMETER_AT + 0.2, 0.45, 0.16),
  cue('drop', DOWN_AT + 0.1, 0.45, 0.14),
  ...SONAR,
  // The squid in the dark: a "!", then the bite.
  cue('spotted', GIANT_AT, 0.85, 0.16, 0.2),
  cue('lunge', HUNT_AT + 0.3, 0.5, 0.18),
  cue('eatBig', BITE, 0.5, 0.4),
  cue('boom', BITE + 0.02, 0.36, 0.2),
  // It fights back: lashes and a low heartbeat.
  cue('lash', FIGHTS_AT, 0.9, 0.18, 0.3),
  cue('hurt', FIGHTS_AT + 0.05, 0.7, 0.12, 0.1),
  cue('lash', BACK_AT, 0.75, 0.16, -0.3),
  cue('smash', BACK_AT + 0.05, 0.6, 0.08),
  cue('boom', BACK_AT + 0.55, 0.26, 0.16),
  cue('boom', BACK_AT + 0.85, 0.24, 0.12),
  // The scars.
  cue('rustle', SUCKERS_AT, 0.9, 0.12, 0.2),
  ...POPS,
  cue('drop', ALL_AT, 1.2, 0.12),
  cue('hurt', FACE_AT + 0.05, 1.1, 0.1),
  // Every day: bright dings as the days race by.
  cue('dash', DAYS.from, 1.2, 0.14, 0.2),
  cue('spotted', PROBABLY_AT, 1.3, 0.12),
  ...SUNRISES,
  cue('powerup', EVERY_AT, 1, 0.14),
  cue('click', DAY_AT, 1.5, 0.16),
  // Nobody has filmed it: the submarine's lamp clicks on, the light hums past, a deadpan womp.
  cue('click', NOBODY_AT - 0.2, 0.9, 0.22, -0.3),
  cue('zap', NOBODY_AT - 0.15, 0.6, 0.06, -0.3),
  cue('rustle', EVER_AT - 0.2, 1.2, 0.1, -0.2),
  cue('click', EVER_AT + 0.25, 1.3, 0.16, -0.1),
  cue('lose', FILMED_AT + 0.05, 0.95, 0.12),
  cue('click', IT2_AT + 0.4, 0.8, 0.18, -0.3),
  // Somewhere down there: a sly rumble back into the dark.
  cue('dash', SO_AT + 0.1, 0.5, 0.14),
  cue('boom', NOW_AT, 0.28, 0.14),
  cue('spotted', SOMEWHERE_AT + 0.1, 0.6, 0.1, 0.2),
  cue('lunge', THERE_AT, 0.38, 0.16),
  cue('suck', LOOP_S - 0.6, 0.5, 0.14, 0.1),
  cue('rustle', AND2_AT - 0.4, 1.0, 0.08, 0.2),
];
