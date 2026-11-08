import { createRng } from '../../logic/rng';
import { polar } from '../groundKit';
import { closed, type Draw, pt } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { ellipseAt, glaze } from '../critters/preyKit';
import { mix } from '../wash';
import { digits, lit } from './barrensCrittersKit';
import { type Body, bodyAlong, bentSpine, scute } from './floodedCrittersKit';

/**
 * A caiman from above facing +x, shared by the young caiman and the black
 * caiman: one outline from the snout's tip down the long tail, the head
 * broad and flat with its eyes raised on bony orbits and a ridge (the
 * "spectacle") between them, the back armoured in rows of keeled scutes
 * (osteoderms) running into the tail's double crest and then its single
 * one, crossbands, four sprawling legs with clawed, webbed toes. Lengths
 * scale with `len`; light from the upper left.
 */
export interface CrocPaint {
  readonly base: string;
  readonly deep: string;
  readonly light: string;
  readonly band: string;
  readonly scute: string;
  readonly head: string;
  readonly jaw: string;
  readonly foot: string;
  readonly iris: string;
}

/** Where along the body (u) things are. */
export const CROC_U = { eye: 0.135, skull: 0.19, fore: 0.28, hind: 0.47, hip: 0.52 } as const;

/** Half width along the body at u, for a caiman 108 long. */
const KNOTS: readonly (readonly [number, number])[] = [[0, 0], [0.012, 3.4], [0.03, 4.5], [0.1, 5.6], [0.165, 7.5], [0.2, 6.6], [0.235, 6.4], [0.3, 10], [0.38, 11], [0.45, 9.8], [0.52, 7.2], [0.7, 4.2], [0.88, 2], [1, 0.4]];

export function crocHalf(u: number, k: number): number {
  for (let i = 1; i < KNOTS.length; i++) {
    const [u1, w1] = KNOTS[i]!;
    const [u0, w0] = KNOTS[i - 1]!;
    if (u <= u1) {
      const t = (u - u0) / (u1 - u0);
      // The snout's tip rounds off; elsewhere ease from knot to knot.
      if (i === 1) return w1 * Math.sqrt(t) * k;
      return (w0 + (w1 - w0) * (1 - Math.cos(Math.PI * t)) * 0.5) * k;
    }
  }
  return 0.4 * k;
}

/** The caiman's body: `len` long from the snout at `front`, bent sideways by bend(u). */
export function crocBody(front: Pt, len: number, bend: (u: number) => number): Body {
  const k = len / 108;
  return bodyAlong(bentSpine(front, len, bend, 40), (u) => crocHalf(u, k));
}

/** A leg: from where it roots on the body (u, side) out through the elbow to a splayed foot. */
export interface CrocLeg {
  readonly u: number;
  readonly side: 1 | -1;
  /** Elbow and foot in the body's frame at the root: x forward, y outward (board px at len 108). */
  readonly elbow: readonly [number, number];
  readonly foot: readonly [number, number];
  readonly hind: boolean;
}

/** One leg: a tapering scaly limb, banded, and the foot's toes splayed (five in front, four webbed behind). */
export function paintLeg(d: Draw, b: Body, l: CrocLeg, p: CrocPaint, k: number): Pt[] {
  const { pen } = d;
  const root = b.at(l.u, l.side * 0.75);
  const a = b.ang(l.u);
  const f = (x: number, y: number): Pt => pt(root.x + (Math.cos(a) * x - Math.sin(a) * y * l.side) * k, root.y + (Math.sin(a) * x + Math.cos(a) * y * l.side) * k);
  const elbow = f(l.elbow[0], l.elbow[1]);
  const foot = f(l.foot[0], l.foot[1]);
  const w0 = (l.hind ? 5.6 : 4.4) * k;
  const w1 = (l.hind ? 3 : 2.5) * k;
  const seg = (s: Pt, e: Pt, ws: number, we: number): Pt[] => {
    const ang = Math.atan2(e.y - s.y, e.x - s.x);
    const n = pt(-Math.sin(ang), Math.cos(ang));
    return [pt(s.x + n.x * ws / 2, s.y + n.y * ws / 2), pt(e.x + n.x * we / 2, e.y + n.y * we / 2), ...Array.from({ length: 6 }, (_, i) => polar(e, ang + Math.PI / 2 - ((i + 1) / 7) * Math.PI, we / 2)), pt(e.x - n.x * we / 2, e.y - n.y * we / 2), pt(s.x - n.x * ws / 2, s.y - n.y * ws / 2)];
  };
  const upper = seg(root, elbow, w0, (w0 + w1) / 2);
  const lower = seg(elbow, foot, (w0 + w1) / 2, w1);
  const fa = Math.atan2(foot.y - elbow.y, foot.x - elbow.x);
  const toes = l.hind ? [3.2, 4, 4.2, 3.6] : [2.2, 3, 3.4, 3, 2.2];
  digits(d, foot, fa, l.hind ? 1.3 : 1.9, toes.map((t) => t * k), (l.hind ? 1.1 : 0.9) * k, p.foot, p.deep, '#d8d2b8', 0.3);
  if (l.hind) {
    // The webbing between the hind toes.
    const tips = [-1, 1].map((s) => polar(foot, fa + s * 0.62, 3 * k));
    pen.fill([foot, tips[0]!, polar(foot, fa, 2.6 * k), tips[1]!], p.foot, 0.55);
  }
  for (const s of [lower, upper]) {
    pen.fill(s, PAPER_FILL, 1);
    pen.fill(s, p.base, 0.92);
    pen.clipped(s, () => {
      pen.crescent(s, pt(-0.7 * k, -1 * k), () => pen.fill(s, p.deep, 0.5));
      const rng = createRng(Math.round(root.x * 13 + root.y * 7));
      for (let i = 0; i < 18; i++) {
        const q = pt(s[0]!.x + (s[1]!.x - s[0]!.x) * rng() + (rng() - 0.5) * w0, s[0]!.y + (s[1]!.y - s[0]!.y) * rng() + (rng() - 0.5) * w0);
        pen.dot(q.x, q.y, 0.45 * k, rng() < 0.5 ? p.band : lit(p.base, 0.4), 0.6);
      }
    });
    pen.stroke(closed(s), 0.45 * k, d.ink, 0.9, false);
  }
  return [...upper, ...lower];
}

/** Dark crossbands over the back and tail, like a juvenile's (faint on an adult), clipped to the body. */
function bands(d: Draw, b: Body, p: CrocPaint, alpha: number): void {
  const at = [0.3, 0.37, 0.44, 0.55, 0.62, 0.69, 0.76, 0.83, 0.9, 0.96];
  for (const u of at) {
    const w = 0.025;
    const shape = [b.at(u - w, -1.2), b.at(u - w * 0.4, -0.3), b.at(u - w * 1.2, 0.4), b.at(u - w, 1.2), b.at(u + w, 1.2), b.at(u + w * 0.6, 0.3), b.at(u + w * 1.3, -0.4), b.at(u + w, -1.2)];
    d.pen.fill(shape, p.band, alpha);
  }
}

/** The armour: rows of keeled scutes over the back, two pairs on the neck, the tail's double crest running into a single one. */
function armour(d: Draw, b: Body, p: CrocPaint, k: number): void {
  const rng = createRng(7731);
  const tone = (): string => (rng() < 0.3 ? mix(p.scute, p.deep, 0.35) : rng() < 0.5 ? lit(p.scute, 0.25) : p.scute);
  const du = 0.0095;
  scute(d, b, 0.215, -0.28, du * 1.2, 0.2, tone(), p.deep, true);
  scute(d, b, 0.215, 0.28, du * 1.2, 0.2, tone(), p.deep, true);
  for (let u = 0.255; u < 0.5; u += 0.024) {
    const cols = u < 0.3 || u > 0.47 ? [-0.32, -0.1, 0.1, 0.32] : [-0.62, -0.4, -0.14, 0.14, 0.4, 0.62];
    for (const v of cols) scute(d, b, u + (rng() - 0.5) * 0.004, v + (rng() - 0.5) * 0.03, du * (0.85 + rng() * 0.3), Math.abs(v) > 0.5 ? 0.08 : 0.09, tone(), p.deep, true);
  }
  for (let u = 0.51; u < 0.985; u += 0.019) {
    if (u < 0.78) for (const v of [-0.38, 0.38]) scute(d, b, u, v, du * 0.9, 0.15, tone(), p.deep, true);
    else scute(d, b, u, 0, du * 0.85, 0.3, tone(), p.deep, true);
  }
  // Small round scales over the flanks and tail sides.
  for (let i = 0; i < 300; i++) {
    const u = 0.2 + rng() * 0.78;
    const v = (rng() < 0.5 ? -1 : 1) * (0.5 + rng() * 0.45);
    const q = b.at(u, v);
    d.pen.hair(ellipseAt(q.x, q.y, 0.7 * k, 0.6 * k, b.ang(u), 6).slice(0, 4), 0.2 * k, p.deep, 0.45);
  }
  // Wet glints along the back, where the light catches the water on the scutes.
  for (let i = 0; i < 26; i++) {
    const u = 0.22 + rng() * 0.7;
    const q = b.at(u, -0.15 - rng() * 0.6);
    const a = b.ang(u);
    d.pen.hair([q, polar(q, a, (0.8 + rng() * 1.6) * k)], 0.45 * k, PAPER_FILL, 0.55 + rng() * 0.3);
  }
}

/** The head's marks on the outline's front: bony eye orbits, the spectacle ridge, the nostrils' disc, the jaw line and a few teeth. */
export function crocHead(d: Draw, b: Body, p: CrocPaint, k: number, o: { teeth?: boolean } = {}): void {
  const { pen } = d;
  const head = [...Array.from({ length: 16 }, (_, i) => b.at((i / 15) * CROC_U.skull, 1.02)), ...Array.from({ length: 16 }, (_, i) => b.at(CROC_U.skull - (i / 15) * CROC_U.skull, -1.02))];
  pen.clipped(head, () => {
    pen.fill(head, p.head, 0.55);
    const s = b.at(0.06, 0);
    glaze(d, s.x, s.y, 7 * k, 3 * k, b.ang(0.06), lit(p.head, 0.3), 0.4);
    // The pale lips and the jaw line where the upper jaw closes over the lower.
    for (const side of [-1, 1]) {
      pen.hair(Array.from({ length: 10 }, (_, i) => b.at(0.02 + i * 0.016, side * 0.84)), 1.1 * k, p.jaw, 0.75);
      pen.hair(Array.from({ length: 10 }, (_, i) => b.at(0.02 + i * 0.017, side * 0.93)), 0.4 * k, d.ink, 0.85);
    }
    // Pits and rugosity over the snout.
    const rng = createRng(7751);
    for (let i = 0; i < 40; i++) {
      const q = b.at(0.02 + rng() * 0.14, -0.7 + rng() * 1.4);
      pen.dot(q.x, q.y, 0.3 * k, p.deep, 0.5);
    }
    // The spectacle: a bony ridge across the head in front of the eyes.
    pen.hair([b.at(CROC_U.eye - 0.03, -0.55), b.at(CROC_U.eye - 0.042, 0), b.at(CROC_U.eye - 0.03, 0.55)], 0.9 * k, p.deep, 0.65);
    pen.hair([b.at(CROC_U.eye - 0.026, -0.5), b.at(CROC_U.eye - 0.038, 0), b.at(CROC_U.eye - 0.026, 0.5)], 0.45 * k, lit(p.head, 0.5), 0.6);
    // The skull table behind the eyes.
    pen.hair([b.at(CROC_U.eye + 0.035, -0.45), b.at(CROC_U.eye + 0.04, 0.45)], 0.4 * k, p.deep, 0.5);
  });
  if (o.teeth) {
    for (const side of [-1, 1]) {
      for (let i = 0; i < 7; i++) {
        const u = 0.025 + i * 0.019;
        const q = b.at(u, side * 1.02);
        const out = b.ang(u) + side * Math.PI / 2 + Math.PI * 0.12 * side;
        pen.fill([polar(q, out + Math.PI / 2, 0.45 * k), polar(q, out, 1.1 * k), polar(q, out - Math.PI / 2, 0.45 * k)], '#f3ecd6', 0.95);
      }
    }
  }
  crocEyes(d, b, p, k);
  // The nostrils on their raised disc at the snout's tip.
  const n = b.at(0.022, 0);
  const disc = ellipseAt(n.x, n.y, 1.9 * k, 2.3 * k, b.ang(0.022), 14);
  pen.fill(disc, p.head, 0.9);
  pen.clipped(disc, () => pen.crescent(disc, pt(-0.4 * k, -0.6 * k), () => pen.fill(disc, p.deep, 0.5)));
  for (const s of [-1, 1]) pen.fill(ellipseAt(b.at(0.022, s * 0.32).x, b.at(0.022, s * 0.32).y, 0.75 * k, 0.4 * k, b.ang(0.022) + s * 0.5, 8), '#151316', 0.95);
  pen.stroke(closed(disc), 0.3 * k, d.ink, 0.8, false);
}

/** The eyes on their raised bony orbits: golden-green irises, slit pupils, heavy upper lids. */
export function crocEyes(d: Draw, b: Body, p: CrocPaint, k: number, shut = false): void {
  const { pen } = d;
  for (const side of [-1, 1]) {
    const e = b.at(CROC_U.eye, side * 0.52);
    const orbit = ellipseAt(e.x, e.y, 2.6 * k, 2 * k, b.ang(CROC_U.eye), 16);
    pen.fill(orbit.map((q) => pt(q.x + 0.5 * k, q.y + 0.8 * k)), d.ink, 0.35);
    pen.fill(orbit, p.head, 1);
    pen.clipped(orbit, () => pen.crescent(orbit, pt(-0.5 * k, -0.7 * k), () => pen.fill(orbit, p.deep, 0.5)));
    pen.stroke(closed(orbit), 0.4 * k, d.ink, 0.9, false);
    if (shut) {
      pen.hair([polar(e, b.ang(CROC_U.eye) + Math.PI, 1.4 * k), polar(e, b.ang(CROC_U.eye), 1.4 * k)], 0.5 * k, d.ink, 0.9);
      continue;
    }
    const ball = ellipseAt(e.x + Math.cos(b.ang(CROC_U.eye)) * 0.2 * k, e.y + side * 0.25 * k, 1.5 * k, 1.1 * k, b.ang(CROC_U.eye), 14);
    pen.fill(ball, p.iris, 1);
    pen.fill(ellipseAt(e.x, e.y + side * 0.25 * k, 0.28 * k, 1 * k, b.ang(CROC_U.eye), 10), '#0f0e10', 1);
    pen.dot(e.x - 0.4 * k, e.y - 0.4 * k + side * 0.2 * k, 0.28 * k, PAPER_FILL, 0.9);
    pen.hair(ball.slice(9, 15), 0.45 * k, p.deep, 0.8);
  }
}

/** Paints the whole body: legs underneath, the washes and bands, the armour, the head, the modelling and the contour. */
export function paintCroc(d: Draw, b: Body, p: CrocPaint, legs: readonly CrocLeg[], k: number, o: { bands?: number; teeth?: boolean } = {}): void {
  const { pen } = d;
  for (const l of legs) paintLeg(d, b, l, p, k);
  const s = b.shape;
  pen.fill(s, PAPER_FILL, 1);
  pen.fill(s, p.base, 0.92);
  pen.clipped(s, () => {
    const m = b.at(0.4, -0.3);
    glaze(d, m.x, m.y, 22 * k, 7 * k, b.ang(0.4), p.light, 0.35);
    const t = b.at(0.7, 0);
    glaze(d, t.x, t.y, 20 * k, 3 * k, b.ang(0.7), p.light, 0.3);
    const rng = createRng(7761);
    for (let i = 0; i < 14; i++) {
      const u = 0.05 + rng() * 0.9;
      const q = b.at(u, (rng() - 0.5) * 1.6);
      glaze(d, q.x, q.y, (4 + rng() * 6) * k, (2 + rng() * 3) * k, b.ang(u), rng() < 0.5 ? p.light : p.deep, 0.25);
    }
    bands(d, b, p, o.bands ?? 0.5);
    armour(d, b, p, k);
    pen.crescent(s, pt(-1.4 * k, -2 * k), () => pen.fill(s, p.deep, 0.42));
    pen.crescent(s, pt(-0.6 * k, -0.9 * k), () => pen.hatch(s, 1.6 * k, 0.9, 0.3 * k, { color: d.ink, alpha: 0.3 }));
    pen.crescent(s, pt(1 * k, 1.4 * k), () => pen.fill(s, PAPER_FILL, 0.12));
  });
  crocHead(d, b, p, k, o.teeth ? { teeth: true } : {});
  pen.stroke(closed(s), 0.7 * k, d.ink, 0.95);
}
