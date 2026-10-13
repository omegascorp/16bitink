import { INK, PAPER } from '../../../src/art/pen';
import { createRng } from '../../../src/logic/rng';
import { VIDEO } from '../short';
import { LOOP_S } from './beats';
import { CAMERA, PERIOD, type Splash, SURFACE_Y } from './flight';

/**
 * The sea side-on, in pen, sliding past as the camera follows the fish: the
 * rolling waterline and the wash below it, "~" wavelets, clouds drifting
 * slower behind, and the splashes and ripples the fish and the gannet make.
 */

const TAU = Math.PI * 2;
/** The waterline rolls three times a loop, as well as sliding past. */
const ROLLS = 3;

/** The waterline's height at screen x, time t. Its waves repeat every PERIOD px of the world. */
export function waterlineAt(x: number, t: number): number {
  const wx = x + CAMERA.at(t);
  const roll = (TAU * ROLLS * t) / LOOP_S;
  return SURFACE_Y + 7 * Math.sin((wx * TAU * 5) / PERIOD + roll) + 3.5 * Math.sin((wx * TAU * 11) / PERIOD - 2 * roll) + 2 * Math.sin((wx * TAU * 2) / PERIOD + roll);
}

/** The sea below the waterline: a blue wash deepening downwards, over whatever is in it. */
export function drawWater(ctx: CanvasRenderingContext2D, t: number): void {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(-10, VIDEO.height);
  for (let x = -10; x <= VIDEO.width + 10; x += 8) ctx.lineTo(x, waterlineAt(x, t));
  ctx.lineTo(VIDEO.width + 10, VIDEO.height);
  ctx.closePath();
  const wash = ctx.createLinearGradient(0, SURFACE_Y, 0, VIDEO.height);
  wash.addColorStop(0, 'rgba(60,120,170,0.18)');
  wash.addColorStop(0.45, 'rgba(35,80,135,0.34)');
  wash.addColorStop(1, 'rgba(18,40,80,0.55)');
  ctx.fillStyle = wash;
  ctx.fill();
  ctx.restore();
}

/** "~" marks on the water, sliding past with it: world x within a PERIOD, depth below the surface. */
const WAVELETS = (() => {
  const rng = createRng(808);
  return Array.from({ length: 14 }, (_, i) => ({ wx: ((i + rng() * 0.7) / 14) * PERIOD, dy: 40 + rng() * 300, size: 0.7 + rng() * 0.6 }));
})();

/** The waterline in ink, and the wavelets below it. */
export function drawWaterline(ctx: CanvasRenderingContext2D, t: number): void {
  const roll = (TAU * ROLLS * t) / LOOP_S;
  const cam = CAMERA.at(t);
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 3.2;
  ctx.beginPath();
  for (let x = -10; x <= VIDEO.width + 10; x += 8) {
    if (x === -10) ctx.moveTo(x, waterlineAt(x, t));
    else ctx.lineTo(x, waterlineAt(x, t));
  }
  ctx.stroke();
  ctx.lineWidth = 2;
  for (const w of WAVELETS) {
    const x = ((((w.wx - cam) % PERIOD) + PERIOD) % PERIOD) - 60;
    ctx.globalAlpha = 0.45 - 0.25 * (w.dy / 340);
    const len = 64 * w.size;
    ctx.beginPath();
    for (let k = 0; k <= 6; k++) {
      const px = x - len / 2 + (k / 6) * len;
      const py = SURFACE_Y + w.dy + Math.sin(k * 1.4 + roll) * 4;
      if (k === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }
  ctx.restore();
}

// ---------------------------------------------------------------- the sky

/** Clouds drift past a fifth as fast as the sea; their strip repeats a whole number of times a loop. */
const CLOUD_PARALLAX = 0.2;
const CLOUD_STRIP = (CLOUD_PARALLAX * CAMERA.perLoop) / Math.max(1, Math.round((CLOUD_PARALLAX * CAMERA.perLoop) / 1500));
const CLOUD_INK = '#bdb6a6';
const CLOUDS = [
  { wx: 0.1, y: 360, w: 230 },
  { wx: 0.45, y: 470, w: 170 },
  { wx: 0.78, y: 330, w: 260 },
] as const;

const PUFFS = [
  { dx: -0.36, dy: 0, r: 0.2 },
  { dx: -0.12, dy: -0.1, r: 0.27 },
  { dx: 0.16, dy: -0.05, r: 0.24 },
  { dx: 0.38, dy: 0.02, r: 0.17 },
] as const;

/** A cloud: overlapping puffs cut off flat at the base, stroked then filled with paper so only their outer edge shows. */
function drawCloud(ctx: CanvasRenderingContext2D, x: number, y: number, w: number): void {
  const puffs = (): void => {
    ctx.beginPath();
    for (const p of PUFFS) {
      ctx.moveTo(x + p.dx * w + p.r * w, y + p.dy * w);
      ctx.arc(x + p.dx * w, y + p.dy * w, p.r * w, 0, Math.PI * 2);
    }
  };
  ctx.save();
  ctx.beginPath();
  ctx.rect(x - w, y - w, 2 * w, w);
  ctx.clip();
  puffs();
  ctx.lineWidth = 5;
  ctx.stroke();
  puffs();
  ctx.fill();
  ctx.restore();
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(x - 0.58 * w, y);
  ctx.lineTo(x + 0.57 * w, y);
  ctx.stroke();
}

export function drawSky(ctx: CanvasRenderingContext2D, t: number): void {
  const shift = CLOUD_PARALLAX * CAMERA.at(t);
  ctx.save();
  ctx.strokeStyle = CLOUD_INK;
  ctx.fillStyle = PAPER;
  ctx.lineCap = 'round';
  for (const c of CLOUDS) {
    const x = ((((c.wx * CLOUD_STRIP - shift) % CLOUD_STRIP) + CLOUD_STRIP) % CLOUD_STRIP) - 300;
    for (const cx of [x, x + CLOUD_STRIP]) if (cx - c.w < VIDEO.width && cx + c.w > 0) drawCloud(ctx, cx, c.y, c.w);
  }
  ctx.restore();
}

/** Sunlight slanting down through the water: pale shafts that sway a whole number of times a loop. */
const SHAFTS = [
  { x: 120, w: 70, phase: 0 },
  { x: 380, w: 110, phase: 1.7 },
  { x: 640, w: 60, phase: 3.1 },
  { x: 900, w: 95, phase: 4.4 },
] as const;

export function drawShafts(ctx: CanvasRenderingContext2D, t: number): void {
  ctx.save();
  for (const s of SHAFTS) {
    const sway = 30 * Math.sin((TAU * 2 * t) / LOOP_S + s.phase);
    const top = SURFACE_Y + 6;
    const gradient = ctx.createLinearGradient(0, top, 0, VIDEO.height);
    gradient.addColorStop(0, 'rgba(255,250,235,0.22)');
    gradient.addColorStop(1, 'rgba(255,250,235,0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(s.x + sway, top);
    ctx.lineTo(s.x + sway + s.w, top);
    ctx.lineTo(s.x + sway * 2 + s.w * 1.8 - 260, VIDEO.height);
    ctx.lineTo(s.x + sway * 2 - 260, VIDEO.height);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

/** Speed lines streaming back from a fish in the air, `alpha` 0 .. 1. */
export function drawSpeedLines(ctx: CanvasRenderingContext2D, x: number, y: number, t: number, alpha: number): void {
  if (alpha <= 0) return;
  const cam = CAMERA.at(t);
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.lineCap = 'round';
  ctx.lineWidth = 2.4;
  for (const [dy, len, phase] of [[-110, 90, 0], [-40, 130, 0.35], [30, 110, 0.7], [95, 80, 0.15]] as const) {
    const u = (((cam / 360 + phase) % 1) + 1) % 1;
    const x0 = x - 230 - u * 260;
    ctx.globalAlpha = 0.45 * alpha * Math.sin(Math.PI * u);
    ctx.beginPath();
    ctx.moveTo(x0, y + dy);
    ctx.lineTo(x0 - len, y + dy);
    ctx.stroke();
  }
  ctx.restore();
}

// ---------------------------------------------------------------- splashes

/** Spray thrown up where the surface is broken: launch angle (from straight up), speed (px/s) and size. */
const DROPS = (() => {
  const rng = createRng(47);
  return Array.from({ length: 18 }, (_, k) => ({ angle: ((k + rng()) / 18 - 0.5) * 1.5, speed: 520 + rng() * 520, r: 4 + rng() * 7 }));
})();
const GRAVITY = 2400;
export const SPLASH_S = 1.1;
export const RIPPLE_S = 2.2;

/** A splash at screen x, `since` seconds after the surface broke; a plunge throws its spray up narrow and tall. */
export function drawSplash(ctx: CanvasRenderingContext2D, x: number, since: number, s: Splash): void {
  if (since < 0 || since > SPLASH_S) return;
  const size = s.size;
  const narrow = s.kind === 'plunge' ? 0.45 : 1;
  const fade = 1 - Math.max(0, (since - 0.6) / (SPLASH_S - 0.6));
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.fillStyle = PAPER;
  ctx.lineCap = 'round';
  ctx.globalAlpha = fade;
  // The crown: a sheet of water thrown up either side, rising then collapsing.
  const lift = (s.kind === 'plunge' ? 230 : 150) * size * Math.sin(Math.PI * Math.min(1, since / 0.55));
  ctx.lineWidth = 3;
  for (const side of [-1, 1]) {
    for (const spread of [0.6, 1]) {
      const foot = x + side * 26 * size * spread * narrow;
      ctx.beginPath();
      ctx.moveTo(foot, SURFACE_Y + 4);
      ctx.quadraticCurveTo(foot + side * 30 * size * spread * narrow, SURFACE_Y - lift * 0.7, foot + side * 70 * size * spread * narrow, SURFACE_Y - lift * spread);
      ctx.stroke();
    }
  }
  // Droplets on ballistic arcs, each trailing a short streak while it's fast.
  ctx.lineWidth = 2;
  for (const d of DROPS) {
    const vx = Math.sin(d.angle) * d.speed * size * narrow;
    const vy = -Math.cos(d.angle) * d.speed * size * (s.kind === 'plunge' ? 1.25 : 1);
    const px = x + vx * since;
    const py = SURFACE_Y + vy * since + 0.5 * GRAVITY * since * since;
    if (py > SURFACE_Y + 6) continue;
    const r = d.r * Math.sqrt(size) * (1 - (0.4 * since) / SPLASH_S);
    const vyNow = vy + GRAVITY * since;
    const speed = Math.hypot(vx, vyNow);
    if (speed > 300) {
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px - (vx / speed) * r * 3, py - (vyNow / speed) * r * 3);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

/** Rings spreading across the surface from a splash, flattened by perspective. */
export function drawRipples(ctx: CanvasRenderingContext2D, x: number, since: number, size: number): void {
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.2;
  for (const delay of [0, 0.3, 0.6]) {
    const s = since - delay;
    if (s < 0 || s > RIPPLE_S) continue;
    const rx = (40 + 260 * (s / RIPPLE_S) ** 0.7) * size;
    ctx.globalAlpha = 0.6 * (1 - s / RIPPLE_S);
    ctx.beginPath();
    ctx.ellipse(x, SURFACE_Y + 6, rx, rx * 0.09, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

/** The tail's track on the water: a zigzag through its flicks, fading as they fall behind. */
export function drawZigzag(ctx: CanvasRenderingContext2D, points: readonly { readonly x: number; readonly since: number }[]): void {
  if (points.length < 2) return;
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 4;
  ctx.setLineDash([12, 8]);
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]!;
    const b = points[i]!;
    ctx.globalAlpha = 0.75 * Math.max(0, 1 - a.since / 2.6);
    if (ctx.globalAlpha <= 0) continue;
    ctx.beginPath();
    ctx.moveTo(a.x, SURFACE_Y + (i % 2 ? -26 : 18));
    ctx.lineTo(b.x, SURFACE_Y + (i % 2 ? 18 : -26));
    ctx.stroke();
  }
  ctx.restore();
}

/** A bubble rising: an inked ring with a glint. */
export function drawBubble(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, alpha: number): void {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.8;
  ctx.fillStyle = 'rgba(244,237,220,0.55)';
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x - r * 0.3, y - r * 0.3, r * 0.3, Math.PI, Math.PI * 1.5);
  ctx.stroke();
  ctx.restore();
}
