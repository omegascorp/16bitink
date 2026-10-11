/**
 * The crab's footsteps: where it has been, as points along the path its
 * feet took (the middle of its feet), each with how far along the path it
 * is. A shell chain's line follows them (see line.ts), so a follower goes
 * wherever the crab went: over a pool, up a step it jumped, through a
 * tunnel it dug.
 */
export interface TrailPoint {
  readonly x: number;
  /** World y of the feet. */
  readonly y: number;
  /** Px along the path from where it began. */
  readonly d: number;
}

export const TRAIL = {
  /** Px the crab moves before another footstep is put down. */
  step: 3,
  /** Px of path kept behind the last follower, so it can always find its way. */
  keep: 64,
} as const;

export class Trail {
  private points: TrailPoint[];

  constructor(x: number, y: number) {
    this.points = [{ x, y, d: 0 }];
  }

  /** Px along the path to its newest point: where the crab is. */
  get end(): number {
    return this.points[this.points.length - 1]!.d;
  }

  /** Px along the path to its oldest point still kept. */
  get start(): number {
    return this.points[0]!.d;
  }

  /** Adds where the crab's feet are now, once it has moved a footstep from the last. */
  add(x: number, y: number): void {
    const last = this.points[this.points.length - 1]!;
    const step = Math.hypot(x - last.x, y - last.y);
    if (step >= TRAIL.step) this.points.push({ x, y, d: last.d + step });
  }

  /** Forgets the path before `d` (less a margin): nothing following needs it any more. */
  forget(d: number): void {
    const keep = d - TRAIL.keep;
    let i = 0;
    while (i < this.points.length - 2 && this.points[i + 1]!.d < keep) i++;
    if (i > 0) this.points = this.points.slice(i);
  }

  /** Where on the path `d` px along it is, between footsteps (clamped to what's kept). */
  at(d: number): { x: number; y: number } {
    const pts = this.points;
    if (d <= pts[0]!.d) return pts[0]!;
    if (d >= this.end) return pts[pts.length - 1]!;
    let lo = 0;
    let hi = pts.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (pts[mid]!.d <= d) lo = mid;
      else hi = mid;
    }
    const a = pts[lo]!;
    const b = pts[hi]!;
    const u = (d - a.d) / (b.d - a.d || 1);
    return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u };
  }

  /** How far along the path its nearest point to (x, y) is, searching the newest first; and how far off that point is. */
  nearest(x: number, y: number): { d: number; off: number } {
    let best = { d: this.end, off: Infinity };
    for (let i = this.points.length - 1; i >= 0; i--) {
      const p = this.points[i]!;
      const off = Math.hypot(p.x - x, p.y - y);
      if (off < best.off) best = { d: p.d, off };
    }
    return best;
  }
}
