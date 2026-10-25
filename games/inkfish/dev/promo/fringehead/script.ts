import type { SfxId } from '../../../src/audio/recipes';
import {
  BETTER_AT, BIGGER_AT, BOTTLES_AT, CANS_AT, CLASH_FROM, DART_AT, DIVERS_AT, DUEL_FROM, FIGHTS_AT, HEAD_AT, HONESTLY_AT, IMPACT, IT_AT, JAWS_AT, LOOP_S,
  MEET_AT, OPEN_AT, PICKS_AT, RECOIL_AT, REPEAT, SARCASTIC_AT, SLAM_AT, SLAM_HIT, STRETCH_AT, THAT_AT, TRY_AT, TWO_AT, WAY_AT, WE_AT, wrap,
} from './story';
import { TEMPO, WORDS, type Word } from './words';

/** What's written over the picture (captions) and the sound effects under the voice. */

// ---------------------------------------------------------------- text on screen

/** Where text goes (baseline y, or the middle for the "?", and size): all of it between y 270 and 1240. */
export const CAPTION = { y: 1200, size: 96 } as const;
export const NAME_LABEL = { text: 'Sarcastic fringehead', y: 400, size: 92 } as const;
export const QUESTION = { y: 420, size: 170 } as const;

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

/** The game's effects plus four made here: a tense rising whine, a sitcom boing, a rubbery flare and a comic deflate. */
export type CustomSfx = 'whine' | 'boing' | 'rubber' | 'deflate';

export interface SoundCue {
  readonly id: SfxId | CustomSfx;
  readonly t: number;
  readonly pitch: number;
  readonly gain: number;
  readonly pan: number;
  /** Length, for the whine. */
  readonly dur?: number;
}

const cue = (id: SfxId | CustomSfx, t: number, pitch: number, gain: number, pan = 0, dur?: number): SoundCue => ({ id, t, pitch, gain, pan, dur });

/** A ram: the lash's swish lands its wet slap on the hit (0.24 s in), with a thump. */
const thwack = (at: number, gain: number): SoundCue[] => [cue('lash', at - 0.24, 1.15, gain), cue('hurt', at, 1.35, gain * 0.8), cue('clang', at, 0.35, gain * 0.25)];

/**
 * Quiet under the voice: it does the talking. Surprise in the hook (a punchy
 * thwack and a rubbery flare at each ram), curious pencil ticks as the jaw is
 * traced and a pop as it flares, a low rumble and a tense rising whine as
 * the two open wide, then the big SLAM; a comic deflate and a smug sparkle;
 * a sitcom boing for the people; a bottle's clink, a can's tink and a bubbly
 * dash at the diver; and the swing back into the clash.
 */
export const SOUNDS: readonly SoundCue[] = [
  // The hook: the swing-in lands on the loop point; the second ram on "MOUTHS!".
  cue('dash', CLASH_FROM + 0.25, 0.8, 0.12),
  cue('rubber', IMPACT - 0.45, 1, 0.16),
  ...thwack(IMPACT, 0.28),
  cue('rustle', 0.6, 0.6, 0.05),
  cue('dash', REPEAT - 0.3, 0.9, 0.1, -0.1),
  ...thwack(REPEAT, 0.26),
  cue('rubber', REPEAT + 0.05, 1.25, 0.15),
  // Curious: ticks along the jaw, a pop as it flares, a bright pop for the outline.
  cue('click', SARCASTIC_AT, 1.3, 0.14, 0.2),
  cue('click', JAWS_AT, 1.5, 0.16, 0.1),
  cue('click', JAWS_AT + 0.13, 1.6, 0.13, 0),
  cue('click', JAWS_AT + 0.26, 1.7, 0.11, -0.1),
  cue('rubber', STRETCH_AT + 0.05, 0.85, 0.16),
  cue('suck', STRETCH_AT, 1.4, 0.06),
  cue('drop', WAY_AT + 0.05, 1.3, 0.12, 0.2),
  cue('click', HEAD_AT, 1.2, 0.12),
  // Dramatic: in from both sides, a low rumble, the whine as they open wide, the SLAM.
  cue('dash', DUEL_FROM + 0.1, 0.6, 0.1, -0.3),
  cue('rustle', TWO_AT, 0.7, 0.08, 0.4),
  cue('boom', MEET_AT, 0.4, 0.14),
  cue('suck', OPEN_AT, 0.55, 0.14),
  cue('whine', OPEN_AT - 0.1, 1, 0.1, 0, SLAM_AT - OPEN_AT + 0.05),
  cue('lunge', SLAM_AT - 0.12, 0.5, 0.18),
  cue('boom', SLAM_HIT, 0.5, 0.3),
  cue('smash', SLAM_HIT, 0.7, 0.18),
  ...thwack(SLAM_HIT, 0.24),
  cue('rustle', SLAM_HIT + 0.5, 0.55, 0.06, 0.1),
  cue('rustle', SLAM_HIT + 1.0, 0.5, 0.06, -0.1),
  // Chuckles: the loser deflates and scoots home; the winner puffs up, smug.
  cue('deflate', BIGGER_AT + 0.02, 1, 0.2, 0.3),
  cue('dash', BIGGER_AT + 0.4, 1.3, 0.08, 0.4),
  cue('drop', BETTER_AT + 0.22, 0.55, 0.12, 0.4),
  cue('grow', BIGGER_AT + 0.45, 0.7, 0.08, -0.2),
  cue('powerup', BETTER_AT, 1.1, 0.06, -0.2),
  // Sarcastic: the "?", the jaws dropping, the boing.
  cue('drop', HONESTLY_AT + 0.05, 1.7, 0.1, -0.2),
  cue('spotted', WE_AT - 0.05, 1.3, 0.05),
  cue('suck', TRY_AT - 0.1, 1.8, 0.07),
  cue('boing', THAT_AT + 0.05, 1, 0.16),
  cue('clang', THAT_AT + 0.05, 1.6, 0.05),
  // Mischief: the bottle's clink, the can's tink, the diver coming down, the bubbly dash, the diver's fright.
  cue('splash', IT_AT, 1.4, 0.05),
  cue('clang', BOTTLES_AT + 0.02, 2.4, 0.14, -0.2),
  cue('drop', BOTTLES_AT + 0.1, 1.8, 0.08, -0.2),
  cue('clang', CANS_AT + 0.02, 1.7, 0.1, 0.3),
  cue('click', CANS_AT + 0.12, 1.1, 0.12, 0.3),
  cue('rustle', PICKS_AT - 0.4, 1.4, 0.06, 0.3),
  cue('dash', DART_AT - 0.04, 1.3, 0.2, 0.2),
  cue('eat', DART_AT + 0.02, 1.6, 0.08, 0.2),
  cue('eat', DART_AT + 0.09, 1.9, 0.07, 0.25),
  cue('eat', DART_AT + 0.16, 2.2, 0.06, 0.3),
  cue('free', FIGHTS_AT + 0.12, 1.3, 0.06),
  cue('spotted', RECOIL_AT, 1.2, 0.06, 0.4),
  cue('splash', RECOIL_AT + 0.02, 1.1, 0.14, 0.4),
  cue('eat', RECOIL_AT + 0.1, 2.0, 0.07, 0.4),
  cue('eat', RECOIL_AT + 0.2, 2.4, 0.06, 0.45),
  cue('free', DIVERS_AT + 0.3, 1.5, 0.05),
];
