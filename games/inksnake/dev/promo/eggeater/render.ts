import { makeDraw } from '../../../src/art/kit';
import { drawSpokenLine, INK_ON_PAPER, PAPER_ON_DARK } from '../captions';
import { type Short, VIDEO } from '../short';
import { boilAt } from '../sprites';
import { renderEggeaterAudio } from './audio';
import { across, along, inkTail, inkTube, LINE, onBody, paintTube, sliceAt } from './bodyArt';
import { type Pt } from '../../../src/art/pen';
import { groundAt, STRAIGHT } from './path';
import { drawEgg, drawGlow, drawLump, drawShell } from './eggArt';
import { backbone, brackets, burst, crumbs, flash, ring, xrayInterior, xrayRim } from './fx';
import { drawHead } from './headArt';
import { at, type BodyModel, modelAt } from './model';
import { drawBackdrop, drawGrade, isNight } from './scene';
import { captionAt } from './script';
import {
  BODY_LEN, bracketsShown, type Camera, cameraAt, CAM_Y, CRACK_AT, crackFlash, cracked, eggLift, HEAD_AT, HINGE_S, headPulse, LOOP_S, lid, POP_AT, ringAt,
  shakeAt, shellAt, squeeze, tongue, wrap,
} from './story';

/** Draws the "egg-eater swallows eggs wider than its head" short (story.ts has the beats). */

const HOT_ON_DARK = '#f2cf55';
const HOT_ON_LIGHT = '#b3322b';

/** The stretches of the body (as s ranges) that are on screen for this camera. */
function visibleRuns(m: BodyModel, cam: Camera): (readonly [number, number])[] {
  const halfW = VIDEO.width / 2 / cam.k + 6;
  const top = cam.cy - CAM_Y / cam.k - 6;
  const bottom = cam.cy + (VIDEO.height - CAM_Y) / cam.k + 6;
  const runs: [number, number][] = [];
  let open: number | null = null;
  for (let s = 0; s <= BODY_LEN; s += 1) {
    const g = groundAt(s);
    const h = (at(m.top, s) + 2) * g.p;
    const inView = Math.abs(g.x - cam.cx) < halfW + h && g.y + 3 > top && g.y - h < bottom;
    if (inView && open === null) open = Math.max(0, s - 3);
    if (!inView && open !== null) {
      runs.push([open, Math.min(BODY_LEN, s + 2)]);
      open = null;
    }
  }
  if (open !== null) runs.push([open, BODY_LEN]);
  return runs;
}

/** Past here the body has turned back across the foreground. */
const NEAR_S = STRAIGHT + 6;

function paintRuns(draw: (seed: number) => ReturnType<typeof makeDraw>, m: BodyModel, runs: readonly (readonly [number, number])[], mul: number): void {
  for (const [a, b] of runs) {
    paintTube(draw(5 + Math.round(a)), m, a, b, { mul });
    inkTube(draw(6 + Math.round(a)), m, a, b);
    if (b >= BODY_LEN) inkTail(draw(7), m);
  }
}

/** The ground shadow under the body, soft at its edge. */
function bellyShadow(d: ReturnType<typeof makeDraw>, m: BodyModel, s0: number, s1: number): void {
  const ss = along(s0, s1, 1);
  const edge = (k: number): Pt[] => ss.map((s) => {
    const g = groundAt(s);
    const r = (at(m.top, s) - at(m.bot, s)) / 2;
    return { x: g.x + 0.8 * k, y: g.y + (0.25 + k * (0.7 + 0.12 * r)) * g.p };
  });
  d.pen.fill([...edge(-0.2), ...edge(1.6).reverse()], '#1c120a', 0.16);
  d.pen.fill([...edge(-0.2), ...edge(0.8).reverse()], '#1c120a', 0.26);
}

/** The jaws' squeeze marks on "INSIDE": short arcs either side of the swollen neck. */
function squeezeMarks(d: ReturnType<typeof makeDraw>, m: BodyModel, t: number): void {
  const q = squeeze(t);
  if (q <= 0.012 || !m.object) return;
  const { x, rx } = m.object;
  for (const side of [-1, 1] as const) {
    for (const dy of [-26, -17, -8]) {
      const sx = x + side * (rx + 5 + q * 40);
      d.pen.hair([{ x: sx, y: dy - 2.6 }, { x: sx + side * 1.6, y: dy }, { x: sx, y: dy + 2.6 }], 0.5, '#fff0c0', Math.min(1, q * 14));
    }
  }
}

function drawWorld(ctx: CanvasRenderingContext2D, t: number, boil: number): void {
  const cam = cameraAt(t);
  const shake = shakeAt(t);
  const m = modelAt(t);
  drawBackdrop(ctx, t, cam, shake, boil);
  ctx.save();
  ctx.translate(VIDEO.width / 2 + shake.x, CAM_Y + shake.y);
  ctx.scale(cam.k, cam.k);
  ctx.translate(-cam.cx, -cam.cy);
  const draw = (seed: number) => makeDraw(ctx, seed * 13 + boil * 1009, boil, 0, LINE);
  const runs = visibleRuns(m, cam);
  const sEnd = Math.min(STRAIGHT, Math.ceil(cam.cx + VIDEO.width / 2 / cam.k + 12));
  for (const [a, b] of runs) bellyShadow(draw(1), m, a, b);
  // The body's far loop, nearer than the neck, before the x-ray's dim so it sits back in the dark with the ground.
  const skin = 1 - 0.86 * m.xray;
  const nearRuns = runs.map(([a, b]) => [Math.max(a, NEAR_S), b] as const).filter(([a, b]) => b > a);
  const farRuns = runs.map(([a, b]) => [Math.max(a, HINGE_S), Math.min(b, NEAR_S)] as const).filter(([a, b]) => b > a);
  if (m.xray > 0.01) paintRuns(draw, m, nearRuns, 1);
  // The dim of the x-ray: the world behind goes dark.
  if (m.xray > 0.01) {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 0.5 * m.xray;
    ctx.fillStyle = '#04101a';
    ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
    ctx.restore();
  }
  xrayInterior(draw(2), m, sEnd);
  // The egg, or the crushed shell; whole eggs sit on the ground (or fall in).
  const lift = eggLift(t);
  if (m.object) {
    const { x, rx, ry, cy, whole } = m.object;
    if (whole) drawEgg(draw(3), x, -cy - lift, rx, ry, cracked(t), lift);
    else drawLump(draw(3), x, -cy, rx, ry);
  }
  backbone(draw(4), m, m.object?.x ?? 70, t);
  // The body behind the head (nearer stretches last), then the head.
  paintRuns(draw, m, farRuns, skin);
  if (m.xray <= 0.01) paintRuns(draw, m, nearRuns, 1);
  xrayRim(draw(8), m, sEnd);
  if (runs.some(([a]) => a < HINGE_S + 4)) drawHead(draw(9), m, lid(t), tongue(t));
  // The yolk's glow, shining through the skin.
  if (m.yolk) {
    const k = sliceAt(m, m.yolk.x);
    const c = onBody(k, 0);
    const y = (c.y + across(k, 1).y) / 2;
    drawGlow(ctx, c.x, y, m.yolk.glow, 22 * k.g.p);
    drawGlow(ctx, c.x, y, m.yolk.glow, 10 * k.g.p);
  }
  // The shell, out of the mouth and folded flat.
  const shell = shellAt(t);
  if (shell) drawShell(draw(10), shell);
  // Effects.
  const fx = draw(11);
  ring(fx, 14, -18, ringAt(t, HEAD_AT, 0.55), 34, '#fff2c0');
  brackets(fx, m, bracketsShown(t), headPulse(t));
  squeezeMarks(fx, m, t);
  const crackAt = m.object?.x ?? 70;
  burst(fx, crackAt, -22, ringAt(t, CRACK_AT, 0.45), 30, '#fff0b0', 14);
  ring(fx, crackAt, -22, ringAt(t, CRACK_AT, 0.5), 36, '#fff0b0');
  burst(fx, 2, -8, ringAt(t, POP_AT, 0.4), 16, '#fff6dc');
  crumbs(fx, 2, -8, ringAt(t, POP_AT, 0.7));
  ctx.restore();
  flash(ctx, VIDEO.width, VIDEO.height, crackFlash(t) * 0.8);
  drawGrade(ctx, t);
}

export function createEggeater(ctx: CanvasRenderingContext2D): Short {
  const draw = (seconds: number): void => {
    const t = wrap(seconds);
    ctx.save();
    drawWorld(ctx, t, boilAt(t));
    ctx.restore();
    const now = captionAt(t);
    if (now) {
      const night = isNight(now.line.from + 0.01);
      drawSpokenLine(ctx, now.line.words.map((w) => w.text), now.word, night ? PAPER_ON_DARK : INK_ON_PAPER, night ? HOT_ON_DARK : HOT_ON_LIGHT);
    }
  };
  return { loopSeconds: LOOP_S, draw, audio: renderEggeaterAudio };
}
