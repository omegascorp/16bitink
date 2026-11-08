import { drawTextLine, INK_ON_PAPER, PAPER_ON_DARK, type TextInk } from '../captions';
import { type Short, VIDEO } from '../short';
import { boilAt } from '../sprites';
import { renderHeartbeatAudio } from './audio';
import { bakeCast, type Cast } from './cast';
import { drawCoilShot, HEART_AT } from './coils';
import { drawCta } from './cta';
import { drawGameShot } from './game';
import { boilTime, bloomAt, captionAt, GAME_AT, HOOK_LINES, hookAlpha, hookWord, LINES, LOOP_S, sceneAt, TEXT, wrap } from './story';
import { drawTableShot } from './table';
import type { Word } from './words';

/** Draws the "this snake squeezes until the heart stops" short (story.ts has the beats). */

/** Far enough from the heart to cover the frame's corners. */
const BLOOM_R = 1420;
const MAX_W = 980;
/** The boa's gold eye, for the word being said. */
const HOT = '#f2cf55';
const DIM = 0.55;

/** Frame 1 opening out of the prey: a disc of the coil shot with a red-hot rim. */
function drawBloom(ctx: CanvasRenderingContext2D, cast: Cast, t: number, boil: number): void {
  const b = bloomAt(t);
  if (b <= 0) return;
  const r = BLOOM_R * b * b;
  ctx.save();
  ctx.beginPath();
  ctx.arc(HEART_AT.x, HEART_AT.y, r, 0, Math.PI * 2);
  ctx.clip();
  drawCoilShot(ctx, cast, t, boil);
  ctx.restore();
  if (b >= 1) return;
  const g = ctx.createRadialGradient(HEART_AT.x, HEART_AT.y, r * 0.8, HEART_AT.x, HEART_AT.y, r + 150);
  g.addColorStop(0, 'rgba(190,24,20,0)');
  g.addColorStop(0.6, 'rgba(214,36,26,0.72)');
  g.addColorStop(1, 'rgba(190,24,20,0)');
  ctx.save();
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
  ctx.restore();
}

interface Spoken {
  readonly words: readonly Word[];
  /** The word being said (−1 none), and how much of the line shows. */
  readonly now: number;
  readonly y: number;
  readonly size: number;
  /** How the words not yet said show. */
  readonly unsaid: number;
  readonly alpha: number;
  readonly ink: TextInk;
  readonly hot: string;
}

/** One line, word by word, shrunk to fit. */
function drawLine(ctx: CanvasRenderingContext2D, s: Spoken): void {
  ctx.save();
  ctx.font = `700 ${s.size}px Caveat`;
  const space = ctx.measureText(' ').width;
  const widths = s.words.map((w) => ctx.measureText(w.text).width);
  ctx.restore();
  const total = widths.reduce((sum, w) => sum + w, 0) + space * (s.words.length - 1);
  const k = Math.min(1, MAX_W / total);
  let x = VIDEO.width / 2 - (total * k) / 2;
  s.words.forEach((w, i) => {
    const ink = i === s.now ? { fill: s.hot, halo: s.ink.halo } : s.ink;
    const alpha = s.alpha * (i <= s.now ? 1 : s.unsaid);
    drawTextLine(ctx, w.text, x + (widths[i]! * k) / 2, s.y, s.size * k, 700, alpha, ink);
    x += (widths[i]! + space) * k;
  });
}

/** The hook's two lines, in full from frame 1 with the word being said lit; then each line as it is said. */
function drawWords(ctx: CanvasRenderingContext2D, t: number): void {
  const hook = hookAlpha(t);
  if (hook > 0) {
    let now = hookWord(t);
    LINES.slice(0, HOOK_LINES).forEach((l, i) => {
      drawLine(ctx, { words: l.words, now, y: TEXT.hook.y + i * TEXT.hook.gap, size: TEXT.hook.size, unsaid: 1, alpha: hook, ink: PAPER_ON_DARK, hot: HOT });
      now -= l.words.length;
    });
  }
  const c = captionAt(t);
  if (!c) return;
  const onFarm = wrap(t) >= GAME_AT;
  drawLine(ctx, { words: c.line.words, now: c.word, y: TEXT.line.y, size: TEXT.line.size, unsaid: DIM, alpha: 1, ink: onFarm ? INK_ON_PAPER : PAPER_ON_DARK, hot: onFarm ? '#b3322b' : HOT });
}

function drawFrame(ctx: CanvasRenderingContext2D, cast: Cast, t: number): void {
  const boil = boilAt(boilTime(t));
  const scene = sceneAt(t);
  if (scene === 'coil') drawCoilShot(ctx, cast, t, boil);
  else if (scene === 'table') drawTableShot(ctx, cast, t, boil);
  else {
    drawGameShot(ctx, cast, t, boil);
    drawCta(ctx, t);
    drawBloom(ctx, cast, t, boil);
  }
  drawWords(ctx, t);
}

export function createHeartbeat(ctx: CanvasRenderingContext2D): Short {
  const cast = bakeCast();
  return { loopSeconds: LOOP_S, draw: (seconds) => drawFrame(ctx, cast, wrap(seconds)), audio: renderHeartbeatAudio };
}
