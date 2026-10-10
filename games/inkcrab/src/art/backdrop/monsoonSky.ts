import { bezier, type Draw, oval, pt } from '../kit';
import type { Pt } from '../pen';
import { PAPER_FILL } from '../palette';
import { BACKDROP_W, FAR } from './common';
import { glow } from './estuary';

/**
 * The weather of the south-west monsoon, drawn in a lull between squalls:
 * a low, heavy ceiling of slate and violet cloud sagging into pouches,
 * ragged dark scud driven under it, cumulonimbus towering far out at sea
 * with their anvils spread downwind and curtains of rain trailing beneath
 * them to the water, and low on the horizon a break of washed, bright
 * light with shafts of it slanting down through the gaps.
 */
const W = BACKDROP_W;
export const SLATE = '#3f5799';
export const SLATE_DARK = '#38446f';
export const VIOLET = '#6c64a6';
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
  g.addColorStop(0.3, rgba(color, a1));
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
  const n = Math.max(6, Math.round(w / 3));
  const phase = pen.rng() * 6;
  for (let i = 0; i < n; i++) {
    const u = (i + 0.5) / n;
    // Smoothly varying density across the curtain, heaviest in its middle.
    const env = Math.sin(Math.PI * u) ** 0.8 * (0.75 + 0.25 * Math.sin(u * 11 + phase));
    const sx = x - w / 2 + w * u;
    const sw = (w / n) * 1.6;
    const end = bottom - (bottom - top) * 0.08 * (1 + Math.sin(u * 7 + phase));
    shaft(t, [pt(sx - sw / 2, top), pt(sx + sw / 2, top), pt(sx + sw / 2 + slant, end), pt(sx - sw / 2 + slant, end)], top, end, RAIN, 0, alpha * env * 0.4);
  }
  const dx = slant / (bottom - top);
  for (let k = 0; k < w * 0.5; k++) {
    const y0 = top + pen.rng() * (bottom - top) * 0.75;
    const x0 = x - w * 0.42 + pen.rng() * w * 0.84 + (y0 - top) * dx;
    const len = 10 + pen.rng() * 26;
    pen.hair([pt(x0, y0), pt(x0 + len * dx, y0 + len)], 0.3, t.ink, FAR * 0.13 * (1 - (y0 - top) / (bottom - top)));
  }
}

/**
 * An anvil: the flat, spreading top of a thunderhead, drawn out downwind
 * (to the right) into a long fibrous wedge, lit pale above and violet-grey
 * beneath, its far edge combed into streaks.
 */
export function anvil(t: Draw, x: number, y: number, w: number, h: number): void {
  const { pen } = t;
  const x0 = x - w * 0.45;
  const x1 = x + w;
  const n = 14;
  const top: Pt[] = [];
  for (let k = 0; k <= n; k++) {
    const u = k / n;
    const xx = x0 + (x1 - x0) * u;
    const thick = h * Math.sin(Math.PI * Math.min(1, u * 1.4 + 0.1)) ** 0.5 * (1 - u * 0.6);
    glow(t, xx, y + thick * 0.2, (x1 - x0) / n * 1.6, thick * 0.9 + 2, ANVIL_TINT, 0.35);
    glow(t, xx, y - thick * 0.15, (x1 - x0) / n * 1.4, thick * 0.6 + 1.5, PAPER_FILL, 0.55);
    top.push(pt(xx, y - thick * 0.55));
  }
  pen.hair(top.slice(1, 10), 0.45, t.ink, FAR * 0.32);
  // The fibrous trailing edge, streaming off downwind.
  for (let k = 0; k < 8; k++) {
    const sy = y + pen.jitter(h * 0.3);
    const sx = x1 - w * 0.4 + pen.rng() * w * 0.25;
    pen.hair(bezier(pt(sx, sy), pt(sx + w * 0.15, sy - 0.5), pt(sx + w * (0.25 + pen.rng() * 0.2), sy + pen.jitter(1.5)), 8), 0.35, t.ink, FAR * 0.2);
  }
}

/** Walks a polyline, returning points spaced about `step(i)` apart along it. */
function spaced(path: readonly Pt[], step: (i: number) => number): Pt[] {
  const out: Pt[] = [path[0]!];
  let need = step(0);
  let acc = 0;
  for (let i = 1; i < path.length; i++) {
    acc += Math.hypot(path[i]!.x - path[i - 1]!.x, path[i]!.y - path[i - 1]!.y);
    if (acc >= need) {
      out.push(path[i]!);
      acc = 0;
      need = step(out.length);
    }
  }
  out.push(path[path.length - 1]!);
  return out;
}

/**
 * A thunderhead's outline: up its right side, over its cauliflower head and
 * down its left, every stretch bulging out into a billow; broad at the
 * base, drawn in through the column and boiling out again at the top.
 */
function billowEdge(t: Draw, x: number, base: number, w: number, h: number): Pt[] {
  const { pen } = t;
  const half = (u: number): number => (w / 2) * (1 - 0.55 * u + 0.62 * u ** 3) * (1 + 0.05 * Math.sin(u * 9));
  const cx = (u: number): number => x + w * 0.12 * u;
  const crown = half(1) * 0.55;
  const path: Pt[] = [];
  for (let k = 0; k <= 30; k++) path.push(pt(cx(k / 30) + half(k / 30), base - h * (k / 30)));
  for (let k = 1; k < 30; k++) {
    const a = (k / 30) * Math.PI;
    path.push(pt(cx(1) + Math.cos(a) * half(1), base - h - Math.sin(a) * crown));
  }
  for (let k = 30; k >= 0; k--) path.push(pt(cx(k / 30) - half(k / 30), base - h * (k / 30)));
  const anchors = spaced(path, () => w * (0.09 + pen.rng() * 0.09));
  const edge: Pt[] = [anchors[0]!];
  for (let i = 1; i < anchors.length; i++) {
    const a = anchors[i - 1]!;
    const b = anchors[i]!;
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const bulge = len * (0.45 + pen.rng() * 0.35);
    const c = pt((a.x + b.x) / 2 - ((b.y - a.y) / len) * bulge, (a.y + b.y) / 2 + ((b.x - a.x) / len) * bulge);
    edge.push(...bezier(a, c, b, 8).slice(1));
  }
  return edge;
}

/**
 * A thunderhead's column: a tall cauliflower of billows, lit warm on its
 * tops, greyed violet through its body and dark with rain at its flat
 * base, hatched on its shade side, its outline and a few inner curls inked.
 */
function column(t: Draw, x: number, base: number, w: number, h: number): void {
  const { pen } = t;
  const { ctx } = pen;
  const edge = billowEdge(t, x, base, w, h);
  const shape = edge.map((p) => pt(p.x, Math.min(base, p.y)));
  const x0 = x - w;
  const top = base - h * 1.5;
  pen.clipped(shape, () => {
    ctx.fillStyle = PAPER_FILL;
    ctx.globalAlpha = 0.72;
    ctx.fillRect(x0, top, w * 2.4, base - top);
    ctx.globalAlpha = 1;
    const g = ctx.createLinearGradient(0, base - h * 1.2, 0, base);
    g.addColorStop(0, rgba(WASHED, 0.5));
    g.addColorStop(0.3, rgba(VIOLET, 0.12));
    g.addColorStop(0.7, rgba(VIOLET, 0.32));
    g.addColorStop(1, rgba(SLATE_DARK, 0.6));
    ctx.fillStyle = g;
    ctx.fillRect(x0, top, w * 2.4, base - top);
    // Inner billows: soft shadows under each, and a few inked curls.
    for (let k = 0; k < 14; k++) {
      const u = pen.rng();
      const r = w * (0.08 + pen.rng() * 0.08);
      const px = x + w * 0.12 * u + pen.jitter(w * 0.3 * (1 - 0.3 * u));
      const py = base - h * u - r * 0.2;
      glow(t, px + r * 0.3, py + r * 0.4, r, r * 0.4, VIOLET, 0.25);
      if (k % 2) pen.hair(oval(px, py, r, r * 0.8, 20).slice(10, 18), 0.45, t.ink, FAR * 0.25);
    }
    pen.hatch([pt(x + w * 0.12, top), pt(x + w, top), pt(x + w, base), pt(x + w * 0.12, base)], 2.2, 1.15, 0.35, { color: t.ink, alpha: FAR * 0.2 });
    pen.hatch([pt(x0, base - h * 0.22), pt(x + w, base - h * 0.22), pt(x + w, base), pt(x0, base)], 2.4, 0.1, 0.35, { color: t.ink, alpha: FAR * 0.2 });
  });
  pen.hair(edge.filter((p) => p.y < base - 1), 0.6, t.ink, FAR * 0.5);
  pen.hair([pt(x - w * 0.46, base), pt(x + w * 0.46, base)], 0.45, t.ink, FAR * 0.3);
}

/**
 * A thunderhead far out at sea: a towering column of billows, its flat
 * anvil spread downwind on top, a curtain of rain hanging from its base
 * down to the sea (`sea`).
 */
export function cumulonimbus(t: Draw, x: number, base: number, w: number, h: number, sea: number, slant: number): void {
  rainCurtain(t, x + w * 0.05, base - 4, sea, w * 0.95, slant, 0.7);
  anvil(t, x + w * 0.2, base - h - w * 0.14, w * 1.9, h * 0.3);
  column(t, x, base, w, h);
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
    const half1 = 12 + pen.rng() * 16;
    shaft(t, [pt(top - half0, apex), pt(top + half0, apex), pt(foot + half1, horizon), pt(foot - half1, horizon)], apex, horizon + 30, PAPER_FILL, 0.01, 0.09);
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
  for (let k = 0; k < 14; k++) {
    const x = (k * W) / 14 + pen.jitter(24);
    const r = 14 + pen.rng() * 22;
    const cy = y + h * (0.75 + pen.rng() * 0.35);
    glow(t, x, cy, r * 1.3, r * 0.6, SLATE, 0.3);
    const lobe = oval(x, cy, r, r * 0.5, 20).slice(1, 10);
    if (pen.rng() < 0.6) pen.hair(lobe.slice(1, 7 + Math.floor(pen.rng() * 3)), 0.4, t.ink, FAR * 0.2);
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
    glow(t, px, py, h * (0.9 + env), h * 0.55 * (0.6 + env), SLATE_DARK, 0.24);
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
