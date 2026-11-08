import { makeCanvas, Pen, type Pt } from '../../../src/art/pen';
import { BOIL_FRAMES } from '../../../src/art/textures';
import { CAPTION_FONT, drawTextLine, type TextInk } from '../captions';
import { drawPouring, drawSplashRing, drawSpray, drawStopwatch } from '../kayak/effects';
import { onWhale } from '../kayak/story';
import { drawWhaleBack, drawWhaleFront } from '../kayak/whale';
import { VIDEO, window01, type Short } from '../short';
import { renderDiverAudio } from './audio';
import { drawBubbles, drawShoal } from './critters';
import { drawDiver, regulatorOf } from './diver';
import { drawInside } from './inside';
import { drawBehind, drawBoat, drawWaterFront, INK_BG, makeBackdrop, type Backdrop } from './scene';
import { captionAt, TEXT } from './script';
import {
  A_AT, blackoutAt, boilAt, cameraAt, clockShownAt, clockValueAt, coldAt, depthAt, diverAt, DIVER_SCALE, dipAt, type DiverPose, FOCUS, familyBubbleAt, familyShownAt, insideShowAt, LAND, LAND_AT, LOOP_S,
  placeAt, questionAt, RISE_AT, sceneAt, sharkAt, SPAT_AT, SURFACED_AT, toScreen, warmAt, whaleAt, wrap, yearAt, type View,
} from './story';
import { drawCloud, drawFamily, drawShark, drawSparkles } from './thoughts';

/** Draws the "this diver spent forty seconds inside a whale's mouth" short (story.ts has the choreography). */

const CAPTION_SIZE = TEXT.caption.size;
const CAPTION_MAX_W = 980;
const SPOKEN = '#f5c84a';
const PAPER_ON_INK: TextInk = { fill: '#f4eddc', halo: INK_BG };
const GOLD_ON_INK: TextInk = { fill: SPOKEN, halo: INK_BG };

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
    const colours: TextInk = i === now.word ? GOLD_ON_INK : PAPER_ON_INK;
    drawTextLine(ctx, w, x + (natural[i]! * k) / 2, TEXT.caption.y, CAPTION_SIZE * k, 700, i <= now.word ? 1 : 0.55, colours);
    x += (natural[i]! + space) * k;
  });
}

function drawFill(ctx: CanvasRenderingContext2D, colour: string, alpha: number): void {
  if (alpha <= 0.005) return;
  ctx.save();
  ctx.globalAlpha = Math.min(1, alpha);
  ctx.fillStyle = colour;
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
  ctx.restore();
}

function wash(ctx: CanvasRenderingContext2D, mode: GlobalCompositeOperation, colour: string, alpha: number): void {
  if (alpha <= 0.005) return;
  ctx.save();
  ctx.globalCompositeOperation = mode;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = colour;
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
  ctx.restore();
}

/** The mood of the beat over the whole picture: cold and deep for the dive, warm and soft for the family. */
function drawGrade(ctx: CanvasRenderingContext2D, t: number): void {
  const cold = coldAt(t);
  const warm = warmAt(t);
  wash(ctx, 'saturation', '#808080', 0.35 * cold);
  wash(ctx, 'multiply', '#7f9fb8', 0.35 * cold);
  wash(ctx, 'soft-light', '#ffc76a', 0.5 * warm);
  wash(ctx, 'screen', '#4a2a10', 0.22 * warm);
  if (warm > 0.01) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    for (let i = 0; i < 5; i++) {
      const spread = 0.2 + i * 0.16;
      const g = ctx.createLinearGradient(-100, -100, 900, 1300);
      g.addColorStop(0, `rgba(255,214,140,${(0.22 * warm).toFixed(3)})`);
      g.addColorStop(1, 'rgba(255,214,140,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(-100, -100);
      ctx.lineTo(1400 * Math.cos(spread) - 100, 1400 * Math.sin(spread) - 100);
      ctx.lineTo(1400 * Math.cos(spread + 0.06) - 100, 1400 * Math.sin(spread + 0.06) - 100);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }
}

function drawVignette(ctx: CanvasRenderingContext2D, strength: number): void {
  const g = ctx.createRadialGradient(VIDEO.width / 2, 800, 380, VIDEO.width / 2, 840, 1250);
  g.addColorStop(0, 'rgba(2,8,7,0)');
  g.addColorStop(1, `rgba(2,8,7,${strength})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
}

/** Everything in the world at time t, through the view v. */
function drawWorld(ctx: CanvasRenderingContext2D, b: Backdrop, t: number, v: View, boil: number): void {
  const u = wrap(t);
  drawBehind(ctx, b, v, t);
  drawBoat(ctx, v, t, boil);
  const whale = whaleAt(t);
  const diver = diverAt(t);
  // Bubbles: from the lips round a diver in the mouth, otherwise from his regulator (once he is under).
  if (diver && whale && diver.inMouth) drawBubbles(ctx, v, onWhale(whale, { x: 225, y: -18 }), t, 1, 560);
  else if (diver && diver.y > 120 && u < LAND_AT) drawBubbles(ctx, v, regulatorOf(diver), t, 1, 480);
  if (whale) {
    const tip = onWhale(whale, { x: 440, y: 0 });
    drawShoal(ctx, v, tip, { x: Math.cos(whale.tilt), y: -Math.sin(whale.tilt) }, t, window01(u, A_AT - 0.2, RISE_AT + 0.2, 0.2), boil);
    inView(ctx, v, () => drawWhaleBack(ctx, whale, boil));
  }
  if (diver?.inMouth) drawDiverAt(ctx, v, diver, boil);
  if (whale) inView(ctx, v, () => drawWhaleFront(ctx, whale, boil));
  if (diver && !diver.inMouth) drawDiverAt(ctx, v, diver, boil);
  drawWaterFront(ctx, v, t);
  if (whale) {
    drawPouring(ctx, v, whale, window01(u, SURFACED_AT + 0.35, SPAT_AT + 0.9, 0.2) * 0.9, t);
    drawSpray(ctx, v, { x: whale.x + 150, y: 0 }, u - (SURFACED_AT + 0.35), 1.3);
    drawSpray(ctx, v, onWhale(whale, { x: 420, y: 10 }), u - SPAT_AT, 0.8);
  }
  drawSplashRing(ctx, v, { x: LAND.x, y: 0 }, u - LAND_AT, 220);
}

/** Draws in world px through the view's camera. */
function inView(ctx: CanvasRenderingContext2D, v: View, draw: () => void): void {
  ctx.save();
  ctx.translate(FOCUS.x, FOCUS.y);
  ctx.scale(v.zoom, v.zoom);
  ctx.translate(-v.x, -v.y);
  draw();
  ctx.restore();
}

const drawDiverAt = (ctx: CanvasRenderingContext2D, v: View, d: DiverPose, boil: number): void => inView(ctx, v, () => drawDiver(ctx, d, boil));

/** The place, depth and clock labels. */
function drawLabels(ctx: CanvasRenderingContext2D, t: number, boil: number): void {
  const place = placeAt(t);
  drawTextLine(ctx, 'Cape Cod', VIDEO.width / 2, TEXT.place.y, TEXT.place.size, 700, place, PAPER_ON_INK);
  drawTextLine(ctx, '2021', VIDEO.width / 2, TEXT.year.y, TEXT.year.size, 700, yearAt(t), GOLD_ON_INK);
  const depth = depthAt(t);
  drawTextLine(ctx, '45 ft', 850, TEXT.depthFt.y, TEXT.depthFt.size, 700, depth, PAPER_ON_INK);
  drawTextLine(ctx, '14 m', 850, TEXT.depthM.y, TEXT.depthM.size, 700, depth, GOLD_ON_INK);
  const shown = clockShownAt(t);
  if (shown > 0.01) {
    const value = clockValueAt(t);
    drawStopwatch(ctx, { x: 880, y: 390 }, 64, shown, (value * 12) / 40, boil);
    const text = `0:${String(Math.floor(value)).padStart(2, '0')}`;
    drawTextLine(ctx, text, 880, TEXT.clock.y, TEXT.clock.size, 700, shown, PAPER_ON_INK);
  }
}

/** The thought bubbles: the shark and the "?", then his family. */
function drawThoughts(ctx: CanvasRenderingContext2D, v: View, t: number, boil: number): void {
  const pen = new Pen(ctx, 6200 + boil * 977, 1.1);
  const shark = sharkAt(t);
  if (shark > 0.01) {
    const c: Pt = { x: 330, y: 560 };
    const k = drawCloud(ctx, pen, c, 250, 175, { x: 520, y: 1150 }, shark);
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.scale(k, k);
    ctx.translate(-c.x, -c.y);
    drawShark(ctx, pen, c, 330);
    ctx.restore();
  }
  const q = questionAt(t);
  if (q > 0.01) drawTextLine(ctx, '?', 470, TEXT.question.y, TEXT.question.size * (0.6 + 0.4 * q), 700, Math.min(1, q * 2), GOLD_ON_INK);
  const fam = familyBubbleAt(t);
  const diver = diverAt(t);
  if (fam > 0.01 && diver) {
    const head = toScreen(v, { x: diver.x, y: diver.y - 100 * DIVER_SCALE });
    const c: Pt = { x: 690, y: 560 };
    const k = drawCloud(ctx, pen, c, 290, 205, head, fam);
    const shown = familyShownAt(t);
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.scale(k, k);
    ctx.translate(-c.x, -c.y);
    ctx.globalAlpha = shown;
    drawFamily(ctx, pen, c, 270);
    ctx.restore();
    drawSparkles(ctx, c, 300, t, shown);
  }
}

export function createDiver(ctx: CanvasRenderingContext2D): Short {
  const backdrop = makeBackdrop();
  const shade = makeCanvas(VIDEO.width, VIDEO.height);

  const draw = (seconds: number): void => {
    const t = wrap(seconds);
    const boil = boilAt(t) % BOIL_FRAMES;
    const v = cameraAt(t);
    const inside = insideShowAt(t);
    if (inside < 1) {
      drawWorld(ctx, backdrop, t, v, boil);
      drawGrade(ctx, t);
      drawVignette(ctx, sceneAt(t) === 'hook' || sceneAt(t) === 'return' ? 0.6 : 0.45);
    }
    drawFill(ctx, '#020807', Math.max(blackoutAt(t) * (1 - inside), dipAt(t)));
    drawInside(ctx, shade.ctx, t, inside, boil);
    drawLabels(ctx, t, boil);
    drawThoughts(ctx, v, t, boil);
    drawCaption(ctx, t);
  };

  return { loopSeconds: LOOP_S, draw, audio: renderDiverAudio };
}
