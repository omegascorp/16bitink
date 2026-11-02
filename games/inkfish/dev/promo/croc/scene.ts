import { INK, makeCanvas, PAPER, Pen, type Pt } from '../../../src/art/pen';
import { createRng } from '../../../src/logic/rng';
import { makePaper } from '../backdrop';
import { VIDEO } from '../short';
import { LOOP_S } from './story';

/** The river the short happens on: a dusky gold sky, mangrove banks, brown water, and what falls and flies in it. */

export const RED = '#c8452c';
const GREEN_DARK = '#16241a';
const penFor = (ctx: CanvasRenderingContext2D, seed: number, boil: number): Pen => new Pen(ctx, seed * 31 + boil * 977, 1.2);

/** A canvas filled with paper, then sky, a glowing sun, a line of mangroves and river below `horizon`. */
export function makeDusk(horizon: number, glow = 1): HTMLCanvasElement {
  const canvas = makePaper();
  const ctx = canvas.getContext('2d')!;
  const sky = ctx.createLinearGradient(0, 0, 0, horizon);
  sky.addColorStop(0, 'rgba(22,14,24,0.99)');
  sky.addColorStop(0.4, 'rgba(84,46,50,0.97)');
  sky.addColorStop(0.75, 'rgba(176,100,66,0.95)');
  sky.addColorStop(1, 'rgba(240,176,104,0.97)');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, VIDEO.width, horizon + 4);
  const sun = ctx.createRadialGradient(620, horizon - 40, 10, 620, horizon - 40, 520 * glow);
  sun.addColorStop(0, 'rgba(255,236,170,0.95)');
  sun.addColorStop(0.3, 'rgba(255,196,120,0.5)');
  sun.addColorStop(1, 'rgba(255,170,90,0)');
  ctx.fillStyle = sun;
  ctx.fillRect(0, 0, VIDEO.width, horizon + 40);
  // Far mangroves: layered clumps of leaf, dark against the glow, roots down to the water.
  const rng = createRng(8801 + horizon);
  for (const [depth, colour, height] of [[0, '#4a4a32', 70], [1, '#2b3a26', 100], [2, GREEN_DARK, 130]] as const) {
    const leaf = ctx.createLinearGradient(0, horizon - height * 1.2, 0, horizon);
    leaf.addColorStop(0, depth === 2 ? '#4c5e34' : colour);
    leaf.addColorStop(1, colour);
    ctx.fillStyle = leaf;
    for (let x = -60; x < VIDEO.width + 60; x += 34 + rng() * 40) {
      const r = 46 + rng() * 52;
      const h = height * (0.6 + rng() * 0.6);
      for (let j = 0; j < 5; j++) {
        ctx.beginPath();
        ctx.ellipse(x + (rng() - 0.5) * r, horizon - h * 0.45 + (rng() - 0.5) * h * 0.5 + depth * 10, r * (0.7 + rng() * 0.5), h * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.strokeStyle = colour;
      ctx.lineWidth = 3 + depth;
      for (let j = 0; j < 4; j++) {
        const rx = x + (rng() - 0.5) * r * 1.4;
        ctx.beginPath();
        ctx.moveTo(rx, horizon - 10);
        ctx.quadraticCurveTo(rx + (rng() - 0.5) * 20, horizon + 10, rx + (rng() - 0.5) * 8, horizon + 26 + depth * 6);
        ctx.stroke();
      }
    }
  }
  // River below: murky brown-green, lighter where it holds the sky's glow.
  const river = ctx.createLinearGradient(0, horizon, 0, VIDEO.height);
  river.addColorStop(0, 'rgba(176,128,78,0.96)');
  river.addColorStop(0.18, 'rgba(110,90,54,0.96)');
  river.addColorStop(0.6, 'rgba(56,50,30,0.97)');
  river.addColorStop(1, 'rgba(28,26,16,0.98)');
  ctx.fillStyle = river;
  ctx.fillRect(0, horizon + 22, VIDEO.width, VIDEO.height - horizon);
  // The sun's wobbling reflection.
  ctx.save();
  ctx.translate(620, horizon + 22);
  ctx.scale(1, 2.6);
  const refl = ctx.createRadialGradient(0, 0, 0, 0, 0, 220);
  refl.addColorStop(0, 'rgba(255,214,140,0.55)');
  refl.addColorStop(1, 'rgba(255,214,140,0)');
  ctx.fillStyle = refl;
  ctx.fillRect(-220, 0, 440, 220);
  ctx.restore();
  return canvas;
}

/** Ripples across a river: thin pale arcs sliding sideways, a whole number of rounds a loop. */
export function drawRipples(ctx: CanvasRenderingContext2D, y0: number, y1: number, loop: number): void {
  const rng = createRng(1203);
  ctx.save();
  ctx.lineCap = 'round';
  for (let i = 0; i < 26; i++) {
    const y = y0 + (y1 - y0) * (0.05 + 0.95 * rng() ** 1.4);
    const w = 40 + rng() * 120 * (0.4 + (y - y0) / (y1 - y0));
    const x = ((rng() * VIDEO.width + loop * VIDEO.width * (1 + (i % 2))) % (VIDEO.width + 200)) - 100;
    ctx.strokeStyle = `rgba(255,226,170,${(0.1 + 0.2 * rng()).toFixed(2)})`;
    ctx.lineWidth = 2 + 3 * (y - y0) / (y1 - y0);
    ctx.beginPath();
    ctx.moveTo(x - w / 2, y);
    ctx.quadraticCurveTo(x, y - 5, x + w / 2, y);
    ctx.stroke();
  }
  ctx.restore();
}

/** The river's surface across the frame at `y`: the water in front of a swimmer, murky, with a foam line and ripples. */
export function drawWaterFront(ctx: CanvasRenderingContext2D, y: number, t: number, alpha = 0.86, foam = 1): void {
  ctx.save();
  const wave = (x: number): number => y + 7 * Math.sin(x / 80 + t * 2.4) + 4 * Math.sin(x / 33 - t * 3.1);
  ctx.beginPath();
  ctx.moveTo(-20, VIDEO.height + 20);
  for (let x = -20; x <= VIDEO.width + 20; x += 16) ctx.lineTo(x, wave(x));
  ctx.lineTo(VIDEO.width + 20, VIDEO.height + 20);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, y - 10, 0, y + 560);
  g.addColorStop(0, `rgba(120,98,58,${alpha})`);
  g.addColorStop(0.2, `rgba(78,66,38,${alpha})`);
  g.addColorStop(1, `rgba(32,28,16,${Math.min(1, alpha + 0.1)})`);
  ctx.fillStyle = g;
  ctx.fill();
  if (foam > 0.01) {
    ctx.strokeStyle = `rgba(255,240,205,${(0.7 * foam).toFixed(2)})`;
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let x = -20; x <= VIDEO.width + 20; x += 16) (x < 0 ? ctx.moveTo(x, wave(x)) : ctx.lineTo(x, wave(x)));
    ctx.stroke();
    ctx.strokeStyle = `rgba(255,240,205,${(0.3 * foam).toFixed(2)})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let x = -20; x <= VIDEO.width + 20; x += 16) (x < 0 ? ctx.moveTo(x, wave(x) + 18) : ctx.lineTo(x, wave(x) + 18 + 4 * Math.sin(x / 50 + t * 2)));
    ctx.stroke();
  }
  ctx.restore();
}

/** Spray flying off a splash at `from`: droplets on arcs, `age` seconds after it starts (a fast burst, then falling). */
export function drawSpray(ctx: CanvasRenderingContext2D, from: Pt, age: number, power = 1, spread = 1.5, seed = 51): void {
  if (age < 0 || age > 1.4) return;
  const rng = createRng(seed);
  ctx.save();
  for (let i = 0; i < 34; i++) {
    const a = -Math.PI / 2 + (rng() - 0.5) * spread * 1.6;
    const speed = (260 + rng() * 520) * power;
    const r = 4 + rng() * 11;
    const x = from.x + Math.cos(a) * speed * age * 0.9;
    const y = from.y + Math.sin(a) * speed * age + 820 * age * age;
    ctx.globalAlpha = Math.max(0, 1 - age / 1.3);
    ctx.fillStyle = 'rgba(255,246,222,0.92)';
    ctx.strokeStyle = 'rgba(120,96,56,0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(x, y, r * 0.8, r * 1.15, a + Math.PI / 2 + age * 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

/** Ever-present droplets and mist off a thrashing head: a whole number of cycles a loop (`loop` 0 .. 1). */
export function drawThrashSpray(ctx: CanvasRenderingContext2D, from: Pt, loop: number, cycles: number): void {
  const rng = createRng(222);
  ctx.save();
  for (let i = 0; i < 18; i++) {
    const ph = (i / 18 + loop * cycles) % 1;
    const a = -Math.PI * (0.2 + 0.6 * rng());
    const speed = 150 + rng() * 360;
    const r = 3 + rng() * 9;
    ctx.globalAlpha = Math.min(1, 3 * (1 - ph));
    ctx.fillStyle = 'rgba(255,246,222,0.92)';
    ctx.strokeStyle = 'rgba(120,96,56,0.6)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(from.x + Math.cos(a) * speed * ph, from.y + Math.sin(a) * speed * ph + 520 * ph * ph, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

/** Rings spreading across the surface from a splash. */
export function drawRings(ctx: CanvasRenderingContext2D, at: Pt, age: number): void {
  if (age < 0 || age > 1.6) return;
  ctx.save();
  ctx.strokeStyle = `rgba(255,236,190,${(0.7 * (1 - age / 1.6)).toFixed(2)})`;
  ctx.lineWidth = 5;
  for (let i = 0; i < 3; i++) {
    const u = age - i * 0.18;
    if (u <= 0) continue;
    ctx.beginPath();
    ctx.ellipse(at.x, at.y, 60 + u * 420, 12 + u * 90, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

/** A small flat-roofed river cruiser against the dusk: a shaded cream hull, a dark cabin with lit windows and silhouetted passengers. */
export function drawBoat(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, t: number, boil: number): void {
  const k = w / 400;
  const pen = penFor(ctx, 17, boil);
  ctx.save();
  ctx.translate(x, y + 4 * Math.sin(t * 1.7));
  ctx.rotate(0.01 * Math.sin(t * 1.3));
  ctx.scale(k, k);
  const shaded = (pts: readonly Pt[], top: number, bottom: number, a: string, b: string): void => {
    ctx.save();
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.closePath();
    const g = ctx.createLinearGradient(0, top, 0, bottom);
    g.addColorStop(0, a);
    g.addColorStop(1, b);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.restore();
  };
  const hull = [{ x: -200, y: -26 }, { x: 206, y: -30 }, { x: 176, y: 34 }, { x: -170, y: 34 }];
  shaded(hull, -30, 34, '#b9a888', '#4a3c34');
  const cabin = [{ x: -168, y: -26 }, { x: 160, y: -26 }, { x: 160, y: -92 }, { x: -168, y: -92 }];
  shaded(cabin, -92, -26, '#5a4a48', '#2a2224');
  // The window band, warm, with the passengers dark against it.
  shaded([{ x: -156, y: -84 }, { x: 148, y: -84 }, { x: 148, y: -44 }, { x: -156, y: -44 }], -84, -44, 'rgba(255,200,120,0.95)', 'rgba(220,140,70,0.9)');
  ctx.fillStyle = 'rgba(26,18,18,0.92)';
  [-132, -96, -50, -8, 36, 78, 118].forEach((hx, i) => {
    const hy = -66 - (i % 3) * 2;
    ctx.beginPath();
    ctx.arc(hx, hy, 8.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(hx, hy + 22, 14, 14, 0, Math.PI, 0);
    ctx.fill();
  });
  const roof = [{ x: -182, y: -92 }, { x: 176, y: -92 }, { x: 170, y: -108 }, { x: -176, y: -108 }];
  shaded(roof, -108, -92, '#8a7a72', '#3a2e2e');
  pen.hair([{ x: -176, y: -108 }, { x: 170, y: -108 }], 2.5, 'rgba(255,226,180,0.8)', 0.7);
  pen.stroke([...hull, hull[0]!], 3, INK, 0.8, true);
  pen.hair([{ x: -190, y: -12 }, { x: 196, y: -14 }], 5, RED, 0.8);
  ctx.restore();
  ctx.save();
  ctx.strokeStyle = 'rgba(255,230,190,0.6)';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  for (const [dx, len] of [[-210 * k, 120], [-250 * k, 90]] as const) {
    ctx.beginPath();
    ctx.moveTo(x + dx, y + 40 * k);
    ctx.quadraticCurveTo(x + dx - len / 2, y + 40 * k + 6, x + dx - len, y + 40 * k);
    ctx.stroke();
  }
  ctx.restore();
}

/** Murky underwater: pale green-gold light at the top, deepening to brown-black, with beams. */
export function makeMurk(): HTMLCanvasElement {
  const canvas = makePaper();
  const ctx = canvas.getContext('2d')!;
  const g = ctx.createLinearGradient(0, 0, 0, VIDEO.height);
  g.addColorStop(0, 'rgba(170,176,98,0.96)');
  g.addColorStop(0.3, 'rgba(98,110,58,0.96)');
  g.addColorStop(0.7, 'rgba(44,56,34,0.97)');
  g.addColorStop(1, 'rgba(16,22,16,0.99)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
  return canvas;
}

/** Beams of sun and drifting specks in the murk (whole cycles a loop). */
export function drawMurkLight(ctx: CanvasRenderingContext2D, loop: number): void {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let k = 0; k < 5; k++) {
    const x = 40 + k * 230 + 40 * Math.sin(2 * Math.PI * (loop * (1 + (k % 2)) + k * 0.37));
    const g = ctx.createLinearGradient(0, 0, 0, 1300);
    g.addColorStop(0, 'rgba(255,240,170,0.22)');
    g.addColorStop(1, 'rgba(255,240,170,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x - 30, 0);
    ctx.lineTo(x + 60, 0);
    ctx.lineTo(x + 280, 1300);
    ctx.lineTo(x + 60, 1300);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  const rng = createRng(606);
  ctx.save();
  for (let i = 0; i < 70; i++) {
    const ph = (rng() + loop * (1 + (i % 2))) % 1;
    const x = (rng() * VIDEO.width + 60 * Math.sin(ph * 6 + i)) % VIDEO.width;
    const y = VIDEO.height * (1 - ph);
    ctx.fillStyle = `rgba(220,214,150,${(0.15 + 0.35 * rng()).toFixed(2)})`;
    ctx.beginPath();
    ctx.arc(x, y, 1.5 + rng() * 3.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** A bubble: a faint disc, a bright rim and a glint. */
export function drawBubble(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, alpha: number): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = 'rgba(240,236,200,0.22)';
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,248,222,0.95)';
  ctx.lineWidth = Math.max(1.6, r * 0.14);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.beginPath();
  ctx.arc(x - r * 0.35, y - r * 0.35, r * 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** The burp: a rolling puff of bubbles and mist rising off the croc's mouth. Age 0 .. ~1.6 s. */
export function drawBurp(ctx: CanvasRenderingContext2D, from: Pt, age: number): void {
  if (age < 0 || age > 1.6) return;
  const rng = createRng(909);
  for (let i = 0; i < 16; i++) {
    const u = age - rng() * 0.3;
    if (u < 0) continue;
    const r = 14 + rng() * 34;
    const drift = (rng() - 0.2) * 130;
    const rise = 150 + rng() * 240;
    ctx.save();
    ctx.globalAlpha = Math.max(0, 0.75 - 0.5 * u);
    ctx.fillStyle = 'rgba(235,226,190,0.8)';
    ctx.beginPath();
    ctx.arc(from.x + drift * u, from.y - rise * u, r * (0.6 + 0.8 * Math.min(1, u * 2)), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    drawBubble(ctx, from.x + drift * u * 1.1 + 12 * Math.sin(u * 9 + i), from.y - rise * u * 1.2 - 40, r * 0.5, Math.min(1, 2.4 - 1.5 * u));
  }
}

/** A thick ruler: end caps and a bar drawn left to right by `u` (0 .. 1). */
export function drawBar(ctx: CanvasRenderingContext2D, x0: number, x1: number, y: number, u: number, boil: number): void {
  if (u <= 0) return;
  const pen = penFor(ctx, 41, boil);
  const end = x0 + (x1 - x0) * u;
  pen.stroke([{ x: x0, y }, { x: end, y }], 11, PAPER);
  pen.stroke([{ x: x0, y }, { x: end, y }], 6.5, RED);
  for (const x of u >= 0.995 ? [x0, x1] : [x0]) pen.stroke([{ x, y: y - 26 }, { x, y: y + 26 }], 7, RED);
}

export const LOOP = LOOP_S;
