import { INK, PAPER } from '../../../src/art/pen';
import { CAPTION_FONT, drawTextLine, type TextInk } from '../captions';
import { VIDEO, type Short } from '../short';
import { renderPigeonsAudio } from './audio';
import { drawScene } from './scene';
import { captionAt, TEXT } from './script';
import { albiAt, LOOP_S, metricAt, timerAt, timerValue, wrap } from './story';

/** Draws the "this fish hunts pigeons on land" short (story.ts has the choreography). */

export const RED = '#d02a1f';
const SPOKEN: TextInk = { fill: RED, halo: PAPER };
const UNSPOKEN: TextInk = { fill: INK, halo: PAPER };
const CAPTION_SIZE = TEXT.caption.size;
const CAPTION_MAX_W = 980;
const TIMER_BAR = { x: 270, y: 476, w: 540, h: 44, gap: 12 } as const;

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

/** The few words on the picture: the place, the length (metric over US), the timer. */
function drawLabels(ctx: CanvasRenderingContext2D, t: number): void {
  const mid = VIDEO.width / 2;
  drawTextLine(ctx, 'Albi, France', mid, TEXT.place.y, TEXT.place.size, 700, albiAt(t), UNSPOKEN);
  const metric = metricAt(t);
  drawTextLine(ctx, '1.5 m', mid, TEXT.metric.y, TEXT.metric.size, 700, metric, UNSPOKEN);
  drawTextLine(ctx, '5 ft', mid, TEXT.us.y, TEXT.us.size, 700, metric * 0.9, UNSPOKEN);
  drawTimer(ctx, t);
}

/** The count: the seconds big, four blocks under them filling up, one a second, to the limit of 4 s. */
function drawTimer(ctx: CanvasRenderingContext2D, t: number): void {
  const a = timerAt(t);
  if (a <= 0.01) return;
  const v = timerValue(t);
  const done = v >= 4;
  drawTextLine(ctx, done ? '4 s' : `${v.toFixed(1)} s`, VIDEO.width / 2, TEXT.timer.y, TEXT.timer.size, 700, a, done ? SPOKEN : UNSPOKEN);
  const { x, y, w, h, gap } = TIMER_BAR;
  ctx.save();
  ctx.globalAlpha = a;
  for (let i = 0; i < 4; i++) {
    const cell = (w - gap * 3) / 4;
    const cx = x + i * (cell + gap);
    ctx.fillStyle = PAPER;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.roundRect(cx, y, cell, h, 8);
    ctx.fill();
    ctx.fillStyle = RED;
    ctx.beginPath();
    ctx.roundRect(cx, y, cell * Math.max(0, Math.min(1, v - i)), h, 8);
    ctx.fill();
    ctx.beginPath();
    ctx.roundRect(cx, y, cell, h, 8);
    ctx.stroke();
  }
  ctx.restore();
}

export function createPigeons(ctx: CanvasRenderingContext2D): Short {
  const draw = (seconds: number): void => {
    const t = wrap(seconds);
    drawScene(ctx, t);
    drawLabels(ctx, t);
    drawCaption(ctx, t);
  };
  return { loopSeconds: LOOP_S, draw, audio: renderPigeonsAudio };
}
