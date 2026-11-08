import { createRng } from '../logic/rng';
import { acrossPage, MAP, perWidth, type MapLayout } from '../scenes/map/layout';
import { GOLD, INK, MOSS, TEMPLE, TEMPLE_DARK } from './palette';
import { Pen, type Pt } from './pen';
import { mix, rgba } from './wash';
import { paintDraftRuin, planDrafts } from './atlasDrafts';
import { paintTree, planJungle, riverKeepOut, TREE_DARK } from './atlasJungle';
import { biomeOf, Clearance, type Feature, Plan } from './atlasPlace';
import { paintTombShrine, planTomb, wadiKeepOut } from './atlasTomb';
import { lavaKeepOut, paintVolcanoShrine, planVolcano } from './atlasVolcano';

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
  const n = perWidth(layout, Math.round(layout.height / 90));
  for (let i = 0; i < n; i++) list.push({ x: acrossPage(layout, rng()), y: rng() * layout.height, r: 40 + rng() * 160, a: 0.04 + rng() * 0.08 });
  stainCache.set(layout, list);
  return list;
}

/** Everything on the page outside the paper, the trail and the ruins: planned once per layout, painted band by band. */
const featureCache = new WeakMap<MapLayout, Feature[]>();
function features(layout: MapLayout): Feature[] {
  const cached = featureCache.get(layout);
  if (cached) return cached;
  const clear = new Clearance(layout);
  // Rivers and lava first, so no land plants a tree in the next one's lava.
  for (const r of layout.regions) {
    const biome = biomeOf(r);
    if (biome === 'jungle') clear.avoid(riverKeepOut(r));
    else if (biome === 'ash') clear.avoid(lavaKeepOut(r));
    else if (biome === 'sand') clear.avoid(wadiKeepOut(r));
  }
  const plan = new Plan(layout, clear);
  for (const r of layout.regions) {
    const biome = biomeOf(r);
    if (biome === 'jungle') planJungle(plan, r);
    else if (biome === 'ash') planVolcano(plan, r);
    else if (biome === 'sand') planTomb(plan, r);
    else planDrafts(plan, r);
  }
  const list = [...plan.list].sort((a, b) => a.layer - b.layer || a.y - b.y);
  featureCache.set(layout, list);
  return list;
}

/** Paints the page between world y0 and y0 + h (the context already maps world px). */
export function paintAtlasChunk(ctx: CanvasRenderingContext2D, layout: MapLayout, y0: number, h: number): void {
  const L = layout.left;
  const R = L + layout.width;
  const y1 = y0 + h;
  ctx.fillStyle = PAGE;
  ctx.fillRect(L, y0, layout.width, h);
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
  for (const [x, dir] of [[L, 1], [R, -1]] as const) {
    const g = ctx.createLinearGradient(x, 0, x + dir * 90, 0);
    g.addColorStop(0, rgba('#a88a5a', 0.35));
    g.addColorStop(1, rgba('#a88a5a', 0));
    ctx.fillStyle = g;
    ctx.fillRect(dir > 0 ? x : x - 90, y0, 90, h);
  }
  paintGrid(ctx, L, R, y0, y1);
  paintFibres(ctx, layout, y0, y1);
  for (const f of features(layout)) {
    if (f.bottom < y0 || f.top > y1) continue;
    f.paint(ctx, f.seed);
  }
  paintTrail(ctx, layout, y0, y1);
  for (const r of layout.regions) {
    // The volcano's plume reaches higher than the other ruins.
    if (r.ruin.y + 160 < y0 || r.ruin.y - 300 > y1) continue;
    // Each ruin keeps its own pen, so where two bands cut it the halves still match.
    const pen = new Pen(ctx, 50 + r.index, 0.6);
    if (r.index === 0 && r.chapter.built) paintTemple(ctx, pen, r.ruin);
    else if (r.index === 1 && r.chapter.built) paintVolcanoShrine(ctx, pen, r.ruin);
    else if (r.index === 2 && r.chapter.built) paintTombShrine(ctx, pen, r.ruin);
    else paintDraftRuin(pen, r.index, r.ruin);
  }
  // Inside what a phone shows of the page (about 760 px across its middle).
  const compass = { x: R - 220, y: layout.height - 150 };
  if (compass.y + 90 > y0 && compass.y - 90 < y1) paintCompass(ctx, new Pen(ctx, 77, 0.6), compass);
}

/** Paper grain: fine flecks and short fibres, and the creases where the page was folded. */
function paintFibres(ctx: CanvasRenderingContext2D, layout: MapLayout, y0: number, y1: number): void {
  // Seeded per 256 px band of the page, so bands baked apart still match.
  for (let band = Math.floor(y0 / 256); band * 256 < y1; band++) {
    const rng = createRng(4000 + band);
    for (let i = 0; i < perWidth(layout, 260); i++) {
      const x = acrossPage(layout, rng());
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
  crease(MAP.mid, y0, MAP.mid, y1);
  for (let y = Math.ceil(y0 / 1400) * 1400; y < y1; y += 1400) crease(layout.left, y, layout.left + layout.width, y);
}

/** A faint hand-ruled grid of the old surveyor. */
function paintGrid(ctx: CanvasRenderingContext2D, L: number, R: number, y0: number, y1: number): void {
  ctx.save();
  ctx.strokeStyle = rgba('#8a7a5a', 0.13);
  ctx.lineWidth = 1;
  // Lined up with x = 125 on every page width, so a wider page only adds lines.
  for (let x = 125 - Math.ceil((125 - L) / 250) * 250; x < R; x += 250) {
    ctx.beginPath();
    ctx.moveTo(x, y0);
    ctx.lineTo(x, y1);
    ctx.stroke();
  }
  for (let y = Math.ceil(y0 / 250) * 250; y < y1; y += 250) {
    ctx.beginPath();
    ctx.moveTo(L, y);
    ctx.lineTo(R, y);
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
  ctx.lineJoin = 'round';
  // A pale, trodden path under the dashes, so they read over forest and ash.
  const near = pts.filter((p) => p.y > y0 - 20 && p.y < y1 + 20 && built(p.y));
  if (near.length > 1) {
    ctx.strokeStyle = rgba('#f6eedb', 0.3);
    ctx.lineWidth = 11;
    ctx.beginPath();
    near.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.stroke();
  }
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
  paintTree(ctx, pen, x - 145, y + 62, 26, 'palm', createRng(8));
  paintTree(ctx, pen, x + 150, y + 64, 24, 'broad', createRng(9));
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
