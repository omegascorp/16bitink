import { INK } from '../../../src/art/palette';
import { smooth, window01 } from '../short';
import { card, write } from './hud';

/**
 * The two anatomy insets for "how does that fit?", in pen and wash on a
 * paper card: the skull from above with the two lower-jaw bones joined at
 * the chin only by a stretchy band (they spread, then each side, upper and
 * lower jaw together, walks forward in turn); and the snorkel, a side
 * cut-away of the head round a meal with the windpipe pushed forward under it.
 */

const LINE = '#2b2418';
const BONE = '#f3ead2';
const BONE_SHADE = '#d9c9a0';
const SKIN = '#c9a56e';
const MEAL = '#a07a52';

function ink(ctx: CanvasRenderingContext2D, w = 4): void {
  ctx.strokeStyle = LINE;
  ctx.lineWidth = w;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.stroke();
}

/** A long bone from a to b, `w` thick, tapering at both ends, washed and inked. */
function longBone(ctx: CanvasRenderingContext2D, ax: number, ay: number, bx: number, by: number, w: number): void {
  const a = Math.atan2(by - ay, bx - ax);
  const len = Math.hypot(bx - ax, by - ay);
  ctx.save();
  ctx.translate(ax, ay);
  ctx.rotate(a);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(len * 0.1, -w * 0.7, len * 0.5, -w * 0.45);
  ctx.quadraticCurveTo(len * 0.9, -w * 0.35, len, 0);
  ctx.quadraticCurveTo(len * 0.9, w * 0.35, len * 0.5, w * 0.45);
  ctx.quadraticCurveTo(len * 0.1, w * 0.7, 0, 0);
  ctx.fillStyle = BONE;
  ctx.fill();
  ink(ctx, 3);
  ctx.beginPath();
  ctx.moveTo(len * 0.15, w * 0.2);
  ctx.lineTo(len * 0.8, w * 0.15);
  ctx.strokeStyle = BONE_SHADE;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}

/** Teeth along a bone: little hooks pointing back. */
function teeth(ctx: CanvasRenderingContext2D, ax: number, ay: number, bx: number, by: number, side: number): void {
  ctx.beginPath();
  for (let i = 1; i < 9; i++) {
    const u = i / 9;
    const x = ax + (bx - ax) * u;
    const y = ay + (by - ay) * u;
    ctx.moveTo(x, y);
    ctx.lineTo(x - 7, y - side * 7);
  }
  ink(ctx, 2);
}

export interface JawBeats {
  readonly from: number;
  readonly spread: number;
  readonly left: number;
  readonly right: number;
  readonly to: number;
}

/** The skull from above, nose to the right, a meal ahead of it. */
export function drawJaws(ctx: CanvasRenderingContext2D, t: number, b: JawBeats): void {
  const a = window01(t, b.from, b.to, 0.3);
  if (a <= 0) return;
  const x = 1490;
  const y = 430;
  card(ctx, x - 380, y - 270, 760, 540, a, -0.01);
  const spread = smooth((t - b.spread) / 1.2) * 46;
  const walk = [smooth((t - b.left) / 0.9) * 40, smooth((t - b.right) / 0.9) * 40];
  ctx.save();
  ctx.globalAlpha = a;
  ctx.translate(x - 40, y + 10);
  // The meal ahead, dashed.
  ctx.beginPath();
  ctx.ellipse(250, 0, 95, 70 + spread * 0.8, 0, 0, Math.PI * 2);
  ctx.setLineDash([12, 10]);
  ctx.fillStyle = 'rgba(160,122,82,0.25)';
  ctx.fill();
  ink(ctx, 3);
  ctx.setLineDash([]);
  // The braincase.
  ctx.beginPath();
  ctx.moveTo(-170, 0);
  ctx.bezierCurveTo(-170, -50, -90, -58, -10, -46);
  ctx.bezierCurveTo(60, -36, 110, -16, 120, 0);
  ctx.bezierCurveTo(110, 16, 60, 36, -10, 46);
  ctx.bezierCurveTo(-90, 58, -170, 50, -170, 0);
  ctx.fillStyle = BONE;
  ctx.fill();
  ink(ctx, 4);
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(10, side * 30, 18, 13, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#4a3a28';
    ctx.fill();
    ink(ctx, 2);
  }
  // Each side: upper jaw (maxilla) and lower jaw (mandible), hinged at the back on the quadrate.
  ([[-1, walk[0]!], [1, walk[1]!]] as const).forEach(([side, w]) => {
    const hinge = { x: -190 + w * 0.4, y: side * (88 + spread * 0.4) };
    longBone(ctx, -150, side * 40, hinge.x, hinge.y, 16);
    longBone(ctx, -60 + w, side * (52 + spread * 0.3), 110 + w, side * (26 + spread * 0.5), 14);
    teeth(ctx, -40 + w, side * (50 + spread * 0.3), 100 + w, side * (28 + spread * 0.5), side);
    longBone(ctx, hinge.x, hinge.y, 150 + w, side * (14 + spread), 18);
  });
  // The chin: no joint, only a stretchy band between the two tips.
  const ty = 14 + spread;
  ctx.beginPath();
  for (let i = 0; i <= 12; i++) {
    const u = i / 12;
    const px = 150 + walk[0]! + (walk[1]! - walk[0]!) * u + (i % 2 ? 10 : -4);
    ctx.lineTo(px, -ty + 2 * ty * u);
  }
  ctx.strokeStyle = '#c4505c';
  ctx.lineWidth = 5;
  ctx.stroke();
  ctx.restore();
  write(ctx, 'skull from above', x, y - 205, 50, { alpha: a });
  write(ctx, 'lower jaw: two bones', x - 230, y + 185, 38, { alpha: a, align: 'left' });
  write(ctx, 'stretchy skin', x + 190, y - 120, 40, { alpha: a * smooth((t - b.spread) / 0.6), fill: '#b2434e' });
  write(ctx, 'left side…', x - 200, y + 240, 44, { alpha: a * smooth((t - b.left) / 0.4), align: 'left' });
  write(ctx, '…then right', x + 70, y + 240, 44, { alpha: a * smooth((t - b.right) / 0.4), align: 'left' });
}

/** The snorkel: the head side-on, cut away, round its meal, the windpipe pushed out under it. */
export function drawSnorkel(ctx: CanvasRenderingContext2D, t: number, from: number, to: number): void {
  const a = window01(t, from, to, 0.3);
  if (a <= 0) return;
  const x = 1490;
  const y = 430;
  card(ctx, x - 380, y - 270, 760, 540, a, 0.012);
  const out = smooth((t - from - 0.4) / 0.8);
  ctx.save();
  ctx.globalAlpha = a;
  ctx.translate(x - 60, y + 10);
  // Neck, upper jaw lifted over the meal, lower jaw under it (skin wash, ink).
  ctx.beginPath();
  ctx.moveTo(-320, -45);
  ctx.bezierCurveTo(-200, -60, -100, -150, 60, -150);
  ctx.bezierCurveTo(120, -150, 150, -128, 160, -110);
  ctx.lineTo(60, -112);
  ctx.bezierCurveTo(-40, -112, -120, -60, -160, -20);
  ctx.lineTo(-160, 40);
  ctx.bezierCurveTo(-100, 95, 0, 110, 140, 112);
  ctx.lineTo(140, 130);
  ctx.bezierCurveTo(0, 140, -180, 120, -320, 55);
  ctx.closePath();
  ctx.fillStyle = SKIN;
  ctx.fill();
  ink(ctx, 4);
  // The eye on the upper jaw.
  ctx.beginPath();
  ctx.arc(70, -132, 9, 0, Math.PI * 2);
  ctx.fillStyle = INK;
  ctx.fill();
  // The meal in the mouth.
  ctx.beginPath();
  ctx.ellipse(70, -2, 150, 100, 0, 0, Math.PI * 2);
  ctx.fillStyle = MEAL;
  ctx.globalAlpha = a * 0.6;
  ctx.fill();
  ctx.globalAlpha = a;
  ink(ctx, 3);
  // The windpipe: a ringed tube along the floor of the mouth, its opening pushed out past the lips.
  const tip = 150 + out * 60;
  ctx.beginPath();
  ctx.moveTo(-300, 80);
  ctx.bezierCurveTo(-150, 95, 0, 104, tip, 92);
  ctx.lineTo(tip, 114);
  ctx.bezierCurveTo(0, 126, -150, 118, -300, 104);
  ctx.closePath();
  ctx.fillStyle = '#eaa3a3';
  ctx.fill();
  ink(ctx, 3);
  ctx.beginPath();
  for (let i = -280; i < tip - 8; i += 20) {
    ctx.moveTo(i, 84 + (i + 300) * 0.04);
    ctx.lineTo(i, 108 + (i + 300) * 0.03);
  }
  ink(ctx, 2);
  // A breath going in.
  const ph = (t * 1.2) % 1;
  ctx.globalAlpha = a * out;
  ctx.beginPath();
  ctx.moveTo(tip + 120 - ph * 30, 60);
  ctx.quadraticCurveTo(tip + 70 - ph * 30, 60, tip + 30, 100);
  ink(ctx, 5);
  ctx.beginPath();
  ctx.moveTo(tip + 30, 100);
  ctx.lineTo(tip + 52, 98);
  ctx.moveTo(tip + 30, 100);
  ctx.lineTo(tip + 36, 80);
  ink(ctx, 5);
  ctx.restore();
  write(ctx, 'breathing while it swallows', x, y - 205, 46, { alpha: a });
  write(ctx, 'meal', x + 10, y + 10, 46, { alpha: a, fill: '#f5f0e1', halo: '#5a4028' });
  write(ctx, 'windpipe', x - 200, y + 200, 50, { alpha: a * out, fill: '#b2434e' });
  write(ctx, 'air', x + 230, y + 50, 44, { alpha: a * out });
}
