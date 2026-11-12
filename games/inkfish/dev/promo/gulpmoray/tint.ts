/**
 * The moray's look, for this short only: a green/spotted moray painted in the
 * foodchain animals' finish (washes, a round body lit along the back and
 * shadowed along the belly, a realistic eye with a catchlight, thin ink). Its
 * shape is in shares of its length `f` (0 nose .. 1 tail tip) and of its
 * greatest half-depth; eel.ts lays it along a curve.
 */

export const SKIN = {
  base: '#a19d3a',
  deep: '#4f5419',
  light: '#e9e08a',
  pale: '#f4ecb0',
  blotch: '#4d3c17',
  fin: '#a8a142',
  ink: '#1b190d',
  mouth: '#2b2412',
  gill: '#120f07',
  iris: '#f0c95a',
  irisEdge: '#9c6b18',
  pupil: '#0b0905',
} as const;

/** Where the head's features sit (f along, v across: +1 the back's edge, -1 the belly's). */
export const HEAD = {
  eye: { f: 0.062, v: 0.44, r: 0.12 },
  nostril: { f: 0.011, v: 0.34 },
  backNostril: { f: 0.047, v: 0.66 },
  mouthEnd: 0.135,
  gill: { f: 0.165, v: -0.2 },
  dorsalFrom: 0.15,
  analFrom: 0.44,
} as const;

/** How far the fins run on round the tail tip (share of the length). */
export const TIP = 0.035;

interface Knot { readonly f: number; readonly h: number }

/** The back's and the belly's half-depth: a blunt snout, the head deep and tall behind the eye (the jaw muscles), a thick body tapering to a point. */
const TOP: readonly Knot[] = [
  { f: 0, h: 0.24 }, { f: 0.02, h: 0.5 }, { f: 0.05, h: 0.76 }, { f: 0.09, h: 0.98 }, { f: 0.12, h: 1.05 }, { f: 0.17, h: 0.99 },
  { f: 0.3, h: 1 }, { f: 0.6, h: 0.93 }, { f: 0.8, h: 0.7 }, { f: 0.92, h: 0.4 }, { f: 1, h: 0 },
];
const BOTTOM: readonly Knot[] = [
  { f: 0, h: 0.2 }, { f: 0.02, h: 0.42 }, { f: 0.05, h: 0.66 }, { f: 0.1, h: 0.86 }, { f: 0.16, h: 0.9 },
  { f: 0.3, h: 0.97 }, { f: 0.6, h: 0.9 }, { f: 0.8, h: 0.68 }, { f: 0.92, h: 0.38 }, { f: 1, h: 0 },
];
/** The fins' height: a low fleshy ridge rising from behind the head, deepest near the tail, wrapping round its tip. */
const DORSAL: readonly Knot[] = [
  { f: HEAD.dorsalFrom - 0.01, h: 0 }, { f: 0.22, h: 0.17 }, { f: 0.5, h: 0.25 }, { f: 0.85, h: 0.3 }, { f: 1, h: 0.26 },
];
const ANAL: readonly Knot[] = [{ f: HEAD.analFrom - 0.01, h: 0 }, { f: 0.55, h: 0.16 }, { f: 0.85, h: 0.26 }, { f: 1, h: 0.26 }];

function knotAt(knots: readonly Knot[], f: number): number {
  if (f <= knots[0]!.f) return knots[0]!.h;
  for (let i = 1; i < knots.length; i++) {
    const a = knots[i - 1]!;
    const b = knots[i]!;
    if (f <= b.f) {
      const u = (f - a.f) / (b.f - a.f);
      return a.h + (b.h - a.h) * (0.5 - 0.5 * Math.cos(Math.PI * u));
    }
  }
  return knots[knots.length - 1]!.h;
}

export interface Section {
  readonly top: number;
  readonly bottom: number;
  readonly dorsal: number;
  readonly anal: number;
}

/** The body's and the fins' half-depths at `f` (past 1 only the fins go on, rounding off round the tip). */
export function sectionAt(f: number, fins: boolean): Section {
  if (f >= 1) {
    const u = Math.min(1, (f - 1) / TIP);
    const round = fins ? Math.sqrt(Math.max(0, 1 - u * u)) : 0;
    return { top: 0, bottom: 0, dorsal: 0.26 * round, anal: 0.26 * round };
  }
  const tip = Math.max(0, 1 - f) ** 0.5;
  return {
    top: knotAt(TOP, f) * (f > 0.92 ? tip / Math.sqrt(0.08) : 1),
    bottom: knotAt(BOTTOM, f) * (f > 0.92 ? tip / Math.sqrt(0.08) : 1),
    dorsal: fins && f > HEAD.dorsalFrom - 0.01 ? knotAt(DORSAL, f) : 0,
    anal: fins && f > HEAD.analFrom - 0.01 ? knotAt(ANAL, f) : 0,
  };
}

/** A mottle: at f along, v across, radii in half-depths, turned by `turn`. */
export interface Mottle {
  readonly f: number;
  readonly v: number;
  readonly rx: number;
  readonly ry: number;
  readonly turn: number;
  readonly alpha: number;
}

function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let x = Math.imul(s ^ (s >>> 15), 1 | s);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

/** The dark brown blotches: irregular, each a cluster of three washes; small on the head, big on the body, spilling onto the fins. */
export const BLOTCHES: readonly Mottle[] = (() => {
  const r = rng(122);
  const out: Mottle[] = [];
  const n = 78;
  for (let i = 0; i < n; i++) {
    const f = 0.025 + (0.95 * (i + r())) / n;
    const head = f < 0.15;
    const size = head ? 0.1 + 0.07 * r() : 0.2 + 0.2 * r();
    const v = (r() * 2 - 1) * (head ? 0.85 : 1.15);
    for (let j = 0; j < 3; j++) {
      out.push({
        f: f + (r() - 0.5) * 0.012, v: v + (r() - 0.5) * 0.25, rx: size * (0.6 + 0.5 * r()), ry: size * (0.45 + 0.4 * r()),
        turn: r() * Math.PI, alpha: 0.2 + 0.14 * r(),
      });
    }
  }
  return out;
})();

/** Pale yellow freckles between the blotches. */
export const FRECKLES: readonly Mottle[] = (() => {
  const r = rng(7);
  return Array.from({ length: 70 }, (_, i) => {
    const size = 0.035 + 0.04 * r();
    return { f: 0.02 + (0.94 * (i + r())) / 70, v: (r() * 2 - 1) * 0.85, rx: size, ry: size * (0.7 + 0.3 * r()), turn: r() * Math.PI, alpha: 0.35 + 0.3 * r() };
  });
})();
