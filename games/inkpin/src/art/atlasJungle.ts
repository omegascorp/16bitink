import { createRng } from '../logic/rng';
import type { MapRegion } from '../scenes/map/layout';
import { groundWashes, Layer, type Plan, regionSpan, regionWeight } from './atlasPlace';
import { blob, contourHatch, deform, glow, type Rng, trace, wash } from './atlasWash';
import { INK } from './palette';
import { Pen, type Pt } from './pen';
import { mix, rgba } from './wash';

/**
 * The jungle of the Ink Atlas: green washes over the ground, a river down
 * the left, forests massed along the page's sides and in the trail's
 * bends, hills with contour hatching, and lone palms and bushes between.
 */

export const TREE = '#5f8a46';
export const TREE_DARK = '#3f6233';
const RIVER = '#8fbad6';
/** Greens a canopy is washed in: yellow-lit, mid, blue-deep. */
const GREENS = ['#6f9a4a', '#5f8a46', '#557f4c', '#7a9a44', '#4d7a48'] as const;
const GROUND = ['#8fb064', '#a7bf6e', '#6f9a52', '#7aa05a'] as const;

export function riverX(y: number): number {
  return 150 + Math.sin(y / 170) * 30;
}

/** Clear of the river (which runs only through the first chapter's land, and a little way into the next). */
export function riverKeepOut(r: MapRegion): (x: number, y: number, gap: number) => boolean {
  return (x, y, gap) => r.index !== 0 || y < r.top - 100 || Math.abs(x - riverX(y)) > gap;
}

const pick = <T>(rng: Rng, list: readonly T[]): T => list[Math.floor(rng() * list.length)]!;

export function planJungle(plan: Plan, r: MapRegion): void {
  const { layout, clear } = plan;
  const span = regionSpan(layout, r);
  const rng = createRng(100 + r.index);
  const weight = (y: number): number => regionWeight(layout, r, y);
  groundWashes(plan, r, GROUND, 0.15, rng);
  if (r.index === 0) plan.add(Layer.Water, layout.height, r.top - 140, layout.height, (ctx, seed) => paintRiver(ctx, new Pen(ctx, seed, 0.6), r.top - 120, layout.height + 40));
  const offRiver = riverKeepOut(r);
  // Hills, under the forests.
  for (let i = 0; i < 9; i++) {
    const x = 60 + rng() * (layout.width - 120);
    const y = span.top + rng() * (span.bottom - span.top);
    const w = 70 + rng() * 60;
    const h = 30 + rng() * 22;
    if (rng() > weight(y) || !clear.ok(x, y, w * 0.7, h, 30) || !offRiver(x, y, w + 30)) continue;
    plan.add(Layer.Detail, y, y - h - 10, y + 12, (ctx, seed) => hill(ctx, new Pen(ctx, seed, 0.6), x, y, w, h, createRng(seed)));
  }
  // Forests: dense clumps hugging the page's sides and filling the trail's bends.
  for (let i = 0; i < 34; i++) {
    const side = i % 3 === 2 ? rng() : i % 2 ? rng() * 0.28 : 0.72 + rng() * 0.28;
    const cx = 40 + side * (layout.width - 80);
    const cy = span.top + rng() * (span.bottom - span.top);
    if (rng() > weight(cy)) continue;
    forest(plan, rng, cx, cy, 70 + rng() * 80, 45 + rng() * 45, weight, offRiver);
  }
  // Lone trees, palms and bushes between.
  for (let i = 0; i < 150; i++) {
    const x = 30 + rng() * (layout.width - 60);
    const y = span.top + rng() * (span.bottom - span.top);
    const s = 11 + rng() * 10;
    const kind = rng();
    if (rng() > weight(y) || !clear.ok(x, y, s, s * 2, 40) || !offRiver(x, y, 36)) continue;
    if (kind < 0.3) addTree(plan, x, y, s, 'palm');
    else if (kind < 0.55) addTree(plan, x, y, s * 0.7, 'bush');
    else if (kind < 0.6) addTree(plan, x, y, s * 1.1, 'kapok');
    else if (kind < 0.85) plan.add(Layer.Detail, y, y - 16, y + 4, (ctx, seed) => fern(new Pen(ctx, seed, 0.5), x, y, createRng(seed)));
    else addTree(plan, x, y, s, 'broad');
  }
}

/** A forest: a deep green floor, then trees packed in, the tall ones in its heart. */
function forest(plan: Plan, rng: Rng, cx: number, cy: number, rx: number, ry: number, weight: (y: number) => number, offRiver: (x: number, y: number, gap: number) => boolean): void {
  const { clear } = plan;
  const spots: Pt[] = [];
  const n = Math.round((rx * ry) / 260);
  for (let k = 0; k < n; k++) {
    const a = rng() * Math.PI * 2;
    const d = Math.sqrt(rng());
    const x = cx + Math.cos(a) * rx * d;
    const y = cy + Math.sin(a) * ry * d;
    if (rng() > weight(y) * 1.2 || !clear.ok(x, y, 14, 30, 34) || !offRiver(x, y, 40)) continue;
    if (spots.some((p) => Math.hypot(p.x - x, (p.y - y) * 1.6) < 15)) continue;
    spots.push({ x, y });
  }
  if (spots.length < 4) return;
  // The forest floor, under where the trees actually stand.
  const xs = spots.map((p) => p.x);
  const ys = spots.map((p) => p.y);
  const fx = (Math.min(...xs) + Math.max(...xs)) / 2;
  const fy = (Math.min(...ys) + Math.max(...ys)) / 2 - 8;
  const fw = (Math.max(...xs) - Math.min(...xs)) / 2 + 22;
  const fh = (Math.max(...ys) - Math.min(...ys)) / 2 + 18;
  const fc = rng() < 0.5 ? '#4d7a3e' : '#5a7f3a';
  plan.add(Layer.Detail, fy, fy - fh - 30, fy + fh + 30, (ctx, seed) => {
    const r2 = createRng(seed);
    for (const p of spots) glow(ctx, p.x, p.y - 8, 34, '#3f6233', 0.07);
    wash(ctx, r2, blob(r2, fx, fy, fw, fh, 12, 0.35), fc, 0.2, 2, 0.4);
  });
  for (const p of spots) {
    const d = Math.hypot((p.x - cx) / rx, (p.y - cy) / ry);
    const roll = rng();
    const s = (12 + rng() * 9) * (1.15 - d * 0.35);
    addTree(plan, p.x, p.y, s, d < 0.45 && roll < 0.22 ? 'kapok' : roll < 0.12 ? 'palm' : d > 0.8 && roll < 0.4 ? 'bush' : 'broad');
  }
}

export type TreeKind = 'broad' | 'palm' | 'kapok' | 'bush';

function addTree(plan: Plan, x: number, y: number, s: number, kind: TreeKind): void {
  const tall = kind === 'kapok' ? 3.2 : kind === 'palm' ? 2.3 : kind === 'bush' ? 1.2 : 1.9;
  plan.add(Layer.Standing, y, y - s * tall - 6, y + 8, (ctx, seed) => paintTree(ctx, new Pen(ctx, seed, 0.5), x, y, s, kind, createRng(seed)));
}

/** One tree of the jungle, by kind. */
export function paintTree(ctx: CanvasRenderingContext2D, pen: Pen, x: number, y: number, s: number, kind: TreeKind, rng: Rng): void {
  if (kind === 'palm') return palm(ctx, pen, x, y, s, rng);
  ctx.fillStyle = rgba('#3d3226', 0.2);
  ctx.beginPath();
  ctx.ellipse(x + s * 0.25, y + 2, s * (kind === 'kapok' ? 1.3 : 1.05), s * 0.26, 0, 0, Math.PI * 2);
  ctx.fill();
  const green = pick(rng, GREENS);
  const parts: { x: number; y: number; r: number }[] = [];
  if (kind === 'bush') {
    const n = 2 + Math.floor(rng() * 2);
    for (let k = 0; k < n; k++) parts.push({ x: x + (k - (n - 1) / 2) * s * 0.75 + (rng() - 0.5) * s * 0.3, y: y - s * 0.4 - rng() * s * 0.2, r: s * (0.45 + rng() * 0.2) });
  } else if (kind === 'kapok') {
    // A tall emergent: a pale trunk with buttress roots, and a broad flat crown.
    const top = y - s * 2.3;
    pen.stroke([{ x: x - s * 0.25, y }, { x: x - 1, y: y - s * 0.3 }, { x: x, y: top + s * 0.2 }], 2.6, '#7a5a3a', 1, false);
    pen.hair([{ x: x + s * 0.3, y: y + 1 }, { x: x + 1, y: y - s * 0.35 }], 1.4, '#5b3d24', 0.9);
    pen.hair([{ x: x - 2, y: top + s * 0.5 }, { x: x - s * 0.5, y: top + s * 0.1 }], 1.2, '#5b3d24', 0.9);
    pen.hair([{ x: x + 1, y: top + s * 0.6 }, { x: x + s * 0.55, y: top + s * 0.15 }], 1.2, '#5b3d24', 0.9);
    const n = 5 + Math.floor(rng() * 2);
    for (let k = 0; k < n; k++) parts.push({ x: x + (k / (n - 1) - 0.5) * s * 2.3 + (rng() - 0.5) * s * 0.3, y: top - (1 - Math.abs(k / (n - 1) - 0.5) * 2) * s * 0.3 + (rng() - 0.5) * s * 0.2, r: s * (0.4 + rng() * 0.15) });
  } else {
    pen.stroke([{ x: x - 1, y }, { x: x + 1, y: y - s * 0.6 }], 2.6, '#5b3d24', 1, false);
    const lobes = 3 + Math.floor(rng() * 4);
    for (let k = 0; k < lobes; k++) parts.push({ x: x + (rng() - 0.5) * s * 1.3, y: y - s * 0.95 + (rng() - 0.5) * s * 0.7, r: s * (0.45 + rng() * 0.3) });
  }
  canopy(ctx, pen, parts, green);
}

/** A canopy of round lobes washed in together, lit from the top left, inked on the lit rims, hatched in the shade. */
function canopy(ctx: CanvasRenderingContext2D, pen: Pen, parts: readonly { x: number; y: number; r: number }[], green: string): void {
  const xs = parts.map((p) => p.x);
  const ys = parts.map((p) => p.y);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const R = Math.max(...parts.map((p) => p.r));
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  const span = Math.max(x1 - x0, y1 - y0) / 2 + R;
  const g = ctx.createRadialGradient(cx - span * 0.45, cy - span * 0.55, span * 0.1, cx, cy, span * 1.25);
  g.addColorStop(0, mix(green, '#eef2b8', 0.4));
  g.addColorStop(0.5, green);
  g.addColorStop(1, mix(green, '#1f3a2a', 0.45));
  const union = (): void => {
    ctx.beginPath();
    for (const p of parts) {
      ctx.moveTo(p.x + p.r, p.y);
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    }
  };
  ctx.fillStyle = g;
  union();
  ctx.fill();
  // Shade: a few hatch strokes across the lower right of the canopy, clipped to it.
  ctx.save();
  union();
  ctx.clip();
  const d = span * 2;
  for (let k = -3; k <= 4; k++) {
    const ox = cx + k * 3.6 + span * 0.25;
    const oy = cy + span * 0.35;
    pen.hair([{ x: ox - d * 0.18, y: oy + d * 0.22 }, { x: ox + d * 0.2, y: oy - d * 0.1 }], 0.8, mix(green, '#13241a', 0.6), 0.5);
  }
  ctx.restore();
  for (const p of parts) {
    // Only the upper part of each lobe gets a line, and only where it isn't inside another lobe.
    const arc: Pt[] = [];
    for (let a = Math.PI * 1.0; a <= Math.PI * 1.9; a += 0.16) {
      const q = { x: p.x + Math.cos(a) * p.r, y: p.y + Math.sin(a) * p.r };
      if (parts.some((o) => o !== p && Math.hypot(q.x - o.x, q.y - o.y) < o.r - 1)) {
        if (arc.length > 1) pen.hair(arc.splice(0), 1.05, INK, 0.7);
        arc.length = 0;
      } else arc.push(q);
    }
    if (arc.length > 1) pen.hair(arc, 1.05, INK, 0.7);
  }
  // A highlight dab on the lit side.
  const top = parts.reduce((a, b) => (b.y - b.r < a.y - a.r ? b : a));
  pen.hair([{ x: top.x - top.r * 0.5, y: top.y - top.r * 0.35 }, { x: top.x - top.r * 0.1, y: top.y - top.r * 0.6 }], 1.6, '#f4f6c8', 0.45);
}

function palm(ctx: CanvasRenderingContext2D, pen: Pen, x: number, y: number, s: number, rng: Rng): void {
  const lean = rng() < 0.5 ? -1 : 1;
  const top = { x: x + lean * s * 0.4, y: y - s * 1.8 };
  ctx.fillStyle = rgba('#3d3226', 0.18);
  ctx.beginPath();
  ctx.ellipse(x + s * 0.3, y + 1, s * 0.8, s * 0.18, 0, 0, Math.PI * 2);
  ctx.fill();
  pen.stroke([{ x, y }, { x: x + lean * s * 0.1, y: y - s }, top], 2.2, mix('#8a6a44', INK, 0.2), 0.95, false);
  const green = pick(rng, GREENS);
  for (let k = 0; k < 7; k++) {
    const a = -Math.PI + (k / 6) * Math.PI + (rng() - 0.5) * 0.25;
    const tip = { x: top.x + Math.cos(a) * s * 1.1, y: top.y + Math.sin(a) * s * 0.5 + s * 0.4 };
    const mid = { x: (top.x + tip.x) / 2, y: (top.y + tip.y) / 2 - s * 0.28 };
    const leaf = [top, mid, tip, { x: mid.x, y: mid.y + s * 0.16 }];
    pen.fill(leaf, k % 2 ? green : mix(green, '#f0f0c0', 0.25), 1);
    pen.hair([top, mid, tip], 0.8, INK, 0.7);
  }
}

/** A fern: a fan of arching fronds. */
function fern(pen: Pen, x: number, y: number, rng: Rng): void {
  const n = 4 + Math.floor(rng() * 3);
  for (let k = 0; k < n; k++) {
    const a = -Math.PI * (0.15 + (k / (n - 1)) * 0.7);
    const l = 9 + rng() * 6;
    const tip = { x: x + Math.cos(a) * l, y: y + Math.sin(a) * l * 0.8 };
    pen.hair([{ x, y }, { x: (x + tip.x) / 2, y: Math.min(y, tip.y) - 3 }, tip], 1.1, k % 2 ? '#3f6233' : '#557f4c', 0.8);
  }
}

/** A rounded hill: a green glaze, lit on the left, contour-hatched on the right. */
function hill(ctx: CanvasRenderingContext2D, pen: Pen, x: number, y: number, w: number, h: number, rng: Rng): void {
  const ridge: Pt[] = [];
  for (let k = 0; k <= 14; k++) {
    const t = k / 14;
    ridge.push({ x: x - w + 2 * w * t, y: y - h * Math.pow(Math.sin(Math.PI * t), 0.85) * (1 + (rng() - 0.5) * 0.08) });
  }
  const body = [...ridge, { x: x + w * 0.6, y: y + 5 }, { x: x - w * 0.6, y: y + 5 }];
  wash(ctx, rng, body, '#6f9a52', 0.22, 2, 0.2);
  const shade = deform(rng, [...ridge.slice(7), { x: x + w * 0.5, y: y + 4 }, { x: x + w * 0.05, y: y + 2 }], 1, 0.1);
  ctx.save();
  ctx.globalAlpha = 0.16;
  ctx.fillStyle = '#2f4f2c';
  trace(ctx, shade);
  ctx.fill();
  ctx.restore();
  pen.hair(ridge.slice(1, -1), 1.1, INK, 0.5);
  contourHatch(pen, x, y, w, h, '#2f4f2c', 0.55, rng);
}

/** The river: muddy banks, the water deep in the middle and pale at the edges, glints, and reeds. */
function paintRiver(ctx: CanvasRenderingContext2D, pen: Pen, from: number, to: number): void {
  const river: Pt[] = [];
  for (let y = from; y <= to; y += 30) river.push({ x: riverX(y), y });
  const along = (w: number, color: string): void => {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = color;
    ctx.lineWidth = w;
    trace(ctx, river, false);
    ctx.stroke();
    ctx.restore();
  };
  along(54, rgba('#8a9a5a', 0.25));
  along(42, rgba('#a8936a', 0.35));
  along(32, rgba(RIVER, 0.85));
  along(16, rgba(mix(RIVER, '#3f6f99', 0.45), 0.6));
  pen.hair(river.map((p) => ({ x: p.x - 16, y: p.y })), 1.3, INK, 0.55);
  pen.hair(river.map((p) => ({ x: p.x + 16, y: p.y })), 1.3, INK, 0.55);
  for (let k = 2; k < river.length - 2; k += 3) {
    const p = river[k]!;
    pen.hair([{ x: p.x - 4, y: p.y }, { x: p.x + 3, y: p.y + 6 }], 1.1, '#ffffff', 0.7);
    const side = k % 2 ? -1 : 1;
    for (let r = 0; r < 3; r++) pen.hair([{ x: p.x + side * (18 + r * 3), y: p.y + 6 }, { x: p.x + side * (20 + r * 4), y: p.y - 8 - r * 3 }], 0.9, TREE_DARK, 0.75);
  }
}
