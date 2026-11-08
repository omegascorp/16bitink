import type { SfxId } from '../../../src/audio/recipes';
import {
  ALMOST_AT, AND_AT, ATE_AT, BUMPS, COULD_AT, DOWN_AT, DROP, ELEVEN_AT, FEET_AT, GULP_AT, GUY_AT, IT_AT, LAND, LOOP_S, ONE_AT, POP_AT, SHOWED_AT, SHUT_T, SO_AT,
  SWALLOWED_AT, SWORDFISH_AT, TAIL_AT, TEARING_AT, THEN_AT, UP_AT, WIGGLING_AT, WRECKFISH_AT, wrap,
} from './story';
import { TEMPO, WORDS, type Word } from './words';

/** What's written over the picture (captions, the readout, the "!"s), and the sound under the voice. */

/**
 * Where every line of text sits (baseline y and font size), so it can be
 * checked against the safe area: between y 270 and 1250. The "!"s sit at
 * their sharks but are kept between `alarm.top` and `alarm.bottom`, and pop
 * up to `alarm.pop` times their size.
 */
export const TEXT = {
  caption: { y: 1200, size: 96 },
  depth: { y: 420, size: 140 },
  depthM: { y: 515, size: 84 },
  alarm: { size: 130, top: 420, bottom: 1080, pop: 1.25 },
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

/** The shark's tail slapping the water as it flails. */
const flails = (from: number, count: number, gap: number, gain: number): SoundCue[] =>
  Array.from({ length: count }, (_, i) => cue('lash', from + i * gap, 1.3 + 0.08 * (i % 3), gain, 0.35));

/** The depth counter ticking as we drop. */
const TICKS: readonly SoundCue[] = Array.from({ length: 12 }, (_, i) => cue('click', ALMOST_AT + 0.08 + i * ((DOWN_AT - ALMOST_AT) / 12), 1.25 + i * 0.03, 0.06, 0.3));

/**
 * The game's effects, quiet under the voice, one set per mood: the suction,
 * gulp and flailing tail of the hook; a falling whoosh and the counter for
 * the eerie drop; little pops for the sharks on "eleven" and a low uneasy
 * drone; a boom and the "spotted" sting for the shock; whooshes and a
 * squeaky "free" round the comic boings; a sly click for the smug look; the
 * lunge, suction and big gulp of the drama; the suction building into the loop.
 */
export const SOUNDS: readonly SoundCue[] = [
  // THRILL: water rushing in, the gulp on "SHARK!", the tail flailing.
  cue('suck', 0.02, 0.5, 0.2, 0.05),
  cue('suck', SWALLOWED_AT, 0.56, 0.18),
  cue('lunge', SHUT_T - 0.25, 0.42, 0.16),
  cue('eatBig', SHUT_T, 0.5, 0.32),
  cue('boom', SHUT_T + 0.02, 0.32, 0.2),
  ...flails(SHUT_T + 0.15, 4, 0.16, 0.05),
  // EERIE: down we go.
  cue('dash', DROP.from, 0.45, 0.2),
  cue('drop', DROP.from + 0.1, 0.42, 0.12),
  ...TICKS,
  cue('clang', FEET_AT + 0.1, 1.6, 0.05),
  cue('boom', DOWN_AT + 0.05, 0.28, 0.12),
  // UNEASE: the floodlight thumps on, the sharks pop in, a low drone.
  cue('boom', LAND.from + 0.1, 0.35, 0.1),
  ...POP_AT.map((at, i) => cue('click', at, 1.0 + 0.06 * i, 0.12, i % 2 ? 0.3 : -0.3)),
  cue('lose', TEARING_AT, 0.4, 0.06),
  cue('rustle', TEARING_AT + 0.1, 0.6, 0.08, -0.2),
  cue('rustle', SWORDFISH_AT, 0.55, 0.07, 0.2),
  // SHOCK: something huge slides in.
  cue('dash', THEN_AT, 0.35, 0.2, -0.5),
  cue('boom', WRECKFISH_AT + 0.05, 0.3, 0.22),
  cue('spotted', SHOWED_AT, 1.0, 0.14),
  cue('dash', UP_AT, 0.7, 0.1, 0.3),
  // COMIC: two bumps that don't fit.
  cue('dash', IT_AT, 0.8, 0.08, -0.3),
  cue('free', BUMPS[0] + 0.25, 1.4, 0.08),
  cue('free', BUMPS[1] + 0.25, 1.6, 0.07),
  // SMUG: the eye turns; the shark freezes.
  cue('click', SO_AT + 0.2, 0.7, 0.14),
  cue('rustle', ATE_AT, 1.2, 0.06),
  cue('spotted', GUY_AT, 0.75, 0.1, 0.3),
  cue('click', COULD_AT, 1.5, 0.1, 0.3),
  // DRAMA: the lunge and the gulp, the tail still going.
  cue('suck', ONE_AT - 0.1, 0.42, 0.26),
  cue('lunge', ONE_AT + 0.05, 0.38, 0.2),
  cue('eatBig', GULP_AT + 0.04, 0.42, 0.34),
  cue('boom', GULP_AT + 0.06, 0.26, 0.24),
  ...flails(TAIL_AT, 6, 0.17, 0.06),
  cue('lash', WIGGLING_AT, 1.45, 0.06, 0.35),
  // SLY: the jaws open again, the suction building into the loop.
  cue('dash', AND_AT, 0.5, 0.08),
  cue('suck', LOOP_S - 0.75, 0.48, 0.18, 0.05),
];

/** Sounds the game doesn't have, synthesized in audio.ts. */
export type SynthId = 'ping' | 'hum' | 'boing';

export interface SynthCue {
  readonly id: SynthId;
  readonly t: number;
  readonly pitch: number;
  readonly gain: number;
  /** How long (hum only), s. */
  readonly length: number;
}

/** The ROV's sonar pings and motor hum on the way down, and the comic boings. */
export const SYNTHS: readonly SynthCue[] = [
  { id: 'hum', t: DROP.from, pitch: 1, gain: 0.05, length: LAND.to + 0.4 - DROP.from },
  { id: 'ping', t: ALMOST_AT - 0.05, pitch: 1, gain: 0.07, length: 0 },
  { id: 'ping', t: DOWN_AT + 0.25, pitch: 0.92, gain: 0.06, length: 0 },
  { id: 'ping', t: ELEVEN_AT + 0.9, pitch: 0.85, gain: 0.035, length: 0 },
  { id: 'boing', t: BUMPS[0], pitch: 1, gain: 0.12, length: 0 },
  { id: 'boing', t: BUMPS[1], pitch: 1.2, gain: 0.1, length: 0 },
];
