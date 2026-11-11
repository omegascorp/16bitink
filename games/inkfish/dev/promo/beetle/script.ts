import type { SfxId } from '../../../src/audio/recipes';
import { AT, CUTS, KICKS, LOOP_S, wrap } from './story';
import { TEMPO, WORDS, type Word } from './words';

/** What's written over the picture (positions) and the sound effects under the voice. */

/** Every text on the picture: baseline y and size, all inside the area the apps' buttons leave clear (y 270 to 1250). */
export const TEXT = {
  caption: { y: 1200, size: 96 },
  label: { y: 430, size: 92 },
  ratio: { y: 470, size: 190 },
  watch: { y: 470, r: 150, size: 84 },
  huh: { size: 200 },
} as const;
/** The stopwatch's "6 min" sits under its centre. */
export const WATCH_TEXT_Y = TEXT.watch.y + 80;

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

/** Tiny footsteps every `every` s from `from` to `to`. */
const steps = (from: number, to: number, every: number, pitch: number, gain: number): SoundCue[] =>
  Array.from({ length: Math.max(0, Math.floor((to - from) / every)) }, (_, i) => cue('click', from + i * every, pitch + (i % 2) * 0.15, gain, i % 2 ? 0.2 : -0.2));

/**
 * Quiet under the voice, one mood a beat: the beetle's frantic scrabble and a
 * bright sting for the hook; a slurp, a big gulp and a comic boop as the eyes
 * press down; a low slide and a slow heartbeat into the dark, the light going
 * out with a falling tone; a thump at every kick; an X-ray hum and tiny steps
 * through the frog, a pop and a cheer at the back door, a baffled sting; plinks
 * as nine light up, a ding, marching steps, a stopwatch ticking to a clang;
 * four deadpan pops for "Same escape"; then the beetle's steps and the lunge.
 */
export const SOUNDS: readonly SoundCue[] = [
  // Frame 1: the beetle scrabbling on the tongue, a sting on "ALIVE!".
  ...[0.05, 0.42, 0.8, 1.18, 1.6, 2.05, 2.45].map((t, i) => cue('rustle', t, 1.5 + (i % 3) * 0.15, 0.07, 0.3)),
  cue('clang', AT.alive, 1.6, 0.07),
  cue('powerup', AT.alive + 0.3, 1.8, 0.07),
  // Comic: the slurp, the snap and a big gulp, a boop as the eyes press down.
  cue('suck', AT.frogs, 1.1, 0.12),
  cue('lash', AT.frogs + 0.1, 1.5, 0.08),
  cue('eatBig', AT.frogs + 0.2, 0.7, 0.24),
  cue('boom', AT.frogs + 0.22, 0.5, 0.12),
  cue('drop', AT.chew - 0.05, 0.55, 0.12),
  cue('click', AT.chew + 0.1, 0.8, 0.08),
  // Nervous: a low slide down, a slow heartbeat, the landing, the light going out.
  cue('suck', CUTS.gullet, 0.35, 0.16),
  ...[0, 0.85, 1.7, 2.55, 3.4].flatMap((d) => [cue('boom', CUTS.gullet + 0.3 + d, 0.4, 0.1), cue('boom', CUTS.gullet + 0.47 + d, 0.48, 0.06)]),
  cue('splash', AT.stomach + 0.05, 0.6, 0.08),
  cue('lose', AT.total, 0.6, 0.06),
  // Surprised: a thump at each kick.
  ...KICKS.flatMap((k, i) => [cue('boom', k, 0.7 + (i % 2) * 0.08, 0.13), cue('click', k + 0.01, 0.9, 0.06)]),
  cue('spotted', AT.kicking, 1.4, 0.07),
  // Dramatic: into the X-ray, tiny steps through the frog, a rising swell on "WHOLE".
  cue('zap', CUTS.xray, 0.7, 0.09),
  cue('dash', CUTS.xray + 0.02, 1.5, 0.07),
  ...steps(CUTS.xray + 0.3, AT.back - 0.1, 0.16, 2.2, 0.035),
  cue('grow', AT.whole, 1.1, 0.07),
  cue('zap', AT.whole, 1.2, 0.05),
  // Mischievous: back to colour, a pop out of the back door, a cheer, a baffled sting.
  cue('dash', AT.and, 1.3, 0.06),
  cue('free', AT.back + 0.1, 1.5, 0.15, -0.3),
  cue('powerup', AT.door + 0.05, 1.3, 0.08, -0.3),
  cue('rustle', AT.door + 0.3, 1.9, 0.07, -0.4),
  cue('spotted', AT.door + 0.2, 0.9, 0.07, 0.2),
  // Excited: nine plinks, a ding on "ten", marching steps, the watch ticking to a clang.
  ...Array.from({ length: 9 }, (_, i) => cue('eat', AT.nine + i * 0.05, 1.5 + i * 0.06, 0.05, -0.4 + i * 0.1)),
  cue('clang', AT.ten + 0.02, 2, 0.07),
  ...steps(AT.made, AT.six - 0.1, 0.09, 2.4, 0.03),
  cue('powerup', AT.made + 0.2, 1.6, 0.07),
  ...Array.from({ length: 6 }, (_, i) => cue('click', AT.six - 0.1 + i * 0.06, 1.8, 0.07, 0.2)),
  cue('clang', AT.minutes + 0.05, 1.7, 0.1),
  // Sarcastic: a plain plink as each frog appears, four pops at once for "Same", a flat boop.
  ...[0, 1, 2, 3].map((i) => cue('eat', AT.four + i * 0.14, 1.1, 0.06, i % 2 ? 0.3 : -0.3)),
  cue('free', AT.same, 1.2, 0.12),
  cue('click', AT.escape + 0.42, 1.0, 0.08),
  // Sly: the beetle's steps by the frog, the lunge into frame 1.
  ...steps(CUTS.hook + 0.15, LOOP_S - 0.62, 0.17, 2.3, 0.035),
  cue('spotted', AT.somewhere, 1.25, 0.06),
  cue('lunge', LOOP_S - 0.64, 1.0, 0.1),
  cue('lash', LOOP_S - 0.56, 1.4, 0.08),
  cue('suck', LOOP_S - 0.45, 1.2, 0.09),
];
