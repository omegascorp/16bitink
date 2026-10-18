/**
 * The blue dragon's shape (Glaucus atlanticus), as plain geometry so the
 * story, the drawing and the tests share it. Drawn in its iconic pose, the
 * one in the viral photos: seen flat on, the slender body head to the left,
 * tapering to a pointed tail, with three pairs of fanned bunches of
 * finger-like cerata spread out to either side. Units are "slug px", origin
 * at the middle of the body, +x towards the tail, -y the upper side.
 */

export interface Pt {
  readonly x: number;
  readonly y: number;
}

/** Head tip and tail tip, slug px. */
export const HEAD_X = -101;
export const TAIL_X = 105;

/** Half the body's width along it: a blunt head, a little neck, widest behind the first fans, then a long taper. */
const WIDTH_KEYS: readonly (readonly [number, number])[] = [
  [-101, 0], [-99.5, 6.6], [-96, 10.6], [-90, 12.8], [-82, 12.2], [-72, 15.2], [-56, 18.6], [-36, 20], [-12, 19.4], [14, 17.4],
  [40, 13.8], [62, 9.8], [80, 6], [94, 3], [105, 0],
];

export function halfWidth(x: number): number {
  if (x <= WIDTH_KEYS[0]![0] || x >= WIDTH_KEYS[WIDTH_KEYS.length - 1]![0]) return 0;
  let i = 0;
  while (x > WIDTH_KEYS[i + 1]![0]) i++;
  const [x0, w0] = WIDTH_KEYS[i]!;
  const [x1, w1] = WIDTH_KEYS[i + 1]!;
  const u = (x - x0) / (x1 - x0);
  // Eased between keys so the outline has no corners; the head end is a round cap.
  const e = u * u * (3 - 2 * u);
  return w0 + (w1 - w0) * e;
}

/** The body's outline: along the upper edge head to tail, back along the lower edge. */
export const BODY: readonly Pt[] = (() => {
  const n = 90;
  const xs = Array.from({ length: n + 1 }, (_, i) => HEAD_X + ((TAIL_X - HEAD_X) * (1 - Math.cos((Math.PI * i) / n))) / 2);
  const top = xs.map((x) => ({ x, y: -halfWidth(x) }));
  const bottom = [...xs].reverse().map((x) => ({ x, y: halfWidth(x) }));
  return [...top, ...bottom];
})();

const alongBody = (x0: number, x1: number): number[] => Array.from({ length: 71 }, (_, i) => x0 + ((x1 - x0) * i) / 70);

/** The middle of the body out to `frac` of its half-width either side (0 the midline, 1 the edge). */
export function core(frac: number, x0 = HEAD_X, x1 = TAIL_X): Pt[] {
  const xs = alongBody(x0, x1);
  return [...xs.map((x) => ({ x, y: -frac * halfWidth(x) })), ...[...xs].reverse().map((x) => ({ x, y: frac * halfWidth(x) }))];
}

/** A strip along one side (`side` -1 upper, 1 lower) between `from` and `to` of the half-width. */
export function strip(from: number, to: number, side: -1 | 1, x0 = HEAD_X, x1 = TAIL_X): Pt[] {
  const xs = alongBody(x0, x1);
  return [...xs.map((x) => ({ x, y: side * from * halfWidth(x) })), ...[...xs].reverse().map((x) => ({ x, y: side * to * halfWidth(x) }))];
}

// ---------------------------------------------------------------- the cerata fans

export interface Fan {
  /** Where its stalk leaves the body's edge (x along the body). */
  readonly x: number;
  /** The stalk's length out from the body's edge to the fan's root. */
  readonly stalk: number;
  readonly fingers: number;
  /** The longest finger's length. */
  readonly len: number;
  /** The middle finger's direction for an upper fan (radians, -π/2 straight up), and how wide the fan opens. */
  readonly dir: number;
  readonly spread: number;
}

/** The three upper fans, the first and biggest just behind the head; the lower three mirror them. */
export const FANS: readonly Fan[] = [
  { x: -54, stalk: 9, fingers: 8, len: 44, dir: -1.05, spread: 2.25 },
  { x: -12, stalk: 8, fingers: 7, len: 38, dir: -1.15, spread: 2.05 },
  { x: 28, stalk: 7, fingers: 6, len: 30, dir: -1.25, spread: 1.85 },
];

/** All six bunches: index i is FANS[i % 3], upper for i < 3, lower (mirrored) after. */
export const BUNCHES = 6;
export const fanOf = (i: number): Fan => FANS[i % 3]!;
export const isLower = (i: number): boolean => i >= 3;

/** A fan's root (where its fingers spring from), on the upper side; the lower fan's is mirrored. */
export const fanRoot = (f: Fan): Pt => ({ x: f.x + 3, y: -(halfWidth(f.x) + f.stalk) });

/** A finger's centreline from the fan's root outwards, in the fan's frame (root at the origin, upper fan). */
export function fingerSpine(f: Fan, j: number): Pt[] {
  const u = f.fingers === 1 ? 0.5 : j / (f.fingers - 1);
  const a = f.dir + f.spread * (u - 0.5);
  const len = f.len * (0.78 + 0.22 * Math.sin(Math.PI * u));
  // Each finger curves a little back towards the tail as it goes.
  const bend = 0.22 * (0.4 + u);
  return Array.from({ length: 9 }, (_, i) => {
    const k = i / 8;
    const ang = a + bend * k;
    return { x: Math.cos(ang) * len * k + 1.5 * Math.sin(Math.PI * k) * Math.cos(ang + Math.PI / 2), y: Math.sin(ang) * len * k };
  });
}

/** The tip of a finger in the fan's frame. */
export const fingerTip = (f: Fan, j: number): Pt => fingerSpine(f, j)[8]!;

// ---------------------------------------------------------------- the head and the gut

/** The mouth, at the tip of the head, where it bites. */
export const MOUTH: Pt = { x: -102, y: 0 };
/** The two eyes on the head (upper, lower). */
export const EYES: readonly Pt[] = [{ x: -85, y: -6.6 }, { x: -85, y: 6.6 }];
export const EYE_R = 3.1;
/** The stomach, where the swallowed air bubble sits and the stolen stingers wait. */
export const STOMACH: Pt = { x: -20, y: 0 };
export const BUBBLE_R = 10;

/** Along the gut from the mouth to the stomach, 0 .. 1. */
export const gutAt = (u: number): Pt => ({ x: MOUTH.x + 4 + (STOMACH.x - MOUTH.x - 4) * u, y: 1.2 * Math.sin(Math.PI * u * 2) });

/** Along the branch of the gut from the stomach out to a fan's root, 0 .. 1 (in slug px, lower fans mirrored). */
export function branchAt(i: number, u: number): Pt {
  const root = fanRoot(fanOf(i));
  const s = isLower(i) ? -1 : 1;
  const c = { x: (STOMACH.x + root.x) / 2, y: root.y * 0.35 };
  const p = {
    x: (1 - u) ** 2 * STOMACH.x + 2 * u * (1 - u) * c.x + u * u * root.x,
    y: 2 * u * (1 - u) * c.y + u * u * root.y,
  };
  return { x: p.x, y: p.y * s };
}
