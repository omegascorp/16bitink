import { createRng, type Rng } from '../../logic/rng';
import { BOARD, type LevelDef, type ZoneDef } from '../../level/types';
import { type Draw, pt } from '../kit';
import { makeCanvas, type Pt, shrink } from '../pen';
import { noiseOf, smoothstep } from '../places/farmKit';

/**
 * What the Dunes' painters share: the desert's colours, the wind (from the
 * west, a little north), where a level's loose sand lies (its 'sand' zones,
 * with soft, wind-ragged edges), and a soft raster layer for washes that
 * follow a field rather than a shape.
 */
export const W = BOARD.w;
export const H = BOARD.h;

export const SAND = '#ecdcb6';
export const SAND_LIT = '#fbf3df';
export const SAND_WARM = '#e4c896';
export const SAND_DEEP = '#a8845a';
export const SAND_COOL = '#8e8296';
export const GRAVEL = '#c9b48e';
export const GRAVEL_DEEP = '#8c7558';
export const VARNISH = '#5e4636';
export const RUST = '#a5683f';
export const QUARTZ = '#f2ebdc';
export const STONE_GREY = '#8f877b';
export const STRAW = '#cdb279';
export const STRAW_DEEP = '#9a8250';
export const SAGE = '#8d9a74';
export const SAGE_DEEP = '#55603f';
export const OLIVE = '#5e6b38';

/** The wind's direction (it blows towards +x), and across it. */
export const WIND = pt(0.97, 0.24);
export const ACROSS = pt(-WIND.y, WIND.x);

export const rngAt = (x: number, y: number, k = 0): Rng => createRng(Math.round(x * 151 + y * 83 + k * 1013) + 7717);

/** How far inside a zone a point is (negative outside). */
function insideOf(z: ZoneDef, x: number, y: number): number {
  if (z.shape === 'circle') return z.r - Math.hypot(x - z.x, y - z.y);
  if (z.shape === 'rect') return Math.min(x - z.x, z.x + z.w - x, y - z.y, z.y + z.h - y);
  let inside = false;
  let near = Infinity;
  const pts = z.points;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const a = pts[i]!;
    const b = pts[j]!;
    if (a.y > y !== b.y > y && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / (dx * dx + dy * dy || 1)));
    near = Math.min(near, Math.hypot(x - a.x - dx * t, y - a.y - dy * t));
  }
  return inside ? near : -near;
}

/** How softly overlapping sand zones merge, px. */
const BLEND = 26;

/** 0..1 at a spot: how much loose sand lies there. */
export type SandField = (x: number, y: number) => number;

/**
 * The level's loose sand: 1 inside its sand zones, fading out over a ragged
 * edge about 12 px each side of the zone's line; `deep` instead rises over
 * that many px in from the edge (how tall the dunes may stand there).
 */
export function sandOf(level: LevelDef, deep = 0): SandField {
  const zones = (level.zones ?? []).filter((z) => z.kind === 'sand');
  const rng = createRng(4401);
  const rag = noiseOf(rng, 40);
  const rag2 = noiseOf(rng, 13);
  return (x, y) => {
    if (zones.length === 0) return 0;
    // A smooth union, so where two dunes meet there's no crease.
    const ins = zones.map((z) => insideOf(z, x, y));
    const top = Math.max(...ins);
    const best = top + BLEND * Math.log(ins.reduce((s, v) => s + Math.exp((v - top) / BLEND), 0));
    const edge = best + rag(x, y) * 7 + rag2(x, y) * 3;
    return deep > 0 ? smoothstep(edge / deep) : smoothstep((edge + 12) / 24);
  };
}

/**
 * A soft layer painted from a field: `alpha(x, y)` (0..1) sampled every
 * `cell` px into a small image of one colour, then laid over the board
 * smoothed, the way a wash spreads.
 */
export function fieldWash(d: Draw, cell: number, colour: string, alpha: (x: number, y: number) => number): void {
  const cols = Math.ceil(W / cell) + 1;
  const rows = Math.ceil(H / cell) + 1;
  const { canvas, ctx } = makeCanvas(cols, rows);
  const img = ctx.createImageData(cols, rows);
  const r = parseInt(colour.slice(1, 3), 16);
  const g = parseInt(colour.slice(3, 5), 16);
  const b = parseInt(colour.slice(5, 7), 16);
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const i = (y * cols + x) * 4;
      img.data[i] = r;
      img.data[i + 1] = g;
      img.data[i + 2] = b;
      img.data[i + 3] = Math.round(255 * Math.max(0, Math.min(1, alpha(x * cell, y * cell))));
    }
  }
  ctx.putImageData(img, 0, 0);
  const out = d.pen.ctx;
  out.save();
  out.imageSmoothingEnabled = true;
  out.imageSmoothingQuality = 'high';
  out.drawImage(canvas, 0, 0, cols, rows, 0, 0, cols * cell, rows * cell);
  out.restore();
  shrink(canvas);
}

/** A point `l` along `a` from p. */
export const along = (p: Pt, a: Pt, l: number): Pt => pt(p.x + a.x * l, p.y + a.y * l);
