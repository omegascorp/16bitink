/**
 * Board geometry for the simulation. Every wall and pin is a capsule: a
 * segment with a half-thickness, so slopes and funnels at any angle need no
 * special cases. Board units are pixels of the 720 × 1280 board, y down.
 */

export interface Seg {
  readonly ax: number;
  readonly ay: number;
  readonly bx: number;
  readonly by: number;
  /** Half the thickness: the solid reaches this far from the centre line. */
  readonly t: number;
}

export interface Contact {
  /** Unit normal pointing from the segment towards the point. */
  nx: number;
  ny: number;
  /** How far the point must move along the normal to clear the capsule. */
  depth: number;
}

/**
 * Pushes a circle of radius `r` at (x, y) out of `s`. Writes the push into
 * `out` and returns true when they overlap.
 */
export function capsuleContact(s: Seg, x: number, y: number, r: number, out: Contact): boolean {
  const reach = s.t + r;
  // Cheap box reject first: most walls are nowhere near most grains.
  if (x < Math.min(s.ax, s.bx) - reach || x > Math.max(s.ax, s.bx) + reach) return false;
  if (y < Math.min(s.ay, s.by) - reach || y > Math.max(s.ay, s.by) + reach) return false;
  const dx = s.bx - s.ax;
  const dy = s.by - s.ay;
  const len2 = dx * dx + dy * dy;
  let u = len2 > 0 ? ((x - s.ax) * dx + (y - s.ay) * dy) / len2 : 0;
  u = u < 0 ? 0 : u > 1 ? 1 : u;
  const cx = s.ax + dx * u;
  const cy = s.ay + dy * u;
  const ox = x - cx;
  const oy = y - cy;
  const d2 = ox * ox + oy * oy;
  if (d2 >= reach * reach) return false;
  const d = Math.sqrt(d2);
  if (d > 1e-6) {
    out.nx = ox / d;
    out.ny = oy / d;
  } else {
    // Dead on the centre line: push out along the segment's left-hand normal.
    const l = Math.sqrt(len2) || 1;
    out.nx = -dy / l;
    out.ny = dx / l;
  }
  out.depth = reach - d;
  return true;
}

/** Distance from (x, y) to the segment's centre line. */
export function segDistance(s: Seg, x: number, y: number): number {
  const dx = s.bx - s.ax;
  const dy = s.by - s.ay;
  const len2 = dx * dx + dy * dy;
  let u = len2 > 0 ? ((x - s.ax) * dx + (y - s.ay) * dy) / len2 : 0;
  u = u < 0 ? 0 : u > 1 ? 1 : u;
  return Math.hypot(x - (s.ax + dx * u), y - (s.ay + dy * u));
}

/** Shortest distance between two segments' centre lines (0 when they cross). */
export function segSegDistance(a: Seg, b: Seg): number {
  if (segmentsCross(a, b)) return 0;
  return Math.min(segDistance(a, b.ax, b.ay), segDistance(a, b.bx, b.by), segDistance(b, a.ax, a.ay), segDistance(b, a.bx, a.by));
}

function segmentsCross(a: Seg, b: Seg): boolean {
  const d = (px: number, py: number, qx: number, qy: number, rx: number, ry: number): number => (qx - px) * (ry - py) - (qy - py) * (rx - px);
  const d1 = d(a.ax, a.ay, a.bx, a.by, b.ax, b.ay);
  const d2 = d(a.ax, a.ay, a.bx, a.by, b.bx, b.by);
  const d3 = d(b.ax, b.ay, b.bx, b.by, a.ax, a.ay);
  const d4 = d(b.ax, b.ay, b.bx, b.by, a.bx, a.by);
  return d1 * d2 < 0 && d3 * d4 < 0;
}
