import { INK, PAPER } from '../../../src/art/pen';
import { createRng } from '../../../src/logic/rng';
import { VIDEO } from '../short';
import { LOOP_S, SURFACE_Y, type FeatherPose } from './story';

/**
 * The sea's surface seen side-on, in pen: a sandy islet with palms, the
 * rolling waterline, the water's wash below it, and the splashes, ripples
 * and feathers of the snatch.
 */

/** The waterline's height at x: a gentle roll, three times round per loop. */
export function waterlineAt(x: number, t: number): number {
  const roll = (2 * Math.PI * t * 3) / LOOP_S;
  return SURFACE_Y + 7 * Math.sin(x * 0.022 + roll) + 3 * Math.sin(x * 0.051 - roll * 2);
}

/** The islet on the left, drawn once onto the sky: a low sandbank with two leaning palms. */
export function drawIslet(ctx: CanvasRenderingContext2D): void {
  const rng = createRng(12);
  const bank = (x: number): number => SURFACE_Y + 6 - 58 * Math.max(0, 1 - ((x - 100) / 170) ** 2);
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  for (let x = -70; x <= 270; x += 6) {
    if (x === -70) ctx.moveTo(x, bank(x));
    else ctx.lineTo(x, bank(x));
  }
  ctx.fillStyle = 'rgba(214,190,140,0.45)';
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.stroke();
  // Sand stipple.
  ctx.fillStyle = INK;
  ctx.globalAlpha = 0.35;
  for (let k = 0; k < 40; k++) {
    const x = -50 + rng() * 300;
    const y = bank(x) + 6 + rng() * (SURFACE_Y - bank(x) - 4);
    ctx.beginPath();
    ctx.arc(x, y, 1.3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  for (const palm of [{ x: 60, h: 190, lean: -0.22 }, { x: 150, h: 150, lean: 0.3 }]) drawPalm(ctx, palm.x, bank(palm.x) + 4, palm.h, palm.lean);
  ctx.restore();
}

function drawPalm(ctx: CanvasRenderingContext2D, x: number, y: number, h: number, lean: number): void {
  const top = { x: x + Math.sin(lean) * h, y: y - Math.cos(lean) * h };
  // A curved trunk with ring marks.
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + lean * h * 0.15, y - h * 0.55, top.x, top.y);
  ctx.stroke();
  ctx.lineWidth = 1.6;
  for (let k = 1; k < 8; k++) {
    const u = k / 8;
    const cx = (1 - u) ** 2 * x + 2 * u * (1 - u) * (x + lean * h * 0.15) + u * u * top.x;
    const cy = (1 - u) ** 2 * y + 2 * u * (1 - u) * (y - h * 0.55) + u * u * top.y;
    ctx.beginPath();
    ctx.moveTo(cx - 5, cy + 1);
    ctx.lineTo(cx + 5, cy - 1);
    ctx.stroke();
  }
  // Fronds: drooping arcs with little leaflet ticks.
  ctx.lineWidth = 2.6;
  for (const a of [-2.6, -1.9, -1.2, -0.5, 0.2, 0.75]) {
    const len = 70 + 18 * Math.cos(a * 3);
    const tip = { x: top.x + Math.cos(a) * len, y: top.y + Math.sin(a) * len * 0.55 + 30 };
    const bend = { x: top.x + Math.cos(a) * len * 0.55, y: top.y + Math.sin(a) * len * 0.55 - 18 };
    ctx.beginPath();
    ctx.moveTo(top.x, top.y);
    ctx.quadraticCurveTo(bend.x, bend.y, tip.x, tip.y);
    ctx.stroke();
    ctx.save();
    ctx.lineWidth = 1.3;
    for (let k = 2; k < 8; k++) {
      const u = k / 8;
      const px = (1 - u) ** 2 * top.x + 2 * u * (1 - u) * bend.x + u * u * tip.x;
      const py = (1 - u) ** 2 * top.y + 2 * u * (1 - u) * bend.y + u * u * tip.y;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px + Math.cos(a) * 6, py + 12 * (1 - u * 0.4));
      ctx.stroke();
    }
    ctx.restore();
  }
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
  wash.addColorStop(0, 'rgba(60,110,160,0.16)');
  wash.addColorStop(1, 'rgba(22,44,86,0.45)');
  ctx.fillStyle = wash;
  ctx.fill();
  ctx.restore();
}

const WAVELETS = [[330, 46], [520, 78], [760, 40], [960, 72], [120, 96]] as const;

/** The waterline in ink, with a few "~" wavelets on the water below it. */
export function drawWaterline(ctx: CanvasRenderingContext2D, t: number): void {
  const roll = (2 * Math.PI * t * 3) / LOOP_S;
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
  ctx.globalAlpha = 0.5;
  for (const [wx, dy] of WAVELETS) {
    ctx.beginPath();
    for (let k = 0; k <= 6; k++) {
      const px = wx - 30 + k * 10;
      const py = SURFACE_Y + dy + Math.sin(k * 1.4 + roll) * 4;
      if (k === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }
  ctx.restore();
}

/** Spray thrown up where the fish breaks the surface: launch angle (from straight up), speed (px/s) and size. */
const DROPS = (() => {
  const rng = createRng(47);
  return Array.from({ length: 18 }, (_, k) => ({ angle: ((k + rng()) / 18 - 0.5) * 1.5, speed: 520 + rng() * 520, r: 4 + rng() * 7 }));
})();
const GRAVITY = 2400;
const SPLASH_S = 1.1;

/** A splash at x, `since` seconds after the fish broke the surface; `size` scales it. */
export function drawSplash(ctx: CanvasRenderingContext2D, x: number, since: number, size: number): void {
  if (since < 0 || since > SPLASH_S) return;
  const fade = 1 - Math.max(0, (since - 0.6) / (SPLASH_S - 0.6));
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.fillStyle = PAPER;
  ctx.lineCap = 'round';
  ctx.globalAlpha = fade;
  // The crown: a sheet of water thrown up either side, rising then collapsing.
  const lift = 150 * size * Math.sin(Math.PI * Math.min(1, since / 0.55));
  ctx.lineWidth = 3;
  for (const side of [-1, 1]) {
    for (const spread of [0.6, 1]) {
      const foot = x + side * 26 * size * spread;
      ctx.beginPath();
      ctx.moveTo(foot, SURFACE_Y + 4);
      ctx.quadraticCurveTo(foot + side * 30 * size * spread, SURFACE_Y - lift * 0.7, foot + side * 70 * size * spread, SURFACE_Y - lift * spread);
      ctx.stroke();
    }
  }
  // Droplets on ballistic arcs, each trailing a short streak while it's fast.
  ctx.lineWidth = 2;
  for (const d of DROPS) {
    const vx = Math.sin(d.angle) * d.speed * size;
    const vy = -Math.cos(d.angle) * d.speed * size;
    const px = x + vx * since;
    const py = SURFACE_Y + vy * since + 0.5 * GRAVITY * since * since;
    if (py > SURFACE_Y + 6) continue;
    const r = d.r * size * (1 - 0.4 * since / SPLASH_S);
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
    if (s < 0 || s > 2.2) continue;
    const rx = (40 + 260 * (s / 2.2) ** 0.7) * size;
    ctx.globalAlpha = 0.6 * (1 - s / 2.2);
    ctx.beginPath();
    ctx.ellipse(x, SURFACE_Y + 6, rx, rx * 0.09, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

/** A small tern feather in pen: a curved quill with a soft vane either side. */
export function drawFeather(ctx: CanvasRenderingContext2D, f: FeatherPose): void {
  const len = 80 * f.size;
  ctx.save();
  ctx.translate(f.x, f.y);
  ctx.rotate(f.rotation);
  ctx.globalAlpha = f.alpha;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(-len / 2, 0);
  ctx.quadraticCurveTo(-len * 0.1, -len * 0.26, len / 2, -len * 0.04);
  ctx.quadraticCurveTo(-len * 0.05, len * 0.2, -len * 0.35, len * 0.02);
  ctx.closePath();
  ctx.fillStyle = '#e4e7ec';
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.6;
  ctx.stroke();
  // The quill, and a couple of nicks in the vane.
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(-len * 0.62, len * 0.03);
  ctx.quadraticCurveTo(-len * 0.05, -len * 0.08, len / 2, -len * 0.04);
  ctx.stroke();
  ctx.lineWidth = 1.1;
  for (const u of [-0.1, 0.18]) {
    ctx.beginPath();
    ctx.moveTo(len * u, -len * 0.05);
    ctx.lineTo(len * (u + 0.06), -len * 0.17);
    ctx.stroke();
  }
  ctx.restore();
}
