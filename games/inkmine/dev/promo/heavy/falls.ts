import { clamp01, lerp, ramp, smooth, window01 } from '../short';
import { CANT_AT, ELEPHANTS_AT, ITS_AT, JUMP_AT, JUST_AT, SNAP_AT, SO_AT, THIN_AT, THIN_LEGS_AT, wrap } from './story';

/**
 * The two falls (story.ts has the clock): a thin-legged deer whose legs
 * give under three times its weight on "snap" (it plops onto its belly,
 * stunned but fine), and an elephant that tries a hop and can't.
 * Pure functions of time.
 */

// ---------------------------------------------------------------- the thin-legged deer

/** Its ground point and size (screen px per unit of its drawing). */
export const THIN = { x: 520, ground: 1030, scale: 3.9 } as const;
export const THIGH = 34;
export const SHIN = 40;
/** Its hips, rear and front, near and far (drawing units; the far pair a little behind). */
export const DEER_LEGS: readonly { readonly x: number; readonly far: boolean; readonly front: boolean }[] = [
  { x: -36, far: true, front: false }, { x: 40, far: true, front: true },
  { x: -42, far: false, front: false }, { x: 34, far: false, front: true },
];
export const HIP_Y = -72;
/** How far the body drops when it sits down on its belly. */
export const SIT_DROP = 57;

/** A leg's two segments as angles from straight down (positive swings forward). */
interface Bend {
  readonly thigh: number;
  readonly shin: number;
}
const STAND: Readonly<Record<'front' | 'rear', Bend>> = { front: { thigh: 0.05, shin: -0.02 }, rear: { thigh: 0.26, shin: -0.2 } };
/** Sat down: forelegs folded out in front, hind legs out behind, like a fawn on ice. */
const SAT: Readonly<Record<'front' | 'rear', Bend>> = { front: { thigh: 1.15, shin: 1.62 }, rear: { thigh: -1.05, shin: -1.62 } };

export interface ThinPose {
  /** Body drop (units, down), and its tilt. */
  readonly drop: number;
  readonly tilt: number;
  readonly legs: readonly Bend[];
  /** The stunned stars over its head, 0 .. 1. */
  readonly dizzy: number;
}

/** It gives on "snap": the knees go, then the body falls and lands with a bump. */
export const GIVE_AT = SNAP_AT - 0.02;
export const SIT_AT = SNAP_AT + 0.22;
export const giveAt = (t: number): number => smooth(ramp(wrap(t), GIVE_AT, GIVE_AT + 0.16));

export function thinAt(t: number): ThinPose {
  const w = wrap(t);
  const give = giveAt(t);
  const fall = clamp01((w - GIVE_AT) / (SIT_AT - GIVE_AT));
  const dt = w - SIT_AT;
  const bounce = dt > 0 && dt < 0.4 ? 4 * Math.sin((dt / 0.4) * Math.PI) * Math.exp(-dt / 0.12) : 0;
  const shiver = trembleAt(t) * Math.sin(w * 47);
  const legs = DEER_LEGS.map((leg, i): Bend => {
    const a = STAND[leg.front ? 'front' : 'rear'];
    const b = SAT[leg.front ? 'front' : 'rear'];
    const wob = shiver * 0.05 * (i % 2 ? 1 : -1);
    return { thigh: lerp(a.thigh, b.thigh, give) + wob, shin: lerp(a.shin, b.shin, give) - wob * 1.4 };
  });
  return { drop: SIT_DROP * fall * fall - bounce, tilt: 0.05 * Math.sin(Math.PI * fall), legs, dizzy: window01(w, SIT_AT + 0.1, ITS_AT + 0.1, 0.2) };
}
/** The knees and hooves of leg `i` from its hip (units, relative to the hip). */
export function jointsOf(b: Bend): { readonly knee: { x: number; y: number }; readonly hoof: { x: number; y: number } } {
  const knee = { x: Math.sin(b.thigh) * THIGH, y: Math.cos(b.thigh) * THIGH };
  return { knee, hoof: { x: knee.x + Math.sin(b.shin) * SHIN, y: knee.y + Math.cos(b.shin) * SHIN } };
}
/** The legs shake harder from "would just…" until they give. */
export const trembleAt = (t: number): number => ramp(wrap(t), JUST_AT - 0.45, SNAP_AT - 0.05) * (1 - ramp(wrap(t), GIVE_AT, GIVE_AT + 0.05));
/** "Thin legs": the legs lit with the highlighter until they give. */
export const thinLit = (t: number): number => window01(wrap(t), THIN_LEGS_AT - 0.08, SNAP_AT + 0.1, 0.15);
/** The snap lines at its knees, 0 .. 1 of their life. */
export const snapBurstAt = (t: number): number => (wrap(t) - GIVE_AT) / 0.45;
/** The dust it lands in. */
export const sitDustAt = (t: number): number => (wrap(t) - SIT_AT) / 0.9;

/** The thin deer slides in from the left as the blocks go. */
export const thinSlide = (t: number): number => -180 * (1 - smooth(ramp(wrap(t), THIN_AT - 0.35, THIN_AT + 0.05)));

// ---------------------------------------------------------------- the elephant

export const ELEPHANT = { x: 520, ground: 1030, scale: 3.5 } as const;
/** Its legs: far pair first, then near, hips at y = -50. */
export const ELEPHANT_LEGS: readonly { readonly x: number; readonly far: boolean }[] = [
  { x: -36, far: true }, { x: 42, far: true }, { x: -48, far: false }, { x: 30, far: false },
];
export const ELEPHANT_HIP = -50;

export interface ElephantPose {
  /** Body rise (units, up positive). */
  readonly rise: number;
  /** Leg length over drawn length: shorter in the crouch, up on its toes in the push. */
  readonly stretch: number;
  /** Ear flap angle and how sad it looks (ears and trunk down, eye heavy). */
  readonly ear: number;
  readonly sad: number;
  /** Trunk raised (0 .. 1). */
  readonly trunk: number;
}

/** Crouch on "elephants", push on "can't", sink back on "jump". */
const CROUCH = [ELEPHANTS_AT - 0.1, CANT_AT - 0.06] as const;
const PUSH = [CANT_AT - 0.06, CANT_AT + 0.16] as const;
export const SINK_AT = JUMP_AT + 0.06;
const SINK_S = 0.3;
export function elephantAt(t: number): ElephantPose {
  const w = wrap(t);
  const crouch = smooth(ramp(w, CROUCH[0], CROUCH[1]));
  const push = smooth(ramp(w, PUSH[0], PUSH[1]));
  const sink = smooth(ramp(w, SINK_AT, SINK_AT + SINK_S));
  const up = push * (1 - sink);
  const dt = w - (SINK_AT + SINK_S);
  const settle = dt > 0 && dt < 0.4 ? -1.5 * Math.sin((dt / 0.4) * Math.PI) : 0;
  return {
    rise: -7 * crouch * (1 - push) + 6 * up + settle,
    stretch: 1 - 0.14 * crouch * (1 - push) + 0.12 * up,
    ear: 0.28 * up * Math.sin((w - PUSH[0]) * 26) - 0.12 * sadAt(t),
    sad: sadAt(t),
    trunk: up,
  };
}
const sadAt = (t: number): number => window01(wrap(t), SINK_AT + 0.1, SO_AT + 0.3, 0.3);
/** The hop it hoped for, a dotted arc drawn out over it as it pushes, fading as it sinks. */
export const hopeAt = (t: number): number => ramp(wrap(t), PUSH[0] + 0.05, SINK_AT + 0.05);
export const hopeAlpha = (t: number): number => window01(wrap(t), PUSH[0], SO_AT - 0.1, 0.25) * (1 - 0.6 * ramp(wrap(t), SINK_AT, SINK_AT + 0.4));
/** A puff of dust as it thumps back down. */
export const thumpDustAt = (t: number): number => (wrap(t) - (SINK_AT + SINK_S - 0.05)) / 0.8;
/** The elephant fades in in place: from "It's why". */
export const elephantIn = (t: number): number => smooth(ramp(wrap(t), ITS_AT - 0.25, ITS_AT + 0.05));
