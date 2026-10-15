import { BOIL_FRAMES } from '../../../src/art/textures';
import { CAPTION_FONT, drawTextLine, type TextInk } from '../captions';
import { lerp, type Short, VIDEO } from '../short';
import { makeSprite } from '../sprites';
import { renderTripodAudio } from './audio';
import { bodyPoint, type Fish, mouthOf, pectoralAt, type Pt, STILTS } from './body';
import { drawFarStilt, drawFishAt, drawNearStilts, drawPectorals, makeTripodSprite, stiltShape } from './fish';
import {
  drawBar, drawCallout, drawDashedArrow, drawDepth, drawLens, drawTag, LENS, PAPER_ON_INK, write, YELLOW_ON_INK,
} from './marks';
import {
  barsAt, bodyBarAt, captionAt, copepodLabel, currentAt, currentLabel, depthAt, finRaysLabel, foodArrowAt, foodLabel, frontFinsLabel, handsAt, kmLabel,
  lensAt, metresAt, mudLabel, nameLabel, raySwingAt, rayTraceAt, riseAt, stiltsLabel, tagAt,
} from './notes';
import { CHALK, drawCopepod, drawCurrent, drawPuff, drawRiseLines, drawSnap, drawSnow, makeBackdrop, mudSurface, NIGHT, SPOKEN } from './scene';
import {
  boilAt, DRIFTERS, drifterAt, finsForward, LOOP_S, mealAt, PUFF_S, PUFFS, rattailAt, snapAt, STANDING, stiltsDown, stiffAt, tripodAt, wiggleAt,
} from './story';

/** Draws the "this fish stands on stilts" short (story.ts and notes.ts have the choreography). */

const CAPTION_Y = 1215;
const CAPTION_SIZE = 96;
/** Captions never wider than this: a long line shrinks to fit. */
const CAPTION_MAX_W = 980;
const LABEL_SIZE = 62;
/** A copepod's body length on screen, px. */
const COPEPOD_PX = 30;
/** The measuring bars, over the fish once the ray's is swung up. */
const RAY_BAR_Y = 350;
const BODY_BAR_Y = 412;
/** Labels between the stilts, under the body. */
const UNDER = { x: 650, y: 1000 } as const;

/** The spoken line, word by word, the word being said in yellow. */
function drawCaption(ctx: CanvasRenderingContext2D, t: number): void {
  const now = captionAt(t);
  if (!now) return;
  const words = now.line.words.map((w) => w.text);
  ctx.save();
  ctx.font = `700 ${CAPTION_SIZE}px ${CAPTION_FONT}`;
  const space = ctx.measureText(' ').width;
  const natural = words.map((w) => ctx.measureText(w).width);
  ctx.restore();
  const naturalTotal = natural.reduce((s, w) => s + w, 0) + space * (words.length - 1);
  const k = Math.min(1, CAPTION_MAX_W / naturalTotal);
  let x = VIDEO.width / 2 - (naturalTotal * k) / 2;
  words.forEach((w, i) => {
    const colours: TextInk = i === now.word ? YELLOW_ON_INK : PAPER_ON_INK;
    drawTextLine(ctx, w, x + (natural[i]! * k) / 2, CAPTION_Y, CAPTION_SIZE * k, 700, i <= now.word ? 1 : 0.55, colours);
    x += (natural[i]! + space) * k;
  });
}

/** A point `u` of the way along a stilt, pushed `off` px out to its front. */
function alongStilt(i: number, f: Fish, down: number, u: number, off: number): Pt {
  const s = stiltShape(STILTS[i]!, f, down);
  const p = { x: lerp(s.root.x, s.foot.x, u), y: lerp(s.root.y, s.foot.y, u) };
  return { x: p.x + off, y: p.y };
}

/** The front ray's length traced beside it, then swung up over the body, and the body's own length under it: the ray is longer. */
function drawMeasure(ctx: CanvasRenderingContext2D, t: number): void {
  const show = barsAt(t);
  if (show <= 0) return;
  const s = stiltShape(STILTS[0]!, STANDING, 1);
  const len = STILTS[0]!.len;
  const dir = Math.atan2(s.foot.y - s.root.y, s.foot.x - s.root.x);
  // Beside the ray, out to its front.
  const onRay = { x: s.root.x + Math.cos(dir + Math.PI / 2) * 40, y: s.root.y + Math.sin(dir + Math.PI / 2) * 40 };
  const nose = bodyPoint(STANDING, 0, 0);
  const tail = bodyPoint(STANDING, 1, 0);
  const swing = raySwingAt(t);
  const start = { x: lerp(onRay.x, nose.x, swing), y: lerp(onRay.y, RAY_BAR_Y, swing) };
  const angle = lerp(dir, 0, swing);
  const reach = len * rayTraceAt(t);
  drawBar(ctx, start, { x: start.x + Math.cos(angle) * reach, y: start.y + Math.sin(angle) * reach }, SPOKEN, show);
  const body = bodyBarAt(t);
  if (body > 0) drawBar(ctx, { x: nose.x, y: BODY_BAR_Y }, { x: lerp(nose.x, tail.x, body), y: BODY_BAR_Y }, CHALK, show);
  write(ctx, 'fin ray', nose.x - 95, RAY_BAR_Y + 18, 54, show * Math.max(0, swing * 2 - 1), YELLOW_ON_INK);
  write(ctx, 'body', nose.x - 80, BODY_BAR_Y + 18, 54, show * body);
}

export function createTripod(ctx: CanvasRenderingContext2D): Short {
  const backdrop = makeBackdrop();
  const tripod = makeTripodSprite(5);
  const rattail = makeSprite('rattail', 3);

  const draw = (seconds: number): void => {
    const t = ((seconds % LOOP_S) + LOOP_S) % LOOP_S;
    const boil = boilAt(t) % BOIL_FRAMES;
    const f = tripodAt(t);
    const down = stiltsDown(t);
    const flash = stiffAt(t);

    ctx.drawImage(backdrop, 0, 0);
    drawSnow(ctx, t);
    DRIFTERS.forEach((_, i) => {
      const d = drifterAt(i, t);
      drawCopepod(ctx, d, COPEPOD_PX * d.size, d.heading, t, NIGHT, 0.75);
    });
    const rat = rattailAt(t);
    if (rat) drawFishAt(ctx, rattail, 'rattail', rat, boil, { alpha: 0.75 });
    for (const p of PUFFS) drawPuff(ctx, p.x, p.spread, (t - p.at) / PUFF_S);

    // The meals go in behind its head.
    for (const id of ['a', 'b'] as const) {
      const m = mealAt(id, t);
      if (m) drawCopepod(ctx, m, COPEPOD_PX * m.size, m.heading, t, NIGHT);
    }
    drawRiseLines(ctx, bodyPoint(f, 0.5, 1), 300, riseAt(t), t);
    drawFarStilt(ctx, f, down, flash);
    drawNearStilts(ctx, f, down, flash);
    drawFishAt(ctx, tripod, 'tripodfish', f, boil, { jaw: f.jaw });
    drawPectorals(ctx, f, finsForward(t), (i) => wiggleAt(i, t), handsAt(t), t);
    drawSnap(ctx, mouthOf(f), f.face, 46, snapAt(t));
    drawCurrent(ctx, t, currentAt(t), bodyPoint(f, 0, 0).x - 30);

    // Labels.
    const stilts = stiltsLabel(t);
    if (stilts > 0) drawCallout(ctx, 'stilts', UNDER, [alongStilt(0, f, down, 0.62, 0), alongStilt(2, f, down, 0.62, 0)], stilts, 72);
    const top = bodyPoint(f, 0.4, -1);
    drawCallout(ctx, 'tripodfish', { x: f.x, y: top.y - 70 }, [], nameLabel(t), LABEL_SIZE);
    drawCallout(ctx, 'mud', { x: 180, y: 1010 }, [{ x: 210, y: mudSurface(210) + 6 }], mudLabel(t), LABEL_SIZE);
    drawDepth(ctx, depthAt(t), metresAt(t), kmLabel(t));
    [alongStilt(0, f, down, 0.55, -105), alongStilt(1, f, down, 0.55, 52), alongStilt(2, f, down, 0.55, 56)].forEach((p, i) => drawTag(ctx, i + 1, p, tagAt(i, t)));
    write(ctx, 'fin rays', UNDER.x, UNDER.y, LABEL_SIZE, finRaysLabel(t));
    drawMeasure(ctx, t);
    write(ctx, 'current', 150, 400, LABEL_SIZE, currentLabel(t));
    const fin = pectoralAt(f, 2, finsForward(t), wiggleAt(2, t));
    drawCallout(ctx, 'front fins', { x: 730, y: 330 }, [{ x: lerp(fin.root.x, fin.tip.x, 0.55), y: lerp(fin.root.y, fin.tip.y, 0.55) }], frontFinsLabel(t), LABEL_SIZE);
    const meal = mealAt('b', t);
    if (meal) {
      drawLens(ctx, meal, lensAt(t), t);
      write(ctx, 'copepod', LENS.x - LENS.r - 120, LENS.y - 40, LABEL_SIZE, copepodLabel(t), YELLOW_ON_INK);
      drawDashedArrow(ctx, meal, mouthOf(f), foodArrowAt(t), 40);
      write(ctx, 'food', meal.x - 90, meal.y + 120, LABEL_SIZE, foodLabel(t), YELLOW_ON_INK);
    }
    drawCaption(ctx, t);
  };

  return { loopSeconds: LOOP_S, draw, audio: renderTripodAudio };
}
