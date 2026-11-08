import type { SfxId } from '../../../src/audio/recipes';
import {
  BACK_FROM, BEAR_AT, CATCH_AT, DEAD_AT, DEAD_FROM, FIND_AT, GREENLAND_AT, HOUR_AT, HUNT_FROM, INSIDE_FROM, JAW_AT, KNOWS_AT, LOOP_S, NOBODY_AT, OR_AT, PART_AT, PLACE_FROM, SCIENTISTS_AT, SHRUG_FROM, SLOW_FROM,
  SO_AT, STOMACH_AT, SVALBARD_AT, THIS_AT, UNDER_AT, YEAR_AT, CRUISES_AT, BUT_AT, wrap,
} from './story';
import { TEMPO, WORDS, type Word } from './words';

/** What's written over the picture (positions) and the sound effects under the voice. */

/** Every text on the picture: baseline y and size, all inside the area the apps' buttons leave clear (y 270 to 1250). */
export const TEXT = {
  bearTag: { y: 350, size: 100 },
  stomachTag: { y: 1090, size: 90 },
  place: { y: 390, size: 160 },
  year: { y: 780, size: 260 },
  sharkTag: { y: 350, size: 104 },
  jawTag: { y: 470, size: 100 },
  cm: { y: 620, size: 170 },
  inch: { y: 730, size: 100 },
  slowTag: { y: 400, size: 120 },
  kmh: { y: 385, size: 140 },
  mph: { y: 470, size: 90 },
  catchTag: { y: 390, size: 150 },
  question: { y: 800, size: 300 },
  foundTag: { y: 390, size: 150 },
  shrug: { y: 860, size: 200 },
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
 * Quiet under the voice, one mood a beat: a low swell and a splash for the hook (eerie, thrilling), a boom
 * for Svalbard (dramatic), a hush then clicks, a soft ding and a smash for the jaw (the x-ray), a cheeky
 * boing and slow ticks for the one-mile-an-hour beat (laugh), a sneaking rustle and a spotted sting for the
 * hunt, low drops in the gloom for "dead?", a shrug blip and a whoosh back.
 */
export const SOUNDS: readonly SoundCue[] = [
  // The hook.
  cue('splash', 0.15, 0.6, 0.12, 0.2),
  cue('drop', 0.3, 0.4, 0.12),
  cue('rustle', BEAR_AT - 1.2, 0.5, 0.08, -0.2),
  cue('clang', BEAR_AT, 1.2, 0.1),
  cue('suck', STOMACH_AT, 0.5, 0.14),
  // Svalbard.
  cue('boom', PLACE_FROM, 0.4, 0.14),
  cue('click', SVALBARD_AT, 1.2, 0.08, -0.2),
  cue('powerup', YEAR_AT, 1.4, 0.1, 0.2),
  // Inside.
  cue('rustle', INSIDE_FROM, 0.5, 0.08, 0.3),
  cue('click', GREENLAND_AT, 1.1, 0.08),
  cue('suck', SCIENTISTS_AT, 0.7, 0.1, -0.1),
  cue('spotted', PART_AT, 0.8, 0.1),
  cue('smash', JAW_AT, 0.8, 0.14),
  cue('clang', JAW_AT + 0.05, 1.8, 0.1),
  cue('click', JAW_AT + 0.4, 1.4, 0.08),
  // One mile an hour: cheeky.
  cue('dash', SLOW_FROM, 0.5, 0.08, -0.3),
  cue('drop', THIS_AT + 0.2, 1.4, 0.1),
  cue('click', CRUISES_AT, 0.8, 0.08),
  cue('click', CRUISES_AT + 0.7, 0.7, 0.08),
  cue('hooked', UNDER_AT, 1.6, 0.08),
  cue('yuck', HOUR_AT - 0.1, 1.5, 0.1, 0.2),
  cue('powerup', HOUR_AT + 0.2, 0.7, 0.08),
  // The hunt: sneaking, then a sting.
  cue('rustle', HUNT_FROM, 0.4, 0.1, -0.3),
  cue('lunge', SO_AT + 0.4, 0.35, 0.1, -0.4),
  cue('drop', CATCH_AT - 0.2, 0.4, 0.12),
  cue('spotted', CATCH_AT + 0.25, 0.6, 0.12),
  // Dead?: dim and low.
  cue('boom', DEAD_FROM, 0.3, 0.12),
  cue('drop', FIND_AT, 0.35, 0.1),
  cue('rustle', DEAD_AT - 0.2, 0.4, 0.08, 0.3),
  cue('drop', DEAD_AT, 0.3, 0.12),
  // Nobody knows: a shrug.
  cue('click', NOBODY_AT, 1.3, 0.08),
  cue('free', KNOWS_AT, 0.9, 0.08),
  cue('squawk', KNOWS_AT + 0.45, 1.6, 0.05),
  // Back to frame 1.
  cue('dash', BACK_FROM + 0.1, 1.6, 0.14, 0.4),
  cue('suck', BUT_AT, 0.6, 0.1, -0.1),
  cue('splash', LOOP_S - 0.3, 0.7, 0.1, 0.2),
];
