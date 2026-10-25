import { createRng } from '../../logic/rng';
import { pt, TAU } from '../kit';
import { PAPER_FILL } from '../palette';
import { type Pt, withScratch } from '../pen';
import { SNAKE_W } from '../types';
import { rgba } from '../wash';
import { hash, mod } from './barrensSnakePaint';

/**
 * The European adder's paint box (a male: silvery grey-cream ground, the
 * zigzag jet black) and the brushwork its back strip and its neck share:
 * the cross-section wash, the zigzag's geometry, the keeled scales and the
 * tile the strip is laid from. Everything is deterministic: the same call
 * paints the same pixels.
 */
export const ADDER_PAINT = {
  ground: '#cfc6b2',
  pale: '#ece6d4',
  buff: '#c8b089',
  grey: '#8f8c84',
  shadow: '#2b2826',
  zig: '#1d1917',
  zigLit: '#4d4540',
  zigDeep: '#090707',
  rim: '#060505',
  belly: '#3a3734',
  lip: '#eee6d0',
  bar: '#2a2422',
  mouth: '#efd2cc',
  mouthDeep: '#c48a8e',
  throat: '#4f2229',
  iris: '#b8471f',
  irisLit: '#e7853e',
  tongue: '#2e1d20',
  tongueTip: '#0c0809',
  fang: '#f6f1e4',
} as const;

const A = ADDER_PAINT;

/** One period of the pattern, board px, and the zigs in it (one zig: a point to each side). */
export const ADDER_PERIOD = 128;
export const ZIGS = 8;
export const ZIG = ADDER_PERIOD / ZIGS;
/** Where the long contours run. */
export const TOP_EDGE = 1.2;
export const BOTTOM_EDGE = SNAKE_W - 1.2;

/** The back's cross-section wash, `yTop` being where the strip's y = 0 lies: silvery where the light hits, greying down the far flank. */
export function adderCrossWash(ctx: CanvasRenderingContext2D, yTop: number): CanvasGradient {
  const g = ctx.createLinearGradient(0, yTop, 0, yTop + SNAKE_W);
  g.addColorStop(0, '#ddd6c4');
  g.addColorStop(0.15, '#ebe5d4');
  g.addColorStop(0.42, '#d6cebb');
  g.addColorStop(0.72, '#bdb4a0');
  g.addColorStop(1, '#8a8274');
  return g;
}

/** A smooth periodic wobble at strip-x (whole cycles per period), seeded. */
function wobble(x: number, seed: number, amp: number): number {
  const rng = createRng(seed);
  const u = (x / ADDER_PERIOD) * TAU;
  return amp * (0.6 * Math.sin(u * 5 + rng() * TAU) + 0.4 * Math.sin(u * 13 + rng() * TAU));
}

/** Per-zig values eased between zigs, so the zigzag is a little uneven but repeats every period. */
function perZig(x: number, seed: number): number {
  const u = x / ZIG;
  const i = Math.floor(u);
  const t = u - i;
  const e = t * t * (3 - 2 * t);
  return hash(mod(i, ZIGS), seed) * (1 - e) + hash(mod(i + 1, ZIGS), seed) * e;
}

/**
 * The zigzag's two edges at x (strip y): its centre swings between the
 * flanks, a point towards the top flank at x = i·ZIG and one towards the
 * bottom at x = (i + ½)·ZIG. The outer points are sharp, the inner notches
 * rounded, as the adder's band is.
 */
export function zigEdges(x: number, mid = SNAKE_W / 2): { top: number; bot: number } {
  const u = x / ZIG;
  const amp = 3.7 + 0.7 * perZig(x, 3);
  const half = 3.55 + 0.6 * perZig(x + ZIG * 0.3, 5);
  const w = u - Math.floor(u) - 0.5;
  const v = u + 0.5 - Math.floor(u + 0.5) - 0.5;
  const soft = 0.075;
  const round = (t: number): number => (Math.sqrt(t * t + soft * soft) - soft) / (Math.sqrt(0.25 + soft * soft) - soft);
  // tri = 1 at the top points, −1 at the bottom ones; each edge rounded at its inner notch only.
  const triTop = 2 * round(w) - 1;
  const triBot = 1 - 2 * round(v);
  const lean = wobble(x, 11, 0.35);
  return { top: mid - amp * triTop - half + lean + wobble(x, 17, 0.25), bot: mid - amp * triBot + half + lean + wobble(x, 23, 0.25) };
}

/** The zigzag's outline over x0..x1 (strip coordinates shifted down by yTop). */
export function zigShape(x0: number, x1: number, yTop = 0, step = 0.25): Pt[] {
  const top: Pt[] = [];
  const bot: Pt[] = [];
  for (let x = x0; x <= x1 + 1e-6; x += step) {
    const e = zigEdges(x);
    top.push(pt(x, yTop + e.top));
    bot.push(pt(x, yTop + e.bot));
  }
  return [...top, ...bot.reverse()];
}

/** Rows of keeled scales round the back (the adder has 21; a few fewer read better this small). */
const ROWS = 19;

/**
 * The keeled scales, row on row: each a pointed oval whose free edge points
 * to the tail (+x), a ridge down it lit on its upper side, shaded below,
 * the rows packed tighter where the back turns away. On the zigzag the lit
 * ridges show faintly, as keels catch the light on black scales. `len`
 * must divide the period.
 */
export function adderScales(ctx: CanvasRenderingContext2D, x0: number, x1: number, yTop: number, len: number, alpha: number): void {
  const perRow = Math.max(1, Math.round(ADDER_PERIOD / len));
  const span = 2.75;
  const dth = span / ROWS;
  ctx.save();
  ctx.lineCap = 'round';
  for (let r = 0; r < ROWS; r++) {
    const th = -span / 2 + dth * (r + 0.5);
    const sy = 12 + 11.3 * Math.sin(th);
    const y = yTop + sy;
    const hh = 11.3 * Math.cos(th) * dth * 0.55;
    const shift = (r % 2) * (len / 2);
    const first = Math.floor((x0 - len) / len) * len + shift;
    const edges = new Path2D();
    const lit = new Path2D();
    const dark = new Path2D();
    for (let x = first; x <= x1 + len; x += len) {
      const j = ((Math.round((x - shift) / len) % perRow) + perRow) % perRow;
      const h = hash(j, r);
      const b = (hash(j + 7, r + 3) - 0.5) * 0.26;
      const tip = x + len * (0.58 + 0.12 * h);
      edges.moveTo(x - len * 0.42, y - hh + b);
      edges.quadraticCurveTo(x + len * 0.2, y - hh * 0.8 + b, tip, y + b);
      edges.quadraticCurveTo(x + len * 0.2, y + hh * 0.8 + b, x - len * 0.42, y + hh + b);
      if (h > 0.3) {
        lit.moveTo(x - len * 0.14, y + b - 0.15);
        lit.lineTo(tip - len * (0.28 + 0.2 * h), y + b - 0.12);
      }
      dark.moveTo(x - len * 0.3, y + b + 0.17);
      dark.lineTo(tip - len * 0.22, y + b + 0.15);
    }
    const shade = sy / SNAKE_W;
    ctx.lineWidth = 0.24;
    ctx.strokeStyle = rgba(A.shadow, alpha * (0.4 + 0.8 * shade));
    ctx.stroke(edges);
    ctx.lineWidth = 0.2;
    ctx.strokeStyle = rgba(A.shadow, alpha * (0.28 + 0.55 * shade));
    ctx.stroke(dark);
    ctx.lineWidth = 0.24;
    ctx.strokeStyle = rgba(PAPER_FILL, alpha * Math.max(0.12, 0.8 - 0.85 * shade));
    ctx.stroke(lit);
  }
  ctx.restore();
}

/**
 * Paints one period on a tile at the target's own resolution, then lays the
 * tile end to end along `length`, so x = period + a is pixel for pixel x = a.
 */
export function layAdderTile(ctx: CanvasRenderingContext2D, length: number, paint: (tile: CanvasRenderingContext2D) => void): void {
  const res = Math.abs(ctx.getTransform().a) || 1;
  withScratch(Math.round(ADDER_PERIOD * res), Math.round(SNAKE_W * res), (tctx, tile) => {
    tctx.scale(res, res);
    paint(tctx);
    for (let x = 0; x < length; x += ADDER_PERIOD) ctx.drawImage(tile, x, 0, ADDER_PERIOD, SNAKE_W);
  });
}

/** Points every ~`step` px along a polyline, so a warp bends it smoothly. */
export function dense(pts: readonly Pt[], step = 0.8): Pt[] {
  const out: Pt[] = [pts[0]!];
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]!;
    const b = pts[i]!;
    const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / step));
    for (let k = 1; k <= n; k++) out.push(pt(a.x + ((b.x - a.x) * k) / n, a.y + ((b.y - a.y) * k) / n));
  }
  return out;
}

export type Warp = (p: Pt) => Pt;
