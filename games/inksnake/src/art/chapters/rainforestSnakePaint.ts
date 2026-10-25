import { createRng } from '../../logic/rng';
import { pt, TAU } from '../kit';
import { PAPER_FILL } from '../palette';
import { Pen, type Pt, withScratch } from '../pen';
import { glaze } from '../snakes/cornPaint';
import { SNAKE_W } from '../types';
import { mix, rgba } from '../wash';

/**
 * The paradise flying snake's paint box and the brushwork its back strip
 * and its neck share: a glossy black ground, every scale washed bright
 * green-yellow in its middle so the black shows only as a fine net round
 * each one (yellower down the spine, greener and darker low on the flanks),
 * the red-orange "flowers" of four scales down the spine, and the
 * cylinder's light: the scales are smooth, so the gloss is sharp.
 * Everything is deterministic: the same call paints the same pixels.
 */
export const FLY_PAINT = {
  black: '#121815',
  blackLit: '#2c3a33',
  net: '#070a09',
  yellow: '#dfe35a',
  lime: '#b4d63c',
  green: '#76b232',
  greenDeep: '#3f7428',
  red: '#e2552c',
  redLit: '#f6913e',
  redDeep: '#9e2616',
  belly: '#cfe06e',
  lip: '#e4e8a0',
  mouth: '#efc8c4',
  mouthDeep: '#c07f88',
  throat: '#4a1c26',
  iris: '#c7a23a',
  tongue: '#2e3a3a',
  tongueTip: '#0c1110',
} as const;

const F = FLY_PAINT;

/** One period of the back, board px: five flowers down the spine. */
export const FLY_PERIOD = 120;
/** A scale's length along the body: it divides the period (30 to a period). */
export const FLY_SCALE = 4;
export const FLY_PER_ROW = FLY_PERIOD / FLY_SCALE;
/** Where the long contours run. */
export const TOP_EDGE = 1.2;
export const BOTTOM_EDGE = SNAKE_W - 1.2;
/** Rows of scales seen round the back, edge to edge; the middle one is the spine's. */
export const ROWS = 13;
export const SPINE_ROW = 6;

export const mod = (i: number, n: number): number => ((i % n) + n) % n;

/** A fixed pseudo-random 0..1 for (j, r). */
export function hash(j: number, r: number): number {
  const v = Math.sin(j * 12.9898 + r * 78.233) * 43758.5453;
  return v - Math.floor(v);
}

/** Row r's place across the strip (y from the strip's top) and its half height, the rows packed tighter where the back turns away. */
export function rowOf(r: number): { y: number; hh: number } {
  const span = 2.62;
  const dth = span / ROWS;
  const th = -span / 2 + dth * (r + 0.5);
  return { y: 12 + 11.2 * Math.sin(th), hh: 11.2 * Math.cos(th) * dth * 0.5 };
}

/** The x of scale j in row r (rows alternate by half a scale). */
export const scaleX = (j: number, r: number): number => j * FLY_SCALE + (r % 2) * (FLY_SCALE / 2);

/** The back's cross-section wash, `yTop` being where the strip's y = 0 lies: black, a little lifted where the light hits. */
export function flyCrossWash(ctx: CanvasRenderingContext2D, yTop: number): CanvasGradient {
  const g = ctx.createLinearGradient(0, yTop, 0, yTop + SNAKE_W);
  g.addColorStop(0, '#34443b');
  g.addColorStop(0.18, '#1f2a25');
  g.addColorStop(0.5, F.black);
  g.addColorStop(1, '#0a0e0c');
  return g;
}

/** What colour scale (j, r) is washed: yellow-green down the back, deeper green low on the flanks, each a little its own. */
function scaleColour(j: number, r: number, red: boolean): string {
  const h = hash(mod(j, FLY_PER_ROW), r + 11);
  if (red) return mix(F.red, F.redLit, 0.15 + 0.3 * h);
  const across = Math.abs(r - SPINE_ROW) / SPINE_ROW;
  const lowSide = r > SPINE_ROW ? across : across * 0.5;
  const base = lowSide < 0.45 ? mix(F.yellow, F.lime, lowSide / 0.45) : mix(F.lime, F.green, (lowSide - 0.45) / 0.55);
  // Drifts of brighter and duller scales, as a wash dries unevenly: whole waves to a period, so they repeat with it.
  const u = (TAU * mod(j, FLY_PER_ROW)) / FLY_PER_ROW;
  const drift = 0.6 * Math.sin(3 * u + 1.3 + r * 0.35) + 0.4 * Math.sin(5 * u + r * 0.8);
  const tone = mix(base, drift > 0 ? F.yellow : F.greenDeep, Math.abs(drift) * 0.32);
  return mix(tone, h > 0.5 ? F.yellow : F.greenDeep, Math.abs(h - 0.5) * 0.45);
}

/**
 * The washed middle of a scale at x, y: a rounded diamond (the scales lie in
 * oblique rows, each one's corners touching its neighbours'), its rear point
 * drawn out a little towards the tail, wobbled by its own seed.
 */
function scaleShape(x: number, y: number, hh: number, k: number, seed: number): Pt[] {
  const rng = createRng(seed);
  const l = FLY_SCALE * 0.5 * k;
  const h = hh * 2 * k;
  const pts: Pt[] = [];
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU;
    const c = Math.cos(a);
    const s = Math.sin(a);
    const e = 0.72;
    const reach = c > 0 ? 1.12 : 0.92;
    const wob = 1 + (rng() - 0.5) * 0.18;
    pts.push(pt(x + Math.sign(c) * Math.abs(c) ** e * l * reach * wob, y + Math.sign(s) * Math.abs(s) ** e * h * wob));
  }
  return pts;
}

export interface ScaleOpts {
  /** Which scales are the red-orange flowers' petals. */
  readonly red?: (j: number, r: number) => boolean;
  /** How much of each scale the colour covers (the rest is the black net). */
  readonly fill?: number;
  readonly alpha?: number;
  /** Fade the colour out over the far flank rows (the neck under the head). */
  readonly rows?: readonly number[];
}

/**
 * The scales, row on row: each its own wash of colour over the black, the
 * pigment pooled darker at its edge and lifted pale at its upper front where
 * the gloss catches it; drawn from the tail end forward, so each scale lies
 * over the base of the one behind, as they overlap.
 */
export function flyScales(ctx: CanvasRenderingContext2D, x0: number, x1: number, yTop: number, seed: number, o: ScaleOpts = {}): void {
  const fill = o.fill ?? 0.8;
  const alpha = o.alpha ?? 0.94;
  const rows = o.rows ?? Array.from({ length: ROWS }, (_, r) => r);
  for (const r of rows) {
    const { y, hh } = rowOf(r);
    const shade = Math.max(0, (y - 12) / 12);
    const jFrom = Math.floor((x0 - FLY_SCALE * 2) / FLY_SCALE);
    const jTo = Math.ceil((x1 + FLY_SCALE * 2) / FLY_SCALE);
    for (let j = jTo; j >= jFrom; j--) {
      const jj = mod(j, FLY_PER_ROW);
      const red = o.red?.(j, r) ?? false;
      const x = scaleX(j, r);
      const k = (red ? fill + 0.1 : fill) * (0.93 + 0.12 * hash(jj, r + 3));
      const shape = scaleShape(x, yTop + y, hh, k, seed + jj * 31 + r * 7);
      const pen = new Pen(ctx, seed + jj * 13 + r, 0.2);
      const colour = scaleColour(j, r, red);
      pen.fill(shape, colour, alpha * (1 - 0.5 * shade));
      pen.clipped(shape, () => {
        // Pooled at the drying edge, lifted at the front where the light hits.
        ctx.save();
        ctx.lineJoin = 'round';
        ctx.strokeStyle = rgba(red ? F.redDeep : F.greenDeep, 0.55);
        ctx.lineWidth = Math.min(1, hh * 0.6);
        ctx.beginPath();
        shape.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
        ctx.closePath();
        ctx.stroke();
        ctx.restore();
        glaze(ctx, x - FLY_SCALE * 0.15, yTop + y - hh * 0.35, FLY_SCALE * 0.45, hh * 0.5, 0, red ? F.redLit : PAPER_FILL, red ? 0.5 : 0.3 * (1 - shade));
      });
      // Now and then the pen picks out a scale's free edge, towards the tail.
      if (hash(jj + 5, r + 17) > 0.58) pen.hair(shape.slice(9).concat(shape.slice(0, 4)), 0.3, F.net, 0.55 + 0.3 * shade);
    }
  }
}

/**
 * Whether scale (j, r) is a petal of a flower centred at one of `centres`
 * (x along the strip, between two spine scales): the two spine scales either
 * side of it and the scale on each neighbouring row that sits over it.
 */
export function inFlower(j: number, r: number, centres: readonly number[]): boolean {
  const x = scaleX(j, r);
  for (const c of centres) {
    const off = Math.abs(x - c);
    if (r === SPINE_ROW && Math.abs(off - FLY_SCALE / 2) < 0.1) return true;
    if ((r === SPINE_ROW - 1 || r === SPINE_ROW + 1) && off < 0.1) return true;
  }
  return false;
}

/**
 * Light and shade over the painted scales, a cylinder lit from the upper
 * left: a sharp glossy band high on the back (the scales are smooth), the
 * far flank sunk in shadow with a rim of reflected green at its edge.
 */
export function flyModel(ctx: CanvasRenderingContext2D, x0: number, x1: number, yTop: number): void {
  const h = SNAKE_W;
  const dark = ctx.createLinearGradient(0, yTop, 0, yTop + h);
  dark.addColorStop(0, rgba(F.net, 0.1));
  dark.addColorStop(0.12, rgba(F.net, 0));
  dark.addColorStop(0.5, rgba(F.net, 0));
  dark.addColorStop(0.7, rgba(F.net, 0.18));
  dark.addColorStop(0.88, rgba(F.net, 0.42));
  dark.addColorStop(0.95, rgba(F.net, 0.36));
  dark.addColorStop(1, rgba(F.net, 0.1));
  const gloss = ctx.createLinearGradient(0, yTop, 0, yTop + h);
  gloss.addColorStop(0.1, rgba(PAPER_FILL, 0));
  gloss.addColorStop(0.2, rgba(PAPER_FILL, 0.36));
  gloss.addColorStop(0.25, rgba(PAPER_FILL, 0.3));
  gloss.addColorStop(0.36, rgba(PAPER_FILL, 0));
  const rim = ctx.createLinearGradient(0, yTop + h * 0.86, 0, yTop + h);
  rim.addColorStop(0, rgba(F.green, 0));
  rim.addColorStop(0.7, rgba(F.green, 0.16));
  rim.addColorStop(1, rgba(F.green, 0));
  ctx.save();
  for (const style of [dark, gloss, rim]) {
    ctx.fillStyle = style;
    ctx.fillRect(x0, yTop - 4, x1 - x0, h + 8);
  }
  ctx.restore();
}

/** Glints of the gloss band: short broken strokes along the scales' lit fronts, every `w` along when `wrap`. */
export function glossGlints(ctx: CanvasRenderingContext2D, x0: number, w: number, yTop: number, seed: number, count: number, wrap: boolean): void {
  const rng = createRng(seed);
  ctx.save();
  ctx.lineCap = 'round';
  for (let i = 0; i < count; i++) {
    const x = x0 + rng() * w;
    const y = yTop + 4.2 + rng() * 2.8;
    const l = 0.8 + rng() * 2.2;
    ctx.strokeStyle = rgba(PAPER_FILL, 0.35 + rng() * 0.4);
    ctx.lineWidth = 0.3 + rng() * 0.35;
    for (const k of wrap ? [-w, 0, w] : [0]) {
      ctx.beginPath();
      ctx.moveTo(x + k, y);
      ctx.lineTo(x + k + l, y - 0.1);
      ctx.stroke();
    }
  }
  ctx.restore();
}

/**
 * Paints one period on a tile at the target's own resolution, then lays the
 * tile end to end along `length`, so x = period + a is pixel for pixel x = a.
 */
export function layFlyTile(ctx: CanvasRenderingContext2D, length: number, paint: (tile: CanvasRenderingContext2D) => void): void {
  const res = Math.abs(ctx.getTransform().a) || 1;
  withScratch(Math.round(FLY_PERIOD * res), Math.round(SNAKE_W * res), (tctx, tile) => {
    tctx.scale(res, res);
    paint(tctx);
    for (let x = 0; x < length; x += FLY_PERIOD) ctx.drawImage(tile, x, 0, FLY_PERIOD, SNAKE_W);
  });
}
