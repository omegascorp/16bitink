import { INK, PAPER } from '../../../src/art/palette';
import { CAPTION_FONT, drawTextLine, PAPER_ON_DARK } from '../captions';
import { VIDEO } from '../short';
import type { Pt } from '../sprites';
import type { Board } from './board';
import { type Camera, toScreen } from './snake';
import { cycles } from './story';

/**
 * What's drawn round the cast: the lake under the camera, the light on the
 * water, spray and rings, the length bars, the sky and the day counter, the
 * suitcase, and the "?". Anything that runs on its own clock does so in
 * whole cycles a loop, so the seam doesn't jump.
 */

const W = VIDEO.width;
const H = VIDEO.height;

/** The painted board under the camera, turned a quarter so the world is portrait (board x runs down, board y leftwards). */
export function drawBoard(ctx: CanvasRenderingContext2D, board: Board, cam: Camera): void {
  const tl = toScreen(cam, { x: 0, y: 0 });
  ctx.save();
  ctx.translate(tl.x, tl.y);
  ctx.scale(cam.zoom, cam.zoom);
  ctx.transform(0, 1, -1, 0, board.canvas.height / board.res, 0);
  ctx.drawImage(board.canvas, 0, 0, board.canvas.width / board.res, board.canvas.height / board.res);
  ctx.restore();
}

/** A steady 0..1 for (i, k). */
const hash = (i: number, k: number): number => {
  const v = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453;
  return v - Math.floor(v);
};

/** Light glancing off the ripples: short bright dashes drifting and twinkling in place. */
export function drawGlints(ctx: CanvasRenderingContext2D, cam: Camera, t: number, strength = 1): void {
  const CELL = 34;
  ctx.save();
  ctx.lineCap = 'round';
  const x0 = Math.floor((cam.x - 270 / cam.zoom) / CELL) - 1;
  const x1 = Math.ceil((cam.x + 270 / cam.zoom) / CELL) + 1;
  const y0 = Math.floor((cam.y - 480 / cam.zoom) / CELL) - 1;
  const y1 = Math.ceil((cam.y + 480 / cam.zoom) / CELL) + 1;
  for (let i = x0; i <= x1; i++) {
    for (let j = y0; j <= y1; j++) {
      const h = hash(i, j);
      if (h < 0.35) continue;
      const tw = Math.sin(cycles(2 + Math.floor(h * 3), t) + h * 40);
      const a = Math.max(0, tw) * 0.5 * strength;
      if (a < 0.04) continue;
      const p = toScreen(cam, { x: (i + hash(j, i)) * CELL + Math.sin(cycles(2, t) + h * 9) * 3, y: (j + hash(i + 3, j)) * CELL + Math.cos(cycles(2, t) + h * 7) * 3 });
      const len = (4 + h * 7) * cam.zoom;
      ctx.strokeStyle = `rgba(255,255,255,${a})`;
      ctx.lineWidth = Math.max(1.5, cam.zoom * 0.7);
      ctx.beginPath();
      ctx.moveTo(p.x - len / 2, p.y);
      ctx.quadraticCurveTo(p.x, p.y + len * 0.12, p.x + len / 2, p.y - len * 0.06);
      ctx.stroke();
    }
  }
  ctx.restore();
}

/** Rings spreading on the water round a still animal, one after another. */
export function drawRings(ctx: CanvasRenderingContext2D, cam: Camera, at: Pt, t: number, rx: number, ry: number, alpha = 0.5): void {
  const c = toScreen(cam, at);
  ctx.save();
  for (let i = 0; i < 3; i++) {
    const k = (Math.sin(cycles(1, t)) * 0 + ((cycles(1, t) / (2 * Math.PI)) * 6 + i / 3)) % 1;
    ctx.strokeStyle = `rgba(235,245,240,${alpha * (1 - k)})`;
    ctx.lineWidth = Math.max(2, cam.zoom * 0.5);
    ctx.beginPath();
    ctx.ellipse(c.x, c.y, (rx + 14 * k) * cam.zoom, (ry + 14 * k) * cam.zoom, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

/** Spray flung up by the struggle round a point: droplets and arcs flying out and falling. */
export function drawSpray(ctx: CanvasRenderingContext2D, cam: Camera, at: Pt, t: number, strength: number): void {
  if (strength <= 0.02) return;
  const c = toScreen(cam, at);
  ctx.save();
  ctx.lineCap = 'round';
  for (let i = 0; i < 26; i++) {
    const rate = 2.2 + hash(i, 1) * 1.6;
    const k = (t * rate + hash(i, 2)) % 1;
    const a = hash(i, 3) * Math.PI * 2;
    const reach = (26 + 52 * hash(i, 4)) * cam.zoom;
    const r = reach * Math.sqrt(k) * (0.55 + 0.45 * strength);
    const x = c.x + Math.cos(a) * r;
    const y = c.y + Math.sin(a) * r * 0.9 + 60 * k * k * cam.zoom * 0.3;
    const size = (1.6 + hash(i, 5) * 2.6) * cam.zoom * (1 - k * 0.5);
    const al = (1 - k) * Math.min(1, strength * 1.4) * 0.6;
    ctx.fillStyle = `rgba(245,252,255,${al})`;
    ctx.strokeStyle = `rgba(30,50,60,${al * 0.5})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    if (hash(i, 6) > 0.5) {
      ctx.strokeStyle = `rgba(245,252,255,${al * 0.8})`;
      ctx.lineWidth = Math.max(2, size * 0.5);
      ctx.beginPath();
      ctx.moveTo(c.x + Math.cos(a) * r * 0.7, c.y + Math.sin(a) * r * 0.63);
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  }
  ctx.restore();
}

/** A length bar: a line from a to b (screen px) with end ticks, in paper on a dark halo. */
export function drawBar(ctx: CanvasRenderingContext2D, a: Pt, b: Pt, alpha: number): void {
  if (alpha <= 0) return;
  const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  const nx = -(b.y - a.y) / len;
  const ny = (b.x - a.x) / len;
  const tick = 24;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.lineCap = 'round';
  for (const [w, colour] of [[14, '#0b1a2a'], [7, PAPER]] as const) {
    ctx.strokeStyle = colour;
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    for (const p of [a, b]) {
      ctx.moveTo(p.x - nx * tick, p.y - ny * tick);
      ctx.lineTo(p.x + nx * tick, p.y + ny * tick);
    }
    ctx.stroke();
  }
  ctx.restore();
}

/** The sky as a small arc over the picture: a sun or moon on a dashed path, a horizon under it. `phase` 0 (left horizon) .. 1 (right horizon). */
export function drawSky(ctx: CanvasRenderingContext2D, phase: number, night: number, alpha: number, y = 470): void {
  if (alpha <= 0) return;
  const rx = 380;
  const ry = 150;
  const a = Math.PI * (1 - phase);
  const x = W / 2 + Math.cos(a) * rx;
  const sy = y - Math.sin(a) * ry;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(11,26,42,0.55)';
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.moveTo(W / 2 - rx - 40, y + 4);
  ctx.lineTo(W / 2 + rx + 40, y + 4);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(244,237,220,0.9)';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(W / 2 - rx - 40, y + 4);
  ctx.lineTo(W / 2 + rx + 40, y + 4);
  ctx.stroke();
  ctx.setLineDash([4, 22]);
  ctx.beginPath();
  ctx.ellipse(W / 2, y, rx, ry, 0, Math.PI, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  const r = 46;
  if (night < 1) {
    // The sun: a warm disc with ink rays, going orange as it sinks.
    const low = 1 - Math.sin(a);
    ctx.globalAlpha = alpha * (1 - night);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 6;
    for (let i = 0; i < 12; i++) {
      const b = (i / 12) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(b) * (r + 10), sy + Math.sin(b) * (r + 10));
      ctx.lineTo(x + Math.cos(b) * (r + 26), sy + Math.sin(b) * (r + 26));
      ctx.stroke();
    }
    ctx.fillStyle = low > 0.6 ? '#f08a3a' : low > 0.3 ? '#f6b84a' : '#f7d65a';
    ctx.beginPath();
    ctx.arc(x, sy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 7;
    ctx.stroke();
  }
  if (night > 0) {
    // The moon: a pale crescent.
    ctx.globalAlpha = alpha * night;
    ctx.fillStyle = '#e8ecf4';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.arc(x, sy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#b7c2d6';
    for (const [dx, dy, rr] of [[-14, -10, 9], [12, 8, 12], [-6, 18, 6]] as const) {
      ctx.beginPath();
      ctx.arc(x + dx, sy + dy, rr, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

/** A big handwritten number or word popping in, in paper on dark. */
export function drawBig(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, show: number, rot = 0): void {
  if (show <= 0) return;
  const pop = show < 1 ? 0.6 + 0.4 * show + 0.18 * Math.sin(show * Math.PI) : 1;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(pop, pop);
  drawTextLine(ctx, text, 0, 0, size, 700, Math.min(1, show * 1.5), PAPER_ON_DARK);
  ctx.restore();
}

/** A small suitcase, brown leather with a handle, latches and a sticker, pen-drawn; `show` 0..1 pops it in with a bounce. */
export function drawSuitcase(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, rot: number, show: number): void {
  if (show <= 0) return;
  const pop = show < 1 ? 0.5 + 0.5 * show + 0.2 * Math.sin(show * Math.PI) : 1;
  const h = w * 0.66;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(pop, pop);
  ctx.globalAlpha = Math.min(1, show * 2);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  const rr = (px: number, py: number, pw: number, ph: number, r: number): void => {
    ctx.beginPath();
    ctx.moveTo(px + r, py);
    ctx.arcTo(px + pw, py, px + pw, py + ph, r);
    ctx.arcTo(px + pw, py + ph, px, py + ph, r);
    ctx.arcTo(px, py + ph, px, py, r);
    ctx.arcTo(px, py, px + pw, py, r);
    ctx.closePath();
  };
  // Shadow.
  ctx.fillStyle = 'rgba(8,14,24,0.35)';
  rr(-w / 2 + 12, -h / 2 + 16, w, h, 26);
  ctx.fill();
  // The handle.
  ctx.strokeStyle = INK;
  ctx.lineWidth = 16;
  ctx.beginPath();
  ctx.moveTo(-w * 0.14, -h / 2 + 4);
  ctx.lineTo(-w * 0.14, -h / 2 - h * 0.14);
  ctx.lineTo(w * 0.14, -h / 2 - h * 0.14);
  ctx.lineTo(w * 0.14, -h / 2 + 4);
  ctx.stroke();
  ctx.strokeStyle = '#6b4220';
  ctx.lineWidth = 8;
  ctx.stroke();
  // The case.
  const g = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
  g.addColorStop(0, '#b97a3e');
  g.addColorStop(1, '#8a5424');
  ctx.fillStyle = g;
  rr(-w / 2, -h / 2, w, h, 26);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 8;
  ctx.stroke();
  // Stitching and a band round the middle.
  ctx.strokeStyle = '#5a3516';
  ctx.lineWidth = 5;
  ctx.setLineDash([14, 12]);
  rr(-w / 2 + 16, -h / 2 + 16, w - 32, h - 32, 16);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(-w / 2 + 6, 0);
  ctx.lineTo(w / 2 - 6, 0);
  ctx.stroke();
  // Latches.
  for (const lx of [-w * 0.3, w * 0.3]) {
    ctx.fillStyle = '#e6c25a';
    rr(lx - 20, -14, 40, 34, 8);
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.strokeStyle = INK;
    ctx.stroke();
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.arc(lx, 3, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  // A travel sticker.
  ctx.fillStyle = '#e9594a';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(w * 0.28, h * 0.28, 26, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = PAPER;
  ctx.font = `700 34px ${CAPTION_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('AU', w * 0.28, h * 0.28 + 2);
  // Gloss.
  ctx.fillStyle = 'rgba(255,240,210,0.22)';
  ctx.beginPath();
  ctx.ellipse(-w * 0.22, -h * 0.3, w * 0.2, h * 0.08, -0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** The "?" between the two, wobbling. */
export function drawQuestion(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, show: number, t: number): void {
  drawBig(ctx, '?', x, y, size, show, 0.09 * Math.sin(cycles(7, t)));
}
