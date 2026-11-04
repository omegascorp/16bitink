import type { Pt } from '../../../src/art/pen';
import { lerp, ramp } from '../short';
import { onAlvin, SEAM_STUCK } from './art/alvin';
import type { FaceLook } from './art/faces';
import { RAMS_AT, STUCK_AT, SWORDFISH_AT, EIGHT_AT, bangShakeAt, shockAt, uneasyAt, THEY_AT, ATTACHED_AT, STEAKS_AT, CREW_AT, TITANIC_AT, NINETEEN_AT, pOf, SCENE_IDS, type SceneId, BANG_AT, THREE_AT, NEXT_AT, wrap, STARTS } from './story';

/** Where everything is, as a pure function of time (the picture, scenes.ts and tailScenes.ts, only draws it). */

const decay = (age: number, rate: number): number => (age <= 0 ? 0 : Math.exp(-age * rate));
const onset = (age: number, rate: number): number => (age <= 0 ? 0 : 1 - Math.exp(-age * rate));

/** A fish with its sword wedged in the sub's seam: the sub's size and the fish's pose, pinned at the seam. */
export interface Stuck {
  /** Where the seam is on screen. */
  readonly tip: Pt;
  readonly subLen: number;
  readonly subRot: number;
  readonly fishLen: number;
  /** The fish's heading, radians (0: right, positive: down). */
  readonly a: number;
  /** How far the fish is still pulled back along its heading, px (0: the sword is in). */
  readonly off: number;
  readonly bend: number;
  readonly tail: number;
  readonly wide: number;
  readonly cross: number;
  readonly lid: number;
  /** The crack at the seam, 0 .. 1. */
  readonly crack: number;
  /** The bubbles, silt and chips of the hit, 0 .. 1, and how long ago it was, seconds. */
  readonly burst: number;
  readonly age: number;
  /** The small flash where the blade hit, 0 .. 1. */
  readonly spark: number;
  /** The fish turned to the viewer, in 3D. */
  readonly yaw: number;
  readonly roll: number;
  readonly persp: number;
  /** The sub with its nose to the left. */
  readonly flip: boolean;
  /** Where on the sub, in its own units, the sword sits. */
  readonly pin: Pt;
  readonly faces: readonly FaceLook[];
  /** How bright the hull is lit. */
  readonly lit: number;
}

// ---------------------------------------------------------------- frame 1 and the seam

/** The impact falls this long before the loop point, so frame 1 is just after the hit. */
export const IMPACT = -0.2;
const HOOK_TIP: Pt = { x: 742, y: 1072 };
const HOOK_A = 0.98;
/** High on the shoulder of the same seam: the fish comes from above, and the sub fills the frame below. */
const HOOK_SEAM: Pt = { x: SEAM_STUCK.x, y: -13 };

export interface Hook extends Stuck {
  /** Dark water over the picture as the sword comes out of the black, 0 .. 1. */
  readonly dark: number;
  /** White flash of the hit. */
  readonly flash: number;
  readonly zoom: number;
}

export function hookAt(t: number): Hook {
  const p = pOf(t);
  const age = p - IMPACT;
  const struggle = onset(age, 12);
  const a = HOOK_A + 0.03 * struggle * Math.sin(9 * p);
  const run = Math.min(1, Math.max(0, -age / 0.55));
  const shove = 26 * onset(age, 40) * decay(age, 5) * Math.cos(age * 28);
  const shock = onset(age - 0.05, 30);
  return {
    tip: { x: HOOK_TIP.x + Math.cos(a) * shove, y: HOOK_TIP.y + Math.sin(a) * shove },
    subLen: 1760,
    subRot: 0.1 + 0.004 * Math.sin(2 * p),
    fishLen: 1900,
    yaw: 0.76,
    roll: 0.46,
    persp: 125,
    flip: true,
    pin: HOOK_SEAM,
    a,
    off: 1700 * run ** 1.7,
    bend: 0.3 * Math.sin(8 * p) * (0.4 + struggle),
    tail: 0.32 * Math.sin(15 * p),
    wide: 0.3 + 0.5 * struggle,
    cross: ramp(p, IMPACT, IMPACT + 0.4),
    lid: 0,
    crack: ramp(age, 0, 0.12),
    burst: age <= 0 ? 0 : 1 - ramp(age, 1.1, 1.9),
    age: Math.max(0, age),
    spark: onset(age, 60) * decay(age, 7),
    faces: [{ shock, joy: 0 }, { shock, joy: 0 }, { shock, joy: 0 }],
    lit: 1,
    dark: t > 10 ? 0.86 * (1 - ramp(p, -0.95, -0.12)) : 0,
    flash: 0.5 * onset(age, 60) * decay(age, 18),
    zoom: 1 + 0.045 * onset(age, 40) * decay(age, 6),
  };
}

// ---------------------------------------------------------------- the fish wrenching, stuck

/** The fish's turn to the viewer in this beat (the scene's wiggle marks need it too). */
export const SWORD_YAW = 0.3;
export const SWORD_ROLL = 0.5;
export const SWORD_PERSP = 140;

export function swordAt(t: number): Stuck {
  const amp = 0.07 + 0.2 * ramp(t, SWORDFISH_AT, STUCK_AT);
  const cross = ramp(t, STUCK_AT - 0.25, STUCK_AT + 0.1);
  return {
    tip: { x: 830, y: 1070 },
    subLen: 2000,
    subRot: 0.06,
    fishLen: 1150,
    yaw: SWORD_YAW,
    roll: SWORD_ROLL,
    persp: SWORD_PERSP,
    flip: true,
    pin: SEAM_STUCK,
    a: 0.62 + amp * Math.sin(10 * t),
    off: 0,
    bend: 0.7 * Math.sin(10 * t + 1.2) * (0.35 + ramp(t, SWORDFISH_AT, RAMS_AT)),
    tail: 0.42 * Math.sin(17 * t),
    wide: ramp(t, EIGHT_AT, RAMS_AT) * (1 - 0.5 * cross),
    cross,
    lid: 0,
    crack: 1,
    burst: 1 - ramp(t, THEY_AT - 0.6, THEY_AT),
    age: 0.3 + 0.5 * Math.max(0, t - BANG_AT),
    spark: 0,
    faces: [{ shock: 0.6, joy: 0 }, { shock: 0.6, joy: 0 }, { shock: 0.6, joy: 0 }],
    lit: 1,
  };
}

export function swordCamera(t: number): Camera {
  const sh = bangShakeAt(t);
  const amp = ramp(t, SWORDFISH_AT, STUCK_AT);
  return { zoom: lerp(1, 1.08, ramp(t, BANG_AT + 0.7, STUCK_AT + 0.4)), rot: 0.012 * amp * Math.sin(10 * t), dx: sh.dx * 0.5, dy: sh.dy * 0.5, px: 830, py: 1070 };
}

// ---------------------------------------------------------------- rising with the fish

/** The rise hangs the fish from low on the same seam, so the whole sub shows above it. */
const RISE_SEAM: Pt = { x: 17, y: 11 };
export const RISE_FROM = THEY_AT - 0.15;
export const RISE_TO = ATTACHED_AT + 0.5;
export const riseAge = (t: number): number => ramp(t, RISE_FROM + 0.2, RISE_TO);

export function riseAt(t: number): Stuck & { readonly depth: number } {
  const u = riseAge(t);
  const subRot = 0.1 + 0.015 * Math.sin(2.1 * t);
  return {
    tip: onAlvin({ x: 548, y: 500, len: 880, rot: subRot, flip: true }, RISE_SEAM),
    subLen: 880,
    subRot,
    fishLen: 1120,
    yaw: 0.22,
    roll: 0.34,
    persp: 150,
    flip: true,
    pin: RISE_SEAM,
    a: -1.4 + 0.12 * Math.sin(2.7 * t),
    off: 0,
    bend: 0.35 * Math.sin(2.7 * t + 1),
    tail: 0.22 * Math.sin(3.3 * t),
    wide: 0,
    cross: 0,
    lid: 0.8,
    crack: 0.8,
    burst: 0,
    age: 0,
    spark: 0,
    faces: [{ shock: 0, joy: 0.9, blink: 0 }, { shock: 0, joy: 0.9 }, { shock: 0, joy: 0.9 }],
    lit: 0.75 + 0.25 * u,
    depth: 1 - u,
  };
}

// ---------------------------------------------------------------- the descent and the portholes

export function descentAt(t: number): { readonly depth: number; readonly sub: Pt; readonly rot: number } {
  return { depth: ramp(t, 1.95, THREE_AT), sub: { x: 540 + 16 * Math.sin(1.3 * t), y: 1010 + 9 * Math.sin(0.9 * t) }, rot: 0.06 + 0.02 * Math.sin(1.7 * t) };
}

const blinkAt = (t: number, i: number): number => {
  const period = 2.3 + 0.37 * i;
  const ph = (t + i * 0.9 + 0.8) % period;
  return ph < 0.16 ? Math.sin((Math.PI * ph) / 0.16) : 0;
};

export function portsAt(t: number): { readonly faces: readonly FaceLook[]; readonly jolt: number; readonly zoom: number } {
  const shock = shockAt(t);
  const uneasy = uneasyAt(t);
  const faces = [0, 1, 2].map((i): FaceLook => ({ shock, joy: 0.12 * (1 - uneasy) * (1 - shock), gaze: Math.sin(t * 0.9 + i * 2) * (1 - shock) * (0.5 + uneasy), blink: blinkAt(t, i) * (1 - shock) }));
  return { faces, jolt: onset(t - BANG_AT, 60) * decay(t - BANG_AT, 5) * Math.cos((t - BANG_AT) * 26), zoom: lerp(1, 1.07, ramp(t, THREE_AT - 0.3, BANG_AT)) };
}

// ---------------------------------------------------------------- the steaks and the Titanic

export const PLATE_AT: readonly number[] = [STEAKS_AT + 0.02, STEAKS_AT + 0.2, STEAKS_AT + 0.38];
export const plateAt = (t: number, i: number): number => ramp(t, PLATE_AT[i]!, PLATE_AT[i]! + 0.3);
/** The crew bounce with delight on "crew". */
export const cheerAt = (t: number): number => decay(t - CREW_AT, 4) * onset(t - CREW_AT, 30) * Math.sin((t - CREW_AT) * 14);
export const sunAt = (t: number): number => ramp(t, NEXT_AT - 0.1, NEXT_AT + 0.5);

export const lampsAt = (t: number): number => ramp(t, NINETEEN_AT + 0.3, NINETEEN_AT + 0.9);
/** The bow comes out of the black as the lamps find it, on "TITANIC". */
export const bowLightAt = (t: number): number => ramp(t, TITANIC_AT - 0.55, TITANIC_AT + 0.15);
export const titanicSubAt = (t: number): { readonly x: number; readonly y: number } => ({ x: lerp(150, 262, ramp(t, NINETEEN_AT, TITANIC_AT + 0.9)), y: 940 + 10 * Math.sin(1.1 * t) });

// ---------------------------------------------------------------- cameras

export interface Camera {
  readonly zoom: number;
  readonly rot: number;
  readonly dx: number;
  readonly dy: number;
  /** The point the zoom and turn are about. */
  readonly px: number;
  readonly py: number;
}

const STILL: Camera = { zoom: 1, rot: 0, dx: 0, dy: 0, px: 540, py: 960 };

/** Each scene's camera: slow pushes, the hard shake on the BANG and a punch on the hit. */
export function cameraOf(id: SceneId, t: number): Camera {
  switch (id) {
    case 'hook': { const h = hookAt(t); return { ...STILL, zoom: h.zoom, px: HOOK_TIP.x, py: HOOK_TIP.y }; }
    case 'ports': { const sh = bangShakeAt(t); const z = portsAt(t).zoom; return { ...STILL, zoom: z, dx: sh.dx, dy: sh.dy, rot: 0.02 * sh.dx / 52 }; }
    case 'sword': return swordCamera(t);
    case 'titanic': return { ...STILL, zoom: lerp(1, 1.09, ramp(t, STARTS.titanic, STARTS.hook)) };
    default: return STILL;
  }
}

export const sceneOrder = (t: number): readonly SceneId[] => (wrap(t) < STARTS.descent + 1 ? ['hook', ...SCENE_IDS.slice(0, -1)] : SCENE_IDS);
