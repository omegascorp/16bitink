import { PAPER, Pen } from '../../../src/art/pen';
import { BOIL_FRAMES } from '../../../src/art/textures';
import { CAPTION_FONT, drawTextLine, type TextInk } from '../captions';
import { clamp01, ramp, VIDEO, type Short } from '../short';
import { renderSheepsheadAudio } from './audio';
import { drawSheepshead, enterFish, fishPoint, MOUTH } from './fish';
import {
  BARNACLE_CRUMBS, CRAB_CRUMBS, drawCap, drawClump, drawCrab, drawCrumbs, drawHeart, drawMirror, drawOyster, drawPeople, drawPlacard, drawPushHand,
  drawSparkle, OYSTER_CRUMBS,
} from './props';
import { drawBars, drawFill, drawGrade, drawLamp, drawMugWall, drawPier, drawPiling, drawSilt, drawVignette, drawWater, INK_BG } from './scene';
import { CAPTION_SIZE, CAPTION_Y, molarsSpot, sheepsheadSpot } from './labels';
import { captionAt } from './script';
import {
  BARNACLE_BITES, BARNACLES, barsAt, boilAt, cameraAt, capAt, CRAB, CRAB_BITE, fishAt, flashAt, FOCUS, gradeAt, handAt, HEART_LIFE, HEARTS, lampAt,
  LOOP_S, mirrorAt, mugAt, OYSTER, OYSTER_BITE, peopleAt, shakeAt, sparkleAt, toScreen, type View, wrap,
} from './story';

/** Draws the "this fish has HUMAN teeth" short (story.ts has the choreography). */

const CAPTION_MAX_W = 980;
const SPOKEN = '#f5c84a';
const PAPER_ON_INK: TextInk = { fill: PAPER, halo: INK_BG };
const CHALK: TextInk = { fill: '#eef3e8', halo: INK_BG };

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

/** Into world px through the view (and the jolt). */
function enterWorld(ctx: CanvasRenderingContext2D, v: View): void {
  ctx.translate(FOCUS.x, FOCUS.y);
  ctx.scale(v.zoom, v.zoom);
  ctx.translate(-v.x, -v.y);
}

export function createSheepshead(ctx: CanvasRenderingContext2D): Short {
  const draw = (seconds: number): void => {
    const t = wrap(seconds);
    const boil = boilAt(t) % BOIL_FRAMES;
    const v = cameraAt(t);
    const pose = fishAt(t);
    const jolt = shakeAt(t);
    const mouth = toScreen(v, { x: pose.x, y: pose.y });
    const at = (p: { x: number; y: number }): { x: number; y: number } => toScreen(v, fishPoint(pose, p));

    ctx.save();
    ctx.translate(jolt.x, jolt.y);
    drawWater(ctx, v, t);

    // The pier, the piling and what's on it.
    ctx.save();
    enterWorld(ctx, v);
    drawPier(ctx, v, boil, t);
    drawPiling(ctx, boil, t, { x: BARNACLES.x, y: BARNACLES.y, r: 110, gone: 1 });
    drawCrab(ctx, CRAB, boil, ramp(t, CRAB_BITE - 0.04, CRAB_BITE + 0.04), t);
    drawOyster(ctx, OYSTER, boil, ramp(t, OYSTER_BITE - 0.04, OYSTER_BITE + 0.04));
    drawClump(ctx, BARNACLES, boil, [ramp(t, BARNACLE_BITES[0] - 0.04, BARNACLE_BITES[0] + 0.04), ramp(t, BARNACLE_BITES[1] - 0.04, BARNACLE_BITES[1] + 0.04)]);
    ctx.restore();

    drawMugWall(ctx, mugAt(t), boil);
    drawSilt(ctx, v, t);

    // The fish, with its convict's cap and board.
    ctx.save();
    enterWorld(ctx, v);
    drawSheepshead(ctx, pose, { boil, zoom: v.zoom });
    const cap = capAt(t);
    if (cap > 0) {
      ctx.save();
      enterFish(ctx, pose);
      const pen = new Pen(ctx, 2100 + boil * 7, 1.2);
      drawPlacard(pen, cap);
      drawCap(pen, cap);
      ctx.restore();
    }
    // Crumbs out of the mouth on each crunch.
    drawCrumbs(ctx, { x: CRAB.x + 70, y: CRAB.y }, t - CRAB_BITE, 11, CRAB_CRUMBS, boil);
    drawCrumbs(ctx, { x: OYSTER.x + 70, y: OYSTER.y }, t - OYSTER_BITE, 23, OYSTER_CRUMBS, boil);
    BARNACLE_BITES.forEach((b, i) => drawCrumbs(ctx, { x: BARNACLES.x + 70, y: BARNACLES.y - 40 + i * 70 }, t - b, 37 + i * 4, BARNACLE_CRUMBS, boil));
    ctx.restore();

    // The dentist: the lamp, the mirror, the sparkle; the people's grins.
    drawLamp(ctx, mouth, lampAt(t));
    drawMirror(ctx, at({ x: MOUTH.x - 92, y: MOUTH.y + 100 }), mirrorAt(t), v.zoom, boil);
    drawSparkle(ctx, at({ x: MOUTH.x + 22, y: MOUTH.y - 22 }), sparkleAt(t), 140);
    drawSparkle(ctx, at({ x: MOUTH.x - 50, y: MOUTH.y - 8 }), sparkleAt(t - 0.22) * 0.7, 90);
    drawPeople(ctx, peopleAt(t), boil);

    // The kiss: heart bubbles, the hand.
    HEARTS.forEach((h) => {
      const age = t - h.at;
      if (age < 0 || age > HEART_LIFE + 0.25) return;
      const p = Math.min(1, age / HEART_LIFE);
      const pos = { x: mouth.x - 70 - 230 * p + h.drift * 160 * p + 22 * Math.sin(age * 6 + h.phase), y: mouth.y - 60 - 560 * p };
      drawHeart(ctx, pos, 72 * h.size * (0.5 + 0.5 * clamp01(age * 5)), clamp01((age - HEART_LIFE) / 0.25), 1);
    });
    const hand = handAt(t);
    drawPushHand(ctx, { x: mouth.x - 70 * v.zoom - 120, y: mouth.y + 30 }, hand, boil);
    ctx.restore();

    drawBars(ctx, barsAt(t), boil);
    drawFill(ctx, '#ffffff', 0.85 * flashAt(t));
    drawGrade(ctx, gradeAt(t));
    drawVignette(ctx);

    // Labels: never in the hook.
    for (const [text, spot] of [['molars', molarsSpot(t)], ['sheepshead', sheepsheadSpot(t)]] as const) {
      drawTextLine(ctx, text, spot.x, spot.y, spot.size, 700, spot.shown, CHALK);
    }
    drawCaption(ctx, t);
  };

  return { loopSeconds: LOOP_S, draw, audio: renderSheepsheadAudio };
}
