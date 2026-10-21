import type { Rng } from '../logic/rng';
import { SHADOW } from './groundKit';
import { type Draw, pt, TAU } from './kit';
import type { Pt } from './pen';
import { rgba } from './wash';

/**
 * The night garden's moonlit palette and the pieces its ground, covers and
 * things share: clipped box and yew painted as runs of rounded clumps (a
 * cast moon-shadow, an ink rim round the whole silhouette, then deep, mid
 * and moonlit greens and scalloped leaf ticks), warm lantern glows, and a fast
 * nearest-groove distance.
 */
export const LAWN = '#3b5361';
export const LAWN_DEEP = '#22313d';
export const LAWN_LIT = '#7f9aa6';
export const GRAVEL = '#97a0b0';
export const GRAVEL_DEEP = '#5a6375';
export const GRAVEL_LIT = '#d3dbe8';
export const BOX = '#2f4b45';
export const BOX_DEEP = '#172520';
export const BOX_LIT = '#86a7a0';
export const MOON = '#eef3fb';
export const MOONSTONE = '#aab2c0';
export const MOONSTONE_DEEP = '#5e6678';
export const WATER = '#15213a';
export const NIGHT_SKY = '#141b30';
export const GLOW = '#ffd27e';
export const GLOW_DEEP = '#f0a23f';
export const FLAME = '#fff4cf';
export const PETAL = '#f3f1ff';

/** One rounded clump of clipped leaves. */
export interface Clump {
  readonly x: number;
  readonly y: number;
  readonly r: number;
}

/** Fills every circle (scaled by k, moved by dx, dy) as one shape, so overlaps don't darken. */
export function fillCircles(ctx: CanvasRenderingContext2D, cs: readonly Clump[], colour: string, alpha: number, k = 1, dx = 0, dy = 0, shift = 0): void {
  ctx.save();
  ctx.fillStyle = rgba(colour, alpha);
  ctx.beginPath();
  for (const c of cs) {
    const r = Math.max(0.3, c.r * k);
    const x = c.x + dx - SHADOW.x * c.r * shift;
    const y = c.y + dy - SHADOW.y * c.r * shift;
    ctx.moveTo(x + r, y);
    ctx.arc(x, y, r, 0, TAU);
  }
  ctx.fill();
  ctx.restore();
}

export interface ClumpLook {
  /** How high it stands: its moon-shadow's reach. */
  readonly lift: number;
  readonly deep: string;
  readonly mid: string;
  readonly lit: string;
  /** Leaf ticks per clump. */
  readonly ticks?: number;
}

/**
 * Scalloped pen ticks over clumps, the way an inker draws clipped foliage:
 * dark cupped ticks on the side of each clump turned from the moon, pale
 * ones on the side towards it.
 */
function leafTicks(ctx: CanvasRenderingContext2D, cs: readonly Clump[], n: number, colour: string, alpha: number, side: number, width: number, rng: Rng): void {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineWidth = width;
  ctx.strokeStyle = rgba(colour, alpha);
  ctx.beginPath();
  for (const c of cs) {
    for (let k = 0; k < n; k++) {
      const a = Math.atan2(SHADOW.y * side, SHADOW.x * side) + (rng() - 0.5) * 2.4;
      const r = c.r * (0.15 + rng() * 0.75);
      const x = c.x + Math.cos(a) * r;
      const y = c.y + Math.sin(a) * r;
      const s = 1.4 + rng() * 1.6;
      // A little cup opening towards the moon: the shadow under one tuft of leaves.
      const t = Math.atan2(SHADOW.y, SHADOW.x) + Math.PI / 2 + (rng() - 0.5) * 0.6;
      const ux = Math.cos(t) * s;
      const uy = Math.sin(t) * s;
      ctx.moveTo(x - ux, y - uy);
      ctx.quadraticCurveTo(x + SHADOW.x * s * 0.9, y + SHADOW.y * s * 0.9, x + ux, y + uy);
    }
  }
  ctx.stroke();
  ctx.restore();
}

/**
 * Clipped evergreen as a run of clumps: shadow on the ground, an ink rim
 * round the silhouette, then each clump rounded by moonlight from the upper
 * left, and drawn over with scalloped leaf ticks.
 */
export function clumps(d: Draw, cs: readonly Clump[], look: ClumpLook, rng: Rng): void {
  if (cs.length === 0) return;
  const { ctx } = d.pen;
  if (look.lift > 0) {
    fillCircles(ctx, cs, NIGHT_SKY, 0.3, 1.02, SHADOW.x * look.lift, SHADOW.y * look.lift);
    fillCircles(ctx, cs, NIGHT_SKY, 0.2, 1.1, SHADOW.x * look.lift * 0.5, SHADOW.y * look.lift * 0.5);
  }
  fillCircles(ctx, cs, d.ink, 0.6, 1.07);
  fillCircles(ctx, cs, d.ink, 0.9, 1, 0.5, 0.75);
  fillCircles(ctx, cs, look.deep, 1, 1, 0, 0);
  fillCircles(ctx, cs, look.mid, 1, 0.82, 0, 0, 0.17);
  fillCircles(ctx, cs, look.lit, 0.24, 0.62, 0, 0, 0.32);
  const n = look.ticks ?? 5;
  leafTicks(ctx, cs, n, '#0a1411', 0.6, 1, 0.8, rng);
  leafTicks(ctx, cs, Math.ceil(n * 0.7), look.lit, 0.55, -1, 0.7, rng);
}

/** A warm pool of lantern light round c, radius r. */
export function glow(ctx: CanvasRenderingContext2D, c: Pt, r: number, alpha: number): void {
  const g = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, r);
  g.addColorStop(0, rgba(GLOW, alpha));
  g.addColorStop(0.35, rgba(GLOW_DEEP, alpha * 0.45));
  g.addColorStop(1, rgba(GLOW_DEEP, 0));
  ctx.save();
  ctx.fillStyle = g;
  ctx.fillRect(c.x - r, c.y - r, r * 2, r * 2);
  ctx.restore();
}

/** A faint cool halo, the way pale flowers seem to shine at night. */
export function moonHalo(ctx: CanvasRenderingContext2D, c: Pt, r: number, alpha: number): void {
  const g = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, r);
  g.addColorStop(0, rgba(MOON, alpha));
  g.addColorStop(1, rgba(MOON, 0));
  ctx.save();
  ctx.fillStyle = g;
  ctx.fillRect(c.x - r, c.y - r, r * 2, r * 2);
  ctx.restore();
}

/** Distance from any spot to the nearest groove centre line, exact to a unit or so, up to `cap`. */
export type GrooveDist = (p: Pt) => number;

export function grooveDist(grooves: readonly (readonly Pt[])[], cap = 160): GrooveDist {
  const cell = 32;
  const grid = new Map<number, Pt[]>();
  const key = (i: number, j: number): number => (i + 1000) * 4096 + (j + 1000);
  for (const g of grooves) {
    for (const p of g) {
      const k = key(Math.floor(p.x / cell), Math.floor(p.y / cell));
      const list = grid.get(k);
      if (list) list.push(p);
      else grid.set(k, [p]);
    }
  }
  const reach = Math.ceil(cap / cell);
  return (q) => {
    const ci = Math.floor(q.x / cell);
    const cj = Math.floor(q.y / cell);
    let best = cap * cap;
    for (let i = -reach; i <= reach; i++) {
      for (let j = -reach; j <= reach; j++) {
        const list = grid.get(key(ci + i, cj + j));
        if (!list) continue;
        for (const p of list) {
          const dd = (p.x - q.x) ** 2 + (p.y - q.y) ** 2;
          if (dd < best) best = dd;
        }
      }
    }
    return Math.sqrt(best);
  };
}

/** A point r from c in direction a (as groundKit's polar), local copy for hot loops. */
export const at = (c: Pt, a: number, r: number): Pt => pt(c.x + Math.cos(a) * r, c.y + Math.sin(a) * r);
