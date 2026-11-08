import { INK, makeCanvas, PAPER } from '../../../src/art/pen';
import { BOIL_FRAMES } from '../../../src/art/textures';
import { CAPTION_FONT, drawTextLine, type TextInk } from '../captions';
import { VIDEO, type Short } from '../short';
import { prepare as prepareHumpback } from '../foodchain/art/humpback';
import { prepareAnimals } from './animals';
import { renderSealionAudio } from './audio';
import { drawHook, drawMouth, drawSchool, drawSlip, drawThroat } from './scenes';
import { captionAt, TEXT } from './script';
import { boilAt, brightAt, cameraAt, dramaAt, flashAt, LOOP_S, nervousAt, SCENE_IDS, sceneAlpha, type SceneId, wrap } from './story';

/** Draws the "this whale caught a sea lion by mistake" short (story.ts has the choreography). */

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

function wash(ctx: CanvasRenderingContext2D, mode: GlobalCompositeOperation, colour: string, alpha: number): void {
  if (alpha <= 0.005) return;
  ctx.save();
  ctx.globalCompositeOperation = mode;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = colour;
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
  ctx.restore();
}

/** The mood of the beat over the picture: warm and bright for the school, drained and cold for the mouth, a dark vignette for the throat. */
function drawGrade(ctx: CanvasRenderingContext2D, t: number): void {
  const bright = brightAt(t);
  const nervous = nervousAt(t);
  const drama = dramaAt(t);
  wash(ctx, 'saturation', '#808080', 0.55 * nervous + 0.2 * drama);
  wash(ctx, 'multiply', '#6f86a8', 0.5 * nervous + 0.3 * drama);
  wash(ctx, 'soft-light', '#ffd98a', 0.45 * bright);
  const dark = Math.max(nervous * 0.7, drama * 0.55);
  if (dark > 0.01) {
    const g = ctx.createRadialGradient(VIDEO.width / 2, 800, 280, VIDEO.width / 2, 840, 1200);
    g.addColorStop(0, 'rgba(2,8,18,0)');
    g.addColorStop(1, `rgba(2,8,18,${(0.7 * dark).toFixed(3)})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
  }
}

export function createSealion(ctx: CanvasRenderingContext2D): Short {
  void prepareHumpback();
  prepareAnimals();
  const layer = makeCanvas(VIDEO.width, VIDEO.height);
  const world = makeCanvas(VIDEO.width, VIDEO.height);

  const drawScene = (id: SceneId, t: number, boil: number): void => {
    switch (id) {
      case 'hook': return drawHook(layer.ctx, t, boil);
      case 'school': return drawSchool(layer.ctx, t, boil);
      case 'mouth': return drawMouth(layer.ctx, t, boil);
      case 'throat': return drawThroat(layer.ctx, t, boil);
      case 'slip': return drawSlip(layer.ctx, t, boil);
    }
  };

  const draw = (seconds: number): void => {
    const t = wrap(seconds);
    const boil = boilAt(t) % BOIL_FRAMES;
    const w = world.ctx;
    w.fillStyle = '#0b3262';
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
    ctx.fillStyle = '#0b3262';
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

  return { loopSeconds: LOOP_S, draw, audio: renderSealionAudio };
}
