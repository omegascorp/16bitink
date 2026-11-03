import { INK, Pen, type Pt } from '../../../src/art/pen';
import { createRng } from '../../../src/logic/rng';
import { makePaper } from '../backdrop';
import { VIDEO } from '../short';

/** The Arctic the short happens in: bright air over dark teal water, a cold twilight, bright shallows, gloom; and what floats and falls in it. */

export const RED = '#c8452c';
export const ICE_TEXT = { fill: '#ffffff', halo: '#0b2c3a' };
export const RED_TEXT = { fill: RED, halo: '#f4eddc' };

type Stop = readonly [number, string];

function wash(stops: readonly Stop[], y0: number, y1: number, ctx: CanvasRenderingContext2D): void {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  for (const [at, c] of stops) g.addColorStop(at, c);
  ctx.fillStyle = g;
  ctx.fillRect(0, y0, VIDEO.width, y1 - y0 + 2);
}

/** Looking up through dark teal water at a bright surface `surface` px down, bright white sky and a low sun above it. */
export function makeArctic(surface: number): HTMLCanvasElement {
  const canvas = makePaper();
  const ctx = canvas.getContext('2d')!;
  wash([[0, 'rgba(236,248,250,0.98)'], [1, 'rgba(190,226,234,0.98)']], 0, surface, ctx);
  const sun = ctx.createRadialGradient(560, surface - 120, 10, 560, surface - 120, 560);
  sun.addColorStop(0, 'rgba(255,255,255,0.95)');
  sun.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = sun;
  ctx.fillRect(0, 0, VIDEO.width, surface + 40);
  wash([[0, 'rgba(120,214,208,0.98)'], [0.1, 'rgba(46,148,156,0.98)'], [0.3, 'rgba(16,82,98,0.98)'], [0.6, 'rgba(5,36,48,0.99)'], [1, 'rgba(1,10,16,0.99)']], surface, VIDEO.height, ctx);
  return canvas;
}

/** A cold twilight over Svalbard: violet sky going to peach at the horizon, snowy mountains, dark water. */
export function makeTwilight(horizon: number): HTMLCanvasElement {
  const canvas = makePaper();
  const ctx = canvas.getContext('2d')!;
  wash([[0, 'rgba(34,40,92,0.99)'], [0.5, 'rgba(120,88,138,0.98)'], [0.85, 'rgba(236,160,150,0.98)'], [1, 'rgba(252,206,170,0.98)']], 0, horizon, ctx);
  const rng = createRng(4402);
  // Mountains: three ranges, far to near, snow on the tops.
  for (const [base, colour, snow, amp] of [[horizon, '#6a6c9a', '#f0e8f0', 120], [horizon + 4, '#40476e', '#dcd8ec', 160], [horizon + 8, '#262c4a', '#bcc2dc', 100]] as const) {
    const rock = ctx.createLinearGradient(0, base - amp, 0, base);
    rock.addColorStop(0, snow);
    rock.addColorStop(0.3, snow);
    rock.addColorStop(0.5, colour);
    rock.addColorStop(1, colour);
    ctx.fillStyle = rock;
    ctx.beginPath();
    ctx.moveTo(-20, horizon + 30);
    let x = -20;
    while (x < VIDEO.width + 40) {
      const peak = base - amp * (0.3 + rng() * 0.7);
      ctx.lineTo(x + 40 + rng() * 50, peak);
      x += 90 + rng() * 80;
      ctx.lineTo(x, base - amp * (0.05 + rng() * 0.25));
    }
    ctx.lineTo(VIDEO.width + 40, horizon + 30);
    ctx.fill();
  }
  wash([[0, 'rgba(196,150,160,0.98)'], [0.08, 'rgba(60,70,120,0.98)'], [0.4, 'rgba(22,34,66,0.99)'], [1, 'rgba(6,12,26,0.99)']], horizon + 20, VIDEO.height, ctx);
  return canvas;
}

/** Deep teal for the x-ray beat. */
export function makeDeep(): HTMLCanvasElement {
  const canvas = makePaper();
  const ctx = canvas.getContext('2d')!;
  wash([[0, 'rgba(24,96,112,0.99)'], [0.4, 'rgba(10,52,66,0.99)'], [1, 'rgba(2,14,22,0.99)']], 0, VIDEO.height, ctx);
  return canvas;
}

/** Bright shallows, a cheery aqua, sand on the bottom. */
export function makeShallows(): HTMLCanvasElement {
  const canvas = makePaper();
  const ctx = canvas.getContext('2d')!;
  wash([[0, 'rgba(186,244,236,0.98)'], [0.35, 'rgba(96,206,214,0.98)'], [0.6, 'rgba(48,160,180,0.98)'], [1, 'rgba(24,104,138,0.99)']], 0, VIDEO.height, ctx);
  const sand = ctx.createLinearGradient(0, 1000, 0, VIDEO.height);
  sand.addColorStop(0, 'rgba(232,214,170,0.98)');
  sand.addColorStop(1, 'rgba(176,150,108,0.99)');
  ctx.fillStyle = sand;
  ctx.beginPath();
  ctx.moveTo(0, 1040);
  for (let x = 0; x <= VIDEO.width; x += 30) ctx.lineTo(x, 1000 + 22 * Math.sin(x / 130) + 10 * Math.sin(x / 41));
  ctx.lineTo(VIDEO.width, VIDEO.height);
  ctx.lineTo(0, VIDEO.height);
  ctx.fill();
  return canvas;
}

/** Near-black blue gloom. */
export function makeGloom(): HTMLCanvasElement {
  const canvas = makePaper();
  const ctx = canvas.getContext('2d')!;
  wash([[0, 'rgba(18,56,72,0.99)'], [0.4, 'rgba(8,28,40,0.99)'], [1, 'rgba(1,6,10,0.99)']], 0, VIDEO.height, ctx);
  return canvas;
}

/** The surface seen from below: a bright wobbling band, with ripples, across the frame at `y`. */
export function drawSurface(ctx: CanvasRenderingContext2D, y: number, t: number, loop: number, alpha = 1): void {
  const wave = (x: number): number => y + 7 * Math.sin(x / 70 + 2 * Math.PI * 2 * loop) + 4 * Math.sin(x / 29 - 2 * Math.PI * 3 * loop);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  ctx.moveTo(-20, y - 400);
  for (let x = -20; x <= VIDEO.width + 20; x += 16) ctx.lineTo(x, wave(x));
  ctx.lineTo(VIDEO.width + 20, y - 400);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, y - 40, 0, y + 120);
  g.addColorStop(0, 'rgba(255,255,255,0)');
  g.addColorStop(0.3, 'rgba(255,255,255,0.35)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (let x = -20; x <= VIDEO.width + 20; x += 16) (x < 0 ? ctx.moveTo(x, wave(x)) : ctx.lineTo(x, wave(x)));
  ctx.stroke();
  ctx.strokeStyle = 'rgba(210,250,250,0.4)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let x = -20; x <= VIDEO.width + 20; x += 16) (x < 0 ? ctx.moveTo(x, wave(x) + 22) : ctx.lineTo(x, wave(x) + 22 + 5 * Math.sin(x / 50 + 2 * Math.PI * loop)));
  ctx.stroke();
  ctx.fillStyle = g;
  ctx.fillRect(0, y - 40, VIDEO.width, 160);
  ctx.restore();
}

/** An ice floe seen from below at the surface: a white slab above the line, its pale blue underside hanging into the water. */
export function drawFloe(ctx: CanvasRenderingContext2D, x0: number, x1: number, surface: number, depth: number, seed: number, boil: number): void {
  const rng = createRng(seed);
  const top: Pt[] = [];
  const under: Pt[] = [];
  const n = 9;
  for (let i = 0; i <= n; i++) {
    const x = x0 + ((x1 - x0) * i) / n;
    const edge = Math.sin((Math.PI * i) / n);
    top.push({ x, y: surface - 26 * edge - rng() * 8 });
    under.push({ x, y: surface + depth * edge ** 0.8 * (0.55 + rng() * 0.6) });
  }
  const shape = [...top, ...under.reverse()];
  ctx.save();
  ctx.beginPath();
  shape.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
  const g = ctx.createLinearGradient(0, surface - 30, 0, surface + depth);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.16, '#e6fbfb');
  g.addColorStop(0.5, '#8fdada');
  g.addColorStop(1, 'rgba(40,140,160,0.55)');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.clip();
  const pen = new Pen(ctx, seed + boil * 977, 1.2);
  for (let i = 0; i < 9; i++) {
    const x = x0 + (x1 - x0) * rng();
    pen.hair([{ x, y: surface + 4 }, { x: x + (rng() - 0.5) * 30, y: surface + depth * (0.4 + rng() * 0.5) }], 2, '#ffffff', 0.35);
  }
  ctx.restore();
  pen.stroke([...shape, shape[0]!], 3.5, INK, 0.85, true);
}

/** Beams of light slanting down from the surface; whole cycles a loop. */
export function drawRays(ctx: CanvasRenderingContext2D, loop: number, y0: number, strength = 1, tint = '200,255,250'): void {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let k = 0; k < 6; k++) {
    const x = -20 + k * 200 + 50 * Math.sin(2 * Math.PI * (loop * (1 + (k % 2)) + k * 0.31));
    const g = ctx.createLinearGradient(0, y0, 0, 1500);
    g.addColorStop(0, `rgba(${tint},${(0.22 * strength).toFixed(3)})`);
    g.addColorStop(1, `rgba(${tint},0)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x - 30, y0);
    ctx.lineTo(x + 70, y0);
    ctx.lineTo(x + 300, 1500);
    ctx.lineTo(x + 40, 1500);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

/** Drifting specks (marine snow); whole cycles a loop. */
export function drawSnow(ctx: CanvasRenderingContext2D, loop: number, alpha = 1, seed = 606): void {
  const rng = createRng(seed);
  ctx.save();
  for (let i = 0; i < 70; i++) {
    const ph = (rng() + loop * (1 + (i % 2))) % 1;
    const x = (rng() * VIDEO.width + 40 * Math.sin(ph * 6 + i)) % VIDEO.width;
    const y = VIDEO.height * (1 - ph);
    ctx.fillStyle = `rgba(214,240,238,${(alpha * (0.15 + 0.35 * rng())).toFixed(2)})`;
    ctx.beginPath();
    ctx.arc(x, y, 1.5 + rng() * 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** A bubble: a faint disc, a bright rim and a glint. */
export function drawBubble(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, alpha: number): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = 'rgba(230,252,250,0.2)';
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(240,255,255,0.9)';
  ctx.lineWidth = Math.max(1.6, r * 0.14);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.beginPath();
  ctx.arc(x - r * 0.35, y - r * 0.35, r * 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** A stream of bubbles rising from `from`, `cycles` whole rounds a loop. */
export function drawBubbleStream(ctx: CanvasRenderingContext2D, from: Pt, loop: number, cycles: number, alpha = 1): void {
  const rng = createRng(310);
  for (let i = 0; i < 9; i++) {
    const ph = (i / 9 + loop * cycles) % 1;
    drawBubble(ctx, from.x + 14 * Math.sin(ph * 9 + i) + (rng() - 0.5) * 20, from.y - ph * 360, 5 + rng() * 9, alpha * Math.min(1, 3 * (1 - ph)));
  }
}

/** A dark vignette over the edges, `strength` 0 .. 1. */
export function drawVignette(ctx: CanvasRenderingContext2D, strength: number): void {
  if (strength <= 0.01) return;
  const g = ctx.createRadialGradient(540, 860, 300, 540, 860, 1150);
  g.addColorStop(0, 'rgba(0,10,16,0)');
  g.addColorStop(1, `rgba(0,10,16,${strength})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
}
