import { createRng, type Rng } from '../../logic/rng';
import type { LevelDef, ZoneDef } from '../../level/types';
import { BOARD } from '../../level/types';
import { arc, polar, SHADOW } from '../groundKit';
import { closed, type Draw, pt } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { mix } from '../wash';
import { inPoly } from './barrensPlaceKit';

/**
 * The Jungle's paint box and the small things its boards are built from:
 * a forest floor by a stream in northern India, sal and teak leaves fallen
 * on dark loam, bamboo, fallen teak, a ruined temple's laterite blocks.
 */
export const LOAM = '#b4a078';
export const LOAM_PALE = '#c4b08a';
export const LOAM_DEEP = '#5a4a34';
export const UMBER = '#3e3224';
export const SHADE = '#2e3a34';
export const MOSS = '#6f8a44';
export const MOSS_DEEP = '#3d5a2c';
export const MOSS_LIT = '#a9bd6c';
/** Fallen leaves: fresh-dry ochres and russets, old greyed browns, a few still green. */
export const LEAF_TONES = ['#b97c3c', '#c99654', '#9a5e30', '#d6ae66', '#a86a3a', '#8c6440'] as const;
export const LEAF_OLD = '#9a8a6c';
export const LEAF_GREEN = '#7d9448';
export const WATER = '#6b9a94';
export const WATER_DEEP = '#2f5c62';
export const WATER_LIT = '#c4dcd0';
export const SILT = '#c9b88e';
export const SILT_WET = '#8f8264';
export const PEBBLE = '#aaa192';
export const BAMBOO = '#8fa64a';
export const BAMBOO_DEEP = '#4c6a2a';
export const BAMBOO_LIT = '#d2dc8e';
export const BAMBOO_OLD = '#c7b26a';
export const BARK = '#6c5440';
export const BARK_DEEP = '#33261c';
export const BARK_LIT = '#a48a6c';
export const HEARTWOOD = '#c4935e';
export const STONE = '#b9a487';
export const STONE_LIT = '#e3d6ba';
export const STONE_DEEP = '#6f5e4c';
export const LATERITE = '#a7664a';
export const CLAY = '#b4835a';
export const CLAY_DEEP = '#6e4630';
export const CLAY_LIT = '#dcb58a';

export const W = BOARD.w;
export const H = BOARD.h;

/** A seeded rng for a spot, so a thing paints the same wherever it's called from. */
export const rngAt = (x: number, y: number, k = 0): Rng => createRng(Math.round(x * 137 + y * 61 + k * 911) + 7321);

/** The level's stream(s): the water zones. */
export function streamsOf(level: LevelDef): Extract<ZoneDef, { shape: 'poly' }>[] {
  return (level.zones ?? []).filter((z): z is Extract<ZoneDef, { shape: 'poly' }> => z.kind === 'water' && z.shape === 'poly');
}

/** Whether a point is in any of the polygons, or within `pad` of one's points' hull edge (cheap: tests offsets). */
export function inAny(polys: readonly (readonly Pt[])[], x: number, y: number, pad = 0): boolean {
  for (const poly of polys) {
    if (inPoly(poly, x, y)) return true;
    if (pad > 0 && (inPoly(poly, x + pad, y) || inPoly(poly, x - pad, y) || inPoly(poly, x, y + pad) || inPoly(poly, x, y - pad))) return true;
  }
  return false;
}

/** A broad leaf's outline (sal or teak: ovate, a short point), base at `c`, pointing `ang`, `len` long. */
export function leafShape(c: Pt, ang: number, len: number, wide: number, curl: number): Pt[] {
  const n = 12;
  const tip = polar(c, ang, len);
  const top: Pt[] = [];
  const bot: Pt[] = [];
  const nx = -Math.sin(ang);
  const ny = Math.cos(ang);
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    const mid = pt(c.x + (tip.x - c.x) * u + nx * curl * Math.sin(Math.PI * u), c.y + (tip.y - c.y) * u + ny * curl * Math.sin(Math.PI * u));
    const half = len * wide * Math.sin(Math.PI * u ** 0.8) ** 0.9 * (1 - 0.25 * u);
    top.push(pt(mid.x + nx * half, mid.y + ny * half));
    bot.push(pt(mid.x - nx * half * 0.92, mid.y - ny * half * 0.92));
  }
  return [...top, ...bot.reverse()];
}

export interface LeafOpts {
  /** How washed-out (old, flattened into the loam) it is, 0..1. */
  readonly age: number;
  /** Its shadow's reach (0 for a leaf lying flat). */
  readonly lift: number;
  readonly tone?: string;
}

/** A fallen leaf: a wash, its midrib and a few side veins, a pen edge, a little shadow where it curls up off the ground. */
export function leaf(d: Draw, c: Pt, ang: number, len: number, rng: Rng, o: LeafOpts): void {
  const { pen } = d;
  const wide = 0.26 + rng() * 0.14;
  const curl = (rng() - 0.5) * len * 0.18;
  const shape = leafShape(c, ang, len, wide, curl);
  const base = o.tone ?? LEAF_TONES[Math.floor(rng() * LEAF_TONES.length)]!;
  const tone = mix(base, LEAF_OLD, o.age);
  const a = 1 - o.age * 0.55;
  if (o.lift > 0) pen.fill(shape.map((p) => pt(p.x + SHADOW.x * o.lift, p.y + SHADOW.y * o.lift)), UMBER, 0.22 * a);
  pen.fill(shape, PAPER_FILL, 0.35 * a);
  pen.fill(shape, tone, 0.8 * a);
  // One half catches the light, the other is a shade deeper (the leaf folds a little along its midrib).
  const half = shape.slice(0, Math.ceil(shape.length / 2));
  pen.fill([...half, c], mix(tone, UMBER, 0.25), 0.3 * a);
  const tip = polar(c, ang, len);
  const rib = arc(c, tip, curl * 0.5, 8);
  pen.hair(rib, 0.45, mix(tone, UMBER, 0.45), 0.7 * a);
  if (len > 9) {
    for (let k = 2; k < rib.length - 1; k += 2) {
      for (const s of [1, -1]) {
        const p = rib[k]!;
        const v = polar(p, ang + s * 0.9, len * wide * 0.7);
        pen.hair([p, pt((p.x + v.x) / 2 + (v.x - p.x) * 0.1, (p.y + v.y) / 2), v], 0.3, mix(tone, UMBER, 0.4), 0.45 * a);
      }
    }
  }
  pen.hair(closed(shape), 0.4, d.ink, 0.5 * a);
  pen.hair([polar(c, ang + Math.PI, len * 0.12), c], 0.6, mix(tone, UMBER, 0.5), 0.7 * a);
}

/** A board-sized grid of values painted soft: `value(x, y)` 0..1 as `colour` at most `alpha`, every `cell` px, smoothed up. */
export function field(d: Draw, cell: number, colour: string, alpha: number, value: (x: number, y: number) => number): void {
  const cols = Math.ceil(W / cell) + 1;
  const rows = Math.ceil(H / cell) + 1;
  const canvas = document.createElement('canvas');
  canvas.width = cols;
  canvas.height = rows;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
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
      img.data[i + 3] = Math.round(255 * alpha * Math.max(0, Math.min(1, value(x * cell, y * cell))));
    }
  }
  ctx.putImageData(img, 0, 0);
  const out = d.pen.ctx;
  out.save();
  out.imageSmoothingEnabled = true;
  out.imageSmoothingQuality = 'high';
  out.drawImage(canvas, 0, 0, cols * cell, rows * cell);
  out.restore();
  canvas.width = 0;
  canvas.height = 0;
}
