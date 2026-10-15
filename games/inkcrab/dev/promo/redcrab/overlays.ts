import { INK, PAPER, PAPER_FILL, RED } from '../../../src/art/palette';
import type { Pt } from '../../../src/art/pen';
import { drawTextLine, type TextInk } from '../captions';
import { clamp01, lerp, smooth, VIDEO } from '../short';

/**
 * What's drawn over the scene: callouts with leader lines, arrows, the big
 * number, night falling, the moon and its phases, and the clouds of eggs.
 */
const NIGHT = '#16204a';

/** A label in ink handwriting, with a leader line to what it names. */
export function callout(ctx: CanvasRenderingContext2D, text: string, at: Pt, to: Pt | null, alpha: number, size = 64, ink?: TextInk): void {
  if (alpha <= 0) return;
  if (to) {
    const from = { x: at.x, y: to.y > at.y ? at.y + size * 0.25 : at.y - size * 0.8 };
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const len = Math.hypot(dx, dy) || 1;
    // The leader grows out from the label as it appears.
    const reach = smooth(alpha);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = PAPER;
    ctx.lineCap = 'round';
    ctx.lineWidth = 10;
    const tip = { x: from.x + dx * reach - (dx / len) * 12, y: from.y + dy * reach - (dy / len) * 12 };
    ctx.beginPath();
    ctx.moveTo(from.x + (dx / len) * 10, from.y + (dy / len) * 10);
    ctx.lineTo(tip.x, tip.y);
    ctx.stroke();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.restore();
  }
  drawTextLine(ctx, text, at.x, at.y, size, 700, alpha, ink);
}

/** A hand-drawn arrow from `a` to `b`. */
export function arrow(ctx: CanvasRenderingContext2D, a: Pt, b: Pt, alpha: number, width = 6, color = INK): void {
  if (alpha <= 0) return;
  const ang = Math.atan2(b.y - a.y, b.x - a.x);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const [c, w] of [[PAPER, width + 8], [color, width]] as const) {
    ctx.strokeStyle = c;
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.quadraticCurveTo((a.x + b.x) / 2, (a.y + b.y) / 2 - 10, b.x, b.y);
    for (const s of [-1, 1]) {
      ctx.moveTo(b.x, b.y);
      ctx.lineTo(b.x - 30 * Math.cos(ang + s * 0.5), b.y - 30 * Math.sin(ang + s * 0.5));
    }
    ctx.stroke();
  }
  ctx.restore();
}

/** "50,000,000" over the march, `show` 0 .. 1, swelling with `pulse`. */
export function drawCounter(ctx: CanvasRenderingContext2D, show: number, pulse: number): void {
  if (show <= 0) return;
  const s = 1 + 0.12 * pulse;
  ctx.save();
  ctx.translate(VIDEO.width / 2, 400);
  ctx.scale(s * lerp(1.4, 1, smooth(show)), s * lerp(1.4, 1, smooth(show)));
  drawTextLine(ctx, '50,000,000', 0, 0, 170, 700, clamp01(show * 2), { fill: RED, halo: PAPER });
  ctx.restore();
  drawTextLine(ctx, 'red crabs', VIDEO.width / 2, 478, 64, 700, clamp01(show * 2));
}

/** Night over everything, `night` 0 .. 1 (the text goes on top, on its paper halo). */
export function drawNight(ctx: CanvasRenderingContext2D, night: number): void {
  if (night <= 0) return;
  ctx.save();
  ctx.globalAlpha = 0.36 * night;
  ctx.fillStyle = NIGHT;
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
  ctx.restore();
}

/** A moon at a phase: `lit` -1 lit on the left (last quarter), 1 on the right (first quarter), 0 full, 2 new. */
function moonDisc(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, lit: number, alpha: number): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = lit === 2 ? '#3a4470' : PAPER_FILL;
  ctx.fill();
  if (lit === 1 || lit === -1) {
    ctx.beginPath();
    ctx.arc(x, y, r, lit === 1 ? Math.PI / 2 : -Math.PI / 2, lit === 1 ? (3 * Math.PI) / 2 : Math.PI / 2);
    ctx.fillStyle = '#3a4470';
    ctx.fill();
  }
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(2, r * 0.06);
  ctx.stroke();
  ctx.restore();
}

/** The moon rising over the sea (`rise` 0 below the horizon .. 1 up), last quarter, with a soft glow. */
export function drawMoon(ctx: CanvasRenderingContext2D, rise: number): void {
  if (rise <= 0) return;
  const e = smooth(rise);
  const x = 880;
  const y = lerp(640, 470, e);
  ctx.save();
  ctx.globalAlpha = 0.25 * e;
  const glow = ctx.createRadialGradient(x, y, 30, x, y, 150);
  glow.addColorStop(0, '#fff6d6');
  glow.addColorStop(1, 'rgba(255,246,214,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(x - 160, y - 160, 320, 320);
  ctx.restore();
  ctx.save();
  // Hidden below the horizon while it comes up.
  ctx.beginPath();
  ctx.rect(0, 0, VIDEO.width, 600);
  ctx.clip();
  moonDisc(ctx, x, y, 62, -1, 1);
  ctx.restore();
}

/** The moon's phases in a row, the last quarter ringed in red: when the eggs go into the sea. */
export function drawPhases(ctx: CanvasRenderingContext2D, show: number): void {
  if (show <= 0) return;
  const phases = [2, 1, 0, -1] as const;
  phases.forEach((lit, i) => {
    const x = 210 + i * 120;
    const pop = smooth(clamp01(show * 4 - i * 0.6));
    moonDisc(ctx, x, 360, 30 * pop, lit, pop);
  });
  const ring = clamp01(show * 2 - 0.8);
  if (ring > 0) {
    ctx.save();
    ctx.globalAlpha = ring;
    ctx.strokeStyle = RED;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.ellipse(570, 360, 52, 50, 0, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * smooth(ring));
    ctx.stroke();
    ctx.restore();
  }
  drawTextLine(ctx, 'last quarter moon', 470, 448, 60, 700, clamp01(show * 2 - 0.5));
}

/** One cloud of eggs, `u` 0 .. 1 of its life, spreading out from `at` into the water and fading. */
export function drawEggCloud(ctx: CanvasRenderingContext2D, at: Pt, u: number, seed: number, scale: number): void {
  if (u <= 0 || u >= 1) return;
  ctx.save();
  for (let k = 0; k < 34; k++) {
    const h = (n: number): number => {
      const v = Math.sin((seed * 41 + k) * 12.9898 + n * 78.233) * 43758.5453;
      return v - Math.floor(v);
    };
    const ang = lerp(-1.1, 0.7, h(1));
    const r = (12 + 110 * Math.sqrt(u) * (0.35 + 0.65 * h(2))) * scale;
    const x = at.x + Math.cos(ang) * r + 50 * u * scale;
    const y = at.y + Math.sin(ang) * r * 0.55 + 16 * u * scale;
    ctx.globalAlpha = (1 - u) * (0.6 + 0.4 * h(3));
    ctx.beginPath();
    ctx.arc(x, y, (2.2 + 2.2 * h(4)) * scale, 0, Math.PI * 2);
    ctx.fillStyle = '#f0c49a';
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  ctx.restore();
}
