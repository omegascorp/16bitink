import type { MapLayout, MapRegion } from '../../scenes/map/layout';
import { MAP, routeDistance } from '../../scenes/map/layout';
import { edgeDistance, inside, type IslandPlan } from '../../scenes/map/plan';
import { createRng, type Rng } from '../../logic/rng';
import { type Draw, makeDraw } from '../kit';
import type { Pt } from '../pen';

/** The chart's pencil, for unbuilt beaches. */
export const PENCIL = '#8a8578';
export const FONT = '"Caveat", "Patrick Hand", "Comic Sans MS", cursive';

/** The world span one chunk covers. */
export interface Span {
  readonly x0: number;
  readonly x1: number;
}

/**
 * Everything an island's drawing needs: its shores and plan, a placement
 * random source (positions only, so they never depend on what's drawn),
 * and `el`, which draws one element with its own seeded pen if it touches
 * the chunk being baked. A chunk seam never shows because every chunk
 * places and draws an island's elements identically.
 */
export interface IslandArt {
  readonly ctx: CanvasRenderingContext2D;
  readonly layout: MapLayout;
  readonly region: MapRegion;
  readonly plan: IslandPlan;
  readonly index: number;
  readonly ink: string;
  readonly draft: boolean;
  readonly rng: Rng;
  readonly span: Span;
  /** The island's whole outline: far shore west to east, then the near shore back. */
  readonly land: readonly Pt[];
  at(u: number): number;
  coast(x: number): number;
  top(x: number): number;
  scrub(x: number): number;
  /** Middle of the interior at x. */
  inland(x: number): number;
  /** Clear of the level route by `r` plus a margin for its blots and icons, and of the name cartouche. */
  clear(x: number, y: number, r: number): boolean;
  /** On the island's dry land (not in its waters), or on one of its islets. */
  onLand(x: number, y: number, margin?: number): boolean;
  /** In the island's interior, above the sand and clear of its waters. */
  interior(x: number, y: number, margin?: number): boolean;
  /** Draws one element of about radius r at (x, y) with its own pen, if it touches the chunk. */
  el(x: number, y: number, r: number, draw: (d: Draw) => void): void;
  /** A pen for drawing that spans the island (always drawn). */
  pen(salt: number): Draw;
}

/** Margin round a level ring for its blots, mission icons and hover name. */
const ROUTE_MARGIN = 20;

export function islandArt(ctx: CanvasRenderingContext2D, layout: MapLayout, region: MapRegion, plan: IslandPlan, index: number, span: Span, ink: string, land: readonly Pt[]): IslandArt {
  const seed = 4000 + index * 97;
  let k = 0;
  const at = (u: number): number => region.x0 + (region.x1 - region.x0) * u;
  const boxes = plan.waters.map((w) => bounds(w.shape));
  const isletBoxes = plan.islets.map((s) => bounds(s.shape));
  const inWater = (x: number, y: number, margin: number): boolean =>
    plan.waters.some((w, i) => {
      const b = boxes[i]!;
      if (x < b.x0 - margin || x > b.x1 + margin || y < b.y0 - margin || y > b.y1 + margin) return false;
      return inside(w.shape, { x, y }) || (margin > 0 && edgeDistance(w.shape, { x, y }) < margin);
    });
  const onMain = (x: number, y: number, margin: number): boolean => y > layout.topAt(x) + margin && y < layout.coastAt(x) - margin;
  const { label } = plan;
  return {
    ctx, layout, region, plan, index, ink, draft: !region.beach.built, rng: createRng(seed + 1), span, land,
    at,
    coast: layout.coastAt,
    top: layout.topAt,
    scrub: layout.scrubAt,
    inland: (x) => (Math.max(0, layout.topAt(x)) + layout.scrubAt(x)) / 2,
    clear: (x, y, r) => routeDistance(layout, x, y) > r + ROUTE_MARGIN && !(Math.abs(x - label.x) < label.w / 2 + r && Math.abs(y - label.y) < label.h / 2 + r),
    onLand: (x, y, margin = 0) => (onMain(x, y, margin) && !inWater(x, y, margin)) || plan.islets.some((s, i) => {
      const b = isletBoxes[i]!;
      return x >= b.x0 && x <= b.x1 && y >= b.y0 && y <= b.y1 && inside(s.shape, { x, y });
    }),
    interior: (x, y, margin = 0) => y > layout.topAt(x) + margin && y < layout.scrubAt(x) - margin && !inWater(x, y, margin),
    el: (x, y, r, draw) => {
      const salt = k++;
      if (x + r < span.x0 || x - r > span.x1) return;
      draw(makeDraw(ctx, seed * 31 + salt * 7919, 0, 0, ink));
    },
    pen: (salt) => makeDraw(ctx, seed * 17 + salt, 0, 0, ink),
  };
}

/** Hand lettering on the chart: small place names, soundings, notes. */
export function letter(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, o: { size: number; color: string; alpha?: number; angle?: number; italic?: boolean; align?: CanvasTextAlign }): void {
  ctx.save();
  ctx.globalAlpha = o.alpha ?? 0.85;
  ctx.fillStyle = o.color;
  ctx.font = `${o.italic === false ? '' : 'italic '}${o.size}px ${FONT}`;
  ctx.textAlign = o.align ?? 'center';
  ctx.textBaseline = 'middle';
  ctx.translate(x, y);
  if (o.angle) ctx.rotate(o.angle);
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

/** Runs `draw` clipped to everything outside the given closed shapes. */
export function outside(ctx: CanvasRenderingContext2D, shapes: readonly (readonly Pt[])[], draw: () => void): void {
  ctx.save();
  ctx.beginPath();
  ctx.rect(-1e5, -1e5, 2e5, 2e5);
  for (const s of shapes) {
    s.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.closePath();
  }
  ctx.clip('evenodd');
  draw();
  ctx.restore();
}

/** Runs `draw` clipped to the inside of one closed shape. */
export function within(ctx: CanvasRenderingContext2D, shape: readonly Pt[], draw: () => void): void {
  ctx.save();
  ctx.beginPath();
  shape.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  ctx.clip();
  draw();
  ctx.restore();
}

/**
 * A closed outline pushed out (or, negative, in) by `d` along its smoothed
 * normals: the water lines a chart draws parallel to a shore.
 */
const offsets = new WeakMap<readonly Pt[], Map<string, Pt[]>>();

export function offsetShape(shape: readonly Pt[], d: number, smoothing = 3): Pt[] {
  let byShape = offsets.get(shape);
  if (!byShape) {
    byShape = new Map();
    offsets.set(shape, byShape);
  }
  const key = `${d}:${smoothing}`;
  const hit = byShape.get(key);
  if (hit) return hit;
  const out = offsetUncached(shape, d, smoothing);
  byShape.set(key, out);
  return out;
}

function offsetUncached(shape: readonly Pt[], d: number, smoothing: number): Pt[] {
  const n = shape.length;
  let area = 0;
  for (let i = 0; i < n; i++) {
    const p = shape[i]!;
    const q = shape[(i + 1) % n]!;
    area += p.x * q.y - q.x * p.y;
  }
  const out = area > 0 ? 1 : -1;
  return shape.map((p, i) => {
    let nx = 0;
    let ny = 0;
    for (let k = -smoothing; k <= smoothing; k++) {
      const a = shape[(i + k - 1 + n * 4) % n]!;
      const b = shape[(i + k + 1 + n * 4) % n]!;
      const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      nx += (b.y - a.y) / len;
      ny += -(b.x - a.x) / len;
    }
    const len = Math.hypot(nx, ny) || 1;
    return { x: p.x + (nx / len) * d * out, y: p.y + (ny / len) * d * out };
  });
}

/** Whether a closed shape's bounding box touches the chunk. */
export function touches(shape: readonly Pt[], span: Span, pad = 0): boolean {
  let lo = Infinity;
  let hi = -Infinity;
  for (const p of shape) {
    if (p.x < lo) lo = p.x;
    if (p.x > hi) hi = p.x;
  }
  return hi + pad >= span.x0 && lo - pad <= span.x1;
}

/** Below this much water under a level's play button, sea drawings stay sparse. */
export const BUTTON_ZONE = MAP.nodeRadius + 120;

/**
 * A cornered outline filled in with points along each side, so the pen's
 * smoothing only softens the corners instead of bowing the sides. Closed
 * (returns to its start) unless `open`.
 */
export function straight(pts: readonly Pt[], step = 3, open = false): Pt[] {
  const out: Pt[] = [];
  const n = open ? pts.length - 1 : pts.length;
  for (let i = 0; i < n; i++) {
    const a = pts[i]!;
    const b = pts[(i + 1) % pts.length]!;
    const k = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / step));
    for (let j = 0; j < k; j++) out.push({ x: a.x + ((b.x - a.x) * j) / k, y: a.y + ((b.y - a.y) * j) / k });
  }
  out.push(open ? pts[pts.length - 1]! : pts[0]!);
  return out;
}

/** A shape's bounding box. */
export function bounds(shape: readonly Pt[]): { x0: number; x1: number; y0: number; y1: number } {
  let x0 = Infinity;
  let x1 = -Infinity;
  let y0 = Infinity;
  let y1 = -Infinity;
  for (const p of shape) {
    if (p.x < x0) x0 = p.x;
    if (p.x > x1) x1 = p.x;
    if (p.y < y0) y0 = p.y;
    if (p.y > y1) y1 = p.y;
  }
  return { x0, x1, y0, y1 };
}
