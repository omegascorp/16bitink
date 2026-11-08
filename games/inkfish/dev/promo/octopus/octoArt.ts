import { PAPER_FILL } from '../../../src/art/fish/kit';
import { ellipse, INK, Pen, pathOf } from '../../../src/art/pen';
import { add, mul, normals, place, type Place, type Pt, resample } from './geom';

/**
 * The giant Pacific octopus, in the game's pen and ink but painted: a
 * reddish body washed light to dark, chromatophore stipple, wrinkles,
 * papillae and pale blotches; golden eyes with a bar pupil on bumps of the
 * head; eight thick arms tapering to whip tips with two rows of pale suckers;
 * the web between their roots. The body is drawn in its own px (origin at the
 * crown of arms, round the mouth; the head above it, the mantle above and
 * behind); arms are drawn along any screen path the story gives them.
 */

export const RED = '#9c3a27';
export const RED_LIGHT = '#e38a69';
export const RED_DARK = '#561811';
const SUCKER = '#f3dcc3';
const ORAL = '#e9b598';
const BLOTCH = '#f2cdb3';
const CHROMA = '#5e170f';
const IRIS = '#d6a043';

// ---------------------------------------------------------------- arms

export interface ArmLook {
  /** Width at the root, screen px. */
  readonly w0: number;
  /** Width at the far end, as a share of w0 (a whip tip by default; wider for an arm that runs on out of sight). */
  readonly wEnd?: number;
  /** The edge the suckers run along: 1 the left of travel, -1 the right. */
  readonly side: 1 | -1;
  readonly seed: number;
  /** The part of the arm to draw (0 root .. 1 tip), for arms that pass behind something. */
  readonly from?: number;
  readonly to?: number;
  /** Behind the body, in its shadow. */
  readonly far?: boolean;
  /** 0 calm .. 1 flushed dark (excited). */
  readonly flush?: number;
  /** Line widths multiplier (close-ups thin their lines). */
  readonly lineK?: number;
  /** Seen from the sucker side: two rows down the middle, pale all over. */
  readonly oral?: boolean;
}

interface ArmFrame {
  readonly pts: Pt[];
  readonly n: Pt[];
  readonly w: number[];
}

const ARM_POINTS = 72;

function armFrame(path: readonly Pt[], look: ArmLook): ArmFrame {
  const pts = resample(path, ARM_POINTS);
  const n = normals(pts);
  const end = look.wEnd ?? 0.06;
  const w = pts.map((_, i) => {
    const s = i / (pts.length - 1);
    return look.w0 * (end + (1 - end) * Math.pow(1 - s, 0.8));
  });
  return { pts, n, w };
}

/** The point at index i, `k` widths off the centre line towards the sucker edge (negative: towards the back). */
const offAt = (f: ArmFrame, side: number, i: number, k: number): Pt => add(f.pts[i]!, mul(f.n[i]!, side * f.w[i]! * k));

/** A strip along the arm between offsets k0 and k1, indices i0..i1. */
function strip(f: ArmFrame, side: number, i0: number, i1: number, k0: number, k1: number): Pt[] {
  const a: Pt[] = [];
  const b: Pt[] = [];
  for (let i = i0; i <= i1; i++) {
    a.push(offAt(f, side, i, k0));
    b.push(offAt(f, side, i, k1));
  }
  return [...a, ...b.reverse()];
}

function sucker(pen: Pen, c: Pt, r: number, lw: number, alpha: number): void {
  pen.fill(ellipse(c.x + r * 0.12, c.y + r * 0.18, r * 1.05, r * 1.05, 14), RED_DARK, 0.35 * alpha);
  pen.fill(ellipse(c.x, c.y, r, r, 14), SUCKER, alpha);
  pen.hair([...ellipse(c.x, c.y, r, r, 14), { x: c.x + r, y: c.y }], lw, INK, 0.8 * alpha);
  pen.hair([...ellipse(c.x, c.y, r * 0.5, r * 0.5, 10), { x: c.x + r * 0.5, y: c.y }], lw * 0.7, '#8a4a3a', 0.6 * alpha);
}

/** One arm along `path` (screen px, root first). */
export function drawArm(ctx: CanvasRenderingContext2D, path: readonly Pt[], look: ArmLook): void {
  const f = armFrame(path, look);
  const last = f.pts.length - 1;
  const i0 = Math.max(0, Math.round((look.from ?? 0) * last));
  const i1 = Math.min(last, Math.round((look.to ?? 1) * last));
  if (i1 - i0 < 2) return;
  const lk = look.lineK ?? 1;
  const side = look.side;
  const pen = new Pen(ctx, look.seed, 0.7 * lk);
  const tip = i1 === last;
  const cap: Pt[] = tip ? [add(f.pts[last]!, mul(dirAt(f, last), f.w[last]! * 0.6))] : [];
  const sucks = f.pts.slice(i0, i1 + 1).map((_, j) => offAt(f, side, i0 + j, 0.5));
  const backs = f.pts.slice(i0, i1 + 1).map((_, j) => offAt(f, side, i0 + j, -0.5));
  const shape = [...sucks, ...cap, ...[...backs].reverse()];
  const lineW = Math.max(1, (look.w0 / 34) * 2.4 * lk);

  pen.fill(shape, PAPER_FILL, 1);
  pen.fill(shape, look.oral ? ORAL : RED, look.oral ? 0.85 : 0.9);
  pen.clipped(shape, () => {
    const g = ctx;
    // Light from above: a soft vertical wash over the whole arm.
    const ys = shape.map((p) => p.y);
    const y0 = Math.min(...ys);
    const y1 = Math.max(...ys);
    const grad = g.createLinearGradient(0, y0, 0, y1 + 1);
    grad.addColorStop(0, 'rgba(240,150,110,0.28)');
    grad.addColorStop(1, 'rgba(40,8,6,0.32)');
    g.fillStyle = grad;
    pathOf(g, shape);
    g.fill();
    if (!look.oral) {
      // The pale sucker side, a dark crease beside it, a sheen down the back.
      pen.fill(strip(f, side, i0, i1, 0.5, 0.22), ORAL, 0.8);
      pen.hair(f.pts.slice(i0, i1 + 1).map((_, j) => offAt(f, side, i0 + j, 0.2)), lineW * 0.45, RED_DARK, 0.7);
      pen.fill(strip(f, side, i0, i1, -0.1, -0.32), RED_LIGHT, 0.32);
      pen.fill(strip(f, side, i0, i1, -0.36, -0.5), RED_DARK, 0.35);
      for (const k of [-0.05, -0.4]) pen.hair(f.pts.slice(i0, i1 + 1).map((_, j) => offAt(f, side, i0 + j, k)), lineW * 0.32, RED_DARK, 0.45);
    }
    // Wrinkles round the arm, and the skin's colour cells.
    for (let i = i0 + 2; i < i1 - 1; i += 3) {
      const a = offAt(f, side, i, look.oral ? 0.5 : 0.18);
      const b = offAt(f, side, i + 1, -0.5);
      pen.hair([a, b], lineW * 0.25, RED_DARK, 0.3);
    }
    let area = 0;
    for (let i = i0 + 1; i <= i1; i++) area += f.w[i]! * Math.hypot(f.pts[i]!.x - f.pts[i - 1]!.x, f.pts[i]!.y - f.pts[i - 1]!.y);
    pen.stipple(shape, Math.min(1400, Math.round(area / 30)), () => 0.55, Math.max(0.6, look.w0 * 0.026 * Math.sqrt(lk)), CHROMA);
    if (!look.oral) {
      // Pale blotches along the back.
      for (let i = i0 + 4; i < i1 - 6; i += 9) {
        const c = offAt(f, side, i, -0.18);
        const r = f.w[i]! * 0.16;
        pen.fill(ellipse(c.x, c.y, r * 1.4, r, 10), BLOTCH, 0.4);
      }
    }
    if (look.flush) pen.fill(shape, RED_DARK, 0.32 * look.flush);
    if (look.far) pen.fill(shape, '#14060a', 0.22);
  });
  // Outline: the back edge, round the tip, the sucker edge.
  pen.stroke(backs, lineW, INK, 1, false);
  pen.stroke(tip ? [...sucks, ...cap, backs[backs.length - 1]!] : sucks, lineW * 0.9, INK, 1, false);

  // Suckers: two staggered rows, the outer one bulging past the edge.
  const alpha = look.far ? 0.8 : 1;
  let acc = 0;
  let row = 0;
  for (let i = Math.max(i0 + 1, 2); i < i1 - 1; i++) {
    acc += Math.hypot(f.pts[i]!.x - f.pts[i - 1]!.x, f.pts[i]!.y - f.pts[i - 1]!.y);
    const gap = f.w[i]! * (look.oral ? 0.24 : 0.36);
    if (acc < gap) continue;
    acc = 0;
    row = 1 - row;
    const w = f.w[i]!;
    if (look.oral) {
      sucker(pen, offAt(f, side, i, row ? 0.19 : -0.19), w * 0.13, lineW * 0.4, alpha);
    } else if (row) {
      sucker(pen, offAt(f, side, i, 0.46), w * 0.17, lineW * 0.45, alpha);
    } else {
      sucker(pen, offAt(f, side, i, 0.3), w * 0.13, lineW * 0.4, alpha * 0.9);
    }
  }
}

function dirAt(f: ArmFrame, i: number): Pt {
  const a = f.pts[Math.max(0, i - 1)]!;
  const b = f.pts[i]!;
  const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  return { x: (b.x - a.x) / len, y: (b.y - a.y) / len };
}

/**
 * The web between two neighbouring arms, out to `depth` of their length:
 * skin from root to root with a scalloped edge dipping towards the crown.
 */
export function drawWeb(ctx: CanvasRenderingContext2D, a: readonly Pt[], b: readonly Pt[], depth: number, seed: number, w0: number, opts: { flush?: number; far?: boolean; lineK?: number } = {}): void {
  if (depth <= 0.01) return;
  const n = 40;
  const ra = resample(a, n);
  const rb = resample(b, n);
  const k = Math.max(1, Math.round(depth * (n - 1)));
  const ea = ra[k]!;
  const eb = rb[k]!;
  const crown = { x: (ra[0]!.x + rb[0]!.x) / 2, y: (ra[0]!.y + rb[0]!.y) / 2 };
  const mid = { x: (ea.x + eb.x) / 2, y: (ea.y + eb.y) / 2 };
  const dip = { x: mid.x + (crown.x - mid.x) * 0.38, y: mid.y + (crown.y - mid.y) * 0.38 };
  const edge: Pt[] = [];
  for (let i = 0; i <= 12; i++) {
    const t = i / 12;
    const u = 1 - t;
    edge.push({ x: u * u * ea.x + 2 * u * t * dip.x + t * t * eb.x, y: u * u * ea.y + 2 * u * t * dip.y + t * t * eb.y });
  }
  const shape = [...ra.slice(0, k + 1), ...edge, ...rb.slice(0, k + 1).reverse()];
  const lk = opts.lineK ?? 1;
  const pen = new Pen(ctx, seed, 0.6 * lk);
  pen.fill(shape, PAPER_FILL, 1);
  pen.fill(shape, RED, 0.85);
  pen.clipped(shape, () => {
    pen.fill(shape, RED_DARK, 0.22);
    for (let i = 1; i < 6; i++) {
      const p = edge[Math.round((i / 6) * 12)]!;
      pen.hair([crown, p], Math.max(0.6, w0 * 0.02 * lk), RED_DARK, 0.4);
    }
    pen.stipple(shape, 220, () => 0.5, Math.max(0.6, w0 * 0.025), CHROMA);
    if (opts.flush) pen.fill(shape, RED_DARK, 0.3 * opts.flush);
    if (opts.far) pen.fill(shape, '#14060a', 0.22);
  });
  pen.stroke(edge, Math.max(1, (w0 / 34) * 1.8 * lk), INK, 1, false);
}

// ---------------------------------------------------------------- body

export interface Body extends Place {
  /** Extra lean of the mantle back from the head, radians. */
  readonly lean: number;
  /** Mantle size, about 1 (breathing). */
  readonly breathe: number;
  /** Where the pupils look, about -1 .. 1 each way. */
  readonly gaze: Pt;
  /** Upper lids: 0 open .. 1 shut (0.5: heavy-lidded and grumpy). */
  readonly lid: number;
  /** Brows: 0 level, 1 a fierce scowl (inner ends down), -1 raised in surprise. */
  readonly brow?: number;
  readonly flush: number;
  readonly lineK: number;
  /** 0 seen from the front (both eyes) .. 1 turned to show its left side (one big eye, the mantle off behind). */
  readonly turn?: number;
}

/** The arms' roots on the crown, body px: a ring seen from the front; the first four (front) are drawn over the body, the rest behind it. */
export const ROOTS: readonly Pt[] = Array.from({ length: 8 }, (_, i) => {
  const a = ((i + 0.5) * Math.PI) / 4;
  return { x: 46 * Math.cos(a), y: 12 * Math.sin(a) - 4 };
});
export const NEAR = [0, 1, 2, 3] as const;
export const FAR = [4, 5, 6, 7] as const;
/** Arm width at the root, body px. */
export const ARM_W = 30;

export const rootOf = (b: Place, i: number): Pt => place(b, ROOTS[i]!);

const HEAD = { x: 0, y: -56, rx: 64, ry: 48 } as const;
const EYE_ANGLE = [-2.35, -0.8] as const;
const EYE_R = 18;

function headShape(b: Body): Pt[] {
  const turn = b.turn ?? 0;
  return Array.from({ length: 64 }, (_, i) => {
    const a = (i / 64) * Math.PI * 2 - Math.PI;
    let r = 1;
    EYE_ANGLE.forEach((e, k) => {
      const d = Math.atan2(Math.sin(a - e), Math.cos(a - e));
      const big = k === 0 ? 1 + 0.25 * turn : 1 - 0.6 * turn;
      r += 0.3 * big * Math.exp(-((d / 0.34) ** 2));
    });
    // Narrower where it meets the arms.
    const lower = Math.max(0, Math.sin(a));
    return { x: HEAD.x + Math.cos(a) * HEAD.rx * r * (1 - 0.18 * lower), y: HEAD.y + Math.sin(a) * HEAD.ry * r };
  });
}

function eyeAt(b: Body, k: 0 | 1): { c: Pt; r: number } {
  const turn = b.turn ?? 0;
  const a = EYE_ANGLE[k];
  const big = k === 0 ? 1 + 0.25 * turn : 1 - 0.6 * turn;
  return { c: { x: HEAD.x + Math.cos(a) * HEAD.rx * 0.93 + (k === 0 ? 8 * turn : 10 * turn), y: HEAD.y + Math.sin(a) * HEAD.ry * 0.95 }, r: EYE_R * big };
}

function mantleShape(b: Body): Pt[] {
  const turn = b.turn ?? 0;
  const c = { x: -14 - 40 * turn, y: -184 + 20 * turn };
  const rx = 80 * b.breathe;
  const ry = 110 * b.breathe;
  const rot = -0.34 + b.lean - 0.35 * turn;
  return Array.from({ length: 56 }, (_, i) => {
    const a = (i / 56) * Math.PI * 2;
    // An egg: fuller at the top, narrowing into the head.
    const egg = 1 + 0.1 * -Math.sin(a) + 0.03 * Math.sin(3 * a + 0.5) + 0.012 * Math.sin(17 * a) + 0.008 * Math.sin(29 * a + 1);
    const x = Math.cos(a) * rx * egg;
    const y = Math.sin(a) * ry;
    return { x: c.x + x * Math.cos(rot) - y * Math.sin(rot), y: c.y + x * Math.sin(rot) + y * Math.cos(rot) };
  });
}

/** Paints a body part: paper, red, light from the upper left, shadow lower right, skin texture, outline. */
function paintSkin(ctx: CanvasRenderingContext2D, pen: Pen, shape: readonly Pt[], b: Body, light: Pt, r: number, detail: number): void {
  pen.fill(shape, PAPER_FILL, 1);
  pen.fill(shape, RED, 0.92);
  pen.clipped(shape, () => {
    const hi = ctx.createRadialGradient(light.x, light.y, r * 0.05, light.x, light.y, r * 1.1);
    hi.addColorStop(0, 'rgba(246,170,130,0.62)');
    hi.addColorStop(0.5, 'rgba(226,120,90,0.2)');
    hi.addColorStop(1, 'rgba(226,120,90,0)');
    ctx.fillStyle = hi;
    pathOf(ctx, shape);
    ctx.fill();
    const far = { x: light.x + r * 1.5, y: light.y + r * 1.6 };
    const lo = ctx.createRadialGradient(far.x, far.y, r * 0.2, far.x, far.y, r * 1.7);
    lo.addColorStop(0, 'rgba(40,6,4,0.62)');
    lo.addColorStop(1, 'rgba(40,6,4,0)');
    ctx.fillStyle = lo;
    pathOf(ctx, shape);
    ctx.fill();
    const xs = shape.map((p) => p.x);
    const ys = shape.map((p) => p.y);
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
    const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
    const rx = (Math.max(...xs) - Math.min(...xs)) / 2;
    const ry = (Math.max(...ys) - Math.min(...ys)) / 2;
    // Wrinkles following the form.
    for (let i = 0; i < 7 * detail; i++) {
      const k = 0.35 + pen.rng() * 0.6;
      const a0 = pen.rng() * Math.PI * 2;
      const span = 0.5 + pen.rng() * 0.9;
      const pts = Array.from({ length: 10 }, (_, j) => {
        const a = a0 + (span * j) / 9;
        return { x: cx + Math.cos(a) * rx * k, y: cy + Math.sin(a) * ry * k };
      });
      pen.hair(pts, 0.7 * b.lineK, RED_DARK, 0.4);
    }
    // Pale blotches.
    for (let i = 0; i < 6 * detail; i++) {
      const x = cx + (pen.rng() - 0.5) * rx * 1.5;
      const y = cy + (pen.rng() - 0.5) * ry * 1.5;
      const s = 4 + pen.rng() * 7;
      pen.fill(ellipse(x, y, s * 1.4, s, 10), BLOTCH, 0.42);
    }
    pen.stipple(shape, Math.round(520 * detail), (_x, y) => 0.25 + 0.6 * Math.min(1, Math.max(0, (y - cy) / ry + 0.6)), 1.15 * Math.sqrt(b.lineK), CHROMA);
    // Papillae: small raised bumps, a dark shadow under a lit top.
    for (let i = 0; i < 26 * detail; i++) {
      const x = cx + (pen.rng() - 0.5) * rx * 1.7;
      const y = cy + (pen.rng() - 0.5) * ry * 1.7;
      const s = 2 + pen.rng() * 3.5;
      pen.hair([{ x: x - s, y }, { x, y: y + s * 0.7 }, { x: x + s, y }], 0.6 * b.lineK, RED_DARK, 0.6);
      pen.dot(x, y - s * 0.2, s * 0.45, RED_LIGHT, 0.55);
    }
    // Hatching in the shadow side, crossed where it's darkest.
    pen.clipped(ellipse(cx + rx * 0.75, cy + ry * 0.6, rx * 1.05, ry * 1.0, 28), () => {
      pen.hatch(shape, 4.2, 0.95, 0.55 * b.lineK, { color: RED_DARK, alpha: 0.5 });
      pen.clipped(ellipse(cx + rx * 1.0, cy + ry * 0.85, rx * 0.9, ry * 0.85, 28), () => pen.hatch(shape, 4.6, -0.6, 0.5 * b.lineK, { color: RED_DARK, alpha: 0.45 }));
    });
    if (b.flush) pen.fill(shape, RED_DARK, 0.32 * b.flush);
  });
  pen.stroke([...shape, shape[0]!], 2.6 * b.lineK, INK);
}

function drawEye(pen: Pen, c: Pt, r: number, b: Body, k: 0 | 1): void {
  const lk = b.lineK;
  pen.fill(ellipse(c.x, c.y + r * 0.1, r * 1.3, r * 1.15, 24), RED_DARK, 0.4);
  pen.fill(ellipse(c.x, c.y, r, r * 0.86, 24), PAPER_FILL, 1);
  pen.fill(ellipse(c.x, c.y, r, r * 0.86, 24), IRIS, 0.85);
  for (let i = 0; i < 22; i++) {
    const a = (i / 22) * Math.PI * 2;
    pen.hair([{ x: c.x + Math.cos(a) * r * 0.35, y: c.y + Math.sin(a) * r * 0.3 }, { x: c.x + Math.cos(a) * r * 0.92, y: c.y + Math.sin(a) * r * 0.8 }], 0.4 * lk, '#7a4a18', 0.55);
  }
  // The bar pupil, sliding with the gaze.
  const p = { x: c.x + b.gaze.x * r * 0.32, y: c.y + b.gaze.y * r * 0.22 };
  const pw = r * 0.42;
  const ph = r * 0.3;
  const bar: Pt[] = [
    ...Array.from({ length: 7 }, (_, i) => ({ x: p.x + pw + Math.cos(-Math.PI / 2 + (i / 6) * Math.PI) * ph, y: p.y + Math.sin(-Math.PI / 2 + (i / 6) * Math.PI) * ph })),
    ...Array.from({ length: 7 }, (_, i) => ({ x: p.x - pw + Math.cos(Math.PI / 2 + (i / 6) * Math.PI) * ph, y: p.y + Math.sin(Math.PI / 2 + (i / 6) * Math.PI) * ph })),
  ];
  pen.fill(bar, '#141016', 1);
  pen.dot(p.x + r * 0.28, p.y - r * 0.32, r * 0.12, PAPER_FILL, 0.95);
  pen.stroke([...ellipse(c.x, c.y, r, r * 0.86, 24), { x: c.x + r, y: c.y }], 1.4 * lk, INK, 1, false);
  // The upper lid, and the brow over it: their inner ends (towards the middle of the head) drop as it scowls.
  const lid = b.lid;
  const scowl = b.brow ?? 0;
  const inner = k === 0 ? 1 : -1;
  const slant = (sx: number): number => r * 0.38 * scowl * (sx * inner);
  const yAt = (sx: number): number => c.y - r * 0.86 + r * 1.72 * lid + Math.max(0, slant(sx)) * 0.9;
  if (lid > 0.12 || scowl > 0.3) {
    const left = { x: c.x - r * 1.15, y: yAt(-1) };
    const right = { x: c.x + r * 1.15, y: yAt(1) };
    pen.clipped(ellipse(c.x, c.y, r * 1.02, r * 0.88, 24), () => {
      const cover = [left, right, { x: right.x, y: c.y - r * 2 }, { x: left.x, y: c.y - r * 2 }];
      pen.fill(cover, PAPER_FILL, 1);
      pen.fill(cover, RED, 0.95);
      pen.fill(cover, RED_DARK, 0.25 + 0.3 * b.flush);
    });
    pen.stroke([left, { x: c.x, y: (left.y + right.y) / 2 + r * 0.06 }, right], 1.8 * lk, INK, 1, false);
  }
  const lift = r * (1.08 - 0.3 * Math.min(0, scowl));
  pen.stroke([
    { x: c.x - r * 1.3, y: c.y - lift + slant(-1) },
    { x: c.x, y: c.y - lift - r * 0.2 * (1 - Math.max(0, scowl)) },
    { x: c.x + r * 1.3, y: c.y - lift + slant(1) },
  ], (1.6 + 1.2 * Math.max(0, scowl)) * lk, INK, 0.95, false);
}

/** Mantle and head (with eyes), placed by `b`. */
export function drawBody(ctx: CanvasRenderingContext2D, b: Body, seed: number): void {
  ctx.save();
  ctx.translate(b.x, b.y);
  ctx.rotate(b.angle);
  ctx.scale(b.scale, b.scale);
  const pen = new Pen(ctx, seed, 0.9 * b.lineK);
  const mantle = mantleShape(b);
  paintSkin(ctx, pen, mantle, b, { x: -70, y: -270 }, 150, 1);
  // A faint ridge down the mantle and the fold where it meets the head.
  const head = headShape(b);
  paintSkin(ctx, pen, head, b, { x: -30, y: -90 }, 80, 0.55);
  if ((b.turn ?? 0) < 0.6) drawEye(pen, eyeAt(b, 1).c, eyeAt(b, 1).r, b, 1);
  drawEye(pen, eyeAt(b, 0).c, eyeAt(b, 0).r, b, 0);
  ctx.restore();
}

/** Screen position of an eye (0 its left, the near one when turned; 1 its right). */
export function eyeOnScreen(b: Body, k: 0 | 1): Pt {
  return place(b, eyeAt(b, k).c);
}
