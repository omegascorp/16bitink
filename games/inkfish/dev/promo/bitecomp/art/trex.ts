import { INK } from '../../../../src/art/pen';
import { BOIL_FPS, BOIL_FRAMES } from '../../../../src/art/textures';
import { createRng } from '../../../../src/logic/rng';
import type { KitEntry } from '../../foodchain/kit';
import { type Box, type Bucket, blit, frames, lazily, path, screenScale } from '../../seal/art/paint';
import type { DrawHead } from './contract';
import { paintBody, paintJaw } from './trexPaint';
import { drawLipShadow, drawLowerTeeth, drawUpperTeeth } from './trexTeeth';
import { CHEEK, CORNER, EYE, EYE_R, HEAD_LEN, HINGE, JAW_MAX, JAW_TOP, LIP, MOUTH_EDGE, THROAT, turned } from './trexShape';

/**
 * Tyrannosaurus rex, head and neck, side view facing right (see contract.ts),
 * painted like the great white and the saltwater crocodile: a deep, broad, boxy
 * skull in earth-brown and olive, small pebbly scales with larger scutes along
 * the brow, the lacrimal horn and the bumps above and behind a forward-set eye,
 * a pale countershaded throat. Lipped, as current science suggests: shut, the
 * scaly lips hide the teeth; open, the huge banana-shaped teeth show.
 *
 * Sprites (head and neck; the lower jaw) are baked per line-boil frame at a few
 * sizes. The inside of the mouth, the teeth and the eye (with its blink) are
 * live; the neck breathes by bending a little, column by column, behind the skull.
 */

const BUCKETS: readonly Bucket[] = [
  { res: 1.2, w: 1.3 },
  { res: 2.4, w: 1.15 },
  { res: 4, w: 1.05 },
  { res: 6.5, w: 1 },
  { res: 10, w: 1 },
];
const bucketFor = (pxPerUnit: number): Bucket => BUCKETS.find((b) => b.res >= pxPerUnit * 0.92) ?? BUCKETS[BUCKETS.length - 1]!;

const BODY_BOX: Box = { x0: -160, x1: 46, y0: -50, y1: 118 };
const JAW_BOX: Box = { x0: -62, x1: 41, y0: -8, y1: 28 };
const SEED = 7319;

interface Sprites {
  readonly res: number;
  readonly body: readonly HTMLCanvasElement[];
  readonly jaw: readonly HTMLCanvasElement[];
}
const spritesFor = lazily((b: Bucket): Sprites => ({ res: b.res, body: frames(BODY_BOX, b, SEED, paintBody), jaw: frames(JAW_BOX, b, SEED + 31, paintJaw) }));

// ---------------------------------------------------------------- idle motion

/** Behind this x the neck rises and falls a little with the breath, turning about the back of the skull. */
const BREATH_FROM = -60;
const breathAt = (t: number): number => 0.011 * Math.sin((2 * Math.PI * t) / 3.8);

/** 0 open .. 1 shut, a quick blink every few seconds. */
function blinkAt(t: number): number {
  const phase = (((t + 1.3) % 4.6) + 4.6) % 4.6;
  return phase > 4.38 ? Math.sin((Math.PI * (phase - 4.38)) / 0.22) : 0;
}

/** The neck turned `a` about the back of the skull, then the head over it as it is. */
function drawBreathing(ctx: CanvasRenderingContext2D, c: HTMLCanvasElement, res: number, a: number): void {
  const box = BODY_BOX;
  const k = 1 / res;
  const split = Math.round((BREATH_FROM - box.x0) * res);
  const lap = Math.round(4 * res);
  ctx.save();
  ctx.translate(BREATH_FROM, 0);
  ctx.rotate(-a);
  ctx.translate(-BREATH_FROM, 0);
  ctx.drawImage(c, 0, 0, split + lap, c.height, box.x0, box.y0, (split + lap) * k, c.height * k);
  ctx.restore();
  ctx.drawImage(c, split, 0, c.width - split, c.height, box.x0 + split * k, box.y0, (c.width - split) * k, c.height * k);
}

// ---------------------------------------------------------------- the mouth

/** The inside of the open mouth: dark rose, black in the throat, the tongue lying on the floor of the jaw. */
function drawInside(ctx: CanvasRenderingContext2D, angle: number): void {
  // Its lower edge runs a little under the jaw's lip, so no seam shows.
  const lower = JAW_TOP.filter((p) => p.x >= CORNER.x).map((p) => turned({ x: p.x, y: p.y + 0.8 }, angle));
  // Closed at the front by a curve bowed back into the mouth, so it reads as a hollow, not a wedge.
  const tip = lower[0]!;
  const front = MOUTH_EDGE[0]!;
  const bow = { x: (tip.x + front.x) / 2 - 10 * angle, y: (tip.y + front.y) / 2 };
  const inside = [...LIP, ...[...lower].reverse(), ...[0.25, 0.5, 0.75].map((u) => ({
    x: (1 - u) ** 2 * tip.x + 2 * u * (1 - u) * bow.x + u * u * front.x,
    y: (1 - u) ** 2 * tip.y + 2 * u * (1 - u) * bow.y + u * u * front.y,
  }))];
  ctx.save();
  path(ctx, inside);
  const g = ctx.createLinearGradient(CORNER.x, 0, 44, 0);
  g.addColorStop(0, 'rgba(36,9,11,1)');
  g.addColorStop(0.35, 'rgba(90,28,34,1)');
  g.addColorStop(0.6, 'rgba(124,46,52,0.96)');
  g.addColorStop(0.8, 'rgba(140,58,62,0.6)');
  g.addColorStop(0.94, 'rgba(146,62,64,0.12)');
  g.addColorStop(1, 'rgba(146,62,64,0)');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.clip();
  // The palate's ridges under the upper teeth, faint.
  ctx.strokeStyle = 'rgba(30,6,8,0.35)';
  ctx.lineWidth = 0.6;
  for (let x = 30; x > -30; x -= 5) {
    ctx.beginPath();
    ctx.moveTo(x, 3);
    ctx.quadraticCurveTo(x - 2, 6, x - 4, 5.5);
    ctx.stroke();
  }
  // The tongue, on the floor of the jaw, turning with it.
  ctx.save();
  ctx.translate(HINGE.x, HINGE.y);
  ctx.rotate(angle);
  ctx.translate(-HINGE.x, -HINGE.y);
  const tongue = new Path2D();
  tongue.moveTo(-52, 8);
  tongue.bezierCurveTo(-36, -4.5, 0, -5.4, 16, -3);
  tongue.bezierCurveTo(22, -2, 22, 1.4, 16, 2.4);
  tongue.lineTo(-52, 12);
  tongue.closePath();
  const tg = ctx.createLinearGradient(0, -7, 0, 3);
  tg.addColorStop(0, '#b4646a');
  tg.addColorStop(0.5, '#93434b');
  tg.addColorStop(1, '#5e2028');
  ctx.fillStyle = tg;
  ctx.fill(tongue);
  ctx.strokeStyle = 'rgba(40,8,12,0.7)';
  ctx.lineWidth = 0.5;
  ctx.stroke(tongue);
  ctx.strokeStyle = 'rgba(240,190,190,0.35)';
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.moveTo(-30, -3.6);
  ctx.quadraticCurveTo(-6, -6, 14, -3.2);
  ctx.stroke();
  ctx.restore();
  // The throat, black at the back.
  const deep = turned(CORNER, angle * 0.5);
  const back = ctx.createRadialGradient(deep.x + 2, deep.y, 1, deep.x + 2, deep.y, 30);
  back.addColorStop(0, 'rgba(6,1,2,0.95)');
  back.addColorStop(0.6, 'rgba(6,1,2,0.5)');
  back.addColorStop(1, 'rgba(6,1,2,0)');
  ctx.fillStyle = back;
  ctx.fillRect(deep.x - 40, deep.y - 40, 80, 80);
  ctx.restore();
}

/** Behind the corner of the mouth, the cheek's skin stretched from the upper jaw down to the open lower jaw. */
function drawCheekWeb(ctx: CanvasRenderingContext2D, angle: number, lw: number): void {
  // Its lower edge tucked a little into the jaw, so no seam shows between them.
  const back = JAW_TOP.filter((p) => p.x <= CORNER.x).map((p) => turned({ x: p.x, y: p.y + 0.7 }, angle));
  // Closed a touch forward of the corner, over the edge of the mouth's inside, so no gap shows there either.
  const web = [...CHEEK, ...[...back].reverse(), turned({ x: CORNER.x + 1.2, y: CORNER.y + 0.7 }, angle), { x: CORNER.x + 1.2, y: CORNER.y + 0.2 }];
  const low = turned(CORNER, angle);
  ctx.save();
  path(ctx, web);
  const g = ctx.createLinearGradient(0, CORNER.y, 0, low.y);
  g.addColorStop(0, '#54472b');
  g.addColorStop(0.5, '#75653f');
  g.addColorStop(1, '#6a5a37');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.clip();
  // Its skin: the same small pebbly scales, stretched a little.
  const rng = createRng(606);
  for (let i = 0; i < 420; i++) {
    const x = HINGE.x - 4 + rng() * (CORNER.x - HINGE.x + 8);
    const y = CORNER.y - 4 + rng() * (low.y - CORNER.y + 8);
    const r = 0.26 + rng() * 0.16;
    ctx.fillStyle = 'rgba(14,10,4,0.22)';
    ctx.beginPath();
    ctx.ellipse(x + r * 0.2, y + r * 0.25, r * 1.2, r, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(232,218,172,0.16)';
    ctx.beginPath();
    ctx.ellipse(x - r * 0.25, y - r * 0.3, r * 0.5, r * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // Folds of stretched skin fanning down from the corner, and the deep crease of the corner itself.
  ctx.lineCap = 'round';
  for (let i = 1; i <= 4; i++) {
    const u = i / 5;
    const a = turned(CHEEK[Math.round(u * (CHEEK.length - 1))]!, angle * u);
    ctx.strokeStyle = 'rgba(24,18,8,0.35)';
    ctx.lineWidth = 0.9 * lw;
    ctx.beginPath();
    ctx.moveTo(CORNER.x - 0.5, CORNER.y + 0.5);
    ctx.quadraticCurveTo((CORNER.x + a.x) / 2 - 2, (CORNER.y + low.y) / 2, a.x - 1, low.y * (1 - u) + a.y * u);
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(12,8,4,0.85)';
  ctx.lineWidth = 1.4 * lw;
  ctx.beginPath();
  ctx.moveTo(CORNER.x, CORNER.y);
  ctx.quadraticCurveTo(CORNER.x - 3, (CORNER.y + low.y) / 2, low.x, low.y);
  ctx.stroke();
  ctx.restore();
}

/** The ink under the throat, where it meets the shut jaw: it fades as the jaw drops away from it. */
function drawThroatLine(ctx: CanvasRenderingContext2D, angle: number, lw: number): void {
  const a = 1 - Math.min(1, angle / 0.12);
  if (a <= 0) return;
  ctx.save();
  ctx.globalAlpha = 0.9 * a;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.6 * lw;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  THROAT.filter((p) => p.y > 22.5).forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.stroke();
  ctx.restore();
}

// ---------------------------------------------------------------- the eye

/** A forward-set amber eye with a round pupil and a catchlight, shaded under the brow; the lid closes from the top. */
function drawEye(ctx: CanvasRenderingContext2D, lid: number, lw: number): void {
  const { x, y } = EYE;
  const r = EYE_R;
  const rot = -0.14;
  const socket = ctx.createRadialGradient(x, y, r * 0.7, x, y, r * 2.3);
  socket.addColorStop(0, 'rgba(14,9,3,0.65)');
  socket.addColorStop(1, 'rgba(14,9,3,0)');
  ctx.fillStyle = socket;
  ctx.fillRect(x - r * 2.4, y - r * 2.4, r * 4.8, r * 4.8);
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(x, y, r * 1.18, r * 0.88, rot, 0, Math.PI * 2);
  ctx.clip();
  const ix = x + r * 0.22;
  const iris = ctx.createRadialGradient(ix - r * 0.1, y + r * 0.15, r * 0.1, ix, y, r * 1.05);
  iris.addColorStop(0, '#f3c75a');
  iris.addColorStop(0.5, '#cf8a26');
  iris.addColorStop(0.85, '#7a3d0e');
  iris.addColorStop(1, '#3a1a05');
  ctx.fillStyle = iris;
  ctx.fillRect(x - r * 1.5, y - r * 1.2, r * 3, r * 2.4);
  ctx.strokeStyle = 'rgba(70,30,4,0.4)';
  ctx.lineWidth = 0.5 * lw;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(ix + Math.cos(a) * r * 0.42, y + Math.sin(a) * r * 0.42);
    ctx.lineTo(ix + Math.cos(a) * r * 0.95, y + Math.sin(a) * r * 0.95);
    ctx.stroke();
  }
  ctx.fillStyle = '#060403';
  ctx.beginPath();
  ctx.arc(ix, y, r * 0.38, 0, Math.PI * 2);
  ctx.fill();
  // The brow's shadow over the top of the eye.
  const shadow = ctx.createLinearGradient(0, y - r, 0, y + r * 0.2);
  shadow.addColorStop(0, 'rgba(10,6,2,0.75)');
  shadow.addColorStop(1, 'rgba(10,6,2,0)');
  ctx.fillStyle = shadow;
  ctx.fillRect(x - r * 1.5, y - r, r * 3, r * 1.2);
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.beginPath();
  ctx.ellipse(ix + r * 0.34, y - r * 0.3, r * 0.2, r * 0.15, -0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.beginPath();
  ctx.arc(ix - r * 0.4, y + r * 0.38, r * 0.08, 0, Math.PI * 2);
  ctx.fill();
  const cover = Math.max(0, Math.min(1, lid)) * 2 * r;
  if (cover > 0.05) {
    ctx.fillStyle = '#4e4329';
    ctx.fillRect(x - r * 1.5, y - r * 1.2, r * 3, r * 0.3 + cover);
    ctx.fillStyle = 'rgba(8,6,2,0.6)';
    ctx.fillRect(x - r * 1.5, y - r * 0.9 + cover - 0.4 * lw, r * 3, 1.2 * lw);
  }
  ctx.restore();
  ctx.save();
  ctx.strokeStyle = '#16110a';
  ctx.lineWidth = 1.3 * lw;
  ctx.beginPath();
  ctx.ellipse(x, y, r * 1.18, r * 0.88, rot, 0, Math.PI * 2);
  ctx.stroke();
  // The heavy upper lid fold and the pale rim of the lower lid.
  ctx.lineCap = 'round';
  ctx.lineWidth = 1.6 * lw;
  ctx.beginPath();
  ctx.ellipse(x, y - r * 0.12, r * 1.32, r * 1.02, rot, Math.PI * 1.08, Math.PI * 1.92);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(214,196,150,0.7)';
  ctx.lineWidth = 0.9 * lw;
  ctx.beginPath();
  ctx.ellipse(x, y + r * 0.1, r * 1.3, r * 1.0, rot, Math.PI * 0.12, Math.PI * 0.88);
  ctx.stroke();
  ctx.restore();
}

// ---------------------------------------------------------------- on screen

export const drawTrex: DrawHead = (ctx, p) => {
  const k = p.size / HEAD_LEN;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.scale(k, k);
  const scale = screenScale(ctx);
  const s = spritesFor(bucketFor(scale));
  const f = ((Math.floor(p.t * BOIL_FPS) % BOIL_FRAMES) + BOIL_FRAMES) % BOIL_FRAMES;
  const lw = 1 / scale;
  const angle = JAW_MAX * Math.max(0, Math.min(1, p.jaw));
  if (angle > 0.01) drawInside(ctx, angle);
  drawUpperTeeth(ctx, lw);
  drawLipShadow(ctx);
  ctx.save();
  ctx.translate(HINGE.x, HINGE.y);
  ctx.rotate(angle);
  ctx.translate(-HINGE.x, -HINGE.y);
  drawLowerTeeth(ctx, lw);
  blit(ctx, s.jaw[f]!, JAW_BOX, s.res);
  ctx.restore();
  if (angle > 0.01) drawCheekWeb(ctx, angle, lw);
  drawBreathing(ctx, s.body[f]!, s.res, breathAt(p.t));
  drawThroatLine(ctx, angle, lw);
  drawEye(ctx, blinkAt(p.t), lw);
  ctx.restore();
};

/** Bakes the size the kit preview opens on. */
export async function prepare(): Promise<void> {
  spritesFor(bucketFor(6));
}

export const KIT: KitEntry = {
  name: 'trex',
  draw: (ctx, w, h, t) => drawTrex(ctx, { x: w * 0.72, y: h * 0.55, size: Math.min(w, h) * 0.55, jaw: 0.5 + 0.5 * Math.sin(t * 2), t }),
};
