import { pt } from '../../kit';
import type { Pt } from '../../pen';
import { type IslandArt, letter, offsetShape } from '../context';
import type { Water } from '../../../scenes/map/plan';

/**
 * Placement helpers for island drawings. Positions come only from the
 * island's placement random source, so they're the same in every chunk.
 */

/** Up to n spots from `gen` that pass `ok`, at least `gap` apart. */
export function place(a: IslandArt, n: number, gen: () => Pt, ok: (p: Pt) => boolean, gap = 0, tries = n * 8): Pt[] {
  const out: Pt[] = [];
  for (let t = 0; t < tries && out.length < n; t++) {
    const p = gen();
    if (!ok(p)) continue;
    if (gap > 0 && out.some((q) => Math.hypot(q.x - p.x, q.y - p.y) < gap)) continue;
    out.push(p);
  }
  return out;
}

/** A jittered grid of spots over the island's reach that pass `ok`: for forests, fields of dunes, pack ice. */
export function grid(a: IslandArt, step: number, ok: (p: Pt) => boolean, y0 = 0, y1 = a.layout.height, reach = 160): Pt[] {
  const out: Pt[] = [];
  const x0 = a.region.x0 - reach;
  const x1 = a.region.x1 + reach;
  let row = 0;
  for (let y = y0; y < y1; y += step * 0.82, row++) {
    for (let x = x0 + (row % 2) * step * 0.5; x < x1; x += step) {
      const p = pt(x + (a.rng() - 0.5) * step * 0.8, y + (a.rng() - 0.5) * step * 0.7);
      if (ok(p)) out.push(p);
    }
  }
  return out;
}

/** A random spot across the island: anywhere from its far shore to its sand. */
export function anywhere(a: IslandArt, u0 = -0.05, u1 = 1.05): Pt {
  const x = a.at(u0 + a.rng() * (u1 - u0));
  const top = Math.max(8, a.top(x));
  return pt(x, top + a.rng() * (a.coast(x) - top));
}

/** A random spot in the sea within `near`..`far` px south of the shore. */
export function offshore(a: IslandArt, near: number, far: number, u0 = 0, u1 = 1): Pt {
  const x = a.at(u0 + a.rng() * (u1 - u0));
  return pt(x, a.coast(x) + near + a.rng() * (far - near));
}

export function watersOf(a: IslandArt, ...kinds: Water['kind'][]): Water[] {
  return a.plan.waters.filter((w) => kinds.includes(w.kind));
}

/** A small italic place name, if it falls in the chunk. */
export function name(a: IslandArt, text: string, x: number, y: number, size = 15, angle = 0): void {
  if (x + 120 < a.span.x0 || x - 120 > a.span.x1) return;
  letter(a.ctx, text, x, y, { size, color: a.ink, alpha: 0.75, angle });
}

/** A line following the island's outline `d` px out to sea, as points (for reefs, ice edges, kelp lines). */
export function ring(a: IslandArt, d: number): Pt[] {
  return offsetShape(a.land, d, 4);
}

/** The centre of a closed shape. */
export function centre(shape: readonly Pt[]): Pt {
  let x = 0;
  let y = 0;
  for (const p of shape) {
    x += p.x;
    y += p.y;
  }
  return pt(x / shape.length, y / shape.length);
}
