import { INK, makeCanvas, PAPER } from '../../../src/art/pen';
import { BOIL_FRAMES } from '../../../src/art/textures';
import { CAPTION_FONT, drawTextLine, type TextInk } from '../captions';
import { VIDEO, type Short } from '../short';
import { makeSprite } from '../sprites';
import { renderSealAudio } from './audio';
import { drawAmbient, drawRays, makeWater, RED } from './scene';
import { drawBars, drawBite, drawChase, drawPeek, drawSurface, drawTug } from './scenes';
import { captionAt, TEXT } from './script';
import { boilAt, cameraAt, flashAt, gloomAt, LOOP_S, nervousAt, SCENE_IDS, sceneAlpha, type SceneId, wrap } from './story';

/** Draws the "this seal hunts sharks" short (story.ts has the choreography). */

const SPOKEN: TextInk = { fill: RED, halo: PAPER };
const UNSPOKEN: TextInk = { fill: INK, halo: PAPER };
const CAPTION_SIZE = TEXT.caption.size;
const CAPTION_MAX_W = 980;

/** The spoken line, word by word, the word being said in red. */
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
    drawTextLine(ctx, w, x + (natural[i]! * k) / 2, TEXT.caption.y, CAPTION_SIZE * k, 700, i <= now.word ? 1 : 0.55, i === now.word ? SPOKEN : UNSPOKEN);
    x += (natural[i]! + space) * k;
  });
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

/** The mood of the beat over the picture: gloom for the great white, a sickly grey for the nervous bars. */
function drawGrade(ctx: CanvasRenderingContext2D, t: number): void {
  const gloom = gloomAt(t);
  const nervous = nervousAt(t);
  wash(ctx, 'saturation', '#808080', 0.45 * gloom + 0.5 * nervous);
  wash(ctx, 'multiply', '#6f8fb0', 0.55 * gloom + 0.25 * nervous);
  if (gloom > 0.01) {
    const g = ctx.createRadialGradient(VIDEO.width / 2, 800, 300, VIDEO.width / 2, 840, 1200);
    g.addColorStop(0, 'rgba(2,10,20,0)');
    g.addColorStop(1, `rgba(2,10,20,${(0.6 * gloom).toFixed(3)})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
  }
}

export function createSeal(ctx: CanvasRenderingContext2D): Short {
  const water = makeWater();
  const sprites = { white: makeSprite('shark', 4, 'heavy') };
  const layer = makeCanvas(VIDEO.width, VIDEO.height);
  const world = makeCanvas(VIDEO.width, VIDEO.height);

  const drawScene = (id: SceneId, t: number, boil: number): void => {
    switch (id) {
      case 'bite': return drawBite(layer.ctx, t, boil);
      case 'surface': return drawSurface(layer.ctx, sprites, t, boil);
      case 'chase': return drawChase(layer.ctx, t, boil);
      case 'tug': return drawTug(layer.ctx, t, boil);
      case 'bars': return drawBars(layer.ctx, t, boil);
      case 'peek': return drawPeek(layer.ctx, sprites, t, boil);
    }
  };

  const draw = (seconds: number): void => {
    const t = wrap(seconds);
    const boil = boilAt(t) % BOIL_FRAMES;
    const w = world.ctx;
    w.drawImage(water, 0, 0);
    drawRays(w, t / LOOP_S);
    drawAmbient(w, t / LOOP_S);
    for (const id of SCENE_IDS) {
      const alpha = sceneAlpha(id, t);
      if (alpha <= 0.005) continue;
      layer.ctx.clearRect(0, 0, VIDEO.width, VIDEO.height);
      drawScene(id, t, boil);
      w.save();
      w.globalAlpha = alpha;
      w.drawImage(layer.canvas, 0, 0);
      w.restore();
    }
    drawGrade(w, t);
    const cam = cameraAt(t);
    ctx.fillStyle = '#0d3466';
    ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
    ctx.save();
    ctx.translate(VIDEO.width / 2 + cam.dx, 800 + cam.dy);
    ctx.rotate(cam.rot);
    ctx.scale(cam.zoom, cam.zoom);
    ctx.translate(-VIDEO.width / 2, -800);
    ctx.drawImage(world.canvas, 0, 0);
    ctx.restore();
    wash(ctx, 'source-over', '#ffffff', flashAt(t));
    drawCaption(ctx, t);
  };

  return { loopSeconds: LOOP_S, draw, audio: renderSealAudio };
}
