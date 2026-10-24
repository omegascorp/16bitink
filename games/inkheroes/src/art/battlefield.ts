import { COLS, hexAt, hexCentre, ROWS, type Hex } from '../logic/hex';
import type { Terrain } from '../logic/map';
import { createRng } from '../logic/rng';
import { BACKDROP } from './palette';
import { Pen, type Pt } from './pen';
import { pool } from './terrainBrush';
import { GROUND, TEXTURE } from './terrainGround';
import { drawRock, drawTree } from './terrainProps';
import { rgba } from './wash';

/** A battle hex's radius, units. */
export const HEX = 40;
/** Room round the field for the heroes and the ground's fade. */
export const FIELD_PAD = { x: 120, y: 34 } as const;
export const FIELD_W = Math.ceil(COLS * Math.sqrt(3) * HEX + Math.sqrt(3) * HEX / 2) + FIELD_PAD.x * 2;
export const FIELD_H = Math.ceil((ROWS - 1) * HEX * 1.5 + HEX * 2) + FIELD_PAD.y * 2;

/** A hex's centre on the painted field, units. */
export function fieldPoint(h: Hex): Pt {
  const c = hexCentre(h, HEX);
  return { x: c.x + FIELD_PAD.x, y: c.y + FIELD_PAD.y };
}

/** A hex's outline, slightly inset. */
export function hexOutline(c: Pt, r = HEX * 0.97): Pt[] {
  return Array.from({ length: 6 }, (_, i) => {
    const a = Math.PI / 6 + (i * Math.PI) / 3;
    return { x: c.x + Math.cos(a) * r, y: c.y + Math.sin(a) * r };
  });
}

/**
 * The battlefield: the ground of the tile where the fight is, laid in deep
 * and pooled darker and lighter, textured as the map's ground is, a faint
 * engraved hex grid, the obstacles drawn where they stand, and the edges
 * sinking into the dark round the field.
 */
export function paintBattlefield(ctx: CanvasRenderingContext2D, terrain: Terrain, obstacles: readonly Hex[], seed: number): void {
  const rng = createRng(seed);
  const pen = new Pen(ctx, seed, 0.5);
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, FIELD_W, FIELD_H);
  ctx.clip();
  const g = GROUND[terrain === 'water' ? 'grass' : terrain];
  ctx.fillStyle = g.base;
  ctx.fillRect(0, 0, FIELD_W, FIELD_H);
  for (let i = 0; i < 60; i++) {
    const deep = rng() < 0.6;
    pool(ctx, rng() * FIELD_W, rng() * FIELD_H, 60 + rng() * 110, deep ? g.deep : g.lit, deep ? 0.45 : 0.3);
  }
  // The ground's own texture, a tile's worth at a time.
  const cell = 48;
  const texture = TEXTURE[terrain === 'water' ? 'grass' : terrain];
  for (let y = 0; y < FIELD_H; y += cell) for (let x = 0; x < FIELD_W; x += cell) texture(ctx, rng, x, y, cell);
  // The grid: a fine dark line, a hair of light under it, as if pressed into the turf.
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      // Edge by edge: the pen smooths a polyline, which would round a hex into a circle.
      const o = hexOutline(fieldPoint(hexAt(c, r)), HEX);
      o.forEach((a, i) => {
        const b = o[(i + 1) % 6]!;
        pen.hair([{ x: a.x + 0.8, y: a.y + 1 }, { x: b.x + 0.8, y: b.y + 1 }], 0.8, g.lit, 0.35);
        pen.hair([a, b], 1.1, '#0c0906', 0.7);
      });
    }
  }
  // Obstacles, back rows first.
  const sorted = [...obstacles].sort((a, b) => a - b);
  for (const h of sorted) {
    const c = fieldPoint(h);
    const base = { x: c.x, y: c.y + HEX * 0.45 };
    const r2 = createRng(seed ^ (h * 2654435761));
    const op = new Pen(ctx, seed + h, 0.5);
    if (r2() < 0.5) drawRock(op, r2, base, 64);
    else drawTree(op, r2, base, 58, true);
  }
  // Sink the field's edges into the dark round it, and darken its far and near margins.
  const fade = ctx.createLinearGradient(0, 0, FIELD_W, 0);
  fade.addColorStop(0, rgba(BACKDROP, 1));
  fade.addColorStop(0.08, rgba(BACKDROP, 0));
  fade.addColorStop(0.92, rgba(BACKDROP, 0));
  fade.addColorStop(1, rgba(BACKDROP, 1));
  ctx.fillStyle = fade;
  ctx.fillRect(0, 0, FIELD_W, FIELD_H);
  const vert = ctx.createLinearGradient(0, 0, 0, FIELD_H);
  vert.addColorStop(0, rgba(BACKDROP, 0.75));
  vert.addColorStop(0.1, rgba(BACKDROP, 0));
  vert.addColorStop(0.9, rgba(BACKDROP, 0));
  vert.addColorStop(1, rgba(BACKDROP, 0.6));
  ctx.fillStyle = vert;
  ctx.fillRect(0, 0, FIELD_W, FIELD_H);
  ctx.restore();
}
