import { makeCanvas, PAPER } from '../../../src/art/pen';
import { BOIL_FRAMES } from '../../../src/art/textures';
import { CAPTION_FONT, drawTextLine, type TextInk } from '../captions';
import { VIDEO, type Short } from '../short';
import { renderEelescapeAudio } from './audio';
import { HALO } from './labels';
import { drawOdds } from './odds';
import { drawRiver, makeBed, type RiverArt } from './river';
import { captionAt, TEXT } from './script';
import { makeSleeperSprites } from './sleeperArt';
import { boilAt, LOOP_S, type SceneId, sceneAt, wrap } from './story';
import { makeSheet, wash } from './water';
import { drawScanBar, drawXray, makeSkeleton } from './xray';

/** Draws the "this eel got swallowed alive and escaped" short (story.ts has the choreography). */

const CAPTION_Y = TEXT.caption.y;
const CAPTION_SIZE = TEXT.caption.size;
/** Captions never wider than this: a long line shrinks to fit. */
const CAPTION_MAX_W = 980;
export const SPOKEN = '#f5c84a';
const PAPER_ON_INK: TextInk = { fill: PAPER, halo: HALO };

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
    const colours: TextInk = i === now.word ? { fill: SPOKEN, halo: HALO } : PAPER_ON_INK;
    drawTextLine(ctx, w, x + (natural[i]! * k) / 2, CAPTION_Y, CAPTION_SIZE * k, 700, i <= now.word ? 1 : 0.55, colours);
    x += (natural[i]! + space) * k;
  });
}

export function createEelescape(ctx: CanvasRenderingContext2D): Short {
  const sheet = makeSheet();
  const river: RiverArt = { fish: makeSleeperSprites(), bed: makeBed() };
  const skeleton = makeSkeleton();
  const other = makeCanvas(VIDEO.width, VIDEO.height);

  const drawScene = (c: CanvasRenderingContext2D, id: SceneId, t: number, boil: number): void => {
    if (id === 'river') drawRiver(c, sheet, river, t, boil);
    else if (id === 'xray') drawXray(c, sheet, skeleton, t, boil);
    else drawOdds(c, sheet, t, boil);
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
      if (now.a === 'river' && now.b === 'xray') {
        // The X-ray wipes down the picture behind a scan line.
        const y = VIDEO.height * now.mix;
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, VIDEO.width, y);
        ctx.clip();
        ctx.drawImage(other.canvas, 0, 0);
        ctx.restore();
        drawScanBar(ctx, y, 1);
      } else {
        ctx.save();
        ctx.globalAlpha = now.mix;
        ctx.drawImage(other.canvas, 0, 0);
        ctx.restore();
        // Back to colour with a flash.
        if (now.a === 'xray') wash(ctx, 'screen', '#fff8e0', 0.6 * Math.sin(Math.PI * now.mix));
      }
    }
    drawCaption(ctx, t);
  };

  return { loopSeconds: LOOP_S, draw, audio: renderEelescapeAudio };
}
