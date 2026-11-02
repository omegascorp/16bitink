import { createRng } from '../../../src/logic/rng';
import { makePaper } from '../backdrop';
import { ramp, VIDEO } from '../short';
import { cycles, flowAt, gradeAt, type Pt, toScreen, type View, WATER, type WhalePose } from './story';
import { cavityTop, LIP_Y } from './whale';

/**
 * The dusk sea round the whale: a warm sky above the surface, dark teal water
 * below (a split view when the camera sits at the waterline), light shafts and
 * specks under the surface, rings round the whale, the anchovy stream pouring
 * over its lip, gulls, the splash, bubbles, and the mood's colour wash.
 */

export const INK_BG = '#060b1a';
export const CHALK = '#f1ead8';
export const SPOKEN = '#f5c84a';

export const makeSeaPaper = (): HTMLCanvasElement => makePaper();

const lerpPt = (a: Pt, b: Pt, u: number): Pt => ({ x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u });

export function drawBackdrop(ctx: CanvasRenderingContext2D, paper: HTMLCanvasElement, v: View, t: number): void {
  const { width: W, height: H } = VIDEO;
  const h = toScreen(v, { x: 0, y: WATER }).y;
  ctx.drawImage(paper, 0, 0);
  const top = Math.min(H, Math.max(0, h));
  if (top > 0) {
    const sky = ctx.createLinearGradient(0, Math.min(0, h - 1500 * v.zoom), 0, h);
    sky.addColorStop(0, '#171d4c');
    sky.addColorStop(0.5, '#4f3a73');
    sky.addColorStop(0.8, '#b85b78');
    sky.addColorStop(1, '#f6a86a');
    ctx.globalAlpha = 0.95;
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, top);
    ctx.globalAlpha = 1;
    const sx = 330 - v.x * 0.2 * v.zoom;
    const glow = ctx.createRadialGradient(sx, h, 0, sx, h, 760 * v.zoom);
    glow.addColorStop(0, 'rgba(255,224,160,0.7)');
    glow.addColorStop(0.35, 'rgba(255,170,110,0.28)');
    glow.addColorStop(1, 'rgba(255,150,100,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, top);
    drawClouds(ctx, v, h);
  }
  if (h < H) {
    const sea = ctx.createLinearGradient(0, h, 0, h + 1500 * v.zoom);
    sea.addColorStop(0, '#497f88');
    sea.addColorStop(0.12, '#235466');
    sea.addColorStop(0.5, '#0c2d48');
    sea.addColorStop(1, '#040f1f');
    ctx.globalAlpha = 0.95;
    ctx.fillStyle = sea;
    ctx.fillRect(0, Math.max(0, h), W, H - Math.max(0, h));
    ctx.globalAlpha = 1;
    drawShafts(ctx, v, h, t);
    drawSpecks(ctx, v, t);
  }
}

function drawClouds(ctx: CanvasRenderingContext2D, v: View, h: number): void {
  const rng = createRng(1717);
  for (let i = 0; i < 6; i++) {
    const x = ((((rng() * 2200 - 600 - v.x * 0.4) * v.zoom + 540) % 1500) + 1500) % 1500 - 200;
    const y = h - (180 + rng() * 520) * v.zoom;
    const r = (240 + rng() * 260) * v.zoom;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1, 0.16);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
    g.addColorStop(0, 'rgba(60,34,86,0.55)');
    g.addColorStop(0.7, 'rgba(120,60,100,0.22)');
    g.addColorStop(1, 'rgba(120,60,100,0)');
    ctx.fillStyle = g;
    ctx.fillRect(-r, -r, 2 * r, 2 * r);
    ctx.restore();
  }
}

function drawShafts(ctx: CanvasRenderingContext2D, v: View, h: number, t: number): void {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 5; i++) {
    const x = i * 300 - 200 - v.x * 0.3 * v.zoom + 40 * Math.sin(cycles(1, t) + i * 1.7);
    const w = (60 + ((i * 47) % 70)) * v.zoom;
    const g = ctx.createLinearGradient(0, h, 0, h + 1300 * v.zoom);
    g.addColorStop(0, 'rgba(255,200,140,0.16)');
    g.addColorStop(1, 'rgba(255,200,140,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x, h);
    ctx.lineTo(x + w, h);
    ctx.lineTo(x + w - 260 * v.zoom, h + 1300 * v.zoom);
    ctx.lineTo(x - 260 * v.zoom - w * 0.4, h + 1300 * v.zoom);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

const SPECKS = (() => {
  const rng = createRng(77);
  return Array.from({ length: 70 }, () => ({ x: rng() * 3000 - 1500, y: rng() * 2400 - 200, r: 1.5 + rng() * 3, ph: rng() * Math.PI * 2 }));
})();

function drawSpecks(ctx: CanvasRenderingContext2D, v: View, t: number): void {
  ctx.save();
  ctx.fillStyle = 'rgba(230,240,235,0.3)';
  for (const s of SPECKS) {
    const p = toScreen(v, { x: s.x + 30 * Math.sin(cycles(1, t) + s.ph), y: s.y + 20 * Math.sin(cycles(2, t) + s.ph) });
    if (p.y < 0 || p.y > VIDEO.height || p.x < 0 || p.x > VIDEO.width) continue;
    ctx.beginPath();
    ctx.arc(p.x, p.y, s.r * Math.min(1.6, v.zoom), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** The tint of water over what is under the surface (the submerged half), then the wavy waterline itself. */
export function drawSurface(ctx: CanvasRenderingContext2D, v: View, t: number): void {
  const h = toScreen(v, { x: 0, y: WATER }).y;
  if (h < VIDEO.height) {
    const g = ctx.createLinearGradient(0, h, 0, h + 900 * v.zoom);
    g.addColorStop(0, 'rgba(40,104,120,0.5)');
    g.addColorStop(1, 'rgba(6,30,52,0.58)');
    ctx.fillStyle = g;
    ctx.fillRect(0, Math.max(0, h), VIDEO.width, VIDEO.height - Math.max(0, h));
  }
  if (h < -20 || h > VIDEO.height + 20) return;
  ctx.save();
  ctx.lineCap = 'round';
  for (const [dy, col, w] of [[0, 'rgba(255,226,170,0.85)', 4], [5, 'rgba(10,40,60,0.5)', 3]] as const) {
    ctx.strokeStyle = col;
    ctx.lineWidth = w * Math.min(1.5, v.zoom);
    ctx.beginPath();
    for (let x = -20; x <= VIDEO.width + 20; x += 20) {
      const y = h + dy + 3.5 * v.zoom * Math.sin(x / 38 + cycles(3, t)) + 2 * v.zoom * Math.sin(x / 17 - cycles(5, t));
      if (x === -20) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.restore();
}

/** Rings spreading from the whale where it meets the surface (a whole number a loop). */
export function drawRings(ctx: CanvasRenderingContext2D, w: WhalePose, t: number): void {
  ctx.save();
  ctx.lineWidth = 3;
  for (let k = 0; k < 3; k++) {
    const f = ((((cycles(4, t) / (2 * Math.PI)) + k / 3) % 1) + 1) % 1;
    ctx.strokeStyle = `rgba(255,236,200,${(0.5 * (1 - f)).toFixed(3)})`;
    ctx.beginPath();
    ctx.ellipse(w.x, WATER + 6, (150 + 300 * f) * w.scale, (8 + 26 * f) * w.scale, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

// ---------------------------------------------------------------- the anchovies

/** One anchovy: a slim silver fish seen side on, dark along the back, a tiny eye (a worried one when `worry`). */
export function drawAnchovy(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, size: number, alpha: number, worry: number): void {
  if (alpha <= 0.01) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  if (Math.cos(angle) < 0) ctx.scale(1, -1);
  ctx.scale(size, size);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#c6d4dc';
  ctx.strokeStyle = 'rgba(20,24,30,0.75)';
  ctx.lineWidth = 1.8 / size;
  ctx.beginPath();
  ctx.moveTo(-26, 0);
  ctx.lineTo(-40, -10);
  ctx.lineTo(-37, 0);
  ctx.lineTo(-40, 10);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  const g = ctx.createLinearGradient(0, -9, 0, 9);
  g.addColorStop(0, '#506b7c');
  g.addColorStop(0.42, '#9fb6c4');
  g.addColorStop(0.55, '#f2f6f8');
  g.addColorStop(1, '#dbe5ea');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(0, 0, 30, 8.6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.8)';
  ctx.lineWidth = 1.6 / size;
  ctx.beginPath();
  ctx.moveTo(-18, 1.5);
  ctx.lineTo(16, 1.5);
  ctx.stroke();
  const eye = 2.8 + 3.2 * worry;
  ctx.fillStyle = worry > 0.05 ? '#fbfbf6' : '#10141a';
  ctx.beginPath();
  ctx.arc(20, -2, eye, 0, Math.PI * 2);
  ctx.fill();
  if (worry > 0.05) {
    ctx.strokeStyle = '#10141a';
    ctx.lineWidth = 1.5 / size;
    ctx.stroke();
    ctx.fillStyle = '#10141a';
    ctx.beginPath();
    ctx.arc(21.2, -1, eye * 0.45, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(20 - eye - 1, -2 - eye - 2);
    ctx.lineTo(20 + eye, -2 - eye + 1);
    ctx.stroke();
  }
  ctx.restore();
}

const STREAM = (() => {
  const rng = createRng(2017);
  return Array.from({ length: 64 }, (_, i) => ({ phase: (i + 0.5 * rng()) / 64, lane: rng(), goal: rng(), ph: rng() * Math.PI * 2 }));
})();

/** A fish's place on its way up over the lip and into the dark, in the whale's frame (u 0 in the water below the lip .. 1 swallowed). */
function climbAt(gape: number, u: number, lane: number, goal: number): Pt {
  const x0 = (lane - 0.5) * 300;
  const top = cavityTop(gape);
  const y0 = LIP_Y + 50 + goal * 90;
  const y1 = Math.max(top + 40, LIP_Y - 60 - goal * 90);
  const e = u * u * (3 - 2 * u) * 0.35 + u * 0.65;
  return { x: x0 * (1 - 0.6 * e), y: y0 + (y1 - y0) * e };
}

/**
 * The anchovies going up over the lower lip and into the cavity, heads first,
 * like a small waterfall; drawn in the whale's frame (the caller has entered
 * it). `inside` picks the ones already over the lip (drawn behind it) or the
 * ones still in the water (drawn over it).
 */
export function drawFish(ctx: CanvasRenderingContext2D, w: WhalePose, tau: number, worry: number, size: number, inside: boolean, count = STREAM.length): void {
  const flow = flowAt(w.gape);
  if (flow <= 0) return;
  for (const f of STREAM.slice(0, count)) {
    const u = (((f.phase + tau) % 1) + 1) % 1;
    const p = climbAt(w.gape, u, f.lane, f.goal);
    if ((p.y < LIP_Y - 8) !== inside) continue;
    const q = climbAt(w.gape, Math.min(1, u + 0.01), f.lane, f.goal);
    const wob = 10 * Math.sin(2 * Math.PI * (tau * 3 + f.phase * 5) + f.ph);
    const shake = worry * 3 * Math.sin(2 * Math.PI * (tau * 24 + f.ph));
    const alpha = flow * ramp(u, 0, 0.1) * (1 - ramp(u, 0.84, 1));
    drawAnchovy(ctx, p.x + wob + shake, p.y, Math.atan2(q.y - p.y, q.x - p.x + wob * 0.02), size * (1 - 0.4 * ramp(u, 0.7, 1)), alpha, worry);
  }
}

/** Water spilling over the lip's middle: pale streaks running up and in, only while the jaw is open. */
export function drawSpill(ctx: CanvasRenderingContext2D, w: WhalePose, tau: number): void {
  const flow = flowAt(w.gape);
  if (flow <= 0) return;
  ctx.save();
  ctx.lineCap = 'round';
  for (let i = 0; i < 14; i++) {
    const x = -80 + (160 * i) / 13;
    const k = (((tau * 2 + i * 0.37) % 1) + 1) % 1;
    const y = LIP_Y + 40 - 130 * k;
    ctx.strokeStyle = `rgba(225,242,248,${(0.5 * flow * Math.sin(Math.PI * k)).toFixed(3)})`;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(x * (1 - 0.3 * k), y + 30);
    ctx.lineTo(x * (1 - 0.3 * k - 0.05), y);
    ctx.stroke();
  }
  ctx.restore();
}

// ---------------------------------------------------------------- sky and splash

export function drawGull(ctx: CanvasRenderingContext2D, p: Pt, flap: number, alpha: number): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = '#1b1220';
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(p.x - 52, p.y + 8 + flap * 18);
  ctx.quadraticCurveTo(p.x - 24, p.y - 24 - flap * 10, p.x, p.y);
  ctx.quadraticCurveTo(p.x + 24, p.y - 24 - flap * 10, p.x + 52, p.y + 8 + flap * 18);
  ctx.stroke();
  ctx.restore();
}

const DROPS = (() => {
  const rng = createRng(93);
  return Array.from({ length: 30 }, () => ({ vx: -180 + rng() * 460, vy: -420 - rng() * 380, r: 4 + rng() * 6 }));
})();

/** The gulp's splash at the lip, k from 0 to 1. */
export function drawSplash(ctx: CanvasRenderingContext2D, from: Pt, k: number): void {
  if (k < 0) return;
  ctx.save();
  for (const d of DROPS) {
    const s = k * 1.2;
    ctx.fillStyle = `rgba(240,248,250,${(0.9 * (1 - k)).toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(from.x + d.vx * s, from.y + d.vy * s + 520 * s * s, d.r * (1 - 0.4 * k), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** A bubble rising from the mouth and popping, u from 0 to 1. */
export function drawBubble(ctx: CanvasRenderingContext2D, from: Pt, u: number, big: number): void {
  if (u < 0) return;
  const grow = 10 + 34 * big * Math.min(1, u * 1.6);
  const x = from.x + 50 * u + 14 * Math.sin(u * 11);
  const y = from.y - u * 380 * big;
  ctx.save();
  if (u > 0.92) {
    const k = (u - 0.92) / 0.08;
    ctx.strokeStyle = `rgba(255,255,255,${(0.7 * (1 - k)).toFixed(3)})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y, grow * (1 + 0.6 * k), 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    return;
  }
  const g = ctx.createRadialGradient(x - grow * 0.3, y - grow * 0.3, grow * 0.1, x, y, grow);
  g.addColorStop(0, 'rgba(255,255,255,0.35)');
  g.addColorStop(0.8, 'rgba(255,230,210,0.12)');
  g.addColorStop(1, 'rgba(255,255,255,0.45)');
  ctx.fillStyle = g;
  ctx.strokeStyle = 'rgba(255,255,255,0.8)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(x, y, grow, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.beginPath();
  ctx.ellipse(x - grow * 0.4, y - grow * 0.4, grow * 0.22, grow * 0.12, -0.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// ---------------------------------------------------------------- the picture's mood

export function drawGrade(ctx: CanvasRenderingContext2D, t: number): void {
  const [r, g, b, a] = gradeAt(t) as [number, number, number, number];
  ctx.save();
  ctx.globalCompositeOperation = 'soft-light';
  ctx.fillStyle = `rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},${(a * 3).toFixed(3)})`;
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = `rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},${(a * 0.6).toFixed(3)})`;
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
  ctx.restore();
}

export function drawVignette(ctx: CanvasRenderingContext2D): void {
  const g = ctx.createRadialGradient(540, 960, 520, 540, 960, 1250);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(2,4,14,0.55)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
}

export function drawFlash(ctx: CanvasRenderingContext2D, alpha: number): void {
  if (alpha <= 0) return;
  ctx.fillStyle = `rgba(190,230,255,${alpha.toFixed(3)})`;
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
}
