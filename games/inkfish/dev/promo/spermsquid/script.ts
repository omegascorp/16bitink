import type { SfxId } from '../../../src/audio/recipes';
import { AT, LOOP_S, wrap } from './story';
import { TEMPO, WORDS, type Word } from './words';

/** What's written over the picture (the captions and the numbers), and the sound effects under the voice. */

/** Every text's baseline and size, all inside the band the apps' buttons leave clear (y 270 to 1250). */
export const TEXT = {
  caption: { y: 1200, size: 96 },
  depth: { x: 760, y: 420, size: 124 },
  depthSmall: { y: 492, size: 64 },
  length: { y: 672, size: 100 },
  lengthSmall: { y: 738, size: 60 },
} as const;

export interface Line {
  readonly words: readonly Word[];
  /** Shown from its first word until the next line takes over. */
  readonly from: number;
  readonly to: number;
}

/** The voiceover cut into short phrases: at most four words and 18 letters, broken after punctuation. */
export const LINES: readonly Line[] = (() => {
  const groups: Word[][] = [];
  for (const w of WORDS) {
    const last = groups[groups.length - 1];
    const prev = last?.[last.length - 1];
    const full = !last || last.length >= 4 || /[.,:!?…]$/.test(prev!.text) || [...last, w].map((x) => x.text).join(' ').length > 18;
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

/** The whale's sonar on the way down, speeding up. */
const SONAR: readonly SoundCue[] = Array.from({ length: 7 }, (_, i) => cue('click', AT.dives + 0.05 + i * 0.26 - i * i * 0.012, 0.6 + i * 0.03, 0.13, -0.2));
/** A bright plink as the glint runs along the lower teeth. */
const PLINKS: readonly SoundCue[] = Array.from({ length: 5 }, (_, i) => cue('free', AT.bottom - 0.08 + i * 0.1, 1.5 + i * 0.1, 0.07, -0.3 + i * 0.15));
/** A scar popping up at each step of the cascade, rising. */
const POPS: readonly SoundCue[] = Array.from({ length: 7 }, (_, i) => cue('click', AT.sucker - 0.05 + i * ((AT.scars + 0.35 - AT.sucker) / 7), 1.1 + i * 0.08, 0.15, i % 2 ? 0.25 : -0.25));

/**
 * Quiet under the voice, one mood a beat: thrashing arms and a heavy slurp
 * for the hook, a huge gulp and a boom; a rush down and the sonar's clicks;
 * a nervous "!" and the bus's rumble; a pop of the jaw, plinks along the
 * teeth, a slurp, a snap and a comic boop; lashes and a smash as the arms
 * grab, a rise and popping scars; the camera's lamp clicking on, a hum and a
 * deadpan womp; a low boom and a sly "!" on the eye.
 */
export const SOUNDS: readonly SoundCue[] = [
  // The hook: arms thrashing, slurped in.
  cue('rustle', 0.03, 0.7, 0.15, 0.25),
  cue('lash', 0.35, 0.8, 0.1, 0.3),
  cue('suck', AT.whale, 0.55, 0.16, 0.2),
  cue('rustle', AT.giant - 0.05, 0.8, 0.13, 0.2),
  cue('lash', AT.squid, 0.7, 0.12, 0.3),
  // Without chewing: one gulp.
  cue('suck', AT.without - 0.05, 0.8, 0.2, 0.1),
  cue('eatBig', AT.chewing + 0.02, 0.42, 0.42),
  cue('boom', AT.chewing + 0.05, 0.34, 0.2),
  // The dive.
  cue('dash', AT.it - 0.1, 0.5, 0.16),
  cue('drop', AT.dives, 0.55, 0.14),
  ...SONAR,
  cue('boom', AT.dark, 0.26, 0.14),
  // The squid as long as a bus.
  cue('spotted', AT.squid2, 0.8, 0.14, 0.2),
  cue('rustle', AT.long, 0.9, 0.1, 0.3),
  cue('lunge', AT.bus - 0.35, 0.45, 0.16, -0.3),
  cue('smash', AT.bus + 0.02, 0.5, 0.08),
  cue('boom', AT.bus + 0.04, 0.4, 0.14),
  cue('hurt', AT.waiting, 0.7, 0.08, 0.2),
  // Teeth: the jaw drops, plinks along the bottom row, the tip slurped, snap, boop.
  cue('click', AT.teeth - 0.05, 0.75, 0.2),
  cue('drop', AT.teeth, 1.1, 0.1),
  cue('spotted', AT.only, 1.25, 0.1, 0.2),
  ...PLINKS,
  cue('suck', AT.it2 - 0.1, 1.1, 0.14, 0.2),
  cue('eatBig', AT.swallows + 0.03, 0.55, 0.36),
  cue('free', AT.swallows + 0.32, 0.8, 0.1),
  // The squid fights back, and the scars.
  cue('lash', AT.fight - 0.05, 0.9, 0.18, 0.3),
  cue('lash', AT.back - 0.05, 0.75, 0.16, -0.3),
  cue('smash', AT.back, 0.6, 0.08),
  cue('hurt', AT.back + 0.1, 0.7, 0.1, 0.1),
  cue('dash', AT.whales - 0.1, 1.2, 0.14, 0.2),
  cue('rustle', AT.covered, 1.0, 0.08),
  ...POPS,
  // Nobody has filmed it: the lamp clicks on, a hum, a womp.
  cue('click', AT.nobody - 0.25, 0.9, 0.22, -0.3),
  cue('zap', AT.nobody - 0.2, 0.6, 0.06, -0.3),
  cue('click', AT.ever, 1.3, 0.15, -0.1),
  cue('lose', AT.itDot, 0.95, 0.12),
  // The only witness: its eye in the dark.
  cue('boom', AT.so - 0.05, 0.28, 0.16),
  cue('spotted', AT.witness, 0.6, 0.11, 0.2),
  cue('suck', LOOP_S - 0.45, 0.5, 0.12, 0.1),
];
