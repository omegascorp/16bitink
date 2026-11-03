import { INK, PAPER, type Pt } from '../../../src/art/pen';
import { createRng } from '../../../src/logic/rng';
import { makePaper } from '../backdrop';
import { VIDEO } from '../short';
import { LOOP_S } from './story';

/** The places the short happens in: the shore and the shallow turquoise water, Orpheus Island at sunrise, the boat's deck. */

export const RED = '#c8452c';
export const SEA = '#0d6f86';

// ---------------------------------------------------------------- the shore (above the waterline)

function sky(ctx: CanvasRenderingContext2D, h: number, stops: readonly (readonly [number, string])[]): void {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  for (const [at, c] of stops) g.addColorStop(at, c);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIDEO.width, h + 4);
}

function clouds(ctx: CanvasRenderingContext2D, seed: number, ys: readonly number[], colour: string, alpha: number): void {
  const rng = createRng(seed);
  ctx.save();
  for (const y of ys) {
    for (let i = 0; i < 7; i++) {
      const x = rng() * VIDEO.width;
      const g = ctx.createRadialGradient(x, y, 4, x, y, 130 + rng() * 120);
      g.addColorStop(0, colour.replace('A', (alpha).toFixed(2)));
      g.addColorStop(1, colour.replace('A', '0'));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(x, y, 190 + rng() * 120, 46 + rng() * 26, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

/** A palm: a leaning, ringed trunk and a crown of drooping fronds. */
function palm(ctx: CanvasRenderingContext2D, x: number, y: number, height: number, lean: number, seed: number): void {
  const rng = createRng(seed);
  const top = { x: x + lean, y: y - height };
  ctx.save();
  ctx.lineCap = 'round';
  const trunk = (w: number, colour: string, dx: number): void => {
    ctx.strokeStyle = colour;
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(x + dx, y);
    ctx.quadraticCurveTo(x + lean * 0.2 + dx, y - height * 0.55, top.x + dx, top.y);
    ctx.stroke();
  };
  trunk(22, '#3a2a1c', 0);
  trunk(15, '#8a6a46', -2);
  trunk(5, '#c9a878', -5);
  ctx.strokeStyle = 'rgba(40,26,14,0.5)';
  ctx.lineWidth = 3;
  for (let i = 1; i < 14; i++) {
    const u = i / 14;
    const px = (1 - u) * (1 - u) * x + 2 * u * (1 - u) * (x + lean * 0.2) + u * u * top.x;
    const py = (1 - u) * (1 - u) * y + 2 * u * (1 - u) * (y - height * 0.55) + u * u * top.y;
    ctx.beginPath();
    ctx.moveTo(px - 9, py);
    ctx.lineTo(px + 8, py - 4);
    ctx.stroke();
  }
  for (let i = 0; i < 9; i++) {
    const a = -Math.PI * (0.05 + 0.9 * (i / 8)) + (rng() - 0.5) * 0.2;
    const len = 130 + rng() * 60;
    const end = { x: top.x + Math.cos(a) * len, y: top.y + Math.sin(a) * len * 0.55 + len * 0.42 };
    const mid = { x: top.x + Math.cos(a) * len * 0.55, y: top.y + Math.sin(a) * len * 0.7 - 10 };
    const g = ctx.createLinearGradient(top.x, top.y, end.x, end.y);
    g.addColorStop(0, '#2c6a30');
    g.addColorStop(1, '#6fae45');
    ctx.fillStyle = g;
    ctx.strokeStyle = 'rgba(20,48,22,0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(top.x, top.y);
    ctx.quadraticCurveTo(mid.x, mid.y - 24, end.x, end.y);
    ctx.quadraticCurveTo(mid.x + 6, mid.y + 22, top.x, top.y);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = 'rgba(190,230,120,0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(top.x, top.y);
    ctx.quadraticCurveTo(mid.x, mid.y - 2, end.x, end.y);
    ctx.stroke();
  }
  ctx.restore();
}

/** Forest in clumps of leaf: darker behind, sunlit on top, with palms, down to the sand. */
function forest(ctx: CanvasRenderingContext2D, base: number, depth: number, seed: number): void {
  const rng = createRng(seed);
  const layers: readonly (readonly [string, string, number, number])[] = [
    ['#3f7a5a', '#2b5a44', 0.5, 0.8],
    ['#2f7a3a', '#1f5a2c', 0.75, 1],
    ['#4c9a3c', '#2a6a2c', 1, 1.1],
  ];
  layers.forEach(([hi, lo, rise, size], li) => {
    const y0 = base - depth * (1 - li * 0.2);
    for (let x = -80; x < VIDEO.width + 80; x += 36 + rng() * 40) {
      const r = (54 + rng() * 62) * size;
      const cy = y0 - rise * (40 + rng() * 120) * (depth / 220);
      const g = ctx.createRadialGradient(x - r * 0.25, cy - r * 0.4, r * 0.1, x, cy, r * 1.1);
      g.addColorStop(0, hi);
      g.addColorStop(1, lo);
      ctx.fillStyle = g;
      for (let j = 0; j < 4; j++) {
        ctx.beginPath();
        ctx.ellipse(x + (rng() - 0.5) * r, cy + (rng() - 0.3) * r * 0.5, r * (0.6 + rng() * 0.5), r * (0.45 + rng() * 0.4), 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  });
  // Shadow under the canopy.
  const sh = ctx.createLinearGradient(0, base - 120, 0, base);
  sh.addColorStop(0, 'rgba(20,46,30,0)');
  sh.addColorStop(1, 'rgba(14,32,24,0.55)');
  ctx.fillStyle = sh;
  ctx.fillRect(0, base - 120, VIDEO.width, 120);
}

/** A sandy shore across the frame ending at the waterline `y`: sunlit sand above, darker wet sand below, a few shells and footprints of foam. */
function beach(ctx: CanvasRenderingContext2D, y: number, height: number, seed: number): void {
  const rng = createRng(seed);
  const g = ctx.createLinearGradient(0, y - height, 0, y);
  g.addColorStop(0, '#f2dfae');
  g.addColorStop(0.55, '#ebcf92');
  g.addColorStop(0.86, '#cfae72');
  g.addColorStop(1, '#a88a58');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-10, y + 4);
  ctx.lineTo(-10, y - height + 30);
  for (let x = 0; x <= VIDEO.width + 20; x += 60) ctx.lineTo(x, y - height + 16 * Math.sin(x / 140) + 24 * rng());
  ctx.lineTo(VIDEO.width + 10, y + 4);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(120,90,50,0.28)';
  for (let i = 0; i < 160; i++) {
    ctx.beginPath();
    ctx.arc(rng() * VIDEO.width, y - rng() * height * 0.9, 0.8 + rng() * 1.8, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** The shore as seen from the water's edge: sky, far hills, forest and palms, sand, down to `surface` y. */
export function makeShore(surface: number, soft: boolean, seed = 11): HTMLCanvasElement {
  const canvas = makePaper();
  const ctx = canvas.getContext('2d')!;
  sky(ctx, surface, [[0, '#4fb6e8'], [0.45, '#9fdcf0'], [1, '#e8f6ee']]);
  clouds(ctx, seed + 1, [surface * 0.2, surface * 0.38], 'rgba(255,255,255,A)', 0.8);
  // Far hills, hazy blue-green.
  const hill = ctx.createLinearGradient(0, surface - 380, 0, surface - 160);
  hill.addColorStop(0, '#6aa6a0');
  hill.addColorStop(1, '#9cc9bd');
  ctx.fillStyle = hill;
  ctx.beginPath();
  ctx.moveTo(0, surface - 150);
  for (let x = 0; x <= VIDEO.width; x += 30) ctx.lineTo(x, surface - 250 - 90 * Math.sin(x / 210 + 1) - 40 * Math.sin(x / 83));
  ctx.lineTo(VIDEO.width, surface - 150);
  ctx.closePath();
  ctx.fill();
  forest(ctx, surface - 70, 250, seed + 2);
  palm(ctx, 120, surface - 40, 380, 70, seed + 3);
  palm(ctx, 330, surface - 30, 270, -50, seed + 4);
  palm(ctx, 930, surface - 36, 410, -90, seed + 5);
  palm(ctx, 760, surface - 28, 250, 40, seed + 6);
  beach(ctx, surface, 130, seed + 7);
  if (!soft) return canvas;
  // Out of focus: a box blur over the shore (three passes), then washed a little paler.
  const h = Math.min(VIDEO.height, Math.round(surface) + 8);
  const img = ctx.getImageData(0, 0, VIDEO.width, h);
  for (let pass = 0; pass < 3; pass++) {
    boxBlur(img.data, VIDEO.width, h, 16, true);
    boxBlur(img.data, VIDEO.width, h, 16, false);
  }
  ctx.putImageData(img, 0, 0);
  ctx.fillStyle = 'rgba(235,248,244,0.18)';
  ctx.fillRect(0, 0, VIDEO.width, h);
  return canvas;
}

/** One running-sum box blur of radius `r` along rows (`horizontal`) or columns, in place, edges clamped. */
function boxBlur(d: Uint8ClampedArray, w: number, h: number, r: number, horizontal: boolean): void {
  const [lines, len, stride, step] = horizontal ? [h, w, 4, w * 4] : [w, h, w * 4, 4];
  const buf = new Float32Array(len * 4);
  const n = 2 * r + 1;
  for (let l = 0; l < lines; l++) {
    const base = l * step;
    for (let c = 0; c < 4; c++) {
      let sum = 0;
      for (let k = -r; k <= r; k++) sum += d[base + Math.min(len - 1, Math.max(0, k)) * stride + c]!;
      for (let i = 0; i < len; i++) {
        buf[i * 4 + c] = sum / n;
        sum += d[base + Math.min(len - 1, i + r + 1) * stride + c]! - d[base + Math.max(0, i - r) * stride + c]!;
      }
    }
    for (let i = 0; i < len; i++) for (let c = 0; c < 4; c++) d[base + i * stride + c] = buf[i * 4 + c]!;
  }
}


// ---------------------------------------------------------------- the water

export interface WaterLook {
  readonly top: string;
  readonly mid: string;
  readonly deep: string;
  readonly floor: string;
}
export const BRIGHT: WaterLook = { top: '#9ff3e6', mid: '#34c3c8', deep: '#0b6f88', floor: '#e2cf9c' };

/** Shallow turquoise water below `surface`, brightest at the top, deepening to a sandy floor. */
export function makeWater(surface: number, look: WaterLook = BRIGHT, seed = 21): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = VIDEO.width;
  canvas.height = VIDEO.height;
  const ctx = canvas.getContext('2d')!;
  const g = ctx.createLinearGradient(0, surface, 0, VIDEO.height);
  g.addColorStop(0, look.top);
  g.addColorStop(0.22, look.mid);
  g.addColorStop(0.75, look.deep);
  g.addColorStop(1, '#073e52');
  ctx.fillStyle = g;
  ctx.fillRect(0, surface - 20, VIDEO.width, VIDEO.height);
  // A sandy floor rising at the bottom, with ripples and a few stones.
  const rng = createRng(seed);
  const floor = ctx.createLinearGradient(0, 1620, 0, VIDEO.height);
  floor.addColorStop(0, `${look.floor}00`);
  floor.addColorStop(0.35, `${look.floor}aa`);
  floor.addColorStop(1, '#8f7c52');
  ctx.fillStyle = floor;
  ctx.beginPath();
  ctx.moveTo(0, VIDEO.height);
  ctx.lineTo(0, 1730);
  for (let x = 0; x <= VIDEO.width; x += 40) ctx.lineTo(x, 1700 + 36 * Math.sin(x / 190) + 14 * Math.sin(x / 61));
  ctx.lineTo(VIDEO.width, VIDEO.height);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,244,205,0.22)';
  ctx.lineWidth = 3;
  for (let i = 0; i < 26; i++) {
    const y = 1760 + i * 6.5;
    const x0 = rng() * VIDEO.width;
    ctx.beginPath();
    ctx.moveTo(x0, y);
    ctx.quadraticCurveTo(x0 + 80, y - 8, x0 + 170, y);
    ctx.stroke();
  }
  for (let i = 0; i < 7; i++) {
    const x = rng() * VIDEO.width;
    const y = 1780 + rng() * 110;
    const r = 18 + rng() * 34;
    const sg = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 2, x, y, r);
    sg.addColorStop(0, '#9aa58f');
    sg.addColorStop(1, '#3c4a40');
    ctx.fillStyle = sg;
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  return canvas;
}

/** Beams of sun slanting down through the water and drifting motes (whole cycles a loop). */
export function drawCaustics(ctx: CanvasRenderingContext2D, surface: number, loop: number, strength = 1): void {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let k = 0; k < 6; k++) {
    const x = -60 + k * 210 + 50 * Math.sin(2 * Math.PI * (loop * (1 + (k % 2)) + k * 0.37));
    const g = ctx.createLinearGradient(0, surface, 0, 1700);
    g.addColorStop(0, `rgba(230,255,240,${(0.3 * strength).toFixed(3)})`);
    g.addColorStop(1, 'rgba(230,255,240,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x - 30, surface);
    ctx.lineTo(x + 70, surface);
    ctx.lineTo(x + 330, 1700);
    ctx.lineTo(x + 90, 1700);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  const rng = createRng(606);
  ctx.save();
  for (let i = 0; i < 60; i++) {
    const ph = (rng() + loop * (1 + (i % 2))) % 1;
    const x = (rng() * VIDEO.width + 50 * Math.sin(ph * 6 + i)) % VIDEO.width;
    const y = VIDEO.height * (1 - ph) * 0.9 + surface * 0.1;
    if (y < surface + 10) continue;
    ctx.fillStyle = `rgba(235,255,245,${(0.12 + 0.3 * rng()).toFixed(2)})`;
    ctx.beginPath();
    ctx.arc(x, y, 1.5 + rng() * 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** The surface seen from beneath: a wavy bright line, foam, a pale band under it. */
export function drawSurface(ctx: CanvasRenderingContext2D, y: number, t: number, foam = 1): void {
  const wave = (x: number): number => y + 7 * Math.sin(x / 90 + t * 2.2) + 4 * Math.sin(x / 37 - t * 3.1);
  ctx.save();
  const band = ctx.createLinearGradient(0, y - 10, 0, y + 150);
  band.addColorStop(0, 'rgba(240,255,250,0.78)');
  band.addColorStop(1, 'rgba(240,255,250,0)');
  ctx.fillStyle = band;
  ctx.beginPath();
  ctx.moveTo(-20, y + 150);
  for (let x = -20; x <= VIDEO.width + 20; x += 16) ctx.lineTo(x, wave(x));
  ctx.lineTo(VIDEO.width + 20, y + 150);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = `rgba(255,255,255,${(0.9 * foam).toFixed(2)})`;
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (let x = -20; x <= VIDEO.width + 20; x += 16) (x < 0 ? ctx.moveTo(x, wave(x)) : ctx.lineTo(x, wave(x)));
  ctx.stroke();
  ctx.strokeStyle = `rgba(255,255,255,${(0.35 * foam).toFixed(2)})`;
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let x = -20; x <= VIDEO.width + 20; x += 16) (x < 0 ? ctx.moveTo(x, wave(x) + 20) : ctx.lineTo(x, wave(x) + 20 + 5 * Math.sin(x / 50 + t * 2)));
  ctx.stroke();
  ctx.restore();
}

/** A bubble: a faint disc, a bright rim and a glint. */
export function drawBubble(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, alpha: number): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = 'rgba(240,255,250,0.2)';
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.95)';
  ctx.lineWidth = Math.max(1.6, r * 0.14);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.beginPath();
  ctx.arc(x - r * 0.35, y - r * 0.35, r * 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Bubbles streaming up from a point, a whole number of rounds a loop. */
export function drawBubbleStream(ctx: CanvasRenderingContext2D, from: Pt, loop: number, n: number, rise: number, alpha = 1): void {
  const rng = createRng(77);
  for (let i = 0; i < n; i++) {
    const ph = (i / n + loop * 3) % 1;
    const r = 6 + rng() * 14;
    drawBubble(ctx, from.x + (rng() - 0.5) * 60 + 14 * Math.sin(ph * 9 + i), from.y - rise * ph, r * (0.6 + 0.6 * ph), alpha * Math.min(1, 3 * (1 - ph)));
  }
}

/** A burst of rays and a ring for a shock, `age` 0 .. ~0.8 s. */
export function drawShock(ctx: CanvasRenderingContext2D, at: Pt, age: number, radius: number): void {
  if (age < 0 || age > 0.8) return;
  const u = age / 0.8;
  ctx.save();
  ctx.strokeStyle = `rgba(255,250,225,${(0.95 * (1 - u)).toFixed(2)})`;
  ctx.lineCap = 'round';
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2 + 0.1;
    const r0 = radius * (0.7 + 0.5 * u);
    const r1 = r0 + radius * (0.28 - 0.18 * u);
    ctx.lineWidth = 10 * (1 - u) + 2;
    ctx.beginPath();
    ctx.moveTo(at.x + Math.cos(a) * r0, at.y + Math.sin(a) * r0);
    ctx.lineTo(at.x + Math.cos(a) * r1, at.y + Math.sin(a) * r1);
    ctx.stroke();
  }
  ctx.restore();
}

// ---------------------------------------------------------------- Orpheus Island at sunrise

/** A rich sunrise over a green island with a pale beach, a turquoise reef round it and a deep sea in front. */
export function makeIsland(): HTMLCanvasElement {
  const canvas = makePaper();
  const ctx = canvas.getContext('2d')!;
  const horizon = 880;
  sky(ctx, horizon, [[0, '#17184a'], [0.35, '#5a3a86'], [0.62, '#d4607a'], [0.85, '#ff9c5c'], [1, '#ffd98a']]);
  const sun = ctx.createRadialGradient(760, horizon - 60, 10, 760, horizon - 60, 560);
  sun.addColorStop(0, 'rgba(255,248,200,1)');
  sun.addColorStop(0.2, 'rgba(255,214,130,0.7)');
  sun.addColorStop(1, 'rgba(255,170,100,0)');
  ctx.fillStyle = sun;
  ctx.fillRect(0, 0, VIDEO.width, horizon + 60);
  clouds(ctx, 301, [horizon - 330, horizon - 200], 'rgba(255,170,150,A)', 0.55);
  // The sea: turquoise lagoon near the island fading to deep blue in front.
  const sea = ctx.createLinearGradient(0, horizon, 0, VIDEO.height);
  sea.addColorStop(0, '#f6c88a');
  sea.addColorStop(0.1, '#4cc7c4');
  sea.addColorStop(0.35, '#1d9fb4');
  sea.addColorStop(0.75, '#0f5d86');
  sea.addColorStop(1, '#0a2f58');
  ctx.fillStyle = sea;
  ctx.fillRect(0, horizon, VIDEO.width, VIDEO.height - horizon);
  const rng = createRng(403);
  // The island: three ridges, far to near, the nearest sunlit on the sun side.
  const ridges: readonly (readonly [string, string, number, number, number])[] = [
    ['#4a5a7a', '#6a6a86', 330, 80, 0.8],
    ['#2c5a46', '#4c8a4e', 250, 100, 1.1],
    ['#1d4a30', '#3f8a3a', 170, 90, 1.5],
  ];
  for (const [lo, hi, rise, amp, freq] of ridges) {
    const g = ctx.createLinearGradient(0, horizon - rise, 0, horizon);
    g.addColorStop(0, hi);
    g.addColorStop(1, lo);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(120, horizon + 8);
    for (let x = 120; x <= 980; x += 20) {
      const u = (x - 120) / 860;
      const dome = Math.sin(Math.PI * u) ** 0.8;
      ctx.lineTo(x, horizon - rise * dome - amp * 0.25 * Math.sin(x / (70 / freq)) * dome - 6 * Math.sin(x / 19 + rise));
    }
    ctx.lineTo(980, horizon + 8);
    ctx.closePath();
    ctx.fill();
  }
  // Tree texture on the near ridge, and the sun-side rim light.
  for (let i = 0; i < 320; i++) {
    const x = 150 + rng() * 800;
    const u = (x - 120) / 860;
    const top = horizon - 170 * Math.sin(Math.PI * u) ** 0.8;
    const y = top + rng() * (horizon - top);
    ctx.fillStyle = rng() < 0.5 ? 'rgba(20,60,30,0.5)' : 'rgba(120,190,90,0.32)';
    ctx.beginPath();
    ctx.ellipse(x, y, 14 + rng() * 22, 9 + rng() * 14, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // The beach and its surf.
  const sand = ctx.createLinearGradient(0, horizon - 8, 0, horizon + 34);
  sand.addColorStop(0, '#f8e2b0');
  sand.addColorStop(1, '#c9a878');
  ctx.fillStyle = sand;
  ctx.beginPath();
  ctx.moveTo(90, horizon + 20);
  ctx.quadraticCurveTo(540, horizon - 22, 1010, horizon + 20);
  ctx.quadraticCurveTo(540, horizon + 50, 90, horizon + 20);
  ctx.fill();
  palm(ctx, 250, horizon + 6, 150, 30, 311);
  palm(ctx, 860, horizon + 4, 120, -26, 312);
  // The reef: pale turquoise patches with white surf lines, nearer ones larger.
  for (let i = 0; i < 16; i++) {
    const y = horizon + 40 + i * 52 + rng() * 14;
    const w = 120 + i * 34 + rng() * 120;
    const x = rng() * VIDEO.width;
    const g = ctx.createRadialGradient(x, y, 4, x, y, w);
    g.addColorStop(0, 'rgba(160,250,226,0.5)');
    g.addColorStop(1, 'rgba(160,250,226,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(x, y, w, w * 0.16, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  for (let i = 0; i < 40; i++) {
    const y = horizon + 30 + rng() * 800;
    const w = 40 + (y - horizon) * 0.22 * rng();
    const x = rng() * VIDEO.width;
    ctx.globalAlpha = 0.3 + 0.4 * rng();
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + w / 2, y - 5, x + w, y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  // The sun's glitter path on the sea.
  const glit = ctx.createLinearGradient(0, horizon, 0, horizon + 520);
  glit.addColorStop(0, 'rgba(255,236,170,0.8)');
  glit.addColorStop(1, 'rgba(255,236,170,0)');
  ctx.fillStyle = glit;
  ctx.beginPath();
  ctx.moveTo(700, horizon + 4);
  ctx.lineTo(830, horizon + 4);
  ctx.lineTo(1000, horizon + 520);
  ctx.lineTo(520, horizon + 520);
  ctx.closePath();
  ctx.fill();
  return canvas;
}

/** Sunlit glitter on the sea, moving (whole cycles a loop). */
export function drawGlitter(ctx: CanvasRenderingContext2D, loop: number): void {
  const rng = createRng(909);
  ctx.save();
  ctx.lineCap = 'round';
  for (let i = 0; i < 60; i++) {
    const y = 900 + 600 * rng() ** 1.3;
    const x = 640 + (rng() - 0.5) * (200 + (y - 900) * 0.9);
    const tw = 0.5 + 0.5 * Math.sin(2 * Math.PI * (loop * (2 + (i % 3)) + rng()));
    ctx.strokeStyle = `rgba(255,244,205,${(0.7 * tw).toFixed(2)})`;
    ctx.lineWidth = 3 + 3 * ((y - 900) / 600);
    ctx.beginPath();
    ctx.moveTo(x - 16, y);
    ctx.lineTo(x + 16, y);
    ctx.stroke();
  }
  ctx.restore();
}

// ---------------------------------------------------------------- the deck

/** The boat's deck seen from above: grey-brown planks with seams and grain, a coil of rope, a soft shaft of light and dark corners. */
export function makeDeck(): HTMLCanvasElement {
  const canvas = makePaper();
  const ctx = canvas.getContext('2d')!;
  const rng = createRng(4401);
  const g = ctx.createLinearGradient(0, 0, 0, VIDEO.height);
  g.addColorStop(0, '#8d949a');
  g.addColorStop(1, '#5c646c');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
  const plank = 190;
  for (let y = -40; y < VIDEO.height; y += plank) {
    const shade = 0.88 + 0.16 * rng();
    const pg = ctx.createLinearGradient(0, y, 0, y + plank);
    pg.addColorStop(0, `rgba(${Math.round(150 * shade)},${Math.round(148 * shade)},${Math.round(142 * shade)},0.95)`);
    pg.addColorStop(1, `rgba(${Math.round(118 * shade)},${Math.round(118 * shade)},${Math.round(116 * shade)},0.95)`);
    ctx.fillStyle = pg;
    ctx.fillRect(0, y, VIDEO.width, plank - 5);
    ctx.strokeStyle = 'rgba(30,34,38,0.7)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(0, y + plank - 2);
    ctx.lineTo(VIDEO.width, y + plank - 2);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(60,62,66,0.22)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 9; i++) {
      const yy = y + 12 + rng() * (plank - 30);
      const x0 = rng() * VIDEO.width;
      ctx.beginPath();
      ctx.moveTo(x0 - 300, yy);
      ctx.bezierCurveTo(x0 - 120, yy - 6, x0 + 120, yy + 6, x0 + 320, yy);
      ctx.stroke();
    }
    // A butt joint, and two screws.
    const jx = 140 + rng() * 800;
    ctx.strokeStyle = 'rgba(30,34,38,0.55)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(jx, y);
    ctx.lineTo(jx, y + plank - 4);
    ctx.stroke();
    ctx.fillStyle = 'rgba(40,44,48,0.7)';
    for (const dx of [-24, 24]) {
      for (const dy of [26, plank - 34]) {
        ctx.beginPath();
        ctx.arc(jx + dx, y + dy, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  // A coil of rope in the corner.
  for (let r = 0; r < 5; r++) {
    ctx.strokeStyle = r % 2 ? '#c8b98a' : '#a8996a';
    ctx.lineWidth = 16;
    ctx.beginPath();
    ctx.ellipse(930, 1420, 150 - r * 22, 58 - r * 8, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  // A cool shaft of light from above-left, and dark corners.
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const shaft = ctx.createLinearGradient(0, 300, 700, 1500);
  shaft.addColorStop(0, 'rgba(190,210,230,0.32)');
  shaft.addColorStop(1, 'rgba(190,210,230,0)');
  ctx.fillStyle = shaft;
  ctx.beginPath();
  ctx.moveTo(0, 260);
  ctx.lineTo(520, 260);
  ctx.lineTo(1080, 1700);
  ctx.lineTo(420, 1700);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  const vig = ctx.createRadialGradient(540, 1000, 300, 540, 1000, 1300);
  vig.addColorStop(0, 'rgba(20,24,30,0)');
  vig.addColorStop(1, 'rgba(20,24,30,0.7)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
  return canvas;
}

export const LOOP = LOOP_S;
export { INK, PAPER };
