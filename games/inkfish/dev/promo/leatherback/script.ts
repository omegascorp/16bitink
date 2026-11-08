import type { SfxId } from '../../../src/audio/recipes';
import {
  ALL_AT, AND2_AT, BIGGEST_AT, BUT_AT, CUTE_AT, DAY_AT, DOWN_AT, EATS_AT, FLARE_STINGS, GULPS, IN_AT, ITS_AT, JELLYFISH_AT, LOOP_S, NIGHTMARE_AT,
  ONCE_AT, OUT_AT, POINT_AT, PULL, SECTION_IN, SHELL_AT, SIXTY_AT, SPIKES_AT, THOUSAND_AT, TRIES, TURN, TWO_AT, wrap,
} from './story';
import { TEMPO, WORDS, type Word } from './words';

/** What's written over the picture (the captions) and the game's sound effects under the voice. */

// ---------------------------------------------------------------- text on screen

/** Where every piece of text sits (baseline y), its full size, and how much it can pop (scale). Kept between y 270 and 1240. */
export const TEXT = {
  caption: { y: 1200, size: 96, pop: 1 },
  sizeLb: { y: 400, size: 104, pop: 1.18 },
  sizeKg: { y: 490, size: 76, pop: 1 },
  count: { y: 420, size: 150, pop: 1 },
  perDay: { y: 520, size: 84, pop: 1.15 },
} as const;

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

/** Gulp ticks for the feast, one a jellyfish, and the counter's clicks racing between them. */
const GULP_TICKS: readonly SoundCue[] = GULPS.flatMap((g, i) => [cue('eat', g, 1.25 + 0.03 * (i % 4), 0.2, -0.15), cue('click', g + 0.06, 1.8, 0.1, 0.3)]);

/**
 * Quiet under the voice: it does the talking. A low rumble under the hook
 * (audio.ts adds the drone and the jaw's creak), a hollow rush down the
 * throat, sharp metallic stings as the spines flare and a swish for the
 * downward sweep, a squish and a clang for each of the jellyfish's tries
 * (audio.ts adds its boing and squeak), the deep whomp of the size, gulp
 * ticks racing with the counter, a sparkle on "DAY!", and the rush into the
 * mouth again as the loop comes round. The soft chimes are in audio.ts.
 */
export const SOUNDS: readonly SoundCue[] = [
  // The hook: something huge and hollow.
  cue('boom', NIGHTMARE_AT + 0.02, 0.32, 0.2),
  cue('suck', NIGHTMARE_AT + 0.25, 0.35, 0.1),
  // Down the throat: a hollow rush.
  cue('suck', ITS_AT + 0.05, 0.4, 0.16),
  cue('rustle', SPIKES_AT, 0.7, 0.05, 0.2),
  // The cut, the flare, the sweep.
  cue('dash', SECTION_IN.from, 0.8, 0.12),
  ...FLARE_STINGS.map((at, i) => cue('hooked', at, 1.05 + 0.1 * i, 0.09, i % 2 ? 0.35 : -0.35)),
  cue('clang', ALL_AT, 1.9, 0.08, -0.2),
  cue('clang', POINT_AT + 0.05, 2.1, 0.06, 0.25),
  cue('lash', DOWN_AT - 0.2, 0.9, 0.16),
  cue('boom', DOWN_AT + 0.05, 0.45, 0.14),
  // The jellyfish slides in, tries twice, gives up.
  cue('dash', ONCE_AT - 0.05, 1.5, 0.1, 0.1),
  cue('drop', JELLYFISH_AT + 0.25, 0.8, 0.1),
  cue('splash', IN_AT, 1.6, 0.06),
  ...TRIES.flatMap((h) => [cue('rustle', h.push, 1.6, 0.06), cue('clang', h.hit, 1.3, 0.07, 0.15)]),
  cue('lose', OUT_AT + 0.02, 1.4, 0.07),
  // The pull out and the size.
  cue('dash', PULL.from, 0.6, 0.12, -0.2),
  cue('spotted', BIGGEST_AT + 0.1, 0.7, 0.06),
  cue('boom', THOUSAND_AT, 0.35, 0.3),
  cue('lunge', THOUSAND_AT + 0.02, 0.5, 0.16),
  // The feast.
  cue('frenzy', EATS_AT - 0.1, 1.0, 0.06),
  ...GULP_TICKS,
  cue('grow', TWO_AT + 0.05, 1.2, 0.05),
  cue('powerup', DAY_AT, 1.1, 0.08),
  cue('win', SIXTY_AT + 0.6, 1.4, 0.04, 0.2),
  // The turn and the jaws opening, into the loop.
  cue('dash', TURN.from, 1.2, 0.1),
  cue('suck', BUT_AT + 0.25, 0.4, 0.16),
  cue('boom', LOOP_S - 0.25, 0.3, 0.06),
  // Soft bubbles in the sunlit beat.
  cue('drop', CUTE_AT + 0.2, 1.3, 0.04, -0.3),
  cue('drop', SHELL_AT + 0.25, 1.5, 0.035, 0.3),
  // Keep the size beat's diver bubbling quietly.
  cue('drop', AND2_AT - 1.4, 1.1, 0.03, -0.4),
];
