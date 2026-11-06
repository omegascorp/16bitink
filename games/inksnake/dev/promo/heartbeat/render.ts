import { drawTextLine, INK_ON_PAPER, PAPER_ON_DARK } from '../captions';
import { type Short, VIDEO } from '../short';
import { boilAt } from '../sprites';
import { renderHeartbeatAudio } from './audio';
import { bakeCast, type Cast } from './cast';
import { drawCoilShot, HEART_AT } from './coils';
import { drawCta } from './cta';
import { drawGameShot } from './game';
import { drawSwallowShot } from './swallow';
import { boilTime, bloomAt, captionAlpha, CAPTIONS, LEADING, LOOP_S, sceneAt, wrap } from './story';

/** Draws the "this snake squeezes until the heart stops" short (story.ts has the beats). */

/** Far enough from the heart to cover the frame's corners. */
const BLOOM_R = 1420;

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

function drawWords(ctx: CanvasRenderingContext2D, t: number): void {
  for (const c of CAPTIONS) {
    const alpha = captionAlpha(c, t);
    if (alpha <= 0) continue;
    const ink = c.onDark ? PAPER_ON_DARK : INK_ON_PAPER;
    c.lines.forEach((line, i) => drawTextLine(ctx, line, VIDEO.width / 2, c.y + i * c.size * LEADING, c.size, 700, alpha, ink));
  }
}

function drawFrame(ctx: CanvasRenderingContext2D, cast: Cast, t: number): void {
  const boil = boilAt(boilTime(t));
  const scene = sceneAt(t);
  if (scene === 'coil') drawCoilShot(ctx, cast, t, boil);
  else if (scene === 'swallow') drawSwallowShot(ctx, cast, t, boil);
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
