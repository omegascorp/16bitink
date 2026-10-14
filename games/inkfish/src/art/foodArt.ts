import type { FoodId } from '../levels/foodFalls';
import { createRng, type Rng } from '../logic/rng';
import { oval, qb } from './itemArt';
import { INK, Pen, type Pt } from './pen';
import { ART_RES } from './propArt';

/** In-game size of a piece of sinking food; the texture is FOOD_SIZE * ART_RES square. */
export const FOOD_SIZE = 48;

const S = ART_RES;
const HALF = FOOD_SIZE / 2;
const PAPER_FILL = '#fffaf0';

/** Drawing context for one piece: a pen plus a local frame (units are in-game px, origin at the centre). */
interface Draw {
  readonly pen: Pen;
  readonly rng: Rng;
  readonly P: (x: number, y: number) => Pt;
  readonly L: (pts: readonly Pt[]) => Pt[];
}

const pt = (x: number, y: number): Pt => ({ x, y });

function frame(pen: Pen, seed: number): Draw {
  const P = (x: number, y: number): Pt => ({ x: (HALF + x) * S, y: (HALF + y) * S });
  return { pen, rng: createRng(seed * 7 + 3), P, L: (pts) => pts.map((p) => P(p.x, p.y)) };
}

/** A shape filled with paper, then a wash of colour, then inked round. */
function body(d: Draw, pts: readonly Pt[], color: string, alpha: number, width = 1.1): void {
  d.pen.fill(d.L(pts), PAPER_FILL, 1);
  d.pen.fill(d.L(pts), color, alpha);
  d.pen.stroke(d.L([...pts, pts[0]!]), width * S);
}

/** A strip of even-ish width along a centre line: a leaf, a blade, a tube. `width(t)` is the half-width at 0..1. */
function ribbon(centre: readonly Pt[], width: (t: number) => number): Pt[] {
  const n = centre.length - 1;
  const side = (sign: number): Pt[] => centre.map((c, i) => {
    const a = centre[Math.max(0, i - 1)]!;
    const b = centre[Math.min(n, i + 1)]!;
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const w = width(i / n) * sign;
    return pt(c.x - ((b.y - a.y) / len) * w, c.y + ((b.x - a.x) / len) * w);
  });
  return [...side(1), ...side(-1).reverse()];
}

/** A small pointed leaf from (x, y), `len` long, pointing at `angle`. */
function leaf(x: number, y: number, len: number, w: number, angle: number): Pt[] {
  const tip = pt(x + Math.cos(angle) * len, y + Math.sin(angle) * len);
  return ribbon(qb(pt(x, y), pt((x + tip.x) / 2, (y + tip.y) / 2), tip, 6), (t) => Math.sin(Math.PI * t) * w);
}

// ---------------------------------------------------------------- shallow water

/** A torn corner of a slice of bread a child has tossed in: a brown crust along two sides, soft white crumb. */
function drawBread(d: Draw): void {
  const { pen, L, P, rng } = d;
  // Crust along the top and right, torn edges on the other two sides.
  const torn = Array.from({ length: 9 }, (_, i) => {
    const t = i / 8;
    const wob = i === 0 || i === 8 ? 0 : (rng() - 0.5) * 3.2;
    return t < 0.5 ? pt(13 - t * 2 * 28 + wob * 0.3, 14 + wob) : pt(-15 + wob, 14 - (t - 0.5) * 2 * 26);
  });
  const outline = [...qb(pt(-15, -12), pt(-2, -18), pt(10, -13), 8), ...qb(pt(10, -13), pt(16, -8), pt(14, 2), 6), pt(13, 14), ...torn.slice(1, 8)];
  body(d, outline, '#f7efd9', 0.95);
  pen.clipped(L(outline), () => {
    const inner = [...qb(pt(-15, -9), pt(-2, -15), pt(8, -10), 8), ...qb(pt(8, -10), pt(12.5, -6), pt(11, 3), 6), pt(10.5, 16), pt(30, 16), pt(30, -30), pt(-20, -30)];
    pen.fill(L(inner), '#b5702c', 0.95);
    pen.hair(L(inner.slice(0, 15)), 0.45 * S, INK, 0.6);
    // A fine, soft crumb: tiny pores, no big holes.
    pen.stipple(L(outline), 160, (x, y) => (y > P(0, -6).y ? 0.6 : 0), 0.45 * S, '#c9b48a');
    for (let i = 0; i < 7; i++) {
      const c = pt(-11 + rng() * 18, -3 + rng() * 14);
      pen.hair(L(oval(c.x, c.y, 1.1, 0.6, 6, Math.PI, Math.PI * 2)), 0.35 * S, INK, 0.45);
    }
  });
  pen.stroke(L([...outline, outline[0]!]), 1.1 * S);
}

/** A little bunch of sea grapes fallen from a beach tree: purple berries on a short stalk. */
function drawSeagrape(d: Draw): void {
  const { pen, L, P } = d;
  const grapes: readonly (readonly [number, number])[] = [[-1, -6], [-8, -1], [6, -2], [-2, 4], [-9, 9], [7, 7], [0, 13]];
  pen.stroke(L(qb(pt(-1, -8), pt(0, -15), pt(4, -20))), 1.1 * S, '#6b5a2e', 1, false);
  for (const [x, y] of grapes) pen.hair(L([pt(-1, -8), pt(x * 0.6, y * 0.6 - 3)]), 0.5 * S, '#6b5a2e', 0.8);
  for (const [x, y] of grapes) {
    const g = oval(x, y, 5.2, 5.2, 16);
    body(d, g, '#6e3f78', 0.85, 0.9);
    pen.fill(L(oval(x - 1.8, y - 1.8, 1.5, 1.1, 8)), PAPER_FILL, 0.75);
    const dot = P(x + 2, y + 2.2);
    pen.dot(dot.x, dot.y, 0.5 * S, INK, 0.4);
  }
}

/** A giant kelp tip torn loose by the swell: a long, wrinkled golden blade with a frilled edge, on its gas float. */
function drawKelp(d: Draw): void {
  const { pen, L } = d;
  const mid = qb(pt(-12, 13), pt(-4, -4), pt(15, -17), 16);
  const blade = ribbon(mid, (t) => (t < 0.06 ? 1.5 + t * 40 : 7.5 * Math.pow(Math.sin(Math.PI * Math.min(1, t * 0.85 + 0.15)), 0.7)) + Math.sin(t * 70) * 0.45);
  body(d, blade, '#a8862e', 0.75);
  pen.clipped(L(blade), () => {
    // Long soft wrinkles along the blade, not across it.
    for (const off of [-3.5, 0, 3.5]) {
      const line = mid.slice(2, 15).map((c, i) => pt(c.x + off * 0.6 + Math.sin(i * 1.3) * 0.6, c.y + off * 0.8));
      pen.hair(L(line), 0.4 * S, '#6b5a2e', 0.5);
    }
  });
  pen.stroke(L([pt(-15, 17), pt(-19, 21)]), 1.2 * S, '#6b5a2e', 1, false);
  body(d, oval(-13.5, 15, 3, 3.6, 12), '#c99a3a', 0.9, 0.9);
}

/** A crumb of sponge torn loose by a turtle: a lumpy yellow chunk riddled with pores. */
function drawSponge(d: Draw): void {
  const { pen, L, P, rng } = d;
  const lumps = Array.from({ length: 18 }, (_, i) => {
    const a = (i / 18) * Math.PI * 2;
    const r = 13 + Math.sin(a * 3 + 1) * 2.5 + (rng() - 0.5) * 2.4;
    return pt(Math.cos(a) * r * 1.1, Math.sin(a) * r * 0.85);
  });
  body(d, lumps, '#d9a441', 0.9);
  pen.clipped(L(lumps), () => {
    pen.stipple(L(lumps), 260, (x, y) => (y > P(0, 3).y ? 0.9 : 0.3), 0.5 * S, '#7a5418');
    for (let i = 0; i < 9; i++) {
      const c = pt(-11 + rng() * 22, -8 + rng() * 15);
      const r = 1.2 + rng() * 1.6;
      pen.fill(L(oval(c.x, c.y, r, r * 0.8, 10)), '#5a3a12', 0.85);
      pen.hair(L(oval(c.x, c.y - 0.4, r + 0.6, r * 0.8 + 0.5, 10, Math.PI, Math.PI * 2)), 0.4 * S, INK, 0.6);
    }
  });
  // The torn side, where the turtle bit it off: raw and paler.
  pen.hair(L(qb(pt(6, -11), pt(10, -2), pt(14, 4))), 0.6 * S, INK, 0.7);
}

/** A clump of sargassum weed broken off a floating raft: branching stems, little leaves, round air berries. */
function drawSargassum(d: Draw): void {
  const { pen, L } = d;
  const stems = [qb(pt(-14, 15), pt(-4, 2), pt(4, -14), 8), qb(pt(-6, 5), pt(4, 4), pt(14, -4), 6), qb(pt(-10, 10), pt(-16, 0), pt(-12, -10), 6)];
  for (const s of stems) pen.stroke(L(s), 1 * S, '#6b5a2e', 1, false);
  const leaves: readonly (readonly [number, number, number])[] = [
    [-2, -2, -2.2], [1, -8, -0.6], [3, -12, -1.9], [-6, 6, -0.3], [6, 2, -1.2], [10, -1, 0.2], [-13, -3, -2.6], [-14, 4, 3.4], [-9, 9, 0.6],
  ];
  for (const [x, y, a] of leaves) {
    const l = leaf(x, y, 8, 1.8, a);
    body(d, l, '#a8792a', 0.85, 0.7);
    pen.hair(L(qb(pt(x, y), pt(x + Math.cos(a) * 4, y + Math.sin(a) * 4), pt(x + Math.cos(a) * 7, y + Math.sin(a) * 7), 4)), 0.35 * S, INK, 0.5);
  }
  for (const [x, y] of [[4, -15], [14, -5], [-12, -11], [-3, 1], [8, 4], [-15, 9]] as const) {
    body(d, oval(x, y, 2.1, 2.1, 10), '#c99a3a', 0.95, 0.7);
    pen.fill(L(oval(x - 0.6, y - 0.7, 0.6, 0.5, 6)), PAPER_FILL, 0.8);
  }
}

/** A sea butterfly: a tiny swimming snail, its glassy coiled shell hung between two clear wings. */
function drawButterfly(d: Draw): void {
  const { pen, L } = d;
  for (const side of [-1, 1]) {
    const wing = leaf(side * 1.5, -1, 18, 6, side < 0 ? -2.6 : -0.54);
    pen.fill(L(wing), '#c9d6ee', 0.6);
    pen.stroke(L([...wing, wing[0]!]), 0.7 * S, INK, 0.75, false);
    for (const k of [0.5, 0.75]) pen.hair(L([pt(side * 2, -1), pt(side * 15 * k + side * 2, -9 * k - 1)]), 0.35 * S, '#4a5a8a', 0.6);
  }
  const shell = oval(0, 6, 6.5, 6, 18);
  body(d, shell, '#efe6d4', 0.9, 1);
  // The coil, winding in to the tip.
  const spiral = Array.from({ length: 30 }, (_, i) => {
    const a = i * 0.42;
    const r = 5.4 - i * 0.17;
    return pt(Math.cos(a) * r, 6 + Math.sin(a) * r * 0.92);
  });
  pen.hair(L(spiral), 0.45 * S, INK, 0.7);
  pen.fill(L(oval(-2, 3.5, 1.2, 1.8, 8)), PAPER_FILL, 0.8);
}

// ---------------------------------------------------------------- the deep

/** A flake of marine snow: a loose, fluffy clump of pale specks held together by fine threads. */
function drawSnow(d: Draw): void {
  const { pen, L, P, rng } = d;
  const bits = Array.from({ length: 8 }, (_, i) => {
    const a = (i / 8) * Math.PI * 2 + rng() * 0.5;
    const r = i === 0 ? 0 : 6 + rng() * 6;
    return pt(Math.cos(a) * r, Math.sin(a) * r * 0.85);
  });
  for (const b of bits) {
    for (let k = 0; k < 2; k++) {
      const a = rng() * Math.PI * 2;
      pen.hair(L(qb(b, pt(b.x + Math.cos(a) * 5 + 2, b.y + Math.sin(a) * 5), pt(b.x + Math.cos(a) * 9, b.y + Math.sin(a) * 9), 5)), 0.35 * S, '#8a8a80', 0.6);
    }
  }
  for (const b of bits) {
    const blob = Array.from({ length: 9 }, (_, i) => {
      const a = (i / 9) * Math.PI * 2;
      const r = 3 + rng() * 2;
      return pt(b.x + Math.cos(a) * r, b.y + Math.sin(a) * r);
    });
    pen.fill(L(blob), '#f6f3ea', 0.95);
    pen.stroke(L([...blob, blob[0]!]), 0.5 * S, INK, 0.6, false);
    for (let k = 0; k < 3; k++) {
      const p = P(b.x + (rng() - 0.5) * 4, b.y + (rng() - 0.5) * 4);
      pen.dot(p.x, p.y, 0.45 * S, rng() < 0.5 ? '#7a8a5a' : '#8a7a6a', 0.8);
    }
  }
}

/** A sea pickle (a pyrosome): a glowing tube of tiny plankton animals, bumpy all over, open at one end. */
function drawPickle(d: Draw): void {
  const { pen, L, P } = d;
  const centre = qb(pt(-16, 6), pt(0, -2), pt(16, -6), 12);
  const tube = ribbon(centre, (t) => 5 + t * 2.5);
  pen.fill(L(ribbon(centre, (t) => 8 + t * 2.5)), '#9fe8dc', 0.25);
  body(d, tube, '#bfe6dc', 0.9);
  pen.clipped(L(tube), () => {
    for (let i = 1; i < 12; i++) {
      const c = centre[i]!;
      for (const k of [-0.6, 0, 0.6]) {
        const p = P(c.x + (i % 2) * 0.8, c.y + k * (5 + (i / 12) * 2.5));
        pen.dot(p.x, p.y, 0.9 * S, '#5fb3a5', 0.85);
      }
    }
  });
  // The open end: a dark mouth with a lighter rim.
  pen.fill(L(oval(16, -6, 2.4, 7, 14)), '#2f6f68', 0.85);
  pen.stroke(L(oval(16, -6, 2.4, 7, 14)), 0.8 * S);
}

/** A clump of green fluff: a spring bloom of algae, settled into a soft little cloud. */
function drawFluff(d: Draw): void {
  const { pen, L, P, rng } = d;
  const puffs: readonly (readonly [number, number, number])[] = [[-7, 2, 7], [2, -3, 8], [9, 3, 6.5], [0, 6, 7], [-12, 6, 4.5]];
  const outline = Array.from({ length: 40 }, (_, i) => {
    const a = (i / 40) * Math.PI * 2;
    const dir = pt(Math.cos(a), Math.sin(a));
    // The cloud's edge: the furthest reach of any puff in this direction.
    const r = Math.max(...puffs.map(([x, y, pr]) => {
      const along = x * dir.x + y * dir.y;
      const across = x * dir.y - y * dir.x;
      return pr > Math.abs(across) ? along + Math.sqrt(pr * pr - across * across) : 0;
    }));
    return pt(dir.x * r, dir.y * r);
  });
  pen.fill(L(outline), '#a6c27a', 0.95);
  pen.stipple(L(outline), 180, (x, y) => (y > P(0, 3).y ? 0.85 : 0.3), 0.5 * S, '#5f7a3a');
  for (const [x, y, pr] of puffs.slice(1)) pen.hair(L(oval(x, y, pr * 0.8, pr * 0.7, 12, Math.PI * 1.05, Math.PI * 1.7)), 0.4 * S, '#4f6a2e', 0.5);
  pen.stroke(L([...outline, outline[0]!]), 0.7 * S, INK, 0.7, false);
  // A few loose wisps trailing behind as it sinks.
  for (const x of [-8, 0, 7]) pen.hair(L(qb(pt(x, -7 + Math.abs(x) * 0.2), pt(x - 3 + rng() * 2, -12), pt(x + 1, -16), 5)), 0.4 * S, '#5f7a3a', 0.6);
}

/** A few seagrass leaves swept out of the shallows: long green straps, browning at the tips. */
function drawSeagrass(d: Draw): void {
  const { pen, L } = d;
  const blades = [qb(pt(-1, 17), pt(-10, 2), pt(-15, -17), 14), qb(pt(0, 17), pt(4, 0), pt(2, -20), 14), qb(pt(1, 17), pt(12, 4), pt(16, -13), 14)];
  for (const mid of blades) {
    const blade = ribbon(mid, (t) => (t > 0.94 ? (1 - t) * 30 : 1.9));
    body(d, blade, '#5f8a46', 0.85, 0.8);
    pen.clipped(L(blade), () => {
      const tip = mid.slice(9);
      pen.fill(L(ribbon(tip, () => 3)), '#a08a5a', 0.75);
    });
    pen.hair(L(mid.slice(1, 13)), 0.35 * S, INK, 0.5);
  }
  body(d, oval(0, 18, 3.5, 2, 10), '#8a7a52', 0.9, 0.8);
}

const DRAW: Readonly<Record<FoodId, (d: Draw) => void>> = {
  bread: drawBread, seagrape: drawSeagrape, kelp: drawKelp, sponge: drawSponge, sargassum: drawSargassum,
  butterfly: drawButterfly, snow: drawSnow, pickle: drawPickle, fluff: drawFluff, seagrass: drawSeagrass,
};

/** One piece of a zone's food fall, centred in a FOOD_SIZE square; it tumbles as it sinks. */
export function drawFood(ctx: CanvasRenderingContext2D, kind: FoodId, seed: number): void {
  DRAW[kind](frame(new Pen(ctx, seed, 0.35), seed));
}
