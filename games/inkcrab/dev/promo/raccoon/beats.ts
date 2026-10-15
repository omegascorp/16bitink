import type { SfxId } from '../../../src/audio/recipes';
import { lerp, ramp, window01 } from '../short';
import {
  AND_AT, ARENT_AT, CAUGHT_AT, CLAM_B, CLEAN_AT, CRAB_AT, EAT_AT, EVEN_AT, FEELING_AT, FOOD_AT, GRAB_AT, LOOP_S, MORE_AT,
  NERVES_AT, NIGHT_AT, NO_AT, PACKED_AT, PAWS_AT, POP_AT, RIPPLES, SO_AT, SPLASHES, THEIR_PAWS_AT, THEY_AT, TOUCH_AT, WATER_AT, WET_AT, wrap,
} from './story';
import { inVoice, WORDS, type Word } from './words';

/**
 * Everything over the scene, timed to the words: the magnifiers of the
 * payoff, the sketchbook labels, the spoken line and the sounds.
 */

// ---------------------------------------------------------------- the magnifiers

export type LensId = 'dry' | 'wet';
export interface Lens {
  readonly id: LensId;
  readonly x: number;
  readonly y: number;
  readonly r: number;
  /** 0 a dot at the paw .. 1 open in its place. */
  readonly open: number;
  /** How brightly its nerve endings light, 0 .. 1. */
  readonly glow: number;
  /** Share of the nerve endings drawn in, 0 .. 1. */
  readonly dots: number;
  /** Its "how much it feels" bars, 0 .. 5 lit, and how much the meter shows. */
  readonly bars: number;
  readonly meter: number;
  /** A ring pulsing out from it on "MORE", 0 .. 1 of its life (outside: none). */
  readonly pulse: number;
}

/** One big lens on "Their paws…", that becomes the dry paw on "and"; the wet paw opens beside it on "wet". */
const BIG = { x: 540, y: 560, r: 250 } as const;
const DRY = { x: 285, y: 545, r: 188 } as const;
const WET = { x: 795, y: 545, r: 188 } as const;
const CLOSE_FROM = MORE_AT + 0.55;
const CLOSE_TO = CLOSE_FROM + 0.35;

export function lensesAt(t: number): readonly Lens[] {
  const close = 1 - ramp(t, CLOSE_FROM, CLOSE_TO);
  const meter = ramp(t, WET_AT + 0.05, WET_AT + 0.35) * close;
  const dots = ramp(t, PACKED_AT - 0.08, PACKED_AT + 0.45);
  const split = ramp(t, AND_AT - 0.05, AND_AT + 0.35);
  const dry: Lens = {
    id: 'dry',
    x: lerp(BIG.x, DRY.x, split),
    y: lerp(BIG.y, DRY.y, split),
    r: lerp(BIG.r, DRY.r, split),
    open: ramp(t, THEIR_PAWS_AT - 0.08, THEIR_PAWS_AT + 0.35) * close,
    glow: 0.6 * ramp(t, TOUCH_AT - 0.08, NERVES_AT + 0.15) * (1 - 0.6 * split),
    dots,
    bars: 2,
    meter: meter * split,
    pulse: -1,
  };
  const wet: Lens = {
    ...WET,
    id: 'wet',
    open: ramp(t, WET_AT - 0.1, WET_AT + 0.28) * close,
    glow: 0.3 + 0.7 * ramp(t, MORE_AT - 0.1, MORE_AT + 0.12),
    dots: 1,
    bars: 2 + 3 * ramp(t, MORE_AT - 0.08, MORE_AT + 0.3),
    meter,
    pulse: (t - (MORE_AT - 0.05)) / 0.8,
  };
  return [dry, wet].filter((l) => l.open > 0);
}

// ---------------------------------------------------------------- labels

/** Something already up at the loop point: 1 there, gone by `out`; back in from `from` near the end. */
const kept = (t: number, out: number, from: number, s = 0.3): number => (t < LOOP_S / 2 ? 1 - ramp(t, out, out + 0.3) : ramp(t, from, from + s));

/** "washing?", written on "So" and crossed out on "no,": up over the hook, off before "They dunk". */
export const washingAt = (t: number): number => kept(t, THEY_AT - 0.45, SO_AT - 0.1, 0.35);
/** Its ✗, stamped on "no," with an overshoot (1 at the loop point). */
export function crossAt(t: number): number {
  if (t < LOOP_S / 2) return washingAt(t);
  const u = t - (NO_AT - 0.04);
  if (u <= 0) return 0;
  return u < 0.12 ? lerp(0, 1.3, u / 0.12) : lerp(1.3, 1, ramp(u, 0.12, 0.3));
}
/** The ✗ jolts again on "AREN'T". */
export const crossJoltAt = (t: number): number => window01(t, ARENT_AT - 0.04, ARENT_AT + 0.4, 0.1);

export interface Label {
  readonly text: string;
  readonly alpha: number;
}
export const lotorLabel = (t: number): number => window01(t, THEY_AT - 0.05, EVEN_AT, 0.2);
export const waterLabel = (t: number): number => window01(t, WATER_AT - 0.06, EVEN_AT - 0.05, 0.18);
export const pawsLabel = (t: number): number => window01(t, PAWS_AT - 0.06, EVEN_AT + 0.35, 0.18);
export const cleanLabel = (t: number): number => window01(t, CLEAN_AT - 0.08, CLEAN_AT + 0.75, 0.15);
/** The clean clam's sparkle, 0 .. 1 of its life. */
export const sparkleAt = (t: number): number => (t - (CLEAN_AT - 0.12)) / 0.9;
export const nervesLabel = (t: number): number => window01(t, TOUCH_AT - 0.06, AND_AT + 0.05, 0.15);
export const feelingLabel = (t: number): number => window01(t, FEELING_AT - 0.08, CAUGHT_AT + 0.2, 0.18);
export const crabLabel = (t: number): number => window01(t, CRAB_AT - 0.08, SO_AT + 0.2, 0.15);
/** The moon brightening on "night". */
export const moonGlowAt = (t: number): number => window01(t, NIGHT_AT - 0.1, NIGHT_AT + 0.9, 0.25);

// ---------------------------------------------------------------- captions

export interface Line {
  readonly words: readonly Word[];
  /** Shown from its first word until the next line takes over. */
  readonly from: number;
  readonly to: number;
}

/** The voiceover cut into short lines: at most four words, broken after punctuation. */
export const LINES: readonly Line[] = (() => {
  const groups: Word[][] = [];
  for (const w of WORDS) {
    const last = groups[groups.length - 1];
    const prev = last?.[last.length - 1];
    const full = !last || last.length >= 4 || /[.,:…!]$/.test(prev!.text) || [...last, w].map((x) => x.text).join(' ').length > 18;
    if (full) groups.push([w]);
    else last.push(w);
  }
  return groups.map((g, i) => ({
    words: g,
    // The first line is up from the first frame: the hook is on screen before its first word lands.
    from: i === 0 ? 0 : inVoice(g[0]!.start),
    to: i + 1 < groups.length ? inVoice(groups[i + 1]![0]!.start) : LOOP_S,
  }));
})();

/** The line on screen at time t, and the word being spoken in it (-1: none yet). */
export function captionAt(t: number): { readonly line: Line; readonly word: number } | null {
  const line = LINES.find((l) => t >= l.from && t < l.to);
  if (!line) return null;
  let word = line === LINES[0] ? 0 : -1;
  line.words.forEach((w, i) => {
    if (t >= inVoice(w.start)) word = i;
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

/**
 * The game's sounds, quiet under the voice: a pencil tick for each ✗, a
 * sparkle on "clean", soft ticks as the nerve endings fill in, a chirp as
 * they light, a bright rising "grow" on "MORE", the crunch as it eats, a low
 * uneasy chord on "night", the tense tuck of the crab hiding, a knock as
 * it's turned over, then, playful, its squeak and hop as it gets away.
 */
export const SOUNDS: readonly SoundCue[] = [
  { id: 'click', t: ARENT_AT, pitch: 1.1, gain: 0.3, pan: 0 },
  { id: 'find', t: CLEAN_AT, pitch: 1, gain: 0.22, pan: 0.2 },
  ...[0, 1, 2, 3, 4].map((k): SoundCue => ({ id: 'click', t: PACKED_AT + k * 0.09, pitch: 1.4 + 0.1 * k, gain: 0.12, pan: -0.3 + 0.15 * k })),
  { id: 'join', t: TOUCH_AT + 0.05, pitch: 1, gain: 0.14, pan: 0 },
  { id: 'grow', t: MORE_AT - 0.03, pitch: 1.2, gain: 0.3, pan: 0.3 },
  { id: 'eat', t: EAT_AT - 0.04, pitch: 0.8, gain: 0.35, pan: -0.1 },
  { id: 'eat', t: EAT_AT + 0.08, pitch: 0.75, gain: 0.3, pan: -0.1 },
  { id: 'dark', t: NIGHT_AT - 0.05, pitch: 1, gain: 0.3, pan: 0 },
  { id: 'hide', t: GRAB_AT, pitch: 0.9, gain: 0.4, pan: 0.1 },
  { id: 'knock', t: CRAB_AT + 0.25, pitch: 1, gain: 0.16, pan: 0 },
  { id: 'out', t: POP_AT, pitch: 1, gain: 0.24, pan: 0.2 },
  { id: 'jump', t: POP_AT + 0.1, pitch: 1.2, gain: 0.22, pan: 0.4 },
  { id: 'click', t: NO_AT, pitch: 1.1, gain: 0.3, pan: 0 },
];

/** Water: a soft dabble for each ripple the hands make, a splash for each dunk and drop, a plop for the next clam. */
export interface WaterCue {
  readonly t: number;
  readonly kind: 'dabble' | 'splash' | 'plop';
  readonly gain: number;
}
export const WATER_CUES: readonly WaterCue[] = ([
  ...RIPPLES.map((at): WaterCue => ({ t: at, kind: 'dabble', gain: 0.5 })),
  ...SPLASHES.map((s): WaterCue => ({ t: s.at, kind: 'splash', gain: s.size })),
  { t: CLAM_B.at - 0.05, kind: 'plop', gain: 0.6 },
  { t: FOOD_AT - 0.35, kind: 'plop', gain: 0.5 },
  { t: CAUGHT_AT, kind: 'plop', gain: 0.4 },
  { t: CRAB_AT - 0.1, kind: 'plop', gain: 0.5 },
] as const satisfies readonly WaterCue[]).map((c): WaterCue => ({ ...c, t: wrap(c.t) }));
