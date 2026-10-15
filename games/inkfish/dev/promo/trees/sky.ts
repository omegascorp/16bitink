import { halo } from '../../../src/art/glowArt';
import { INK, PAPER } from '../../../src/art/pen';
import { drawTextLine, type TextInk } from '../captions';
import { VIDEO } from '../short';
import { MARK, RULER_Y } from './world';

/**
 * The story's marks over the scene: the asteroid and its impact, the hiker,
 * the tape-deck arrows by the readout, the bracket on the ruler, and
 * labelled callouts.
 */

export interface Pt {
  readonly x: number;
  readonly y: number;
}

const FIRE = '#ff9b3d';
const DUST = '#8d8073';

/** The asteroid on its way down, `u` 0 .. 1 from the sky to `to`: a rock with a tail of fire. */
export function drawAsteroid(ctx: CanvasRenderingContext2D, to: Pt, u: number): void {
  const from = { x: to.x + 640, y: to.y - 620 };
  const head = { x: from.x + (to.x - from.x) * u, y: from.y + (to.y - from.y) * u };
  const dx = from.x - to.x;
  const dy = from.y - to.y;
  const d = Math.hypot(dx, dy);
  const tail = Math.min(380, 120 + 520 * u);
  ctx.save();
  ctx.lineCap = 'round';
  for (const [w, colour, alpha] of [[34, FIRE, 0.35], [18, '#ffd36b', 0.7], [6, '#fff4d0', 0.9]] as const) {
    ctx.strokeStyle = colour;
    ctx.globalAlpha = alpha;
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(head.x, head.y);
    ctx.lineTo(head.x + (dx / d) * tail, head.y + (dy / d) * tail);
    ctx.stroke();
  }
  ctx.restore();
  halo(ctx, head.x, head.y, 120, FIRE, 0.8);
  ctx.save();
  ctx.fillStyle = '#6b5a4c';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.ellipse(head.x, head.y, 24, 20, 0.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

/** The impact, `s` seconds after it (behind the land): a fireball, then a cloud of dust rising and spreading out. */
export function drawImpactCloud(ctx: CanvasRenderingContext2D, at: Pt, s: number): void {
  const fade = 1 - Math.max(0, (s - 1.0) / 0.9);
  if (fade <= 0) return;
  halo(ctx, at.x, at.y, 260 + 220 * Math.min(1, s), FIRE, 0.9 * Math.max(0, 1 - s / 1.6));
  const rise = 380 * (1 - Math.exp(-s * 2.4));
  ctx.save();
  ctx.globalAlpha = 0.9 * fade;
  ctx.fillStyle = DUST;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  // The stem, then the cap spreading out over it.
  const grow = Math.min(1, s * 1.5);
  const puffs: { x: number; y: number; r: number }[] = [];
  for (let i = 0; i < 6; i++) puffs.push({ x: at.x + 6 * Math.sin(i * 2.1), y: at.y - (rise * i) / 7, r: 24 + 5 * i * grow });
  // The cap: a heap of puffs, widest at its base.
  for (const [dx, dy, r] of [[-1, 0.1, 0.8], [1, 0.1, 0.8], [-0.55, -0.35, 0.95], [0.55, -0.35, 0.95], [0, -0.6, 1], [0, 0, 1.1]] as const) {
    puffs.push({ x: at.x + dx * 110 * grow, y: at.y - rise + dy * 90 * grow, r: (34 + 44 * grow) * r });
  }
  for (const p of puffs) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

/** The shock of the impact running out along the ground. */
export function drawShockwave(ctx: CanvasRenderingContext2D, at: Pt, s: number): void {
  if (s > 0.9) return;
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.globalAlpha = 0.8 * (1 - s / 0.9);
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.ellipse(at.x, at.y + 10, 80 + 700 * s ** 0.7, 14 + 30 * s, 0, Math.PI, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

/** The flash of the impact over everything, fading fast. */
export function drawFlash(ctx: CanvasRenderingContext2D, s: number): void {
  const a = 0.75 * (1 - s / 0.4);
  if (s < 0 || a <= 0) return;
  ctx.save();
  ctx.fillStyle = `rgba(255,236,190,${a.toFixed(3)})`;
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
  ctx.restore();
}

/** A hiker walking left, feet at (x, ground): hat, backpack, a walking stick; `step` is the stride's phase. */
export function drawHiker(ctx: CanvasRenderingContext2D, x: number, ground: number, step: number, scale: number): void {
  if (x < -80 || x > VIDEO.width + 80) return;
  ctx.save();
  ctx.translate(x, ground);
  ctx.scale(scale, scale);
  drawWalker(ctx, step);
  ctx.restore();
}

/** The hiker at the origin, feet on y = 0. */
function drawWalker(ctx: CanvasRenderingContext2D, step: number): void {
  const x = 0;
  const ground = 0;
  const swing = Math.sin(step);
  const bob = 2 * Math.abs(Math.cos(step));
  const hip = { x, y: ground - 40 - bob };
  const neck = { x: x - 3, y: hip.y - 34 };
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 5;
  const line = (a: Pt, b: Pt, c?: Pt): void => {
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    if (c) ctx.lineTo(c.x, c.y);
    ctx.stroke();
  };
  // Legs, scissoring, knees bent a little.
  for (const s of [swing, -swing]) line(hip, { x: hip.x - 9 * s - 2, y: hip.y + 21 }, { x: hip.x - 18 * s, y: ground });
  // The backpack, then body and head.
  ctx.fillStyle = '#b5643c';
  ctx.beginPath();
  ctx.roundRect(neck.x + 3, neck.y + 2, 16, 26, 4);
  ctx.fill();
  ctx.stroke();
  line(hip, neck);
  ctx.fillStyle = PAPER;
  ctx.beginPath();
  ctx.arc(neck.x - 2, neck.y - 11, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // A hat with a brim.
  ctx.fillStyle = '#5f7a4a';
  ctx.beginPath();
  ctx.ellipse(neck.x - 2, neck.y - 19, 14, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // The arm and the stick it plants ahead.
  const hand = { x: neck.x - 16 - 6 * swing, y: neck.y + 22 };
  line({ x: neck.x, y: neck.y + 6 }, hand);
  ctx.lineWidth = 3.5;
  line({ x: hand.x - 2, y: hand.y - 12 }, { x: hand.x - 8 - 6 * swing, y: ground });
  ctx.restore();
}

/** The tape-deck arrows by the readout: ◀◀ rewinding (dir -1), ▶▶ fast forward (dir 1). */
export function drawWinding(ctx: CanvasRenderingContext2D, x: number, y: number, dir: number, alpha: number): void {
  if (dir === 0 || alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = MARK;
  ctx.strokeStyle = PAPER;
  ctx.lineWidth = 6;
  ctx.lineJoin = 'round';
  for (const k of [0, 1]) {
    const cx = x + dir * (k * 30 - 15);
    ctx.beginPath();
    ctx.moveTo(cx + dir * 22, y);
    ctx.lineTo(cx - dir * 14, y - 24);
    ctx.lineTo(cx - dir * 14, y + 24);
    ctx.closePath();
    ctx.stroke();
    ctx.fill();
  }
  ctx.restore();
}

/** A bracket over the ruler from x0 to x1, drawn out from x0 by `u`, with its label over the middle. */
export function drawBracket(ctx: CanvasRenderingContext2D, x0: number, x1: number, u: number, label: string, alpha: number): void {
  if (alpha <= 0 || u <= 0) return;
  const y = RULER_Y - 46;
  const end = x0 + (x1 - x0) * u;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = MARK;
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(x0, y + 18);
  ctx.lineTo(x0, y);
  ctx.lineTo(end, y);
  if (u >= 1) ctx.lineTo(x1, y + 18);
  ctx.stroke();
  ctx.restore();
  drawTextLine(ctx, label, (x0 + x1) / 2, y - 20, 68, 700, alpha * Math.min(1, u * 1.5), { fill: MARK, halo: PAPER });
}

/** A handwritten note at `at`, with an inked leader line to `to` (if given). */
export function drawCallout(ctx: CanvasRenderingContext2D, text: string, at: Pt, to: Pt | null, alpha: number, size: number, colours: TextInk): void {
  if (alpha <= 0) return;
  if (to) {
    const from = { x: at.x, y: to.y > at.y ? at.y + size * 0.25 : at.y - size * 0.8 };
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const len = Math.hypot(dx, dy);
    if (len > 40) {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = colours.fill;
      ctx.fillStyle = colours.fill;
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(from.x + (dx / len) * 10, from.y + (dy / len) * 10);
      ctx.lineTo(to.x - (dx / len) * 12, to.y - (dy / len) * 12);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(to.x, to.y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
  drawTextLine(ctx, text, at.x, at.y, size, 700, alpha, colours);
}

/** A hand-inked tick ✓, `h` tall, centred at (x, y). */
export function drawCheck(ctx: CanvasRenderingContext2D, x: number, y: number, h: number, alpha: number): void {
  if (alpha <= 0) return;
  const path = (): void => {
    ctx.beginPath();
    ctx.moveTo(x - h * 0.45, y);
    ctx.quadraticCurveTo(x - h * 0.25, y + h * 0.2, x - h * 0.1, y + h * 0.42);
    ctx.quadraticCurveTo(x + h * 0.1, y - h * 0.1, x + h * 0.5, y - h * 0.5);
  };
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  path();
  ctx.strokeStyle = PAPER;
  ctx.lineWidth = h * 0.3;
  ctx.stroke();
  path();
  ctx.strokeStyle = MARK;
  ctx.lineWidth = h * 0.14;
  ctx.stroke();
  ctx.restore();
}
