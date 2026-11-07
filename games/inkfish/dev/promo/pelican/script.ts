import type { SfxId } from '../../../src/audio/recipes';
import { AT, CUTS, LOOP_S, wrap } from './story';
import { TEMPO, WORDS, type Word } from './words';

/** What's written over the picture (positions) and the sound effects under the voice. */

/** Every text on the picture: baseline y and size, all inside the area the apps' buttons leave clear (y 270 to 1250). */
export const TEXT = {
  gallons: { y: 470, size: 210 },
  litres: { y: 590, size: 120 },
  zoo: { y: 400, size: 120 },
  bang: { y: 520, size: 230 },
  caption: { y: 1200, size: 96 },
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

/** Footsteps on the grass every `every` seconds from `from` to `to`. */
const steps = (from: number, to: number, every: number, pitch: number, gain: number): SoundCue[] =>
  Array.from({ length: Math.max(0, Math.floor((to - from) / every)) }, (_, i) => cue('rustle', from + i * every, pitch + (i % 2) * 0.1, gain, i % 2 ? 0.25 : -0.25));

/**
 * Quiet under the voice, one mood a beat: a gulp and a bright sting for the
 * hook, pops and a ding for the jugs, sunny steps and a sly sting at the zoo,
 * a crash and a flash for "FLINCH!", a cheeky dash and gulp for the next pup,
 * two boops for the blink, a sad fall as it gives up, then a sly sting and
 * the lunge that lands on the loop's first frame. Far birds now and then.
 */
export const SOUNDS: readonly SoundCue[] = [
  // Frame 1: the gulp it is trying, tugs, a bright sting on "CAPYBARA!".
  cue('suck', 0.04, 0.8, 0.12, 0.1),
  cue('suck', 0.75, 0.7, 0.07, 0.15),
  cue('suck', 1.45, 0.75, 0.07, 0.15),
  cue('clang', AT.capy, 1.5, 0.08),
  cue('powerup', AT.capy + 0.35, 1.7, 0.08),
  cue('suck', 2.15, 0.7, 0.06, 0.15),
  // Curious: a pop and a slosh as each jug goes in, a ding on "GALLONS".
  ...[AT.about, AT.three, AT.gallons].flatMap((at, i) => [cue('eatBig', at - 0.08, 1.3 + i * 0.15, 0.1, -0.2), cue('splash', at + 0.06, 1.6 + i * 0.1, 0.05, 0.2)]),
  cue('powerup', AT.gallons + 0.25, 1.5, 0.1),
  // Sunny and sly: a ding on the zoo, footsteps, a sting on "picked", the lunge and gulp.
  cue('powerup', AT.zoo, 1.8, 0.08),
  cue('squawk', AT.zoo + 0.5, 2.3, 0.03, -0.5),
  ...steps(CUTS.zoo + 0.05, AT.picked - 0.1, 0.36, 1.2, 0.05),
  cue('spotted', AT.picked, 1.1, 0.08, 0.2),
  cue('lunge', AT.baby - 0.05, 0.8, 0.1, 0.2),
  cue('suck', AT.baby + 0.25, 0.8, 0.1),
  // Surprise: a low drop on the question, then the crash on "FLINCH!".
  cue('drop', AT.the, 0.6, 0.08),
  cue('suck', AT.capyQ + 0.3, 0.7, 0.06, 0.15),
  cue('smash', AT.flinch, 1.2, 0.12),
  cue('clang', AT.flinch + 0.02, 1.1, 0.09),
  // Cheeky: a dash as it lets go, steps, the lunge and gulp on "NEXT".
  cue('dash', CUTS.next + 0.1, 1.3, 0.08, -0.2),
  ...steps(CUTS.next + 0.5, AT.next - 0.25, 0.3, 1.3, 0.05),
  cue('lunge', AT.next - 0.1, 0.9, 0.09, -0.2),
  cue('suck', AT.next + 0.2, 0.85, 0.09),
  cue('squawk', AT.babyB + 0.2, 2.4, 0.03, 0.5),
  // Sarcastic: two boops, one for each word, the blink.
  cue('click', AT.same, 1.6, 0.09, -0.2),
  cue('click', AT.face, 1.3, 0.09, 0.2),
  // Sad: a falling drop, the losing sting, slow steps away.
  cue('drop', AT.it - 0.1, 0.45, 0.1),
  cue('lose', AT.gave, 1.0, 0.07),
  ...steps(CUTS.gave + 0.45, CUTS.but + 0.4, 0.42, 0.9, 0.05),
  // Mischief: a sly sting on "hey", the lunge into frame 1.
  cue('spotted', AT.hey, 1.3, 0.08, 0.2),
  cue('lunge', AT.at, 0.8, 0.1, 0.1),
  cue('dash', CUTS.hook + 0.1, 1.2, 0.08, -0.2),
  cue('squawk', 16.0, 2.2, 0.025, -0.6),
];
