import type { Pt } from './story';

/**
 * The two sharks' shapes seen from above, in world millimetres: the
 * tasselled wobbegong lying nose up with its mouth at the origin (about
 * 1.43 m long, its head as broad as it is long), and the bamboo shark (1 m)
 * going into that mouth head-first, its swallowed front half straight down
 * the wobbegong's throat and its back half curling up out of it.
 */

/** Its right side, snout to tail tip (the left mirrors it). */
const BODY_RIGHT: readonly Pt[] = [
  { x: 0, y: 2 }, { x: 70, y: 6 }, { x: 140, y: 22 }, { x: 196, y: 52 }, { x: 238, y: 98 }, { x: 262, y: 158 }, { x: 272, y: 220 }, { x: 270, y: 280 },
  { x: 262, y: 330 }, { x: 250, y: 380 }, { x: 234, y: 470 }, { x: 214, y: 590 }, { x: 186, y: 730 }, { x: 152, y: 860 }, { x: 122, y: 955 },
  { x: 92, y: 1055 }, { x: 68, y: 1145 }, { x: 52, y: 1225 }, { x: 44, y: 1285 }, { x: 74, y: 1330 }, { x: 68, y: 1385 }, { x: 26, y: 1425 },
];
/** The body's outline, closed, clockwise from the snout. */
export const BODY: readonly Pt[] = (() => {
  const right = BODY_RIGHT;
  const left = [...right].reverse().map((p) => ({ x: -p.x, y: p.y }));
  return [...right, { x: 0, y: 1432 }, ...left.slice(0, -1)];
})();
export const BODY_LEN = 1432;

/** The big rounded pectoral fins, right then left. */
const PEC_RIGHT: readonly Pt[] = [
  { x: 236, y: 360 }, { x: 320, y: 372 }, { x: 402, y: 414 }, { x: 452, y: 482 }, { x: 456, y: 548 }, { x: 412, y: 596 }, { x: 330, y: 612 }, { x: 250, y: 590 }, { x: 214, y: 560 },
];
const PEL_RIGHT: readonly Pt[] = [{ x: 136, y: 890 }, { x: 196, y: 918 }, { x: 226, y: 976 }, { x: 204, y: 1034 }, { x: 150, y: 1040 }, { x: 108, y: 1010 }];
const flipX = (pts: readonly Pt[]): Pt[] => pts.map((p) => ({ x: -p.x, y: p.y }));
export const FINS: readonly (readonly Pt[])[] = [PEC_RIGHT, flipX(PEC_RIGHT), PEL_RIGHT, flipX(PEL_RIGHT)];
/** The two dorsal fins, low on its back near the tail (leaning, so they show from above). */
export const DORSALS: readonly { readonly from: number; readonly to: number; readonly lean: number }[] = [
  { from: 1010, to: 1120, lean: 52 },
  { from: 1160, to: 1250, lean: 40 },
];

/** Its eyes on top of the head, and the spiracles behind them. */
export const EYES: readonly Pt[] = [{ x: -118, y: 150 }, { x: 118, y: 150 }];
export const EYE_R = { x: 25, y: 16 } as const;
export const SPIRACLES: readonly Pt[] = [{ x: -150, y: 212 }, { x: 150, y: 212 }];

/** The front of the head (the upper jaw's edge) at x, mm (y of the outline). */
export function frontAt(x: number): number {
  const ax = Math.abs(x);
  for (let i = 1; i < BODY_RIGHT.length; i++) {
    const a = BODY_RIGHT[i - 1]!;
    const b = BODY_RIGHT[i]!;
    if (ax <= b.x) return a.y + ((b.y - a.y) * (ax - a.x)) / (b.x - a.x || 1);
  }
  return BODY_RIGHT[BODY_RIGHT.length - 1]!.y;
}

/** Half the body's width at y (the outline only, no fins). */
export function halfWidthAt(y: number): number {
  let best = 0;
  for (let i = 1; i < BODY_RIGHT.length; i++) {
    const a = BODY_RIGHT[i - 1]!;
    const b = BODY_RIGHT[i]!;
    if ((a.y - y) * (b.y - y) <= 0 && a.y !== b.y) best = Math.max(best, a.x + ((b.x - a.x) * (y - a.y)) / (b.y - a.y));
  }
  return best;
}

/**
 * Where the tassels grow: along the head's front and sides, each with its
 * outward direction (a unit vector), leaving the middle of the lip bare
 * where it's stretched round the bamboo shark.
 */
export const FRINGE: readonly { readonly at: Pt; readonly out: Pt; readonly len: number; readonly seed: number }[] = (() => {
  const head = BODY_RIGHT.slice(0, 11);
  const path = [...[...head].reverse().map((p) => ({ x: -p.x, y: p.y })), ...head.slice(1)];
  const out: { at: Pt; out: Pt; len: number; seed: number }[] = [];
  let carry = 0;
  const STEP = 19;
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1]!;
    const b = path[i]!;
    const d = Math.hypot(b.x - a.x, b.y - a.y);
    for (let s = carry; s < d; s += STEP) {
      const p = { x: a.x + ((b.x - a.x) * s) / d, y: a.y + ((b.y - a.y) * s) / d };
      if (Math.abs(p.x) < 118 && p.y < 40) continue;
      // Outward: the path runs left to right over the front, so out is its normal to the left.
      const n = { x: (b.y - a.y) / d, y: -(b.x - a.x) / d };
      const k = out.length;
      out.push({ at: p, out: n, len: 34 + 22 * Math.abs(Math.sin(k * 2.39)) + (p.y > 200 ? -8 : 0), seed: 101 + k * 13 });
    }
    carry = (carry - d) % STEP;
    carry = carry < 0 ? carry + STEP : carry;
  }
  return out;
})();

// ---------------------------------------------------------------- the jaws

/** The lower jaw's half width, and how far it drops forward of the upper jaw (mm) for a gape of 0 .. 1. */
export const JAW_HALF = 132;
export const jawDrop = (gape: number): number => 40 + 40 * gape;

/** The lower jaw's front edge at x for a gape (above the upper jaw's edge on screen, the jaw dropped open). */
export function jawEdgeAt(x: number, gape: number): number {
  const f = Math.max(0, 1 - (x / JAW_HALF) ** 2);
  return frontAt(x) - jawDrop(gape) * f ** 0.6;
}

/** The lower jaw's outline (its skin, in front of the dark gape), closed. */
export function jawOutline(gape: number): Pt[] {
  const n = 24;
  const outer = Array.from({ length: n + 1 }, (_, i) => {
    const x = -JAW_HALF + (2 * JAW_HALF * i) / n;
    return { x, y: jawEdgeAt(x, gape) };
  });
  const inner = [...outer].reverse().map((p) => {
    const f = Math.max(0, 1 - (p.x / JAW_HALF) ** 2);
    return { x: p.x * 0.9, y: p.y + 20 * f ** 0.5 };
  });
  return [...outer, ...inner];
}

/** The dark of the open mouth: between the lower jaw's inner edge and the upper jaw. */
export function gapeOutline(gape: number): Pt[] {
  const n = 24;
  const lower = Array.from({ length: n + 1 }, (_, i) => {
    const x = -JAW_HALF * 0.9 + (1.8 * JAW_HALF * i) / n;
    const f = Math.max(0, 1 - (x / (JAW_HALF * 0.9)) ** 2);
    return { x, y: jawEdgeAt(x / 0.9, gape) + 20 * f ** 0.5 };
  });
  const upper = [...lower].reverse().map((p) => ({ x: p.x, y: frontAt(p.x) + 6 }));
  return [...lower, ...upper];
}

// ---------------------------------------------------------------- the bamboo shark

export const PREY_LEN = 1000;

/** Its half width at s mm from its snout, seen from above. */
const PREY_W: readonly (readonly [number, number])[] = [
  [0, 5], [20, 30], [60, 46], [120, 55], [250, 60], [400, 58], [480, 54], [560, 47], [640, 39], [700, 33], [800, 25], [900, 17], [960, 11], [1000, 3],
];
export function preyHalfWidth(s: number): number {
  const c = Math.max(0, Math.min(PREY_LEN, s));
  for (let i = 1; i < PREY_W.length; i++) {
    const [s0, w0] = PREY_W[i - 1]!;
    const [s1, w1] = PREY_W[i]!;
    if (c <= s1) {
      const f = (c - s0) / (s1 - s0);
      return w0 + (w1 - w0) * (f * f * (3 - 2 * f));
    }
  }
  return 2;
}

/** The bamboo shark's pose: how much is in, how its back half bends, its tail's flip and wave. */
export interface PreyPose {
  readonly inside: number;
  readonly bend: number;
  readonly flip: number;
  readonly wave: number;
}

/** A point on its spine: where, and its heading (radians, from snout towards tail). */
export interface SpinePt {
  readonly s: number;
  readonly x: number;
  readonly y: number;
  readonly a: number;
}

/** How far its back half curls over (radians) from the mouth to the tail, at rest. */
const CURL = 1.45;
const OUT_REF = 480;

/** How its back half leaves the mouth: the heading there (radians) and how far it curls over by the tail. */
export interface SpineLay {
  readonly start: number;
  readonly curl: number;
}
/** Seen from above: straight up out of the wobbegong's mouth, curling right. */
export const TOP_LAY: SpineLay = { start: -Math.PI / 2, curl: CURL };

/** Heading at u mm out of the mouth. */
function headingOut(p: PreyPose, u: number, lay: SpineLay): number {
  const tail = Math.max(0, Math.min(1, (u - 140) / 340)) ** 2;
  return lay.start + lay.curl * p.bend * (u / OUT_REF) + p.flip * tail + 0.09 * Math.sin(p.wave - u / 110) * Math.min(1, u / 260);
}

/** Its spine from s = `from` to the tail tip, every `step` mm (inside the mouth it runs straight back down the throat). */
export function preySpine(p: PreyPose, from = 0, step = 10, lay: SpineLay = TOP_LAY): SpinePt[] {
  const pts: SpinePt[] = [];
  let x = 0;
  let y = 0;
  let a = lay.start;
  // The part inside, snout deepest, straight back from the lips.
  const back = { x: -Math.cos(lay.start), y: -Math.sin(lay.start) };
  for (let s = from; s < p.inside; s += step) pts.push({ s, x: back.x * (p.inside - s), y: back.y * (p.inside - s), a: lay.start });
  for (let u = 0; ; u += step) {
    const s = p.inside + u;
    if (s > PREY_LEN) break;
    if (u > 0) {
      const mid = headingOut(p, u - step / 2, lay);
      x += Math.cos(mid) * step;
      y += Math.sin(mid) * step;
      a = headingOut(p, u, lay);
    }
    if (s >= from) pts.push({ s, x, y, a });
  }
  return pts;
}

/** The point at s and its sideways direction (to its right as it heads tailwards). */
export function spineAt(spine: readonly SpinePt[], s: number): { readonly p: Pt; readonly a: number; readonly n: Pt } {
  let i = 1;
  while (i < spine.length - 1 && spine[i]!.s < s) i++;
  const q0 = spine[i - 1]!;
  const q1 = spine[i]!;
  const f = Math.max(0, Math.min(1, (s - q0.s) / (q1.s - q0.s || 1)));
  const a = q0.a + (q1.a - q0.a) * f;
  return { p: { x: q0.x + (q1.x - q0.x) * f, y: q0.y + (q1.y - q0.y) * f }, a, n: { x: -Math.sin(a), y: Math.cos(a) } };
}

/** Its outline from s0 to s1 (open at s0 if it starts in the mouth), closed. */
export function preyOutline(spine: readonly SpinePt[], s0: number, s1 = PREY_LEN): Pt[] {
  const pts = spine.filter((q) => q.s >= s0 && q.s <= s1);
  const side = (k: 1 | -1): Pt[] =>
    pts.map((q) => {
      const w = preyHalfWidth(q.s) * k;
      return { x: q.x - Math.sin(q.a) * w, y: q.y + Math.cos(q.a) * w };
    });
  return [...side(1), ...side(-1).reverse()];
}

/** The tail tip, where frame 1 shows it. */
export const tailTip = (spine: readonly SpinePt[]): Pt => spine[spine.length - 1]!;

