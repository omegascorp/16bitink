import { makeCanvas, PAPER } from '../../../src/art/pen';
import { BOIL_FRAMES } from '../../../src/art/textures';
import { CAPTION_FONT, drawTextLine, type TextInk } from '../captions';
import { prepare as prepareOrca } from '../foodchain/art/orca';
import { VIDEO, type Short } from '../short';
import { renderOrcawhaleAudio } from './audio';
import { prepare as prepareWhale } from './blueWhale';
import { drawChase, drawPrey } from './chase';
import { drawMaw, makeMawLayer } from './maw';
import { captionAt, TEXT } from './script';
import { makeSheet } from './sea';
import { drawSmug } from './smug';
import { boilAt, LOOP_S, type SceneId, sceneAt, wrap } from './story';
import { drawSurface } from './surface';

/** Draws "This orca swam inside a blue whale's mouth" (story.ts has the choreography). */

const CAPTION_Y = TEXT.caption.y;
const CAPTION_SIZE = TEXT.caption.size;
/** Captions never wider than this: a long line shrinks to fit. */
const CAPTION_MAX_W = 980;
export const INK_BG = '#050914';
export const SPOKEN = '#f5c84a';
export const PAPER_ON_INK: TextInk = { fill: PAPER, halo: INK_BG };

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
    const colours: TextInk = i === now.word ? { fill: SPOKEN, halo: INK_BG } : PAPER_ON_INK;
    drawTextLine(ctx, w, x + (natural[i]! * k) / 2, CAPTION_Y, CAPTION_SIZE * k, 700, i <= now.word ? 1 : 0.55, colours);
    x += (natural[i]! + space) * k;
  });
}

export function createOrcawhale(ctx: CanvasRenderingContext2D): Short {
  const sheet = makeSheet();
  const layer = makeMawLayer();
  const other = makeCanvas(VIDEO.width, VIDEO.height);
  void prepareWhale();
  void prepareOrca();

  const drawScene = (c: CanvasRenderingContext2D, id: SceneId, t: number, boil: number): void => {
    if (id === 'maw') drawMaw(c, sheet, layer, t);
    else if (id === 'surface') drawSurface(c, sheet, t, boil);
    else if (id === 'chase') drawChase(c, sheet, t);
    else if (id === 'prey') drawPrey(c, sheet, t);
    else drawSmug(c, sheet, t);
  };

  const draw = (seconds: number): void => {
    const t = wrap(seconds);
    const boil = boilAt(t) % BOIL_FRAMES;
    const now = sceneAt(t);
    drawScene(ctx, now.a, t, boil);
    if (now.b && now.mix > 0) {
      other.ctx.save();
      drawScene(other.ctx, now.b, t, boil);
      other.ctx.restore();
      ctx.save();
      ctx.globalAlpha = now.mix;
      ctx.drawImage(other.canvas, 0, 0);
      ctx.restore();
    }
    drawCaption(ctx, t);
  };

  return { loopSeconds: LOOP_S, draw, audio: renderOrcawhaleAudio };
}
