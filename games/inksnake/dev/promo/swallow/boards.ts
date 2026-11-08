import { FLOODED_PLACE } from '../../../src/art/chapters/floodedPlace';
import { SAVANNA_PLACE } from '../../../src/art/chapters/savannaPlace';
import { makeDraw } from '../../../src/art/kit';
import { makeCanvas, releaseScratch } from '../../../src/art/pen';
import { FARM } from '../../../src/art/places/farm';
import type { PlaceArt } from '../../../src/art/places/types';
import { CHAPTER_1 } from '../../../src/level/chapter1';
import { BOARD, type LevelDef, type SolidDef, type ZoneDef } from '../../../src/level/types';
import type { Pt } from '../sprites';

/**
 * The grounds, painted once by the game's own place painters (the farm, the
 * flooded forest's blackwater and bank, the savanna) on boards laid out for
 * the video, each 960 × 540 board px (16:9, so zoom 2 fills the frame).
 * A camera looks at a board: its centre in board px and screen px per
 * board px.
 */

export interface Camera {
  readonly x: number;
  readonly y: number;
  readonly zoom: number;
}

export const W = 1920;
export const H = 1080;

export const toScreen = (c: Camera, p: Pt): Pt => ({ x: (p.x - c.x) * c.zoom + W / 2, y: (p.y - c.y) * c.zoom + H / 2 });

/** A camera kept on the board (never showing past its edges). */
export function onBoard(c: Camera): Camera {
  const zoom = Math.max(W / BOARD.w, c.zoom);
  const hw = W / 2 / zoom;
  const hh = H / 2 / zoom;
  return { zoom, x: Math.min(BOARD.w - hw, Math.max(hw, c.x)), y: Math.min(BOARD.h - hh, Math.max(hh, c.y)) };
}

export interface Board {
  readonly canvas: HTMLCanvasElement;
  readonly res: number;
}

const trunk = (x: number, y: number, r = 16): SolidDef => ({ kind: 'circle', look: 'trunk', x, y, r });
const acacia = (x: number, y: number, r = 15): SolidDef => ({ kind: 'circle', look: 'acacia', x, y, r });
const rock = (x: number, y: number, r = 20): SolidDef => ({ kind: 'circle', look: 'rock', x, y, r });
const tall = (x: number, y: number, r = 90): ZoneDef => ({ kind: 'grass', look: 'tall-grass', shape: 'circle', x, y, r });
const WATER: ZoneDef = { kind: 'water', look: 'blackwater', shape: 'rect', x: -20, y: -20, w: 1000, h: 580 };
const bank = (points: readonly Pt[]): ZoneDef => ({ kind: 'land', look: 'bank', shape: 'poly', points });

const base = (id: string): Omit<LevelDef, 'zones' | 'solids'> => ({
  id, name: id, snake: 'corn', start: { x: 100, y: 270 }, heading: 0, length: 120, target: 300, par: 30, prey: [],
});

/** The corn snake's farmyard (the game's first level) and the game's "Rat Run" for section 3. */
const FARM_LEVEL = CHAPTER_1[0]!;
export const GAME_LEVEL = CHAPTER_1[2]!;

/** Lake Moondarra: open water (cooled to a lake's blue-grey), a muddy shore just under the croc, reeds. */
const LAKE_SHORE: readonly Pt[] = [
  { x: -20, y: 300 }, { x: 160, y: 284 }, { x: 330, y: 290 }, { x: 470, y: 298 }, { x: 640, y: 322 }, { x: 980, y: 336 }, { x: 980, y: 560 }, { x: -20, y: 560 },
];
const LAKE: LevelDef = {
  ...base('lake'),
  zones: [WATER, bank(LAKE_SHORE), bank([{ x: 760, y: -20 }, { x: 980, y: -20 }, { x: 980, y: 120 }, { x: 860, y: 100 }, { x: 790, y: 50 }])],
  solids: [trunk(900, 200, 14)],
  cover: [{ look: 'reeds', x: 120, y: 330, r: 46 }, { look: 'reeds', x: 870, y: 70, r: 40 }, { look: 'lily', x: 160, y: 120, r: 44 }, { look: 'reeds', x: 700, y: 360, r: 40 }],
};

/** Cools the open water to a lake's blue-grey with sky glancing off it (the shore polygons left as painted). */
function lakeWater(ctx: CanvasRenderingContext2D, level: LevelDef): void {
  ctx.save();
  ctx.beginPath();
  ctx.rect(-20, -20, BOARD.w + 40, BOARD.h + 40);
  for (const z of level.zones ?? []) {
    if (z.kind !== 'land' || z.shape !== 'poly') continue;
    z.points.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.closePath();
  }
  ctx.clip('evenodd');
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = 'rgba(110,150,175,0.75)';
  ctx.fillRect(0, 0, BOARD.w, BOARD.h);
  ctx.globalCompositeOperation = 'screen';
  for (let i = 0; i < 6; i++) {
    const g = ctx.createLinearGradient(0, 40 + i * 70, 0, 70 + i * 70);
    g.addColorStop(0, 'rgba(200,225,235,0)');
    g.addColorStop(0.5, 'rgba(200,225,235,0.16)');
    g.addColorStop(1, 'rgba(200,225,235,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 40 + i * 70, BOARD.w, 30);
  }
  ctx.restore();
}

/** The Florida swamp: a wide bank of mud and grass, blackwater sloughs top and bottom, cypress trunks. */
const SWAMP: LevelDef = {
  ...base('swamp'),
  zones: [WATER, bank([
    { x: -20, y: 150 }, { x: 160, y: 120 }, { x: 380, y: 160 }, { x: 600, y: 130 }, { x: 820, y: 165 }, { x: 980, y: 140 },
    { x: 980, y: 410 }, { x: 760, y: 440 }, { x: 520, y: 405 }, { x: 300, y: 445 }, { x: -20, y: 420 },
  ])],
  solids: [trunk(70, 60, 18), trunk(910, 490, 18), trunk(860, 50, 14), trunk(560, 500, 16)],
  cover: [{ look: 'reeds', x: 40, y: 470, r: 50 }, { look: 'water-lettuce', x: 640, y: 60, r: 40 }, { look: 'reeds', x: 300, y: 110, r: 44 }, { look: 'lily', x: 760, y: 490, r: 40 }],
};

/** The Masai Mara: the savanna's dry grass, acacias at the edges. */
const SAVANNA: LevelDef = { ...base('savanna'), zones: [tall(80, 470, 90), tall(900, 60, 80)], solids: [acacia(90, 70), acacia(880, 470), rock(940, 250, 16)] };

export function paintBoard(place: PlaceArt, level: LevelDef, res: number, seed: number, water?: (ctx: CanvasRenderingContext2D, level: LevelDef) => void): Board {
  const { canvas, ctx } = makeCanvas(Math.round(BOARD.w * res), Math.round(BOARD.h * res));
  ctx.scale(res, res);
  place.ground(makeDraw(ctx, 600 + seed, 0, 0), level);
  water?.(ctx, level);
  (level.solids ?? []).forEach((s, i) => place.solid(makeDraw(ctx, 700 + i + seed, 0, 0), s));
  (level.cover ?? []).forEach((c, i) => place.cover(makeDraw(ctx, 800 + i + seed, 0, 0), c));
  releaseScratch();
  return { canvas, res };
}

export interface Boards {
  readonly farm: Board;
  readonly game: Board;
  readonly lake: Board;
  readonly swamp: Board;
  readonly savanna: Board;
}

export function paintBoards(res: number): Boards {
  return {
    farm: paintBoard(FARM, FARM_LEVEL, res, 1),
    game: paintBoard(FARM, GAME_LEVEL, res, 2),
    lake: paintBoard(FLOODED_PLACE!, LAKE, res, 3, lakeWater),
    swamp: paintBoard(FLOODED_PLACE!, SWAMP, res, 4),
    savanna: paintBoard(SAVANNA_PLACE!, SAVANNA, res, 5),
  };
}

/** The board under the camera. */
export function drawBoard(ctx: CanvasRenderingContext2D, board: Board, cam: Camera): void {
  const tl = toScreen(cam, { x: 0, y: 0 });
  ctx.drawImage(board.canvas, tl.x, tl.y, BOARD.w * cam.zoom, BOARD.h * cam.zoom);
}
