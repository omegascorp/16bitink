import type { Rng } from '../../logic/rng';
import { bezier, cub, type Draw, pt } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { boxOf, glaze, lanceBlade, mapBlade, model, petalBlade, rimLight } from '../critters/birdKit';
import { buildWing, covertRows, mapWing, mirrorY, paintWing, type Wing } from '../critters/birdWing';
import { blackFeather, greyPlumage, SEC } from './savannaBossPaint';

/**
 * The Secretary Bird's wings, for the +y side (mirrored for the other):
 * folded along the back, the black primaries crossing over the rump; or
 * open, long and broad like an eagle's, black flight feathers fingered at
 * the hand under grey coverts. `Spread` sets how far open: half (wings
 * lifted for balance on one leg), flared (the stamp), full (startled,
 * flying) and raised (the upstroke).
 */
const S = SEC;
const PI = Math.PI;
const WRIST = 0.5;

export type Spread = 'half' | 'flare' | 'full' | 'up';

interface Shape {
  readonly lead: readonly [Pt, Pt, Pt, Pt, Pt, Pt, Pt];
  readonly hand: readonly [number, number];
  readonly chord: readonly [number, number, number];
  readonly fingers: number;
}

const SHAPES: Readonly<Record<Spread, Shape>> = {
  half: { lead: [pt(8, 10), pt(14, 15), pt(16, 21), pt(14, 26), pt(11, 30), pt(4, 33), pt(-4, 35)], hand: [PI - 0.05, PI / 2 + 1.15], chord: [22, 26, 20], fingers: 4 },
  flare: { lead: [pt(8, 10), pt(14, 17), pt(18, 25), pt(18, 32), pt(17, 38), pt(13, 43), pt(8, 47)], hand: [PI - 0.15, PI / 2 + 0.6], chord: [22, 27, 20], fingers: 5 },
  full: { lead: [pt(8, 10), pt(14, 18), pt(17, 27), pt(17, 35), pt(17, 42), pt(15, 48), pt(11, 52)], hand: [PI - 0.12, PI / 2 + 0.3], chord: [24, 27, 18], fingers: 6 },
  up: { lead: [pt(8, 10), pt(12, 15), pt(13, 22), pt(11, 28), pt(8, 33), pt(2, 38), pt(-6, 41)], hand: [PI - 0.05, PI / 2 + 1], chord: [20, 24, 18], fingers: 5 },
};

export function openWing(spread: Spread): Wing {
  const s = SHAPES[spread];
  const [p0, c0, c1, w, c2, c3, end] = s.lead;
  const lead = [...cub(p0, c0, c1, w, 10), ...cub(w, c2, c3, end, 10).slice(1)];
  const [arm, hand, outer] = s.chord;
  return buildWing({
    lead, wrist: WRIST,
    dir: (t) => (t < WRIST ? PI - 0.04 - (t / WRIST) * 0.1 : s.hand[0] + (s.hand[1] - s.hand[0]) * ((t - WRIST) / (1 - WRIST)) ** 1.6),
    chord: (t) => (t < WRIST ? arm * (0.94 + 0.08 * Math.sin((t / WRIST) * PI)) : t < 0.8 ? arm + (hand - arm) * ((t - WRIST) / 0.3) : hand + (outer - hand) * ((t - 0.8) / 0.2)),
    secondaries: 12, primaries: 10, secW: 7, priW: 7.4,
    coverts: (t) => (t < WRIST ? 0.5 : 0.5 - ((t - WRIST) / (1 - WRIST)) * 0.26),
    fingers: s.fingers,
  });
}

export const bothWings = (spread: Spread): Wing[] => {
  const w = openWing(spread);
  return [w, mapWing(w, mirrorY)];
};

export function paintOpenWing(d: Draw, w: Wing, rng: Rng): void {
  paintWing(d, w, {
    feather: (x) => blackFeather(d, x.f, x.w, x.primary ? 0.5 : 0.42),
    coverts: (wing) => {
      const { pen } = d;
      const b = boxOf(wing.coverts);
      pen.fill(wing.coverts, PAPER_FILL, 1);
      pen.fill(wing.coverts, S.grey, 0.92);
      pen.clipped(wing.coverts, () => {
        glaze(d, b.cx, b.cy, b.rx * 0.8, b.ry * 0.5, 0.4, S.pale, 0.4);
        covertRows(wing, 3, (t) => (t < WRIST ? 0.5 : 0.5 - ((t - WRIST) / (1 - WRIST)) * 0.26), (t, r) => 6 - r * 1.1 - t * 1.2, (f, sz) => {
          pen.fill(f.shape, rng() < 0.5 ? S.grey : S.mid, 0.45);
          pen.hair(f.shape.slice(3, 7), Math.max(0.4, sz * 0.1), S.white, 0.6);
          pen.hair(f.shape.slice(2, 8), 0.28, S.deep, 0.45);
        });
        // The greater coverts' dark fringe where they lie over the black flight feathers.
        pen.stroke(Array.from({ length: 20 }, (_, i) => wing.at((i / 19) * 0.95, (i / 19 < WRIST ? 0.5 : 0.5 - ((i / 19 - WRIST) / (1 - WRIST)) * 0.26) - 0.04)), 1.6, S.deep, 0.35, false);
      });
      model(d, wing.coverts, 3, S.shadow, { shade: 0.28, hatch: 0.2, lit: 0.1, line: 0 });
      rimLight(d, wing.coverts, S.white, 0.9, 0.35);
    },
  });
}

/** The folded wing on the +y flank: the black primaries stacked back over the rump, the grey covert patch over the shoulder. */
export function paintFoldedWing(d: Draw, rng: Rng, side: 1 | -1, lift = 0): Pt[][] {
  const m = (p: Pt): Pt => pt(p.x, p.y * side);
  const part = lift * 0.04;
  const primaries = Array.from({ length: 5 }, (_, i) => mapBlade(lanceBlade(pt(2 - i * 1.8, 10.5 - i * 0.3), PI + 0.13 + lift * 0.1 - i * (0.015 + part), 36 - i * 2.4, 7, 0.01), m));
  const secondaries = Array.from({ length: 5 }, (_, i) => mapBlade(petalBlade(pt(12 - i * 2.6, 11.5 - i * 0.4), PI + 0.08 + lift * 0.08 + i * 0.02, 24 - i * 1.5, 7.4), m));
  for (const f of primaries) blackFeather(d, f, 7, 0.5);
  for (const f of [...secondaries].reverse()) blackFeather(d, f, 7.4, 0.45);
  const coverts = [
    ...cub(pt(18, 5), pt(18, 10), pt(13, 13.4), pt(5, 13.4), 10),
    ...cub(pt(5, 13.4), pt(-4, 13.2), pt(-9, 10.5), pt(-8, 6.5), 8).slice(1),
    ...bezier(pt(-8, 6.5), pt(5, 4.5), pt(18, 5), 6).slice(1, -1),
  ].map(m);
  greyPlumage(d, coverts, rng, { n: 34, size: 4.4, line: 0.9 });
  return [...primaries, ...secondaries].map((b) => b.shape).concat([coverts]);
}
