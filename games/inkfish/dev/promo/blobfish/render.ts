import { halo } from '../../../src/art/glowArt';
import { PAPER } from '../../../src/art/pen';
import { BOIL_FRAMES } from '../../../src/art/textures';
import { CAPTION_FONT, drawTextLine, type TextInk } from '../captions';
import { VIDEO, type Short } from '../short';
import { renderBlobfishAudio } from './audio';
import { drawBlobfish } from './fish';
import { drawNet, drawRope } from './net';
import {
  drawArrows, drawDrop, drawPuff, drawSeafloor, drawSkyAndSea, drawSnow, drawSplash, drawWaterline, surfaceY, toScreen,
} from './scene';
import {
  atmospheresAt, boilAt, cameraAt, captionAt, dropsAt, fishAt, fishY, FISH_LEN, FLOOR_Y, hundredPulse, labelAt, LOOP_S, metresAt, PIVOT, puffAge, pushAt,
  readoutAt, revealAge, SNOW_PER_PX, snowScroll, splashAge, SPLASHES, squeezeAt, strikeAt,
} from './story';

/** Draws the "this is not what a blobfish looks like" short (story.ts has the choreography). */

const PAPER_ON_INK: TextInk = { fill: PAPER, halo: '#05091a' };
const SPOKEN = '#f5c84a';
const STRIKE = '#ff5a4e';
const CAPTION_Y = 1170;
const CAPTION_SIZE = 96;
/** Captions never wider than this: a long line shrinks to fit. */
const CAPTION_MAX_W = 980;
/** The label and the readout, at the top of the safe area. */
const TOP_Y = 372;

/** "World's Ugliest Animal", as the internet voted it, struck through on "not". */
function drawLabel(ctx: CanvasRenderingContext2D, t: number): void {
  const show = labelAt(t);
  if (show <= 0) return;
  const text = '“World’s Ugliest Animal”';
  const size = 92;
  drawTextLine(ctx, text, VIDEO.width / 2, TOP_Y, size, 700, show, PAPER_ON_INK);
  drawTextLine(ctx, '– the internet', VIDEO.width / 2 + 150, TOP_Y + 72, 58, 500, 0.85 * show, PAPER_ON_INK);
  const strike = strikeAt(t);
  if (strike <= 0) return;
  ctx.save();
  ctx.font = `700 ${size}px ${CAPTION_FONT}`;
  const w = ctx.measureText(text).width + 30;
  const x0 = VIDEO.width / 2 - w / 2;
  const y0 = TOP_Y - size * 0.3;
  ctx.globalAlpha = show;
  ctx.strokeStyle = STRIKE;
  ctx.lineCap = 'round';
  ctx.lineWidth = 11;
  ctx.beginPath();
  ctx.moveTo(x0, y0 + 10);
  // A quick slightly rising pen stroke, drawn left to right.
  ctx.quadraticCurveTo(x0 + w * 0.5 * strike, y0 + 4 - 6 * strike, x0 + w * strike, y0 + 10 - 14 * strike);
  ctx.stroke();
  ctx.restore();
}

/** A chalk ring pulsing out round the fish as it is revealed. */
function drawRevealRing(ctx: CanvasRenderingContext2D, belly: { x: number; y: number }, len: number, u: number): void {
  if (u < 0 || u > 1) return;
  ctx.save();
  ctx.strokeStyle = SPOKEN;
  ctx.lineWidth = 5;
  ctx.globalAlpha = Math.sin(Math.PI * u) * 0.9;
  ctx.beginPath();
  ctx.ellipse(belly.x + 0.04 * len, belly.y - 0.16 * len, len * (0.5 + 0.25 * u), len * (0.24 + 0.14 * u), 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

/** Depth and pressure, counting as it goes down and comes up. */
function drawReadout(ctx: CanvasRenderingContext2D, t: number): void {
  const show = readoutAt(t);
  if (show <= 0) return;
  const metres = Math.round(metresAt(t));
  drawTextLine(ctx, `${metres.toLocaleString('en-US')} m`, VIDEO.width / 2, TOP_Y + 8, 124, 700, show, PAPER_ON_INK);
  const pulse = hundredPulse(t);
  const atm = Math.round(atmospheresAt(t));
  const ink: TextInk = pulse > 0.2 ? { fill: SPOKEN, halo: '#05091a' } : PAPER_ON_INK;
  drawTextLine(ctx, `pressure ×${atm}`, VIDEO.width / 2, TOP_Y + 86, 66 * (1 + 0.18 * pulse), 700, show, ink);
}

/** The spoken line, word by word, the word being said in yellow. */
function drawCaption(ctx: CanvasRenderingContext2D, t: number): void {
  const now = captionAt(t);
  if (!now) return;
  const words = now.line.words.map((w) => w.text.replace('...', '…'));
  ctx.save();
  ctx.font = `700 ${CAPTION_SIZE}px ${CAPTION_FONT}`;
  const space = ctx.measureText(' ').width;
  const natural = words.map((w) => ctx.measureText(w).width);
  ctx.restore();
  const naturalTotal = natural.reduce((s, w) => s + w, 0) + space * (words.length - 1);
  const k = Math.min(1, CAPTION_MAX_W / naturalTotal);
  let x = VIDEO.width / 2 - (naturalTotal * k) / 2;
  words.forEach((w, i) => {
    const colours: TextInk = i === now.word ? { fill: SPOKEN, halo: '#05091a' } : PAPER_ON_INK;
    drawTextLine(ctx, w, x + (natural[i]! * k) / 2, CAPTION_Y, CAPTION_SIZE * k, 700, i <= now.word ? 1 : 0.55, colours);
    x += (natural[i]! + space) * k;
  });
}

export function createBlobfish(ctx: CanvasRenderingContext2D): Short {
  const draw = (seconds: number): void => {
    const t = ((seconds % LOOP_S) + LOOP_S) % LOOP_S;
    const boil = boilAt(t) % BOIL_FRAMES;
    const cam = cameraAt(t);
    const fish = fishAt(t);
    const belly = toScreen(cam, fish.x, fish.y);
    const len = FISH_LEN * cam.zoom;
    const surface = surfaceY(cam);
    const floor = toScreen(cam, 0, FLOOR_Y).y;

    drawSkyAndSea(ctx, cam, t);
    drawSnow(ctx, snowScroll(t), fishY(t).rate * SNOW_PER_PX, surface, t, LOOP_S);
    drawSeafloor(ctx, cam);
    // A little light on it in the dark, as if from a submersible's lamp.
    const deep = metresAt(t) / 1000;
    if (deep > 0) halo(ctx, belly.x, belly.y - 0.15 * len, 0.9 * len, '#9ec8ff', 0.16 * deep);
    drawRope(ctx, belly, len, fish.angle, fish.slack, PIVOT / FISH_LEN);
    drawNet(ctx, belly, len, fish.angle, fish.slack, PIVOT / FISH_LEN, false, boil);
    drawBlobfish(ctx, belly.x, belly.y, len, fish.angle, { sag: fish.sag, swell: fish.swell, wobble: fish.wobble, boil: boil });
    drawNet(ctx, belly, len, fish.angle, fish.slack, PIVOT / FISH_LEN, true, boil);
    drawPuff(ctx, belly, len, puffAge(t));
    drawRevealRing(ctx, belly, len, revealAge(t));
    drawWaterline(ctx, cam, t);
    drawArrows(ctx, { x: belly.x, y: belly.y - 0.17 * len }, 0.56 * len, 0.26 * len, squeezeAt(t), pushAt(t), boil, Math.min(floor, CAPTION_Y - 95), TOP_Y + 125);
    for (const d of dropsAt(t)) {
      const p = toScreen(cam, d.x, d.y);
      drawDrop(ctx, p, d.ring, cam.zoom, 0);
    }
    for (const at of SPLASHES) drawSplash(ctx, belly.x, surface, 0.6 * len, splashAge(t, at));

    drawLabel(ctx, t);
    drawReadout(ctx, t);
    drawCaption(ctx, t);
  };

  return { loopSeconds: LOOP_S, draw, audio: renderBlobfishAudio };
}

