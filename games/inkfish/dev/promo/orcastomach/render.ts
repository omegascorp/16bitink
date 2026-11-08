import { INK, makeCanvas, PAPER } from '../../../src/art/pen';
import { BOIL_FRAMES } from '../../../src/art/textures';
import { prepare as prepareOrca } from '../foodchain/art/orca';
import { CAPTION_FONT, drawTextLine, type TextInk } from '../captions';
import { VIDEO, type Short } from '../short';
import { renderOrcastomachAudio } from './audio';
import { prepareHead } from './art/orcaHead';
import { makeBackdrops } from './backdrops';
import { drawFingers, drawHook, drawOverlay, drawSea, drawShore } from './scenes';
import { captionAt, TEXT } from './script';
import { boilAt, cameraAt, flashAt, LOOP_S, SCENE_IDS, sceneAlpha, type SceneId, wrap } from './story';

/** Draws the "this orca ate 13 porpoises and 14 seals" short (story.ts has the choreography). */

const RED = '#c8452c';
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
  ctx.globalAlpha = alpha;
  ctx.fillStyle = colour;
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
  ctx.restore();
}

export function createOrcastomach(ctx: CanvasRenderingContext2D): Short {
  const backdrops = makeBackdrops();
  void prepareOrca();
  prepareHead();
  const layer = makeCanvas(VIDEO.width, VIDEO.height);
  const world = makeCanvas(VIDEO.width, VIDEO.height);

  const drawScene = (id: SceneId, t: number, boil: number): void => {
    const c = layer.ctx;
    switch (id) {
      case 'hook': return drawHook(c, t, boil, backdrops);
      case 'shore': return drawShore(c, t, boil, backdrops);
      case 'fingers': return drawFingers(c, t, boil, backdrops);
      case 'sea': return drawSea(c, t, boil, backdrops);
    }
  };

  const draw = (seconds: number): void => {
    const t = wrap(seconds);
    const boil = boilAt(t) % BOIL_FRAMES;
    const w = world.ctx;
    w.fillStyle = '#06151f';
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
    drawOverlay(w, t);
    const cam = cameraAt(t);
    ctx.fillStyle = '#06151f';
    ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
    ctx.save();
    ctx.translate(VIDEO.width / 2 + cam.dx, 800 + cam.dy);
    ctx.rotate(cam.rot);
    ctx.scale(cam.zoom, cam.zoom);
    ctx.translate(-VIDEO.width / 2, -800);
    ctx.drawImage(world.canvas, 0, 0);
    ctx.restore();
    wash(ctx, '#ffffff', flashAt(t));
    drawCaption(ctx, t);
  };

  return { loopSeconds: LOOP_S, draw, audio: renderOrcastomachAudio };
}
