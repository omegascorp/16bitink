import { INK, PAPER, RED } from '../../../src/art/palette';
import { drawTextLine, PAPER_ON_DARK } from '../captions';
import { drawBar } from '../python/marks';
import type { Pt } from '../sprites';

/**
 * The short's marks over the painting: radio waves travelling from the
 * collar to the antenna, the signal ringing out of the snake, a ring round
 * the collar, a metric number with its US one under it, the calendar's
 * flying pages and the radio collar itself.
 */
const HALO = '#0b1a2a';
const WAVE = '#ffe9a8';

function arc(ctx: CanvasRenderingContext2D, c: Pt, r: number, from: number, to: number, w: number, alpha: number): void {
  for (const [lw, colour, a] of [[w * 2.2, HALO, 0.55], [w, WAVE, 1]] as const) {
    ctx.save();
    ctx.globalAlpha = alpha * a;
    ctx.strokeStyle = colour;
    ctx.lineWidth = lw;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(c.x, c.y, r, from, to);
    ctx.stroke();
    ctx.restore();
  }
}

/** Little ")" arcs running from `from` to `to`, `phase` 0..1 along a wave's trip; `alpha` fades them all. */
export function drawWaves(ctx: CanvasRenderingContext2D, from: Pt, to: Pt, phase: number, alpha: number): void {
  if (alpha <= 0) return;
  const dir = Math.atan2(to.y - from.y, to.x - from.x);
  const len = Math.hypot(to.x - from.x, to.y - from.y);
  for (let k = 0; k < 3; k++) {
    const u = (phase + k / 3) % 1;
    const c = { x: from.x + Math.cos(dir) * len * u, y: from.y + Math.sin(dir) * len * u };
    const r = 22 + 18 * u;
    arc(ctx, { x: c.x - Math.cos(dir) * r, y: c.y - Math.sin(dir) * r }, r, dir - 0.7, dir + 0.7, 5, alpha * Math.sin(u * Math.PI));
  }
}

/** The signal ringing out of a point: rings growing and fading, `t` seconds since it began. */
export function drawRings(ctx: CanvasRenderingContext2D, c: Pt, t: number, size: number, alpha: number): void {
  if (alpha <= 0 || t < 0) return;
  for (let k = 0; k < 3; k++) {
    const u = (t * 1.4 + k / 3) % 1;
    arc(ctx, c, size * (0.3 + u), 0, Math.PI * 2, 8, alpha * (1 - u * 0.8) * Math.min(1, t * 6));
  }
}

/** A hand-inked ring round something, drawn on as `show` goes 0..1. */
export function drawCircleMark(ctx: CanvasRenderingContext2D, c: Pt, r: number, show: number): void {
  if (show <= 0) return;
  const end = -Math.PI * 0.6 + Math.PI * 2.15 * Math.min(1, show * 1.4);
  ctx.save();
  ctx.lineCap = 'round';
  for (const [w, colour] of [[16, PAPER], [7, RED]] as const) {
    ctx.strokeStyle = colour;
    ctx.lineWidth = w;
    ctx.beginPath();
    for (let a = -Math.PI * 0.6; a <= end; a += 0.05) {
      const rr = r * (1 + 0.06 * Math.sin(a * 3));
      const p = { x: c.x + Math.cos(a) * rr, y: c.y + Math.sin(a) * rr * 0.86 };
      if (a === -Math.PI * 0.6) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
  }
  ctx.restore();
}

/** A metric number, big, with the US one under it, popping in. */
export function drawUnits(ctx: CanvasRenderingContext2D, metric: string, us: string, c: Pt, size: number, show: number): void {
  if (show <= 0) return;
  const pop = show < 1 ? 0.7 + 0.3 * show + 0.12 * Math.sin(show * Math.PI) : 1;
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.scale(pop, pop);
  drawTextLine(ctx, metric, 0, 0, size, 700, Math.min(1, show * 1.4), PAPER_ON_DARK);
  drawTextLine(ctx, us, 0, size * 0.72, size * 0.62, 700, Math.min(1, show * 1.4), PAPER_ON_DARK);
  ctx.restore();
}

/** A length bar from a to b (screen px), drawn out from `a` as `show` goes 0..1. */
export function drawLength(ctx: CanvasRenderingContext2D, a: Pt, b: Pt, show: number): void {
  if (show <= 0) return;
  const k = Math.min(1, show * 1.3);
  drawBar(ctx, a, { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k }, Math.min(1, show * 2));
}

/** A tear-off desk calendar: a red band (JULY 1999), the day's number, the page before flying off. */
export function drawCalendar(ctx: CanvasRenderingContext2D, c: Pt, w: number, day: number, flip: number, alpha: number): void {
  if (alpha <= 0) return;
  const h = w * 1.1;
  const page = (n: number): void => {
    ctx.fillStyle = PAPER;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.rect(-w / 2, -h / 2, w, h);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = RED;
    ctx.fillRect(-w / 2 + 2.5, -h / 2 + 2.5, w - 5, h * 0.26);
    drawTextLine(ctx, 'JULY 1999', 0, -h / 2 + h * 0.2, w * 0.17, 700, 1, { fill: PAPER, halo: RED });
    drawTextLine(ctx, String(n), 0, h * 0.3, w * 0.56, 700, 1);
  };
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(c.x, c.y);
  ctx.rotate(-0.05);
  page(day);
  if (flip > 0 && flip < 1) {
    ctx.save();
    ctx.translate(w * 0.9 * flip, -h * 0.6 * flip);
    ctx.rotate(0.9 * flip);
    ctx.globalAlpha = alpha * (1 - flip);
    page(Math.max(1, day - 1));
    ctx.restore();
  }
  for (const x of [-w * 0.3, 0, w * 0.3]) {
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.arc(x, -h / 2 + 4, 7, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** The radio collar on its own (held up after the operation): a loop of orange belting, the grey transmitter, the whip antenna. */
export function drawCollar(ctx: CanvasRenderingContext2D, c: Pt, r: number, rot: number, glint: number): void {
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.rotate(rot);
  ctx.lineCap = 'round';
  for (const [w, colour] of [[r * 0.34, '#1a1410'], [r * 0.24, '#c97a32']] as const) {
    ctx.strokeStyle = colour;
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.ellipse(0, 0, r, r * 0.42, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(255,214,150,0.7)';
  ctx.lineWidth = r * 0.06;
  ctx.beginPath();
  ctx.ellipse(0, -r * 0.02, r * 0.98, r * 0.38, 0, Math.PI * 1.05, Math.PI * 1.7);
  ctx.stroke();
  ctx.fillStyle = '#8f9494';
  ctx.strokeStyle = '#1a1410';
  ctx.lineWidth = r * 0.05;
  ctx.beginPath();
  ctx.rect(-r * 0.3, r * 0.22, r * 0.6, r * 0.42);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = 'rgba(230,236,236,0.8)';
  ctx.fillRect(-r * 0.24, r * 0.27, r * 0.24, r * 0.1);
  ctx.strokeStyle = '#2a2a2a';
  ctx.lineWidth = r * 0.04;
  ctx.beginPath();
  ctx.moveTo(r * 0.24, r * 0.5);
  ctx.quadraticCurveTo(r * 0.7, r * 0.7, r * 1.05, r * 1.15);
  ctx.stroke();
  ctx.restore();
  if (glint <= 0) return;
  ctx.save();
  ctx.globalAlpha = glint;
  ctx.strokeStyle = '#fffbe8';
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  const g = { x: c.x - r * 0.55, y: c.y - r * 0.32 };
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.4;
    ctx.beginPath();
    ctx.moveTo(g.x + Math.cos(a) * 10, g.y + Math.sin(a) * 10);
    ctx.lineTo(g.x + Math.cos(a) * 34, g.y + Math.sin(a) * 34);
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * The bear inside, as an X-ray: a curled-up sun bear's silhouette (round
 * ears, short snout, stubby legs), head to the left, filled dark and edged
 * with a dashed paper line, at `c` and `k` px per unit. The caller clips it
 * to the snake.
 */
export function drawBearGhost(ctx: CanvasRenderingContext2D, c: Pt, k: number, alpha: number): void {
  if (alpha <= 0) return;
  const path = new Path2D();
  path.ellipse(30, 0, 124, 62, 0, 0, Math.PI * 2);
  path.moveTo(-64, -8);
  path.arc(-110, -8, 46, 0, Math.PI * 2);
  for (const [x, y] of [[-130, -48], [-90, -52]] as const) {
    path.moveTo(x + 14, y);
    path.arc(x, y, 14, 0, Math.PI * 2);
  }
  path.moveTo(-136, 4);
  path.ellipse(-158, 6, 22, 15, 0, 0, Math.PI * 2);
  for (const x of [-40, -8, 70, 104]) {
    path.moveTo(x + 13, 44);
    path.ellipse(x, 60, 13, 22, 0.2, 0, Math.PI * 2);
  }
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.scale(k, k);
  ctx.globalAlpha = alpha * 0.7;
  ctx.fillStyle = '#1a1418';
  ctx.fill(path, 'nonzero');
  ctx.globalAlpha = alpha;
  ctx.setLineDash([22 / k, 14 / k]);
  ctx.lineWidth = 5 / k;
  ctx.strokeStyle = PAPER;
  ctx.stroke(path);
  ctx.restore();
}
