import type { Pt } from '../logic/path';

/**
 * Track shapes, as control points for a smooth curve. A spiral winds in from
 * `r0` to `r1` around a centre over `turns`, starting at angle `a0` (radians,
 * 0 = right, clockwise on screen when `dir` is 1).
 */
export function spiral(cx: number, cy: number, r0: number, r1: number, turns: number, a0: number, dir: 1 | -1 = 1, sx = 1, sy = 1): Pt[] {
  const steps = Math.max(8, Math.round(turns * 14));
  return Array.from({ length: steps + 1 }, (_, i) => {
    const t = i / steps;
    const a = a0 + dir * t * turns * Math.PI * 2;
    const r = r0 + (r1 - r0) * t;
    return { x: round(cx + Math.cos(a) * r * sx), y: round(cy + Math.sin(a) * r * sy) };
  });
}

/**
 * A zigzag down the page for rail levels: `rows` runs across between x0 and
 * x1, from y0 down to y1, turning at the ends in half circles.
 */
export function zigzag(x0: number, x1: number, y0: number, y1: number, rows: number, fromLeft = true): Pt[] {
  const out: Pt[] = [];
  const gap = rows > 1 ? (y1 - y0) / (rows - 1) : 0;
  for (let r = 0; r < rows; r++) {
    const y = y0 + r * gap;
    const ltr = (r % 2 === 0) === fromLeft;
    const [a, b] = ltr ? [x0, x1] : [x1, x0];
    const n = 6;
    for (let i = 0; i <= n; i++) out.push({ x: round(a + ((b - a) * i) / n), y: round(y) });
    if (r < rows - 1) {
      // A half circle down to the next row.
      const cx = b;
      const side = Math.sign(b - a);
      for (let k = 1; k < 6; k++) {
        const ang = -Math.PI / 2 + (k / 6) * Math.PI;
        out.push({ x: round(cx + side * Math.cos(ang) * gap / 2), y: round(y + gap / 2 + Math.sin(ang) * gap / 2) });
      }
    }
  }
  return out;
}

/**
 * A figure of eight round (cx, cy), crossing itself in the middle: `ax`
 * out to each side, its lobes `ay` tall in all. Starts at angle `t0` and
 * runs `turns` of the whole figure (1 = the full eight), clockwise in the
 * right lobe when `dir` is 1.
 */
export function figure8(cx: number, cy: number, ax: number, ay: number, t0: number, turns: number, dir: 1 | -1 = 1): Pt[] {
  const steps = Math.max(12, Math.round(turns * 32));
  return Array.from({ length: steps + 1 }, (_, i) => {
    const t = t0 + dir * (i / steps) * turns * Math.PI * 2;
    return { x: round(cx + Math.sin(t) * ax), y: round(cy + Math.sin(t) * Math.cos(t) * ay) };
  });
}

/** A shape turned by `a` radians round (cx, cy) (a figure of eight standing upright, say). */
export function turned(points: readonly Pt[], cx: number, cy: number, a: number): Pt[] {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return points.map((p) => ({ x: round(cx + (p.x - cx) * c - (p.y - cy) * s), y: round(cy + (p.x - cx) * s + (p.y - cy) * c) }));
}

/** Points along a straight line, end excluded. */
export function line(a: Pt, b: Pt, n: number): Pt[] {
  return Array.from({ length: n }, (_, i) => ({ x: round(a.x + ((b.x - a.x) * i) / n), y: round(a.y + ((b.y - a.y) * i) / n) }));
}

const round = (v: number): number => Math.round(v * 10) / 10;
