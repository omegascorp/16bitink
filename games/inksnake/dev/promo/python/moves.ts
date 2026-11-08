import type { Key } from '../short';
import { clamp01, ramp } from '../short';
import type { Pt } from '../sprites';
import { route, type Route } from '../krait/path';
import { WORLD } from './board';
import { CROC_LEN } from './croc';
import { type Bulge, type Camera, CROC_IN, type PythonPose } from './snake';
import { cycles, DUSK_FROM, ends, LAKE_FROM, wrap, WHOLE_AT, TAG_FROM } from './story';
import { curveAt } from '../short';

/**
 * The python's and the croc's moves and the camera, as pure functions of
 * time. World px, 540 wide and 960 tall (board.ts): the bank along the top,
 * the lake below.
 */

export const WIDTH = 22;
export const LENGTH = 260;
const BULGE = 14;
/** World px back from the head's centre where the neck leaves the head sprite: a meal only swells the body behind it. */
const NECK = 24;
/** World px from the head's centre to the lips of the gaping head. */
const LIPS = 12;

export const curve = (keys: readonly Key[], u: number): number => curveAt(keys, u).at;

/** The place along a route nearest a point. */
export function nearestS(r: Route, p: Pt): number {
  let best = 0;
  let bestD = Infinity;
  for (let s = 0; s <= r.length; s += 1) {
    const q = r.at(s);
    const d = Math.hypot(q.x - p.x, q.y - p.y);
    if (d < bestD) {
      bestD = d;
      best = s;
    }
  }
  return best;
}

/** Time that stops and starts every `step` s from `from`: a jaw-walk's rhythm (still at each step's end). */
const ratchet = (u: number, from: number, step: number): number => u - (step / (2 * Math.PI)) * Math.sin((2 * Math.PI * (u - from)) / step);

const bump = (u: number, at: number, up: number, down: number): number => (u < at ? 0 : u < at + up ? Math.sin(((u - at) / up) * Math.PI * 0.5) : Math.max(0, 1 - (u - at - up) / down) ** 2);

/** The tongue flicking out at each of `starts`, for 0.3 s. */
function flicks(u: number, starts: readonly number[]): number {
  for (const s of starts) if (u >= s && u < s + 0.3) return Math.sin(((u - s) / 0.3) * Math.PI);
  return 0;
}

interface CamKey {
  readonly t: number;
  readonly x: number;
  readonly y: number;
  readonly zoom: number;
}

function cameraFrom(keys: readonly CamKey[], u: number): Camera {
  const part = (f: (k: CamKey) => number): Key[] => keys.map((k) => ({ t: k.t, at: f(k), rate: 0 }));
  return inWorld({ x: curve(part((k) => k.x), u), y: curve(part((k) => k.y), u), zoom: Math.exp(curve(part((k) => Math.log(k.zoom)), u)) });
}

/** Keeps the view on the painted world. */
export function inWorld(c: Camera): Camera {
  const hw = WORLD.w / 2 / c.zoom;
  const hh = WORLD.h / 2 / c.zoom;
  return { ...c, x: Math.min(WORLD.w - hw, Math.max(hw, c.x)), y: Math.min(WORLD.h - hh, Math.max(hh, c.y)) };
}

// ---------------------------------------------------------------- what's swallowed

/** The swelling of a croc going down: along the throat while it swallows. */
function swelling(p: number): { bulges: Bulge[]; inside: PythonPose['inside'] } {
  if (p <= 0) return { bulges: [], inside: undefined };
  const to = Math.max(NECK, p * CROC_IN - LIPS + 10);
  const amp = BULGE * clamp01((p * CROC_IN - LIPS - NECK) / 20);
  return { bulges: [{ from: NECK, to, amp }], inside: { at: (p * CROC_IN) / 2 - LIPS, alpha: 0.5 * clamp01(amp / 4) } };
}

/** A croc-shaped lump lying in the body: from d to d + len back from the head. */
function lump(from: number, len: number, amp: number): { bulges: Bulge[]; inside: PythonPose['inside'] } {
  return { bulges: [{ from, to: from + len, amp }], inside: { at: from + len / 2, alpha: 0.5 } };
}

// ---------------------------------------------------------------- the hook (drawn side on: profile.ts)

/** The hook's clock: the croc's head and shoulders already in the jaws at the start, the last of its tail gone. */
export const HOOK = { start: -0.95, gone: 2.0, step: 0.33 } as const;

const HOOK_P: readonly Key[] = [
  { t: HOOK.start, at: 0.3, rate: 0.05 },
  { t: 0, at: 0.36, rate: 0.1 },
  { t: 1.5, at: 0.84, rate: 0.4 },
  { t: HOOK.gone, at: 1.0, rate: 0.15 },
];

/** How much of the croc has gone in, on the hook's clock. */
export const hookP = (u: number): number => Math.min(1, curve(HOOK_P, ratchet(u, HOOK.start, HOOK.step)));

// ---------------------------------------------------------------- the lake: the croc, the approach, the coil

/** The croc's middle in the shallows, facing north (towards the bank). */
export const CROC_AT: Pt = { x: 395, y: 400 };
export const NORTH = -Math.PI / 2;

/** How hard they struggle (0..1): from the first coil to the cut. */
export const struggle = (t: number): number => ramp(t, 6.0, 7.5) * (1 - ramp(t, ends('fought.'), DUSK_FROM - 0.02));

const LEG: readonly Pt[] = [
  { x: 212, y: 780 }, { x: 214, y: 690 }, { x: 216, y: 600 }, { x: 215, y: 520 }, { x: 214, y: 440 }, { x: 215, y: 375 }, { x: 222, y: 332 },
  { x: 246, y: 316 }, { x: 292, y: 322 }, { x: 345, y: 334 },
];
const SPIRAL = { r0: 58, r1: 26, from: 1.5 * Math.PI, turns: 1.6 } as const;
const SPIRAL_N = 32;

/** The coil's knots, turned `phi` further round at the inner end and squeezed by `squeeze` (0..1). */
function spiralKnots(phi: number, squeeze: number): Pt[] {
  return Array.from({ length: SPIRAL_N + 1 }, (_, i) => {
    const u = i / SPIRAL_N;
    const a = SPIRAL.from + u * SPIRAL.turns * Math.PI * 2 + phi * u;
    const r = (SPIRAL.r0 + (SPIRAL.r1 - SPIRAL.r0) * u) * (1 - squeeze * u);
    return { x: CROC_AT.x + Math.cos(a) * r, y: CROC_AT.y + Math.sin(a) * r };
  });
}

const STATIC = route([...LEG, ...spiralKnots(0, 0)]);
const V_TOP = nearestS(STATIC, { x: 215, y: 380 });
const V_SP = nearestS(STATIC, spiralKnots(0, 0)[0]!);
const SP_LEN = STATIC.length - V_SP;

/** Where the python's head is along the approach and the coil (v: the static route's own arclength). */
const LAKE_HEAD: readonly Key[] = [
  { t: LAKE_FROM - 0.4, at: V_TOP - 60, rate: 70 },
  { t: 4.67, at: V_TOP - 15, rate: 45 },
  { t: 5.3, at: V_TOP + 10, rate: 30 },
  { t: 5.62, at: V_SP, rate: 520 },
  { t: 7.6, at: V_SP + SP_LEN, rate: 0 },
];

/** The struggle's turn and squeeze of the coil at time t. */
function thrash(t: number): { phi: number; squeeze: number } {
  const k = struggle(t);
  return { phi: k * 0.5 * Math.sin(cycles(23, t)), squeeze: k * (0.1 + 0.07 * Math.sin(cycles(31, t))) };
}

export function lakeRoute(t: number): Route {
  const { phi, squeeze } = thrash(t);
  return phi === 0 && squeeze === 0 ? STATIC : route([...LEG, ...spiralKnots(phi, squeeze)]);
}

export function lakePython(t: number): PythonPose {
  const r = lakeRoute(t);
  const v = curve(LAKE_HEAD, t);
  const sp = nearestS(r, spiralKnots(thrash(t).phi, thrash(t).squeeze)[0]!);
  const headS = v <= V_SP ? v : sp + ((v - V_SP) / SP_LEN) * (r.length - sp);
  return {
    route: r,
    headS,
    length: LENGTH,
    width: WIDTH,
    bulges: [],
    head: t >= 5.42 && t < 5.95 ? 'strike' : 'shut',
    lunge: 8 * bump(t, 5.42, 0.1, 0.3),
    yaw: 0.12 * struggle(t) * Math.sin(cycles(37, t)),
    tongue: flicks(t, [4.4, 4.95]),
  };
}

/** The croc: where it is, which way it faces, how its tail swings (0 or 1, the sprite). */
export function lakeCroc(t: number): { at: Pt; angle: number; pose: 'swim0' | 'swim1' } {
  const k = struggle(t);
  const basking = Math.sin(cycles(5, t) + 1) > 0;
  const fast = Math.sin(cycles(83, t)) > 0;
  return {
    at: { x: CROC_AT.x + k * 4 * Math.sin(cycles(29, t)), y: CROC_AT.y + k * 4 * Math.cos(cycles(41, t)) },
    angle: NORTH + k * 0.55 * Math.sin(cycles(27, t)) + 0.04 * Math.sin(cycles(3, t)),
    pose: (k > 0.2 ? fast : basking) ? 'swim1' : 'swim0',
  };
}

const LAKE_CAM: readonly CamKey[] = [
  { t: TAG_FROM, x: 300, y: 526, zoom: 3.5 },
  { t: 5.35, x: 305, y: 520, zoom: 3.3 },
  { t: 5.62, x: 345, y: 480, zoom: 3.8 },
  { t: 6.7, x: CROC_AT.x - 4, y: 444, zoom: 5.4 },
  { t: 7.7, x: CROC_AT.x - 4, y: 441, zoom: 5.8 },
  { t: DUSK_FROM, x: CROC_AT.x - 4, y: 441, zoom: 5.8 },
];
export const lakeCamera = (t: number): Camera => cameraFrom(LAKE_CAM, t);

// ---------------------------------------------------------------- the swallow at dusk

export const DUSK_X = 270;
const DUSK_ROUTE = route([
  { x: 262, y: 900 }, { x: 266, y: 780 }, { x: 270, y: 660 }, { x: 271, y: 560 }, { x: 270, y: 500 }, { x: 269, y: 430 }, { x: 268, y: 340 }, { x: 268, y: 240 },
]);
const DUSK_S0 = nearestS(DUSK_ROUTE, { x: 270, y: 520 });

export const DUSK = { open: 10.2, bite: 10.75, step: 0.4 } as const;

const DUSK_P: readonly Key[] = [
  { t: DUSK_FROM, at: -0.6, rate: 0.02 },
  { t: DUSK.bite, at: -0.04, rate: 0.12 },
  { t: 11.66, at: 0.1, rate: 0.14 },
  { t: 13.1, at: 0.4, rate: 0.2 },
];

export function duskP(u: number): number {
  const p = curve(DUSK_P, u < DUSK.bite ? u : ratchet(u, DUSK.bite, DUSK.step));
  return p;
}

export function duskPython(t: number): PythonPose {
  const p = duskP(t);
  const biting = t >= DUSK.bite;
  const head = t < DUSK.open ? 'shut' : 'open';
  const yaw = biting ? 0.08 * Math.sin((Math.PI * (t - DUSK.bite)) / DUSK.step) * clamp01((t - DUSK.bite) * 4) : 0;
  const meal = swelling(p);
  return {
    route: DUSK_ROUTE,
    headS: DUSK_S0 + 4 * ramp(t, DUSK.bite, 13),
    length: LENGTH,
    width: WIDTH,
    bulges: meal.bulges,
    head,
    yaw,
    lunge: 7 * bump(t, DUSK.bite - 0.08, 0.1, 0.3),
    tongue: flicks(t, [DUSK_FROM + 0.1, 9.95]),
    ...(meal.inside ? { inside: meal.inside } : {}),
    gulp: { p, sway: 0.04 * Math.sin(cycles(19, t)), pose: Math.sin(cycles(22, t)) > 0 ? 'swim1' : 'swim0' },
  };
}

const DUSK_CAM: readonly CamKey[] = [
  { t: DUSK_FROM, x: DUSK_X, y: 470, zoom: 5.2 },
  { t: DUSK.bite - 0.3, x: DUSK_X, y: 470, zoom: 5.6 },
  { t: 11.9, x: DUSK_X, y: 470, zoom: 6.4 },
  { t: 13.15, x: DUSK_X + 2, y: 462, zoom: 6.8 },
];
export const duskCamera = (t: number): Camera => cameraFrom(DUSK_CAM, t);

// ---------------------------------------------------------------- resting, with the croc inside

const REST_ROUTE = route([
  { x: 175, y: 510 }, { x: 205, y: 545 }, { x: 250, y: 552 }, { x: 288, y: 520 }, { x: 292, y: 470 }, { x: 264, y: 430 }, { x: 246, y: 390 },
  { x: 250, y: 350 }, { x: 262, y: 322 },
]);

export const BELLY_FROM_AT = 13.15;

/** The python lying at rest, the croc a lump in its belly (it slides a little further back as the days pass). */
export function restPython(t: number): PythonPose {
  const m = lump(64 + 14 * ramp(t, 15.5, 16.8), CROC_IN * 1.02, BULGE + 2);
  return {
    route: REST_ROUTE,
    headS: REST_ROUTE.length - 1 + 0.8 * Math.sin(cycles(7, t)),
    length: LENGTH,
    width: WIDTH,
    bulges: m.bulges,
    head: 'shut',
    tongue: flicks(t, [13.6, 14.3, 15.9, 17.0]),
    ...(m.inside ? { inside: m.inside } : {}),
  };
}

/** World point at the lump's middle at time t. */
export function lumpAt(t: number): Pt {
  const p = restPython(t);
  return p.route.at(p.headS - p.inside!.at);
}

const BELLY_CAM: readonly CamKey[] = [
  { t: 13.15, x: 292, y: 432, zoom: 3.3 },
  { t: 14.9, x: 300, y: 437, zoom: 4.2 },
];
export const bellyCamera = (t: number): Camera => cameraFrom(BELLY_CAM, t);

const DAYS_CAM: readonly CamKey[] = [
  { t: 14.9, x: 300, y: 437, zoom: 4.2 },
  { t: 15.8, x: 222, y: 420, zoom: 3.3 },
  { t: 17.1, x: 222, y: 420, zoom: 3.2 },
];
export const daysCamera = (t: number): Camera => cameraFrom(DAYS_CAM, t);

// ---------------------------------------------------------------- face to face

const FACE_ROUTE = route([{ x: 258, y: 1000 }, { x: 254, y: 880 }, { x: 250, y: 770 }, { x: 250, y: 700 }, { x: 250, y: 640 }]);
const FACE_S = FACE_ROUTE.length - 4;
export const FACE_SNOUT_Y = 560;

export function facePython(t: number): PythonPose {
  const lean = Math.sin(cycles(9, t));
  return {
    route: FACE_ROUTE,
    headS: FACE_S + 3 * lean,
    length: LENGTH,
    width: WIDTH,
    bulges: [],
    head: 'shut',
    yaw: 0.08 * Math.sin(cycles(5, t)),
    tongue: flicks(t, [17.35, 17.8, 18.2]),
  };
}

export function faceCroc(t: number): { at: Pt; angle: number } {
  return {
    at: { x: 250 + 1.5 * Math.sin(cycles(6, t)), y: FACE_SNOUT_Y - (CROC_LEN * 0.86) / 2 },
    angle: Math.PI / 2 + 0.05 * Math.sin(cycles(4, t)),
  };
}

const FACE_CAM: readonly CamKey[] = [
  { t: 17.08, x: 250, y: 610, zoom: 5.6 },
  { t: 18.5, x: 250, y: 606, zoom: 6.3 },
];
export const faceCamera = (t: number): Camera => cameraFrom(FACE_CAM, t);

// ---------------------------------------------------------------- shake

/** Screen px the camera is jolted by at t: a rumble in the hook, a jolt on the grab, the fight, the gulps. */
export function shakeAt(t: number): Pt {
  // (Screen px; the camera is moved by this much over its zoom.)
  const u = wrap(t);
  const amp = 1.6 + 16 * bump(u, 5.55, 0.04, 0.45) + 20 * struggle(u) + 5 * bump(u, DUSK.bite, 0.05, 0.4) + 3 * bump(u, WHOLE_AT, 0.05, 0.3);
  return { x: amp * Math.sin(cycles(143, t)), y: amp * Math.cos(cycles(127, t) + 1) };
}

/** A camera jolted by the shake at t. */
export const shaken = (cam: Camera, t: number): Camera => {
  const s = shakeAt(t);
  return { ...cam, x: cam.x + s.x / cam.zoom, y: cam.y + s.y / cam.zoom };
};
