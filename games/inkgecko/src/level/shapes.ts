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

/**
 * A spiral squared off like a raised bed or a barn's stalls: as `spiral`,
 * but the curve is a superellipse (`square` 0 = round, 1 = nearly square).
 */
export function squareSpiral(cx: number, cy: number, r0: number, r1: number, turns: number, a0: number, dir: 1 | -1 = 1, sx = 1, sy = 1, square = 0.6): Pt[] {
  const steps = Math.max(16, Math.round(turns * 32));
  const e = 1 - square * 0.75;
  const bend = (v: number): number => Math.sign(v) * Math.abs(v) ** e;
  return Array.from({ length: steps + 1 }, (_, i) => {
    const t = i / steps;
    const a = a0 + dir * t * turns * Math.PI * 2;
    const r = r0 + (r1 - r0) * t;
    return { x: round(cx + bend(Math.cos(a)) * r * sx), y: round(cy + bend(Math.sin(a)) * r * sy) };
  });
}

/**
 * Rows across the page like `zigzag`, each one wavering `amp` up and down
 * `waves` times on its way (seed drills, a meadow path).
 */
export function meander(x0: number, x1: number, y0: number, y1: number, rows: number, amp: number, waves: number, fromLeft = true): Pt[] {
  const out: Pt[] = [];
  const gap = rows > 1 ? (y1 - y0) / (rows - 1) : 0;
  for (let r = 0; r < rows; r++) {
    const y = y0 + r * gap;
    const ltr = (r % 2 === 0) === fromLeft;
    const [a, b] = ltr ? [x0, x1] : [x1, x0];
    const n = Math.max(8, waves * 8);
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      out.push({ x: round(a + (b - a) * t), y: round(y + Math.sin(t * waves * Math.PI * 2) * amp) });
    }
    if (r < rows - 1) {
      const side = Math.sign(b - a);
      for (let k = 1; k < 6; k++) {
        const ang = -Math.PI / 2 + (k / 6) * Math.PI;
        out.push({ x: round(b + side * Math.cos(ang) * gap / 2), y: round(y + gap / 2 + Math.sin(ang) * gap / 2) });
      }
    }
  }
  return out;
}

/**
 * Rows across the page like `meander`, each curling into `loops` little
 * loop-the-loops that cross over themselves (a prolate cycloid): `b` is
 * how far a loop reaches above its row. A row starts and ends at its
 * lowest, y + b, where the half-circle turns join it.
 */
export function curlRows(x0: number, x1: number, y0: number, y1: number, rows: number, loops: number, b: number): Pt[] {
  const out: Pt[] = [];
  const gap = rows > 1 ? (y1 - y0) / (rows - 1) : 0;
  const a = Math.abs(x1 - x0) / (Math.PI * 2 * loops);
  for (let r = 0; r < rows; r++) {
    const y = y0 + r * gap;
    const dir = r % 2 === 0 ? 1 : -1;
    const start = dir > 0 ? x0 : x1;
    const n = loops * 28;
    for (let i = 0; i <= n; i++) {
      const u = Math.PI + (i / n) * loops * Math.PI * 2;
      out.push({ x: round(start + dir * (a * (u - Math.PI) - b * Math.sin(u))), y: round(y - b * Math.cos(u)) });
    }
    if (r < rows - 1) {
      const end = dir > 0 ? x1 : x0;
      for (let k = 1; k < 6; k++) {
        const ang = -Math.PI / 2 + (k / 6) * Math.PI;
        out.push({ x: round(end + dir * Math.cos(ang) * gap / 2), y: round(y + b + gap / 2 + Math.sin(ang) * gap / 2) });
      }
    }
  }
  return out;
}

/** Points along a straight line, end excluded. */
export function line(a: Pt, b: Pt, n: number): Pt[] {
  return Array.from({ length: n }, (_, i) => ({ x: round(a.x + ((b.x - a.x) * i) / n), y: round(a.y + ((b.y - a.y) * i) / n) }));
}

const round = (v: number): number => Math.round(v * 10) / 10;
