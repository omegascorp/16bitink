import { FARM } from '../../../src/art/places/farm';
import { makeDraw } from '../../../src/art/kit';
import { makeCanvas, releaseScratch } from '../../../src/art/pen';
import { BOARD, type LevelDef } from '../../../src/level/types';
import { VIDEO } from '../short';
import type { GroundLayer } from './story';

/**
 * Chapter 1's farmyard, painted by the game's own farm painter on one board
 * and laid out to every side as mirrored tiles, so the camera can wander. The
 * board is drawn turned a quarter, to suit the tall video.
 */
const LEVEL: LevelDef = {
  id: 'promo-gulphen', name: 'Farmyard', snake: 'corn', start: { x: 480, y: 270 }, heading: 0, length: 210, target: 500, par: 50, prey: [], zones: [], solids: [], cover: [],
};

/** Ground units (world units at zoom 1) per board px, and canvas px per board px. */
const SCALE = 4;
const RES = 3;
const TILE = { w: BOARD.h * SCALE, h: BOARD.w * SCALE } as const;

const IN_TILE = { x: 1420, y: 1500 } as const;

export interface Yard {
  readonly canvas: HTMLCanvasElement;
}

export function paintYard(): Yard {
  const { canvas, ctx } = makeCanvas(BOARD.h * RES, BOARD.w * RES);
  ctx.translate(canvas.width, 0);
  ctx.rotate(Math.PI / 2);
  ctx.scale(RES, RES);
  FARM.ground(makeDraw(ctx, 1731, 0, 0), LEVEL);
  releaseScratch();
  return { canvas };
}

const odd = (n: number): boolean => ((n % 2) + 2) % 2 === 1;

function drawLayer(ctx: CanvasRenderingContext2D, yard: Yard, g: GroundLayer): void {
  if (g.alpha <= 0) return;
  const [w, h] = [TILE.w * g.zoom, TILE.h * g.zoom];
  // Frame 1 falls well inside a tile, away from the mirror lines.
  const x = g.x - IN_TILE.x * g.zoom;
  const y = g.y - IN_TILE.y * g.zoom;
  const ix0 = Math.floor(-x / w);
  const iy0 = Math.floor(-y / h);
  const ix1 = Math.floor((VIDEO.width - x) / w);
  const iy1 = Math.floor((VIDEO.height - y) / h);
  ctx.save();
  ctx.globalAlpha = g.alpha;
  for (let iy = iy0; iy <= iy1; iy++) {
    for (let ix = ix0; ix <= ix1; ix++) {
      ctx.save();
      // Each tile mirrors its neighbours, so their edges meet.
      ctx.translate(x + (odd(ix) ? (ix + 1) * w : ix * w), y + (odd(iy) ? (iy + 1) * h : iy * h));
      ctx.scale(odd(ix) ? -1 : 1, odd(iy) ? -1 : 1);
      ctx.drawImage(yard.canvas, 0, 0, w, h);
      ctx.restore();
    }
  }
  ctx.restore();
}

export function drawYard(ctx: CanvasRenderingContext2D, yard: Yard, layers: readonly GroundLayer[]): void {
  for (const g of layers) drawLayer(ctx, yard, g);
}
