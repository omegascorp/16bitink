import { pt } from '../../../src/art/kit';
import { INK, PAPER, RED } from '../../../src/art/palette';
import type { Pt } from '../../../src/art/pen';
import { DEER_HEAD, makeDeer, type DeerSprites } from './deerArt';
import { EAR_ROOT, ELEPHANT_EYE, LEG_H, LEG_TOP, makeElephant, TRUNK_ROOT } from './elephantArt';
import {
  DEER_LEGS, ELEPHANT, ELEPHANT_LEGS, elephantAt, elephantIn, HIP_Y, hopeAlpha, hopeAt, jointsOf, sitDustAt, snapBurstAt, THIN, thinAt, thinLit, thinSlide, thumpDustAt,
} from './falls';
import { drawBurstLines, drawDizzy, drawDust, drawHighlight, drawPart, penFor } from './marks';
import { wrap } from './story';

type SceneDraw = (ctx: CanvasRenderingContext2D, t: number, boil: number) => void;

/** "Thin legs would just… snap.": the slender deer on the heavy world, its legs giving, sitting down hard on its belly, stunned. */
export function makeThinScene(): SceneDraw {
  const s = makeDeer(4.5);
  const legSprites = (front: boolean, far: boolean): { thigh: DeerSprites['thigh'][keyof DeerSprites['thigh']]; shin: DeerSprites['shin']['near'] } => ({
    thigh: s.thigh[`${front ? 'front' : 'rear'}${far ? 'Far' : 'Near'}`],
    shin: s.shin[far ? 'far' : 'near'],
  });
  return (ctx, t, boil) => {
    const p = thinAt(t);
    const k = THIN.scale;
    const x = THIN.x + thinSlide(t);
    const on = (ux: number, uy: number): Pt => pt(x + ux * k, THIN.ground + uy * k);
    const legs = DEER_LEGS.map((leg, i) => {
      const hip = on(leg.x, HIP_Y + p.drop);
      const j = jointsOf(p.legs[i]!);
      return { leg, hip, knee: pt(hip.x + j.knee.x * k, hip.y + j.knee.y * k), hoof: pt(hip.x + j.hoof.x * k, hip.y + j.hoof.y * k), bend: p.legs[i]! };
    });
    const drawLeg = (l: (typeof legs)[number]): void => {
      const sp = legSprites(l.leg.front, l.leg.far);
      drawPart(ctx, sp.shin, boil, l.knee.x, l.knee.y, k, -l.bend.shin);
      drawPart(ctx, sp.thigh, boil, l.hip.x, l.hip.y, k, -l.bend.thigh);
    };
    legs.filter((l) => l.leg.far).forEach(drawLeg);
    ctx.save();
    const c = on(0, -80 + p.drop);
    ctx.translate(c.x, c.y);
    ctx.rotate(p.tilt);
    ctx.translate(-c.x, -c.y);
    drawPart(ctx, s.body, boil, x, THIN.ground + p.drop * k, k);
    ctx.restore();
    legs.filter((l) => !l.leg.far).forEach(drawLeg);
    const lit = thinLit(t);
    for (const l of legs) drawHighlight(ctx, [l.hip, l.knee, l.hoof], 22, lit * (l.leg.far ? 0.6 : 1));
    for (const l of legs) drawBurstLines(ctx, l.knee.x, l.knee.y, snapBurstAt(t), 60, RED, boil, 7, l.leg.x);
    drawDust(ctx, x, THIN.ground, sitDustAt(t), 0.45, boil, 4);
    const head = on(DEER_HEAD.x, DEER_HEAD.y + p.drop - 22);
    drawDizzy(ctx, head.x - 10, head.y, wrap(t), p.dizzy, boil);
  };
}

/** "It's why elephants can't jump.": it crouches, pushes up onto its toes, and its feet never leave the ground. */
export function makeElephantScene(): SceneDraw {
  const s = makeElephant(4);
  return (ctx, t, boil) => {
    const p = elephantAt(t);
    const k = ELEPHANT.scale;
    const x = ELEPHANT.x;
    const g = ELEPHANT.ground;
    const lift = p.rise * k;
    const stretch = (LEG_H + p.rise) / LEG_H;
    const appear = elephantIn(t);
    ctx.save();
    ctx.globalAlpha = appear;
    drawHope(ctx, x, g, k, t, boil);
    for (const far of [true, false]) {
      for (const leg of ELEPHANT_LEGS.filter((l) => l.far === far)) drawPart(ctx, far ? s.far : s.near, boil, x + leg.x * k, g + (LEG_TOP - p.rise) * k + (far ? -4 : 0), k, 0, stretch);
    }
    drawPart(ctx, s.body, boil, x, g - lift, k);
    drawPart(ctx, s.ear, boil, x + EAR_ROOT.x * k, g + EAR_ROOT.y * k - lift, k, p.ear);
    drawPart(ctx, s.trunk, boil, x + TRUNK_ROOT.x * k, g + TRUNK_ROOT.y * k - lift, k, -0.7 * p.trunk + 0.12 * p.sad);
    drawPart(ctx, s.head, boil, x, g - lift, k);
    drawLid(ctx, pt(x + ELEPHANT_EYE.x * k, g + ELEPHANT_EYE.y * k - lift), p.sad, boil);
    drawDust(ctx, x, g, thumpDustAt(t), 0.35, boil, 5);
    ctx.restore();
  };
}

/** The hop it hoped for: a dotted arc up over it, drawn out as it pushes. */
function drawHope(ctx: CanvasRenderingContext2D, x: number, g: number, k: number, t: number, boil: number): void {
  const u = hopeAt(t);
  const a = hopeAlpha(t);
  if (u <= 0 || a <= 0) return;
  const from = pt(x + 60 * k, g - 150 * k);
  const pts: Pt[] = [];
  for (let i = 0; i <= 24 * u; i++) {
    const v = i / 24;
    pts.push(pt(from.x + v * 70 * k, from.y - Math.sin(v * Math.PI) * 36 * k));
  }
  const pen = penFor(ctx, 51, boil);
  pts.forEach((q, i) => {
    if (i % 2 === 0) pen.dot(q.x, q.y, 7, PAPER, a);
  });
  const end = pts[pts.length - 1]!;
  if (u >= 1) {
    ctx.save();
    ctx.globalAlpha *= a;
    ctx.fillStyle = PAPER;
    ctx.font = '700 110px Caveat';
    ctx.textAlign = 'center';
    ctx.fillText('?', end.x + 34, end.y + 10);
    ctx.restore();
  }
}

/** A heavy, sad eyelid over the elephant's eye. */
function drawLid(ctx: CanvasRenderingContext2D, eye: Pt, sad: number, boil: number): void {
  if (sad <= 0) return;
  const pen = penFor(ctx, 57, boil);
  pen.stroke([pt(eye.x - 16, eye.y - 6 + 6 * sad), pt(eye.x, eye.y - 9 + 8 * sad), pt(eye.x + 16, eye.y - 4 + 2 * sad)], 4, INK, sad);
  pen.stroke([pt(eye.x - 12, eye.y - 16), pt(eye.x + 6, eye.y - 18 + 6 * sad), pt(eye.x + 16, eye.y - 12 + 6 * sad)], 3, INK, 0.8 * sad);
}
