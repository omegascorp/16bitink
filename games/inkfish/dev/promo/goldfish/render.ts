import { INK, type Pt } from '../../../src/art/pen';
import { BOIL_FRAMES } from '../../../src/art/textures';
import { makeBackdrop } from '../backdrop';
import { CAPTION_FONT, drawTextLine, INK_ON_PAPER, type TextInk } from '../captions';
import { VIDEO, type Short } from '../short';
import { renderGoldfishAudio } from './audio';
import { CALENDAR, CLOCK, drawCalendar, drawClock, drawDing } from './dials';
import { drawGoldfish, makeGoldfish } from './goldfish';
import { drawStopwatch, drawTag, makeBowlBack, makeBowlFront } from './home';
import { drawProp, drawRedCross, RED_ON_PAPER } from './ink';
import { drawBubbles, drawFeeder, drawHand, drawLever, drawPellet, drawTiles, makeTankBack, makeTankFront } from './lab';
import { captionAt, dingAt, failMark, foodLabel, hourLabel, leverLabel, monthsLabel, scientistsLabel } from './script';
import {
  BOWL_BUBBLES, boilAt, bowlFishAt, bubblesAt, calendarAt, calendarShown, camAt, CHUTE, clockHandAt, clockShown, crossAt, DROPS, handAt, hourShaded, inHour, LAB_X, labFishAt, leverAngleAt,
  LAB_BUBBLES, LOOP_S, MONTHS, paddleAt, pelletAt, tagSwayAt, tapAt,
} from './story';

/** Draws the "your goldfish does NOT have a three-second memory" short (story.ts has the choreography). */

const CAPTION_Y = 1200;
const CAPTION_SIZE = 96;
/** Captions never wider than this: a long line shrinks to fit. */
const CAPTION_MAX_W = 980;
const SPOKEN: TextInk = RED_ON_PAPER;
const LABEL_SIZE = 58;
/** Where the lab's notes go: between the calendar and the clock. */
const NOTE = { x: (CALENDAR.x + CALENDAR.w / 2 + CLOCK.x - CLOCK.r) / 2, y: 418 } as const;

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
    drawTextLine(ctx, w, x + (natural[i]! * k) / 2, CAPTION_Y, CAPTION_SIZE * k, 700, i <= now.word ? 1 : 0.55, i === now.word ? SPOKEN : INK_ON_PAPER);
    x += (natural[i]! + space) * k;
  });
}

/** A note with a fine ink leader to what it names. */
function drawNote(ctx: CanvasRenderingContext2D, text: string, at: Pt, to: Pt | null, alpha: number, colours: TextInk = INK_ON_PAPER): void {
  if (alpha <= 0) return;
  if (to) {
    ctx.save();
    ctx.globalAlpha = 0.8 * alpha;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(at.x, at.y - LABEL_SIZE * 0.75);
    ctx.quadraticCurveTo((at.x + to.x) / 2 + 20, (at.y + to.y) / 2, to.x, to.y);
    ctx.stroke();
    ctx.restore();
  }
  drawTextLine(ctx, text, at.x, at.y, LABEL_SIZE, 700, alpha, colours);
}

export function createGoldfish(ctx: CanvasRenderingContext2D): Short {
  const paper = makeBackdrop({ top: 'rgba(214,190,150,0.10)', bottom: 'rgba(170,140,100,0.16)' });
  const sprite = makeGoldfish(4);
  const bowlBack = makeBowlBack();
  const bowlFront = makeBowlFront();
  const tankBack = makeTankBack();
  const tankFront = makeTankFront();

  /** The bowl at home: the hook, and where the loop comes back to. */
  const drawHome = (t: number, boil: number): void => {
    drawProp(ctx, bowlBack, boil);
    drawBubbles(ctx, boil, bubblesAt(BOWL_BUBBLES, t));
    drawGoldfish(ctx, sprite, bowlFishAt(t), boil);
    drawProp(ctx, bowlFront, boil);
    drawTag(ctx, boil, tagSwayAt(t), crossAt(t));
    drawStopwatch(ctx, boil, 0.04 * Math.sin((2 * Math.PI * 5 * t) / LOOP_S));
  };

  /** The lab, in its own coordinates. */
  const drawLab = (t: number, boil: number, left: number): void => {
    drawTiles(ctx, left);
    drawProp(ctx, tankBack, boil);
    drawBubbles(ctx, boil, bubblesAt(LAB_BUBBLES, t));
    drawLever(ctx, boil, leverAngleAt(t));
    const fish = labFishAt(t);
    drawGoldfish(ctx, sprite, fish, boil);
    for (const d of DROPS) {
      const at = pelletAt(d, t);
      if (at) drawPellet(ctx, boil, at);
    }
    drawProp(ctx, tankFront, boil);
    const kick = Math.max(0, ...DROPS.map((d) => Math.sin(Math.PI * Math.max(0, Math.min(1, (t - d.from + 0.08) / 0.3)))));
    drawFeeder(ctx, boil, kick);
    const ding = dingAt(t);
    if (ding !== null) drawDing(ctx, boil, { x: CHUTE.x, y: CHUTE.y - 4 }, ding);
    const fail = failMark(t);
    if (fail > 0) drawRedCross(ctx, CHUTE.x, CHUTE.y + 44, 70, 70, [Math.min(1, fail * 2), Math.max(0, fail * 2 - 1)], 11);
    const h = clockHandAt(t);
    drawClock(ctx, boil, clockShown(t), hourShaded(t), h, inHour(h) && hourShaded(t) >= 1);
    const page = calendarAt(t);
    drawCalendar(ctx, boil, calendarShown(t), MONTHS, page.month, page.flip);
    drawHand(ctx, boil, handAt(t), tapAt(t));

    // Notes.
    drawNote(ctx, 'scientists', NOTE, null, scientistsLabel(t), SPOKEN);
    const paddle = paddleAt(leverAngleAt(t));
    drawNote(ctx, 'lever', { x: paddle.x - 70, y: 1040 }, { x: paddle.x - 6, y: paddle.y + 26 }, leverLabel(t), SPOKEN);
    const first = pelletAt(DROPS[0]!, t);
    if (first) drawNote(ctx, 'food', { x: first.x + 96, y: first.y + 18 }, null, foodLabel(t), SPOKEN);
    drawNote(ctx, '1 hour', { x: NOTE.x, y: NOTE.y - 10 }, null, hourLabel(t));
    drawNote(ctx, 'a day', { x: NOTE.x, y: NOTE.y + 52 }, null, hourLabel(t));
    drawNote(ctx, 'months!', { x: NOTE.x, y: NOTE.y + 20 }, null, monthsLabel(t), SPOKEN);
  };

  const draw = (seconds: number): void => {
    const t = ((seconds % LOOP_S) + LOOP_S) % LOOP_S;
    const boil = boilAt(t) % BOIL_FRAMES;
    const cam = camAt(t);
    ctx.drawImage(paper, 0, 0);
    if (cam < VIDEO.width) {
      ctx.save();
      ctx.translate(-cam, 0);
      drawHome(t, boil);
      ctx.restore();
    }
    if (cam > 0) {
      ctx.save();
      ctx.translate(LAB_X - cam, 0);
      drawLab(t, boil, cam - LAB_X);
      ctx.restore();
    }
    drawCaption(ctx, t);
  };

  return { loopSeconds: LOOP_S, draw, audio: renderGoldfishAudio };
}
