import type { Pt } from '../../../../src/art/pen';
import { path } from '../../seal/art/paint';

/**
 * The human's anime palette and pen: flat cel colours (a base and one crisp
 * shadow tone each) and a tapered ink line whose weight is set in local units
 * but never drops below a few tenths of a screen pixel, so the drawing stays
 * clean from the 56 px ladder icon up to the full-screen close-up.
 */

export const LINE = '#33201a';
export const SKIN = '#f8d8c2';
export const SKIN_SH = '#e8ad94';
export const SKIN_SH2 = '#d4917a';
export const BLUSH = '#f19494';

export const HAIR = '#6e432a';
export const HAIR_SH = '#55321f';
export const HAIR_HI = '#bb8458';
export const HAIR_SHINE = '#e4b685';
export const HAIR_LINE = '#24140c';

export const SHIRT = '#5c88c2';
export const SHIRT_SH = '#40679c';
export const SHIRT_HI = '#86ade0';
export const RIB = '#4c76ae';

/** Outer contour and inner line weights, local units (1 unit = 1 px at the video's 300 px head). */
export const OUTER = 2.7;
export const INNER = 1.3;

/** Where the pen draws: the context and how many local units make one screen pixel. */
export interface Ink {
  readonly ctx: CanvasRenderingContext2D;
  readonly lw: number;
}

export function fill(ctx: CanvasRenderingContext2D, shape: readonly Pt[], colour: string, alpha = 1): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = colour;
  path(ctx, shape);
  ctx.fill();
  ctx.restore();
}

/** Runs `draw` clipped to `shape`. */
export function within(ctx: CanvasRenderingContext2D, shape: readonly Pt[], draw: () => void): void {
  ctx.save();
  path(ctx, shape);
  ctx.clip();
  draw();
  ctx.restore();
}

export interface LineStyle {
  /** Fraction of the length the line takes to swell in from a point, and to taper out. 0 = a blunt end. */
  readonly in?: number;
  readonly out?: number;
  /** Thinnest the line may get, screen px. */
  readonly min?: number;
  readonly colour?: string;
  readonly alpha?: number;
}

/** A tapered ink line along `pts`, `w` local units at its fullest. */
export function line(k: Ink, pts: readonly Pt[], w: number, style: LineStyle = {}): void {
  if (pts.length < 2) return;
  const { in: tin = 0.2, out: tout = 0.2, min = 0.6, colour = LINE, alpha = 1 } = style;
  const full = Math.max(w, min * k.lw);
  const lengths = [0];
  for (let i = 1; i < pts.length; i++) lengths.push(lengths[i - 1]! + Math.hypot(pts[i]!.x - pts[i - 1]!.x, pts[i]!.y - pts[i - 1]!.y));
  const total = lengths[lengths.length - 1]! || 1;
  const left: Pt[] = [];
  const right: Pt[] = [];
  pts.forEach((p, i) => {
    const a = pts[Math.max(0, i - 1)]!;
    const b = pts[Math.min(pts.length - 1, i + 1)]!;
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const n = { x: -(b.y - a.y) / len, y: (b.x - a.x) / len };
    const s = lengths[i]! / total;
    const swell = Math.min(tin > 0 ? s / tin : 1, tout > 0 ? (1 - s) / tout : 1, 1);
    const half = (full * (0.1 + 0.9 * Math.sin((Math.PI / 2) * swell))) / 2;
    left.push({ x: p.x + n.x * half, y: p.y + n.y * half });
    right.push({ x: p.x - n.x * half, y: p.y - n.y * half });
  });
  ctx0(k.ctx, colour, alpha, () => {
    path(k.ctx, [...left, ...right.reverse()]);
    k.ctx.fill();
    // Round off blunt ends.
    if (tin === 0) dot(k.ctx, pts[0]!, full / 2);
    if (tout === 0) dot(k.ctx, pts[pts.length - 1]!, full / 2);
  });
}

function dot(ctx: CanvasRenderingContext2D, p: Pt, r: number): void {
  ctx.beginPath();
  ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
  ctx.fill();
}

function ctx0(ctx: CanvasRenderingContext2D, colour: string, alpha: number, draw: () => void): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = colour;
  draw();
  ctx.restore();
}

/** Points along a quadratic from a to b, bowed `bulge` × its length to the left of travel (outward on a clockwise-drawn loop). */
export function bowed(a: Pt, b: Pt, bulge: number, n = 8): Pt[] {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const c = { x: (a.x + b.x) / 2 - dy * bulge, y: (a.y + b.y) / 2 + dx * bulge };
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n;
    const u = 1 - t;
    return { x: u * u * a.x + 2 * u * t * c.x + t * t * b.x, y: u * u * a.y + 2 * u * t * c.y + t * t * b.y };
  });
}

/** A closed loop of bowed segments: each entry is a corner and the bulge of the segment that leaves it. */
export function bowedLoop(corners: readonly (readonly [number, number, number])[], n = 8): Pt[] {
  const out: Pt[] = [];
  corners.forEach(([x, y, b], i) => {
    const [nx, ny] = corners[(i + 1) % corners.length]!;
    out.push(...bowed({ x, y }, { x: nx, y: ny }, b, n).slice(0, -1));
  });
  return out;
}

/** `pts` moved toward `c` by `d`. */
export const toward = (pts: readonly Pt[], c: Pt, d: number): Pt[] =>
  pts.map((p) => {
    const l = Math.hypot(c.x - p.x, c.y - p.y) || 1;
    return { x: p.x + ((c.x - p.x) / l) * d, y: p.y + ((c.y - p.y) / l) * d };
  });
