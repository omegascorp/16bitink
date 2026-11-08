import type { Rng } from '../../logic/rng';
import { cub, type Draw, pt } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { mix } from '../wash';
import { type Blade, boxOf, glaze, mapBlade, model, rimLight, vane } from '../critters/birdKit';
import { foldedWing } from '../critters/birdCrowParts';
import { buildWing, covertRows, paintWing, type Wing } from '../critters/birdWing';

/**
 * The Crested Serpent Eagle's wings from above: broad and rounded, fingered
 * at the tips, the flight feathers blackish-brown barred paler with a
 * broad greyish band near the trailing edge and dark tips, the coverts
 * dark brown finely spotted white (its "pearled" shoulders). Spread poses
 * after the hawk's wing frame; the folded wing after the crow's.
 */
export const EAGLE = {
  brown: '#4e3524',
  mid: '#6a4a31',
  dark: '#2c1c12',
  deep: '#170e08',
  flight: '#3d2c22',
  band: '#9a8c7c',
  bar: '#1d140e',
  spot: '#f1e8d6',
  buff: '#c7a77c',
  pale: '#efe4cf',
  tail: '#211812',
  tailBand: '#ece5d6',
  black: '#17120f',
  face: '#f0c63a',
  faceDeep: '#b8861a',
  eye: '#f2cf3c',
  cere: '#eebf34',
  bill: '#41464f',
  foot: '#ecc23e',
  talon: '#120e0b',
} as const;

export interface WingShape {
  /** Shoulder, the arm's controls, wrist, the hand's controls and its end. */
  readonly lead: readonly Pt[];
  readonly arm: readonly [number, number];
  readonly hand: readonly [number, number];
  /** Feather lengths: the arm's, the hand's longest, the outermost primary's. */
  readonly chord: readonly [number, number, number];
  readonly fingers: number;
  readonly priW: number;
}

const WRIST = 0.55;
export const covertDepth = (t: number): number => (t < WRIST ? 0.58 : 0.58 - ((t - WRIST) / (1 - WRIST)) * 0.3);

export function wingOf(s: WingShape): Wing {
  const [p0, c0, c1, w, c2, c3, end] = s.lead as [Pt, Pt, Pt, Pt, Pt, Pt, Pt];
  const lead = [...cub(p0, c0, c1, w, 10), ...cub(w, c2, c3, end, 10).slice(1)];
  const [arm, hand, outer] = s.chord;
  return buildWing({
    lead,
    wrist: WRIST,
    dir: (t) => {
      if (t < WRIST) return s.arm[0] + (s.arm[1] - s.arm[0]) * (t / WRIST);
      const u = (t - WRIST) / (1 - WRIST);
      return s.hand[0] + (s.hand[1] - s.hand[0]) * u ** 1.7;
    },
    chord: (t) => {
      if (t < WRIST) return arm * (0.94 + 0.1 * Math.sin((t / WRIST) * Math.PI));
      const u = (t - WRIST) / (1 - WRIST);
      return u < 0.7 ? arm + (hand - arm) * (u / 0.7) : hand + (outer - hand) * ((u - 0.7) / 0.3);
    },
    secondaries: 12,
    primaries: 10,
    secW: 8,
    priW: s.priW,
    coverts: covertDepth,
    fingers: s.fingers,
  });
}

const PI = Math.PI;

/** The wing's spread shapes by pose, for the +y side. */
export const WINGS = {
  soar: { lead: [pt(6, 7), pt(12, 15), pt(15, 28), pt(15, 37), pt(15, 45), pt(13, 52), pt(10, 56)], arm: [PI - 0.02, PI - 0.08], hand: [PI - 0.12, PI / 2 + 0.32], chord: [31, 34, 24], fingers: 6, priW: 9 },
  down: { lead: [pt(6, 7), pt(13, 14), pt(18, 27), pt(18.5, 36), pt(19, 43), pt(18.5, 48), pt(17, 52)], arm: [PI - 0.05, PI - 0.16], hand: [PI - 0.22, PI / 2 + 0.12], chord: [30, 33, 23], fingers: 6, priW: 9 },
  up: { lead: [pt(6, 7), pt(11, 12), pt(14, 20), pt(13.5, 27), pt(12, 32), pt(8, 37), pt(2, 40)], arm: [PI - 0.02, PI - 0.05], hand: [PI - 0.1, PI / 2 + 0.95], chord: [26, 29, 21], fingers: 6, priW: 8.6 },
  stoop: { lead: [pt(9, 6), pt(11, 9), pt(11, 12), pt(9, 13.6), pt(5, 14.2), pt(0, 13.4), pt(-5, 11.8)], arm: [PI + 0.15, PI + 0.2], hand: [PI + 0.22, PI + 0.3], chord: [16, 30, 28], fingers: 0, priW: 5.8 },
  mantle: { lead: [pt(6, 8), pt(11, 14), pt(13, 21), pt(14, 26), pt(16, 31), pt(20, 35), pt(25, 37)], arm: [PI - 0.3, PI - 0.6], hand: [PI / 2 + 0.7, 0.7], chord: [24, 27, 22], fingers: 6, priW: 8.6 },
  /** Struck: flung straight up, seen almost edge-on from above, the hands thrown forward. */
  flung: { lead: [pt(6, 7), pt(10, 10), pt(13, 14), pt(15, 18), pt(17, 21), pt(21, 23), pt(26, 24)], arm: [PI - 0.15, PI - 0.4], hand: [PI - 0.55, PI / 2 + 1.25], chord: [17, 20, 17], fingers: 6, priW: 7.4 },
} as const satisfies Record<string, WingShape>;

/** One flight feather: blackish brown, barred, a broad grey band near its tip, dark at the very tip. */
export function eagleFlight(d: Draw, f: Blade, w: number, primary: boolean, line = primary ? 0.55 : 0.45): void {
  vane(d, f, w, {
    base: primary ? mix(EAGLE.flight, EAGLE.dark, 0.3) : EAGLE.flight,
    alpha: 0.94,
    deep: EAGLE.deep,
    glazes: [EAGLE.mid],
    glazeAlpha: 0.25,
    bars: primary ? 4 : 3,
    bar: EAGLE.bar,
    barAlpha: 0.45,
    tip: EAGLE.band,
    tipFrom: primary ? 0.56 : 0.6,
    tipAlpha: 0.5,
    fringe: primary ? undefined : EAGLE.pale,
    shaft: EAGLE.buff,
    barbs: EAGLE.deep,
    barbAlpha: 0.25,
    lit: EAGLE.buff,
    line,
    lineAlpha: primary ? 0.8 : 0.55,
  });
  // The dark tip beyond the band.
  d.pen.clipped(f.shape, () => d.pen.fill([f.at(0.82, -w), f.at(0.84, w), f.at(1.2, w), f.at(1.2, -w)], EAGLE.deep, 0.65));
}

/** A small covert or body feather: dark brown, and on the coverts a small white spot near its tip. */
export function spotFeather(d: Draw, f: Blade, s: number, r: number, spots: number): void {
  const { pen } = d;
  const tone = r < 0.45 ? EAGLE.brown : r < 0.8 ? EAGLE.mid : EAGLE.dark;
  pen.fill(f.shape, tone, 0.6);
  pen.hair([f.at(0.1, 0), f.at(0.75, 0)], s * 0.16, EAGLE.deep, 0.6);
  pen.hair(f.shape.slice(5, 13), Math.max(0.4, s * 0.1), EAGLE.buff, 0.35);
  pen.hair(f.shape.slice(3, 15), 0.3, EAGLE.deep, 0.55);
  if (r < spots) {
    const p = f.at(0.78, (r - 0.5) * s * 0.2);
    pen.dot(p.x, p.y, Math.max(0.45, s * 0.13), EAGLE.spot, 0.95);
  }
}

/** Paints a spread wing: flight feathers back to front, then rows of white-spotted coverts. */
export function paintEagleWing(d: Draw, w: Wing, rng: Rng): void {
  paintWing(d, w, {
    feather: (x) => eagleFlight(d, x.f, x.w, x.primary),
    coverts: (wing) => {
      const { pen } = d;
      const b = boxOf(wing.coverts);
      pen.fill(wing.coverts, PAPER_FILL, 1);
      pen.fill(wing.coverts, EAGLE.brown, 0.92);
      pen.clipped(wing.coverts, () => {
        glaze(d, b.cx, b.cy, b.rx * 0.7, b.ry * 0.5, 0.5, EAGLE.mid, 0.35);
        covertRows(wing, 4, covertDepth, (t, r) => 6.4 - r * 1.1 - t * 1.4, (f, s, _t, r) => spotFeather(d, f, s, rng(), r >= 1 ? 0.75 : 0.35));
        pen.stroke(Array.from({ length: 20 }, (_, i) => wing.at(i / 19, 0.05)), 2.6, EAGLE.dark, 0.5, false);
      });
      model(d, wing.coverts, 3, EAGLE.deep, { shade: 0.32, hatch: 0.2, lit: 0.1, line: 0 });
      rimLight(d, wing.coverts, EAGLE.pale, 0.9, 0.3);
    },
  });
}

/** The folded wing (perched): the crow's, scaled up to the eagle. */
export interface FoldedEagle {
  readonly prim: Blade[];
  readonly sec: Blade[];
  readonly ter: Blade[];
  readonly coverts: Pt[];
}

export function foldedEagle(side: 1 | -1, lift: number): FoldedEagle {
  const w = foldedWing(lift, side < 0);
  const k = (p: Pt): Pt => pt(p.x * 1.22 + 1, p.y * 1.34);
  return { prim: w.primaries.map((b) => mapBlade(b, k)), sec: w.secondaries.map((b) => mapBlade(b, k)), ter: w.tertials.map((b) => mapBlade(b, k)), coverts: w.coverts.map(k) };
}

export const foldedOutlines = (w: FoldedEagle): Pt[][] => [...w.prim, ...w.sec, ...w.ter].map((b) => b.shape).concat([w.coverts]);

/** Paints a folded wing brown, the shoulder's coverts spotted white. */
export function paintFoldedEagle(d: Draw, rng: Rng, w: FoldedEagle): void {
  for (const f of w.prim) eagleFlight(d, f, 5, true, 0.45);
  for (const f of [...w.sec].reverse()) eagleFlight(d, f, 6, false, 0.45);
  for (const f of w.ter) eagleFlight(d, f, 6.4, false, 0.5);
  const { pen } = d;
  const { coverts } = w;
  pen.fill(coverts, PAPER_FILL, 1);
  pen.fill(coverts, EAGLE.brown, 0.92);
  pen.clipped(coverts, () => {
    const b = boxOf(coverts);
    for (let i = 0; i < 22; i++) {
      const p = pt(b.x0 + rng() * (b.x1 - b.x0), b.y0 + rng() * (b.y1 - b.y0));
      pen.dot(p.x, p.y, 0.55 + rng() * 0.3, EAGLE.spot, 0.85);
      pen.hair([pt(p.x + 1.6, p.y), pt(p.x - 0.6, p.y)], 0.3, EAGLE.deep, 0.5);
    }
  });
  model(d, coverts, 2.5, EAGLE.deep, { shade: 0.35, hatch: 0.18, lit: 0.08, line: 0.7 });
}
