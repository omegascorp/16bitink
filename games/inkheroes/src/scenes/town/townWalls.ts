import { TOWN_ART, type TownArt } from '../../art/pixel/town';
import type { Pixels } from '../battle/pixelScenery';
import { TOWN_TEX } from './townTex';
import { CITY, STAGE, toStage } from './townStage';

/**
 * The city's walls, from PixelLab's pieces at the town's angle: straight
 * sections (turrets at both ends, overlapping into one curtain) along all
 * four edges of the raised square, round towers on its corners and the
 * gatehouse halfway down the front-left wall. A section runs down to the
 * right; mirrored (and shaded, as that face turns from the light) it runs
 * up to the right. The back walls are drawn behind the city, the front ones
 * in front of it, each into a stage-sized buffer.
 */

/** Where a section's base meets the edge: rows down from its top at its left column (it falls half a row a column). */
const WALL_BASE_Y = 40;
/** How far along each section starts after the one before (its end turret overlaps the next one's). */
const WALL_STEP = 98;
const GATE_BASE_Y = 71;
/** Where along the front-left edge the gate stands. */
const GATE_AT = 0.5;
/** How far the sections either side of the gate tuck under its end turrets. */
const GATE_TUCK = 12;
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

/** Sections along the edge from `a` (left) to `b` (right), the last one ending at `b`. */
function run(a: Point, b: Point): WallPiece[] {
  const down = b.y > a.y;
  const w = TOWN_ART.wall.w;
  const out: WallPiece[] = [];
  const slope = (b.y - a.y) / (b.x - a.x);
  for (let x = a.x; x < b.x - 8; x += WALL_STEP) {
    const x0 = Math.min(x, b.x - w);
    const edge = (at: number): number => a.y + (at - a.x) * slope;
    // Down to the right: the base's left end is on the edge. Up to the right (mirrored): its right end is.
    const y = down ? edge(x0) - WALL_BASE_Y : edge(x0 + w - 1) - WALL_BASE_Y;
    out.push({ art: 'wall', x: Math.round(x0), y: Math.round(y), flip: !down, shade: !down });
  }
  // Up to the right, the far (right) sections are further back: draw them first.
  return down ? out : out.reverse();
}

function towerAt(p: Point): WallPiece {
  const s = TOWN_ART['wall-tower'];
  return { art: 'wall-tower', x: Math.round(p.x - s.w / 2), y: Math.round(p.y + 4 - s.h), flip: false, shade: false };
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
  const toGate = run(L, onEdge(gx + GATE_TUCK));
  const fromGate = run(onEdge(gx + gate.w - GATE_TUCK), F);
  const gatePiece: WallPiece = { art: 'wall-gate', x: Math.round(gx), y: Math.round(gy), flip: false, shade: false };
  const back = [towerAt(B), ...run(L, B), ...run(B, R), towerAt(L), towerAt(R)];
  const front = [...toGate, ...fromGate, gatePiece, ...run(F, R), towerAt(L), towerAt(F), towerAt(R)];
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
