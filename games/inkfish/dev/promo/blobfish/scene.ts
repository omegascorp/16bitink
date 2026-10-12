import { createRng } from '../../../src/logic/rng';
import { clamp01, lerp, smooth, VIDEO } from '../short';
import { type Camera, DEPTH_M, FLOOR_Y, REST_Y } from './story';

/**
 * The world around the blobfish, drawn for one moment: the night sky and
 * the sea's surface, the water darkening with depth, marine snow, the
 * seafloor; the net it lies in and the rope; the pressure arrows, the
 * splashes, the drips and the puff of silt.
 */
export const CHALK = '#e4e0ec';
const WATER_INK = '#c9e6ff';

export interface Pt { readonly x: number; readonly y: number }

export const toScreen = (cam: Camera, x: number, y: number): Pt => ({
  x: VIDEO.width / 2 + (x - cam.x) * cam.zoom,
  y: VIDEO.height / 2 + (y - cam.y) * cam.zoom,
});

/** World y at a screen row. */
const worldYAt = (cam: Camera, sy: number): number => cam.y + (sy - VIDEO.height / 2) / cam.zoom;

// ---------------------------------------------------------------- sky and water

type Rgb = readonly [number, number, number];
/** Sea colour by depth, metres: a deep night-blue under the surface to near-black at a kilometre. */
const WATER: readonly (readonly [number, Rgb])[] = [
  [0, [27, 54, 98]], [120, [17, 35, 72]], [350, [10, 20, 46]], [700, [6, 11, 27]], [1000, [4, 7, 17]],
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
  const rng = createRng(31);
  return Array.from({ length: 70 }, () => ({ x: rng() * VIDEO.width, f: rng() * 0.95, r: 0.8 + rng() * 1.8, a: 0.25 + rng() * 0.5 }));
})();

/** Where the sea's surface crosses the screen, px (above or below it when out of the picture). */
export const surfaceY = (cam: Camera): number => toScreen(cam, 0, 0).y;

/** The surface's swell along it: a gentle wave that rolls with time. */
const waveAt = (x: number, t: number, zoom: number): number =>
  zoom * (5 * Math.sin(x * 0.011 + (2 * Math.PI * 3 * t) / 20.25) + 3 * Math.sin(x * 0.027 - (2 * Math.PI * 5 * t) / 20.25));

export function drawSkyAndSea(ctx: CanvasRenderingContext2D, cam: Camera, t: number): void {
  const sy = surfaceY(cam);
  const { width: W, height: H } = VIDEO;
  if (sy > 0) {
    const sky = ctx.createLinearGradient(0, 0, 0, sy);
    sky.addColorStop(0, '#080c1f');
    sky.addColorStop(1, '#1d2a55');
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
    water.addColorStop(k / 10, waterAt(Math.max(0, worldYAt(cam, y)) * (DEPTH_M / REST_Y)));
  }
  ctx.fillStyle = water;
  if (sy <= 0) {
    ctx.fillRect(0, 0, W, H);
    return;
  }
  // The surface: water up to a rolling line.
  ctx.beginPath();
  ctx.moveTo(0, H);
  for (let x = 0; x <= W; x += 20) ctx.lineTo(x, sy + waveAt(x, t, cam.zoom));
  ctx.lineTo(W, H);
  ctx.closePath();
  ctx.fill();
}

const VEIL = 'rgba(14, 36, 80, 0.3)';

/**
 * Over everything in the sea, a thin veil of water, and the chalk line of
 * the surface on top: whatever is half in the water looks half under it.
 */
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
  // A few pen strokes of light on the swell.
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.35;
  for (let k = 0; k < 9; k++) {
    const x = (k * 137 + 40) % W;
    const y = sy + 26 * cam.zoom * (0.6 + (k % 3) * 0.5);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 40 + (k % 4) * 18, y);
    ctx.stroke();
  }
  ctx.restore();
}

// ---------------------------------------------------------------- the seafloor

const PEBBLES = (() => {
  const rng = createRng(12);
  return Array.from({ length: 14 }, () => ({ x: (rng() - 0.5) * 1.8 * VIDEO.width, d: 10 + rng() * 120, r: 6 + rng() * 22 }));
})();
const GRAINS = (() => {
  const rng = createRng(13);
  return Array.from({ length: 260 }, () => ({ x: (rng() - 0.5) * 1.6 * VIDEO.width, d: rng() * 500, r: 0.8 + rng() * 1.6 }));
})();

const floorEdge = (x: number, zoom: number): number => zoom * (7 * Math.sin(x * 0.006 + 1) + 4 * Math.sin(x * 0.017));

export function drawSeafloor(ctx: CanvasRenderingContext2D, cam: Camera): void {
  const fy = toScreen(cam, 0, FLOOR_Y).y;
  const { width: W, height: H } = VIDEO;
  if (fy > H + 40) return;
  ctx.save();
  const sand = ctx.createLinearGradient(0, fy, 0, fy + 700 * cam.zoom);
  sand.addColorStop(0, '#2b2c40');
  sand.addColorStop(1, '#101220');
  ctx.fillStyle = sand;
  ctx.beginPath();
  ctx.moveTo(0, H);
  for (let x = 0; x <= W; x += 20) ctx.lineTo(x, fy + floorEdge(x - W / 2, cam.zoom));
  ctx.lineTo(W, H);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = CHALK;
  for (const g of GRAINS) {
    const x = W / 2 + g.x * cam.zoom;
    const y = fy + g.d * cam.zoom + floorEdge(g.x * cam.zoom, cam.zoom);
    if (x < 0 || x > W || y > H) continue;
    ctx.globalAlpha = 0.22 * (1 - g.d / 600);
    ctx.beginPath();
    ctx.arc(x, y, g.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = CHALK;
  ctx.lineWidth = 2.5;
  for (const p of PEBBLES) {
    const x = W / 2 + p.x * cam.zoom;
    const y = fy + p.d * cam.zoom;
    if (x < -60 || x > W + 60 || y > H + 40) continue;
    ctx.globalAlpha = 0.45;
    ctx.fillStyle = '#3a3a52';
    ctx.beginPath();
    ctx.ellipse(x, y, p.r * cam.zoom, p.r * cam.zoom * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  drawSeaLife(ctx, cam, fy);
  ctx.globalAlpha = 0.85;
  ctx.lineWidth = 3;
  ctx.strokeStyle = CHALK;
  ctx.beginPath();
  for (let x = 0; x <= W; x += 20) {
    const y = fy + floorEdge(x - W / 2, cam.zoom);
    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.restore();
}

/** Sea pens (feathery, swaying) and a glass sponge standing on the seafloor, in world px either side of the fish. */
const PENS = [{ x: -430, h: 230 }, { x: -330, h: 150 }, { x: 520, h: 190 }] as const;
const SPONGE = { x: 380, h: 120, w: 46 } as const;

function drawSeaLife(ctx: CanvasRenderingContext2D, cam: Camera, fy: number): void {
  const z = cam.zoom;
  ctx.save();
  ctx.strokeStyle = CHALK;
  ctx.lineCap = 'round';
  ctx.globalAlpha = 0.55;
  for (const pen of PENS) {
    const base = toScreen(cam, pen.x, FLOOR_Y);
    const top = { x: base.x + 12 * z, y: fy - pen.h * z };
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(base.x, fy + 4);
    ctx.quadraticCurveTo(base.x, (fy + top.y) / 2, top.x, top.y);
    ctx.stroke();
    ctx.lineWidth = 2;
    for (let k = 0; k < 9; k++) {
      const u = 0.35 + (k / 9) * 0.62;
      const px = lerp(base.x, top.x, u * u);
      const py = lerp(fy, top.y, u);
      const leaf = 26 * z * Math.sin(Math.PI * u);
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.quadraticCurveTo(px + side * leaf * 0.6, py - leaf * 0.1, px + side * leaf, py - leaf * 0.45);
        ctx.stroke();
      }
    }
  }
  // The glass sponge: a lacy vase.
  const b = toScreen(cam, SPONGE.x, FLOOR_Y);
  const h = SPONGE.h * z;
  const w = SPONGE.w * z;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(b.x - w * 0.35, fy + 3);
  ctx.bezierCurveTo(b.x - w * 0.6, fy - h * 0.4, b.x - w, fy - h * 0.8, b.x - w * 0.9, fy - h);
  ctx.moveTo(b.x + w * 0.35, fy + 3);
  ctx.bezierCurveTo(b.x + w * 0.6, fy - h * 0.4, b.x + w, fy - h * 0.8, b.x + w * 0.9, fy - h);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(b.x, fy - h, w * 0.9, w * 0.22, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = 1.3;
  ctx.globalAlpha = 0.3;
  for (let k = 1; k < 5; k++) {
    const y = fy - (h * k) / 5;
    const half = lerp(w * 0.4, w * 0.92, (k / 5) ** 1.4);
    ctx.beginPath();
    ctx.ellipse(b.x, y, half, half * 0.22, 0, 0, Math.PI);
    ctx.stroke();
  }
  ctx.restore();
}

// ---------------------------------------------------------------- marine snow

const SNOW = (() => {
  const rng = createRng(4243);
  return Array.from({ length: 240 }, () => ({ x: rng() * VIDEO.width, y: rng() * VIDEO.height, r: 0.9 + rng() * 2, phase: rng() * Math.PI * 2 }));
})();
const BLUR_S = 1 / 25;

/**
 * Snow drifting down through the water, carried past by the dive and the
 * haul (`scroll`, with its speed `speed` px/s), smeared along its motion.
 * Only in the water.
 */
export function drawSnow(ctx: CanvasRenderingContext2D, scroll: number, speed: number, surface: number, t: number, loopS: number): void {
  const { width: W, height: H } = VIDEO;
  const smear = Math.max(-320, Math.min(320, speed * BLUR_S));
  ctx.save();
  ctx.fillStyle = '#dfe8ff';
  ctx.strokeStyle = '#dfe8ff';
  ctx.lineCap = 'round';
  ctx.globalAlpha = 0.3;
  for (const m of SNOW) {
    const x = (((m.x + 12 * Math.sin((2 * Math.PI * t) / loopS + m.phase)) % W) + W) % W;
    const y = ((((m.y - scroll + (H * 2 * t) / loopS) % H) + H) % H);
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

// ---------------------------------------------------------------- pressure

/**
 * Ink arrows pressing in on the fish from all round, `strength` 0 .. 1,
 * pushing further in on each stress (`push`). `centre` and the radii are
 * the fish's body on screen.
 */
export function drawArrows(
  ctx: CanvasRenderingContext2D, centre: Pt, rx: number, ry: number, strength: number, push: number, boil: number, floorY: number, ceilingY: number,
): void {
  if (strength <= 0.01) return;
  const rng = createRng(500 + boil);
  ctx.save();
  ctx.strokeStyle = WATER_INK;
  ctx.fillStyle = WATER_INK;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    const dir = { x: Math.cos(a), y: Math.sin(a) };
    const edge = { x: centre.x + dir.x * rx, y: centre.y + dir.y * ry };
    const gap = 26 + 34 * (1 - strength) - 16 * push;
    const len = 70 + 70 * strength + 20 * push;
    const tip = { x: edge.x + dir.x * gap, y: edge.y + dir.y * gap };
    // Not up into the readout, nor down into the sand or the captions: shorter there, or left out.
    const reach = dir.y < -0.1 ? Math.min(len, (tip.y - ceilingY) / -dir.y) : dir.y > 0.1 ? Math.min(len, (floorY - tip.y) / dir.y) : len;
    if (reach < 40) continue;
    const tail = { x: tip.x + dir.x * reach, y: tip.y + dir.y * reach };
    const j = (): number => (rng() - 0.5) * 3;
    ctx.globalAlpha = 0.9 * smooth(strength);
    ctx.lineWidth = 6 + 2 * push;
    ctx.beginPath();
    ctx.moveTo(tail.x + j(), tail.y + j());
    ctx.lineTo(tip.x - dir.x * 10 + j(), tip.y - dir.y * 10 + j());
    ctx.stroke();
    const head = 24 + 6 * push;
    const side = { x: -dir.y, y: dir.x };
    ctx.beginPath();
    ctx.moveTo(tip.x - dir.x * 4, tip.y - dir.y * 4);
    ctx.lineTo(tip.x + dir.x * head + side.x * head * 0.62 + j(), tip.y + dir.y * head + side.y * head * 0.62 + j());
    ctx.lineTo(tip.x + dir.x * head - side.x * head * 0.62 + j(), tip.y + dir.y * head - side.y * head * 0.62 + j());
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

// ---------------------------------------------------------------- splashes, drips, silt

/**
 * Where it goes through the surface: a crown of spray thrown up either
 * side, drops arcing out and falling back, and a ring of foam spreading.
 * `u` 0 .. 1 over its life.
 */
const SPRAY = (() => {
  const rng = createRng(71);
  return Array.from({ length: 26 }, (_, k) => ({ side: k % 2 === 0 ? -1 : 1, out: 0.2 + 0.75 * rng(), up: 0.35 + 0.9 * rng(), r: 5 + 8 * rng() }));
})();

export function drawSplash(ctx: CanvasRenderingContext2D, x: number, surface: number, width: number, u: number): void {
  if (u < 0 || u > 1) return;
  ctx.save();
  ctx.strokeStyle = CHALK;
  ctx.fillStyle = CHALK;
  ctx.lineCap = 'round';
  // Foam ring.
  ctx.globalAlpha = 0.9 * (1 - u);
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.ellipse(x, surface, width * (0.75 + 0.8 * u), width * (0.07 + 0.06 * u), 0, 0, Math.PI * 2);
  ctx.stroke();
  // The crown: curved sheets of spray, up and falling over outwards.
  const rise = Math.sin(Math.PI * Math.min(1, u * 1.6));
  ctx.lineWidth = 5;
  for (let k = 0; k < 7; k++) {
    for (const side of [-1, 1]) {
      const base = x + side * width * (0.5 + 0.07 * k);
      const h = width * (0.35 + 0.08 * ((k * 5) % 3)) * rise;
      ctx.globalAlpha = 0.85 * (1 - u);
      ctx.beginPath();
      ctx.moveTo(base, surface);
      ctx.quadraticCurveTo(base + side * h * 0.15, surface - h, base + side * h * 0.45, surface - h * 0.8);
      ctx.stroke();
    }
  }
  // Drops arcing out and back down.
  for (const d of SPRAY) {
    const s = u * 1.25;
    const px = x + d.side * width * (0.45 + d.out * s);
    const py = surface - width * d.up * (2.2 * s - 2 * s * s);
    if (py > surface + 4) continue;
    ctx.globalAlpha = 0.95 * (1 - u * 0.7);
    ctx.beginPath();
    ctx.arc(px, py, d.r * (1 - 0.5 * u), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** A drop falling, or the ring it left on the water. */
export function drawDrop(ctx: CanvasRenderingContext2D, p: Pt, ring: number | null, zoom: number, wave: number): void {
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
    ctx.ellipse(p.x, p.y + wave, 12 + 70 * ring * zoom * 0.5, 3 + 10 * ring * zoom * 0.5, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

/** Silt puffing out sideways where the net lands on the sand, 0 .. 1 over its life. */
export function drawPuff(ctx: CanvasRenderingContext2D, belly: Pt, length: number, u: number): void {
  if (u < 0 || u > 1) return;
  const rng = createRng(17);
  ctx.save();
  ctx.fillStyle = '#b9b4c8';
  for (let k = 0; k < 40; k++) {
    const side = k % 2 === 0 ? -1 : 1;
    const reach = (0.45 + 0.5 * rng()) * length * side;
    const s = 1 - (1 - u) * (1 - u);
    const x = belly.x + reach * (0.6 + 0.6 * s);
    const y = belly.y - length * (0.02 + 0.12 * rng()) * s;
    ctx.globalAlpha = 0.4 * (1 - u) * (0.5 + rng() * 0.5);
    ctx.beginPath();
    ctx.arc(x, y, (6 + 14 * rng()) * (0.6 + s) * (length / 500), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

