import { pt, ribbon, type Draw } from '../kit';
import type { Pt } from '../pen';
import { dab, gleam, lineOf, mix, paint, SHADOW, TO_LIGHT } from './crownElitePaint';

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

/** Which side of a feather's shaft is turned from the light (upper left): +1 or −1 along its normal. */
const awaySide = (u: Pt): number => (-u.y * TO_LIGHT.x + u.x * TO_LIGHT.y > 0 ? -1 : 1);

/**
 * One feather: washed, its vane on the far side of the shaft in shade so
 * each feather reads apart from the next, a darker tip, the shaft lit.
 */
function feather(d: Draw, root: Pt, a: number, len: number, w: number, colour: string, tip: string, bars: boolean): void {
  const shape = featherShape(root, a, len, w);
  paint(d, shape, colour, { shadow: 0.45, hatch: 0, line: 0.36, lineAlpha: 0.75, lit: pt(0.3, 0.2) });
  const u = pt(Math.cos(a), Math.sin(a));
  const end = pt(root.x + u.x * len, root.y + u.y * len);
  const side = awaySide(u);
  const [nx, ny] = [-u.y * w * side, u.x * w * side];
  d.pen.clipped(shape, () => {
    // The shaded half-vane, the darker tip, a faint bar or two.
    dab(d, [root, end, pt(end.x + nx, end.y + ny), pt(root.x + nx, root.y + ny)], mix(colour, SHADOW, 0.6), 0.58, 0.25);
    const [c0, c1] = [lerp(root, end, 0.72), lerp(root, end, 1.1)];
    d.pen.fill([pt(c0.x + nx, c0.y + ny), pt(c1.x + nx, c1.y + ny), pt(c1.x - nx, c1.y - ny), pt(c0.x - nx, c0.y - ny)], tip, 0.7);
    if (bars) {
      const c = lerp(root, end, 0.5);
      d.pen.hair([pt(c.x - nx * 0.6, c.y - ny * 0.6), pt(c.x + nx * 0.6 + u.x, c.y + ny * 0.6 + u.y)], 0.4, tip, 0.3);
    }
  });
  d.pen.hair([lerp(root, end, 0.04), lerp(root, end, 0.9)], 0.26, mix(colour, '#e9dfc6', 0.5), 0.8);
}

/** The whole wing, back to front. */
export function wing(d: Draw, s: WingSpec): void {
  const shade = (c: string): string => (s.far ? mix(c, SHADOW, 0.42) : c);
  const [col, tip, cov] = [shade(s.feather), shade(s.tip), shade(s.covert)];
  const p = s.primaries;
  // Counts survive a blend of poses as near-integers: round them.
  const pn = Math.round(p.n);
  // Primaries: long and narrow, fanned off the hand; the outermost (at the hand's tip) first.
  for (let i = pn - 1; i >= 0; i--) {
    const t = pn === 1 ? 1 : i / (pn - 1);
    const root = lerp(s.wrist, s.hand, 0.1 + t * 0.9);
    feather(d, root, p.a0 + (p.a1 - p.a0) * t, (p.l0 + (p.l1 - p.l0) * t) * 1.06, 3.3, col, tip, true);
  }
  // Secondaries off the forearm, then tertials off the upper arm: the outer first.
  const sec = s.secondaries;
  const sn = Math.round(sec.n);
  for (let i = sn - 1; i >= 0; i--) {
    const t = i / (sn - 1);
    const root = t < 0.75 ? lerp(s.elbow, s.wrist, t / 0.75) : lerp(s.elbow, s.wrist, 1);
    const r = lerp(s.shoulder, s.elbow, 0.45);
    const at = i < 2 ? lerp(r, s.elbow, i / 2) : root;
    feather(d, at, sec.a + (t - 0.5) * 0.18, sec.l0 + (sec.l1 - sec.l0) * t, 5.6, col, tip, false);
  }
  // Greater coverts over the secondaries' roots, along shoulder → wrist, casting a soft shadow on them.
  const arm = [...lineOf([[s.shoulder.x, s.shoulder.y], [s.elbow.x, s.elbow.y], [s.wrist.x, s.wrist.y], [s.hand.x, s.hand.y]], 8)];
  const n = arm.length;
  const coverts: [Pt, number, number][] = [];
  for (let i = n - 2; i >= 1; i -= 2) {
    const ang = i / n > 0.7 ? p.a0 + 0.3 : sec.a + 0.15;
    coverts.push([arm[i]!, ang, (i / n > 0.7 ? 8 : 9) * (s.far ? 0.95 : 1)]);
  }
  for (const [a, ang, len] of coverts) dab(d, featherShape(pt(a.x + 0.8, a.y + 1.2), ang, len + 1.4, 4.4), SHADOW, 0.22, 1);
  for (const [a, ang, len] of coverts) feather(d, a, ang, len, 3.2, cov, mix(cov, tip, 0.45), false);
  // The marginal coverts: one smooth band of small feathers along the arm's leading edge.
  const lead = arm.slice(0, Math.round(n * 0.88));
  const band = ribbon(lead.map((q) => pt(q.x + Math.cos(sec.a) * 2.2, q.y + Math.sin(sec.a) * 2.2)), (v) => 5.2 - v * 2.6).shape;
  paint(d, band, mix(cov, SHADOW, 0.06), { shadow: 0.5, hatch: 0.12, line: 0.35, lineAlpha: 0.7 });
  d.pen.clipped(band, () => {
    for (let i = 2; i < lead.length - 2; i += 2) {
      const q = lead[i]!;
      const c = pt(q.x + Math.cos(sec.a) * 3.4, q.y + Math.sin(sec.a) * 3.4);
      d.pen.hair([pt(c.x - 1.4, c.y - 0.6), pt(c.x, c.y + 0.8), pt(c.x + 1.4, c.y - 0.4)], 0.24, mix(cov, SHADOW, 0.6), 0.5);
    }
  });
  d.pen.stroke(lead, 1.5, d.ink, 0.85, false);
  d.pen.stroke(lead, 0.9, mix(cov, '#e9dfc6', 0.25), 1, false);
  if (!s.far) gleam(d, lead.slice(2, -2), 0.6, 0.55);
}
