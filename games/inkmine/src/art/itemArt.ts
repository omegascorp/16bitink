import type { ItemKind } from '../logic/items';
import { edge, oval, pt, shade, skin, tint, type Draw } from './kit';
import { HIGHLIGHT, PAPER_FILL } from './palette';
import type { Pt } from './pen';

/**
 * Mission items in ink over a highlighter halo (pickups are highlighted):
 * a core sample in its steel tube, the lost survey probe, a fossil ammonite
 * on a chip of rock. Each fits a frame of ITEM_FRAME units, origin at the
 * centre. Broken parts (wrecks) are drawn by wreckArt.ts.
 */
export const ITEM_FRAME = 32;

const STEEL = '#b9c0c8';
const ROCK = '#8f8d8a';
const AMMONITE = '#c9b48a';

function halo(d: Draw, rx: number, ry: number): void {
  tint(d, oval(0, 0, rx, ry, 24), HIGHLIGHT, 0.55);
}

/** A rock core in a steel sample tube, lying on a slant: bands of the strata it came through showing at the open end. */
function core(d: Draw): void {
  halo(d, 14, 9);
  const a = -0.35;
  const rot = (x: number, y: number): Pt => pt(x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a));
  const tube = [rot(-11, -4.5), rot(6, -4.5), rot(6, 4.5), rot(-11, 4.5)];
  skin(d, tube, STEEL, 0.6);
  shade(d, tube, 0.35);
  edge(d, tube, 1.1);
  for (const x of [-8, -2.5]) d.pen.hair([rot(x, -4.5), rot(x, 4.5)], 0.7, d.ink, 0.8);
  const rock = [rot(6, -3.6), rot(11, -3.6), rot(11.8, 0), rot(11, 3.6), rot(6, 3.6)];
  skin(d, rock, ROCK, 0.7);
  for (const x of [7.6, 9.4]) d.pen.hair([rot(x, -3.4), rot(x + 0.3, 3.4)], 0.6, d.ink, 0.7);
  edge(d, rock, 1);
}

/** The survey probe: a squat body with a dish, three legs, one bent, and a whip antenna. */
function probe(d: Draw): void {
  halo(d, 14, 12);
  const body = [pt(-8, -2), pt(8, -2), pt(9, 5), pt(-9, 5)];
  skin(d, body, STEEL, 0.55);
  shade(d, body, 0.35);
  edge(d, body, 1.1);
  d.pen.stroke([pt(-6, 5), pt(-9, 11)], 1, d.ink, 0.9, false);
  d.pen.stroke([pt(6, 5), pt(9, 11)], 1, d.ink, 0.9, false);
  d.pen.stroke([pt(0, 5), pt(1, 8), pt(4, 9)], 1, d.ink, 0.9, false);
  const dish = [pt(-6, -3), pt(-1, -9), pt(2, -8), pt(-4, -2)];
  skin(d, dish, PAPER_FILL, 0.9);
  edge(d, dish, 0.9);
  d.pen.hair([pt(5, -2), pt(7, -10), pt(10, -13)], 0.7, d.ink, 0.9);
  d.pen.dot(-3, 1.5, 1.2, d.ink);
}

/** An ammonite on a chip of rock: a coiled shell, ribbed. */
function fossil(d: Draw): void {
  halo(d, 13, 11);
  const chip = [pt(-12, 4), pt(-8, -8), pt(6, -10), pt(12, -2), pt(10, 8), pt(-6, 9)];
  skin(d, chip, ROCK, 0.6);
  edge(d, chip, 1);
  const coil: Pt[] = [];
  for (let k = 0; k <= 60; k++) {
    const t = (k / 60) * Math.PI * 5;
    const r = 0.6 + t * 0.47;
    coil.push(pt(Math.cos(t) * r, Math.sin(t) * r * 0.92));
  }
  skin(d, oval(0, 0, 8, 7.4, 24), AMMONITE, 0.7);
  d.pen.stroke(coil, 1, d.ink, 0.95, false);
  for (let k = 0; k < 14; k++) {
    const t = Math.PI * 2.4 + (k / 14) * Math.PI * 2.4;
    const r = 0.6 + t * 0.47;
    d.pen.hair([pt(Math.cos(t) * r * 0.78, Math.sin(t) * r * 0.72), pt(Math.cos(t) * r, Math.sin(t) * r * 0.92)], 0.5, d.ink, 0.6);
  }
}

export function drawItem(d: Draw, kind: Exclude<ItemKind, 'wreck'>): void {
  if (kind === 'core') core(d);
  else if (kind === 'probe') probe(d);
  else fossil(d);
}

/** The kinds drawn here: every kind but the wreck. */
export const ITEM_KINDS: readonly Exclude<ItemKind, 'wreck'>[] = ['core', 'probe', 'fossil'];
