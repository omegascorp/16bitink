import { createRng, type Rng } from '../logic/rng';
import { edge, oval, pt, type Draw } from './kit';
import type { GroundStyle } from './palette';
import type { Pt } from './pen';

/**
 * Graphite's sky, painted: an airless moon's sky is black even by day, so
 * it's a deep indigo wash grading down to a warm glow along the horizon,
 * with the stars left as bare paper (as a watercolourist masks them), a
 * ringed planet washed and shaded hanging over the horizon, and the rims of
 * far craters in aerial perspective. Two layers so they can scroll at
 * different speeds: the far sky (`drawSky`) and the crater ridges
 * (`drawRidges`, ridgeArt.ts), each drawn from the top-left of its canvas with the
 * horizon at `horizon`; below it they carry on down to the canvas's bottom
 * edge, so nothing shows where the ground dips. Both repeat side to side
 * without a seam, so they can tile behind a world that wraps.
 */
export const SKY_W = 2600;

const NIGHT = '#232a52';
const DUSK = '#4b5583';
const GLOW = '#e8d2ad';
/** Bare paper, for stars. */
const STAR = '#fffaf0';

/** Soft blotches, drawn again across each side edge so the layer tiles. */
function blotch(ctx: CanvasRenderingContext2D, rng: Rng, w: number, x: number, y: number, r: number, color: string, alpha: number): void {
  for (const ox of [-w, 0, w]) {
    const cx = x + ox;
    if (cx + r < 0 || cx - r > w) continue;
    const g = ctx.createRadialGradient(cx, y, 0, cx, y, r);
    g.addColorStop(0, color);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = alpha * (0.6 + rng() * 0.4);
    ctx.fillStyle = g;
    ctx.fillRect(cx - r, y - r, r * 2, r * 2);
  }
  ctx.globalAlpha = 1;
}

export function drawSky(d: Draw, w: number, h: number, horizon: number, _style: GroundStyle): void {
  const ctx = d.pen.ctx;
  const rng = createRng(77);
  // The wash: night above, a long fall to a warm glow at the horizon, which carries on under the ground's dips.
  const g = ctx.createLinearGradient(0, 0, 0, horizon);
  g.addColorStop(0, NIGHT);
  g.addColorStop(0.45, DUSK);
  g.addColorStop(0.82, '#a59bab');
  g.addColorStop(1, GLOW);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, horizon);
  ctx.fillStyle = GLOW;
  ctx.fillRect(0, horizon - 1, w, h - horizon + 1);
  // Pigment pooled unevenly across the night.
  for (let i = 0; i < 26; i++) blotch(ctx, rng, w, rng() * w, rng() * horizon * 0.6, 60 + rng() * 160, rng() < 0.6 ? '#151a3a' : '#5a5f92', 0.22);
  // Granulation.
  for (let i = 0; i < 9000; i++) {
    const y = rng() * horizon;
    ctx.globalAlpha = 0.05 + rng() * 0.08 * (1 - y / horizon);
    ctx.fillStyle = rng() < 0.6 ? '#0d1030' : '#c8c3d8';
    ctx.fillRect(rng() * w, y, 0.8, 0.8);
  }
  ctx.globalAlpha = 1;
  stars(ctx, rng, w, horizon);
  ringedPlanet(d, pt(w * 0.42, horizon * 0.5), Math.min(64, horizon * 0.18));
  smallMoon(d, pt(w * 0.12, horizon * 0.36), 12);
  smallMoon(d, pt(w * 0.78, horizon * 0.24), 7);
}

/** Stars left as paper: specks, a few with a soft halo, and a handful of four-point glints. */
function stars(ctx: CanvasRenderingContext2D, rng: Rng, w: number, horizon: number): void {
  for (let i = 0; i < 260; i++) {
    const x0 = rng() * w;
    const y = rng() * rng() * horizon * 0.85;
    const r = 0.4 + rng() * rng() * 1.4;
    const kind = rng();
    // Fainter toward the glow, where the sky is lighter.
    const a = 0.55 + 0.45 * (1 - y / horizon);
    for (const x of [x0, x0 - w, x0 + w].filter((sx) => sx > -12 && sx < w + 12)) {
      if (kind < 0.12) {
        const g = ctx.createRadialGradient(x, y, 0, x, y, r * 7);
        g.addColorStop(0, 'rgba(255,248,225,0.35)');
        g.addColorStop(1, 'rgba(255,248,225,0)');
        ctx.fillStyle = g;
        ctx.fillRect(x - r * 7, y - r * 7, r * 14, r * 14);
      }
      if (kind > 0.95) {
        ctx.strokeStyle = STAR;
        ctx.globalAlpha = a * 0.9;
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        ctx.moveTo(x - r * 5, y);
        ctx.lineTo(x + r * 5, y);
        ctx.moveTo(x, y - r * 5);
        ctx.lineTo(x, y + r * 5);
        ctx.stroke();
      }
      ctx.globalAlpha = a;
      ctx.fillStyle = STAR;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

/** A washed sphere: the colour, a lit side and a terminator, painted inside `shape`. */
function sphere(d: Draw, c: Pt, r: number, shape: readonly Pt[], light: string, dark: string): void {
  const ctx = d.pen.ctx;
  d.pen.clipped(shape, () => {
    const g = ctx.createRadialGradient(c.x - r * 0.4, c.y - r * 0.45, r * 0.1, c.x, c.y, r * 1.15);
    g.addColorStop(0, light);
    g.addColorStop(0.6, light);
    g.addColorStop(1, dark);
    ctx.fillStyle = g;
    ctx.fillRect(c.x - r, c.y - r, r * 2, r * 2);
    // The night side, hatched over its wash.
    ctx.save();
    ctx.beginPath();
    ctx.arc(c.x + r * 0.35, c.y + r * 0.3, r * 1.05, 0, Math.PI * 2);
    ctx.arc(c.x - r * 0.12, c.y - r * 0.15, r * 1.02, 0, Math.PI * 2, true);
    ctx.clip('evenodd');
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = '#1a1d3d';
    ctx.fillRect(c.x - r, c.y - r, r * 2, r * 2);
    ctx.globalAlpha = 0.4;
    ctx.strokeStyle = d.ink;
    ctx.lineWidth = 0.55;
    for (let k = -r * 2; k < r * 2; k += 2.4) {
      ctx.beginPath();
      ctx.moveTo(c.x + k, c.y + r);
      ctx.lineTo(c.x + k + r, c.y - r);
      ctx.stroke();
    }
    ctx.restore();
  });
}

function ringedPlanet(d: Draw, c: Pt, r: number): void {
  const ctx = d.pen.ctx;
  const tilt = -0.32;
  const ring = (k: number, half: 'back' | 'front'): Pt[] => {
    const pts: Pt[] = [];
    for (let i = 0; i <= 48; i++) {
      const a = (half === 'back' ? Math.PI : 0) + (i / 48) * Math.PI;
      const x = Math.cos(a) * r * k;
      const y = Math.sin(a) * r * k * 0.28;
      pts.push(pt(c.x + x * Math.cos(tilt) - y * Math.sin(tilt), c.y + x * Math.sin(tilt) + y * Math.cos(tilt)));
    }
    return pts;
  };
  const band = (half: 'back' | 'front', alpha: number): void => {
    const outer = ring(2.05, half);
    const inner = ring(1.5, half).reverse();
    d.pen.fill([...outer, ...inner], '#d9c49b', alpha);
    for (const [k, a] of [[1.5, 0.7], [1.72, 0.35], [1.85, 0.5], [2.05, 0.8]] as const) d.pen.stroke(ring(k, half), k === 1.85 ? 0.6 : 1, d.ink, a, false);
  };
  band('back', 0.45);
  const globe = oval(c.x, c.y, r, r, 48);
  sphere(d, c, r, globe, '#e7d7b2', '#9c8a6c');
  // Cloud belts across the globe, washed in.
  d.pen.clipped(globe, () => {
    for (const [k, w, col] of [[-0.5, 0.1, '#c9ae7f'], [-0.12, 0.08, '#b89766'], [0.28, 0.16, '#c7a978'], [0.62, 0.06, '#a98a5e']] as const) {
      const y = c.y + r * k;
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(c.x - r, y);
      ctx.bezierCurveTo(c.x - r * 0.3, y - r * 0.08, c.x + r * 0.3, y - r * 0.14, c.x + r, y - r * 0.1);
      ctx.lineTo(c.x + r, y - r * 0.1 + r * w);
      ctx.bezierCurveTo(c.x + r * 0.3, y + r * w - r * 0.1, c.x - r * 0.3, y + r * w, c.x - r, y + r * w);
      ctx.closePath();
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  });
  sphere(d, c, r, globe, 'rgba(0,0,0,0)', 'rgba(20,20,50,0.35)');
  edge(d, globe, 1.4);
  band('front', 0.7);
}

function smallMoon(d: Draw, c: Pt, r: number): void {
  const moon = oval(c.x, c.y, r, r, 24);
  sphere(d, c, r, moon, '#ece6d6', '#8e8a96');
  edge(d, moon, 1);
}
