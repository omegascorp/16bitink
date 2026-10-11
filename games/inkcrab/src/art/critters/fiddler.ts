import { bezier, capsule, closed, cub, type Draw, edge, mottle, oval, pt, shade, skin, TAU, tint, tube } from '../kit';
import type { Pt } from '../pen';
import { PAPER_FILL } from '../palette';
import { limb } from './limb';

/**
 * A male fiddler crab (Austruca) on the mudflat, side-on and facing right:
 * a small, square, turquoise carapace marbled grey-brown, two long eyestalks
 * held straight up, one tiny feeding claw and one enormous one, its palm
 * orange fading to white fingers, and thin walking legs.
 */
const SHELL = '#6aa8b4';
const DARK = '#34616c';
const FLANK = '#a2967c';
const LEG = '#a48a72';
const PALM = '#e9a262';
const FINGER = '#f3e7d2';

/** Four thin walking legs a side, splayed low, stepping in alternate pairs. */
function legs(d: Draw, bottom: number, far: boolean): void {
  [-44, -33, 18, 29].forEach((dx, i) => {
    const ph = -d.f * (TAU / 3) + (i % 2) * Math.PI + (far ? Math.PI / 2 : 0);
    const step = Math.cos(ph) * 3;
    const lift = Math.max(0, Math.sin(ph)) * 3.5;
    const hip = pt(dx * 0.3 + (far ? -3 : 0), bottom - 3 + (far ? -2.5 : 0));
    const foot = pt(dx + step + (far ? -3 : 0), d.g - lift * 0.4 - (far ? 2 : 0));
    const reach = foot.x - hip.x;
    const knee = pt(hip.x + reach * 0.48, bottom - 7 - lift);
    const ankle = pt(hip.x + reach * 0.86, d.g - 7 - lift * 0.6);
    limb(d, [hip, knee, ankle, pt(foot.x + Math.sign(reach) * 1.2, foot.y)], { widths: [4.2, 3.4, 2.4, 0.5], wash: LEG, hairs: far ? 0 : 2, far });
  });
}

/** The little feeding claw, held down at the mouth, picking at the mud. */
function minor(d: Draw, x: number, y: number): void {
  const { pen } = d;
  const arm = capsule(pt(x, y), pt(x + 4, y + 4), 3, 2.6);
  const hand = capsule(pt(x + 4, y + 4), pt(x + 7.5, y + 6.5), 2.8, 1.2);
  for (const part of [arm, hand]) {
    pen.fill(part, PAPER_FILL, 1);
    pen.fill(part, LEG, 0.85);
    pen.fill(part, d.ink, 0.12);
    pen.stroke(closed(part), 0.7, d.ink, 0.6, false);
  }
}

/**
 * The great claw (major cheliped), raised in front of the face: an arm up to
 * the wrist, then a deep palm and two long fingers bowed apart with a gape
 * between, beaded along the cutting edges, tilted down by `tilt`. The hand
 * is drawn in its own coordinates (x along it from the wrist) and turned.
 */
function major(d: Draw, root: Pt, wrist: Pt, tilt: number, s: number): void {
  const { pen } = d;
  const [c, n] = [Math.cos(tilt) * s, Math.sin(tilt) * s];
  const at = (q: Pt): Pt => pt(wrist.x + q.x * c - q.y * n, wrist.y + q.x * n + q.y * c);
  const P = (lx: number, ly: number): Pt => at(pt(lx, ly));
  const map = (pts: readonly Pt[]): Pt[] => pts.map(at);
  const arm = capsule(root, wrist, 6, 5.2 * s);
  const carpus = map(oval(1, 0, 4.6, 4.2, 12));
  const palm = map([
    ...cub(pt(3, 6), pt(1.5, -6), pt(6, -10.5), pt(12, -10.5), 10),
    ...cub(pt(12, -10.5), pt(18, -10.5), pt(23, -8), pt(23.5, -3), 8).slice(1),
    ...cub(pt(23.5, -3), pt(24, 3), pt(22, 8.5), pt(16, 9), 8).slice(1),
    ...cub(pt(16, 9), pt(10, 9.5), pt(4, 9), pt(3, 6), 6).slice(1),
  ]);
  const fixedSpine = bezier(pt(21, 5), pt(31, 7.5), pt(40, 3), 10);
  const movingSpine = bezier(pt(21.5, -6), pt(33, -7.5), pt(40.5, 2), 10);
  const fixed = map(tube(fixedSpine, 6.5, 1.3));
  const moving = map(tube(movingSpine, 5.6, 1.3));
  for (const part of [arm, carpus]) {
    pen.fill(part, PAPER_FILL, 1);
    pen.fill(part, PALM, 0.75);
  }
  for (const f of [fixed, moving]) {
    pen.fill(f, PAPER_FILL, 1);
    pen.fill(f, FINGER, 0.9);
    pen.clipped(f, () => tint(d, map(oval(21, 0, 8, 12, 14)), PALM, 0.45));
  }
  skin(d, palm, PALM, 0.8);
  pen.clipped(palm, () => {
    // Paler towards the fingers, a sheen along the top edge.
    tint(d, map(oval(25, 0, 8, 12, 14)), FINGER, 0.6);
    tint(d, map(oval(11, -8, 7, 2, 12)), PAPER_FILL, 0.45);
  });
  // Granules over the outer face of the palm.
  for (let i = 0; i < 20; i++) {
    const g = P(6 + pen.rng() * 14, -7 + pen.rng() * 13);
    pen.dot(g.x + 0.3, g.y + 0.3, 0.45 * s, d.ink, 0.35);
    pen.dot(g.x, g.y, 0.3 * s, PAPER_FILL, 0.8);
  }
  shade(d, palm, 0.42);
  // Beads (tubercles) along both cutting edges, facing into the gape.
  for (let k = 2; k < 9; k++) {
    const a = fixedSpine[k]!;
    const b = movingSpine[k]!;
    const wa = (6.5 + (1.3 - 6.5) * (k / 10)) / 2;
    const wb = (5.6 + (1.3 - 5.6) * (k / 10)) / 2;
    const ta = P(a.x, a.y - wa + 0.5);
    const tb = P(b.x, b.y + wb - 0.5);
    pen.dot(ta.x, ta.y, 0.55 * s, d.ink, 0.75);
    if (k % 2 === 0) pen.dot(tb.x, tb.y, 0.45 * s, d.ink, 0.6);
  }
  for (const part of [arm, carpus, fixed, moving, palm]) pen.stroke(closed(part), 1, d.ink, 1, false);
}

/** A long eyestalk standing straight up, a small dark eye at its tip. */
function eye(d: Draw, base: Pt, tip: Pt, far: boolean): void {
  const { pen } = d;
  const stalk = capsule(base, pt(tip.x, tip.y + 3), 2.4, 2);
  pen.fill(stalk, PAPER_FILL, 1);
  pen.fill(stalk, SHELL, far ? 0.85 : 0.65);
  if (far) pen.fill(stalk, d.ink, 0.12);
  pen.stroke(closed(stalk), far ? 0.6 : 0.8, d.ink, far ? 0.55 : 0.95, false);
  const cornea = oval(tip.x, tip.y + 1, 2.2, 3, 10);
  pen.fill(cornea, d.ink, far ? 0.6 : 0.9);
  if (!far) pen.dot(tip.x + 0.7, tip.y, 0.6, PAPER_FILL, 0.95);
}

export function fiddler(d: Draw): void {
  const { pen } = d;
  pen.fill(oval(2, d.g - 1, 40, 3, 24), d.ink, 0.1);
  const top = d.g - 38;
  const bottom = d.g - 20;
  legs(d, bottom, true);
  eye(d, pt(11, top + 1), pt(10, top - 18), true);
  minor(d, 15, bottom - 3);
  // Small and square: a rounded back, a flat top, a tall straight front.
  const shape = [
    ...cub(pt(-20, bottom), pt(-27, bottom - 4), pt(-27, top + 6), pt(-19, top + 2), 8),
    ...cub(pt(-19, top + 2), pt(-8, top - 1), pt(6, top - 1.5), pt(17, top), 10).slice(1),
    pt(20, top + 1.5),
    ...cub(pt(20, top + 1.5), pt(23, top + 6), pt(23, bottom - 4), pt(19.5, bottom), 8).slice(1),
    ...cub(pt(19.5, bottom), pt(8, bottom + 2.5), pt(-8, bottom + 2.5), pt(-20, bottom), 10).slice(1),
  ];
  skin(d, shape, SHELL, 0.82);
  pen.clipped(shape, () => {
    // Grey-brown flank under the side edge, then a marbling of dark and pale blotches over the back.
    const margin = cub(pt(-28, top + 8), pt(-8, top + 10), pt(8, top + 10), pt(24, top + 7), 12);
    tint(d, [...margin, pt(34, d.g), pt(-34, d.g)], FLANK, 0.45);
    for (let i = 0; i < 12; i++) {
      const bx = -21 + pen.rng() * 40;
      const by = top + 1 + pen.rng() * 10;
      tint(d, oval(bx, by, 1.6 + pen.rng() * 2.2, 1 + pen.rng() * 1.2, 10), i % 3 === 0 ? PAPER_FILL : DARK, i % 3 === 0 ? 0.45 : 0.35);
    }
    pen.hair(margin, 0.65, d.ink, 0.5);
  });
  mottle(d, shape, 80, top, bottom, DARK, 0.5);
  shade(d, shape, 0.42);
  // The H-groove on the back and the hatched underside.
  pen.hair(bezier(pt(-9, top + 1), pt(-3, top + 6), pt(4, top + 1.5), 8), 0.6, d.ink, 0.55);
  pen.clipped(shape, () => pen.hatch([pt(-34, bottom - 3), pt(30, bottom - 3), pt(30, bottom + 4), pt(-34, bottom + 4)], 1.8, 0.35, 0.45, { color: d.ink, alpha: 0.4 }));
  edge(d, shape, 1.3);
  eye(d, pt(17, top + 1), pt(18, top - 20), false);
  legs(d, bottom, false);
  major(d, pt(14, bottom - 2), pt(24, top + 6), 0.42, 0.92);
}
