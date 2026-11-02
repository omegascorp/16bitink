import type { SfxId } from '../../../src/audio/recipes';
import {
  A_AT, ALL_AT, CAPE_AT, CUT_B, DARK_AT, DOWN_AT, EVERYTHING_AT, FORTY_FIVE_AT, HIS_AT, INSIDE, LAND_AT, LOOP_S, MISTAKE_AT, MOUTH_AT, NO_AT, OUT_AT, RETURN_AT, RISE_AT,
  SCOOP_FROM, SECONDS_AT, SHARK_AT, SHOOK_AT, SHUT_AT, SPAT_AT, SURFACED_AT, TEETH_AT, TWENTY_AT, wrap,
} from './story';
import { TEMPO, WORDS, type Word } from './words';

/** What's written over the picture (positions) and the sound effects under the voice. */

/** Every text on the picture: baseline y and size, all inside the area the apps' buttons leave clear (y 270 to 1250). */
export const TEXT = {
  place: { y: 350, size: 104 },
  year: { y: 440, size: 100 },
  depthFt: { y: 520, size: 108 },
  depthM: { y: 610, size: 86 },
  clock: { y: 510, size: 80 },
  question: { y: 800, size: 340 },
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

/** The stopwatch ticking while he is inside the whale. */
const TICKS: readonly SoundCue[] = Array.from({ length: 8 }, (_, i) => cue('click', INSIDE.from + 0.5 + i * 0.95, 1.5, 0.05, 0.4));
const SHAKES: readonly SoundCue[] = Array.from({ length: 3 }, (_, i) => cue('rustle', SHOOK_AT + 0.05 + i * 0.34, 0.6 + 0.1 * i, 0.12, i % 2 ? 0.3 : -0.3));

/**
 * Quiet under the voice: a tense rumble and gulping water in the hook, a bright
 * ding for each number, the lunge and the gulp on "DARK", drips, a click for the
 * torch, a sting for the shark, a "huh?" for the missing teeth, a rush and a ding for
 * the reveal, the burst, shakes and a comic burp for the spit, the splash, and a
 * soft glow for the family before the jaws close again.
 */
export const SOUNDS: readonly SoundCue[] = [
  // The hook: water rushing round a mouth; nervous.
  cue('suck', 0.05, 0.5, 0.2, 0.1),
  cue('splash', 0.3, 0.6, 0.16, 0.2),
  cue('rustle', 0.7, 0.7, 0.12, -0.2),
  cue('boom', 1.0, 0.25, 0.16),
  cue('click', SECONDS_AT, 1.6, 0.14, 0.4),
  cue('lunge', MOUTH_AT - 0.2, 0.4, 0.14),
  cue('boom', MOUTH_AT, 0.3, 0.18),
  // Cape Cod, the dive.
  cue('boom', CAPE_AT, 0.35, 0.14),
  cue('splash', CUT_B + 0.1, 0.9, 0.18, 0.2),
  cue('click', TWENTY_AT, 1.4, 0.12),
  cue('powerup', FORTY_FIVE_AT, 1.8, 0.1, 0.1),
  cue('drop', DOWN_AT, 0.8, 0.1, -0.2),
  // The lunge and the gulp.
  cue('lunge', SCOOP_FROM, 0.4, 0.26),
  cue('suck', EVERYTHING_AT, 0.55, 0.28, 0.1),
  cue('eatBig', SHUT_AT - 0.05, 0.4, 0.4),
  cue('boom', DARK_AT, 0.3, 0.26),
  // The dark: drips, the torch, the shark, the "huh?".
  cue('drop', INSIDE.from + 0.2, 0.55, 0.12, 0.3),
  cue('powerup', INSIDE.from + 0.3, 1.2, 0.08, 0.1),
  ...TICKS,
  cue('spotted', SHARK_AT, 0.85, 0.16, 0.2),
  cue('lash', SHARK_AT + 0.25, 1.2, 0.08, -0.2),
  cue('click', NO_AT - 0.05, 1.8, 0.12),
  cue('spotted', TEETH_AT, 1.5, 0.12, 0.1),
  cue('drop', TEETH_AT + 0.5, 0.5, 0.1, 0.3),
  // The reveal: a rush, and a bright ding.
  cue('dash', A_AT - 0.1, 1.5, 0.2, -0.2),
  cue('splash', A_AT, 0.6, 0.2, 0.1),
  cue('powerup', MISTAKE_AT, 1.2, 0.1, 0.1),
  // The burst, the shakes, the spit and the splash, with a comic burp.
  cue('lunge', RISE_AT, 0.4, 0.22),
  cue('splash', SURFACED_AT + 0.45, 0.45, 0.3, 0.1),
  ...SHAKES,
  cue('free', SPAT_AT, 0.8, 0.2, 0.2),
  cue('dash', SPAT_AT + 0.05, 0.9, 0.16, 0.3),
  cue('yuck', SPAT_AT + 0.2, 1.3, 0.1, -0.1),
  cue('splash', LAND_AT, 0.8, 0.26, 0.3),
  cue('win', OUT_AT + 0.5, 1.1, 0.06, 0.2),
  // The tender line: a soft glow, a slow drip.
  cue('powerup', HIS_AT, 0.7, 0.05, 0.1),
  cue('drop', ALL_AT + 0.3, 0.6, 0.06, 0.3),
  // The jaws close again.
  cue('dash', RETURN_AT, 1.4, 0.16, -0.2),
  cue('suck', LOOP_S - 0.5, 0.5, 0.2, 0.1),
  cue('splash', LOOP_S - 0.3, 0.6, 0.1, 0.2),
];
