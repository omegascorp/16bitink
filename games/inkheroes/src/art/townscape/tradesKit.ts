import type { Rng } from '../../logic/rng';
import { bezier, closed, oval, pt, type Draw } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { deepen, MOSS, mossFoot } from './light';
import { ashlar, beam, boards, DEPTH, frontOf, HOLE, P, quad, roundWash, shingles, sideOf, TIMBER_DARK, type Box, type Surface } from '../sites/build';
import { IRON } from '../sites/parts';
import { blob, boundsOf, boxOf, crisp, dab, flat, LIGHT, mix, paint, rgba, SHADOW, shift, soft } from '../sites/paintKit';
import { townSprite } from './townSprite';
import { SLOTS, type TownDrawer } from './types';

/**
 * The trade buildings' shared kit: the map's building parts (sites/build.ts)
 * re-tuned for the townscape, which is seen about twice as close, so
 * stones, boards and shingles are drawn bigger while the pen stays fine;
 * plus the things that stand about them (windows, doors, barrels, crates,
 * sacks, fruit) and what drifts over them (smoke).
 */
export const OAK = '#4e3420';
export const PLASTER = '#a8895a';
export const STRAW = '#967840';
export const EARTH = '#76604a';
export const CANVAS = '#b4a484';
export const RED = '#7e2420';
export const OCHRE = '#9a7232';
export const STEEL = '#7e828c';
export const WARM = '#f6b04a';

export type Tex = 'stone' | 'plank' | 'plaster' | 'none';
export type Roofing = 'shingle' | 'slate' | 'thatch';

/** Limewash over wattle: soft patches warmer and cooler, a fine grit. */
export function plaster(d: Draw, rng: Rng, at: Surface, w: number, h: number, clip: readonly Pt[], color: string): void {
  d.pen.clipped(clip, () => {
    for (let i = 0; i < Math.round((w * h) / 260) + 2; i++) {
      dab(d, blob(at(rng() * w, rng() * h), 5 + rng() * 8, 3 + rng() * 5, rng), rng() < 0.5 ? mix(color, LIGHT, 0.6) : mix(color, '#77664c', 0.6), 0.2, 2);
    }
    d.pen.stipple(clip, Math.round(w * h * 0.06), () => 0.5, 0.38, mix(color, SHADOW, 0.35));
  });
}

/** Straw over a roof plane: courses up the slope with a shadowed lip, dense strokes laid down it, a thick eave. */
export function straw(d: Draw, rng: Rng, at: Surface, w: number, h: number, clip: readonly Pt[], color: string): void {
  const { pen } = d;
  pen.clipped(clip, () => {
    for (let v = 6; v < h; v += 7.5) {
      soft(pen.ctx, 1, () => pen.fill(quad(at, -2, v - 2.4, w + 2, v), mix(color, SHADOW, 0.5), 0.28));
      pen.hair([at(-1, v + 0.4), at(w + 1, v + 0.4)], 0.5, mix(color, LIGHT, 0.6), 0.5);
    }
    for (let i = 0; i < w * h * 0.3; i++) {
      const u = rng() * w;
      const v = rng() * h;
      const len = 2.5 + rng() * 3.5;
      pen.hair([at(u, v), at(u + (rng() - 0.5) * 0.9, v + len)], 0.42, rng() < 0.55 ? mix(color, SHADOW, 0.5) : mix(color, LIGHT, 0.55), 0.55);
    }
    pen.fill(quad(at, -2, -2, w + 2, 2.8), mix(color, SHADOW, 0.55), 0.5);
    pen.hair([at(-1, 2.8), at(w + 1, 2.8)], 0.5, d.ink, 0.5);
  });
}

/** One wall face washed, textured and lined at townscape scale; `tone` darkens it. */
export function face(d: Draw, rng: Rng, at: Surface, w: number, h: number, color: string, tex: Tex, tone: number): Pt[] {
  const shape = crisp(quad(at, 0, 0, w, h), 4);
  flat(d, shape, color, { tone: deepen(tone), hatch: tone > 0.2 ? 0.24 : 0, line: 0 });
  if (tex === 'stone') { ashlar(d, rng, at, w, h, shape, color, 5.2, 9.5); mossFoot(d, rng, at, w, h, shape); }
  if (tex === 'plank') boards(d, rng, at, w, h, shape, color, 4.4);
  if (tex === 'plaster') plaster(d, rng, at, w, h, shape, color);
  d.pen.clipped(shape, () => soft(d.pen.ctx, 2, () => d.pen.fill(quad(at, -2, -1, w + 2, Math.min(h * 0.3, 8)), mix(color, SHADOW, 0.5), 0.2)));
  d.pen.stroke(closed(shape), 0.75, d.ink, 0.85);
  return shape;
}

/** A box: its right side, front and (optionally) top, each washed for the light. */
export function solid(d: Draw, rng: Rng, b: Box, color: string, tex: Tex, top = false): { front: Pt[]; side: Pt[] } {
  const side = face(d, rng, sideOf(b), b.z1 - b.z0, b.h1 - b.h0, color, tex, 0.4);
  const front = face(d, rng, frontOf(b), b.x1 - b.x0, b.h1 - b.h0, color, tex, 0.06);
  if (top) flat(d, crisp([P(b.x0, b.z0, b.h1), P(b.x1, b.z0, b.h1), P(b.x1, b.z1, b.h1), P(b.x0, b.z1, b.h1)], 4), color, { tone: -0.3, line: 0.7 });
  return { front, side };
}

/** Weathering over a roof: soft patches of moss and of sun-bleached tiles, darker towards the eave. */
export function weather(d: Draw, rng: Rng, at: Surface, w: number, h: number, clip: readonly Pt[], color: string): void {
  d.pen.clipped(clip, () => {
    for (let i = 0; i < Math.round((w * h) / 320) + 2; i++) {
      const moss = rng() < 0.45;
      dab(d, blob(at(rng() * w, rng() * h * 0.7), 4 + rng() * 9, 2.5 + rng() * 4, rng, 0.3), moss ? mix(color, MOSS, 0.55) : mix(color, LIGHT, 0.45), moss ? 0.22 : 0.2, 2.2);
    }
    soft(d.pen.ctx, 2.5, () => d.pen.fill(quad(at, -2, -2, w + 2, Math.min(5, h * 0.2)), mix(color, SHADOW, 0.5), 0.18));
  });
}

export function roofPlane(d: Draw, rng: Rng, at: Surface, w: number, h: number, color: string, tone: number, kind: Roofing): Pt[] {
  const shape = crisp(quad(at, 0, 0, w, h), 4);
  flat(d, shape, color, { tone: deepen(tone), hatch: tone > 0.2 ? 0.24 : 0, line: 0 });
  if (kind === 'thatch') {
    straw(d, rng, at, w, h, shape, color);
    beam(d, at(-0.5, 1.4), at(w + 0.5, 1.4), 3.4, mix(color, SHADOW, 0.18), 0.6);
  }
  else {
    const row = kind === 'slate' ? 3.8 : 4.4;
    shingles(d, rng, at, w, h, shape, color, row, kind === 'slate' ? 4.6 : 5.4);
    // The shadow each course's lip throws on the one below.
    d.pen.clipped(shape, () => {
      for (let v = row; v < h; v += row) d.pen.fill(quad(at, 0, v - 1.1, w, v), mix(color, SHADOW, 0.5), 0.16);
    });
  }
  weather(d, rng, at, w, h, shape, color);
  d.pen.stroke(closed(shape), 0.85, d.ink, 0.9);
  return shape;
}

export interface RoofOpts {
  /** Overhang at the eaves and verges. */
  readonly o?: number;
  /** Painted on the gable wall before the roof goes over it (timbers, a loft door). */
  readonly end?: (tri: Pt[], at: Surface) => void;
  /** Painted after the far slope and before the near one (a chimney through the roof). */
  readonly between?: () => void;
  /** Barge boards up the near gable's verges. */
  readonly barge?: string;
}

/**
 * A gabled roof over a box, as sites/build.ts's `gable` at townscape scale:
 * `along` 'x' runs the ridge across the view (the gable wall on the right),
 * 'z' runs it away (the gable wall facing the viewer).
 */
export function roof(d: Draw, rng: Rng, b: Box, rise: number, along: 'x' | 'z', color: string, kind: Roofing, wallColor: string, o: RoofOpts = {}): void {
  const h = b.h1;
  const ov = o.o ?? 3;
  const lift = (v: number): number => h - ov * 0.5 + v * (1 + (ov * 0.5) / rise);
  if (along === 'x') {
    const zm = (b.z0 + b.z1) / 2;
    const tri = crisp([P(b.x1, b.z0, h), P(b.x1, b.z1, h), P(b.x1, zm, h + rise)], 4);
    flat(d, tri, wallColor, { tone: deepen(0.42), hatch: 0.26 });
    o.end?.(tri, (u, v) => P(b.x1, b.z0 + u, h + v));
    const w = b.x1 - b.x0 + 2 * ov;
    roofPlane(d, rng, (u, v) => P(b.x0 - ov + u, b.z1 + ov - (v / rise) * (b.z1 + ov - zm), h + v), w, rise, color, -0.1, kind);
    o.between?.();
    roofPlane(d, rng, (u, v) => P(b.x0 - ov + u, b.z0 - ov + (v / rise) * (zm - b.z0 + ov), lift(v)), w, rise, color, 0.06, kind);
    if (o.barge) beam(d, P(b.x1 + ov, b.z0 - ov, h - ov * 0.5), P(b.x1 + ov, zm, h + rise + 0.6), 2.4, o.barge, 0.6);
    beam(d, P(b.x0 - ov, zm, h + rise + 0.6), P(b.x1 + ov, zm, h + rise + 0.6), 2.4, mix(color, SHADOW, 0.12), 0.7);
    return;
  }
  const xm = (b.x0 + b.x1) / 2;
  const tri = crisp([P(b.x0, b.z0, h), P(b.x1, b.z0, h), P(xm, b.z0, h + rise)], 4);
  flat(d, tri, wallColor, { tone: 0.06 });
  o.end?.(tri, (u, v) => P(b.x0 + u, b.z0, h + v));
  const depth = b.z1 - b.z0 + 2 * ov;
  roofPlane(d, rng, (u, v) => P(b.x0 - ov + (v / rise) * (xm - b.x0 + ov), b.z1 + ov - u, lift(v)), depth, rise, color, -0.12, kind);
  o.between?.();
  roofPlane(d, rng, (u, v) => P(b.x1 + ov - (v / rise) * (b.x1 + ov - xm), b.z0 - ov + u, lift(v)), depth, rise, color, 0.42, kind);
  if (o.barge) {
    const apex = P(xm, b.z0 - ov, h + rise + 0.8);
    beam(d, P(b.x0 - ov, b.z0 - ov, h - ov * 0.5), apex, 2.6, o.barge, 0.6);
    beam(d, apex, P(b.x1 + ov, b.z0 - ov, h - ov * 0.5), 2.6, mix(o.barge, SHADOW, 0.2), 0.6);
  }
}

/** Half-timbering on a face: posts at `us`, rails at `vs` (each from `u0` to `u1`), braces as [u0, v0, u1, v1]. */
export function timbers(d: Draw, at: Surface, u0: number, u1: number, us: readonly number[], vs: readonly number[], braces: readonly (readonly [number, number, number, number])[], color = TIMBER_DARK, w = 2.4): void {
  for (const [a, b, c, e] of braces) beam(d, at(a, b), at(c, e), w * 0.9, color, 0.45);
  for (const v of vs) beam(d, at(u0, v), at(u1, v), w, color, 0.5);
  for (const u of us) beam(d, at(u, vs[0] ?? 0), at(u, vs[vs.length - 1] ?? 0), w, color, 0.5);
}

export interface WindowOpts {
  readonly lit?: boolean;
  readonly shutter?: string;
  readonly sill?: string;
  /** Diamond leading in the glass. */
  readonly lead?: boolean;
  readonly cross?: boolean;
}

/** A casement window on a face: a shadowed reveal, warm-lit or dark glass, leading, a mullion and transom, a sill, shutters. */
export function casement(d: Draw, at: Surface, u: number, v: number, w: number, h: number, o: WindowOpts = {}): Pt[] {
  const { pen } = d;
  const ctx = pen.ctx;
  const glass = crisp(quad(at, u, v, u + w, v + h), 2);
  const b = boxOf(glass);
  pen.fill(crisp(quad(at, u - 0.8, v - 0.8, u + w + 0.8, v + h + 0.8), 2), mix(HOLE, SHADOW, 0.2), 0.9);
  pen.clipped(glass, () => {
    const g = ctx.createLinearGradient(b.x0, b.y0, b.x0 + b.w * 0.4, b.y0 + b.h);
    if (o.lit ?? true) {
      g.addColorStop(0, rgba('#fbe3a0', 0.95));
      g.addColorStop(0.55, rgba('#f2b257', 0.95));
      g.addColorStop(1, rgba('#c96f2e', 0.95));
    } else {
      g.addColorStop(0, rgba('#676877', 0.95));
      g.addColorStop(0.45, rgba('#343445', 0.95));
      g.addColorStop(1, rgba('#272331', 0.95));
    }
    ctx.fillStyle = g;
    ctx.fillRect(b.x0 - 1, b.y0 - 1, b.w + 2, b.h + 2);
    if (o.lead ?? true) {
      pen.hatch(glass, 2.6, 0.9, 0.3, { color: '#3f2313', alpha: 0.5 });
      pen.hatch(glass, 2.6, -0.9 + Math.PI, 0.3, { color: '#3f2313', alpha: 0.5 });
    }
    // The reveal's shadow across the head and down the left of the glass.
    soft(ctx, 0.6, () => pen.fill([at(u - 1, v + h + 1), at(u + w + 1, v + h + 1), at(u + w + 1, v + h - 1.6), at(u + 1.4, v + h - 1.6), at(u + 1.4, v - 1), at(u - 1, v - 1)], SHADOW, 0.38));
  });
  if (o.cross ?? true) {
    pen.stroke([at(u + w / 2, v), at(u + w / 2, v + h)], 1.1, TIMBER_DARK, 0.95, false);
    pen.stroke([at(u, v + h * 0.62), at(u + w, v + h * 0.62)], 0.9, TIMBER_DARK, 0.95, false);
  }
  pen.stroke(closed(glass), 0.85, d.ink, 0.9);
  if (o.sill) beam(d, at(u - 1.6, v - 0.9), at(u + w + 1.6, v - 0.9), 1.8, o.sill, 0.5);
  if (o.shutter) {
    for (const [a, c] of [[u - w * 0.45 - 0.8, u - 0.8], [u + w + 0.8, u + w * 1.45 + 0.8]] as const) {
      const leaf = crisp(quad(at, a, v, c, v + h), 2);
      flat(d, leaf, o.shutter, { tone: a < u ? 0 : 0.18, line: 0.6 });
      pen.clipped(leaf, () => {
        for (let k = a + 2.2; k < c; k += 2.2) pen.hair([at(k, v), at(k, v + h)], 0.35, mix(o.shutter!, SHADOW, 0.6), 0.6);
      });
      pen.stroke([at(a + 0.5, v + 1), at(c - 0.5, v + h - 1)], 0.6, mix(o.shutter, SHADOW, 0.6), 0.8, false);
    }
  }
  return glass;
}

/** A planked door on a face, round-headed if `arched`: boards, iron straps with their nails, a ring, the reveal's shadow. */
export function plankDoor(d: Draw, at: Surface, u: number, w: number, h: number, color = OAK, arched = true): Pt[] {
  const { pen } = d;
  const r = w / 2;
  const head = arched
    ? Array.from({ length: 11 }, (_, i) => {
      const a = Math.PI - (i / 10) * Math.PI;
      return at(u + r + Math.cos(a) * r, h - r + Math.sin(a) * r);
    })
    : [at(u, h), at(u + w, h)];
  const shape = [at(u, 0), ...head, at(u + w, 0)];
  flat(d, shape, color, { tone: 0.12, line: 0 });
  pen.clipped(shape, () => {
    for (let k = u + 2.6; k < u + w; k += 2.6) pen.hair([at(k, 0), at(k, h)], 0.4, mix(color, SHADOW, 0.6), 0.75);
    for (const v of [h * 0.22, h * 0.62]) {
      pen.stroke([at(u, v), at(u + w * 0.82, v)], 1.3, IRON, 0.95, false);
      for (let k = u + 1.2; k < u + w * 0.8; k += 2.4) pen.dot(at(k, v).x, at(k, v).y, 0.35, '#928473', 0.9);
    }
    soft(pen.ctx, 0.8, () => pen.fill([...head.map((p) => pt(p.x, p.y)), ...head.map((p) => pt(p.x + 0.4, p.y + 2.4)).reverse()], SHADOW, 0.4));
    soft(pen.ctx, 0.8, () => pen.fill([at(u, 0), at(u, h), at(u + 1.6, h), at(u + 1.6, 0)], SHADOW, 0.3));
  });
  const ring = at(u + w * 0.78, h * 0.45);
  pen.stroke(closed(oval(ring.x, ring.y + 1, 1.1, 1.3, 10)), 0.6, IRON, 1);
  pen.stroke(shape, 0.85, d.ink, 0.95, false);
  return shape;
}

/** An upright barrel standing on `foot`: bulging staves shaded round, iron hoops, the head on top. */
export function barrel(d: Draw, foot: Pt, r: number, h: number, color = OAK): void {
  const { pen } = d;
  const ry = r * DEPTH;
  const bulge = r * 0.14;
  const top = foot.y - h;
  const ell = (cy: number, rr: number, a0: number, a1: number, n = 12): Pt[] => Array.from({ length: n + 1 }, (_, i) => {
    const a = a0 + ((a1 - a0) * i) / n;
    return pt(foot.x + Math.cos(a) * rr, cy + Math.sin(a) * rr * DEPTH);
  });
  const left = bezier(pt(foot.x - r, foot.y), pt(foot.x - r - bulge * 2, foot.y - h / 2), pt(foot.x - r, top), 8);
  const right = bezier(pt(foot.x + r, top), pt(foot.x + r + bulge * 2, foot.y - h / 2), pt(foot.x + r, foot.y), 8);
  const body = [...left, ...ell(top, r, Math.PI, Math.PI * 2).slice(1, -1), ...right, ...ell(foot.y, r, 0, Math.PI).slice(1, -1)];
  roundWash(d, body, foot.x - r - bulge, foot.x + r + bulge, color, 0.22);
  pen.clipped(body, () => {
    for (let k = -3; k <= 3; k++) {
      const s = Math.sin((k / 4) * (Math.PI / 2));
      const x = foot.x + s * r;
      const yb = foot.y + Math.sqrt(Math.max(0, 1 - s * s)) * ry;
      pen.hair(bezier(pt(x, yb), pt(x + s * bulge * 2, foot.y - h / 2), pt(x, top + Math.sqrt(Math.max(0, 1 - s * s)) * ry), 6), 0.4, mix(color, SHADOW, 0.65), 0.6);
    }
    for (const t of [0.16, 0.36, 0.64, 0.84]) {
      const k = 1 + (bulge / r) * 2 * (1 - Math.abs(t - 0.5) * 2) * 0.75;
      pen.stroke(ell(foot.y - h * t, r * k, 0, Math.PI, 14), t === 0.36 || t === 0.64 ? 0.9 : 1.4, IRON, 0.95, false);
    }
  });
  const lid = ell(top, r * 0.94, 0, Math.PI * 2, 20);
  paint(d, lid, mix(color, '#987a4e', 0.45), { shadow: 0.3, hatch: 0, line: 0.5 });
  pen.clipped(lid, () => {
    for (let k = -2; k <= 2; k++) pen.hair([pt(foot.x + k * r * 0.36 - 1, top - ry), pt(foot.x + k * r * 0.36 + 1, top + ry)], 0.35, mix(color, SHADOW, 0.5), 0.6);
  });
  pen.stroke(closed(crisp(body, 3)), 0.8, d.ink, 0.95);
}

/** A slatted crate: plank faces, a dark gap between slats, a cross brace on the front. */
export function crate(d: Draw, rng: Rng, b: Box, color = '#806039', top = true): void {
  const { pen } = d;
  const { front, side } = solid(d, rng, b, color, 'none', top);
  const w = b.x1 - b.x0;
  const hgt = b.h1 - b.h0;
  const at = frontOf(b);
  for (const [shape, surf, len] of [[front, at, w], [side, sideOf(b), b.z1 - b.z0]] as const) {
    pen.clipped(shape, () => {
      for (let v = hgt / 3; v < hgt - 0.5; v += hgt / 3) pen.stroke([surf(0, v), surf(len, v)], 0.6, mix(color, SHADOW, 0.6), 0.85, false);
    });
  }
  pen.stroke([at(1, 1), at(w - 1, hgt - 1)], 1.1, mix(color, SHADOW, 0.35), 0.9, false);
  pen.stroke(closed(front), 0.6, d.ink, 0.9);
}

/** A grain sack sat on `foot`: a soft lumpy body, the neck gathered and tied. */
export function sack(d: Draw, rng: Rng, foot: Pt, r: number, color = '#897652'): void {
  const body = blob(pt(foot.x, foot.y - r * 0.95), r, r * 1.05, rng, 0.08, 20);
  const neck = [pt(foot.x - r * 0.35, foot.y - r * 1.8), pt(foot.x - r * 0.15, foot.y - r * 2.45), pt(foot.x + r * 0.25, foot.y - r * 2.5), pt(foot.x + r * 0.4, foot.y - r * 1.8)];
  paint(d, neck, color, { shadow: 0.4, hatch: 0, line: 0.55 });
  paint(d, body, color, { shadow: 0.55, hatch: 0.22, line: 0.7 });
  d.pen.clipped(body, () => d.pen.hatch(body, 1.1, 0.05, 0.25, { color: mix(color, SHADOW, 0.5), alpha: 0.25 }));
  d.pen.stroke([pt(foot.x - r * 0.38, foot.y - r * 1.82), pt(foot.x + r * 0.42, foot.y - r * 1.85)], 0.9, '#654c2a', 0.95, false);
  d.pen.hair([pt(foot.x - r * 0.2, foot.y - r * 1.6), pt(foot.x - r * 0.45, foot.y - r * 0.9)], 0.4, mix(color, SHADOW, 0.6), 0.7);
  d.pen.hair([pt(foot.x + r * 0.25, foot.y - r * 1.6), pt(foot.x + r * 0.55, foot.y - r * 0.6)], 0.4, mix(color, SHADOW, 0.6), 0.7);
}

/** One round fruit, glossy, with a highlight and (sometimes) a stalk. */
export function fruit(d: Draw, c: Pt, r: number, color: string, stalk = true): void {
  paint(d, oval(c.x, c.y, r, r * 0.94, 14), color, { shadow: 0.55, hatch: 0, line: 0.45, gloss: true });
  d.pen.dot(c.x - r * 0.35, c.y - r * 0.38, Math.max(0.35, r * 0.2), PAPER_FILL, 0.85);
  if (stalk) d.pen.hair([pt(c.x + r * 0.05, c.y - r * 0.8), pt(c.x + r * 0.3, c.y - r * 1.25)], 0.45, '#3f2b14', 0.9);
}

/** A heaped pyramid of fruit, `rows` deep, its base centred on `c`. */
export function heap(d: Draw, rng: Rng, c: Pt, rows: number, r: number, colors: readonly string[]): void {
  for (let i = 0; i < rows; i++) {
    const n = rows - i + 1;
    for (let j = 0; j < n; j++) {
      const color = colors[Math.floor(rng() * colors.length)]!;
      fruit(d, pt(c.x + (j - (n - 1) / 2) * r * 1.85 + (rng() - 0.5) * 0.5, c.y - r - i * r * 1.45), r * (0.9 + rng() * 0.15), mix(color, rng() < 0.5 ? LIGHT : SHADOW, rng() * 0.15), rng() < 0.6);
    }
  }
}

/** Chimney smoke from `from`: a column of overlapping puffs widening and thinning as it rises, bending `lean` units right over `rise`. */
export function smoke(d: Draw, rng: Rng, from: Pt, rise: number, lean: number, n = 11): void {
  const { pen } = d;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const c = pt(from.x + lean * t * t * (0.8 + rng() * 0.4) + Math.sin(t * 5) * 1.5, from.y - 2 - t * rise);
    const r = 2.2 + t * 5.2;
    const s = blob(c, r * 1.3, r * 0.95, rng, 0.25, 16, -0.3 * t);
    const color = mix('#786e77', PAPER_FILL, 0.1 + t * 0.45);
    soft(pen.ctx, 0.9 + t * 1.8, () => pen.fill(s, color, 0.62 - t * 0.42));
    pen.clipped(s, () => soft(pen.ctx, r * 0.3, () => pen.fill(shift(s, -r * 0.4, -r * 0.45), mix(LIGHT, PAPER_FILL, 0.4), 0.3 - t * 0.2)));
    if (i % 3 === 1) pen.hair(s.slice(8, 15), 0.45, d.ink, 0.3 - t * 0.2);
  }
}

/** Worn earth round a building's footprint: a soft patch, grit and a few pebbles. */
export function earth(d: Draw, rng: Rng, shape: readonly Pt[], color = EARTH, alpha = 0.6): void {
  const { pen } = d;
  soft(pen.ctx, 3, () => pen.fill(shape, color, alpha));
  const b = boxOf(shape);
  pen.stipple(shape, Math.round(b.w * b.h * 0.05), () => 0.5, 0.45, mix(color, SHADOW, 0.45));
  for (let i = 0; i < Math.round(b.w / 14); i++) {
    const c = pt(b.x0 + rng() * b.w, b.y0 + b.h * (0.3 + rng() * 0.6));
    const s = blob(c, 1.4 + rng() * 1.4, 0.9 + rng() * 0.7, rng, 0.2, 9);
    paint(d, s, mix('#796b58', SHADOW, 0.05 + rng() * 0.15), { shadow: 0.5, hatch: 0, line: 0.4 });
  }
}

/** Grass tufts along a line at the foot of something. */
export function tufts(d: Draw, rng: Rng, x0: number, x1: number, y: number, n: number, scale = 1.4): void {
  for (let i = 0; i < n; i++) {
    const x = x0 + rng() * (x1 - x0);
    const yy = y + (rng() - 0.5) * 2;
    for (let k = -2; k <= 2; k++) d.pen.stroke([pt(x + k * 0.8, yy + rng() * 0.6), pt(x + k * 2 * scale + (rng() - 0.5), yy - (3 + rng() * 3) * scale)], 0.55, rng() < 0.5 ? '#4d6634' : '#365930', 0.95, false);
  }
}

/** The soft shadow a building throws down and right across the ground, from its footprint's right side. */
export function throwShadow(d: Draw, x1: number, z0: number, z1: number, len: number, alpha = 0.22): void {
  soft(d.pen.ctx, 4, () => d.pen.fill([P(x1, z0 + 2), P(x1 + len, z0 + len * 0.15), P(x1 + len, z1 - len * 0.3), P(x1, z1)], SHADOW, alpha));
}

/** `shape` turned by `ang` about `c`. */
export function turn(shape: readonly Pt[], c: Pt, ang: number): Pt[] {
  const [co, si] = [Math.cos(ang), Math.sin(ang)];
  return shape.map((p) => pt(c.x + (p.x - c.x) * co - (p.y - c.y) * si, c.y + (p.x - c.x) * si + (p.y - c.y) * co));
}

/** A kite shield, its top centre at `c`, `w` across: a field, a gilt rim, and a charge (a cross or a chevron). */
export function kiteShield(d: Draw, c: Pt, w: number, field: string, charge: string, kind: 'cross' | 'chevron', ang = 0): void {
  const h = w * 1.45;
  const raw = [
    ...bezier(pt(c.x - w / 2, c.y), pt(c.x, c.y - w * 0.12), pt(c.x + w / 2, c.y), 6),
    ...bezier(pt(c.x + w / 2, c.y), pt(c.x + w * 0.5, c.y + h * 0.55), pt(c.x, c.y + h), 8).slice(1),
    ...bezier(pt(c.x, c.y + h), pt(c.x - w * 0.5, c.y + h * 0.55), pt(c.x - w / 2, c.y), 8).slice(1, -1),
  ];
  const shape = turn(raw, c, ang);
  paint(d, shape, field, { shadow: 0.45, hatch: 0.18, line: 0.75 });
  const t = (pts: readonly Pt[]): Pt[] => turn(pts, c, ang);
  d.pen.clipped(shape, () => {
    if (kind === 'cross') {
      d.pen.fill(t([pt(c.x - w * 0.09, c.y - 2), pt(c.x + w * 0.09, c.y - 2), pt(c.x + w * 0.09, c.y + h), pt(c.x - w * 0.09, c.y + h)]), charge, 0.95);
      d.pen.fill(t([pt(c.x - w, c.y + h * 0.3), pt(c.x + w, c.y + h * 0.3), pt(c.x + w, c.y + h * 0.42), pt(c.x - w, c.y + h * 0.42)]), charge, 0.95);
    } else {
      d.pen.fill(t([pt(c.x - w, c.y + h * 0.62), pt(c.x, c.y + h * 0.22), pt(c.x + w, c.y + h * 0.62), pt(c.x + w, c.y + h * 0.8), pt(c.x, c.y + h * 0.4), pt(c.x - w, c.y + h * 0.8)]), charge, 0.95);
    }
    soft(d.pen.ctx, w * 0.12, () => d.pen.fill(t([pt(c.x + w * 0.1, c.y - 2), pt(c.x + w, c.y - 2), pt(c.x + w, c.y + h), pt(c.x, c.y + h)]), SHADOW, 0.22));
  });
  d.pen.stroke(closed(shape), 0.9, CROWN_GOLD_RIM, 0.95);
  d.pen.stroke(closed(shape), 0.5, d.ink, 0.6);
}

const CROWN_GOLD_RIM = '#98751a';

/** A wrought-iron curl (a sign bracket's scroll). */
export function scroll(d: Draw, c: Pt, r: number, turn = 1): void {
  const pts = Array.from({ length: 16 }, (_, i) => {
    const t = i / 15;
    const a = turn * t * Math.PI * 1.6;
    const rr = r * (1 - t * 0.75);
    return pt(c.x + Math.cos(a) * rr, c.y + Math.sin(a) * rr);
  });
  d.pen.stroke(pts, 0.8, IRON, 0.95, false);
}

export type Painter = (d: Draw, rng: Rng) => void;

/** A building's painter finished as a sprite in its slot's frame; what it paints in the air is kept inside the frame too. */
export function paintIn(slot: keyof typeof SLOTS, draw: Painter, ground?: Painter, air?: Painter, line = 1.3): TownDrawer {
  const bounds = boundsOf(SLOTS[slot].frame);
  const framed = (paint?: Painter): Painter | undefined => paint && ((d, rng) => {
    const ctx = d.pen.ctx;
    ctx.save();
    ctx.beginPath();
    ctx.rect(bounds.x0, bounds.y0, bounds.x1 - bounds.x0, bounds.y1 - bounds.y0);
    ctx.clip();
    paint(d, rng);
    ctx.restore();
  });
  return (ctx, seed) => townSprite(ctx, seed, 0, { bounds, line, ground: framed(ground), air: framed(air) }, draw);
}
