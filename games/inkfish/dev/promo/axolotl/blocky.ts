import { INK, type Pt } from '../../../src/art/pen';
import { createRng } from '../../../src/logic/rng';
import { closed, livePen, pt } from './ink';

/**
 * The blocky one: a pink axolotl built from cubes, the way a block-building
 * game draws one (generic boxes and a pixel texture; no logo, text or copied
 * art), inked over with the same pen so it sits in the picture. Side on,
 * facing left, with the tops and back ends of its boxes showing.
 *
 * Its own units: 100 long, nose at x = -50, the belly line at y = 4.
 */

const SIDE = '#f2a3bf';
const TOP = '#f9cadb';
const END = '#d47c9d';
const GILL = '#c9347b';
const GILL_DARK = '#99245c';
/** The boxes' depth goes up and to the right, this much per unit of depth. */
const DX = 0.42;
const DY = -0.3;

interface Box {
  readonly x0: number;
  readonly y0: number;
  readonly x1: number;
  readonly y1: number;
  readonly depth: number;
  readonly side: string;
  readonly top: string;
  readonly end: string;
}

const box = (x0: number, y0: number, x1: number, y1: number, depth: number, side = SIDE, top = TOP, end = END): Box => ({ x0, y0, x1, y1, depth, side, top, end });

/** Back to front: the far legs, the tail fin, the far gills, the head, the body (set in from the head's sides), the near gills and legs. */
const FAR: readonly Box[] = [box(-17, 2, -12, 10, 4, END, SIDE, END), box(17, 2, 22, 10, 4, END, SIDE, END)];
const TAIL = box(27, -13, 58, 3, 2);
const BODY = box(-23, -11, 29, 3, 16);
const FAR_GILLS: readonly Box[] = [box(-28, -27, -24, -17, 3, GILL_DARK, GILL, GILL_DARK), box(-24, -22, -20, -14, 3, GILL_DARK, GILL, GILL_DARK)];
const HEAD = box(-50, -16, -24, 6, 22);
const NEAR_GILLS: readonly Box[] = [
  box(-24, -24, -20, -16, 3, GILL, '#e0559a', GILL_DARK),
  box(-24, -12, -16, -8, 3, GILL, '#e0559a', GILL_DARK),
  box(-24, -2, -18, 2, 3, GILL, '#e0559a', GILL_DARK),
  box(-38, -22, -34, -16, 3, GILL, '#e0559a', GILL_DARK),
];
const NEAR: readonly Box[] = [box(-20, 4, -14, 12, 4), box(14, 4, 20, 12, 4)];

/** A face of four corners, filled flat, with a faint pixel grid of slightly different pinks, inked round. */
function face(ctx: CanvasRenderingContext2D, corners: readonly Pt[], colour: string, seed: number, boil: number, lw: number): void {
  const pen = livePen(ctx, boil, seed, 0.18);
  pen.fill(corners, colour, 1);
  // Pixel texture: a 4-unit grid, some squares a shade lighter or darker.
  const rng = createRng(seed * 97 + 11);
  const [a, b, , d] = corners as [Pt, Pt, Pt, Pt];
  const u = { x: b.x - a.x, y: b.y - a.y };
  const v = { x: d.x - a.x, y: d.y - a.y };
  const nu = Math.max(1, Math.round(Math.hypot(u.x, u.y) / 4));
  const nv = Math.max(1, Math.round(Math.hypot(v.x, v.y) / 4));
  for (let i = 0; i < nu; i++) {
    for (let j = 0; j < nv; j++) {
      const r = rng();
      if (r > 0.38) continue;
      const p = (s: number, t: number): Pt => pt(a.x + u.x * s + v.x * t, a.y + u.y * s + v.y * t);
      const cell = [p(i / nu, j / nv), p((i + 1) / nu, j / nv), p((i + 1) / nu, (j + 1) / nv), p(i / nu, (j + 1) / nv)];
      pen.fill(cell, r < 0.19 ? '#ffffff' : '#7a2348', r < 0.19 ? 0.16 : 0.1);
    }
  }
  pen.stroke(closed(corners), lw, INK, 1, false);
}

function drawBox(ctx: CanvasRenderingContext2D, b: Box, seed: number, boil: number, lw: number): void {
  const dx = b.depth * DX;
  const dy = b.depth * DY;
  face(ctx, [pt(b.x0, b.y0), pt(b.x1, b.y0), pt(b.x1 + dx, b.y0 + dy), pt(b.x0 + dx, b.y0 + dy)], b.top, seed, boil, lw);
  face(ctx, [pt(b.x1, b.y0), pt(b.x1 + dx, b.y0 + dy), pt(b.x1 + dx, b.y1 + dy), pt(b.x1, b.y1)], b.end, seed + 1, boil, lw);
  face(ctx, [pt(b.x0, b.y0), pt(b.x1, b.y0), pt(b.x1, b.y1), pt(b.x0, b.y1)], b.side, seed + 2, boil, lw);
}

/**
 * Draws it in its own units (the caller has scaled the context so 1 unit is
 * `px` screen pixels).
 */
export function drawBlocky(ctx: CanvasRenderingContext2D, px: number, boil: number): void {
  const lw = 2.6 / px;
  let seed = 1;
  for (const b of [...FAR, TAIL, ...FAR_GILLS, HEAD, BODY, ...NEAR_GILLS, ...NEAR]) drawBox(ctx, b, (seed += 3), boil, lw);
  // The face, in square pixels: a black eye with a lighter pixel, a little mouth.
  const pen = livePen(ctx, boil, 77, 0.1);
  pen.fill([pt(-44, -9), pt(-39, -9), pt(-39, -4), pt(-44, -4)], INK, 1);
  pen.fill([pt(-42.5, -9), pt(-40.5, -9), pt(-40.5, -7), pt(-42.5, -7)], '#5b5560', 1);
  pen.fill([pt(-50, 0), pt(-45, 0), pt(-45, 2), pt(-50, 2)], '#7a2348', 0.9);
}

/** The cubes it bursts into as it goes: `u` 0 .. 1, in its own units. */
export function drawBlockyPoof(ctx: CanvasRenderingContext2D, u: number, px: number, boil: number): void {
  if (u <= 0 || u >= 1) return;
  const rng = createRng(515);
  const lw = 2.2 / px;
  for (let i = 0; i < 14; i++) {
    const a = rng() * Math.PI * 2;
    const d = (20 + rng() * 45) * Math.sqrt(u);
    const s = (4 + rng() * 5) * (1 - u);
    const c = pt(Math.cos(a) * d, Math.sin(a) * d - 4 + 30 * u * u);
    const colour = i % 4 === 0 ? GILL : i % 2 ? SIDE : TOP;
    ctx.save();
    ctx.globalAlpha = 1 - u * u;
    drawBox(ctx, box(c.x - s / 2, c.y - s / 2, c.x + s / 2, c.y + s / 2, s, colour, TOP, END), 200 + i, boil, lw);
    ctx.restore();
  }
}
