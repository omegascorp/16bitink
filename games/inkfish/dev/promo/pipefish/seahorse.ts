import { INK } from '../../../src/art/pen';
import type { Pt } from './fish';

/**
 * A seahorse in the game's pen-and-ink style (the game has no seahorse
 * sprite): upright, snout to the left, a curled tail, bony rings, a little
 * dorsal fin fluttering, and the male's brood pouch swollen on his belly.
 * Drawn in units of its height about its middle.
 */

const WASH = '#d99a45';
const POUCH = '#e9c48e';
const PAPER_FILL = '#fffaf0';

/** The spine from the crown down to the tail's curl, with the body's half-width there (units of height). */
const SPINE: readonly (Pt & { readonly w: number })[] = [
  { x: 0.03, y: -0.43, w: 0.075 },
  { x: 0.07, y: -0.3, w: 0.06 },
  { x: 0.04, y: -0.16, w: 0.09 },
  { x: 0.03, y: 0.0, w: 0.105 },
  { x: 0.07, y: 0.15, w: 0.07 },
  { x: 0.11, y: 0.28, w: 0.05 },
  { x: 0.09, y: 0.39, w: 0.038 },
  { x: 0.02, y: 0.45, w: 0.03 },
  { x: -0.05, y: 0.42, w: 0.024 },
  { x: -0.06, y: 0.35, w: 0.018 },
  { x: -0.01, y: 0.33, w: 0.012 },
];

/** The spine, smoothed (Catmull-Rom), with `curl` tightening the tail. */
function sample(curl: number): (Pt & { readonly w: number })[] {
  const pts = SPINE.map((p, i) => (i < 5 ? p : { ...p, x: p.x - 0.02 * curl * (i - 4), y: p.y - 0.01 * curl * (i - 4) }));
  const out: (Pt & { w: number })[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)]!;
    const p1 = pts[i]!;
    const p2 = pts[i + 1]!;
    const p3 = pts[Math.min(pts.length - 1, i + 2)]!;
    for (let s = 0; s < 6; s++) {
      const u = s / 6;
      const u2 = u * u;
      const u3 = u2 * u;
      const cr = (a: number, b: number, c: number, d: number): number => 0.5 * (2 * b + (-a + c) * u + (2 * a - 5 * b + 4 * c - d) * u2 + (-a + 3 * b - 3 * c + d) * u3);
      out.push({ x: cr(p0.x, p1.x, p2.x, p3.x), y: cr(p0.y, p1.y, p2.y, p3.y), w: p1.w + (p2.w - p1.w) * u });
    }
  }
  out.push({ ...pts[pts.length - 1]! });
  return out;
}

/** Draws it at (x, y), `h` px tall; `sway` -1 .. 1 flutters its fin and curls its tail. */
export function drawSeahorse(ctx: CanvasRenderingContext2D, x: number, y: number, h: number, sway: number, pouch: number): void {
  const spine = sample(0.5 + 0.5 * sway);
  const normal = (i: number): Pt => {
    const a = spine[Math.max(0, i - 1)]!;
    const b = spine[Math.min(spine.length - 1, i + 1)]!;
    const d = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    return { x: -(b.y - a.y) / d, y: (b.x - a.x) / d };
  };
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(h, h);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = INK;
  const ink = (px: number): void => {
    ctx.lineWidth = px / h;
  };

  // The dorsal fin on its back, fluttering.
  const fin = [10, 13, 16, 19].map((i) => spine[i]!);
  ctx.beginPath();
  ctx.moveTo(fin[0]!.x + 0.09, fin[0]!.y);
  fin.forEach((p, k) => ctx.lineTo(p.x + 0.16 + 0.02 * Math.sin(sway * 3 + k), p.y + 0.01));
  ctx.lineTo(fin[3]!.x + 0.06, fin[3]!.y);
  ctx.closePath();
  ctx.fillStyle = PAPER_FILL;
  ctx.fill();
  ink(2);
  ctx.stroke();
  for (const p of fin) {
    ctx.beginPath();
    ctx.moveTo(p.x + 0.08, p.y);
    ctx.lineTo(p.x + 0.15, p.y + 0.005);
    ctx.stroke();
  }

  // The body: one tapering outline down the spine.
  const left = spine.map((p, i) => ({ x: p.x + normal(i).x * p.w, y: p.y + normal(i).y * p.w }));
  const right = spine.map((p, i) => ({ x: p.x - normal(i).x * p.w, y: p.y - normal(i).y * p.w }));
  ctx.beginPath();
  left.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  [...right].reverse().forEach((p) => ctx.lineTo(p.x, p.y));
  ctx.closePath();
  ctx.fillStyle = PAPER_FILL;
  ctx.fill();
  ctx.fillStyle = WASH;
  ctx.globalAlpha = 0.75;
  ctx.fill();
  ctx.globalAlpha = 1;
  ink(3.2);
  ctx.stroke();
  // Bony rings across it.
  ink(1.4);
  ctx.globalAlpha = 0.6;
  for (let i = 4; i < spine.length - 3; i += 2) {
    ctx.beginPath();
    ctx.moveTo(left[i]!.x, left[i]!.y);
    ctx.lineTo(right[i]!.x, right[i]!.y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // The brood pouch, swollen on the front of its belly.
  if (pouch > 0) {
    ctx.beginPath();
    ctx.ellipse(-0.06, 0.06, 0.06 + 0.03 * pouch, 0.1 + 0.02 * pouch, 0.25, 0, Math.PI * 2);
    ctx.fillStyle = POUCH;
    ctx.fill();
    ink(2.6);
    ctx.stroke();
  }

  // The head: a horse's head with a long tube of a snout and a crown.
  ctx.beginPath();
  ctx.ellipse(-0.005, -0.4, 0.085, 0.07, -0.3, 0, Math.PI * 2);
  ctx.fillStyle = WASH;
  ctx.fill();
  ink(3);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-0.06, -0.43);
  ctx.lineTo(-0.25, -0.39);
  ctx.quadraticCurveTo(-0.275, -0.375, -0.25, -0.36);
  ctx.lineTo(-0.06, -0.36);
  ctx.closePath();
  ctx.fillStyle = WASH;
  ctx.fill();
  ctx.stroke();
  // The crown (coronet).
  ctx.beginPath();
  ctx.moveTo(0.0, -0.46);
  ctx.lineTo(0.015, -0.51);
  ctx.lineTo(0.035, -0.465);
  ctx.lineTo(0.055, -0.495);
  ctx.lineTo(0.06, -0.445);
  ctx.stroke();
  // The eye.
  ctx.fillStyle = PAPER_FILL;
  ctx.beginPath();
  ctx.arc(-0.025, -0.41, 0.022, 0, Math.PI * 2);
  ctx.fill();
  ink(2);
  ctx.stroke();
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.arc(-0.03, -0.41, 0.011, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
