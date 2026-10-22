import type { Rng } from '../../logic/rng';
import { bezier, closed, type Draw, oval, pt, TAU } from '../kit';
import { LEAF, PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { mix } from '../wash';
import { boxPts } from './band';
import { castShadow } from './flora';
import { leafShape } from './allotmentKit';

/**
 * The wild meadow's things as the map paints them, in world px: a weathered
 * bench, butterflies, clumps of cow parsley, poppies, ox-eye daisies and
 * cornflowers that stand up out of the long grass, and the stile's two
 * steps (laid under the groove).
 */
export const POPPY = '#d8322e';
export const CORNFLOWER = '#4f6fd0';
export const BUTTERCUP = '#f0c830';
const OAK = '#a08262';
const STEM = mix(LEAF, '#7a6a2a', 0.3);

/** A wooden bench on a mown patch, drawn a little from the front: its back rail, three seat slats, legs, its shadow. */
export function bench(d: Draw, c: Pt, w: number, rng: Rng): void {
  const { pen } = d;
  const x0 = c.x - w / 2;
  const x1 = c.x + w / 2;
  pen.fill(boxPts(x0 + 8, c.y + 4, x1 + 16, c.y + 26, 10), d.ink, 0.13);
  for (const x of [x0 + 6, x1 - 10]) {
    const leg = boxPts(x, c.y + 6, x + 4, c.y + 16, 4);
    pen.fill(leg, mix(OAK, d.ink, 0.4), 0.85);
    pen.hair(closed(leg), 0.5, d.ink, 0.8);
  }
  for (let k = 0; k < 3; k++) {
    const y = c.y - 6 + k * 5;
    const slat = boxPts(x0, y, x1, y + 4, 12);
    pen.fill(slat, PAPER_FILL, 1);
    pen.fill(slat, mix(OAK, '#c9c0ad', rng() * 0.5), 0.75);
    pen.hair([pt(x0 + 4 + rng() * 30, y + 2), pt(x1 - 4 - rng() * 30, y + 2)], 0.35, d.ink, 0.35);
    pen.stroke(closed(slat), 0.6, d.ink, 0.85, false);
  }
  for (const x of [x0 + 4, x1 - 8]) {
    const upright = boxPts(x, c.y - 26, x + 5, c.y - 5, 4);
    pen.fill(upright, mix(OAK, d.ink, 0.3), 0.85);
    pen.hair(closed(upright), 0.5, d.ink, 0.85);
  }
  for (const y of [c.y - 24, c.y - 15]) {
    const rail = boxPts(x0 - 2, y, x1 + 2, y + 5, 12);
    pen.fill(rail, PAPER_FILL, 1);
    pen.fill(rail, OAK, 0.8);
    pen.crescent(rail, pt(0, -2), () => pen.fill(rail, d.ink, 0.2));
    pen.stroke(closed(rail), 0.7, d.ink, 0.9, false);
  }
  for (const s of [-1, 1]) {
    const arm = boxPts(c.x + s * (w / 2 + 1) - 3, c.y - 14, c.x + s * (w / 2 + 1) + 3, c.y + 8, 4);
    pen.fill(arm, mix(OAK, d.ink, 0.25), 0.85);
    pen.hair(closed(arm), 0.55, d.ink, 0.85);
  }
}

/** Butterfly kinds: forewing, hindwing, and the wing-tip or eye-spot colour. */
const BUTTERFLIES: readonly (readonly [string, string, string])[] = [
  ['#e9802e', '#e9802e', '#2a2030'], // small tortoiseshell
  ['#f2ead0', '#f2ead0', '#e9802e'], // orange-tip
  ['#e8d24a', '#e8d24a', '#c9a62a'], // brimstone
  ['#7a9ae0', '#8aa6e8', '#f2efe6'], // common blue
  ['#a8362e', '#8a2e2a', '#5a7ac0'], // peacock
];

/** A butterfly from above, wings open, its shadow on the grass well below it. */
export function butterfly(d: Draw, c: Pt, s: number, ang: number, rng: Rng): void {
  const { pen } = d;
  const [fore, hind, mark] = BUTTERFLIES[Math.floor(rng() * BUTTERFLIES.length)]!;
  const cs = Math.cos(ang);
  const sn = Math.sin(ang);
  const at = (u: number, v: number): Pt => pt(c.x + (u * cs - v * sn) * s, c.y + (u * sn + v * cs) * s);
  const wings: [Pt[], string][] = [];
  for (const side of [-1, 1]) {
    wings.push([[at(0.15, 0), at(0.75, side * 0.35), at(0.7, side * 1.05), at(0.1, side * 0.95), at(-0.05, side * 0.2)], fore]);
    wings.push([[at(-0.05, 0), at(-0.2, side * 0.8), at(-0.65, side * 0.7), at(-0.6, side * 0.2)], hind]);
  }
  for (const [w] of wings) pen.fill(w.map((p) => pt(p.x + s * 1.6, p.y + s * 2.6)), d.ink, 0.09);
  for (const [w, col] of wings) {
    const shape = bezier(w[0]!, w[1]!, w[2]!, 4).concat(bezier(w[2]!, w[3]!, w[w.length - 1]!, 4).slice(1));
    pen.fill(shape, PAPER_FILL, 1);
    pen.fill(shape, col, 0.88);
    pen.hair(closed(shape), 0.4, d.ink, 0.75);
  }
  for (const side of [-1, 1]) {
    const tip = at(0.58, side * 0.82);
    pen.dot(tip.x, tip.y, s * 0.18, mark, 0.9);
  }
  pen.hair([at(-0.55, 0), at(0.45, 0)], Math.max(0.8, s * 0.12), '#2a2030', 0.95);
  for (const side of [-1, 1]) pen.hair([at(0.45, 0), at(0.85, side * 0.25)], 0.35, d.ink, 0.8);
}

/** Cow parsley: a few lacy white domes of umbels on fine stalks, standing over the grass. */
export function cowParsley(d: Draw, c: Pt, rng: Rng): void {
  const { pen } = d;
  const n = 3 + Math.floor(rng() * 3);
  for (let k = 0; k < n; k++) {
    const p = pt(c.x + (rng() - 0.5) * 26, c.y + (rng() - 0.5) * 20);
    const r = 7 + rng() * 3;
    pen.hair([c, p], 0.5, STEM, 0.7);
    pen.fill(oval(p.x + r * 0.9, p.y + r * 1.4, r, r * 0.9, 14), d.ink, 0.08);
    const rays = 12;
    for (let i = 0; i < rays; i++) {
      const a = (i / rays) * TAU + rng() * 0.3;
      const q = pt(p.x + Math.cos(a) * r * (0.5 + rng() * 0.4), p.y + Math.sin(a) * r * (0.5 + rng() * 0.4));
      pen.hair([p, q], 0.3, STEM, 0.5);
      for (let j = 0; j < 6; j++) pen.dot(q.x + (rng() - 0.5) * 3.4, q.y + (rng() - 0.5) * 3.4, 0.8, '#fdfbf3', 1);
    }
    for (let j = 0; j < 8; j++) pen.dot(p.x + (rng() - 0.5) * r * 0.6, p.y + (rng() - 0.5) * r * 0.6, 0.8, '#fdfbf3', 1);
    pen.hair(oval(p.x, p.y, r * 1.02, r * 1.02, 16).slice(2, 9), 0.35, d.ink, 0.45);
  }
}

/** A stand of poppies: papery red cups with dark hearts, a bud or two nodding. */
export function poppies(d: Draw, c: Pt, rng: Rng): void {
  const { pen } = d;
  const n = 4 + Math.floor(rng() * 4);
  for (let k = 0; k < n; k++) {
    const p = pt(c.x + (rng() - 0.5) * 30, c.y + (rng() - 0.5) * 22);
    const r = 4 + rng() * 2;
    const cup = Array.from({ length: 16 }, (_, i) => {
      const a = (i / 16) * TAU;
      const k2 = r * (0.85 + 0.2 * Math.abs(Math.sin(a * 2 + k)));
      return pt(p.x + Math.cos(a) * k2, p.y + Math.sin(a) * k2);
    });
    castShadow(d, cup, r * 0.8, 0.1);
    pen.fill(cup, PAPER_FILL, 1);
    pen.fill(cup, POPPY, 0.9);
    pen.crescent(cup, pt(-1.5, -2), () => pen.fill(cup, '#7a1a1a', 0.3));
    pen.dot(p.x, p.y, r * 0.3, '#2a2030', 0.9);
    pen.hair(closed(cup), 0.4, d.ink, 0.6);
  }
  for (let k = 0; k < 2; k++) {
    const b = pt(c.x + (rng() - 0.5) * 30, c.y + (rng() - 0.5) * 22);
    pen.hair(bezier(pt(b.x - 4, b.y + 6), pt(b.x - 4, b.y), b, 4), 0.5, STEM, 0.8);
    pen.fill(leafShape(b, rng() * TAU, 4, 1.6), mix(LEAF, '#a0a050', 0.4), 0.9);
  }
}

/** Ox-eye daisies and cornflowers mixed in a little drift. */
export function daisies(d: Draw, c: Pt, rng: Rng): void {
  const { pen } = d;
  for (let k = 0; k < 8; k++) {
    const p = pt(c.x + (rng() - 0.5) * 34, c.y + (rng() - 0.5) * 24);
    if (rng() < 0.35) {
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * TAU + rng() * 0.3;
        pen.fill(leafShape(p, a, 3.6, 1.1), CORNFLOWER, 0.9);
      }
      pen.dot(p.x, p.y, 1, '#2a3a7a', 0.9);
      continue;
    }
    pen.dot(p.x + 1.5, p.y + 2.5, 4.5, d.ink, 0.07);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU;
      const petal = oval(p.x + Math.cos(a) * 3.2, p.y + Math.sin(a) * 3.2, 2, 0.9, 6).map((q) => rot(q, pt(p.x + Math.cos(a) * 3.2, p.y + Math.sin(a) * 3.2), a));
      pen.fill(petal, '#fbf8ee', 0.97);
    }
    pen.dot(p.x, p.y, 1.6, '#e8b830', 1);
    pen.circle(p.x, p.y, 5.2, 0.3, d.ink);
  }
}

function rot(p: Pt, c: Pt, a: number): Pt {
  const dx = p.x - c.x;
  const dy = p.y - c.y;
  return pt(c.x + dx * Math.cos(a) - dy * Math.sin(a), c.y + dx * Math.sin(a) + dy * Math.cos(a));
}

/** The stile's steps across the groove: a low board in front of the fence and one behind it, worn pale in the middle. */
export function stileSteps(d: Draw, gate: Pt, half: number): void {
  const { pen } = d;
  for (const [y, h] of [[gate.y + 30, 9], [gate.y - 26, 8]] as const) {
    const board = boxPts(gate.x - half, y - h / 2, gate.x + half, y + h / 2, 10);
    pen.fill(board.map((p) => pt(p.x + 6, p.y + 8)), d.ink, 0.15);
    pen.fill(board, PAPER_FILL, 1);
    pen.fill(board, OAK, 0.78);
    pen.fill(boxPts(gate.x - half * 0.4, y - h / 2 + 1, gate.x + half * 0.4, y + h / 2 - 1, 10), PAPER_FILL, 0.3);
    pen.crescent(board, pt(0, -3), () => pen.fill(board, d.ink, 0.22));
    pen.stroke(closed(board), 0.8, d.ink, 0.9, false);
    for (const s of [-1, 1]) {
      const stub = boxPts(gate.x + s * (half - 8) - 3, y + h / 2, gate.x + s * (half - 8) + 3, y + h / 2 + 8, 4);
      pen.fill(stub, mix(OAK, d.ink, 0.4), 0.85);
      pen.hair(closed(stub), 0.5, d.ink, 0.8);
    }
  }
}
