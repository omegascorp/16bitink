import { TOWN_ART, type TownArt } from '../../art/pixel/town';
import type { Pixels } from '../battle/pixelScenery';
import { TOWN_TEX } from './townTex';
import { CITY, STAGE, toStage } from './townStage';

/**
 * The city's walls, from PixelLab's pieces at the town's angle: straight
 * sections (turrets at both ends, overlapping into one curtain) along all
 * four edges of the raised square, a corner on each of its points, and the
 * gatehouse halfway down the front-left wall. A corner is one painted piece:
 * a round tower standing on the ground where the two walls meet, with the
 * walls' last lengths running into its sides. A section runs down to the
 * right; mirrored (and shaded, as that face turns from the light) it runs
 * up to the right. The back walls are drawn behind the city, the front ones
 * in front of it, each into a stage-sized buffer. A side corner comes in two
 * parts, as its rear wall stands behind the city.
 */

/** Where a section's base meets the edge: rows down from its top at its left column (it falls half a row a column). */
const WALL_BASE_Y = 40;
/** How far along each section starts after the one before (its end turret overlaps the next one's). */
const WALL_STEP = 98;
/** A stub's base, as WALL_BASE_Y. */
const STUB_BASE_Y = 31;
/** How far the turret of the section after a stub overlaps the stub's end. */
const STUB_TUCK = 12;
const GATE_BASE_Y = 71;
/** Where along the front-left edge the gate stands. */
const GATE_AT = 0.5;
/** How far the sections either side of the gate tuck under its end turrets. */
const GATE_TUCK = 12;
/** Where the walls' foot lines meet in each corner's sprite, from dev/pixel/town/corner/cut_corner.py. */
const CORNER_POINT = {
  'corner-front': { x: 68, y: 96 },
  'corner-back': { x: 68, y: 96 },
  'corner-left': { x: 28, y: 96 },
  'corner-left-rear': { x: -30, y: 64 },
  'corner-right': { x: 68, y: 96 },
  'corner-right-rear': { x: 68, y: 65 },
} as const;
type CornerArt = keyof typeof CORNER_POINT;
/** The corners, each with the tower and flag. */
export const CORNER_TOWERS = ['corner-front', 'corner-back', 'corner-left', 'corner-right'] as const;
/** How much darker a face turned from the light is. */
export const WALL_SHADE = 0.82;

/** One piece of wall on the stage: its art, top-left, mirrored, shaded. */
export interface WallPiece {
  readonly art: TownArt;
  readonly x: number;
  readonly y: number;
  readonly flip: boolean;
  readonly shade: boolean;
}

type Point = { readonly x: number; readonly y: number };

/** The edge from `a` (left) to `b` (right), as y at any x. */
const edgeOf = (a: Point, b: Point): ((at: number) => number) => (at) => a.y + ((at - a.x) * (b.y - a.y)) / (b.x - a.x);

/** A length of wall with its left end at x0 on the edge from `a` to `b`, mirrored and shaded if the edge rises to the right. */
function laid(art: 'wall' | 'wall-stub', baseY: number, a: Point, b: Point, x0: number): WallPiece {
  const down = b.y > a.y;
  const edge = edgeOf(a, b);
  // Down to the right: the base's left end is on the edge. Up to the right (mirrored): its right end is.
  const y = down ? edge(x0) - baseY : edge(x0 + TOWN_ART[art].w - 1) - baseY;
  return { art, x: Math.round(x0), y: Math.round(y), flip: !down, shade: !down };
}

/** Sections along the edge from `a` (left) to `b` (right), the last one ending at `b`. */
function run(a: Point, b: Point): WallPiece[] {
  const w = TOWN_ART.wall.w;
  const out: WallPiece[] = [];
  for (let x = a.x; x < b.x - 8; x += WALL_STEP) out.push(laid('wall', WALL_BASE_Y, a, b, Math.min(x, b.x - w)));
  // Up to the right, the far (right) sections are further back: draw them first.
  return b.y > a.y ? out : out.reverse();
}

/** The wall along an edge from the end of a corner's own wall, at the end(s) named, the sections' turrets overlapping it. */
function curtain(a: Point, b: Point, stubs: { readonly start: boolean; readonly end: boolean } = { start: true, end: true }): WallPiece[] {
  const w = TOWN_ART['wall-stub'].w;
  const reach = w - STUB_TUCK;
  const edge = edgeOf(a, b);
  const at = (x: number): Point => ({ x, y: edge(x) });
  const from = (n: number): number => (stubs.start ? a.x + reach * n : a.x);
  const to = (n: number): number => (stubs.end ? b.x - reach * n : b.x);
  // Too short for two sections to sit a full step apart: a stub after the corner takes up the slack, so one section spans the rest.
  const lengths = to(1) - from(1) < TOWN_ART.wall.w + WALL_STEP / 2 ? 2 : 1;
  const stubsPast = Array.from({ length: lengths - 1 }, (_, i) => i + 1);
  return [
    ...(stubs.start ? stubsPast.map((i) => laid('wall-stub', STUB_BASE_Y, a, b, a.x + reach * i)) : []),
    ...(stubs.end ? stubsPast.map((i) => laid('wall-stub', STUB_BASE_Y, a, b, b.x - w - reach * i)) : []),
    ...run(at(from(lengths)), at(to(lengths))),
  ];
}

function cornerAt(art: CornerArt, p: Point): WallPiece {
  const at = CORNER_POINT[art];
  return { art, x: Math.round(p.x - at.x), y: Math.round(p.y - at.y), flip: false, shade: false };
}

/** Every wall piece: the back walls (behind the city) and the front ones (before it), each in drawing order. */
export function wallPieces(): { back: WallPiece[]; front: WallPiece[] } {
  const B = toStage(0, 0);
  const L = toStage(0, CITY);
  const R = toStage(CITY, 0);
  const F = toStage(CITY, CITY);
  const gate = TOWN_ART['wall-gate'];
  const gx = L.x + (F.x - L.x) * GATE_AT - gate.w / 2;
  const gy = L.y + (gx - L.x) / 2 - GATE_BASE_Y;
  // The front-left edge in two runs that meet the gate's end turrets, so no hole is left either side of it.
  const onEdge = (x: number): Point => ({ x, y: L.y + (x - L.x) * ((F.y - L.y) / (F.x - L.x)) });
  const toGate = curtain(L, onEdge(gx + GATE_TUCK), { start: true, end: false });
  const fromGate = curtain(onEdge(gx + gate.w - GATE_TUCK), F, { start: false, end: true });
  const gatePiece: WallPiece = { art: 'wall-gate', x: Math.round(gx), y: Math.round(gy), flip: false, shade: false };
  // The corners first: the sections' end turrets stand over the ends of their walls.
  const back = [cornerAt('corner-back', B), cornerAt('corner-left-rear', L), cornerAt('corner-right-rear', R), ...curtain(L, B), ...curtain(B, R)];
  const front = [cornerAt('corner-left', L), cornerAt('corner-right', R), cornerAt('corner-front', F), ...toGate, ...fromGate, gatePiece, ...curtain(F, R)];
  return { back, front };
}

function stamp(out: Pixels, src: Pixels, p: WallPiece): void {
  for (let sy = 0; sy < src.h; sy++) {
    const ty = p.y + sy;
    if (ty < 0 || ty >= out.h) continue;
    for (let sx = 0; sx < src.w; sx++) {
      const tx = p.x + sx;
      if (tx < 0 || tx >= out.w) continue;
      const s = (sy * src.w + (p.flip ? src.w - 1 - sx : sx)) * 4;
      if (src.data[s + 3]! < 128) continue;
      const d = (ty * out.w + tx) * 4;
      const by = p.shade ? WALL_SHADE : 1;
      out.data[d] = Math.round(src.data[s]! * by);
      out.data[d + 1] = Math.round(src.data[s + 1]! * by);
      out.data[d + 2] = Math.round(src.data[s + 2]! * by);
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
