import { INK, PAPER, RED } from '../../../src/art/palette';
import { CAPTION_FONT, drawTextLine, PAPER_ON_DARK } from '../captions';
import { VIDEO } from '../short';
import type { Pt } from '../sprites';
import type { Board } from './reef';
import { CAY } from './reef';
import { type Camera, toScreen } from './snake';
import { cycles, type Grade } from './story';

/**
 * What's drawn round the cast: the board under the camera, the light on the
 * water (the reef's view: a wobbling net of bright lines), bubbles and
 * ripples, the game's breath meter, the labels and the clock, the "z"s,
 * the venom, and the grade over everything (vignette, tint, the sun).
 */

const W = VIDEO.width;
const H = VIDEO.height;

/** The painted board under the camera. */
export function drawBoard(ctx: CanvasRenderingContext2D, board: Board, cam: Camera): void {
  const tl = toScreen(cam, { x: 0, y: 0 });
  ctx.drawImage(board.canvas, tl.x, tl.y, (board.canvas.width / board.res) * cam.zoom, (board.canvas.height / board.res) * cam.zoom);
}

const onCay = (p: Pt): boolean => Math.hypot(p.x - CAY.x, p.y - CAY.y) < CAY.r + 4;

/**
 * Light through the waves, as reefView.ts draws it: a staggered grid of
 * points wobbling, each tied to three neighbours by a bright bent line, lit
 * in drifting patches, never over the cay. Its wobble runs in whole cycles a
 * loop so the seam doesn't jump.
 */
export function drawWaterLight(ctx: CanvasRenderingContext2D, cam: Camera, t: number, strength = 1): void {
  const CELL = 58;
  const WOB = 15;
  const ph = (n: number): number => cycles(n, t);
  const at = (i: number, j: number): Pt => ({
    x: (i + (j % 2) * 0.5 - 0.5) * CELL + Math.sin(ph(2) + i * 1.7 + j * 0.6) * WOB,
    y: (j - 0.5) * CELL * 0.8 + Math.cos(ph(2) + j * 1.3 + i * 0.4) * WOB,
  });
  const lineW = Math.min(cam.zoom, 3.2);
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (let i = -1; i < 19; i++) {
    for (let j = -1; j < 15; j++) {
      const p = at(i, j);
      const sp = toScreen(cam, p);
      if (sp.x < -200 || sp.x > W + 200 || sp.y < -200 || sp.y > H + 200 || onCay(p)) continue;
      const odd = ((j % 2) + 2) % 2;
      for (const q of [at(i + 1, j), at(i - 1 + odd, j + 1), at(i + odd, j + 1)]) {
        if (onCay(q)) continue;
        const lit = Math.sin(ph(2) + p.x * 0.011 + p.y * 0.017) * Math.cos(ph(1) - p.x * 0.007 + p.y * 0.009);
        const a = Math.max(0, 0.03 + 0.2 * lit) * strength;
        if (a < 0.03) continue;
        const bow = Math.sin(ph(4) + p.x * 0.05 + q.y * 0.04) * 7;
        const dx = q.x - p.x;
        const dy = q.y - p.y;
        const len = Math.hypot(dx, dy) || 1;
        const mid = toScreen(cam, { x: (p.x + q.x) / 2 - (dy / len) * bow, y: (p.y + q.y) / 2 + (dx / len) * bow });
        const sq = toScreen(cam, q);
        ctx.strokeStyle = `rgba(255,255,255,${a})`;
        ctx.lineWidth = (1 + a * 3) * lineW;
        ctx.beginPath();
        ctx.moveTo(sp.x, sp.y);
        ctx.lineTo(mid.x, mid.y);
        ctx.lineTo(sq.x, sq.y);
        ctx.stroke();
      }
    }
  }
  ctx.restore();
}

/** One bubble or ripple: where and when it started. */
export interface Fleck {
  readonly at: Pt;
  readonly born: number;
  readonly life: number;
  readonly r: number;
  readonly v: Pt;
}

/** Bubbles rise from the nostrils, growing and fading (reefView.ts's). */
export function drawBubbles(ctx: CanvasRenderingContext2D, cam: Camera, flecks: readonly Fleck[], t: number): void {
  for (const b of flecks) {
    const k = (t - b.born) / b.life;
    if (k < 0 || k >= 1) continue;
    const p = toScreen(cam, { x: b.at.x + b.v.x * (t - b.born), y: b.at.y + b.v.y * (t - b.born) });
    const r = b.r * (1 + k * 1.2) * cam.zoom;
    ctx.save();
    ctx.fillStyle = `rgba(217,243,247,${0.35 * (1 - k)})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = `rgba(38,49,106,${0.45 * (1 - k)})`;
    ctx.lineWidth = Math.max(1.5, 0.5 * cam.zoom);
    ctx.stroke();
    ctx.fillStyle = `rgba(255,255,255,${0.9 * (1 - k)})`;
    ctx.beginPath();
    ctx.arc(p.x - r * 0.35, p.y - r * 0.35, Math.max(1, r * 0.32), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

/** Ripples spreading from where the head breaks the surface. */
export function drawRipples(ctx: CanvasRenderingContext2D, cam: Camera, flecks: readonly Fleck[], t: number): void {
  ctx.save();
  for (const r of flecks) {
    const k = (t - r.born) / r.life;
    if (k < 0 || k >= 1) continue;
    const p = toScreen(cam, r.at);
    ctx.strokeStyle = `rgba(255,255,255,${0.6 * (1 - k)})`;
    ctx.lineWidth = Math.max(2, 0.6 * cam.zoom);
    ctx.beginPath();
    ctx.arc(p.x, p.y, (5 + r.r * k) * cam.zoom, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

/** The game's breath meter: a ring of 20 dots round the head, emptying (red and pulsing when low), as reefView.ts draws it. */
export function drawBreath(ctx: CanvasRenderingContext2D, cam: Camera, head: Pt, value: number, alpha: number, t: number): void {
  if (alpha <= 0) return;
  const c = toScreen(cam, head);
  const r = 34 * cam.zoom;
  const n = 20;
  const shown = Math.ceil(value * n);
  const low = value < 0.28;
  const pulse = low ? 0.6 + 0.4 * Math.sin(cycles(44, t)) : 0.9;
  ctx.save();
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (i / n) * Math.PI * 2;
    const on = i < shown;
    ctx.globalAlpha = alpha * (on ? pulse : 0.2);
    ctx.fillStyle = on && low ? RED : on ? PAPER : INK;
    ctx.beginPath();
    ctx.arc(c.x + Math.cos(a) * r, c.y + Math.sin(a) * r, 2.6 * cam.zoom, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = alpha * (on ? 0.8 : 0.25);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  ctx.restore();
}

/** A pen-drawn clock: its face, twelve ticks, the hands at `turns` of the minute hand (each turn an hour). */
export function drawClock(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, turns: number, alpha: number): void {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  ctx.lineCap = 'round';
  ctx.fillStyle = PAPER;
  ctx.strokeStyle = INK;
  ctx.lineWidth = r * 0.1;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // The swept time, shaded like a pie slice.
  ctx.fillStyle = 'rgba(39,64,139,0.22)';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.arc(0, 0, r * 0.86, -Math.PI / 2, -Math.PI / 2 + Math.min(turns, 1) * Math.PI * 2);
  ctx.closePath();
  ctx.fill();
  ctx.lineWidth = r * 0.06;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * r * 0.78, Math.sin(a) * r * 0.78);
    ctx.lineTo(Math.cos(a) * r * 0.9, Math.sin(a) * r * 0.9);
    ctx.stroke();
  }
  const hand = (a: number, len: number, w: number): void => {
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a) * len, Math.sin(a) * len);
    ctx.stroke();
  };
  hand(-Math.PI / 2 + turns * Math.PI * 2, r * 0.78, r * 0.08);
  hand(-Math.PI / 2 + (turns / 12) * Math.PI * 2, r * 0.5, r * 0.12);
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.09, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** A handwritten note in paper on dark, popping in with a little overshoot. */
export function drawNote(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, show: number): void {
  if (show <= 0) return;
  const pop = show < 1 ? 0.7 + 0.3 * show + 0.12 * Math.sin(show * Math.PI) : 1;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(pop, pop);
  drawTextLine(ctx, text, 0, 0, size, 700, Math.min(1, show * 1.4), PAPER_ON_DARK);
  ctx.restore();
}

/** "z"s drifting up from a sleeper's head, one after another. */
export function drawZs(ctx: CanvasRenderingContext2D, at: Pt, since: number, size: number, rise = 260): void {
  if (since <= 0) return;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let i = 0; i < 4; i++) {
    const k = (since - i * 0.32) / 1.25;
    if (k <= 0) continue;
    const u = k % 1;
    if (k > 1 && i > 0) continue;
    const a = Math.min(1, u * 5) * (1 - u) ** 0.6;
    const s = size * (0.55 + 0.6 * u);
    const x = at.x + 30 * u + 26 * Math.sin(u * 5 + i);
    const y = at.y - rise * u;
    ctx.font = `700 ${s}px ${CAPTION_FONT}`;
    ctx.lineJoin = 'round';
    ctx.globalAlpha = a * 0.9;
    ctx.strokeStyle = '#0b1a2a';
    ctx.lineWidth = s * 0.16;
    ctx.strokeText('z', x, y);
    ctx.globalAlpha = a;
    ctx.fillStyle = PAPER;
    ctx.fillText('z', x, y);
  }
  ctx.restore();
}

/** A drop of venom: a pale yellow-green drop, inked, with a glint. */
export function drawDrop(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, alpha: number): void {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  ctx.beginPath();
  ctx.moveTo(0, -r * 1.9);
  ctx.bezierCurveTo(r * 0.5, -r * 0.9, r, -r * 0.4, r, r * 0.2);
  ctx.arc(0, r * 0.2, r, 0, Math.PI);
  ctx.bezierCurveTo(-r, -r * 0.4, -r * 0.5, -r * 0.9, 0, -r * 1.9);
  ctx.closePath();
  ctx.fillStyle = '#d8e58a';
  ctx.fill();
  ctx.lineWidth = r * 0.16;
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,240,0.9)';
  ctx.beginPath();
  ctx.ellipse(-r * 0.35, -r * 0.05, r * 0.18, r * 0.36, 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** A burst of light on the bite. */
export function drawFlash(ctx: CanvasRenderingContext2D, at: Pt, k: number): void {
  if (k <= 0 || k >= 1) return;
  ctx.save();
  const r = 160 + 420 * k;
  const g = ctx.createRadialGradient(at.x, at.y, 0, at.x, at.y, r);
  g.addColorStop(0, `rgba(255,252,230,${0.85 * (1 - k)})`);
  g.addColorStop(0.4, `rgba(255,236,170,${0.35 * (1 - k)})`);
  g.addColorStop(1, 'rgba(255,236,170,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  // Ink strokes flying out: a strike.
  ctx.strokeStyle = `rgba(255,250,235,${0.9 * (1 - k)})`;
  ctx.lineCap = 'round';
  ctx.lineWidth = 9 * (1 - k) + 2;
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + 0.2;
    const r0 = 90 + 260 * k;
    const r1 = r0 + 70 * (1 - k) + 20;
    ctx.beginPath();
    ctx.moveTo(at.x + Math.cos(a) * r0, at.y + Math.sin(a) * r0);
    ctx.lineTo(at.x + Math.cos(a) * r1, at.y + Math.sin(a) * r1);
    ctx.stroke();
  }
  ctx.restore();
}

/** The grade: a tint over everything, the sun's warmth over the cay, and a vignette. */
export function drawGrade(ctx: CanvasRenderingContext2D, g: Grade, sunAt: Pt | null, sunR: number): void {
  ctx.save();
  if (g.tintAlpha > 0) {
    ctx.globalAlpha = g.tintAlpha;
    ctx.fillStyle = g.tint;
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;
  }
  if (g.sun > 0 && sunAt) {
    ctx.globalCompositeOperation = 'soft-light';
    const s = ctx.createRadialGradient(sunAt.x - sunR * 0.3, sunAt.y - sunR * 0.4, 0, sunAt.x, sunAt.y, sunR * 1.6);
    s.addColorStop(0, `rgba(255,214,120,${0.4 * g.sun})`);
    s.addColorStop(1, 'rgba(255,214,120,0)');
    ctx.fillStyle = s;
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over';
  }
  const v = ctx.createRadialGradient(W / 2, H * 0.42, H * 0.18, W / 2, H * 0.45, H * 0.72);
  v.addColorStop(0, 'rgba(3,8,18,0)');
  v.addColorStop(1, `rgba(3,8,18,${g.vignette})`);
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

/** Plain black over everything (the dive into the crack). */
export function drawBlack(ctx: CanvasRenderingContext2D, a: number): void {
  if (a <= 0) return;
  ctx.save();
  ctx.globalAlpha = Math.min(1, a);
  ctx.fillStyle = '#03060e';
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}
