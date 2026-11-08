import { INK, makeCanvas, PAPER } from '../../../src/art/pen';
import { CAPTION_FONT, drawTextLine, type TextInk } from '../captions';
import { prepare as prepareOrca } from '../foodchain/art/orca';
import { prepare as prepareShark } from '../foodchain/art/whaleShark';
import { VIDEO, type Short } from '../short';
import { renderOrcaflipAudio } from './audio';
import { cameraOf } from './poses';
import { drawHook, drawKid, drawSpin } from './scenes';
import { captionAt, TEXT } from './script';
import { LOOP_S, type SceneId, sceneAlpha, SCENE_IDS, wrap } from './story';
import { drawDiverCut, drawSink, drawXray } from './tailScenes';

/** Draws the "these orcas flip whale sharks upside down" short (story.ts has the choreography). */

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

export function createOrcaflip(ctx: CanvasRenderingContext2D): Short {
  void prepareOrca();
  void prepareShark();
  const layer = makeCanvas(VIDEO.width, VIDEO.height);
  const drawScene = (id: SceneId, t: number): void => {
    const c = layer.ctx;
    switch (id) {
      case 'hook': return drawHook(c, t);
      case 'kid': return drawKid(c, t);
      case 'spin': return drawSpin(c, t);
      case 'sci': return drawDiverCut(c, t);
      case 'xray': return drawXray(c, t);
      case 'sink': return drawSink(c, t);
    }
  };

  const draw = (seconds: number): void => {
    const t = wrap(seconds);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#020a14';
    ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
    for (const id of SCENE_IDS) {
      const alpha = sceneAlpha(id, t);
      if (alpha <= 0.005) continue;
      layer.ctx.clearRect(0, 0, VIDEO.width, VIDEO.height);
      drawScene(id, t);
      const cam = cameraOf(id, t);
      // A shake slides the picture, so it is held just large enough to keep its edges off screen.
      const zoom = 1 + Math.max(Math.abs(cam.dx) / (VIDEO.width / 2), Math.abs(cam.dy) / (VIDEO.height / 2));
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(VIDEO.width / 2 + cam.dx, VIDEO.height / 2 + cam.dy);
      ctx.scale(zoom, zoom);
      ctx.translate(-VIDEO.width / 2, -VIDEO.height / 2);
      ctx.drawImage(layer.canvas, 0, 0);
      ctx.restore();
    }
    drawCaption(ctx, t);
    ctx.restore();
  };

  return { loopSeconds: LOOP_S, draw, audio: renderOrcaflipAudio };
}
