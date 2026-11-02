import { FLOODED_PLACE } from '../../../src/art/chapters/floodedPlace';
import { makeDraw } from '../../../src/art/kit';
import { makeCanvas, releaseScratch } from '../../../src/art/pen';
import { BOARD, type CoverDef, type LevelDef, type ZoneDef } from '../../../src/level/types';
import type { Pt } from '../sprites';

/**
 * The short's lake: one board painted by the game's own Flooded Forest
 * painter (floodedPlace.ts: dark water, its muddy bank and shallows, reeds),
 * laid out for this short. The board is painted landscape (960 × 540) and
 * drawn turned a quarter, so the short's world is 540 wide and 960 tall:
 * a bank of mud along the top with a bay in it (where the hook happens),
 * the open lake below, an island at the bottom right.
 */
const SHORE: readonly Pt[] = [
  { x: -20, y: -20 }, { x: 200, y: -20 }, { x: 222, y: 70 }, { x: 250, y: 150 }, { x: 292, y: 230 }, { x: 300, y: 300 }, { x: 262, y: 370 },
  { x: 226, y: 450 }, { x: 214, y: 560 }, { x: -20, y: 560 },
];

const WATER: ZoneDef = { kind: 'water', look: 'blackwater', shape: 'rect', x: -20, y: -20, w: 1000, h: 580 };

export const LEVEL: LevelDef = {
  id: 'promo-python', name: 'Lake', snake: 'anaconda', start: { x: 400, y: 270 }, heading: 0, length: 210, target: 500, par: 50, prey: [],
  zones: [WATER, { kind: 'land', look: 'bank', shape: 'poly', points: SHORE }, { kind: 'land', look: 'bank', shape: 'poly', points: [
    { x: 700, y: 60 }, { x: 790, y: 40 }, { x: 880, y: 80 }, { x: 900, y: 150 }, { x: 800, y: 175 }, { x: 710, y: 140 },
  ] }],
  solids: [],
  cover: [
    { look: 'reeds', x: 232, y: 120, r: 38 } satisfies CoverDef,
    { look: 'reeds', x: 262, y: 430, r: 40 } satisfies CoverDef,
    { look: 'lily', x: 640, y: 470, r: 44 } satisfies CoverDef,
  ],
};

/** The short's world, px: the board turned a quarter (board x runs down, board y runs leftwards). */
export const WORLD = { w: BOARD.h, h: BOARD.w } as const;

/** A painted board: the canvas and its px per board px. */
export interface Board {
  readonly canvas: HTMLCanvasElement;
  readonly res: number;
}

export function paintBoard(res: number): Board {
  const place = FLOODED_PLACE!;
  const { canvas, ctx } = makeCanvas(Math.round(BOARD.w * res), Math.round(BOARD.h * res));
  ctx.scale(res, res);
  place.ground(makeDraw(ctx, 1231, 0, 0), LEVEL);
  (LEVEL.cover ?? []).forEach((c, i) => place.cover(makeDraw(ctx, 1300 + i, 0, 0), c));
  releaseScratch();
  return { canvas, res };
}
