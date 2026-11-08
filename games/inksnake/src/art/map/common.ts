import { MAP, type MapLayout, type MapNode } from '../../scenes/map/layout';
import { makeDraw, normals, type Draw } from '../kit';
import type { Pt } from '../pen';

/**
 * What every part of the map painter shares (after InkGecko's): the world
 * span a chunk covers, seeded hashes (so a mark's look depends on where it
 * is in the world, never on which chunk draws it), and the trail's
 * geometry, cached per layout.
 */

/** Graphite, for the chapters still being drawn. */
export const PENCIL = '#6a665d';
/** Either side of the trail the painting stays quiet, so nests and labels read. */
export const CALM = 90;
/** Half the width of the worn trail. */
export const TRAIL_HALF = MAP.groove / 2;
/** Radius of the nest at each level (the game's egg, ~45 px long, sits in it). */
export const NEST_R = 31;
/** Where shadows fall: away from a light at the upper left (as on the boards). */
export const SHADOW_DIR: Pt = { x: 0.55, y: 0.84 };
export const LIGHT_DIR: Pt = { x: -0.55, y: -0.84 };

/** The world rows one chunk paints. */
export interface Span {
  readonly y0: number;
  readonly y1: number;
}

export const touches = (span: Span, y: number, r: number): boolean => y + r >= span.y0 && y - r <= span.y1;
export const clamp01 = (t: number): number => Math.max(0, Math.min(1, t));
export const smoothstep = (t: number): number => {
  const c = clamp01(t);
  return c * c * (3 - 2 * c);
};

/** A stable hash of a few integers to [0, 1). */
export function hash(a: number, b = 0, c = 0): number {
  let h = Math.imul((a | 0) ^ 0x9e3779b9, 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13) ^ (b | 0), 0xc2b2ae35);
  h = Math.imul(h ^ (h >>> 16) ^ Math.imul(c | 0, 0x27d4eb2f), 0x165667b1);
  h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}

/** A seed from a few integers (feature kind, region, index…). */
export const seedOf = (a: number, b = 0, c = 0): number => Math.floor(hash(a, b, c) * 0x7fffffff) + 1;

/**
 * One drawing on the map, placed once per layout: it is drawn, with its own
 * seeded pen, by every chunk it reaches into.
 */
export interface Feature {
  readonly y: number;
  /** How far its drawing reaches above or below y. */
  readonly r: number;
  readonly seed: number;
  draw(d: Draw): void;
}

export function drawFeatures(ctx: CanvasRenderingContext2D, span: Span, features: readonly Feature[]): void {
  for (const f of features) if (touches(span, f.y, f.r)) f.draw(makeDraw(ctx, f.seed, 0, 0));
}

/** Where a node's name and blots go: beside it, towards the middle of the map. */
export function labelBox(n: MapNode): { x0: number; x1: number; y0: number; y1: number } {
  const side = n.x >= MAP.mid ? -1 : 1;
  const a = n.x + side * (MAP.nodeRadius + 8);
  const b = n.x + side * (MAP.nodeRadius + 236);
  return { x0: Math.min(a, b), x1: Math.max(a, b), y0: n.y - 30, y1: n.y + 30 };
}

/** The trail's geometry, for placing things relative to it. */
export interface Geo {
  readonly layout: MapLayout;
  readonly pts: readonly Pt[];
  /** Unit normal at each point of the path. */
  readonly nrm: readonly Pt[];
  /** The last path index at or below world y (the path climbs, so y falls as the index rises). */
  index(y: number): number;
  /** Path indices covering world rows y0..y1, padded by `pad` px. */
  range(y0: number, y1: number, pad?: number): [number, number];
  /** The trail's x where it crosses world y. */
  trailX(y: number): number;
  /** Distance from (x, y) to the trail, at most `cap`. */
  dist(x: number, y: number, cap?: number): number;
  /** 0 in the calm either side of the trail, easing to 1 further out: how much detail may gather there. */
  busy(x: number, y: number): number;
  /** True if (x, y) is within `pad` of a node's label box. */
  onLabel(x: number, y: number, pad?: number): boolean;
}

const cache = new WeakMap<MapLayout, Geo>();

export function geoOf(layout: MapLayout): Geo {
  const hit = cache.get(layout);
  if (hit) return hit;
  const geo = buildGeo(layout);
  cache.set(layout, geo);
  return geo;
}

function buildGeo(layout: MapLayout): Geo {
  const pts = layout.path;
  const nrm = normals(pts);
  const last = pts.length - 1;
  const boxes = layout.nodes.map(labelBox);
  const index = (y: number): number => {
    if (y >= pts[0]!.y) return 0;
    if (y <= pts[last]!.y) return last;
    let lo = 0;
    let hi = last;
    while (hi - lo > 1) {
      const m = (lo + hi) >> 1;
      if (pts[m]!.y >= y) lo = m;
      else hi = m;
    }
    return lo;
  };
  const trailX = (y: number): number => {
    const i = index(y);
    const a = pts[i]!;
    const b = pts[Math.min(last, i + 1)]!;
    const t = a.y === b.y ? 0 : (a.y - y) / (a.y - b.y);
    return a.x + (b.x - a.x) * clamp01(t);
  };
  const dist = (x: number, y: number, cap = 320): number => {
    let best = cap * cap;
    const i1 = Math.min(last, index(y - cap) + 1);
    for (let i = index(y + cap); i <= i1; i += 2) {
      const p = pts[i]!;
      const d = (p.x - x) ** 2 + (p.y - y) ** 2;
      if (d < best) best = d;
    }
    return Math.sqrt(best);
  };
  const onLabel = (x: number, y: number, pad = 0): boolean =>
    boxes.some((b) => x > b.x0 - pad && x < b.x1 + pad && y > b.y0 - pad && y < b.y1 + pad);
  return {
    layout,
    pts,
    nrm,
    index,
    range: (y0, y1, pad = 0) => [index(y1 + pad), Math.min(last, index(y0 - pad) + 1)],
    trailX,
    dist,
    busy: (x, y) => smoothstep((dist(x, y, CALM + 260) - CALM) / 220) * (onLabel(x, y, 30) ? 0.15 : 1),
    onLabel,
  };
}

/** A closed polygon as a canvas path. */
export function tracePath(ctx: CanvasRenderingContext2D | Path2D, pts: readonly Pt[], dx = 0, dy = 0): void {
  pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x + dx, p.y + dy) : ctx.lineTo(p.x + dx, p.y + dy)));
  ctx.closePath();
}

/** Many small ellipses filled at once: moss, grit, petals. Cheap where a pen per mark is not. */
export class Blobs {
  private readonly path = new Path2D();
  private any = false;

  add(x: number, y: number, rx: number, ry = rx, rot = 0): void {
    this.path.moveTo(x + Math.cos(rot) * rx, y + Math.sin(rot) * rx);
    this.path.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
    this.any = true;
  }

  /** An irregular wash-like blot instead of a clean ellipse, its wobble fixed by `seed`. */
  blot(x: number, y: number, rx: number, ry: number, rot: number, seed: number): void {
    const [p1, p2, p3] = [hash(seed, 1) * 6.283, hash(seed, 2) * 6.283, hash(seed, 3) * 6.283];
    const n = 18;
    const c = Math.cos(rot);
    const s = Math.sin(rot);
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * Math.PI * 2;
      const k = 1 + 0.2 * Math.sin(2 * a + p1) + 0.12 * Math.sin(3 * a + p2) + 0.07 * Math.sin(5 * a + p3);
      const px = Math.cos(a) * rx * k;
      const py = Math.sin(a) * ry * k;
      const qx = x + px * c - py * s;
      const qy = y + px * s + py * c;
      if (i === 0) this.path.moveTo(qx, qy);
      else this.path.lineTo(qx, qy);
    }
    this.path.closePath();
    this.any = true;
  }

  fill(ctx: CanvasRenderingContext2D, colour: string, alpha: number): void {
    if (!this.any) return;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = colour;
    ctx.fill(this.path);
    ctx.restore();
  }
}

/** Many short marks stroked at once: grass ticks, hatching, straw. */
export class Ticks {
  private readonly path = new Path2D();
  private any = false;

  add(ax: number, ay: number, bx: number, by: number): void {
    this.path.moveTo(ax, ay);
    this.path.lineTo(bx, by);
    this.any = true;
  }

  /** A short curved mark a → b bowed through (cx, cy). */
  curve(ax: number, ay: number, cx: number, cy: number, bx: number, by: number): void {
    this.path.moveTo(ax, ay);
    this.path.quadraticCurveTo(cx, cy, bx, by);
    this.any = true;
  }

  stroke(ctx: CanvasRenderingContext2D, colour: string, width: number, alpha: number): void {
    if (!this.any) return;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = colour;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.stroke(this.path);
    ctx.restore();
  }
}
