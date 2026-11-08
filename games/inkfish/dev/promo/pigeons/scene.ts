import { INK, makeCanvas, type Pt } from '../../../src/art/pen';
import { dab, softLine } from '../seal/art/paint';
import { bodyEdge, type BodyLook, drawSideBody, drawSideHead, onBody, onSide, POUR_EDGE, SIDE_K, type SideLook, type SidePose, tailEnd } from './art/catfishSide';
import { drawCatfishTop, drawTopWhiskers, topMarks } from './art/catfishTop';
import { drawPigeon, drawSeizedBody, drawSeizedFront, onPigeon, seized } from './art/pigeon';
import { drawBackdrop, drawDepthFade, drawFoam, drawRipples, drawWaterOver, waterPath } from './art/river';
import { drawBathSplash, drawBurst, drawFeather, drawHalo, drawPour, drawRush, drawWings } from './art/spray';
import {
  BURST_AT, camAt, cyc, featherAt, FISH_LEN, fishAt, flashAt, footWorld, LOOP_S, moodAt, MOVE_AT, pigeonAt, shadowAlpha, shakeAt, SIDE_ANCHOR, SLOTS, SO_AT, sprayAges, wrap, type FishState,
} from './story';
import { ramp, VIDEO } from '../short';

/** One frame of the world: the river, the catfish, the pigeons, the spray, seen through the moving camera. */

/** A drop's life, a whole fraction of the loop. */
const DROP_S = LOOP_S / 20;

const sidePose = (f: FishState): SidePose => ({ x: f.pose.x, y: f.pose.y, k: SIDE_K * (f.pose.len / FISH_LEN), rot: f.pose.rot });

/** Wet gravel under the chin, and the water it brought with it rushing out over the stones. */
function paintWetGround(ctx: CanvasRenderingContext2D, p: SidePose, t: number, amount: number): void {
  const c = onSide(p, { x: 500, y: 1040 });
  const r = p.k * 620;
  ctx.save();
  ctx.globalAlpha = amount;
  ctx.translate(c.x, c.y);
  ctx.scale(1, 0.5);
  dab(ctx, 0, 30, r * 1.4, '30,34,28', 0.9);
  ctx.restore();
  drawRush(ctx, c, r, t, DROP_S * 4, amount);
}

/** The river torn open round the body where it comes out, and flung up by the tail. */
function drawBodySpray(ctx: CanvasRenderingContext2D, body: BodyLook, t: number, wet: number): void {
  const tail = onBody(SIDE_ANCHOR, tailEnd(body));
  drawWings(ctx, tail, 70, 46, t, DROP_S * 2, wet);
  drawHalo(ctx, tail, 60, 40, t, DROP_S, wet, 5);
  drawPour(ctx, bodyEdge(body, 0.32, 0.8, 16).map((q) => onBody(SIDE_ANCHOR, q)), 34, t, DROP_S, wet * 0.8);
}

const layer = makeCanvas(VIDEO.width, VIDEO.height);

/** Paints through a clear full-frame layer, under the same camera, laid in at `alpha`. */
function faded(ctx: CanvasRenderingContext2D, alpha: number, paint: (c: CanvasRenderingContext2D) => void): void {
  if (alpha > 0.995) {
    paint(ctx);
    return;
  }
  const c = layer.ctx;
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.clearRect(0, 0, VIDEO.width, VIDEO.height);
  c.setTransform(ctx.getTransform());
  paint(c);
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = alpha;
  ctx.drawImage(layer.canvas, 0, 0);
  ctx.restore();
}

function drawSideFish(ctx: CanvasRenderingContext2D, f: FishState, t: number, ink: number): void {
  const p = sidePose(f);
  const a = 1 - f.sub;
  const wet = a * f.pour;
  const body: BodyLook = { back: f.pose.back, lead: f.pose.lead, beat: f.pose.beat };
  if (f.furrow > 0.01) softLine(ctx, [onSide(p, { x: 300, y: 1050 }), onSide(p, { x: 460, y: 1020 }), onBody(SIDE_ANCHOR, { x: 900, y: 900 })], 150, '#3b3a2e', 0.55 * f.furrow, 18);
  paintWetGround(ctx, p, t, a);
  drawWings(ctx, onSide(p, { x: 500, y: 800 }), p.k * 470, p.k * 330, t, DROP_S * 2, wet);
  drawSprays(ctx, t);
  const bird = f.holds >= 0 ? seized(cyc(t, 31), ink / p.k) : null;
  const head: SideLook = {
    gape: f.gape,
    sway: cyc(t, 6),
    inMouth: bird ? (c) => drawSeizedBody(c, bird) : undefined,
    overJaws: bird ? (c) => drawSeizedFront(c, bird) : undefined,
    ink: ink / p.k,
  };
  // The fish as one solid thing, so nothing shows through it as the river takes it.
  faded(ctx, a, (c) => {
    drawSideBody(c, SIDE_ANCHOR, body, ink);
    drawSideHead(c, p, head);
  });
  drawDepthFade(ctx, 800);
  drawWaterOver(ctx, f.drown * 0.6);
  drawBodySpray(ctx, body, t, wet);
  drawPour(ctx, POUR_EDGE.map((q) => onSide(p, q)), 60 * (p.k / SIDE_K) * SIDE_K * 2.6, t, DROP_S, wet * 0.9);
  drawHalo(ctx, onSide(p, { x: 470, y: 760 }), p.k * 440, p.k * 300, t, DROP_S, wet);
}

function drawTopFish(ctx: CanvasRenderingContext2D, f: FishState, t: number): void {
  if (!f.top) return;
  const a = shadowAlpha(t);
  ctx.save();
  waterPath(ctx);
  ctx.clip('evenodd');
  drawCatfishTop(ctx, f.top, a * 0.94);
  ctx.restore();
  drawDepthFade(ctx, 790);
  // The river's skin over it: thin, so the fish stays dark and clear.
  drawWaterOver(ctx, 0.12);
  drawRipples(ctx, topMarks(f.top), 34, a);
}

function drawBirds(ctx: CanvasRenderingContext2D, t: number, ink: number): void {
  const order = SLOTS.map((s, id) => ({ id, ground: s.ground })).sort((a, b) => a.ground - b.ground);
  for (const { id } of order) {
    const b = pigeonAt(id, t);
    if (!b.visible) continue;
    if (b.pose.bath) drawBathSplash(ctx, b.pose.x, b.pose.y + 40, 54, t, DROP_S, b.pose.bath, 30 + id);
    drawPigeon(ctx, { ...b.pose, ink });
  }
}

/** The nervous bird's sweat drop, running down from its head. */
function drawSweat(ctx: CanvasRenderingContext2D, t: number, ink: number): void {
  const b = pigeonAt(0, t);
  const age = (t - SO_AT - 0.5) % 1.2;
  if (t < SO_AT + 0.5 || t > BURST_AT || !b.visible) return;
  const head = onPigeon(b.pose, { x: 24, y: -44 });
  const [x, y, s] = [head.x - 12, head.y + age * 60, 9 + 2 * Math.sin(age * 5)];
  ctx.save();
  ctx.globalAlpha = 1 - ramp(age, 0.8, 1.2);
  ctx.fillStyle = '#bfe8f4';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.6 * ink;
  ctx.beginPath();
  ctx.moveTo(x, y - s * 1.6);
  ctx.quadraticCurveTo(x + s, y, x, y + s * 0.5);
  ctx.quadraticCurveTo(x - s, y, x, y - s * 1.6);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

/** Little ink strokes round a foot that jerks, so the twitch reads at phone size. */
function drawTwitch(ctx: CanvasRenderingContext2D, t: number, ink: number): void {
  const u = pigeonAt(2, t).pose.foot ?? 0;
  if (u < 0.15) return;
  const f = footWorld();
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.lineCap = 'round';
  ctx.lineWidth = 3.4 * ink;
  ctx.globalAlpha = Math.min(1, u * 1.5);
  for (const a of [0.8, 1.35, 1.9, 2.45]) {
    ctx.beginPath();
    ctx.moveTo(f.x - 8 + Math.cos(a) * 30, f.y + 10 + Math.sin(a) * 30);
    ctx.lineTo(f.x - 8 + Math.cos(a) * (30 + 20 * u), f.y + 10 + Math.sin(a) * (30 + 20 * u));
    ctx.stroke();
  }
  ctx.restore();
}

function drawSprays(ctx: CanvasRenderingContext2D, t: number): void {
  const ages = sprayAges(t);
  drawBurst(ctx, { x: 720, y: 1040 }, ages.hook, 1.1, 11);
  drawBurst(ctx, { x: 720, y: 1020 }, ages.lunge, 1.35, 5);
  drawBurst(ctx, { x: 850, y: 1000 }, ages.dive, 1.15, 17);
}

function wash(ctx: CanvasRenderingContext2D, mode: GlobalCompositeOperation, colour: string, alpha: number): void {
  if (alpha <= 0.005) return;
  ctx.save();
  ctx.globalCompositeOperation = mode;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = colour;
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
  ctx.restore();
}

function drawWorld(ctx: CanvasRenderingContext2D, f: FishState, t: number, ink: number): void {
  drawBackdrop(ctx);
  if (f.mode === 'top') drawTopFish(ctx, f, t);
  drawFoam(ctx, t, LOOP_S);
  if (f.mode === 'top' && f.top && f.tips) drawTopWhiskers(ctx, f.top, f.tips, cyc(t, 14) + ramp(wrap(t), MOVE_AT - 0.1, MOVE_AT + 0.1) * 5, shadowAlpha(t));
  drawBirds(ctx, t, ink);
  drawTwitch(ctx, t, ink);
  if (f.mode === 'side') drawSideFish(ctx, f, t, ink);
  drawSweat(ctx, t, ink);
  if (f.mode !== 'side') drawSprays(ctx, t);
  const fe = featherAt(t);
  drawFeather(ctx, fe.x, fe.y, 30, fe.turn, fe.alpha);
}

/** The whole frame: world through the camera, then the mood's colour washes and the flash. */
export function drawScene(ctx: CanvasRenderingContext2D, seconds: number): void {
  const t = wrap(seconds);
  const cam = camAt(t);
  const shake = shakeAt(t);
  const fish = fishAt(t);
  ctx.save();
  ctx.fillStyle = '#7fb8ac';
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
  ctx.translate(VIDEO.width / 2 + shake.x, VIDEO.height / 2 + shake.y);
  ctx.scale(cam.zoom, cam.zoom);
  ctx.translate(-cam.cx, -cam.cy);
  drawWorld(ctx, fish, t, Math.max(0.45, Math.min(1, 1.1 / cam.zoom)));
  ctx.restore();
  const mood = moodAt(t);
  wash(ctx, 'saturation', '#808080', mood.drain);
  wash(ctx, 'multiply', '#9fb0c8', 0.4 * mood.cool);
  wash(ctx, 'soft-light', '#ffd98a', 0.55 * mood.warm);
  vignette(ctx, 0.5 * mood.drain);
  wash(ctx, 'source-over', '#ffffff', flashAt(t));
}

function vignette(ctx: CanvasRenderingContext2D, strength: number): void {
  if (strength <= 0.01) return;
  const g = ctx.createRadialGradient(VIDEO.width / 2, 900, 300, VIDEO.width / 2, 900, 1300);
  g.addColorStop(0, 'rgba(10,14,24,0)');
  g.addColorStop(1, `rgba(10,14,24,${strength})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
}
