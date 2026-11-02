import { INK, makeCanvas, type Pt } from '../../../../src/art/pen';
import { createRng } from '../../../../src/logic/rng';
import { drawCapeFurSeal, prepareSeal, type SealLook } from '../../seal/art/capeFurSeal';
import { underAt, topAt } from '../../seal/art/sealShape';
import type { Placed } from '../../seal/story';
import { UNITS } from '../../seal/story';
import { VIDEO } from '../../short';

/**
 * The Weddell seal (Leptonychotes weddellii): the Cape fur seal's painted
 * drawing (../../seal/art/capeFurSeal.ts) made plump (a deeper body), then
 * recoloured in one pass from a dark slate-grey back to a silvery belly, and
 * dappled with silver-white spots and blotches, with a little upturned
 * "smile" line at the corner of the mouth. Same own units as the fur seal
 * (310 long, middle at 0,0, nose right, belly down), placed by a Placed.
 */

/** How much deeper than the fur seal it is, and how much shorter. */
const PLUMP_Y = 1.34;
const PLUMP_X = 0.94;

let layers: { a: ReturnType<typeof makeCanvas>; b: ReturnType<typeof makeCanvas> } | null = null;

interface Spot { readonly x: number; readonly v: number; readonly r: number; readonly a: number; readonly big: boolean }

/** Silver spots over the back and flanks (not the head), and larger pale blotches low on the flank. */
const SPOTS: readonly Spot[] = (() => {
  const rng = createRng(9021);
  const out: Spot[] = [];
  for (let i = 0; i < 190; i++) {
    const big = i < 34;
    out.push({ x: -138 + rng() * 214, v: 0.08 + rng() * 0.84, r: big ? 5 + rng() * 7 : 1 + rng() * 2.2, a: big ? 0.16 + rng() * 0.18 : 0.3 + rng() * 0.32, big });
  }
  return out;
})();

function dapple(ctx: CanvasRenderingContext2D): void {
  for (const s of SPOTS) {
    const top = topAt(s.x);
    const y = top + (underAt(s.x) - top) * s.v;
    const g = ctx.createRadialGradient(s.x, y, 0, s.x, y, s.r);
    g.addColorStop(0, `rgba(226,233,238,${s.a})`);
    g.addColorStop(s.big ? 0.4 : 0.7, `rgba(214,222,229,${s.a * 0.7})`);
    g.addColorStop(1, 'rgba(214,222,229,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(s.x, y, s.r * (s.big ? 1.7 : 1.6), s.r * (s.big ? 0.8 : 0.6), -0.3 + (s.x % 7) * 0.08, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** The smile: a short curve turning up at the corner of the mouth, and a soft cheek crease. */
function smile(ctx: CanvasRenderingContext2D, amount: number, lw: number): void {
  if (amount <= 0.01) return;
  const a = amount;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.5 * lw;
  ctx.beginPath();
  ctx.moveTo(128, 14.2);
  ctx.quadraticCurveTo(116, 18.2, 106.5 - 1.5 * a, 11.4 - 4.6 * a);
  ctx.stroke();
  ctx.lineWidth = 1 * lw;
  ctx.globalAlpha = 0.55 * a;
  ctx.beginPath();
  ctx.moveTo(104.5, 8.2);
  ctx.quadraticCurveTo(101, 11.2, 103.4, 15.4);
  ctx.stroke();
  ctx.restore();
}

export interface WeddellLook extends SealLook {
  /** The smile's size, 0 .. 1 (default 1). */
  readonly smile?: number;
}

/** Draws the Weddell seal, nose right in its own units, placed, turned and mirrored by `p`. */
export function drawWeddell(ctx: CanvasRenderingContext2D, p: Placed, look: WeddellLook, boil: number): void {
  layers ??= { a: makeCanvas(VIDEO.width, VIDEO.height), b: makeCanvas(VIDEO.width, VIDEO.height) };
  const { a, b } = layers;
  const k = p.len / UNITS;
  const r = p.len * 1.3;
  const x0 = Math.max(0, Math.floor(p.x - r));
  const y0 = Math.max(0, Math.floor(p.y - r));
  const w = Math.min(VIDEO.width, Math.ceil(p.x + r)) - x0;
  const h = Math.min(VIDEO.height, Math.ceil(p.y + r)) - y0;
  if (w <= 0 || h <= 0) return;
  const into = (c: CanvasRenderingContext2D): void => {
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.translate(p.x, p.y);
    c.scale(p.face, 1);
    c.rotate(p.rot);
    c.scale(k * PLUMP_X, k * PLUMP_Y);
  };
  const s = a.ctx;
  s.save();
  s.globalCompositeOperation = 'source-over';
  s.globalAlpha = 1;
  s.setTransform(1, 0, 0, 1, 0, 0);
  s.clearRect(x0, y0, w, h);
  into(s);
  drawCapeFurSeal(s, { x: 0, y: 0, len: UNITS, rot: 0, face: 1, beat: p.beat }, look, boil);
  s.restore();
  // The mask of the drawn seal, kept for after the colour.
  b.ctx.setTransform(1, 0, 0, 1, 0, 0);
  b.ctx.globalCompositeOperation = 'source-over';
  b.ctx.clearRect(x0, y0, w, h);
  b.ctx.drawImage(a.canvas, x0, y0, w, h, x0, y0, w, h);
  s.save();
  into(s);
  s.beginPath();
  s.rect(-290, -80, 470, 160);
  s.clip();
  // Slate on top, silver below; the 'color' blend keeps the painting's light and ink.
  const g = s.createLinearGradient(0, -42, 0, 48);
  g.addColorStop(0, '#2f3943');
  g.addColorStop(0.45, '#566471');
  g.addColorStop(0.8, '#8d9aa6');
  g.addColorStop(1, '#b3bec8');
  s.globalCompositeOperation = 'color';
  s.fillStyle = g;
  s.fillRect(-290, -80, 470, 160);
  s.globalCompositeOperation = 'source-over';
  dapple(s);
  s.restore();
  s.save();
  s.setTransform(1, 0, 0, 1, 0, 0);
  s.globalCompositeOperation = 'destination-in';
  s.drawImage(b.canvas, x0, y0, w, h, x0, y0, w, h);
  s.restore();
  s.save();
  into(s);
  smile(s, look.smile ?? 1, 1 / (k * Math.sqrt(PLUMP_X * PLUMP_Y)));
  s.restore();
  ctx.drawImage(a.canvas, x0, y0, w, h, x0, y0, w, h);
}

export function prepareWeddell(): void {
  prepareSeal();
}

/** A point of the seal's own units on screen (for pinning things to it). */
export function onWeddell(p: Placed, local: Pt): Pt {
  const k = p.len / UNITS;
  const [c, s] = [Math.cos(p.rot), Math.sin(p.rot)];
  const [lx, ly] = [local.x * k * PLUMP_X, local.y * k * PLUMP_Y];
  return { x: p.x + p.face * (lx * c - ly * s), y: p.y + lx * s + ly * c };
}
