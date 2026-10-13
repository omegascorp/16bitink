import { INK, PAPER } from '../../../src/art/pen';
import { createRng } from '../../../src/logic/rng';
import { clamp01, lerp, ramp, smooth } from '../short';
import type { Pt } from './fish';
import { CHALK, NIGHT } from './scene';
import { LENS, LENS_RAYS } from './story';

/**
 * The magnifier on the blackdragon's skin: a cut through it, drawn as a
 * sketchbook diagram. Water above, the skin's surface, then a thick layer of
 * pigment granules (melanosomes) packed tight, and the flesh below. Rays of
 * light come down into it and bounce from granule to granule, dimmer each
 * time, until there's nothing left of them.
 *
 * Drawn at the lens's full size (radius LENS.r) about its centre, and scaled.
 */

const R = LENS.r;
const SURFACE = -48;
const BAND_BOTTOM = 78;

interface Granule {
  readonly x: number;
  readonly y: number;
  readonly rx: number;
  readonly ry: number;
  readonly turn: number;
  /** When it pops in, 0 .. 1 of the packing. */
  readonly order: number;
}

/** Capsule-shaped granules packed edge to edge in rows, each a little askew. */
const GRANULES: readonly Granule[] = (() => {
  const rng = createRng(77);
  const out: Granule[] = [];
  for (let row = 0; row < 6; row++) {
    const y = SURFACE + 18 + row * 19.5;
    for (let col = -8; col <= 8; col++) {
      const x = col * 25 + (row % 2) * 12.5 + (rng() - 0.5) * 6;
      out.push({ x, y: y + (rng() - 0.5) * 5, rx: 12 + rng() * 3, ry: 7 + rng() * 1.6, turn: (rng() - 0.5) * 0.9, order: rng() });
    }
  }
  return out;
})();

/** Each ray's path: in from the water, down through the surface, then bouncing between granules, shorter each time. */
const RAY_PATHS: readonly (readonly Pt[])[] = LENS_RAYS.map((_, i) => {
  const rng = createRng(310 + i * 17);
  const x0 = -120 + i * 75;
  const pts: Pt[] = [{ x: x0 - 60, y: -R - 20 }, { x: x0, y: SURFACE + 22 }];
  let x = x0;
  let dir = 1;
  for (let b = 0; b < 6; b++) {
    const step = (46 - b * 5) * (0.8 + 0.4 * rng());
    x += dir * step;
    dir = -dir;
    pts.push({ x, y: SURFACE + 22 + (b % 2 ? 10 : 42 + b * 2) + (rng() - 0.5) * 10 });
  }
  return pts;
});

const lengthOf = (pts: readonly Pt[]): number[] => {
  const acc = [0];
  for (let k = 1; k < pts.length; k++) acc.push(acc[k - 1]! + Math.hypot(pts[k]!.x - pts[k - 1]!.x, pts[k]!.y - pts[k - 1]!.y));
  return acc;
};
const RAY_LENGTHS = RAY_PATHS.map(lengthOf);

const RAY = '#e8940f';

/** One ray, `u` 0 .. 1 along its path: each bounce dimmer, the last of it fizzling out. */
function drawLensRay(ctx: CanvasRenderingContext2D, i: number, u: number, a0: number): void {
  if (u <= 0 || u >= 1.25) return;
  const pts = RAY_PATHS[i]!;
  const acc = RAY_LENGTHS[i]!;
  const total = acc[acc.length - 1]!;
  const reach = Math.min(1, u) * total;
  // The light behind the tip dies away as it goes: only the last stretch shows.
  const fade = 1 - ramp(u, 0.95, 1.25);
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (let k = 1; k < pts.length; k++) {
    if (acc[k - 1]! >= reach) break;
    const a = pts[k - 1]!;
    const b = pts[k]!;
    const f = Math.min(1, (reach - acc[k - 1]!) / (acc[k]! - acc[k - 1]!));
    const end = { x: lerp(a.x, b.x, f), y: lerp(a.y, b.y, f) };
    // Strength left after k - 1 bounces.
    const strength = 0.62 ** Math.max(0, k - 2);
    const behind = 1 - clamp01((reach - acc[k]!) / 260);
    const alpha = fade * strength * Math.max(0.25, behind);
    ctx.globalAlpha = a0 * alpha;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 9 * Math.sqrt(strength);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
    ctx.strokeStyle = RAY;
    ctx.lineWidth = 5 * Math.sqrt(strength);
    ctx.stroke();
    if (f < 1 && u < 1) {
      // The tip: a bright dot, shrinking with each bounce.
      ctx.fillStyle = RAY;
      ctx.beginPath();
      ctx.arc(end.x, end.y, 7 * Math.sqrt(strength), 0, Math.PI * 2);
      ctx.fill();
    }
  }
  if (u >= 1) {
    // Fizzled out at the last bounce.
    const p = pts[pts.length - 1]!;
    const v = (u - 1) / 0.25;
    ctx.globalAlpha = a0 * 0.7 * (1 - v);
    ctx.strokeStyle = RAY;
    ctx.lineWidth = 2.5;
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2 + 0.4;
      ctx.beginPath();
      ctx.moveTo(p.x + Math.cos(a) * 6, p.y + Math.sin(a) * 6);
      ctx.lineTo(p.x + Math.cos(a) * (6 + 12 * v), p.y + Math.sin(a) * (6 + 12 * v));
      ctx.stroke();
    }
  }
  ctx.restore();
}

/** Inside the lens, at full size about (0, 0). */
function drawCut(ctx: CanvasRenderingContext2D, packed: number, rays: readonly number[], a0: number): void {
  ctx.globalAlpha = a0;
  ctx.fillStyle = PAPER;
  ctx.fillRect(-R, -R, 2 * R, 2 * R);
  // Water above the skin: a blue wash with current marks.
  ctx.fillStyle = 'rgba(80,130,175,0.32)';
  ctx.fillRect(-R, -R, 2 * R, R + SURFACE);
  ctx.strokeStyle = INK;
  ctx.globalAlpha = 0.35 * a0;
  ctx.lineWidth = 2;
  for (const [x, y] of [[-70, -130], [60, -105], [-20, -85]] as const) {
    ctx.beginPath();
    for (let k = 0; k <= 6; k++) ctx.lineTo(x - 26 + k * 9, y + Math.sin(k * 1.4) * 3);
    ctx.stroke();
  }
  ctx.globalAlpha = a0;
  // Flesh below: a pale pink wash, hatched.
  ctx.fillStyle = 'rgba(214,140,120,0.3)';
  ctx.fillRect(-R, SURFACE, 2 * R, 2 * R);
  ctx.strokeStyle = INK;
  ctx.globalAlpha = 0.25 * a0;
  ctx.lineWidth = 1.6;
  for (let x = -R; x < R; x += 16) {
    ctx.beginPath();
    ctx.moveTo(x, BAND_BOTTOM + 14);
    ctx.lineTo(x + 26, R);
    ctx.stroke();
  }
  ctx.globalAlpha = a0;
  // The granules, popping in as they pack.
  for (const g of GRANULES) {
    const pop = smooth((packed * 1.25 - g.order * 1.0) / 0.25);
    if (pop <= 0) continue;
    ctx.save();
    ctx.translate(g.x, g.y);
    ctx.rotate(g.turn);
    ctx.scale(pop, pop);
    ctx.beginPath();
    ctx.ellipse(0, 0, g.rx, g.ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#1e1517';
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // A dull sheen, so they read as capsules.
    ctx.beginPath();
    ctx.ellipse(-g.rx * 0.3, -g.ry * 0.35, g.rx * 0.35, g.ry * 0.2, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,240,220,0.18)';
    ctx.fill();
    ctx.restore();
  }
  // The skin's surface.
  ctx.strokeStyle = INK;
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (let x = -R; x <= R; x += 10) ctx.lineTo(x, SURFACE + 4 * Math.sin(x * 0.035));
  ctx.stroke();
  rays.forEach((u, i) => drawLensRay(ctx, i, u, a0));
}

/**
 * The lens, `open` 0 .. 1: grown out of the spot on the skin to its place,
 * joined to the spot by two chalk lines.
 */
export function drawLens(ctx: CanvasRenderingContext2D, spot: Pt, open: number, packed: number, rays: readonly number[]): void {
  if (open <= 0) return;
  const e = smooth(open);
  const c = { x: lerp(spot.x, LENS.x, e), y: lerp(spot.y, LENS.y, e) };
  const r = lerp(20, R, e);
  const dx = c.x - spot.x;
  const dy = c.y - spot.y;
  const d = Math.hypot(dx, dy) || 1;
  const px = -dy / d;
  const py = dx / d;
  const spotR = 24;
  ctx.save();
  ctx.globalAlpha = clamp01(open * 4);
  ctx.strokeStyle = CHALK;
  ctx.lineCap = 'round';
  ctx.lineWidth = 3.5;
  ctx.setLineDash([14, 10]);
  ctx.beginPath();
  for (const s of [-1, 1]) {
    ctx.moveTo(spot.x + px * spotR * s, spot.y + py * spotR * s);
    ctx.lineTo(c.x + px * r * s, c.y + py * r * s);
  }
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(spot.x, spot.y, spotR, 0, Math.PI * 2);
  ctx.stroke();

  ctx.save();
  ctx.beginPath();
  ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.translate(c.x, c.y);
  ctx.scale(r / R, r / R);
  drawCut(ctx, packed, rays, clamp01(open * 4));
  ctx.restore();

  ctx.beginPath();
  ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
  ctx.strokeStyle = NIGHT;
  ctx.lineWidth = 16;
  ctx.stroke();
  ctx.strokeStyle = CHALK;
  ctx.lineWidth = 7;
  ctx.stroke();
  ctx.restore();
}

/** Where the granule layer is, in the lens at full size: for the label's leader line. */
export const GRANULE_LAYER: Pt = { x: LENS.x + 120, y: LENS.y + SURFACE + 40 };
