import { INK, makeCanvas, PAPER } from '../../../src/art/pen';
import { BOIL_FRAMES } from '../../../src/art/textures';
import { CAPTION_FONT, drawTextLine, type TextInk } from '../captions';
import { VIDEO, type Short } from '../short';
import { prepareGreenland } from './art/greenlandShark';
import { prepareBear } from './art/polarBear';
import { renderPolarsharkAudio } from './audio';
import { makeArctic, makeDeep, makeGloom, makeShallows, makeTwilight, RED } from './scene';
import { type Backdrops, drawDead, drawHook, drawHunt, drawInside, drawPlace, drawShrug, drawSlow } from './scenes';
import { captionAt, TEXT } from './script';
import { boilAt, cameraAt, flashAt, gloomAt, HOOK_SURFACE_Y, LOOP_S, SCENE_IDS, sceneAlpha, type SceneId, wrap } from './story';

/** Draws the "slowest shark had a polar bear in its stomach" short (story.ts has the choreography). */

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

export function createPolarshark(ctx: CanvasRenderingContext2D): Short {
  const backdrops: Backdrops = { arctic: makeArctic(HOOK_SURFACE_Y), twilight: makeTwilight(700), deep: makeDeep(), shallows: makeShallows(), gloom: makeGloom() };
  prepareGreenland();
  prepareBear();
  const layer = makeCanvas(VIDEO.width, VIDEO.height);
  const world = makeCanvas(VIDEO.width, VIDEO.height);

  const drawScene = (id: SceneId, t: number, boil: number): void => {
    const c = layer.ctx;
    switch (id) {
      case 'hook': return drawHook(c, t, boil, backdrops);
      case 'place': return drawPlace(c, t, boil, backdrops);
      case 'inside': return drawInside(c, t, boil, backdrops);
      case 'slow': return drawSlow(c, t, boil, backdrops);
      case 'hunt': return drawHunt(c, t, boil, backdrops);
      case 'dead': return drawDead(c, t, boil, backdrops);
      case 'shrug': return drawShrug(c, t, boil, backdrops);
    }
  };

  const draw = (seconds: number): void => {
    const t = wrap(seconds);
    const boil = boilAt(t) % BOIL_FRAMES;
    const w = world.ctx;
    w.fillStyle = '#04141c';
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
    const gloom = gloomAt(t);
    wash(w, 'saturation', '#808080', 0.4 * gloom);
    wash(w, 'multiply', '#8aa4b4', 0.4 * gloom);
    const cam = cameraAt(t);
    ctx.fillStyle = '#04141c';
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

  return { loopSeconds: LOOP_S, draw, audio: renderPolarsharkAudio };
}
