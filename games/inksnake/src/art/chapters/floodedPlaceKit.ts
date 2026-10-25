import { createRng, type Rng } from '../../logic/rng';
import { BOARD, type LevelDef, type ZoneDef } from '../../level/types';
import { pt } from '../kit';
import type { Pt } from '../pen';
import { rgba } from '../wash';

/**
 * What the Flooded Forest's painters share: the place's colours (tea-dark
 * blackwater, the sky and the canopy mirrored in it, wet grey-brown mud,
 * sedge and grass on the banks, lichened grey bark, lily-pad greens and
 * the Victoria lily's red rim), a steady rng per spot, the level's banks
 * as smooth shores, and a test for whether a spot is on land.
 */
export const TEA = '#5a4026';
export const TEA_DEEP = '#2e2014';
export const TEA_AMBER = '#8c6434';
export const TEA_GLOW = '#b48a4c';
export const SKY = '#e9e3cf';
export const CANOPY = '#24301c';
export const FOAM = '#efe8d2';
export const MUD = '#6f5c44';
export const MUD_WET = '#4a3a2a';
export const MUD_LIT = '#a8946e';
export const SILT = '#b9a57c';
export const SEDGE = '#7f8a44';
export const SEDGE_DEEP = '#4f5a2c';
export const SEDGE_LIT = '#b8b86a';
export const GRASS = '#93a04e';
export const LEAF_LITTER = '#8a5e34';
export const LEAF_DRY = '#b88a4e';
export const BARK = '#7c6a58';
export const BARK_DARK = '#3d3128';
export const BARK_LIT = '#b3a690';
export const LICHEN = '#c9c7a8';
export const LICHEN_GREEN = '#a8b484';
export const WOOD = '#cdb48a';
export const WOOD_DEEP = '#8c7050';
export const MOSS = '#6f8a3a';
export const MOSS_LIT = '#a9bd62';
export const PAD = '#5f8a3c';
export const PAD_DEEP = '#36562a';
export const PAD_LIT = '#a5c26a';
export const PAD_RIM = '#9a3b34';
export const LETTUCE = '#9cbf6a';
export const LETTUCE_DEEP = '#5d8a40';
export const LETTUCE_LIT = '#d4e6a0';
export const REED = '#8e9a4c';
export const REED_DEEP = '#4d5a2a';
export const REED_STRAW = '#cdb978';
export const PETAL = '#fbf3ea';
export const PETAL_PINK = '#e8b4c0';
/** Shade thrown on the water: a deep warm brown, so it reads as shade rather than blue light. */
export const SHADE = '#1c140c';

export const W = BOARD.w;
export const H = BOARD.h;

/** A steady rng for a thing at x, y (the k-th painter of it). */
export const rngAt = (x: number, y: number, k = 0): Rng => createRng(Math.round(x * 131 + y * 71 + k * 977) + 7919);

/** A closed polygon smoothed into a curve through its points (Catmull-Rom), `per` points per side. */
export function smoothLoop(pts: readonly Pt[], per = 6): Pt[] {
  const n = pts.length;
  const out: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n]!;
    const p1 = pts[i]!;
    const p2 = pts[(i + 1) % n]!;
    const p3 = pts[(i + 2) % n]!;
    for (let k = 0; k < per; k++) {
      const t = k / per;
      const t2 = t * t;
      const t3 = t2 * t;
      const f = (a: number, b: number, c: number, d: number): number => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push(pt(f(p0.x, p1.x, p2.x, p3.x), f(p0.y, p1.y, p2.y, p3.y)));
    }
  }
  return out;
}

/** A zone's outline as a closed polygon. */
export function zonePoly(z: ZoneDef): Pt[] {
  if (z.shape === 'poly') return smoothLoop(z.points);
  if (z.shape === 'rect') return [pt(z.x, z.y), pt(z.x + z.w, z.y), pt(z.x + z.w, z.y + z.h), pt(z.x, z.y + z.h)];
  return Array.from({ length: 48 }, (_, i) => pt(z.x + Math.cos((i / 48) * Math.PI * 2) * z.r, z.y + Math.sin((i / 48) * Math.PI * 2) * z.r));
}

/** The level's banks and islands, as smooth shores. */
export function banksOf(level: LevelDef): Pt[][] {
  return (level.zones ?? []).filter((z) => z.kind === 'land').map(zonePoly);
}

/** Whether x, y is inside a closed polygon (even-odd). */
export function inPoly(poly: readonly Pt[], x: number, y: number): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i]!;
    const b = poly[j]!;
    if (a.y > y !== b.y > y && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

/** The distance from x, y to a closed polygon's edge. */
export function distToEdge(poly: readonly Pt[], x: number, y: number): number {
  let best = Infinity;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[j]!;
    const b = poly[i]!;
    const ex = b.x - a.x;
    const ey = b.y - a.y;
    const l2 = ex * ex + ey * ey || 1;
    const t = Math.max(0, Math.min(1, ((x - a.x) * ex + (y - a.y) * ey) / l2));
    best = Math.min(best, Math.hypot(x - a.x - ex * t, y - a.y - ey * t));
  }
  return best;
}

/** How far x, y lies inland, px: positive on land (its distance from the shore), negative on the water. */
export function inland(banks: readonly (readonly Pt[])[], x: number, y: number): number {
  let best = -Infinity;
  for (const b of banks) {
    const d = distToEdge(b, x, y);
    best = Math.max(best, inPoly(b, x, y) ? d : -d);
  }
  return best;
}

/** Strokes laid as one path in one colour: each from (x, y) at angle a, length l, bowed by `bend`. */
export function strokePath(ctx: CanvasRenderingContext2D, marks: readonly (readonly [number, number, number, number, number])[], colour: string, alpha: number, width: number): void {
  if (!marks.length) return;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = rgba(colour, alpha);
  ctx.lineWidth = width;
  ctx.beginPath();
  for (const [x, y, a, l, bend] of marks) {
    const c = Math.cos(a);
    const s = Math.sin(a);
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + c * l * 0.5 - s * bend, y + s * l * 0.5 + c * bend, x + c * l, y + s * l);
  }
  ctx.stroke();
  ctx.restore();
}
