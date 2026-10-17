import { hash } from '../../logic/noise';
import { cub, oval, pt, TAU, type Draw } from '../kit';
import { dab, gleam, glow, mix, paint, SHADOW } from '../paint';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';

/**
 * The Tidesingers' design language (spec, "The Tidesingers"): a sea people
 * who never had fire, so nothing they make is metal. What they make flows
 * like the water they fly through: woven seagrass fibre twined in soft
 * bands, shell laid in mosaics and polished to its nacre, dark basalt
 * knapped and ground, and glass sponge, the lacy lattice of glass a sponge
 * grows, which they farm and fill with glowing plankton for lanterns. Their
 * light is a cool blue-white (the Aster's is teal), and their shapes are
 * spirals and long tapering curves, never the Aster's rosettes and hexagons.
 */
export const TIDE = {
  /** Their skin above: a deep blue-violet. */
  skin: '#33357a',
  /** The same skin where the light rolls over it. */
  skinLit: '#6f72c4',
  /** The pale chevrons on their shoulders. */
  mark: '#b9bde6',
  /** Their undersides: pale, a little lavender. */
  belly: '#ebe7f1',
  bellyShade: '#8a84b4',
  /** Bioluminescence: spots on the wings, the lanterns' plankton. */
  glow: '#a9e4ff',
  glowCore: '#f2fbff',
  /** Seagrass fibre, twined and dried: olive straw. */
  fibre: '#a99a68',
  fibreDark: '#6d6440',
  /** The wax they seal weaving with: a pale, cloudy cream. */
  wax: '#e9dfbf',
  /** Shell: nacre, and the iridescence that plays over it. */
  nacre: '#eee6e6',
  iris: ['#f2b9cf', '#b9e3d6', '#bcc9f2', '#f3e2b0'],
  /** Basalt: what their tools are ground from. */
  stone: '#4d4a57',
  stoneLit: '#8a8594',
  /** Glass sponge: nearly white glass, faintly blue. */
  glass: '#e3f2f2',
  /** The sea seen through things: Brine's purple water. */
  sea: '#6f5a9a',
  /** What they draw in sand, and the sand itself. */
  sand: '#c9b9a0',
} as const;

/**
 * Twined weaving over a shape, as their screens and the air bell are made:
 * warp strands running along `angle`, and rows of twined weft across them,
 * each twist a short slanted stitch with a lit ridge, so it reads as fibre,
 * not a grid.
 */
export function twine(d: Draw, clip: readonly Pt[], c: Pt, w: number, h: number, row: number, color: string, angle = 0, alpha = 1): void {
  const ca = Math.cos(angle);
  const sa = Math.sin(angle);
  const at = (u: number, v: number): Pt => pt(c.x + u * ca - v * sa, c.y + u * sa + v * ca);
  const dark = mix(color, SHADOW, 0.5);
  const lit = mix(color, PAPER_FILL, 0.55);
  d.pen.clipped(clip, () => {
    // The warp, faint, between the rows.
    for (let u = -w; u <= w; u += row * 0.9) d.pen.hair([at(u, -h), at(u + row * 0.2, 0), at(u, h)], 0.3, dark, 0.3 * alpha);
    for (let j = -Math.ceil(h / row); j <= Math.ceil(h / row); j++) {
      const v = j * row;
      const flip = j % 2 === 0 ? 1 : -1;
      for (let u = -w; u <= w; u += row * 0.9) {
        const a = at(u - row * 0.32, v - row * 0.3 * flip);
        const b = at(u + row * 0.32, v + row * 0.3 * flip);
        const k = 0.75 + hash(Math.round(u * 7), j, 1300) * 0.5;
        d.pen.hair([a, b], Math.max(0.3, row * 0.24), dark, 0.6 * alpha * k);
        d.pen.hair([pt(a.x - 0.2, a.y - 0.25), pt(b.x - 0.2, b.y - 0.25)], Math.max(0.2, row * 0.1), lit, 0.55 * alpha * k);
      }
    }
  });
}

/** Nacre over a shape: the body pale, iridescent washes drifting over it, fine growth lines curving round `hinge`. */
export function nacre(d: Draw, shape: readonly Pt[], hinge: Pt, size: number, seed: number, line = 0.6): void {
  paint(d, shape, TIDE.nacre, { alpha: 1, shadow: 0.4, hatch: 0, line, gloss: true });
  d.pen.clipped(shape, () => {
    for (let k = 0; k < 4; k++) {
      const a = hash(k, seed, 1310) * TAU;
      const r = size * (0.3 + hash(k, seed, 1311) * 0.5);
      dab(d, oval(hinge.x + Math.cos(a) * r, hinge.y + Math.sin(a) * r, size * 0.45, size * 0.28, 12), TIDE.iris[k % 4]!, 0.45, size * 0.18);
    }
    for (let k = 1; k <= 4; k++) {
      const r = (size * k) / 4.2;
      d.pen.hair(Array.from({ length: 9 }, (_, i) => pt(hinge.x + Math.cos(-Math.PI * 0.95 + (i / 8) * Math.PI * 0.9) * r, hinge.y + Math.sin(-Math.PI * 0.95 + (i / 8) * Math.PI * 0.9) * r * 0.8)), 0.3, mix(TIDE.nacre, SHADOW, 0.4), 0.55);
    }
  });
}

/** A ground basalt piece: dark, its facets knapped, a soft gleam where it's polished. */
export function basalt(d: Draw, shape: readonly Pt[], seed: number, line = 0.7): void {
  paint(d, shape, TIDE.stone, { alpha: 1, shadow: 0.55, hatch: 0.2, line });
  d.pen.clipped(shape, () => {
    const xs = shape.map((p) => p.x);
    const ys = shape.map((p) => p.y);
    const x0 = Math.min(...xs);
    const y0 = Math.min(...ys);
    const w = Math.max(...xs) - x0;
    const h = Math.max(...ys) - y0;
    for (let k = 0; k < 5; k++) {
      const c = pt(x0 + hash(k, seed, 1320) * w, y0 + hash(k, seed, 1321) * h);
      dab(d, oval(c.x, c.y, w * 0.18, h * 0.12, 10), k % 2 ? TIDE.stoneLit : mix(TIDE.stone, SHADOW, 0.4), 0.3, Math.min(w, h) * 0.08);
    }
    d.pen.stipple(shape, Math.round(w * h * 0.12), () => 0.5, 0.28, mix(TIDE.stoneLit, PAPER_FILL, 0.15));
    d.pen.stipple(shape, Math.round(w * h * 0.12), () => 0.5, 0.3, mix(TIDE.stone, SHADOW, 0.6));
  });
}

/**
 * A glass-sponge lantern: a vase of lacy glass lattice (a Venus' flower
 * basket, grown in their farms), tapered at its foot, a frilled sieve at its
 * mouth, plankton glowing inside. `c` is the middle of its foot; `h` its
 * height; `lit` 0..1 how bright. Its halo is the caller's.
 */
export function glassSponge(d: Draw, c: Pt, w: number, h: number, lit: number): void {
  const half = (v: number): number => (w / 2) * (0.45 + 0.55 * Math.sin(Math.PI * (0.18 + v * 0.7)));
  const side = (s: number): Pt[] => Array.from({ length: 13 }, (_, i) => pt(c.x + s * half(i / 12), c.y - (i / 12) * h));
  const vase = [...side(-1), ...side(1).reverse()];
  if (lit > 0) glow(d.pen.ctx, pt(c.x, c.y - h * 0.5), Math.max(w, h) * 0.7, TIDE.glow, 0.45 * lit);
  paint(d, vase, lit > 0 ? mix(TIDE.glass, TIDE.glow, 0.35) : mix(TIDE.glass, '#4a4f66', 0.35), { alpha: 0.65, shadow: 0.35, hatch: 0, line: 0, gloss: true });
  d.pen.clipped(vase, () => {
    if (lit > 0) {
      glow(d.pen.ctx, pt(c.x, c.y - h * 0.45), w * 0.6, TIDE.glowCore, 0.75 * lit);
      // Plankton motes inside.
      for (let k = 0; k < 9; k++) d.pen.dot(c.x + (hash(k, Math.round(c.x), 1330) - 0.5) * w * 0.6, c.y - h * (0.15 + hash(k, Math.round(c.y), 1331) * 0.7), 0.45, TIDE.glowCore, 0.9 * lit);
    }
    // The lattice: rings round it, ribs up it, and diagonals braced across each cell.
    const rings = 7;
    const ink = lit > 0 ? mix(TIDE.glass, '#3a5a78', 0.5) : mix(TIDE.glass, SHADOW, 0.55);
    for (let j = 0; j <= rings; j++) {
      const v = j / rings;
      const y = c.y - v * h;
      const r = half(v);
      d.pen.hair(Array.from({ length: 11 }, (_, i) => pt(c.x - r + (i / 10) * r * 2, y + Math.sin((i / 10) * Math.PI) * r * 0.22)), 0.32, ink, 0.75);
    }
    for (let k = -3; k <= 3; k++) {
      const u = k / 3.4;
      d.pen.hair(Array.from({ length: 13 }, (_, i) => pt(c.x + u * half(i / 12), c.y - (i / 12) * h + Math.cos(u * 1.4) * half(i / 12) * 0.2)), 0.3, ink, 0.6);
    }
    for (let j = 0; j < rings; j++) {
      for (let k = -3; k < 3; k++) {
        const v0 = j / rings;
        const v1 = (j + 1) / rings;
        const a = pt(c.x + (k / 3.4) * half(v0), c.y - v0 * h);
        const b = pt(c.x + ((k + 1) / 3.4) * half(v1), c.y - v1 * h);
        const a2 = pt(c.x + ((k + 1) / 3.4) * half(v0), c.y - v0 * h);
        const b2 = pt(c.x + (k / 3.4) * half(v1), c.y - v1 * h);
        d.pen.hair([a, b], 0.2, ink, 0.4);
        d.pen.hair([a2, b2], 0.2, ink, 0.4);
      }
    }
  });
  // The frilled sieve over its mouth, and a tuft of glass threads at its foot.
  const top = c.y - h;
  const r = half(1);
  const frill: Pt[] = [];
  for (let i = 0; i <= 12; i++) frill.push(pt(c.x - r * 1.15 + (i / 12) * r * 2.3, top - (i % 2 ? 1.3 : 0.2) - Math.sin((i / 12) * Math.PI) * 0.8));
  d.pen.hair(frill, 0.45, mix(TIDE.glass, SHADOW, 0.45), 0.85);
  for (let k = -2; k <= 2; k++) d.pen.hair([pt(c.x + k * 0.6, c.y), pt(c.x + k * 1.6, c.y + 2.6)], 0.3, mix(TIDE.glass, SHADOW, 0.3), 0.7);
  d.pen.stroke([...side(-1)], 0.5, d.ink, 0.6, false);
  d.pen.stroke([...side(1)], 0.5, d.ink, 0.6, false);
  gleam(d, side(-1).slice(3, 10).map((p) => pt(p.x + 0.9, p.y)), 0.5, 0.6);
}

/** A cord of twisted fibre from `a` to `b`, sagging by `sag`: a dark line with the twist picked out in light. */
export function fibreCord(d: Draw, a: Pt, b: Pt, sag: number, w = 0.8): void {
  const mid = pt((a.x + b.x) / 2, (a.y + b.y) / 2 + sag);
  const line = cub(a, mid, mid, b, 14);
  d.pen.stroke(line, w, TIDE.fibreDark, 0.95, false);
  for (let i = 1; i < line.length - 1; i += 2) {
    const p = line[i]!;
    d.pen.hair([pt(p.x - w * 0.4, p.y - w * 0.5), pt(p.x + w * 0.4, p.y + w * 0.3)], w * 0.3, mix(TIDE.fibre, PAPER_FILL, 0.4), 0.8);
  }
}

/** A spiral, as they mark things: `turns` turns out from `c` to radius `r`. */
export function spiral(c: Pt, r: number, turns: number, start = 0, n = 40): Pt[] {
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n;
    const a = start + t * turns * TAU;
    return pt(c.x + Math.cos(a) * r * t, c.y + Math.sin(a) * r * t);
  });
}

/**
 * One of the Tidesingers' lift bags: a bladder of air, round above and
 * gathered to a mouth below as a real lift bag is, held in a net of twined
 * fibre whose cords come together in a knot under it. Returns that knot.
 */
export function liftBag(d: Draw, c: Pt, r: number): Pt {
  const mouthY = c.y + r * 1.25;
  const sac = [...cub(pt(c.x - r * 0.3, mouthY), pt(c.x - r * 1.3, c.y + r * 0.5), pt(c.x - r * 1.2, c.y - r * 1.05), pt(c.x, c.y - r * 1.05), 12), ...cub(pt(c.x, c.y - r * 1.05), pt(c.x + r * 1.2, c.y - r * 1.05), pt(c.x + r * 1.3, c.y + r * 0.5), pt(c.x + r * 0.3, mouthY), 12)];
  paint(d, sac, mix('#b9c2dc', TIDE.sea, 0.35), { alpha: 0.62, shadow: 0.45, hatch: 0, line: 0.6, gloss: true });
  d.pen.clipped(sac, () => {
    dab(d, oval(c.x - r * 0.35, c.y - r * 0.45, r * 0.5, r * 0.35, 12), PAPER_FILL, 0.85, r * 0.12);
    // The net over it: meridians from the knot over the crown, and rings round it.
    for (let k = -3; k <= 3; k++) d.pen.hair(cub(pt(c.x + k * 0.3, mouthY), pt(c.x + k * r * 0.4, c.y + r * 0.6), pt(c.x + k * r * 0.42, c.y - r * 0.7), pt(c.x + k * r * 0.1, c.y - r * 1.1), 10), 0.4, TIDE.fibreDark, 0.75);
    for (const t of [-0.5, 0, 0.5]) {
      const y = c.y + t * r;
      const w = r * Math.sqrt(Math.max(0, 1 - t * t)) * 1.05;
      d.pen.hair(Array.from({ length: 11 }, (_, i) => pt(c.x - w + (i / 10) * w * 2, y + Math.sin((i / 10) * Math.PI) * r * 0.18)), 0.35, TIDE.fibreDark, 0.65);
    }
  });
  const knot = pt(c.x, mouthY + 2.4);
  for (const k of [-1, 0, 1]) d.pen.hair([pt(c.x + k * r * 0.35, mouthY - 0.6), knot], 0.45, TIDE.fibreDark, 0.85);
  d.pen.dot(knot.x, knot.y, 1, TIDE.fibreDark, 1);
  return knot;
}
