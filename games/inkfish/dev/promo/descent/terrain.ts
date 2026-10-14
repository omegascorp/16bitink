import { DECOR_SIZE, drawDecor, type DecorId } from '../../../src/art/decorArt';
import { INK } from '../../../src/art/pen';
import { ART_RES, drawRock, drawWeed, type WeedKind } from '../../../src/art/propArt';
import { createRng } from '../../../src/logic/rng';
import { FRAME } from './frame';
import { css, waterAt } from './water';
import { cameraAt, metresAt, PLAIN_M, POOL_FLOOR_M, SHELF_EDGE_M, toScreen, yAt } from './world';

/**
 * The ground along the dive, in world px (see world.ts):
 * - the continental shelf as a rock wall down the right-hand side, with a
 *   ledge for each shallow zone (the tide pool's floor, the seagrass meadow,
 *   the kelp's boulders, the reef, the wreck), ending at the shelf's edge;
 * - open water below it, down to the abyssal plain's mud across the whole
 *   picture, which opens into the trench: two walls closing in.
 * The scenery on each ledge (weeds, corals, the wreck) is drawn once into
 * canvases and placed in the world.
 */

const W = FRAME.width;
const H = FRAME.height;

interface Pt { readonly x: number; readonly y: number }

/** The ledges' tops (world y), left ends (x) and what grows on them. */
export const POOL_Y = yAt(POOL_FLOOR_M);
export const MEADOW = { y: 2560, x: 980 } as const;
export const KELP_ROCKS = { y: 3930, x: 860 } as const;
export const REEF = { y: 5330, x: 980 } as const;
export const WRECK = { y: 6600, x: 760 } as const;
export const EDGE = { y: yAt(SHELF_EDGE_M), x: 1020 } as const;
export const PLAIN_Y = yAt(PLAIN_M);
/** The trench's floor: the Izu-Ogasawara Trench bottoms out at about 9,780 m, under the record. */
export const TRENCH_FLOOR_M = 9780;
export const TRENCH_FLOOR_Y = yAt(TRENCH_FLOOR_M);

/** The shelf's outline, from above the surface down to where it falls away off the right edge. */
const SHELF_KEYS: readonly Pt[] = [
  { x: 1780, y: -400 }, { x: 1770, y: 300 }, { x: 1600, y: 560 }, { x: 760, y: POOL_Y - 4 }, { x: 740, y: POOL_Y + 40 },
  { x: 900, y: POOL_Y + 160 }, { x: 1480, y: 1050 }, { x: 1700, y: 1500 }, { x: 1730, y: 2300 },
  { x: 1600, y: MEADOW.y - 30 }, { x: MEADOW.x, y: MEADOW.y }, { x: MEADOW.x - 10, y: MEADOW.y + 50 }, { x: 1150, y: MEADOW.y + 200 }, { x: 1660, y: 2950 }, { x: 1720, y: 3600 },
  { x: 1500, y: KELP_ROCKS.y - 40 }, { x: KELP_ROCKS.x, y: KELP_ROCKS.y }, { x: KELP_ROCKS.x - 20, y: KELP_ROCKS.y + 60 }, { x: 1050, y: KELP_ROCKS.y + 220 }, { x: 1640, y: 4450 }, { x: 1710, y: 5050 },
  { x: 1560, y: REEF.y - 40 }, { x: REEF.x, y: REEF.y }, { x: REEF.x - 15, y: REEF.y + 60 }, { x: 1150, y: REEF.y + 200 }, { x: 1660, y: 5800 }, { x: 1710, y: 6300 },
  { x: 1500, y: WRECK.y - 30 }, { x: WRECK.x, y: WRECK.y }, { x: WRECK.x - 20, y: WRECK.y + 60 }, { x: 960, y: WRECK.y + 200 }, { x: 1640, y: 7000 }, { x: 1700, y: 7280 },
  { x: 1450, y: EDGE.y - 20 }, { x: EDGE.x, y: EDGE.y }, { x: EDGE.x + 30, y: EDGE.y + 70 }, { x: 1300, y: EDGE.y + 260 }, { x: 1760, y: EDGE.y + 650 }, { x: 2300, y: EDGE.y + 1100 },
  { x: 2300, y: -400 },
];

/** Splits each edge and nudges the points along it, so the rock reads as drawn by hand rather than ruled. */
function roughen(keys: readonly Pt[], step: number, amount: number, seed: number): Pt[] {
  const rng = createRng(seed);
  const out: Pt[] = [];
  for (let i = 0; i < keys.length; i++) {
    const a = keys[i]!;
    const b = keys[(i + 1) % keys.length]!;
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    const n = Math.max(1, Math.round(len / step));
    const nx = -(b.y - a.y) / (len || 1);
    const ny = (b.x - a.x) / (len || 1);
    for (let k = 0; k < n; k++) {
      const u = k / n;
      const j = k === 0 ? 0 : (rng() - 0.5) * amount;
      out.push({ x: a.x + (b.x - a.x) * u + nx * j, y: a.y + (b.y - a.y) * u + ny * j });
    }
  }
  return out;
}

const SHELF = roughen(SHELF_KEYS, 26, 14, 71);

/** Rock in the game's ink: a paper-coloured mass, tinted by the water at its depth, hatched, with an inked edge. */
function drawRockMass(ctx: CanvasRenderingContext2D, outline: readonly Pt[], t: number, closed = true): void {
  const cam = cameraAt(t);
  const pts = outline.map((p) => ({ x: p.x, y: p.y - cam + H / 2 }));
  if (pts.every((p) => p.y < -50) || pts.every((p) => p.y > H + 50)) return;
  ctx.save();
  ctx.beginPath();
  pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  ctx.fillStyle = '#e8dcc0';
  ctx.fill();
  ctx.save();
  ctx.clip();
  // The water's colour over the rock, a little lighter than the open water: it stays readable.
  const g = ctx.createLinearGradient(0, 0, 0, H);
  for (let i = 0; i <= 8; i++) {
    const m = metresAt(cam - H / 2 + (H * i) / 8);
    const c = waterAt(m);
    g.addColorStop(i / 8, css(c, Math.min(0.92, c[3] * 0.85)));
  }
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = INK;
  ctx.globalAlpha = 0.22;
  ctx.lineWidth = 2;
  const off = cam % 26;
  for (let k = -10; k < 90; k++) {
    const y = k * 26 - off;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y + 560);
    ctx.stroke();
  }
  ctx.restore();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3.2;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  const n = closed ? pts.length : pts.length - 1;
  for (let i = 0; i <= n; i++) {
    const p = pts[i % pts.length]!;
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  }
  ctx.stroke();
  ctx.restore();
}

// ---------------------------------------------------------------- scenery on the ledges

interface Piece {
  readonly canvas: HTMLCanvasElement;
  /** World position of the piece's bottom centre (it stands on the ledge), and its drawn size. */
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  /** Sways (weeds) with this phase; 0 keeps still. */
  readonly sway: number;
}

const canvasOf = (w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void): HTMLCanvasElement => {
  const c = document.createElement('canvas');
  c.width = Math.ceil(w);
  c.height = Math.ceil(h);
  draw(c.getContext('2d')!);
  return c;
};

function decorPiece(kind: DecorId, x: number, y: number, scale: number, seed: number): Piece {
  const size = DECOR_SIZE[kind];
  const canvas = canvasOf(size.w * ART_RES, size.h * ART_RES, (ctx) => drawDecor(ctx, kind, seed));
  return { canvas, x, y: y + 6, w: size.w * scale, h: size.h * scale, sway: 0 };
}

function weedPiece(kind: WeedKind, x: number, y: number, w: number, h: number, seed: number): Piece {
  const canvas = canvasOf(w * ART_RES, h * ART_RES, (ctx) => drawWeed(ctx, seed, kind, 0, w * ART_RES, h * ART_RES));
  return { canvas, x, y: y + 8, w, h, sway: 0.5 + (seed % 7) / 7 };
}

function rockPiece(x: number, y: number, w: number, h: number, seed: number): Piece {
  const canvas = canvasOf(w * ART_RES, h * ART_RES, (ctx) => drawRock(ctx, seed, w * ART_RES, h * ART_RES));
  return { canvas, x, y: y + 10, w, h, sway: 0 };
}

/** Everything that stands on the ground, back to front. */
function makePieces(): Piece[] {
  const pieces: Piece[] = [];
  // Tide pool floor.
  pieces.push(rockPiece(980, POOL_Y, 260, 120, 3), rockPiece(1480, POOL_Y, 300, 140, 5));
  pieces.push(decorPiece('anemone', 1150, POOL_Y, 1.4, 11), decorPiece('mussels', 1300, POOL_Y, 1.5, 12), decorPiece('starfish', 880, POOL_Y, 1.5, 13));
  pieces.push(decorPiece('pebbles', 1700, POOL_Y, 1.6, 14), weedPiece(2, 1620, POOL_Y, 110, 220, 15));
  // Seagrass meadow: a row of eelgrass clumps.
  for (let i = 0; i < 9; i++) pieces.push(weedPiece(1, MEADOW.x + 80 + i * 95, MEADOW.y, 110 + (i % 3) * 20, 260 + ((i * 37) % 90), 20 + i));
  pieces.push(decorPiece('scallops', 1420, MEADOW.y, 1.4, 31), decorPiece('sanddollar', 1180, MEADOW.y, 1.6, 32));
  // Kelp: tall stalks from the boulders, some far up into the picture.
  pieces.push(rockPiece(1000, KELP_ROCKS.y, 320, 150, 41), rockPiece(1380, KELP_ROCKS.y, 360, 170, 42));
  for (const [x, h, s] of [[930, 1150, 43], [1060, 1400, 44], [1210, 1250, 45], [1350, 1500, 46], [1520, 1300, 47], [1680, 1450, 48]] as const) {
    pieces.push(weedPiece(0, x, KELP_ROCKS.y, 190, h, s));
  }
  // Reef.
  const coral: readonly (readonly [DecorId, number, number])[] = [
    ['staghorn', 1080, 1.9], ['braincoral', 1240, 1.8], ['seafan', 1390, 1.9], ['tubesponge', 1530, 1.8], ['anemone', 1650, 1.6], ['giantclam', 1760, 1.4],
    ['braincoral', 1460, 1.3], ['staghorn', 1300, 1.2],
  ];
  coral.forEach(([kind, x, s], i) => pieces.push(decorPiece(kind, x, REEF.y, s, 51 + i)));
  // Wreck.
  pieces.push(decorPiece('shipwreck', 1330, WRECK.y, 2.1, 61), decorPiece('anchor', 900, WRECK.y, 1.3, 62), decorPiece('cannon', 1760, WRECK.y, 1.3, 63));
  // The shelf's edge: the last few sponges before the drop.
  pieces.push(decorPiece('tubesponge', 1150, EDGE.y, 1.2, 71), decorPiece('seapen', 1300, EDGE.y, 1.4, 72), decorPiece('seafan', 1450, EDGE.y, 1.2, 73));
  // The abyssal plain, either side of the trench's mouth (nothing over the drop): a whale fall on the left, the tripodfish's patch on the right.
  const plain: readonly (readonly [DecorId, number, number])[] = [
    ['whalebones', 320, 0.9], ['glasssponge', 495, 1.3],
    ['nodules', 1560, 1.4], ['nodules', 1760, 1.4], ['sealily', 1895, 1.4],
  ];
  plain.forEach(([kind, x, s], i) => pieces.push(decorPiece(kind, x, PLAIN_Y, s, 81 + i)));
  return pieces;
}

function drawPiece(ctx: CanvasRenderingContext2D, p: Piece, t: number): void {
  const bottom = toScreen(p.y, t);
  if (bottom < -20 || bottom - p.h > H + 20) return;
  if (p.sway === 0) {
    ctx.drawImage(p.canvas, p.x - p.w / 2, bottom - p.h, p.w, p.h);
    return;
  }
  // Weeds lean with the swell, rooted at the bottom.
  ctx.save();
  ctx.translate(p.x, bottom);
  ctx.transform(1, 0, 0.06 * Math.sin(t * 0.7 * p.sway + p.x * 0.01), 1, 0, 0);
  ctx.drawImage(p.canvas, -p.w / 2, -p.h, p.w, p.h);
  ctx.restore();
}

// ---------------------------------------------------------------- the abyssal plain and the trench

/**
 * Where the trench's walls stand at world y: how far in from each side, px.
 * Nearly straight down, so the plain either side of the mouth is as wide as
 * it can be while the trench below still holds the lander and the snailfish.
 */
export const TRENCH_TOP = PLAIN_Y + 120;
const WALL_RNG = (() => {
  const rng = createRng(61);
  return Array.from({ length: 600 }, () => rng() - 0.5);
})();
function noiseAt(y: number, side: number): number {
  const f = (((y / 40 + side * 137) % WALL_RNG.length) + WALL_RNG.length) % WALL_RNG.length;
  const i = Math.floor(f);
  const u = f - i;
  return WALL_RNG[i]! * (1 - u) + WALL_RNG[(i + 1) % WALL_RNG.length]! * u;
}

export function wallReach(y: number, side: -1 | 1): number {
  const deep = Math.min(1, Math.max(0, (y - TRENCH_TOP) / 3000));
  const base = side < 0 ? 520 : 450;
  return base + 40 * deep + 46 * noiseAt(y, side) + 16 * noiseAt(y * 3.1, side + 1);
}

/** The plain's mud from the left edge to the trench's lip and from the far lip to the right edge, then the walls down. */
function plainOutline(side: -1 | 1): Pt[] {
  const edge = side < 0 ? -40 : W + 40;
  const lip = side < 0 ? wallReach(TRENCH_TOP, -1) : W - wallReach(TRENCH_TOP, 1);
  const pts: Pt[] = [{ x: edge, y: PLAIN_Y }];
  const steps = 24;
  for (let i = 0; i <= steps; i++) {
    const x = edge + ((lip - edge) * i) / steps;
    pts.push({ x, y: PLAIN_Y + 6 * Math.sin(x * 0.02) + 4 * Math.sin(x * 0.051) });
  }
  for (let y = TRENCH_TOP; y <= yAt(11000) + 200; y += 30) pts.push({ x: side < 0 ? wallReach(y, -1) : W - wallReach(y, 1), y });
  pts.push({ x: edge, y: yAt(11000) + 200 });
  return pts;
}
const PLAIN_LEFT = plainOutline(-1);
const PLAIN_RIGHT = plainOutline(1);

/** The trench's muddy floor, wall to wall, for the sea cucumbers under the record. */
const TRENCH_FLOOR: readonly Pt[] = (() => {
  const pts: Pt[] = [];
  for (let x = -40; x <= W + 40; x += 40) pts.push({ x, y: TRENCH_FLOOR_Y + 5 * Math.sin(x * 0.023) + 3 * Math.sin(x * 0.061) });
  pts.push({ x: W + 40, y: TRENCH_FLOOR_Y + 1600 }, { x: -40, y: TRENCH_FLOOR_Y + 1600 });
  return pts;
})();

export interface Terrain {
  /** The ground behind the fish. */
  drawBack(ctx: CanvasRenderingContext2D, t: number): void;
}

export function createTerrain(): Terrain {
  const pieces = makePieces();
  return {
    drawBack(ctx, t) {
      const top = cameraAt(t) - H / 2;
      if (top < EDGE.y + 1200) drawRockMass(ctx, SHELF, t);
      if (top + H > PLAIN_Y - 40) {
        drawRockMass(ctx, PLAIN_LEFT, t);
        drawRockMass(ctx, PLAIN_RIGHT, t);
      }
      if (top + H > TRENCH_FLOOR_Y - 40) drawRockMass(ctx, TRENCH_FLOOR, t);
      for (const p of pieces) drawPiece(ctx, p, t);
    },
  };
}
