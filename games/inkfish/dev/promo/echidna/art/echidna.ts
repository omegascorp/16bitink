import { makeCanvas, type Pt } from '../../../../src/art/pen';
import { type Placed } from '../../seal/story';
import { screenScale } from '../../seal/art/paint';
import { ECHIDNA_UNITS, FRONT_LEG, HIND_LEG, type Leg, SNOUT_ROOT, SPINES } from './echidnaShape';
import { paintBodyInk, paintClaws, paintCoatEdge, paintEye, paintForm, paintFur, paintLeg, paintSnout, paintSnoutRoot, paintSpine, type SpinePose } from './echidnaPaint';

export { ECHIDNA_UNITS } from './echidnaShape';

/**
 * The short-beaked echidna (Tachyglossus aculeatus), painted in the manner of
 * the seal short's fur seal and the food chain's great white: a low dome of
 * dark brown fur under a coat of thick cream quills with black-brown tips,
 * shingled from the crown back over the rump, each lying back with a shadow
 * under it; a small furry head with a small dark eye; the short, thick,
 * slightly down-curved tube of a snout in bare grey-brown leather (the tell,
 * shown in profile); short furry legs splayed out, broad spade claws on the
 * front feet, the hind feet turned back with long grooming claws.
 *
 * The geometry is in ./echidnaShape.ts, the brushwork in ./echidnaPaint.ts.
 * Each draw paints into a scratch canvas at the size it lands on screen, so
 * the light and shade can be laid over the fur and the spines together, then
 * places it. Own units: 100 long (rump to snout tip about 104), snout to the
 * right (+x), belly down (+y).
 */

export interface EchidnaLook {
  /** Sad: the eye shut, the spines drooped, the head low, 0 .. 1. */
  readonly sad?: number;
  /** Surprised, bristled: the spines stand up, the eye wide, 0 .. 1. */
  readonly bristle?: number;
}

/** Places on the animal, in its own units, for labels and highlights. */
export const ECHIDNA_AT = {
  spines: { x: -10, y: -20 },
  legFront: { x: 21, y: 15 },
  legBack: { x: -31, y: 15 },
  snout: { x: 48, y: 0 },
  eye: { x: 31.2, y: -5.4 },
  middle: { x: 6, y: -6 },
} as const satisfies Record<string, Pt>;

/** The scratch canvas's box, in own units: room for bristled spines and the claws. */
const BOX = { x0: -68, x1: 66, y0: -58, y1: 28 } as const;
const MAX_RES = 14;

let scratch: { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } | null = null;

function scratchFor(res: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const w = Math.ceil((BOX.x1 - BOX.x0) * res);
  const h = Math.ceil((BOX.y1 - BOX.y0) * res);
  if (!scratch || scratch.canvas.width < w || scratch.canvas.height < h) scratch = makeCanvas(Math.max(w, scratch?.canvas.width ?? 0), Math.max(h, scratch?.canvas.height ?? 0));
  const { canvas, ctx } = scratch;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.setTransform(res, 0, 0, res, -BOX.x0 * res, -BOX.y0 * res);
  return scratch;
}

/** A leg turned about its hip (paddling, or splayed limp). */
function legAt(ctx: CanvasRenderingContext2D, leg: Leg, turn: number, drop: number, far: boolean, lw: number, seed: number): void {
  ctx.save();
  ctx.translate(leg.hip.x, leg.hip.y + drop);
  ctx.rotate(turn);
  ctx.translate(-leg.hip.x, -leg.hip.y);
  paintLeg(ctx, leg, far, lw, seed);
  paintClaws(ctx, leg, far, lw);
  ctx.restore();
}

function farLeg(ctx: CanvasRenderingContext2D, leg: Leg, dx: number, turn: number, drop: number, lw: number, seed: number): void {
  ctx.save();
  ctx.translate(dx, -1.2);
  legAt(ctx, leg, turn, drop, true, lw, seed);
  ctx.restore();
}

function paint(ctx: CanvasRenderingContext2D, look: Required<EchidnaLook>, beat: number, boil: number, lw: number): void {
  const { sad, bristle } = look;
  const paddle = sad > 0.5 ? 0 : Math.sin(beat);
  const pose: SpinePose = { lift: bristle, droop: sad, boil };
  // Limp: the legs splayed out flat, the snout resting low.
  const splay = 0.16 * sad;
  // The far legs, behind the body.
  farLeg(ctx, FRONT_LEG, 5, -0.1 * paddle - splay, 0, lw, 71);
  farLeg(ctx, HIND_LEG, -5.5, 0.1 * paddle + splay, 0, lw, 73);
  // The snout, its root under the face's fur.
  ctx.save();
  ctx.translate(SNOUT_ROOT.x, SNOUT_ROOT.y);
  ctx.rotate(0.07 * sad - 0.05 * bristle + 0.015 * Math.sin(beat * 0.5));
  ctx.translate(-SNOUT_ROOT.x, -SNOUT_ROOT.y);
  paintSnout(ctx, lw);
  ctx.restore();
  paintFur(ctx, lw, boil);
  paintBodyInk(ctx, lw);
  paintSnoutRoot(ctx, lw);
  // The near hind leg, its haunch under the rump's quills.
  legAt(ctx, HIND_LEG, -0.12 * paddle + splay, 0, false, lw, 77);
  for (const s of SPINES) paintSpine(ctx, s, pose, lw);
  paintCoatEdge(ctx, lw);
  paintForm(ctx);
  paintEye(ctx, sad, bristle, lw);
  // The near front leg, in front.
  legAt(ctx, FRONT_LEG, 0.12 * paddle - splay, 0, false, lw, 79);
}

/** The echidna in its own units (snout right), placed, turned and mirrored by `p`. */
export function drawEchidna(ctx: CanvasRenderingContext2D, p: Placed, look: EchidnaLook, boil: number): void {
  const k = p.len / ECHIDNA_UNITS;
  const sad = look.sad ?? 0;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.scale(p.face, 1);
  ctx.rotate(p.rot);
  ctx.scale(k, k);
  // Lying limp, the whole animal sits a little lower.
  ctx.translate(0, 1.2 * sad);
  const res = Math.min(MAX_RES, Math.max(0.5, screenScale(ctx)));
  const s = scratchFor(res);
  paint(s.ctx, { sad, bristle: look.bristle ?? 0 }, p.beat, boil, 1 / res);
  ctx.drawImage(s.canvas, 0, 0, Math.ceil((BOX.x1 - BOX.x0) * res), Math.ceil((BOX.y1 - BOX.y0) * res), BOX.x0, BOX.y0, Math.ceil((BOX.x1 - BOX.x0) * res) / res, Math.ceil((BOX.y1 - BOX.y0) * res) / res);
  ctx.restore();
}

/** Where a point in the echidna's own units lands on screen. */
export function onEchidna(p: Placed, local: Pt): Pt {
  const k = p.len / ECHIDNA_UNITS;
  const [c, s] = [Math.cos(p.rot), Math.sin(p.rot)];
  const [lx, ly] = [local.x * k, local.y * k];
  return { x: p.x + p.face * (lx * c - ly * s), y: p.y + lx * s + ly * c };
}
