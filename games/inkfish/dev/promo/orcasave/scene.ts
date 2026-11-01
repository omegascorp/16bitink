import { INK, Pen, type Pt } from '../../../src/art/pen';
import { createRng } from '../../../src/logic/rng';
import { VIDEO } from '../short';
import { LOOP_S } from './story';
import type { Fin } from './motion';

/** The cold Antarctic picture the scenes share: dusky sky, floating ice, dark sea, and the black fins and ice floe laid over it. */

export const penFor = (ctx: CanvasRenderingContext2D, seed: number, boil: number): Pen => new Pen(ctx, seed * 31 + boil * 977, 1.2);
export const RED_TEXT = '#c8452c';
export const COLD_TEXT = { fill: '#e8f1f8', halo: '#14263a' };

export type Water = (x: number) => number;

/** The gently moving waterline, a whole number of cycles a loop. */
export const calmWater = (horizon: number, t: number): Water => (x) =>
  horizon + 6 * Math.sin(x / 80 - (2 * Math.PI * 3 * t) / LOOP_S) + 3.5 * Math.sin(x / 33 + (2 * Math.PI * 2 * t) / LOOP_S);

// ---------------------------------------------------------------- sky and sea

/** A dusky, cold sky with soft cloud, faint far ice cliffs on the horizon. */
export function drawSky(ctx: CanvasRenderingContext2D, horizon: number, boil: number, warm = 0, dim = 0): void {
  const g = ctx.createLinearGradient(0, 0, 0, horizon);
  g.addColorStop(0, '#222c44');
  g.addColorStop(0.55, '#4d5f7e');
  g.addColorStop(1, warm > 0 ? '#c9b7a6' : '#9aa9bc');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIDEO.width, horizon + 30);
  const rng = createRng(31);
  for (let i = 0; i < 7; i++) {
    const cx = rng() * VIDEO.width;
    const cy = 150 + rng() * (horizon - 420);
    const w = 190 + rng() * 260;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(1, 0.26);
    const cg = ctx.createRadialGradient(0, 0, 10, 0, 0, w);
    cg.addColorStop(0, 'rgba(210,222,238,0.34)');
    cg.addColorStop(1, 'rgba(210,222,238,0)');
    ctx.fillStyle = cg;
    ctx.fillRect(-w, -w, w * 2, w * 2);
    ctx.restore();
  }
  // Far ice cliffs.
  const pen = penFor(ctx, 3, boil);
  const cliff: Pt[] = [{ x: -20, y: horizon + 4 }];
  for (let x = -20; x <= VIDEO.width + 40; x += 60) {
    const y = horizon - 10 - 34 * Math.abs(Math.sin(x / 210 + 0.8)) - 16 * Math.sin(x / 57);
    cliff.push({ x, y: Math.min(horizon - 2, y) });
  }
  cliff.push({ x: VIDEO.width + 40, y: horizon + 4 });
  const cg = ctx.createLinearGradient(0, horizon - 70, 0, horizon);
  cg.addColorStop(0, '#d7e2ee');
  cg.addColorStop(1, '#8da3bd');
  ctx.fillStyle = cg;
  ctx.beginPath();
  cliff.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
  ctx.fill();
  pen.stroke(cliff.slice(1, -1), 2.4, '#3a4c66', 0.75);
  if (dim > 0) {
    ctx.fillStyle = `rgba(4,8,20,${dim})`;
    ctx.fillRect(0, 0, VIDEO.width, horizon + 30);
  }
}

/** The open sea down from the waterline (opaque), cold slate-teal. */
export function drawSea(ctx: CanvasRenderingContext2D, water: Water, horizon: number, boil: number, dim = 0): void {
  const sea = ctx.createLinearGradient(0, horizon - 30, 0, VIDEO.height);
  sea.addColorStop(0, '#46697f');
  sea.addColorStop(0.35, '#244a60');
  sea.addColorStop(1, '#0a1c2b');
  ctx.beginPath();
  ctx.moveTo(0, VIDEO.height);
  for (let x = 0; x <= VIDEO.width; x += 12) ctx.lineTo(x, water(x));
  ctx.lineTo(VIDEO.width, VIDEO.height);
  ctx.closePath();
  ctx.fillStyle = sea;
  ctx.fill();
  if (dim > 0) {
    ctx.fillStyle = `rgba(2,8,16,${dim})`;
    ctx.fill();
  }
  const line: Pt[] = [];
  for (let x = -20; x <= VIDEO.width + 20; x += 24) line.push({ x, y: water(x) });
  penFor(ctx, 5, boil).stroke(line, 3, INK, 0.7);
}

/** The sea in front of what is under the waterline: a translucent sheet, an inked line, a few pale ripples. */
export function drawSeaFront(ctx: CanvasRenderingContext2D, water: Water, horizon: number, boil: number, density = 1): void {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(0, VIDEO.height);
  for (let x = 0; x <= VIDEO.width; x += 12) ctx.lineTo(x, water(x) + 5);
  ctx.lineTo(VIDEO.width, VIDEO.height);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, horizon, 0, VIDEO.height);
  g.addColorStop(0, `rgba(70,112,138,${0.5 * density})`);
  g.addColorStop(0.4, `rgba(30,70,96,${0.72 * density})`);
  g.addColorStop(1, `rgba(8,24,38,${0.9 * density})`);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.restore();
  const line: Pt[] = [];
  for (let x = -20; x <= VIDEO.width + 20; x += 24) line.push({ x, y: water(x) + 5 });
  const pen = penFor(ctx, 9, boil);
  pen.stroke(line, 4.2, INK, 0.9);
  const rng = createRng(414);
  for (let i = 0; i < 14; i++) {
    const x = rng() * VIDEO.width;
    const y = water(x) + 30 + rng() * 150;
    const w = 40 + rng() * 90;
    pen.hair([{ x: x - w / 2, y }, { x, y: y + 3 }, { x: x + w / 2, y }], 1.6, '#a9c8dc', 0.3);
  }
}

// ---------------------------------------------------------------- the orca fin

/** A tall black dorsal fin through the surface at x, its base `y` below the waterline `top`, leaning with the way it swims, a V of wake behind. */
export function drawFin(ctx: CanvasRenderingContext2D, f: Fin, top: number, boil: number, seed: number): void {
  const pen = penFor(ctx, 40 + seed, boil);
  const base = top + f.y;
  const w = f.h * 0.62;
  const dir = f.lean >= 0 ? 1 : -1;
  const sweep = 0.1 + 0.18 * Math.abs(f.lean);
  // The tip leans back (against the way it swims).
  const tip: Pt = { x: f.x - dir * f.h * sweep, y: base - f.h };
  const front: Pt[] = [];
  const back: Pt[] = [];
  for (let i = 0; i <= 12; i++) {
    const u = i / 12;
    const e = u * u * (3 - 2 * u);
    front.push({ x: f.x + dir * w * 0.5 * (1 - u) + (tip.x - f.x) * Math.pow(u, 1.5), y: base + (tip.y - base) * Math.pow(u, 0.8) - 0 * e });
    back.push({ x: f.x - dir * w * 0.5 * (1 - u) + (tip.x - f.x) * Math.pow(u, 1.15) - dir * w * 0.1 * Math.sin(Math.PI * u), y: base + (tip.y - base) * u });
  }
  const shape = [...front, ...back.reverse().slice(1)];
  // A little foam ring and the wake.
  ctx.save();
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = '#dbe9f2';
  ctx.beginPath();
  ctx.ellipse(f.x, base + 3, w * 0.62, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  pen.hair([{ x: f.x - dir * w * 0.4, y: base + 6 }, { x: f.x - dir * w * 2.4, y: base - 6 }], 3.2, '#e4f0f7', 0.55);
  pen.hair([{ x: f.x - dir * w * 0.3, y: base + 14 }, { x: f.x - dir * w * 1.9, y: base + 30 }], 2.6, '#cfe0eb', 0.4);
  ctx.save();
  ctx.beginPath();
  shape.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
  const g = ctx.createLinearGradient(f.x - dir * w * 0.5, 0, f.x + dir * w * 0.5, 0);
  g.addColorStop(0, '#0b1017');
  g.addColorStop(0.55, '#1a2431');
  g.addColorStop(1, '#2d3d50');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.clip();
  // Wet sheen along the leading edge and a dull glow low on the fin.
  pen.hair(front.slice(1, -2).map((p) => ({ x: p.x - dir * 3, y: p.y + 3 })), 3.4, '#8fa9c2', 0.5);
  const sh = ctx.createLinearGradient(0, base - f.h, 0, base);
  sh.addColorStop(0, 'rgba(120,150,180,0)');
  sh.addColorStop(1, 'rgba(110,140,170,0.35)');
  ctx.fillStyle = sh;
  ctx.fillRect(f.x - w, base - f.h, 2 * w, f.h);
  ctx.restore();
  pen.stroke(shape, 3.6, INK, 1, true);
}

// ---------------------------------------------------------------- ice

/** An ice floe: a slab tipping about its middle at the waterline, white top, blue underwater body, pen-and-ink faceted. */
export function drawFloe(ctx: CanvasRenderingContext2D, x: number, y: number, half: number, top: number, tilt: number, boil: number): void {
  const pen = penFor(ctx, 61, boil);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tilt);
  const rng = createRng(77);
  // The top: an irregular pale slab.
  const upper: Pt[] = [{ x: -half, y: 6 }];
  for (let i = 0; i <= 10; i++) {
    const u = i / 10;
    const edge = Math.min(1, 5 * u, 5 * (1 - u)) ** 0.6;
    upper.push({ x: -half + 2 * half * u, y: 6 - (top + 14 * Math.sin(u * 9) + 8 * (rng() - 0.5) + 20 * Math.sin(Math.PI * u)) * edge });
  }
  upper.push({ x: half, y: 6 });
  // Under the surface: a pale blue lump.
  const lower: Pt[] = [{ x: half, y: 6 }, { x: half * 0.78, y: 70 }, { x: half * 0.3, y: 118 }, { x: -half * 0.35, y: 108 }, { x: -half * 0.85, y: 62 }, { x: -half, y: 6 }];
  ctx.beginPath();
  lower.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
  const lg = ctx.createLinearGradient(0, 0, 0, 120);
  lg.addColorStop(0, 'rgba(150,205,230,0.85)');
  lg.addColorStop(1, 'rgba(40,104,148,0.55)');
  ctx.fillStyle = lg;
  ctx.fill();
  pen.stroke(lower, 2.4, '#1f4e72', 0.8, true);
  ctx.beginPath();
  upper.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
  const ug = ctx.createLinearGradient(0, -top - 30, 0, 8);
  ug.addColorStop(0, '#fbfdff');
  ug.addColorStop(0.6, '#dfeaf3');
  ug.addColorStop(1, '#a9c4da');
  ctx.fillStyle = ug;
  ctx.fill();
  ctx.save();
  ctx.clip();
  // Blue-shadow facets and a few cracks.
  for (let i = 0; i < 6; i++) {
    const a = -half + (i + rng()) * (2 * half / 6);
    pen.fill([{ x: a, y: -top - 10 }, { x: a + 50 + rng() * 40, y: -top - 10 }, { x: a + 20, y: 8 }, { x: a - 30, y: 8 }], '#8fb3d0', 0.16 + 0.1 * rng());
  }
  for (let i = 0; i < 4; i++) {
    const a = -half * 0.8 + rng() * half * 1.6;
    pen.hair([{ x: a, y: -top * 0.9 }, { x: a + 10 * (rng() - 0.5), y: -top * 0.5 }, { x: a + 24 * (rng() - 0.5), y: -4 }], 1.5, '#4f7494', 0.55);
  }
  ctx.restore();
  pen.stroke(upper, 3.6, INK, 1, true);
  ctx.restore();
}

/** A ring of foam and drops where something hits the water. */
export function drawSplashAt(ctx: CanvasRenderingContext2D, x: number, y: number, age: number, size: number): void {
  if (age < 0 || age > 1.1) return;
  const u = age / 1.1;
  ctx.save();
  ctx.globalAlpha = 1 - u;
  ctx.strokeStyle = '#eaf4fa';
  ctx.lineWidth = 6 * (1 - u) + 1;
  ctx.beginPath();
  ctx.ellipse(x, y, size * (0.4 + u * 1.3), size * 0.12 * (0.4 + u * 1.3), 0, 0, Math.PI * 2);
  ctx.stroke();
  const rng = createRng(555);
  ctx.fillStyle = '#f4faff';
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 + rng();
    const v = 160 + rng() * 240;
    const px = x + Math.cos(a) * v * u * 0.55 * (size / 100);
    const py = y - Math.abs(Math.sin(a)) * v * u * 1.1 * (size / 100) + 520 * u * u * (size / 100);
    ctx.beginPath();
    ctx.arc(px, py, (3 + rng() * 6) * (1 - u * 0.6), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
