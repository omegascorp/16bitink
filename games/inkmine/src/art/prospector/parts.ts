import { closed, edge, oval, pt, shade, skin, tint, type Draw } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';

/** Washes shared by the prospector's parts. */
export const WASH = {
  fabric: '#dfe1e6',
  contractor: '#d5dde8',
  armour: '#c7d0dc',
  metal: '#a9b0bb',
  darkMetal: '#7d8591',
  glass: '#cfe2ee',
  visor: '#3d4a63',
  cell: '#c4ccd8',
  can: '#c9b98f',
  rubber: '#6b6e76',
} as const;

/** Paper, a wash, shadow-side hatching and a pen outline: the usual way a part is drawn. */
export function part(d: Draw, shape: readonly Pt[], wash: string, opts: { alpha?: number; shadow?: number; cross?: boolean; line?: number } = {}): void {
  skin(d, shape, wash, opts.alpha ?? 0.5);
  if (opts.shadow !== 0) shade(d, shape, opts.shadow ?? 0.4, opts.cross ?? false);
  edge(d, shape, opts.line ?? 1.1);
}

/** A rounded rectangle's outline. */
export function roundRect(x0: number, y0: number, x1: number, y1: number, r: number): Pt[] {
  const corner = (cx: number, cy: number, from: number): Pt[] =>
    Array.from({ length: 4 }, (_, i) => pt(cx + Math.cos(from + (i / 3) * (Math.PI / 2)) * r, cy + Math.sin(from + (i / 3) * (Math.PI / 2)) * r));
  return [...corner(x1 - r, y0 + r, -Math.PI / 2), ...corner(x1 - r, y1 - r, 0), ...corner(x0 + r, y1 - r, Math.PI / 2), ...corner(x0 + r, y0 + r, Math.PI)];
}

/** A stitched patch: a slightly crooked square with dashed stitches round it. */
export function patch(d: Draw, cx: number, cy: number, s: number, wash: string): void {
  const sq = [pt(cx - s, cy - s * 0.9), pt(cx + s, cy - s), pt(cx + s * 0.95, cy + s), pt(cx - s, cy + s * 0.95)];
  tint(d, sq, wash, 0.45);
  edge(d, sq, 0.6, 0.85);
  const inset = sq.map((p) => pt(cx + (p.x - cx) * 0.72, cy + (p.y - cy) * 0.72));
  for (let i = 0; i < 4; i++) {
    const a = inset[i]!;
    const b = inset[(i + 1) % 4]!;
    for (let k = 0; k < 3; k++) {
      const t0 = (k + 0.15) / 3;
      const t1 = (k + 0.55) / 3;
      d.pen.hair([pt(a.x + (b.x - a.x) * t0, a.y + (b.y - a.y) * t0), pt(a.x + (b.x - a.x) * t1, a.y + (b.y - a.y) * t1)], 0.4, d.ink, 0.8);
    }
  }
}

/** Rivets: small inked dots with a glint. */
export function rivets(d: Draw, at: readonly Pt[], r = 0.55): void {
  for (const p of at) {
    d.pen.dot(p.x, p.y, r, d.ink, 0.85);
    d.pen.dot(p.x - r * 0.3, p.y - r * 0.35, r * 0.35, PAPER_FILL, 0.8);
  }
}

/** A highlight stroke along a curved surface. */
export function sheen(d: Draw, pts: readonly Pt[], w = 0.9): void {
  d.pen.stroke(pts, w, PAPER_FILL, 0.85, false);
}

export { closed, oval, pt };
