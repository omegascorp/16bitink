import { makeCanvas, PAPER } from '../../../src/art/pen';
import { BOIL_FRAMES } from '../../../src/art/textures';
import { CAPTION_FONT, drawTextLine, type TextInk } from '../captions';
import { prepare as prepareGreatWhite } from '../foodchain/art/greatWhite';
import { prepare as prepareOrca } from '../foodchain/art/orca';
import { VIDEO, type Short } from '../short';
import { renderAlphaAudio } from './audio';
import { drawBeach } from './beach';
import { drawBelly } from './belly';
import { drawDeep } from './deep';
import { drawDive } from './dive';
import { drawRewind } from './effects';
import { captionAt, TEXT } from './script';
import { makeSheet } from './sea';
import { boilAt, DUNK, LOOP_S, type SceneId, sceneAt, wrap } from './story';
import { drawSurface, makeBoatFrames } from './surface';
import { drawSuspects } from './suspects';

/** Draws the "something ate a great white shark" short (story.ts has the choreography). */

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

/** The waterline sweeping up the screen as we go under: the deep below it, the beach above. */
function drawDunkLine(ctx: CanvasRenderingContext2D, y: number, t: number): void {
  ctx.save();
  ctx.lineCap = 'round';
  for (const [colour, width, dy] of [['rgba(240,248,255,0.85)', 26, 6], ['#1b1a1f', 5, 0]] as const) {
    ctx.strokeStyle = colour;
    ctx.lineWidth = width;
    ctx.beginPath();
    for (let x = -20; x <= VIDEO.width + 20; x += 20) {
      const yy = y + dy + 14 * Math.sin(x / 60 + t * 9) + 6 * Math.sin(x / 23 - t * 13);
      if (x === -20) ctx.moveTo(x, yy);
      else ctx.lineTo(x, yy);
    }
    ctx.stroke();
  }
  ctx.restore();
}

export function createAlpha(ctx: CanvasRenderingContext2D): Short {
  const sheet = makeSheet();
  const boat = makeBoatFrames();
  const other = makeCanvas(VIDEO.width, VIDEO.height);
  void prepareGreatWhite();
  void prepareOrca();

  const drawScene = (c: CanvasRenderingContext2D, id: SceneId, t: number, boil: number): void => {
    if (id === 'deep') drawDeep(c, sheet, t, boil);
    else if (id === 'surface') drawSurface(c, sheet, boat, t, boil);
    else if (id === 'dive') drawDive(c, sheet, t, boil);
    else if (id === 'belly') drawBelly(c, sheet, t, boil);
    else if (id === 'suspects') drawSuspects(c, sheet, t, boil);
    else drawBeach(c, sheet, t, boil);
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
      if (now.a === 'beach' && now.b === 'deep') {
        // Under the waterline: the deep from the bottom up.
        const y = VIDEO.height * (1 - now.mix) - 40 * now.mix;
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, y, VIDEO.width, VIDEO.height - y + 10);
        ctx.clip();
        ctx.drawImage(other.canvas, 0, 0);
        ctx.restore();
        if (t < DUNK.to) drawDunkLine(ctx, y, t);
      } else {
        ctx.save();
        ctx.globalAlpha = now.mix;
        ctx.drawImage(other.canvas, 0, 0);
        ctx.restore();
      }
    }
    drawRewind(ctx, t);
    drawCaption(ctx, t);
  };

  return { loopSeconds: LOOP_S, draw, audio: renderAlphaAudio };
}
