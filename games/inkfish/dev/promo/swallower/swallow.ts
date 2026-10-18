import { bottomAt, C, heightAt, xAt } from '../../../src/art/fish/kit';
import { lerp, smooth } from '../short';
import { LENGTH_RATIO, MACKEREL_DEPTH, mackerelProfile, SWALLOWER as A } from './anatomy';

/**
 * The swallow as geometry: the swallower's hinged jaws, its stretchy
 * stomach, and where every bit of the snake mackerel is while it goes in,
 * folded in half.
 *
 * Coordinates are the swallower's frame ("local px"): origin at the snout,
 * x forwards, y towards its belly, and world px when it is drawn at rest
 * size. The game's drawing is in texture px (fishArt, 256 square, nose to
 * the right); `texToLocal` carries them across.
 *
 * The mackerel is swallowed by its middle, like a folded rope: its head
 * end and its tail end trail out of the mouth side by side and slide in
 * together as the fold goes deeper. `fold` (0 .. ~1) is how far the fold
 * has gone in, as a share of half the mackerel: at 1 both ends are in.
 * Inside, the two halves lie side by side along one track, down the throat
 * and round the stomach in a coil; outside, each half has its own track,
 * curling away in front of the mouth.
 */

export interface Pt {
  readonly x: number;
  readonly y: number;
}

/** Snout to tail base, local px. */
export const BODY_LEN = 290;
/** Local px per texture px. */
export const K = BODY_LEN / (2 * A.hl);
const NOSE_X = xAt(A, 0);
export const texToLocal = (p: Pt): Pt => ({ x: (p.x - NOSE_X) * K, y: (p.y - C) * K });
/** Snout to the tips of the forked tail (fishArt's fork reaches hh × tailSize past the stalk), local px. */
export const SWALLOWER_LEN = (2 * A.hl - 3 + A.hh * A.tailSize) * K;
/** The meal: 4.3 times as long. */
export const MACKEREL_LEN = LENGTH_RATIO * SWALLOWER_LEN;
export const HALF = MACKEREL_LEN / 2;
/** Its half-depth at the widest, local px. */
export const MACK_H = MACKEREL_LEN * MACKEREL_DEPTH;

// ---------------------------------------------------------------- the jaws

/** The jaw hinges far back, behind the eye; the mouth line runs from there to the tip of the snout. */
const HINGE_T = 0.25;
export const TIP_TEX: Pt = { x: NOSE_X + 1, y: C + 0.5 };
export const HINGE_TEX: Pt = { x: xAt(A, HINGE_T), y: C + heightAt(A, HINGE_T) * 0.15 };
/** How far the upper and lower jaws move at the tip, wide open, in half-heights: 3.9 of them, as deep as two snake mackerels side by side. */
const UP_K = 1.3;
const DOWN_K = 2.6;

/** The mouth line's height at texture x, and how far the upper and lower jaws are pushed apart there (texture px). */
export interface Gape {
  readonly line: number;
  readonly up: number;
  readonly down: number;
}

export function gapeAt(jaw: number, x: number): Gape | null {
  if (jaw <= 0 || x <= HINGE_TEX.x) return null;
  const f = Math.min(1, (x - HINGE_TEX.x) / (TIP_TEX.x - HINGE_TEX.x));
  // Tight at the corner, opening fast, near its widest well before the tip.
  const ease = Math.sin((Math.PI / 2) * f) ** 0.85;
  return { line: HINGE_TEX.y + (TIP_TEX.y - HINGE_TEX.y) * f, up: UP_K * A.hh * jaw * ease, down: DOWN_K * A.hh * jaw * ease };
}

export interface Lips {
  /** Upper and lower lip, local px, from the corner of the mouth to the tip. */
  readonly upper: readonly Pt[];
  readonly lower: readonly Pt[];
  /** The middle of the opening at the tip: where the meal goes in. */
  readonly gate: Pt;
  /** The opening's height at the tip, local px. */
  readonly height: number;
}

export function lipsAt(jaw: number): Lips {
  const upper: Pt[] = [];
  const lower: Pt[] = [];
  for (let i = 0; i <= 16; i++) {
    const x = HINGE_TEX.x + ((TIP_TEX.x - HINGE_TEX.x) * i) / 16;
    const g = gapeAt(jaw, x + 1e-6) ?? { line: HINGE_TEX.y, up: 0, down: 0 };
    upper.push(texToLocal({ x, y: g.line - g.up }));
    lower.push(texToLocal({ x, y: g.line + g.down }));
  }
  const top = upper[upper.length - 1]!;
  const bottom = lower[lower.length - 1]!;
  return { upper, lower, gate: { x: (top.x + bottom.x) / 2, y: (top.y + bottom.y) / 2 }, height: bottom.y - top.y };
}

// ---------------------------------------------------------------- the stomach

/** The stomach hangs from the belly between these points along the body. */
const SAC_FROM = 0.27;
const SAC_TO = 0.68;
const SAC_FRONT = texToLocal({ x: xAt(A, SAC_FROM), y: bottomAt(A, SAC_FROM) - 1.5 });
const SAC_BACK = texToLocal({ x: xAt(A, SAC_TO), y: bottomAt(A, SAC_TO) - 1.5 });
/** Its bulge below the belly, local px: slack, and stretched round the whole meal. */
const BULGE_SLACK = 10;
const BULGE_FULL = 300;
const ARC_STEPS = 56;

export interface Sac {
  /** The outline from the front of the belly, round the bulge, to the back. */
  readonly outline: readonly Pt[];
  readonly cx: number;
  readonly cy: number;
  readonly r: number;
  readonly front: Pt;
  readonly back: Pt;
}

/** The stomach, `fill` 0 slack .. 1 round the whole meal. */
export function sacAt(fill: number): Sac {
  const bulge = BULGE_SLACK + (BULGE_FULL - BULGE_SLACK) * Math.max(0, fill) ** 0.85;
  const a = SAC_FRONT;
  const b = SAC_BACK;
  const chord = Math.hypot(b.x - a.x, b.y - a.y);
  const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  let n = { x: -(b.y - a.y) / chord, y: (b.x - a.x) / chord };
  if (n.y < 0) n = { x: -n.x, y: -n.y };
  const r = (chord * chord) / (8 * bulge) + bulge / 2;
  const cx = mid.x + n.x * (bulge - r);
  const cy = mid.y + n.y * (bulge - r);
  const aA = Math.atan2(a.y - cy, a.x - cx);
  const aB = Math.atan2(b.y - cy, b.x - cx);
  const turn = (d: number): number => ((d % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  // From the front, clockwise on screen (down the front, round the bottom, up the back).
  const sweep = turn(aB - aA);
  const outline = Array.from({ length: ARC_STEPS + 1 }, (_, i) => {
    const ang = aA + (sweep * i) / ARC_STEPS;
    return { x: cx + Math.cos(ang) * r, y: cy + Math.sin(ang) * r };
  });
  return { outline, cx, cy, r, front: a, back: b };
}

// ---------------------------------------------------------------- tracks

/** A polyline with its running length, to walk along. */
interface Track {
  readonly pts: readonly Pt[];
  readonly len: readonly number[];
}

function trackOf(pts: readonly Pt[]): Track {
  const len = [0];
  for (let i = 1; i < pts.length; i++) len.push(len[i - 1]! + Math.hypot(pts[i]!.x - pts[i - 1]!.x, pts[i]!.y - pts[i - 1]!.y));
  return { pts, len };
}

/** The point `d` along a track, and its unit tangent; past either end it carries straight on. */
function walk(tr: Track, d: number): { readonly p: Pt; readonly t: Pt } {
  const n = tr.pts.length - 1;
  let i = 0;
  if (d >= tr.len[n]!) i = n - 1;
  else if (d > 0) {
    let lo = 0;
    let hi = n;
    while (hi - lo > 1) {
      const m = (lo + hi) >> 1;
      if (tr.len[m]! <= d) lo = m;
      else hi = m;
    }
    i = lo;
  }
  const a = tr.pts[i]!;
  const b = tr.pts[i + 1]!;
  const seg = tr.len[i + 1]! - tr.len[i]! || 1;
  const t = { x: (b.x - a.x) / seg, y: (b.y - a.y) / seg };
  const u = d - tr.len[i]!;
  return { p: { x: a.x + t.x * u, y: a.y + t.y * u }, t };
}

const cubic = (p0: Pt, p1: Pt, p2: Pt, p3: Pt, n: number): Pt[] =>
  Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n;
    const u = 1 - t;
    return {
      x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
      y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y,
    };
  });

/** Where the two halves leave the mouth, curling away in front of it: the head end up, the tail end down (relative to their start). */
const OUT_HEAD = [{ x: 0, y: 0 }, { x: 190, y: -20 }, { x: 310, y: -180 }, { x: 190, y: -360 }] as const;
const OUT_TAIL = [{ x: 0, y: 0 }, { x: 190, y: 30 }, { x: 290, y: 150 }, { x: 260, y: 340 }] as const;

function outTrack(start: Pt, shape: readonly Pt[]): Track {
  const [p0, p1, p2, p3] = shape.map((p) => ({ x: start.x + p.x, y: start.y + p.y }));
  return trackOf(cubic(p0!, p1!, p2!, p3!, 90));
}

/** The squeeze on the mackerel's depth along its track (local px past the gate; negative is outside): squashed by the jaws, thinner still in the stomach. */
const GATE_SQUEEZE = 0.7;
const IN_SQUEEZE = 0.42;
export function squeezeAt(x: number): number {
  return x < 0 ? lerp(GATE_SQUEEZE, 1, smooth(-x / 160)) : lerp(GATE_SQUEEZE, IN_SQUEEZE, smooth(x / 80));
}

/** How far apart the two halves lie: touching at the gate, and in the stomach. */
const W_GATE = MACK_H * GATE_SQUEEZE * 1.02;
const W_IN = MACK_H * IN_SQUEEZE * 1.08;
const widthAt = (x: number): number => lerp(W_GATE, W_IN, smooth(x / 80));
/** Each half's share of the U-turn at the fold. */
const CAP = (Math.PI / 2) * W_IN;

/**
 * The track inside: from the gate back down the throat into the stomach,
 * then round it in a coil that tightens, long enough for `need` px.
 */
function innerTrack(gate: Pt, sac: Sac, need: number): Track {
  const throat = texToLocal({ x: xAt(A, 0.3), y: C + heightAt(A, 0.3) * 0.15 });
  const start = Math.atan2(sac.front.y - sac.cy, sac.front.x - sac.cx) + 0.35;
  const r0 = sac.r * 0.7;
  const entry = { x: sac.cx + Math.cos(start) * r0, y: sac.cy + Math.sin(start) * r0 };
  const pts: Pt[] = cubic(gate, { x: gate.x - 40, y: gate.y }, throat, entry, 16);
  let total = trackOf(pts).len[pts.length - 1]!;
  const step = 0.06;
  for (let a = step; a < Math.PI * 8 && total < need + 60; a += step) {
    const r = Math.max(sac.r * 0.2, r0 - (a / (2 * Math.PI)) * sac.r * 0.3);
    const p = { x: sac.cx + Math.cos(start + a) * r, y: sac.cy + Math.sin(start + a) * r };
    const q = pts[pts.length - 1]!;
    total += Math.hypot(p.x - q.x, p.y - q.y);
    pts.push(p);
  }
  return trackOf(pts);
}

// ---------------------------------------------------------------- the mackerel

/** Samples along the mackerel, snout to tail tips. */
export const SPINE_N = 260;

export interface SpineSample {
  /** 0 snout .. 1 tail tips. */
  readonly s: number;
  readonly x: number;
  readonly y: number;
  /** Half-depth here, local px. */
  readonly h: number;
  /** How far past the gate it is along its track, local px (negative: still outside). */
  readonly depth: number;
}

export interface Wriggle {
  /** 0 still .. 1 thrashing. */
  readonly amount: number;
  /** Phase of the thrash, radians. */
  readonly phase: number;
}

export interface MealPose {
  readonly fold: number;
  readonly jaw: number;
  readonly fill: number;
  readonly wriggle: Wriggle;
}

/** The whole mackerel at a moment: every sample of its spine, and the inner track (for the "coiled" tracer). */
export function mackerelAt(m: MealPose): { readonly spine: readonly SpineSample[]; readonly coil: readonly Pt[] } {
  const lips = lipsAt(m.jaw);
  const gate = lips.gate;
  const sac = sacAt(m.fill);
  const depthOfFold = m.fold * HALF;
  const inner = innerTrack(gate, sac, depthOfFold + CAP);
  const head = outTrack({ x: gate.x, y: gate.y - W_GATE }, OUT_HEAD);
  const tail = outTrack({ x: gate.x, y: gate.y + W_GATE }, OUT_TAIL);
  const tip = walk(inner, Math.max(0, depthOfFold));
  const spine = Array.from({ length: SPINE_N + 1 }, (_, i): SpineSample => {
    const s = i / SPINE_N;
    // Distance from the fold along the fish, and which half (+1 the head end, above, -1 the tail end).
    const d = Math.abs(s - 0.5) * MACKEREL_LEN;
    const side = s < 0.5 ? 1 : -1;
    const h = MACK_H * mackerelProfile(s);
    if (d < CAP && depthOfFold > 0) {
      // Round the U-turn at the fold.
      const phi = d / W_IN;
      const n = { x: -tip.t.y, y: tip.t.x };
      return {
        s, h: h * squeezeAt(depthOfFold),
        x: tip.p.x + W_IN * (Math.sin(phi) * side * n.x + Math.cos(phi) * tip.t.x),
        y: tip.p.y + W_IN * (Math.sin(phi) * side * n.y + Math.cos(phi) * tip.t.y),
        depth: depthOfFold,
      };
    }
    const depth = depthOfFold - Math.max(0, d - CAP);
    if (depth >= 0) {
      const w = walk(inner, depth);
      const n = { x: -w.t.y, y: w.t.x };
      const off = widthAt(depth) * side;
      return { s, h: h * squeezeAt(depth), x: w.p.x + n.x * off, y: w.p.y + n.y * off, depth };
    }
    // Outside, curling away; the far ends thrash.
    const out = -depth;
    const w = walk(side > 0 ? head : tail, out);
    const n = { x: -w.t.y, y: w.t.x };
    const swing = m.wriggle.amount * 26 * (out / 520) ** 1.4 * Math.sin(m.wriggle.phase - out / 110 + (side > 0 ? 0 : 1.9));
    return { s, h: h * squeezeAt(depth), x: w.p.x + n.x * swing, y: w.p.y + n.y * swing, depth };
  });
  const coil = Array.from({ length: 41 }, (_, i) => walk(inner, (Math.max(0, depthOfFold) * i) / 40).p);
  return { spine, coil };
}
