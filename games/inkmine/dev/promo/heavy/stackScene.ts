import { drawProspector, PROSPECTOR_FRAME, PROSPECTOR_GROUND } from '../../../src/art/prospector';
import { PROSPECTOR_FINISH } from '../../../src/art/textures';
import { evenLoadout, prospectorLook } from '../../../src/logic/gear';
import { bakeSprite, type Sprite } from '../sprites';
import { drawDust, drawPart, drawSweat } from './marks';
import { riderAt, RIDERS_LAND, since, STEPS, sweatAt, walkerAt, type Walker } from './story';

/**
 * "Every step, you'd carry two more of you on your back!": the game's
 * prospector trudging bent double under three times their weight, two more
 * of them dropping onto their back, a puff of dust at every heavy step.
 */
const SCALE = 7.2;
const FRAME = { w: PROSPECTOR_FRAME, h: PROSPECTOR_FRAME, ox: PROSPECTOR_FRAME / 2, oy: PROSPECTOR_FRAME / 2 + PROSPECTOR_GROUND } as const;
/** Where the first rider sits, in the walker's units from its feet (before it bends): on its pack; the second sits on the first's head. */
const SEAT = { x: -9, y: -29 } as const;
const ON_HEAD = { x: -1, y: -27 } as const;
/** How each rider leans against the one below (radians). */
const LEANS = [-0.3, 0.1] as const;

interface StackSprites {
  readonly walk: Sprite;
  readonly idle: Sprite;
}

/** One prospector stood on (x, y), turned by `rot` about their feet. */
function drawYou(ctx: CanvasRenderingContext2D, s: Sprite, frame: number, x: number, y: number, rot: number, squash = 0): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(1 + squash * 0.6, 1 - squash);
  drawPart(ctx, s, frame, 0, -PROSPECTOR_GROUND * SCALE, SCALE);
  ctx.restore();
}

const turn = (p: { x: number; y: number }, a: number): { x: number; y: number } => ({ x: p.x * Math.cos(a) - p.y * Math.sin(a), y: p.x * Math.sin(a) + p.y * Math.cos(a) });

function drawRiders(ctx: CanvasRenderingContext2D, s: StackSprites, w: Walker, t: number, boil: number): void {
  // Each seat moves with the one below it: the walker's pack, then the first rider's head.
  let base = { x: w.x, y: w.ground + w.dip };
  let rot = w.bend;
  let seat: { x: number; y: number } = SEAT;
  LEANS.forEach((lean, i) => {
    const r = riderAt(t, i);
    if (!r) return;
    const at = turn(seat, rot);
    const x = base.x + at.x * SCALE * (1 + (i ? 0 : w.squash * 0.6));
    const y = base.y + at.y * SCALE * (1 - (i ? 0 : w.squash)) + w.dip * 0.4 * i;
    rot += lean + r.wobble;
    drawYou(ctx, s.idle, boil + i, x, y - r.drop, rot);
    base = { x, y };
    seat = ON_HEAD;
  });
}

export function makeStackScene(): (ctx: CanvasRenderingContext2D, t: number, boil: number) => void {
  const look = prospectorLook(evenLoadout(2));
  const s: StackSprites = {
    walk: bakeSprite(FRAME, 8, 110, (d) => drawProspector(d, 'walk', look), PROSPECTOR_FINISH),
    idle: bakeSprite(FRAME, 8, 120, (d) => drawProspector(d, 'idle', look), PROSPECTOR_FINISH),
  };
  return (ctx, t, boil) => {
    const w = walkerAt(t);
    // A puff of dust kicked up at each heavy step and each landing.
    for (const at of [...STEPS, ...RIDERS_LAND]) drawDust(ctx, w.x + 20, w.ground + 4, since(t, at) / 0.7, 0.2, boil, 7);
    drawYou(ctx, s.walk, w.step, w.x, w.ground + w.dip * 0.3, w.bend, w.squash);
    drawRiders(ctx, s, w, t, boil);
    const head = { x: w.x + Math.sin(w.bend) * 26 * SCALE, y: w.ground - Math.cos(w.bend) * 26 * SCALE };
    drawSweat(ctx, head.x + 40, head.y, t, sweatAt(t), boil);
  };
}
