import type { SfxId } from '../../../src/audio/recipes';
import {
  BITES_AT, BITTEN_AT, CAME_AT, CUT, CUTTING_AT, GLOWS_AT, HOLES_AT, LATCHES_AT, LIPS_AT, LITTLE_AT, LOOP_S, NAVY_AT, NOPE_AT, PERFECT_AT, SECRET_AT,
  SEVENTIES_AT, SO_AT, SPINS_AT, SUBS_AT, SUCTION_AT, THEY_AT, TWENTY_AT, wrap,
} from './story';
import { TEMPO, WORDS, type Word } from './words';

/** The captions over the picture, and the sound effects under the voice. */

// ---------------------------------------------------------------- where text goes

/** Every line of text on screen: its baseline y and size (px), so the tests can keep it between y 270 and 1240. */
export const TEXT = {
  caption: { y: 1200, size: 96 },
  navy: { y: 420, size: 100 },
  /** The size bar sits this far under the shark's nose, its label this far under the bar. */
  sizeBar: { below: 175, labelBelow: 92, size: 92 },
  /** The "SECRET" stamp: its centre, half its box's height, and the largest it slams down from. */
  stamp: { x: 560, y: 610, halfH: 78, halfW: 250, maxScale: 1.9 },
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

/** The game's own effects, plus a few made for this short in audio.ts. */
export type ExtraSfx = 'schlup' | 'pop' | 'whirr' | 'ping' | 'horn' | 'alarm' | 'ding' | 'shimmer' | 'thump';

export interface SoundCue {
  readonly id: SfxId | ExtraSfx;
  readonly t: number;
  readonly pitch: number;
  readonly gain: number;
  readonly pan: number;
}

const cue = (id: SoundCue['id'], t: number, pitch: number, gain: number, pan = 0): SoundCue => ({ id, t, pitch, gain, pan });

/** The alarm's low pulses, with the red light's flashes. */
const ALARM: readonly SoundCue[] = Array.from({ length: 4 }, (_, i) => cue('alarm', CUT.blueprint + 0.12 + i / 2.1, 1, 0.081));

/**
 * Quiet under the voice: it does the talking. Surprise in the hook (the
 * spin's whirr and a chomp on "bites", the plug's pop on "holes", a deep
 * boom and a sonar ping as we pull back to the submarine), a swish and a
 * tick for the curious size bar and a soft shimmer as the belly glows, then
 * the drama: a lunge, the lips' rubbery schlup, the drill-like whirr and a
 * cork pop, a click for the cookie cutter; nervous: a submarine's horn, the
 * splash of it surfacing, a sonar ping, the alarm notes and a thud on
 * "BITTEN!"; tension: the alarm's low pulses and the stamp's thump; then a
 * paper whoosh, the pop-up and a cheeky ding for the wink; and the swim
 * back, sealing on with a schlup just before the loop comes round.
 */
export const SOUNDS: readonly SoundCue[] = [
  // The hook: the spin and the bite, the pop, the pull back.
  cue('whirr', BITES_AT - 0.04, 1.3, 0.092, 0.1),
  cue('eatBig', BITES_AT + 0.05, 0.75, 0.32, 0.1),
  cue('pop', HOLES_AT + 0.04, 1, 0.129, 0.1),
  cue('dash', SUBS_AT - 0.05, 0.7, 0.16, -0.2),
  cue('boom', SUBS_AT + 0.05, 0.45, 0.22),
  cue('ping', SUBS_AT + 0.35, 1, 0.072, 0.3),
  // Curious: it swims in, the size bar, the glow.
  cue('splash', CUT.alone, 1.6, 0.06, -0.3),
  cue('rustle', CUT.alone + 0.1, 1.3, 0.08, -0.3),
  cue('click', TWENTY_AT, 1.1, 0.22, 0.1),
  cue('drop', TWENTY_AT + 0.08, 1.2, 0.1, 0.1),
  cue('boom', GLOWS_AT - 0.05, 0.6, 0.1),
  cue('shimmer', GLOWS_AT, 1, 0.077),
  // Dramatic: the lunge, the seal, the spin, the plug.
  cue('lunge', LATCHES_AT, 0.7, 0.2),
  cue('schlup', SUCTION_AT + 0.05, 0.8, 0.15),
  cue('suck', SUCTION_AT - 0.1, 1.4, 0.1),
  cue('schlup', LIPS_AT + 0.05, 1.05, 0.13),
  cue('whirr', SPINS_AT - 0.06, 1, 0.126),
  cue('pop', CUTTING_AT + 0.16, 0.85, 0.152),
  cue('click', CUTTING_AT + 0.2, 0.9, 0.16, 0.4),
  cue('frenzy', PERFECT_AT, 1.1, 0.07, 0.3),
  // Nervous: the horn, the surfacing, the ping, "BITTEN!".
  cue('horn', CUT.harbour + 0.02, 1, 0.08, 0.2),
  cue('splash', SEVENTIES_AT + 0.05, 0.5, 0.26, 0.2),
  cue('lunge', SEVENTIES_AT + 0.1, 0.4, 0.16, 0.2),
  cue('ping', NAVY_AT, 0.9, 0.072, -0.2),
  cue('splash', CAME_AT, 0.9, 0.06, 0.2),
  cue('spotted', BITTEN_AT, 0.75, 0.12, -0.3),
  cue('boom', BITTEN_AT, 0.4, 0.2),
  // Tension: the alarm, the stamp.
  ...ALARM,
  cue('boom', THEY_AT - 0.05, 0.3, 0.12),
  cue('thump', SECRET_AT + 0.1, 1, 0.126),
  // Chuckles: the blueprint whipped away, the pop-up, the wink.
  cue('dash', NOPE_AT - 0.03, 1.4, 0.2, -0.3),
  cue('free', NOPE_AT + 0.1, 0.8, 0.12),
  cue('ding', LITTLE_AT, 1, 0.088, 0.2),
  // Back on the hull, sealing on.
  cue('dash', SO_AT - 0.08, 1.1, 0.12, 0.2),
  cue('schlup', SO_AT + 0.52, 0.9, 0.15),
];

