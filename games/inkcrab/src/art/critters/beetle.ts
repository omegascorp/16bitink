import { bezier, closed, cub, type Draw, edge, oval, pt, shade, skin, TAU, tint, tube } from '../kit';
import type { Pt } from '../pen';
import { PAPER_FILL } from '../palette';
import { limb } from './limb';

/**
 * A tiger beetle, side-on and facing right: metallic green wing cases with
 * cream markings, a narrow neck shield, a broad head of bulging eyes over
 * a white lip and sickle jaws, beaded antennae and long, bristly legs.
 */
const WING = '#5c8e68';
const DEEP = '#2f6a5e';
const NECK = '#4d7a5a';
const LEG = '#6a7f5c';
const CREAM = '#f3ecd0';

/** Three long legs a side; each ends in a tarsus of beads lying along the sand. */
function legs(d: Draw, far: boolean): void {
  [-12, -2, 9].forEach((hx, i) => {
    const ph = -d.f * (TAU / 3) + (i % 2) * Math.PI + (far ? Math.PI : 0);
    const lift = Math.max(0, Math.sin(ph)) * 3;
    const reach = (i - 1) * 15 + (i === 1 ? 3 : 0) + Math.cos(ph) * 4 + (far ? -2 : 0);
    const dir = i === 0 ? -1 : 1;
    const hip = pt(hx, d.g - 20);
    const knee = pt(hx + reach * 0.5 + dir * 3, d.g - 25 - lift);
    const ankle = pt(hx + reach + dir * 2, d.g - 3 - lift * 0.6);
    const toe = pt(ankle.x + dir * 7, d.g - lift * 0.3 - (far ? 1.5 : 0));
    limb(d, [hip, knee, ankle], { widths: [3.2, 2.2, 1.3], wash: LEG, hairs: far ? 0 : 5, far, line: 0.9 });
    // The tarsus: a slim, beaded foot tapering to a pair of claws.
    d.pen.stroke([ankle, toe], far ? 0.6 : 0.9, d.ink, far ? 0.5 : 0.95, false);
    for (let k = 1; k < 5; k++) {
      const t = k / 5;
      d.pen.dot(ankle.x + (toe.x - ankle.x) * t, ankle.y + (toe.y - ankle.y) * t, 0.75 - k * 0.08, d.ink, far ? 0.45 : 0.8);
    }
    if (!far) for (const dy of [-0.8, 0.6]) d.pen.hair([toe, pt(toe.x + dir * 2.2, toe.y + dy)], 0.5, d.ink, 0.9);
  });
}

/** A sickle jaw with two teeth on its inner edge. */
function jaw(d: Draw, x: number, y: number, far: boolean): void {
  const { pen } = d;
  const spine = bezier(pt(x, y), pt(x + 8, y - 1.5), pt(x + 8, y + 6), 8);
  const shape = tube(spine, 2.6, 0.4);
  pen.fill(shape, PAPER_FILL, 1);
  pen.fill(shape, CREAM, far ? 0.5 : 0.8);
  if (!far) for (const t of [3, 5]) pen.hair([spine[t]!, pt(spine[t]!.x - 1.2, spine[t]!.y + 1.4)], 0.6, d.ink, 0.9);
  pen.stroke(closed(shape), far ? 0.7 : 1, d.ink, far ? 0.6 : 1, false);
}

export function beetle(d: Draw): void {
  const { pen } = d;
  const g = d.g;
  pen.fill(oval(0, g - 1, 38, 3, 24), d.ink, 0.1);
  legs(d, true);
  jaw(d, 29, g - 26, true);
  // The wing cases: domed, tapering to a blunt point at the back.
  const elytra = [
    ...cub(pt(7, g - 31), pt(-4, g - 37), pt(-23, g - 35), pt(-30, g - 26), 14),
    ...cub(pt(-30, g - 26), pt(-31, g - 22), pt(-27, g - 19.5), pt(-20, g - 19.5), 6).slice(1),
    ...cub(pt(-20, g - 19.5), pt(-8, g - 18.5), pt(3, g - 19.5), pt(7, g - 22), 8).slice(1),
    ...cub(pt(7, g - 22), pt(9.5, g - 24), pt(9.5, g - 29), pt(7, g - 31), 6).slice(1),
  ];
  skin(d, elytra, WING, 0.82);
  pen.clipped(elytra, () => {
    // Iridescence: a deeper blue-green along the lower side.
    tint(d, oval(-10, g - 19, 26, 6, 20), DEEP, 0.35);
    // Fine rows of punctures running the length of the case.
    for (const k of [0, 3, 6, 9]) {
      const row = cub(pt(6, g - 31 + k), pt(-4, g - 36 + k * 1.1), pt(-22, g - 34 + k), pt(-28, g - 25 + k * 0.4), 18);
      for (const p of row) pen.dot(p.x + pen.jitter(0.3), p.y, 0.3, d.ink, 0.45);
    }
    // The markings: a hooked shoulder lunule, a wavy middle band, a lunule at the tip.
    const mark = (pts: Pt[], w: number): void => {
      pen.stroke(pts, w + 0.9, d.ink, 0.35, false);
      pen.stroke(pts, w, CREAM, 0.95, false);
    };
    mark(bezier(pt(2, g - 33), pt(-4, g - 31), pt(0, g - 26), 8), 2);
    mark([pt(-9, g - 35), pt(-11, g - 31), pt(-8, g - 28), pt(-12, g - 23)], 2.2);
    mark(bezier(pt(-22, g - 32), pt(-29, g - 26), pt(-23, g - 21), 8), 1.8);
    // The metallic sheen: a bright stripe along the dome.
    pen.hair(cub(pt(4, g - 33), pt(-4, g - 36), pt(-18, g - 34.5), pt(-24, g - 30), 12), 1.3, PAPER_FILL, 0.65);
  });
  shade(d, elytra, 0.4);
  // The edge of the case where it folds under.
  pen.hair(cub(pt(-27, g - 22), pt(-16, g - 21.5), pt(-2, g - 21.5), pt(6, g - 23.5), 10), 0.6, d.ink, 0.6);
  edge(d, elytra, 1.3);
  // The neck shield: a narrow barrel with a groove at each end and white bristles.
  const neck = oval(13, g - 27, 5.5, 4.4, 14);
  skin(d, neck, NECK, 0.82);
  for (const x of [10, 16]) pen.hair(bezier(pt(x, g - 31), pt(x + 1, g - 27), pt(x, g - 23), 4), 0.55, d.ink, 0.65);
  for (let k = 0; k < 4; k++) pen.hair([pt(11 + k * 1.6, g - 23), pt(10.5 + k * 1.6, g - 21)], 0.4, d.ink, 0.6);
  shade(d, neck, 0.35);
  edge(d, neck, 1);
  // The head: broad, under great bulging eyes, with the white lip in front.
  const head = oval(23, g - 28, 6.8, 6, 16);
  skin(d, head, NECK, 0.82);
  shade(d, head, 0.35);
  edge(d, head, 1.05);
  const lip = oval(29, g - 25.5, 2.6, 1.8, 10);
  pen.fill(lip, PAPER_FILL, 1);
  pen.hair(closed(lip), 0.6, d.ink, 0.9);
  const eyeShape = oval(24, g - 31.5, 4.2, 3.8, 14);
  pen.fill(eyeShape, d.ink, 0.9);
  pen.clipped(eyeShape, () => {
    for (let k = 0; k < 12; k++) pen.dot(21 + pen.rng() * 6, g - 35 + pen.rng() * 7, 0.32, PAPER_FILL, 0.3);
  });
  pen.dot(25.4, g - 33, 1, PAPER_FILL, 0.95);
  pen.stroke(closed(eyeShape), 0.8, d.ink, 1, false);
  jaw(d, 28, g - 25, false);
  // Antennae: eleven beads, stouter at the base, waving.
  const sway = [0, 2, -1][d.f]!;
  for (const far of [true, false]) {
    const o = far ? -2 : 0;
    const a = bezier(pt(27, g - 34), pt(36 + o, g - 46 + sway), pt(47 + o, g - 45 + sway + (far ? 2 : 0)), 22);
    pen.stroke(a, far ? 0.6 : 0.8, d.ink, far ? 0.55 : 1, false);
    for (let k = 1; k <= 11; k++) {
      const p = a[k * 2]!;
      pen.dot(p.x, p.y, (far ? 0.5 : 0.8) * (k < 4 ? 1.25 : 1), d.ink, far ? 0.5 : 0.9);
    }
  }
  legs(d, false);
}
