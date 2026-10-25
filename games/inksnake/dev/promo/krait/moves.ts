import type { Key } from '../short';
import { clamp01, ramp } from '../short';
import type { Pt } from '../sprites';
import { LONG_EEL_SPAN } from './eel';
import { route, type Route } from './path';
import { CAY, CRACK } from './reef';
import { type Bulge, type Camera, EEL_SCALE, type Gulp, type KraitPose } from './snake';
import { BACK_FROM, curve, cycles, hookClock, OUT_FROM } from './story';

/**
 * The krait's moves on the reef, and the camera: the hook's set (the swallow,
 * then the glide to the crack) and the cay's set (the swallow after the
 * bite, the swim to the cay, the coil). Pure functions of time.
 */

/** The krait's size, board px: 15 body widths long, as the game's krait when it has grown a while. */
export const WIDTH = 20;
export const LENGTH = 300;
/** The moray, swallowed: its length in board px along the throat, and how much wider it makes the body. */
const EEL_IN = LONG_EEL_SPAN * EEL_SCALE;
const BULGE = 7.5;
/** Board px back from the head's centre where the neck leaves the head sprite: a meal only swells the body behind it. */
const NECK = 24;
/** Board px from the head's centre to the lips of the gaping head. */
const LIPS = 11;

/** The place along a route nearest a point. */
function nearestS(r: Route, p: Pt): number {
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

/** A quick bump 0 → 1 → 0 starting at `at`, rising over `up` s and falling over `down` s. */
const bump = (u: number, at: number, up: number, down: number): number => (u < at ? 0 : u < at + up ? Math.sin(((u - at) / up) * Math.PI * 0.5) : Math.max(0, 1 - (u - at - up) / down) ** 2);

/** The tongue flicking out at each of `starts`, for 0.3 s. */
function flicks(u: number, starts: readonly number[]): number {
  for (const s of starts) if (u >= s && u < s + 0.3) return Math.sin(((u - s) / 0.3) * Math.PI);
  return 0;
}

/** The swelling of a meal going down: along the throat while it swallows, then a bulge travelling back. */
function meal(p: number, downSince: number | null, u: number): Bulge[] {
  if (downSince === null) return p > 0 ? [{ from: NECK, to: Math.max(NECK, p * EEL_IN - LIPS + 10), amp: BULGE * clamp01((p * EEL_IN - LIPS - NECK) / 20) }] : [];
  const back = 20 * (u - downSince);
  const len = EEL_IN * (0.85 - 0.15 * clamp01((u - downSince) / 3));
  return [{ from: NECK + back, to: NECK + back + len, amp: BULGE }];
}

/** Camera keys interpolated per part (zoom in log space). */
interface CamKey {
  readonly t: number;
  readonly x: number;
  readonly y: number;
  readonly zoom: number;
}

function cameraFrom(keys: readonly CamKey[], u: number): Camera {
  const part = (f: (k: CamKey) => number): Key[] => keys.map((k) => ({ t: k.t, at: f(k), rate: 0 }));
  return { x: curve(part((k) => k.x), u), y: curve(part((k) => k.y), u), zoom: Math.exp(curve(part((k) => Math.log(k.zoom)), u)) };
}

/** Keeps the camera on the board (960 × 540): its view never runs off the painted reef. */
function onBoard(c: Camera): Camera {
  const hw = 540 / c.zoom;
  const hh = 960 / c.zoom;
  return { ...c, x: Math.min(960 - hw, Math.max(hw, c.x)), y: Math.min(540 - hh, Math.max(hh, c.y)) };
}

// ---------------------------------------------------------------- the hook's set

/** From below the board, up past frame 1's spot, to the crack in coral head A. */
export const HOOK_ROUTE = route([
  { x: 610, y: 720 }, { x: 590, y: 620 }, { x: 552, y: 540 }, { x: 546, y: 460 }, { x: 560, y: 382 }, { x: 570, y: 330 }, { x: 553, y: 280 },
  { x: 548, y: 232 }, { x: 556, y: 194 }, { x: 560, y: 170 }, { x: CRACK.x, y: CRACK.y }, { x: CRACK.x, y: CRACK.y - 30 },
]);
const S0 = nearestS(HOOK_ROUTE, { x: 560, y: 382 });
const S_CRACK = nearestS(HOOK_ROUTE, CRACK);

/** The hook's clock: the strike, the jaws closing on the moray, and the last of its tail gone. */
export const HOOK = { strike: -0.88, grab: -0.77, gone: 1.95, step: 0.36 } as const;

const HOOK_HEAD: readonly Key[] = [
  { t: -1.25, at: S0 },
  { t: HOOK.gone, at: S0 + 2, rate: 0 },
  { t: 3.1, at: S0 + 62, rate: 80 },
  { t: 4.75, at: S_CRACK - 16, rate: 55 },
  { t: 5.3, at: S_CRACK + 2, rate: 18 },
  { t: 5.6, at: S_CRACK + 5, rate: 0 },
];

const HOOK_P: readonly Key[] = [
  { t: -1.25, at: -0.34, rate: 0.6 },
  { t: HOOK.grab, at: 0, rate: 0.62 },
  { t: 0, at: 0.53, rate: 0.3 },
  { t: HOOK.gone, at: 1.0, rate: 0.2 },
];

/** How much of the moray has gone in, on the hook's clock (negative: still swimming at the krait). */
export function hookP(u: number): number {
  if (u < HOOK.grab) return curve(HOOK_P, u);
  return Math.min(1, curve(HOOK_P, ratchet(u, HOOK.grab, HOOK.step)));
}

export function hookKrait(t: number): KraitPose {
  const u = hookClock(t);
  const p = hookP(u);
  const swallowing = u >= HOOK.grab && u < HOOK.gone;
  const head = u < HOOK.strike ? 'shut' : u < HOOK.grab ? 'strike' : u < HOOK.gone ? 'open' : 'shut';
  // The jaws walk over it, left, right, left.
  const yaw = swallowing ? 0.075 * Math.sin((Math.PI * (u - HOOK.grab)) / HOOK.step) * Math.min(1, (u - HOOK.grab) * 4, (HOOK.gone - u) * 4) : 0;
  const gulp: Gulp | undefined = u < HOOK.gone
    ? { p, sway: 0.045 * Math.sin(cycles(19, t)) * (1 - 0.5 * clamp01(p)), pose: p < 0 && Math.sin(cycles(22, t)) > 0 ? 'swim1' : 'swim0' }
    : undefined;
  return {
    route: HOOK_ROUTE,
    headS: curve(HOOK_HEAD, u),
    length: LENGTH,
    width: WIDTH,
    bulges: meal(Math.max(0, p), u >= HOOK.gone ? HOOK.gone : null, u),
    head,
    yaw,
    lunge: 9 * bump(u, HOOK.strike, 0.07, 0.3),
    tongue: flicks(u, [-1.2, 2.55, 3.25, 3.95, 4.6]),
    ...(gulp ? { gulp } : {}),
  };
}

/** The hook's camera: still and close on the jaws, then back over the reef, then down into the crack's dark. */
const HOOK_CAM: readonly CamKey[] = [
  { t: -1.25, x: 560, y: 390, zoom: 9.4 },
  { t: 1.75, x: 560, y: 390, zoom: 9.4 },
  { t: 3.2, x: 560, y: 285, zoom: 3.75 },
  { t: 4.75, x: 560, y: 262, zoom: 3.7 },
  { t: 5.55, x: CRACK.x, y: CRACK.y + 4, zoom: 11 },
];

export const hookCamera = (t: number): Camera => {
  const u = hookClock(t);
  const c = cameraFrom(HOOK_CAM, u);
  // Diving into the crack the view may leave the board's middle: only keep it on the board while it's wide.
  return c.zoom < 6 ? onBoard(c) : c;
};

/** The screen fading to the crack's black as the camera dives in (0..1). */
export const hookDark = (t: number): number => ramp(hookClock(t), 5.05, 5.5);

/** The head's place in the crack's mouth: how far it has gone in (0..1), for drawing the dark over it. */
export const headInCrack = (t: number): number => clamp01((curve(HOOK_HEAD, hookClock(t)) - (S_CRACK - 14)) / 16);

// ---------------------------------------------------------------- the cay's set

const SPIRAL = { c: { x: 816, y: 296 }, r0: 46, r1: 18, from: (135 * Math.PI) / 180, turns: 1.3 } as const;

function spiralKnots(): Pt[] {
  const n = Math.round(SPIRAL.turns * 18);
  return Array.from({ length: n + 1 }, (_, i) => {
    const u = i / n;
    const a = SPIRAL.from - u * SPIRAL.turns * Math.PI * 2;
    const r = SPIRAL.r0 + (SPIRAL.r1 - SPIRAL.r0) * u;
    return { x: SPIRAL.c.x + Math.cos(a) * r, y: SPIRAL.c.y + Math.sin(a) * r };
  });
}

/** From the crack's mouth (the body lying round to the west of it), south-east across the reef, up the cay's beach, and round into a coil. */
export const CAY_ROUTE = route([
  { x: 290, y: 238 }, { x: 352, y: 228 }, { x: 405, y: 232 }, { x: 452, y: 216 }, { x: 500, y: 194 }, { x: 545, y: 182 }, { x: 585, y: 192 },
  { x: 624, y: 220 }, { x: 664, y: 248 }, { x: 706, y: 268 }, { x: 750, y: 300 }, ...spiralKnots(),
]);
const C0 = nearestS(CAY_ROUTE, { x: 585, y: 192 });
const SHORE = nearestS(CAY_ROUTE, { x: 730, y: 284 });
const C_END = CAY_ROUTE.length;

/** The cay's clock: the moray going down, the krait out of the water, coiled and still. */
export const CAY_T = { down: 8.72, gone: 9.6, step: 0.2, shore: 11.95, still: 14.8 } as const;

const CAY_HEAD: readonly Key[] = [
  { t: OUT_FROM, at: C0 - 3 },
  { t: 9.7, at: C0 + 3, rate: 6 },
  { t: 10.45, at: C0 + 40, rate: 68 },
  { t: CAY_T.shore, at: SHORE, rate: 82 },
  { t: 13.6, at: SHORE + 190, rate: 100 },
  { t: CAY_T.still, at: C_END, rate: 0 },
];

const CAY_P: readonly Key[] = [
  { t: OUT_FROM, at: 0.1, rate: 0.12 },
  { t: CAY_T.down, at: 0.16, rate: 0.6 },
  { t: CAY_T.gone, at: 1, rate: 1.1 },
];

export function cayP(t: number): number {
  return Math.min(1, curve(CAY_P, t < CAY_T.down ? t : ratchet(t, CAY_T.down, CAY_T.step)));
}

/** Where along the cay's route the head is at t. */
export const cayHeadS = (t: number): number => curve(CAY_HEAD, Math.min(t, BACK_FROM));

export function cayKrait(t: number): KraitPose {
  const p = cayP(t);
  const swallowing = t < CAY_T.gone;
  const yaw = swallowing ? 0.07 * Math.sin((Math.PI * (t - CAY_T.down)) / CAY_T.step) * clamp01((t - CAY_T.down) * 5) * clamp01((CAY_T.gone - t) * 5) : 0;
  return {
    route: CAY_ROUTE,
    headS: cayHeadS(t),
    length: LENGTH,
    width: WIDTH,
    bulges: meal(p, swallowing ? null : CAY_T.gone, t),
    head: swallowing ? 'open' : 'shut',
    yaw,
    tongue: flicks(t, [10.6, 11.4, 12.3, 13.3, 14.05]),
    ...(swallowing ? { gulp: { p, sway: 0, pose: 'swim0' as const } } : {}),
  };
}

/** The head's board position on the cay's route at t (for bubbles and the breath meter). */
export const cayHeadAt = (t: number): Pt => CAY_ROUTE.at(cayHeadS(t));

/** True once the head is out of the water (past the shore). */
export const onLand = (t: number): boolean => cayHeadS(t) >= SHORE;

/** The cay's camera: close on the swallow, wide on the swim (following the head), then over the cay. */
const CAY_CAM: readonly CamKey[] = (() => {
  const keys: CamKey[] = [];
  const head = (t: number): Pt => cayHeadAt(t);
  const h0 = head(OUT_FROM);
  keys.push({ t: OUT_FROM, x: h0.x - 4, y: h0.y + 38, zoom: 5.4 });
  keys.push({ t: 9.75, x: head(9.75).x, y: head(9.75).y + 34, zoom: 5.6 });
  for (let t = 10.4; t <= 11.95; t += 0.5) keys.push({ t, x: head(t).x + 20, y: 272, zoom: 3.75 });
  keys.push({ t: 13.0, x: CAY.x, y: 328, zoom: 5.4 });
  keys.push({ t: BACK_FROM, x: CAY.x + 2, y: 330, zoom: 5.55 });
  return keys;
})();

export const cayCamera = (t: number): Camera => onBoard(cameraFrom(CAY_CAM, t));

/** The breath meter (0..1): full as it swims off, running low by the shore, filling again on the sand. */
export function breathAt(t: number): number {
  const low = 0.2;
  if (t < CAY_T.shore) return 1 - (1 - low) * ramp(t, 10.2, CAY_T.shore);
  return low + (1 - low) * ramp(t, CAY_T.shore + 0.15, CAY_T.shore + 1.1);
}
