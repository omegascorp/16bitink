import { createRng, type Rng } from '../../logic/rng';
import { closed, type Draw, pt, TAU } from '../kit';
import type { Pt } from '../pen';
import { ellipseAt, glaze } from '../critters/preyKit';
import { along, clumps, type Leg, paintFur, type Pelt, trunkShape } from './barrensCrittersBeast';
import { scatter } from './barrensCrittersKit';
import { type Jag, TRUNK } from './floodedBossParts';

/**
 * The Jaguar's coat: deep gold over the back, paling to cream low on the
 * flanks, covered in rosettes (broken black rings round a darker gold
 * centre with a spot or two inside, the jaguar's mark), a line of solid
 * spots down the spine, plain spots on the legs, the tail spotted then
 * ringed to its black tip. The rosettes are laid in the coat's own frame
 * and carried into each pose, so they stay put as the cat moves.
 */
export const JAG = {
  base: '#d9a13f',
  deep: '#7a4c18',
  light: '#f2d48e',
  dark: '#1c1511',
  centre: '#b5782a',
  pale: '#f4e6c2',
  warm: '#c98a34',
  white: '#f7f1e2',
  pad: '#3a2c26',
} as const;

const J = JAG;

/** A dark mark in the coat: a dab of a rosette's ring, or a solid spot. */
interface Dab {
  readonly c: Pt;
  readonly r: number;
  readonly rot: number;
  readonly stretch: number;
}
interface Rosette {
  readonly c: Pt;
  readonly r: number;
  readonly dabs: readonly Dab[];
  readonly inner: readonly Dab[];
}

/** The trunk at rest, where the coat's marks are laid out. */
const REST = trunkShape(TRUNK, 0, 0);

function rosetteAt(rng: Rng, c: Pt, r: number): Rosette {
  const n = 5 + Math.floor(rng() * 2);
  const a0 = rng() * TAU;
  const dabs = Array.from({ length: n }, (_, i) => {
    const a = a0 + (i / n) * TAU + (rng() - 0.5) * 0.35;
    return { c: pt(c.x + Math.cos(a) * r * 1.05, c.y + Math.sin(a) * r * 0.92), r: r * (0.26 + rng() * 0.1), rot: a + Math.PI / 2, stretch: 1.7 + rng() * 0.5 };
  });
  const inner = Array.from({ length: rng() < 0.55 ? 1 : 2 }, () => ({ c: pt(c.x + (rng() - 0.5) * r * 0.6, c.y + (rng() - 0.5) * r * 0.5), r: r * 0.2, rot: 0, stretch: 1 }));
  return { c, r, dabs, inner };
}

/** The coat's marks, the same every pose. */
const MARKS = ((): { rosettes: Rosette[]; spots: Dab[] } => {
  const rng = createRng(1010);
  const rosettes = scatter(rng, REST, 50, 8, (p) => Math.abs(p.y) > 3.4 && Math.abs(p.y) < 12 && p.x > -37 && p.x < 26).map((c) => rosetteAt(rng, c, 3.1 + rng() * 0.9 - Math.abs(c.y) * 0.05));
  const spots: Dab[] = [];
  // A line of solid spots down the spine.
  for (let x = 24; x > -38; x -= 4.6 + rng() * 1.4) spots.push({ c: pt(x, (rng() - 0.5) * 2.2), r: 1.3 + rng() * 0.5, rot: 0, stretch: 1.6 });
  // Small spots low on the flanks, breaking up where the rosettes give out.
  for (const p of scatter(rng, REST, 40, 3.6, (q) => Math.abs(q.y) > 12)) spots.push({ c: p, r: 0.8 + rng() * 0.5, rot: rng() * TAU, stretch: 1.2 });
  return { rosettes, spots };
})();

const dabShape = (d: Dab, map: (p: Pt) => Pt, n = 10): Pt[] => ellipseAt(d.c.x, d.c.y, d.r * d.stretch, d.r, d.rot, n).map(map);

/** Whether a point (in the pose's frame) lies on a dark mark, for colouring the hairs. */
function markTest(c: Jag): (p: Pt) => 'dark' | 'centre' | null {
  const dark = [...MARKS.spots, ...MARKS.rosettes.flatMap((r) => [...r.dabs, ...r.inner])].map((d) => ({ c: c.map(d.c), r: d.r * Math.max(1, d.stretch * 0.7) * Math.max(c.sx, c.sy) }));
  const centres = MARKS.rosettes.map((r) => ({ c: c.map(r.c), r: r.r * 0.7 }));
  return (p) => {
    for (const m of dark) if ((p.x - m.c.x) ** 2 + (p.y - m.c.y) ** 2 < m.r * m.r) return 'dark';
    for (const m of centres) if ((p.x - m.c.x) ** 2 + (p.y - m.c.y) ** 2 < m.r * m.r) return 'centre';
    return null;
  };
}

/** The marks themselves, as washes: each rosette's darker centre, its broken ring, the spots. */
function paintMarks(d: Draw, c: Jag, alpha: number): void {
  const { pen } = d;
  for (const r of MARKS.rosettes) {
    pen.fill(ellipseAt(r.c.x, r.c.y, r.r * 0.95, r.r * 0.82, 0, 14).map(c.map), J.centre, 0.4 * alpha);
    for (const dab of r.dabs) pen.fill(dabShape(dab, c.map), J.dark, 0.85 * alpha);
    for (const dab of r.inner) pen.fill(dabShape(dab, c.map, 8), J.dark, 0.8 * alpha);
  }
  for (const s of MARKS.spots) pen.fill(dabShape(s, c.map), J.dark, 0.85 * alpha);
}

const PELT: Pelt = { base: J.base, deep: J.deep, light: J.light, hair: (_p, r) => (r < 0.12 ? J.deep : r < 0.7 ? J.base : r < 0.9 ? J.warm : J.light) };

/** The trunk's coat: gold washes, the cream low on the flanks, the rosettes laid in, a coat of hairs that turn dark over the marks, volume. */
export function paintBody(d: Draw, c: Jag): void {
  const { sx, sy } = c;
  const test = markTest(c);
  const puff = c.puff;
  const lie = (p: Pt): number => (puff > 0.5 ? Math.atan2(p.y, (p.x + 6) * 0.4) : Math.PI + Math.sign(p.y) * Math.min(0.9, Math.abs(p.y) / 18));
  paintFur(d, PELT, {
    shape: c.trunk,
    dir: lie,
    wet: () => {
      for (const side of [-1, 1]) glaze(d, -6 * sx, side * 14.5 * sy, 30 * sx, 3.4 * sy, 0, J.pale, 0.75);
      glaze(d, -6 * sx, 0, 32 * sx, 7 * sy, 0, J.warm, 0.5);
      glaze(d, -8 * sx, -6 * sy, 26 * sx, 4 * sy, 0, J.light, 0.4);
      for (const [x, rx] of [[16, 9], [-26, 10]] as const) glaze(d, x * sx, -5 * sy, rx * sx, 5 * sy, 0.2, J.light, 0.4);
      paintMarks(d, c, 1);
    },
    hair: (p, r) => {
      const m = test(p);
      if (m === 'dark') return r < 0.8 ? J.dark : J.deep;
      if (m === 'centre') return r < 0.6 ? J.centre : J.warm;
      return Math.abs(p.y) > 13 * sy ? (r < 0.6 ? J.pale : J.light) : PELT.hair(p, r);
    },
    over: () => {
      paintMarks(d, c, 0.45);
      clumps(d, c.trunk, lie, 120, 1031, 3.2, J.deep, J.light, () => 0.4);
    },
    n: 1700, len: puff > 0.5 ? 3.6 : 2.6, seed: 1030, tuft: 1 + puff * 1.8, line: 0.9,
  });
}

/** A broad paw: round, its four toes bulging at the front, a few small spots, the claws sheathed. */
function paw(d: Draw, l: Leg, k: number): void {
  const { pen } = d;
  const u = pt(Math.cos(l.ang), Math.sin(l.ang));
  const c = pt(l.c.x + u.x * 1.5, l.c.y + u.y * 1.5);
  const r = l.front ? 4.4 : 4;
  const pad = ellipseAt(c.x, c.y, r, r * 0.88, l.ang, 22);
  const toes = [-0.75, -0.25, 0.25, 0.75].map((a) => ellipseAt(c.x + Math.cos(l.ang + a) * r * 0.78, c.y + Math.sin(l.ang + a) * r * 0.78, r * 0.38, r * 0.32, l.ang + a, 10));
  const all = [pad, ...toes];
  for (const s of all) pen.fill(s, J.base, 1);
  pen.clipped(pad, () => {
    pen.crescent(pad, pt(-0.7, -1), () => pen.fill(pad, J.deep, 0.4));
    glaze(d, c.x - 1, c.y - 1, r * 0.6, r * 0.4, 0, J.light, 0.4);
  });
  for (const t of toes) pen.clipped(t, () => pen.crescent(t, pt(-0.3, -0.5), () => pen.fill(t, J.deep, 0.45)));
  const rng = createRng(1050 + k);
  for (let i = 0; i < 4; i++) pen.dot(c.x - u.x * r * 0.3 + (rng() - 0.5) * r, c.y - u.y * r * 0.3 + (rng() - 0.5) * r, 0.55, J.dark, 0.8);
  for (const t of toes) pen.hair(t.slice(2, 9), 0.5, d.ink, 0.85);
  pen.stroke(closed(pad).filter((_, i) => i < 7 || i > 15), 0.6, d.ink, 0.9, false);
}

const LEG_PELT: Pelt = { base: J.base, deep: J.deep, light: J.light, hair: (_p, r) => (r < 0.15 ? J.deep : r < 0.85 ? J.base : J.light) };

/** A thick leg: gold, paler inside, small solid spots, the big paw. */
export function paintLeg(d: Draw, l: Leg, k: number): void {
  const rng = createRng(1040 + k);
  const spots = Array.from({ length: 9 }, () => {
    const p = l.spine[Math.floor(rng() * (l.spine.length - 2))]!;
    return pt(p.x + (rng() - 0.5) * 5, p.y + (rng() - 0.5) * 5);
  });
  paintFur(d, LEG_PELT, {
    shape: l.limb,
    dir: (p) => Math.atan2(l.c.y - p.y, l.c.x - p.x),
    wet: () => {
      glaze(d, l.c.x, l.c.y, 6, 4, 0, J.pale, 0.4);
      for (const s of spots) d.pen.fill(ellipseAt(s.x, s.y, 1.2, 0.9, rng() * TAU, 8), J.dark, 0.8);
    },
    hair: (p, r) => (spots.some((s) => (p.x - s.x) ** 2 + (p.y - s.y) ** 2 < 1.4) ? J.dark : LEG_PELT.hair(p, r)),
    n: 260, len: 2.2, seed: 1041 + k, tuft: 0.9, line: 0.75,
  });
  paw(d, l, k);
}

/** The thick tail: spotted along its first half, then ringed in black, the tip black. */
export function paintTail(d: Draw, c: Jag): void {
  const { spine, shape } = c.tail;
  const n = spine.length - 1;
  const u = (p: Pt): number => along(spine, p).i / n;
  const ringed = (p: Pt): boolean => {
    const t = u(p);
    return t > 0.93 || (t > 0.55 && Math.abs(Math.sin((t - 0.55) * Math.PI * 9.5)) > 0.78);
  };
  const rng = createRng(1060);
  const spots = Array.from({ length: 12 }, () => {
    const i = Math.floor(rng() * n * 0.55);
    const p = spine[i]!;
    return pt(p.x + (rng() - 0.5) * 6, p.y + (rng() - 0.5) * 6);
  });
  const dark = (p: Pt): boolean => ringed(p) || spots.some((s) => (p.x - s.x) ** 2 + (p.y - s.y) ** 2 < 2.2);
  paintFur(d, PELT, {
    shape,
    dir: (p) => along(spine, p).ang + Math.PI,
    wet: () => {
      for (const s of spots) d.pen.fill(ellipseAt(s.x, s.y, 1.6, 1.2, rng() * TAU, 8), J.dark, 0.85);
      for (let i = Math.floor(n * 0.55); i < n; i++) {
        const p = spine[i]!;
        if (ringed(p)) d.pen.fill(ellipseAt(p.x, p.y, 5.5, 5.5, 0, 10), J.dark, 0.5);
      }
    },
    hair: (p, r) => (dark(p) ? (r < 0.85 ? J.dark : J.deep) : PELT.hair(p, r)),
    n: 520, len: 2.6, seed: 1061, tuft: 1 + c.puff * 1.6, line: 0.8,
  });
}
