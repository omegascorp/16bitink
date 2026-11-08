import { makeCanvas, PAPER } from '../../../src/art/pen';
import { BOIL_FRAMES } from '../../../src/art/textures';
import { CAPTION_FONT, drawTextLine, type TextInk } from '../captions';
import { prepare as prepareGreatWhite } from '../foodchain/art/greatWhite';
import { prepare as prepareOrca } from '../foodchain/art/orca';
import { VIDEO, type Short } from '../short';
import { renderOrcaliverAudio } from './audio';
import { drawEnergy } from './energy';
import { drawFlip } from './flip';
import { drawGulf } from './gulf';
import { drawHook } from './hook';
import { drawLimp } from './limp';
import { prepare as prepareHookOrca } from './orcaArt';
import { drawPicky } from './picky';
import { captionAt, TEXT } from './script';
import { makeSheet, wash } from './sea';
import { boilAt, flashAt, LOOP_S, type SceneId, sceneAt, wrap } from './story';
import { drawXray } from './xray';

/** Draws the "orcas only eat one part of a great white" short (story.ts has the choreography). */

const CAPTION_Y = TEXT.caption.y;
const CAPTION_SIZE = TEXT.caption.size;
/** Captions never wider than this: a long line shrinks to fit. */
const CAPTION_MAX_W = 980;
const INK_BG = '#050914';
const SPOKEN = '#f5c84a';
const PAPER_ON_INK: TextInk = { fill: PAPER, halo: INK_BG };

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

export function createOrcaliver(ctx: CanvasRenderingContext2D): Short {
  const sheet = makeSheet();
  const other = makeCanvas(VIDEO.width, VIDEO.height);
  void prepareGreatWhite();
  void prepareOrca();
  void prepareHookOrca();

  const drawScene = (c: CanvasRenderingContext2D, id: SceneId, t: number, boil: number): void => {
    if (id === 'hook') drawHook(c, sheet, t);
    else if (id === 'gulf') drawGulf(c, sheet, t);
    else if (id === 'flip') drawFlip(c, sheet, t);
    else if (id === 'limp') drawLimp(c, sheet, t);
    else if (id === 'xray') drawXray(c, sheet, t);
    else if (id === 'energy') drawEnergy(c, sheet, t, boil);
    else drawPicky(c, sheet, t, boil);
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
    // The flash on "LIVER!".
    wash(ctx, 'screen', '#ffe2b8', 0.85 * flashAt(t));
    drawCaption(ctx, t);
  };

  return { loopSeconds: LOOP_S, draw, audio: renderOrcaliverAudio };
}
