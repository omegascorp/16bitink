import { createRng } from '../../../src/logic/rng';
import { clamp01, lerp, VIDEO } from '../short';
import { type Camera, DEPTH_M, FLOOR_Y, LOOP_S } from './story';

/**
 * The world around the cusk, drawn for one moment: the night sky and the
 * sea's surface, the water darkening to black with depth, marine snow, the
 * abyssal seafloor, and the splashes and drips at the surface.
 */
export const CHALK = '#e4e0ec';
const WATER_INK = '#c9e6ff';

export interface Pt { readonly x: number; readonly y: number }

export const toScreen = (cam: Camera, x: number, y: number): Pt => ({
  x: VIDEO.width / 2 + (x - cam.x) * cam.zoom,
  y: VIDEO.height / 2 + (y - cam.y) * cam.zoom,
});

const worldYAt = (cam: Camera, sy: number): number => cam.y + (sy - VIDEO.height / 2) / cam.zoom;

// ---------------------------------------------------------------- sky and water

type Rgb = readonly [number, number, number];
/** Sea colour by depth, metres: night-blue under the surface to black at 4 km. */
const WATER: readonly (readonly [number, Rgb])[] = [
  [0, [27, 54, 98]], [200, [16, 33, 70]], [800, [9, 18, 42]], [2000, [5, 10, 24]], [4000, [3, 5, 12]],
];
function waterAt(metres: number): string {
  let i = 0;
  while (i < WATER.length - 2 && metres > WATER[i + 1]![0]) i++;
  const [m0, c0] = WATER[i]!;
  const [m1, c1] = WATER[i + 1]!;
  const u = clamp01((metres - m0) / (m1 - m0));
  return `rgb(${c0.map((c, k) => Math.round(lerp(c, c1[k]!, u))).join(',')})`;
}

const STARS = (() => {
  const rng = createRng(37);
  return Array.from({ length: 80 }, () => ({ x: rng() * VIDEO.width, f: rng() * 0.95, r: 0.8 + rng() * 1.8, a: 0.25 + rng() * 0.5 }));
})();

export const surfaceY = (cam: Camera): number => toScreen(cam, 0, 0).y;

/** The surface's swell: a gentle wave rolling a whole number of times a loop. */
export const waveAt = (x: number, t: number, zoom: number): number =>
  zoom * (5 * Math.sin(x * 0.011 + (2 * Math.PI * 4 * t) / LOOP_S) + 3 * Math.sin(x * 0.027 - (2 * Math.PI * 7 * t) / LOOP_S));

export function drawSkyAndSea(ctx: CanvasRenderingContext2D, cam: Camera, t: number): void {
  const sy = surfaceY(cam);
  const { width: W, height: H } = VIDEO;
  if (sy > 0) {
    const sky = ctx.createLinearGradient(0, Math.min(0, sy - 1400), 0, sy);
    sky.addColorStop(0, '#060a1a');
    sky.addColorStop(1, '#1a2650');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, Math.min(H, sy + 20));
    ctx.save();
    ctx.fillStyle = '#f4eddc';
    for (const s of STARS) {
      const y = s.f * Math.min(sy, H) - 30;
      if (y < 0) continue;
      ctx.globalAlpha = s.a;
      ctx.beginPath();
      ctx.arc(s.x, y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
  if (sy >= H) return;
  const from = Math.max(0, sy);
  const water = ctx.createLinearGradient(0, from, 0, H);
  for (let k = 0; k <= 10; k++) {
    const y = lerp(from, H, k / 10);
    water.addColorStop(k / 10, waterAt(Math.max(0, worldYAt(cam, y)) * (DEPTH_M / FLOOR_Y)));
  }
  ctx.fillStyle = water;
  if (sy <= 0) {
    ctx.fillRect(0, 0, W, H);
    return;
  }
  ctx.beginPath();
  ctx.moveTo(0, H);
  for (let x = 0; x <= W; x += 20) ctx.lineTo(x, sy + waveAt(x, t, cam.zoom));
  ctx.lineTo(W, H);
  ctx.closePath();
  ctx.fill();
}

const VEIL = 'rgba(14, 36, 80, 0.32)';

/** A thin veil of water over everything in the sea, and the chalk line of the surface on top. */
export function drawWaterline(ctx: CanvasRenderingContext2D, cam: Camera, t: number): void {
  const sy = surfaceY(cam);
  const { width: W, height: H } = VIDEO;
  if (sy >= H + 60) return;
  ctx.save();
  ctx.fillStyle = VEIL;
  ctx.beginPath();
  ctx.moveTo(0, H);
  for (let x = 0; x <= W; x += 20) ctx.lineTo(x, Math.max(-10, sy + waveAt(x, t, cam.zoom)));
  ctx.lineTo(W, H);
  ctx.closePath();
  ctx.fill();
  if (sy < -40) {
    ctx.restore();
    return;
  }
  ctx.strokeStyle = CHALK;
  ctx.lineWidth = 3;
  ctx.globalAlpha = 0.8;
  ctx.beginPath();
  for (let x = 0; x <= W; x += 20) {
    const y = sy + waveAt(x, t, cam.zoom);
    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.35;
  for (let k = 0; k < 9; k++) {
    const x = (k * 137 + 40) % W;
    const y = sy + 22 * Math.min(2, cam.zoom) * (0.6 + (k % 3) * 0.5);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 40 + (k % 4) * 18, y);
    ctx.stroke();
  }
  ctx.restore();
}

// ---------------------------------------------------------------- the seafloor

const GRAINS = (() => {
  const rng = createRng(19);
  return Array.from({ length: 320 }, () => ({ x: (rng() - 0.5) * 3600, d: rng() * 600, r: 0.8 + rng() * 1.6 }));
})();
const LUMPS = (() => {
  const rng = createRng(23);
  return Array.from({ length: 18 }, () => ({ x: (rng() - 0.5) * 3400, d: 8 + rng() * 90, r: 6 + rng() * 18 }));
})();
/** Glass sponges and sea pens either side of where it lives, world x. */
const STALKS: readonly { readonly x: number; readonly h: number }[] = [{ x: -380, h: 170 }, { x: -300, h: 110 }, { x: 470, h: 140 }];

const floorEdge = (x: number): number => 7 * Math.sin(x * 0.006 + 1) + 4 * Math.sin(x * 0.017);

export function drawSeafloor(ctx: CanvasRenderingContext2D, cam: Camera): void {
  const { width: W, height: H } = VIDEO;
  const fy = toScreen(cam, 0, FLOOR_Y).y;
  if (fy > H + 40) return;
  const z = cam.zoom;
  const edgeAt = (sx: number): number => fy + z * floorEdge(cam.x + (sx - W / 2) / z);
  ctx.save();
  const sand = ctx.createLinearGradient(0, fy, 0, fy + 600 * z);
  sand.addColorStop(0, '#24253a');
  sand.addColorStop(1, '#0d0f1c');
  ctx.fillStyle = sand;
  ctx.beginPath();
  ctx.moveTo(0, H);
  for (let x = 0; x <= W; x += 20) ctx.lineTo(x, edgeAt(x));
  ctx.lineTo(W, H);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = CHALK;
  for (const g of GRAINS) {
    const p = toScreen(cam, g.x, FLOOR_Y + g.d + floorEdge(g.x));
    if (p.x < 0 || p.x > W || p.y > H || p.y < 0) continue;
    ctx.globalAlpha = 0.2 * (1 - g.d / 700);
    ctx.beginPath();
    ctx.arc(p.x, p.y, g.r * Math.max(0.6, Math.min(1.6, z)), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = CHALK;
  ctx.lineWidth = 2;
  for (const l of LUMPS) {
    const p = toScreen(cam, l.x, FLOOR_Y + l.d + floorEdge(l.x));
    if (p.x < -60 || p.x > W + 60 || p.y > H + 40) continue;
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = '#34354d';
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, l.r * z, l.r * z * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  drawStalks(ctx, cam);
  ctx.globalAlpha = 0.8;
  ctx.lineWidth = 3;
  ctx.strokeStyle = CHALK;
  ctx.beginPath();
  for (let x = 0; x <= W; x += 20) (x === 0 ? ctx.moveTo(x, edgeAt(x)) : ctx.lineTo(x, edgeAt(x)));
  ctx.stroke();
  ctx.restore();
}

/** Feathery sea pens on the sediment, in chalk. */
function drawStalks(ctx: CanvasRenderingContext2D, cam: Camera): void {
  const z = cam.zoom;
  ctx.save();
  ctx.strokeStyle = CHALK;
  ctx.lineCap = 'round';
  ctx.globalAlpha = 0.45;
  for (const s of STALKS) {
    const base = toScreen(cam, s.x, FLOOR_Y + floorEdge(s.x));
    const top = toScreen(cam, s.x + 10, FLOOR_Y - s.h);
    if (base.x < -100 || base.x > VIDEO.width + 100) continue;
    ctx.lineWidth = Math.max(1, 2.5 * Math.min(1.5, z));
    ctx.beginPath();
    ctx.moveTo(base.x, base.y + 3);
    ctx.quadraticCurveTo(base.x, (base.y + top.y) / 2, top.x, top.y);
    ctx.stroke();
    ctx.lineWidth = Math.max(0.8, 1.6 * Math.min(1.5, z));
    for (let k = 0; k < 8; k++) {
      const u = 0.35 + (k / 8) * 0.62;
      const px = lerp(base.x, top.x, u * u);
      const py = lerp(base.y, top.y, u);
      const leaf = 22 * z * Math.sin(Math.PI * u);
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.quadraticCurveTo(px + side * leaf * 0.6, py - leaf * 0.1, px + side * leaf, py - leaf * 0.45);
        ctx.stroke();
      }
    }
  }
  ctx.restore();
}

// ---------------------------------------------------------------- marine snow

const SNOW = (() => {
  const rng = createRng(4247);
  return Array.from({ length: 240 }, () => ({ x: rng() * VIDEO.width, y: rng() * VIDEO.height, r: 0.9 + rng() * 2, phase: rng() * Math.PI * 2 }));
})();
const BLUR_S = 1 / 25;

/**
 * Snow drifting down through the water, carried past by the camera
 * (`scroll` screen px, moving at `speed` px/s), smeared along its motion.
 * Only below the surface.
 */
export function drawSnow(ctx: CanvasRenderingContext2D, scroll: number, speed: number, surface: number, t: number): void {
  const { width: W, height: H } = VIDEO;
  const smear = Math.max(-320, Math.min(320, speed * BLUR_S));
  ctx.save();
  ctx.fillStyle = '#dfe8ff';
  ctx.strokeStyle = '#dfe8ff';
  ctx.lineCap = 'round';
  ctx.globalAlpha = 0.3;
  for (const m of SNOW) {
    const x = (((m.x + 12 * Math.sin((2 * Math.PI * t) / LOOP_S + m.phase)) % W) + W) % W;
    const y = (((m.y - scroll + (H * 2 * t) / LOOP_S) % H) + H) % H;
    if (y < surface + 12) continue;
    if (Math.abs(smear) > m.r) {
      ctx.lineWidth = m.r * 1.3;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y + smear);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(x, y, m.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

// ---------------------------------------------------------------- splashes and drips

const SPRAY = (() => {
  const rng = createRng(73);
  return Array.from({ length: 26 }, (_, k) => ({ side: k % 2 === 0 ? -1 : 1, out: 0.2 + 0.75 * rng(), up: 0.35 + 0.9 * rng(), r: 5 + 8 * rng() }));
})();

/** A crown of spray, drops arcing out and a ring of foam where something goes through the surface, `u` 0 .. 1. */
export function drawSplash(ctx: CanvasRenderingContext2D, x: number, surface: number, width: number, u: number): void {
  if (u < 0 || u > 1) return;
  ctx.save();
  ctx.strokeStyle = CHALK;
  ctx.fillStyle = CHALK;
  ctx.lineCap = 'round';
  ctx.globalAlpha = 0.9 * (1 - u);
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.ellipse(x, surface, width * (0.75 + 0.8 * u), width * (0.07 + 0.06 * u), 0, 0, Math.PI * 2);
  ctx.stroke();
  const rise = Math.sin(Math.PI * Math.min(1, u * 1.6));
  ctx.lineWidth = 5;
  for (let k = 0; k < 7; k++) {
    for (const side of [-1, 1]) {
      const base = x + side * width * (0.5 + 0.07 * k);
      const h = width * (0.35 + 0.08 * ((k * 5) % 3)) * rise;
      ctx.beginPath();
      ctx.moveTo(base, surface);
      ctx.quadraticCurveTo(base + side * h * 0.15, surface - h, base + side * h * 0.45, surface - h * 0.8);
      ctx.stroke();
    }
  }
  const scale = Math.max(0.4, Math.min(1, width / 250));
  for (const d of SPRAY) {
    const s = u * 1.25;
    const px = x + d.side * width * (0.45 + d.out * s);
    const py = surface - width * d.up * (2.2 * s - 2 * s * s);
    if (py > surface + 4) continue;
    ctx.globalAlpha = 0.95 * (1 - u * 0.7);
    ctx.beginPath();
    ctx.arc(px, py, d.r * scale * (1 - 0.5 * u), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** A drop falling off the net, or the ring it left on the water. */
export function drawDrop(ctx: CanvasRenderingContext2D, p: Pt, ring: number | null, zoom: number): void {
  ctx.save();
  ctx.fillStyle = WATER_INK;
  ctx.strokeStyle = CHALK;
  if (ring === null) {
    const r = 5 * Math.max(1, zoom * 0.7);
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y - r * 2.2);
    ctx.quadraticCurveTo(p.x + r, p.y - r * 0.2, p.x, p.y + r);
    ctx.quadraticCurveTo(p.x - r, p.y - r * 0.2, p.x, p.y - r * 2.2);
    ctx.fill();
  } else {
    ctx.globalAlpha = 0.8 * (1 - ring);
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, 12 + 35 * ring * zoom, 3 + 5 * ring * zoom, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}
