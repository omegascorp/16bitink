import { createRng } from '../logic/rng';
import type { MapLayout, MapRegion } from '../scenes/map/layout';
import { inkLines, offTrail } from './atlas';
import { GOLD, INK } from './palette';
import { ellipse, type Pen, type Pt } from './pen';
import { SAND, SAND_DARK, SAND_LIGHT } from './tomb';
import { mix, rgba } from './wash';

/**
 * The Desert Tomb's band of the Ink Atlas, painted once its chapter is
 * built: dunes washed in sand and rippled by the wind, a dry riverbed with
 * a small oasis pool and date palms, a few rocks and a half-buried column;
 * and at its foot the pyramid and obelisk, inked and washed in sandstone.
 * Placed in world px and seeded by place, as the rest of the page.
 */

const OASIS = '#8fbad6';
const PALM = '#5f8a46';
const PALM_DARK = '#3f6233';
const ROCK = '#a08966';

/** The wadi's course: down the left of the band, x by y. */
function wadiX(y: number): number {
  return 170 + Math.sin(y / 140) * 36 + Math.sin(y / 53) * 7;
}

export function paintTombLands(ctx: CanvasRenderingContext2D, pen: Pen, layout: MapLayout, r: MapRegion): void {
  const rng = createRng(700 + r.index);
  // Sand: warm washes all over the band, a few ochre and rosy ones among them.
  for (let i = 0; i < 70; i++) {
    const x = rng() * layout.width;
    const y = r.top + rng() * (r.bottom - r.top);
    const rr = 45 + rng() * 85;
    const c = rng() < 0.25 ? '#d9a064' : SAND;
    const g = ctx.createRadialGradient(x, y, 0, x, y, rr);
    g.addColorStop(0, rgba(c, 0.3));
    g.addColorStop(1, rgba(c, 0));
    ctx.fillStyle = g;
    ctx.fillRect(x - rr, y - rr, rr * 2, rr * 2);
  }
  paintWadi(ctx, pen, r);
  const place = (x: number, y: number, gap: number, w = 0): boolean =>
    offTrail(layout, x, y, gap) && !besideLabel(layout, x, y, w) && Math.hypot(x - r.ruin.x, y - r.ruin.y) >= 190 + w && Math.abs(x - wadiX(y)) >= 60;
  // Dunes first (the biggest, so everything else sits on them), then the small things.
  for (let i = 0; i < 80; i++) {
    const x = 40 + rng() * (layout.width - 80);
    const y = r.top + 20 + rng() * (r.bottom - r.top - 40);
    const w = 55 + rng() * 55;
    const h = 20 + rng() * 20;
    if (place(x, y, 60 + w * 0.4, w)) dune(ctx, pen, x, y, w, h, rng);
  }
  for (let i = 0; i < 70; i++) {
    const x = 40 + rng() * (layout.width - 80);
    const y = r.top + rng() * (r.bottom - r.top);
    const roll = rng();
    const s = 5 + rng() * 6;
    if (!place(x, y, 60)) continue;
    if (roll < 0.5) rocks(ctx, pen, x, y, rng);
    else if (roll < 0.62) column(ctx, pen, x, y, 11 + rng() * 5);
    else if (roll < 0.8) scrub(pen, x, y, s);
    else ripples(pen, x, y, 14 + rng() * 16, rng);
  }
}

/** True for a spot where a level's name is written: to the side of the trail, a little way along it. */
function besideLabel(layout: MapLayout, x: number, y: number, w: number): boolean {
  return layout.path.pts.some((p, i) => i % 3 === 0 && Math.abs(p.y - y) < 22 && x + w > p.x - 170 && x - w < p.x + 190);
}

/** One crescent dune: lit on its windward left, hatched in the lee, rippled by the wind. */
function dune(ctx: CanvasRenderingContext2D, pen: Pen, x: number, y: number, w: number, h: number, rng: () => number): void {
  const ridge: Pt[] = [];
  for (let k = 0; k <= 10; k++) {
    const t = k / 10;
    ridge.push({ x: x - w + 2 * w * t, y: y - h * Math.pow(Math.sin(Math.PI * Math.pow(t, 0.75)), 1.1) });
  }
  const body = [...ridge, { x: x + w * 0.9, y: y + 3 }, { x: x, y: y + 6 }, { x: x - w * 0.9, y: y + 3 }];
  const g = ctx.createLinearGradient(x - w, y - h, x + w, y);
  g.addColorStop(0, rgba(SAND_LIGHT, 0.9));
  g.addColorStop(0.55, rgba(SAND, 0.75));
  g.addColorStop(1, rgba(SAND_DARK, 0.7));
  ctx.fillStyle = g;
  ctx.beginPath();
  body.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  ctx.fill();
  // Lee side: the shaded slope after the crest, hatched.
  const crest = ridge.findIndex((p) => p.y === Math.min(...ridge.map((q) => q.y)));
  const lee = [...ridge.slice(Math.max(0, crest)), { x: x + w * 0.9, y: y + 3 }, { x: x + w * 0.1, y: y + 5 }];
  pen.hatch(lee, 3, 1.05, 0.9, { color: SAND_DARK, alpha: 0.85 });
  pen.hair(ridge, 1.2, INK, 0.62);
  // Wind ripples on the windward slope.
  for (let k = 0; k < 3; k++) {
    const ry = y - h * 0.2 + k * 2.6;
    const rx = x - w * (0.55 - k * 0.12);
    pen.hair([{ x: rx, y: ry }, { x: rx + w * 0.25, y: ry - 1.4 }, { x: rx + w * 0.5, y: ry }], 0.8, SAND_DARK, 0.65);
  }
  if (rng() < 0.4) pen.hair([{ x: x - w * 0.9, y: y + 4 }, { x: x, y: y + 6 }, { x: x + w * 0.9, y: y + 4 }], 0.9, rgba(INK, 0.5), 0.5);
}

/** A few short wind-ripple strokes on flat sand. */
function ripples(pen: Pen, x: number, y: number, w: number, rng: () => number): void {
  for (let k = 0; k < 3; k++) {
    const o = k * 4.5;
    pen.hair([{ x: x - w / 2 + k * 3, y: y + o }, { x: x + (rng() - 0.5) * 3, y: y + o - 1.8 }, { x: x + w / 2 - k * 3, y: y + o }], 0.9, SAND_DARK, 0.75);
  }
}

/** A dry thorn tuft. */
function scrub(pen: Pen, x: number, y: number, s: number): void {
  for (let k = 0; k < 5; k++) pen.hair([{ x, y }, { x: x + (k - 2) * s * 0.35, y: y - s * (0.9 - Math.abs(k - 2) * 0.12) }], 0.9, mix(PALM_DARK, SAND_DARK, 0.5), 0.8);
  pen.hair([{ x: x - s * 0.8, y: y + 1 }, { x: x + s * 0.8, y: y + 1 }], 0.9, rgba(INK, 0.45), 0.5);
}

/** The dry riverbed: a pale cracked channel with a stony bed, a small oasis pool in its widest reach and date palms around it. */
function paintWadi(ctx: CanvasRenderingContext2D, pen: Pen, r: MapRegion): void {
  const bed: Pt[] = [];
  for (let y = r.top + 20; y <= r.bottom - 30; y += 12) bed.push({ x: wadiX(y), y });
  const n = bed.length - 1;
  if (n < 4) return;
  const width = (i: number): number => Math.min(1, (i / n) * 5) * Math.min(1, (1 - i / n) * 3.5) * (0.8 + 0.2 * Math.sin(i / n * 11));
  const band = (w: number, color: string): void => {
    const left: Pt[] = [];
    const right: Pt[] = [];
    bed.forEach((p, i) => {
      const q = bed[Math.min(n, i + 1)]!;
      const o = bed[Math.max(0, i - 1)]!;
      const d = Math.hypot(q.x - o.x, q.y - o.y) || 1;
      const half = (w * width(i)) / 2;
      left.push({ x: p.x - ((q.y - o.y) / d) * half, y: p.y + ((q.x - o.x) / d) * half });
      right.push({ x: p.x + ((q.y - o.y) / d) * half, y: p.y - ((q.x - o.x) / d) * half });
    });
    ctx.fillStyle = color;
    ctx.beginPath();
    [...left, ...right.reverse()].forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.closePath();
    ctx.fill();
  };
  band(70, rgba(SAND_DARK, 0.14));
  band(44, rgba(SAND_DARK, 0.3));
  band(24, rgba(SAND_LIGHT, 0.65));
  const banks = bed.filter((_, i) => width(i) > 0.45);
  for (const side of [-1, 1]) pen.hair(banks.map((p) => ({ x: p.x + side * 20 * width(bed.indexOf(p)), y: p.y })), 1.1, INK, 0.5);
  // Pebbles and cracked mud in the bed.
  const rng = createRng(731);
  for (let k = 2; k < n - 1; k += 2) {
    const p = bed[k]!;
    if (rng() < 0.6) pen.dot(p.x + (rng() - 0.5) * 16 * width(k), p.y, 1.3 + rng(), SAND_DARK, 0.8);
    else pen.hair([{ x: p.x - 5, y: p.y }, { x: p.x, y: p.y + 2 }, { x: p.x + 6, y: p.y - 1 }], 0.8, SAND_DARK, 0.7);
  }
  // The oasis pool, in the middle reach, with reeds and three palms.
  const mid = bed[Math.floor(n * 0.5)]!;
  oasis(ctx, pen, mid.x, mid.y);
}

function oasis(ctx: CanvasRenderingContext2D, pen: Pen, x: number, y: number): void {
  const pool = ellipse(x, y, 32, 13, 22);
  ctx.fillStyle = rgba('#6f9a52', 0.28);
  ctx.beginPath();
  ctx.ellipse(x, y, 46, 21, 0, 0, Math.PI * 2);
  ctx.fill();
  const g = ctx.createLinearGradient(0, y - 13, 0, y + 13);
  g.addColorStop(0, rgba(OASIS, 0.95));
  g.addColorStop(1, rgba(mix(OASIS, '#3f6f99', 0.5), 0.9));
  pen.clipped(pool, () => {
    ctx.fillStyle = g;
    ctx.fillRect(x - 34, y - 14, 68, 28);
  });
  pen.hair([...pool, pool[0]!], 1.2, INK, 0.65);
  pen.hair([{ x: x - 12, y: y - 2 }, { x: x - 2, y: y - 1 }], 1, '#ffffff', 0.8);
  pen.hair([{ x: x + 2, y: y + 4 }, { x: x + 14, y: y + 3 }], 1, '#ffffff', 0.7);
  for (let k = 0; k < 6; k++) {
    const rx = x - 34 + k * 12 + (k % 2) * 3;
    pen.hair([{ x: rx, y: y + 12 }, { x: rx + 1, y: y + 1 }], 0.9, PALM_DARK, 0.75);
  }
  datePalm(ctx, pen, x - 40, y + 4, 24, -1);
  datePalm(ctx, pen, x + 38, y - 2, 28, 1);
  datePalm(ctx, pen, x + 8, y - 16, 20, 1);
}

/** A date palm: a slender curved trunk with ringed bark, a crown of drooping fronds and a cluster of dates. */
function datePalm(ctx: CanvasRenderingContext2D, pen: Pen, x: number, y: number, s: number, lean: number): void {
  const top = { x: x + lean * s * 0.35, y: y - s * 1.9 };
  ctx.fillStyle = rgba('#3d3226', 0.18);
  ctx.beginPath();
  ctx.ellipse(x + 4, y + 1, s * 0.6, s * 0.14, 0, 0, Math.PI * 2);
  ctx.fill();
  pen.stroke([{ x, y }, { x: x + lean * s * 0.1, y: y - s }, top], 2.4, mix('#8a6a44', INK, 0.2), 0.95, false);
  for (let k = 1; k < 6; k++) {
    const t = k / 6;
    const px = x + lean * s * 0.35 * t * t * 1.6;
    pen.hair([{ x: px - 1.8, y: y - s * 1.9 * t }, { x: px + 1.8, y: y - s * 1.9 * t - 1 }], 0.7, INK, 0.6);
  }
  for (let k = 0; k < 7; k++) {
    const a = -Math.PI + (k / 6) * Math.PI;
    const tip = { x: top.x + Math.cos(a) * s * 1.05, y: top.y + Math.sin(a) * s * 0.35 + s * 0.55 };
    const arc = { x: (top.x + tip.x) / 2, y: top.y - s * 0.38 + Math.abs(Math.cos(a)) * s * 0.05 };
    const leaf = [top, arc, tip, { x: arc.x, y: arc.y + s * 0.2 }];
    pen.fill(leaf, k % 2 ? PALM : mix(PALM, '#ffffff', 0.18), 1);
    pen.hair([top, arc, tip], 0.9, INK, 0.7);
  }
  pen.dot(top.x - 2, top.y + 3, 1.7, '#8a4a22', 0.95);
  pen.dot(top.x + 2, top.y + 4, 1.7, '#8a4a22', 0.95);
}

/** Two or three weathered sandstone lumps, lit from the top left. */
function rocks(ctx: CanvasRenderingContext2D, pen: Pen, x: number, y: number, rng: () => number): void {
  const n = 2 + Math.floor(rng() * 2);
  for (let k = 0; k < n; k++) {
    const rx = x + (k - 1) * 10 + rng() * 4;
    const s = 4 + rng() * 5;
    const shape = [{ x: rx - s, y }, { x: rx - s * 0.7, y: y - s * 0.8 }, { x: rx + s * 0.2, y: y - s }, { x: rx + s, y: y - s * 0.3 }, { x: rx + s * 1.1, y }];
    const g = ctx.createLinearGradient(rx - s, y - s, rx + s, y);
    g.addColorStop(0, SAND_LIGHT);
    g.addColorStop(1, ROCK);
    ctx.fillStyle = g;
    ctx.beginPath();
    shape.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.closePath();
    ctx.fill();
    pen.hatch([shape[2]!, shape[3]!, shape[4]!, { x: rx, y }], 2.4, 1.1, 0.7, { color: SAND_DARK, alpha: 0.7 });
    pen.hair(shape, 0.9, INK, 0.7);
  }
  ctx.fillStyle = rgba('#3d3226', 0.18);
  ctx.beginPath();
  ctx.ellipse(x + 3, y + 1.5, 15, 3, 0, 0, Math.PI * 2);
  ctx.fill();
}

/** A fluted column, half buried, broken off ragged at the top, with a drum lying beside it. */
function column(ctx: CanvasRenderingContext2D, pen: Pen, x: number, y: number, s: number): void {
  ctx.fillStyle = rgba('#3d3226', 0.2);
  ctx.beginPath();
  ctx.ellipse(x + 4, y + 1, s * 1.1, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  const shaft = [{ x: x - 4, y }, { x: x - 4, y: y - s }, { x: x - 1, y: y - s - 3 }, { x: x + 1, y: y - s + 1 }, { x: x + 4, y: y - s - 2 }, { x: x + 4, y }];
  const g = ctx.createLinearGradient(x - 4, 0, x + 4, 0);
  g.addColorStop(0, SAND_LIGHT);
  g.addColorStop(1, mix(SAND_DARK, ROCK, 0.5));
  ctx.fillStyle = g;
  ctx.beginPath();
  shaft.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  ctx.fill();
  pen.hair([{ x: x, y: y - 1 }, { x: x, y: y - s + 1 }], 0.7, INK, 0.45);
  inkLines(ctx, shaft, 1.1, false);
  // The drum on its side.
  pen.fill(ellipse(x + 13, y - 2, 6, 3.5, 12), mix(SAND, SAND_LIGHT, 0.4), 1);
  pen.hair(ellipse(x + 13, y - 2, 6, 3.5, 12), 0.9, INK, 0.7);
  // Dune drift at the foot.
  pen.fill([{ x: x - 12, y: y + 1 }, { x: x - 4, y: y - 4 }, { x: x + 6, y: y - 3 }, { x: x + 22, y: y + 1 }], SAND, 0.9);
  pen.hair([{ x: x - 12, y: y + 1 }, { x: x - 4, y: y - 4 }, { x: x + 6, y: y - 3 }, { x: x + 22, y: y + 1 }], 0.9, INK, 0.5);
}

/**
 * The Desert Tomb, painted: a sandstone pyramid lit on its left face and
 * hatched on the right, a dark doorway at its foot, the obelisk beside it,
 * and a drift of dune over the corner.
 */
export function paintTombShrine(ctx: CanvasRenderingContext2D, pen: Pen, at: Pt): void {
  const { x, y } = at;
  const base = y + 60;
  ctx.fillStyle = rgba('#3d3226', 0.2);
  ctx.beginPath();
  ctx.ellipse(x + 10, base + 2, 150, 17, 0, 0, Math.PI * 2);
  ctx.fill();
  const apex = { x: x - 10, y: y - 70 };
  const left = { x: x - 110, y: base };
  const right = { x: x + 90, y: base };
  const split = { x: x + 10, y: base };
  const lit = [left, apex, split];
  const shade = [apex, right, split];
  const gl = ctx.createLinearGradient(left.x, 0, split.x, 0);
  gl.addColorStop(0, mix(SAND_LIGHT, '#ffffff', 0.2));
  gl.addColorStop(1, SAND);
  ctx.fillStyle = gl;
  ctx.beginPath();
  lit.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  ctx.fill();
  const gs = ctx.createLinearGradient(split.x, 0, right.x, 0);
  gs.addColorStop(0, mix(SAND_DARK, SAND, 0.3));
  gs.addColorStop(1, mix(SAND_DARK, '#6a5030', 0.35));
  ctx.fillStyle = gs;
  ctx.beginPath();
  shade.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  ctx.fill();
  // Courses of masonry, running along the faces and thinning toward the top.
  for (let k = 1; k < 9; k++) {
    const t = k / 9;
    const yy = base - t * (base - apex.y);
    const lx = left.x + (apex.x - left.x) * t;
    const sx = split.x + (apex.x - split.x) * t;
    const rx = right.x + (apex.x - right.x) * t;
    pen.hair([{ x: lx + 2, y: yy }, { x: sx, y: yy + 3 * (1 - t) }], 0.7, INK, 0.38);
    pen.hair([{ x: sx, y: yy + 3 * (1 - t) }, { x: rx - 2, y: yy }], 0.7, INK, 0.42);
  }
  pen.hatch(shade, 4, 1.15, 1, { color: INK, alpha: 0.33 });
  pen.hatch([apex, split, { x: x - 36, y: base }], 5, 1.15, 0.8, { color: SAND_DARK, alpha: 0.45 });
  inkLines(ctx, [left, apex, right], 1.7, false);
  inkLines(ctx, [apex, split], 1.2, false);
  inkLines(ctx, [left, right], 1.5, false);
  // The doorway at the foot of the lit face, with a lintel, and a glint of gold inside.
  const dx = x - 40;
  const door = [{ x: dx - 11, y: base }, { x: dx - 11, y: base - 22 }, { x: dx + 11, y: base - 22 }, { x: dx + 11, y: base }];
  pen.fill([{ x: dx - 15, y: base }, { x: dx - 15, y: base - 26 }, { x: dx + 15, y: base - 26 }, { x: dx + 15, y: base }], mix(SAND, SAND_LIGHT, 0.5), 1);
  pen.fill(door, '#2a2420', 1);
  inkLines(ctx, [{ x: dx - 15, y: base }, { x: dx - 15, y: base - 26 }, { x: dx + 15, y: base - 26 }, { x: dx + 15, y: base }], 1.4, false);
  inkLines(ctx, door, 1.2, true);
  pen.dot(dx, base - 7, 2.2, GOLD);
  // The obelisk, with its pyramidion and a band of glyphs.
  const ox = x + 126;
  const obelisk = [{ x: ox - 8, y: base }, { x: ox - 6, y: y - 24 }, { x: ox, y: y - 38 }, { x: ox + 6, y: y - 24 }, { x: ox + 8, y: base }];
  const go = ctx.createLinearGradient(ox - 8, 0, ox + 8, 0);
  go.addColorStop(0, SAND_LIGHT);
  go.addColorStop(1, mix(SAND_DARK, '#6a5030', 0.3));
  ctx.fillStyle = go;
  ctx.beginPath();
  obelisk.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  ctx.fill();
  pen.hatch([{ x: ox + 1, y: y - 36 }, { x: ox + 6, y: y - 24 }, { x: ox + 8, y: base }, { x: ox + 1, y: base }], 3, 1.2, 0.8, { color: INK, alpha: 0.35 });
  for (let k = 0; k < 6; k++) pen.hair([{ x: ox - 3, y: y - 10 + k * 14 }, { x: ox + 3, y: y - 10 + k * 14 }], 0.8, INK, 0.5);
  inkLines(ctx, obelisk, 1.5, true);
  pen.dot(ox, y - 38, 1.8, GOLD);
  // Dune drift over the pyramid's right foot and around the obelisk, and a few stray blocks.
  const drift = [{ x: x + 20, y: base }, { x: x + 44, y: base - 9 }, { x: x + 74, y: base - 6 }, { x: x + 104, y: base - 12 }, { x: x + 140, y: base - 3 }, { x: x + 146, y: base }];
  pen.fill(drift, mix(SAND, SAND_LIGHT, 0.4), 0.95);
  pen.hair(drift.slice(0, 5), 1.1, INK, 0.6);
  pen.hair([{ x: x + 48, y: base - 3 }, { x: x + 66, y: base - 5 }, { x: x + 84, y: base - 3 }], 0.8, SAND_DARK, 0.7);
  for (const [bx, by, bs] of [[x - 96, base - 2, 7], [x - 78, base, 5]] as const) {
    const blk = [{ x: bx - bs, y: by }, { x: bx - bs, y: by - bs * 0.8 }, { x: bx + bs, y: by - bs * 0.9 }, { x: bx + bs, y: by }];
    pen.fill(blk, SAND, 1);
    inkLines(ctx, blk, 1, true);
  }
}
