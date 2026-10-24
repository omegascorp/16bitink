import { COLS, hexAt, hexCentre, ROWS, type Hex } from '../logic/hex';
import type { Terrain } from '../logic/map';
import { createRng } from '../logic/rng';
import { INK, PAPER_FILL } from './palette';
import { ellipse, Pen, type Pt } from './pen';
import { drawRock, drawTree } from './terrainProps';
import { mix, rgba } from './wash';

/** A battle hex's radius, units. */
export const HEX = 40;
/** Room round the field for the heroes and the ground's fade. */
export const FIELD_PAD = { x: 120, y: 34 } as const;
export const FIELD_W = Math.ceil(COLS * Math.sqrt(3) * HEX + Math.sqrt(3) * HEX / 2) + FIELD_PAD.x * 2;
export const FIELD_H = Math.ceil((ROWS - 1) * HEX * 1.5 + HEX * 2) + FIELD_PAD.y * 2;

const GROUND: Readonly<Record<Terrain, { base: string; deep: string }>> = {
  grass: { base: '#b3c487', deep: '#7f9a5c' },
  dirt: { base: '#cdb488', deep: '#a38660' },
  rough: { base: '#c3b293', deep: '#97856a' },
  sand: { base: '#e3d39f', deep: '#c2ad75' },
  snow: { base: '#eef0ec', deep: '#c7cdd2' },
  swamp: { base: '#9fb08a', deep: '#6d8466' },
  water: { base: '#b3c487', deep: '#7f9a5c' },
};

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
 * The battlefield: the ground of the tile where the fight is, washed in
 * soft pools that fade out to paper at the edges, a faint pencil hex grid,
 * and the obstacles drawn where they stand.
 */
export function paintBattlefield(ctx: CanvasRenderingContext2D, terrain: Terrain, obstacles: readonly Hex[], seed: number): void {
  const rng = createRng(seed);
  const pen = new Pen(ctx, seed, 0.5);
  const g = GROUND[terrain];
  ctx.fillStyle = PAPER_FILL;
  ctx.fillRect(0, 0, FIELD_W, FIELD_H);
  for (let i = 0; i < 70; i++) {
    const x = FIELD_PAD.x * 0.6 + rng() * (FIELD_W - FIELD_PAD.x * 1.2);
    const y = FIELD_PAD.y * 0.4 + rng() * (FIELD_H - FIELD_PAD.y * 0.8);
    const r = 70 + rng() * 110;
    const color = mix(g.base, g.deep, rng() * 0.5);
    const grad = ctx.createRadialGradient(x, y, r * 0.1, x, y, r);
    grad.addColorStop(0, rgba(color, 0.55));
    grad.addColorStop(1, rgba(color, 0));
    ctx.fillStyle = grad;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  // Grass tufts and pebbles for texture.
  for (let i = 0; i < 160; i++) {
    const p = { x: FIELD_PAD.x * 0.7 + rng() * (FIELD_W - FIELD_PAD.x * 1.4), y: FIELD_PAD.y + rng() * (FIELD_H - FIELD_PAD.y * 2) };
    if (terrain === 'grass' || terrain === 'swamp') {
      for (let k = 0; k < 3; k++) pen.hair([p, { x: p.x + (k - 1) * 1.8, y: p.y - 4 - rng() * 3 }], 0.55, mix(g.deep, INK, 0.4), 0.55);
    } else {
      pen.dot(p.x, p.y, 0.7 + rng() * 0.8, mix(g.deep, INK, 0.3), 0.5);
    }
  }
  // The pencil grid.
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      // Edge by edge: the pen smooths a polyline, which would round a hex into a circle.
      const o = hexOutline(fieldPoint(hexAt(c, r)), HEX);
      o.forEach((a, i) => pen.hair([a, o[(i + 1) % 6]!], 0.9, INK, 0.42));
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
  // Fade the field's edges into the paper.
  const fade = ctx.createLinearGradient(0, 0, FIELD_W, 0);
  fade.addColorStop(0, rgba(PAPER_FILL, 1));
  fade.addColorStop(0.07, rgba(PAPER_FILL, 0));
  fade.addColorStop(0.93, rgba(PAPER_FILL, 0));
  fade.addColorStop(1, rgba(PAPER_FILL, 1));
  ctx.fillStyle = fade;
  ctx.fillRect(0, 0, FIELD_W, FIELD_H);
  void ellipse;
}
