import { hash } from '../logic/noise';
import { contentAt, tileAt, TILE, wrapX, type Terrain } from '../logic/terrain';
import { INK, PAPER, type GroundStyle } from './palette';

/**
 * The ground's set dressing (ground.ts draws the ground itself), all seeded
 * by world position so chunks agree and a dig only changes what it touches:
 * - strata: soft bands of lighter and darker rock running across the
 *   planet, so the ground has layers rather than one flat tone;
 * - cobbles: stones set in the soil and stone, painted faintly with their
 *   own light and shadow (never so firm they read as rock you can't drill),
 *   cut through when you dig;
 * - surface rocks: stones half sunk in the dust along the moon's open
 *   surface, each with its shadow thrown to the lower right.
 * Plain canvas paths (not the Pen): a chunk holds many of them.
 */

/** The world's width in px, which the strata repeat in so they join round a wrapping world. */
function worldW(t: Terrain, T: number): number {
  return t.width * T;
}

/** A band boundary's height at x: a long swell plus a shorter ripple, whole cycles round the world. */
function bandY(t: Terrain, T: number, k: number, x: number, spacing: number): number {
  const w = worldW(t, T);
  const a = (Math.PI * 2 * x) / w;
  const n1 = 3 + Math.floor(hash(k, 1, 700) * 4);
  const n2 = 11 + Math.floor(hash(k, 2, 700) * 9);
  return k * spacing + Math.sin(a * n1 + hash(k, 3, 700) * 6.28) * spacing * 0.35 + Math.sin(a * n2 + hash(k, 4, 700) * 6.28) * spacing * 0.08;
}

/** Strata across the ground (call clipped to it): alternate bands a shade lighter or darker, soft-edged. */
export function strata(ctx: CanvasRenderingContext2D, t: Terrain, x0: number, x1: number, y0: number, y1: number, T: number): void {
  const spacing = T * 2.6;
  const k0 = Math.floor(y0 / spacing) - 2;
  const k1 = Math.ceil(y1 / spacing) + 2;
  const step = T / 2;
  for (let k = k0; k < k1; k++) {
    const dark = hash(k, 5, 700) < 0.5;
    const alpha = 0.035 + hash(k, 6, 700) * 0.06;
    ctx.beginPath();
    for (let x = x0 - step; x <= x1 + step; x += step) ctx.lineTo(x, bandY(t, T, k, x, spacing));
    for (let x = x1 + step; x >= x0 - step; x -= step) ctx.lineTo(x, bandY(t, T, k + 1, x, spacing) - spacing * 0.25);
    ctx.closePath();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = dark ? '#2b2836' : '#fff6e2';
    ctx.fill();
    // A fine line where the band begins, here and there, as bedding planes show in a cut.
    if (hash(k, 7, 700) < 0.55) {
      ctx.globalAlpha = 0.14;
      ctx.strokeStyle = INK;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      for (let x = x0 - step; x <= x1 + step; x += step) {
        const y = bandY(t, T, k, x, spacing);
        // Broken: the line comes and goes along its length.
        if (hash(Math.floor(wrapX(t, Math.floor(x / T)) / 4), k, 710) < 0.5) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
}

/** An irregular stone outline round (0, 0): `n` points jittered by `seed`, flattened a little. */
function stoneShape(rx: number, ry: number, seed: number, n = 9): [number, number][] {
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    const k = 0.78 + hash(seed, i, 720) * 0.34;
    return [Math.cos(a) * rx * k, Math.sin(a) * ry * k] as [number, number];
  });
}

function trace(ctx: CanvasRenderingContext2D, pts: readonly [number, number][]): void {
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  ctx.closePath();
}

/** A painted stone at the origin: body colour, light from the upper left, core shadow and bounce, a facet or two, and a pen line. */
function stone(ctx: CanvasRenderingContext2D, pts: readonly [number, number][], rx: number, ry: number, wash: string, seed: number, line: number, strength = 1): void {
  trace(ctx, pts);
  ctx.globalAlpha = strength;
  ctx.fillStyle = PAPER;
  ctx.fill();
  ctx.globalAlpha = 0.9 * strength;
  ctx.fillStyle = wash;
  ctx.fill();
  ctx.save();
  ctx.clip();
  const g = ctx.createLinearGradient(-rx * 0.7, -ry * 0.8, rx * 0.7, ry * 0.9);
  g.addColorStop(0, 'rgba(255, 244, 222, 0.55)');
  g.addColorStop(0.4, 'rgba(255, 244, 222, 0.08)');
  g.addColorStop(0.62, 'rgba(30, 30, 62, 0.18)');
  g.addColorStop(0.9, 'rgba(30, 30, 62, 0.5)');
  g.addColorStop(1, 'rgba(160, 168, 200, 0.35)');
  ctx.globalAlpha = strength;
  ctx.fillStyle = g;
  ctx.fillRect(-rx * 1.3, -ry * 1.3, rx * 2.6, ry * 2.6);
  // A facet: one flat face turned to the light, cut by a crisp edge.
  const fa = hash(seed, 1, 730) * Math.PI - Math.PI * 0.9;
  ctx.globalAlpha = 0.25 * strength;
  ctx.fillStyle = '#fff4dc';
  ctx.beginPath();
  ctx.moveTo(Math.cos(fa) * rx, Math.sin(fa) * ry);
  ctx.lineTo(rx * 0.15, -ry * 0.05);
  ctx.lineTo(Math.cos(fa - 1.4) * rx, Math.sin(fa - 1.4) * ry);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 0.45 * strength;
  ctx.strokeStyle = INK;
  ctx.lineWidth = line * 0.45;
  ctx.beginPath();
  ctx.moveTo(Math.cos(fa) * rx * 0.9, Math.sin(fa) * ry * 0.9);
  ctx.lineTo(rx * 0.15, -ry * 0.05);
  ctx.stroke();
  // Hatching in the core shadow on the lower right.
  ctx.globalAlpha = 0.3 * strength;
  ctx.lineWidth = 0.45;
  for (let o = -rx; o < rx * 1.2; o += 1.8) {
    ctx.beginPath();
    ctx.moveTo(o + rx * 0.35, ry);
    ctx.lineTo(o + rx * 0.95, ry * 0.15);
    ctx.stroke();
  }
  ctx.restore();
  trace(ctx, pts);
  ctx.globalAlpha = 0.9 * Math.min(1, strength * 1.2);
  ctx.strokeStyle = INK;
  ctx.lineWidth = line;
  ctx.lineJoin = 'round';
  ctx.stroke();
  ctx.globalAlpha = 1;
}

/** One boulder per coarse cell at most, so they never crowd. */
const CELL = 4;

/**
 * Cobbles set in the ground (call clipped to it, before the ore): one in
 * some of the coarse cells, under a tile across, washed faintly darker than
 * the rock round them. Digging cuts them like the rest of the ground.
 */
export function cobbles(ctx: CanvasRenderingContext2D, t: Terrain, roof: Int32Array, tx: number, ty: number, tiles: number, T: number, style: GroundStyle): void {
  const c0 = Math.floor((tx - 3) / CELL);
  const c1 = Math.floor((tx + tiles + 3) / CELL);
  const r0 = Math.floor((ty - 3) / CELL);
  const r1 = Math.floor((ty + tiles + 3) / CELL);
  for (let cy = r0; cy <= r1; cy++) {
    for (let cx = c0; cx <= c1; cx++) {
      // Hashed on the folded column, so a wrapping world's join matches.
      const fx = Math.floor(wrapX(t, cx * CELL) / CELL);
      if (hash(fx, cy, 740) > 0.4) continue;
      const gx = cx * CELL + 0.5 + hash(fx, cy, 741) * (CELL - 1);
      const gy = cy * CELL + 0.5 + hash(fx, cy, 742) * (CELL - 1);
      const tile = tileAt(t, Math.floor(gx), Math.floor(gy));
      if (tile !== TILE.soil && tile !== TILE.stone) continue;
      // Not in the first metres under the surface, where the surface rocks are.
      if (gy < (roof[wrapX(t, Math.floor(gx))] ?? 0) + 1.5) continue;
      if (contentAt(t, Math.floor(gx), Math.floor(gy))) continue;
      const rx = T * (0.22 + hash(fx, cy, 743) * 0.3);
      const ry = rx * (0.55 + hash(fx, cy, 744) * 0.3);
      const seed = fx * 131 + cy;
      ctx.save();
      ctx.translate(gx * T, gy * T);
      ctx.rotate((hash(fx, cy, 745) - 0.5) * 0.6);
      stone(ctx, stoneShape(rx, ry, seed, 10), rx, ry, tile === TILE.soil ? style.stone : style.deep, seed, 0.6, 0.55);
      ctx.restore();
    }
  }
}

/**
 * Stones lying half sunk in the dust along the open surface (draw over the
 * ground's outline): only on flat stretches of the moon's first surface,
 * and gone once the tile under them is dug.
 */
export function surfaceRocks(ctx: CanvasRenderingContext2D, t: Terrain, roof: Int32Array, tx: number, ty: number, tiles: number, T: number, style: GroundStyle): void {
  for (let x = tx - 2; x <= tx + tiles + 1; x++) {
    const fx = wrapX(t, x);
    const y = roof[fx] ?? 0;
    if (y < ty - 1 || y > ty + tiles + 1) continue;
    if (tileAt(t, x, y) === TILE.air || tileAt(t, x, y - 1) !== TILE.air) continue;
    // Flat ground only: the neighbours' surface at the same row.
    if ((roof[wrapX(t, x - 1)] ?? -1) !== y || (roof[wrapX(t, x + 1)] ?? -1) !== y) continue;
    for (let k = 0; k < 2; k++) {
      const h = (s: number): number => hash(fx, k, 760 + s);
      if (h(0) > (k === 0 ? 0.6 : 0.35)) continue;
      const big = h(1) < 0.22;
      const rx = big ? T * (0.32 + h(2) * 0.22) : T * (0.09 + h(2) * 0.14);
      const ry = rx * (0.55 + h(3) * 0.3);
      const cx = (x + 0.15 + h(4) * 0.7) * T;
      const cy = y * T + ry * 0.3;
      const seed = fx * 7 + k;
      // Its shadow on the dust, thrown to the right.
      ctx.globalAlpha = 0.22;
      ctx.fillStyle = '#25233a';
      ctx.beginPath();
      ctx.ellipse(cx + rx * 0.7, y * T + Math.max(1, ry * 0.25) + 0.3, rx * 1.2, Math.max(1, ry * 0.25), 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate((h(5) - 0.5) * 0.5);
      stone(ctx, stoneShape(rx, ry, seed), rx, ry, big ? style.stone : style.soil, seed, big ? 1.1 : 0.7);
      ctx.restore();
    }
  }
  ctx.globalAlpha = 1;
}
