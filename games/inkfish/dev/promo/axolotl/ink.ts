import { halo } from '../../../src/art/glowArt';
import { Pen, type Pt } from '../../../src/art/pen';

/** Small drawing helpers shared by the short's inked pieces. */

export const closed = (pts: readonly Pt[]): Pt[] => [...pts, pts[0]!];
export const pt = (x: number, y: number): Pt => ({ x, y });

/** A pen for one boil frame: the same shape every frame, a fresh wobble each (`salt` keeps pieces apart). */
export const livePen = (ctx: CanvasRenderingContext2D, boil: number, salt: number, wobble = 0.5): Pen => new Pen(ctx, 31 + boil * 977 + salt * 131, wobble);

/** Points on a quadratic Bézier. */
export function bez(p0: Pt, c: Pt, p1: Pt, n = 12): Pt[] {
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n;
    const u = 1 - t;
    return { x: u * u * p0.x + 2 * u * t * c.x + t * t * p1.x, y: u * u * p0.y + 2 * u * t * c.y + t * t * p1.y };
  });
}

/** A straight run from a to b in n steps. */
export const run = (a: Pt, b: Pt, n: number): Pt[] => Array.from({ length: n + 1 }, (_, i) => ({ x: a.x + ((b.x - a.x) * i) / n, y: a.y + ((b.y - a.y) * i) / n }));

/** Offsets a centreline both ways by `half(u)` to make a ribbon polygon. */
export function ribbon(center: readonly Pt[], half: (u: number) => number): { left: Pt[]; right: Pt[]; shape: Pt[] } {
  const left: Pt[] = [];
  const right: Pt[] = [];
  center.forEach((p, i) => {
    const a = center[Math.max(0, i - 1)]!;
    const b = center[Math.min(center.length - 1, i + 1)]!;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const d = Math.hypot(dx, dy) || 1;
    const w = half(i / Math.max(1, center.length - 1));
    left.push({ x: p.x - (dy / d) * w, y: p.y + (dx / d) * w });
    right.push({ x: p.x + (dy / d) * w, y: p.y - (dx / d) * w });
  });
  return { left, right, shape: [...left, ...[...right].reverse()] };
}

/** The first `frac` (0 .. 1) of a polyline by length. */
export function partial(line: readonly Pt[], frac: number): Pt[] {
  const lens = line.slice(1).map((p, i) => Math.hypot(p.x - line[i]!.x, p.y - line[i]!.y));
  const total = lens.reduce((s, l) => s + l, 0);
  let left = Math.max(0, Math.min(1, frac)) * total;
  const out: Pt[] = [line[0]!];
  for (let i = 0; i < lens.length; i++) {
    const l = lens[i]!;
    const a = line[i]!;
    const b = line[i + 1]!;
    if (left >= l) {
      out.push(b);
      left -= l;
      continue;
    }
    const k = l > 0 ? left / l : 0;
    out.push({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k });
    break;
  }
  return out;
}

/** A round cap on a ribbon's end: a half circle of radius r round p, facing along `dir`. */
export function cap(p: Pt, dir: Pt, r: number, n = 8): Pt[] {
  const a0 = Math.atan2(dir.y, dir.x) - Math.PI / 2;
  return Array.from({ length: n + 1 }, (_, i) => {
    const a = a0 + (Math.PI * i) / n;
    return { x: p.x + Math.cos(a) * r, y: p.y + Math.sin(a) * r };
  });
}

/** A four-pointed twinkle with a soft glow, `r` its reach. */
export function drawTwinkle(ctx: CanvasRenderingContext2D, at: Pt, r: number, alpha: number, color = '#fff6cf', spin = 0): void {
  if (alpha <= 0.01 || r <= 0.5) return;
  halo(ctx, at.x, at.y, r * 1.6, color, 0.55 * alpha);
  ctx.save();
  ctx.translate(at.x, at.y);
  ctx.rotate(spin);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#fffdf2';
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const d = i % 2 === 0 ? r : r * 0.18;
    ctx.lineTo(Math.cos(a) * d, Math.sin(a) * d);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
