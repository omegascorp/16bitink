import { INK, makeCanvas, PAPER } from '../../../src/art/pen';
import { BOIL_FRAMES } from '../../../src/art/textures';
import { CAPTION_FONT, drawTextLine, type TextInk } from '../captions';
import { VIDEO, type Short } from '../short';
import { renderAlvinAudio } from './audio';
import { cameraOf, sceneOrder } from './poses';
import { drawDescent, drawHook, drawPorts, drawSword } from './scenes';
import { captionAt, TEXT } from './script';
import { bangFlashAt, boilAt, LOOP_S, type SceneId, sceneAlpha, wrap } from './story';
import { drawRise, drawSteaks, drawTitanic } from './tailScenes';

/** Draws the "this fish stabbed a submarine" short (story.ts has the choreography). */

export const RED = '#c8281e';
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

function wash(ctx: CanvasRenderingContext2D, colour: string, alpha: number): void {
  if (alpha <= 0.005) return;
  ctx.save();
  ctx.globalAlpha = Math.min(1, alpha);
  ctx.fillStyle = colour;
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
  ctx.restore();
}

export function createAlvin(ctx: CanvasRenderingContext2D): Short {
  const layer = makeCanvas(VIDEO.width, VIDEO.height);
  const drawScene = (id: SceneId, t: number, boil: number): void => {
    const c = layer.ctx;
    switch (id) {
      case 'hook': return drawHook(c, t, boil);
      case 'descent': return drawDescent(c, t, boil);
      case 'ports': return drawPorts(c, t, boil);
      case 'sword': return drawSword(c, t, boil);
      case 'rise': return drawRise(c, t, boil);
      case 'steaks': return drawSteaks(c, t, boil);
      case 'titanic': return drawTitanic(c, t, boil);
    }
  };

  const draw = (seconds: number): void => {
    const t = wrap(seconds);
    const boil = boilAt(t) % BOIL_FRAMES;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#020a14';
    ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
    for (const id of sceneOrder(t)) {
      const alpha = sceneAlpha(id, t);
      if (alpha <= 0.005) continue;
      layer.ctx.clearRect(0, 0, VIDEO.width, VIDEO.height);
      drawScene(id, t, boil);
      const cam = cameraOf(id, t);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(cam.px + cam.dx, cam.py + cam.dy);
      ctx.rotate(cam.rot);
      ctx.scale(cam.zoom, cam.zoom);
      ctx.translate(-cam.px, -cam.py);
      ctx.drawImage(layer.canvas, 0, 0);
      ctx.restore();
    }
    wash(ctx, '#ffffff', bangFlashAt(t));
    drawCaption(ctx, t);
    ctx.restore();
  };

  return { loopSeconds: LOOP_S, draw, audio: renderAlvinAudio };
}
