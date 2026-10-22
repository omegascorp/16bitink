import { makeCanvas } from '../../../src/art/pen';
import { BOIL_FRAMES } from '../../../src/art/textures';
import { CAPTION_FONT, drawTextLine, type TextInk } from '../captions';
import { clamp01, ramp, VIDEO, window01, type Short } from '../short';
import { renderKayakAudio } from './audio';
import { drawAlarm, drawChurn, drawCough, drawJet, drawPouring, drawRewind, drawSplashRing, drawSpray, drawStopwatch } from './effects';
import { drawCutaway } from './gag';
import { drawInside } from './inside';
import { ADRIAN, DELL, drawPaddler, HEAD_SIZE, headOf, phoneOf } from './people';
import { drawPhone } from './phone';
import { drawBehind, drawFill, drawGrade, drawVignette, drawWaterFront, INK_BG, makeBackdrop, type Backdrop } from './scene';
import { captionAt, placeLabel } from './script';
import {
  adrianAt, alarmAt, blackoutAt, boilAt, BURST_S, CAM0, cameraAt, dadAt, flashAt, gradeAt, insideAt, LAND, LAND_AT, LOOP_S, onWhale, phoneRectAt, phoneUpAt,
  recAt, recBlinkAt, replayAt, rewindAt, shakeAt, SHUT_S, SPAT_AT, stopwatchAt, stopwatchHandAt, storyAt, storyRate, toScreen, type View, whaleAt, WIDE_S,
} from './story';
import { drawWhaleBack, drawWhaleFront } from './whale';

/** Draws the "this whale swallowed a kayaker" short (story.ts has the choreography). */

const CAPTION_Y = 1200;
const CAPTION_SIZE = 96;
const CAPTION_MAX_W = 980;
const SPOKEN = '#f5c84a';
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

/** Water pouring off the whale: streaming as it bursts up and gulps, dripping from its held-up head, gushing as it spits. */
const pourAt = (s: number): number =>
  Math.max(ramp(s, BURST_S + 0.1, WIDE_S) * (1 - ramp(s, SHUT_S + 0.8, 7.6)), 0.3 * window01(s, 7.6, SPAT_AT + 0.9, 0.3), window01(s, SPAT_AT, SPAT_AT + 0.9, 0.15));

/** Everything in the world at story time s, through the view v: what the main picture and Dad's phone both show. */
function drawWorld(ctx: CanvasRenderingContext2D, b: Backdrop, s: number, v: View, t: number, boil: number): void {
  drawBehind(ctx, b, v, t);
  ctx.save();
  ctx.translate(540, 800);
  ctx.scale(v.zoom, v.zoom);
  ctx.translate(-v.x, -v.y);
  const whale = whaleAt(s, t);
  const adrian = adrianAt(s, t);
  const dad = dadAt(s, t);
  drawPaddler(ctx, dad, DELL, boil, t, 23);
  drawWhaleBack(ctx, whale, boil);
  const spat = s >= SPAT_AT;
  if (adrian && !spat) drawPaddler(ctx, adrian, ADRIAN, boil, t, 11);
  drawWhaleFront(ctx, whale, boil);
  if (adrian && spat) drawPaddler(ctx, adrian, ADRIAN, boil, t, 11);
  ctx.restore();
  drawCutaway(ctx, v, whale, s, t, boil);
  drawPouring(ctx, v, whale, pourAt(s), t);
  drawWaterFront(ctx, v, t);
  drawChurn(ctx, v, whale, s > BURST_S - 0.1 && s < 16 ? 1 : 0, t, boil);
  drawSpray(ctx, v, { x: whale.x + 120, y: 0 }, s - BURST_S, 1.3);
  drawSpray(ctx, v, onWhale(whale, { x: 400, y: 0 }), s - SPAT_AT, 0.8);
  const mouth = onWhale(whaleAt(SPAT_AT, t), { x: 420, y: 10 });
  const dir = { x: LAND.x - mouth.x, y: LAND.y - 260 - mouth.y };
  const len = Math.hypot(dir.x, dir.y) || 1;
  drawJet(ctx, v, mouth, { x: dir.x / len, y: dir.y / len }, s - SPAT_AT);
  drawSplashRing(ctx, v, LAND, s - LAND_AT, 220);
  if (adrian) {
    const head = toScreen(v, headOf(adrian));
    const r = HEAD_SIZE * v.zoom * adrian.scale;
    drawCough(ctx, { x: head.x + r * 0.4, y: head.y + r * 0.5 }, r * 1.6, s - LAND_AT, boil);
    drawAlarm(ctx, { x: head.x + r * 0.2, y: head.y - r * 1.9 }, alarmAt(s));
  }
  drawVignette(ctx);
}

export function createKayak(ctx: CanvasRenderingContext2D): Short {
  const backdrop = makeBackdrop();
  // Dad's phone's screen: the gulp replayed, drawn full size and laid into the phone.
  const replay = makeCanvas(VIDEO.width, VIDEO.height);

  const draw = (seconds: number): void => {
    const t = ((seconds % LOOP_S) + LOOP_S) % LOOP_S;
    const boil = boilAt(t) % BOIL_FRAMES;
    const s = storyAt(t);
    if (insideAt(t)) drawInside(ctx, t, boil);
    else {
      const v = cameraAt(t);
      const jolt = shakeAt(s, storyRate(t));
      ctx.save();
      ctx.translate(jolt.x, jolt.y);
      drawWorld(ctx, backdrop, s, v, t, boil);
      ctx.restore();
      drawGrade(ctx, gradeAt(t), t);
      drawFill(ctx, '#020607', blackoutAt(t));
      drawFill(ctx, '#f4f1e8', flashAt(t, s));
      drawStopwatch(ctx, { x: 830, y: 470 }, 78, stopwatchAt(s), stopwatchHandAt(s), boil);
      drawTextLine(ctx, 'Chile, 2025', VIDEO.width / 2, 420, 92, 700, placeLabel(t), PAPER_ON_INK);
    }
    if (phoneUpAt(t) > 0) {
      const r = replayAt(t);
      drawWorld(replay.ctx, backdrop, r, CAM0, t, boil);
      drawGrade(replay.ctx, gradeAt(0), t);
      const inHands = toScreen(cameraAt(t), phoneOf(dadAt(s, t)));
      drawPhone(ctx, phoneRectAt(t, inHands), replay.canvas, clamp01(recAt(t)), recBlinkAt(t), 1 + (t - 15.8) * 1.2, boil);
    }
    drawRewind(ctx, rewindAt(t), t);
    drawCaption(ctx, t);
  };

  return { loopSeconds: LOOP_S, draw, audio: renderKayakAudio };
}
