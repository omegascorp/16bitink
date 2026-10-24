import type { Grid } from '../logic/map';
import { inGrid } from '../logic/map';
import { createRng } from '../logic/rng';
import { Pen, type Pt } from './pen';
import { drawMountain, drawPine, drawRock, drawTree } from './terrainProps';
import { groundShade, pool } from './terrainBrush';
import { coverAt, GROUND, terrainAt, TEXTURE, TILE, tileSeed } from './terrainGround';
import { roadTile } from './terrainRoad';
import { bankTile, paintWater } from './terrainWater';
import { mix } from './wash';

/**
 * The adventure map's ground, painted dark and rich as an old campaign
 * painting: each ground's colour laid in and blended softly into its
 * neighbours, pooled darker and lighter, textured (grass blades, stones,
 * reeds, ripples), the water cut in with its banks, dark earth roads, then
 * trees, peaks and rocks in front-to-back order. Painted in square chunks;
 * each tile's marks come from its own seed and chunks paint their
 * neighbours' overhang, so chunk edges never show.
 */
export { TILE };
export const CHUNK = 8;
/** How far (tiles) a tile's marks can reach outside it. */
const OVERHANG = 2;

/** Paints chunk (cx, cy) of the map onto ctx (already scaled to units, origin at the chunk's top-left). */
export function paintChunk(ctx: CanvasRenderingContext2D, g: Grid, cx: number, cy: number): void {
  const x0 = cx * CHUNK;
  const y0 = cy * CHUNK;
  ctx.save();
  ctx.translate(-x0 * TILE, -y0 * TILE);
  const tiles: { x: number; y: number }[] = [];
  for (let y = y0 - OVERHANG; y < y0 + CHUNK + OVERHANG; y++) for (let x = x0 - OVERHANG; x < x0 + CHUNK + OVERHANG; x++) tiles.push({ x, y });
  underlay(ctx, g, x0, y0);
  for (const t of tiles) poolTile(ctx, g, t.x, t.y);
  for (const t of tiles) if (inGrid(g, t.x, t.y)) TEXTURE[terrainAt(g, t.x, t.y)](ctx, createRng(tileSeed(t.x, t.y, 5)), t.x * TILE, t.y * TILE, TILE);
  for (const t of tiles) if (inGrid(g, t.x, t.y)) floorShade(ctx, g, t.x, t.y);
  paintWater(ctx, g, tiles);
  for (const t of tiles) if (inGrid(g, t.x, t.y) && terrainAt(g, t.x, t.y) === 'water') bankTile(ctx, g, t.x, t.y);
  // Roads in two passes, so each tile's fill covers its neighbours' dark verges where they meet.
  for (const t of tiles) if (coverAt(g, t.x, t.y) === 'road') roadTile(ctx, g, t.x, t.y, 'edge');
  for (const t of tiles) if (coverAt(g, t.x, t.y) === 'road') roadTile(ctx, g, t.x, t.y, 'fill');
  // Tall things last, back rows first, so nearer ones overlap them.
  for (const t of tiles) covers(ctx, g, t.x, t.y);
  ctx.restore();
}

/**
 * Every tile's ground colour at one pixel a tile, drawn up smoothly: the
 * grounds grade into each other across their borders. Water lays in as wet
 * dark bank (the water itself is cut in over it).
 */
function underlay(ctx: CanvasRenderingContext2D, g: Grid, x0: number, y0: number): void {
  const n = CHUNK + OVERHANG * 2;
  const small = document.createElement('canvas');
  small.width = n;
  small.height = n;
  const sc = small.getContext('2d');
  if (!sc) throw new Error('2D canvas is not available');
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const x = x0 - OVERHANG + i;
      const y = y0 - OVERHANG + j;
      const t = terrainAt(g, x, y);
      const rng = createRng(tileSeed(x, y, 3));
      const c = GROUND[t];
      const base = t === 'water' ? '#26301d' : c.base;
      sc.fillStyle = mix(base, rng() < 0.5 ? c.deep : c.lit, rng() * 0.35);
      sc.fillRect(i, j, 1, 1);
    }
  }
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(small, 0, 0, n, n, (x0 - OVERHANG) * TILE, (y0 - OVERHANG) * TILE, n * TILE, n * TILE);
  ctx.restore();
}

/** Soft pools of the ground's darker and lighter tones, so no field lies flat. */
function poolTile(ctx: CanvasRenderingContext2D, g: Grid, x: number, y: number): void {
  const t = terrainAt(g, x, y);
  if (t === 'water') return;
  const c = GROUND[t];
  const rng = createRng(tileSeed(x, y, 4));
  const cx = (x + 0.5) * TILE + (rng() - 0.5) * TILE * 0.8;
  const cy = (y + 0.5) * TILE + (rng() - 0.5) * TILE * 0.8;
  if (rng() < 0.6) pool(ctx, cx, cy, TILE * (0.5 + rng() * 0.8), c.deep, 0.4);
  if (rng() < 0.45) pool(ctx, cx + (rng() - 0.5) * TILE, cy + (rng() - 0.5) * TILE, TILE * (0.35 + rng() * 0.5), c.lit, 0.28);
}

/** The deep shade on the floor of a wood, and under a ridge. */
function floorShade(ctx: CanvasRenderingContext2D, g: Grid, x: number, y: number): void {
  const c = coverAt(g, x, y);
  if (c === 'tree' || c === 'pine') groundShade(ctx, (x + 0.6) * TILE, (y + 0.7) * TILE, TILE * 0.8, TILE * 0.55, '#0b1207', 0.6);
  else if (c === 'mountain') groundShade(ctx, (x + 0.6) * TILE, (y + 0.9) * TILE, TILE * 0.8, TILE * 0.3, '#120e0a', 0.5);
}

function covers(ctx: CanvasRenderingContext2D, g: Grid, x: number, y: number): void {
  const c = coverAt(g, x, y);
  if (c === 'none' || c === 'road') return;
  const pen = new Pen(ctx, tileSeed(x, y, 7), 0.45);
  const rng = createRng(tileSeed(x, y, 11));
  const base: Pt = { x: (x + 0.5) * TILE, y: (y + 0.85) * TILE };
  const wet = terrainAt(g, x, y + 1) === 'water';
  if (c === 'tree') {
    // A thicket rather than a planted row: two trees behind, a bigger one in front, now and then a conifer among them.
    const spots = [
      { x: base.x - 11 + rng() * 5, y: base.y - 13, k: 0.78 },
      { x: base.x + 9 + rng() * 5, y: base.y - 10, k: 0.82 },
      { x: base.x - 2 + rng() * 6, y: base.y + 1, k: 0.95 + rng() * 0.2 },
    ];
    for (const sp of spots) {
      if (rng() < 0.18) drawPine(pen, rng, sp, TILE * sp.k * 0.95);
      else drawTree(pen, rng, sp, TILE * sp.k, !wet);
    }
  } else if (c === 'pine') {
    drawPine(pen, rng, { x: base.x - 9 + rng() * 4, y: base.y - 10 }, TILE * 0.8);
    drawPine(pen, rng, { x: base.x + 4 + rng() * 5, y: base.y + 1 }, TILE);
  } else if (c === 'mountain') drawMountain(pen, rng, base, TILE, coverAt(g, x - 1, y) === 'mountain', coverAt(g, x + 1, y) === 'mountain');
  else if (c === 'rock') drawRock(pen, rng, base, TILE);
}
