import { createRng } from '../../../src/logic/rng';
import { clamp01 } from '../short';

/**
 * The inkling's ink cloud, as the game draws it (src/scenes/game/abilityFx.ts,
 * drawInkCloud): seven overlapping sepia-black blots that billow out from
 * the fish over 0.45 s (cubic ease-out), drifting a little up, hang for
 * 0.9-1.5 s, then thin away over 1.8 s. Each blot is a big disc at 0.55
 * alpha with a smaller one at 0.35 over its upper front, the whole blot at
 * 0.95. Here every blot is a pure function of the seconds since the squirt,
 * in world px around the squirt point.
 */

/** The game's ink colour (abilityFx.ts: 0x2a2230, "like the giant squid's ink"). */
export const CLOUD_INK = '#2a2230';

/** How far the cloud reaches, world px (the game's inkRadius, sized to this short's fish). */
export const CLOUD_REACH = 340;
/** Blots start this small (the game's size / 60 for a small inkling). */
const START_SCALE = 0.4;
const BILLOW_S = 0.45;
const FADE_S = 1.8;
const BLOTS = 7;

interface Blot {
  readonly angle: number;
  readonly dist: number;
  readonly radius: number;
  /** When it starts thinning, s after the squirt. */
  readonly delay: number;
  /** For the wobbly, boiling edge. */
  readonly phase: number;
}

const BLOT_LIST: readonly Blot[] = (() => {
  const rng = createRng(4207);
  return Array.from({ length: BLOTS }, () => {
    const angle = rng() * Math.PI * 2;
    const dist = rng() * CLOUD_REACH * 0.45;
    const radius = CLOUD_REACH * (0.28 + rng() * 0.22);
    return { angle, dist, radius, delay: 0.9 + rng() * 0.6, phase: rng() * Math.PI * 2 };
  });
})();

/** Droplets flung out as it billows: direction, how far (world px), size. */
const DROPS = (() => {
  const rng = createRng(911);
  return Array.from({ length: 14 }, () => ({ angle: rng() * Math.PI * 2, reach: CLOUD_REACH * (0.75 + rng() * 0.5), size: 5 + rng() * 9 }));
})();
const DROP_S = 0.55;

/** Gone for good this long after the squirt. */
export const CLOUD_LIFE_S = Math.max(...BLOT_LIST.map((b) => b.delay)) + FADE_S;

export interface BlotState {
  /** Offset from the squirt point, world px. */
  readonly x: number;
  readonly y: number;
  readonly radius: number;
  readonly alpha: number;
  readonly phase: number;
}

const cubicOut = (u: number): number => 1 - (1 - clamp01(u)) ** 3;

/** The blots `since` seconds after the squirt; none before it or once it has thinned away. */
export function cloudBlots(since: number): readonly BlotState[] {
  if (since < 0 || since >= CLOUD_LIFE_S) return [];
  const billow = cubicOut(since / BILLOW_S);
  return BLOT_LIST.map((b) => {
    const from = 0.3 * b.dist;
    const d = from + (b.dist - from) * billow;
    return {
      x: Math.cos(b.angle) * d,
      y: Math.sin(b.angle) * d - 20 * billow,
      radius: b.radius * (START_SCALE + (1 - START_SCALE) * billow),
      alpha: 0.95 * (1 - clamp01((since - b.delay) / FADE_S)),
      phase: b.phase,
    };
  }).filter((b) => b.alpha > 0);
}

/** How thick the ink is at an offset from the squirt point, 0 clear .. 1 black: how well it hides what's behind it. */
export function cloudCover(since: number, x: number, y: number): number {
  let clear = 1;
  for (const b of cloudBlots(since)) {
    if (Math.hypot(x - b.x, y - b.y) < b.radius) clear *= 1 - 0.55 * b.alpha;
    const ix = b.x + 0.3 * b.radius;
    const iy = b.y - 0.2 * b.radius;
    if (Math.hypot(x - ix, y - iy) < 0.7 * b.radius) clear *= 1 - 0.35 * b.alpha;
  }
  return 1 - clear;
}

/** A blot's outline: a disc whose edge wobbles a little and boils with the line-boil frame, like an inked shape. */
function blotPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, phase: number, boil: number): void {
  const steps = 40;
  ctx.beginPath();
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    const wob = 1 + 0.045 * Math.sin(3 * a + phase + boil * 1.7) + 0.03 * Math.sin(5 * a - phase + boil * 2.3) + 0.02 * Math.sin(9 * a + boil);
    const x = cx + Math.cos(a) * r * wob;
    const y = cy + Math.sin(a) * r * wob;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

/**
 * Draws the cloud with its squirt point at screen (x, y), `zoom` screen px per
 * world px. Each blot is drawn on its own (as the game draws each blot as its
 * own object), its two discs blending, then a faint inked rim.
 */
export function drawInkCloud(
  ctx: CanvasRenderingContext2D, layer: CanvasRenderingContext2D, x: number, y: number, zoom: number, since: number, boil: number,
): void {
  const blots = cloudBlots(since);
  if (blots.length === 0) return;
  drawDrops(ctx, x, y, zoom, since);
  for (const b of blots) {
    const cx = x + b.x * zoom;
    const cy = y + b.y * zoom;
    const r = b.radius * zoom;
    ctx.save();
    ctx.fillStyle = CLOUD_INK;
    ctx.globalAlpha = b.alpha * 0.55;
    blotPath(ctx, cx, cy, r, b.phase, boil);
    ctx.fill();
    ctx.globalAlpha = b.alpha * 0.35;
    blotPath(ctx, cx + r * 0.3, cy - r * 0.2, r * 0.7, b.phase + 1.3, boil);
    ctx.fill();
    ctx.restore();
  }
  // A faint pen rim round the cloud's outer edge: on a scratch layer, every blot's rim, then the blots punched out of it, so only the outline stays.
  const { width, height } = layer.canvas;
  layer.save();
  layer.setTransform(1, 0, 0, 1, 0, 0);
  layer.clearRect(0, 0, width, height);
  layer.strokeStyle = CLOUD_INK;
  layer.lineWidth = 3;
  for (const b of blots) {
    layer.globalAlpha = b.alpha;
    blotPath(layer, x + b.x * zoom, y + b.y * zoom, b.radius * zoom, b.phase, boil);
    layer.stroke();
  }
  layer.globalCompositeOperation = 'destination-out';
  layer.globalAlpha = 1;
  for (const b of blots) {
    blotPath(layer, x + b.x * zoom, y + b.y * zoom, b.radius * zoom - 1.5, b.phase, boil);
    layer.fill();
  }
  layer.restore();
  ctx.save();
  ctx.globalAlpha = 0.5;
  ctx.drawImage(layer.canvas, 0, 0);
  ctx.restore();
}

/** The squirt's droplets: flung out past the billow, shrinking and fading as they go. */
function drawDrops(ctx: CanvasRenderingContext2D, x: number, y: number, zoom: number, since: number): void {
  const u = since / DROP_S;
  if (u <= 0 || u >= 1) return;
  const out = cubicOut(u);
  ctx.save();
  ctx.fillStyle = CLOUD_INK;
  ctx.globalAlpha = 0.85 * (1 - u);
  for (const d of DROPS) {
    const r = d.reach * (0.35 + 0.65 * out) * zoom;
    ctx.beginPath();
    ctx.arc(x + Math.cos(d.angle) * r, y + Math.sin(d.angle) * r + 30 * u * u * zoom, d.size * zoom * (1 - 0.6 * u), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
