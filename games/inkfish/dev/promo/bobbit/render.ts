import { makeCanvas, PAPER } from '../../../src/art/pen';
import { BOIL_FRAMES } from '../../../src/art/textures';
import { CAPTION_FONT, drawTextLine, type TextInk } from '../captions';
import { VIDEO, type Short } from '../short';
import { renderBobbitAudio } from './audio';
import { drawBurrow, makeBurrow } from './burrow';
import { drawDark, drawEerie, drawFlash, drawTension, drawVignette } from './mood';
import { drawNight, makeNight, NIGHT } from './night';
import { captionAt, TEXT } from './script';
import {
  boilAt, darkAt, eerieAt, fishPanicAt, flashAt, lungeAt, HOLE, LOOP_S, lurkCamAt, lurkFishAt, lurkWormAt, type SceneId, sceneAt, settleAt, shakeAt, SNAP_AT, sprayAt, STRIKE_CAM,
  strikeClock, strikeFishAt, strikeWormAt, tensionAt, toScreen, wrap,
} from './story';
import { drawTank, makeTank } from './tank';

/** Draws the "this worm's jaws can slice a fish in half" short (story.ts has the choreography). */

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

export function createBobbit(ctx: CanvasRenderingContext2D): Short {
  const night = makeNight();
  const burrow = makeBurrow();
  const tank = makeTank();
  const other = makeCanvas(VIDEO.width, VIDEO.height);

  const drawScene = (c: CanvasRenderingContext2D, id: SceneId, t: number, boil: number): void => {
    if (id === 'strike') {
      const s = strikeClock(t);
      drawNight(c, night, { cam: STRIKE_CAM, shake: shakeAt(t), worm: strikeWormAt(s, t), fish: strikeFishAt(s, t), spray: sprayAt(s), settle: -1, panic: fishPanicAt(s), wash: NIGHT }, t, boil);
      drawVignette(c, 0.7);
    } else if (id === 'lurk') {
      const u = wrap(t);
      const cam = lurkCamAt(t);
      const spray = u > SNAP_AT - 0.1 && u < SNAP_AT + 1.2 ? (u - SNAP_AT + 0.1) * 1.4 : -1;
      drawNight(c, night, { cam, shake: shakeAt(t), worm: lurkWormAt(t), fish: lurkFishAt(t), spray, settle: settleAt(t), panic: lungeAt(t), wash: NIGHT }, t, boil);
      drawVignette(c, 0.75);
      drawTension(c, tensionAt(t));
      drawEerie(c, eerieAt(t));
      drawDark(c, toScreen(cam, { x: HOLE.x, y: HOLE.y - 40 }), darkAt(t));
    } else if (id === 'burrow') {
      drawBurrow(c, burrow, t, boil);
    } else {
      drawTank(c, tank, t, boil);
    }
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
    drawFlash(ctx, flashAt(t));
    drawCaption(ctx, t);
  };

  return { loopSeconds: LOOP_S, draw, audio: renderBobbitAudio };
}
