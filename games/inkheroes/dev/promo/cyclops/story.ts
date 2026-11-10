import { cue, type SoundCue } from '../audioKit';
import { phrases } from '../captions';
import { attackFrame, attackLength } from '../pixel';
import { clamp01, ramp, window01 } from '../short';
import { endOf, startOf, TEMPO, WORDS } from './words';
import { UNIT_ART } from '../../../src/art/pixel/manifest';

/**
 * #113 "This Skull Might Be Where The Cyclops Came From": narrated, a pure
 * function of time, every beat timed from the words. The facts: dwarf
 * elephants (Palaeoloxodon falconeri, about 1 m / 3 ft at the shoulder) lived
 * on Sicily and died out long before writing; an elephant skull's big central
 * hole is the nasal opening for the trunk. In 1914 the palaeontologist
 * Othenio Abel suggested such skulls inspired the Cyclops myth: a guess,
 * never proven, and the short says so.
 *
 *   0     frame 1: the skull front-on, its one big hole (hook)
 *   3.1   "Except… it's not an eye. It's the hole for a TRUNK!": the hole
 *         glows, then the living head dissolves in round it, trunk and all
 *   6.8   "Tiny elephants, about three feet tall, lived on Sicily": the
 *         dwarf elephant walks in on the game's rough land; ≈1 m · 3 ft
 *   10.3  "and died out long before anyone wrote anything down": down
 *         through the rock to its bones
 *   13.2  "In 1914, a scientist guessed": the scientist and his skull, 1914
 *   15.3  "the Greeks found skulls like these…": a Hoplite and a skull
 *   17.0  "and imagined a one-eyed GIANT!": the skull dissolves into the
 *         game's Cyclops, who throws his rock (his real attack strip)
 *   19.7  "Nobody can prove it. But you have to admit,": the Cyclops in an
 *         InkHeroes battle, the call to action (chapter 1 is free and its
 *         first part ends at a Cyclops warband)
 *   21.9  the skull dissolves back in for frame 1
 */
export const LOOP_S = 22.5;

export const wrap = (t: number): number => ((t % LOOP_S) + LOOP_S) % LOOP_S;

/** Word indices (into WORDS) for the beats. */
export const W = {
  one: 3, except: 7, not: 9, its: 12, hole: 14, trunk: 17, tiny: 18, about: 20, feet: 22, lived: 24, sicily: 26,
  and: 27, died: 28, long: 30, down: 35, in: 36, year: 37, scientist: 39, guessed: 40, the: 41, greeks: 42, skulls: 44, these: 46,
  and2: 47, imagined: 48, oneEyed: 50, giant: 51, nobody: 52, it: 55, but: 56, admit: 60,
} as const;

export const at = (i: number): number => startOf(i);
export const LAST_END = endOf(WORDS.length - 1);

/** The cuts between shots, each just before the first word of its beat. */
export const CUT = {
  sicily: at(W.tiny) - 0.12,
  rock: at(W.and) - 0.12,
  scientist: at(W.in) - 0.12,
  greeks: at(W.the) - 0.1,
  giant: at(W.and2) - 0.12,
  battle: at(W.nobody) - 0.12,
} as const;

/** The skull dissolves back in over the battle in the last of the loop. */
export const RETURN_AT = LOOP_S - 0.6;

export type Scene = 'skull' | 'sicily' | 'rock' | 'scientist' | 'greeks' | 'giant' | 'battle';

export const sceneAt = (t: number): Scene => {
  const u = wrap(t);
  if (u < CUT.sicily) return 'skull';
  if (u < CUT.rock) return 'sicily';
  if (u < CUT.scientist) return 'rock';
  if (u < CUT.greeks) return 'scientist';
  if (u < CUT.giant) return 'greeks';
  if (u < CUT.battle) return 'giant';
  return 'battle';
};

/** How much of the skull shot shows over the battle: none until RETURN_AT, all by the loop point (in dither steps). */
export const returnAt = (t: number): number => {
  const u = wrap(t);
  if (sceneAt(u) !== 'battle') return sceneAt(u) === 'skull' ? 1 : 0;
  return clamp01((u - RETURN_AT) / (LOOP_S - RETURN_AT - 0.05));
};

// ---------------------------------------------------------------- the skull (hook, and its return)

/** The skull shot's own clock: the loop's end runs into frame 1 (negative before the loop point). */
export const skullClock = (t: number): number => {
  const u = wrap(t);
  return u >= RETURN_AT ? u - LOOP_S : u;
};

const pulse = (u: number, from: number, up: number, down: number): number =>
  u < from ? 0 : u < from + up ? Math.sin(((u - from) / up) * Math.PI * 0.5) : Math.max(0, 1 - (u - from - up) / down) ** 2;

export interface SkullPose {
  /** Whole video pixels per art pixel: 8, punching in to 9 on "ONE". */
  readonly scale: number;
  /** A slow drift up, video px (whole pixels). */
  readonly lift: number;
  /** The glow in the hole on "ONE" and on "hole". */
  readonly glow: number;
  /** The living head over the skull, from "TRUNK!" (0..1). */
  readonly flesh: number;
  /** A jolt on "ONE" and "TRUNK!", video px. */
  readonly shake: number;
}

export function skullPose(t: number): SkullPose {
  const u = skullClock(t);
  const punched = u >= at(W.one) - 0.04 && u < at(W.except) - 0.1;
  const jolt = pulse(u, at(W.one) - 0.04, 0.05, 0.3) + pulse(u, at(W.trunk) - 0.03, 0.05, 0.3);
  return {
    scale: punched ? 9 : 8,
    lift: Math.round(10 * (u + 0.6)),
    glow: Math.max(pulse(u, at(W.one) - 0.05, 0.12, 0.9), window01(u, at(W.hole) - 0.1, at(W.trunk), 0.15)),
    flesh: ramp(u, at(W.trunk) - 0.05, at(W.trunk) + 0.4),
    shake: Math.round(9 * jolt),
  };
}

// ---------------------------------------------------------------- Sicily

/** Where the elephant has walked to (0 off the left edge, 1 in place). */
export const elephantWalk = (t: number): number => ramp(wrap(t), CUT.sicily, at(W.about) - 0.05);
/** Its step (bob by one art pixel while it walks). */
export const elephantBob = (t: number): number => (elephantWalk(t) < 1 ? Math.floor(wrap(t) * 6) % 2 : 0);
/** The height bar, ≈1 m · 3 ft, from "about"; the place, from "Sicily". */
export const heightBar = (t: number): number => window01(wrap(t), at(W.about) - 0.08, CUT.rock, 0.2);
export const placeLabel = (t: number): number => window01(wrap(t), at(W.sicily) - 0.08, CUT.rock, 0.2);

// ---------------------------------------------------------------- down through the rock

/** How far down through the rock (0 the surface, 1 the bones). */
export const digDown = (t: number): number => ramp(wrap(t), CUT.rock + 0.1, at(W.down));

// ---------------------------------------------------------------- 1914

export const yearLabel = (t: number): number => window01(wrap(t), at(W.year) - 0.05, CUT.greeks, 0.15);

// ---------------------------------------------------------------- the giant

/** The skull going and the Cyclops coming, in dither steps, from "imagined". */
export const giantIn = (t: number): number => ramp(wrap(t), at(W.imagined) - 0.05, at(W.oneEyed));
const CYCLOPS = UNIT_ART.ogre!;
/** The throw starts so the strike frame lands on "GIANT!". */
export const THROW_AT = at(W.giant) - CYCLOPS.strike * 0.085 + 0.08;
export const STRIKE_AT = THROW_AT + CYCLOPS.strike * 0.085;
export const throwFrame = (t: number): number => (sceneAt(t) === 'giant' ? attackFrame(wrap(t) - THROW_AT, CYCLOPS.frames.attack, CYCLOPS.strike) : 0);
export const giantShake = (t: number): number => (sceneAt(t) === 'giant' ? Math.round(14 * pulse(wrap(t), STRIKE_AT, 0.04, 0.35)) : 0);

// ---------------------------------------------------------------- the battle

/** The Cyclops's throws in the battle, each one strip long, then a breath. */
export const BATTLE_THROWS = [CUT.battle + 0.25, CUT.battle + 1.35] as const;
export const battleFrame = (t: number): { readonly kind: 'idle' | 'attack'; readonly frame: number } => {
  const u = wrap(t);
  const len = attackLength(CYCLOPS.frames.attack, CYCLOPS.strike);
  const from = [...BATTLE_THROWS].reverse().find((s) => u >= s && u < s + len);
  if (from !== undefined) return { kind: 'attack', frame: attackFrame(u - from, CYCLOPS.frames.attack, CYCLOPS.strike) };
  return { kind: 'idle', frame: Math.floor(u * 5) % CYCLOPS.frames.idle };
};
/** The hoplites flinch as each rock lands. */
export const battleHit = (t: number): number => {
  const u = wrap(t);
  return Math.max(...BATTLE_THROWS.map((s) => pulse(u, s + CYCLOPS.strike * 0.085, 0.04, 0.3)));
};

// ---------------------------------------------------------------- the words

/** How many words each caption line holds, in order (the first two are the hook, on screen together). */
export const LINE_WORDS: readonly number[] = [3, 4, 1, 4, 3, 3, 2, 4, 3, 3, 3, 3, 2, 3, 3, 3, 2, 3, 4, 3, 2];
export const PHRASES = phrases(WORDS, TEMPO, LINE_WORDS, 2, LOOP_S);

export const TEXT = {
  hook: { y: 360, gap: 118, size: 104 },
  line: { y: 390, size: 100 },
} as const;

// ---------------------------------------------------------------- the call to action

export const CTA = { from: at(W.nobody) - 0.1, to: LOOP_S - 0.6, big: 'Chapter 1 free' } as const;
/** The credit for this short: it comes in with the call to action, never before. */
export const CREDIT = { text: 'InkHeroes · 16bit.ink/heroes', from: CTA.from } as const;

// ---------------------------------------------------------------- the sound

/** Quiet under the voice, one mood per beat. */
export const SOUNDS: readonly SoundCue[] = [
  cue('day', 0.04, 0.5, 0.35),
  cue('hit', at(W.one) - 0.03, 0.55, 0.7),
  cue('card', at(W.except), 0.7, 0.35),
  cue('click', at(W.not), 0.8, 0.5),
  cue('spell', at(W.hole), 0.6, 0.35),
  cue('flag', at(W.trunk) - 0.02, 0.75, 0.55),
  cue('hit', at(W.trunk) - 0.03, 0.4, 0.5),
  ...Array.from({ length: 4 }, (_, i) => cue('step', CUT.sicily + 0.1 + i * 0.3, 0.55, 0.45, -0.3 + i * 0.15)),
  cue('pickup', at(W.about), 1, 0.35),
  cue('flag', at(W.sicily), 1, 0.35),
  cue('death', at(W.died), 0.7, 0.45),
  cue('lose', at(W.long), 0.75, 0.3),
  cue('day', at(W.year), 1, 0.45),
  cue('card', at(W.guessed), 1, 0.4),
  cue('hire', CUT.greeks + 0.05, 0.9, 0.4),
  cue('spell', at(W.imagined), 0.55, 0.45),
  cue('swing', THROW_AT + 0.1, 0.6, 0.5),
  cue('hit', STRIKE_AT, 0.4, 0.9),
  cue('death', STRIKE_AT + 0.05, 0.4, 0.35),
  ...BATTLE_THROWS.flatMap((s) => [cue('swing', s + 0.1, 0.7, 0.35), cue('hit', s + CYCLOPS.strike * 0.085, 0.5, 0.55, 0.3)]),
  cue('win', CTA.from + 0.05, 1, 0.3),
  cue('spell', RETURN_AT, 0.5, 0.25),
];

/** Every value the picture is drawn from at t, by name (each shot's values only while that shot shows). */
export function stateAt(t: number): Readonly<Record<string, number>> {
  const s = skullPose(t);
  const showsSkull = returnAt(t) > 0;
  const b = battleFrame(t);
  const battleShows = sceneAt(t) === 'battle' && returnAt(t) < 1;
  return {
    return: returnAt(t), skullClock: showsSkull ? skullClock(t) : 0, scale: showsSkull ? s.scale : 0, lift: showsSkull ? s.lift : 0,
    glow: showsSkull ? s.glow : 0, flesh: showsSkull ? s.flesh : 0, shake: showsSkull ? s.shake : 0,
    hook: PHRASES.hookAlpha(wrap(t)), cta: window01(wrap(t), CTA.from, CTA.to, 0.2),
    walk: sceneAt(t) === 'sicily' ? elephantWalk(t) : 0, bar: heightBar(t), place: placeLabel(t), dig: sceneAt(t) === 'rock' ? digDown(t) : 0,
    year: yearLabel(t), giant: sceneAt(t) === 'giant' ? giantIn(t) : 0, throw: throwFrame(t),
    battle: battleShows ? 1 : 0, battleFrame: battleShows ? b.frame : 0,
  };
}
