import { createRng } from '../../logic/rng';
import { bezier, closed, type Draw, pt } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { mix } from '../wash';
import { beadEye, ellipseAt, glaze } from '../critters/preyKit';
import { tube } from '../critters/tomcatParts';
import { grizzle, paintFur, type Pelt } from './barrensCrittersBeast';

/**
 * A blue wildebeest's head and neck from above, facing +x: the long face
 * with its broad, square muzzle, dark from the brow down; cow-like horns
 * sweeping out sideways from a heavy boss and hooking forward and in at
 * the tips; small ears behind them; the black mane standing along the
 * neck; and the shaggy black beard hanging under the throat, showing past
 * the jaw on both sides.
 */
export const GNU = {
  coat: '#625d5b',
  silver: '#928b84',
  deep: '#2c2829',
  light: '#cfc8bd',
  stripe: '#2a2526',
  warm: '#7b6a5a',
  black: '#1b1819',
  face: '#2e2a2a',
  muzzle: '#3a3433',
  horn: '#3d3a37',
  hornLit: '#8d867d',
  hoof: '#1a1716',
  leg: '#5b5655',
  dust: '#cdb88c',
  dustDeep: '#a48d62',
} as const;

const G = GNU;

export const GNU_PELT: Pelt = { base: G.coat, deep: G.deep, light: G.light, hair: (_p, r) => grizzle(G.stripe, G.coat, G.silver, G.warm, 0.25)(r) };

/** Coarse dark hairs from `from`, `n` of them about `len` long, lying `ang` (± `spread`). */
export function shag(d: Draw, from: readonly Pt[], ang: (p: Pt) => number, len: number, n: number, seed: number, colour: string, w = 0.45): void {
  const rng = createRng(seed);
  for (let i = 0; i < n; i++) {
    const p = from[Math.floor(rng() * from.length)]!;
    const a = ang(p) + (rng() - 0.5) * 0.5;
    const l = len * (0.6 + rng() * 0.7);
    const q = pt(p.x + Math.cos(a) * l, p.y + Math.sin(a) * l);
    const m = pt((p.x + q.x) / 2 + Math.cos(a + 1.57) * l * 0.12, (p.y + q.y) / 2 + Math.sin(a + 1.57) * l * 0.12);
    d.pen.hair([p, m, q], w, colour, 0.85);
  }
}

/** One horn on the `side` (+1 is +y): out from the boss, back a little, then hooked forward and in. */
function horn(d: Draw, C: Pt, side: 1 | -1): void {
  const { pen } = d;
  const s = side;
  const spine = [...bezier(pt(C.x - 0.4, C.y + s * 2), pt(C.x - 1.6, C.y + s * 7.4), pt(C.x + 0.8, C.y + s * 8.4), 10), ...bezier(pt(C.x + 0.8, C.y + s * 8.4), pt(C.x + 2.4, C.y + s * 8.8), pt(C.x + 2.6, C.y + s * 7.6), 6).slice(1)];
  const shape = tube(spine, (u) => 2.5 * (1 - u) + 0.45);
  pen.fill(shape.map((p) => pt(p.x + 0.9, p.y + 1.4)), d.ink, 0.25);
  pen.fill(shape, G.horn, 1);
  pen.clipped(shape, () => {
    pen.hair(spine.map((p) => pt(p.x - 0.4, p.y - 0.5)), 0.6, G.hornLit, 0.6);
    for (let i = 1; i < 6; i++) {
      const a = spine[i]!;
      pen.hair([pt(a.x - 1.6, a.y), pt(a.x + 1.6, a.y)], 0.3, G.black, 0.5);
    }
  });
  pen.stroke(closed(shape), 0.45, d.ink, 1, false);
}

function ear(d: Draw, C: Pt, side: 1 | -1): void {
  const { pen } = d;
  const c = pt(C.x - 2.2, C.y + side * 4);
  const shape = ellipseAt(c.x, c.y, 2.3, 1, side * 1.1, 12);
  pen.fill(shape, G.coat, 1);
  pen.fill(ellipseAt(c.x + 0.2, c.y, 1.6, 0.6, side * 0.9, 10), G.light, 0.6);
  pen.stroke(closed(shape), 0.4, d.ink, 0.9, false);
}

/** The neck from the shoulders (`from`) to the head's crown C: dark-striped, the mane along its top. */
export function neckShape(from: Pt, C: Pt): { shape: Pt[]; spine: Pt[] } {
  const spine = bezier(from, pt((from.x + C.x) / 2, (from.y + C.y) / 2 + (C.y - from.y) * 0.2), C, 8);
  return { shape: tube(spine, (u) => 9.4 - 3.6 * u), spine };
}

export function paintNeck(d: Draw, neck: { shape: Pt[]; spine: Pt[] }, seed: number): void {
  const { shape, spine } = neck;
  const ang = Math.atan2(spine[spine.length - 1]!.y - spine[0]!.y, spine[spine.length - 1]!.x - spine[0]!.x);
  // The beard under the throat, showing past the neck on both sides.
  for (const s of [-1, 1]) shag(d, spine.slice(4).map((p) => pt(p.x, p.y + s * 2.6)), () => ang + s * 2.2, 3.2, 55, seed + (s > 0 ? 1 : 2), G.black, 0.5);
  paintFur(d, GNU_PELT, {
    shape,
    dir: () => ang + Math.PI,
    wet: () => {
      for (let i = 1; i < spine.length; i += 1.5) {
        const p = spine[Math.floor(i)]!;
        d.pen.hair([pt(p.x - Math.sin(ang) * 6, p.y + Math.cos(ang) * 6), pt(p.x + Math.sin(ang) * 6, p.y - Math.cos(ang) * 6)], 1, G.stripe, 0.55);
      }
    },
    n: 220, len: 1.4, seed, tuft: 0.7, line: 0.75,
  });
  // The mane: stiff black hair standing along the top of the neck.
  shag(d, spine.slice(1), () => ang + Math.PI, 2.6, 60, seed + 3, G.black, 0.55);
  d.pen.hair(spine.slice(1), 1.4, G.black, 0.8);
}

/** The long face from above, its poll at C: broad at the horns, narrowing past the eyes, a broad square muzzle at the front. */
const FACE: readonly (readonly [number, number])[] = [[14.2, 0], [14, 1.9], [12.8, 2.8], [10, 2.5], [6.5, 2.3], [3.5, 2.9], [0.5, 3.5], [-2, 3.2], [-3.4, 1.9], [-3.8, 0]];

export function gnuHeadShape(C: Pt): Pt[] {
  const half = FACE.map(([x, y]) => pt(C.x + x, C.y + y));
  const other = [...FACE].reverse().slice(1, -1).map(([x, y]) => pt(C.x + x, C.y - y));
  return [...half, ...other];
}

/** The head with its poll at C, facing +x. */
export function paintGnuHead(d: Draw, C: Pt, seed: number): void {
  const { pen } = d;
  const shape = gnuHeadShape(C);
  const nose = pt(C.x + 13.6, C.y);
  for (const s of [-1, 1] as const) ear(d, C, s);
  paintFur(d, GNU_PELT, {
    shape,
    dir: (p) => Math.atan2(p.y - nose.y, p.x - nose.x),
    wet: () => {
      glaze(d, C.x + 7, C.y, 8, 2.2, 0, G.face, 0.9);
      glaze(d, C.x + 12.5, C.y, 2.6, 3, 0, G.muzzle, 0.9);
      for (const s of [-1, 1]) glaze(d, C.x + 6, C.y + s * 2.4, 5, 0.8, 0, G.silver, 0.35);
    },
    hair: (p, r) => (p.x - C.x > 1 && Math.abs(p.y - C.y) < 1.8 ? (r < 0.75 ? G.black : G.face) : grizzle(G.stripe, G.coat, G.silver, G.warm, 0.25)(r)),
    n: 180, len: 1.2, seed: seed + 5, tuft: 0.5, line: 0.7,
  });
  // The broad square muzzle and its nostrils.
  for (const s of [-1, 1]) {
    pen.fill(ellipseAt(nose.x - 0.4, C.y + s * 1.5, 0.8, 0.55, s * 0.5, 10), G.black, 1);
    const e = pt(C.x + 2.6, C.y + s * 3);
    pen.fill(ellipseAt(e.x, e.y, 1, 0.7, s * 0.3, 10), G.black, 1);
    beadEye(d, e, 0.6);
  }
  pen.hair([pt(nose.x, C.y - 1.9), pt(nose.x + 0.4, C.y), pt(nose.x, C.y + 1.9)], 0.45, mix(G.muzzle, PAPER_FILL, 0.3), 0.6);
  // The boss: the heavy horn base across the crown.
  const boss = ellipseAt(C.x - 0.4, C.y, 1.5, 2.8, 0, 14);
  pen.fill(boss, G.horn, 1);
  pen.hair([pt(C.x - 0.8, C.y - 2.2), pt(C.x - 0.2, C.y), pt(C.x - 0.8, C.y + 2.2)], 0.45, G.hornLit, 0.7);
  for (const s of [-1, 1] as const) horn(d, C, s);
}
