import type { SfxId } from '../../../src/audio/recipes';
import {
  ALMOST_AT, ANYTHING_AT, BECAUSE_AT, BACK_FROM, BRUTUS_AT, BULL_AT, BULLS_AT, BURP_AT, CROC_AT, CROCS_AT, EIGHTEEN_AT, JAWS_AT, LOOP_S, ON_AT, PICKED_AT, RISE_FROM, RIVER_AT, RIVER_FROM,
  RIVERS_AT, ROSE_AT, SALTWATER_AT, SHARK_AT, SHARK_HOOK_AT, SIZE_FROM, SMUG_FROM, UNDER_FROM, VS_FROM, WRONG_AT, WRONG_FROM, YEAR_AT, YOU_AT, ADELAIDE_AT, AUSTRALIA_AT, wrap,
} from './story';
import { TEMPO, WORDS, type Word } from './words';

/** What's written over the picture (positions) and the sound effects under the voice. */

/** Every text on the picture: baseline y and size, all inside the area the apps' buttons leave clear (y 270 to 1250). */
export const TEXT = {
  place: { y: 350, size: 104 },
  placeRiver: { y: 450, size: 96 },
  year: { y: 760, size: 230 },
  saltwater: { y: 450, size: 84 },
  name: { y: 410, size: 150 },
  feet: { y: 590, size: 150 },
  metres: { y: 700, size: 100 },
  sharkTag: { y: 360, size: 104 },
  upriver: { y: 480, size: 100 },
  wrong: { y: 380, size: 130 },
  burp: { y: 520, size: 170 },
  vs: { y: 880, size: 210 },
  question: { y: 600, size: 260 },
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
 * Quiet under the voice, one mood a beat: a splash, a chomp and a bright ding
 * for the hook (excited), a low boom for the river (dramatic), clicks for the
 * measure (the bar, the numbers), a whoosh, a big splash and a ding for the
 * rise (surprise), low nervous notes under the water, a sly creep and a comic
 * sting for the wrong river (mischievous), a comic burp (chuckles), a ding for
 * each side of the face-off (curious) and a whoosh back.
 */
export const SOUNDS: readonly SoundCue[] = [
  // The hook: a splash, a chomp, a ding on "SHARK".
  cue('splash', 0.1, 0.7, 0.14, -0.2),
  cue('suck', 0.2, 0.6, 0.14, 0.1),
  cue('clang', SHARK_HOOK_AT, 1.6, 0.1),
  cue('splash', 1.2, 0.9, 0.08, 0.3),
  // The river: dread.
  cue('boom', RIVER_FROM, 0.4, 0.14),
  cue('click', AUSTRALIA_AT, 1.2, 0.08, -0.2),
  cue('click', ADELAIDE_AT, 1.1, 0.08, 0.2),
  cue('powerup', YEAR_AT, 1.5, 0.1),
  cue('rustle', SIZE_FROM - 0.4, 0.6, 0.08, 0.3),
  // The size.
  cue('dash', SIZE_FROM, 1.0, 0.1, -0.3),
  cue('click', SALTWATER_AT, 1.3, 0.08),
  cue('click', EIGHTEEN_AT, 1.4, 0.1, -0.2),
  cue('powerup', EIGHTEEN_AT + 0.75, 1.5, 0.1),
  cue('click', EIGHTEEN_AT + 0.4, 1.6, 0.08, 0.2),
  cue('clang', BRUTUS_AT, 1.0, 0.1),
  // The rise: whoosh, splash, ding.
  cue('lunge', RISE_FROM + 0.1, 0.4, 0.16, 0.2),
  cue('dash', ROSE_AT - 0.05, 0.8, 0.14, -0.2),
  cue('splash', ROSE_AT + 0.4, 0.5, 0.14, 0.1),
  cue('click', BULL_AT, 1.3, 0.08),
  cue('smash', JAWS_AT, 0.7, 0.14),
  cue('splash', JAWS_AT + 0.02, 0.6, 0.16, -0.1),
  cue('clang', JAWS_AT + 0.05, 1.8, 0.1),
  // Under the water: nervous.
  cue('drop', UNDER_FROM, 0.5, 0.12),
  cue('spotted', BULLS_AT + 0.1, 0.7, 0.1, -0.2),
  cue('drop', RIVERS_AT - 0.3, 0.45, 0.1, 0.2),
  cue('rustle', RIVERS_AT, 0.6, 0.08, 0.3),
  // The wrong river: sly.
  cue('rustle', WRONG_FROM + 0.1, 0.7, 0.08, -0.3),
  cue('lunge', PICKED_AT, 0.45, 0.1, -0.4),
  cue('spotted', WRONG_AT, 1.1, 0.14),
  cue('clang', RIVER_AT - 0.1, 1.5, 0.1),
  // The burp.
  cue('drop', CROCS_AT, 0.7, 0.08),
  cue('click', ALMOST_AT, 1.2, 0.08),
  cue('suck', BURP_AT, 0.42, 0.26),
  cue('yuck', BURP_AT + 0.08, 1.4, 0.1, -0.1),
  cue('splash', BURP_AT + 0.4, 1.2, 0.05, -0.2),
  // The face-off.
  cue('dash', VS_FROM + 0.05, 1.1, 0.12, -0.5),
  cue('clang', SHARK_AT + 0.1, 1.3, 0.1, -0.4),
  cue('lunge', CROC_AT - 0.25, 0.5, 0.12, 0.5),
  cue('clang', CROC_AT, 0.9, 0.12, 0.4),
  cue('spotted', YOU_AT, 1.4, 0.14),
  cue('click', ON_AT, 1.5, 0.1),
  // Back to the jaws.
  cue('dash', BACK_FROM + 0.1, 1.6, 0.14, 0.4),
  cue('suck', BECAUSE_AT - 0.1, 0.6, 0.12, -0.1),
  cue('splash', LOOP_S - 0.3, 0.7, 0.1, 0.2),
];
