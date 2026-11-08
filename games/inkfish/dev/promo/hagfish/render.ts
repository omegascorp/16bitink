import { makeCanvas } from '../../../src/art/pen';
import { BOIL_FRAMES } from '../../../src/art/textures';
import { CAPTION_FONT, drawTextLine, type TextInk } from '../captions';
import { VIDEO, type Short } from '../short';
import { renderHagfishAudio } from './audio';
import { prepareViewfinder, drawViewfinder, drawStopwatch } from './overlays';
import { type Backdrops, drawBite, drawGills, drawKnot, makeDeep, makeGills, makeSunny } from './scenes';
import { captionAt, TEXT } from './script';
import { boilAt, cameraAt, flashAt, gradeAt, LOOP_S, SCENE_IDS, sceneAlpha, type SceneId, wrap } from './story';

/** Draws the "this shark bit a hagfish" short (story.ts has the choreography). */

const HALO = '#04101a';
const PAPER_TEXT = '#f4eddc';
export const SPOKEN = '#f5c84a';
const SPOKEN_INK: TextInk = { fill: SPOKEN, halo: HALO };
const UNSPOKEN_INK: TextInk = { fill: PAPER_TEXT, halo: HALO };
const CAPTION_SIZE = TEXT.caption.size;
const CAPTION_MAX_W = 980;

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
    drawTextLine(ctx, w, x + (natural[i]! * k) / 2, TEXT.caption.y, CAPTION_SIZE * k, 700, i <= now.word ? 1 : 0.6, i === now.word ? SPOKEN_INK : UNSPOKEN_INK);
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

export function createHagfish(ctx: CanvasRenderingContext2D): Short {
  const backdrops: Backdrops = { deep: makeDeep(), gills: makeGills(), sunny: makeSunny() };
  prepareViewfinder();
  const layer = makeCanvas(VIDEO.width, VIDEO.height);
  const world = makeCanvas(VIDEO.width, VIDEO.height);

  const drawScene = (id: SceneId, t: number, boil: number): void => {
    const c = layer.ctx;
    switch (id) {
      case 'bite': return drawBite(c, t, boil, backdrops);
      case 'gills': return drawGills(c, t, boil, backdrops);
      case 'knot': return drawKnot(c, t, boil, backdrops);
    }
  };

  const draw = (seconds: number): void => {
    const t = wrap(seconds);
    const boil = boilAt(t) % BOIL_FRAMES;
    const w = world.ctx;
    w.fillStyle = '#04101a';
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
    const g = gradeAt(t);
    wash(w, 'multiply', '#9a78d8', 0.42 * g.violet);
    wash(w, 'multiply', '#a8b060', 0.12 * g.olive);
    wash(w, 'screen', '#2a9fc8', 0.2 * g.cyan);
    wash(w, 'soft-light', '#ffc860', 0.18 * g.warm);
    wash(w, 'multiply', '#e090d0', 0.28 * g.magenta);
    const cam = cameraAt(t);
    ctx.fillStyle = '#04101a';
    ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
    ctx.save();
    ctx.translate(cam.pivot.x + cam.dx, cam.pivot.y + cam.dy);
    ctx.rotate(cam.rot);
    ctx.scale(cam.zoom, cam.zoom);
    ctx.translate(-cam.pivot.x, -cam.pivot.y);
    ctx.drawImage(world.canvas, 0, 0);
    ctx.restore();
    wash(ctx, 'source-over', '#ffffff', flashAt(t));
    drawStopwatch(ctx, t);
    drawViewfinder(ctx, t);
    drawCaption(ctx, t);
  };

  return { loopSeconds: LOOP_S, draw, audio: renderHagfishAudio };
}
