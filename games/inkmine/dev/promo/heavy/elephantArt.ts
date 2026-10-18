import { capsule, cub, oval, pt, type Draw } from '../../../src/art/kit';
import { gleam, mix, paint, SHADOW } from '../../../src/art/paint';
import { PAPER_FILL } from '../../../src/art/palette';
import type { Pt } from '../../../src/art/pen';
import type { Finish } from '../../../src/art/textures';
import { bakeSprite, type Sprite } from '../sprites';

/**
 * An African elephant, side on and facing right: a great round body on
 * four pillar legs, a domed head with a tusk, its trunk and its big ear
 * baked apart so the ear can flap and the trunk lift. Its ground point is
 * under the middle of its body (y = 0), legs hanging from y = LEG_TOP.
 */
export const LEG_TOP = -50;
export const LEG_H = 50;
/** Where the ear and the trunk hang from (units). */
export const EAR_ROOT = { x: 62, y: -124 } as const;
export const TRUNK_ROOT = { x: 94, y: -92 } as const;
const HIDE = '#8c909b';
const HIDE_DARK = '#6c707c';
const EAR_IN = '#b8a2a6';
const TUSK = '#f1e7cf';
const FINISH: Finish = { line: 0.8, rim: 0.7 };

function wrinkles(d: Draw, x0: number, x1: number, y: number, rows: number, gap: number): void {
  for (let r = 0; r < rows; r++) {
    for (let x = x0 + (r % 2) * 5; x < x1; x += 11) d.pen.hair([pt(x, y - r * gap), pt(x + 4, y - r * gap - 1.2), pt(x + 8, y - r * gap)], 0.5, mix(HIDE, SHADOW, 0.55), 0.55);
  }
}

/** Its eye (units, before it rises), for the sad lid. */
export const ELEPHANT_EYE = { x: 84, y: -114 } as const;
function drawEye(d: Draw): void {
  d.pen.dot(ELEPHANT_EYE.x, ELEPHANT_EYE.y, 3, d.ink);
  d.pen.dot(ELEPHANT_EYE.x + 0.9, ELEPHANT_EYE.y - 1, 0.9, PAPER_FILL);
}

function drawBody(d: Draw): void {
  paint(d, capsule(pt(-72, -100), pt(-82, -66), 4, 3), HIDE_DARK, { alpha: 1, shadow: 0.4, hatch: 0, line: 0.6 });
  const body = [
    pt(-70, -58),
    ...cub(pt(-70, -58), pt(-84, -80), pt(-78, -104), pt(-56, -116), 8),
    ...cub(pt(-56, -116), pt(-24, -132), pt(14, -140), pt(40, -134), 10),
    ...cub(pt(40, -134), pt(60, -130), pt(70, -112), pt(66, -90), 8),
    ...cub(pt(66, -90), pt(62, -70), pt(52, -54), pt(36, -48), 8),
    ...cub(pt(36, -48), pt(10, -40), pt(-30, -40), pt(-52, -46), 8),
    ...cub(pt(-52, -46), pt(-62, -50), pt(-68, -54), pt(-70, -58), 4),
  ];
  paint(d, body, HIDE, { alpha: 1, shadow: 0.7, hatch: 0.24, cross: true, line: 0.85 });
  d.pen.stipple(body, 220, (_, y) => Math.max(0, (y + 40) / 90), 0.6, mix(HIDE, SHADOW, 0.5));
  wrinkles(d, -62, 46, -52, 3, 7);
  // The hip's fold and the knee's creases where the legs come out.
  d.pen.hair([pt(-56, -100), pt(-46, -84), pt(-44, -62)], 0.7, mix(HIDE, SHADOW, 0.6), 0.6);
  d.pen.hair([pt(26, -96), pt(30, -78), pt(28, -58)], 0.7, mix(HIDE, SHADOW, 0.6), 0.6);
}

/** The head over the shoulders' front: a high domed brow, a tusk, the eye. */
function drawHead(d: Draw): void {
  const head = [
    pt(52, -126),
    ...cub(pt(52, -126), pt(56, -148), pt(88, -152), pt(100, -130), 8),
    ...cub(pt(100, -130), pt(106, -116), pt(104, -98), pt(98, -86), 6),
    ...cub(pt(98, -86), pt(88, -76), pt(72, -76), pt(62, -86), 6),
    ...cub(pt(62, -86), pt(54, -96), pt(50, -112), pt(52, -126), 6),
  ];
  paint(d, head, mix(HIDE, '#a3a6b0', 0.3), { alpha: 1, shadow: 0.6, hatch: 0.2, line: 0.85 });
  d.pen.stipple(head, 60, () => 0.5, 0.5, mix(HIDE, SHADOW, 0.45));
  paint(d, [pt(88, -86), ...cub(pt(88, -86), pt(100, -84), pt(110, -78), pt(116, -86), 6), pt(114, -81), ...cub(pt(114, -81), pt(104, -74), pt(94, -76), pt(86, -80), 6)], TUSK, { alpha: 1, shadow: 0.35, hatch: 0, line: 0.6, gloss: true });
  gleam(d, [pt(62, -140), pt(76, -146), pt(90, -140)], 0.9, 0.55);
  drawEye(d);
}

/** The ear, from its root (0, 0): a big flap hanging back over the neck, pale pink inside its rim. */
function drawEar(d: Draw): void {
  const ear: Pt[] = [pt(0, 0), ...cub(pt(0, 0), pt(-16, -14), pt(-40, -10), pt(-44, 12), 8), ...cub(pt(-44, 12), pt(-48, 36), pt(-34, 56), pt(-18, 62), 8), ...cub(pt(-18, 62), pt(-10, 64), pt(-4, 50), pt(-6, 40), 6), ...cub(pt(-6, 40), pt(-2, 28), pt(4, 14), pt(0, 0), 6)];
  paint(d, ear, mix(HIDE, '#9aa0aa', 0.4), { alpha: 1, shadow: 0.55, hatch: 0.18, line: 0.8 });
  const inner = ear.map((p) => pt(p.x * 0.75 - 3, p.y * 0.75 + 4));
  paint(d, inner, EAR_IN, { alpha: 0.5, shadow: 0.3, hatch: 0, line: 0 });
  for (let k = 0; k < 4; k++) d.pen.hair([pt(-6 - k * 7, 6 + k * 3), pt(-12 - k * 7, 20 + k * 4), pt(-10 - k * 6, 34)], 0.5, mix(HIDE, SHADOW, 0.5), 0.5);
}

/** The trunk from its root (0, 0), hanging down and curling forward at the tip. */
function drawTrunk(d: Draw): void {
  const spine = [pt(0, 0), pt(6, 16), pt(9, 34), pt(10, 52), pt(14, 62), pt(20, 62)];
  const w = (u: number): number => 16 - 9 * u;
  for (let i = 0; i < spine.length - 1; i++) {
    paint(d, capsule(spine[i]!, spine[i + 1]!, w(i / 5), w((i + 1) / 5)), mix(HIDE, '#a3a6b0', 0.2), { alpha: 1, shadow: 0.5, hatch: 0, line: 0.7 });
  }
  for (let k = 1; k < 9; k++) {
    const y = k * 6.5;
    d.pen.hair([pt(1 + y * 0.18 - 4, y), pt(1 + y * 0.18 + 4, y + 1)], 0.5, mix(HIDE, SHADOW, 0.6), 0.6);
  }
}

/** A pillar leg from its top (y = 0) to the sole (y = LEG_H), toenails at the front. */
function drawLeg(d: Draw, far: boolean): void {
  const c = far ? mix(HIDE, SHADOW, 0.35) : HIDE;
  const shape = [pt(-16, -10), ...cub(pt(-16, -10), pt(-15, 18), pt(-12, LEG_H - 14), pt(-15, LEG_H), 8), pt(15, LEG_H), ...cub(pt(15, LEG_H), pt(12, LEG_H - 14), pt(15, 18), pt(16, -10), 8), ...cub(pt(16, -10), pt(8, -16), pt(-8, -16), pt(-16, -10), 6)];
  paint(d, shape, c, { alpha: 1, shadow: 0.65, hatch: 0.22, line: 0.8 });
  wrinkles(d, -11, 11, LEG_H - 14, 3, 6);
  for (const x of [-7, 1, 9]) paint(d, oval(x, LEG_H - 2, 3.4, 2.4, 12), far ? mix(TUSK, SHADOW, 0.4) : TUSK, { alpha: 1, shadow: 0.3, hatch: 0, line: 0.5 });
}

export interface ElephantSprites {
  readonly body: Sprite;
  readonly head: Sprite;
  readonly ear: Sprite;
  readonly trunk: Sprite;
  readonly near: Sprite;
  readonly far: Sprite;
}
export function makeElephant(res: number): ElephantSprites {
  return {
    body: bakeSprite({ w: 210, h: 124, ox: 92, oy: 160 }, res, 7800, drawBody, FINISH),
    head: bakeSprite({ w: 210, h: 124, ox: 92, oy: 160 }, res, 7805, drawHead, FINISH),
    ear: bakeSprite({ w: 58, h: 84, ox: 50, oy: 16 }, res, 7810, drawEar, FINISH),
    trunk: bakeSprite({ w: 40, h: 76, ox: 12, oy: 8 }, res, 7820, drawTrunk, FINISH),
    near: bakeSprite({ w: 36, h: LEG_H + 20, ox: 18, oy: 17 }, res, 7830, (d) => drawLeg(d, false), FINISH),
    far: bakeSprite({ w: 36, h: LEG_H + 20, ox: 18, oy: 17 }, res, 7840, (d) => drawLeg(d, true), FINISH),
  };
}
