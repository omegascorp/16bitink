import { createRng } from '../../../src/logic/rng';
import { glaze } from '../../../src/art/snakes/cornPaint';
import { makeCanvas, Pen } from '../../../src/art/pen';
import { mix, rgba } from '../../../src/art/wash';

/**
 * A Florida swamp in warm late light, painted once per framing: a hazy
 * gold sky, the bald cypress line with Spanish moss hanging from it, still
 * dark water with the glow lying on it and cypress knees poking up, then a
 * bank of sawgrass and wet grass. `horizon` is where the far trees stand on
 * the water, `bank` where the near bank begins.
 */
export interface SwampFrame {
  readonly width: number;
  readonly height: number;
  readonly horizon: number;
  readonly bank: number;
  /** Where the low sun glows, as a share of the width. */
  readonly sun?: number;
  /** 0 the warm late light .. 1 a deeper evening. */
  readonly dusk?: number;
}

const C = {
  skyTop: '#56676a', skyMid: '#d8a764', skyLow: '#f6d698', far: '#7d8a76', near: '#3e4a38', trunk: '#4a4234', moss: '#9aa088',
  water: '#22302c', waterLit: '#d9a466', knee: '#6a5a44', grass: ['#a29a4e', '#8a8a42', '#c4ae66', '#6e7a3a', '#b8a250'], ground: '#5a5832', groundDeep: '#262414', line: '#141a12',
} as const;

/** A cypress: a flared trunk, a few crooked limbs, flat feathery crowns and moss strands. */
function cypress(pen: Pen, x: number, base: number, h: number, tone: string, moss: string, alpha: number, seed: number): void {
  const { ctx } = pen;
  const rng = createRng(seed);
  const w = h * 0.045;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = tone;
  ctx.beginPath();
  ctx.moveTo(x - w * 2.6, base);
  ctx.quadraticCurveTo(x - w * 0.9, base - h * 0.12, x - w * 0.6, base - h * 0.35);
  ctx.lineTo(x - w * 0.35, base - h);
  ctx.lineTo(x + w * 0.35, base - h);
  ctx.lineTo(x + w * 0.6, base - h * 0.35);
  ctx.quadraticCurveTo(x + w * 0.9, base - h * 0.12, x + w * 2.6, base);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = tone;
  ctx.lineCap = 'round';
  for (let i = 0; i < 6; i++) {
    const y = base - h * (0.45 + i * 0.09);
    const side = i % 2 === 0 ? 1 : -1;
    const len = h * (0.12 + rng() * 0.1);
    ctx.lineWidth = w * 0.4;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + side * len * 0.5, y - len * 0.3, x + side * len, y - len * 0.15);
    ctx.stroke();
    // A flat, feathery crown pad at the limb's end.
    for (let k = 0; k < 9; k++) {
      const cx = x + side * len * (0.5 + rng() * 0.7);
      const cy = y - len * 0.2 + (rng() - 0.5) * h * 0.04;
      ctx.beginPath();
      ctx.ellipse(cx, cy, h * (0.04 + rng() * 0.05), h * 0.018, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // Spanish moss hanging from it.
    ctx.strokeStyle = moss;
    for (let k = 0; k < 4; k++) {
      const mx = x + side * len * (0.3 + rng() * 0.6);
      const my = y - len * 0.1;
      ctx.lineWidth = 1 + rng() * 2;
      ctx.beginPath();
      ctx.moveTo(mx, my);
      ctx.quadraticCurveTo(mx + (rng() - 0.5) * 8, my + h * 0.05, mx + (rng() - 0.5) * 6, my + h * (0.06 + rng() * 0.08));
      ctx.stroke();
    }
    ctx.strokeStyle = tone;
  }
  ctx.restore();
  pen.hair([{ x: x - w * 0.5, y: base - h * 0.9 }, { x: x - w * 0.6, y: base - h * 0.3 }], 1, rgba('#f2cf92', 0.6), 0.25 * alpha);
}

/** One sawgrass blade: a long tapered curve, lit along one edge. */
export function blade(ctx: CanvasRenderingContext2D, x: number, y: number, h: number, lean: number, w: number, colour: string, lit = 0.25): void {
  const tipX = x + lean * h;
  const tipY = y - h;
  ctx.fillStyle = colour;
  ctx.beginPath();
  ctx.moveTo(x - w, y);
  ctx.quadraticCurveTo(x + lean * h * 0.3 - w * 0.6, y - h * 0.6, tipX, tipY);
  ctx.quadraticCurveTo(x + lean * h * 0.3 + w * 0.6, y - h * 0.6, x + w, y);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = rgba('#fff0c0', lit);
  ctx.lineWidth = Math.max(0.6, w * 0.35);
  ctx.beginPath();
  ctx.moveTo(x - w * 0.4, y);
  ctx.quadraticCurveTo(x + lean * h * 0.3 - w * 0.3, y - h * 0.6, tipX, tipY);
  ctx.stroke();
  ctx.strokeStyle = rgba(C.line, 0.35);
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(x + w, y);
  ctx.quadraticCurveTo(x + lean * h * 0.3 + w * 0.6, y - h * 0.6, tipX, tipY);
  ctx.stroke();
}

/** A clump of sawgrass rooted along y, `h` tall. */
export function sawgrass(ctx: CanvasRenderingContext2D, x: number, y: number, h: number, spread: number, n: number, seed: number, dark = 0): void {
  const rng = createRng(seed);
  for (let i = 0; i < n; i++) {
    const bx = x + (rng() - 0.5) * spread;
    const tone = mix(C.grass[Math.floor(rng() * C.grass.length)]!, '#1c2410', dark * (0.5 + rng() * 0.5));
    blade(ctx, bx, y + rng() * 10, h * (0.55 + rng() * 0.6), (bx - x) / spread * 0.7 + (rng() - 0.5) * 0.4, 2.4 + rng() * 3.2, tone, 0.25 * (1 - dark));
  }
}

/** Paints the swamp once for one framing. */
export function paintSwamp(f: SwampFrame, seed: number): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(f.width, f.height);
  const pen = new Pen(ctx, seed, 0.8);
  const rng = createRng(seed + 1);
  const dusk = f.dusk ?? 0;
  const sunX = f.width * (f.sun ?? 0.7);
  const sky = ctx.createLinearGradient(0, 0, 0, f.horizon);
  sky.addColorStop(0, mix(C.skyTop, '#1c2430', dusk));
  sky.addColorStop(0.55, mix(C.skyMid, '#a0644a', dusk));
  sky.addColorStop(1, mix(C.skyLow, '#e09a60', dusk));
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, f.width, f.horizon + 4);
  glaze(ctx, sunX, f.horizon - 80, 420, 260, 0, '#fff0c4', 0.55);
  // Soft cloud bands.
  for (let i = 0; i < 5; i++) glaze(ctx, rng() * f.width, f.horizon * (0.2 + rng() * 0.5), 260 + rng() * 200, 22 + rng() * 20, 0, '#f6d8a8', 0.18);
  // The far tree line, hazy; then the nearer cypresses.
  for (let i = 0; i < 18; i++) cypress(pen, rng() * f.width, f.horizon + 6, 220 + rng() * 180, mix(C.far, C.skyLow, 0.25), mix(C.moss, C.skyLow, 0.3), 0.55, seed + 10 + i);
  ctx.fillStyle = rgba(mix(C.far, C.skyLow, 0.2), 0.85);
  ctx.fillRect(0, f.horizon - 30, f.width, 36);
  for (let i = 0; i < 7; i++) cypress(pen, (i + 0.2 + rng() * 0.6) * (f.width / 7), f.horizon + 14, 380 + rng() * 240, mix(mix(C.near, C.skyMid, 0.18), '#101810', dusk * 0.5), C.moss, 0.82, seed + 40 + i);
  // The still water, the glow lying on it, ripple lines and reflections.
  const water = ctx.createLinearGradient(0, f.horizon, 0, f.bank);
  water.addColorStop(0, mix(C.water, C.waterLit, 0.35));
  water.addColorStop(1, C.water);
  ctx.fillStyle = water;
  ctx.fillRect(0, f.horizon, f.width, f.bank - f.horizon + 4);
  glaze(ctx, sunX, f.horizon + (f.bank - f.horizon) * 0.35, 260, (f.bank - f.horizon) * 0.4, 0, C.waterLit, 0.45);
  ctx.strokeStyle = rgba('#f2cf92', 0.18);
  ctx.lineWidth = 2;
  for (let i = 0; i < 40; i++) {
    const y = f.horizon + rng() * (f.bank - f.horizon);
    const x = rng() * f.width;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 40 + rng() * 120, y);
    ctx.stroke();
  }
  // Cypress knees poking out of the water near the bank.
  for (let i = 0; i < 9; i++) {
    const x = rng() * f.width;
    const y = f.horizon + (0.45 + rng() * 0.5) * (f.bank - f.horizon);
    const h = 20 + rng() * 34;
    const w = h * 0.45;
    pen.fill([{ x: x - w, y }, { x: x - w * 0.2, y: y - h }, { x: x + w * 0.3, y: y - h * 0.9 }, { x: x + w, y }], C.knee, 0.95);
    pen.hair([{ x: x - w * 0.6, y: y - 2 }, { x: x - w * 0.15, y: y - h * 0.9 }], 1.4, '#c8b088', 0.5);
    pen.stroke([{ x: x - w, y }, { x: x - w * 0.2, y: y - h }, { x: x + w * 0.3, y: y - h * 0.9 }, { x: x + w, y }], 1.6, C.line, 0.7, false);
    ctx.fillStyle = rgba(C.knee, 0.3);
    ctx.fillRect(x - w, y + 2, w * 2, h * 0.4);
  }
  // Sawgrass along the far edge of the bank.
  for (let x = -40; x < f.width + 40; x += 46) sawgrass(ctx, x, f.bank + 8, 120 + rng() * 80, 60, 9, seed + 100 + x, 0.25);
  // The bank: wet grass over mud, darker towards us.
  const ground = ctx.createLinearGradient(0, f.bank, 0, f.height);
  ground.addColorStop(0, mix(C.ground, '#8a7a40', 0.3));
  ground.addColorStop(0.4, C.ground);
  ground.addColorStop(1, C.groundDeep);
  ctx.fillStyle = ground;
  ctx.fillRect(0, f.bank, f.width, f.height - f.bank);
  for (let i = 0; i < 900; i++) {
    const y = f.bank + 10 + rng() ** 0.8 * (f.height - f.bank);
    const x = rng() * f.width;
    const k = (y - f.bank) / (f.height - f.bank);
    blade(ctx, x, y, 14 + k * 40 + rng() * 20, (rng() - 0.5) * 0.8, 1 + k * 2, mix(C.grass[i % C.grass.length]!, '#1c2410', 0.3 + k * 0.4), 0.15);
  }
  glaze(ctx, sunX, f.bank + 40, 400, 60, 0, '#f6d8a0', 0.18);
  return canvas;
}
