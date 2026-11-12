import { INK, PAPER } from '../../../src/art/pen';
import { createRng } from '../../../src/logic/rng';
import { H, SAND_Y, SURFACE_Y, W, type Rect } from './layout';

/**
 * The arena: a dark stage with two spotlights and a plank floor, and on it a
 * big pen-and-ink glass tank of bright blue water over a sandy floor. Its
 * water can warm towards orange, take on salt (a greener blue), and drain
 * away to wet mud.
 */

export interface Water {
  /** 1 full .. 0 drained to the floor. */
  readonly level: number;
  /** 0 .. 1: the orange of the hot round. */
  readonly heat: number;
  /** 0 .. 1: the greener blue of salt water. */
  readonly salt: number;
  /** 0 sand .. 1 wet mud. */
  readonly mud: number;
}

export const CLEAR: Water = { level: 1, heat: 0, salt: 0, mud: 0 };

const rng = createRng(4242);
const SAND_DOTS = Array.from({ length: 420 }, () => ({ x: rng(), y: rng(), r: 0.8 + rng() * 2.2 }));
const BUBBLES = Array.from({ length: 34 }, () => ({ x: rng(), speed: 30 + rng() * 50, r: 3 + rng() * 7, ph: rng() * 20 }));
const PEBBLES = Array.from({ length: 26 }, () => ({ x: rng(), y: rng(), rx: 6 + rng() * 14, ry: 4 + rng() * 7 }));

/** A wobbly ink line through `pts` (a pen line, not a ruler's). */
export function inkPath(ctx: CanvasRenderingContext2D, pts: readonly { x: number; y: number }[], width: number, colour = INK, close = false): void {
  ctx.save();
  ctx.strokeStyle = colour;
  ctx.lineWidth = width;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.beginPath();
  pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  if (close) ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

/** Points along a straight edge with a hand-drawn wobble that boils a little. */
export function wobbly(x0: number, y0: number, x1: number, y1: number, boil: number, amp = 2.2): { x: number; y: number }[] {
  const n = Math.max(2, Math.round(Math.hypot(x1 - x0, y1 - y0) / 40));
  const nx = -(y1 - y0);
  const ny = x1 - x0;
  const k = Math.hypot(nx, ny) || 1;
  return Array.from({ length: n + 1 }, (_, i) => {
    const u = i / n;
    const w = i === 0 || i === n ? 0 : Math.sin(i * 2.3 + boil * 1.7 + x0 * 0.01) * amp;
    return { x: x0 + (x1 - x0) * u + (nx / k) * w, y: y0 + (y1 - y0) * u + (ny / k) * w };
  });
}

/** The stage behind and under the tank. */
export function drawStage(ctx: CanvasRenderingContext2D, t: number): void {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#0b1630');
  g.addColorStop(1, '#050a16');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  // Two spotlights sweeping a little.
  for (const side of [-1, 1]) {
    const sway = Math.sin(t * 0.25 + side) * 60;
    const x0 = W / 2 + side * 820;
    ctx.save();
    const cone = ctx.createLinearGradient(x0, 0, W / 2 + sway, H);
    cone.addColorStop(0, 'rgba(255,240,200,0.22)');
    cone.addColorStop(1, 'rgba(255,240,200,0)');
    ctx.fillStyle = cone;
    ctx.beginPath();
    ctx.moveTo(x0 - 30, -10);
    ctx.lineTo(x0 + 30, -10);
    ctx.lineTo(W / 2 + sway + side * -120 + 520, H);
    ctx.lineTo(W / 2 + sway + side * -120 - 520, H);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  // The plank floor.
  ctx.fillStyle = '#5a3b22';
  ctx.fillRect(0, 1000, W, H - 1000);
  ctx.strokeStyle = 'rgba(20,10,4,0.6)';
  ctx.lineWidth = 3;
  for (let x = -40; x < W; x += 160) {
    ctx.beginPath();
    ctx.moveTo(x, 1004);
    ctx.lineTo(x - 60, H);
    ctx.stroke();
  }
  ctx.fillStyle = '#2a1a0e';
  ctx.fillRect(0, 1000, W, 8);
}

const mix = (a: readonly number[], b: readonly number[], u: number): string => `rgb(${a.map((v, i) => Math.round(v + (b[i]! - v) * u)).join(',')})`;

const BLUE_TOP = [104, 200, 240];
const BLUE_BOTTOM = [36, 132, 200];
const HOT_TOP = [250, 176, 96];
const HOT_BOTTOM = [214, 104, 50];
const SALT_TOP = [100, 206, 200];
const SALT_BOTTOM = [26, 128, 150];

function waterColours(w: Water): readonly [string, string] {
  const top = BLUE_TOP.map((v, i) => v + (SALT_TOP[i]! - v) * w.salt);
  const bottom = BLUE_BOTTOM.map((v, i) => v + (SALT_BOTTOM[i]! - v) * w.salt);
  return [mix(top, HOT_TOP, w.heat * 0.75), mix(bottom, HOT_BOTTOM, w.heat * 0.7)];
}

/** Inside the glass, behind the fish: the water (to its level), light shafts, bubbles, the floor. */
export function drawTankBack(ctx: CanvasRenderingContext2D, r: Rect, w: Water, t: number, boil: number): void {
  ctx.save();
  ctx.beginPath();
  ctx.rect(r.x, r.y, r.w, r.h);
  ctx.clip();
  // The air inside the glass.
  ctx.fillStyle = `rgba(170,200,214,${0.16 + 0.5 * (1 - w.level)})`;
  ctx.fillRect(r.x, r.y, r.w, r.h);
  const top = SAND_Y - (SAND_Y - SURFACE_Y) * w.level;
  if (w.level > 0.001) {
    const [c0, c1] = waterColours(w);
    const g = ctx.createLinearGradient(0, SURFACE_Y, 0, SAND_Y);
    g.addColorStop(0, c0);
    g.addColorStop(1, c1);
    ctx.fillStyle = g;
    ctx.fillRect(r.x, top, r.w, r.y + r.h - top);
    // Shafts of light.
    ctx.globalAlpha = 0.13 * w.level;
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 5; i++) {
      const x = r.x + r.w * (0.12 + i * 0.2) + Math.sin(t * 0.3 + i) * 30;
      ctx.beginPath();
      ctx.moveTo(x, top);
      ctx.lineTo(x + 70, top);
      ctx.lineTo(x - 90, SAND_Y);
      ctx.lineTo(x - 210, SAND_Y);
      ctx.closePath();
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    // Bubbles rising to the surface.
    ctx.strokeStyle = 'rgba(255,255,255,0.75)';
    ctx.lineWidth = 2;
    for (const b of BUBBLES) {
      const y = SAND_Y - ((t * b.speed + b.ph * 40) % (SAND_Y - top));
      if (y < top + 6) continue;
      ctx.beginPath();
      ctx.arc(r.x + b.x * r.w + Math.sin(t * 2 + b.ph) * 6, y, b.r, 0, Math.PI * 2);
      ctx.stroke();
    }
    // The surface: a wavy ink line with a light edge.
    const wave = Array.from({ length: 41 }, (_, i) => ({ x: r.x + (r.w * i) / 40, y: top + Math.sin(i * 0.9 + t * 1.6) * 4 }));
    inkPath(ctx, wave, 5, 'rgba(255,255,255,0.7)');
    inkPath(ctx, wave.map((p) => ({ x: p.x, y: p.y - 3 })), 2.4, INK);
  }
  drawFloor(ctx, r, w, boil);
  ctx.restore();
}

function drawFloor(ctx: CanvasRenderingContext2D, r: Rect, w: Water, boil: number): void {
  const y0 = SAND_Y;
  const edge = Array.from({ length: 31 }, (_, i) => ({ x: r.x + (r.w * i) / 30, y: y0 + Math.sin(i * 1.3) * 6 - w.mud * Math.sin(i * 0.7 + 1) * 10 }));
  ctx.save();
  ctx.beginPath();
  edge.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.lineTo(r.x + r.w, r.y + r.h);
  ctx.lineTo(r.x, r.y + r.h);
  ctx.closePath();
  ctx.fillStyle = mix([236, 211, 154], [112, 80, 52], w.mud);
  ctx.fill();
  ctx.clip();
  ctx.fillStyle = w.mud > 0.5 ? 'rgba(40,24,12,0.5)' : 'rgba(120,90,40,0.55)';
  for (const d of SAND_DOTS) {
    ctx.beginPath();
    ctx.arc(r.x + d.x * r.w, y0 + d.y * (r.y + r.h - y0), d.r, 0, Math.PI * 2);
    ctx.fill();
  }
  // Pebbles, or puddles shining on the mud.
  for (const p of PEBBLES) {
    const x = r.x + p.x * r.w;
    const y = y0 + 14 + p.y * (r.y + r.h - y0 - 20);
    ctx.fillStyle = w.mud > 0.5 ? 'rgba(255,255,255,0.22)' : 'rgba(255,250,235,0.6)';
    ctx.beginPath();
    ctx.ellipse(x, y, p.rx * (1 + w.mud), p.ry, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  inkPath(ctx, edge, 3.5, INK);
  void boil;
}

/** The glass over everything inside: highlights, the inked frame, the rim and the stand. */
export function drawTankFront(ctx: CanvasRenderingContext2D, r: Rect, boil: number): void {
  ctx.save();
  ctx.globalAlpha = 0.16;
  ctx.fillStyle = '#ffffff';
  for (const [a, b] of [[0.06, 0.1], [0.12, 0.13]] as const) {
    ctx.beginPath();
    ctx.moveTo(r.x + r.w * a, r.y + 20);
    ctx.lineTo(r.x + r.w * b + 30, r.y + 20);
    ctx.lineTo(r.x + r.w * b - 120, r.y + r.h - 20);
    ctx.lineTo(r.x + r.w * a - 150, r.y + r.h - 20);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  // The stand and the rim.
  ctx.fillStyle = '#1c2230';
  ctx.fillRect(r.x - 24, r.y + r.h, r.w + 48, 26);
  ctx.fillRect(r.x - 18, r.y - 22, r.w + 36, 24);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 4;
  ctx.strokeRect(r.x - 24, r.y + r.h, r.w + 48, 26);
  ctx.strokeRect(r.x - 18, r.y - 22, r.w + 36, 24);
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.fillRect(r.x - 14, r.y - 18, r.w + 28, 5);
  for (const [x0, y0, x1, y1] of [
    [r.x, r.y, r.x + r.w, r.y], [r.x + r.w, r.y, r.x + r.w, r.y + r.h], [r.x + r.w, r.y + r.h, r.x, r.y + r.h], [r.x, r.y + r.h, r.x, r.y],
  ] as const) inkPath(ctx, wobbly(x0, y0, x1, y1, boil), 7);
  // Corner posts.
  for (const x of [r.x, r.x + r.w]) {
    ctx.fillStyle = '#1c2230';
    ctx.fillRect(x - 9, r.y - 4, 18, r.h + 8);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3;
    ctx.strokeRect(x - 9, r.y - 4, 18, r.h + 8);
  }
  ctx.fillStyle = PAPER;
  ctx.globalAlpha = 0.12;
  ctx.fillRect(r.x + 14, r.y + 8, 6, r.h - 16);
  ctx.globalAlpha = 1;
}

/** Clips to the inside of a tank (call inside save/restore). */
export function clipTo(ctx: CanvasRenderingContext2D, r: Rect): void {
  ctx.beginPath();
  ctx.rect(r.x, r.y, r.w, r.h);
  ctx.clip();
}
