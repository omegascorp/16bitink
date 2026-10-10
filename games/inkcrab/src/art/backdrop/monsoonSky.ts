import { bezier, type Draw, oval, pt } from '../kit';
import type { Pt } from '../pen';
import { PAPER_FILL } from '../palette';
import { BACKDROP_W, FAR } from './common';
import { glow, towering } from './estuary';

/**
 * The weather of the south-west monsoon, drawn in a lull between squalls:
 * a low, heavy ceiling of slate and violet cloud sagging into pouches,
 * ragged dark scud driven under it, cumulonimbus towering far out at sea
 * with their anvils spread downwind and curtains of rain trailing beneath
 * them to the water, and low on the horizon a break of washed, bright
 * light with shafts of it slanting down through the gaps.
 */
const W = BACKDROP_W;
export const SLATE = '#5d6b85';
export const SLATE_DARK = '#46506a';
export const VIOLET = '#7d7894';
export const WASHED = '#f8f0d4';
const RAIN = '#56627a';
const ANVIL_TINT = '#c9c3d6';

/** A colour as rgba at `a`. */
export function rgba(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${Math.max(0, a)})`;
}

/** Fills a quad with a vertical gradient from `a0` at y0 through `a1` to nothing at y1. */
function shaft(t: Draw, quad: readonly Pt[], y0: number, y1: number, color: string, a0: number, a1: number): void {
  const { ctx } = t.pen;
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, rgba(color, a0));
  g.addColorStop(0.35, rgba(color, a1));
  g.addColorStop(1, rgba(color, 0));
  ctx.save();
  ctx.fillStyle = g;
  ctx.beginPath();
  quad.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/**
 * A curtain of rain falling from a cloud base (`top`) to the sea
 * (`bottom`): soft slate strips, thickest in the middle and fading towards
 * the water, slanted by the wind (`slant` px across its fall), combed
 * through with fine streaks.
 */
export function rainCurtain(t: Draw, x: number, top: number, bottom: number, w: number, slant: number, alpha: number): void {
  const { pen } = t;
  const n = Math.max(4, Math.round(w / 8));
  for (let i = 0; i < n; i++) {
    const u = (i + 0.5) / n;
    const env = Math.sin(Math.PI * u) ** 0.7 * (0.55 + pen.rng() * 0.45);
    const sx = x - w / 2 + w * u;
    const sw = (w / n) * 1.4;
    const end = bottom - pen.rng() * (bottom - top) * 0.15;
    shaft(t, [pt(sx - sw / 2, top), pt(sx + sw / 2, top), pt(sx + sw / 2 + slant, end), pt(sx - sw / 2 + slant, end)], top, end, RAIN, alpha * env * 0.7, alpha * env);
  }
  const dx = slant / (bottom - top);
  for (let k = 0; k < w * 0.6; k++) {
    const y0 = top + pen.rng() * (bottom - top) * 0.75;
    const x0 = x - w * 0.45 + pen.rng() * w * 0.9 + (y0 - top) * dx;
    const len = 8 + pen.rng() * 22;
    pen.hair([pt(x0, y0), pt(x0 + len * dx, y0 + len)], 0.35, t.ink, FAR * 0.16 * (1 - (y0 - top) / (bottom - top)));
  }
}

/**
 * An anvil: the flat, spreading top of a thunderhead, drawn out downwind
 * (to the right) into a long fibrous wedge, lit pale above and violet-grey
 * beneath, its far edge combed into streaks.
 */
export function anvil(t: Draw, x: number, y: number, w: number, h: number): void {
  const { pen } = t;
  const x0 = x - w * 0.3;
  const x1 = x + w;
  const top: Pt[] = [];
  const bot: Pt[] = [];
  for (let k = 0; k <= 24; k++) {
    const u = k / 24;
    const xx = x0 + (x1 - x0) * u;
    const thick = h * Math.sin(Math.PI * Math.min(1, u * 1.6 + 0.08)) ** 0.6 * (1 - u * 0.75);
    top.push(pt(xx, y - thick * 0.35 - Math.sin(u * 9) * 0.6));
    bot.push(pt(xx, y + thick * 0.65 * (1 - u * 0.3)));
  }
  const shape = [...top, ...[...bot].reverse()];
  pen.fill(shape, PAPER_FILL, 0.8);
  pen.clipped(shape, () => {
    pen.fill(bot.map((p) => pt(p.x, p.y - h * 0.4)).concat([...bot].reverse()), ANVIL_TINT, 0.55);
    pen.hatch(shape, 2.2, 0.06, 0.35, { color: t.ink, alpha: FAR * 0.18, onlyBelow: y });
  });
  pen.hair(top.slice(0, 18), 0.55, t.ink, FAR * 0.5);
  pen.hair(bot.slice(2, 14), 0.4, t.ink, FAR * 0.3);
  // The fibrous trailing edge, streaming off downwind.
  for (let k = 0; k < 9; k++) {
    const sy = y + pen.jitter(h * 0.35);
    const sx = x1 - w * 0.35 + pen.rng() * w * 0.25;
    pen.hair(bezier(pt(sx, sy), pt(sx + w * 0.15, sy - 0.5), pt(sx + w * (0.25 + pen.rng() * 0.2), sy + pen.jitter(1.5)), 8), 0.4, t.ink, FAR * 0.25);
    glow(t, sx + w * 0.15, sy, w * 0.14, 2.5, PAPER_FILL, 0.4);
  }
}

/**
 * A thunderhead far out at sea: a towering cumulus darkened with rain
 * below, its flat anvil spread downwind on top, and a curtain of rain
 * hanging from its base down to the sea (`sea`).
 */
export function cumulonimbus(t: Draw, x: number, base: number, w: number, h: number, sea: number, slant: number): void {
  rainCurtain(t, x + w * 0.05, base - 4, sea, w * 1.1, slant, 0.42);
  towering(t, x, base, w, h);
  glow(t, x, base - h * 0.12, w * 0.85, h * 0.28, SLATE_DARK, 0.34);
  glow(t, x - w * 0.25, base - h * 0.75, w * 0.4, h * 0.25, WASHED, 0.35);
  anvil(t, x + w * 0.1, base - h * 1.02, w * 1.3, h * 0.2);
}

/**
 * The break of light after rain: a bright, washed gap low over the sea,
 * with shafts of light slanting down through the clouds onto the water.
 */
export function sunbreak(t: Draw, x: number, horizon: number, w: number, rays: number): void {
  const { pen } = t;
  glow(t, x, horizon - 10, w, 34, WASHED, 0.8);
  glow(t, x, horizon - 4, w * 0.5, 14, '#fffbea', 0.95);
  const apex = horizon - 110;
  for (let k = 0; k < rays; k++) {
    const u = (k + 0.5) / rays;
    const top = x - w * 0.25 + w * 0.5 * u + pen.jitter(6);
    const foot = x - w * 0.8 + w * 1.6 * u + pen.jitter(10);
    const half0 = 2 + pen.rng() * 3;
    const half1 = 7 + pen.rng() * 12;
    shaft(t, [pt(top - half0, apex), pt(top + half0, apex), pt(foot + half1, horizon), pt(foot - half1, horizon)], apex, horizon + 30, PAPER_FILL, 0.05, 0.28);
  }
  pen.hair([pt(x - w * 0.6, horizon - 1), pt(x + w * 0.6, horizon - 1)], 0.8, PAPER_FILL, 0.9);
}

/**
 * The monsoon ceiling: a low, heavy deck of slate and violet cloud across
 * the whole tile from `y` down `h`, its underside sagging into rounded
 * pouches with a pale rim of light under each.
 */
export function cloudDeck(t: Draw, y: number, h: number): void {
  const { pen } = t;
  const n = 16;
  for (let k = 0; k < n; k++) {
    const x = (k * W) / n + pen.jitter(14);
    glow(t, x, y + h * 0.3 + pen.jitter(h * 0.2), 90 + pen.rng() * 40, h * 0.8, SLATE_DARK, 0.3);
    glow(t, x + 30, y + pen.jitter(h * 0.2), 70, h * 0.6, VIOLET, 0.22);
  }
  // Pouches along the underside: rounded lobes, each inked faintly along its foot with a lit rim below.
  for (let k = 0; k < 26; k++) {
    const x = (k * W) / 26 + pen.jitter(10);
    const r = 10 + pen.rng() * 14;
    const cy = y + h * (0.75 + pen.rng() * 0.35);
    glow(t, x, cy, r * 1.3, r * 0.6, SLATE, 0.3);
    const lobe = oval(x, cy, r, r * 0.5, 20).slice(1, 10);
    pen.hair(lobe, 0.45, t.ink, FAR * 0.28);
    pen.hair(lobe.map((p) => pt(p.x, p.y + 1.6)).slice(2, 8), 0.7, PAPER_FILL, 0.35);
  }
}

/**
 * Scud: a ragged rag of dark cloud driven along under the ceiling, its
 * top soft and its foot torn into wisps trailing behind it (to the left).
 */
export function fractus(t: Draw, x: number, y: number, w: number, h: number): void {
  const { pen } = t;
  const n = Math.max(3, Math.round(w / (h * 1.2)));
  for (let i = 0; i < n; i++) {
    const u = (i + 0.5) / n;
    const env = Math.sin(Math.PI * u) ** 0.5;
    const px = x - w / 2 + w * u + pen.jitter(h * 0.3);
    const py = y - h * 0.3 * env + pen.jitter(h * 0.15);
    glow(t, px, py, h * (0.9 + env), h * 0.55 * (0.6 + env), SLATE_DARK, 0.32);
    glow(t, px - h * 0.2, py - h * 0.25, h * (0.6 + env * 0.6), h * 0.3, '#d9d6e2', 0.25);
    if (pen.rng() < 0.6) pen.hair(oval(px, py, h * (0.7 + env * 0.5), h * 0.4, 18).slice(10, 16), 0.45, t.ink, FAR * 0.3);
  }
  for (let k = 0; k < 6; k++) {
    const sy = y + h * 0.15 + pen.jitter(h * 0.25);
    const sx = x - w * 0.2 + pen.jitter(w * 0.3);
    const len = w * (0.3 + pen.rng() * 0.4);
    pen.hair(bezier(pt(sx, sy), pt(sx - len * 0.5, sy + 1.5), pt(sx - len, sy + pen.jitter(2)), 8), 0.4, t.ink, FAR * 0.22);
    glow(t, sx - len * 0.5, sy + 1, len * 0.5, 2.5, SLATE_DARK, 0.25);
  }
}

/** Virga: a few grey streaks of rain hanging from the ceiling and drying before they reach the sea. */
export function virga(t: Draw, x: number, y: number, w: number, h: number, slant: number): void {
  rainCurtain(t, x, y, y + h, w, slant, 0.22);
}
