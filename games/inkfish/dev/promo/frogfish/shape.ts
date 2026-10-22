/**
 * The frogfish's shape, in frog px (fp): the body's middle at the origin,
 * nose to the right (+x), y down. Pure geometry, shared by the drawing
 * (frogArt.ts) and the choreography (story.ts).
 *
 * A painted frogfish (Antennarius) seen side on: a round, lumpy body that
 * is nearly all head, a huge upturned mouth at the front, a small eye high
 * on the head, the rod (the first dorsal spine) on the tip of the snout
 * with a fleshy bait on its end, two more spines as bumps on the forehead,
 * a soft dorsal fin down the back, a round tail, and pectoral fins like
 * elbowed arms it stands on.
 *
 * Its mouth opens the way the game opens a fish's (../swimmer.ts): the
 * drawing is cut into thin columns at the mouth line, the upper part lifted
 * and the lower part dropped, more towards the front. The throat and the
 * belly balloon by stretching the columns' lower parts: the gulp ("its mouth
 * grows TWELVE times bigger") and the full belly ("fish almost TWICE its
 * length").
 */

export interface Pt {
  readonly x: number;
  readonly y: number;
}

/** The corner of the mouth (where the jaws hinge) and the front of the shut mouth: it slopes up to the front. */
export const HINGE: Pt = { x: 46, y: 2 };
export const TIP: Pt = { x: 104, y: -32 };
/** How far the jaws move at the front, fully open (fp): the upper a little, the lower a lot. */
export const UP = 40;
/** Where the upper jaw (the snout) starts, just in front of the eye. */
const SNOUT_FROM = 74;
export const DOWN = 56;
/** The eye, its radius, and the root of the rod on the snout. */
export const EYE: Pt = { x: 62, y: -60 };
export const EYE_R = 11;
export const ROD_ROOT: Pt = { x: 98, y: -50 };
/** The rod's length and the bait's size (fp). */
export const ROD_LEN = 62;
/** Where its "hands" rest: the seabed under it. */
export const GROUND_Y = 112;
/** Nose (the mouth's front) to tail base, and the tail fin's tip. */
export const TAIL_BASE_X = -112;
export const TAIL_TIP_X = -160;
export const BODY_LEN = TIP.x - TAIL_BASE_X;
/** Nose to the tip of the tail fin: its whole length. */
export const TOTAL_LEN = TIP.x - TAIL_TIP_X;

/** The live parts of the shape: jaw 0 shut .. 1 wide; the throat and belly ballooned, 0 .. 1. */
export interface FrogLook {
  readonly jaw: number;
  readonly throat: number;
  readonly belly: number;
}

export const SHUT: FrogLook = { jaw: 0, throat: 0, belly: 0 };

const smooth = (u: number): number => {
  const c = Math.max(0, Math.min(1, u));
  return c * c * (3 - 2 * c);
};

/** How far along the mouth a column is, 0 at the corner .. 1 at the front (more past it). */
const along = (x: number): number => (x - HINGE.x) / (TIP.x - HINGE.x);

/** The cut's height at column x: the mouth line in front of the corner, level behind it. */
export function cutY(x: number): number {
  const f = Math.max(0, Math.min(1, along(x)));
  return HINGE.y + (TIP.y - HINGE.y) * f;
}

/** The throat's share of the balloon at column x: from behind the corner to the front. */
const throatWeight = (x: number): number => smooth((x - 10) / 60);
/** The belly's share, a hump from the tail stalk to the throat. */
const bellyWeight = (x: number): number => {
  const u = (x + 88) / 160;
  return u <= 0 || u >= 1 ? 0 : Math.sin(Math.PI * u) ** 1.4;
};

export interface Column {
  /** The cut, and how far the upper part is lifted and the lower dropped (fp). */
  readonly cut: number;
  readonly up: number;
  readonly down: number;
  /** Vertical stretch of the upper and lower parts, away from the cut. */
  readonly upperScale: number;
  readonly lowerScale: number;
}

/** How column x of the drawing is moved and stretched for `look`. */
export function columnAt(look: FrogLook, x: number): Column {
  const f = along(x);
  // A rounded gape: tight at the corner, near its widest well before the front.
  const ease = f <= 0 ? 0 : Math.sin((Math.PI / 2) * Math.min(1, f)) ** 0.8;
  // The upper jaw is the snout in front of the eye: the eye stays put.
  const lift = smooth((x - SNOUT_FROM) / (TIP.x - SNOUT_FROM));
  const jaw = Math.max(0, look.jaw);
  return {
    cut: cutY(x),
    up: UP * jaw * lift,
    down: DOWN * jaw * ease,
    upperScale: 1 + 0.06 * look.throat * throatWeight(x) + 0.22 * look.belly * bellyWeight(x),
    lowerScale: 1 + 0.38 * look.throat * throatWeight(x) + 0.8 * look.belly * bellyWeight(x),
  };
}

/** Where a point of the shut drawing ends up for `look`. */
export function mapPt(look: FrogLook, p: Pt): Pt {
  const c = columnAt(look, p.x);
  return p.y < c.cut
    ? { x: p.x, y: c.cut - (c.cut - p.y) * c.upperScale - c.up }
    : { x: p.x, y: c.cut + (p.y - c.cut) * c.lowerScale + c.down };
}

export interface Lips {
  /** From the corner of the mouth to the front, upper and lower (fp). */
  readonly upper: readonly Pt[];
  readonly lower: readonly Pt[];
  /** The middle of the opening at the front, and its height. */
  readonly mid: Pt;
  readonly height: number;
}

const LIP_STEPS = 18;

export function lipsOf(look: FrogLook): Lips {
  const upper: Pt[] = [];
  const lower: Pt[] = [];
  for (let i = 0; i <= LIP_STEPS; i++) {
    const x = HINGE.x + ((TIP.x - 1 - HINGE.x) * i) / LIP_STEPS;
    const c = columnAt(look, x);
    upper.push({ x, y: c.cut - c.up });
    lower.push({ x, y: c.cut + c.down });
  }
  const top = upper[LIP_STEPS]!;
  const bottom = lower[LIP_STEPS]!;
  return { upper, lower, mid: { x: top.x + 4 * look.jaw, y: (top.y + bottom.y) / 2 }, height: bottom.y - top.y };
}

/** The open mouth's outline: the upper lip out to the front, across the opening (dipping inwards), back along the lower lip. */
export function mouthShape(lips: Lips): Pt[] {
  const top = lips.upper[lips.upper.length - 1]!;
  const bottom = lips.lower[lips.lower.length - 1]!;
  const front = Array.from({ length: 9 }, (_, i) => {
    const u = (i + 1) / 10;
    return { x: top.x + (bottom.x - top.x) * u - Math.sin(Math.PI * u) * lips.height * 0.12, y: top.y + (bottom.y - top.y) * u };
  });
  return [...lips.upper, ...front, ...[...lips.lower].reverse()];
}

/** Which way the open mouth faces, radians (screen-style: 0 forwards, negative up), for the frog unturned. */
export const MOUTH_HEADING = -0.32;

// ---------------------------------------------------------------- the body's outline

/** The outline's keys, closed, from the front of the mouth over the head, down the back, round the belly to the chin. */
const KEYS: readonly Pt[] = [
  TIP,
  { x: 101, y: -46 },
  { x: 92, y: -64 },
  { x: 74, y: -81 },
  { x: 48, y: -93 },
  { x: 16, y: -97 },
  { x: -20, y: -92 },
  { x: -52, y: -78 },
  { x: -78, y: -57 },
  { x: -96, y: -31 },
  { x: -106, y: -18 },
  { x: TAIL_BASE_X, y: -12 },
  { x: TAIL_BASE_X, y: 11 },
  { x: -104, y: 19 },
  { x: -92, y: 37 },
  { x: -70, y: 61 },
  { x: -36, y: 80 },
  { x: 2, y: 88 },
  { x: 40, y: 82 },
  { x: 70, y: 64 },
  { x: 92, y: 38 },
  { x: 104, y: 8 },
  { x: 108, y: -18 },
];

/** A closed Catmull-Rom curve through `keys`, `per` points per span. */
function closedSpline(keys: readonly Pt[], per: number): Pt[] {
  const n = keys.length;
  const out: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const p0 = keys[(i - 1 + n) % n]!;
    const p1 = keys[i]!;
    const p2 = keys[(i + 1) % n]!;
    const p3 = keys[(i + 2) % n]!;
    for (let k = 0; k < per; k++) {
      const t = k / per;
      const t2 = t * t;
      const t3 = t2 * t;
      const f = (a: number, b: number, c: number, d: number): number =>
        0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push({ x: f(p0.x, p1.x, p2.x, p3.x), y: f(p0.y, p1.y, p2.y, p3.y) });
    }
  }
  return out;
}

/** The body's outline, lumpy with little warts (but smooth across the mouth and the tail stalk). */
export const OUTLINE: readonly Pt[] = (() => {
  const raw = closedSpline(KEYS, 8);
  const n = raw.length;
  return raw.map((p, i) => {
    const prev = raw[(i - 1 + n) % n]!;
    const next = raw[(i + 1) % n]!;
    const dx = next.x - prev.x;
    const dy = next.y - prev.y;
    const d = Math.hypot(dx, dy) || 1;
    // Outward normal (the outline runs anticlockwise on screen: over the top towards the tail).
    const nx = dy / d;
    const ny = -dx / d;
    // Smooth across the tail stalk and round the jaws (the chin stretches when the mouth opens).
    const calm = Math.min(1, Math.abs(p.x - TAIL_BASE_X) / 14) * Math.min(1, Math.hypot(p.x - TIP.x, p.y - TIP.y) / 26) * (p.x > 62 && p.y > -30 ? 0 : 1);
    const bump = calm * (1.5 * Math.sin(i * 1.93) + 0.9 * Math.sin(i * 4.1 + 1.2));
    return { x: p.x + nx * bump, y: p.y + ny * bump };
  });
})();

/** True when p is inside the closed polygon. */
export function inside(poly: readonly Pt[], p: Pt): boolean {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i]!;
    const b = poly[j]!;
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) hit = !hit;
  }
  return hit;
}

// ---------------------------------------------------------------- the limbs

/** A fleshy arm: shoulder, elbow, wrist, and the fan of fin rays it stands on. */
export interface Arm {
  readonly shoulder: Pt;
  readonly elbow: Pt;
  readonly wrist: Pt;
  /** The hand's fan: from, to (fp), resting on the ground. */
  readonly hand: readonly [Pt, Pt];
  readonly width: number;
}

export const PECTORAL: Arm = {
  shoulder: { x: -2, y: 28 },
  elbow: { x: -34, y: 70 },
  wrist: { x: -12, y: 101 },
  hand: [{ x: -40, y: GROUND_Y }, { x: 20, y: GROUND_Y }],
  width: 17,
};

export const PELVIC: Arm = {
  shoulder: { x: 40, y: 72 },
  elbow: { x: 40, y: 92 },
  wrist: { x: 54, y: 104 },
  hand: [{ x: 40, y: GROUND_Y }, { x: 74, y: GROUND_Y }],
  width: 10,
};

/** The far side's limbs peek out a little forwards of the near ones. */
export const FAR_SHIFT: Pt = { x: 16, y: -2 };
