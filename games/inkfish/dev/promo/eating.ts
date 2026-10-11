import type { SfxId } from '../../src/audio/recipes';
import { EATEN_AGE, GULP_AGE } from './chain';

/**
 * The beats of one bite, as functions of a fish's age (see chain.ts): the
 * prey spots the predator and panics, the predator's jaw drops open and the
 * prey is sucked in, the jaw snaps shut, the eater chews twice with a lump
 * going down. Picture (render.ts) and sound (audio.ts) both read these, so
 * they stay in step.
 */

const smooth = (u: number): number => {
  const c = Math.max(0, Math.min(1, u));
  return c * c * (3 - 2 * c);
};
/** 0 → 1 → 0 over [from, to], peaking in the middle. */
const bump = (a: number, from: number, to: number): number => {
  if (a <= from || a >= to) return 0;
  return Math.sin((Math.PI * (a - from)) / (to - from));
};

/**
 * When the jaw starts to open, is fully open, and has snapped shut (eater
 * ages, in story time: timing.ts plays the gulp in slow motion). It opens
 * early and holds wide while the prey is dragged in, then shuts in a blink.
 */
const OPEN_FROM = GULP_AGE - 0.22;
const OPEN_FULL = GULP_AGE - 0.1;
const SNAP_SHUT = GULP_AGE + 0.012;
/** Two chews after the gulp: start ages and how wide. */
const CHEWS = [{ at: GULP_AGE + 0.1, size: 0.2 }, { at: GULP_AGE + 0.22, size: 0.14 }] as const;
const CHEW_LEN = 0.08;

/** How far the jaw hangs open, 0 shut .. 1 gaping. */
export function jawOpen(age: number): number {
  if (age >= OPEN_FROM && age < GULP_AGE) return smooth((age - OPEN_FROM) / (OPEN_FULL - OPEN_FROM));
  if (age >= GULP_AGE && age < SNAP_SHUT) return 1 - smooth((age - GULP_AGE) / (SNAP_SHUT - GULP_AGE));
  return Math.max(0, ...CHEWS.map((c) => c.size * bump(age, c.at, c.at + CHEW_LEN)));
}

/** The prey's last stretch: it is sucked into the open mouth over this many ages. */
export const SWALLOW = GULP_AGE - OPEN_FULL - 0.01;

/** The prey notices the predator this long before it is eaten (ages), and panics until then. */
const STARTLE_LEAD = 0.27;
export const STARTLE_AGE = EATEN_AGE - STARTLE_LEAD;

/** Panic, 0 calm .. 1 frantic: a jolt when it notices, then thrashing. */
export function panic(age: number): number {
  if (age < STARTLE_AGE) return 0;
  return Math.min(1, 0.5 + smooth((age - STARTLE_AGE) / 0.05) * 0.5);
}

/** The "!" over the prey's head: 0 hidden .. 1 full size, with a little overshoot as it pops. */
export function alarm(age: number): number {
  const u = (age - STARTLE_AGE) / 0.05;
  if (u < 0) return 0;
  if (u < 1) return smooth(u) * 1.25;
  return 1 + 0.25 * Math.max(0, 1 - (u - 1) * 2);
}

const LUMP_FROM = GULP_AGE + 0.005;
const LUMP_TO = GULP_AGE + 0.4;

/** The meal going down: a swelling in the eater's body, 0 .. 1 (it puffs the cheeks first, then shrinks as it travels). */
export function lump(age: number): number {
  const u = (age - LUMP_FROM) / (LUMP_TO - LUMP_FROM);
  if (u <= 0 || u >= 1) return 0;
  return Math.min(1, u * 12) * (1 - u) ** 1.5;
}

/** Where the lump is along the eater, 0 nose .. 1 tail base: from the cheeks down to the belly. */
export function lumpAt(age: number): number {
  return 0.2 + 0.42 * smooth((age - LUMP_FROM) / (LUMP_TO - LUMP_FROM));
}

/** The eater's eyes: squeezed shut on the bite, then closed in a happy "mmm" while it swallows. */
export function eyesShut(age: number): 'squeeze' | 'happy' | null {
  if (age >= GULP_AGE - 0.004 && age < GULP_AGE + 0.05) return 'squeeze';
  if (age >= GULP_AGE + 0.05 && age < GULP_AGE + 0.33) return 'happy';
  return null;
}

/** Water rushing into the open mouth, 0 none .. 1 full pull: builds as the jaw opens, stops at the snap. */
export function suction(age: number): number {
  if (age < OPEN_FROM || age >= GULP_AGE) return 0;
  return smooth((age - OPEN_FROM) / (OPEN_FULL - OPEN_FROM + 0.03));
}
export const SUCTION_FROM = OPEN_FROM;

/** The squash of the bite itself: the whole fish jolts as the jaw snaps. */
export function snap(age: number): number {
  return bump(age, GULP_AGE - 0.01, GULP_AGE + 0.07);
}

/**
 * Camera shake for the bite, px, as a function of stage time. The gulp comes
 * at the same phase of every stage, so the shake repeats with the loop.
 */
export function shake(tau: number): { readonly x: number; readonly y: number } {
  // Stages since the last gulp: they come at tau = j + GULP_AGE.
  const local = tau - GULP_AGE - Math.floor(tau - GULP_AGE);
  const decay = local < 0.14 ? 1 - local / 0.14 : 0;
  if (decay <= 0) return { x: 0, y: 0 };
  const amp = 16 * decay * decay;
  return { x: amp * Math.sin(local * 260), y: amp * 0.7 * Math.cos(local * 330) };
}

export interface SoundCue {
  readonly id: SfxId;
  /** The eater's age when it plays. */
  readonly age: number;
  readonly gain: number;
  /** Times the size pitch of the bite. */
  readonly pitch: number;
}

/** What one bite sounds like, all timed by the eater's age (the prey's alarm is one stage behind). */
export const BITE_SOUNDS: readonly SoundCue[] = [
  { id: 'spotted', age: STARTLE_AGE - 1, gain: 0.45, pitch: 1.4 },
  { id: 'suck', age: OPEN_FROM - 0.02, gain: 0.55, pitch: 1 },
  { id: 'lunge', age: GULP_AGE - 0.1, gain: 0.85, pitch: 1 },
  { id: 'eatBig', age: GULP_AGE, gain: 1, pitch: 1 },
  { id: 'hurt', age: GULP_AGE, gain: 0.35, pitch: 0.8 },
  ...CHEWS.map((c, i): SoundCue => ({ id: 'eat', age: c.at + 0.02, gain: 0.5 - i * 0.12, pitch: 0.55 })),
  { id: 'drop', age: GULP_AGE + 0.09, gain: 0.25, pitch: 1.2 },
  { id: 'drop', age: GULP_AGE + 0.16, gain: 0.18, pitch: 1.5 },
];
