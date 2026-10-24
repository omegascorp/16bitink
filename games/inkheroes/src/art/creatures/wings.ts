import { pt, type Draw } from '../kit';
import type { Pt } from '../pen';
import { gleam, lineOf, mix, paint, SHADOW } from './crownElitePaint';

/**
 * A feathered wing seen from above, built the way a bird's is: the bones
 * (shoulder, elbow, wrist, the hand's tip) carry rows of feathers laid
 * outermost first so each inner feather overlaps the next: long primaries
 * fanned off the hand, secondaries hanging from the forearm, a row of
 * greater coverts over their roots, small scalloped lesser coverts along
 * the arm, then the arm's leading edge. Each feather is washed, inked fine,
 * given its shaft and a darker tip.
 */
export interface WingSpec {
  readonly shoulder: Pt;
  readonly elbow: Pt;
  readonly wrist: Pt;
  readonly hand: Pt;
  /** Primaries: count, the fan's angles (radians, screen) from the wrist's to the tip's, and lengths. */
  readonly primaries: { readonly n: number; readonly a0: number; readonly a1: number; readonly l0: number; readonly l1: number };
  /** Secondaries: angle they hang at, count, lengths from the elbow's to the wrist's. */
  readonly secondaries: { readonly n: number; readonly a: number; readonly l0: number; readonly l1: number };
  readonly feather: string;
  /** Primary tips and the darker bars. */
  readonly tip: string;
  readonly covert: string;
  /** Behind the body: deeper in shade. */
  readonly far?: boolean;
}

const lerp = (a: Pt, b: Pt, t: number): Pt => pt(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t);

/** One feather from its root, pointing at angle `a`: a long blade, rounded-pointed at the tip. */
export function featherShape(root: Pt, a: number, len: number, w: number): Pt[] {
  const u = pt(Math.cos(a), Math.sin(a));
  const v = pt(-u.y, u.x);
  const at = (s: number, k: number): Pt => pt(root.x + u.x * len * s + v.x * w * k, root.y + u.y * len * s + v.y * w * k);
  return [at(0, -0.28), at(0.3, -0.5), at(0.68, -0.5), at(0.9, -0.34), at(1, 0), at(0.92, 0.36), at(0.6, 0.52), at(0.25, 0.46), at(0, 0.28)];
}

function feather(d: Draw, root: Pt, a: number, len: number, w: number, colour: string, tip: string, bars: boolean): void {
  const shape = featherShape(root, a, len, w);
  paint(d, shape, colour, { shadow: 0.35, hatch: 0, line: 0.4, lineAlpha: 0.85, lit: pt(0.3, 0.2) });
  const u = pt(Math.cos(a), Math.sin(a));
  const end = pt(root.x + u.x * len, root.y + u.y * len);
  d.pen.clipped(shape, () => {
    // The darker tip, and a couple of faint bars across the vane.
    const [c0, c1] = [lerp(root, end, 0.7), lerp(root, end, 1.1)];
    const [nx, ny] = [-u.y * w, u.x * w];
    d.pen.fill([pt(c0.x + nx, c0.y + ny), pt(c1.x + nx, c1.y + ny), pt(c1.x - nx, c1.y - ny), pt(c0.x - nx, c0.y - ny)], tip, 0.75);
    if (bars) {
      for (const t of [0.42, 0.58]) {
        const c = lerp(root, end, t);
        d.pen.hair([pt(c.x - u.y * w * 0.6, c.y + u.x * w * 0.6), pt(c.x + u.y * w * 0.6 + u.x, c.y - u.x * w * 0.6 + u.y)], 0.5, tip, 0.45);
      }
    }
  });
  d.pen.hair([lerp(root, end, 0.04), lerp(root, end, 0.9)], 0.3, mix(colour, '#ffffff', 0.55), 0.85);
  d.pen.hair([lerp(root, end, 0.04), lerp(root, end, 0.86)].map((p) => pt(p.x + u.y * 0.35, p.y - u.x * 0.35)), 0.22, SHADOW, 0.35);
}

/** The whole wing, back to front. */
export function wing(d: Draw, s: WingSpec): void {
  const shade = (c: string): string => (s.far ? mix(c, SHADOW, 0.3) : c);
  const [col, tip, cov] = [shade(s.feather), shade(s.tip), shade(s.covert)];
  const p = s.primaries;
  // Counts survive a blend of poses as near-integers: round them.
  const pn = Math.round(p.n);
  // Primaries: the outermost (at the hand's tip) first.
  for (let i = pn - 1; i >= 0; i--) {
    const t = pn === 1 ? 1 : i / (pn - 1);
    const root = lerp(s.wrist, s.hand, 0.15 + t * 0.85);
    feather(d, root, p.a0 + (p.a1 - p.a0) * t, p.l0 + (p.l1 - p.l0) * t, 4.2, col, tip, true);
  }
  // Secondaries off the forearm, then tertials off the upper arm: the outer first.
  const sec = s.secondaries;
  const sn = Math.round(sec.n);
  for (let i = sn - 1; i >= 0; i--) {
    const t = i / (sn - 1);
    const root = t < 0.75 ? lerp(s.elbow, s.wrist, t / 0.75) : lerp(s.elbow, s.wrist, 1);
    const r = lerp(s.shoulder, s.elbow, 0.45);
    const at = i < 2 ? lerp(r, s.elbow, i / 2) : root;
    feather(d, at, sec.a + (t - 0.5) * 0.18, sec.l0 + (sec.l1 - sec.l0) * t, 4.4, col, tip, true);
  }
  // Greater coverts over the secondaries' roots, along shoulder → wrist.
  const arm = [...lineOf([[s.shoulder.x, s.shoulder.y], [s.elbow.x, s.elbow.y], [s.wrist.x, s.wrist.y], [s.hand.x, s.hand.y]], 8)];
  const n = arm.length;
  for (let i = n - 2; i >= 1; i -= 2) {
    const a = arm[i]!;
    const ang = i / n > 0.7 ? p.a0 + 0.3 : sec.a + 0.15;
    feather(d, a, ang, (i / n > 0.7 ? 8 : 9.5) * (s.far ? 0.95 : 1), 4, cov, mix(cov, tip, 0.5), false);
  }
  // Lesser coverts: small scallops in rows along the arm, and the arm's leading edge.
  for (let i = n - 1; i >= 0; i -= 2) {
    const a = arm[i]!;
    feather(d, pt(a.x + Math.cos(sec.a) * 0.6, a.y + Math.sin(sec.a) * 0.6), sec.a + 0.4, 5.6, 4.6, cov, mix(cov, tip, 0.35), false);
  }
  const edge = arm.slice(0, Math.round(n * 0.86));
  d.pen.stroke(edge, 2.6, d.ink, 0.95, false);
  d.pen.stroke(edge, 1.6, cov, 1, false);
  if (!s.far) gleam(d, edge.slice(2, -2), 0.7, 0.6);
}
