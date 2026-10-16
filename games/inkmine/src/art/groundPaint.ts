import { hash } from '../logic/noise';
import { createRng } from '../logic/rng';
import { INK, PAPER } from './palette';

/**
 * The painter's passes over the ground (ground.ts draws the shapes): a
 * watercolour wash for each grade that varies like real pigment, light
 * from above (a lit lip on every top face, a hatched core shadow under every
 * overhang, a cast shadow on the back wall under every ceiling), and the
 * ground deepening in tone the further down it goes. Everything is
 * seeded by world position or tiles seamlessly, so chunks join and a dig
 * only changes the strokes next to it.
 */

/** A wash tile's size in world px: a whole number of them goes round any world (a multiple of 16 tiles of 32 px). */
export const WASH_PX = 256;

/** Smooth noise in 0..1 that repeats every `period` lattice cells both ways. */
function tiled(x: number, y: number, cells: number, salt: number): number {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const ax = ((x0 % cells) + cells) % cells;
  const ay = ((y0 % cells) + cells) % cells;
  const bx = (ax + 1) % cells;
  const by = (ay + 1) % cells;
  const fx = x - x0;
  const fy = y - y0;
  const tx = fx * fx * (3 - 2 * fx);
  const ty = fy * fy * (3 - 2 * fy);
  const h00 = hash(ax, ay, salt);
  const h10 = hash(bx, ay, salt);
  const h01 = hash(ax, by, salt);
  const h11 = hash(bx, by, salt);
  const top = h00 + (h10 - h00) * tx;
  const bottom = h01 + (h11 - h01) * tx;
  return top + (bottom - top) * ty;
}

function hexRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/**
 * A seamless tile of watercolour wash in `color` (made once, then kept): pigment pooled unevenly
 * (two scales of soft variation, a warm/cool drift), granulation specks
 * settled into the paper's tooth, and a few pale blooms where the water
 * pushed pigment aside.
 */
const washes = new Map<string, HTMLCanvasElement>();

export function washTile(res: number, color: string, seed: number, strength = 1): HTMLCanvasElement {
  const key = `${res}|${color}|${seed}|${strength}`;
  const made = washes.get(key);
  if (made) return made;
  const canvas = paintWash(res, color, seed, strength);
  washes.set(key, canvas);
  return canvas;
}

function paintWash(res: number, color: string, seed: number, strength: number): HTMLCanvasElement {
  const size = WASH_PX * res;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas is not available');
  // The pigment's variation is smooth, so it's worked out at a quarter of the texels and scaled up.
  const low = Math.max(16, size / 2);
  const noise = document.createElement('canvas');
  noise.width = low;
  noise.height = low;
  const nctx = noise.getContext('2d');
  if (!nctx) throw new Error('2D canvas is not available');
  const img = nctx.createImageData(low, low);
  const [r, g, b] = hexRgb(color);
  for (let y = 0; y < low; y++) {
    for (let x = 0; x < low; x++) {
      const u = x / low;
      const v = y / low;
      const broad = tiled(u * 4, v * 4, 4, seed) - 0.5;
      const fine = tiled(u * 12, v * 12, 12, seed + 1) - 0.5;
      const drift = tiled(u * 3, v * 3, 3, seed + 2) - 0.5;
      const k = 1 + (broad * 0.16 + fine * 0.07) * strength;
      const i = (y * low + x) * 4;
      img.data[i] = Math.max(0, Math.min(255, r * k + drift * 10 * strength));
      img.data[i + 1] = Math.max(0, Math.min(255, g * k));
      img.data[i + 2] = Math.max(0, Math.min(255, b * k - drift * 10 * strength));
      img.data[i + 3] = 255;
    }
  }
  nctx.putImageData(img, 0, 0);
  ctx.imageSmoothingEnabled = true;
  // Drawn three times across each edge, so smoothing doesn't soften the join.
  for (const ox of [-size, 0, size]) for (const oy of [-size, 0, size]) ctx.drawImage(noise, ox, oy, size, size);
  ctx.scale(res, res);
  const rng = createRng(seed + 9);
  // Blooms: pale soft-edged rings where the wash backed up.
  for (let k = 0; k < 5; k++) {
    const cx = rng() * WASH_PX;
    const cy = rng() * WASH_PX;
    const rad = 14 + rng() * 26;
    for (const ox of [-WASH_PX, 0, WASH_PX]) {
      for (const oy of [-WASH_PX, 0, WASH_PX]) {
        const grd = ctx.createRadialGradient(cx + ox, cy + oy, rad * 0.6, cx + ox, cy + oy, rad);
        grd.addColorStop(0, 'rgba(255,250,235,0.07)');
        grd.addColorStop(0.8, 'rgba(255,250,235,0.03)');
        grd.addColorStop(0.93, 'rgba(40,30,50,0.035)');
        grd.addColorStop(1, 'rgba(40,30,50,0)');
        ctx.fillStyle = grd;
        ctx.fillRect(cx + ox - rad, cy + oy - rad, rad * 2, rad * 2);
      }
    }
  }
  // Granulation: pigment specks, darker and lighter.
  for (let k = 0; k < 2600 * strength; k++) {
    const x = rng() * WASH_PX;
    const y = rng() * WASH_PX;
    ctx.globalAlpha = 0.08 + rng() * 0.14;
    ctx.fillStyle = rng() < 0.7 ? '#2a2633' : '#fff8e8';
    const s = 0.5 + rng() * 0.7;
    // A speck over an edge shows on the other side too.
    for (const ox of x > WASH_PX - 2 ? [0, -WASH_PX] : [0]) for (const oy of y > WASH_PX - 2 ? [0, -WASH_PX] : [0]) ctx.fillRect(x + ox, y + oy, s, s);
  }
  ctx.globalAlpha = 1;
  return canvas;
}

/** Which way a dug face looks: up at the sky (lit), down from a ceiling (in shadow), or sideways. */
export type Facing = 'up' | 'down' | 'side';

/** An outline segment of the ground, in world px, and which way its open side faces. */
export interface Face {
  readonly x0: number;
  readonly y0: number;
  readonly x1: number;
  readonly y1: number;
  readonly facing: Facing;
}

/** Sorts outline segments by facing: which side of each is open is found by sampling `solid` either side of its middle. */
export function facesOf(segs: readonly [number, number, number, number][], solid: (wx: number, wy: number) => boolean, T: number): Face[] {
  return segs.map(([x0, y0, x1, y1]) => {
    const len = Math.hypot(x1 - x0, y1 - y0) || 1;
    const nx = -(y1 - y0) / len;
    const ny = (x1 - x0) / len;
    const mx = (x0 + x1) / 2;
    const my = (y0 + y1) / 2;
    // Far enough to land in the next tile even across a diagonal (whose middle sits a quarter tile from both tile centres).
    const d = T * 0.6;
    // The open side's normal.
    const open = solid(mx + nx * d, my + ny * d) ? { x: -nx, y: -ny } : { x: nx, y: ny };
    const facing: Facing = open.y < -0.5 ? 'up' : open.y > 0.5 ? 'down' : 'side';
    return { x0, y0, x1, y1, facing };
  });
}

/** Whether this browser blurs on a canvas (Safari before 18 doesn't). */
let canBlur: boolean | null = null;

function blurs(ctx: CanvasRenderingContext2D): boolean {
  if (canBlur === null) {
    ctx.filter = 'blur(2px)';
    canBlur = ctx.filter === 'blur(2px)';
    ctx.filter = 'none';
  }
  return canBlur;
}

/**
 * Strokes the faces chosen by `which`. A wash's edge is soft: blurred where
 * the canvas can, otherwise feathered with a few wider, fainter strokes.
 * Hatching stays crisp.
 */
function strokeFaces(ctx: CanvasRenderingContext2D, faces: readonly Face[], which: (f: Face) => boolean, width: number, style: string | CanvasPattern, alpha: number): void {
  if (typeof style !== 'string') {
    strokeOnce(ctx, faces, which, width, style, alpha);
    return;
  }
  if (blurs(ctx)) {
    ctx.filter = `blur(${Math.max(1, width * 0.18)}px)`;
    strokeOnce(ctx, faces, which, width, style, alpha);
    ctx.filter = 'none';
    return;
  }
  for (const [k, a] of [[1.35, 0.3], [1, 0.4], [0.65, 0.45]] as const) strokeOnce(ctx, faces, which, width * k, style, alpha * a);
}

function strokeOnce(ctx: CanvasRenderingContext2D, faces: readonly Face[], which: (f: Face) => boolean, width: number, style: string | CanvasPattern, alpha: number): void {
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = style;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (const f of faces) {
    if (!which(f)) continue;
    ctx.moveTo(f.x0, f.y0);
    ctx.lineTo(f.x1, f.y1);
  }
  ctx.stroke();
  ctx.globalAlpha = 1;
}

/**
 * Light on the rock (call clipped to the ground): every face open to the
 * sky catches light on its lip; every ceiling's underside sits in core
 * shadow, washed dark and hatched; walls get a softer shade.
 */
export function lightRock(ctx: CanvasRenderingContext2D, faces: readonly Face[], T: number, shade: string, hatch: CanvasPattern): void {
  strokeFaces(ctx, faces, (f) => f.facing === 'up', T * 0.32, PAPER, 0.32);
  strokeFaces(ctx, faces, (f) => f.facing === 'up', T * 0.12, '#fffdf4', 0.4);
  strokeFaces(ctx, faces, (f) => f.facing === 'down', T * 1.1, shade, 0.16);
  strokeFaces(ctx, faces, (f) => f.facing === 'down', T * 0.6, shade, 0.2);
  strokeFaces(ctx, faces, (f) => f.facing === 'down', T * 0.9, hatch, 0.9);
  strokeFaces(ctx, faces, (f) => f.facing === 'side', T * 0.7, shade, 0.1);
  strokeFaces(ctx, faces, (f) => f.facing === 'side', T * 0.5, hatch, 0.45);
}

/**
 * Light in the hollows (call clipped to them): the back wall darkens under
 * every ceiling, where the rock above casts its shadow, and catches a little
 * light off every floor.
 */
export function lightHollows(ctx: CanvasRenderingContext2D, faces: readonly Face[], T: number, shade: string): void {
  strokeFaces(ctx, faces, (f) => f.facing === 'down', T * 2.2, shade, 0.1);
  strokeFaces(ctx, faces, (f) => f.facing === 'down', T * 1.2, shade, 0.14);
  strokeFaces(ctx, faces, (f) => f.facing === 'down', T * 0.5, shade, 0.16);
  strokeFaces(ctx, faces, (f) => f.facing === 'side', T * 0.6, shade, 0.08);
  strokeFaces(ctx, faces, (f) => f.facing === 'up', T * 0.5, '#fffaf0', 0.3);
}

/**
 * The ground's tone with depth (call clipped to it): the first metres under
 * the surface are sunlit and warm, the deep is cooler and darker. `surface`
 * and `bottom` are world px.
 */
export function depthTone(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, surface: number, bottom: number): void {
  const g = ctx.createLinearGradient(0, surface, 0, bottom);
  g.addColorStop(0, 'rgba(255, 238, 200, 0.16)');
  g.addColorStop(0.06, 'rgba(255, 238, 200, 0.05)');
  g.addColorStop(0.2, 'rgba(255, 244, 214, 0)');
  g.addColorStop(0.5, 'rgba(30, 32, 60, 0.12)');
  g.addColorStop(1, 'rgba(18, 18, 40, 0.38)');
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
}

/** A stone set in the rock, washed and lit from above: shadow on its lower side, a glint on its top. */
export function pebble(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, a: number, wash: string): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(a);
  ctx.beginPath();
  ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = wash;
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = '#1c1a26';
  ctx.beginPath();
  ctx.ellipse(rx * 0.2, ry * 0.45, rx, ry * 0.7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.beginPath();
  ctx.ellipse(0, 0, rx, ry, 0, 0.1 * Math.PI, 0.95 * Math.PI);
  ctx.globalAlpha = 0.8;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.7;
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(-rx * 0.25, -ry * 0.35, rx * 0.35, ry * 0.18, 0, 0, Math.PI * 2);
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = '#fffaf0';
  ctx.fill();
  ctx.restore();
  ctx.globalAlpha = 1;
}
