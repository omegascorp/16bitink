import { INK, RED } from '../../../src/art/palette';
import { makeCanvas } from '../../../src/art/pen';
import { drawTextLine } from '../captions';
import { type Short, VIDEO } from '../short';
import { boilAt, drawBody, drawBodyShadow, drawSprite, type Sprite } from '../sprites';
import { renderEagleSnatchAudio } from './audio';
import { bakeCast, type Cast } from './art';
import { drawCarriedBody, drawCarriedShadow, drawFeet } from './body';
import { carriedAt, type Carried } from './carry';
import { drawAgamaInMouth, drawLips, drawStretchedHead } from './mouth';
import {
  agamaAt, alarmAt, bodyOf, CAPTIONS, captionAlpha, coreAt, CREDIT_TEXT, eagleAt, gapeAt, headOf, headPose, KB, KS, LOOP_S, ringAt, SCORE_TEXT, scoreAt, scrollAt,
  T_CATCH, T_NEW, tongueOut, TILE_H, W, wrap, type Agama, type Core, type Eagle, type HeadAt, type Pt, type RingMark,
} from './story';

/** Draws the "Snake Catches Lizard, Eagle Catches Snake" short (story.ts has the beats). */

const GROUND_X = -10;
const SHADOW_DIR: Pt = { x: -0.2, y: 0.3 };

/** The slope, scrolled; every other tile row mirrored so the rows meet, and two rows (one period) look alike. */
function drawGround(ctx: CanvasRenderingContext2D, cast: Cast, scroll: number): void {
  ctx.fillStyle = '#9a8f7c';
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
  const off = scroll % (2 * TILE_H);
  const wide = (cast.ground.width / cast.ground.height) * TILE_H;
  for (let i = -2; i * TILE_H + off < VIDEO.height; i++) {
    const y = off + i * TILE_H;
    const odd = ((i % 2) + 2) % 2 === 1;
    ctx.save();
    ctx.translate(GROUND_X, odd ? y + TILE_H : y);
    ctx.scale(1, odd ? -1 : 1);
    ctx.drawImage(cast.ground, 0, 0, wide, TILE_H);
    ctx.restore();
  }
}

function snakePose(core: Core): { spine: Pt[]; widths: number[]; along: number; offset: number } {
  const b = bodyOf(core);
  return { spine: [...b.spine], widths: [...b.widths], along: KS, offset: 0 };
}

/** A head, and its meal: the agama's hidden front, then its lips, then the stretched head over them. */
function drawHead(ctx: CanvasRenderingContext2D, cast: Cast, h: HeadAt, t: number, boil: number, meal: Agama | null): void {
  const pose = headPose(t);
  if (meal && pose === 'swallow') {
    drawAgamaInMouth(ctx, cast.agama[meal.pose], boil, meal, h);
    drawLips(ctx, meal);
  }
  if (pose === 'swallow') drawStretchedHead(ctx, cast.head.shut, boil, h, gapeAt(t));
  else drawSprite(ctx, cast.head[pose], boil, { x: h.x, y: h.y, rotation: h.heading, scale: KS * h.scale });
}

/** The new snake on the rock, and the agama: on the rock (under the snake) until the strike, then in its mouth. */
function drawSnake(ctx: CanvasRenderingContext2D, cast: Cast, core: Core, boil: number): void {
  const a = agamaAt(core.t);
  const caught = core.t >= T_CATCH;
  if (!caught) drawSprite(ctx, cast.agama[a.pose], boil, { x: a.x, y: a.y, rotation: a.angle, scale: a.scale });
  drawBody(ctx, cast.strip, boil, snakePose(core));
  const h: HeadAt = { ...headOf(core), scale: 1 };
  if (tongueOut(core.t)) {
    const tip = { x: h.x + Math.cos(h.heading) * 20.4 * KS, y: h.y + Math.sin(h.heading) * 20.4 * KS };
    drawSprite(ctx, cast.tongue, boil, { x: tip.x, y: tip.y, rotation: h.heading + 0.15 * Math.sin(core.t * 70), scale: KS });
  }
  drawHead(ctx, cast, h, core.t, boil, caught ? a : null);
}

/** The last hunt's snake, lifted in the eagle's feet (frame 1 is it on the rock). */
function drawCarried(ctx: CanvasRenderingContext2D, cast: Cast, c: Carried, boil: number): void {
  drawCarriedBody(ctx, cast.strip, boil, c);
  drawHead(ctx, cast, c.head, LOOP_S, boil, c.agama);
}

/** A dark copy of a sprite, for the shadow it throws on the ground. */
function drawShadow(ctx: CanvasRenderingContext2D, scratch: CanvasRenderingContext2D, sprite: Sprite, boil: number, e: Eagle, alpha: number): void {
  const [w, h] = [VIDEO.width, VIDEO.height];
  scratch.clearRect(0, 0, w, h);
  scratch.globalCompositeOperation = 'source-over';
  drawSprite(scratch, sprite, boil, { x: e.x + SHADOW_DIR.x * e.alt, y: e.y + SHADOW_DIR.y * e.alt, rotation: e.heading, scale: KB });
  scratch.globalCompositeOperation = 'source-in';
  scratch.fillStyle = INK;
  scratch.fillRect(0, 0, w, h);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.drawImage(scratch.canvas, 0, 0);
  ctx.restore();
}

function drawEagle(ctx: CanvasRenderingContext2D, cast: Cast, e: Eagle, boil: number): void {
  drawSprite(ctx, cast.eagle[e.pose], boil, { x: e.x, y: e.y, rotation: e.heading, scale: KB * e.scale, alpha: e.alpha });
}

/** The game's aim ring: dotted red, wide and faint as it aims, tight and strong at the blow; a cross inside once it is nearly on. */
function drawRing(ctx: CanvasRenderingContext2D, ring: RingMark): void {
  const dot = (2.4 + ring.tau * 1.4) * KB * 0.6;
  const n = Math.max(10, Math.round((ring.r * Math.PI * 2) / (dot * 4.5)));
  ctx.save();
  ctx.fillStyle = RED;
  ctx.globalAlpha = ring.alpha;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(ring.x + Math.cos(a) * ring.r, ring.y + Math.sin(a) * ring.r, dot, 0, Math.PI * 2);
    ctx.fill();
  }
  if (ring.tau > 0.5) {
    ctx.strokeStyle = RED;
    ctx.lineWidth = dot;
    ctx.lineCap = 'round';
    const k = ring.r * 0.4;
    ctx.beginPath();
    ctx.moveTo(ring.x - k, ring.y);
    ctx.lineTo(ring.x + k, ring.y);
    ctx.moveTo(ring.x, ring.y - k);
    ctx.lineTo(ring.x, ring.y + k);
    ctx.stroke();
  }
  ctx.restore();
}

function drawWords(ctx: CanvasRenderingContext2D, t: number): void {
  const h = headOf(coreAt(t < T_NEW ? LOOP_S : t));
  const alarm = alarmAt(t);
  if (alarm) {
    ctx.save();
    ctx.translate(h.x - 190, h.y - 330 - 20 * alarm.rise);
    ctx.rotate(-0.14);
    ctx.scale(0.6 + 0.6 * Math.min(1, alarm.rise * 4), 0.6 + 0.6 * Math.min(1, alarm.rise * 4));
    drawTextLine(ctx, '!', 0, 80, 300, 700, alarm.alpha, { fill: RED, halo: '#fffaf0' });
    ctx.restore();
  }
  const score = scoreAt(t);
  if (score) drawTextLine(ctx, SCORE_TEXT, h.x + 230, h.y - 150 - 90 * score.rise, 128, 700, score.alpha);
  for (const c of CAPTIONS) drawTextLine(ctx, c.text, VIDEO.width / 2, c.y, c.size, 700, captionAlpha(c, t));
  // The credit steps aside while the eagle passes over its corner.
  const e = eagleAt(t);
  const near = e ? Math.hypot(e.x - CREDIT_TEXT.x, e.y - CREDIT_TEXT.y) : 1e9;
  drawTextLine(ctx, CREDIT_TEXT.text, CREDIT_TEXT.x, CREDIT_TEXT.y, CREDIT_TEXT.size, 700, CREDIT_TEXT.alpha * Math.min(1, Math.max(0, (near - 420) / 200)));
}

function drawFrame(ctx: CanvasRenderingContext2D, cast: Cast, scratch: CanvasRenderingContext2D, t: number): void {
  const boil = boilAt(t);
  const lifting = t < T_NEW;
  const core = coreAt(lifting ? LOOP_S : t);
  drawGround(ctx, cast, scrollAt(t));
  // The slope is darkened, and more round the action, so the animals stand out of it.
  ctx.save();
  ctx.fillStyle = INK;
  ctx.globalAlpha = 0.2;
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
  const mid = headOf(core);
  const pool = ctx.createRadialGradient(mid.x, mid.y + 250, 80, mid.x, mid.y + 250, 900);
  pool.addColorStop(0, 'rgba(20,28,60,0.3)');
  pool.addColorStop(1, 'rgba(20,28,60,0)');
  ctx.globalAlpha = 1;
  ctx.fillStyle = pool;
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
  ctx.restore();
  const eagle = eagleAt(t);
  const carried = lifting ? carriedAt(t) : null;
  // Shadows on the rock: the snake's (softer and nearer it than the eagle's, as it hangs lower), then the eagle's.
  if (carried) drawCarriedShadow(ctx, carried);
  else drawBodyShadow(ctx, snakePose(core), W, 1);
  if (eagle) drawShadow(ctx, scratch, cast.eagle[eagle.pose], boil, eagle, 0.2 * eagle.alpha);
  // The snake under the eagle, held in its feet; the eagle over all of it.
  if (carried) drawCarried(ctx, cast, carried, boil);
  else drawSnake(ctx, cast, core, boil);
  if (carried && eagle) drawFeet(ctx, cast.grip, boil, carried, eagle.heading);
  const ring = ringAt(t);
  if (ring) drawRing(ctx, ring);
  if (eagle) drawEagle(ctx, cast, eagle, boil);
  drawWords(ctx, t);
}

export function createEagleSnatch(ctx: CanvasRenderingContext2D): Short {
  const cast = bakeCast();
  const { ctx: scratch } = makeCanvas(VIDEO.width, VIDEO.height);
  return { loopSeconds: LOOP_S, draw: (seconds) => drawFrame(ctx, cast, scratch, wrap(seconds)), audio: renderEagleSnatchAudio };
}
