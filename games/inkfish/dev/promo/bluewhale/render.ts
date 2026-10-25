import { BOIL_FRAMES } from '../../../src/art/textures';
import { CAPTION_FONT, drawTextLine, type TextInk } from '../captions';
import { ramp, VIDEO, type Short } from '../short';
import { renderBlueWhaleAudio } from './audio';
import { drawBalance, drawBurgers, drawCalories, drawParachute, drawPounds } from './props';
import {
  drawFlash, drawGrade, drawInrush, drawKrill, drawKrillHaze, drawRays, drawRewind, drawSpecks, drawSquirt, drawVignette, drawWhip, gradeAt, INK_BG, makeWater, SPOKEN,
} from './scene';
import { captionAt, TEXT } from './script';
import {
  balanceZoomAt, beamAt, boilAt, caloriesAt, cameraAt, cycles, FOCUS, FULL_S, SHUT_S, krillAt, LOOP_S, PARACHUTE_AT, parachuteAt, poundsAt, rewindAt, sceneAt, shakeAt,
  storyAt, swarmShownAt, type View, waterDropAt, type WhalePose, whaleAt, wrap,
} from './story';
import { drawWhaleBack, drawWhaleFront } from './whale';

/** Draws the "this whale's mouthful is bigger than its body" short (story.ts has the choreography). */

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

/** Into the world's px through the view. */
function enterWorld(ctx: CanvasRenderingContext2D, v: View): void {
  ctx.translate(FOCUS.x, FOCUS.y);
  ctx.scale(v.zoom, v.zoom);
  ctx.translate(-v.x, -v.y);
}

/** The whale in the open sea: the lunge, the squeeze, the calories. */
function drawSea(ctx: CanvasRenderingContext2D, water: HTMLCanvasElement, t: number, boil: number): void {
  const s = storyAt(t);
  const v = cameraAt(t);
  const g = gradeAt(t);
  ctx.drawImage(water, 0, 0);
  drawRays(ctx, t, 0.7 + 0.6 * g.bright, -v.x * 0.3);
  drawSpecks(ctx, v, t);
  const w = whaleAt(s, t);
  const krill = krillAt(w, t);
  const shown = swarmShownAt(t);
  drawKrillHaze(ctx, v, krill, shown);
  ctx.save();
  enterWorld(ctx, v);
  drawWhaleBack(ctx, w, boil);
  ctx.restore();
  drawKrill(ctx, v, w, krill, shown);
  ctx.save();
  enterWorld(ctx, v);
  drawWhaleFront(ctx, w, boil);
  ctx.restore();
  drawInrush(ctx, v, w, ramp(w.gape, 0.5, 0.9) * (1 - ramp(s, FULL_S + 0.5, SHUT_S - 0.3)), t);
  drawSquirt(ctx, v, w, w.squirt, t);
  drawParachute(ctx, { x: 230, y: 470 }, 170, parachuteAt(t), 0.08 * Math.sin(cycles(5, t)), boil);
  const c = caloriesAt(t);
  drawBurgers(ctx, { x: 870, y: 1140 }, c.burgers, c.shown, boil);
  drawCalories(ctx, c);
}

/** The whale on the balance against its gulp of water. */
function drawWeighing(ctx: CanvasRenderingContext2D, water: HTMLCanvasElement, t: number, boil: number): void {
  ctx.drawImage(water, 0, 0);
  // Darker and heavier: the dramatic beat.
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = 'rgba(70,80,150,0.55)';
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
  ctx.restore();
  const drop = waterDropAt(t);
  const whale: WhalePose = {
    x: 0, y: 0, tilt: 0, scale: 0.19, gape: 0, balloon: 0, beat: cycles(9, t), stroke: 0.35, eye: drop.fall >= 1 ? 'wide' : 'calm', krill: 0, squirt: 0,
  };
  drawBalance(ctx, { tilt: beamAt(t), fall: drop.fall, squash: drop.squash, zoom: balanceZoomAt(t), whale }, t, boil);
  drawPounds(ctx, poundsAt(t));
}

export function createBlueWhale(ctx: CanvasRenderingContext2D): Short {
  const water = makeWater();

  const draw = (seconds: number): void => {
    const t = wrap(seconds);
    const boil = boilAt(t) % BOIL_FRAMES;
    const scene = sceneAt(t);
    const jolt = shakeAt(t);
    ctx.save();
    ctx.translate(jolt.x, jolt.y);
    if (scene < 1) {
      ctx.save();
      ctx.translate(0, -VIDEO.height * scene);
      drawSea(ctx, water, t, boil);
      ctx.restore();
    }
    if (scene > 0) {
      ctx.save();
      ctx.translate(0, VIDEO.height * (1 - scene));
      drawWeighing(ctx, water, t, boil);
      ctx.restore();
    }
    ctx.restore();
    drawWhip(ctx, Math.sin(Math.PI * scene), t);
    drawGrade(ctx, gradeAt(t));
    const d = t - (PARACHUTE_AT - 0.06);
    if (d > 0 && d < 0.5) drawFlash(ctx, 0.22 * Math.exp(-8 * d));
    drawVignette(ctx);
    drawRewind(ctx, rewindAt(t), t);
    drawCaption(ctx, t);
  };

  return { loopSeconds: LOOP_S, draw, audio: renderBlueWhaleAudio };
}
