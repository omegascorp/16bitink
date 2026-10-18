import { INK } from '../../../src/art/pen';
import { type Angler, type Body, DECK_Y, type Pt, type Rod } from './crew';

/**
 * The two anglers in pen: yellow oilskins, dark trousers and boots, a red
 * cap on A and a blue beanie on B, drawn in the boat's frame from the joints
 * crew.ts poses. A's rod: cork grip and reel in his hands, the blank bending
 * to the line; snapped, the butt in his hands and the tip dangling from it.
 */

const SLICKER = '#f2c230';
const SLICKER_SHADE = '#c99a1e';
const TROUSERS = '#2b2f3a';
const SKIN = '#f0cfa8';
const CAP: Readonly<Record<'A' | 'B', string>> = { A: '#c8352b', B: '#2f68ad' };

const add = (a: Pt, b: Pt): Pt => ({ x: a.x + b.x, y: a.y + b.y });

/** A limb: a thick inked stroke through its joints, then the colour inside. */
function limb(ctx: CanvasRenderingContext2D, pts: readonly Pt[], width: number, colour: string, px: number): void {
  ctx.beginPath();
  pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.strokeStyle = INK;
  ctx.lineWidth = width + 3.4 * px;
  ctx.stroke();
  ctx.strokeStyle = colour;
  ctx.lineWidth = width;
  ctx.stroke();
}

/** Where the body's joints are in the boat's frame. */
function placed(a: Angler, shiver: number): (p: Pt) => Pt {
  const at = { x: a.body.feet + shiver, y: DECK_Y - a.lift };
  return (p) => add(at, p);
}

/** Its hands in the boat's frame (A's rod is held in them). */
export function handsOf(a: Angler): readonly [Pt, Pt] {
  const p = placed(a, a.shiver);
  return [p(a.body.hands[0]), p(a.body.hands[1])];
}

/** Its head in the boat's frame, for the "!" over it. */
export function headOf(a: Angler): Pt {
  return placed(a, a.shiver)(a.body.head);
}

export function drawAngler(ctx: CanvasRenderingContext2D, a: Angler, who: 'A' | 'B', px: number): void {
  const p = placed(a, a.shiver);
  const b: Body = a.body;
  const hip = p(b.hip);
  const neck = p(b.neck);
  const head = p(b.head);
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // Legs and boots.
  for (let i = 0; i < 2; i++) limb(ctx, [hip, p(b.knees[i]!), p(b.toes[i]!)], 11, TROUSERS, px);
  // The far arm, behind the body.
  limb(ctx, [add(neck, { x: 2, y: 8 }), p(b.elbows[1]), p(b.hands[1])], 9, SLICKER_SHADE, px);
  // The oilskin: a tapered body from the hips to the shoulders.
  const dx = neck.x - hip.x;
  const dy = neck.y - hip.y;
  const len = Math.hypot(dx, dy) || 1;
  const n = { x: -dy / len, y: dx / len };
  const body = [
    add(hip, { x: n.x * 15, y: n.y * 15 }),
    add(neck, { x: n.x * 12, y: n.y * 12 }),
    add(neck, { x: -n.x * 12, y: -n.y * 12 }),
    add(hip, { x: -n.x * 15, y: -n.y * 15 }),
  ];
  ctx.beginPath();
  body.forEach((q, i) => (i === 0 ? ctx.moveTo(q.x, q.y) : ctx.lineTo(q.x, q.y)));
  ctx.closePath();
  ctx.fillStyle = SLICKER;
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.6 * px;
  ctx.stroke();
  // The near arm.
  limb(ctx, [add(neck, { x: -2, y: 8 }), p(b.elbows[0]), p(b.hands[0])], 9, SLICKER, px);
  for (const h of b.hands) {
    ctx.beginPath();
    ctx.arc(p(h).x, p(h).y, 5.5, 0, Math.PI * 2);
    ctx.fillStyle = SKIN;
    ctx.fill();
    ctx.lineWidth = 2 * px;
    ctx.stroke();
  }
  // Head and hat.
  ctx.beginPath();
  ctx.arc(head.x, head.y, 13, 0, Math.PI * 2);
  ctx.fillStyle = SKIN;
  ctx.fill();
  ctx.lineWidth = 2.6 * px;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(head.x, head.y - 2, 13.5, Math.PI * 1.02, Math.PI * 1.98);
  ctx.closePath();
  ctx.fillStyle = CAP[who];
  ctx.fill();
  ctx.stroke();
  if (who === 'A') {
    // The cap's peak, forwards (towards the bow).
    ctx.beginPath();
    ctx.moveTo(head.x - 8, head.y - 4);
    ctx.lineTo(head.x - 24, head.y - 1);
    ctx.lineWidth = 4 * px;
    ctx.strokeStyle = CAP.A;
    ctx.stroke();
  }
  // An eye, looking forwards.
  ctx.beginPath();
  ctx.arc(head.x - 7, head.y + 2, 2.2, 0, Math.PI * 2);
  ctx.fillStyle = INK;
  ctx.fill();
  ctx.restore();
}

/** The rod, from the reel in his lower hand up past the other, bending towards `pull` (a unit direction) as it loads. */
export const ROD_LEN = 270;

export function rodTipOf(a: Angler, rod: Rod, pull: Pt): Pt {
  const [h0, h1] = handsOf(a);
  const d = { x: h1.x - h0.x, y: h1.y - h0.y };
  const l = Math.hypot(d.x, d.y) || 1;
  const axis = { x: d.x / l, y: d.y / l };
  const straight = add(h0, { x: axis.x * ROD_LEN, y: axis.y * ROD_LEN });
  return add(straight, { x: pull.x * ROD_LEN * 0.42 * rod.bend, y: pull.y * ROD_LEN * 0.42 * rod.bend });
}

export function drawRod(ctx: CanvasRenderingContext2D, a: Angler, rod: Rod, pull: Pt, px: number): void {
  const [h0, h1] = handsOf(a);
  const d = { x: h1.x - h0.x, y: h1.y - h0.y };
  const l = Math.hypot(d.x, d.y) || 1;
  const axis = { x: d.x / l, y: d.y / l };
  const butt = add(h0, { x: -axis.x * 26, y: -axis.y * 26 });
  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = INK;
  if (rod.broken) {
    // The butt and the first piece, snapped off jagged.
    const end = add(h0, { x: axis.x * ROD_LEN * 0.42, y: axis.y * ROD_LEN * 0.42 });
    ctx.lineWidth = 5 * px;
    ctx.beginPath();
    ctx.moveTo(butt.x, butt.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
    ctx.strokeStyle = '#d9c39a';
    ctx.lineWidth = 2.2 * px;
    ctx.beginPath();
    ctx.moveTo(end.x - 4, end.y - 3);
    ctx.lineTo(end.x + 3, end.y - 7);
    ctx.lineTo(end.x + 1, end.y + 2);
    ctx.stroke();
    // The tip dangling from the snapped end by its line.
    const hang = Math.PI / 2 + rod.swing;
    const hookOn = add(end, { x: Math.cos(hang) * 26, y: Math.sin(hang) * 26 });
    const tip = add(hookOn, { x: Math.cos(hang + 0.2) * ROD_LEN * 0.5, y: Math.sin(hang + 0.2) * ROD_LEN * 0.5 });
    ctx.strokeStyle = '#dfe6f2';
    ctx.lineWidth = 1.4 * px;
    ctx.beginPath();
    ctx.moveTo(end.x, end.y);
    ctx.lineTo(hookOn.x, hookOn.y);
    ctx.stroke();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3.4 * px;
    ctx.beginPath();
    ctx.moveTo(hookOn.x, hookOn.y);
    ctx.lineTo(tip.x, tip.y);
    ctx.stroke();
  } else {
    const tip = rodTipOf(a, rod, pull);
    const mid = add(h0, { x: axis.x * ROD_LEN * 0.55, y: axis.y * ROD_LEN * 0.55 });
    ctx.lineWidth = 4.5 * px;
    ctx.beginPath();
    ctx.moveTo(butt.x, butt.y);
    ctx.quadraticCurveTo(mid.x, mid.y, tip.x, tip.y);
    ctx.stroke();
    ctx.strokeStyle = '#c9d2e6';
    ctx.lineWidth = 1.6 * px;
    ctx.stroke();
  }
  // Cork grip and reel.
  ctx.strokeStyle = '#b98b55';
  ctx.lineWidth = 7 * px;
  ctx.beginPath();
  ctx.moveTo(butt.x, butt.y);
  ctx.lineTo(h0.x + axis.x * 8, h0.y + axis.y * 8);
  ctx.stroke();
  ctx.fillStyle = '#9aa3b5';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2 * px;
  ctx.beginPath();
  ctx.arc(h0.x + axis.x * 14 + axis.y * 9, h0.y + axis.y * 14 - axis.x * 9, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}
