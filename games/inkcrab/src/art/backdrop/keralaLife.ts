import { bezier, type Draw, oval, pt } from '../kit';
import type { Pt } from '../pen';
import { PAPER_FILL } from '../palette';
import { edges, FAR } from './common';
import { netPile } from './keralaBoats';
import { boulder } from './malabar';

/**
 * What lies on a Kerala fishing beach in the monsoon: heaps of blue and
 * green nylon net with their strings of orange floats, coconut husks and
 * fallen fronds, puddles holding the grey sky, the granite boulders of the
 * sea wall, and the grassy bank behind with screw pines under the palms.
 */
const FLOAT = '#e8823a';
const HUSK = '#9a7a4c';
const FROND_DEAD = '#b39463';
const BANK = '#7f9a58';
const BANK_DARK = '#4f6a3c';
const SCREW_PINE = '#5f8a52';

/** A string of orange floats lying in a curve along `line`. */
export function floatLine(t: Draw, line: readonly Pt[], every = 2): void {
  const { pen } = t;
  pen.hair(line, 0.4, t.ink, FAR * 0.6);
  line.forEach((p, i) => {
    if (i % every) return;
    const f = oval(p.x, p.y - 1, 1.8, 1.4, 10);
    pen.fill(f, PAPER_FILL, 1);
    pen.fill(f, FLOAT, 0.75);
    pen.hair(edges(f), 0.35, t.ink, FAR * 0.9);
  });
}

/** A heap of net on the sand, its floats strung along its edge and trailing off it. */
export function netHeap(t: Draw, x: number, ground: number, w: number, h: number, color: string): void {
  t.pen.fill(oval(x, ground + 1, w * 0.55, 2.5, 20), t.ink, 0.08);
  netPile(t, x, ground, w, h, color);
  const rim = bezier(pt(x - w * 0.45, ground - h * 0.4), pt(x, ground - h * 1.1), pt(x + w * 0.45, ground - h * 0.3), 8);
  floatLine(t, rim);
  floatLine(t, bezier(pt(x + w * 0.45, ground), pt(x + w * 0.7, ground + 3), pt(x + w, ground + 2), 6));
}

/** A coconut husk lying on the sand: a fibrous brown wedge. */
export function husk(t: Draw, x: number, ground: number, s: number): void {
  const { pen } = t;
  const shape = [pt(x - 3 * s, ground), pt(x + 3 * s, ground), pt(x + 2 * s, ground - 2.6 * s), pt(x - 1.5 * s, ground - 2.8 * s)];
  pen.fill(shape, PAPER_FILL, 1);
  pen.fill(shape, HUSK, 0.6);
  for (let k = 0; k < 3; k++) pen.hair([pt(x - 2 * s + k * 1.5 * s, ground - 0.5), pt(x - 1.4 * s + k * 1.5 * s, ground - 2.4 * s)], 0.3, t.ink, FAR * 0.5);
  pen.hair(edges(shape), 0.4, t.ink, FAR * 0.8);
}

/** A fallen palm frond: a long midrib with its dry leaflets combed to one side. */
export function fallenFrond(t: Draw, a: Pt, b: Pt): void {
  const { pen } = t;
  const rib = bezier(a, pt((a.x + b.x) / 2, Math.min(a.y, b.y) - 3), b, 12);
  pen.stroke(rib, 0.9, FROND_DEAD, 0.8, false);
  for (let i = 1; i < rib.length; i++) {
    const p = rib[i]!;
    const l = 6 * (1 - i / rib.length) + 2;
    pen.hair([p, pt(p.x + l * 0.6, p.y + l * 0.5)], 0.4, FROND_DEAD, 0.75);
    pen.hair([p, pt(p.x + l * 0.7, p.y - l * 0.25)], 0.4, FROND_DEAD, 0.6);
  }
  pen.hair(rib, 0.4, t.ink, FAR * 0.6);
}

/**
 * The sea wall: granite boulders heaped along the back of the beach from
 * x0 to x1, the biggest at the back, the gaps dark between them.
 */
export function seaWall(t: Draw, x0: number, x1: number, ground: (x: number) => number, h: number): void {
  const { pen } = t;
  for (const [row, k] of [[0, 1], [1, 0.75], [2, 0.5]] as const) {
    for (let x = x0 + row * 6; x < x1; x += h * 0.9 * k + pen.rng() * 6) {
      const rx = h * 0.55 * k * (0.8 + pen.rng() * 0.4);
      boulder(t, x, ground(x) - h * (1 - row * 0.4) + rx * 0.7, rx, rx * 0.75);
    }
  }
}

/** A screw pine (pandanus): a tuft of long sword leaves on a short stem propped on stilt roots. */
export function screwPine(t: Draw, x: number, ground: number, h: number): void {
  const { pen } = t;
  const crown = pt(x + pen.jitter(2), ground - h * 0.55);
  for (const dx of [-4, -1.5, 2, 4.5]) pen.hair(bezier(pt(x + dx, ground), pt(x + dx * 0.5, ground - h * 0.2), pt(x, ground - h * 0.3), 4), 0.6, '#8b7b63', 0.8);
  pen.stroke([pt(x, ground - h * 0.25), crown], 1.2, '#8b7b63', 0.8, false);
  for (let k = 0; k < 13; k++) {
    const a = -Math.PI / 2 + ((k / 12) - 0.5) * 3 + pen.jitter(0.12);
    const len = h * (0.4 + pen.rng() * 0.25);
    const tip = pt(crown.x + Math.cos(a) * len, crown.y + Math.sin(a) * len * 0.8 + len * 0.15);
    pen.stroke(bezier(crown, pt((crown.x + tip.x) / 2, (crown.y + tip.y) / 2 - len * 0.12), tip, 5), 1.3, SCREW_PINE, 0.7, false);
    pen.hair(bezier(crown, pt((crown.x + tip.x) / 2, (crown.y + tip.y) / 2 - len * 0.12), tip, 5), 0.35, t.ink, FAR * 0.6);
  }
}

/**
 * The grassy bank at the back of the beach from x0 to x1, `h` high at its
 * crest: a low green hump under the palms, its face grassed. Returns its top.
 */
export function grassBank(t: Draw, x0: number, x1: number, ground: (x: number) => number, h: number): (x: number) => number {
  const { pen } = t;
  const top = (x: number): number => ground(x) - h * Math.max(0, Math.sin((Math.PI * (x - x0)) / (x1 - x0))) ** 0.6;
  const edge: Pt[] = [];
  for (let x = x0; x <= x1; x += 4) edge.push(pt(x, top(x)));
  const shape = [...edge, pt(x1, ground(x1) + 6), pt(x0, ground(x0) + 6)];
  pen.fill(shape, PAPER_FILL, 1);
  pen.fill(shape, BANK, 0.45);
  pen.clipped(shape, () => {
    pen.hatch(shape, 1.8, 1.2, 0.35, { color: BANK_DARK, alpha: 0.45, onlyBelow: Math.min(...edge.map((p) => p.y)) + h * 0.45 });
    pen.fill(edge.map((p) => pt(p.x, p.y + h * 0.6)).concat([pt(x1, ground(x1) + 6), pt(x0, ground(x0) + 6)]), '#c9a46a', 0.35);
  });
  for (let x = x0 + 4; x < x1 - 4; x += 3 + pen.rng() * 4) {
    const y = top(x) + 1 + pen.rng() * h * 0.4;
    pen.hair([pt(x, y), pt(x + pen.jitter(2), y - 3 - pen.rng() * 3)], 0.45, BANK_DARK, 0.7);
  }
  pen.hair(edge, 0.7, t.ink, FAR * 0.8);
  return top;
}
