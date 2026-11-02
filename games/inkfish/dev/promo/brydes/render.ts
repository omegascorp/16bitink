import { BOIL_FRAMES } from '../../../src/art/textures';
import { CAPTION_FONT, drawTextLine, type TextInk } from '../captions';
import { VIDEO, type Short } from '../short';
import { renderBrydesAudio } from './audio';
import { drawBar, drawCard, drawPlace } from './props';
import {
  CHALK, drawBackdrop, drawBubble, drawFlash, drawGrade, drawFish, drawGull, drawRings, drawSpill, drawSplash, drawSurface, drawVignette, INK_BG, makeSeaPaper, SPOKEN,
} from './scene';
import { captionAt, TEXT } from './script';
import {
  barAt, boilAt, bubbleAt, buddyAt, calfAt, cameraAt, cardAt, flashAt, FOCUS, gullAt, gullsAt, LOOP_S, placeAt, shakeAt, splashAt, streamAt, toScreen, type View, whaleAt,
  worryAt, wrap,
} from './story';
import { drawWhale, enterWhale } from './whale';

/** Draws the "this whale just opens its mouth and waits" short (story.ts has the choreography). */

const CAPTION_MAX_W = 980;
const PAPER_ON_INK: TextInk = { fill: CHALK, halo: INK_BG };

/** The spoken line, word by word, the word being said in yellow. */
function drawCaption(ctx: CanvasRenderingContext2D, t: number): void {
  const now = captionAt(t);
  if (!now) return;
  const words = now.line.words.map((w) => w.text);
  ctx.save();
  ctx.font = `700 ${TEXT.caption.size}px ${CAPTION_FONT}`;
  const space = ctx.measureText(' ').width;
  const natural = words.map((w) => ctx.measureText(w).width);
  ctx.restore();
  const total = natural.reduce((s, w) => s + w, 0) + space * (words.length - 1);
  const k = Math.min(1, CAPTION_MAX_W / total);
  let x = VIDEO.width / 2 - (total * k) / 2;
  words.forEach((w, i) => {
    const colours: TextInk = i === now.word ? { fill: SPOKEN, halo: INK_BG } : PAPER_ON_INK;
    drawTextLine(ctx, w, x + (natural[i]! * k) / 2, TEXT.caption.y, TEXT.caption.size * k, 700, i <= now.word ? 1 : 0.55, colours);
    x += (natural[i]! + space) * k;
  });
}

function enterWorld(ctx: CanvasRenderingContext2D, v: View): void {
  ctx.translate(FOCUS.x, FOCUS.y);
  ctx.scale(v.zoom, v.zoom);
  ctx.translate(-v.x, -v.y);
}

export function createBrydes(ctx: CanvasRenderingContext2D): Short {
  const paper = makeSeaPaper();

  const draw = (seconds: number): void => {
    const t = wrap(seconds);
    const boil = boilAt(t) % BOIL_FRAMES;
    const v = cameraAt(t);
    const jolt = shakeAt(t);
    const mother = whaleAt(t);
    const buddy = buddyAt(t);
    const calf = calfAt(t);
    const tau = streamAt(t);
    const worry = worryAt(t);
    ctx.save();
    ctx.translate(jolt.x, jolt.y);
    drawBackdrop(ctx, paper, v, t);

    ctx.save();
    enterWorld(ctx, v);
    const gulls = gullsAt(t);
    if (gulls > 0) for (let i = 0; i < 3; i++) drawGull(ctx, gullAt(i, t), gullAt(i, t).flap, gulls);
    if (buddy.shown > 0) {
      ctx.globalAlpha = 0.85 * buddy.shown;
      drawWhale(ctx, buddy.pose, boil, 7);
      ctx.globalAlpha = 1;
    }
    drawWhale(ctx, mother, boil, 3, (inside) => {
      drawFish(ctx, mother, tau, worry, 1, inside);
      if (!inside) drawSpill(ctx, mother, tau);
    });
    if (calf.shown > 0) drawWhale(ctx, calf.pose, boil, 9, (inside) => drawFish(ctx, calf.pose, tau + 0.37, 0, 1.9, inside, 14));
    ctx.restore();

    drawSurface(ctx, v, t);

    ctx.save();
    enterWorld(ctx, v);
    drawRings(ctx, mother, t);
    drawSplash(ctx, { x: 0, y: 90 }, splashAt(t));
    drawBubble(ctx, { x: 20, y: -40 }, bubbleAt(0, t), 1);
    drawBubble(ctx, { x: -60, y: -40 }, bubbleAt(1, t), 1.3);
    ctx.restore();

    // The length bar down the hanging whale, snout to fluke.
    const bar = barAt(t);
    if (bar.shown > 0) {
      ctx.save();
      ctx.translate(0, 0);
      const top = toScreen(v, { x: 470, y: -427 });
      const bottom = toScreen(v, { x: 470, y: 1592 });
      drawBar(ctx, top, bottom, bar, boil);
      ctx.restore();
    }
    drawPlace(ctx, placeAt(t), boil);
    for (const n of [0, 1] as const) drawCard(ctx, n, cardAt(n, t), t, boil);
    ctx.restore();

    drawGrade(ctx, t);
    drawFlash(ctx, flashAt(t));
    drawVignette(ctx);
    drawCaption(ctx, t);
  };

  return { loopSeconds: LOOP_S, draw, audio: renderBrydesAudio };
}

export { enterWhale };
