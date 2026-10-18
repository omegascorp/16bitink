import { makeDraw, pt, ribbon, type Draw } from '../../../src/art/kit';
import { paint } from '../../../src/art/paint';
import { BOIL } from '../../../src/art/palette';
import { PROSPECTOR_FRAME, PROSPECTOR_GROUND } from '../../../src/art/prospector';
import { PROSPECTOR_FINISH, render, type Finish } from '../../../src/art/textures';
import { evenLoadout, prospectorLook } from '../../../src/logic/gear';
import { drawSprite, type Frame, type Sprite } from '../sprites';
import { COAT, drawBody, drawBodyFrost, drawCoat, drawHead, FAR_SHOULDER, SCARF, SCARF_STRIPE, SHOULDER } from './bodyArt';
import { coatAt, frostAt, SCALE, type Face, type Flyer, type Legs } from './story';
import { drawSleeve, drawWing, drawWingFrost, WING_FRAME } from './wingArt';

/**
 * The flying prospector, baked once at video size: three bodies (flying,
 * standing on the shore, frozen in fright), the near and far wings, and the
 * frost, coat and sleeve laid over them. Each frame they are put together:
 * far wing, body, coat, frost, scarf, near wing, each wing turned about
 * its shoulder.
 */
const RES = 16;
const BODY_FRAME: Frame = { w: PROSPECTOR_FRAME, h: PROSPECTOR_FRAME, ox: PROSPECTOR_FRAME / 2, oy: PROSPECTOR_FRAME / 2 };
/** The starter suit: cobalt, the blue "you", against the orange haze. */
const LOOK = prospectorLook(evenLoadout(0));

/** As sprites.ts bakeSprite, with the game's ground line (the prospector's feet stand on PROSPECTOR_GROUND). */
function bake(frame: Frame, seed: number, draw: (d: Draw) => void, finish?: Finish): Sprite {
  const frames = Array.from({ length: BOIL }, (_, f) =>
    render(frame.w, frame.h, frame.ox, frame.oy, RES, (ctx) => draw(makeDraw(ctx, seed + f, f, PROSPECTOR_GROUND)), finish));
  return { frames, frame, res: RES };
}

export interface FlyerArt {
  readonly bodies: Readonly<Record<Legs, Sprite>>;
  readonly heads: Readonly<Record<Face, Sprite>>;
  readonly frost: Sprite;
  readonly coat: Sprite;
  readonly near: Sprite;
  readonly far: Sprite;
  readonly wingFrost: Sprite;
  readonly sleeve: Sprite;
}

export function makeFlyer(): FlyerArt {
  const body = (legs: Legs, seed: number): Sprite => bake(BODY_FRAME, seed, (d) => drawBody(d, LOOK, legs), PROSPECTOR_FINISH);
  const head = (face: Face, seed: number): Sprite => bake(BODY_FRAME, seed, (d) => drawHead(d, LOOK, face), PROSPECTOR_FINISH);
  return {
    bodies: { fly: body('fly', 100), stand: body('stand', 110) },
    heads: { calm: head('calm', 120), shock: head('shock', 130) },
    frost: bake(BODY_FRAME, 300, drawBodyFrost),
    coat: bake(BODY_FRAME, 320, drawCoat, PROSPECTOR_FINISH),
    near: bake(WING_FRAME, 400, (d) => drawWing(d, LOOK.suit), PROSPECTOR_FINISH),
    far: bake(WING_FRAME, 410, (d) => drawWing(d, LOOK.suit, true), PROSPECTOR_FINISH),
    wingFrost: bake(WING_FRAME, 420, drawWingFrost),
    sleeve: bake(WING_FRAME, 430, (d) => drawSleeve(d, COAT), PROSPECTOR_FINISH),
  };
}

/** A point of the body's drawing (units) on screen. */
export function onBody(f: Flyer, p: { readonly x: number; readonly y: number }, scale = SCALE): { x: number; y: number } {
  const c = Math.cos(f.tilt);
  const s = Math.sin(f.tilt);
  return { x: f.x + (p.x * c - p.y * s) * scale, y: f.y + (p.x * s + p.y * c) * scale };
}

/** The near shoulder on screen (the wings turn about it). */
export const shoulderOf = (f: Flyer): { x: number; y: number } => onBody(f, SHOULDER);

/** The scarf's tail streaming back in the wind, waving. */
function scarfTail(ctx: CanvasRenderingContext2D, f: Flyer, t: number, boil: number, scale: number): void {
  ctx.save();
  ctx.translate(f.x, f.y);
  ctx.rotate(f.tilt);
  ctx.scale(scale, scale);
  const d = makeDraw(ctx, 700 + boil, boil, 0);
  const spine = Array.from({ length: 12 }, (_, i) => {
    const u = i / 11;
    return pt(-6 - u * 17, -3 + u * 3 + Math.sin(t * 9 - u * 5) * 1.6 * u);
  });
  const { shape } = ribbon(spine, (u) => 3.2 - u * 0.8);
  paint(d, shape, SCARF, { alpha: 1, shadow: 0.45, hatch: 0.1, line: 0.5 });
  for (const u of [0.3, 0.55, 0.8]) {
    const i = Math.round(u * 11);
    const a = spine[i]!;
    const b = spine[Math.min(11, i + 1)]!;
    d.pen.stroke([pt(a.x, a.y - 1.4), pt(b.x, b.y + 1.4)], 0.9, SCARF_STRIPE, 0.9, false);
  }
  // Fringe at its end.
  const end = spine[11]!;
  for (let k = -1; k <= 1; k++) d.pen.hair([pt(end.x, end.y + k * 0.9), pt(end.x - 2, end.y + k * 1.1 + 0.4)], 0.3, d.ink, 0.8);
  ctx.restore();
}

/** Draws the prospector with its wings: `t` for the scarf's wave, `boil` the line-boil frame. */
export function drawFlyer(ctx: CanvasRenderingContext2D, art: FlyerArt, f: Flyer, t: number, boil: number): void {
  const coat = coatAt(t);
  const frost = frostAt(t);
  const far = onBody(f, FAR_SHOULDER);
  const near = shoulderOf(f);
  drawSprite(ctx, art.far, boil, { x: far.x, y: far.y, scale: SCALE * 0.94, rotation: f.far });
  if (frost > 0) drawSprite(ctx, art.wingFrost, boil, { x: far.x, y: far.y, scale: SCALE * 0.94, rotation: f.far, alpha: frost * 0.7 });
  const at = { x: f.x, y: f.y, scale: SCALE, rotation: f.tilt };
  drawSprite(ctx, art.bodies[f.legs], boil, at);
  if (coat.show > 0) {
    // Popped on round the chest: scaled about the middle of the coat.
    const mid = onBody(f, { x: 0, y: 3 });
    const k = SCALE * coat.scale;
    drawSprite(ctx, art.coat, boil, { x: mid.x - (mid.x - f.x) * coat.scale, y: mid.y - (mid.y - f.y) * coat.scale, scale: k, rotation: f.tilt });
    scarfTail(ctx, f, t, boil, SCALE);
  }
  drawSprite(ctx, art.near, boil, { x: near.x, y: near.y, scale: SCALE, rotation: f.near });
  if (frost > 0) drawSprite(ctx, art.wingFrost, boil, { x: near.x, y: near.y, scale: SCALE, rotation: f.near, alpha: frost });
  if (coat.show > 0) drawSprite(ctx, art.sleeve, boil, { x: near.x, y: near.y, scale: SCALE, rotation: f.near });
  drawSprite(ctx, art.heads[f.face], boil, at);
  if (frost > 0) drawSprite(ctx, art.frost, boil, { ...at, alpha: frost });
}
