import { bezier, type Draw, oval, pt, tube } from '../kit';
import type { Pt } from '../pen';
import { PAPER_FILL } from '../palette';
import { edges, FAR } from './common';

/**
 * Things along the near shore of a coral island: screwpines on their stilt
 * roots, a beached outrigger, a palm-leaf parasol with loungers, driftwood,
 * sprouting coconuts, shells, crab holes and ripple marks in the sand.
 */
const BARK = '#b9a27a';
const BLADE = '#79a35f';
const FRUIT = '#d9a54a';
const WOOD = '#b98e62';
const THATCH = '#d9b877';

/** A screwpine (pandanus): a leaning, forking trunk on a cone of stilt roots, with spiky leaf tufts and a pineapple-like fruit. */
export function pandanus(t: Draw, x: number, ground: number, h: number, lean: number): void {
  const { pen } = t;
  const fork = pt(x + lean * h * 0.55, ground - h * 0.6);
  const trunk = tube(bezier(pt(x, ground - h * 0.18), pt(x + lean * h * 0.2, ground - h * 0.4), fork, 10), 8.5, 5.5);
  // Stilt roots, fanning from the lower trunk into the sand.
  for (let k = -3; k <= 3; k++) {
    const from = pt(x + lean * 4 + k * 0.6, ground - h * 0.18 - Math.abs(k) * 2);
    const to = pt(x + k * 5 + pen.jitter(1), ground + 1);
    pen.stroke(bezier(from, pt((from.x + to.x) / 2 + k, from.y + 4), to, 6), 1.2, t.ink, FAR * 0.85, false);
  }
  pen.fill(trunk, PAPER_FILL, 1);
  pen.fill(trunk, BARK, 0.6);
  for (let k = 1; k < 10; k++) {
    const p = trunk[k]!;
    const q = trunk[trunk.length - 1 - k]!;
    pen.hair([p, q], 0.45, t.ink, FAR * 0.6);
  }
  pen.stroke(edges(trunk), 0.9, t.ink, FAR, false);
  // Two branches, each ending in a tuft.
  for (const [dx, dy] of [[-h * 0.22, -h * 0.28], [h * 0.25, -h * 0.22]] as const) {
    const tip = pt(fork.x + dx, fork.y + dy);
    const branch = tube(bezier(fork, pt(fork.x + dx * 0.3, fork.y + dy * 0.7), tip, 8), 5, 3);
    pen.fill(branch, PAPER_FILL, 1);
    pen.fill(branch, BARK, 0.6);
    pen.stroke(edges(branch), 0.8, t.ink, FAR, false);
    tuft(t, tip, h * 0.36);
  }
  // The fruit, hanging under the right-hand tuft.
  const fx = fork.x + h * 0.25 + 3;
  const fy = fork.y - h * 0.22 + 9;
  const fruit = oval(fx, fy, 4.5, 5.5, 14);
  pen.fill(fruit, PAPER_FILL, 1);
  pen.fill(fruit, FRUIT, 0.65);
  pen.clipped(fruit, () => {
    pen.hatch(fruit, 2.2, 0.8, 0.4, { color: t.ink, alpha: FAR * 0.7 });
    pen.hatch(fruit, 2.2, -0.8, 0.4, { color: t.ink, alpha: FAR * 0.7 });
  });
  pen.stroke(edges(fruit), 0.7, t.ink, FAR, false);
}

/** A spray of long, sword-shaped leaves, the outer ones bending down under their weight. */
function tuft(t: Draw, at: Pt, len: number): void {
  const { pen } = t;
  for (let k = 0; k < 14; k++) {
    const a = -Math.PI * 1.08 + (k / 13) * Math.PI * 1.16 + pen.jitter(0.12);
    const l = len * (0.7 + pen.rng() * 0.4);
    const out = pt(Math.cos(a), Math.sin(a));
    const droop = l * 0.5 * Math.abs(out.x) ** 1.5;
    const spine = bezier(at, pt(at.x + out.x * l * 0.55, at.y + out.y * l * 0.55 - 2), pt(at.x + out.x * l, at.y + out.y * l * 0.8 + droop), 8);
    const blade = tube(spine, 3.4, 0.3);
    pen.fill(blade, BLADE, 0.55);
    pen.hair(spine, 0.55, t.ink, FAR * 0.85);
    pen.hair(blade.slice(0, blade.length / 2), 0.35, t.ink, FAR * 0.5);
  }
}

/** A dugout canoe hauled up on the sand, its outrigger float on two booms. Faces right. */
export function canoe(t: Draw, x: number, ground: number, s: number): void {
  const { pen } = t;
  const float = tube(bezier(pt(x - 16 * s, ground - 7 * s), pt(x, ground - 8.5 * s), pt(x + 16 * s, ground - 7 * s), 8), 2.6 * s, 2.2 * s);
  pen.fill(float, PAPER_FILL, 1);
  pen.fill(float, WOOD, 0.45);
  pen.stroke(edges(float), 0.6, t.ink, FAR * 0.8, false);
  const hull = [
    ...bezier(pt(x - 27 * s, ground - 6 * s), pt(x, ground - 3 * s), pt(x + 27 * s, ground - 7 * s), 12),
    ...bezier(pt(x + 27 * s, ground - 7 * s), pt(x + 18 * s, ground + 0.5), pt(x, ground + 0.5), 8).slice(1),
    ...bezier(pt(x, ground + 0.5), pt(x - 18 * s, ground + 0.5), pt(x - 27 * s, ground - 6 * s), 8).slice(1),
  ];
  pen.fill(hull, PAPER_FILL, 1);
  pen.fill(hull, WOOD, 0.6);
  pen.clipped(hull, () => pen.hatch(hull, 1.8, 0.25, 0.4, { color: t.ink, alpha: FAR * 0.5, onlyBelow: ground - 2.5 * s }));
  pen.hair(bezier(pt(x - 24 * s, ground - 4 * s), pt(x, ground - 1.5 * s), pt(x + 24 * s, ground - 5 * s), 10), 0.6, '#3c7a8c', 0.55);
  pen.stroke(edges(hull), 0.9, t.ink, FAR * 1.1, false);
  // Booms lashed across the gunwale, and a paddle leaning on it.
  for (const bx of [-9, 9]) pen.stroke([pt(x + bx * s, ground - 4 * s), pt(x + (bx - 2) * s, ground - 9 * s)], 1, t.ink, FAR, false);
  pen.stroke([pt(x + 14 * s, ground - 4 * s), pt(x + 22 * s, ground - 15 * s)], 0.8, t.ink, FAR, false);
  const blade = oval(x + 23.5 * s, ground - 17 * s, 1.6 * s, 3 * s, 10);
  pen.fill(blade, WOOD, 0.6);
  pen.hair(edges(blade), 0.5, t.ink, FAR);
}

/** A palm-leaf parasol over two wooden loungers. */
export function parasol(t: Draw, x: number, ground: number, s: number): void {
  const { pen } = t;
  for (const lx of [-13, 7]) {
    const bed = [pt(x + lx * s, ground - 4 * s), pt(x + (lx + 9) * s, ground - 4 * s), pt(x + (lx + 13) * s, ground - 9 * s)];
    pen.stroke(bed, 1.4, t.ink, FAR, false);
    pen.hair(bed.map((p) => pt(p.x, p.y + 0.8)), 0.8, WOOD, 0.8);
    for (const fx of [lx + 1, lx + 9]) pen.hair([pt(x + fx * s, ground - 4 * s), pt(x + fx * s, ground)], 0.6, t.ink, FAR);
    const towel = [pt(x + (lx + 1) * s, ground - 4.6 * s), pt(x + (lx + 8.5) * s, ground - 4.6 * s), pt(x + (lx + 8.5) * s, ground - 3.4 * s), pt(x + (lx + 1) * s, ground - 3.4 * s)];
    pen.fill(towel, lx < 0 ? '#e3907a' : '#7fc4cf', 0.6);
  }
  pen.stroke([pt(x + 1 * s, ground + 1), pt(x, ground - 26 * s)], 1.1, t.ink, FAR, false);
  const roof = [pt(x - 18 * s, ground - 20 * s), ...bezier(pt(x - 18 * s, ground - 20 * s), pt(x - 8 * s, ground - 27 * s), pt(x, ground - 30 * s), 6).slice(1), ...bezier(pt(x, ground - 30 * s), pt(x + 8 * s, ground - 27 * s), pt(x + 18 * s, ground - 20 * s), 6).slice(1)];
  pen.fill(roof, PAPER_FILL, 1);
  pen.fill(roof, THATCH, 0.7);
  pen.clipped(roof, () => {
    for (let k = 0; k <= 12; k++) pen.hair([pt(x, ground - 30 * s), pt(x - 18 * s + 3 * s * k, ground - 19 * s)], 0.4, t.ink, FAR * 0.55);
  });
  pen.stroke(edges(roof), 0.9, t.ink, FAR, false);
  const fringe: Pt[] = [];
  for (let k = 0; k <= 12; k++) fringe.push(pt(x - 18 * s + 3 * s * k, ground - (k % 2 ? 18.4 : 20) * s));
  pen.hair(fringe, 0.5, t.ink, FAR * 0.8);
}

/** A bleached log of driftwood, its grain drawn along its length, a knot and a snapped branch. */
export function driftwood(t: Draw, x: number, ground: number, len: number): void {
  const { pen } = t;
  const spine = bezier(pt(x - len / 2, ground - 2), pt(x, ground - 5), pt(x + len / 2, ground - 1.5), 12);
  const log = tube(spine, 5, 3.2);
  pen.fill(log, PAPER_FILL, 1);
  pen.fill(log, '#d8cdb4', 0.7);
  pen.clipped(log, () => {
    for (const off of [-1.2, 0, 1.3]) pen.hair(spine.map((p) => pt(p.x, p.y + off + pen.jitter(0.2))), 0.4, t.ink, FAR * 0.55);
  });
  pen.hair(oval(x + len * 0.15, ground - 3.6, 1.6, 1, 8).concat(oval(x + len * 0.15, ground - 3.6, 1.6, 1, 8)[0]!), 0.5, t.ink, FAR * 0.8);
  pen.stroke(edges(log), 0.8, t.ink, FAR, false);
  pen.stroke([pt(x - len * 0.2, ground - 5), pt(x - len * 0.28, ground - 10)], 1, t.ink, FAR, false);
}

/** A coconut taking root: the husk on its side with a fan of first leaves. */
export function sprout(t: Draw, x: number, ground: number): void {
  const { pen } = t;
  const nut = oval(x, ground - 2.8, 4.2, 3.2, 12);
  pen.fill(nut, PAPER_FILL, 1);
  pen.fill(nut, '#b08a58', 0.6);
  pen.stroke(edges(nut), 0.7, t.ink, FAR, false);
  for (const [dx, h] of [[-3, 10], [0, 14], [3, 11]] as const) {
    const blade = tube(bezier(pt(x + 1, ground - 5), pt(x + dx * 0.6, ground - h * 0.6), pt(x + dx * 1.6, ground - h), 6), 2.2, 0.3);
    pen.fill(blade, BLADE, 0.6);
    pen.hair(edges(blade), 0.4, t.ink, FAR * 0.8);
  }
}

/** Small finds in the sand: cowries, a cone shell and coral fragments. */
export function shells(t: Draw, x0: number, x1: number, top: (x: number) => number): void {
  const { pen } = t;
  for (let x = x0; x < x1; x += 22 + pen.rng() * 40) {
    const y = top(x) + 5 + pen.rng() * 9;
    const kind = Math.floor(pen.rng() * 3);
    if (kind === 0) {
      const c = oval(x, y, 2, 1.3, 10);
      pen.fill(c, '#e9d4b0', 0.9);
      pen.hair(edges(c), 0.45, t.ink, FAR);
      pen.hair([pt(x - 1.3, y), pt(x + 1.3, y)], 0.35, t.ink, FAR * 0.8);
    } else if (kind === 1) {
      const cone = [pt(x - 2.5, y + 0.6), pt(x + 2.5, y), pt(x - 2.2, y - 1.5)];
      pen.fill(cone, '#e3b88a', 0.8);
      pen.hair(edges(cone), 0.45, t.ink, FAR);
    } else {
      pen.hair([pt(x - 2, y), pt(x, y - 1.5), pt(x + 1.5, y - 0.3)], 0.8, '#e6a59a', 0.7);
      pen.hair([pt(x, y - 1.5), pt(x + 0.5, y - 3)], 0.7, '#e6a59a', 0.7);
    }
  }
}

/** Ghost-crab holes, each with a fan of thrown-out sand, and ripple marks left by the wind. */
export function sandMarks(t: Draw, x0: number, x1: number, top: (x: number) => number): void {
  const { pen } = t;
  for (let x = x0 + 30; x < x1; x += 80 + pen.rng() * 90) {
    const y = top(x) + 9 + pen.rng() * 4;
    pen.fill(oval(x, y, 2.2, 1, 10), t.ink, FAR * 0.7);
    for (let k = 0; k < 7; k++) pen.dot(x + 3 + pen.rng() * 5, y - 0.5 + pen.jitter(1), 0.45, '#9c8a62', 0.8);
  }
  for (let x = x0; x < x1; x += 14 + pen.rng() * 20) {
    const y = top(x) + 13 + pen.rng() * 6;
    pen.hair(bezier(pt(x, y), pt(x + 3, y - 1), pt(x + 7, y), 4), 0.45, t.ink, FAR * 0.4);
  }
}
