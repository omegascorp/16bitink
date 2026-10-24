import type { Rng } from '../../logic/rng';
import { bezier, closed, lerp, pt, type Draw } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { deepen, LICHEN, MOSS, mossFoot } from './light';
import { ashlar, backArc, CROWN_BLUE, CROWN_GOLD, DEPTH, frontArc, HOLE, P, quad, roundWash, type Box, type Surface } from '../sites/build';
import { blob, boxOf, crisp, dab, flat, gleam, LIGHT, mix, paint, pool, rgba, SHADOW, soft } from '../sites/paintKit';

/**
 * Parts for the townscape's civic buildings (the hall and the mage guild),
 * drawn at the town screen's close scale (a door about 18 units): wall
 * faces washed and coursed, roofs laid in rows, stone-framed windows with
 * glass that holds the sky, columns, domes, balustrades, statues and the
 * Crown's banners. Everything is in the map's oblique view (sites/build.ts).
 */

export const HONEY = '#9a8e78';
export const MARBLE = '#ada391';
export const PLASTER = '#a8895a';
export const OAK = '#3e2a1c';
export const SLATE = '#3f4855';
export const GLASS = '#1c1e26';
export const BLUE = CROWN_BLUE;
export const GOLD = CROWN_GOLD;

export const box = (x0: number, x1: number, z0: number, z1: number, h0: number, h1: number): Box => ({ x0, x1, z0, z1, h0, h1 });
export const frontAt = (b: Box): Surface => (u, v) => P(b.x0 + u, b.z0, b.h0 + v);
export const sideAt = (b: Box): Surface => (u, v) => P(b.x1, b.z0 + u, b.h0 + v);

/** A soft wash of shade (or light) laid over part of a face, kept inside `clip`. */
export function shadeOn(d: Draw, clip: readonly Pt[], shape: readonly Pt[], alpha = 0.3, blur = 2, color = SHADOW): void {
  d.pen.clipped(clip, () => soft(d.pen.ctx, blur, () => d.pen.fill(shape, color, alpha)));
}

/** A shadow thrown on a face by something before it: `shape` pushed down and right by (dx, dy), kept inside `clip`. */
export function castOn(d: Draw, clip: readonly Pt[], shape: readonly Pt[], dx: number, dy: number, alpha = 0.3, blur = 2): void {
  shadeOn(d, clip, shape.map((p) => pt(p.x + dx, p.y + dy)), alpha, blur);
}

export type Finish = 'ashlar' | 'plaster' | 'rubble' | 'smooth';

export interface FaceOpts {
  readonly tone?: number;
  readonly finish?: Finish;
  readonly course?: number;
  readonly stone?: number;
  readonly line?: number;
}

/** A wall face: washed for the light, coursed or limewashed, weathered, grimed at its foot and lined. */
export function face(d: Draw, rng: Rng, at: Surface, w: number, h: number, color: string, o: FaceOpts = {}): Pt[] {
  const { pen } = d;
  const tone = o.tone ?? 0.05;
  const shape = crisp(quad(at, 0, 0, w, h), 4);
  flat(d, shape, color, { tone: deepen(tone), hatch: tone > 0.2 ? 0.26 : 0, line: 0 });
  const fin = o.finish ?? 'ashlar';
  if (fin === 'ashlar') ashlar(d, rng, at, w, h, shape, color, o.course ?? 6.4, o.stone ?? 13);
  if (fin === 'rubble') rubble(d, rng, at, w, h, shape, color);
  if (fin === 'ashlar' || fin === 'rubble') mossFoot(d, rng, at, w, h, shape);
  if (fin === 'plaster') {
    pen.clipped(shape, () => {
      for (let i = 0; i < Math.max(2, (w * h) / 500); i++) {
        const c = at(rng() * w, rng() * h);
        dab(d, blob(c, 6 + rng() * 10, 4 + rng() * 6, rng), rng() < 0.5 ? mix(color, '#76604a', 0.6) : mix(color, LIGHT, 0.6), 0.16, 3);
      }
      pen.stipple(shape, Math.round(w * h * 0.05), () => 0.5, 0.38, mix(color, SHADOW, 0.35));
    });
  }
  // Weather: a few soft stains, cooler and warmer, so the face isn't one flat tint.
  pen.clipped(shape, () => {
    for (let i = 0; i < Math.max(1, Math.round((w * h) / 1400)); i++) {
      dab(d, blob(at(rng() * w, rng() * h * 0.8), 5 + rng() * 9, 7 + rng() * 9, rng), rng() < 0.6 ? mix(color, SHADOW, 0.35) : mix(color, '#6e613d', 0.4), 0.08, 3);
    }
  });
  // Damp and grime settling at the foot of the wall.
  shadeOn(d, shape, quad(at, -3, -3, w + 3, Math.min(h * 0.3, 9)), 0.24, 3, mix(color, SHADOW, 0.55));
  pen.stroke(closed(shape), o.line ?? 0.6, d.ink, 0.85);
  return shape;
}

/** Field stones laid roughly in courses: a plinth or a rustic wall. */
function rubble(d: Draw, rng: Rng, at: Surface, w: number, h: number, clip: readonly Pt[], color: string): void {
  const { pen } = d;
  pen.clipped(clip, () => {
    for (let v = 0; v < h; v += 5) {
      for (let u = -rng() * 6; u < w; u += 7 + rng() * 5) {
        const c = at(u + 4, v + 2.6);
        const s = blob(c, 3 + rng() * 1.6, 2 + rng() * 0.6, rng, 0.25, 12);
        pen.fill(s, rng() < 0.5 ? mix(color, LIGHT, 0.35) : mix(color, '#604d37', 0.35), 0.5);
        pen.hair(closed(s), 0.4, d.ink, 0.5);
      }
    }
  });
}

/** A plain box (a step, a plinth, a cornice block): right side shaded, front in half light, top lit. */
export function slab(d: Draw, b: Box, color: string, o: { readonly top?: boolean; readonly line?: number } = {}): Pt[] {
  const line = o.line ?? 0.55;
  flat(d, crisp([P(b.x1, b.z0, b.h0), P(b.x1, b.z1, b.h0), P(b.x1, b.z1, b.h1), P(b.x1, b.z0, b.h1)], 3), color, { tone: deepen(0.4), hatch: 0.25, line });
  const front = crisp([P(b.x0, b.z0, b.h0), P(b.x1, b.z0, b.h0), P(b.x1, b.z0, b.h1), P(b.x0, b.z0, b.h1)], 3);
  flat(d, front, color, { tone: 0.08, line });
  if (o.top ?? true) flat(d, crisp([P(b.x0, b.z0, b.h1), P(b.x1, b.z0, b.h1), P(b.x1, b.z1, b.h1), P(b.x0, b.z1, b.h1)], 3), color, { tone: -0.32, line });
  return front;
}

/** A flight of `n` steps rising away from the viewer to height `top`, its front edge at z0. */
export function steps(d: Draw, x0: number, x1: number, z0: number, n: number, top: number, tread: number, color: string, flare = 0): void {
  for (let i = n - 1; i >= 0; i--) {
    const f = flare * (n - 1 - i);
    slab(d, box(x0 - f, x1 + f, z0 + i * tread, z0 + (i + 1) * tread + 2, 0, (top * (i + 1)) / n), color, { line: 0.5 });
    d.pen.hair([P(x0 - f + 1, z0 + i * tread, (top * (i + 1)) / n - 0.5), P(x1 + f - 1, z0 + i * tread, (top * (i + 1)) / n - 0.5)], 0.5, PAPER_FILL, 0.5);
  }
}

// ---- Roofs ----

export interface Courses {
  readonly row: number;
  readonly tab: number;
}

/**
 * A roof plane from its eave (a → b) to its ridge (e → c, e over a), laid
 * with rows of shingles or slates, the colour broken by a few patches.
 */
export function plane(d: Draw, rng: Rng, a: Pt, b: Pt, c: Pt, e: Pt, color: string, tone: number, laid: Courses, mossy = 0): Pt[] {
  const shape = crisp(a === e || b === c ? [a, b, c] : [a, b, c, e], 4);
  flat(d, shape, color, { tone: deepen(tone), hatch: tone > 0.2 ? 0.26 : 0, line: 0, from: lerp(e, c, 0.2), to: lerp(a, b, 0.8) });
  const span = Math.max(Math.hypot(b.x - a.x, b.y - a.y), Math.hypot(c.x - e.x, c.y - e.y), 1);
  const rise = Math.max(1, Math.hypot((e.x + c.x - a.x - b.x) / 2, (e.y + c.y - a.y - b.y) / 2));
  const at: Surface = (u, v) => {
    const s = u / span;
    const t = v / rise;
    return lerp(lerp(a, b, s), lerp(e, c, s), t);
  };
  d.pen.clipped(shape, () => {
    for (let i = 0; i < Math.round((span * rise) / 900) + 1; i++) {
      dab(d, blob(at(rng() * span, rng() * rise), 6 + rng() * 10, 3 + rng() * 5, rng), rng() < 0.5 ? mix(color, LIGHT, 0.5) : mix(color, SHADOW, 0.4), 0.14, 2.5);
    }
    for (let i = 0; i < mossy; i++) dab(d, blob(at(rng() * span, rng() * rise * 0.5), 4 + rng() * 6, 2 + rng() * 3, rng), MOSS, 0.22, 2);
  });
  courses(d, rng, at, span, rise, shape, color, laid);
  d.pen.stroke(closed(shape), 0.65, d.ink, 0.9);
  return shape;
}

/**
 * Shingles or slates laid in courses up a plane (`at(u, v)` along the eave
 * and up): each course's butt throws a thin shadow on the one below, the
 * tabs are cut to uneven widths and tinted apart, a few lifted or lit.
 */
function courses(d: Draw, rng: Rng, at: Surface, w: number, h: number, clip: readonly Pt[], color: string, laid: Courses): void {
  const { pen } = d;
  const dark = mix(color, SHADOW, 0.55);
  pen.clipped(clip, () => {
    for (let v = 0, k = 0; v < h + laid.row; v += laid.row, k++) {
      const wob = (u: number): number => v + Math.sin(u * 0.07 + k * 1.7) * 0.35;
      pen.fill([at(-2, wob(-2) - laid.row * 0.38), at(w + 2, wob(w + 2) - laid.row * 0.38), at(w + 2, wob(w + 2)), at(-2, wob(-2))], dark, 0.2);
      let u = -rng() * laid.tab;
      while (u < w) {
        const u1 = u + laid.tab * (0.6 + rng() * 0.8);
        const r = rng();
        if (r < 0.34) pen.fill([at(u + 0.3, wob(u)), at(u1 - 0.3, wob(u1)), at(u1 - 0.3, wob(u1) + laid.row), at(u + 0.3, wob(u) + laid.row)], r < 0.15 ? mix(color, LIGHT, 0.55) : r < 0.27 ? mix(color, SHADOW, 0.35) : mix(color, LICHEN, 0.45), 0.24);
        pen.hair([at(u1, wob(u1) + 0.1), at(u1 + 0.15, wob(u1) + laid.row * 0.82)], 0.38, d.ink, 0.42);
        if (rng() < 0.5) pen.hair([at(u + 0.6, wob(u) + 0.5), at(u1 - 0.6, wob(u1) + 0.5)], 0.45, mix(color, LIGHT, 0.55), 0.35);
        u = u1;
      }
      pen.hair(Array.from({ length: 9 }, (_, i) => at((w * i) / 8, wob((w * i) / 8))), 0.5, d.ink, 0.5);
    }
  });
}

/** The thickness of a roof's front eave: a board in shade under the eave line a → b. */
export function eaveBoard(d: Draw, a: Pt, b: Pt, color: string, t = 2): void {
  const s = crisp([a, b, pt(b.x, b.y + t), pt(a.x, a.y + t)], 3);
  flat(d, s, mix(color, SHADOW, 0.35), { tone: 0.2, line: 0.5 });
}

/** A ridge cap along two points: a dark roll with a lit back. */
export function ridge(d: Draw, a: Pt, b: Pt, color: string, w = 2.2): void {
  d.pen.stroke([a, b], w, mix(color, SHADOW, 0.5), 0.95, false);
  d.pen.hair([pt(a.x, a.y - w * 0.3), pt(b.x, b.y - w * 0.3)], w * 0.35, mix(color, LIGHT, 0.5), 0.8);
}

/** A gabled roof, its ridge across the view (x): the long front slope and the gable on the right. Returns the front slope. */
export function gableX(d: Draw, rng: Rng, b: Box, rise: number, color: string, wall: string, laid: Courses, o = 4): Pt[] {
  const h = b.h1;
  const zm = (b.z0 + b.z1) / 2;
  flat(d, crisp([P(b.x1, b.z0, h), P(b.x1, b.z1, h), P(b.x1, zm, h + rise)], 3), wall, { tone: deepen(0.42), hatch: 0.3 });
  plane(d, rng, P(b.x1 + o, b.z1 + o, h - o * 0.6), P(b.x0 - o, b.z1 + o, h - o * 0.6), P(b.x0 - o, zm, h + rise), P(b.x1 + o, zm, h + rise), color, -0.1, laid);
  eaveBoard(d, P(b.x0 - o, b.z0 - o, h - o * 0.6), P(b.x1 + o, b.z0 - o, h - o * 0.6), color);
  const front = plane(d, rng, P(b.x0 - o, b.z0 - o, h - o * 0.6), P(b.x1 + o, b.z0 - o, h - o * 0.6), P(b.x1 + o, zm, h + rise), P(b.x0 - o, zm, h + rise), color, 0.04, laid, 3);
  ridge(d, P(b.x0 - o, zm, h + rise), P(b.x1 + o, zm, h + rise), color);
  return front;
}

/**
 * A gabled roof with its ridge running back (z): the gable to the front
 * (returned as a surface, u across from the left eave, v up), a lit left
 * slope and a shaded right one, ending at `zBack`.
 */
export function gableZ(d: Draw, rng: Rng, b: Box, rise: number, color: string, wall: string, laid: Courses, o = 3, zBack = b.z1): Surface {
  const h = b.h1;
  const xm = (b.x0 + b.x1) / 2;
  const L = P(b.x0 - o, b.z0 - o, h - o * 0.6);
  const R = P(b.x1 + o, b.z0 - o, h - o * 0.6);
  const top = P(xm, b.z0 - o, h + rise);
  plane(d, rng, P(b.x1 + o, b.z0 - o, h - o * 0.6), P(b.x1 + o, zBack, h - o * 0.6), P(xm, zBack, h + rise), top, color, 0.42, laid);
  plane(d, rng, P(b.x0 - o, zBack, h - o * 0.6), L, top, P(xm, zBack, h + rise), color, -0.14, laid, 2);
  const at: Surface = (u, v) => P(b.x0 + u, b.z0, h + v);
  const tri = crisp([at(0, 0), at(b.x1 - b.x0, 0), at((b.x1 - b.x0) / 2, rise)], 3);
  flat(d, tri, wall, { tone: 0.04, line: 0.55 });
  // Bargeboards along the gable's eaves.
  for (const [p, q] of [[L, top], [R, top]] as const) {
    const n = pt(0, 2.2);
    const s = [p, q, pt(q.x + n.x, q.y + n.y), pt(p.x + n.x, p.y + n.y)];
    flat(d, crisp(s, 3), mix(OAK, LIGHT, 0.15), { tone: 0.05, line: 0.5 });
  }
  ridge(d, top, P(xm, zBack, h + rise), color);
  return at;
}

/** A hipped roof over a box: front and back slopes up to a ridge `inset` in from each end, triangular hips at the ends. */
export function hipRoof(d: Draw, rng: Rng, b: Box, rise: number, inset: number, color: string, laid: Courses, o = 4): { readonly a: Pt; readonly b: Pt; readonly front: Pt[] } {
  const h = b.h1 - o * 0.6;
  const [x0, x1, z0, z1] = [b.x0 - o, b.x1 + o, b.z0 - o, b.z1 + o];
  const zm = (b.z0 + b.z1) / 2;
  const ra = P(x0 + inset, zm, b.h1 + rise);
  const rb = P(x1 - inset, zm, b.h1 + rise);
  plane(d, rng, P(x1, z1, h), P(x0, z1, h), ra, rb, color, -0.1, laid);
  plane(d, rng, P(x0, z1, h), P(x0, z0, h), ra, ra, color, -0.2, laid);
  plane(d, rng, P(x1, z0, h), P(x1, z1, h), rb, rb, color, 0.45, laid);
  eaveBoard(d, P(x0, z0, h), P(x1, z0, h), color);
  const front = plane(d, rng, P(x0, z0, h), P(x1, z0, h), rb, ra, color, 0.04, laid, 2);
  if (Math.hypot(rb.x - ra.x, rb.y - ra.y) > 1) ridge(d, ra, rb, color);
  for (const [p, q] of [[P(x0, z0, h), ra], [P(x1, z0, h), rb]] as const) d.pen.stroke([p, q], 1.4, mix(color, SHADOW, 0.45), 0.9, false);
  return { a: ra, b: rb, front };
}

/** A string course or cornice across a front face at height v: a lit top, a moulding and its shadow on the wall below. */
export function cornice(d: Draw, at: Surface, clip: readonly Pt[], w: number, v: number, depth: number, color: string): void {
  const band = crisp(quad(at, -1.5, v - depth, w + 1.5, v), 3);
  shadeOn(d, clip, quad(at, 0, v - depth - 4, w + 2, v - depth + 0.5), 0.3, 1.8);
  flat(d, band, mix(color, LIGHT, 0.2), { tone: 0.02, line: 0.5 });
  d.pen.hair([at(-1.5, v - 0.6), at(w + 1.5, v - 0.6)], 0.9, PAPER_FILL, 0.65);
  d.pen.hair([at(-1, v - depth * 0.55), at(w + 1, v - depth * 0.55)], 0.45, d.ink, 0.5);
}

// ---- Openings ----

export interface WindowOpts {
  /** Width of the stone surround (0 for none). */
  readonly frame?: number;
  readonly key?: boolean;
  readonly sill?: boolean;
  /** Glazing: a mullion and this many transoms. */
  readonly transoms?: number;
  /** A warm lamp-lit glow behind the glass (0..1). */
  readonly lit?: number;
  /** Flat (square) head instead of round. */
  readonly square?: boolean;
}

/** Glass in a recess: dark, the sky held in a diagonal sheen, shade from the reveal on its upper left. */
export function glass(d: Draw, hole: readonly Pt[], lit = 0, tint = GLASS): void {
  const { pen } = d;
  const ctx = pen.ctx;
  const b = boxOf(hole);
  pen.fill(hole, tint, 1);
  pen.clipped(hole, () => {
    const g = ctx.createLinearGradient(b.x0, b.y0, b.x0 + b.w, b.y0 + b.h);
    g.addColorStop(0, rgba('#6c7688', 0));
    g.addColorStop(0.35, rgba('#6c7688', 0.4));
    g.addColorStop(0.5, rgba('#6c7688', 0.08));
    g.addColorStop(0.7, rgba('#6c7688', 0.22));
    g.addColorStop(1, rgba('#6c7688', 0));
    ctx.fillStyle = g;
    ctx.fillRect(b.x0, b.y0, b.w, b.h);
    if (lit > 0) {
      const l = ctx.createRadialGradient(b.x0 + b.w * 0.5, b.y0 + b.h * 0.7, 0, b.x0 + b.w * 0.5, b.y0 + b.h * 0.7, Math.max(b.w, b.h) * 0.8);
      l.addColorStop(0, rgba('#ffd27a', lit));
      l.addColorStop(1, rgba('#e0903a', lit * 0.2));
      ctx.fillStyle = l;
      ctx.fillRect(b.x0, b.y0, b.w, b.h);
    }
  });
  pen.crescent(hole, pt(1.6, 2), () => pen.fill(hole, SHADOW, 0.45));
}

/** A stone surround round an arched (or square-headed) opening: a ring of voussoirs and a keystone. */
export function surround(d: Draw, at: Surface, u: number, v: number, w: number, h: number, fr: number, stone: string, key = true, square = false): void {
  const { pen } = d;
  const r = w / 2;
  const head = square
    ? [at(u - fr, v + h + fr), at(u + w + fr, v + h + fr)]
    : Array.from({ length: 13 }, (_, i) => { const a = Math.PI - (i / 12) * Math.PI; return at(u + r + Math.cos(a) * (r + fr), v + h - r + Math.sin(a) * (r + fr)); });
  flat(d, crisp([at(u - fr, v), ...head, at(u + w + fr, v)], 2), mix(stone, LIGHT, 0.3), { tone: -0.05, line: 0.5 });
  if (!square) {
    for (let i = 1; i < 8; i++) {
      const a = Math.PI - (i / 8) * Math.PI;
      pen.hair([at(u + r + Math.cos(a) * r, v + h - r + Math.sin(a) * r), at(u + r + Math.cos(a) * (r + fr), v + h - r + Math.sin(a) * (r + fr))], 0.4, d.ink, 0.5);
    }
  }
  if (key) {
    const k = crisp([at(u + r - 1.8, v + h - 1), at(u + r + 1.8, v + h - 1), at(u + r + 2.6, v + h + fr + 1.6), at(u + r - 2.6, v + h + fr + 1.6)], 1.5);
    flat(d, k, mix(stone, LIGHT, 0.45), { tone: -0.1, line: 0.5 });
  }
}

/** A window in a stone face: surround of voussoirs (or a lintel), keystone, glass with glazing bars, a sill throwing its shadow. */
export function window(d: Draw, at: Surface, u: number, v: number, w: number, h: number, stone: string, o: WindowOpts = {}): Pt[] {
  const { pen } = d;
  const fr = o.frame ?? 2.4;
  const r = w / 2;
  const n = 12;
  const head = (rr: number): Pt[] => o.square
    ? [at(u + r - rr, v + h + (rr - r)), at(u + r + rr, v + h + (rr - r))]
    : Array.from({ length: n + 1 }, (_, i) => {
      const a = Math.PI - (i / n) * Math.PI;
      return at(u + r + Math.cos(a) * rr, v + h - r + Math.sin(a) * rr);
    });
  if (fr > 0) {
    const outer = crisp([at(u - fr, v), ...head(r + fr), at(u + w + fr, v)], 2);
    flat(d, outer, mix(stone, LIGHT, 0.3), { tone: -0.05, line: 0.5 });
    if (!o.square) {
      for (let i = 1; i < 8; i++) {
        const a = Math.PI - (i / 8) * Math.PI;
        pen.hair([at(u + r + Math.cos(a) * r, v + h - r + Math.sin(a) * r), at(u + r + Math.cos(a) * (r + fr), v + h - r + Math.sin(a) * (r + fr))], 0.4, d.ink, 0.5);
      }
    }
  }
  if (o.key && fr > 0) {
    const k = crisp([at(u + r - 1.6, v + h - 1), at(u + r + 1.6, v + h - 1), at(u + r + 2.3, v + h + fr + 1.4), at(u + r - 2.3, v + h + fr + 1.4)], 1.5);
    flat(d, k, mix(stone, LIGHT, 0.45), { tone: -0.1, line: 0.5 });
  }
  const hole = crisp([at(u, v), ...head(r), at(u + w, v)], 2);
  glass(d, hole, o.lit ?? 0);
  // Glazing bars: a mullion, transoms and the lead cames between.
  pen.clipped(hole, () => {
    const bar = mix(stone, LIGHT, 0.2);
    const bars: Pt[][] = [[at(u + r, v), at(u + r, v + h)]];
    const t = o.transoms ?? 1;
    for (let i = 1; i <= t; i++) bars.push([at(u, v + ((h - (o.square ? 0 : r * 0.6)) * i) / (t + 1)), at(u + w, v + ((h - (o.square ? 0 : r * 0.6)) * i) / (t + 1))]);
    for (const s of bars) {
      pen.stroke(s.map((p) => pt(p.x + 0.4, p.y + 0.4)), 1.1, SHADOW, 0.35, false);
      pen.stroke(s, 0.9, bar, 0.95, false);
    }
    for (let y = 3; y < h; y += 3.2) pen.hair([at(u, v + y), at(u + w, v + y)], 0.3, mix(GLASS, SHADOW, 0.5), 0.5);
  });
  pen.stroke(closed(hole), 0.6, d.ink, 0.9);
  if (o.sill ?? true) {
    const s = crisp(quad(at, u - fr - 1.2, v - 2.2, u + w + fr + 1.2, v), 2);
    pen.fill(quad(at, u - fr, v - 5, u + w + fr + 2, v - 2.2), SHADOW, 0.16);
    flat(d, s, mix(stone, LIGHT, 0.35), { tone: -0.1, line: 0.5 });
    pen.hair([at(u - fr - 1, v - 0.4), at(u + w + fr + 1, v - 0.4)], 0.7, PAPER_FILL, 0.7);
  }
  return hole;
}

/** A door of oak planks under a round or flat head, iron strap hinges and a ring, in a dark recess. */
export function door(d: Draw, at: Surface, u: number, w: number, h: number, o: { readonly arched?: boolean; readonly color?: string; readonly leaves?: number } = {}): Pt[] {
  const { pen } = d;
  const color = o.color ?? OAK;
  const r = w / 2;
  const shape = o.arched ?? true
    ? crisp([at(u, 0), ...Array.from({ length: 13 }, (_, i) => { const a = Math.PI - (i / 12) * Math.PI; return at(u + r + Math.cos(a) * r, h - r + Math.sin(a) * r); }), at(u + w, 0)], 2)
    : crisp(quad(at, u, 0, u + w, h), 2);
  pen.fill(shape, HOLE, 1);
  const leaf = crisp(shape.map((p) => pt(p.x + 0.8, p.y + 0.6)), 2);
  flat(d, leaf, color, { tone: 0.15, line: 0 });
  pen.clipped(leaf, () => {
    for (let x = 2.4; x < w; x += 2.6) pen.hair([at(u + x, 0), at(u + x, h)], 0.4, d.ink, 0.5);
    for (const y of [h * 0.22, h * 0.62]) {
      pen.stroke([at(u, y), at(u + w * 0.42, y)], 1.1, '#2a2522', 0.9, false);
      pen.stroke([at(u + w, y), at(u + w * 0.58, y)], 1.1, '#2a2522', 0.9, false);
    }
    if ((o.leaves ?? 2) > 1) pen.stroke([at(u + r, 0), at(u + r, h)], 0.7, d.ink, 0.8, false);
  });
  pen.crescent(shape, pt(2.4, 2.4), () => pen.fill(shape, SHADOW, 0.55));
  const ring = at(u + r + 2, h * 0.45);
  pen.circle(ring.x, ring.y, 1.1, 0.5, '#2a2522');
  pen.stroke(closed(shape), 0.65, d.ink, 0.95);
  return shape;
}

// ---- Columns and domes ----

/** A column standing at (x, z) from h0 to h1: square plinth, torus, a shaded fluted shaft, capital and abacus. */
export function column(d: Draw, x: number, z: number, h0: number, h1: number, r: number, color: string, gilt = false): void {
  const { pen } = d;
  slab(d, box(x - r * 1.4, x + r * 1.4, z - r * 1.4, z + r * 1.4, h0, h0 + 2.4), color, { line: 0.45 });
  const ring = (ha: number, hb: number, rr: number, c: string): void => {
    const a = P(x, z, ha);
    const b = P(x, z, hb);
    roundWash(d, [...frontArc(a.x, a.y, rr, 12), ...backArc(b.x, b.y, rr, 12)], a.x - rr, a.x + rr, c, 0);
    pen.stroke(frontArc(a.x, a.y, rr, 12), 0.45, d.ink, 0.8, false);
  };
  ring(h0 + 2.4, h0 + 4, r * 1.2, color);
  const a = P(x, z, h0 + 4);
  const b = P(x, z, h1 - 4);
  const shaft = [...frontArc(a.x, a.y, r, 14), ...backArc(b.x, b.y, r, 14)];
  roundWash(d, shaft, a.x - r, a.x + r, color, 0.28);
  pen.clipped(shaft, () => {
    for (let i = 1; i < 6; i++) {
      const fx = a.x - r * Math.cos((i / 6) * Math.PI);
      pen.hair([pt(fx, b.y + r * DEPTH), pt(fx, a.y + r * DEPTH * 0.8)], 0.35, mix(color, SHADOW, 0.6), 0.45);
    }
  });
  pen.stroke([...frontArc(a.x, a.y, r, 14).slice(-1), pt(b.x + r, b.y)], 0.55, d.ink, 0.85, false);
  pen.stroke([pt(a.x - r, a.y), pt(b.x - r, b.y)], 0.45, d.ink, 0.75, false);
  ring(h1 - 4, h1 - 2.4, r * 1.25, gilt ? GOLD : color);
  slab(d, box(x - r * 1.5, x + r * 1.5, z - r * 1.5, z + r * 1.5, h1 - 2.4, h1), gilt ? GOLD : color, { line: 0.45 });
}

/** Where on a dome (base centre c on screen, radius r, height rise): azimuth t round the front (0 left, π right), elevation e. */
export const onDome = (c: Pt, r: number, rise: number, t: number, e: number): Pt => pt(c.x - r * Math.cos(e) * Math.cos(t), c.y + r * Math.cos(e) * DEPTH * Math.sin(t) - rise * Math.sin(e));

/**
 * A dome over a circle (screen centre c): shaded round, laid in courses
 * of slates (or gilt plates), with ribs (gilt) running up to the crown.
 * Returns its crown.
 */
export function dome(d: Draw, c: Pt, r: number, rise: number, color: string, rib: string, ribs = 10, gloss = false): Pt {
  const { pen } = d;
  const ry = Math.hypot(r * DEPTH, rise);
  const top = Array.from({ length: 29 }, (_, i) => { const a = Math.PI + (i / 28) * Math.PI; return pt(c.x + Math.cos(a) * r, c.y + Math.sin(a) * ry); });
  const shape = [...top, ...frontArc(c.x, c.y, r, 20).reverse().slice(1, -1)];
  paint(d, shape, color, { shadow: 0.6, hatch: 0.18, gloss, line: 0 });
  pen.clipped(shape, () => {
    for (let k = 1; k < 9; k++) {
      const e = (k / 9) * (Math.PI / 2);
      pen.hair(Array.from({ length: 17 }, (_, i) => onDome(c, r, rise, (i / 16) * Math.PI, e)), 0.38, mix(color, SHADOW, 0.6), 0.45);
    }
    for (let i = 1; i < ribs; i++) {
      const t = (i / ribs) * Math.PI;
      const line = Array.from({ length: 13 }, (_, k) => onDome(c, r, rise, t, (k / 12) * (Math.PI / 2)));
      pen.stroke(line.map((p) => pt(p.x + 0.7, p.y + 0.3)), 1.2, SHADOW, 0.3, false);
      pen.stroke(line, 1.3, rib, 0.95, false);
      pen.hair(line.map((p) => pt(p.x - 0.3, p.y - 0.2)), 0.35, mix(rib, LIGHT, 0.6), 0.8);
    }
  });
  gleam(d, Array.from({ length: 9 }, (_, k) => onDome(c, r * 0.92, rise * 0.92, 0.32 * Math.PI, 0.15 + (k / 8) * 1.1)), 1.2, gloss ? 0.7 : 0.4);
  // The gilt band at its foot.
  const band = [...frontArc(c.x, c.y - 2.2, r, 18), ...frontArc(c.x, c.y, r, 18).reverse()];
  pen.fill(band, rib, 0.95);
  pen.hair(frontArc(c.x, c.y - 2, r, 18), 0.4, mix(rib, SHADOW, 0.5), 0.9);
  pen.stroke(closed(crisp(shape, 3)), 0.75, d.ink, 0.95);
  return pt(c.x, c.y - rise);
}

/** A round slab (a ring under a dome, a step round a drum): its rim washed round and its top lit, seen from above. */
export function disc(d: Draw, base: Pt, r: number, h: number, color: string): void {
  roundBody(d, base, r, h, color, 0.18);
  const top = frontArc(base.x, base.y - h, r, 20).concat(backArc(base.x, base.y - h, r, 20).slice(1, -1));
  flat(d, top, color, { tone: -0.3, line: 0.5 });
  d.pen.stroke(frontArc(base.x, base.y, r, 20), 0.6, d.ink, 0.9, false);
  d.pen.stroke([pt(base.x - r, base.y), pt(base.x - r, base.y - h)], 0.5, d.ink, 0.85, false);
  d.pen.stroke([pt(base.x + r, base.y), pt(base.x + r, base.y - h)], 0.6, d.ink, 0.9, false);
}

/** Arched windows round a drum's front, foreshortened towards its sides. */
export function drumWindows(d: Draw, base: Pt, r: number, v0: number, v1: number, n: number, stone: string, lit = 0): void {
  const { pen } = d;
  for (let i = 0; i < n; i++) {
    const t = ((i + 0.5) / n) * Math.PI;
    const k = Math.sin(t);
    const x = base.x - r * Math.cos(t);
    const y = base.y + r * DEPTH * k;
    const w = 2.8 * k;
    const head = Array.from({ length: 7 }, (_, j) => { const a = Math.PI - (j / 6) * Math.PI; return pt(x + Math.cos(a) * w, y - v1 + w + Math.sin(a) * -w * 0.9); });
    const frame = [pt(x - w - 1.3 * k, y - v0), ...head.map((p) => pt(x + (p.x - x) * (1 + 1.3 / 2.8), p.y - 1.3)), pt(x + w + 1.3 * k, y - v0)];
    flat(d, frame, mix(stone, LIGHT, 0.3), { tone: 0, line: 0.4 });
    const hole = [pt(x - w, y - v0), ...head, pt(x + w, y - v0)];
    glass(d, hole, lit);
    pen.stroke(closed(hole), 0.45, d.ink, 0.85);
  }
}

/** Shades a finished building as one: warm light laid from the upper left, a cool settling towards the lower right, on the painted parts only. */
export function atmosphere(d: Draw, x0: number, y0: number, x1: number, y1: number): void {
  const ctx = d.pen.ctx;
  ctx.save();
  ctx.globalCompositeOperation = 'source-atop';
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0, rgba(LIGHT, 0.22));
  g.addColorStop(0.45, rgba(LIGHT, 0));
  g.addColorStop(0.7, rgba(SHADOW, 0.1));
  g.addColorStop(1, rgba(SHADOW, 0.32));
  ctx.fillStyle = g;
  ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
  const f = ctx.createLinearGradient(0, y1, 0, y1 - 40);
  f.addColorStop(0, rgba(SHADOW, 0.24));
  f.addColorStop(1, rgba(SHADOW, 0));
  ctx.fillStyle = f;
  ctx.fillRect(x0, y1 - 40, x1 - x0, 40);
  ctx.restore();
}

/** A short round shaft (a dome's drum, a tower's storey) from h0 to h1 at screen point base, radius r, washed round; returns the body. */
export function roundBody(d: Draw, base: Pt, r: number, height: number, color: string, hatch = 0.28): Pt[] {
  const body = [...frontArc(base.x, base.y, r, 18), ...backArc(base.x, base.y - height, r, 18)];
  roundWash(d, body, base.x - r, base.x + r, color, hatch);
  return body;
}

// ---- Ornament ----

/** A balustrade along a front face from u0 to u1 at height v: plinth, turned balusters and a lit handrail. */
export function balustrade(d: Draw, at: Surface, u0: number, u1: number, v: number, h: number, color: string): void {
  const { pen } = d;
  const rail = crisp(quad(at, u0, v + h - 1.8, u1, v + h), 2);
  const foot = crisp(quad(at, u0, v, u1, v + 1.4), 2);
  for (let u = u0 + 2; u < u1 - 1; u += 3.2) {
    const m = at(u, v + 1.4 + (h - 3.2) * 0.4);
    const t = at(u, v + h - 1.8);
    const bb = at(u, v + 1.4);
    const s = [pt(bb.x - 0.8, bb.y), ...bezier(pt(bb.x - 0.8, bb.y), pt(m.x - 1.8, m.y), pt(t.x - 0.6, t.y), 5), pt(t.x + 0.6, t.y), ...bezier(pt(t.x + 0.6, t.y), pt(m.x + 1.8, m.y), pt(bb.x + 0.8, bb.y), 5)];
    pen.fill(s, mix(color, LIGHT, 0.15), 1);
    pen.fill(s.map((p) => pt(p.x + 0.5, p.y)), mix(color, SHADOW, 0.35), 0.45);
    pen.hair(closed(s), 0.35, d.ink, 0.7);
  }
  flat(d, foot, color, { tone: 0.1, line: 0.45 });
  flat(d, rail, mix(color, LIGHT, 0.2), { tone: -0.05, line: 0.45 });
  pen.hair([at(u0, v + h - 0.4), at(u1, v + h - 0.4)], 0.6, PAPER_FILL, 0.7);
}

/** A triangular pediment on a front face over u0..u1 at height v: raking cornices, a shaded tympanum and a Crown device in it. */
export function pediment(d: Draw, at: Surface, u0: number, u1: number, v: number, rise: number, color: string, device = true): Pt {
  const { pen } = d;
  const m = (u0 + u1) / 2;
  const outer = crisp([at(u0 - 2, v), at(u1 + 2, v), at(m, v + rise + 2)], 3);
  flat(d, outer, mix(color, LIGHT, 0.2), { tone: 0, line: 0.6 });
  const inner = crisp([at(u0 + 5, v + 2), at(u1 - 5, v + 2), at(m, v + rise - 2.2)], 3);
  flat(d, inner, color, { tone: 0.2, line: 0.5 });
  pen.crescent(inner, pt(0, 3), () => pen.fill(inner, SHADOW, 0.3));
  if (device) {
    const c = at(m, v + 2 + (rise - 4) * 0.36);
    shield(d, c, Math.min(5.5, rise * 0.24));
    for (const s of [-1, 1]) {
      const leafs = Array.from({ length: 4 }, (_, i) => at(m + s * (8 + i * 4.5), v + 3.4 + i * 0.4));
      for (const p of leafs) pen.fill(blob(p, 2.4, 1.1, d.pen.rng, 0.2, 10, s * -0.3), GOLD, 0.85);
    }
  }
  return at(m, v + rise + 2);
}

/** The Crown's shield: blue, a gilt border and crown. */
export function shield(d: Draw, c: Pt, s: number): void {
  const sh = [pt(c.x - s, c.y - s * 1.05), pt(c.x + s, c.y - s * 1.05), ...bezier(pt(c.x + s, c.y - s * 1.05), pt(c.x + s * 1.02, c.y + s * 0.7), pt(c.x, c.y + s * 1.25), 6).slice(1), ...bezier(pt(c.x, c.y + s * 1.25), pt(c.x - s * 1.02, c.y + s * 0.7), pt(c.x - s, c.y - s * 1.05), 6).slice(1, -1)];
  d.pen.fill(sh.map((p) => pt(p.x + 0.8, p.y + 0.8)), SHADOW, 0.3);
  paint(d, sh, BLUE, { shadow: 0.35, hatch: 0, line: 0.55 });
  d.pen.stroke(closed(sh.map((p) => lerp(p, c, 0.16))), 0.6, GOLD, 0.95, false);
  crown(d, pt(c.x, c.y - s * 0.05), s * 0.55);
}

/** A little gilt crown (the faction's device). */
export function crown(d: Draw, c: Pt, s: number): void {
  const k = [pt(c.x - s, c.y + s * 0.5), pt(c.x - s, c.y - s * 0.4), pt(c.x - s * 0.5, c.y), pt(c.x, c.y - s * 0.7), pt(c.x + s * 0.5, c.y), pt(c.x + s, c.y - s * 0.4), pt(c.x + s, c.y + s * 0.5)];
  d.pen.fill(k, GOLD, 1);
  d.pen.hair(closed(k), 0.35, mix(GOLD, SHADOW, 0.6), 0.9);
  for (const p of [k[1]!, k[3]!, k[5]!]) d.pen.dot(p.x, p.y - 0.3, Math.max(0.45, s * 0.16), GOLD, 1);
}

/** A flag on a pole from `foot`, `h` tall: gilt finial, Crown blue cloth with a gold stripe, rippling right. */
export function flag(d: Draw, foot: Pt, h: number, len: number, wave = 0, swallow = true): void {
  const { pen } = d;
  const top = pt(foot.x, foot.y - h);
  pen.stroke([foot, top], 1, d.ink, 0.95, false);
  pen.hair([pt(foot.x - 0.3, foot.y), pt(top.x - 0.3, top.y)], 0.35, PAPER_FILL, 0.6);
  const w = len * 0.55;
  const y0 = top.y + 1.5;
  const f = (s: number, y: number): Pt => pt(top.x + len * s, y + Math.sin(s * Math.PI * 1.6 + wave) * len * 0.08 * s);
  const upper = Array.from({ length: 9 }, (_, i) => f(i / 8, y0));
  const lower = Array.from({ length: 9 }, (_, i) => f(i / 8, y0 + w)).reverse();
  const tail = swallow ? [f(0.78, y0 + w * 0.5)] : [];
  const cloth = [...upper, ...tail, ...lower];
  paint(d, cloth, BLUE, { shadow: 0.45, hatch: 0.12, line: 0.55 });
  pen.clipped(cloth, () => {
    for (let i = 0; i < 3; i++) {
      const s = 0.2 + i * 0.28;
      pen.fill([f(s, y0 - 1), f(s + 0.1, y0 - 1), f(s + 0.1, y0 + w + 1), f(s, y0 + w + 1)], SHADOW, 0.18);
    }
    pen.stroke(Array.from({ length: 9 }, (_, i) => f(i / 8, y0 + w * 0.5)), w * 0.18, GOLD, 0.9, false);
  });
  pen.dot(top.x, top.y - 0.8, 1.5, GOLD, 1);
  pen.dot(top.x - 0.5, top.y - 1.3, 0.5, PAPER_FILL, 0.85);
}

/** A long banner hung on a face from a gilt rod at (u, v) down `len`: Crown blue, gold border, a crown, a pointed foot. */
export function banner(d: Draw, at: Surface, u: number, v: number, w: number, len: number): void {
  const { pen } = d;
  const cloth = crisp([at(u, v), at(u + w, v), at(u + w, v - len + w * 0.35), at(u + w / 2, v - len), at(u, v - len + w * 0.35)], 2);
  pen.fill(cloth.map((p) => pt(p.x + 2, p.y + 1.6)), SHADOW, 0.22);
  paint(d, cloth, BLUE, { shadow: 0.35, hatch: 0, line: 0.55 });
  pen.clipped(cloth, () => {
    for (const s of [0.3, 0.7]) pen.fill(crisp(quad(at, u + w * s, v - len, u + w * s + w * 0.12, v), 2), SHADOW, 0.2);
    for (const s of [0.18, 0.58]) pen.fill(crisp(quad(at, u + w * s, v - len, u + w * s + w * 0.08, v), 2), LIGHT, 0.18);
  });
  pen.stroke(closed(cloth.map((p) => lerp(p, at(u + w / 2, v - len * 0.45), 0.14))), 0.8, GOLD, 0.95, false);
  crown(d, at(u + w / 2, v - len * 0.32), w * 0.24);
  const rod = crisp(quad(at, u - 1.6, v, u + w + 1.6, v + 1.4), 2);
  pen.fill(rod, GOLD, 1);
  pen.hair(closed(rod), 0.4, d.ink, 0.8);
  for (const k of [u - 1.8, u + w + 1.8]) { const p = at(k, v + 0.7); pen.dot(p.x, p.y, 1.2, GOLD, 1); }
}

/** A standing figure on a pedestal (a knight of the Crown, a winged herald): a spear raised, a shield at the side, robed. */
export function statue(d: Draw, foot: Pt, h: number, color: string, winged = false, flip = 1): void {
  const { pen } = d;
  const s = h / 22;
  const Q = (x: number, y: number): Pt => pt(foot.x + x * s * flip, foot.y - y * s);
  const ped = crisp([Q(-3.2, 0), Q(3.2, 0), Q(3.2, 4.4), Q(-3.2, 4.4)], 1.5);
  flat(d, ped, color, { tone: 0.08, line: 0.45 });
  flat(d, crisp([Q(-3.8, 4.4), Q(3.8, 4.4), Q(3.8, 5.4), Q(-3.8, 5.4)], 1.5), mix(color, LIGHT, 0.3), { tone: -0.1, line: 0.4 });
  if (winged) {
    for (const k of [-1, 1]) {
      const wing = [Q(k * 0.6, 15.5), ...bezier(Q(k * 0.6, 15.5), Q(k * 7.5, 22), Q(k * 6.4, 9.5), 7).slice(1), ...bezier(Q(k * 6.4, 9.5), Q(k * 3.4, 11.4), Q(k * 1, 12.6), 4).slice(1)];
      paint(d, wing, mix(color, LIGHT, k < 0 ? 0.25 : 0.05), { shadow: 0.4, hatch: 0, line: 0.4 });
      for (let i = 1; i < 4; i++) pen.hair([Q(k * (1 + i * 1.2), 14 - i * 0.6), Q(k * (2.4 + i * 1.3), 18 - i * 2.4)], 0.3, mix(color, SHADOW, 0.5), 0.6);
    }
  }
  const robe = [Q(-2.9, 5.4), ...bezier(Q(-2.9, 5.4), Q(-1.2, 5), Q(2.9, 5.4), 4).slice(1), Q(2.1, 10.5), Q(2.4, 14.6), Q(1.2, 15.6), Q(-1.2, 15.6), Q(-2.4, 14.6), Q(-1.9, 10.5)];
  paint(d, robe, color, { shadow: 0.6, hatch: 0.18, line: 0.45 });
  for (const x of [-1.2, 0.3, 1.5]) pen.hair([Q(x * 0.8, 10), Q(x, 5.8)], 0.3, mix(color, SHADOW, 0.6), 0.6);
  pen.hair([Q(-2, 10.6), Q(2.1, 10.4)], 0.4, mix(color, SHADOW, 0.6), 0.7);
  const head = blob(Q(0, 17.3), 1.45 * s, 1.6 * s, pen.rng, 0.04, 12);
  paint(d, head, color, { shadow: 0.55, hatch: 0, line: 0.45 });
  pen.stroke([Q(2, 14.6), Q(3.1, 16.4), Q(3.6, 18.6)], 1.15 * s, color, 1, false);
  pen.stroke([Q(3.6, 5.4), Q(3.6, 25)], 0.6, d.ink, 0.95, false);
  pen.fill([Q(3.6, 27.4), Q(4.4, 25), Q(3.6, 24.4), Q(2.8, 25)], d.ink, 0.9);
  const sh = blob(Q(-2.6, 10.4), 1.9 * s, 2.5 * s, pen.rng, 0.03, 12);
  paint(d, sh, color === GOLD ? GOLD : mix(color, BLUE, 0.35), { shadow: 0.5, hatch: 0, gloss: true, line: 0.45 });
}

/** An urn on a parapet: a footed vase, its lid knobbed. */
export function urn(d: Draw, foot: Pt, h: number, color: string): void {
  const s = h / 10;
  const P0 = (x: number, y: number): Pt => pt(foot.x + x * s, foot.y - y * s);
  const v = [P0(-1.4, 0), P0(1.4, 0), P0(0.7, 1.4), ...bezier(P0(0.7, 1.4), P0(3.8, 3.6), P0(1.8, 6.6), 6).slice(1), P0(2.4, 7.2), P0(-2.4, 7.2), ...bezier(P0(-1.8, 6.6), P0(-3.8, 3.6), P0(-0.7, 1.4), 6)];
  paint(d, v, color, { shadow: 0.55, hatch: 0, line: 0.45 });
  d.pen.dot(P0(0, 8.4).x, P0(0, 8.4).y, 1.1 * s, color, 1);
  d.pen.circle(P0(0, 8.4).x, P0(0, 8.4).y, 1.1 * s, 0.35, d.ink);
}

/** A ground patch of worn earth and stone setts under a building's front, laid outside its silhouette. */
export function apron(d: Draw, rng: Rng, x0: number, x1: number, depth: number, color = '#877759'): void {
  const shape = blob(pt((x0 + x1) / 2, depth * 0.3), (x1 - x0) / 2, depth, rng, 0.06, 30);
  dab(d, shape, color, 0.55, 2.5);
  d.pen.clipped(shape, () => {
    for (let i = 0; i < (x1 - x0) * 0.6; i++) {
      const c = pt(x0 + rng() * (x1 - x0), -depth * 0.5 + rng() * depth * 1.4);
      const s = blob(c, 1.6 + rng(), 0.9 + rng() * 0.4, rng, 0.2, 8);
      d.pen.fill(s, rng() < 0.5 ? mix(color, LIGHT, 0.4) : mix(color, SHADOW, 0.25), 0.4);
    }
  });
  pool(d, shape, color, depth, 0.15);
}

/** The building's shadow along the ground: its footprint pushed right and towards the viewer, softened. */
export function groundCast(d: Draw, x0: number, x1: number, z0: number, z1: number, reach: number, alpha = 0.22): void {
  const s = [P(x0, z1), P(x1, z1), P(x1 + reach, z1 - reach * 0.5), P(x1 + reach, z0 - reach * 0.35), P(x1, z0 - 1), P(x0, z0 - 1)];
  soft(d.pen.ctx, 4, () => d.pen.fill(s, SHADOW, alpha));
}

/** Quoins up a corner at `u`: long and short dressed stones, lighter than the walling, running out to the `dir` side. */
export function quoins(d: Draw, at: Surface, u: number, h: number, dir: 1 | -1, color: string, course = 6.4, long = 10): void {
  for (let v = 0, k = 0; v + course <= h + 0.1; v += course, k++) {
    const w = k % 2 ? long * 0.6 : long;
    const q = crisp(quad(at, dir > 0 ? u : u - w, v + 0.3, dir > 0 ? u + w : u, v + course - 0.3), 2);
    flat(d, q, mix(color, LIGHT, 0.32), { tone: -0.06, line: 0.42 });
    d.pen.hair([at(dir > 0 ? u + 0.6 : u - w + 0.6, v + course - 0.9), at(dir > 0 ? u + w - 0.6 : u - 0.6, v + course - 0.9)], 0.5, PAPER_FILL, 0.5);
  }
}

/** A clock face in a stone ring: a gilt bezel, Crown-blue dial, gilt hour marks and hands at ten past ten. */
export function clock(d: Draw, c: Pt, r: number, stone: string): void {
  const { pen } = d;
  const ring = Array.from({ length: 32 }, (_, i) => pt(c.x + Math.cos((i / 32) * Math.PI * 2) * (r + 2.6), c.y + Math.sin((i / 32) * Math.PI * 2) * (r + 2.6)));
  pen.fill(ring.map((p) => pt(p.x + 1.2, p.y + 1.4)), SHADOW, 0.3);
  paint(d, ring, mix(stone, LIGHT, 0.3), { shadow: 0.3, hatch: 0, line: 0.55 });
  const dial = ring.map((p) => lerp(c, p, r / (r + 2.6)));
  paint(d, dial, BLUE, { shadow: 0.45, hatch: 0, line: 0.5 });
  pen.stroke(closed(dial.map((p) => lerp(c, p, 0.9))), 0.6, GOLD, 0.9, false);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const k = i % 3 === 0 ? 0.62 : 0.72;
    pen.stroke([pt(c.x + Math.cos(a) * r * k, c.y + Math.sin(a) * r * k), pt(c.x + Math.cos(a) * r * 0.84, c.y + Math.sin(a) * r * 0.84)], i % 3 === 0 ? 0.9 : 0.6, GOLD, 1, false);
  }
  pen.stroke([c, pt(c.x - r * 0.42, c.y - r * 0.24)], 1, GOLD, 1, false);
  pen.stroke([c, pt(c.x + r * 0.5, c.y - r * 0.32)], 0.8, GOLD, 1, false);
  pen.dot(c.x, c.y, 1, GOLD, 1);
  gleam(d, Array.from({ length: 6 }, (_, i) => pt(c.x + Math.cos(3.6 + i * 0.16) * r * 0.8, c.y + Math.sin(3.6 + i * 0.16) * r * 0.8)), 0.8, 0.5);
}

/** A small pinnacle at a corner: a square shaft, a pointed cap and a gilt knob. */
export function pinnacle(d: Draw, rng: Rng, x: number, z: number, h: number, w: number, tall: number, stone: string, cap: string): void {
  slab(d, box(x - w / 2, x + w / 2, z - w / 2, z + w / 2, h, h + tall * 0.45), stone, { line: 0.45 });
  const apex = P(x, z, h + tall);
  const b = h + tall * 0.45;
  plane(d, rng, P(x - w / 2 - 0.6, z - w / 2, b), P(x + w / 2 + 0.6, z - w / 2, b), apex, apex, cap, 0.04, { row: 2.4, tab: 2.4 });
  plane(d, rng, P(x + w / 2 + 0.6, z - w / 2, b), P(x + w / 2 + 0.6, z + w / 2, b), apex, apex, cap, 0.45, { row: 2.4, tab: 2.4 });
  d.pen.dot(apex.x, apex.y - 0.8, 1.2, GOLD, 1);
}
