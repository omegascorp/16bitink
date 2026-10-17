import { closed, edge, oval, pt, tint, type Draw } from '../kit';
import { gleam, paint } from '../paint';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';

/**
 * Colours shared by the prospector's parts (and the lander's fittings).
 * The prospector is the blue "you" of the catalog, so the suit is washed in
 * cobalt, with ochre leather and steel round it for contrast; their skin is
 * a cool mint with darker markings and lilac frills (spec, "The
 * prospector's look").
 */
export const WASH = {
  /** The Mk 0–3 work suit's cloth. */
  fabric: '#6f8dc6',
  /** Guild contractor's issue: a deeper slate blue. */
  contractor: '#56709f',
  /** Enamel plates over the contractor's suit. */
  enamel: '#e4dfd1',
  /** Deep-space armour plates, ceramic white, over a cobalt undersuit. */
  armour: '#d9dbe0',
  undersuit: '#3a4f8c',
  /** The deep-space pod's gunmetal. */
  gunmetal: '#5a6788',
  metal: '#a9b2be',
  darkMetal: '#6c7482',
  glass: '#b8d3e6',
  visor: '#26314f',
  cell: '#bcc6d4',
  /** The dented fuel can. */
  can: '#c69a4c',
  leather: '#a4744a',
  rubber: '#4d515b',
  skin: '#8ecab6',
  markings: '#3e7c76',
  frill: '#a98bd6',
  /** Lamp lenses and the cell's charge, lit. */
  lamp: '#fff0b8',
  charge: '#e8b33c',
} as const;

export interface PartOpts {
  readonly alpha?: number;
  readonly shadow?: number;
  readonly cross?: boolean;
  readonly line?: number;
  readonly gloss?: boolean;
  readonly hatch?: number;
}

/** A part painted the usual way: body colour, light and shadow, pooled edge, a fine pen line. */
export function part(d: Draw, shape: readonly Pt[], wash: string, opts: PartOpts = {}): void {
  paint(d, shape, wash, { alpha: opts.alpha ?? 0.92, shadow: opts.shadow ?? 0.45, cross: opts.cross ?? false, line: opts.line ?? 0.6, gloss: opts.gloss ?? false, hatch: opts.hatch ?? 0.16 });
}

/** A rounded rectangle's outline. */
export function roundRect(x0: number, y0: number, x1: number, y1: number, r: number): Pt[] {
  const corner = (cx: number, cy: number, from: number): Pt[] =>
    Array.from({ length: 4 }, (_, i) => pt(cx + Math.cos(from + (i / 3) * (Math.PI / 2)) * r, cy + Math.sin(from + (i / 3) * (Math.PI / 2)) * r));
  return [...corner(x1 - r, y0 + r, -Math.PI / 2), ...corner(x1 - r, y1 - r, 0), ...corner(x0 + r, y1 - r, Math.PI / 2), ...corner(x0 + r, y0 + r, Math.PI)];
}

/** A stitched patch: a slightly crooked square of other cloth with dashed stitches round it. */
export function patch(d: Draw, cx: number, cy: number, s: number, wash: string): void {
  const sq = [pt(cx - s, cy - s * 0.9), pt(cx + s, cy - s), pt(cx + s * 0.95, cy + s), pt(cx - s, cy + s * 0.95)];
  paint(d, sq, wash, { alpha: 0.85, shadow: 0.25, hatch: 0, line: 0.4, lineAlpha: 0.7 });
  const inset = sq.map((p) => pt(cx + (p.x - cx) * 0.74, cy + (p.y - cy) * 0.74));
  for (let i = 0; i < 4; i++) {
    const a = inset[i]!;
    const b = inset[(i + 1) % 4]!;
    for (let k = 0; k < 3; k++) {
      const t0 = (k + 0.15) / 3;
      const t1 = (k + 0.55) / 3;
      d.pen.hair([pt(a.x + (b.x - a.x) * t0, a.y + (b.y - a.y) * t0), pt(a.x + (b.x - a.x) * t1, a.y + (b.y - a.y) * t1)], 0.3, d.ink, 0.75);
    }
  }
}

/** Rivets: small domes, dark below and caught by the light on top. */
export function rivets(d: Draw, at: readonly Pt[], r = 0.55): void {
  for (const p of at) {
    d.pen.dot(p.x + r * 0.25, p.y + r * 0.3, r, d.ink, 0.55);
    d.pen.dot(p.x, p.y, r * 0.8, '#9aa3b0', 1);
    d.pen.dot(p.x - r * 0.25, p.y - r * 0.3, r * 0.38, PAPER_FILL, 0.9);
  }
}

/** A highlight along a curved surface. */
export function sheen(d: Draw, pts: readonly Pt[], w = 0.9): void {
  gleam(d, pts, w, 0.85);
}

/** A seam: a fine dark line with a lit line just under it, as a panel joint catches the light. */
export function seam(d: Draw, pts: readonly Pt[], w = 0.4): void {
  d.pen.hair(pts, w, d.ink, 0.7);
  d.pen.hair(pts.map((p) => pt(p.x + 0.15, p.y + w * 0.9)), w * 0.8, PAPER_FILL, 0.45);
}

export { closed, edge, oval, pt, tint };
