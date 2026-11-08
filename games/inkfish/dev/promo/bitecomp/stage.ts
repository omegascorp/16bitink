import { INK } from '../../../src/art/pen';
import { FRAME } from '../descent/frame';
import { clamp01, lerp, smooth } from '../short';
import type { HeadPose } from './art/contract';
import { SPECIES } from './species';
import { BITES, T, type Bite } from './timeline';

/**
 * The lab: a clean wall and a steel bench, the bite-force sensor (a
 * two-pronged transducer: two steel plates the animal bites between, a
 * housing with the strain gauge, a cable down to the big readout), and the
 * heads that slide in from the left and chomp on it exactly on the number.
 * The bar is scaled to whoever is biting it, so the big heads fill the frame.
 */

const W = FRAME.width;
const H = FRAME.height;
export const BENCH_Y = 800;
/** The readout's box, bottom centre: the counter is drawn into it (hud.ts). */
export const READOUT = { x: W / 2 - 330, y: 790, w: 660, h: 205 } as const;

const STEEL = ['#eef1f3', '#a9b2b9', '#6c767e'] as const;

// ---------------------------------------------------------------- layout

/** Where the bar sits for a head of size `size`: the bite point, the bar's scale and its length. */
export interface Rig {
  readonly x: number;
  readonly y: number;
  readonly zb: number;
  readonly len: number;
}

export function rigFor(size: number): Rig {
  const zb = Math.max(0.85, size / 560);
  return { x: Math.max(720, Math.min(1100, 1150 - 0.3 * size)), y: 500 + 0.07 * size, zb, len: 0.35 * size + 120 * zb };
}

const sizeOf = (b: Bite): number => b.size ?? SPECIES[b.animal].size;

/** The bar's size at t: the biting head's, moving to the next one's as it slides in. */
export function stageSize(t: number): number {
  let size = sizeOf(BITES[0]!);
  for (const b of BITES) {
    if (t < b.arrive - 0.5) break;
    size = lerp(size, sizeOf(b), smooth((t - b.arrive + 0.5) / 1.1));
  }
  return size;
}

export const rigAt = (t: number): Rig => rigFor(stageSize(t));

// ---------------------------------------------------------------- heads

/** How a bite's head moves: slid in, held with the jaw a little open, wound up, slammed shut on `at`, trembling, released, backed off. */
export function poseOf(b: Bite, t: number, rig: Rig): HeadPose {
  const size = sizeOf(b);
  const away = size * 1.9 + rig.x;
  const slide = b.arrive < 0 ? 1 : smooth((t - b.arrive) / 0.9);
  const leave = smooth((t - b.leave) / 0.7);
  let jaw = 0.28 + 0.06 * Math.sin(t * 2.3);
  let dx = 0;
  const wind = (t - (b.at - 0.55)) / 0.43;
  if (t >= b.at - 0.55 && t < b.at - 0.12) {
    jaw = lerp(jaw, 1, smooth(wind));
    dx = -0.05 * size * smooth(wind);
  } else if (t >= b.at - 0.12 && t < b.at) {
    const u = (t - (b.at - 0.12)) / 0.12;
    jaw = 1 - u * u;
    dx = -0.05 * size * (1 - u * u);
  } else if (t >= b.at) {
    const since = t - b.at;
    jaw = 0.45 * smooth((t - b.leave + 0.35) / 0.35);
    const tremble = Math.exp(-since * 2.2) * Math.sin(since * 70);
    dx = 0.006 * size * tremble;
  }
  return { x: rig.x + dx - away * (1 - slide) - away * leave, y: rig.y + 0.004 * size * Math.sin(t * 1.7) * (t < b.at ? 1 : 0), size, jaw: clamp01(jaw), t };
}

/** The bites with a head on screen at t (one, or two while one hands over to the next). */
export const bitesOn = (t: number): Bite[] => BITES.filter((b) => t >= b.arrive && t < b.leave + 0.75);

// ---------------------------------------------------------------- the camera

/** A short shake after each bite, harder for the bigger numbers. */
function shake(t: number): { readonly x: number; readonly y: number } {
  let x = 0;
  let y = 0;
  for (const b of BITES) {
    const d = t - b.at;
    if (d < 0 || d > 0.6) continue;
    const a = (3 + 7 * Math.log10(SPECIES[b.animal].lb / 60)) * Math.exp(-d * 7);
    x += a * Math.sin(d * 83);
    y += a * Math.cos(d * 61);
  }
  return { x, y };
}

/** The close-up on the lion's fangs ("it holds on"), as a zoom about a point. */
function closeUp(t: number, rig: Rig): { readonly k: number; readonly fx: number; readonly fy: number } {
  const k = smooth((t - T.crush + 0.2) / 0.8) * (1 - smooth((t - T.quick + 0.9) / 0.5));
  return { k: 1 + 0.75 * k, fx: rig.x - 0.12 * SPECIES.lion.size, fy: rig.y };
}

export function withCamera(ctx: CanvasRenderingContext2D, t: number, draw: () => void): void {
  const rig = rigAt(t);
  const sh = shake(t);
  const c = closeUp(t, rig);
  ctx.save();
  ctx.translate(sh.x, sh.y);
  if (c.k > 1.0001) {
    // Zoom about the fangs while drifting them toward the frame's middle.
    const u = (c.k - 1) / 0.75;
    ctx.translate(lerp(c.fx, W * 0.45, u), lerp(c.fy, H * 0.45, u));
    ctx.scale(c.k, c.k);
    ctx.translate(-c.fx, -c.fy);
  }
  draw();
  ctx.restore();
}

// ---------------------------------------------------------------- the lab

export function drawLab(ctx: CanvasRenderingContext2D, t: number): void {
  const rig = rigAt(t);
  const g = ctx.createLinearGradient(0, 0, 0, BENCH_Y);
  g.addColorStop(0, '#d9dfe0');
  g.addColorStop(1, '#eef0ea');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, BENCH_Y);
  // Wall tiles, faint.
  ctx.save();
  ctx.strokeStyle = 'rgba(60,75,85,0.12)';
  ctx.lineWidth = 2;
  for (let x = 0; x <= W; x += 120) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, BENCH_Y);
    ctx.stroke();
  }
  for (let y = 60; y < BENCH_Y; y += 120) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }
  ctx.restore();
  // A soft light on the bar.
  const light = ctx.createRadialGradient(rig.x + 120, rig.y, 40, rig.x + 120, rig.y, 900);
  light.addColorStop(0, 'rgba(255,252,240,0.75)');
  light.addColorStop(1, 'rgba(255,252,240,0)');
  ctx.fillStyle = light;
  ctx.fillRect(0, 0, W, BENCH_Y);
  // The steel bench.
  const b = ctx.createLinearGradient(0, BENCH_Y, 0, H);
  b.addColorStop(0, '#8d979e');
  b.addColorStop(0.06, '#5f6a72');
  b.addColorStop(1, '#2c3238');
  ctx.fillStyle = b;
  ctx.fillRect(0, BENCH_Y, W, H - BENCH_Y);
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.fillRect(0, BENCH_Y, W, 3);
}

function steel(ctx: CanvasRenderingContext2D, y0: number, y1: number): CanvasGradient {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, STEEL[0]);
  g.addColorStop(0.45, STEEL[1]);
  g.addColorStop(1, STEEL[2]);
  return g;
}

/** How hard the bar is being bitten at t, 0 .. 1 (the plates squeeze and the gauge's light comes on). */
export function squeezeAt(t: number): number {
  let q = 0;
  for (const b of BITES) if (t >= b.at - 0.02 && t < b.leave - 0.2) q = Math.max(q, smooth((t - b.at + 0.02) / 0.06));
  return q;
}

/** The sensor: the stand, the housing, the two plates and the cable to the readout. */
export function drawSensor(ctx: CanvasRenderingContext2D, t: number, alpha = 1): void {
  if (alpha <= 0) return;
  const r = rigAt(t);
  const q = squeezeAt(t);
  const z = r.zb;
  const half = (13 - 4 * q) * z;
  const plate = 15 * z;
  const x0 = r.x - 40 * z;
  const hx = r.x + r.len;
  const hw = 170 * z;
  const hh = 130 * z;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(3, 3.5 * z);
  // The cable: from the housing down the bench to the readout.
  ctx.beginPath();
  ctx.moveTo(hx + hw * 0.7, r.y + hh / 2);
  ctx.bezierCurveTo(hx + hw * 0.8, BENCH_Y + 60, READOUT.x + READOUT.w + 120, READOUT.y - 30, READOUT.x + READOUT.w - 40, READOUT.y + 4);
  ctx.lineWidth = 14;
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.lineWidth = 7;
  ctx.strokeStyle = '#3b4148';
  ctx.stroke();
  // The stand.
  ctx.lineWidth = Math.max(3, 3.5 * z);
  ctx.strokeStyle = INK;
  ctx.fillStyle = steel(ctx, r.y, BENCH_Y);
  ctx.beginPath();
  ctx.rect(hx + hw * 0.35, r.y, hw * 0.3, BENCH_Y - r.y + 6);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(hx + hw * 0.5, BENCH_Y + 6, hw * 0.45, 12, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#4a535a';
  ctx.fill();
  ctx.stroke();
  // The two plates, a bite's gap apart, reaching left into the mouth.
  for (const side of [-1, 1]) {
    const yIn = r.y + side * half;
    const yOut = yIn + side * plate;
    ctx.fillStyle = steel(ctx, Math.min(yIn, yOut), Math.max(yIn, yOut));
    ctx.beginPath();
    ctx.moveTo(x0, Math.min(yIn, yOut) + 3 * z);
    ctx.quadraticCurveTo(x0 - 6 * z, r.y + side * (half + plate / 2), x0, Math.max(yIn, yOut) - 3 * z);
    ctx.lineTo(hx + 6, Math.max(yIn, yOut));
    ctx.lineTo(hx + 6, Math.min(yIn, yOut));
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  // The housing with the strain gauge's light.
  ctx.fillStyle = steel(ctx, r.y - hh / 2, r.y + hh / 2);
  ctx.beginPath();
  ctx.roundRect(hx, r.y - hh / 2, hw, hh, 16 * z);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#20262b';
  ctx.beginPath();
  ctx.roundRect(hx + hw * 0.16, r.y - hh * 0.3, hw * 0.68, hh * 0.32, 6 * z);
  ctx.fill();
  const led = ctx.createRadialGradient(hx + hw * 0.75, r.y + hh * 0.25, 1, hx + hw * 0.75, r.y + hh * 0.25, 22 * z);
  led.addColorStop(0, q > 0.5 ? '#ff5a4a' : '#5a2a26');
  led.addColorStop(1, 'rgba(255,90,74,0)');
  ctx.fillStyle = led;
  ctx.fillRect(hx + hw * 0.5, r.y, hw * 0.5, hh * 0.5);
  ctx.fillStyle = '#cfd6da';
  ctx.font = `700 ${Math.round(18 * z)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('FORCE', hx + hw * 0.5, r.y - hh * 0.08);
  ctx.restore();
}

// ---------------------------------------------------------------- the wireframe

let layer: HTMLCanvasElement | null = null;
function layerCanvas(): CanvasRenderingContext2D {
  if (!layer) {
    layer = document.createElement('canvas');
    layer.width = W;
    layer.height = H;
  }
  const c = layer.getContext('2d')!;
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.globalCompositeOperation = 'source-over';
  c.globalAlpha = 1;
  c.clearRect(0, 0, W, H);
  return c;
}

/** A head as a 3D model: its shape filled blueprint blue with a cyan mesh over it. */
function drawWire(ctx: CanvasRenderingContext2D, b: Bite, pose: HeadPose, t: number): void {
  const c = layerCanvas();
  c.setTransform(ctx.getTransform());
  SPECIES[b.animal].draw(c, pose);
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.globalCompositeOperation = 'source-in';
  c.fillStyle = 'rgba(14,52,86,0.92)';
  c.fillRect(0, 0, W, H);
  c.globalCompositeOperation = 'source-atop';
  c.strokeStyle = 'rgba(120,230,255,0.85)';
  c.lineWidth = 2;
  const step = 26;
  const drift = (t * 18) % step;
  for (let x = -H; x < W; x += step) {
    c.beginPath();
    c.moveTo(x + drift, 0);
    c.lineTo(x + drift + H * 0.35, H);
    c.stroke();
  }
  for (let y = 0; y < H; y += step) {
    c.beginPath();
    c.moveTo(0, y + 0.2 * Math.sin(y));
    c.bezierCurveTo(W * 0.3, y - 16, W * 0.6, y + 16, W, y);
    c.stroke();
  }
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.shadowColor = 'rgba(120,230,255,0.9)';
  ctx.shadowBlur = 18;
  ctx.drawImage(layer!, 0, 0);
  ctx.restore();
}

/** How painted the great white is: a wireframe model until "3D model of its skull", then painted in from the left. */
export const paintedAt = (t: number): number => smooth((t - T.model3d + 0.2) / 0.9);

export function drawHead(ctx: CanvasRenderingContext2D, b: Bite, t: number, rig: Rig): void {
  const pose = poseOf(b, t, rig);
  const draw = SPECIES[b.animal].draw;
  if (b.animal !== 'greatWhite') {
    draw(ctx, pose);
    return;
  }
  const p = paintedAt(t);
  if (p >= 1) {
    draw(ctx, pose);
    return;
  }
  const left = pose.x - pose.size * 2;
  const edge = left + (pose.x + pose.size * 0.6 - left) * p;
  if (p > 0) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(-W, -H, edge + W, 3 * H);
    ctx.clip();
    draw(ctx, pose);
    ctx.restore();
  }
  ctx.save();
  ctx.beginPath();
  ctx.rect(edge, -H, 3 * W, 3 * H);
  ctx.clip();
  drawWire(ctx, b, pose, t);
  ctx.restore();
}

/** The bar and every head on it. */
export function drawBench(ctx: CanvasRenderingContext2D, t: number, sensorAlpha = 1): void {
  const rig = rigAt(t);
  drawSensor(ctx, t, sensorAlpha);
  for (const b of bitesOn(t)) drawHead(ctx, b, t, rig);
}
