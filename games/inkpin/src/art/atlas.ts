import { createRng } from '../logic/rng';
import type { MapLayout, MapRegion } from '../scenes/map/layout';
import { GOLD, INK, MOSS, TEMPLE, TEMPLE_DARK } from './palette';
import { ellipse, Pen, type Pt } from './pen';
import { mix, rgba } from './wash';
import { paintDraftRuin } from './atlasDrafts';
import { paintVolcanoLands, paintVolcanoShrine } from './atlasVolcano';

/**
 * The Ink Atlas, the map Nib follows: an old page of cream paper with
 * foxing and a hand-ruled grid, a dotted trail winding up from ruin to
 * ruin, the built chapters painted in ink and wash and the rest still
 * pencil drafts. Painted in bands (see MapView), so everything here is
 * placed in world px and seeded by place, never by band.
 */

const PAGE = '#efe3c3';
const PAGE_DARK = '#d9c49a';
export const PENCIL = '#8a8578';
const TREE = '#5f8a46';
const TREE_DARK = '#3f6233';
const RIVER = '#8fbad6';

interface Stain {
  readonly x: number;
  readonly y: number;
  readonly r: number;
  readonly a: number;
}

/** The foxing and wash stains of the whole page, made once per layout. */
const stainCache = new WeakMap<MapLayout, Stain[]>();
function stains(layout: MapLayout): Stain[] {
  const cached = stainCache.get(layout);
  if (cached) return cached;
  const rng = createRng(17);
  const list: Stain[] = [];
  const n = Math.round(layout.height / 90);
  for (let i = 0; i < n; i++) list.push({ x: rng() * layout.width, y: rng() * layout.height, r: 40 + rng() * 160, a: 0.04 + rng() * 0.08 });
  stainCache.set(layout, list);
  return list;
}

/** Paints the page between world y0 and y0 + h (the context already maps world px). */
export function paintAtlasChunk(ctx: CanvasRenderingContext2D, layout: MapLayout, y0: number, h: number): void {
  const W = layout.width;
  const y1 = y0 + h;
  const pen = new Pen(ctx, 3 + Math.floor(y0 / 97), 0.6);
  ctx.fillStyle = PAGE;
  ctx.fillRect(0, y0, W, h);
  for (const s of stains(layout)) {
    if (s.y + s.r < y0 || s.y - s.r > y1) continue;
    const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r);
    g.addColorStop(0, rgba(PAGE_DARK, s.a));
    g.addColorStop(0.7, rgba(PAGE_DARK, s.a * 0.5));
    g.addColorStop(1, rgba(PAGE_DARK, 0));
    ctx.fillStyle = g;
    ctx.fillRect(s.x - s.r, s.y - s.r, s.r * 2, s.r * 2);
  }
  // Darker, foxed edges of the page.
  for (const [x, dir] of [[0, 1], [W, -1]] as const) {
    const g = ctx.createLinearGradient(x, 0, x + dir * 90, 0);
    g.addColorStop(0, rgba('#a88a5a', 0.35));
    g.addColorStop(1, rgba('#a88a5a', 0));
    ctx.fillStyle = g;
    ctx.fillRect(dir > 0 ? x : x - 90, y0, 90, h);
  }
  paintGrid(ctx, W, y0, y1);
  paintFibres(ctx, layout, y0, y1);
  for (const r of layout.regions) {
    if (r.bottom + 200 < y0 || r.top - 200 > y1) continue;
    if (!r.chapter.built) paintSketches(pen, layout, r);
    else if (r.index === 1) paintVolcanoLands(ctx, pen, layout, r);
    else paintJungle(ctx, pen, layout, r);
  }
  paintTrail(ctx, layout, y0, y1);
  for (const r of layout.regions) {
    // The volcano's plume reaches higher than the other ruins.
    if (r.ruin.y + 160 < y0 || r.ruin.y - 300 > y1) continue;
    if (!r.chapter.built) paintDraftRuin(pen, r.index, r.ruin);
    else if (r.index === 1) paintVolcanoShrine(ctx, pen, r.ruin);
    else paintTemple(ctx, pen, r.ruin);
  }
  // Inside what a phone shows of the page (about 760 px across its middle).
  const compass = { x: W - 220, y: layout.height - 150 };
  if (compass.y + 90 > y0 && compass.y - 90 < y1) paintCompass(ctx, pen, compass);
}

/** Paper grain: fine flecks and short fibres, and the creases where the page was folded. */
function paintFibres(ctx: CanvasRenderingContext2D, layout: MapLayout, y0: number, y1: number): void {
  const W = layout.width;
  // Seeded per 256 px band of the page, so bands baked apart still match.
  for (let band = Math.floor(y0 / 256); band * 256 < y1; band++) {
    const rng = createRng(4000 + band);
    for (let i = 0; i < 260; i++) {
      const x = rng() * W;
      const y = band * 256 + rng() * 256;
      const dark = rng() < 0.6;
      ctx.fillStyle = dark ? rgba('#8a6f45', 0.08 + rng() * 0.1) : rgba('#fffaf0', 0.35);
      if (rng() < 0.7) ctx.fillRect(x, y, 1 + rng() * 1.5, 1 + rng() * 1.5);
      else {
        ctx.strokeStyle = ctx.fillStyle;
        ctx.lineWidth = 0.6;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(x + (rng() - 0.5) * 8, y + (rng() - 0.5) * 8, x + (rng() - 0.5) * 16, y + (rng() - 0.5) * 6);
        ctx.stroke();
      }
    }
  }
  // Fold creases: a light ridge beside a soft shadow, down the middle and across every so often.
  const crease = (x0: number, ya: number, x1: number, yb: number): void => {
    ctx.save();
    ctx.lineWidth = 3;
    ctx.strokeStyle = rgba('#8a6f45', 0.1);
    ctx.beginPath();
    ctx.moveTo(x0 + 1.5, ya + 1.5);
    ctx.lineTo(x1 + 1.5, yb + 1.5);
    ctx.stroke();
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = rgba('#fffaf0', 0.5);
    ctx.beginPath();
    ctx.moveTo(x0, ya);
    ctx.lineTo(x1, yb);
    ctx.stroke();
    ctx.restore();
  };
  crease(W / 2, y0, W / 2, y1);
  for (let y = Math.ceil(y0 / 1400) * 1400; y < y1; y += 1400) crease(0, y, W, y);
}

/** A faint hand-ruled grid of the old surveyor. */
function paintGrid(ctx: CanvasRenderingContext2D, W: number, y0: number, y1: number): void {
  ctx.save();
  ctx.strokeStyle = rgba('#8a7a5a', 0.13);
  ctx.lineWidth = 1;
  for (let x = 125; x < W; x += 250) {
    ctx.beginPath();
    ctx.moveTo(x, y0);
    ctx.lineTo(x, y1);
    ctx.stroke();
  }
  for (let y = Math.ceil(y0 / 250) * 250; y < y1; y += 250) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }
  ctx.restore();
}

/** The trail: ink dashes through built chapters, pencil dashes through the drafts. */
function paintTrail(ctx: CanvasRenderingContext2D, layout: MapLayout, y0: number, y1: number): void {
  const { pts } = layout.path;
  // Inked through the built chapters, and from the first one down to the page's foot, where Nib sets out.
  const built = (y: number): boolean => layout.regions.some((r) => r.chapter.built && y >= r.top - 40 && (r.index === 0 || y <= r.bottom + 60));
  ctx.save();
  ctx.lineCap = 'round';
  for (let i = 0; i + 3 < pts.length; i += 5) {
    const a = pts[i]!;
    const b = pts[i + 3]!;
    if (Math.max(a.y, b.y) < y0 - 4 || Math.min(a.y, b.y) > y1 + 4) continue;
    const inked = built(a.y);
    ctx.strokeStyle = inked ? rgba(INK, 0.85) : rgba(PENCIL, 0.6);
    ctx.lineWidth = inked ? 4 : 2.5;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  ctx.restore();
}

/** True when a spot is clear of the trail by `gap` px (sampled). */
export function offTrail(layout: MapLayout, x: number, y: number, gap: number): boolean {
  const pts = layout.path.pts;
  for (let i = 0; i < pts.length; i += 3) {
    const p = pts[i]!;
    if (Math.abs(p.y - y) < gap && Math.hypot(p.x - x, p.y - y) < gap) return false;
  }
  return true;
}

/** The jungle around the temple's chapter: a river and clumps of painted trees, clear of the trail. */
function paintJungle(ctx: CanvasRenderingContext2D, pen: Pen, layout: MapLayout, r: MapRegion): void {
  const rng = createRng(100 + r.index);
  // A river winding down the left of the band.
  const river: Pt[] = [];
  // It runs off the page at the foot of the first chapter, and fades into the next band at the top.
  const foot = r.index === 0 ? layout.height + 40 : r.bottom;
  for (let y = r.top - 120; y <= foot; y += 30) river.push({ x: 150 + Math.sin(y / 170) * 30, y });
  const along = (w: number, color: string): void => {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = color;
    ctx.lineWidth = w;
    ctx.beginPath();
    river.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.stroke();
    ctx.restore();
  };
  // Muddy banks, then the water: a deep middle under a paler edge, and glints.
  along(46, rgba('#a8936a', 0.35));
  along(32, rgba(RIVER, 0.85));
  along(16, rgba(mix(RIVER, '#3f6f99', 0.45), 0.6));
  pen.hair(river.map((p) => ({ x: p.x - 16, y: p.y })), 1.3, INK, 0.55);
  pen.hair(river.map((p) => ({ x: p.x + 16, y: p.y })), 1.3, INK, 0.55);
  for (let k = 2; k < river.length - 2; k += 3) {
    const p = river[k]!;
    pen.hair([{ x: p.x - 4, y: p.y }, { x: p.x + 3, y: p.y + 6 }], 1.1, '#ffffff', 0.7);
    // Reeds on the banks.
    const side = k % 2 ? -1 : 1;
    for (let r = 0; r < 3; r++) pen.hair([{ x: p.x + side * (18 + r * 3), y: p.y + 6 }, { x: p.x + side * (20 + r * 4), y: p.y - 8 - r * 3 }], 0.9, TREE_DARK, 0.75);
  }
  // Undergrowth: soft green washes and fern scribbles all over the band.
  for (let i = 0; i < 60; i++) {
    const x = rng() * layout.width;
    const y = r.top + rng() * (r.bottom - r.top);
    if (!offTrail(layout, x, y, 50)) continue;
    const rr = 30 + rng() * 60;
    const g = ctx.createRadialGradient(x, y, 0, x, y, rr);
    g.addColorStop(0, rgba(TREE, 0.16));
    g.addColorStop(1, rgba(TREE, 0));
    ctx.fillStyle = g;
    ctx.fillRect(x - rr, y - rr, rr * 2, rr * 2);
    if (rng() < 0.5) for (let f = 0; f < 4; f++) pen.hair([{ x, y }, { x: x + (f - 1.5) * 6, y: y - 10 - rng() * 6 }], 0.9, TREE_DARK, 0.5);
  }
  for (let i = 0; i < 120; i++) {
    const x = 40 + rng() * (layout.width - 80);
    const y = r.top + rng() * (r.bottom - r.top);
    if (!offTrail(layout, x, y, 80) || Math.hypot(x - r.ruin.x, y - r.ruin.y) < 150 || Math.abs(x - (150 + Math.sin(y / 170) * 30)) < 34) continue;
    paintTree(ctx, pen, x, y, 14 + rng() * 12, rng);
  }
}

function paintTree(ctx: CanvasRenderingContext2D, pen: Pen, x: number, y: number, s: number, rng: () => number): void {
  if (rng() < 0.35) {
    // A palm: a curved trunk and a fan of fronds.
    const top = { x: x + s * 0.4, y: y - s * 1.8 };
    pen.stroke([{ x, y }, { x: x + s * 0.3, y: y - s }, top], 2.2, mix('#8a6a44', INK, 0.2), 0.95, false);
    for (let k = 0; k < 6; k++) {
      const a = -Math.PI + (k / 5) * Math.PI + (rng() - 0.5) * 0.2;
      const tip = { x: top.x + Math.cos(a) * s * 1.1, y: top.y + Math.sin(a) * s * 0.6 + s * 0.3 };
      const leaf = [top, { x: (top.x + tip.x) / 2, y: (top.y + tip.y) / 2 - s * 0.25 }, tip, { x: (top.x + tip.x) / 2, y: (top.y + tip.y) / 2 + s * 0.1 }];
      pen.fill(leaf, k % 2 ? TREE : mix(TREE, '#ffffff', 0.15), 1);
      pen.hair([top, tip], 0.8, INK, 0.7);
    }
    return;
  }
  // A jungle tree: one canopy of lobes washed in together, lit from the top left, with ink only
  // on the lobes' upper edges and hatching in the shade underneath.
  const lobes = 3 + Math.floor(rng() * 4);
  const parts: { x: number; y: number; r: number }[] = [];
  for (let k = 0; k < lobes; k++) parts.push({ x: x + (rng() - 0.5) * s * 1.3, y: y - s * 0.85 + (rng() - 0.5) * s * 0.7, r: s * (0.45 + rng() * 0.3) });
  ctx.fillStyle = rgba('#3d3226', 0.2);
  ctx.beginPath();
  ctx.ellipse(x + s * 0.2, y + 3, s * 1.1, s * 0.28, 0, 0, Math.PI * 2);
  ctx.fill();
  pen.stroke([{ x: x - 1, y }, { x: x + 1, y: y - s * 0.6 }], 2.6, '#5b3d24', 1, false);
  const g = ctx.createRadialGradient(x - s * 0.5, y - s * 1.3, s * 0.1, x, y - s * 0.7, s * 1.5);
  g.addColorStop(0, mix(TREE, '#e8f0b0', 0.35));
  g.addColorStop(0.55, TREE);
  g.addColorStop(1, TREE_DARK);
  ctx.fillStyle = g;
  ctx.beginPath();
  for (const p of parts) {
    ctx.moveTo(p.x + p.r, p.y);
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
  }
  ctx.fill();
  for (const p of parts) {
    // Only the upper part of each lobe gets a line, and only where it isn't inside another lobe.
    const arc: Pt[] = [];
    for (let a = Math.PI * 1.05; a <= Math.PI * 1.95; a += 0.15) {
      const q = { x: p.x + Math.cos(a) * p.r, y: p.y + Math.sin(a) * p.r };
      if (parts.some((o) => o !== p && Math.hypot(q.x - o.x, q.y - o.y) < o.r - 1)) {
        if (arc.length > 1) pen.hair(arc.splice(0), 1.1, INK, 0.7);
        arc.length = 0;
      } else arc.push(q);
    }
    if (arc.length > 1) pen.hair(arc, 1.1, INK, 0.7);
  }
  // Shade under the canopy, hatched.
  for (const p of parts) pen.hatch(ellipse(p.x + p.r * 0.2, p.y + p.r * 0.45, p.r * 0.75, p.r * 0.4, 12), 3.2, 0.9, 0.6, { color: TREE_DARK, alpha: 0.55 });
}

/** A few pencil marks for a chapter still being drawn: hills and scribbled trees. */
function paintSketches(pen: Pen, layout: MapLayout, r: MapRegion): void {
  const rng = createRng(300 + r.index);
  for (let i = 0; i < 14; i++) {
    const x = 60 + rng() * (layout.width - 120);
    const y = r.top + rng() * (r.bottom - r.top);
    if (!offTrail(layout, x, y, 90) || Math.hypot(x - r.ruin.x, y - r.ruin.y) < 160) continue;
    const w = 30 + rng() * 50;
    pen.hair([{ x: x - w, y }, { x: x - w * 0.3, y: y - w * 0.45 }, { x: x + w * 0.2, y: y - w * 0.2 }, { x: x + w, y }], 1.2, PENCIL, 0.55);
  }
}

/** The Jungle Temple, painted: a stepped stone pyramid with a shrine on top, vines and palms. */
function paintTemple(ctx: CanvasRenderingContext2D, pen: Pen, at: Pt): void {
  const { x, y } = at;
  ctx.fillStyle = rgba('#3d3226', 0.2);
  ctx.beginPath();
  ctx.ellipse(x, y + 62, 130, 18, 0, 0, Math.PI * 2);
  ctx.fill();
  const tiers = [{ w: 220, h: 34 }, { w: 172, h: 32 }, { w: 128, h: 30 }, { w: 86, h: 28 }];
  let base = y + 60;
  for (const [i, t] of tiers.entries()) {
    const shape = [{ x: x - t.w / 2, y: base }, { x: x - t.w / 2 + 8, y: base - t.h }, { x: x + t.w / 2 - 8, y: base - t.h }, { x: x + t.w / 2, y: base }];
    const g = ctx.createLinearGradient(x - t.w / 2, 0, x + t.w / 2, 0);
    g.addColorStop(0, mix(TEMPLE, '#ffffff', 0.25));
    g.addColorStop(1, mix(TEMPLE_DARK, '#5a4a38', 0.25));
    pen.fill(shape, TEMPLE, 1);
    ctx.fillStyle = g;
    ctx.beginPath();
    shape.forEach((p, k) => (k === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.closePath();
    ctx.fill();
    // Block joints.
    for (let bx = x - t.w / 2 + 22; bx < x + t.w / 2 - 10; bx += 26) pen.hair([{ x: bx, y: base - 2 }, { x: bx, y: base - t.h + 3 }], 0.7, INK, 0.4);
    inkLines(ctx, shape, 1.6, true);
    if (i % 2 === 0) pen.dot(x - t.w / 2 + 20, base - t.h / 2, 5, rgba(MOSS, 0.8));
    base -= t.h;
  }
  // The stair up the middle, and the shrine with its dark doorway.
  const stair = [{ x: x - 16, y: y + 60 }, { x: x - 10, y: base }, { x: x + 10, y: base }, { x: x + 16, y: y + 60 }];
  pen.fill(stair, mix(TEMPLE, TEMPLE_DARK, 0.4), 1);
  for (let sy = y + 54; sy > base; sy -= 7) pen.hair([{ x: x - 14, y: sy }, { x: x + 14, y: sy }], 0.7, INK, 0.5);
  inkLines(ctx, stair, 1.2, false);
  const shrine = [{ x: x - 30, y: base }, { x: x - 30, y: base - 34 }, { x: x, y: base - 52 }, { x: x + 30, y: base - 34 }, { x: x + 30, y: base }];
  pen.fill(shrine, mix(TEMPLE, '#ffffff', 0.1), 1);
  pen.fill([{ x: x - 10, y: base }, { x: x - 10, y: base - 22 }, { x: x + 10, y: base - 22 }, { x: x + 10, y: base }], '#2a2420', 1);
  inkLines(ctx, shrine, 1.6, true);
  // A glint of gold in the doorway: treasure inside.
  pen.dot(x, base - 8, 2.4, GOLD);
  // Vines down the left flank, and two palms beside it.
  pen.hair([{ x: x - 70, y: base + 60 }, { x: x - 64, y: base + 90 }, { x: x - 78, y: base + 120 }], 1.6, TREE_DARK, 0.9);
  const rng = createRng(9);
  paintTree(ctx, pen, x - 145, y + 62, 26, () => 0.1);
  paintTree(ctx, pen, x + 150, y + 64, 24, rng);
}

/** Straight ink lines through the points (masonry wants hard corners, which the pen would round off). */
export function inkLines(ctx: CanvasRenderingContext2D, pts: readonly Pt[], width: number, closed: boolean): void {
  ctx.save();
  ctx.strokeStyle = rgba(INK, 0.92);
  ctx.lineWidth = width;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.beginPath();
  pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  if (closed) ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

/** A compass rose in the page's corner. */
function paintCompass(ctx: CanvasRenderingContext2D, pen: Pen, at: Pt): void {
  const { x, y } = at;
  pen.circle(x, y, 62, 1.2, INK);
  pen.circle(x, y, 54, 0.8, INK);
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2 - Math.PI / 2;
    const long = k % 2 === 0;
    const len = long ? 70 : 42;
    const side = a + Math.PI / 2;
    const tip = { x: x + Math.cos(a) * len, y: y + Math.sin(a) * len };
    const w = long ? 10 : 7;
    const l = { x: x + Math.cos(side) * w, y: y + Math.sin(side) * w };
    const r = { x: x - Math.cos(side) * w, y: y - Math.sin(side) * w };
    pen.fill([{ x, y }, l, tip], long ? INK : mix(INK, '#ffffff', 0.5), 0.85);
    pen.fill([{ x, y }, r, tip], long ? mix(INK, '#ffffff', 0.55) : mix(INK, '#ffffff', 0.75), 0.85);
    pen.stroke([l, tip, r], 0.8, INK, 0.9, false);
  }
  ctx.save();
  ctx.fillStyle = INK;
  ctx.font = '700 22px Caveat, cursive';
  ctx.textAlign = 'center';
  ctx.fillText('N', x, y - 78);
  ctx.restore();
}
