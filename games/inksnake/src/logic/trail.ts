import { dist, pt, type Pt } from './vec';

/** Board px between two samples of the body's path. */
export const SPACING = 4;

/**
 * The snake's body: the path its head has taken, sampled every SPACING px,
 * head first. The body is exactly as long as `length`: the head adds
 * samples as it moves, and the oldest drop off the tail. Moving one sample
 * (a coil tightening) moves that bit of the body and nothing else.
 */
export class Trail {
  /** Head first; pts[0] is always the head. */
  pts: Pt[];
  length: number;
  /** How far the head has moved since the newest sample, px. */
  private carry = 0;

  constructor(head: Pt, heading: number, length: number) {
    this.length = length;
    const n = Math.ceil(length / SPACING) + 1;
    // Laid out straight behind the head.
    this.pts = Array.from({ length: n }, (_, i) => pt(head.x - Math.cos(heading) * i * SPACING, head.y - Math.sin(heading) * i * SPACING));
  }

  get head(): Pt {
    return this.pts[0]!;
  }

  /** How many samples the body uses for its length. */
  get count(): number {
    return Math.min(this.pts.length, Math.ceil(this.length / SPACING) + 1);
  }

  /** The head moved to `p`: lay samples along the way so they stay SPACING apart, and trim the tail. */
  moveHead(p: Pt): void {
    const prev = this.pts[0]!;
    const step = dist(prev, p);
    const second = this.pts[1] ?? prev;
    // pts[0] is the moving head; pts[1] the newest fixed sample.
    let from = second;
    let gap = dist(from, p);
    this.pts[0] = p;
    if (step === 0) return;
    while (gap >= SPACING) {
      const t = SPACING / gap;
      const s = pt(from.x + (p.x - from.x) * t, from.y + (p.y - from.y) * t);
      this.pts.splice(1, 0, s);
      from = s;
      gap = dist(from, p);
    }
    this.carry = gap;
    this.trim();
  }

  /** Drops samples past the tail (a few spare are kept, so growing has somewhere to grow into). */
  trim(): void {
    const keep = Math.ceil(this.length / SPACING) + 2;
    if (this.pts.length > keep) this.pts.length = keep;
  }

  /**
   * The point `s` px back along the body from the head (clamped to the
   * tail): what lumps ride on and the drawing follows.
   */
  at(s: number): Pt {
    const pts = this.pts;
    if (s <= 0) return pts[0]!;
    // The head's own sample sits `carry` from the next; the rest are SPACING apart.
    const first = Math.max(1e-6, dist(pts[0]!, pts[1] ?? pts[0]!));
    if (s <= first) {
      const b = pts[1] ?? pts[0]!;
      const t = s / first;
      return pt(pts[0]!.x + (b.x - pts[0]!.x) * t, pts[0]!.y + (b.y - pts[0]!.y) * t);
    }
    const rest = s - first;
    const i = 1 + Math.floor(rest / SPACING);
    const last = Math.min(this.count, this.pts.length) - 1;
    if (i >= last) return pts[last]!;
    const t = (rest - (i - 1) * SPACING) / SPACING;
    const a = pts[i]!;
    const b = pts[i + 1]!;
    return pt(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t);
  }

  /** Distance back along the body of sample `i`, px. */
  sAt(i: number): number {
    if (i <= 0) return 0;
    const first = dist(this.pts[0]!, this.pts[1] ?? this.pts[0]!);
    return first + (i - 1) * SPACING;
  }

  /** The tail's tip. */
  get tail(): Pt {
    return this.pts[this.count - 1]!;
  }

  /** How far the head is past the newest fixed sample, px (for tests). */
  get headCarry(): number {
    return this.carry;
  }
}
