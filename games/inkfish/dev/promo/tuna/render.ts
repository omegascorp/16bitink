import { INK, PAPER } from '../../../src/art/pen';
import { BOIL_FRAMES } from '../../../src/art/textures';
import { makeBackdrop } from '../backdrop';
import { CAPTION_FONT, drawTextLine, type TextInk } from '../captions';
import { drawChomp, drawSuction, suckedIn } from '../effects';
import { VIDEO, type Short } from '../short';
import { makeSprite, type Sprite } from '../sprites';
import { drawSwimmer } from '../swimmer';
import { renderTunaAudio } from './audio';
import {
  barsShown, bidCalls, bidderPaddle, bidderShown, boardShown, catAt, dollarsShown, fractionRing, gavelAngle, gavelShown, kgText, nameLabel, needleKg,
  PADDLES, paddleUp, paidBar, paperShown, paperSpin, pawAt, PLANNED_YEN, plannedBar, PRICE_YEN, rosetteAt, scaleShown, shakeAt, strikeAt, tokyoStamp,
  winterAt, yearStamp, yenAt, yenText,
} from './beats';
import { drawBidder, drawCall, drawCat, drawLanterns, drawPaper, drawSnow, drawStream } from './figures';
import { bodyPoint, poseOf } from './fish';
import { drawBars, drawGavel, drawPaddle, drawRosette, drawScale, drawStamp, drawStrike, drawTag, RED, RED_ON_PAPER } from './props';
import {
  boilAt, captionAt, chompAt, EATS, LOOP_S, type Prey, preyAt, soldStampAt, STRING_LEN, stringAngle, suctionAt, tagPop, tunaAt,
} from './story';

/** Draws the "this fish sold for three million dollars" short (story.ts and beats.ts have the choreography). */

const SPOKEN: TextInk = { fill: RED, halo: PAPER };
const UNSPOKEN: TextInk = { fill: INK, halo: PAPER };
const CAPTION_Y = 1200;
const CAPTION_SIZE = 96;
/** Captions never wider than this: a long line shrinks to fit. */
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
    drawTextLine(ctx, w, x + (natural[i]! * k) / 2, CAPTION_Y, CAPTION_SIZE * k, 700, i <= now.word ? 1 : 0.55, i === now.word ? SPOKEN : UNSPOKEN);
    x += (natural[i]! + space) * k;
  });
}

interface Sprites {
  readonly tuna: Sprite;
  readonly sardine: Sprite;
  readonly anchovy: Sprite;
}

/** The tuna, and a meal on its way in: the inside of its mouth, the meal, then the tuna over it. */
function drawTuna(ctx: CanvasRenderingContext2D, s: Sprites, t: number, boil: number): void {
  const tuna = tunaAt(t);
  const pose = poseOf('tuna', tuna);
  const look = { jaw: tuna.jaw, ...(tuna.lump > 0 ? { lump: { size: tuna.lump, at: 0.3 } } : {}) };
  const meals = EATS.map((_, i) => preyAt(i, t)).filter((p): p is Prey => p !== null);
  const going = meals.find((p) => p.eaten !== null);
  for (const p of meals) if (p !== going) drawSwimmer(ctx, s[p.shape], poseOf(p.shape, p), boil);
  if (going) {
    drawSwimmer(ctx, s.tuna, pose, boil, { ...look, part: 'mouth' });
    const [prey, shape] = suckedIn(poseOf(going.shape, going), pose, going.eaten!);
    drawSwimmer(ctx, s[going.shape], prey, boil, shape);
    drawSwimmer(ctx, s.tuna, pose, boil, { ...look, part: 'body' });
  } else {
    drawSwimmer(ctx, s.tuna, pose, boil, look);
  }
  drawSuction(ctx, pose, suctionAt(t), t / 3);
  drawChomp(ctx, pose, chompAt(t));
}

/** The price tag trailing from its back, and the rosette pinned behind its gills. */
function drawTagAndRosette(ctx: CanvasRenderingContext2D, t: number): void {
  const tuna = tunaAt(t);
  const tie = bodyPoint('tuna', tuna, 0.4, -1);
  const a = stringAngle(t);
  const end = { x: tie.x + Math.cos(a) * STRING_LEN, y: tie.y + Math.sin(a) * STRING_LEN };
  const flutter = 0.05 * Math.sin((2 * Math.PI * 9 * t) / LOOP_S);
  drawTag(ctx, tie, end, 0.25 * a + 0.1 + flutter, tagPop(t), soldStampAt(t));
  const pin = bodyPoint('tuna', tuna, 0.27, 0.15);
  drawRosette(ctx, pin.x, pin.y, 48, rosetteAt(t), 0.1 * Math.sin(t * 5));
}

/** "One bluefin tuna, 278 kilos": its name under it, the scale up top. */
function drawWeighIn(ctx: CanvasRenderingContext2D, t: number): void {
  drawTextLine(ctx, 'Pacific bluefin tuna', VIDEO.width / 2, 1085, 66, 700, nameLabel(t));
  drawScale(ctx, 250, 470, 128, needleKg(t), kgText(t), scaleShown(t));
}

/** The auction: the board, stamps, the gavel (the paddles pop up under the tuna, above the caption). */
function drawAuction(ctx: CanvasRenderingContext2D, t: number): void {
  const board = boardShown(t);
  if (board > 0) {
    const yen = yenAt(t);
    const done = yen >= PRICE_YEN;
    drawTextLine(ctx, yen > 0 ? yenText(yen) : '¥', 640, 490, done ? 112 : 104, 700, board, done ? RED_ON_PAPER : undefined);
    drawTextLine(ctx, '≈ $3.1 million', 640, 560, 58, 700, dollarsShown(t));
  }
  drawStamp(ctx, '2019', 470, 345, -0.12, 62, yearStamp(t));
  drawStamp(ctx, 'TOKYO', 800, 350, 0.08, 62, tokyoStamp(t));
  drawGavel(ctx, gavelAngle(t), gavelShown(t));
  drawStrike(ctx, strikeAt(t));
}

/** Luck and headlines: the cat and the front page. */
function drawNews(ctx: CanvasRenderingContext2D, t: number, s: Sprites, boil: number): void {
  drawCat(ctx, 230, 470, 240, catAt(t), pawAt(t));
  const sketch = (c: CanvasRenderingContext2D): void =>
    drawSwimmer(c, s.tuna, { j: 0, shape: 'tuna', age: 0, x: 0, y: 0, length: 150, facing: -1, tilt: 0, beat: t * 6, effort: 0.4 }, boil);
  drawPaper(ctx, 790, 470, paperSpin(t), paperShown(t), sketch);
}

/** The sushi boss bidding, then what he planned against what he paid. */
function drawBoss(ctx: CanvasRenderingContext2D, t: number): void {
  drawBidder(ctx, 250, 470, bidderShown(t), bidderPaddle(t));
  for (const c of bidCalls(t)) drawCall(ctx, c.text, 700 + 40 * (c.k % 2), 330 + 60 * (c.k % 2), c.shown);
  drawBars(ctx, barsShown(t), paidBar(t), plannedBar(t), PLANNED_YEN / PRICE_YEN, fractionRing(t));
}

export function createTuna(ctx: CanvasRenderingContext2D): Short {
  const backdrop = makeBackdrop({ top: 'rgba(70,150,210,0.10)', bottom: 'rgba(30,90,160,0.32)' });
  const sprites: Sprites = { tuna: makeSprite('tuna', 5), sardine: makeSprite('sardine', 2), anchovy: makeSprite('anchovy', 2) };

  const draw = (seconds: number): void => {
    const t = ((seconds % LOOP_S) + LOOP_S) % LOOP_S;
    const boil = boilAt(t) % BOIL_FRAMES;
    const winter = winterAt(t);
    ctx.drawImage(backdrop, 0, 0);
    const jolt = shakeAt(t);
    ctx.save();
    ctx.translate(jolt.x, jolt.y);
    drawStream(ctx, t, LOOP_S);
    drawTuna(ctx, sprites, t, boil);
    PADDLES.forEach((p, k) => drawPaddle(ctx, p.x, paddleUp(k, t), p.bid, 0.12 * Math.sin(k * 2.1)));
    drawSnow(ctx, t, LOOP_S, winter);
    drawTagAndRosette(ctx, t);
    drawWeighIn(ctx, t);
    drawAuction(ctx, t);
    drawNews(ctx, t, sprites, boil);
    drawBoss(ctx, t);
    drawLanterns(ctx, t, LOOP_S, winter);
    ctx.restore();
    drawCaption(ctx, t);
  };

  return { loopSeconds: LOOP_S, draw, audio: renderTunaAudio };
}
