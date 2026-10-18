import { makeDraw, oval, pt } from '../../../src/art/kit';
import { rgba } from '../../../src/art/paint';
import { PAPER_FILL, RED } from '../../../src/art/palette';
import { drawTextLine } from '../captions';
import { clamp01, VIDEO } from '../short';
import type { Bubble, Drop, Mote, Ring } from './field';
import { onBody, shoulderOf } from './flyer';
import { SCALE, type Flyer } from './story';

/**
 * Marks drawn live over the painting: the downwash's rings and spray, gas
 * bubbles, motes, the wings' speed arcs, bursts of ink for "FLY", the
 * buckles and the coat, the "!" of fright, and the colour of each mood
 * (a lift of warm light, the cold's blue, the dread's dark).
 */
const W = VIDEO.width;
const H = VIDEO.height;
/** The wing's reach from the shoulder, in the drawing's units. */
const WING_REACH = 42;

export function drawRings(ctx: CanvasRenderingContext2D, rings: readonly Ring[], boil: number): void {
  rings.forEach((r, i) => {
    const d = makeDraw(ctx, 800 + i * 7 + boil, boil, 0);
    d.pen.stroke([...oval(r.x, r.y + 3, r.rx, r.ry, 40), oval(r.x, r.y + 3, r.rx, r.ry, 40)[0]!], 3, '#0a0605', 0.5 * r.alpha, false);
    d.pen.stroke([...oval(r.x, r.y, r.rx, r.ry, 40), oval(r.x, r.y, r.rx, r.ry, 40)[0]!], 2.4, '#f2b878', 0.75 * r.alpha, false);
  });
}

/** Drops of clear methane (the haze's glow in them, a glint on top), or with `stone`, pebbles. */
export function drawDrops(ctx: CanvasRenderingContext2D, drops: readonly Drop[], stone = false): void {
  for (const p of drops) {
    const a = clamp01(p.alpha);
    ctx.globalAlpha = a * (stone ? 1 : 0.85);
    ctx.fillStyle = stone ? '#8a6a52' : '#e9a764';
    ctx.strokeStyle = stone ? '#1c0f08' : '#5a2c12';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    // A drop stretched a little along its fall.
    ctx.ellipse(p.x, p.y, p.r * 0.8, p.r * (stone ? 0.8 : 1.15), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#fff3dc';
    ctx.beginPath();
    ctx.arc(p.x - p.r * 0.25, p.y - p.r * 0.4, p.r * 0.32, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

export function drawBubbles(ctx: CanvasRenderingContext2D, bubbles: readonly Bubble[], boil: number): void {
  bubbles.forEach((b, i) => {
    const d = makeDraw(ctx, 870 + i + boil, boil, 0);
    if (b.u < 1) {
      const r = b.r * 1.8 * (0.3 + 0.7 * b.u);
      d.pen.fill(oval(b.x, b.y, r, r * 0.8, 16), '#1c120c', 0.85 * b.alpha);
      d.pen.stroke([...oval(b.x, b.y, r, r * 0.8, 16), oval(b.x, b.y, r, r * 0.8, 16)[0]!], 1.6, '#e9a86a', 0.8 * b.alpha, false);
      d.pen.dot(b.x - r * 0.35, b.y - r * 0.35, r * 0.25, PAPER_FILL, 0.8 * b.alpha);
      return;
    }
    const u = b.u - 1;
    const r = b.r * 1.8 * (1 + u * 2.2);
    d.pen.stroke([...oval(b.x, b.y, r, r * 0.6, 20), oval(b.x, b.y, r, r * 0.6, 20)[0]!], 1.4, '#e9a86a', (1 - u) * 0.7 * b.alpha, false);
  });
}

export function drawMotes(ctx: CanvasRenderingContext2D, motes: readonly Mote[]): void {
  for (const m of motes) {
    if (m.alpha <= 0.01) continue;
    if (m.lit) {
      const g = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, m.r * 2.4);
      g.addColorStop(0, rgba('#ffe2b0', 0.75 * m.alpha));
      g.addColorStop(0.35, rgba('#f2b46a', 0.35 * m.alpha));
      g.addColorStop(1, rgba('#f2b46a', 0));
      ctx.fillStyle = g;
      ctx.fillRect(m.x - m.r * 2.4, m.y - m.r * 2.4, m.r * 4.8, m.r * 4.8);
    } else {
      ctx.globalAlpha = 0.55 * m.alpha;
      ctx.fillStyle = '#2a140a';
      ctx.beginPath();
      ctx.ellipse(m.x, m.y, m.r * 0.8, m.r * 0.5, 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }
}

/** Speed arcs behind the wingtips, as strong as the wing is fast (`prev` is a moment before). */
export function drawSpeedArcs(ctx: CanvasRenderingContext2D, f: Flyer, prev: Flyer, boil: number): void {
  const sweep = f.near - prev.near;
  const strength = clamp01(Math.abs(sweep) / 0.12);
  if (strength < 0.15) return;
  const c = shoulderOf(f);
  const d = makeDraw(ctx, 940 + boil, boil, 0);
  for (const [k, w] of [[1.02, 4], [0.86, 3], [0.7, 2.4]] as const) {
    const r = WING_REACH * SCALE * k;
    const arc = Array.from({ length: 10 }, (_, i) => {
      const a = f.near - sweep * 4.5 * (i / 9);
      return pt(c.x + Math.cos(a) * r, c.y + Math.sin(a) * r);
    });
    d.pen.stroke(arc, w, '#ffe6bc', 0.7 * strength, false);
  }
}

/** Ink spikes bursting out round a point, `u` 0..1 of its life. */
export function drawBurst(ctx: CanvasRenderingContext2D, x: number, y: number, r0: number, r1: number, u: number, n: number, color: string, w = 6): void {
  if (u <= 0 || u >= 1) return;
  const d = makeDraw(ctx, 960, 0, 0);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + 0.2;
    const inner = r0 + (r1 - r0) * u;
    const outer = inner + (r1 - r0) * 0.45 * (1 - u);
    d.pen.stroke([pt(x + Math.cos(a) * inner, y + Math.sin(a) * inner), pt(x + Math.cos(a) * outer, y + Math.sin(a) * outer)], w * (1 - u * 0.5), color, 1 - u, false);
  }
}

/** A puff of soft cloud with ink round it: the coat arriving or vanishing. */
export function drawPuff(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, u: number): void {
  if (u <= 0 || u >= 1) return;
  const d = makeDraw(ctx, 980, 0, 0);
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    const rr = r * (0.55 + 0.6 * u);
    const c = pt(x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.8);
    const s = r * 0.32 * (1 - u * 0.6);
    d.pen.fill(oval(c.x, c.y, s, s, 16), '#f6ead2', 0.85 * (1 - u));
    d.pen.stroke([...oval(c.x, c.y, s, s, 16), oval(c.x, c.y, s, s, 16)[0]!], 2.4, '#26316a', 0.6 * (1 - u), false);
  }
  drawBurst(ctx, x, y, r * 1.1, r * 1.9, u, 12, '#f6ead2', 5);
}

/** A four-point glint, as on polished metal. */
export function drawGlint(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, u: number): void {
  if (u <= 0 || u >= 1) return;
  const k = Math.sin(Math.PI * u);
  const d = makeDraw(ctx, 990, 0, 0);
  d.pen.stroke([pt(x - s * k, y), pt(x + s * k, y)], 4, '#fffaf0', k, false);
  d.pen.stroke([pt(x, y - s * k), pt(x, y + s * k)], 4, '#fffaf0', k, false);
}

/** The "!" over its helmet, and a bead of sweat. */
export function drawFright(ctx: CanvasRenderingContext2D, f: Flyer, show: number): void {
  if (show <= 0) return;
  const top = onBody(f, { x: 6, y: -22 });
  drawTextLine(ctx, '!', top.x + 70, top.y - 10, 170, 700, show, { fill: RED, halo: '#fff2d8' });
  const drop = onBody(f, { x: -7.5, y: -16 });
  const d = makeDraw(ctx, 995, 0, 0);
  const s = 16;
  const shape = [pt(drop.x, drop.y - s * 1.6), pt(drop.x + s * 0.8, drop.y), ...oval(drop.x, drop.y + s * 0.2, s * 0.85, s * 0.85, 12).slice(0, 7), pt(drop.x - s * 0.8, drop.y)];
  d.pen.fill(shape, '#bfe4f6', 0.9 * show);
  d.pen.stroke([...shape, shape[0]!], 2.4, '#26316a', 0.8 * show, false);
}

/** Moods over the whole frame: warm lift, the cold's blue (with rime in the corners), the dread's dark edges. */
export function grade(ctx: CanvasRenderingContext2D, m: { lift: number; cold: number; dread: number; relief: number }, rime: HTMLCanvasElement): void {
  ctx.save();
  if (m.lift > 0) {
    ctx.globalCompositeOperation = 'screen';
    const g = ctx.createRadialGradient(W * 0.55, H * 0.3, 0, W * 0.55, H * 0.3, H * 0.6);
    g.addColorStop(0, rgba('#ffcf8a', 0.32 * m.lift));
    g.addColorStop(1, rgba('#ffcf8a', 0));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }
  if (m.cold > 0) {
    ctx.globalCompositeOperation = 'color';
    ctx.globalAlpha = 0.62 * m.cold;
    ctx.fillStyle = '#3f6fae';
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = m.cold;
    ctx.drawImage(rime, 0, 0);
  }
  if (m.relief > 0) {
    ctx.globalCompositeOperation = 'soft-light';
    ctx.globalAlpha = 0.5 * m.relief;
    ctx.fillStyle = '#ffb060';
    ctx.fillRect(0, 0, W, H);
  }
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  const edgeDark = 0.25 + 0.5 * m.dread;
  const v = ctx.createRadialGradient(W / 2, H * 0.42, H * 0.3, W / 2, H * 0.45, H * 0.75);
  v.addColorStop(0, 'rgba(8, 4, 2, 0)');
  v.addColorStop(1, `rgba(8, 4, 2, ${edgeDark})`);
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

/** Rime creeping in from the corners of the frame, for the cold. */
export function bakeRime(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  const d = makeDraw(ctx, 1234, 0, 0);
  for (const [cx, cy] of [[0, 0], [W, 0], [0, H], [W, H]] as const) {
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 520);
    g.addColorStop(0, 'rgba(232, 246, 255, 0.55)');
    g.addColorStop(1, 'rgba(232, 246, 255, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(cx - 520, cy - 520, 1040, 1040);
    for (let k = 0; k < 14; k++) {
      const a = Math.atan2(H / 2 - cy, W / 2 - cx) + (k / 13 - 0.5) * 1.5;
      const len = 90 + ((k * 37) % 90) * 1.4;
      const tip = pt(cx + Math.cos(a) * len, cy + Math.sin(a) * len);
      d.pen.hair([pt(cx, cy), tip], 2.4, '#ffffff', 0.55);
      for (let j = 1; j <= 4; j++) {
        const p = pt(cx + Math.cos(a) * len * (j / 5), cy + Math.sin(a) * len * (j / 5));
        const s = 30 - j * 5;
        d.pen.hair([p, pt(p.x + Math.cos(a + 0.7) * s, p.y + Math.sin(a + 0.7) * s)], 1.8, '#ffffff', 0.6);
        d.pen.hair([p, pt(p.x + Math.cos(a - 0.7) * s, p.y + Math.sin(a - 0.7) * s)], 1.8, '#ffffff', 0.6);
      }
    }
  }
  return canvas;
}
