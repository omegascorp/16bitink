import type { Cover, Grid, Terrain } from '../logic/map';
import { inGrid, tileIndex } from '../logic/map';
import { createRng, type Rng } from '../logic/rng';
import { INK, PAPER_FILL } from './palette';
import { ellipse, Pen, type Pt } from './pen';
import { mix, rgba } from './wash';
import { drawMountain, drawPine, drawRock, drawTree } from './terrainProps';

/**
 * The adventure map's ground, painted like a campaign map in a field
 * journal: soft watercolour pools per tile that bleed into each other, pen
 * texture per ground, roads, a shoreline, then trees, peaks and rocks drawn
 * in front-to-back order. Painted in square chunks; each tile's marks come
 * from its own seed and chunks paint their neighbours' overhang, so chunk
 * edges never show.
 */
export const TILE = 48;
export const CHUNK = 8;
/** How far (tiles) a tile's marks can reach outside it. */
const OVERHANG = 2;

const WASH: Readonly<Record<Terrain, string>> = {
  grass: '#a9bf7c', dirt: '#c9ad7f', rough: '#b8a585', sand: '#e1cf98', snow: '#eef0ee', swamp: '#7f9a78', water: '#7fa6c4',
};

const tileSeed = (x: number, y: number, salt: number): number => (Math.imul(x + 1, 73856093) ^ Math.imul(y + 1, 19349663) ^ Math.imul(salt, 83492791)) >>> 0;

const terrainAt = (g: Grid, x: number, y: number): Terrain => g.terrain[tileIndex(g, Math.max(0, Math.min(g.w - 1, x)), Math.max(0, Math.min(g.h - 1, y)))]!;
const coverAt = (g: Grid, x: number, y: number): Cover => (inGrid(g, x, y) ? g.cover[tileIndex(g, x, y)]! : 'none');

/** Paints chunk (cx, cy) of the map onto ctx (already scaled to units, origin at the chunk's top-left). */
export function paintChunk(ctx: CanvasRenderingContext2D, g: Grid, cx: number, cy: number): void {
  const x0 = cx * CHUNK;
  const y0 = cy * CHUNK;
  ctx.save();
  ctx.translate(-x0 * TILE, -y0 * TILE);
  ctx.fillStyle = PAPER_FILL;
  ctx.fillRect(x0 * TILE, y0 * TILE, CHUNK * TILE, CHUNK * TILE);
  const tiles: { x: number; y: number }[] = [];
  for (let y = y0 - OVERHANG; y < y0 + CHUNK + OVERHANG; y++) for (let x = x0 - OVERHANG; x < x0 + CHUNK + OVERHANG; x++) tiles.push({ x, y });
  for (const t of tiles) washTile(ctx, g, t.x, t.y);
  for (const t of tiles) if (inGrid(g, t.x, t.y)) textureTile(ctx, g, t.x, t.y);
  for (const t of tiles) if (inGrid(g, t.x, t.y)) shoreTile(ctx, g, t.x, t.y);
  // Roads in two passes, so each tile's light fill covers its neighbours' inked edges where they meet.
  for (const t of tiles) if (coverAt(g, t.x, t.y) === 'road') roadTile(ctx, g, t.x, t.y, 'edge');
  for (const t of tiles) if (coverAt(g, t.x, t.y) === 'road') roadTile(ctx, g, t.x, t.y, 'fill');
  // Tall things last, back rows first, so nearer ones overlap them.
  for (const t of tiles) {
    const c = coverAt(g, t.x, t.y);
    if (c === 'none' || c === 'road') continue;
    const pen = new Pen(ctx, tileSeed(t.x, t.y, 7), 0.55);
    const rng = createRng(tileSeed(t.x, t.y, 11));
    const base = { x: (t.x + 0.5) * TILE, y: (t.y + 0.85) * TILE };
    if (c === 'tree') {
      // A copse rather than a planted row: a small tree behind, a bigger one in front, nudged off the grid.
      const back = { x: base.x - 8 + rng() * 6, y: base.y - 10 };
      const front = { x: base.x + 4 + rng() * 6, y: base.y + 2 };
      drawTree(pen, rng, back, TILE * 0.8, true);
      drawTree(pen, rng, front, TILE * (0.95 + rng() * 0.2), terrainAt(g, t.x, t.y + 1) !== 'water');
    }
    else if (c === 'pine') drawPine(pen, rng, base, TILE);
    else if (c === 'mountain') drawMountain(pen, rng, base, TILE, coverAt(g, t.x - 1, t.y) === 'mountain', coverAt(g, t.x + 1, t.y) === 'mountain');
    else if (c === 'rock') drawRock(pen, rng, base, TILE);
  }
  ctx.restore();
}

/** A soft pool of the tile's ground colour, larger than the tile so neighbours bleed together. */
function washTile(ctx: CanvasRenderingContext2D, g: Grid, x: number, y: number): void {
  const t = terrainAt(g, x, y);
  const rng = createRng(tileSeed(x, y, 3));
  const cx = (x + 0.5) * TILE + (rng() - 0.5) * 10;
  const cy = (y + 0.5) * TILE + (rng() - 0.5) * 10;
  const color = mix(WASH[t], '#f6eed8', rng() * 0.18);
  const r = TILE * (t === 'water' ? 0.95 : 1.05);
  const grad = ctx.createRadialGradient(cx, cy, r * 0.15, cx, cy, r);
  grad.addColorStop(0, rgba(color, 0.95));
  grad.addColorStop(0.6, rgba(color, 0.75));
  grad.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = grad;
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  // A second, darker granulating pool off-centre: watercolour never lies flat.
  if (rng() < 0.55) {
    const dx = cx + (rng() - 0.5) * TILE * 0.6;
    const dy = cy + (rng() - 0.5) * TILE * 0.6;
    const rr = TILE * (0.3 + rng() * 0.35);
    const g2 = ctx.createRadialGradient(dx, dy, 0, dx, dy, rr);
    g2.addColorStop(0, rgba(mix(color, '#3a4a3a', 0.25), 0.28));
    g2.addColorStop(1, rgba(color, 0));
    ctx.fillStyle = g2;
    ctx.fillRect(dx - rr, dy - rr, rr * 2, rr * 2);
  }
}

/** Pen texture by ground: grass tufts, dirt stipple, rough pebbles, swamp reeds, sand dots, water ripples. */
function textureTile(ctx: CanvasRenderingContext2D, g: Grid, x: number, y: number): void {
  const t = terrainAt(g, x, y);
  const rng = createRng(tileSeed(x, y, 5));
  const pen = new Pen(ctx, tileSeed(x, y, 6), 0.35);
  const px = x * TILE;
  const py = y * TILE;
  const at = (): Pt => ({ x: px + 4 + rng() * (TILE - 8), y: py + 4 + rng() * (TILE - 8) });
  if (t === 'grass') {
    for (let i = 0; i < 4; i++) tuft(pen, rng, at(), '#4d6b3a');
  } else if (t === 'dirt') {
    for (let i = 0; i < 14; i++) {
      const p = at();
      pen.dot(p.x, p.y, 0.5 + rng() * 0.5, '#6d5235', 0.55);
    }
  } else if (t === 'rough') {
    for (let i = 0; i < 3; i++) pebble(pen, rng, at());
    for (let i = 0; i < 3; i++) {
      const p = at();
      pen.hair([p, { x: p.x + 5 + rng() * 4, y: p.y - 1 }], 0.6, '#5d4b39', 0.6);
    }
  } else if (t === 'swamp') {
    for (let i = 0; i < 2; i++) {
      const p = at();
      pen.fill(ellipse(p.x, p.y, 7 + rng() * 5, 2.4 + rng(), 14), '#4f7187', 0.35);
      pen.hair([{ x: p.x - 6, y: p.y }, { x: p.x + 6, y: p.y }], 0.5, INK, 0.45);
    }
    for (let i = 0; i < 3; i++) reeds(pen, rng, at());
  } else if (t === 'sand') {
    for (let i = 0; i < 18; i++) {
      const p = at();
      pen.dot(p.x, p.y, 0.45, '#8a7348', 0.5);
    }
  } else if (t === 'water') {
    for (let i = 0; i < 2; i++) {
      const p = at();
      const w = 6 + rng() * 6;
      pen.hair([{ x: p.x - w, y: p.y }, { x: p.x - w / 2, y: p.y - 1.2 }, { x: p.x, y: p.y }, { x: p.x + w / 2, y: p.y - 1.2 }, { x: p.x + w, y: p.y }], 0.6, '#2c4a6e', 0.55);
    }
  }
}

function tuft(pen: Pen, rng: Rng, p: Pt, color: string): void {
  const n = 3 + Math.floor(rng() * 3);
  for (let i = 0; i < n; i++) {
    const lean = (i - n / 2) * 0.9 + (rng() - 0.5);
    pen.hair([p, { x: p.x + lean * 1.6, y: p.y - 3 - rng() * 3 }], 0.55, color, 0.6);
  }
}

function pebble(pen: Pen, rng: Rng, p: Pt): void {
  const r = 1.6 + rng() * 2.2;
  const shape = ellipse(p.x, p.y, r * 1.3, r, 10);
  pen.fill(shape, '#d8ccb4', 0.9);
  pen.fill(ellipse(p.x + r * 0.3, p.y + r * 0.3, r * 1.1, r * 0.7, 10), '#6d5d49', 0.35);
  pen.stroke([...shape, shape[0]!], 0.6, INK, 0.75, false);
}

function reeds(pen: Pen, rng: Rng, p: Pt): void {
  for (let i = 0; i < 4; i++) {
    const x = p.x + (i - 1.5) * 1.6;
    const h = 6 + rng() * 5;
    pen.hair([{ x, y: p.y }, { x: x + (rng() - 0.5) * 2, y: p.y - h }], 0.55, '#3f5a32', 0.75);
  }
  pen.fill(ellipse(p.x + 1, p.y - 7, 0.9, 2.2, 8), '#6b4a2e', 0.8);
}

/** A pen shoreline where water meets land, with a pale lip of foam on the water side. */
function shoreTile(ctx: CanvasRenderingContext2D, g: Grid, x: number, y: number): void {
  if (terrainAt(g, x, y) !== 'water') return;
  const pen = new Pen(ctx, tileSeed(x, y, 9), 0.45);
  const px = x * TILE;
  const py = y * TILE;
  const sides: [number, number, Pt, Pt][] = [
    [0, -1, { x: px, y: py }, { x: px + TILE, y: py }],
    [0, 1, { x: px, y: py + TILE }, { x: px + TILE, y: py + TILE }],
    [-1, 0, { x: px, y: py }, { x: px, y: py + TILE }],
    [1, 0, { x: px + TILE, y: py }, { x: px + TILE, y: py + TILE }],
  ];
  for (const [dx, dy, a, b] of sides) {
    if (!inGrid(g, x + dx, y + dy) || terrainAt(g, x + dx, y + dy) === 'water') continue;
    if (coverAt(g, x + dx, y + dy) === 'road' && coverAt(g, x, y) === 'road') continue;
    const mid = { x: (a.x + b.x) / 2 - dx * 2, y: (a.y + b.y) / 2 - dy * 2 };
    pen.stroke([a, mid, b], 1.3, INK, 0.85, false);
    pen.stroke([{ x: a.x - dx * 4, y: a.y - dy * 4 }, { x: mid.x - dx * 4, y: mid.y - dy * 4 }, { x: b.x - dx * 4, y: b.y - dy * 4 }], 1.6, PAPER_FILL, 0.55, false);
  }
}

/** Where a road tile's track bends: its centre, nudged so a straight road still wanders a little. */
function roadCentre(x: number, y: number): Pt {
  const rng = createRng(tileSeed(x, y, 17));
  return { x: (x + 0.5) * TILE + (rng() - 0.5) * 9, y: (y + 0.5) * TILE + (rng() - 0.5) * 9 };
}

/**
 * A worn track from the tile's (nudged) centre to the middle of each edge it
 * shares with another road tile, with round joints: first the inked edge
 * (`edge`), then the light fill and wheel ruts (`fill`). Over water it's a
 * plank bridge.
 */
function roadTile(ctx: CanvasRenderingContext2D, g: Grid, x: number, y: number, pass: 'edge' | 'fill'): void {
  const c = roadCentre(x, y);
  const over = terrainAt(g, x, y) === 'water';
  const links = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => coverAt(g, x + dx!, y + dy!) === 'road');
  if (links.length === 0) links.push([1, 0]);
  const ends = links.map(([dx, dy]) => ({ x: (x + 0.5 + dx! * 0.5) * TILE, y: (y + 0.5 + dy! * 0.5) * TILE }));
  const track = (width: number, color: string, alpha: number): void => {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = width;
    ctx.strokeStyle = rgba(color, alpha);
    ctx.beginPath();
    for (const e of ends) {
      ctx.moveTo(c.x, c.y);
      // A gentle curve: through a point between the centre and the edge, pulled towards the tile's middle line.
      ctx.quadraticCurveTo((c.x + e.x) / 2, (c.y + e.y) / 2, e.x, e.y);
    }
    ctx.stroke();
    ctx.restore();
  };
  if (pass === 'edge') {
    track(over ? 30 : 23, over ? '#3b2a1a' : '#6b5232', over ? 0.95 : 0.55);
    return;
  }
  track(over ? 26 : 19, over ? '#a7835a' : '#dcc7a0', 1);
  const pen = new Pen(ctx, tileSeed(x, y, 13), 0.4);
  if (over) {
    for (const e of ends) {
      for (let k = 1; k <= 3; k++) {
        const p = { x: c.x + (e.x - c.x) * (k / 4), y: c.y + (e.y - c.y) * (k / 4) };
        const nx = -(e.y - c.y) / TILE;
        const ny = (e.x - c.x) / TILE;
        pen.hair([{ x: p.x + nx * 24, y: p.y + ny * 24 }, { x: p.x - nx * 24, y: p.y - ny * 24 }], 0.7, INK, 0.7);
      }
    }
    return;
  }
  // Wheel ruts and grit.
  for (const e of ends) {
    const nx = -(e.y - c.y) / TILE;
    const ny = (e.x - c.x) / TILE;
    for (const side of [-1, 1]) pen.hair([{ x: c.x + nx * 10 * side, y: c.y + ny * 10 * side }, { x: e.x + nx * 10 * side, y: e.y + ny * 10 * side }], 0.5, '#8a6a42', 0.35);
  }
  for (let i = 0; i < 6; i++) pen.dot(c.x + (pen.rng() - 0.5) * 18, c.y + (pen.rng() - 0.5) * 18, 0.6, '#7a5c3a', 0.55);
}
