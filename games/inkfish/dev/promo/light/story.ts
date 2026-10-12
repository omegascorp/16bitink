import type { SfxId } from '../../../src/audio/recipes';
import type { Pose } from '../chain';
import { curveAt, type Key, ramp, smooth, window01 } from '../short';

/**
 * "There is a light, anglerfish": in February 2025 a black seadevil, a deep
 * sea anglerfish that lives in the dark, was filmed swimming up into the
 * sunlit water off Tenerife. It died hours later, and the internet decided
 * she just wanted to see the light. Every beat is a function of time, in
 * seconds, over a loop of LOOP_S.
 *
 *   0     deep in the dark, all you see is her lure: she is rising
 *   2.4   the water turns blue around her
 *   4.6   she reaches the sunlit water under the surface; the sun above
 *   5.2   she closes her eyes in the light
 *   7.8   she sinks back down, gently at first, into the dark
 *   10.6  deep again, she turns her nose up and rises...
 *   12    ...which is where the loop began.
 *
 * The camera keeps her in the middle of the picture: the sea moves past.
 * The game's own drawing of her (the seadevil boss).
 */
export const LOOP_S = 12;

/** Where the camera keeps her body's centre, px from the top. */
export const FISH_Y = 860;
export const FISH_LEN = 460;
export const REACH_AT = 4.6;
export const HOLD_TO = 7.8;
export const SINK_TO = 10.6;

/** How deep she is (px below the surface) and how fast that changes, through the loop: up, a rest in the light, back down. */
const DEPTH_KEYS: readonly Key[] = [
  { t: 0, at: 2600, rate: -520 },
  { t: 2.4, at: 1150, rate: -450 },
  { t: REACH_AT, at: 400, rate: -90 },
  { t: 6.2, at: 335, rate: -15 },
  { t: HOLD_TO, at: 345, rate: 30 },
  { t: SINK_TO, at: 3000, rate: 0 },
  { t: LOOP_S, at: 2600, rate: -520 },
];

/** Her nose-up tilt: climbing steeply, levelling in the light, limp as she sinks, then turning up again. */
const TILT_KEYS: readonly Key[] = [
  { t: 0, at: 0.95, rate: 0 },
  { t: 3.6, at: 0.85 },
  { t: REACH_AT + 0.4, at: 0.25 },
  { t: HOLD_TO, at: 0.12 },
  { t: 9.4, at: -0.15 },
  { t: SINK_TO, at: 0.2 },
  { t: 11.4, at: 0.9 },
  { t: LOOP_S, at: 0.95, rate: 0 },
];

export const depthAt = (t: number): number => curveAt(DEPTH_KEYS, t).at;
/** px/s; negative is rising. */
export const depthRate = (t: number): number => curveAt(DEPTH_KEYS, t).rate;

/** How dark the water is at a depth (px below the surface), 0 sunlit .. 1 black. */
export const darkAt = (depth: number): number => smooth((depth - 300) / 1700);

/** Where the surface is on screen. */
export const surfaceY = (t: number): number => FISH_Y - depthAt(t);

/** Tail beats per loop: a whole number, so the swimming loops too. */
const BEATS = 20;

export function anglerAt(t: number): Pose {
  // A slow drift from side to side, and her stroke: strong climbing, idle in the light, limp sinking.
  const x = 470 + 30 * Math.sin((2 * Math.PI * t) / LOOP_S);
  const effort = 0.6 - 0.3 * ramp(t, 4.2, 5.2) - 0.15 * ramp(t, 8, 9) + 0.45 * ramp(t, SINK_TO, SINK_TO + 1);
  return {
    j: 0, shape: 'seadevil', age: 0, x, y: FISH_Y, length: FISH_LEN, facing: 1, tilt: curveAt(TILT_KEYS, t).at,
    beat: (2 * Math.PI * BEATS * t) / LOOP_S, effort,
  };
}

/** Eyes shut in the light, all the way down. */
export function anglerEyes(t: number): 'happy' | null {
  return t >= 5.2 && t < 10.2 ? 'happy' : null;
}

/** The lure's glow, 0 .. 1: bright in the dark, outshone by the sun, with a slow pulse. */
export function lureGlow(t: number): number {
  const pulse = 0.9 + 0.1 * Math.sin((2 * Math.PI * 6 * t) / LOOP_S);
  return (0.25 + 0.75 * darkAt(depthAt(t))) * pulse;
}

/** How bright the sunlight is around her, 0 .. 1. */
export const sunlight = (t: number): number => 1 - darkAt(depthAt(t));

// ---------------------------------------------------------------- words and sounds

export interface Caption {
  readonly text: string;
  readonly y: number;
  readonly size: number;
  /** Shown over [from, to] seconds, fading at both ends; may run past the loop's ends, wrapping round. */
  readonly from: number;
  readonly to: number;
  /** Pale on a dark halo over the dark sea, or ink on paper over the sky. */
  readonly pale: boolean;
}

const HOOK = { from: -0.45, to: 3.4, pale: true };
const PAYOFF = { from: 5.0, to: 7.7, pale: false };
const MEME = { from: 8.2, to: 11.2, pale: true };
export const CAPTIONS: readonly Caption[] = [
  { text: 'there is a light,', y: 330, size: 108, ...HOOK },
  { text: 'anglerfish', y: 445, size: 108, ...HOOK },
  { text: 'This really happened.', y: 330, size: 92, ...PAYOFF },
  { text: 'Tenerife, 2025', y: 425, size: 78, ...PAYOFF },
  { text: 'she just wanted', y: 330, size: 104, ...MEME },
  { text: 'to see the light', y: 440, size: 104, ...MEME },
];

const CAPTION_FADE = 0.3;

/** How visible a caption is at time t, 0 .. 1, counting its copies a loop before and after (so it can span the seam). */
export function captionAlpha(c: Caption, t: number): number {
  return Math.max(...[-LOOP_S, 0, LOOP_S].map((shift) => window01(t + shift, c.from, c.to, CAPTION_FADE)));
}

export interface SoundCue {
  readonly id: SfxId;
  readonly t: number;
  readonly pitch: number;
  readonly gain: number;
  /** -1 left .. 1 right. */
  readonly pan: number;
}

export const SOUNDS: readonly SoundCue[] = [
  // Bubbles slipping past as she climbs.
  { id: 'drop', t: 0.7, pitch: 0.6, gain: 0.2, pan: -0.2 },
  { id: 'drop', t: 1.9, pitch: 0.7, gain: 0.16, pan: 0.15 },
  { id: 'drop', t: 3.1, pitch: 0.85, gain: 0.14, pan: -0.1 },
  // Into the light.
  { id: 'grow', t: REACH_AT - 0.35, pitch: 0.7, gain: 0.45, pan: 0 },
  { id: 'splash', t: REACH_AT + 0.6, pitch: 1.4, gain: 0.1, pan: 0.3 },
  // Sinking back down, then turning up again.
  { id: 'suck', t: HOLD_TO + 0.5, pitch: 0.55, gain: 0.3, pan: 0 },
  { id: 'dash', t: HOLD_TO + 1.1, pitch: 0.5, gain: 0.35, pan: 0 },
  { id: 'dash', t: SINK_TO + 0.5, pitch: 0.75, gain: 0.3, pan: 0.1 },
];

/** When the soft chord swells: as the light reaches her. */
export const CHORD_AT = REACH_AT - 0.2;
