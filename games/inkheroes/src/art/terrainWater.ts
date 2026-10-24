import type { Grid } from '../logic/map';
import { inGrid } from '../logic/map';
import { createRng } from '../logic/rng';
import type { Pt } from './pen';
import { blades, polyline, pool, strokes } from './terrainBrush';
import { GROUND, terrainAt, TILE, tileSeed } from './terrainGround';

/**
 * Deep water cut into the ground: each water tile's surface, its edge
 * drawn in a little where it meets land along a wandering line (a function
 * of where on the map it runs, so neighbouring tiles agree), then the bank:
 * dark wet earth, a faint lip of light on the water, a fine umber line.
 */
const WATER = GROUND.water;
const SEGS = 6;

/** How far the waterline sits in from the tile edge at a point on the map. */
const inset = (x: number, y: number): number => 4.5 + 1.8 * Math.sin(x * 0.19 + y * 0.23) + 1.2 * Math.sin(x * 0.47 - y * 0.31 + 1.7);

const isWater = (g: Grid, x: number, y: number): boolean => !inGrid(g, x, y) || terrainAt(g, x, y) === 'water';

interface Side {
  readonly land: boolean;
  readonly pts: Pt[];
  /** Into the water, a unit vector. */
  readonly inward: Pt;
}

/** The tile's four sides (top, right, bottom, left, clockwise), each a run of points along its waterline. */
function sides(g: Grid, x: number, y: number): Side[] {
  const px = x * TILE;
  const py = y * TILE;
  const defs = [
    { dx: 0, dy: -1, a: { x: px, y: py }, b: { x: px + TILE, y: py }, inward: { x: 0, y: 1 } },
    { dx: 1, dy: 0, a: { x: px + TILE, y: py }, b: { x: px + TILE, y: py + TILE }, inward: { x: -1, y: 0 } },
    { dx: 0, dy: 1, a: { x: px + TILE, y: py + TILE }, b: { x: px, y: py + TILE }, inward: { x: 0, y: -1 } },
    { dx: -1, dy: 0, a: { x: px, y: py + TILE }, b: { x: px, y: py }, inward: { x: 1, y: 0 } },
  ];
  const land = defs.map((d) => !isWater(g, x + d.dx, y + d.dy));
  return defs.map((d, i) => {
    const prev = land[(i + 3) % 4]!;
    const next = land[(i + 1) % 4]!;
    const pts: Pt[] = [];
    for (let k = 0; k <= SEGS; k++) {
      const u = k / SEGS;
      const p = { x: d.a.x + (d.b.x - d.a.x) * u, y: d.a.y + (d.b.y - d.a.y) * u };
      const off = land[i] ? inset(p.x, p.y) : -1;
      const q = { x: p.x + d.inward.x * off, y: p.y + d.inward.y * off };
      // At a corner the neighbouring side's waterline pulls the point in too.
      const along = { x: (d.b.x - d.a.x) / TILE, y: (d.b.y - d.a.y) / TILE };
      if (k === 0) {
        const o = prev ? inset(p.x, p.y) : -1;
        if (!(land[i] && prev)) pts.push({ x: q.x + along.x * o, y: q.y + along.y * o });
        else pts.push({ x: q.x + along.x * (o + 4), y: q.y + along.y * (o + 4) });
      } else if (k === SEGS) {
        const o = next ? inset(p.x, p.y) : -1;
        if (!(land[i] && next)) pts.push({ x: q.x - along.x * o, y: q.y - along.y * o });
        else pts.push({ x: q.x - along.x * (o + 4), y: q.y - along.y * (o + 4) });
      } else pts.push(q);
    }
    return { land: land[i]!, pts, inward: d.inward };
  });
}

/**
 * The water's surface over every water tile in `tiles`: one deep body
 * (all the tiles' outlines filled and clipped together, so no seam shows
 * between them), darker in the middle, shallows and bank shadow at its
 * edges, ripples.
 */
export function paintWater(ctx: CanvasRenderingContext2D, g: Grid, tiles: readonly Pt[]): void {
  const wet = tiles.filter((t) => inGrid(g, t.x, t.y) && terrainAt(g, t.x, t.y) === 'water').map((t) => ({ t, ss: sides(g, t.x, t.y) }));
  if (wet.length === 0) return;
  ctx.save();
  ctx.beginPath();
  for (const { ss } of wet) {
    ss.flatMap((s) => s.pts).forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.closePath();
  }
  ctx.fillStyle = WATER.base;
  ctx.fill('nonzero');
  ctx.clip('nonzero');
  for (const { t } of wet) {
    const rng = createRng(tileSeed(t.x, t.y, 21));
    pool(ctx, (t.x + 0.3 + rng() * 0.4) * TILE, (t.y + 0.3 + rng() * 0.4) * TILE, TILE * 0.9, WATER.deep, 0.45);
    pool(ctx, (t.x + rng()) * TILE, (t.y + rng()) * TILE, TILE * 0.6, WATER.lit, 0.14);
  }
  for (const { ss } of wet) {
    for (const s of ss) {
      if (!s.land) continue;
      polyline(ctx, s.pts, '#3a6470', 0.3, 14);
      // The bank throws its shade on the water below and right of it.
      if (s.inward.y > 0 || s.inward.x > 0) polyline(ctx, s.pts, '#07101b', 0.5, 9);
    }
  }
  for (const { t } of wet) ripples(ctx, createRng(tileSeed(t.x, t.y, 22)), t.x * TILE, t.y * TILE);
  ctx.restore();
}

/** Ripples on one tile of water: a lit crest, a dark trough under it, now and then a glint of sky. */
function ripples(ctx: CanvasRenderingContext2D, rng: () => number, px: number, py: number): void {
  const crest: [Pt, Pt][] = [];
  const trough: [Pt, Pt][] = [];
  for (let i = 0; i < 4; i++) {
    const p = { x: px + 6 + rng() * (TILE - 12), y: py + 6 + rng() * (TILE - 12) };
    const w = 4 + rng() * 5;
    crest.push([{ x: p.x - w, y: p.y }, { x: p.x, y: p.y - 1 }], [{ x: p.x, y: p.y - 1 }, { x: p.x + w, y: p.y }]);
    trough.push([{ x: p.x - w + 1, y: p.y + 1.4 }, { x: p.x + w + 1, y: p.y + 1.4 }]);
  }
  strokes(ctx, trough, '#0a1626', 0.5, 0.9);
  strokes(ctx, crest, '#7d9fab', 0.4, 0.65);
  if (rng() < 0.4) {
    const p = { x: px + 8 + rng() * (TILE - 16), y: py + 8 + rng() * (TILE - 16) };
    strokes(ctx, [[p, { x: p.x + 3, y: p.y }]], '#d6cba6', 0.35, 0.8);
  }
}

/** The bank along each side of a water tile that meets land. */
export function bankTile(ctx: CanvasRenderingContext2D, g: Grid, x: number, y: number): void {
  const rng = createRng(tileSeed(x, y, 23));
  for (const s of sides(g, x, y)) {
    if (!s.land) continue;
    polyline(ctx, s.pts, '#241b10', 0.9, 4.2);
    const lip = s.pts.map((p) => ({ x: p.x + s.inward.x * 2.6, y: p.y + s.inward.y * 2.6 }));
    polyline(ctx, lip, '#b9b39a', 0.28, 0.8);
    polyline(ctx, s.pts.map((p) => ({ x: p.x - s.inward.x * 0.8, y: p.y - s.inward.y * 0.8 })), '#1a120c', 0.75, 0.6);
    // Rushes along the land side.
    const a = s.pts[1]!;
    const b = s.pts[SEGS - 1]!;
    const x0 = Math.min(a.x, b.x) - s.inward.x * 4;
    const y0 = Math.min(a.y, b.y) - s.inward.y * 4;
    blades(ctx, rng, x0 - 1, y0 - 1, Math.abs(b.x - a.x) + 2, Math.abs(b.y - a.y) + 2, 6, '#101a0a', '#6f8640', 4.5);
  }
}
