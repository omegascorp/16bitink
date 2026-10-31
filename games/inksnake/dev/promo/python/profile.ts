import { clamp01, ramp } from '../short';
import { VIDEO } from '../short';
import type { Pt } from '../sprites';
import { route } from '../krait/path';
import { HOOK, hookP, nearestS } from './moves';
import { cycles, hookClock, WHOLE_AT } from './story';

/**
 * The hook, seen side on from the mud of the lake shore at ground level: the
 * python's head on the right, facing left, its jaws unhinged and its lower jaw
 * stretched into a thin sleeve of skin round the croc's middle; the croc's
 * hips, both hind legs and its curled tail sticking out of the mouth to the
 * left; behind the head the neck swells with the croc's shoulders. Pure
 * functions of time; profileArt.ts draws it.
 *
 * Art units: the view's own, 5 screen px each at zoom 1 (VIEW), x right, y
 * down, the ground line at GROUND.
 */

export const VIEW = { scale: 6, focus: { x: 104, y: 196 } } as const;
export const GROUND = 208;

/** Where the croc's spine passes through the mouth (the lips' ring). */
export const RIM: Pt = { x: 118, y: 170 };
/** The croc's length along its spine, snout tip (0) to tail tip, art units. */
export const CROC_L = 360;
/** Croc hips (the hind legs' root), as a share of its length. */
export const HIPS_U = 0.52;
/** The python's neck half depth, unstretched, and the skin over the croc. */
export const NECK_HALF = 12;
export const SKIN = 2;
/** The python's skull: its height above the upper lip (profileArt.ts draws it). */
export const SKULL = 15.5;

/** The croc's half depth along its length (u: 0 snout tip .. 1 tail tip): a narrow snout, a deep body, the tail tapering. */
const CROC_KNOTS: readonly (readonly [number, number])[] = [
  [0, 0.8], [0.03, 3], [0.12, 4.5], [0.17, 7.5], [0.2, 9], [0.23, 9.5], [0.28, 19], [0.34, 27], [0.42, 28.5], [0.48, 25], [0.55, 18], [0.62, 13],
  [0.78, 7], [0.92, 3.4], [1, 0.8],
];

export function crocHalf(u: number): number {
  if (u <= 0) return CROC_KNOTS[0]![1];
  for (let i = 1; i < CROC_KNOTS.length; i++) {
    const [u1, h1] = CROC_KNOTS[i]!;
    const [u0, h0] = CROC_KNOTS[i - 1]!;
    if (u <= u1) {
      const s = (u - u0) / (u1 - u0);
      return h0 + (h1 - h0) * (1 - Math.cos(Math.PI * s)) * 0.5;
    }
  }
  return CROC_KNOTS[CROC_KNOTS.length - 1]![1];
}

/**
 * The croc's track, from beyond its tail tip (top left, the tail curled up)
 * round to the hips, through the mouth and on down the python's neck and
 * body, which runs off to the right, turns towards the camera and comes back
 * across the foreground mud and off the left edge. The croc slides along it
 * as it goes in (the body's turn is off screen).
 */
export const TRACK = route([
  { x: 146, y: 82 }, { x: 126, y: 84 }, { x: 103, y: 92 }, { x: 78, y: 98 }, { x: 54, y: 106 }, { x: 36, y: 122 }, { x: 29, y: 142 }, { x: 33, y: 160 },
  { x: 48, y: 170 }, { x: 70, y: 172 }, { x: 95, y: 172 }, { x: RIM.x, y: RIM.y }, { x: 146, y: 172 }, { x: 178, y: 182 }, { x: 208, y: 194 },
  { x: 228, y: 208 }, { x: 224, y: 224 }, { x: 200, y: 231 }, { x: 150, y: 234 }, { x: 100, y: 236 }, { x: 50, y: 233 }, { x: 10, y: 229 },
  { x: -40, y: 231 }, { x: -120, y: 233 },
], 1);
export const S_RIM = nearestS(TRACK, RIM);
/** Where the body leaves the view on the left (the track's end, near enough). */
export const S_BODY_END = TRACK.length - 40;

/** The python's body behind its neck: a coil lying on the mud behind it, rising from behind the neck and off the right edge. */
export const COIL = route([
  { x: 178, y: 196 }, { x: 179, y: 180 }, { x: 192, y: 170 }, { x: 215, y: 168 }, { x: 260, y: 168 },
], 1);

export interface HookShot {
  /** How much of the croc has gone in (its length's share past the lips). */
  readonly p: number;
  /** The tail's swing about the lips (radians, at its far end). */
  readonly sway: number;
  /** The hind legs kicking (-1..1) and folding back along the flanks as the hips reach the lips (0..1). */
  readonly kick: number;
  readonly fold: number;
  /** The head's nod on each step of the jaw-walk (radians, nose up when negative). */
  readonly tilt: number;
  readonly tongue: number;
  readonly zoom: number;
}

/** The tongue flicking out at each of `starts`, for 0.3 s. */
function flicks(u: number, starts: readonly number[]): number {
  for (const s of starts) if (u >= s && u < s + 0.3) return Math.sin(((u - s) / 0.3) * Math.PI);
  return 0;
}

const pulse = (u: number, at: number, up: number, down: number): number =>
  u < at ? 0 : u < at + up ? Math.sin(((u - at) / up) * Math.PI * 0.5) : Math.max(0, 1 - (u - at - up) / down) ** 2;

/** The hook at time t (its own clock: the end of the loop runs into frame 1). */
export function hookShot(t: number): HookShot {
  const u = hookClock(t);
  const p = hookP(u);
  const swallowing = u < HOOK.gone;
  const walk = Math.sin((Math.PI * (u - HOOK.start)) / HOOK.step);
  const settle = clamp01((HOOK.gone - u) * 4);
  return {
    p,
    sway: 0.09 * Math.sin(cycles(19, t)) * (1 - clamp01(p)),
    kick: Math.sin(cycles(23, t)),
    fold: ramp(p, 0.46, 0.54),
    tilt: swallowing ? 0.045 * walk * settle : 0,
    tongue: flicks(u, [2.1, 2.42]),
    zoom: 1 + 0.03 * ramp(u, HOOK.start, HOOK.gone) + 0.05 * pulse(u, WHOLE_AT - 0.05, 0.12, 0.7),
  };
}

/** Rotates q about c by a. */
function turn(q: Pt, c: Pt, a: number): Pt {
  const [cs, sn] = [Math.cos(a), Math.sin(a)];
  return { x: c.x + (q.x - c.x) * cs - (q.y - c.y) * sn, y: c.y + (q.x - c.x) * sn + (q.y - c.y) * cs };
}

/** The croc's spine at `a` along it (0 its snout tip): where it is, outside the mouth swung by the sway. */
export function crocPoint(shot: HookShot, a: number): Pt {
  const s = S_RIM + shot.p * CROC_L - a;
  const q = TRACK.at(s);
  if (s >= S_RIM) return q;
  return turn(q, RIM, shot.sway * clamp01((S_RIM - s) / 140));
}

/** The croc's half depth at `a` along it (0 outside it). */
export const crocHalfAt = (a: number): number => (a < 0 || a > CROC_L ? 0 : crocHalf(a / CROC_L));

/** The gape at the lips: how far above and below the croc's spine the upper lip and the chin are. */
export function gapeOf(shot: HookShot): { readonly top: number; readonly bottom: number } {
  const h = crocHalfAt(shot.p * CROC_L);
  return { top: Math.max(2, h + SKIN * 0.5), bottom: Math.max(10, h + SKIN) };
}

/** The neck's half depth at track place s (from the lips on): the croc inside swells it, smoothly. */
export function neckHalf(shot: HookShot, s: number): number {
  const h = crocHalfAt(S_RIM + shot.p * CROC_L - s) + SKIN;
  return (NECK_HALF ** 6 + h ** 6) ** (1 / 6);
}

/** Art units to screen px, for the shot's zoom and the camera's shake (screen px). */
export function toView(shot: HookShot, shake: Pt): (q: Pt) => Pt {
  const k = VIEW.scale * shot.zoom;
  return (q) => ({ x: (q.x - VIEW.focus.x) * k + VIDEO.width / 2 + shake.x, y: (q.y - VIEW.focus.y) * k + VIDEO.height / 2 + shake.y });
}
