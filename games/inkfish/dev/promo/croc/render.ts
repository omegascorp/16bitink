import { INK, makeCanvas, PAPER } from '../../../src/art/pen';
import { BOIL_FRAMES } from '../../../src/art/textures';
import { CAPTION_FONT, drawTextLine, type TextInk } from '../captions';
import { VIDEO, type Short } from '../short';
import { prepareBull } from './art/bullShark';
import { prepareCroc } from './art/saltCroc';
import { renderCrocAudio } from './audio';
import { makeDusk, makeMurk, RED } from './scene';
import { type Backdrops, drawHook, drawRise, drawRiver, drawSize, drawSmug, drawUnder, drawVs, drawWrong } from './scenes';
import { captionAt, TEXT } from './script';
import { boilAt, cameraAt, flashAt, gloomAt, LOOP_S, SCENE_IDS, sceneAlpha, type SceneId, wrap } from './story';

/** Draws the "this crocodile ate a shark" short (story.ts has the choreography). */

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

export function createCroc(ctx: CanvasRenderingContext2D): Short {
  const backdrops: Backdrops = { dusk900: makeDusk(900), dusk640: makeDusk(640), dusk700: makeDusk(700), dusk520: makeDusk(520), murk: makeMurk() };
  prepareCroc();
  prepareBull();
  const layer = makeCanvas(VIDEO.width, VIDEO.height);
  const world = makeCanvas(VIDEO.width, VIDEO.height);

  const drawScene = (id: SceneId, t: number, boil: number): void => {
    const c = layer.ctx;
    switch (id) {
      case 'hook': return drawHook(c, t, boil, backdrops);
      case 'river': return drawRiver(c, t, boil, backdrops);
      case 'size': return drawSize(c, t, boil, backdrops);
      case 'rise': return drawRise(c, t, boil, backdrops);
      case 'under': return drawUnder(c, t, boil, backdrops);
      case 'wrong': return drawWrong(c, t, boil, backdrops);
      case 'smug': return drawSmug(c, t, boil, backdrops);
      case 'vs': return drawVs(c, t, boil, backdrops);
    }
  };

  const draw = (seconds: number): void => {
    const t = wrap(seconds);
    const boil = boilAt(t) % BOIL_FRAMES;
    const w = world.ctx;
    w.fillStyle = '#1c1810';
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
    wash(w, 'saturation', '#808080', 0.35 * gloom);
    wash(w, 'multiply', '#7f9a88', 0.4 * gloom);
    const cam = cameraAt(t);
    ctx.fillStyle = '#1c1810';
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

  return { loopSeconds: LOOP_S, draw, audio: renderCrocAudio };
}
