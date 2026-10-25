import { INK, Pen, type Pt } from '../../../src/art/pen';
import { createRng } from '../../../src/logic/rng';
import { drawTextLine, type TextInk } from '../captions';
import { TEXT } from './script';

/**
 * Chalk marks over the picture: the size bar, water streaming into the
 * sealing lips, the pop as a plug comes out, the cookie-cutter inset, and
 * the wink's sparkle.
 */

export const CHALK = '#e6efe9';
export const SPOKEN = '#f5c84a';

const range = (n: number, f: (u: number) => Pt): Pt[] => Array.from({ length: n + 1 }, (_, i) => f(i / n));

/** A dimension bar from `x0` to `x1` at `y`, growing from its middle, with its label under it. */
export function drawSizeBar(ctx: CanvasRenderingContext2D, x0: number, x1: number, y: number, label: string, alpha: number, halo: string): void {
  if (alpha <= 0) return;
  const grow = Math.min(1, alpha * 1.6);
  const mid = (x0 + x1) / 2;
  const half = ((x1 - x0) / 2) * grow;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = SPOKEN;
  ctx.lineCap = 'round';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(mid - half, y);
  ctx.lineTo(mid + half, y);
  for (const x of [mid - half, mid + half]) {
    ctx.moveTo(x, y - 20);
    ctx.lineTo(x, y + 20);
  }
  ctx.stroke();
  ctx.restore();
  const ink: TextInk = { fill: SPOKEN, halo };
  drawTextLine(ctx, label, mid, y + TEXT.sizeBar.labelBelow, TEXT.sizeBar.size, 700, alpha, ink);
}

const STREAKS = (() => {
  const rng = createRng(61);
  return Array.from({ length: 14 }, (_, k) => ({ angle: ((k + 0.5) / 14) * Math.PI * 2, phase: rng(), reach: 0.7 + rng() * 0.5 }));
})();

/** Water rushing in round the lips as they seal: chalk streaks pulled in towards `at`, flattened to the rubber's slant. */
export function drawSuction(ctx: CanvasRenderingContext2D, at: Pt, size: number, pull: number, clock: number): void {
  if (pull <= 0) return;
  ctx.save();
  ctx.strokeStyle = CHALK;
  ctx.lineCap = 'round';
  for (const s of STREAKS) {
    const flow = (s.phase + clock * 2.4) % 1;
    const d = size * s.reach * (1.2 - flow);
    const len = size * 0.22 * (1 - flow * 0.5);
    const dir = { x: Math.cos(s.angle), y: Math.sin(s.angle) * 0.45 };
    ctx.globalAlpha = 0.75 * pull * Math.min(1, flow * 4) * Math.min(1, (1 - flow) * 4);
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(at.x + dir.x * d, at.y + dir.y * d);
    ctx.lineTo(at.x + dir.x * (d - len), at.y + dir.y * (d - len));
    ctx.stroke();
  }
  ctx.restore();
}

/** The pop as the plug comes out: short chalk ticks bursting from `at`; `u` 0 → 1 over the burst. */
export function drawPop(ctx: CanvasRenderingContext2D, at: Pt, size: number, u: number): void {
  if (u < 0 || u > 1) return;
  const grow = 1 - (1 - u) ** 3;
  ctx.save();
  ctx.strokeStyle = CHALK;
  ctx.lineCap = 'round';
  ctx.lineWidth = 6 * (1 - u * 0.6);
  ctx.globalAlpha = u < 0.6 ? 1 : (1 - u) / 0.4;
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2 + 0.2;
    const r0 = size * (0.5 + 0.5 * grow);
    const r1 = size * (0.75 + 0.75 * grow);
    ctx.beginPath();
    ctx.moveTo(at.x + Math.cos(a) * r0, at.y + Math.sin(a) * r0 * 0.6);
    ctx.lineTo(at.x + Math.cos(a) * r1, at.y + Math.sin(a) * r1 * 0.6);
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * A round inset: a ring cutter pressing into rolled dough on a floured
 * board, lifting off a perfect round cookie. `open` scales the inset in,
 * `press` pushes the cutter down, `cut` leaves the cut cookie.
 */
export function drawCookieInset(ctx: CanvasRenderingContext2D, c: Pt, r: number, look: { readonly open: number; readonly press: number; readonly cut: number }, boil: number): void {
  if (look.open <= 0) return;
  const pen = new Pen(ctx, 991 + boil * 37, 1.1);
  const s = look.open < 1 ? look.open * (1 + 0.15 * Math.sin(Math.PI * look.open)) : 1;
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.scale(s, s);
  // The frame: paper, a warm kitchen light.
  const disc = range(36, (u) => ({ x: r * Math.cos(Math.PI * 2 * u), y: r * Math.sin(Math.PI * 2 * u) }));
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = '#efe2c4';
  ctx.fill();
  ctx.clip();
  // The dough, rolled flat (seen at a slant), floury.
  const dough = range(30, (u) => ({ x: -r * 1.1 + u * r * 2.2, y: 10 + Math.sin(u * 5) * 4 }));
  const sheet = [...dough, { x: r * 1.2, y: r * 1.2 }, { x: -r * 1.2, y: r * 1.2 }];
  pen.fill(sheet, '#d9b27a', 1);
  pen.stipple(sheet, 200, () => 0.6, 1.6, '#fbf3e0');
  pen.stroke(dough, 2.6, INK, 0.9, false);
  const hole = { x: 0, y: r * 0.42 };
  const rx = r * 0.48;
  const ry = r * 0.17;
  if (look.cut > 0) {
    // The cut: a ring line, and the cookie lifting a little.
    const lift = 10 * (1 - look.press);
    pen.fill(range(24, (u) => ({ x: hole.x + rx * Math.cos(Math.PI * 2 * u), y: hole.y + ry * Math.sin(Math.PI * 2 * u) + 6 })), '#8a6438', 0.7);
    pen.fill(range(24, (u) => ({ x: hole.x + rx * Math.cos(Math.PI * 2 * u), y: hole.y - lift + ry * Math.sin(Math.PI * 2 * u) })), '#e7c48c', 1);
    pen.stroke(range(24, (u) => ({ x: hole.x + rx * Math.cos(Math.PI * 2 * u), y: hole.y - lift + ry * Math.sin(Math.PI * 2 * u) })), 2.6, INK, 1, false);
    for (const d of [{ x: -0.4, y: -0.2 }, { x: 0.1, y: 0.3 }, { x: 0.45, y: -0.1 }, { x: -0.1, y: -0.45 }]) pen.dot(hole.x + d.x * rx, hole.y - lift + d.y * ry, 3, '#a0743c', 0.8);
  }
  // The cutter: a metal ring, up above and pressing down.
  const up = (1 - look.press) * r * 0.75;
  const top = hole.y - up - r * 0.28;
  // A fluted cutter: its rim waves in and out, as a cookie cutter's does.
  const ring = (y: number): Pt[] => range(56, (u) => {
    const flute = 1.04 + 0.07 * Math.sin(u * Math.PI * 2 * 12);
    return { x: hole.x + rx * flute * Math.cos(Math.PI * 2 * u), y: y + ry * flute * Math.sin(Math.PI * 2 * u) };
  });
  const wall = [...ring(top).slice(0, 29), ...ring(hole.y - up).slice(0, 29).reverse()];
  pen.fill(wall, '#b9c2c6', 1);
  for (let i = 1; i < 28; i += 2) pen.hair([ring(top)[i]!, ring(hole.y - up)[i]!], 1.4, '#7d878c', 0.6);
  pen.fill(ring(top), '#6e787d', 1);
  pen.fill(range(28, (u) => ({ x: hole.x + rx * 0.9 * Math.cos(Math.PI * 2 * u), y: top + ry * 0.85 * Math.sin(Math.PI * 2 * u) })), '#d9b27a', look.press > 0.5 ? 1 : 0.3);
  pen.stroke(ring(top), 2.6, INK, 1, false);
  pen.stroke(ring(hole.y - up).slice(0, 29), 2.6, INK, 1, false);
  pen.hair([{ x: hole.x - rx * 0.7, y: top + ry * 0.9 }, { x: hole.x - rx * 0.6, y: hole.y - up + ry * 0.7 }], 4, '#f4f6f6', 0.7);
  ctx.restore();
  // The inset's rim.
  pen.stroke([...disc], 6, INK, 1, true);
  pen.stroke(disc.map((p) => ({ x: p.x * 1.03, y: p.y * 1.03 })), 3, CHALK, 0.8, false);
  ctx.restore();
}

/** A four-point sparkle by the winking eye; `u` 0 → 1 over its life. */
export function drawSparkle(ctx: CanvasRenderingContext2D, at: Pt, size: number, u: number): void {
  if (u < 0 || u > 1) return;
  const s = size * Math.sin(Math.PI * u);
  ctx.save();
  ctx.translate(at.x, at.y);
  ctx.rotate(u * 0.8);
  ctx.fillStyle = '#fff6d6';
  ctx.globalAlpha = 0.95;
  ctx.beginPath();
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    const r = k % 2 === 0 ? s : s * 0.22;
    if (k === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
