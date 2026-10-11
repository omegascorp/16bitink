import type { BiomeId } from '../../level/biomes';
import type { MapLayout } from '../../scenes/map/layout';
import { MAP } from '../../scenes/map/layout';
import { islandPlans, seaRoutePath } from '../../scenes/map/plan';
import { createRng } from '../../logic/rng';
import { INK } from '../palette';
import { letter, type Span } from './context';
import { hexToRgb } from './colour';

/**
 * The open sea: watercolour washes in each island's sea colour, the
 * portolan's ruled rhumb lines, wave marks and depth soundings. Scattered
 * marks are seeded by world grid cell, so neighbouring chunks agree.
 */
const cellRng = (cx: number, cy: number, salt: number): (() => number) => createRng(((cx * 73856093) ^ (cy * 19349663) ^ salt) >>> 0);

/** Which island's sea x is in, and how far across the strait to the next one (0..1). */
export function seaBlend(layout: MapLayout, x: number): { i: number; t: number } {
  const rs = layout.regions;
  for (let i = 0; i < rs.length - 1; i++) {
    if (x <= rs[i]!.x1) return { i, t: 0 };
    if (x < rs[i + 1]!.x0) {
      const u = (x - rs[i]!.x1) / (rs[i + 1]!.x0 - rs[i]!.x1);
      return { i, t: u * u * (3 - 2 * u) };
    }
  }
  return { i: rs.length - 1, t: 0 };
}

function seaAlpha(layout: MapLayout, i: number): number {
  const b = layout.regions[i]!.beach;
  if (!b.built) return 0.16;
  return b.biome.id === 'moonlit' ? 0.62 : 0.42;
}

export function seaBase(ctx: CanvasRenderingContext2D, layout: MapLayout, span: Span): void {
  const w = span.x1 - span.x0;
  ctx.fillStyle = '#f5f0e1';
  ctx.fillRect(span.x0, 0, w, layout.height);
  const g = ctx.createLinearGradient(span.x0, 0, span.x1, 0);
  const rs = layout.regions;
  for (let k = 0; k <= 24; k++) {
    const { i, t } = seaBlend(layout, span.x0 + (w * k) / 24);
    const j = Math.min(rs.length - 1, i + 1);
    const a = hexToRgb(rs[i]!.beach.biome.sea);
    const b = hexToRgb(rs[j]!.beach.biome.sea);
    const mix = (m: number, n: number): number => Math.round(m + (n - m) * t);
    const alpha = seaAlpha(layout, i) + (seaAlpha(layout, j) - seaAlpha(layout, i)) * t;
    g.addColorStop(k / 24, `rgba(${mix(a[0], b[0])},${mix(a[1], b[1])},${mix(a[2], b[2])},${alpha.toFixed(3)})`);
  }
  ctx.fillStyle = g;
  ctx.fillRect(span.x0, 0, w, layout.height);
  // Deeper water towards the chart's edges.
  const deep = ctx.createLinearGradient(0, 0, 0, layout.height);
  deep.addColorStop(0, 'rgba(30,60,110,0.12)');
  deep.addColorStop(0.18, 'rgba(30,60,110,0)');
  deep.addColorStop(0.68, 'rgba(30,60,110,0)');
  deep.addColorStop(1, 'rgba(30,60,110,0.16)');
  ctx.fillStyle = deep;
  ctx.fillRect(span.x0, 0, w, layout.height);
  // Watercolour blooms: big soft patches of deeper tint, seeded per cell.
  for (let cx = Math.floor(span.x0 / 260) - 1; cx <= Math.ceil(span.x1 / 260); cx++) {
    const rng = cellRng(cx, 0, 11);
    for (let k = 0; k < 3; k++) {
      const x = cx * 260 + rng() * 260;
      const y = rng() * layout.height;
      const r = 50 + rng() * 90;
      ctx.save();
      ctx.globalAlpha = 0.05;
      ctx.fillStyle = '#1e3c6e';
      ctx.beginPath();
      ctx.ellipse(x, y, r * 1.6, r * 0.6, rng() * 0.4 - 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
}

/** Where the portolan's wind roses sit: the compass before the first island, and a few straits. */
export function windRoses(layout: MapLayout): { x: number; y: number; r: number }[] {
  const rs = layout.regions;
  const roses = [{ x: MAP.start * 0.3, y: 560, r: 76 }];
  for (const i of [1, 4, 7]) if (i + 1 < rs.length) roses.push({ x: (rs[i]!.x1 + rs[i + 1]!.x0) / 2, y: 470, r: 30 });
  return roses;
}

/** Rhumb lines: the ruled lines a portolan chart radiates from each wind rose, in ink, green and red. */
export function rhumbLines(ctx: CanvasRenderingContext2D, layout: MapLayout, span: Span): void {
  ctx.save();
  ctx.lineWidth = 0.6;
  for (const rose of windRoses(layout)) {
    const len = 1500;
    if (rose.x + len < span.x0 || rose.x - len > span.x1) continue;
    for (let k = 0; k < 32; k++) {
      const a = (k / 32) * Math.PI * 2;
      ctx.strokeStyle = k % 4 === 0 ? INK : k % 2 === 0 ? '#2f7a4a' : '#b3322b';
      ctx.globalAlpha = k % 4 === 0 ? 0.16 : 0.12;
      ctx.beginPath();
      ctx.moveTo(rose.x + Math.cos(a) * rose.r, rose.y + Math.sin(a) * rose.r);
      ctx.lineTo(rose.x + Math.cos(a) * len, rose.y + Math.sin(a) * len);
      ctx.stroke();
    }
  }
  ctx.restore();
}

/** Little wave marks over open water: a short arch here and there. */
export function waveMarks(ctx: CanvasRenderingContext2D, layout: MapLayout, span: Span, ink: (x: number) => string): void {
  const cell = 46;
  ctx.save();
  ctx.lineWidth = 0.8;
  ctx.lineCap = 'round';
  for (let cx = Math.floor(span.x0 / cell) - 1; cx <= Math.ceil(span.x1 / cell); cx++) {
    for (let cy = 0; cy < layout.height / cell; cy++) {
      const rng = cellRng(cx, cy, 5);
      if (rng() < 0.35) continue;
      const x = cx * cell + rng() * cell;
      const y = cy * cell + rng() * cell;
      if (y < 14 || y > layout.height - 14) continue;
      if (y > layout.topAt(x) - 24 && y < layout.coastAt(x) + 30) continue;
      const s = 4 + rng() * 4;
      ctx.strokeStyle = ink(x);
      ctx.globalAlpha = 0.28 + rng() * 0.15;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + s, y - 3, x + s * 2, y);
      if (rng() < 0.5) ctx.quadraticCurveTo(x + s * 3, y - 3, x + s * 4, y);
      ctx.stroke();
    }
  }
  ctx.restore();
}

/** What a sounding's bottom is, in a chart's shorthand. */
const BOTTOM: Readonly<Record<BiomeId, string>> = {
  atoll: 'co', dunes: 's', rockpool: 'rk', mangrove: 'm', basalt: 'bk s', kelp: 'wd', wreck: 'sh', harbour: 'm', frost: 'g', moonlit: 'co',
};

/** How far (x, y) is from any island's shore, near enough. */
function shoreDistance(layout: MapLayout, x: number, y: number): number {
  let best = Infinity;
  for (let dx = -160; dx <= 160; dx += 20) {
    const px = x + dx;
    const c = layout.coastAt(px);
    const t = layout.topAt(px);
    if (c - t < 1) continue;
    const dy = y > c ? y - c : y < t ? t - y : 0;
    best = Math.min(best, Math.hypot(dx, dy));
  }
  return best;
}

/** Depth soundings: little numbers scattered over the water, deeper away from land, with the bottom's shorthand now and then. */
export function soundings(ctx: CanvasRenderingContext2D, layout: MapLayout, span: Span, avoid: readonly { x: number; y: number; r: number }[], ink: (x: number) => string): void {
  const cw = 96;
  const ch = 84;
  const plans = islandPlans(layout);
  for (let cx = Math.floor(span.x0 / cw) - 1; cx <= Math.ceil(span.x1 / cw); cx++) {
    for (let cy = 0; cy < layout.height / ch; cy++) {
      const rng = cellRng(cx, cy, 23);
      if (rng() < 0.45) continue;
      const x = cx * cw + rng() * cw;
      const y = cy * ch + rng() * ch;
      if (y < 20 || y > layout.height - 24 || x < MAP.start * 0.75 || x > layout.width - MAP.start * 0.75) continue;
      const dist = shoreDistance(layout, x, y);
      if (dist < 46 || dist === Infinity) continue;
      if (avoid.some((o) => Math.hypot(x - o.x, y - o.y) < o.r)) continue;
      const { i } = seaBlend(layout, x);
      const plan = plans[i]!;
      if (Math.abs(x - plan.label.x) < plan.label.w / 2 + 50 && y < plan.label.y + plan.label.h / 2 + 12) continue;
      if (plan.islets.some((s) => s.shape.some((p) => Math.hypot(p.x - x, p.y - y) < 34))) continue;
      const depth = Math.round(Math.min(48, 2 + dist / 14 + rng() * 4));
      const note = rng() < 0.22 ? ` ${BOTTOM[layout.regions[i]!.beach.biome.id]}` : '';
      letter(ctx, `${depth}${note}`, x, y, { size: 13, color: ink(x), alpha: 0.5 });
    }
  }
}

/** Points along every sea route, for keeping drawings off them. */
export function routePoints(layout: MapLayout): { x: number; y: number; r: number }[] {
  const out: { x: number; y: number; r: number }[] = [];
  for (let i = 0; i < layout.regions.length - 1; i++) for (const p of seaRoutePath(layout, i).filter((_, k) => k % 3 === 0)) out.push({ x: p.x, y: p.y, r: 26 });
  return out;
}
