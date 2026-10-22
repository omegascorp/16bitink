import type { Rng } from '../logic/rng';
import { arc, blob, body, castShadow, outline, polar, SHADOW } from './groundKit';
import { closed, type Draw, oval, pt, shade, TAU } from './kit';
import { PAPER_FILL } from './palette';
import type { Pt } from './pen';
import { rod, rodShadow } from './allotmentKit';
import { mix } from './wash';

/**
 * The allotment's props, seen from above: a water butt, an upturned
 * wheelbarrow, a coil of hose, a garden fork stuck in the soil and a
 * scarecrow, each throwing its shadow down and to the right. Board
 * coordinates; each takes the rng it draws its variety from.
 */
const BUTT = '#4f7656';
const BUTT_LID = '#5f8866';
const BARROW = '#5d8a86';
const BARROW_DEEP = '#2f4f52';
const HANDLE = '#b48a5a';
const TYRE = '#3a3a40';
const HOSE = '#5f9a4a';
const BRASS = '#c9a24e';
const ASH = '#c49a62';
const STEEL = '#aab3b3';
const STRAW = '#e2c167';
const HAT = '#d9b971';
const SHIRT = '#6f86b0';
const DARK = '#1d1f2b';

/** A water butt of radius r at c: a ribbed green barrel under a lid with a dip-hole, a brass tap at its side. */
export function waterButt(d: Draw, c: Pt, r: number, rng: Rng): void {
  const { pen } = d;
  const rim = oval(c.x, c.y, r, r, 40);
  castShadow(d, rim, r * 0.55, 0.12);
  castShadow(d, rim, r * 0.3, 0.12);
  // The tap, low on the side away from the light.
  const tapAt = polar(c, 0.3, r);
  const tap = [polar(tapAt, 0.3 - 1.4, 2.5), polar(tapAt, 0.3, 9), polar(tapAt, 0.3 + 1.4, 2.5)];
  body(d, tap, BRASS, 0.85);
  pen.stroke(closed(tap), 0.8, d.ink, 0.85, false);
  body(d, rim, BUTT, 0.82);
  pen.crescent(rim, pt(-SHADOW.x * r * 0.18, -SHADOW.y * r * 0.18), () => pen.fill(rim, mix(BUTT, d.ink, 0.55), 0.45));
  pen.crescent(rim, pt(SHADOW.x * r * 0.12, SHADOW.y * r * 0.12), () => pen.fill(rim, PAPER_FILL, 0.3));
  shade(d, rim, 0.3);
  const lid = oval(c.x, c.y, r * 0.84, r * 0.84, 36);
  body(d, lid, BUTT_LID, 0.75);
  pen.clipped(lid, () => {
    for (const k of [0.62, 0.7]) pen.hair(closed(oval(c.x, c.y, r * k, r * k, 30)), 0.45, d.ink, 0.35);
    pen.fill(oval(c.x - r * 0.3, c.y - r * 0.3, r * 0.35, r * 0.2, 14), PAPER_FILL, 0.18);
  });
  pen.crescent(lid, pt(SHADOW.x * r * 0.1, SHADOW.y * r * 0.1), () => pen.fill(lid, DARK, 0.25));
  // The dip-hole with a glint of rainwater, and a fallen leaf on the lid.
  const hole = oval(c.x + r * 0.3, c.y + r * 0.1, r * 0.2, r * 0.2, 16);
  pen.fill(hole, '#2b3c48', 0.9);
  pen.hair(arc(polar(hole[0]!, Math.PI, r * 0.27), polar(hole[0]!, Math.PI, r * 0.13), 2, 4), 0.8, '#9fb3cf', 0.7);
  pen.stroke(closed(hole), 0.7, d.ink, 0.9, false);
  if (rng() < 0.7) {
    const la = rng() * TAU;
    const base = polar(c, la + 2, r * 0.35);
    const leaf = [...arc(base, polar(base, la, 11), 3, 5), ...arc(polar(base, la, 11), base, 3, 5).slice(1)];
    body(d, leaf, '#c9a24e', 0.7);
    pen.hair(closed(leaf), 0.4, d.ink, 0.6);
  }
  pen.stroke(closed(lid), 0.8, d.ink, 0.75, false);
  pen.stroke(closed(rim), 1.3, d.ink, 0.95);
}

/** The barrow's tub outline in its own frame (nose at +x), scaled by k: squarish at the back, tapering to the nose. */
function tubOutline(L: number, k: number): Pt[] {
  const cx = 0.06 * L;
  const rx = 0.3 * L * k;
  const ry = 0.29 * L * k;
  return Array.from({ length: 48 }, (_, i) => {
    const a = (i / 48) * TAU;
    const x = Math.sign(Math.cos(a)) * Math.abs(Math.cos(a)) ** 0.45 * rx;
    const y = Math.sign(Math.sin(a)) * Math.abs(Math.sin(a)) ** 0.55 * ry;
    const taper = 1 - 0.42 * Math.max(0, x / rx);
    return pt(cx + x, y * taper);
  });
}

/** An upturned wheelbarrow, its tub's underside up, nose along `turn`, about `len` long overall. */
export function upturnedBarrow(d: Draw, c: Pt, len: number, turn: number, rng: Rng): void {
  const { pen } = d;
  const u = pt(Math.cos(turn), Math.sin(turn));
  const at = (x: number, y: number): Pt => pt(c.x + u.x * x - u.y * y, c.y + u.y * x + u.x * y);
  const L = len;
  const map = (ps: readonly Pt[]): Pt[] => ps.map((p) => at(p.x, p.y));
  // Handles out the back with their grips, the wheel and its fork at the nose.
  for (const s of [1, -1]) {
    const handle = [at(-0.02 * L, s * 0.15 * L), at(-0.6 * L, s * 0.197 * L)];
    const grip = [at(-0.58 * L, s * 0.196 * L), at(-0.72 * L, s * 0.205 * L)];
    rodShadow(d, [handle[0]!, grip[1]!].map((p) => pt(p.x + SHADOW.x * 9, p.y + SHADOW.y * 9)), 6.5, 0.13);
    rod(d, handle, 6.4, HANDLE);
    for (let x = -0.3; x > -0.56; x -= 0.08) pen.hair([at(x * L, s * (0.15 - x * 0.08) * L), at((x - 0.05) * L, s * (0.15 - (x - 0.05) * 0.08) * L)], 0.45, d.ink, 0.5);
    rod(d, grip, 7.6, '#4a4a54');
  }
  for (const s of [1, -1]) rod(d, [at(0.26 * L, s * 9.5), at(0.53 * L, s * 9.5)], 2.6, BARROW_DEEP);
  const tyre = [at(0.4 * L, -6.5), at(0.66 * L, -6.5), at(0.66 * L, 6.5), at(0.4 * L, 6.5)];
  castShadow(d, tyre, 13, 0.14);
  body(d, tyre, TYRE, 0.88);
  pen.clipped(tyre, () => {
    for (let x = 0.41 * L; x < 0.66 * L; x += 3.4) pen.hair([at(x, -6.5), at(x + 1.8, 0), at(x, 6.5)], 0.6, '#16161a', 0.8);
  });
  pen.hair([at(0.42 * L, -4), at(0.64 * L, -4)], 0.9, PAPER_FILL, 0.3);
  pen.stroke(outline(tyre, 4), 0.9, d.ink, 0.95, false);
  // The tub: rim, sloping sides lit towards the light, the flat bottom now on top.
  const rim = map(tubOutline(L, 1));
  const base = map(tubOutline(L, 0.66).map((p) => pt(p.x + 0.015 * L, p.y)));
  castShadow(d, rim, 14, 0.2);
  body(d, rim, BARROW, 0.82);
  pen.crescent(rim, pt(SHADOW.x * 9, SHADOW.y * 9), () => pen.fill(rim, PAPER_FILL, 0.3));
  pen.crescent(rim, pt(-SHADOW.x * 10, -SHADOW.y * 10), () => pen.fill(rim, BARROW_DEEP, 0.45));
  shade(d, rim, 0.25);
  pen.stroke(closed(map(tubOutline(L, 0.97))), 1.6, mix(BARROW, PAPER_FILL, 0.5), 0.6, false);
  castShadow(d, base, 2, 0.12);
  body(d, base, mix(BARROW, '#8fb3ad', 0.2), 0.82);
  pen.clipped(base, () => {
    // Scuffs and a little honest rust on the bottom.
    pen.stipple(base, 60, () => 0.6, 0.6, '#9b5b36');
    for (let k = 0; k < 6; k++) {
      const p = at(-0.1 * L + rng() * 0.3 * L, (rng() - 0.5) * 0.3 * L);
      pen.hair([p, polar(p, turn + (rng() - 0.5) * 0.6, 8 + rng() * 12)], 0.45, PAPER_FILL, 0.55);
    }
  });
  pen.hair(closed(base), 0.8, d.ink, 0.8);
  pen.stroke(closed(rim), 1.3, d.ink, 0.95);
}

/** A coil of green hose of radius r at c, lying in loose loops, its brass nozzle trailing out. */
export function hoseCoil(d: Draw, c: Pt, r: number, rng: Rng): void {
  const { pen } = d;
  pen.fill(oval(c.x + SHADOW.x * 4, c.y + SHADOW.y * 4, r + 3, r * 0.92 + 3, 30), d.ink, 0.1);
  const loops = 4;
  const tube = (pts: readonly Pt[]): void => {
    rodShadow(d, pts.map((p) => pt(p.x + SHADOW.x * 2, p.y + SHADOW.y * 2)), 5, 0.14);
    rod(d, pts, 5, HOSE);
  };
  for (let k = 0; k < loops; k++) {
    const o = polar(c, rng() * TAU, 2 + rng() * 3);
    const rr = r - k * 1.8 + (rng() - 0.5) * 2;
    const ph = rng() * TAU;
    tube(Array.from({ length: 33 }, (_, i) => polar(o, ph + (i / 32) * TAU * 1.02, rr * (1 + 0.04 * Math.sin(i * 0.7 + ph)))));
  }
  // The end trailing out, with its nozzle.
  const from = polar(c, 0.6, r);
  const end = polar(from, 1.2 + rng() * 0.5, r * 0.9);
  tube(arc(from, end, r * 0.2, 8));
  const dir = Math.atan2(end.y - from.y, end.x - from.x);
  const nozzle = [polar(end, dir + 1.57, 3), polar(polar(end, dir, 10), dir + 1.57, 2.2), polar(polar(end, dir, 10), dir - 1.57, 2.2), polar(end, dir - 1.57, 3)];
  body(d, nozzle, BRASS, 0.9);
  pen.stroke(outline(nozzle, 3), 0.7, d.ink, 0.9, false);
}

/** A garden fork stuck in the soil at `foot`, leaning along `lean`: a little heave of earth, the ash shaft, its D-grip and a long shadow. */
export function gardenFork(d: Draw, foot: Pt, lean: number, rng: Rng): void {
  const { pen } = d;
  const top = polar(foot, lean, 44);
  const away = Math.atan2(SHADOW.y, SHADOW.x);
  const n = lean + Math.PI / 2;
  const dGrip = (at: Pt, dir: number, sc: number): Pt[] => {
    const m = dir + Math.PI / 2;
    return [polar(at, m, 6 * sc), polar(polar(at, dir, 10 * sc), m, 6 * sc), polar(polar(at, dir, 11 * sc), m, 0), polar(polar(at, dir, 10 * sc), m, -6 * sc), polar(at, m, -6 * sc), polar(at, m, 6 * sc)];
  };
  // Its shadow falls long across the bed: the shaft, then the D of the grip.
  const shTop = polar(foot, away, 74);
  rodShadow(d, [foot, shTop], 4, 0.17);
  rodShadow(d, dGrip(shTop, away, 1.1), 3, 0.15);
  // A little heave of soil where the tines went in.
  pen.fill(blob(foot, 9, 6, rng, 0.3, 12, lean), '#3a2a20', 0.5);
  pen.stipple(blob(foot, 10, 7, rng, 0.3, 12, lean), 30, () => 0.8, 0.8, '#a78563');
  const ferrule = polar(foot, lean, 11);
  rod(d, [foot, ferrule], 4.8, STEEL);
  rod(d, [ferrule, top], 4.2, ASH);
  rod(d, dGrip(top, lean, 1), 2.8, ASH);
  pen.dot(polar(top, n, 0).x, polar(top, n, 0).y, 1, d.ink, 0.7);
}

/**
 * A scarecrow seen from above, centred at c, arms along `turn`: its tall
 * shadow stretched across the bed, the crossbar in a faded blue shirt with
 * straw at the cuffs, and a wide straw hat over all.
 */
export function scarecrow(d: Draw, c: Pt, turn: number, rng: Rng): void {
  const { pen } = d;
  const u = pt(Math.cos(turn), Math.sin(turn));
  const at = (x: number, y: number): Pt => pt(c.x + u.x * x - u.y * y, c.y + u.y * x + u.x * y);
  const away = pt(SHADOW.x, SHADOW.y);
  const fall = (p: Pt, k: number): Pt => pt(p.x + away.x * k, p.y + away.y * k);
  // The shadow: post, arms and hat thrown long down-right.
  rodShadow(d, [c, fall(c, 96)], 5, 0.14);
  rodShadow(d, [fall(at(-50, 0), 66), fall(at(50, 0), 66)], 15, 0.12);
  d.pen.fill(oval(fall(c, 90).x, fall(c, 90).y, 21, 19, 22), d.ink, 0.13);
  // The arms: a crossbar sleeved in an old shirt, straw sprouting at the cuffs.
  for (const s of [1, -1]) {
    const cuff = at(s * 46, 0);
    for (let k = 0; k < 7; k++) pen.hair([cuff, polar(cuff, Math.atan2(s * u.y, s * u.x) + (rng() - 0.5) * 1.4, 7 + rng() * 7)], 1.3, STRAW, 0.95);
    const sleeve = [at(s * 6, -10), at(s * 44, -8), at(s * 45, 0), at(s * 44, 8), at(s * 6, 11)];
    castShadow(d, sleeve, 5, 0.15);
    body(d, sleeve, mix(SHIRT, '#a9b7cc', rng() * 0.3), 0.75);
    pen.clipped(sleeve, () => {
      for (let x = 10; x < 44; x += 7) pen.hair([at(s * x, -9), at(s * x, 9)], 0.6, '#3f5180', 0.35);
      pen.hair([at(s * 8, 0), at(s * 44, 0)], 0.6, '#3f5180', 0.3);
    });
    pen.crescent(sleeve, pt(-SHADOW.x * 4, -SHADOW.y * 4), () => pen.fill(sleeve, '#2d3a63', 0.3));
    pen.stroke(outline(sleeve, 5), 0.8, d.ink, 0.85, false);
  }
  // The hat: a wide woven brim, the crown and its band.
  const brim = blob(c, 21, 20, rng, 0.05, 30);
  castShadow(d, brim, 6, 0.18);
  body(d, brim, HAT, 0.8);
  pen.clipped(brim, () => {
    for (let k = 0; k < 4; k++) pen.hair(closed(oval(c.x, c.y, 13 + k * 2, 13 + k * 2, 24)), 0.35, '#8a6a3a', 0.45);
    for (let k = 0; k < 9; k++) pen.hair([polar(c, rng() * TAU, 22), polar(c, rng() * TAU, 24)], 0.7, STRAW, 0.9);
  });
  pen.crescent(brim, pt(-SHADOW.x * 4, -SHADOW.y * 4), () => pen.fill(brim, '#7a5a2a', 0.3));
  pen.stroke(closed(brim), 1, d.ink, 0.9);
  const crown = oval(c.x - 1, c.y - 1, 11, 10.5, 22);
  castShadow(d, crown, 4, 0.18);
  body(d, crown, mix(HAT, PAPER_FILL, 0.2), 0.8);
  pen.stroke(closed(oval(c.x - 1, c.y - 1, 11.6, 11, 22)), 1.8, '#7c4a36', 0.8, false);
  pen.crescent(crown, pt(-SHADOW.x * 4, -SHADOW.y * 4), () => pen.fill(crown, '#7a5a2a', 0.3));
  pen.hair(arc(pt(c.x - 6, c.y - 4), pt(c.x + 4, c.y - 6), 2, 4), 0.5, d.ink, 0.5);
  pen.stroke(closed(crown), 0.9, d.ink, 0.9, false);
}

/** A carrot lying in the trug: a tapered orange root with its rings and a tuft of leaves. */
function pulledCarrot(d: Draw, c: Pt, a: number, len: number): void {
  const { pen } = d;
  const tip = polar(c, a, len);
  const root = [polar(c, a + Math.PI / 2, 3.2), tip, polar(c, a - Math.PI / 2, 3.2), polar(c, a + Math.PI, 1.5)];
  body(d, root, '#e07a2a', 0.9);
  for (let k = 1; k < 4; k++) {
    const m = polar(c, a, (len * k) / 5);
    pen.hair([polar(m, a + 1.4, 2.4 - k * 0.4), polar(m, a - 1.4, 2.4 - k * 0.4)], 0.4, '#9a4a18', 0.6);
  }
  pen.crescent(root, pt(-SHADOW.x * 1.5, -SHADOW.y * 1.5), () => pen.fill(root, '#a24a18', 0.3));
  pen.hair(closed(root), 0.5, d.ink, 0.8);
  for (let k = -1; k <= 1; k++) pen.hair([c, polar(c, a + Math.PI + k * 0.35, 9)], 1.3, '#6c9c43', 0.95);
}

/**
 * A wooden trug of the day's harvest, nose along `turn`, ~len long:
 * curved slats in a bent rim, a handle bowed across, carrots, a cabbage
 * and a handful of bean pods in it.
 */
export function harvestTrug(d: Draw, c: Pt, len: number, turn: number, rng: Rng, fill: (d: Draw, c: Pt, r: number) => void): void {
  const { pen } = d;
  const u = pt(Math.cos(turn), Math.sin(turn));
  const at = (x: number, y: number): Pt => pt(c.x + u.x * x - u.y * y, c.y + u.y * x + u.x * y);
  const hw = len * 0.3;
  const shell = Array.from({ length: 36 }, (_, i) => {
    const a = (i / 36) * TAU;
    return at(Math.cos(a) * len / 2, Math.sign(Math.sin(a)) * Math.abs(Math.sin(a)) ** 0.8 * hw);
  });
  castShadow(d, shell, 7, 0.18);
  body(d, shell, '#c9a26a', 0.75);
  pen.clipped(shell, () => {
    for (let k = -2; k <= 2; k++) pen.hair(Array.from({ length: 9 }, (_, i) => at(-len / 2 + (len * i) / 8, (k * hw) / 2.6 * (1 - 0.25 * ((i - 4) / 4) ** 2))), 0.6, '#7a5a3a', 0.6);
  });
  pen.crescent(shell, pt(SHADOW.x * 5, SHADOW.y * 5), () => pen.fill(shell, '#5a4028', 0.3));
  // The harvest: carrots one end, a cabbage the other, pods between.
  for (let k = 0; k < 3; k++) pulledCarrot(d, at(-len * 0.1 - k * 2, -hw * 0.5 + k * hw * 0.45), turn + Math.PI + (rng() - 0.5) * 0.3, len * 0.3);
  fill(d, at(len * 0.22, 0), hw * 0.62);
  for (let k = 0; k < 4; k++) {
    const p = at(len * 0.02 + k * 3, (rng() - 0.5) * hw);
    rod(d, [p, polar(p, turn + 1.2 + rng() * 0.5, 12)], 2.6, '#8ab34c', 1, 0.6);
  }
  pen.stroke(closed(shell), 1.2, d.ink, 0.9);
  // The handle, bowed over the middle.
  const handle = [at(-2, -hw - 1), at(1, 0), at(-2, hw + 1)];
  rodShadow(d, handle.map((p) => pt(p.x + SHADOW.x * 9, p.y + SHADOW.y * 9)), 4, 0.15);
  rod(d, handle, 4, '#b48a5a');
}
