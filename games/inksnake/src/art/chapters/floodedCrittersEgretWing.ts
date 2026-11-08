import type { Rng } from '../../logic/rng';
import { polar } from '../groundKit';
import { bezier, closed, cub, type Draw, pt } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { type Blade, boxOf, coat, glaze, mapBlade, model, petalBlade, rimLight, vane } from '../critters/birdKit';
import { buildWing, covertRows, mirrorY, paintWing, type Wing } from '../critters/birdWing';

/**
 * The great egret's white plumage: feathers painted in white on paper and
 * shaped by cool blue-grey shadow (white birds read by their shade), fine
 * grey vanes, the long lacy breeding plumes (aigrettes) trailing over the
 * tail, the wings folded along the back or spread broad and rounded.
 */
export const EGRET = {
  white: '#fbfaf4',
  warm: '#f1ede0',
  cool: '#c3ccd3',
  shade: '#8994a0',
  deep: '#4f5a67',
  bill: '#e9b62c',
  billDeep: '#a6731a',
  lore: '#c2c86a',
  eye: '#e8c53a',
  leg: '#1f1e22',
  legLit: '#5b5a62',
} as const;

const E = EGRET;

/** One white flight feather: the faintest cool wash, a grey crescent of shade, fine barbs. */
export function egretFeather(d: Draw, f: Blade, w: number, line = 0.4): void {
  vane(d, f, w, {
    base: E.warm,
    alpha: 0.7,
    deep: E.shade,
    glazes: [E.cool],
    glazeAlpha: 0.25,
    shaft: E.cool,
    barbs: E.shade,
    barbAlpha: 0.2,
    lit: PAPER_FILL,
    line,
    lineAlpha: 0.55,
  });
}

/** White plumage over a shape: a coat of small soft feathers edged in grey, cool shade, a crisp contour. */
export function egretPlumage(d: Draw, shape: readonly Pt[], rng: Rng, o: { n: number; size: number; dir?: (p: Pt) => number; line?: number; ruffle?: number }): void {
  const { pen } = d;
  pen.fill(shape, PAPER_FILL, 1);
  pen.fill(shape, E.white, 0.9);
  const b = boxOf(shape);
  pen.clipped(shape, () => {
    glaze(d, b.cx + b.rx * 0.25, b.cy + b.ry * 0.35, b.rx * 0.8, b.ry * 0.6, 0, E.cool, 0.45);
    glaze(d, b.cx - b.rx * 0.3, b.cy - b.ry * 0.3, b.rx * 0.5, b.ry * 0.4, 0, E.warm, 0.6);
  });
  coat(d, shape, rng, {
    dir: o.dir ?? (() => Math.PI),
    n: o.n,
    size: o.size,
    ruffle: o.ruffle,
    paint: ({ f, s, r }) => {
      pen.fill(f.shape, r < 0.5 ? E.white : E.warm, 0.55);
      pen.hair(f.shape.slice(4, 15), Math.max(0.3, s * 0.08), E.cool, 0.6);
      if (r > 0.7) pen.hair([f.at(0.15, 0), f.at(0.6, 0)], 0.22, E.cool, 0.4);
    },
  });
  model(d, shape, Math.max(2.4, Math.min(b.rx, b.ry) * 0.5), E.shade, { shade: 0.34, hatch: 0.16, lit: 0.3, line: 0 });
  rimLight(d, shape, PAPER_FILL, 1, 0.6);
  pen.stroke(closed(shape), o.line ?? 0.8, d.ink, 0.95);
}

/** The aigrettes: long lacy plumes from the back trailing past the tail, each a shaft with fine barbs. */
export function plumes(d: Draw, from: Pt, len: number, spread: number, sway: number): void {
  const { pen } = d;
  for (let i = 0; i < 9; i++) {
    const k = (i / 8 - 0.5) * 2;
    const end = pt(from.x - len * (0.85 + 0.15 * Math.cos(k * 1.4)), from.y + k * spread + sway * (0.6 + 0.4 * Math.abs(k)));
    const shaft = bezier(pt(from.x, from.y + k * spread * 0.3), pt((from.x + end.x) / 2, from.y + k * spread * 0.6 - sway * 0.3), end, 10);
    pen.stroke(shaft, 1.2, PAPER_FILL, 0.45, false);
    for (let j = 2; j < shaft.length - 1; j++) {
      const p = shaft[j]!;
      const q = shaft[j + 1]!;
      const a = Math.atan2(p.y - q.y, p.x - q.x);
      for (const s of [-1, 1]) pen.hair([p, polar(p, a + Math.PI + s * 0.5, 1.6 - j * 0.08)], 0.22, E.shade, 0.35);
    }
    pen.hair(shaft, 0.3, E.shade, 0.6);
  }
}

/** The wings folded along the back: long white primaries reaching past the tail, the coverts over them. */
export function foldedWings(d: Draw, rng: Rng, tip: number): void {
  for (const s of [1, -1]) {
    const f = (p: Pt): Pt => (s > 0 ? p : mirrorY(p));
    const blades = [
      ...Array.from({ length: 4 }, (_, i) => petalBlade(pt(-2 - i * 1.5, 5.2 - i * 0.5), Math.PI - 0.12 + i * 0.05, 14 + tip - i * 1.2, 4.2)),
      ...Array.from({ length: 4 }, (_, i) => petalBlade(pt(5 - i * 2.2, 6 - i * 0.2), Math.PI - 0.05 + i * 0.03, 12 - i * 0.6, 4.6)),
    ].map((b) => mapBlade(b, f));
    for (const b of blades) egretFeather(d, b, 4.4, 0.4);
    const coverts = [...cub(pt(8, 3), pt(9, 6.5), pt(4, 7.6), pt(-3, 7), 10), ...cub(pt(-3, 7), pt(-7, 6.4), pt(-7, 4), pt(-4, 3), 6).slice(1), ...bezier(pt(-4, 3), pt(2, 2.4), pt(8, 3), 5).slice(1, -1)].map(f);
    egretPlumage(d, coverts, rng, { n: 20, size: 2.8, line: 0.5 });
  }
}

/** A spread wing: broad and rounded, the hand's tips only slightly fingered. `down` sweeps it forward and shortens it (the downstroke). */
export function openWing(down: boolean): Wing {
  const P = Math.PI;
  const lead = down
    ? [...cub(pt(4, 5), pt(9, 9), pt(12, 13), pt(12.5, 18), 8), ...cub(pt(12.5, 18), pt(13, 23), pt(12, 27), pt(9, 31), 8).slice(1)]
    : [...cub(pt(4, 5), pt(8, 9.5), pt(10, 15), pt(10, 19.5), 8), ...cub(pt(10, 19.5), pt(10, 25.5), pt(8, 30), pt(3.5, 33.5), 8).slice(1)];
  const wrist = 0.5;
  return buildWing({
    lead,
    wrist,
    dir: (t) => (t < wrist ? P - 0.04 - (t / wrist) * 0.08 : P - 0.14 - ((t - wrist) / (1 - wrist)) ** 1.5 * (down ? 0.75 : 0.95)),
    chord: (t) => (t < wrist ? (down ? 15 : 16.5) * (0.95 + 0.08 * Math.sin((t / wrist) * P)) : (down ? 16 : 18) - ((t - wrist) / (1 - wrist)) ** 2 * 5),
    secondaries: 10,
    primaries: 9,
    secW: 5.2,
    priW: 5.8,
    coverts: (t) => (t < wrist ? 0.55 : 0.55 - (t - wrist) * 0.4),
    fingers: 3,
  });
}

/** Paints a spread wing: white flight feathers back to front, then rows of small coverts. */
export function paintOpenWing(d: Draw, w: Wing, rng: Rng): void {
  paintWing(d, w, {
    feather: (x) => egretFeather(d, x.f, x.w, x.primary ? 0.45 : 0.35),
    coverts: (wing) => {
      const { pen } = d;
      pen.fill(wing.coverts, PAPER_FILL, 1);
      pen.fill(wing.coverts, E.white, 0.9);
      pen.clipped(wing.coverts, () => {
        covertRows(wing, 3, (t) => (t < 0.5 ? 0.55 : 0.55 - (t - 0.5) * 0.4), (t, r) => 4.6 - r * 0.8 - t * 1.2, (f, s) => {
          pen.fill(f.shape, rng() < 0.5 ? E.white : E.warm, 0.6);
          pen.hair(f.shape.slice(3, 10), Math.max(0.3, s * 0.08), E.cool, 0.65);
        });
      });
      model(d, wing.coverts, 2.6, E.shade, { shade: 0.26, hatch: 0.12, lit: 0.2, line: 0 });
      rimLight(d, wing.coverts, PAPER_FILL, 0.9, 0.5);
    },
  });
}
