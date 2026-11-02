import type { SfxId } from '../../../src/audio/recipes';
import {
  AND_AT, BAY_AT, BUT_AT, CAME_AT, FIST_AT, GULPING_AT, HUMPBACKS_AT, LION_AT, LOOP_S, MISTAKE_AT, MONTEREY_AT, MOUTH_AT, OUT_AT, PAUSED_AT, SCHOOL_FROM, SEA_AT, SLIPPED_AT, SLIP_FROM, SO_AT, SPLASH_AT,
  THROAT_AT, THROAT_FROM, TWENTY_AT, WIDE_AT, YOUR_AT, ANCHOVIES_AT, HOOK_BACK, wrap,
} from './story';
import { TEMPO, WORDS, type Word } from './words';

/** What's written over the picture (positions) and the sound effects under the voice. */

/** Every text on the picture: baseline y and size, all inside the area the apps' buttons leave clear (y 270 to 1250). */
export const TEXT = {
  place: { y: 350, size: 110 },
  year: { y: 480, size: 150 },
  throatTag: { y: 480, size: 100 },
  fistTag: { y: 480, size: 100 },
  caption: { y: 1200, size: 96 },
} as const;

export interface Line {
  readonly words: readonly Word[];
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
 * Quiet under the voice, one mood a beat: a splash and a bright surprise ding in
 * the hook; a splash, a ding for the year and a rising lunge for the school
 * (excited); low clicks and a drop, then a boom on MOUTH for the nervous push-in;
 * a whoosh, a ding and a low boom for the throat and the fist (dramatic); a
 * rustle, a slippery suck, a splash and a comic burp and boing for the chuckle.
 */
export const SOUNDS: readonly SoundCue[] = [
  // The hook: a splash, a surprise ding on "lion", a clang on "MISTAKE".
  cue('splash', 0.1, 0.7, 0.14, -0.1),
  cue('spotted', LION_AT, 1.5, 0.14, 0.1),
  cue('clang', MISTAKE_AT, 1.5, 0.1),
  // Monterey Bay: bright.
  cue('dash', SCHOOL_FROM + 0.05, 1.4, 0.12, -0.3),
  cue('splash', MONTEREY_AT, 1.0, 0.1, 0.2),
  cue('click', BAY_AT, 1.4, 0.08, -0.2),
  cue('clang', TWENTY_AT + 0.05, 1.8, 0.1),
  cue('lunge', HUMPBACKS_AT - 0.1, 0.5, 0.16, 0.2),
  cue('suck', GULPING_AT, 0.7, 0.14, -0.2),
  cue('rustle', ANCHOVIES_AT - 0.2, 1.3, 0.1, 0.3),
  // The mouth: nervous.
  cue('drop', AND_AT, 0.45, 0.1),
  cue('click', CAME_AT, 1.1, 0.08, -0.3),
  cue('spotted', SEA_AT, 0.8, 0.12, 0.2),
  cue('drop', MOUTH_AT - 0.1, 0.4, 0.1, -0.1),
  cue('boom', MOUTH_AT + 0.05, 0.3, 0.16),
  // The throat and the fist: dramatic.
  cue('dash', THROAT_FROM + 0.05, 0.9, 0.12, 0.3),
  cue('clang', THROAT_AT, 1.2, 0.1),
  cue('click', WIDE_AT, 1.3, 0.08, -0.2),
  cue('powerup', YOUR_AT, 1.2, 0.08, 0.2),
  cue('boom', FIST_AT - 0.05, 0.5, 0.14, 0.1),
  // The pause and the slip.
  cue('dash', SLIP_FROM + 0.05, 1.5, 0.1, -0.3),
  cue('rustle', SO_AT + 0.2, 0.7, 0.08, 0.2),
  cue('drop', PAUSED_AT, 0.6, 0.08),
  cue('suck', SLIPPED_AT, 0.55, 0.2, -0.1),
  cue('rustle', SLIPPED_AT + 0.2, 1.2, 0.1, 0.3),
  cue('splash', SPLASH_AT, 0.8, 0.2, 0.3),
  cue('suck', SPLASH_AT + 0.18, 0.42, 0.26),
  cue('yuck', OUT_AT + 0.3, 1.4, 0.1, -0.1),
  cue('powerup', SPLASH_AT + 0.32, 1.9, 0.07, 0.2),
  // Back to the picture.
  cue('dash', HOOK_BACK, 1.7, 0.12, 0.4),
  cue('splash', LOOP_S - 0.3, 0.7, 0.1, 0.2),
];
