import { type Pt } from '../../../../src/art/pen';
import { createRng } from '../../../../src/logic/rng';
import { smoothLoop } from '../../seal/art/paint';

/**
 * The short-beaked echidna's geometry, in its own units (about 104 from the
 * rump to the snout tip, the middle at 0,0, snout to the right (+x), belly
 * down (+y), feet on y = 19): one low furry mound that runs forward into a
 * small head, the tubular snout out of its front, the spine coat shingled
 * over the back, and four short legs splayed under it.
 */

export const ECHIDNA_UNITS = 100;

/** The mound: head and body in one outline (the head is just its front, below the spine coat). */
export const BODY: readonly Pt[] = smoothLoop([
  { x: 37.5, y: -5 }, { x: 34, y: -8.4 }, { x: 28, y: -11.6 }, { x: 20, y: -16.4 }, { x: 9, y: -24 }, { x: -5, y: -29 },
  { x: -19, y: -28.2 }, { x: -31.5, y: -22 }, { x: -40.5, y: -12.5 }, { x: -45, y: -1.5 }, { x: -43, y: 6.5 }, { x: -34, y: 11.2 },
  { x: -20, y: 13.4 }, { x: -4, y: 13.8 }, { x: 11, y: 12.4 }, { x: 22, y: 9.6 }, { x: 30.5, y: 7 }, { x: 36.5, y: 4.2 },
], 6);

/** Topmost and bottommost y of a closed outline at x. */
function span(shape: readonly Pt[], x: number): readonly [number, number] {
  let [lo, hi] = [Infinity, -Infinity];
  for (let i = 0; i < shape.length; i++) {
    const a = shape[i]!;
    const b = shape[(i + 1) % shape.length]!;
    if ((a.x - x) * (b.x - x) > 0 || a.x === b.x) continue;
    const y = a.y + ((b.y - a.y) * (x - a.x)) / (b.x - a.x);
    lo = Math.min(lo, y);
    hi = Math.max(hi, y);
  }
  return lo === Infinity ? [0, 0] : [lo, hi];
}

export const topAt = (x: number): number => span(BODY, x)[0];
export const underAt = (x: number): number => span(BODY, x)[1];

/** The snout's base, where it leaves the face, and its tip. */
export const SNOUT_ROOT: Pt = { x: 35.5, y: -0.6 };
/** The snout's upper and lower edges (root to tip), slightly down-curved, thick at the root. */
export const SNOUT_TOP: readonly Pt[] = bezier({ x: 33, y: -6.4 }, { x: 44, y: -5.6 }, { x: 52, y: -2.4 }, { x: 58.4, y: 2.4 }, 14);
export const SNOUT_UNDER: readonly Pt[] = bezier({ x: 33, y: 4.6 }, { x: 43, y: 4.4 }, { x: 51, y: 4.6 }, { x: 57.6, y: 5.8 }, 14);
/** The rounded tip, from the top edge's end to the under edge's end. */
export const SNOUT_TIP: Pt = { x: 59.6, y: 4.3 };

export const EYE: Pt = { x: 31.2, y: -5.4 };
export const EYE_R = 1.45;

function bezier(a: Pt, b: Pt, c: Pt, d: Pt, n: number): Pt[] {
  return Array.from({ length: n + 1 }, (_, i) => {
    const u = i / n;
    const v = 1 - u;
    return {
      x: v * v * v * a.x + 3 * v * v * u * b.x + 3 * v * u * u * c.x + u * u * u * d.x,
      y: v * v * v * a.y + 3 * v * v * u * b.y + 3 * v * u * u * c.y + u * u * u * d.y,
    };
  });
}

export const SNOUT: readonly Pt[] = [
  ...SNOUT_TOP,
  ...bezier(SNOUT_TOP[SNOUT_TOP.length - 1]!, { x: 59.8, y: 2.9 }, { x: 59.9, y: 5.2 }, SNOUT_UNDER[SNOUT_UNDER.length - 1]!, 5).slice(1, -1),
  ...[...SNOUT_UNDER].reverse(),
];

// ---------------------------------------------------------------- the spine coat

/** The spine coat lies on this ellipse's upper half: centre, radii. */
const COAT = { cx: -8.5, cy: 14, rx: 38, ry: 43 } as const;

export interface Spine {
  readonly base: Pt;
  /** Lying back along the coat (rearwards), radians. */
  readonly flat: number;
  /** Lifted off the coat, standing out, radians. */
  readonly lifted: number;
  readonly len: number;
  readonly width: number;
  /** Light on it, 0 (in the coat's shadow) .. 1 (sunlit top). */
  readonly lit: number;
  /** A per-spine seed for boil and colour. */
  readonly seed: number;
  /** Where the spine sits on the coat, 0 (rim) .. 1 (deep in the side). */
  readonly depth: number;
}

/** Bases outside the coat: the face and the throat, below the coat's front edge. */
const onFace = (p: Pt): boolean => p.x > 26.5 || p.y > -9.5 - (p.x - 23) * 1.0;

/**
 * The spines: seeded once, in staggered rows round the coat, each lying back
 * along the flow from the crown over the back and down the rump, the rim ones
 * standing out a little. Sorted so the ones nearer the head shingle over the
 * ones behind them.
 */
export const SPINES: readonly Spine[] = (() => {
  const rng = createRng(70913);
  const out: (Spine & { key: number })[] = [];
  const rows = 13;
  for (let row = 0; row < rows; row++) {
    const r0 = 1 - row * 0.064;
    const perimeter = Math.PI * 0.5 * (COAT.rx + COAT.ry) * r0;
    const count = Math.round(perimeter / 2.55);
    for (let i = 0; i < count; i++) {
      const r = r0 + (rng() - 0.5) * 0.045;
      const a = -Math.PI + 0.06 + ((i + (row % 2) * 0.5 + (rng() - 0.5) * 0.55) / count) * (Math.PI - 0.12);
      const base = { x: COAT.cx + Math.cos(a) * COAT.rx * r, y: COAT.cy + Math.sin(a) * COAT.ry * r };
      if (onFace(base) || base.y > 4.5 + rng() * 3) continue;
      const tangent = Math.atan2(-COAT.ry * Math.cos(a), COAT.rx * Math.sin(a));
      const toward = (from: number, to: number, u: number): number => from + Math.atan2(Math.sin(to - from), Math.cos(to - from)) * u;
      // Deep in the side the spines run straight back; at the rim they follow the curve of the back.
      const edge = Math.pow(r, 3);
      // Over the crown they sweep back, not up.
      const front = 1 - 0.65 * Math.max(0, Math.cos(a));
      const flow = toward(Math.PI + 0.08, tangent, (0.35 + 0.65 * edge) * front) + (rng() - 0.5) * 0.18;
      // Lifting a quill off the coat turns it (canvas angles) clockwise: up off the back, out off the rump.
      const flat = flow + 0.05 + 0.1 * edge;
      const lifted = flow + 0.55 + 0.45 * edge;
      const nearHead = Math.max(0, Math.min(1, (base.x - 4) / 20));
      const lowSide = Math.max(0, Math.min(1, (base.y + 4) / 8));
      const len = (12.5 + 4.5 * rng() + 3 * edge) * (1 - 0.32 * nearHead) * (1 - 0.22 * lowSide);
      const width = (2.3 + 0.8 * rng()) * (1 - 0.18 * nearHead);
      const height = Math.max(0, Math.min(1, (-base.y + 4) / 32));
      const lit = Math.max(0, Math.min(1, 0.15 + 0.85 * height - 0.25 * Math.max(0, -Math.cos(a) - 0.6) + 0.2 * (rng() - 0.5)));
      out.push({ base, flat, lifted, len, width, lit, seed: rng(), depth: 1 - r, key: a + 0.35 * (1 - r) + (rng() - 0.5) * 0.08 });
    }
  }
  return out.sort((p, q) => p.key - q.key);
})();

// ---------------------------------------------------------------- the legs

export interface Leg {
  /** The leg's outline, from its root inside the body round to the foot. */
  readonly shape: readonly Pt[];
  /** Where it turns as it paddles (inside the body). */
  readonly hip: Pt;
  /** The foot's claw roots and their reach (dx, dy), and the claw's breadth. */
  readonly claws: readonly { readonly root: Pt; readonly reach: Pt; readonly bend: number; readonly w: number }[];
}

/** A front leg: thick, short, splayed, a broad paw turned out, its spade claws reaching forward and down. */
export const FRONT_LEG: Leg = {
  shape: smoothLoop([
    { x: 9, y: 1 }, { x: 17, y: -1 }, { x: 24, y: 2 }, { x: 25.4, y: 7 }, { x: 25, y: 11 }, { x: 25.8, y: 13.8 }, { x: 27.6, y: 15.2 },
    { x: 29.6, y: 16.8 }, { x: 29.6, y: 18.8 }, { x: 26, y: 19.9 }, { x: 19.5, y: 19.9 }, { x: 17.4, y: 18.9 }, { x: 19, y: 15.6 },
    { x: 17.8, y: 13 }, { x: 13.6, y: 11.4 }, { x: 11.2, y: 8 }, { x: 10, y: 5 },
  ], 5),
  hip: { x: 17, y: 4 },
  claws: [
    { root: { x: 27.4, y: 15.6 }, reach: { x: 4.4, y: 1.8 }, bend: 1, w: 1.9 },
    { root: { x: 28, y: 17.1 }, reach: { x: 4.8, y: 1.9 }, bend: 1, w: 2 },
    { root: { x: 27.8, y: 18.5 }, reach: { x: 4.4, y: 1.4 }, bend: 0.9, w: 1.9 },
    { root: { x: 26.4, y: 19.5 }, reach: { x: 3.6, y: 0.7 }, bend: 0.7, w: 1.7 },
  ],
};

/** A hind leg: a thick haunch, the foot turned to point backwards, long curved grooming claws trailing behind. */
export const HIND_LEG: Leg = {
  shape: smoothLoop([
    { x: -36, y: 1 }, { x: -26, y: -1 }, { x: -18.5, y: 4 }, { x: -19.2, y: 9.8 }, { x: -22.4, y: 14 }, { x: -22, y: 17 },
    { x: -23.6, y: 19.7 }, { x: -31, y: 20 }, { x: -38.4, y: 19.5 }, { x: -40.8, y: 17.8 }, { x: -37.6, y: 16 }, { x: -30.6, y: 15.2 },
    { x: -32.6, y: 9.6 }, { x: -37, y: 5 },
  ], 6),
  hip: { x: -27, y: 4 },
  claws: [
    { root: { x: -39.6, y: 16.2 }, reach: { x: -4.6, y: -0.6 }, bend: -1.1, w: 1.1 },
    { root: { x: -40.2, y: 17.6 }, reach: { x: -8.4, y: 0.2 }, bend: -1.8, w: 1.25 },
    { root: { x: -39.4, y: 18.9 }, reach: { x: -5.2, y: 0.9 }, bend: -1.1, w: 1.1 },
  ],
};

/** The fur's lie over the lower body and the face: short strokes, seeded once. */
export interface Hair { readonly at: Pt; readonly angle: number; readonly len: number; readonly light: boolean; readonly seed: number }

export const HAIRS: readonly Hair[] = (() => {
  const rng = createRng(5521);
  const out: Hair[] = [];
  for (let i = 0; i < 420; i++) {
    const x = -44 + rng() * 82;
    const [top, under] = [topAt(x), underAt(x)];
    const y = top + (under - top) * (0.15 + 0.85 * Math.sqrt(rng()));
    const face = x > 22;
    // On the face the fur runs back from the snout; on the body down and back.
    const angle = face ? Math.PI + 0.15 + (rng() - 0.5) * 0.4 : Math.PI - 0.6 + (rng() - 0.5) * 0.4;
    out.push({ at: { x, y }, angle, len: face ? 1.4 + rng() * 1.4 : 1.8 + rng() * 2, light: rng() < 0.45, seed: rng() });
  }
  return out;
})();
