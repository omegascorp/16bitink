import type { Rng } from '../../logic/rng';
import { bezier, closed, cub, type Draw, pt } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { type Blade, boxOf, coat, glaze, lanceBlade, mapBlade, model, petalBlade, rimLight, vane } from './birdKit';
import { buildWing, covertRows, mapWing, mirrorY, paintWing, type Wing, type WingSpec } from './birdWing';

/**
 * The crow's paint: glossy blue-black plumage, never flat black: a deep
 * blue-black wash, glazes of blue and violet sheen, the small feathers
 * edged in a cool gloss, the far side pooled darker and a cool rim light.
 * Its wings folded along the back (perched) or spread with five fingered
 * primaries (flying). Local units, the crow facing +x, light upper left.
 */
export const CROW_PAINT = {
  black: '#15161f',
  deep: '#030306',
  blue: '#30509c',
  violet: '#55388f',
  teal: '#275f7a',
  gloss: '#8394c0',
  sheen: '#c4d0ef',
  edge: '#5d6b94',
  bill: '#0e0f14',
  foot: '#22242d',
  eye: '#24170f',
} as const;

/** One flight feather, glossed blue and violet, its edges catching the light. */
export function crowFeather(d: Draw, f: Blade, w: number, line = 0.55, sheen = 0.26): void {
  vane(d, f, w, {
    base: CROW_PAINT.black,
    alpha: 0.96,
    deep: CROW_PAINT.deep,
    glazes: [CROW_PAINT.blue, CROW_PAINT.violet, CROW_PAINT.blue],
    glazeAlpha: sheen,
    shaft: CROW_PAINT.edge,
    barbs: CROW_PAINT.edge,
    barbAlpha: 0.22,
    lit: CROW_PAINT.sheen,
    line,
  });
}

/** Glossy plumage over a shape: deep wash, sheen glazes at `spots`, a coat of gloss-edged feathers, volume. */
export function crowPlumage(d: Draw, shape: readonly Pt[], rng: Rng, o: { dir: (p: Pt) => number; n: number; size: number; spots: readonly (readonly [number, number, number, string])[]; line?: number; ruffle?: number }): void {
  const { pen } = d;
  pen.fill(shape, PAPER_FILL, 1);
  pen.fill(shape, CROW_PAINT.black, 0.96);
  pen.clipped(shape, () => {
    for (const [x, y, r, c] of o.spots) glaze(d, x, y, r, r * 0.7, 0.3, c, 0.26);
  });
  coat(d, shape, rng, {
    dir: o.dir,
    n: o.n,
    size: o.size,
    ruffle: o.ruffle,
    paint: ({ f, s, r }) => {
      pen.fill(f.shape, r < 0.5 ? CROW_PAINT.black : CROW_PAINT.deep, 0.3);
      pen.hair(f.shape.slice(7, 14), Math.max(0.3, s * 0.08), r < 0.25 ? CROW_PAINT.sheen : CROW_PAINT.gloss, 0.16 + r * 0.2);
    },
  });
  const b = boxOf(shape);
  pen.clipped(shape, () => glaze(d, b.cx - b.rx * 0.2, b.cy - b.ry * 0.38, b.rx * 0.6, b.ry * 0.36, -0.2, CROW_PAINT.sheen, 0.13));
  model(d, shape, Math.max(2.5, Math.min(b.rx, b.ry) * 0.4), CROW_PAINT.deep, { shade: 0.55, hatch: 0.16, lit: 0, line: 0 });
  rimLight(d, shape, CROW_PAINT.gloss, 0.8, 0.4);
  pen.stroke(closed(shape), o.line ?? 0.85, d.ink, 1);
}

/** The folded wing on the +y side: primaries tucked, secondaries, tertials, the covert patch at the shoulder. */
export interface FoldedWing {
  readonly primaries: readonly Blade[];
  readonly secondaries: readonly Blade[];
  readonly tertials: readonly Blade[];
  readonly coverts: Pt[];
}

const SHOULDER = pt(12, 4.5);

/** Turns a point about the shoulder by `a` (outward for a negative angle on the +y side). */
const turn = (p: Pt, a: number): Pt => {
  const dx = p.x - SHOULDER.x;
  const dy = p.y - SHOULDER.y;
  return pt(SHOULDER.x + dx * Math.cos(a) - dy * Math.sin(a), SHOULDER.y + dx * Math.sin(a) + dy * Math.cos(a));
};

/**
 * The folded wing: the long primaries stacked to a point over the tail,
 * the secondaries and broad tertials lying over them, the covert patch at
 * the shoulder. `lift` (0..1) raises it off the back, the primaries parting.
 */
export function foldedWing(lift: number, mirror: boolean): FoldedWing {
  const part = lift * 0.03;
  const primaries = Array.from({ length: 5 }, (_, i) => lanceBlade(pt(4 - i * 1.6, 6.6 - i * 0.25), Math.PI + 0.11 - i * 0.012 - i * part, 26 - i * 2.2, 4.4, 0.012));
  const secondaries = Array.from({ length: 4 }, (_, i) => petalBlade(pt(11 - i * 2.2, 7.4 - i * 0.4), Math.PI + 0.09 + i * 0.025 - i * part * 0.5, 17.5 - i * 1.5, 5.2));
  const tertials = Array.from({ length: 3 }, (_, i) => petalBlade(pt(3.5 - i * 1.8, 4.6 + i * 0.85), Math.PI + 0.05 + i * 0.02, 12.5 - i * 1.4, 5.4));
  const coverts = [
    ...cub(pt(16, 3), pt(16, 6.8), pt(12.5, 8.9), pt(6.5, 8.9), 10),
    ...cub(pt(6.5, 8.9), pt(1, 8.8), pt(-2.5, 7), pt(-1.5, 4.6), 8).slice(1),
    ...bezier(pt(-1.5, 4.9), pt(7, 3.3), pt(16, 3.4), 6).slice(1, -1),
  ];
  const f = (p: Pt): Pt => {
    const q = turn(p, -lift * 0.2);
    return mirror ? mirrorY(q) : q;
  };
  return { primaries: primaries.map((b) => mapBlade(b, f)), secondaries: secondaries.map((b) => mapBlade(b, f)), tertials: tertials.map((b) => mapBlade(b, f)), coverts: coverts.map(f) };
}

/** Every outline of a folded wing, for the cast shadow. */
export function foldedOutlines(w: FoldedWing): Pt[][] {
  return [...w.primaries, ...w.secondaries, ...w.tertials].map((b) => b.shape).concat([w.coverts]);
}

/** Paints a folded wing, the feathers under the coverts first. */
export function paintFolded(d: Draw, w: FoldedWing, rng: Rng): void {
  for (const f of w.primaries) crowFeather(d, f, 4.4, 0.45, 0.2);
  for (const f of [...w.secondaries].reverse()) crowFeather(d, f, 5.2, 0.45, 0.22);
  for (const f of w.tertials) crowFeather(d, f, 5.4, 0.55, 0.26);
  const b = boxOf(w.coverts);
  crowPlumage(d, w.coverts, rng, { dir: () => Math.PI, n: 26, size: 3, spots: [[b.cx + 2, b.cy - 1, 6, CROW_PAINT.blue], [b.cx - 3, b.cy + 1, 5, CROW_PAINT.violet]], line: 0.75 });
}

/**
 * The spread wing (flying): a broad arm and a hand of fingered primaries,
 * spread like a hand. `up` raises it (the upstroke: foreshortened, the hand
 * flexed back).
 */
function openSpec(up: boolean): WingSpec {
  const lead = up
    ? [...cub(pt(8, 5), pt(12, 9), pt(13.5, 14), pt(12, 18), 8), ...cub(pt(12, 18), pt(10, 21), pt(6, 24), pt(1.5, 26), 8).slice(1)]
    : [...cub(pt(8, 5), pt(12, 11), pt(14, 17), pt(13.5, 22), 8), ...cub(pt(13.5, 22), pt(13, 26), pt(12, 29), pt(10.5, 31.5), 8).slice(1)];
  const wrist = 0.56;
  const outward = up ? 0.85 : 0.22;
  return {
    lead,
    wrist,
    dir: (t) => {
      if (t < wrist) return Math.PI - 0.03 - (t / wrist) * 0.08;
      const u = (t - wrist) / (1 - wrist);
      return Math.PI - 0.11 - u ** 1.9 * (Math.PI / 2 - 0.11 - outward);
    },
    chord: (t) => {
      const k = up ? 0.88 : 1;
      if (t < wrist) return k * (17.5 - (t / wrist) * 1.2);
      const u = (t - wrist) / (1 - wrist);
      return k * (u < 0.75 ? 16.8 + u * 6 : 21.3 - (u - 0.75) * 12);
    },
    secondaries: 10,
    primaries: 8,
    secW: 4.5,
    priW: 5.2,
    coverts: (t) => (t < wrist ? 0.58 : 0.58 - ((t - wrist) / (1 - wrist)) * 0.3),
    fingers: 5,
  };
}

/** Both open wings. */
export function openWings(up: boolean): Wing[] {
  const w = buildWing(openSpec(up));
  return [w, mapWing(w, mirrorY)];
}

/** Paints an open wing: flight feathers back to front, then rows of gloss-edged coverts over their roots. */
export function paintOpen(d: Draw, w: Wing): void {
  paintWing(d, w, {
    feather: (x) => crowFeather(d, x.f, x.w, 0.5, x.primary ? 0.22 : 0.28),
    coverts: (wing) => {
      const b = boxOf(wing.coverts);
      d.pen.fill(wing.coverts, PAPER_FILL, 1);
      d.pen.fill(wing.coverts, CROW_PAINT.black, 0.96);
      d.pen.clipped(wing.coverts, () => {
        glaze(d, b.cx, b.cy, b.rx * 0.8, b.ry * 0.5, 0.4, CROW_PAINT.blue, 0.22);
        glaze(d, b.cx - 2, b.cy + 4, b.rx * 0.5, b.ry * 0.35, 0.4, CROW_PAINT.violet, 0.22);
        covertRows(wing, 3, (t) => (t < 0.56 ? 0.58 : 0.58 - ((t - 0.56) / 0.44) * 0.3), (t, r) => 4.4 - r * 0.9 - t * 0.8, (f, s, _t, r) => {
          d.pen.fill(f.shape, CROW_PAINT.black, 0.5);
          d.pen.clipped(f.shape, () => glaze(d, f.at(0.5, 0).x, f.at(0.5, 0).y, s * 0.7, s * 0.5, 0, r === 0 ? CROW_PAINT.blue : CROW_PAINT.violet, 0.24));
          d.pen.hair(f.shape.slice(5, 12), 0.4, CROW_PAINT.gloss, 0.32);
          d.pen.hair(f.shape.slice(3, 14), 0.3, CROW_PAINT.deep, 0.6);
        });
        glaze(d, b.cx - b.rx * 0.2, b.cy - b.ry * 0.3, b.rx * 0.5, b.ry * 0.3, 0.6, CROW_PAINT.sheen, 0.1);
      });
      model(d, wing.coverts, 2.5, CROW_PAINT.deep, { shade: 0.4, hatch: 0.12, lit: 0.05, line: 0 });
      rimLight(d, wing.coverts, CROW_PAINT.gloss, 0.8, 0.4);
    },
  });
}
