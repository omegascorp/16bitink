import type { Rng } from '../../logic/rng';
import { bezier, closed, pt, type Draw } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { boxOf, crisp, flat, LIGHT, mix, paint, pool, rgba, run, SHADOW, soft } from './paintKit';

/**
 * Building parts for the sites, in the map's slightly top-down 3/4 view: x
 * runs right, z back (away from the viewer, up the screen, foreshortened
 * and skewed a little right so a box shows its front, its top and its
 * right side) and h up. The light is at the upper left: tops and left
 * slopes lit, fronts in half-light, right sides in hatched shade.
 */
export const DEPTH = 0.6;
export const SKEW = 0.16;
export const P = (x: number, z: number, h = 0): Pt => pt(x + z * SKEW, -z * DEPTH - h);

export const STONE = '#c8bea8';
export const STONE_WARM = '#cdb894';
export const MORTAR = '#8f8676';
export const TIMBER = '#8a6440';
export const TIMBER_DARK = '#5a3d26';
export const PLANK = '#a88358';
export const HOLE = '#2b2738';
export const CROWN_BLUE = '#2f55a8';
export const CROWN_GOLD = '#c99a2e';
export const SHINGLE = '#8d5a3e';
export const THATCH = '#c8a65e';

export interface Box {
  readonly x0: number;
  readonly x1: number;
  readonly z0: number;
  readonly z1: number;
  readonly h0: number;
  readonly h1: number;
}

/** A point on a face: `u` along it, `v` up it, in units. */
export type Surface = (u: number, v: number) => Pt;

export const frontOf = (b: Box): Surface => (u, v) => P(b.x0 + u, b.z0, b.h0 + v);
export const sideOf = (b: Box): Surface => (u, v) => P(b.x1, b.z0 + u, b.h0 + v);
export const quad = (at: Surface, u0: number, v0: number, u1: number, v1: number): Pt[] => [at(u0, v0), at(u1, v0), at(u1, v1), at(u0, v1)];

export type Texture = 'stone' | 'plank' | 'plaster' | 'none';

/** One wall face washed, textured and lined; `tone` darkens it (the right side is turned from the light). */
export function wall(d: Draw, rng: Rng, at: Surface, w: number, h: number, color: string, tex: Texture, tone: number): Pt[] {
  const shape = crisp(quad(at, 0, 0, w, h), 3);
  flat(d, shape, color, { tone, hatch: tone > 0.2 ? 0.3 : 0, line: 0 });
  if (tex === 'stone') ashlar(d, rng, at, w, h, shape, color);
  if (tex === 'plank') boards(d, rng, at, w, h, shape, color);
  if (tex === 'plaster') d.pen.clipped(shape, () => d.pen.stipple(shape, Math.round(w * h * 0.12), () => 0.5, 0.4, mix(color, SHADOW, 0.4)));
  // Grime settling at the foot of the wall.
  d.pen.clipped(shape, () => soft(d.pen.ctx, 1.4, () => d.pen.fill(quad(at, -2, -1, w + 2, Math.min(h * 0.3, 5)), mix(color, SHADOW, 0.5), 0.22)));
  d.pen.stroke(closed(shape), 0.6, d.ink, 0.85);
  return shape;
}

/** A box: its right side, front and top, each washed for the light. */
export function block(d: Draw, rng: Rng, b: Box, color: string, tex: Texture, top = true): { front: Pt[]; side: Pt[] } {
  const side = wall(d, rng, sideOf(b), b.z1 - b.z0, b.h1 - b.h0, color, tex, 0.38);
  const front = wall(d, rng, frontOf(b), b.x1 - b.x0, b.h1 - b.h0, color, tex, 0.06);
  if (top) flat(d, crisp([P(b.x0, b.z0, b.h1), P(b.x1, b.z0, b.h1), P(b.x1, b.z1, b.h1), P(b.x0, b.z1, b.h1)], 3), color, { tone: -0.3 });
  return { front, side };
}

/** Coursed stonework over a face: each stone tinted a little apart, a dark joint under and right of it, a lit arris above. */
export function ashlar(d: Draw, rng: Rng, at: Surface, w: number, h: number, clip: readonly Pt[], color: string, course = 4.2, stone = 7): void {
  const { pen } = d;
  pen.clipped(clip, () => {
    let row = 0;
    for (let v = 0; v < h; v += course, row++) {
      let u = row % 2 === 0 ? -rng() * stone * 0.5 : -stone * 0.5 - rng() * 2;
      while (u < w) {
        const u1 = u + stone * (0.7 + rng() * 0.6);
        const v1 = Math.min(h, v + course);
        const r = rng();
        if (r < 0.45) pen.fill(quad(at, u + 0.3, v + 0.3, u1 - 0.3, v1 - 0.3), r < 0.2 ? mix(color, LIGHT, 0.6) : mix(color, '#7d6e58', 0.5), 0.14 + rng() * 0.12);
        pen.hair([at(u + 0.4, v + 0.15), at(u1 - 0.2, v + 0.15)], 0.42, d.ink, 0.38);
        pen.hair([at(u1, v + 0.2), at(u1, v1 - 0.2)], 0.42, d.ink, 0.42);
        pen.hair([at(u + 0.5, v1 - 0.45), at(u1 - 0.6, v1 - 0.45)], 0.4, PAPER_FILL, 0.3);
        u = u1;
      }
    }
  });
}

/** Upright boards over a face: their joints, a little grain and a nail head or two. */
export function boards(d: Draw, rng: Rng, at: Surface, w: number, h: number, clip: readonly Pt[], color: string, width = 3.2): void {
  const { pen } = d;
  pen.clipped(clip, () => {
    for (let u = 0; u < w; u += width) {
      if (rng() < 0.4) pen.fill(quad(at, u, 0, u + width, h), rng() < 0.5 ? mix(color, LIGHT, 0.5) : mix(color, SHADOW, 0.4), 0.14);
      pen.hair([at(u, 0), at(u, h)], 0.45, d.ink, 0.55);
      if (rng() < 0.6) pen.hair([at(u + width * 0.5, h * (0.1 + rng() * 0.3)), at(u + width * 0.45, h * (0.5 + rng() * 0.4))], 0.3, mix(color, SHADOW, 0.6), 0.45);
    }
  });
}

/** Shingles or slates over a roof plane: rows up the slope, staggered tabs, some tinted; `at(u, v)` runs along the eave and up. */
export function shingles(d: Draw, rng: Rng, at: Surface, w: number, h: number, clip: readonly Pt[], color: string, row = 3.2, tab = 3.4): void {
  const { pen } = d;
  pen.clipped(clip, () => {
    let k = 0;
    for (let v = 0; v < h; v += row, k++) {
      const off = (k % 2) * tab * 0.5;
      for (let u = -off; u < w; u += tab) {
        if (rng() < 0.3) pen.fill(quad(at, u + 0.2, v + 0.2, u + tab - 0.2, v + row), rng() < 0.5 ? mix(color, LIGHT, 0.45) : mix(color, SHADOW, 0.45), 0.2);
        pen.hair([at(u, v + 0.1), at(u, v + row * 0.75)], 0.38, d.ink, 0.4);
      }
      pen.hair([at(0, v), at(w, v)], 0.45, d.ink, 0.45);
      pen.hair([at(0, v + 0.5), at(w, v + 0.5)], 0.5, mix(color, SHADOW, 0.6), 0.3);
    }
  });
}

/** Straw over a roof plane: dense strokes down the slope, the eave cut in a darker band. */
export function thatch(d: Draw, rng: Rng, at: Surface, w: number, h: number, clip: readonly Pt[], color: string): void {
  const { pen } = d;
  pen.clipped(clip, () => {
    for (let i = 0; i < w * h * 0.25; i++) {
      const u = rng() * w;
      const v = rng() * h;
      pen.hair([at(u, v), at(u + (rng() - 0.5) * 0.6, v - 2 - rng() * 2)], 0.35, rng() < 0.5 ? mix(color, SHADOW, 0.5) : mix(color, LIGHT, 0.5), 0.6);
    }
    pen.fill(quad(at, -1, -1, w + 1, 1.6), mix(color, SHADOW, 0.5), 0.35);
  });
}

export type Roofing = 'shingle' | 'slate' | 'thatch';

function roofPlane(d: Draw, rng: Rng, at: Surface, w: number, h: number, color: string, tone: number, kind: Roofing): Pt[] {
  const shape = crisp(quad(at, 0, 0, w, h), 3);
  flat(d, shape, color, { tone, hatch: tone > 0.2 ? 0.28 : 0, line: 0 });
  if (kind === 'thatch') thatch(d, rng, at, w, h, shape, color);
  else shingles(d, rng, at, w, h, shape, color, kind === 'slate' ? 2.8 : 3.2, kind === 'slate' ? 3 : 3.6);
  d.pen.stroke(closed(shape), 0.65, d.ink, 0.9);
  return shape;
}

/**
 * A gabled roof over a box: `along` 'x' runs the ridge across the view (a
 * long front slope and the gable on the right); 'z' runs it away from the
 * viewer (the gable to the front, a lit left slope and a shaded right one).
 * The gable ends are wall, filled with `wallColor`.
 */
export function gable(d: Draw, rng: Rng, b: Box, rise: number, along: 'x' | 'z', color: string, kind: Roofing, wallColor: string, o = 2): void {
  const h = b.h1;
  if (along === 'x') {
    const zm = (b.z0 + b.z1) / 2;
    flat(d, crisp([P(b.x1, b.z0, h), P(b.x1, b.z1, h), P(b.x1, zm, h + rise)], 3), wallColor, { tone: 0.4, hatch: 0.3 });
    const back: Surface = (u, v) => P(b.x0 - o + u, b.z1 + o - (v / rise) * (b.z1 + o - zm), h + v);
    roofPlane(d, rng, back, b.x1 - b.x0 + 2 * o, rise, color, -0.1, kind);
    const front: Surface = (u, v) => P(b.x0 - o + u, b.z0 - o + (v / rise) * (zm - b.z0 + o), h - o * 0.5 + v * (1 + o * 0.5 / rise));
    roofPlane(d, rng, front, b.x1 - b.x0 + 2 * o, rise, color, 0.08, kind);
  } else {
    const xm = (b.x0 + b.x1) / 2;
    flat(d, crisp([P(b.x0, b.z0, h), P(b.x1, b.z0, h), P(xm, b.z0, h + rise)], 3), wallColor, { tone: 0.08 });
    const depth = b.z1 - b.z0 + 2 * o;
    const left: Surface = (u, v) => P(b.x0 - o + (v / rise) * (xm - b.x0 + o), b.z1 + o - u, h - o * 0.5 + v * (1 + o * 0.5 / rise));
    const right: Surface = (u, v) => P(b.x1 + o - (v / rise) * (b.x1 + o - xm), b.z0 - o + u, h - o * 0.5 + v * (1 + o * 0.5 / rise));
    roofPlane(d, rng, left, depth, rise, color, -0.12, kind);
    roofPlane(d, rng, right, depth, rise, color, 0.42, kind);
  }
}

/** A pyramid (hipped) roof over a box, its apex `rise` above the eaves. */
export function pyramid(d: Draw, rng: Rng, b: Box, rise: number, color: string, kind: Roofing, o = 2): Pt {
  const h = b.h1 - o * 0.5;
  const [x0, x1, z0, z1] = [b.x0 - o, b.x1 + o, b.z0 - o, b.z1 + o];
  const apex = P((b.x0 + b.x1) / 2, (b.z0 + b.z1) / 2, b.h1 + rise);
  const tri = (a: Pt, c: Pt, tone: number): void => {
    const shape = crisp([a, c, apex], 3);
    flat(d, shape, color, { tone, hatch: tone > 0.2 ? 0.3 : 0, line: 0 });
    const at: Surface = (u, v) => {
      const t = v / rise;
      const base = pt(a.x + (c.x - a.x) * u, a.y + (c.y - a.y) * u);
      return pt(base.x + (apex.x - base.x) * t, base.y + (apex.y - base.y) * t);
    };
    const span = Math.hypot(c.x - a.x, c.y - a.y);
    shingles(d, rng, (u, v) => at(u / span, v), span, rise, shape, color, kind === 'slate' ? 2.6 : 3.2, 3);
    d.pen.stroke(closed(shape), 0.65, d.ink, 0.9);
  };
  tri(P(x0, z1, h), P(x0, z0, h), -0.2);
  tri(P(x1, z0, h), P(x1, z1, h), 0.45);
  tri(P(x0, z0, h), P(x1, z0, h), 0.05);
  return apex;
}

/** The front arc of a level circle on the ground plan, as screen points, left to right. */
export function frontArc(cx: number, cy: number, r: number, n = 14): Pt[] {
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = (i / n) * Math.PI;
    return pt(cx - r * Math.cos(t), cy + r * DEPTH * Math.sin(t));
  });
}

export function backArc(cx: number, cy: number, r: number, n = 14): Pt[] {
  return frontArc(cx, cy, r, n).map((p) => pt(p.x, cy - (p.y - cy))).reverse();
}

/** A horizontal wash across a round thing: lit a third of the way in, shaded at the right, a little bounce at the very edge. */
export function roundWash(d: Draw, shape: readonly Pt[], x0: number, x1: number, color: string, hatch = 0.3): void {
  const { pen } = d;
  const ctx = pen.ctx;
  const b = boxOf(shape);
  pen.fill(shape, PAPER_FILL, 1);
  pen.clipped(shape, () => {
    const g = ctx.createLinearGradient(x0, 0, x1, 0);
    g.addColorStop(0, rgba(mix(color, SHADOW, 0.1), 0.9));
    g.addColorStop(0.28, rgba(mix(color, LIGHT, 0.45), 0.9));
    g.addColorStop(0.62, rgba(color, 0.92));
    g.addColorStop(0.9, rgba(mix(color, SHADOW, 0.5), 0.95));
    g.addColorStop(1, rgba(mix(color, SHADOW, 0.32), 0.95));
    ctx.fillStyle = g;
    ctx.fillRect(b.x0 - 1, b.y0 - 1, b.w + 2, b.h + 2);
    if (hatch > 0) {
      const xs = x0 + (x1 - x0) * 0.7;
      const band = [pt(xs, b.y0 - 2), pt(x1 + 2, b.y0 - 2), pt(x1 + 2, b.y0 + b.h + 2), pt(xs, b.y0 + b.h + 2)];
      pen.clipped(band, () => pen.hatch(shape, 1.5, 1.2, 0.3, { color: d.ink, alpha: hatch }));
    }
  });
  pool(d, shape, color, Math.min(b.w, b.h), 0.2);
}

export interface Drum {
  readonly top: Pt;
  readonly base: Pt;
  readonly body: Pt[];
}

/** A round tower's shaft from h0 to h1 at (x, z), radius r: shaded round, coursed stone following its curve. */
export function drum(d: Draw, rng: Rng, x: number, z: number, r: number, h0: number, h1: number, color: string, stones = true): Drum {
  const base = P(x, z, h0);
  const top = P(x, z, h1);
  const body = [...frontArc(base.x, base.y, r), ...backArc(top.x, top.y, r)];
  roundWash(d, body, base.x - r, base.x + r, color);
  const { pen } = d;
  if (stones) {
    pen.clipped(body, () => {
      const course = 4;
      for (let v = course, k = 0; v < h1 - h0; v += course, k++) {
        const y = base.y - v;
        pen.hair(frontArc(base.x, y, r, 16), 0.42, d.ink, 0.4);
        const n = Math.max(4, Math.round(r / 2.2));
        for (let i = 0; i < n; i++) {
          const t = ((i + (k % 2) * 0.5 + rng() * 0.25) / n) * Math.PI;
          const px = base.x - r * Math.cos(t);
          const py = y + r * DEPTH * Math.sin(t);
          pen.hair([pt(px, py), pt(px, py + course - 0.3)], 0.4, d.ink, 0.38);
          if (rng() < 0.3) pen.fill([pt(px, py), pt(px + 3 * Math.sin(t), py), pt(px + 3 * Math.sin(t), py + course), pt(px, py + course)], rng() < 0.5 ? mix(color, LIGHT, 0.5) : mix(color, '#7d6e58', 0.5), 0.16);
        }
      }
    });
  }
  pen.clipped(body, () => soft(pen.ctx, 1.4, () => pen.fill(frontArc(base.x, base.y - 2, r + 2).concat([pt(base.x + r + 2, base.y + 8), pt(base.x - r - 2, base.y + 8)]), mix(color, SHADOW, 0.5), 0.2)));
  pen.stroke(closed(crisp(body, 4)), 0.6, d.ink, 0.85);
  return { top, base, body };
}

/** A crenellated parapet on top of a round tower: the walk inside in shade, merlons round the rim. */
export function roundCrown(d: Draw, top: Pt, r: number, color: string, merlons = 7): void {
  const { pen } = d;
  const rim = [...frontArc(top.x, top.y, r, 18), ...backArc(top.x, top.y, r, 18).slice(1, -1)];
  flat(d, rim, color, { tone: -0.25, line: 0.6 });
  const floor = [...frontArc(top.x + 0.4, top.y + 0.4, r - 1.8, 16), ...backArc(top.x + 0.4, top.y + 0.4, r - 1.8, 16).slice(1, -1)];
  flat(d, floor, mix(color, SHADOW, 0.35), { tone: 0.2, hatch: 0.25, line: 0.45 });
  // Embrasures cut from the front of the parapet, dark where they open on the walk behind.
  for (let i = 0; i < merlons; i++) {
    const t0 = ((i + 0.55) / merlons) * Math.PI;
    const t1 = ((i + 0.95) / merlons) * Math.PI;
    if (t1 > Math.PI) continue;
    const a = pt(top.x - r * Math.cos(t0), top.y + r * DEPTH * Math.sin(t0));
    const b = pt(top.x - r * Math.cos(t1), top.y + r * DEPTH * Math.sin(t1));
    const notch = crisp([pt(a.x, a.y - 0.4), pt(b.x, b.y - 0.4), pt(b.x, b.y + 2.4), pt(a.x, a.y + 2.4)], 1.5);
    pen.fill(notch, mix(color, SHADOW, 0.55), 0.95);
    pen.stroke(closed(notch), 0.45, d.ink, 0.8);
  }
}

/** Merlons along the front edge of a wall's top, from u0 to u1 at height h on a front face `at`. */
export function merlonRow(d: Draw, at: Surface, u0: number, u1: number, h: number, color: string, mw = 3.4, gap = 2.4, mh = 3.2): void {
  for (let u = u0; u + mw <= u1 + 0.01; u += mw + gap) {
    const front = crisp([at(u, h), at(u + mw, h), at(u + mw, h + mh), at(u, h + mh)], 1.5);
    const t = P(0, 2.2, 0);
    const lid = [at(u, h + mh), at(u + mw, h + mh), pt(at(u + mw, h + mh).x + t.x, at(u + mw, h + mh).y + t.y), pt(at(u, h + mh).x + t.x, at(u, h + mh).y + t.y)];
    const side = [at(u + mw, h), pt(at(u + mw, h).x + t.x, at(u + mw, h).y + t.y), lid[2]!, lid[1]!];
    d.pen.fill(side, mix(color, SHADOW, 0.45), 1);
    d.pen.fill(lid, mix(color, LIGHT, 0.4), 1);
    flat(d, front, color, { tone: 0.04, line: 0.5 });
    d.pen.stroke(closed(crisp(side, 1.5)), 0.45, d.ink, 0.8);
  }
}

/** An arched opening on a face: dark inside, a ring of voussoirs round its head, lit under the arch's sill. */
export function arch(d: Draw, at: Surface, u: number, w: number, h: number, color: string, ring = 1.8, v = 0): Pt[] {
  const { pen } = d;
  const r = w / 2;
  const n = 10;
  const head = (rr: number): Pt[] => Array.from({ length: n + 1 }, (_, i) => {
    const a = Math.PI - (i / n) * Math.PI;
    return at(u + r + Math.cos(a) * rr, v + h - r + Math.sin(a) * rr);
  });
  const hole = [at(u, v), ...head(r), at(u + w, v)];
  const outer = [at(u - ring, v), ...head(r + ring), at(u + w + ring, v)];
  if (ring > 0) {
    flat(d, outer, mix(color, LIGHT, 0.15), { tone: 0, line: 0.5 });
    for (let i = 1; i < 7; i++) {
      const a = Math.PI - (i / 7) * Math.PI;
      pen.hair([at(u + r + Math.cos(a) * r, v + h - r + Math.sin(a) * r), at(u + r + Math.cos(a) * (r + ring), v + h - r + Math.sin(a) * (r + ring))], 0.4, d.ink, 0.6);
    }
  }
  pen.fill(hole, HOLE, 0.92);
  // The arch's own soffit catches a little light on its left.
  pen.clipped(hole, () => pen.fill(head(r).map((p) => pt(p.x - 0.8, p.y + 1.2)).concat([at(u + w, v + h - r + 1), at(u, v + h - r + 1)]), mix(color, SHADOW, 0.3), 0.6));
  pen.stroke(hole, 0.6, d.ink, 0.95, false);
  return hole;
}

/** A narrow window: an arched dark slot with a lit sill. */
export function slit(d: Draw, at: Surface, u: number, v: number, w: number, h: number): void {
  const hole = arch(d, (a, b) => at(a, b + v), u, w, h, '#c8bea8', 0);
  d.pen.hair([at(u - 0.4, v - 0.3), at(u + w + 0.4, v - 0.3)], 0.6, PAPER_FILL, 0.7);
  void hole;
}

/** A pennant on a pole from `foot` up `h`: a gold finial and a swallowtailed flag streaming right. */
export function pennant(d: Draw, foot: Pt, h: number, color: string, len = 9, wave = 0): void {
  const { pen } = d;
  const top = pt(foot.x, foot.y - h);
  pen.stroke([foot, top], 0.8, d.ink, 0.95, false);
  const y0 = top.y + 1;
  const tail = [pt(top.x, y0), ...bezier(pt(top.x, y0), pt(top.x + len * 0.5, y0 - 1.6 + wave), pt(top.x + len, y0 + 0.6), 6).slice(1), pt(top.x + len * 0.72, y0 + 2.2), pt(top.x + len, y0 + 3.8 + wave * 0.4), ...bezier(pt(top.x + len, y0 + 3.8 + wave * 0.4), pt(top.x + len * 0.5, y0 + 3 + wave), pt(top.x, y0 + 4.4), 6).slice(1)];
  paint(d, tail, color, { shadow: 0.4, hatch: 0, line: 0.5 });
  pen.dot(top.x, top.y - 0.6, 1.1, CROWN_GOLD, 1);
  pen.dot(top.x - 0.3, top.y - 0.9, 0.4, PAPER_FILL, 0.8);
}

/** A run of boards or a beam: a ribbon between two points, washed and lined. */
export function beam(d: Draw, a: Pt, b: Pt, w: number, color: string, line = 0.55): Pt[] {
  const l = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  const n = pt(((b.y - a.y) / l) * w * 0.5, (-(b.x - a.x) / l) * w * 0.5);
  const shape = run([pt(a.x + n.x, a.y + n.y), pt(b.x + n.x, b.y + n.y), pt(b.x - n.x, b.y - n.y), pt(a.x - n.x, a.y - n.y), pt(a.x + n.x, a.y + n.y)], 3).slice(0, -1);
  paint(d, shape, color, { shadow: 0.45, hatch: 0, line });
  return shape;
}
