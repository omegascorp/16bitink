import { curveAt, type Pt, type RootStroke, type Roots } from '../logic/roots';
import { INK, PAPER_FILL } from './palette';
import type { ChunkRect } from './sand';

/**
 * Mangrove roots, trunks and branches, drawn along the curves they were
 * grown on (the root tiles are only for play): tapering ribbons washed in
 * bark colours and edged in pen, crusted with oysters near the mud, with
 * leafy crowns on top. All jitter is seeded by world position, so a root
 * crossing a chunk border draws the same on both sides.
 */
const BARK = '#7a6550';
const BARK_DARK = '#4f4034';
const BARK_LIGHT = '#a8927a';
/** Grey oyster and barnacle crust on the roots near the mud. */
const CRUST = '#b9b4a6';
const LEAF = '#4f7d43';
const LEAF_DARK = '#2f5a33';
const LEAF_LIGHT = '#86a965';

function hash(x: number, y: number, salt = 0): number {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(salt, 2246822519);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** A stroke sampled along its length, in world px: centre points, unit normals and half-widths. */
interface Ribbon {
  readonly pts: readonly Pt[];
  readonly nrm: readonly Pt[];
  readonly half: readonly number[];
}

function ribbon(s: RootStroke, T: number): Ribbon {
  const [a, , , d] = s.curve;
  const n = Math.max(6, Math.ceil(Math.hypot(d.x - a.x, d.y - a.y) * 3));
  const pts: Pt[] = [];
  const half: number[] = [];
  for (let i = 0; i <= n; i++) {
    const p = curveAt(s.curve, i / n);
    // A faint wobble by world position, so even a straight run looks drawn.
    const wob = (hash(Math.round(p.x * 8), Math.round(p.y * 8), 1) - 0.5) * 0.05;
    pts.push({ x: (p.x + wob) * T, y: (p.y + wob) * T });
    half.push(((s.from + (s.to - s.from) * (i / n)) * T) / 2);
  }
  const nrm = pts.map((p, i) => {
    const q = pts[Math.min(n, i + 1)]!;
    const o = pts[Math.max(0, i - 1)]!;
    const l = Math.hypot(q.x - o.x, q.y - o.y) || 1;
    return { x: -(q.y - o.y) / l, y: (q.x - o.x) / l };
  });
  return { pts, nrm, half };
}

/** The outline of a ribbon, offset `k` of its width to one side (0 the middle, ±1 the edges), between `a` and `b` (0..1 across). */
function band(ctx: CanvasRenderingContext2D, r: Ribbon, a: number, b: number): void {
  ctx.beginPath();
  r.pts.forEach((p, i) => {
    const h = r.half[i]!;
    const x = p.x + r.nrm[i]!.x * h * a;
    const y = p.y + r.nrm[i]!.y * h * a;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  for (let i = r.pts.length - 1; i >= 0; i--) {
    const p = r.pts[i]!;
    const h = r.half[i]!;
    ctx.lineTo(p.x + r.nrm[i]!.x * h * b, p.y + r.nrm[i]!.y * h * b);
  }
  ctx.closePath();
}

/**
 * One root: blanked to paper, washed in bark, shaded down one side and lit
 * along the other, ringed with short bark ticks, then edged in pen with
 * the ends rounded off.
 */
function drawStroke(ctx: CanvasRenderingContext2D, s: RootStroke, T: number): void {
  const r = ribbon(s, T);
  const ends = (): void => {
    for (const i of [0, r.pts.length - 1]) {
      ctx.beginPath();
      ctx.arc(r.pts[i]!.x, r.pts[i]!.y, r.half[i]!, 0, Math.PI * 2);
      ctx.fill();
    }
  };
  ctx.globalAlpha = 0.92;
  ctx.fillStyle = INK;
  ctx.save();
  ctx.lineWidth = 2.2;
  ctx.strokeStyle = INK;
  ctx.lineJoin = 'round';
  band(ctx, r, -1, 1);
  ctx.stroke();
  ctx.restore();
  for (const i of [0, r.pts.length - 1]) {
    ctx.beginPath();
    ctx.arc(r.pts[i]!.x, r.pts[i]!.y, r.half[i]! + 1.1, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = PAPER_FILL;
  band(ctx, r, -1, 1);
  ctx.fill();
  ends();
  ctx.globalAlpha = 0.88;
  ctx.fillStyle = BARK;
  band(ctx, r, -1, 1);
  ctx.fill();
  ends();
  ctx.globalAlpha = 0.45;
  ctx.fillStyle = BARK_DARK;
  band(ctx, r, 0.25, 1);
  ctx.fill();
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = BARK_LIGHT;
  band(ctx, r, -0.75, -0.3);
  ctx.fill();
  // Bark ticks across the root, and the odd pale lenticel.
  ctx.strokeStyle = INK;
  ctx.lineCap = 'round';
  r.pts.forEach((p, i) => {
    if (i === 0 || i === r.pts.length - 1) return;
    const h = r.half[i]!;
    const n = r.nrm[i]!;
    const k = hash(Math.round(p.x), Math.round(p.y), 2);
    const off = (k - 0.5) * h;
    ctx.globalAlpha = 0.3 + k * 0.3;
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(p.x + n.x * (off - h * 0.35), p.y + n.y * (off - h * 0.35));
    ctx.lineTo(p.x + n.x * (off + h * 0.25), p.y + n.y * (off + h * 0.25));
    ctx.stroke();
    if (hash(Math.round(p.x), Math.round(p.y), 3) < 0.3) {
      ctx.globalAlpha = 0.7;
      ctx.fillStyle = BARK_LIGHT;
      ctx.beginPath();
      ctx.ellipse(p.x - n.x * h * 0.3, p.y - n.y * h * 0.3, h * 0.16, h * 0.09, Math.atan2(n.y, n.x), 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

/** Oyster crust on the roots just above the mud: grey lumps with a pen edge. */
function crust(ctx: CanvasRenderingContext2D, s: RootStroke, T: number, ground: (x: number) => number): void {
  const r = ribbon(s, T);
  r.pts.forEach((p, i) => {
    const col = Math.floor(p.x / T);
    if (p.y / T < ground(col) - 1.6 || p.y / T > ground(col) + 0.1 || hash(Math.round(p.x), Math.round(p.y), 40) > 0.75) return;
    const h = r.half[i]!;
    const n = r.nrm[i]!;
    const off = (hash(Math.round(p.x), Math.round(p.y), 41) - 0.5) * h * 1.4;
    const rx = T * (0.1 + hash(Math.round(p.x), Math.round(p.y), 43) * 0.08);
    ctx.beginPath();
    ctx.ellipse(p.x + n.x * off, p.y + n.y * off, rx, rx * 0.7, hash(Math.round(p.x), Math.round(p.y), 44) * Math.PI, 0, Math.PI * 2);
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = CRUST;
    ctx.fill();
    ctx.globalAlpha = 0.6;
    ctx.lineWidth = 0.45;
    ctx.strokeStyle = INK;
    ctx.stroke();
  });
}

/** A stroke's bounds in world px, padded by its thickness. */
function bounds(s: RootStroke, T: number): { x0: number; y0: number; x1: number; y1: number } {
  const xs = s.curve.map((p) => p.x);
  const ys = s.curve.map((p) => p.y);
  const pad = Math.max(s.from, s.to) * T;
  return { x0: Math.min(...xs) * T - pad, y0: Math.min(...ys) * T - pad, x1: Math.max(...xs) * T + pad, y1: Math.max(...ys) * T + pad };
}

/** One leaf: a pointed oval along its angle, washed and inked, with a midrib. */
function leaf(ctx: CanvasRenderingContext2D, x: number, y: number, len: number, a: number, color: string): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(a);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(len * 0.5, -len * 0.32, len, 0);
  ctx.quadraticCurveTo(len * 0.5, len * 0.32, 0, 0);
  ctx.globalAlpha = 1;
  ctx.fillStyle = PAPER_FILL;
  ctx.fill();
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = color;
  ctx.fill();
  ctx.globalAlpha = 0.75;
  ctx.lineWidth = 0.55;
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.globalAlpha = 0.4;
  ctx.beginPath();
  ctx.moveTo(len * 0.1, 0);
  ctx.lineTo(len * 0.85, 0);
  ctx.stroke();
  ctx.restore();
}

/**
 * A rounded crown: a soft green mass, then glossy leaves packed over it in
 * sprays, paler on top and darker underneath.
 */
function crown(ctx: CanvasRenderingContext2D, cx: number, cy: number, radius: number, T: number): void {
  const seed = Math.round(cx * 7 + cy * 13);
  const R = radius * T;
  // The mass: a few overlapping lobes, so the outline is billowy rather than one oval.
  ctx.fillStyle = LEAF_DARK;
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2 + hash(seed, k, 49);
    ctx.globalAlpha = 0.13;
    ctx.beginPath();
    ctx.ellipse(cx + Math.cos(a) * R * 0.55, cy + Math.sin(a) * R * 0.3, R * 0.75, R * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  const n = Math.round(radius * radius * 26);
  for (let i = 0; i < n; i++) {
    const a = hash(seed, i, 50) * Math.PI * 2;
    const d = Math.sqrt(hash(seed, i, 51)) * R;
    const x = cx + Math.cos(a) * d * 1.2;
    const y = cy + Math.sin(a) * d * 0.72;
    const shade = (y - cy) / R;
    const color = shade > 0.2 ? LEAF_DARK : shade < -0.3 && hash(seed, i, 52) < 0.6 ? LEAF_LIGHT : LEAF;
    // Leaves droop outwards and down from the middle of the crown.
    const out = Math.atan2(y - cy + R * 0.4, x - cx);
    leaf(ctx, x, y, T * (0.38 + hash(seed, i, 53) * 0.18), out + (hash(seed, i, 54) - 0.5) * 1.6, color);
  }
}

/** Draws the roots and crowns over one chunk of the level into `ctx` (world px scaled by `res`, offset like the sand's). */
export function drawRootChunk(ctx: CanvasRenderingContext2D, r: Roots, c: ChunkRect, T: number, res: number, pad: number, ground: (x: number) => number): void {
  const size = c.tiles * T;
  ctx.setTransform(res, 0, 0, res, (pad - c.tx * T) * res, (pad - c.ty * T) * res);
  ctx.clearRect(c.tx * T - pad, c.ty * T - pad, size + pad * 2, size + pad * 2);
  // Roots and branches first, then the stout trunks over the ends they spring from.
  const strokes = r.strokes.filter((s) => touches(bounds(s, T), c, T, pad)).sort((a, b) => a.from - b.from);
  for (const s of strokes) drawStroke(ctx, s, T);
  for (const s of strokes) crust(ctx, s, T, ground);
  for (const [x, y, radius] of r.leaves) {
    const R = radius * T * 1.4;
    if (touches({ x0: x * T - R, y0: y * T - R, x1: x * T + R, y1: y * T + R }, c, T, pad)) crown(ctx, x * T, y * T, radius, T);
  }
  ctx.globalAlpha = 1;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}

function touches(b: { x0: number; y0: number; x1: number; y1: number }, c: ChunkRect, T: number, pad: number): boolean {
  return b.x1 >= c.tx * T - pad && b.x0 <= (c.tx + c.tiles) * T + pad && b.y1 >= c.ty * T - pad && b.y0 <= (c.ty + c.tiles) * T + pad;
}

/** Whether a chunk has any root or crown to draw. */
export function chunkHasRoots(r: Roots, c: ChunkRect, T: number): boolean {
  return r.strokes.some((s) => touches(bounds(s, T), c, T, 0))
    || r.leaves.some(([x, y, radius]) => touches({ x0: (x - radius * 1.4) * T, y0: (y - radius * 1.4) * T, x1: (x + radius * 1.4) * T, y1: (y + radius * 1.4) * T }, c, T, 0));
}
