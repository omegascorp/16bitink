import type { Draw } from '../kit';
import { glow, mix, paint, SHADOW } from '../paint';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { pt } from './parts';

/**
 * The Aster's design ideas, as our printer borrows them for the Mk 2 set
 * (Mycel's broken gear is the Aster crew's, and the suit learns its designs
 * from it): ribbed shell-like plates instead of riveted panels, dark cord
 * lashings instead of rivets, small hexagonal windows with a teal-green
 * glow, and the eight-pointed star. Our silhouette, their ideas.
 */
export const ASTER = {
  /** Their woven cord, dark red-brown. */
  cord: '#5a2e26',
  /** The glow of their power in glass. */
  glow: '#5fe0b8',
  /** Their pale glazed ceramic, bone with a lilac glaze. */
  ceramic: '#ece6ea',
} as const;

/** A small hexagonal window of glass, lit teal-green from inside. */
export function hexWindow(d: Draw, c: Pt, r: number, lit: string = ASTER.glow): void {
  const hex = Array.from({ length: 6 }, (_, i) => pt(c.x + Math.cos((i / 6) * Math.PI * 2) * r, c.y + Math.sin((i / 6) * Math.PI * 2) * r));
  glow(d.pen.ctx, c, r * 2.6, lit, 0.45);
  paint(d, hex, lit, { alpha: 0.95, shadow: 0.35, hatch: 0, line: 0.35, gloss: true });
  d.pen.dot(c.x - r * 0.3, c.y - r * 0.35, Math.max(0.15, r * 0.22), PAPER_FILL, 0.9);
}

/** A cord lashing across a join at `c`, wound `turns` times, running across `dir` (radians). */
export function lashing(d: Draw, c: Pt, len: number, dir: number, turns = 3): void {
  const ux = Math.cos(dir);
  const uy = Math.sin(dir);
  const step = len * 0.28;
  for (let k = 0; k < turns; k++) {
    const o = (k - (turns - 1) / 2) * step;
    const a = pt(c.x - uy * o - ux * len * 0.5, c.y + ux * o - uy * len * 0.5);
    const b = pt(c.x - uy * o + ux * len * 0.5, c.y + ux * o + uy * len * 0.5);
    d.pen.stroke([a, b], Math.max(0.35, len * 0.16), ASTER.cord, 1, false);
    d.pen.hair([pt(a.x - uy * 0.12, a.y - 0.12), pt(b.x - uy * 0.12, b.y - 0.12)], Math.max(0.12, len * 0.05), mix(ASTER.cord, '#ffffff', 0.4), 0.7);
  }
}

/** The eight-pointed star, their glyph. */
export function star8(d: Draw, c: Pt, r: number, color: string): void {
  const pts: Pt[] = [];
  for (let i = 0; i < 16; i++) {
    const a = -Math.PI / 2 + (i / 16) * Math.PI * 2;
    const k = i % 2 === 0 ? r : r * 0.45;
    pts.push(pt(c.x + Math.cos(a) * k, c.y + Math.sin(a) * k));
  }
  paint(d, pts, color, { alpha: 0.95, shadow: 0.3, hatch: 0, line: 0.3, gloss: true });
}

/** Ribs fanning out from `from` across `shape`, as on a shell: each a crease with a lit ridge beside it. */
export function ribs(d: Draw, shape: readonly Pt[], from: Pt, wash: string, n = 6, spread = Math.PI * 0.8, dir = -Math.PI / 2, len = 14): void {
  d.pen.clipped(shape, () => {
    for (let i = 0; i < n; i++) {
      const a = dir - spread / 2 + (i / (n - 1)) * spread;
      const tip = pt(from.x + Math.cos(a) * len, from.y + Math.sin(a) * len);
      d.pen.hair([from, tip], 0.35, mix(wash, SHADOW, 0.5), 0.85);
      d.pen.hair([pt(from.x - 0.3, from.y - 0.2), pt(tip.x - 0.3, tip.y - 0.2)], 0.25, mix(wash, '#ffffff', 0.55), 0.7);
    }
  });
}
