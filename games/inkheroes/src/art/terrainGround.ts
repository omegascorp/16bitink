import type { Cover, Grid, Terrain } from '../logic/map';
import { inGrid, tileIndex } from '../logic/map';
import type { Rng } from '../logic/rng';
import type { Pt } from './pen';
import { blades, dabs, strokes, type Dab } from './terrainBrush';

/**
 * The grounds' paints and the texture laid over each, shared by the
 * adventure map and the battlefield: deep emerald grass, umber earth,
 * stony grey-brown rough, ochre sand, cool grey snow, black-green swamp.
 */
export const TILE = 48;

export interface Ground {
  readonly base: string;
  readonly deep: string;
  readonly lit: string;
}

export const GROUND: Readonly<Record<Terrain, Ground>> = {
  grass: { base: '#36502a', deep: '#22351a', lit: '#5c7832' },
  dirt: { base: '#4b3a28', deep: '#30231a', lit: '#76603f' },
  rough: { base: '#55493a', deep: '#332b22', lit: '#7d6e58' },
  sand: { base: '#8e744a', deep: '#62502f', lit: '#b39762' },
  snow: { base: '#a3a8ab', deep: '#6e7782', lit: '#d4d0c4' },
  swamp: { base: '#2b3622', deep: '#182014', lit: '#4a5a32' },
  water: { base: '#1c3242', deep: '#0e1b26', lit: '#4a7280' },
};

/** The map's props' paints: foliage and rock. */
export const LEAF = { void: '#121c0c', dark: '#1f3116', mid: '#34502a', lit: '#5d7a33', glint: '#8fa055' } as const;
export const ROCK = { lit: '#80766a', mid: '#4f483f', dark: '#2e2822', deep: '#1a1512', snow: '#c9c2ae', snowShade: '#6c727c' } as const;

export const tileSeed = (x: number, y: number, salt: number): number => (Math.imul(x + 1, 73856093) ^ Math.imul(y + 1, 19349663) ^ Math.imul(salt, 83492791)) >>> 0;
export const terrainAt = (g: Grid, x: number, y: number): Terrain => g.terrain[tileIndex(g, Math.max(0, Math.min(g.w - 1, x)), Math.max(0, Math.min(g.h - 1, y)))]!;
export const coverAt = (g: Grid, x: number, y: number): Cover => (inGrid(g, x, y) ? g.cover[tileIndex(g, x, y)]! : 'none');

/** Paints a ground's texture over the square (x, y, size). */
export type Texturer = (ctx: CanvasRenderingContext2D, rng: Rng, x: number, y: number, size: number) => void;

const at = (rng: Rng, x: number, y: number, size: number): Pt => ({ x: x + 2 + rng() * (size - 4), y: y + 2 + rng() * (size - 4) });

/** Small stones: a dark seat, the body, a lit top. */
export function pebbles(ctx: CanvasRenderingContext2D, rng: Rng, x: number, y: number, size: number, n: number, body: string, lit: string, shade: string, big = 1): void {
  const list: Dab[] = Array.from({ length: n }, () => {
    const p = at(rng, x, y, size);
    const r = (0.8 + rng() * 1.5) * big;
    return { x: p.x, y: p.y, rx: r * 1.3, ry: r };
  });
  dabs(ctx, list.map((d) => ({ x: d.x + d.rx * 0.35, y: d.y + d.ry * 0.45, rx: d.rx * 1.05, ry: d.ry })), shade, 0.75);
  dabs(ctx, list, body, 1);
  dabs(ctx, list.map((d) => ({ x: d.x - d.rx * 0.3, y: d.y - d.ry * 0.35, rx: d.rx * 0.55, ry: d.ry * 0.45 })), lit, 0.8);
}

function specks(ctx: CanvasRenderingContext2D, rng: Rng, x: number, y: number, size: number, n: number, color: string, alpha: number, r = 0.55): void {
  dabs(ctx, Array.from({ length: n }, () => {
    const p = at(rng, x, y, size);
    const k = r * (0.6 + rng() * 0.8);
    return { x: p.x, y: p.y, rx: k, ry: k * 0.8 };
  }), color, alpha);
}

/** Short curved strokes (ripples, drifts): a lit crest with its shadow under it. */
function ripples(ctx: CanvasRenderingContext2D, rng: Rng, x: number, y: number, size: number, n: number, lit: string, dark: string, len = 7): void {
  const crest: [Pt, Pt][] = [];
  const under: [Pt, Pt][] = [];
  for (let i = 0; i < n; i++) {
    const p = at(rng, x, y, size);
    const l = len * (0.6 + rng() * 0.7);
    const a = { x: p.x - l / 2, y: p.y + 0.6 };
    const m = { x: p.x, y: p.y - 0.8 };
    const b = { x: p.x + l / 2, y: p.y + 0.4 };
    crest.push([a, m], [m, b]);
    under.push([{ x: a.x + 0.8, y: a.y + 1.1 }, { x: m.x + 0.8, y: m.y + 1.1 }], [{ x: m.x + 0.8, y: m.y + 1.1 }, { x: b.x + 0.8, y: b.y + 1.1 }]);
  }
  strokes(ctx, under, dark, 0.45, 0.8);
  strokes(ctx, crest, lit, 0.45, 0.7);
}

function grass(ctx: CanvasRenderingContext2D, rng: Rng, x: number, y: number, size: number): void {
  const k = size / TILE;
  blades(ctx, rng, x - 2, y - 2, size + 4, size + 4, Math.round(34 * k * k), '#15240e', '#7a9443');
  // Clumps: a dab of shadow with a fan of blades over it.
  for (let i = 0; i < 2; i++) {
    const p = at(rng, x, y, size);
    dabs(ctx, [{ x: p.x + 1, y: p.y + 0.6, rx: 4.2, ry: 1.4 }], '#101b0a', 0.4);
    const fan = (lit: boolean): [Pt, Pt][] => Array.from({ length: 5 }, (_, j) => {
      const lean = (j - 2) * 1.3 + (rng() - 0.5);
      const l = 3.5 + rng() * 2.5;
      const o = lit ? -0.5 : 0.5;
      return [{ x: p.x + o + (j - 2) * 0.6, y: p.y }, { x: p.x + o + lean, y: p.y - l }];
    });
    strokes(ctx, fan(false), '#142210', 0.7, 0.8);
    strokes(ctx, fan(true), '#86a04a', 0.55, 0.6);
  }
  // Now and then a few small flowers.
  if (rng() < 0.22) specks(ctx, rng, x, y, size, 3, rng() < 0.5 ? '#c9a548' : '#d8ceb2', 0.75, 0.6);
}

function dirt(ctx: CanvasRenderingContext2D, rng: Rng, x: number, y: number, size: number): void {
  const k = size / TILE;
  specks(ctx, rng, x, y, size, Math.round(18 * k * k), '#22160c', 0.6);
  specks(ctx, rng, x, y, size, Math.round(7 * k * k), '#806648', 0.45);
  pebbles(ctx, rng, x, y, size, 2, '#62503b', '#8a7458', '#1e140b');
  const p = at(rng, x, y, size);
  strokes(ctx, [[p, { x: p.x + 4, y: p.y + 1.5 }], [{ x: p.x + 4, y: p.y + 1.5 }, { x: p.x + 7, y: p.y + 0.8 }]], '#22160c', 0.5, 0.6);
  if (rng() < 0.5) blades(ctx, rng, x, y, size, size, 4, '#2a3016', '#6f7038', 3);
}

function rough(ctx: CanvasRenderingContext2D, rng: Rng, x: number, y: number, size: number): void {
  const k = size / TILE;
  specks(ctx, rng, x, y, size, Math.round(14 * k * k), '#1e1813', 0.55);
  pebbles(ctx, rng, x, y, size, Math.round(5 * k * k), '#605546', '#857860', '#17120d', 1.1);
  blades(ctx, rng, x, y, size, size, Math.round(6 * k * k), '#2a2a16', '#7c7444', 3.2);
}

function sand(ctx: CanvasRenderingContext2D, rng: Rng, x: number, y: number, size: number): void {
  const k = size / TILE;
  ripples(ctx, rng, x, y, size, Math.round(3 * k * k), '#c4a86e', '#5a4729', 8);
  specks(ctx, rng, x, y, size, Math.round(14 * k * k), '#4e3e22', 0.45, 0.45);
}

function snow(ctx: CanvasRenderingContext2D, rng: Rng, x: number, y: number, size: number): void {
  const k = size / TILE;
  ripples(ctx, rng, x, y, size, Math.round(3 * k * k), '#e6e1d4', '#66707e', 9);
  specks(ctx, rng, x, y, size, Math.round(5 * k * k), '#5c6470', 0.4, 0.6);
}

function swamp(ctx: CanvasRenderingContext2D, rng: Rng, x: number, y: number, size: number): void {
  const k = size / TILE;
  // Black pools with a cool sheen on their far side.
  for (let i = 0; i < Math.round(2 * k * k); i++) {
    const p = at(rng, x, y, size);
    const rx = 5 + rng() * 5;
    const ry = 1.8 + rng() * 1.2;
    dabs(ctx, [{ x: p.x, y: p.y, rx: rx + 0.8, ry: ry + 0.6 }], '#2a2a18', 0.7);
    dabs(ctx, [{ x: p.x, y: p.y, rx, ry }], '#0d1716', 0.9);
    strokes(ctx, [[{ x: p.x - rx * 0.4, y: p.y + ry * 0.45 }, { x: p.x + rx * 0.6, y: p.y + ry * 0.35 }]], '#6e8a86', 0.35, 0.6);
  }
  // Reeds and rushes, a dark brown head here and there.
  for (let i = 0; i < Math.round(3 * k * k); i++) {
    const p = at(rng, x, y, size);
    const reeds: [Pt, Pt][] = Array.from({ length: 4 }, (_, j) => {
      const h = 5 + rng() * 5;
      return [{ x: p.x + (j - 1.5) * 1.3, y: p.y }, { x: p.x + (j - 1.5) * 1.3 + (rng() - 0.5) * 2.5, y: p.y - h }];
    });
    strokes(ctx, reeds, '#121b0c', 0.85, 0.75);
    strokes(ctx, reeds.slice(0, 2).map(([a, b]) => [{ x: a.x - 0.4, y: a.y - 1 }, { x: b.x - 0.4, y: b.y + 0.5 }] as [Pt, Pt]), '#6c7a3a', 0.6, 0.55);
    if (rng() < 0.5) dabs(ctx, [{ x: reeds[1]![1].x, y: reeds[1]![1].y + 1.6, rx: 0.8, ry: 1.9 }], '#33200f', 0.95);
  }
}

/** Water's own texture is painted with its banks (terrainWater.ts); under a battle it never shows. */
const none: Texturer = () => undefined;

export const TEXTURE: Readonly<Record<Terrain, Texturer>> = { grass, dirt, rough, sand, snow, swamp, water: none };
