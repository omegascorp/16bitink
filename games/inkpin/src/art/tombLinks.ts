import type { DoorDef, LevelDef, PlateDef } from '../logic/level';
import { ART_RES, INK } from './palette';
import { ellipse, makeCanvas, Pen, type Pt } from './pen';
import { SAND_DARK, SAND_LIGHT } from './tomb';
import { inside } from './tombStone';
import { plateMark, type PlateMark } from './tombMarks';
import { mix, rgba } from './wash';

/**
 * The carved grooves that link a plate to each door it works, cut in the
 * wall behind the board (art only: nothing touches them). Each runs square
 * from the plate to the door's side; the scene shows a lit copy over the
 * dark one while the plate is down.
 */

/** How far a groove's door end stops short of the door's face (px). */
const DOOR_GAP = 5;
/** How far below the plate's top a groove leaves it sideways (px). */
const PLATE_DROP = 6;
const PAD = 18;

const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));

/** Where a groove meets its door: on the door's side that faces the plate. */
function doorEnd(p: PlateDef, d: DoorDef): { end: Pt; vertical: boolean } {
  const vertical = Math.abs(d.by - d.ay) >= Math.abs(d.bx - d.ax);
  const mid = { x: (d.ax + d.bx) / 2, y: (d.ay + d.by) / 2 };
  const pmid = (p.x0 + p.x1) / 2;
  const off = d.t + DOOR_GAP;
  const y0 = Math.min(d.ay, d.by);
  const y1 = Math.max(d.ay, d.by);
  const end = vertical
    ? { x: mid.x + (pmid < mid.x ? -off : off), y: clamp(p.y + PLATE_DROP, y0 + 4, y1 - 4) }
    : { x: mid.x, y: mid.y + (p.y > mid.y ? off : -off) };
  return { end, vertical };
}

/** How much of a route runs inside the rooms (px), and its whole length: a groove belongs on the tomb's walls, not out in the rock. */
function measure(level: LevelDef, pts: readonly Pt[]): { inner: number; total: number } {
  let inner = 0;
  let total = 0;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]!;
    const b = pts[i]!;
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    const n = Math.max(1, Math.ceil(len / 4));
    for (let k = 0; k < n; k++) {
      const u = (k + 0.5) / n;
      const x = a.x + (b.x - a.x) * u;
      const y = a.y + (b.y - a.y) * u;
      if (level.rooms.some((r) => inside(r, x, y))) inner += len / n;
    }
    total += len;
  }
  return { inner, total };
}

/** Drops points that repeat their neighbour. */
function tidy(pts: readonly Pt[]): Pt[] {
  return pts.filter((q, i) => i === 0 || Math.hypot(q.x - pts[i - 1]!.x, q.y - pts[i - 1]!.y) > 1);
}

/**
 * One groove, from the plate to the door, as a square-cornered polyline:
 * of the plain routes (straight, along then up, or up, along and up again
 * at any height), the one that keeps most to the rooms, then the shortest.
 */
export function linkRoute(level: LevelDef, plateIndex: number, d: DoorDef): Pt[] {
  const p = level.plates?.[plateIndex];
  if (!p) return [];
  const { end, vertical } = doorEnd(p, d);
  const up = end.y < p.y;
  const disc = { x: p.x0 + plateDiscX(level, plateIndex), y: up ? p.y - 2 : p.y + PLATE_DROP + 8 };
  const routes: Pt[][] = [];
  if (end.x > p.x0 + 6 && end.x < p.x1 - 6) routes.push([{ x: end.x, y: disc.y }, end]);
  const sx = end.x < p.x0 ? p.x0 - 6 : p.x1 + 6;
  routes.push([{ x: sx, y: p.y + PLATE_DROP }, { x: end.x, y: p.y + PLATE_DROP }, end]);
  const lo = Math.min(disc.y, end.y) - 40;
  const hi = Math.max(disc.y, end.y) + 40;
  const midY = (d.ay + d.by) / 2;
  for (let ym = lo; ym <= hi; ym += 6) {
    // A flat door is met from the plate's side only, never through the door itself.
    if (!vertical && (end.y > midY ? ym < end.y : ym > end.y)) continue;
    routes.push([disc, { x: disc.x, y: ym }, { x: end.x, y: ym }, end]);
  }
  let best: Pt[] = routes[0]!;
  let bestScore = -Infinity;
  for (const r of routes.map(tidy)) {
    const { inner, total } = measure(level, r);
    const score = inner / Math.max(1, total) - total / 4000 - r.length * 0.01;
    if (score > bestScore) {
      bestScore = score;
      best = r;
    }
  }
  return best;
}

/**
 * Where a plate's symbol disc sits, from the plate's left end: as near the
 * middle as it can be without a pin lying over it (pins are drawn on top).
 */
export function plateDiscX(level: LevelDef, plateIndex: number, r = 13, dy = 8): number {
  const p = level.plates?.[plateIndex];
  if (!p) return 0;
  const w = p.x1 - p.x0;
  const y = p.y + dy;
  // Room left between the disc's edge and the nearest pin.
  const room = (x: number): number =>
    Math.min(
      Infinity,
      ...level.pins.map((pin) => {
        const lx = pin.bx - pin.ax;
        const ly = pin.by - pin.ay;
        const l2 = lx * lx + ly * ly || 1;
        const u = clamp(((x - pin.ax) * lx + (y - pin.ay) * ly) / l2, 0, 1);
        return Math.hypot(x - (pin.ax + lx * u), y - (pin.ay + ly * u)) - pin.t - r;
      }),
    );
  const lo = Math.min(p.x0 + r + 2, p.x0 + w / 2);
  const hi = Math.max(p.x1 - r - 2, p.x0 + w / 2);
  let best = p.x0 + w / 2;
  let bestRoom = -Infinity;
  for (let k = 0; k <= w / 2; k += 2) {
    for (const x of [p.x0 + w / 2 - k, p.x0 + w / 2 + k]) {
      if (x < lo || x > hi) continue;
      const g = room(x);
      if (g > 1) return x - p.x0;
      if (g > bestRoom) {
        bestRoom = g;
        best = x;
      }
    }
  }
  return best - p.x0;
}

/** The plate's grooves, one per door it works. */
export function plateRoutes(level: LevelDef, plateIndex: number): Pt[][] {
  const p = level.plates?.[plateIndex];
  if (!p) return [];
  return (level.doors ?? []).filter((d) => d.plate === p.id).map((d) => linkRoute(level, plateIndex, d));
}

/** The box (board px) a plate's grooves picture covers. */
export function linkBox(level: LevelDef, plateIndex: number): { x: number; y: number; w: number; h: number } {
  const pts = plateRoutes(level, plateIndex).flat();
  if (!pts.length) return { x: 0, y: 0, w: 1, h: 1 };
  const xs = pts.map((q) => q.x);
  const ys = pts.map((q) => q.y);
  const x = Math.floor(Math.min(...xs) - PAD);
  const y = Math.floor(Math.min(...ys) - PAD);
  return { x, y, w: Math.ceil(Math.max(...xs) + PAD) - x, h: Math.ceil(Math.max(...ys) + PAD) - y };
}

function carve(ctx: CanvasRenderingContext2D, pts: readonly Pt[], width: number, color: string): void {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  pts.forEach((q, i) => (i === 0 ? ctx.moveTo(q.x, q.y) : ctx.lineTo(q.x, q.y)));
  ctx.stroke();
  ctx.restore();
}

function paintGroove(ctx: CanvasRenderingContext2D, pen: Pen, pts: readonly Pt[], mark: PlateMark, lit: boolean): void {
  const end = pts[pts.length - 1]!;
  const start = pts[0]!;
  if (lit) {
    ctx.save();
    ctx.shadowColor = mark.glow;
    ctx.shadowBlur = 20;
    carve(ctx, pts, 13, rgba(mark.glow, 0.95));
    carve(ctx, pts, 13, rgba(mark.glow, 0.7));
    ctx.restore();
    carve(ctx, pts, 4.5, '#fffbe8');
    for (const q of [start, end]) {
      const g = ctx.createRadialGradient(q.x, q.y, 0, q.x, q.y, 15);
      g.addColorStop(0, rgba('#fffbe8', 0.95));
      g.addColorStop(0.4, rgba(mark.glow, 0.8));
      g.addColorStop(1, rgba(mark.glow, 0));
      ctx.fillStyle = g;
      ctx.fillRect(q.x - 15, q.y - 15, 30, 30);
    }
    return;
  }
  // A channel cut in the stone: dark in its depth, its lower lip catching the light, inked edges.
  carve(ctx, pts, 13, rgba(mix(SAND_DARK, INK, 0.45), 0.8));
  carve(ctx, pts, 6.5, rgba(mix(mark.tint, INK, 0.25), 0.9));
  ctx.save();
  ctx.translate(0.8, 3.6);
  carve(ctx, pts, 1.2, rgba(SAND_LIGHT, 0.8));
  ctx.restore();
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]!;
    const b = pts[i]!;
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const nx = (-(b.y - a.y) / len) * 6.6;
    const ny = ((b.x - a.x) / len) * 6.6;
    for (const s of [-1, 1]) pen.hair([{ x: a.x + nx * s, y: a.y + ny * s }, { x: b.x + nx * s, y: b.y + ny * s }], 1.3, INK, 0.85);
  }
  // A little round socket at each end.
  for (const q of [start, end]) {
    pen.fill(ellipse(q.x, q.y, 6.5, 6.5, 14), mix(mark.tint, INK, 0.35), 0.85);
    pen.circle(q.x, q.y, 6.8, 1.3, INK);
  }
}

/** A plate's grooves, dark (carved) or lit (glowing in its mark's colour), over `linkBox`. */
export function paintLinks(level: LevelDef, plateIndex: number, lit: boolean): HTMLCanvasElement {
  const box = linkBox(level, plateIndex);
  const { canvas, ctx } = makeCanvas(Math.ceil(box.w * ART_RES), Math.ceil(box.h * ART_RES));
  ctx.scale(ART_RES, ART_RES);
  ctx.translate(-box.x, -box.y);
  const pen = new Pen(ctx, 610 + plateIndex, 0.3);
  const mark = plateMark(plateIndex);
  for (const pts of plateRoutes(level, plateIndex)) paintGroove(ctx, pen, pts, mark, lit);
  return canvas;
}
