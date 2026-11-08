import { TOWN_ART, type TownArt } from '../../art/pixel/town';
import type { Pixels } from '../battle/pixelScenery';
import { TOWN_TEX } from './townTex';
import { CITY, STAGE, toStage } from './townStage';

/**
 * The city's walls: PixelLab's parts, all repainted in one call from one
 * masonry so they match (see dev/pixel/town/sheet). Every edge of the raised
 * square is laid end to end along its foot line: a corner's own length of
 * wall, straight sections with turrets on the joins, and a corner's wall,
 * with the gatehouse in the middle of the front-left edge. The lengths add
 * up to the edge exactly. A corner is one painted piece: a round tower on the
 * point where the two walls meet, with their last lengths built into it; a
 * side corner comes in two parts, as its rear wall stands behind the city.
 * The back walls are drawn behind the city, the front ones in front of it,
 * each into a stage-sized buffer, and each list runs far to near: a wall
 * leaves the turret behind it and ends in the one before it, so a nearer
 * piece has to be drawn over the one it leaves.
 */

/** How far along the foot line a corner's own wall, a section and the gatehouse reach. */
const STUB_LEN = 68;
const SECTION_LEN = 94;
const GATE_LEN = 188;
/** Sections on an edge, and either side of the gatehouse. */
const SECTIONS = 4;
const GATE_SIDE_SECTIONS = 1;
/** Where the arch's doorstep is in the gatehouse's sprite: halfway along its foot. */
export const GATE_DOOR = { x: -8 + GATE_LEN / 2, y: 56 + GATE_LEN / 4 } as const;
/** Where each length's foot line starts in its sprite, from dev/pixel/town/sheet/parts.json. */
const FOOT = {
  wall: { x: 15, y: 62 },
  'wall-up': { x: 25, y: 109 },
  'wall-gate': { x: -8, y: 56 },
} as const;
/** Where the walls' foot lines meet in each corner's sprite, from dev/pixel/town/corner/cut_corner.py. */
export const CORNER_POINT = {
  'corner-front': { x: 60, y: 99 },
  'corner-back': { x: 80, y: 99 },
  'corner-left': { x: 29, y: 99 },
  'corner-left-rear': { x: -27, y: 71 },
  'corner-right': { x: 80, y: 99 },
  'corner-right-rear': { x: 60, y: 72 },
} as const;
type CornerArt = keyof typeof CORNER_POINT;
/** The corners, each with the tower and flag. */
export const CORNER_TOWERS = ['corner-front', 'corner-back', 'corner-left', 'corner-right'] as const;

/** One piece of wall on the stage: its art and top-left. */
export interface WallPiece {
  readonly art: TownArt;
  readonly x: number;
  readonly y: number;
}

type Point = { readonly x: number; readonly y: number };

/** The point `along` the edge from `a` (left) to `b` (right), measured across the screen from `a`. */
function onEdge(a: Point, b: Point, along: number): Point {
  return { x: a.x + along, y: a.y + (along * (b.y - a.y)) / (b.x - a.x) };
}

/** A length of wall whose foot line starts at `at`. */
function laid(art: keyof typeof FOOT, at: Point): WallPiece {
  return { art, x: Math.round(at.x - FOOT[art].x), y: Math.round(at.y - FOOT[art].y) };
}

/** `count` sections along the edge from `a` to `b`, from `start` across, in drawing order (the further ones first). */
function sections(a: Point, b: Point, start: number, count: number): WallPiece[] {
  const down = b.y > a.y;
  const out = Array.from({ length: count }, (_, i) => laid(down ? 'wall' : 'wall-up', onEdge(a, b, start + i * SECTION_LEN)));
  return down ? out : out.reverse();
}

function cornerAt(art: CornerArt, p: Point): WallPiece {
  const at = CORNER_POINT[art];
  return { art, x: Math.round(p.x - at.x), y: Math.round(p.y - at.y) };
}

/** Every wall piece: the back walls (behind the city) and the front ones (before it), each in drawing order. */
export function wallPieces(): { back: WallPiece[]; front: WallPiece[] } {
  const B = toStage(0, 0);
  const L = toStage(0, CITY);
  const R = toStage(CITY, 0);
  const F = toStage(CITY, CITY);
  const afterGate = STUB_LEN + GATE_SIDE_SECTIONS * SECTION_LEN + GATE_LEN;
  const gate = laid('wall-gate', onEdge(L, F, STUB_LEN + GATE_SIDE_SECTIONS * SECTION_LEN));
  const back = [cornerAt('corner-back', B), ...sections(L, B, STUB_LEN, SECTIONS), ...sections(B, R, STUB_LEN, SECTIONS), cornerAt('corner-left-rear', L), cornerAt('corner-right-rear', R)];
  const front = [cornerAt('corner-left', L), cornerAt('corner-right', R), ...sections(L, F, STUB_LEN, GATE_SIDE_SECTIONS), gate, ...sections(L, F, afterGate, GATE_SIDE_SECTIONS), ...sections(F, R, STUB_LEN, SECTIONS), cornerAt('corner-front', F)];
  return { back, front };
}

function stamp(out: Pixels, src: Pixels, p: WallPiece): void {
  for (let sy = 0; sy < src.h; sy++) {
    const ty = p.y + sy;
    if (ty < 0 || ty >= out.h) continue;
    for (let sx = 0; sx < src.w; sx++) {
      const tx = p.x + sx;
      if (tx < 0 || tx >= out.w) continue;
      const s = (sy * src.w + sx) * 4;
      if (src.data[s + 3]! < 128) continue;
      const d = (ty * out.w + tx) * 4;
      out.data[d] = src.data[s]!;
      out.data[d + 1] = src.data[s + 1]!;
      out.data[d + 2] = src.data[s + 2]!;
      out.data[d + 3] = 255;
    }
  }
}

/** The back and front walls drawn into stage-sized buffers, from the pieces' pixels (`px` of a texture key). */
export function cityWalls(px: (key: string) => Pixels): { back: Pixels; front: Pixels } {
  const blank = (): Pixels => ({ data: new Uint8ClampedArray(STAGE.w * STAGE.h * 4), w: STAGE.w, h: STAGE.h });
  const pieces = wallPieces();
  const draw = (list: readonly WallPiece[]): Pixels => {
    const out = blank();
    for (const p of list) stamp(out, px(TOWN_TEX.piece(p.art)), p);
    return out;
  };
  return { back: draw(pieces.back), front: draw(pieces.front) };
}
