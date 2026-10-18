import { pt, type Draw } from '../../../src/art/kit';
import { mix, paint, SHADOW } from '../../../src/art/paint';
import { PAPER_FILL } from '../../../src/art/palette';
import type { Pt } from '../../../src/art/pen';
import type { Finish } from '../../../src/art/textures';
import { bakeSprite, type Sprite } from '../sprites';

/**
 * The block deer: the square–cube law's animal, a cube of a body on four
 * square legs, with a block head, ears and two little antlers. Drawn in an
 * oblique view (front faces square, depth up and to the right), in drawing
 * units where the body's side is 20; each piece's origin is its
 * front-bottom-left corner.
 */
export const SIDE = 20;
/** Depth: how far a body's back edge sits up and right of its front, per side. */
export const DEPTH = { x: 8.4, y: -6 } as const;
export const LEG = { w: 5, h: 16 } as const;
const WOOD = '#c4934f';
const WOOD_TOP = '#e3bf82';
const WOOD_SIDE = '#8d6334';
const FINISH: Finish = { line: 0.3, rim: 0.4 };

const quad = (a: Pt, b: Pt, c: Pt, d: Pt): Pt[] => [a, b, c, d];

/** A box `w` wide, `h` tall and `deep` (as a share of DEPTH) deep, from its front-bottom-left corner. */
function box(d: Draw, w: number, h: number, deep: number, wood: [string, string, string]): void {
  const dx = DEPTH.x * deep;
  const dy = DEPTH.y * deep;
  const front = quad(pt(0, 0), pt(w, 0), pt(w, -h), pt(0, -h));
  const top = quad(pt(0, -h), pt(w, -h), pt(w + dx, -h + dy), pt(dx, -h + dy));
  const side = quad(pt(w, 0), pt(w + dx, dy), pt(w + dx, -h + dy), pt(w, -h));
  paint(d, side, wood[2], { alpha: 1, shadow: 0.45, hatch: 0.3, line: 0.5 });
  paint(d, top, wood[1], { alpha: 1, shadow: 0.15, hatch: 0, line: 0.5 });
  paint(d, front, wood[0], { alpha: 1, shadow: 0.15, hatch: 0.1, line: 0.55 });
  // Wood grain on the front, so it reads as a block.
  for (let k = 1; k < 4; k++) d.pen.hair([pt(w * 0.08, -h * (k / 4)), pt(w * 0.5, -h * (k / 4) + 0.4), pt(w * 0.92, -h * (k / 4) - 0.2)], 0.25, mix(wood[0], SHADOW, 0.4), 0.45);
}

const WOODS: [string, string, string] = [WOOD, WOOD_TOP, WOOD_SIDE];

/** The head: a small block with a snout, an eye, an ear and two little antlers on top. */
function drawHead(d: Draw): void {
  const ear = [pt(1, -9.5), pt(-3.5, -13), pt(2.4, -11)];
  paint(d, ear, mix(WOOD, '#e2b9a0', 0.4), { alpha: 1, shadow: 0.3, hatch: 0, line: 0.4 });
  for (const [x, far] of [[3.5, true], [6.5, false]] as const) {
    const c = far ? mix('#efe2c4', SHADOW, 0.25) : '#efe2c4';
    d.pen.stroke([pt(x, -10.5), pt(x - 0.6, -15), pt(x - 2.2, -17.5)], 1.3, d.ink, 0.95, false);
    d.pen.stroke([pt(x, -10.5), pt(x - 0.6, -15), pt(x - 2.2, -17.5)], 0.7, c, 1, false);
    d.pen.stroke([pt(x - 0.5, -14), pt(x + 1.6, -16.4)], 1.1, d.ink, 0.95, false);
    d.pen.stroke([pt(x - 0.5, -14), pt(x + 1.6, -16.4)], 0.55, c, 1, false);
  }
  box(d, 9, 9, 0.4, WOODS);
  // The snout, a smaller block out in front, with a dark nose.
  d.pen.ctx.save();
  d.pen.ctx.translate(9, -0.5);
  box(d, 4, 4.6, 0.35, WOODS);
  d.pen.ctx.restore();
  d.pen.dot(12.6, -4.2, 0.9, '#2e2729');
  d.pen.dot(6.2, -6.2, 1, d.ink);
  d.pen.dot(6.5, -6.5, 0.32, PAPER_FILL);
}

export interface BlockSprites {
  readonly cube: Sprite;
  readonly leg: Sprite;
  readonly head: Sprite;
}
/** Baked at `res` canvas px per unit (the big deer shows them at twice the small one's size). */
export function makeBlocks(res: number): BlockSprites {
  return {
    cube: bakeSprite({ w: 32, h: 30, ox: 2, oy: 28 }, res, 7100, (d) => box(d, SIDE, SIDE, 1, WOODS), FINISH),
    leg: bakeSprite({ w: 10, h: 22, ox: 2, oy: 19 }, res, 7200, (d) => box(d, LEG.w, LEG.h, LEG.w / SIDE, WOODS), FINISH),
    head: bakeSprite({ w: 20, h: 22, ox: 5, oy: 20 }, res, 7300, drawHead, FINISH),
  };
}
