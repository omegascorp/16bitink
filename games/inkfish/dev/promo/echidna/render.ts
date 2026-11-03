import { INK, makeCanvas, PAPER } from '../../../src/art/pen';
import { BOIL_FRAMES } from '../../../src/art/textures';
import { CAPTION_FONT, drawTextLine, type TextInk } from '../captions';
import { VIDEO, type Short } from '../short';
import { prepareTiger } from './art/tigerShark';
import { renderEchidnaAudio } from './audio';
import { RED } from './scene';
import { type Backdrops, drawCough, drawFine, drawHook, drawPlace, drawSad, drawTag, makeBackdrops } from './scenes';
import { captionAt, TEXT } from './script';
import { boilAt, cameraAt, drainAt, flashAt, LOOP_S, SCENE_IDS, sceneAlpha, type SceneId, wrap } from './story';

/** Draws the "this shark swallowed a spiky animal from land" short (story.ts has the choreography). */

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

export function createEchidna(ctx: CanvasRenderingContext2D): Short {
  const backdrops: Backdrops = makeBackdrops();
  prepareTiger();
  const layer = makeCanvas(VIDEO.width, VIDEO.height);
  const world = makeCanvas(VIDEO.width, VIDEO.height);

  const drawScene = (id: SceneId, t: number, boil: number): void => {
    const c = layer.ctx;
    switch (id) {
      case 'hook': return drawHook(c, t, boil, backdrops);
      case 'place': return drawPlace(c, t, boil, backdrops);
      case 'tag': return drawTag(c, t, boil, backdrops);
      case 'cough': return drawCough(c, t, boil, backdrops);
      case 'sad': return drawSad(c, t, boil, backdrops);
      case 'fine': return drawFine(c, t, boil, backdrops);
    }
  };

  const draw = (seconds: number): void => {
    const t = wrap(seconds);
    const boil = boilAt(t) % BOIL_FRAMES;
    const w = world.ctx;
    w.fillStyle = '#12303a';
    w.fillRect(0, 0, VIDEO.width, VIDEO.height);
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
    // The sad beat drains the colour and cools it.
    const drain = drainAt(t);
    wash(w, 'saturation', '#808080', 0.72 * drain);
    wash(w, 'multiply', '#9aa8b8', 0.35 * drain);
    const cam = cameraAt(t);
    ctx.fillStyle = '#12303a';
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

  return { loopSeconds: LOOP_S, draw, audio: renderEchidnaAudio };
}
