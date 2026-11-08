import { closed, type Draw, pt, TAU } from './kit';
import { MARBLE_R } from './marbleArt';
import { PAPER_FILL } from './palette';
import type { Pt } from './pen';
import { castShadow, glaze } from './propsKit';
import { mix } from './wash';

/**
 * The twists' small pieces: the big drifting leaf that stops shots, and
 * the gilt rim on a golden marble. Local units, centred at the origin.
 */

/** The drifting leaf's frame, units (it is about 70 long), and its texture px per unit. */
export const DRIFT_LEAF_FRAME = 88;
export const DRIFT_LEAF_RES = 3;

/** Autumn colours for the drifting leaves, one per leaf. */
export const LEAF_WASHES = ['#d08a2e', '#c2552d', '#b9a03a'] as const;

const LEAF_DEEP = '#6e3a1c';
const GOLD = '#e2b13c';
const GOLD_DEEP = '#9a6b14';

/** A sycamore-like leaf's outline: five pointed lobes round a stalk at −x. */
function lobes(): Pt[] {
  const out: Pt[] = [];
  // Lobe tips: angle from the leaf's base (−x), reach; the notches between sit at a fraction of it.
  const tips = [[-1.5, 22], [-0.75, 30], [0, 34], [0.75, 30], [1.5, 22]] as const;
  const base = pt(-14, 0);
  for (let i = 0; i < tips.length; i++) {
    const [a, r] = tips[i]!;
    const tip = pt(base.x + Math.cos(a) * r, base.y + Math.sin(a) * r);
    const next = tips[i + 1];
    out.push(tip);
    if (next) {
      const m = (a + next[0]) / 2;
      const nr = Math.min(r, next[1]) * 0.55;
      // Each lobe's edge bows out a little between tip and notch.
      out.push(pt(base.x + Math.cos((a + m) / 2) * r * 0.82, base.y + Math.sin((a + m) / 2) * r * 0.82));
      out.push(pt(base.x + Math.cos(m) * nr, base.y + Math.sin(m) * nr));
      out.push(pt(base.x + Math.cos((m + next[0]) / 2) * next[1] * 0.82, base.y + Math.sin((m + next[0]) / 2) * next[1] * 0.82));
    }
  }
  out.push(pt(base.x + 2, 4), pt(base.x - 1, 0), pt(base.x + 2, -4));
  return out.map((p) => pt(p.x + 10, p.y));
}

/**
 * A big autumn leaf seen from above, drifting: lobed, washed in `wash`
 * with its veins fanning from the stalk, a curled shadow under it.
 */
export function drawDriftLeaf(d: Draw, wash: string): void {
  const { pen } = d;
  const shape = lobes();
  castShadow(d, shape, pt(5, 7), 0.16);
  pen.fill(shape, PAPER_FILL, 1);
  pen.fill(shape, wash, 0.82);
  pen.clipped(shape, () => {
    glaze(d, 8, -8, 20, 14, -0.4, PAPER_FILL, 0.35);
    glaze(d, 18, 12, 18, 12, 0.5, LEAF_DEEP, 0.3);
    pen.crescent(shape, pt(-2, -2.5), () => pen.fill(shape, mix(wash, LEAF_DEEP, 0.5), 0.4));
    pen.stipple(shape, 50, () => 0.5, 0.35, LEAF_DEEP);
  });
  // Veins fanning from where the stalk joins, one to each lobe's tip.
  const root = pt(-4, 0);
  for (const a of [-1.5, -0.75, 0, 0.75, 1.5]) {
    const r = a === 0 ? 33 : Math.abs(a) > 1 ? 21 : 29;
    const tip = pt(root.x + Math.cos(a) * r, root.y + Math.sin(a) * r);
    pen.hair([root, pt((root.x + tip.x) / 2, (root.y + tip.y) / 2 + a), tip], 0.7, LEAF_DEEP, 0.7);
    pen.hair([root, tip], 0.35, PAPER_FILL, 0.4);
  }
  pen.stroke(closed(shape), 0.9, d.ink, 0.9);
  // The stalk.
  pen.hair([pt(-4, 0), pt(-14, 2), pt(-24, 6)], 1.4, LEAF_DEEP, 0.95);
  pen.hair([pt(-4, 0), pt(-14, 2), pt(-24, 6)], 0.5, d.ink, 0.8);
}

/**
 * A golden marble's gilt: a gold rim round the marble, a warm glaze over
 * it and a pair of sparkles, drawn over the marble in its frame.
 */
export function drawGilt(d: Draw): void {
  const { pen } = d;
  const r = MARBLE_R + 1.8;
  const ring = Array.from({ length: 48 }, (_, i) => pt(Math.cos((i / 48) * TAU) * r, Math.sin((i / 48) * TAU) * r));
  glaze(d, 0, 0, MARBLE_R, MARBLE_R, 0, GOLD, 0.22);
  pen.hair(closed(ring), 3.2, GOLD_DEEP, 0.85);
  pen.hair(closed(ring), 2, GOLD, 1);
  pen.hair(ring.slice(28, 40), 0.9, PAPER_FILL, 0.85);
  pen.stroke(closed(ring.map((p) => pt(p.x * 1.09, p.y * 1.09))), 0.6, d.ink, 0.7);
  const sparkle = (c: Pt, s: number): void => {
    const star = Array.from({ length: 8 }, (_, k) => {
      const rr = k % 2 ? s * 0.26 : s;
      const b = (k / 8) * TAU;
      return pt(c.x + Math.cos(b) * rr, c.y + Math.sin(b) * rr);
    });
    pen.fill(star, PAPER_FILL, 1);
    pen.fill(star, GOLD, 0.35);
    pen.hair(closed(star), 0.4, GOLD_DEEP, 0.9);
  };
  sparkle(pt(-r * 0.72, -r * 0.72), 4.2);
  sparkle(pt(r * 0.8, r * 0.5), 2.6);
}
