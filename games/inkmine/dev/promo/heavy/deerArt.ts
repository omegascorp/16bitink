import { capsule, cub, oval, pt, type Draw } from '../../../src/art/kit';
import { gleam, mix, paint, SHADOW } from '../../../src/art/paint';
import { PAPER_FILL } from '../../../src/art/palette';
import type { Pt } from '../../../src/art/pen';
import type { Finish } from '../../../src/art/textures';
import { bakeSprite, type Sprite } from '../sprites';
import { HIP_Y, SHIN, THIGH } from './falls';

/**
 * A deer as we know it: tall, slender, long thin legs, a white rump and
 * a small rack of antlers. Drawn facing right, its ground point under the
 * middle of its body (y = 0) as it stands, hips at HIP_Y; the body and each
 * leg's two segments are baked separately so the legs can fold.
 */
const BODY_ART = { w: 176, h: 156, ox: 74, oy: 196 } as const;
const COAT = '#b5804d';
const COAT_LIT = '#d8a670';
const CREAM = '#efe0c2';
const DARK = '#3a2a22';
const ANTLER = '#e6d6b0';
const FINISH: Finish = { line: 0.7, rim: 0.7 };

function torso(d: Draw): void {
  const shape = [
    pt(-56, -82),
    ...cub(pt(-56, -82), pt(-58, -100), pt(-40, -104), pt(-10, -100), 8),
    ...cub(pt(-10, -100), pt(16, -98), pt(34, -104), pt(48, -96), 8),
    ...cub(pt(48, -96), pt(58, -88), pt(56, -70), pt(42, -64), 6),
    ...cub(pt(42, -64), pt(20, -60), pt(-30, -60), pt(-48, -64), 8),
    ...cub(pt(-48, -64), pt(-58, -68), pt(-58, -76), pt(-56, -82), 4),
  ];
  paint(d, shape, COAT, { alpha: 1, shadow: 0.6, hatch: 0.2, line: 0.75 });
  const belly = [pt(-40, -66), ...cub(pt(-40, -66), pt(-10, -70), pt(20, -70), pt(40, -66), 6), ...cub(pt(40, -66), pt(20, -61), pt(-20, -61), pt(-40, -66), 6)];
  paint(d, belly, CREAM, { alpha: 0.9, shadow: 0.3, hatch: 0, line: 0 });
  // The white rump and the flag of a tail.
  paint(d, oval(-52, -86, 7, 10, 16), CREAM, { alpha: 1, shadow: 0.3, hatch: 0, line: 0.5 });
  paint(d, capsule(pt(-56, -96), pt(-62, -86), 6, 4), mix(COAT, DARK, 0.3), { alpha: 1, shadow: 0.4, hatch: 0, line: 0.6 });
  for (let k = 0; k < 5; k++) d.pen.hair([pt(-30 + k * 16, -96), pt(-26 + k * 16, -88)], 0.5, mix(COAT, SHADOW, 0.5), 0.5);
}

function neckAndHead(d: Draw): void {
  const neck = [pt(30, -98), ...cub(pt(30, -98), pt(42, -120), pt(54, -138), pt(60, -146), 8), pt(72, -140), ...cub(pt(72, -140), pt(66, -124), pt(58, -104), pt(52, -84), 8)];
  paint(d, neck, COAT, { alpha: 1, shadow: 0.55, hatch: 0.16, line: 0.75 });
  // The ear, and a small rack of antlers: two beams with a tine each.
  const ear = [pt(60, -150), ...cub(pt(60, -150), pt(50, -160), pt(44, -164), pt(42, -160), 6), ...cub(pt(42, -160), pt(46, -154), pt(52, -148), pt(60, -146), 4)];
  paint(d, ear, mix(COAT_LIT, '#e7b9a6', 0.4), { alpha: 1, shadow: 0.4, hatch: 0, line: 0.6 });
  for (const [x, far] of [[64, true], [68, false]] as const) {
    const c = far ? mix(ANTLER, SHADOW, 0.3) : ANTLER;
    const tip = pt(x - 6, -180);
    paint(d, capsule(pt(x, -152), tip, 3, 1.8), c, { alpha: 1, shadow: 0.4, hatch: 0, line: 0.5 });
    paint(d, capsule(pt(x - 2, -166), pt(x + 6, -174), 2.2, 1.4), c, { alpha: 1, shadow: 0.4, hatch: 0, line: 0.5 });
  }
  const head = [
    pt(58, -150),
    ...cub(pt(58, -150), pt(66, -158), pt(76, -152), pt(84, -142), 6),
    ...cub(pt(84, -142), pt(92, -136), pt(94, -130), pt(90, -128), 6),
    ...cub(pt(90, -128), pt(82, -126), pt(70, -130), pt(60, -136), 6),
    ...cub(pt(60, -136), pt(54, -140), pt(54, -146), pt(58, -150), 4),
  ];
  paint(d, head, COAT_LIT, { alpha: 1, shadow: 0.5, hatch: 0.14, line: 0.75 });
  paint(d, oval(90, -131, 3, 2.6, 12), DARK, { alpha: 1, shadow: 0.2, hatch: 0, line: 0.4, gloss: true });
  paint(d, oval(78, -130, 6, 2.4, 12), CREAM, { alpha: 0.85, shadow: 0.2, hatch: 0, line: 0 });
  // A big dark eye, wide open.
  d.pen.dot(70, -144, 2.8, d.ink);
  d.pen.dot(70.9, -145, 0.9, PAPER_FILL);
  gleam(d, [pt(62, -152), pt(70, -154), pt(78, -149)], 0.7, 0.5);
}

function drawBody(d: Draw): void {
  neckAndHead(d);
  torso(d);
}

/** A thigh from the hip (y = 0) to the knee (y = THIGH): broad at the top (the haunch or the shoulder), slim at the knee. */
function drawThigh(d: Draw, rear: boolean, far: boolean): void {
  const c = far ? mix(COAT, SHADOW, 0.35) : COAT;
  const top = rear ? 15 : 11;
  const shape = [pt(-top / 2, -4), ...cub(pt(-top / 2, -4), pt(-top / 2, 12), pt(-3, THIGH - 8), pt(-2.6, THIGH + 1), 8), pt(2.6, THIGH + 1), ...cub(pt(2.6, THIGH + 1), pt(3, THIGH - 8), pt(top / 2, 12), pt(top / 2, -4), 8), ...cub(pt(top / 2, -4), pt(top / 4, -10), pt(-top / 4, -10), pt(-top / 2, -4), 6)];
  paint(d, shape, c, { alpha: 1, shadow: 0.55, hatch: 0.16, line: 0.6 });
  d.pen.dot(0, THIGH, 2.4, mix(c, SHADOW, 0.3), 0.9);
}

/** A shin from the knee (y = 0) down to the hoof (y = SHIN): a thin cannon bone, a dark split hoof. */
function drawShin(d: Draw, far: boolean): void {
  const c = far ? mix(COAT, SHADOW, 0.35) : mix(COAT, COAT_LIT, 0.3);
  paint(d, capsule(pt(0, 0), pt(0, SHIN - 5), 4.6, 3.2), c, { alpha: 1, shadow: 0.5, hatch: 0, line: 0.55 });
  const hoof: Pt[] = [pt(-2.2, SHIN - 6), pt(2.4, SHIN - 6), pt(4.2, SHIN), pt(-2.6, SHIN)];
  paint(d, hoof, far ? mix(DARK, SHADOW, 0.3) : DARK, { alpha: 1, shadow: 0.3, hatch: 0, line: 0.5, gloss: true });
}

export interface DeerSprites {
  readonly body: Sprite;
  readonly thigh: Readonly<Record<'rearNear' | 'rearFar' | 'frontNear' | 'frontFar', Sprite>>;
  readonly shin: Readonly<Record<'near' | 'far', Sprite>>;
}
export function makeDeer(res: number): DeerSprites {
  const thighArt = { w: 22, h: THIGH + 16, ox: 11, oy: 11 };
  const shinArt = { w: 14, h: SHIN + 8, ox: 7, oy: 4 };
  return {
    body: bakeSprite(BODY_ART, res, 7600, drawBody, FINISH),
    thigh: {
      rearNear: bakeSprite(thighArt, res, 7610, (d) => drawThigh(d, true, false), FINISH),
      rearFar: bakeSprite(thighArt, res, 7620, (d) => drawThigh(d, true, true), FINISH),
      frontNear: bakeSprite(thighArt, res, 7630, (d) => drawThigh(d, false, false), FINISH),
      frontFar: bakeSprite(thighArt, res, 7640, (d) => drawThigh(d, false, true), FINISH),
    },
    shin: { near: bakeSprite(shinArt, res, 7650, (d) => drawShin(d, false), FINISH), far: bakeSprite(shinArt, res, 7660, (d) => drawShin(d, true), FINISH) },
  };
}
/** Where its head is (units), for the stunned stars. */
export const DEER_HEAD = { x: 70, y: HIP_Y - 100 } as const;
