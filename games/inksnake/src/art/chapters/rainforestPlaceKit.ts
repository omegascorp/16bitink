import { createRng, type Rng } from '../../logic/rng';
import { SHADOW } from '../groundKit';
import { pt, TAU } from '../kit';
import type { Pt } from '../pen';
import { rgba } from '../wash';

/**
 * What the Rainforest's painters share: the place's colours (the dim floor
 * far below, the canopy's greens, bark and water), a steady rng for a spot,
 * and leaves laid by the thousand as batched marks.
 */
export const FLOOR = '#44503a';
export const FLOOR_DEEP = '#1c2619';
export const LITTER = '#5d4a32';
export const LITTER_RED = '#6e3f2a';
export const LITTER_LIT = '#8a7450';
export const MOSS_FLOOR = '#3f5c35';
export const HAZE = '#1f3d3a';
export const FLECK = '#e9e2a6';
export const WATER = '#1f3236';
export const WATER_LIT = '#8fa9a0';
export const BARK = '#4c4032';
export const BARK_DARK = '#251d16';
export const BARK_LIT = '#8b7b62';
/** The canopy's shadow thrown far down on the floor. */
export const DEEP_SHADE = '#0b1712';

/** A crown's paint: its shadowed depths, its leaves' middle tone, their lit tone and highlight. */
export interface Foliage {
  readonly depth: string;
  readonly base: string;
  readonly lit: string;
  readonly glint: string;
}

export const CROWN_LEAF: Foliage = { depth: '#1d3a22', base: '#3f6e34', lit: '#6f9a47', glint: '#a9c46a' };
export const FIG_LEAF: Foliage = { depth: '#142c1c', base: '#2f5a30', lit: '#55834a', glint: '#9fc07e' };
export const TALL_LEAF: Foliage = { depth: '#2b4428', base: '#5d7f45', lit: '#8fa762', glint: '#c7cf8f' };
export const FIG_FRUIT = '#d0612e';
export const FIG_FRUIT_DEEP = '#8c2f22';
export const FERN = '#8fbf3e';
export const FERN_DEEP = '#4c7a2a';

/** A steady rng for a spot on the board, so the same level is painted alike every time. */
export function rngAt(x: number, y: number, salt: number): Rng {
  return createRng(Math.round(x * 73.1 + y * 9.7 + salt * 1013) >>> 0);
}

/** How lit a direction a (radians) from a form's middle is, 0..1: the light comes from the upper left. */
export function lightOf(a: number): number {
  const lx = -SHADOW.x;
  const ly = -SHADOW.y;
  return (1 + Math.cos(a) * lx + Math.sin(a) * ly) / 2;
}

/** One leaf mark: a small pointed oval at x, y, `l` long, turned by a. */
export interface Leaf {
  readonly x: number;
  readonly y: number;
  readonly a: number;
  readonly l: number;
  readonly w: number;
}

/** Adds a leaf's pointed oval to a path. */
function leafPath(p: Path2D, f: Leaf): void {
  const c = Math.cos(f.a);
  const s = Math.sin(f.a);
  const tip = pt(f.x + c * f.l * 0.5, f.y + s * f.l * 0.5);
  const tail = pt(f.x - c * f.l * 0.5, f.y - s * f.l * 0.5);
  const nx = -s * f.w * 0.5;
  const ny = c * f.w * 0.5;
  p.moveTo(tail.x, tail.y);
  p.quadraticCurveTo(f.x + nx * 1.4, f.y + ny * 1.4, tip.x, tip.y);
  p.quadraticCurveTo(f.x - nx * 1.4, f.y - ny * 1.4, tail.x, tail.y);
  p.closePath();
}

/** Leaves laid as one fill: thousands of marks for the price of one path. */
export function fillLeaves(ctx: CanvasRenderingContext2D, leaves: readonly Leaf[], colour: string, alpha: number): void {
  if (!leaves.length) return;
  const p = new Path2D();
  for (const f of leaves) leafPath(p, f);
  ctx.save();
  ctx.fillStyle = rgba(colour, alpha);
  ctx.fill(p);
  ctx.restore();
}

/** Each leaf's midrib or edge as one stroke. */
export function strokeLeaves(ctx: CanvasRenderingContext2D, leaves: readonly Leaf[], colour: string, alpha: number, width: number): void {
  if (!leaves.length) return;
  const p = new Path2D();
  for (const f of leaves) {
    const c = Math.cos(f.a) * f.l * 0.42;
    const s = Math.sin(f.a) * f.l * 0.42;
    p.moveTo(f.x - c, f.y - s);
    p.lineTo(f.x + c, f.y + s);
  }
  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = rgba(colour, alpha);
  ctx.lineWidth = width;
  ctx.stroke(p);
  ctx.restore();
}

/** A soft round blot of colour (no edge): for shade, haze and light falling through. */
export function blot(ctx: CanvasRenderingContext2D, c: Pt, r: number, colour: string, alpha: number, hard = 0.35): void {
  const g = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, r);
  g.addColorStop(0, rgba(colour, alpha));
  g.addColorStop(hard, rgba(colour, alpha * 0.85));
  g.addColorStop(1, rgba(colour, 0));
  ctx.save();
  ctx.fillStyle = g;
  ctx.fillRect(c.x - r, c.y - r, r * 2, r * 2);
  ctx.restore();
}

/** A point at angle a, distance r from c. */
export const around = (c: Pt, a: number, r: number): Pt => pt(c.x + Math.cos(a) * r, c.y + Math.sin(a) * r);

/** A random angle. */
export const anyAngle = (rng: Rng): number => rng() * TAU;

/** Pigment settling in the paper's tooth: fine light and dark grains over the whole board. */
export function granulate(ctx: CanvasRenderingContext2D, w: number, h: number, rng: Rng, count: number): void {
  const dark = new Path2D();
  const light = new Path2D();
  for (let i = 0; i < count; i++) {
    const x = rng() * w;
    const y = rng() * h;
    const r = 0.3 + rng() * 0.6;
    const p = rng() < 0.6 ? dark : light;
    p.moveTo(x + r, y);
    p.arc(x, y, r, 0, TAU);
  }
  ctx.save();
  ctx.fillStyle = rgba('#0c140e', 0.22);
  ctx.fill(dark);
  ctx.fillStyle = rgba('#f4efd8', 0.12);
  ctx.fill(light);
  ctx.restore();
}
