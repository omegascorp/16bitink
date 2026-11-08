import type { SfxId } from '../../../src/audio/recipes';
import { AT, CUTS, LOOP_S, wrap } from './story';
import { TEMPO, WORDS, type Word } from './words';

/** What's written over the picture (positions) and the sound effects under the voice. */

/** Every text on the picture: baseline y and size, all inside the area the apps' buttons leave clear (y 270 to 1250). */
export const TEXT = {
  florida: { y: 430, size: 150 },
  osprey: { y: 520, size: 96 },
  feet: { y: 860, size: 150 },
  metres: { y: 970, size: 100 },
  bang: { y: 560, size: 230 },
  caption: { y: 1200, size: 96 },
} as const;

/** Where the height labels sit (left of the dashed line). */
export const LABEL_X = 400;

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

/**
 * Quiet under the voice, one mood a beat: a high cry, a thrash and a bright
 * sting for the hook; surf, a far gull and a ding over the beach; the
 * focus beeps and a whoosh as the lens racks in; a sting and a clang on
 * "TAIL!"; a low drop on the question and a crash on "FISH!"; the print and
 * a stamp slam on "TRILLION"; a sad fall and a drip for the bad day; a
 * whoosh back to frame 1. The wind and the camera's shutter are made in
 * audio.ts.
 */
export const SOUNDS: readonly SoundCue[] = [
  // Excited: the osprey's cry, the shark thrashing, a bright sting on "FISH!".
  cue('squawk', 0.08, 2.7, 0.05, 0.2),
  cue('lash', AT.shark - 0.05, 1.3, 0.06, -0.2),
  cue('spotted', AT.shark + 0.05, 1.4, 0.07),
  cue('powerup', AT.fish, 1.6, 0.08),
  cue('lash', AT.fish + 0.3, 1.5, 0.05, 0.2),
  // Curious and airy: surf below, a gull, the cry again on "osprey", a ding on "400", one on "Florida".
  ...[0, 1, 2].map((i) => cue('splash', CUTS.wide + 0.1 + i * 0.95, 0.45 + i * 0.05, 0.05, i % 2 ? 0.3 : -0.3)),
  cue('squawk', AT.osprey + 0.05, 2.8, 0.045, 0.3),
  cue('squawk', AT.feet + 0.6, 2.2, 0.025, -0.6),
  cue('click', AT.feet, 1.2, 0.07),
  cue('powerup', AT.florida, 1.8, 0.07),
  // Suspense: two focus beeps, the whoosh of the zoom.
  cue('click', AT.photographer + 0.1, 2.4, 0.06),
  cue('click', AT.photographer + 0.22, 2.4, 0.06),
  cue('dash', AT.zoomed - 0.05, 0.8, 0.08),
  cue('dash', AT.in, 1.1, 0.06),
  // Surprise: a sting and a clang on "TAIL!".
  cue('spotted', AT.tail - 0.02, 1.2, 0.09),
  cue('clang', AT.tail + 0.02, 1.4, 0.06),
  cue('lash', AT.tail + 0.25, 1.4, 0.05, -0.3),
  // Dramatic: a slide along the shark, a low drop on "mouth?", the crash on "FISH!".
  cue('lunge', CUTS.mouth + 0.05, 0.8, 0.07),
  cue('drop', AT.mouth, 0.5, 0.09),
  cue('smash', AT.fish2, 1.1, 0.1),
  cue('boom', AT.fish2 + 0.01, 1.3, 0.06),
  // Playful: the print drops in, a stamp slams on "TRILLION", a win sting on "shot".
  cue('click', CUTS.photo + 0.3, 0.9, 0.08),
  cue('smash', AT.trillion, 1.5, 0.09),
  cue('clang', AT.trillion + 0.01, 0.9, 0.06),
  cue('win', AT.shot, 1.2, 0.06),
  // Cheeky-sad: a falling drop, the losing sting, a drip as the sweat runs.
  cue('drop', AT.bad - 0.05, 0.45, 0.09),
  cue('lose', AT.bad + 0.25, 1.1, 0.06),
  cue('eat', AT.fishBad + 0.1, 2.2, 0.06),
  // Mischief: the whoosh back to frame 1, the cry over the seam.
  cue('dash', CUTS.back + 0.05, 0.9, 0.08),
  cue('lunge', LOOP_S - 0.45, 1.0, 0.06),
];

/** When the camera's shutter fires (audio.ts synthesizes it): on "in…" as the zoom lands, and for the print. */
export const SHUTTERS: readonly number[] = [AT.in + 0.05, CUTS.photo + 0.02];
