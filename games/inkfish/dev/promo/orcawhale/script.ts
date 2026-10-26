import type { SfxId } from '../../../src/audio/recipes';
import {
  ANYONE_AT, AUSTRALIA_AT, BIGGEST_AT, BLUE_AT, CHASED_AT, EARTH_AT, FIRST_AT, HEAD_AT, HOUR_AT, HOUR_END, HOUR_FOR_AT, INSIDE_AT, KILL_AT, LOOP_S,
  MOUTH_AT, MOUTH_END, ONE_END, ORCA_AT, ORCAS_AT, POD_AT, PREY_AT, SAW_AT, SIXTY_AT, SO_AT, THEN_AT, TONGUE2_AT, TONGUE_AT, TONGUE_FOR_AT, WANT_AT,
  WENT_AT, WHALES_AT, YEAR_AT, wrap,
} from './story';
import { TEMPO, WORDS, type Word } from './words';

/** What's written over the picture (labels and captions), and the sound effects under the voice. */

/**
 * Where every line of text sits (baseline y and font size), so it can be
 * checked against the safe area: between y 270 and 1250. The "?!" pops up
 * to `huhPop` times its size.
 */
export const TEXT = {
  caption: { y: 1200, size: 96 },
  place: { y: 722, size: 72 },
  sizeFt: { y: 900, size: 96 },
  sizeM: { y: 968, size: 62 },
  huh: { x: 300, y: 500, size: 190 },
  huhPop: 1.25,
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

/** The clock ticking an hour away on "for an hour…", quick then slowing. */
const TICKS: readonly SoundCue[] = Array.from({ length: 9 }, (_, i) => cue('click', HOUR_FOR_AT + 0.05 + 0.85 * (i / 8) ** 1.3, i % 2 ? 1.5 : 1.75, 0.13, 0.4));
/** The orcas' echolocation: bursts of quick clicks. */
const clicks = (at: number, n: number, pan: number, pitch = 2.2): SoundCue[] =>
  Array.from({ length: n }, (_, i) => cue('click', at + i * 0.045, pitch + 0.05 * (i % 3), 0.06, pan));

/**
 * The game's effects, quiet under the voice (audio.ts adds the whale's moans
 * and the orcas' whistles, synthesized): in the awed hook, a deep boom, the
 * rush of water and bubbles as the orca shoves in; for the tense surface,
 * waves and a low pulse, a sting as the label pops; for the chase, whooshes,
 * splashes and clicks, a bright ding on "sixty feet"; a clock ticking the
 * hour; a camera's click and a booming hit on "KILL"; the hush of "Then one
 * went in" (just bubbles); a wet sparkle on "tongue"; a cheeky "ta-da" for
 * the biggest prey; a comic sting and a boing on "TONGUE"; the rush back in.
 */
export const SOUNDS: readonly SoundCue[] = [
  // The hook: something vast, the water rushing in, bubbles.
  cue('boom', 0.02, 0.24, 0.2),
  cue('suck', 0.05, 0.45, 0.18, 0.2),
  cue('lunge', ORCA_AT, 0.42, 0.14, 0.2),
  cue('suck', INSIDE_AT - 0.1, 0.55, 0.16, 0.1),
  cue('drop', INSIDE_AT + 0.3, 0.6, 0.1, 0.3),
  cue('boom', WHALES_AT, 0.3, 0.12),
  cue('drop', MOUTH_AT + 0.1, 0.7, 0.09, 0.3),
  // The surface: waves, a low pulse, a sting with the label.
  cue('splash', MOUTH_END + 0.15, 0.45, 0.18),
  cue('splash', AUSTRALIA_AT + 0.6, 0.4, 0.12, -0.3),
  cue('spotted', AUSTRALIA_AT, 0.7, 0.1),
  cue('boom', AUSTRALIA_AT + 0.1, 0.22, 0.14),
  cue('boom', YEAR_AT, 0.22, 0.16),
  cue('splash', YEAR_AT + 0.4, 0.45, 0.12, 0.3),
  // The chase: whooshes, splashes, clicks, a ding on the size.
  cue('dash', POD_AT - 0.25, 0.7, 0.2, 0.3),
  cue('dash', CHASED_AT, 0.85, 0.18, -0.3),
  cue('lash', CHASED_AT + 0.25, 0.9, 0.1, 0.4),
  ...clicks(POD_AT + 0.2, 6, -0.5),
  ...clicks(BLUE_AT + 0.25, 5, 0.5, 2.4),
  cue('dash', BLUE_AT + 0.3, 0.6, 0.14, 0.2),
  cue('click', SIXTY_AT, 1.1, 0.16),
  cue('clang', SIXTY_AT + 0.08, 1.55, 0.16),
  cue('powerup', SIXTY_AT + 0.12, 1.2, 0.07),
  // An hour: the clock, the whale tiring.
  ...TICKS,
  cue('lose', HOUR_AT + 0.05, 0.55, 0.05),
  // The first time anyone saw: a camera's click and flash; the kill hits.
  cue('splash', FIRST_AT, 0.5, 0.12, -0.3),
  cue('click', SAW_AT + 0.04, 0.9, 0.22, -0.3),
  cue('zap', SAW_AT + 0.06, 1.8, 0.05, -0.3),
  ...clicks(ORCAS_AT, 6, 0.4),
  cue('boom', KILL_AT, 0.28, 0.32),
  cue('smash', KILL_AT + 0.01, 0.4, 0.12),
  cue('boom', KILL_AT + 0.25, 0.22, 0.18),
  cue('suck', ONE_END, 0.32, 0.14),
  // The hush: only bubbles as one goes in.
  cue('drop', THEN_AT + 0.2, 0.55, 0.08, 0.3),
  cue('suck', WENT_AT, 0.4, 0.12, 0.2),
  cue('drop', HEAD_AT + 0.3, 0.5, 0.08, 0.2),
  cue('drop', HEAD_AT + 0.55, 0.6, 0.07, 0.1),
  // "for the tongue": a wet sparkle.
  cue('yuck', TONGUE_FOR_AT + 0.1, 1.2, 0.05),
  cue('free', TONGUE_AT + 0.05, 1.5, 0.08),
  // The biggest prey on Earth: a whoosh out and a cheeky ta-da.
  cue('dash', BIGGEST_AT - 0.3, 1.2, 0.14, -0.2),
  cue('powerup', PREY_AT, 0.9, 0.08),
  cue('win', EARTH_AT, 1.0, 0.05),
  // "they want the TONGUE": a comic sting and a boing.
  cue('free', WANT_AT, 1.1, 0.06, 0.3),
  cue('hooked', TONGUE2_AT - 0.02, 1.3, 0.08),
  cue('yuck', TONGUE2_AT + 0.15, 1.6, 0.07, -0.2),
  cue('spotted', TONGUE2_AT + 0.05, 1.6, 0.06),
  // So yes: rushing back into the mouth.
  cue('dash', SO_AT - 0.2, 0.6, 0.16),
  cue('suck', SO_AT + 0.3, 0.45, 0.16, 0.2),
  cue('lunge', LOOP_S - 0.4, 0.42, 0.12, 0.2),
];

/** The whale's moans (synthesized in audio.ts): [start s, length s, Hz at the start, Hz at the end, gain]. */
export const MOANS: readonly (readonly [number, number, number, number, number])[] = [
  [0.1, 2.2, 74, 52, 0.05],
  [MOUTH_AT - 0.2, 1.6, 66, 44, 0.045],
  [AUSTRALIA_AT + 0.4, 1.8, 58, 46, 0.03],
  [HOUR_AT - 0.2, 1.6, 60, 38, 0.045],
  [KILL_AT + 0.3, 1.5, 52, 30, 0.05],
  [HEAD_AT - 0.4, 1.4, 70, 50, 0.03],
  [BIGGEST_AT, 1.4, 64, 52, 0.04],
  [SO_AT - 0.1, 1.3, 76, 74, 0.03],
];

/** The orcas' whistles: [start s, length s, Hz at the start, Hz at the end, gain, pan]. */
export const WHISTLES: readonly (readonly [number, number, number, number, number, number])[] = [
  [ORCA_AT + 0.1, 0.35, 2600, 4200, 0.012, 0.3],
  [YEAR_AT + 0.2, 0.3, 3000, 2200, 0.01, 0.6],
  [POD_AT, 0.3, 2400, 4600, 0.016, -0.4],
  [POD_AT + 0.4, 0.25, 3800, 3000, 0.014, 0.4],
  [CHASED_AT + 0.4, 0.35, 2800, 5200, 0.016, 0.2],
  [BLUE_AT + 0.1, 0.22, 4200, 3400, 0.012, -0.5],
  [HOUR_END + 0.2, 0.3, 3000, 4000, 0.01, 0.5],
  [ANYONE_AT, 0.28, 2500, 3600, 0.012, -0.3],
  [ORCAS_AT + 0.05, 0.3, 3200, 5000, 0.016, 0.4],
  [WANT_AT - 0.2, 0.22, 2600, 3600, 0.012, 0.3],
];
