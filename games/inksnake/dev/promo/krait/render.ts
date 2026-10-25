import { drawSpokenLine, PAPER_ON_DARK } from '../captions';
import { type Short } from '../short';
import { boilAt } from '../sprites';
import { renderKraitAudio } from './audio';
import { makeCast, type Cast } from './cast';
import { biteAt, drawCrack, paintWalls, type CrackSet } from './crack';
import {
  drawBlack, drawBoard, drawBreath, drawBubbles, drawClock, drawDrop, drawFlash, drawGrade, drawNote, drawRipples, drawWaterLight, drawZs,
} from './marks';
import { breathAt, cayCamera, cayHeadAt, cayKrait, headInCrack, hookCamera, hookDark, hookKrait } from './moves';
import { CORAL_A, CRACK } from './reef';
import {
  asleepFor, breathShown, TEXT, CAY_BUBBLES, CAY_RIPPLES, captionAt, clockTurns, HOOK_BUBBLES, hoursLabel, kraitLabel, venomLabel,
} from './script';
import { type Camera, drawKrait, headOn, toScreen } from './snake';
import { BITE_AT, CRACK_FROM, gradeAt, hookClock, LOOP_S, sceneAt, VENOM_AT, wrap } from './story';

/** Draws the "this snake swallows eels whole" short (story.ts has the beats). */

/** The krait's yellow lip, for the word being said. */
const HOT = '#f2cf55';

/** The dark opening of the crack, under the krait. */
function drawCrackMouth(ctx: CanvasRenderingContext2D, cam: Camera): void {
  const c = toScreen(cam, CRACK);
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.scale(cam.zoom, cam.zoom);
  const g = ctx.createRadialGradient(0, -2, 1, 0, 0, 15);
  g.addColorStop(0, 'rgba(4,7,16,0.98)');
  g.addColorStop(0.6, 'rgba(8,12,26,0.9)');
  g.addColorStop(1, 'rgba(8,12,26,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(0, -1, 15, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Coral head A drawn again over the krait's head as it slides under the rock into the crack. */
function drawOverCrack(ctx: CanvasRenderingContext2D, cast: Cast, cam: Camera, inside: number): void {
  if (inside <= 0) return;
  const c = toScreen(cam, CORAL_A);
  ctx.save();
  ctx.beginPath();
  ctx.arc(c.x, c.y, (CORAL_A.r + 4) * cam.zoom, 0, Math.PI * 2);
  ctx.clip();
  drawBoard(ctx, cast.board, cam);
  ctx.restore();
  // The dark of the crack swallowing the head where it goes in.
  const m = toScreen(cam, { x: CRACK.x, y: CRACK.y - 6 });
  ctx.save();
  const g = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, 15 * cam.zoom);
  g.addColorStop(0, `rgba(4,7,16,${0.95 * inside})`);
  g.addColorStop(1, 'rgba(4,7,16,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(m.x, m.y, 15 * cam.zoom, 11 * cam.zoom, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawHook(ctx: CanvasRenderingContext2D, cast: Cast, t: number, boil: number): void {
  const cam = hookCamera(t);
  const u = hookClock(t);
  drawBoard(ctx, cast.board, cam);
  drawCrackMouth(ctx, cam);
  drawWaterLight(ctx, cam, t);
  drawBubbles(ctx, cam, HOOK_BUBBLES, u);
  drawKrait(ctx, cast, cam, hookKrait(t), boil);
  drawOverCrack(ctx, cast, cam, headInCrack(t));
  drawGrade(ctx, gradeAt(t), null, 0);
  drawBlack(ctx, hookDark(t));
  drawNote(ctx, 'banded sea krait', TEXT.krait.x, TEXT.krait.y, TEXT.krait.size, kraitLabel(t));
}

function drawInside(ctx: CanvasRenderingContext2D, cast: Cast, set: CrackSet, t: number, boil: number): void {
  drawCrack(ctx, cast, set, t, boil);
  const bite = biteAt(t);
  drawFlash(ctx, bite, (t - BITE_AT + 0.02) / 0.45);
  const venom = venomLabel(t);
  if (venom > 0) {
    const fall = Math.max(0, t - VENOM_AT) * TEXT.drop.fall;
    drawDrop(ctx, bite.x + TEXT.drop.dx, bite.y + TEXT.drop.dy + fall, TEXT.drop.r, venom);
    drawNote(ctx, 'venom', bite.x + TEXT.venom.dx, bite.y + TEXT.venom.dy, TEXT.venom.size, venom);
  }
  drawGrade(ctx, gradeAt(t), null, 0);
  drawBlack(ctx, 1 - (t - CRACK_FROM) / 0.3);
}

function drawCay(ctx: CanvasRenderingContext2D, cast: Cast, t: number, boil: number): void {
  const cam = cayCamera(t);
  drawBoard(ctx, cast.board, cam);
  drawWaterLight(ctx, cam, t);
  drawRipples(ctx, cam, CAY_RIPPLES, t);
  drawBubbles(ctx, cam, CAY_BUBBLES, t);
  const pose = cayKrait(t);
  drawKrait(ctx, cast, cam, pose, boil);
  drawBreath(ctx, cam, cayHeadAt(t), breathAt(t), breathShown(t), t);
  drawGrade(ctx, gradeAt(t), toScreen(cam, { x: 812, y: 300 }), 84 * cam.zoom);
  const hours = hoursLabel(t);
  drawClock(ctx, TEXT.clock.x, TEXT.clock.y, TEXT.clock.r, clockTurns(t), hours);
  drawNote(ctx, 'up to 2 hours', TEXT.hours.x, TEXT.hours.y, TEXT.hours.size, hours);
  const asleep = asleepFor(t);
  if (asleep > 0) {
    const h = headOn(cam, pose);
    drawZs(ctx, { x: h.at.x + TEXT.zs.dx, y: h.at.y + TEXT.zs.dy }, asleep, TEXT.zs.size, TEXT.zs.rise);
  }
}

export function createKrait(ctx: CanvasRenderingContext2D): Short {
  const cast = makeCast();
  const set: CrackSet = { walls: paintWalls() };
  const draw = (seconds: number): void => {
    const t = wrap(seconds);
    const boil = boilAt(t);
    ctx.save();
    const scene = sceneAt(t);
    if (scene === 'hook') drawHook(ctx, cast, t, boil);
    else if (scene === 'crack') drawInside(ctx, cast, set, t, boil);
    else drawCay(ctx, cast, t, boil);
    ctx.restore();
    const now = captionAt(t);
    if (now) drawSpokenLine(ctx, now.line.words.map((w) => w.text), now.word, PAPER_ON_DARK, HOT);
  };
  return { loopSeconds: LOOP_S, draw, audio: renderKraitAudio };
}
