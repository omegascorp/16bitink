import { BOARD, type LevelDef } from '../level/types';
import { buildPath } from './path';

/**
 * How a level's board sits on a small screen, as plain numbers (no Phaser,
 * so it can be tested). A board is drawn 1280 × 720 but few levels use all
 * of it: round the burrows, the lines and the gecko lies bare ground. On a
 * phone that ground is cut, so the marbles draw bigger.
 */

/** The part of the board a level plays on, board px. */
export interface Box {
  readonly x0: number;
  readonly y0: number;
  readonly x1: number;
  readonly y1: number;
}

export const FULL_BOARD: Box = { x0: 0, y0: 0, x1: BOARD.w, y1: BOARD.h };

/** Room kept round a line's centre: its groove, a marble, a burrow's rim. */
const TRACK_PAD = 40;
/** A turning gecko reaches this far from where it stands. */
const PIVOT_REACH = 74;
/** A branch gecko's head stands above its branch, and its tail (with the next marble) hangs below. */
const RAIL_ABOVE = 90;
const RAIL_BELOW = 64;
/** A branch gecko's body either side of where it stands. */
const RAIL_SIDE = 44;
/** A pad (58 across) with the gecko sitting on it. */
const PAD_REACH = 84;
/** A boss at one of its spots. */
const BOSS_REACH = 96;
/** Ground kept round it all, so nothing touches the screen's edge. */
const MARGIN = 10;

/**
 * The box a level needs on screen: its lines, its gecko, pads, columns and
 * boss spots, with a little ground round them, inside the board. Barn levels
 * keep the whole width and the top (shots bank off their walls there), and
 * orchard levels the whole width (windfalls roll in from the sides).
 */
export function levelBox(level: LevelDef): Box {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  const take = (x: number, y: number, rx: number, ry = rx): void => {
    x0 = Math.min(x0, x - rx);
    x1 = Math.max(x1, x + rx);
    y0 = Math.min(y0, y - ry);
    y1 = Math.max(y1, y + ry);
  };
  for (const t of level.tracks) for (const p of buildPath(t.points).pts) take(p.x, p.y, TRACK_PAD);
  const s = level.shooter;
  if (s.kind === 'pivot') take(s.x, s.y, PIVOT_REACH);
  else if (s.kind === 'rail') {
    take(s.x0, s.y, RAIL_SIDE, 0);
    take(s.x1, s.y, RAIL_SIDE, 0);
    y0 = Math.min(y0, s.y - RAIL_ABOVE);
    y1 = Math.max(y1, s.y + RAIL_BELOW);
  } else for (const p of s.pads) take(p.x, p.y, PAD_REACH);
  for (const p of level.pillars ?? []) take(p.x, p.y, p.r + MARGIN);
  for (const p of level.boss?.spots ?? []) take(p.x, p.y, BOSS_REACH);
  const box = {
    x0: Math.max(0, x0 - MARGIN), y0: Math.max(0, y0 - MARGIN),
    x1: Math.min(BOARD.w, x1 + MARGIN), y1: Math.min(BOARD.h, y1 + MARGIN),
  };
  const wide = level.walls === true || level.fruit === true;
  return {
    x0: wide ? 0 : box.x0, x1: wide ? BOARD.w : box.x1,
    y0: level.walls ? 0 : box.y0, y1: box.y1,
  };
}

/** A screen (or the part of it the board may use), CSS px. */
export interface Area {
  readonly width: number;
  readonly height: number;
}

/** How big the board draws (CSS px per board px) and the board point at the area's centre. */
export interface Framing {
  readonly zoom: number;
  readonly x: number;
  readonly y: number;
}

/**
 * Fits a box of the board into an area, as big as it allows but never
 * bigger than `maxZoom`; `turned` lays the board a quarter turn round (an
 * upright phone), its x down the screen. Where the area shows more of the
 * board than the box, the view stays on the board as far as it can, so the
 * ground beyond its edge is the last thing to show.
 */
export function frameBox(area: Area, box: Box, turned: boolean, maxZoom = Infinity): Framing {
  const across = turned ? area.height : area.width;
  const down = turned ? area.width : area.height;
  const zoom = Math.max(0.1, Math.min(maxZoom, across / (box.x1 - box.x0), down / (box.y1 - box.y0)));
  return { zoom, x: settle((box.x0 + box.x1) / 2, across / zoom, BOARD.w), y: settle((box.y0 + box.y1) / 2, down / zoom, BOARD.h) };
}

/** The centre for a window `seen` long round `mid`, kept inside 0..`size` while it fits. */
function settle(mid: number, seen: number, size: number): number {
  if (seen >= size) return size / 2;
  return Math.min(size - seen / 2, Math.max(seen / 2, mid));
}
