import { INK, makeCanvas, PAPER } from '../../../src/art/pen';
import { BOIL_FRAMES } from '../../../src/art/textures';
import { CAPTION_FONT, drawTextLine, type TextInk } from '../captions';
import { VIDEO, type Short } from '../short';
import { prepare as prepareHumpback } from '../foodchain/art/humpback';
import { prepare as prepareOrca } from '../foodchain/art/orca';
import { prepareWeddell } from './art/weddell';
import { renderOrcasaveAudio } from './audio';
import { drawEyeScene, drawFloeScene, drawHook, drawMontage, drawSave, drawWaveScene } from './scenes';
import { RED_TEXT } from './scene';
import { captionAt, TEXT } from './script';
import { boilAt, brightAt, cameraAt, coldAt, duskAt, flashAt, LOOP_S, SCENE_IDS, sceneAlpha, type SceneId, wrap } from './story';

/** Draws the "this whale saved a seal from orcas" short (story.ts has the choreography). */

const SPOKEN: TextInk = { fill: RED_TEXT, halo: PAPER };
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

/** The mood of the beat over the picture: cold and drained for the floe and the roll, warm and bright for the lift, a dark vignette for the eye. */
function drawGrade(ctx: CanvasRenderingContext2D, t: number): void {
  const cold = coldAt(t);
  const bright = brightAt(t);
  const dusk = duskAt(t);
  wash(ctx, 'saturation', '#808080', 0.3 * cold + 0.25 * dusk);
  wash(ctx, 'multiply', '#7f9bbc', 0.3 * cold);
  wash(ctx, 'overlay', '#ffd9a0', 0.3 * bright);
  if (dusk > 0.01) {
    const g = ctx.createRadialGradient(VIDEO.width / 2, 900, 260, VIDEO.width / 2, 900, 1200);
    g.addColorStop(0, 'rgba(2,8,16,0)');
    g.addColorStop(1, `rgba(2,8,16,${(0.7 * dusk).toFixed(3)})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
  }
}

export function createOrcasave(ctx: CanvasRenderingContext2D): Short {
  void prepareHumpback();
  void prepareOrca();
  prepareWeddell();
  const layer = makeCanvas(VIDEO.width, VIDEO.height);
  const world = makeCanvas(VIDEO.width, VIDEO.height);

  const drawScene = (id: SceneId, t: number, boil: number): void => {
    switch (id) {
      case 'hook': return drawHook(layer.ctx, t, boil);
      case 'floe': return drawFloeScene(layer.ctx, t, boil);
      case 'wave': return drawWaveScene(layer.ctx, t, boil);
      case 'save': return drawSave(layer.ctx, t, boil);
      case 'montage': return drawMontage(layer.ctx, t, boil);
      case 'why': return drawEyeScene(layer.ctx, t, boil);
    }
  };

  const draw = (seconds: number): void => {
    const t = wrap(seconds);
    const boil = boilAt(t) % BOIL_FRAMES;
    const w = world.ctx;
    w.fillStyle = '#16202c';
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
    drawGrade(w, t);
    const cam = cameraAt(t);
    ctx.fillStyle = '#16202c';
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

  return { loopSeconds: LOOP_S, draw, audio: renderOrcasaveAudio };
}
