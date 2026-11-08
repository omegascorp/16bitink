import { BOIL_FRAMES } from '../../../src/art/textures';
import { makePaper } from '../backdrop';
import { CAPTION_FONT, drawTextLine, INK_ON_PAPER, type TextInk } from '../captions';
import { VIDEO, type Short } from '../short';
import { renderCookiecutterAudio } from './audio';
import { drawBlueprint } from './blueprint';
import { drawCookieInset, drawPop, drawSizeBar, drawSparkle, drawSuction, SPOKEN } from './effects';
import { drawAlarmMarks, drawHarbourSub, drawNearWater, drawPier, drawSailor, drawSkyAndShore } from './harbour';
import { drawCloseRubber, drawDimple, drawHaze, drawPerfectRing, drawSubmarine } from './hull';
import { captionAt, TEXT } from './script';
import { drawShark, drawSharkGlow, eyeOf } from './shark';
import {
  alarmAt, alarmMarksAt, aloneShark, backAt, backShark, blueprintZoomAt, boilAt, burstAt, CONTACT, CUT, CUTTING_AT, dimAt, drillHoleAt, drillShakeAt, drillShark,
  drillZoomAt, FRESH_HOLE, DIMPLE, sealedAt, freshHoleAt, harbourCamAt, harbourShakeAt, HOLES_AT, hookShark, hullCamAt, insetAt, LOOP_S, navyLabelAt, OLD_HOLES, pointAt, questionAt,
  ringAt, sceneAt, settleAt, sizeBarAt, sketchAt, smugShark, sparkleAt, stampAt, stampShakeAt, subAt, suctionAt, type View, whiskAt, wrap,
} from './story';
import { ALONE_WASH, drawFill, drawRays, drawSnow, drawVignette, drawWash, DRILL_WASH, HULL_WASH, SMUG_WASH } from './water';

/** Draws the "this tiny shark bites holes in submarines" short (story.ts has the choreography). */

const INK_BG = '#04090f';
const CAPTION_Y = TEXT.caption.y;
const CAPTION_SIZE = TEXT.caption.size;
/** Captions never wider than this: a long line shrinks to fit. */
const CAPTION_MAX_W = 980;
const PAPER_ON_INK: TextInk = { fill: '#f4eddc', halo: INK_BG };

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
    const colours: TextInk = i === now.word ? { fill: SPOKEN, halo: INK_BG } : PAPER_ON_INK;
    drawTextLine(ctx, w, x + (natural[i]! * k) / 2, CAPTION_Y, CAPTION_SIZE * k, 700, i <= now.word ? 1 : 0.55, colours);
    x += (natural[i]! + space) * k;
  });
}

/** Into a camera's world: `v` centred on screen. */
function enterView(ctx: CanvasRenderingContext2D, v: View): void {
  ctx.translate(VIDEO.width / 2, VIDEO.height / 2);
  ctx.rotate(v.angle);
  ctx.scale(v.zoom, v.zoom);
  ctx.translate(-v.x, -v.y);
}

/** Zoom about a screen point. */
function zoomAbout(ctx: CanvasRenderingContext2D, x: number, y: number, z: number): void {
  ctx.translate(x, y);
  ctx.scale(z, z);
  ctx.translate(-x, -y);
}

const SAILORS = [
  { x: 82, h: 172, seed: 1 },
  { x: 182, h: 164, seed: 2 },
  { x: 280, h: 180, seed: 3 },
] as const;

export function createCookiecutter(ctx: CanvasRenderingContext2D): Short {
  const paper = makePaper();

  /** The hook and the way back: the shark on the submarine's rubber bow, the smug scene fading out over it on "So yes,". */
  const drawHull = (t: number, boil: number): void => {
    const u = wrap(t);
    const back = u >= CUT.back;
    const v = hullCamAt(t);
    drawWash(ctx, paper, HULL_WASH);
    drawRays(ctx, HULL_WASH, t);
    ctx.save();
    enterView(ctx, v);
    const holes = freshHoleAt(t) ? [...OLD_HOLES, FRESH_HOLE] : OLD_HOLES;
    drawSubmarine(ctx, boil, v.zoom, holes);
    drawDimple(ctx, DIMPLE, sealedAt(t));
    ctx.restore();
    drawHaze(ctx);
    drawSnow(ctx, HULL_WASH, t);
    if (back) {
      const veil = backAt(t);
      ctx.save();
      ctx.globalAlpha = veil;
      drawWash(ctx, paper, SMUG_WASH);
      drawRays(ctx, SMUG_WASH, t);
      ctx.restore();
    }
    ctx.save();
    enterView(ctx, v);
    drawShark(ctx, back ? backShark(t) : hookShark(t), boil);
    drawPop(ctx, FRESH_HOLE, 70, (u - HOLES_AT - 0.04) / 0.3);
    ctx.restore();
    drawVignette(ctx, 0.55);
  };

  /** "Just twenty inches long, with a belly that GLOWS." */
  const drawAlone = (t: number, boil: number): void => {
    drawWash(ctx, paper, ALONE_WASH);
    drawRays(ctx, ALONE_WASH, t);
    drawSnow(ctx, ALONE_WASH, t);
    const p = aloneShark(t);
    drawShark(ctx, p, boil);
    const dim = dimAt(t);
    drawVignette(ctx, 0.45);
    drawFill(ctx, '#010309', 0.86 * dim);
    drawSharkGlow(ctx, p, dim);
    drawSizeBar(ctx, p.nose.x - p.len, p.nose.x, p.nose.y + TEXT.sizeBar.below, '20 in (50 cm)', sizeBarAt(t), INK_BG);
  };

  /** "It latches on with suction lips… then SPINS, cutting out a perfect circle." */
  const drawDrill = (t: number, boil: number): void => {
    drawWash(ctx, paper, DRILL_WASH);
    drawRays(ctx, DRILL_WASH, t, 0.7);
    drawSnow(ctx, DRILL_WASH, t, 0.7);
    const shake = drillShakeAt(t);
    ctx.save();
    ctx.translate(shake.x, shake.y);
    zoomAbout(ctx, CONTACT.x, CONTACT.y, drillZoomAt(t));
    drawCloseRubber(ctx, boil, drillHoleAt(t));
    const ring = ringAt(t);
    drawPerfectRing(ctx, ring.sweep, ring.alpha, SPOKEN);
    drawShark(ctx, drillShark(t), boil);
    drawSuction(ctx, CONTACT, 190, suctionAt(t), t);
    drawPop(ctx, CONTACT, 70, (wrap(t) - CUTTING_AT - 0.16) / 0.3);
    ctx.restore();
    drawVignette(ctx, 0.7);
    drawCookieInset(ctx, { x: 836, y: 500 }, 170, insetAt(t), boil);
  };

  /** "In the seventies, Navy submarines came home BITTEN!" */
  const drawHarbour = (t: number, boil: number): void => {
    const cam = harbourCamAt(t);
    const shake = harbourShakeAt(t);
    const sub = subAt(t);
    ctx.save();
    ctx.translate(shake.x, shake.y);
    zoomAbout(ctx, cam.focus.x, cam.focus.y, cam.zoom);
    drawSkyAndShore(ctx, paper, boil, t);
    drawHarbourSub(ctx, sub, boil);
    drawNearWater(ctx, sub, burstAt(t), boil, t);
    drawPier(ctx, boil);
    for (const s of SAILORS) drawSailor(ctx, s.x, s.h, pointAt(t), s.seed, boil, t);
    drawAlarmMarks(ctx, SAILORS, alarmMarksAt(t));
    ctx.restore();
    drawVignette(ctx, 0.3);
    drawTextLine(ctx, 'US Navy, 1970s', VIDEO.width / 2, TEXT.navy.y, TEXT.navy.size, 700, navyLabelAt(t), INK_ON_PAPER);
  };

  /** "They suspected a secret weapon…", whipped off the screen on "Nope.". */
  const drawSecret = (t: number, boil: number): void => {
    const whisk = whiskAt(t);
    if (whisk >= 1) return;
    const shake = stampShakeAt(t);
    ctx.save();
    ctx.translate(-1400 * whisk * whisk + shake.x, -200 * whisk + shake.y);
    zoomAbout(ctx, 540, 900, blueprintZoomAt(t));
    ctx.rotate(-0.3 * whisk);
    drawBlueprint(ctx, { sketch: sketchAt(t), question: questionAt(t), stamp: stampAt(t), alarm: alarmAt(t) }, boil, t);
    ctx.restore();
  };

  /** "Nope. Just this little guy." */
  const drawSmug = (t: number, boil: number): void => {
    drawWash(ctx, paper, SMUG_WASH);
    drawRays(ctx, SMUG_WASH, t);
    drawSnow(ctx, SMUG_WASH, t);
    const p = smugShark(t);
    drawShark(ctx, p, boil);
    const eye = eyeOf(p);
    drawSparkle(ctx, { x: eye.x + 40, y: eye.y - 46 }, 48, sparkleAt(t));
    drawVignette(ctx, 0.4);
  };

  const draw = (seconds: number): void => {
    const t = wrap(seconds);
    const boil = boilAt(t) % BOIL_FRAMES;
    const scene = sceneAt(t);
    ctx.save();
    zoomAbout(ctx, VIDEO.width / 2, 860, 1 + 0.06 * settleAt(t));
    if (scene === 'hull') drawHull(t, boil);
    else if (scene === 'alone') drawAlone(t, boil);
    else if (scene === 'drill') drawDrill(t, boil);
    else if (scene === 'harbour') drawHarbour(t, boil);
    else if (scene === 'blueprint') drawSecret(t, boil);
    else {
      drawSmug(t, boil);
      drawSecret(t, boil);
    }
    ctx.restore();
    drawCaption(ctx, t);
  };

  return { loopSeconds: LOOP_S, draw, audio: renderCookiecutterAudio };
}
