import { clamp01, lerp, ramp, VIDEO } from '../short';
import { taper } from '../sprites';
import {
  agamaInMouth, BODY_LEN, bodyPoint, coreAt, eagleAt, headOf, inMouth, KB, LOOP_S, T_NEW, W, type Agama, type Eagle, type HeadAt, type Pt,
} from './story';

/**
 * The last hunt's snake carried off (0 – T_NEW): the eagle on top, the snake
 * held under it in its feet, by the neck just behind the head. The neck between
 * the feet and the head beyond them are held out straight (the snake fights,
 * its head up, the agama still in its jaws); the rest is a hanging chain,
 * simulated from frame 1 (the snake lying on the rock), peeling off the
 * rock, dangling below the bird and swinging behind it.
 *
 * World: x, y on the rock (screen px at ground level), z up. The camera looks
 * straight down from CAMERA_Z over the frame's centre, so a thing z up is
 * drawn persp(z) times bigger and that much further from the centre.
 */

const CAMERA_Z = 4000;
const CENTRE: Pt = { x: VIDEO.width / 2, y: VIDEO.height / 2 };
export const persp = (z: number): number => CAMERA_Z / (CAMERA_Z - z);
const heightOf = (scale: number): number => CAMERA_Z * (1 - 1 / scale);

export interface P3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}
const toScreen = (p: P3): Pt => {
  const k = persp(p.z);
  return { x: CENTRE.x + (p.x - CENTRE.x) * k, y: CENTRE.y + (p.y - CENTRE.y) * k };
};
const toWorld = (s: Pt, z: number): P3 => {
  const k = persp(z);
  return { x: CENTRE.x + (s.x - CENTRE.x) / k, y: CENTRE.y + (s.y - CENTRE.y) / k, z };
};

// ---------------------------------------------------------------- the feet

/** A point of the eagle drawing (hawk units: mountainsCrittersEagle.ts draws at 0.8, shifted 2 forward) on screen. */
export function eaglePoint(e: Eagle, hx: number, hy: number): Pt {
  const k = 0.8 * KB * e.scale;
  const [bx, by] = [(hx + 2) * k, hy * k];
  const [c, s] = [Math.cos(e.heading), Math.sin(e.heading)];
  return { x: e.x + c * bx - s * by, y: e.y + s * bx + c * by };
}

/** The feet (hawk units): thrown forward in the stoop (the drawing's own), then drawn back under the chest to carry, both on the snake's neck, the front one nearer its head. */
const STOOP_FEET = { a: { x: 31, y: -8 }, b: { x: 31, y: 8 } } as const;
const CARRY_FEET = { a: { x: 18.5, y: -13 }, b: { x: 12, y: -10.5 } } as const;
/** Where the legs go in under the body: the stoop's, then (carrying) the nearest edge of the chest, so only the short bare tarsus shows. */
const STOOP_HIPS = { a: { x: 18.4, y: -4.8 }, b: { x: 18.4, y: 4.8 } } as const;
const CARRY_HIPS = { a: { x: 11, y: -6 }, b: { x: 8, y: -5 } } as const;
export const T_GRIP = 0.12;
const T_TUCKED = 0.7;
const tuck = (t: number): number => ramp(t, T_GRIP, T_TUCKED);
/** How far the feet hang below the body. */
const LEG_DROP = 150;

const lerpPt = (a: Pt, b: Pt, u: number): Pt => ({ x: lerp(a.x, b.x, u), y: lerp(a.y, b.y, u) });

export interface Foot {
  /** The foot on screen, where the toes meet. */
  readonly at: Pt;
  /** The leg's root under the body, on screen. */
  readonly hip: Pt;
  /** Screen px per hawk unit. */
  readonly scale: number;
}

const feetHeight = (t: number, e: Eagle): number => Math.max(0, heightOf(e.scale) - LEG_DROP * ramp(t, 0, 0.5));

function feetOf(t: number, e: Eagle): { a: Foot; b: Foot } {
  const u = tuck(t);
  const k = 0.8 * KB * persp(feetHeight(t, e));
  const foot = (key: 'a' | 'b'): Foot => {
    const f = lerpPt(STOOP_FEET[key], CARRY_FEET[key], u);
    const h = lerpPt(STOOP_HIPS[key], CARRY_HIPS[key], u);
    return { at: eaglePoint(e, f.x, f.y), hip: eaglePoint(e, h.x, h.y), scale: k };
  };
  return { a: foot('a'), b: foot('b') };
}

// ---------------------------------------------------------------- the snake on the rock at frame 1

const STEP_D = 8;
const N = Math.round(BODY_LEN / STEP_D);
const CORE_END = coreAt(LOOP_S);
const GROUND: readonly Pt[] = Array.from({ length: N + 1 }, (_, i) => bodyPoint(CORE_END, i * STEP_D));
const REST: readonly number[] = GROUND.slice(0, -1).map((p, i) => Math.hypot(GROUND[i + 1]!.x - p.x, GROUND[i + 1]!.y - p.y));
/** Arc length from the head along the body on the rock (the pattern stays on its scales as the body is lifted). */
const ARC: readonly number[] = GROUND.reduce<number[]>((acc, _p, i) => [...acc, i === 0 ? 0 : acc[i - 1]! + REST[i - 1]!], []);
const GROUND_HEADING = headOf(CORE_END).heading;

/** The body point nearest a screen point, on the rock at frame 1. */
function nearestIndex(p: Pt): number {
  let best = 0;
  for (let i = 1; i <= N; i++) if (Math.hypot(GROUND[i]!.x - p.x, GROUND[i]!.y - p.y) < Math.hypot(GROUND[best]!.x - p.x, GROUND[best]!.y - p.y)) best = i;
  return best;
}

const E0 = eagleAt(0)!;
const FEET0 = feetOf(0, E0);
/** The body points under the front foot and the back one. */
export const IA = nearestIndex(FEET0.a.at);
/** The back foot is as far down the neck as the tucked feet are apart, so the neck between them is never stretched or squashed. */
const CARRY_GAP = Math.hypot(CARRY_FEET.a.x - CARRY_FEET.b.x, CARRY_FEET.a.y - CARRY_FEET.b.y) * 0.8 * KB;
export const IB = IA + Math.max(3, Math.round(CARRY_GAP / STEP_D));
/** At frame 1 the feet straddle the spine; the pins start on it and close onto the feet as they tuck. */
const OFFSET0 = { a: { x: GROUND[IA]!.x - FEET0.a.at.x, y: GROUND[IA]!.y - FEET0.a.at.y }, b: { x: GROUND[IB]!.x - FEET0.b.at.x, y: GROUND[IB]!.y - FEET0.b.at.y } } as const;

function pinsAt(t: number): { a: P3; b: P3 } {
  const e = eagleAt(Math.min(t, 3.199))!;
  const feet = feetOf(t, e);
  const z = feetHeight(t, e);
  const turn = e.heading - E0.heading;
  const keep = (1 - tuck(t)) * e.scale;
  const [c, s] = [Math.cos(turn), Math.sin(turn)];
  const pin = (f: Foot, o: Pt): P3 => toWorld({ x: f.at.x + (c * o.x - s * o.y) * keep, y: f.at.y + (s * o.x + c * o.y) * keep }, z);
  return { a: pin(feet.a, OFFSET0.a), b: pin(feet.b, OFFSET0.b) };
}

/** 0..1: the head and neck going from lying on the rock to held out from the feet. */
const heldOut = (t: number): number => ramp(t, 0, 0.45);

/** The kinematic front: the head end (i < IA) straight out from the front foot, the neck between the feet (IA..IB). */
function frontPoint(i: number, t: number, pins: { a: P3; b: P3 }): P3 {
  const u = heldOut(t);
  const { a, b } = pins;
  if (i >= IA) {
    const v = (i - IA) / (IB - IA);
    const base = { x: lerp(a.x, b.x, v), y: lerp(a.y, b.y, v), z: lerp(a.z, b.z, v) };
    const g0 = GROUND[IA]!;
    const g1 = GROUND[IB]!;
    const g = GROUND[i]!;
    return { x: base.x + (g.x - lerp(g0.x, g1.x, v)) * (1 - u), y: base.y + (g.y - lerp(g0.y, g1.y, v)) * (1 - u), z: base.z };
  }
  const len = Math.hypot(a.x - b.x, a.y - b.y) || 1;
  const writhe = 0.24 * Math.sin(t * 4.6) * ramp(t, 0.3, 0.9);
  const [dx, dy] = [(a.x - b.x) / len, (a.y - b.y) / len];
  const [c, s] = [Math.cos(writhe), Math.sin(writhe)];
  const dir = { x: c * dx - s * dy, y: s * dx + c * dy };
  const out = ARC[IA]! - ARC[i]!;
  const held = { x: a.x + dir.x * out, y: a.y + dir.y * out };
  const g = GROUND[i]!;
  // On the rock it lies where it lay; held out, it is as high as the feet.
  const onRock = { x: g.x + (a.x - GROUND[IA]!.x), y: g.y + (a.y - GROUND[IA]!.y) };
  return { x: lerp(onRock.x, held.x, u), y: lerp(onRock.y, held.y, u), z: a.z };
}

// ---------------------------------------------------------------- the hanging body, simulated

const DT = 1 / 240;
const SIM_END = T_NEW + 0.05;
const STEPS = Math.ceil(SIM_END / DT);
const GRAVITY = 3000;
/** Air drag: strong, so the body streams back behind the bird as it gathers speed (the eye reads that better than a snake hanging straight down, hidden under it). */
const DRAG = 9;
/** The snake fights: waves run down its hanging body, side to side. */
const WRITHE = { a: 11000, hz: 1.3, k: 0.28 } as const;
const ITERATIONS = 14;
const FREE = N - IB;

/** Positions of the hanging points IB..N, x y z per point, per step. */
const TRACK: Float64Array = simulate();

function simulate(): Float64Array {
  const n = FREE + 1;
  const out = new Float64Array((STEPS + 1) * n * 3);
  const cur = new Float64Array(n * 3);
  const prev = new Float64Array(n * 3);
  for (let j = 0; j < n; j++) {
    const g = GROUND[IB + j]!;
    cur.set([g.x, g.y, 0], j * 3);
    prev.set([g.x, g.y, 0], j * 3);
  }
  out.set(cur, 0);
  for (let step = 1; step <= STEPS; step++) {
    const t = step * DT;
    const pins = pinsAt(t);
    const before = frontPoint(IB - 1, t, pins);
    integrate(cur, prev, n, t);
    for (let it = 0; it < ITERATIONS; it++) {
      cur.set([pins.b.x, pins.b.y, pins.b.z], 0);
      relax(cur, n, before);
    }
    cur.set([pins.b.x, pins.b.y, pins.b.z], 0);
    rest(cur, prev, n);
    out.set(cur, step * n * 3);
  }
  return out;
}

function integrate(cur: Float64Array, prev: Float64Array, n: number, t: number): void {
  const keep = 1 - DRAG * DT;
  const fight = ramp(t, 0.2, 0.8);
  for (let j = 1; j < n; j++) {
    const [j0, j1] = [Math.max(0, j - 1), Math.min(n - 1, j + 1)];
    const [ax, ay] = [cur[j1 * 3]! - cur[j0 * 3]!, cur[j1 * 3 + 1]! - cur[j0 * 3 + 1]!];
    const l = Math.hypot(ax, ay) || 1;
    const side = fight * WRITHE.a * Math.sin(2 * Math.PI * WRITHE.hz * t - j * WRITHE.k) * Math.min(1, j / 6);
    const push = [(-ay / l) * side, (ax / l) * side, -GRAVITY];
    for (let k = 0; k < 3; k++) {
      const i = j * 3 + k;
      const v = (cur[i]! - prev[i]!) * keep;
      prev[i] = cur[i]!;
      cur[i] = cur[i]! + v + push[k]! * DT * DT;
    }
  }
}

/** Keeps each link its length (the pinned first point fixed), stops it folding sharply, and keeps it off-ground no lower than the rock. */
function relax(cur: Float64Array, n: number, before: P3): void {
  const at = (j: number): P3 => (j < 0 ? before : { x: cur[j * 3]!, y: cur[j * 3 + 1]!, z: cur[j * 3 + 2]! });
  const pull = (j0: number, j1: number, len: number, onlyApart: boolean): void => {
    const [p, q] = [at(j0), at(j1)];
    const d = Math.hypot(q.x - p.x, q.y - p.y, q.z - p.z) || 1e-6;
    if (onlyApart && d >= len) return;
    const w0 = j0 <= 0 ? 0 : 1;
    const w1 = 1;
    const f = (d - len) / d / (w0 + w1);
    const move = (j: number, w: number, sign: number): void => {
      if (w === 0) return;
      cur[j * 3] = cur[j * 3]! + sign * w * f * (q.x - p.x);
      cur[j * 3 + 1] = cur[j * 3 + 1]! + sign * w * f * (q.y - p.y);
      cur[j * 3 + 2] = cur[j * 3 + 2]! + sign * w * f * (q.z - p.z);
    };
    move(j0, w0, 1);
    move(j1, w1, -1);
  };
  for (let j = 0; j + 1 < n; j++) pull(j, j + 1, REST[IB + j]!, false);
  for (let j = -1; j + 2 < n; j++) pull(j, j + 2, 0.86 * (REST[IB + j]! + REST[IB + j + 1]!), true);
  for (let j = 1; j < n; j++) cur[j * 3 + 2] = Math.max(0, cur[j * 3 + 2]!);
}

/** On the rock, a point grips: it slides only a little. */
function rest(cur: Float64Array, prev: Float64Array, n: number): void {
  for (let j = 1; j < n; j++) {
    if (cur[j * 3 + 2]! > 0.5) continue;
    for (const k of [0, 1]) prev[j * 3 + k] = cur[j * 3 + k]! - (cur[j * 3 + k]! - prev[j * 3 + k]!) * 0.7;
  }
}

function hanging(t: number, j: number): P3 {
  const f = clamp01(t / SIM_END) * STEPS;
  const s0 = Math.min(STEPS - 1, Math.floor(f));
  const u = f - s0;
  const n = FREE + 1;
  const p = (s: number, k: number): number => TRACK[(s * n + j) * 3 + k]!;
  return { x: lerp(p(s0, 0), p(s0 + 1, 0), u), y: lerp(p(s0, 1), p(s0 + 1, 1), u), z: lerp(p(s0, 2), p(s0 + 1, 2), u) };
}

// ---------------------------------------------------------------- what is drawn

export interface Carried {
  /** Screen spine from the head back, the width there, the pattern's strip units there, how high (for the shadow). */
  readonly spine: readonly Pt[];
  readonly widths: readonly number[];
  readonly arc: readonly number[];
  readonly heights: readonly number[];
  readonly head: HeadAt;
  readonly agama: Agama;
  readonly feet: { readonly a: Foot; readonly b: Foot } | null;
}

const angleLerp = (a: number, b: number, u: number): number => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * u;

/** The carried snake at `t` in [0, T_NEW): at 0 exactly the snake of the loop's last frame. */
export function carriedAt(t: number): Carried {
  const pins = pinsAt(t);
  const world = Array.from({ length: N + 1 }, (_, i) => (i < IB ? frontPoint(i, t, pins) : hanging(t, i - IB)));
  const spine = world.map(toScreen);
  const heights = world.map((p) => p.z);
  const widths = world.map((p, i) => W * taper((i * STEP_D) / BODY_LEN, 0.62, 0.12) * persp(p.z));
  const [h0, h2] = [spine[0]!, spine[2]!];
  const heading = angleLerp(GROUND_HEADING, Math.atan2(h0.y - h2.y, h0.x - h2.x), heldOut(t));
  const head: HeadAt = { x: h0.x, y: h0.y, heading, scale: persp(heights[0]!) };
  const e = t < 3.2 ? eagleAt(t) : null;
  return {
    spine,
    widths,
    arc: ARC,
    heights,
    head,
    agama: agamaInMouth(head, LOOP_S, inMouth(LOOP_S)),
    feet: e && t >= T_GRIP ? feetOf(t, e) : null,
  };
}

/** How high the shadow-casting is, as the eagle's `alt` (px the shadow slides off). */
export const shadowAlt = (z: number): number => 1000 * (persp(z) - 1);

/** Is the carried snake off the screen (with a margin)? */
export function offScreen(c: Carried, margin = 60): boolean {
  return c.spine.every((p, i) => {
    const r = c.widths[i]! / 2 + margin;
    return p.x < -r || p.x > VIDEO.width + r || p.y < -r || p.y > VIDEO.height + r;
  });
}

