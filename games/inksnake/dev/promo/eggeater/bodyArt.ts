import { type Draw } from '../../../src/art/kit';
import { PAPER_FILL } from '../../../src/art/palette';
import { type Pt } from '../../../src/art/pen';
import { EGG_PAINT as E } from '../../../src/art/chapters/savannaSnakePaint';
import { at, type BodyModel } from './model';
import { facing, FINE, type Ground, groundAt, surfacePt } from './path';
import { BODY_LEN, HINGE_S } from './story';

/**
 * The egg-eater's skin, painted on its round body (path.ts) in the game's
 * egg-eater paint box (src/art/chapters/savannaSnakePaint.ts): a dusty
 * grey-brown, lit from the upper left, with the form turned by washes from
 * light to shade; dark rhomboid blotches down the back edged pale, narrow
 * bars low on the flank, a dark V on the nape, a pale yellowish belly band;
 * keeled scales in a grid that follows the round surface. Where the skin is
 * stretched (over an egg) the scales stay the same size, so they pull apart
 * into small separate diamonds and the thin, pale pinkish-grey skin shows
 * between them.
 */

/** The line colour: a warm dark brown, as the game's savanna art. */
export const LINE = '#2a1c14';
export const SKIN_PALE = '#d6bfb6';
export const BELLY = '#e6d79e';

type Rgb = readonly [number, number, number];
const rgb = (h: string): Rgb => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mixc = (a: Rgb, b: Rgb, t: number): Rgb => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const css = (c: Rgb): string => `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`;

const SKIN = rgb('#958470');
const SKIN_BACK = rgb('#7f7364');
const PALE = rgb(SKIN_PALE);
const BELLY_C = rgb(BELLY);
const MARK = rgb(E.mark);
const DARK = rgb('#251a13');
const DARK_PALE = rgb('#5e4748');
const LIGHT = rgb('#fff6e4');
const BOUNCE = rgb('#c7a46c');

/** The light: from the upper left and a little in front (X right, U up, Z towards the viewer). */
const L = (() => {
  const v = [-0.5, 0.82, 0.55];
  const l = Math.hypot(v[0]!, v[1]!, v[2]!);
  return [v[0]! / l, v[1]! / l, v[2]! / l] as const;
})();

export interface Slice {
  readonly s: number;
  readonly g: Ground;
  /** Radius, the axis's height, and how fast each changes along s. */
  readonly r: number;
  readonly c: number;
  readonly dr: number;
  readonly dc: number;
  /** The angle round the body that faces the camera. */
  readonly phi: number;
  readonly st: number;
  readonly sig: number;
}

export function sliceAt(m: BodyModel, s: number, grow = 0): Slice {
  const g = groundAt(s);
  const t0 = at(m.top, s - 0.25);
  const t1 = at(m.top, s + 0.25);
  const b0 = at(m.bot, s - 0.25);
  const b1 = at(m.bot, s + 0.25);
  const top = at(m.top, s);
  const bot = at(m.bot, s);
  const p = g.p;
  return {
    s, g, r: (top - bot) / 2 + grow, c: (top + bot) / 2,
    dr: ((t1 - b1) - (t0 - b0)) / 2 / 0.5 / p, dc: ((t1 + b1) - (t0 + b0)) / 2 / 0.5 / p,
    phi: facing(g), st: at(m.st, s), sig: at(m.sig, s),
  };
}

/** The angle at v (0..1) across the visible half. */
export const thOf = (sl: Slice, v: number): number => sl.phi - Math.PI / 2 + v * Math.PI;
/** The point on the body at angle th. */
export const onBody = (sl: Slice, th: number): Pt => surfacePt(sl.g, sl.c, sl.r, th);
/** The point on the body at v across its visible half. */
export const across = (sl: Slice, v: number): Pt => onBody(sl, thOf(sl, v));

/** The place along the body where the skin coordinate is `sig`. */
export function sOfSig(m: BodyModel, sig: number): number {
  const tab = m.sig;
  let lo = 0;
  let hi = tab.length - 1;
  if (sig <= tab[0]!) return 0;
  if (sig >= tab[hi]!) return hi / FINE;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (tab[mid]! < sig) lo = mid;
    else hi = mid;
  }
  const u = (sig - tab[lo]!) / (tab[hi]! - tab[lo]! || 1);
  return (lo + u) / FINE;
}

export type Edge = (s: number) => number;
const ZERO: Edge = () => 0;
const ONE: Edge = () => 1;
const FLAT: Edge = () => 0;

/** Places from s0 to s1, every `step` (both ends included). */
export function along(s0: number, s1: number, step: number): number[] {
  const out: number[] = [];
  const n = Math.max(1, Math.ceil(Math.abs(s1 - s0) / step));
  for (let i = 0; i <= n; i++) out.push(s0 + ((s1 - s0) * i) / n);
  return out;
}

/** Where a band starts at each v across it (a slanted ring), when it does not start straight across at s0. */
export type Start = (v: number) => number;

/** The outline of the band of the body between v = from(s) and v = to(s), s0 to s1, ends included (they bow as rings do). */
export function bandPoly(m: BodyModel, s0: number, s1: number, from: Edge = ZERO, to: Edge = ONE, step = 0.5, start?: Start, grow: Edge = FLAT): Pt[] {
  const ss = along(s0, s1, step);
  const sl = ss.map((s) => sliceAt(m, s, grow(s)));
  const ring = (k: Slice, a: number, b: number): Pt[] => along(a, b, 0.08).map((v) => across(k, v));
  const first = sl[0]!;
  const last = sl[sl.length - 1]!;
  const head = start
    ? along(to(first.s), from(first.s), 0.04).map((v) => across(sliceAt(m, start(v), grow(start(v))), v))
    : ring(first, to(first.s), from(first.s)).slice(1, -1);
  return [
    ...sl.map((k) => across(k, from(k.s))),
    ...ring(last, from(last.s), to(last.s)).slice(1, -1),
    ...sl.map((k) => across(k, to(k.s))).reverse(),
    ...head,
  ];
}

/** The surface normal at (slice, th), in (X, U, Z). */
function normal(sl: Slice, th: number): readonly [number, number, number] {
  const k = sl.dr + sl.dc * Math.cos(th);
  const { dx, dz } = sl.g;
  const sn = Math.sin(th);
  const n = [sn * -dz - k * dx, Math.cos(th), sn * dx - k * dz];
  const l = Math.hypot(n[0]!, n[1]!, n[2]!) || 1;
  return [n[0]! / l, n[1]! / l, n[2]! / l];
}

/** How lit the surface is at (slice, th), 0 (deep shade) .. 1 (full light), and how much it faces down. */
function lightAt(sl: Slice, th: number): { lit: number; down: number } {
  const n = normal(sl, th);
  const lum = n[0] * L[0] + n[1] * L[1] + n[2] * L[2];
  return { lit: Math.max(0, Math.min(1, 0.47 + 0.72 * lum)), down: Math.max(0, -n[1]) };
}

/** The skin's own colour at (slice, th) before light: grey-brown, pale where stretched, yellowish on the belly. */
function ownColour(sl: Slice, th: number, rigid: boolean): Rgb {
  const a = Math.abs(th);
  const st = rigid ? 0 : sl.st;
  let c = mixc(SKIN_BACK, SKIN, Math.min(1, a / 1.1));
  c = mixc(c, PALE, Math.pow(st, 0.7) * 0.92);
  const belly = Math.max(0, Math.min(1, (a - 2.12) / 0.3));
  return mixc(c, BELLY_C, belly * (1 - 0.35 * st));
}

function shaded(base: Rgb, sl: Slice, th: number, rigid: boolean): Rgb {
  const { lit, down } = lightAt(sl, th);
  const st = rigid ? 0 : sl.st;
  const dark = mixc(mixc(base, DARK, 0.68), mixc(base, DARK_PALE, 0.62), st);
  let c = lit < 0.55 ? mixc(dark, base, lit / 0.55) : mixc(base, mixc(base, LIGHT, 0.3 + 0.15 * st), (lit - 0.55) / 0.45);
  // A little warm light thrown up from the ground onto the underside.
  c = mixc(c, BOUNCE, 0.18 * down * (1 - lit));
  return c;
}

export interface PaintOpts {
  /** The band of the visible half to paint (v 0..1 at each s). */
  readonly from?: Edge;
  readonly to?: Edge;
  /** How opaque the skin is (the x-ray drops it). */
  readonly mul?: number;
  /** The head's cap: bone under it, so it never stretches; finer scales. */
  readonly rigid?: boolean;
  /** Skip the back's markings (the head paints its own). */
  readonly plain?: boolean;
  /** A slanted start (see bandPoly). */
  readonly start?: Start;
  /** How far the surface stands out from the body (the head's own thickness on an egg). */
  readonly grow?: Edge;
  /** The outline to paint inside, when it is not the band's own. */
  readonly clip?: readonly Pt[];
}

/** Washes the band with the form's light and shade, in small patches round and along the body. */
function washes(d: Draw, m: BodyModel, ss: readonly number[], from: Edge, to: Edge, rigid: boolean, mul: number, grow: Edge): void {
  const ctx = d.pen.ctx;
  const K = 16;
  const slices = ss.map((s) => sliceAt(m, s, grow(s)));
  ctx.save();
  ctx.globalAlpha = mul;
  for (let j = 0; j < slices.length - 1; j++) {
    const a = slices[j]!;
    const b = slices[j + 1]!;
    const [fa, ta, fb, tb] = [from(a.s), to(a.s), from(b.s), to(b.s)];
    for (let i = 0; i < K; i++) {
      const va0 = fa + ((ta - fa) * i) / K;
      const va1 = fa + ((ta - fa) * (i + 1.35)) / K;
      const vb0 = fb + ((tb - fb) * i) / K;
      const vb1 = fb + ((tb - fb) * (i + 1.35)) / K;
      const p0 = across(a, va0);
      const p1 = across(a, va1);
      const q0 = across(b, vb0);
      const q1 = across(b, vb1);
      // Reach a little past the next patch along, so no seam shows.
      const q0x = { x: q0.x + (q0.x - p0.x) * 0.35, y: q0.y + (q0.y - p0.y) * 0.35 };
      const q1x = { x: q1.x + (q1.x - p1.x) * 0.35, y: q1.y + (q1.y - p1.y) * 0.35 };
      const mid = { ...a, s: (a.s + b.s) / 2, st: (a.st + b.st) / 2 } as Slice;
      const th = thOf(mid, (va0 + vb0) / 2 + ((ta - fa) * 0.5) / K);
      ctx.fillStyle = css(shaded(ownColour(mid, th, rigid), mid, th, rigid));
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.lineTo(q1x.x, q1x.y);
      ctx.lineTo(q0x.x, q0x.y);
      ctx.closePath();
      ctx.fill();
    }
  }
  ctx.restore();
}

/** A shape given in skin coordinates (sig along, th round), as points on the screen. */
function skinShape(m: BodyModel, pts: readonly (readonly [number, number])[], steps = 4): Pt[] {
  const out: Pt[] = [];
  pts.forEach((a, i) => {
    const b = pts[(i + 1) % pts.length]!;
    for (let k = 0; k < steps; k++) {
      const u = k / steps;
      const sg = a[0] + (b[0] - a[0]) * u;
      const th = a[1] + (b[1] - a[1]) * u;
      out.push(onBody(sliceAt(m, sOfSig(m, sg)), th));
    }
  });
  return out;
}

const BLOTCH_GAP = 9.5;
const BLOTCH_FROM = 31;

/** Is the skin at (sig, th) inside a dark mark? 0..1. */
function markAt(sig: number, th: number): number {
  const a = Math.abs(th);
  if (sig < BLOTCH_FROM - 4) return 0;
  const k = Math.round((sig - BLOTCH_FROM) / BLOTCH_GAP);
  const d = sig - (BLOTCH_FROM + k * BLOTCH_GAP);
  if (a < 1.05 && Math.abs(d) < 3.1 * (1 - a / 1.25)) return 1;
  const bar = sig - (BLOTCH_FROM + (k + 0.5) * BLOTCH_GAP);
  if (a > 1.45 && a < 2.05 && Math.abs(bar + (a - 1.75) * 1.2) < 0.85) return 0.85;
  return 0;
}

/** The dark rhomboid blotches down the back, pale-edged, the bars low on the flank, and the V on the nape. */
function markings(d: Draw, m: BodyModel, s0: number, s1: number, mul: number, napeAt: number): void {
  const { pen } = d;
  const ctx = pen.ctx;
  const g0 = at(m.sig, s0);
  const g1 = at(m.sig, s1);
  const kFirst = Math.floor((g0 - BLOTCH_FROM) / BLOTCH_GAP) - 1;
  ctx.save();
  for (let k = Math.max(0, kFirst); BLOTCH_FROM + k * BLOTCH_GAP < g1 + 4; k++) {
    const c = BLOTCH_FROM + k * BLOTCH_GAP;
    const st = at(m.st, sOfSig(m, c));
    const show = mul * (1 - 0.82 * st);
    if (show < 0.03) continue;
    const rhomb = skinShape(m, [[c - 3.1, 0], [c - 1.0, 0.92], [c + 1.3, 1.05], [c + 3.1, 0], [c + 1.3, -1.05], [c - 1.0, -0.92]]);
    pen.fill(rhomb, E.mark, 0.9 * show);
    pen.fill(skinShape(m, [[c - 1.6, 0.1], [c + 0.6, 0.62], [c + 1.9, 0.1]]), E.markLit, 0.35 * show);
    pen.hair([...rhomb, rhomb[0]!], 0.32, E.edging, 0.7 * show);
    // The narrow bar low on the flank, halfway to the next blotch.
    const b = c + BLOTCH_GAP / 2;
    for (const sgn of [1, -1]) {
      pen.fill(skinShape(m, [[b - 0.7 + 0.36, sgn * 1.45], [b + 0.8 + 0.36, sgn * 1.45], [b + 0.7 - 0.36, sgn * 2.05], [b - 0.8 - 0.36, sgn * 2.05]]), E.mark, 0.72 * show);
    }
  }
  // The dark V on the nape, its point towards the head.
  const n = at(m.sig, napeAt);
  const stN = at(m.st, napeAt);
  if (n > g0 - 12 && n < g1 + 2) {
    const v = skinShape(m, [[n, 0], [n + 6.5, 1.2], [n + 9, 1.2], [n + 2.6, 0], [n + 9, -1.2], [n + 6.5, -1.2]]);
    pen.fill(v, E.markDeep, 0.88 * mul * (1 - 0.5 * stN));
    pen.hair([...v, v[0]!], 0.3, E.edging, 0.6 * mul * (1 - 0.5 * stN));
  }
  ctx.restore();
}

/** Keeled scales, the same size however far the skin is pulled: they spread apart over an egg. */
function scales(d: Draw, m: BodyModel, s0: number, s1: number, from: Edge, to: Edge, rigid: boolean, mul: number, grow: Edge): void {
  const ctx = d.pen.ctx;
  const ROWS = 26;
  const gap = rigid ? 1.25 : 1.9;
  const wa = rigid ? 0.62 : 0.95;
  const wr = rigid ? 0.42 : 0.6;
  const sig0 = rigid ? s0 : at(m.sig, s0);
  const sig1 = rigid ? s1 : at(m.sig, s1);
  ctx.save();
  ctx.lineJoin = 'round';
  for (let col = Math.floor(sig0 / gap); col * gap <= sig1; col++) {
    for (const half of [0, 0.5]) {
      const sg = (col + half) * gap;
      const s = rigid ? sg : sOfSig(m, sg);
      if (s < s0 || s > s1) continue;
      const k = sliceAt(m, s, grow(s));
      const ka = sliceAt(m, s - wa, grow(s - wa));
      const kb = sliceAt(m, s + wa, grow(s + wa));
      const lo = thOf(k, from(s) + 0.02);
      const hi = thOf(k, to(s) - 0.02);
      const dth = wr / Math.max(0.6, k.r);
      const rowStep = (Math.PI * 2) / ROWS;
      const j0 = Math.ceil(Math.min(lo, hi) / rowStep);
      const j1 = Math.floor(Math.max(lo, hi) / rowStep);
      for (let j = j0; j <= j1; j++) {
        if ((j & 1) !== (half ? 1 : 0)) continue;
        const th = j * rowStep;
        const a = Math.abs(th);
        if (a > 2.3) continue;
        const p = onBody(k, th);
        const pa = onBody(ka, th);
        const pb = onBody(kb, th);
        const pu = onBody(k, th - dth);
        const pd = onBody(k, th + dth);
        const mark = rigid ? 0 : markAt(sg, th);
        let c = shaded(mixc(mixc(ownColour(k, th, true), SKIN, 0.2), MARK, 0.12 + 0.2 * k.st), k, th, true);
        c = mixc(c, mixc(MARK, c, 0.25), mark);
        const st = rigid ? 0 : k.st;
        ctx.globalAlpha = (0.5 + 0.45 * st) * mul;
        ctx.fillStyle = css(c);
        ctx.beginPath();
        ctx.moveTo(pa.x, pa.y);
        ctx.lineTo(pu.x, pu.y);
        ctx.lineTo(pb.x, pb.y);
        ctx.lineTo(pd.x, pd.y);
        ctx.closePath();
        ctx.fill();
        // A fine dark edge on the shaded side, and the pale keel down its middle.
        ctx.globalAlpha = (0.2 + 0.5 * st) * mul;
        ctx.strokeStyle = E.shadow;
        ctx.lineWidth = 0.13 * k.g.p;
        ctx.beginPath();
        ctx.moveTo(pb.x, pb.y);
        ctx.lineTo(pd.x, pd.y);
        ctx.lineTo(pa.x, pa.y);
        ctx.stroke();
        ctx.globalAlpha = (0.16 + 0.4 * st) * mul * (mark > 0 ? 0.5 : 1);
        ctx.strokeStyle = E.edging;
        ctx.lineWidth = 0.12 * k.g.p;
        ctx.beginPath();
        ctx.moveTo(pa.x + (p.x - pa.x) * 0.45, pa.y + (p.y - pa.y) * 0.45);
        ctx.lineTo(p.x + (pb.x - p.x) * 0.55, p.y + (pb.y - p.y) * 0.55);
        ctx.stroke();
      }
    }
  }
  ctx.restore();
}

/** The belly's wide plates: fine lines across the pale band. */
function plates(d: Draw, m: BodyModel, s0: number, s1: number, mul: number): void {
  for (let s = Math.ceil(s0 / 1.4) * 1.4; s < s1; s += 1.4) {
    const k = sliceAt(m, s);
    if (k.st > 0.3) continue;
    const lo = thOf(k, 0);
    const hi = thOf(k, 1);
    const sgn = hi > 2 ? 1 : -1;
    const a = sgn * 2.2;
    const b = sgn * Math.min(2.95, Math.max(Math.abs(lo), Math.abs(hi)) - 0.05);
    if (Math.abs(b) <= Math.abs(a)) continue;
    d.pen.hair([onBody(k, a), onBody(k, (a + b) / 2 + 0.02), onBody(k, b)], 0.16 * k.g.p, E.shadow, 0.3 * mul);
  }
}

/** Creases where the stretched skin gathers into the neck behind (and in front of) a swallowed egg. */
function creases(d: Draw, m: BodyModel, s0: number, s1: number, mul: number): void {
  for (let s = Math.ceil(s0 / 2.2) * 2.2; s < s1; s += 2.2) {
    const k = sliceAt(m, s);
    // Only where the skin gathers into the slim neck: falling steeply, part stretched.
    const taper = Math.min(1, Math.max(0, Math.abs(k.dr) - 0.45) * 1.6) * Math.min(1, k.st * 3) * (1 - k.st * 0.7);
    if (taper < 0.12) continue;
    const pts = along(0.12, 0.88, 0.08).map((v) => {
      const th = thOf(k, v);
      return onBody(sliceAt(m, s + 0.7 * Math.sin(v * Math.PI) * Math.sign(k.dr)), th);
    });
    d.pen.hair(pts, 0.2 * k.g.p, E.shadow, 0.4 * taper * mul);
    d.pen.hair(pts.map((p) => ({ x: p.x + 0.35, y: p.y + 0.1 })), 0.16 * k.g.p, PAPER_FILL, 0.3 * taper * mul);
  }
}

/** Over the swollen skin, the illustrator's touch: hatching in the core shadow low down, and a soft window of light high up. */
function coreShade(d: Draw, m: BodyModel, s0: number, s1: number, from: Edge, to: Edge, mul: number): void {
  const big = along(s0, s1, 1).filter((s) => at(m.top, s) - at(m.bot, s) > 20);
  if (big.length < 3) return;
  const a = big[0]!;
  const b = big[big.length - 1]!;
  const low = bandPoly(m, a, b, (s) => Math.max(from(s), 0.74), to);
  d.pen.hatch(low, 1.5, 0.95, 0.22, { color: LINE, alpha: 0.32 * mul });
  const deep = bandPoly(m, a, b, (s) => Math.max(from(s), 0.86), to);
  d.pen.hatch(deep, 1.3, -0.6, 0.2, { color: LINE, alpha: 0.26 * mul });
  const mid = (a + b) / 2 - (b - a) * 0.18;
  const k = sliceAt(m, mid);
  const c = across(k, 0.24);
  const ctx = d.pen.ctx;
  const g = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, k.r * 0.75);
  g.addColorStop(0, `rgba(255,248,236,${0.45 * mul})`);
  g.addColorStop(1, 'rgba(255,248,236,0)');
  d.pen.clipped(bandPoly(m, a, b, from, to), () => {
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(c.x, c.y, k.r * 0.75, k.r * 0.45, -0.35, 0, Math.PI * 2);
    ctx.fill();
  });
}

/** Paints a stretch of the body (the caller inks its edges). */
export function paintTube(d: Draw, m: BodyModel, s0: number, s1: number, o: PaintOpts = {}): void {
  if (s1 <= s0) return;
  const from = o.from ?? ZERO;
  const to = o.to ?? ONE;
  const mul = o.mul ?? 1;
  const rigid = o.rigid ?? false;
  const grow = o.grow ?? FLAT;
  const clip = o.clip ?? bandPoly(m, s0, s1, from, to, 0.5, o.start, grow);
  const step = (s: number): number => (at(m.top, s) - at(m.bot, s) > 14 ? 0.5 : 0.9);
  const ss: number[] = [s0];
  while (ss[ss.length - 1]! < s1) ss.push(Math.min(s1, ss[ss.length - 1]! + step(ss[ss.length - 1]!)));
  d.pen.clipped(clip, () => {
    washes(d, m, ss, from, to, rigid, mul, grow);
    // Grain: a fine stipple of darker dust, thicker in the shade.
    d.pen.stipple(clip, Math.min(2600, Math.round((s1 - s0) * 14)), () => 0.35, 0.16, E.shadow);
    if (!o.plain) markings(d, m, s0, s1, mul, HINGE_S + 6);
    if (!rigid) creases(d, m, s0, s1, mul);
    scales(d, m, s0, s1, from, to, rigid, mul, grow);
    if (!rigid) plates(d, m, s0, s1, mul);
  });
  if (!rigid) coreShade(d, m, s0, s1, from, to, mul);
}

/** Inks the body's outline from s0 to s1: its upper and lower silhouettes. */
export function inkTube(d: Draw, m: BodyModel, s0: number, s1: number, w = 0.7, alpha = 1): void {
  if (s1 <= s0) return;
  const ss = along(s0, s1, 0.6);
  const sl = ss.map((s) => sliceAt(m, s));
  d.pen.stroke(sl.map((k) => across(k, 0)), w, LINE, alpha, false);
  d.pen.stroke(sl.map((k) => across(k, 1)), w * 0.92, LINE, alpha, false);
}

/** The tip of the tail: closes the outline. */
export function inkTail(d: Draw, m: BodyModel): void {
  const k = sliceAt(m, BODY_LEN);
  d.pen.stroke(along(0, 1, 0.1).map((v) => across(k, v)), 0.3, LINE, 0.9, false);
}
