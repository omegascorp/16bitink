import { ellipse, type Pen, type Pt } from '../pen';

/**
 * The fish drawing model: a body profile plus fins and surface detail,
 * all in a FISH_TEX square canvas, nose to the right. Species files only
 * describe an Anatomy; fishArt.ts turns it into ink.
 */

/** Texture side in px (power of two, so the GPU can mipmap the fine lines). */
export const FISH_TEX = 256;
/** A fish of game radius R is drawn at scale R / FISH_RADIUS. */
export const FISH_RADIUS = 86;
/** Canvas centre: the body is centred here. */
export const C = FISH_TEX / 2;
export const PAPER_FILL = '#fffaf0';

/**
 * fork: V-notched. round: fan. point: none (eels, the body tapers out).
 * lunate: a stiff crescent (tunas, swordfish). shark: long upper lobe.
 */
export type Tail = 'fork' | 'round' | 'point' | 'lunate' | 'shark';

export interface Fin {
  /** Along the body, 0 = nose, 1 = tail base. */
  readonly from: number;
  readonly to: number;
  /** Height relative to the body's half height. */
  readonly height: number;
  /** Spines tallest at the front with membrane dips between them. */
  readonly spiny?: boolean;
  /** A stiff triangle raked back (sharks, tunas). */
  readonly tri?: boolean;
}

export interface Anatomy {
  /** Half length and maximum half height of the body. */
  readonly hl: number;
  readonly hh: number;
  /** Where the body is tallest (0 nose .. 1 tail). */
  readonly peak: number;
  /** 0 = pointed snout, 1 = round head. */
  readonly blunt: number;
  /** Tail-stalk height as a fraction of hh. */
  readonly peduncle: number;
  readonly tail: Tail;
  readonly tailSize: number;
  readonly dorsal?: Fin;
  readonly dorsal2?: Fin;
  readonly anal?: Fin;
  /** Pectoral fan size relative to hh; 0 for none. */
  readonly pectoral: number;
  readonly pelvic: boolean;
  readonly scales: boolean;
  readonly eye: { readonly t: number; readonly r: number };
  readonly mouth: 'small' | 'teeth' | 'gape' | 'beak';
  readonly wash: string;
  readonly finWash?: string;
  readonly ink?: string;
  /** Gill cover style: bony fish have a cover, sharks show slits. Default bony. */
  readonly gills?: 'bony' | 'slits' | 'none';
  /** Draw the dashed lateral line. Default true. */
  readonly lateral?: boolean;
  /** Detail drawn on top of the finished body. */
  readonly extras?: (k: Kit) => void;
  /** Detail drawn first, behind fins and body (filaments, long rays). */
  readonly under?: (k: Kit) => void;
  /** Body undulation amplitude in px (eels). */
  readonly wave?: number;
}

/** Everything a species' detail hook needs. */
export interface Kit {
  readonly pen: Pen;
  readonly a: Anatomy;
  readonly body: Pt[];
  readonly heavy: boolean;
  readonly ink: string;
  x(t: number): number;
  h(t: number): number;
}

// ---------------------------------------------------------------- profile

export function heightAt(a: Anatomy, t: number): number {
  if (t <= a.peak) {
    const u = t / a.peak;
    return a.hh * Math.pow(Math.sin((u * Math.PI) / 2), 0.35 + 0.9 * (1 - a.blunt));
  }
  const u = (t - a.peak) / (1 - a.peak);
  return a.hh * (a.peduncle + (1 - a.peduncle) * Math.pow(Math.cos((u * Math.PI) / 2), 1.15));
}

export const xAt = (a: Anatomy, t: number): number => C + a.hl - 2 * a.hl * t;
export const topAt = (a: Anatomy, t: number): number => C - heightAt(a, t) * 1.04;
export const bottomAt = (a: Anatomy, t: number): number => C + heightAt(a, t) * 0.92;

export function outline(a: Anatomy): Pt[] {
  const n = 48;
  const top = Array.from({ length: n + 1 }, (_, i) => ({ x: xAt(a, i / n), y: topAt(a, i / n) }));
  const bottom = Array.from({ length: n + 1 }, (_, i) => ({ x: xAt(a, 1 - i / n), y: bottomAt(a, 1 - i / n) }));
  return [...top, ...bottom];
}

export function bezier(p0: Pt, c: Pt, p1: Pt, n = 12): Pt[] {
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n;
    const u = 1 - t;
    return { x: u * u * p0.x + 2 * u * t * c.x + t * t * p1.x, y: u * u * p0.y + 2 * u * t * c.y + t * t * p1.y };
  });
}

/** Closed ellipse as a stroke path (first point repeated). */
export function ring(x: number, y: number, rx: number, ry: number, steps = 14): Pt[] {
  const pts = ellipse(x, y, rx, ry, steps);
  return [...pts, pts[0]!];
}

// ---------------------------------------------------------------- pattern helpers

/** Stippled dark back fading towards the belly (countershading). */
export const backStipple = (density: number) => (k: Kit): void => {
  k.pen.stipple(k.body, 900, (x, y) => {
    const t = (C + k.a.hl - x) / (2 * k.a.hl);
    const top = topAt(k.a, t);
    const rel = (y - top) / (heightAt(k.a, t) * 2 || 1);
    return Math.max(0, (0.45 - rel) * density);
  }, 0.5, k.ink);
};

/** Vertical bands drawn as dense hatching, e.g. perch saddles or clownfish stripes. */
export function bands(k: Kit, starts: readonly number[], width: number, opts: { color?: string; alpha?: number; depth?: number; fill?: string } = {}): void {
  k.pen.clipped(k.body, () => {
    for (const t0 of starts) {
      if (opts.fill) {
        const poly = [
          { x: k.x(t0), y: topAt(k.a, t0) - 4 }, { x: k.x(t0 + width), y: topAt(k.a, t0 + width) - 4 },
          { x: k.x(t0 + width), y: bottomAt(k.a, t0 + width) + 4 }, { x: k.x(t0), y: bottomAt(k.a, t0) + 4 },
        ];
        k.pen.fill(poly, opts.fill, 0.9);
      }
      for (let t = t0; t < t0 + width; t += 0.007) {
        const x = k.x(t);
        const bottom = opts.depth === undefined ? bottomAt(k.a, t) : C + k.h(t) * opts.depth;
        k.pen.hair([{ x, y: topAt(k.a, t) }, { x: x - 2, y: bottom }], 0.5, opts.color ?? k.ink, opts.alpha ?? 0.7);
      }
    }
  });
}

/** Horizontal stripes along the body at fractions of the half height (-1 top .. 1 belly). */
export function stripes(k: Kit, levels: readonly number[], opts: { from?: number; to?: number; width?: number; color?: string; alpha?: number } = {}): void {
  k.pen.clipped(k.body, () => {
    for (const v of levels) {
      const pts: Pt[] = [];
      for (let t = opts.from ?? 0.08; t <= (opts.to ?? 0.98); t += 0.02) pts.push({ x: k.x(t), y: C + k.h(t) * v });
      k.pen.stroke(pts, opts.width ?? 1.6, opts.color ?? k.ink, opts.alpha ?? 0.7, false);
    }
  });
}

/** Random spots inside the body, filled with `color` and ringed in ink. */
export function spots(k: Kit, count: number, r: readonly [number, number], color: string, opts: { from?: number; to?: number; outline?: boolean; alpha?: number } = {}): void {
  k.pen.clipped(k.body, () => {
    for (let i = 0; i < count; i++) {
      const t = (opts.from ?? 0.2) + k.pen.rng() * ((opts.to ?? 0.9) - (opts.from ?? 0.2));
      const y = C + k.h(t) * (k.pen.rng() * 1.5 - 0.75);
      const rr = r[0] + k.pen.rng() * (r[1] - r[0]);
      const spot = ellipse(k.x(t), y, rr * 1.2, rr, 10);
      k.pen.fill(spot, color, opts.alpha ?? 0.85);
      if (opts.outline !== false) k.pen.hair([...spot, spot[0]!], 0.4, k.ink, 0.6);
    }
  });
}

/** Glowing light organs: a halo, a bright core, a hairline ring. */
export function glow(k: Kit, x: number, y: number, r: number, color = '#f6d76a'): void {
  k.pen.fill(ellipse(x, y, r * 2.2, r * 2.2, 12), color, 0.25);
  k.pen.fill(ellipse(x, y, r, r, 10), color, 1);
  k.pen.hair(ring(x, y, r, r, 10), 0.45, k.ink, 0.9);
}

/** A row of photophores along the belly. */
export function photophores(k: Kit, count: number, from = 0.2, to = 0.9, r = 1.8, color?: string): void {
  for (let i = 0; i < count; i++) {
    const t = from + (i / Math.max(1, count - 1)) * (to - from);
    glow(k, k.x(t), bottomAt(k.a, t) - 4 - (i % 2) * 2, r, color);
  }
}

/** A chin barbel (cod, rattails, dragonfish): a whisker, optionally with a glowing tip. */
export function barbel(k: Kit, length: number, tip?: string): void {
  const root = { x: k.x(0.06), y: C + k.h(0.06) * 0.7 };
  const end = { x: root.x - length * 0.3, y: root.y + length };
  k.pen.stroke(bezier(root, { x: root.x + length * 0.2, y: root.y + length * 0.6 }, end, 8), 0.8, k.ink, 1, false);
  if (tip) glow(k, end.x, end.y, 2.6, tip);
}

/** Little triangular finlets between the second dorsal/anal fin and the tail (tunas, mackerel). */
export function finlets(k: Kit, from: number, count: number): void {
  for (let i = 0; i < count; i++) {
    const t = from + i * ((0.98 - from) / count);
    for (const side of [-1, 1]) {
      const x = k.x(t);
      const y = side < 0 ? topAt(k.a, t) : bottomAt(k.a, t);
      const tri = [{ x: x + 2, y }, { x: x - 3, y: y + side * 5 }, { x: x - 3, y }];
      k.pen.fill(tri, k.a.finWash ?? k.a.wash, 0.6);
      k.pen.hair([...tri, tri[0]!], 0.45, k.ink, 0.9);
    }
  }
}

/** Shark gill slits: five curved strokes behind the head. */
export function gillSlits(k: Kit, at = 0.24, count = 5): void {
  for (let i = 0; i < count; i++) {
    const t = at + i * 0.025;
    const x = k.x(t);
    const h = k.h(t);
    k.pen.hair(bezier({ x: x + 1, y: C - h * 0.45 }, { x: x - 3, y: C }, { x: x + 1, y: C + h * 0.4 }, 6), 0.7, k.ink, 0.85);
  }
}

/** A straight bill sticking out past the nose (swordfish, needlefish, snipe eels). */
export function bill(k: Kit, length: number, thickness: number, opts: { lower?: boolean } = {}): void {
  const nose = { x: k.x(0), y: C - 1 };
  const shape: Pt[] = [
    { x: nose.x - 6, y: nose.y - thickness }, { x: nose.x + length, y: nose.y - 0.4 },
    { x: nose.x + length, y: nose.y + 0.4 }, { x: nose.x - 6, y: nose.y + thickness },
  ];
  k.pen.fill(shape, PAPER_FILL, 1);
  k.pen.fill(shape, k.a.wash, 0.3);
  k.pen.stroke([...shape, shape[0]!], 0.9, k.ink, 1, false);
  if (opts.lower) k.pen.hair([{ x: nose.x - 4, y: nose.y }, { x: nose.x + length * 0.95, y: nose.y }], 0.5, k.ink, 0.8);
}
