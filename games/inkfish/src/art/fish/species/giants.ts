import type { SpeciesId } from '../../../levels/types';
import { ellipse, type Pt } from '../../pen';
import {
  backStipple, bezier, bottomAt, C, gillSlits, PAPER_FILL, ring, spots, topAt, xAt, type Anatomy, type Kit,
} from '../kit';
import {
  biteScars, brokenStripes, healedScar, mirrorScales, oldFly, oldHook, remora, sword, tear,
} from './giantDetails';

// ---------------------------------------------------------------- local helpers

/** A fin membrane like the engine's: paper, faint wash, rays fanning from `root`, an outline. */
function membrane(k: Kit, shape: Pt[], root: Pt, rays: number, wash?: string): void {
  const { pen, a, heavy, ink } = k;
  pen.fill(shape, PAPER_FILL, 1);
  pen.fill(shape, wash ?? a.finWash ?? a.wash, heavy ? 0.32 : 0.2);
  for (let i = 1; i < rays; i++) {
    const p = shape[Math.round((i / rays) * (shape.length - 1))]!;
    pen.hair([root, p], 0.5, ink, 0.55);
  }
  pen.stroke([...shape, shape[0]!], 1.2, ink, 1, false);
}

/**
 * A stiff swept-back shark fin: convex leading edge, concave trailing edge.
 * `dir` is the sweep direction (unit-ish vector from root towards the tip).
 */
export function sickle(k: Kit, root: Pt, tip: Pt, chord: number, wash?: string, alpha?: number): void {
  const back = { x: root.x - chord, y: root.y };
  const lead = { x: (root.x + tip.x) / 2 + (tip.y - root.y) * 0.18, y: (root.y + tip.y) / 2 - (tip.x - root.x) * 0.18 };
  const trail = { x: (back.x + tip.x) / 2 + (tip.y - back.y) * -0.12, y: (back.y + tip.y) / 2 + (tip.x - back.x) * 0.12 };
  const shape = [...bezier(root, lead, tip, 10), ...bezier(tip, trail, back, 10)];
  const { pen, a, heavy, ink } = k;
  pen.fill(shape, PAPER_FILL, 1);
  pen.fill(shape, wash ?? a.finWash ?? a.wash, alpha ?? (heavy ? 0.42 : 0.3));
  pen.clipped(shape, () => {
    for (let i = 1; i < 7; i++) {
      const f = i / 7;
      pen.hair([{ x: root.x - chord * f, y: root.y }, { x: tip.x + (root.x - chord * f - root.x) * 0.15, y: tip.y }], 0.45, ink, 0.35);
    }
  });
  pen.stroke([...shape, shape[0]!], 1.3, ink, 1, false);
}

/** Underslung shark mouth: a crescent under the snout. */
export function sharkMouth(k: Kit, at: number, width: number): void {
  const x = k.x(at);
  const y = bottomAt(k.a, at) - 3;
  k.pen.stroke(bezier({ x: x + width * 0.5, y: y - 1 }, { x, y: y + 2.5 }, { x: x - width * 0.5, y: y - 2 }, 8), 1.1, k.ink, 1, false);
  k.pen.hair([{ x: k.x(0.04), y: C + k.h(0.04) * 0.1 }, { x: k.x(0.06) - 2, y: C + k.h(0.06) * 0.25 }], 0.7, k.ink, 0.9);
}

/** The upper lobe trailing edge of the engine's 'shark' tail, for a dark margin. */
function sharkTailEdge(a: Anatomy): Pt[] {
  const x0 = xAt(a, 1) + 3;
  const L = a.hh * a.tailSize;
  const S = L * 0.85;
  return [
    ...bezier({ x: x0 - L * 1.15, y: C - S * 1.25 }, { x: x0 - L * 0.75, y: C - S * 0.2 }, { x: x0 - L * 0.5, y: C + S * 0.05 }, 10),
    ...bezier({ x: x0 - L * 0.5, y: C + S * 0.05 }, { x: x0 - L * 0.6, y: C + S * 0.45 }, { x: x0 - L * 0.42, y: C + S * 0.62 }, 6),
  ];
}

/**
 * A coelacanth limb: a fleshy, scaled stalk from `root` along `ang` with a
 * fan of rays at the end. `side` bends the fan (1 down/back, -1 up/back).
 */
function lobedFin(k: Kit, root: Pt, ang: number, stalk: number, fan: number, width: number): void {
  const { pen, a, ink, heavy } = k;
  const d = { x: Math.cos(ang), y: Math.sin(ang) };
  const n = { x: -d.y, y: d.x };
  const end = { x: root.x + d.x * stalk, y: root.y + d.y * stalk };
  // Ray fan beyond the stalk.
  const fanTip = { x: end.x + d.x * fan, y: end.y + d.y * fan };
  const fanShape = [
    { x: end.x + n.x * width * 0.45, y: end.y + n.y * width * 0.45 },
    ...bezier(
      { x: end.x + n.x * width * 0.9, y: end.y + n.y * width * 0.9 },
      { x: fanTip.x + n.x * width * 1.1, y: fanTip.y + n.y * width * 1.1 },
      fanTip, 8,
    ),
    ...bezier(
      fanTip,
      { x: fanTip.x - n.x * width * 1.1, y: fanTip.y - n.y * width * 1.1 },
      { x: end.x - n.x * width * 0.9, y: end.y - n.y * width * 0.9 }, 8,
    ),
    { x: end.x - n.x * width * 0.45, y: end.y - n.y * width * 0.45 },
  ];
  membrane(k, fanShape, end, 9);
  // Fleshy lobe.
  const w = width * 0.55;
  const lobe = [
    ...bezier({ x: root.x + n.x * w, y: root.y + n.y * w }, { x: (root.x + end.x) / 2 + n.x * w * 1.3, y: (root.y + end.y) / 2 + n.y * w * 1.3 }, { x: end.x + d.x * 3, y: end.y + d.y * 3 }, 8),
    ...bezier({ x: end.x + d.x * 3, y: end.y + d.y * 3 }, { x: (root.x + end.x) / 2 - n.x * w * 1.3, y: (root.y + end.y) / 2 - n.y * w * 1.3 }, { x: root.x - n.x * w, y: root.y - n.y * w }, 8),
  ];
  pen.fill(lobe, PAPER_FILL, 1);
  pen.fill(lobe, a.wash, heavy ? 0.5 : 0.38);
  pen.clipped(lobe, () => {
    for (let i = 1; i < 5; i++) {
      const f = i / 5;
      const c = { x: root.x + (end.x - root.x) * f, y: root.y + (end.y - root.y) * f };
      pen.hair(bezier({ x: c.x + n.x * w * 1.4, y: c.y + n.y * w * 1.4 }, { x: c.x + d.x * 3, y: c.y + d.y * 3 }, { x: c.x - n.x * w * 1.4, y: c.y - n.y * w * 1.4 }, 5), 0.45, ink, 0.55);
    }
  });
  pen.stroke([...lobe, lobe[0]!], 1.2, ink, 1, false);
}

/** Irregular mottling: soft blotches of `color` scattered over the flank. */
function mottle(k: Kit, count: number, r: readonly [number, number], color: string, alpha: number, from = 0.08, to = 0.95): void {
  k.pen.clipped(k.body, () => {
    for (let i = 0; i < count; i++) {
      const t = from + k.pen.rng() * (to - from);
      const y = C + k.h(t) * (k.pen.rng() * 1.9 - 0.95);
      const rr = r[0] + k.pen.rng() * (r[1] - r[0]);
      const blob = ellipse(k.x(t), y, rr * (1 + k.pen.rng() * 0.6), rr * (0.6 + k.pen.rng() * 0.4), 9).map((p) => ({ x: p.x + k.pen.jitter(rr * 0.25), y: p.y + k.pen.jitter(rr * 0.25) }));
      k.pen.fill(blob, color, alpha);
    }
  });
}

/** Big, plate-like scales in staggered rows (tarpon, coelacanth). */
function bigScales(k: Kit, s: number, from: number, to: number, alpha: number): void {
  const { a, pen, ink } = k;
  pen.clipped(k.body, () => {
    let row = 0;
    for (let v = -0.95; v <= 0.95; v += (s * 1.15) / a.hh, row++) {
      for (let t = from + (row % 2) * (s / (2 * a.hl)) * 0.85; t < to; t += (s * 1.6) / (2 * a.hl)) {
        const x = xAt(a, t);
        const y = C + k.h(t) * v;
        const arc: Pt[] = [];
        for (let i = 0; i <= 8; i++) {
          const ang = -Math.PI / 2 + (i / 8) * Math.PI;
          arc.push({ x: x - Math.cos(ang) * s * 0.8, y: y + Math.sin(ang) * s * 0.7 });
        }
        pen.hair(arc, 0.55, ink, alpha);
        pen.hair([{ x: x - s * 0.15, y: y - s * 0.25 }, { x: x - s * 0.55, y: y - s * 0.15 }], 0.4, ink, alpha * 0.5);
      }
    }
  });
}

// ---------------------------------------------------------------- the giants

/** Chapter giants: one boss species per chapter, never seen elsewhere. */
export const GIANTS: Partial<Record<SpeciesId, Anatomy>> = {
  bass: {
    // An old striped bass that has seen some summers: a jutting lower jaw, a
    // scaled flank ruled by broken stripes, a torn tail, a healed scar, and the
    // rusty hook of the one angler who nearly had it, still in its lip.
    hl: 88, hh: 31, peak: 0.36, blunt: 0.45, peduncle: 0.32, tail: 'fork', tailSize: 1.15,
    dorsal: { from: 0.24, to: 0.44, height: 0.85, spiny: true }, dorsal2: { from: 0.5, to: 0.7, height: 0.7 },
    anal: { from: 0.6, to: 0.76, height: 0.6 }, pectoral: 0.5, pelvic: true, scales: false,
    eye: { t: 0.12, r: 7 }, mouth: 'none', wash: '#7f909c', finWash: '#a6b2b8',
    extras: (k) => {
      // Dark olive back fading to a pale belly.
      k.pen.clipped(k.body, () => {
        for (let t = 0.02; t < 1; t += 0.04) k.pen.fill(ellipse(k.x(t), topAt(k.a, t) + 2, 9, k.h(t) * 0.55, 8), '#56636a', 0.07);
        for (let t = 0.1; t < 0.9; t += 0.05) k.pen.fill(ellipse(k.x(t), bottomAt(k.a, t) - k.h(t) * 0.2, 8, k.h(t) * 0.3, 8), PAPER_FILL, 0.18);
      });
      backStipple(1.3)(k);
      bigScales(k, 4.2, 0.18, 0.98, 0.32);
      brokenStripes(k, [-0.8, -0.58, -0.37, -0.16, 0.06, 0.27, 0.47, 0.65], 0.22, 0.96);
      healedScar(k, 0.42, -0.1);
      // Gill cover: a serrated edge in front and a flat spine at the back corner.
      const gx = k.x(0.22);
      const edge = bezier({ x: gx + 4, y: C - k.h(0.22) * 0.6 }, { x: gx - 2, y: C + k.h(0.22) * 0.1 }, { x: gx + 7, y: C + k.h(0.22) * 0.72 }, 10);
      k.pen.hair(edge, 0.7, k.ink, 0.8);
      for (let i = 2; i < edge.length - 1; i += 2) k.pen.hair([edge[i]!, { x: edge[i]!.x - 2, y: edge[i]!.y + 1 }], 0.45, k.ink, 0.6);
      // ...on the rearmost point of the cover's curve (see fishArt gills).
      const corner = { x: k.x(0.27) + 1 - k.h(0.27) * 0.16, y: C + 1 };
      const spine = [{ x: corner.x + 1, y: corner.y - 2.2 }, { x: corner.x - 4.5, y: corner.y }, { x: corner.x + 1, y: corner.y + 2.2 }];
      k.pen.fill(spine, k.a.wash, 0.6);
      k.pen.hair(spine, 0.6, k.ink, 0.9);
      // A bite out of the soft dorsal and a ragged notch in the tail.
      tear(k, { x: k.x(0.6), y: topAt(k.a, 0.6) - k.a.hh * 0.68 }, 6);
      tear(k, { x: k.x(1) - k.a.hh * 0.62, y: C + k.a.hh * 0.62 }, 5);
    },
    face: (k) => {
      // The big jaw: the gape reaches back under the eye and the lower jaw juts past the snout.
      const nose = { x: k.x(0), y: C + 1 };
      k.pen.stroke(bezier({ x: nose.x + 2.5, y: C + 3 }, { x: k.x(0.06), y: C + 7.5 }, { x: k.x(0.15), y: C + 4.5 }, 9), 1.3, k.ink, 1, false);
      k.pen.stroke(bezier({ x: nose.x - 1, y: C - 0.5 }, { x: k.x(0.05), y: C + 2.5 }, { x: k.x(0.14), y: C + 3.5 }, 8), 0.9, k.ink, 0.9, false);
      // The upper jawbone, a long plate ending under the eye.
      k.pen.hair(bezier({ x: k.x(0.05), y: C - 1 }, { x: k.x(0.1), y: C + 1.5 }, { x: k.x(0.155), y: C + 2 }, 6), 0.6, k.ink, 0.7);
      oldHook(k, { x: k.x(0.035), y: C + 4.5 });
    },
  },
  tarpon: {
    // Silver king: armour of huge silver scales, an upturned jaw, a long whip off the dorsal.
    hl: 84, hh: 32, peak: 0.38, blunt: 0.35, peduncle: 0.3, tail: 'fork', tailSize: 1.2,
    dorsal: { from: 0.46, to: 0.58, height: 1.0 }, anal: { from: 0.66, to: 0.8, height: 0.7 },
    pectoral: 0.5, pelvic: true, scales: false, eye: { t: 0.12, r: 7.5 }, mouth: 'small',
    wash: '#93a3ad', finWash: '#b8c3c8',
    under: (k) => {
      // The last dorsal ray drawn out into a long filament trailing over the back.
      const root = { x: k.x(0.58), y: topAt(k.a, 0.58) - 2 };
      const tip = { x: k.x(0.98), y: topAt(k.a, 0.95) - 26 };
      k.pen.stroke(bezier(root, { x: k.x(0.8), y: topAt(k.a, 0.6) - 34 }, tip, 14), 1, k.ink, 1, false);
      // Jutting lower jaw, angled upward past the snout.
      const nose = k.x(0);
      const chin = { x: nose + 8, y: C - 8 };
      const jaw = [
        ...bezier({ x: k.x(0.2), y: bottomAt(k.a, 0.2) - 2 }, { x: nose - 4, y: C + 12 }, chin, 10),
        { x: chin.x - 2, y: chin.y - 2 }, { x: k.x(0.1), y: C + 1 },
      ];
      k.pen.fill(jaw, PAPER_FILL, 1);
      k.pen.fill(jaw, '#93a3ad', 0.3);
      k.pen.stroke([...jaw, jaw[0]!], 1.3, k.ink, 1, false);
    },
    extras: (k) => {
      // Blue-grey back, mirror flanks.
      k.pen.clipped(k.body, () => {
        const back: Pt[] = [];
        for (let t = 0; t <= 1.001; t += 0.04) back.push({ x: k.x(t), y: C - k.h(t) * 0.45 });
        k.pen.fill([...back, ...[...back].reverse().map((p) => ({ x: p.x, y: C - 80 }))], '#4d6a80', 0.35);
      });
      mirrorScales(k, 9, 0.24, 1);
      // Big silver gill plate, finely striated, edged in a pale rim.
      const gx = k.x(0.25);
      const plate = bezier({ x: gx + 3, y: C - k.h(0.25) * 0.7 }, { x: gx - k.h(0.25) * 0.42, y: C + 2 }, { x: gx + 5, y: C + k.h(0.25) * 0.75 }, 12);
      k.pen.clipped(k.body, () => {
        for (let i = 1; i < plate.length - 1; i += 1) k.pen.hair([{ x: k.x(0.17), y: C + 1 }, plate[i]!], 0.35, k.ink, 0.35);
      });
      k.pen.stroke(plate, 1.1, k.ink, 1, false);
      k.pen.hair(plate.map((p) => ({ x: p.x - 1.6, y: p.y })), 0.9, PAPER_FILL, 0.9);
      // The throat plate between the jaws, a bony shield.
      k.pen.hair(bezier({ x: k.x(0.02), y: C + 6 }, { x: k.x(0.09), y: C + 13 }, { x: k.x(0.17), y: bottomAt(k.a, 0.17) - 3 }, 8), 0.6, k.ink, 0.75);
      // Upturned mouth line from the chin up and back under the eye.
      k.pen.stroke(bezier({ x: k.x(0) + 4, y: C - 8 }, { x: k.x(0.06), y: C - 1 }, { x: k.x(0.12), y: C + 3 }, 8), 1.2, k.ink, 1, false);
      k.pen.hair(bezier({ x: k.x(0.12), y: C + 3 }, { x: k.x(0.08), y: C + 8 }, { x: k.x(0.03), y: C + 5 }, 6), 0.6, k.ink, 0.7);
    },
    face: (k) => {
      // A big golden eye, the silver king's.
      const ex = k.x(k.a.eye.t);
      const ey = C - k.h(k.a.eye.t) * 0.3;
      k.pen.stroke(ellipse(ex, ey, k.a.eye.r * 1.1, k.a.eye.r * 1.1, 16), 1.6, '#c9a54a', 0.75, false);
      oldFly(k, { x: k.x(0.11), y: C + 3 });
    },
  },
  lingcod: {
    // Lingcod: a cavern of a mouth set with fangs, a big head, mottled kelp-brown and green
    // so it vanishes on the bottom, one long notched dorsal and fan-like fins, all spotted.
    hl: 92, hh: 28, peak: 0.28, blunt: 0.55, peduncle: 0.3, tail: 'round', tailSize: 0.95,
    dorsal: { from: 0.26, to: 0.54, height: 0.6, spiny: true }, dorsal2: { from: 0.55, to: 0.92, height: 0.65 },
    anal: { from: 0.55, to: 0.92, height: 0.55 }, pectoral: 0.85, pelvic: true, scales: false,
    eye: { t: 0.12, r: 6 }, mouth: 'none', wash: '#5f6a3c', finWash: '#7d7a4e',
    extras: (k) => {
      // An olive ground under everything, darker along the back.
      k.pen.clipped(k.body, () => {
        k.pen.fill(k.body, '#5a6138', 0.2);
        for (let t = 0.02; t < 1; t += 0.05) k.pen.fill(ellipse(k.x(t), topAt(k.a, t) + 2, 9, k.h(t) * 0.6, 8), '#3d3a22', 0.08);
      });
      // Marbled camouflage: big dark blotches ringed in ink, kelp-green patches, copper flecks.
      mottle(k, 22, [4, 9], '#3d3220', 0.42);
      mottle(k, 16, [3, 7], '#6f8a4a', 0.35, 0.05, 0.95);
      mottle(k, 18, [1.5, 3.5], '#c08a4a', 0.5, 0.2, 0.9);
      k.pen.clipped(k.body, () => {
        for (let i = 0; i < 12; i++) {
          const t = 0.22 + k.pen.rng() * 0.72;
          const y = C + k.h(t) * (k.pen.rng() * 1.4 - 0.85);
          const r = 3 + k.pen.rng() * 3.5;
          k.pen.hair(ellipse(k.x(t), y, r * 1.3, r, 10).map((p) => ({ x: p.x + k.pen.jitter(1), y: p.y + k.pen.jitter(1) })), 0.45, k.ink, 0.5);
        }
        // A pale, speckled belly.
        for (let t = 0.12; t < 0.9; t += 0.05) k.pen.fill(ellipse(k.x(t), bottomAt(k.a, t) - 3, 7, 4, 7), PAPER_FILL, 0.25);
      });
      backStipple(1.4)(k);
      // Dark spots along the fins' bases.
      for (let t = 0.3; t < 0.9; t += 0.045) k.pen.dot(k.x(t), topAt(k.a, t) - 3, 1.3, k.ink, 0.55);
      for (let t = 0.58; t < 0.9; t += 0.06) k.pen.dot(k.x(t), bottomAt(k.a, t) + 3, 1.2, k.ink, 0.5);
    },
    face: (k) => {
      // The gape: a long jaw line running back behind the eye, the lower jaw jutting.
      const nose = k.x(0);
      const corner = { x: k.x(0.2), y: C + 3 };
      const upper = bezier({ x: nose + 1, y: C }, { x: k.x(0.09), y: C + 0.5 }, corner, 12);
      const lower = bezier({ x: nose + 4, y: C + 6 }, { x: k.x(0.09), y: C + 13 }, corner, 12);
      k.pen.fill([...upper, ...[...lower].reverse()], '#3a1f1a', 0.75);
      // Fangs: big ones near the front, rows of little ones behind.
      for (let i = 1; i < upper.length - 2; i++) {
        const big = i < 4;
        const p = upper[i]!;
        k.pen.fill([{ x: p.x - 1.1, y: p.y }, { x: p.x, y: p.y + (big ? 4.2 : 2.2) }, { x: p.x + 1.1, y: p.y }], PAPER_FILL, 1);
        const q = lower[i]!;
        k.pen.fill([{ x: q.x - 1, y: q.y }, { x: q.x + 0.3, y: q.y - (big ? 3.6 : 2) }, { x: q.x + 1, y: q.y }], PAPER_FILL, 1);
      }
      k.pen.stroke(upper, 1.2, k.ink, 1, false);
      k.pen.stroke(lower, 1.4, k.ink, 1, false);
      // A fleshy flap of skin above the eye.
      const ex = k.x(k.a.eye.t);
      const ey = C - k.h(k.a.eye.t) * 0.3 - k.a.eye.r;
      const flap = [{ x: ex - 3, y: ey + 1 }, { x: ex - 1, y: ey - 6 }, { x: ex + 1, y: ey - 3.5 }, { x: ex + 2.5, y: ey - 7.5 }, { x: ex + 4, y: ey + 1 }];
      k.pen.fill(flap, '#7d7a4e', 0.8);
      k.pen.hair(flap, 0.6, k.ink, 0.9);
    },
  },
  grouper: {
    // Goliath grouper: massive and broad-headed, small eyes, rounded fins, mottled brown with dark oblique bars.
    hl: 82, hh: 50, peak: 0.38, blunt: 0.75, peduncle: 0.38, tail: 'round', tailSize: 0.75,
    dorsal: { from: 0.26, to: 0.56, height: 0.32, spiny: true }, dorsal2: { from: 0.56, to: 0.86, height: 0.45 },
    anal: { from: 0.66, to: 0.86, height: 0.45 }, pectoral: 0.45, pelvic: true, scales: true,
    eye: { t: 0.15, r: 4.5 }, mouth: 'small', wash: '#7a6a48', finWash: '#8f7d58',
    extras: (k) => {
      mottle(k, 40, [3, 8], '#3e3220', 0.28);
      // Five dark oblique bars.
      k.pen.clipped(k.body, () => {
        for (let b = 0; b < 5; b++) {
          const t0 = 0.2 + b * 0.15;
          for (let t = t0; t < t0 + 0.05; t += 0.006) {
            k.pen.hair([{ x: k.x(t) + 6, y: topAt(k.a, t) }, { x: k.x(t) - 10, y: bottomAt(k.a, t) }], 0.5, '#3e3220', 0.55);
          }
        }
      });
      // Black spots on the head and fins.
      spots(k, 14, [0.9, 1.6], '#2b2418', { from: 0.04, to: 0.28, outline: false, alpha: 0.75 });
      // Wide mouth with a heavy, jutting lower lip.
      const nx = k.x(0);
      k.pen.stroke(bezier({ x: nx - 1, y: C + 3 }, { x: k.x(0.08), y: C + 12 }, { x: k.x(0.2), y: C + 10 }, 10), 1.5, k.ink, 1, false);
      k.pen.hair(bezier({ x: nx - 2, y: C + 8 }, { x: k.x(0.08), y: C + 17 }, { x: k.x(0.18), y: C + 14 }, 8), 0.6, k.ink, 0.7);
      backStipple(0.9)(k);
      // Fat, pale lips, and three flat spines at the back of the gill cover.
      k.pen.stroke(bezier({ x: nx - 1, y: C + 4.5 }, { x: k.x(0.08), y: C + 13.5 }, { x: k.x(0.2), y: C + 11.5 }, 10), 1.6, PAPER_FILL, 0.6, false);
      const gx = k.x(0.3) - k.h(0.3) * 0.12;
      for (const dy of [-6, 0, 6]) {
        const spine = [{ x: gx + 2, y: C + dy - 2 }, { x: gx - 4, y: C + dy }, { x: gx + 2, y: C + dy + 2 }];
        k.pen.fill(spine, '#8f7d58', 0.7);
        k.pen.hair(spine, 0.6, k.ink, 0.85);
      }
    },
  },
  shark: {
    // Grey reef shark: torpedo with a pointed snout, gill slits, a tall stiff dorsal, black-edged
    // fins. This one is an old hunter: a dark back over a white belly, pale bite scars, a nick in
    // its dorsal, a mean underslung mouth, and a remora riding under its belly.
    hl: 84, hh: 23, peak: 0.38, blunt: 0.32, peduncle: 0.25, tail: 'shark', tailSize: 1.35,
    dorsal: { from: 0.34, to: 0.48, height: 1.4, tri: true }, dorsal2: { from: 0.76, to: 0.81, height: 0.45, tri: true },
    anal: { from: 0.78, to: 0.83, height: 0.4, tri: true }, pectoral: 0, pelvic: false, scales: false,
    eye: { t: 0.13, r: 4.5 }, mouth: 'none', wash: '#6e7a84', finWash: '#5d6871', gills: 'slits', lateral: false,
    under: (k) => {
      sickle(k, { x: k.x(0.62), y: bottomAt(k.a, 0.62) - 3 }, { x: k.x(0.72), y: bottomAt(k.a, 0.62) + 13 }, 13);
      remora(k, k.x(0.5), bottomAt(k.a, 0.5) + 2);
    },
    extras: (k) => {
      // Countershading: slate back, white belly, a soft line between.
      k.pen.clipped(k.body, () => {
        const line: Pt[] = [];
        for (let t = 0; t <= 1.001; t += 0.04) line.push({ x: k.x(t), y: C + k.h(t) * 0.18 });
        k.pen.fill([...line, ...[...line].reverse().map((p) => ({ x: p.x, y: C - 60 }))], '#46525c', 0.42);
        k.pen.fill([...line, ...[...line].reverse().map((p) => ({ x: p.x, y: C + 60 }))], PAPER_FILL, 0.55);
        k.pen.hair(line, 0.5, k.ink, 0.35);
        // Skin like sandpaper: fine denticle stipple.
        for (let i = 0; i < 260; i++) {
          const t = 0.05 + k.pen.rng() * 0.9;
          k.pen.dot(k.x(t), C - k.h(t) * k.pen.rng(), 0.35, k.ink, 0.35);
        }
      });
      backStipple(1.2)(k);
      gillSlits(k, 0.22);
      biteScars(k, 0.45, -0.1);
      // Black trailing edge on the tail.
      k.pen.stroke(sharkTailEdge(k.a), 3.4, '#2a2d33', 0.85, false);
      // Long sickle pectoral with a dark tip.
      const tip = { x: k.x(0.48), y: bottomAt(k.a, 0.3) + 24 };
      sickle(k, { x: k.x(0.3), y: C + k.h(0.3) * 0.5 }, tip, 15, '#5d6871');
      k.pen.fill([tip, { x: tip.x + 6, y: tip.y - 7 }, { x: tip.x + 1, y: tip.y - 9 }], '#2a2d33', 0.85);
      tear(k, { x: k.x(0.44), y: topAt(k.a, 0.44) - k.a.hh * 0.6 }, 4);
    },
    face: (k) => {
      // A mean underslung mouth with a row of teeth showing, and the flat, dark eye of a shark.
      const x = k.x(0.12);
      const y = bottomAt(k.a, 0.12) - 3;
      const lip = bezier({ x: x + 8, y: y - 2 }, { x, y: y + 3 }, { x: x - 9, y: y - 1 }, 10);
      for (let i = 1; i < lip.length - 1; i++) {
        const p = lip[i]!;
        k.pen.fill([{ x: p.x - 0.9, y: p.y - 0.4 }, { x: p.x, y: p.y + 2 }, { x: p.x + 0.9, y: p.y - 0.4 }], PAPER_FILL, 1);
      }
      k.pen.stroke(lip, 1.2, k.ink, 1, false);
      k.pen.hair([{ x: k.x(0.04), y: C + k.h(0.04) * 0.1 }, { x: k.x(0.06) - 2, y: C + k.h(0.06) * 0.25 }], 0.7, k.ink, 0.9);
      const ex = k.x(k.a.eye.t);
      const ey = C - k.h(k.a.eye.t) * 0.3;
      k.pen.fill(ellipse(ex, ey, k.a.eye.r * 0.85, k.a.eye.r * 0.8, 12), '#15161a', 0.95);
      k.pen.dot(ex + 1.2, ey - 1.2, 0.9, PAPER_FILL, 0.95);
    },
  },
  swordfish: {
    // Swordfish: a long flat sword, tall crescent dorsal, scaleless dark back, stiff lunate tail.
    hl: 74, hh: 26, peak: 0.36, blunt: 0.25, peduncle: 0.14, tail: 'lunate', tailSize: 1.8,
    dorsal: { from: 0.22, to: 0.36, height: 1.7, tri: true }, dorsal2: { from: 0.86, to: 0.9, height: 0.35, tri: true },
    anal: { from: 0.8, to: 0.86, height: 0.45, tri: true }, pectoral: 0, pelvic: false, scales: false,
    eye: { t: 0.11, r: 6 }, mouth: 'small', wash: '#4c5a70', finWash: '#5d6b80', lateral: false,
    extras: (k) => {
      // Dark bronze back, pale belly.
      k.pen.clipped(k.body, () => {
        const back: Pt[] = [];
        for (let t = 0; t <= 1.001; t += 0.04) back.push({ x: k.x(t), y: C + k.h(t) * 0.05 });
        k.pen.fill([...back, ...[...back].reverse().map((p) => ({ x: p.x, y: C - 80 }))], '#3a4558', 0.4);
      });
      // A bronze-purple sheen along the back, in long streaks.
      k.pen.clipped(k.body, () => {
        for (let i = 0; i < 9; i++) {
          const y = C - k.a.hh * (0.15 + i * 0.08);
          k.pen.hair([{ x: k.x(0.08), y }, { x: k.x(0.95), y: y + 2 }], 1.4, i % 2 ? '#6b4f7a' : '#7a6a4a', 0.18);
        }
      });
      backStipple(1.3)(k);
      sword(k, 46, 4.5);
      // Keel on the tail stalk.
      k.pen.stroke([{ x: k.x(0.88), y: C }, { x: k.x(1) - 1, y: C }], 1.4, k.ink, 1, false);
      sickle(k, { x: k.x(0.28), y: C + k.h(0.28) * 0.55 }, { x: k.x(0.5), y: bottomAt(k.a, 0.3) + 20 }, 12, '#3a4558', 0.5);
    },
    face: (k) => {
      // The huge eye of a deep hunter: a wide blue iris around a black pupil.
      const ex = k.x(k.a.eye.t);
      const ey = C - k.h(k.a.eye.t) * 0.3;
      k.pen.fill(ellipse(ex, ey, k.a.eye.r * 0.95, k.a.eye.r * 0.95, 14), '#2f6f9a', 0.8);
      k.pen.fill(ellipse(ex, ey, k.a.eye.r * 0.5, k.a.eye.r * 0.5, 12), '#111216', 1);
      k.pen.dot(ex + 1.6, ey - 1.6, 1.1, PAPER_FILL, 0.95);
      k.pen.stroke(ellipse(ex, ey, k.a.eye.r * 1.05, k.a.eye.r * 1.05, 16), 0.9, k.ink, 1, false);
    },
  },
  oarfish: {
    // Oarfish: an endless silver ribbon with a scarlet dorsal fin and a crest of long red rays on the head.
    hl: 114, hh: 12, peak: 0.25, blunt: 0.6, peduncle: 0.18, tail: 'point', tailSize: 0,
    dorsal: { from: 0.04, to: 1, height: 1.0 }, pectoral: 0.4, pelvic: false, scales: false,
    eye: { t: 0.06, r: 4 }, mouth: 'small', wash: '#a5b0b8', finWash: '#c0392b', lateral: false, wave: 7,
    under: (k) => {
      // Crest: long red rays sweeping back from the forehead.
      for (let i = 0; i < 8; i++) {
        const t = 0.035 + i * 0.012;
        const root = { x: k.x(t), y: topAt(k.a, t) };
        const len = 34 - i * 2.5;
        const tip = { x: root.x - len * 0.55, y: root.y - len };
        k.pen.stroke(bezier(root, { x: root.x + 2, y: root.y - len * 0.6 }, tip, 8), 0.9, '#a3271f', 1, false);
        k.pen.dot(tip.x, tip.y, 1.2, '#c0392b', 0.9);
      }
      // Pelvic "oar": one long ray with a paddle tip.
      const root = { x: k.x(0.1), y: bottomAt(k.a, 0.1) - 1 };
      const tip = { x: k.x(0.36), y: C + 30 };
      k.pen.stroke(bezier(root, { x: k.x(0.18), y: C + 30 }, tip, 10), 0.9, '#a3271f', 1, false);
      k.pen.fill(ellipse(tip.x - 3, tip.y, 4.5, 2, 10), '#c0392b', 0.8);
      k.pen.hair(ring(tip.x - 3, tip.y, 4.5, 2, 10), 0.5, k.ink, 0.8);
    },
    extras: (k) => {
      // Saturate the long dorsal fin red.
      // Same profile as the engine's soft fin, so the colour sits inside the fin outline.
      const base: Pt[] = [];
      const tips: Pt[] = [];
      for (let i = 0; i <= 40; i++) {
        const f = i / 40;
        const t = 0.04 + 0.96 * f;
        const height = k.a.hh * Math.max(0.12, Math.pow(Math.sin(Math.PI * Math.min(1, f * 1.15)), 0.7)) * 0.95;
        base.push({ x: k.x(t), y: topAt(k.a, t) + 1 });
        tips.push({ x: k.x(t) - height * 0.45, y: topAt(k.a, t) - height });
      }
      const fin = [...base, ...tips.reverse()];
      k.pen.fill(fin, '#c0392b', 0.32);
      // Silver ribbon: bright streak and dark wavy bars and spots.
      k.pen.clipped(k.body, () => {
        const streak: Pt[] = [];
        for (let t = 0.05; t <= 1; t += 0.03) streak.push({ x: k.x(t), y: C - k.h(t) * 0.1 });
        k.pen.stroke(streak, 2.2, PAPER_FILL, 0.7, false);
        for (let t = 0.14; t < 0.98; t += 0.045) {
          const x = k.x(t);
          k.pen.hair(bezier({ x: x + 2, y: topAt(k.a, t) }, { x: x - 3, y: C - k.h(t) * 0.2 }, { x: x + 1, y: C + k.h(t) * 0.4 }, 5), 0.7, k.ink, 0.5);
          if (k.pen.rng() < 0.6) k.pen.dot(x - 3, C - k.h(t) * 0.5, 1, k.ink, 0.6);
        }
      });
    },
  },
  sleepershark: {
    // Pacific sleeper shark: bulky, dark and soft-looking, rounded snout, two small low dorsals, no anal fin.
    hl: 86, hh: 33, peak: 0.42, blunt: 0.85, peduncle: 0.22, tail: 'shark', tailSize: 1.05,
    dorsal: { from: 0.44, to: 0.54, height: 0.32, tri: true }, dorsal2: { from: 0.68, to: 0.76, height: 0.3, tri: true },
    pectoral: 0, pelvic: false, scales: false, eye: { t: 0.13, r: 4 }, mouth: 'none',
    wash: '#3f3b36', finWash: '#4c4740', gills: 'slits', lateral: false,
    under: (k) => {
      sickle(k, { x: k.x(0.7), y: bottomAt(k.a, 0.7) - 3 }, { x: k.x(0.78), y: bottomAt(k.a, 0.7) + 9 }, 13);
    },
    extras: (k) => {
      // A dark, ancient hulk: heavy slate over everything, darker still on the back.
      k.pen.clipped(k.body, () => {
        k.pen.fill(k.body, '#2f3236', 0.35);
        for (let t = 0.02; t < 1; t += 0.05) k.pen.fill(ellipse(k.x(t), topAt(k.a, t) + 3, 9, k.h(t) * 0.6, 8), '#1d1f22', 0.1);
      });
      k.pen.stipple(k.body, 2600, (_x, y) => (y < C ? 0.55 : 0.3), 0.55, k.ink);
      mottle(k, 22, [3, 6], '#2c2925', 0.25);
      // Pale old scars from a long, slow life.
      k.pen.clipped(k.body, () => {
        for (const [t, v, len] of [[0.48, -0.3, 14], [0.6, 0.2, 10], [0.7, -0.05, 12]] as const) {
          const x = k.x(t);
          const y = C + k.h(t) * v;
          k.pen.stroke([{ x: x + len / 2, y: y - 2 }, { x: x - len / 2, y: y + 3 }], 1.4, '#b9b1a4', 0.75, false);
        }
      });
      // Skin creases and parasite-scarred, sleepy look.
      for (let i = 0; i < 6; i++) {
        const t = 0.35 + i * 0.09;
        k.pen.hair(bezier({ x: k.x(t), y: topAt(k.a, t) + 4 }, { x: k.x(t) - 5, y: C }, { x: k.x(t), y: bottomAt(k.a, t) - 4 }, 6), 0.45, k.ink, 0.35);
      }
      gillSlits(k, 0.22);
      // A grim, straight slit of a mouth under the blunt snout.
      const mx = k.x(0.11);
      const my = bottomAt(k.a, 0.11) - 4;
      k.pen.stroke(bezier({ x: mx + 9, y: my - 1 }, { x: mx, y: my + 1.5 }, { x: mx - 10, y: my + 2.5 }, 8), 1.3, k.ink, 1, false);
      // Small rounded pectoral.
      const r = { x: k.x(0.3), y: C + k.h(0.3) * 0.55 };
      sickle(k, r, { x: k.x(0.4), y: bottomAt(k.a, 0.3) + 13 }, 14);
    },
    face: (k) => {
      // A clouded, pale eye with a parasite trailing from it, as old sleeper sharks have.
      const ex = k.x(k.a.eye.t);
      const ey = C - k.h(k.a.eye.t) * 0.3;
      k.pen.fill(ellipse(ex, ey, k.a.eye.r * 0.9, k.a.eye.r * 0.9, 12), '#c9d2d6', 0.85);
      k.pen.dot(ex, ey, k.a.eye.r * 0.35, '#5d6a70', 0.9);
      const worm = bezier({ x: ex - 1, y: ey + 2 }, { x: ex - 3, y: ey + 9 }, { x: ex - 1, y: ey + 15 }, 8);
      k.pen.stroke(worm, 1.6, '#e8ddc8', 0.95, false);
      k.pen.hair(worm, 0.4, k.ink, 0.8);
      k.pen.hair([{ x: ex - 2, y: ey + 15 }, { x: ex - 4, y: ey + 18 }], 0.4, k.ink, 0.7);
      k.pen.hair([{ x: ex, y: ey + 15 }, { x: ex + 1, y: ey + 18 }], 0.4, k.ink, 0.7);
    },
  },
  goblinshark: {
    // Goblin shark: pink and flabby, a long flat blade of a snout over jaws that jut out, nail teeth, a long low tail.
    hl: 76, hh: 21, peak: 0.42, blunt: 0.2, peduncle: 0.32, tail: 'point', tailSize: 0,
    dorsal: { from: 0.5, to: 0.6, height: 0.6, tri: true }, dorsal2: { from: 0.68, to: 0.76, height: 0.55, tri: true },
    anal: { from: 0.74, to: 0.84, height: 0.55, tri: true }, pectoral: 0, pelvic: false, scales: false,
    eye: { t: 0.16, r: 3.5 }, mouth: 'small', wash: '#c98a86', finWash: '#d6a19c', gills: 'slits', lateral: false,
    under: (k) => {
      // Long, low caudal fin: almost all upper lobe, barely raised.
      const x0 = k.x(0.88);
      const tip = { x: k.x(1) - 44, y: C - 10 };
      const shape = [
        { x: x0, y: topAt(k.a, 0.88) + 2 },
        ...bezier({ x: x0, y: topAt(k.a, 0.88) }, { x: x0 - 30, y: C - 14 }, tip, 10),
        ...bezier(tip, { x: tip.x + 14, y: C + 2 }, { x: k.x(1) - 18, y: C + 7 }, 8),
        ...bezier({ x: k.x(1) - 18, y: C + 7 }, { x: k.x(1) - 8, y: C + 14 }, { x: x0, y: bottomAt(k.a, 0.88) }, 8),
      ];
      membrane(k, shape, { x: x0, y: C }, 12);
      sickle(k, { x: k.x(0.6), y: bottomAt(k.a, 0.6) - 3 }, { x: k.x(0.68), y: bottomAt(k.a, 0.6) + 10 }, 12);
    },
    extras: (k) => {
      // Translucent pink skin, blushing darker on the fins and belly, the blood vessels showing through.
      k.pen.clipped(k.body, () => {
        k.pen.fill(k.body, '#e2a39d', 0.18);
        for (let i = 0; i < 9; i++) {
          let x = k.x(0.25 + k.pen.rng() * 0.6);
          let y = C + k.h(0.5) * (k.pen.rng() * 1.4 - 0.7);
          const vein = [{ x, y }];
          for (let j = 0; j < 6; j++) {
            x -= 4 + k.pen.rng() * 4;
            y += (k.pen.rng() - 0.5) * 6;
            vein.push({ x, y });
          }
          k.pen.hair(vein, 0.45, '#9a4a6a', 0.45);
        }
        for (let i = 0; i < 12; i++) {
          const t = 0.2 + i * 0.065;
          k.pen.hair(bezier({ x: k.x(t), y: topAt(k.a, t) + 3 }, { x: k.x(t) - 4, y: C }, { x: k.x(t), y: bottomAt(k.a, t) - 3 }, 6), 0.4, '#8a3f3a', 0.3);
        }
      });
      gillSlits(k, 0.24);
      // Protruding jaws slung below the head, packed with nail-like teeth.
      const back = { x: k.x(0.2), y: bottomAt(k.a, 0.2) - 4 };
      const upperTip = { x: k.x(0.03), y: C + 8 };
      const lowerTip = { x: k.x(0.05), y: C + 20 };
      const jaw = [
        ...bezier(back, { x: k.x(0.1), y: C + 6 }, upperTip, 10),
        ...bezier(lowerTip, { x: k.x(0.12), y: C + 30 }, { x: k.x(0.22), y: bottomAt(k.a, 0.22) }, 10),
      ];
      k.pen.fill(jaw, '#5a2a2c', 0.75);
      const upper = bezier({ x: k.x(0.17), y: C + 9 }, { x: k.x(0.09), y: C + 8 }, upperTip, 8);
      const lower = bezier({ x: k.x(0.18), y: C + 17 }, { x: k.x(0.1), y: C + 23 }, lowerTip, 8);
      upper.forEach((p, i) => {
        if (i === 0) return;
        const tooth = [{ x: p.x - 0.9, y: p.y }, { x: p.x + 0.4, y: p.y + 6 }, { x: p.x + 0.9, y: p.y }];
        k.pen.fill(tooth, PAPER_FILL, 1);
        k.pen.hair(tooth, 0.4, k.ink, 0.9);
      });
      lower.forEach((p, i) => {
        if (i === 0) return;
        const tooth = [{ x: p.x - 0.9, y: p.y }, { x: p.x + 0.4, y: p.y - 6 }, { x: p.x + 0.9, y: p.y }];
        k.pen.fill(tooth, PAPER_FILL, 1);
        k.pen.hair(tooth, 0.4, k.ink, 0.9);
      });
      const lip = (pts: Pt[]): void => k.pen.stroke(pts, 1.4, k.ink, 1, false);
      lip(bezier(back, { x: k.x(0.1), y: C + 5 }, upperTip, 10));
      lip(bezier(lowerTip, { x: k.x(0.12), y: C + 30 }, { x: k.x(0.22), y: bottomAt(k.a, 0.22) }, 10));
      lip([upperTip, { x: upperTip.x + 1, y: upperTip.y + 3 }]);
      lip([lowerTip, { x: lowerTip.x + 1, y: lowerTip.y - 3 }]);
      // The blade: a long, flat, slightly upturned snout.
      const nose = { x: k.x(0.04), y: C - 3 };
      const blade: Pt[] = [
        { x: nose.x - 10, y: nose.y - 6 }, ...bezier({ x: nose.x, y: nose.y - 6 }, { x: nose.x + 24, y: nose.y - 6 }, { x: nose.x + 38, y: nose.y - 4 }, 8),
        { x: nose.x + 40, y: nose.y - 2 }, ...bezier({ x: nose.x + 38, y: nose.y + 1 }, { x: nose.x + 22, y: nose.y + 3 }, { x: nose.x, y: nose.y + 5 }, 8),
        { x: nose.x - 10, y: nose.y + 7 },
      ];
      k.pen.fill(blade, PAPER_FILL, 1);
      k.pen.fill(blade, '#c98a86', k.heavy ? 0.5 : 0.35);
      for (let i = 0; i < 9; i++) k.pen.dot(nose.x + 4 + i * 4.2, nose.y + (i % 2) * 2, 0.6, k.ink, 0.6);
      k.pen.stroke([...blade, blade[0]!], 1.1, k.ink, 1, false);
      // Pectoral: small and rounded.
      sickle(k, { x: k.x(0.3), y: C + k.h(0.3) * 0.5 }, { x: k.x(0.4), y: bottomAt(k.a, 0.3) + 12 }, 11);
    },
  },
  coelacanth: {
    // Coelacanth: steel-blue with white blotches, heavy scales, limb-like lobed fins, a three-lobed tail.
    hl: 76, hh: 34, peak: 0.4, blunt: 0.6, peduncle: 0.5, tail: 'round', tailSize: 0.95,
    dorsal: { from: 0.34, to: 0.44, height: 0.95, spiny: true }, pectoral: 0, pelvic: false, scales: false,
    eye: { t: 0.13, r: 6.5 }, mouth: 'small', wash: '#3d5a7a', finWash: '#5a7898',
    under: (k) => {
      // Tail's small middle lobe, poking out past the fan.
      const x0 = k.x(1);
      const L = k.a.hh * k.a.tailSize;
      const tip = { x: x0 - L * 1.05 - 10, y: C };
      const lobe = [
        { x: x0 - L * 0.5, y: C - 5 }, ...bezier({ x: x0 - L * 0.7, y: C - 6 }, { x: tip.x + 6, y: C - 7 }, tip, 8),
        ...bezier(tip, { x: tip.x + 6, y: C + 7 }, { x: x0 - L * 0.7, y: C + 6 }, 8), { x: x0 - L * 0.5, y: C + 5 },
      ];
      membrane(k, lobe, { x: x0 - L * 0.5, y: C }, 7);
      // Lobed second dorsal and anal fins, mirror images near the tail.
      lobedFin(k, { x: k.x(0.68), y: topAt(k.a, 0.68) + 8 }, -2.45, 18, 17, 11);
      lobedFin(k, { x: k.x(0.7), y: bottomAt(k.a, 0.7) - 8 }, 2.45, 18, 17, 11);
      // Pelvic limb.
      lobedFin(k, { x: k.x(0.48), y: bottomAt(k.a, 0.48) - 8 }, 2.2, 17, 16, 10);
    },
    extras: (k) => {
      // Heavy cosmoid scales.
      bigScales(k, 6, 0.26, 1, 0.45);
      // White blotches.
      k.pen.clipped(k.body, () => {
        for (let i = 0; i < 18; i++) {
          const t = 0.12 + k.pen.rng() * 0.82;
          const y = C + k.h(t) * (k.pen.rng() * 1.6 - 0.8);
          const r = 2.5 + k.pen.rng() * 3.5;
          const blob = ellipse(k.x(t), y, r * 1.3, r, 10).map((p) => ({ x: p.x + k.pen.jitter(0.8), y: p.y + k.pen.jitter(0.8) }));
          k.pen.fill(blob, PAPER_FILL, 0.9);
          k.pen.hair([...blob, blob[0]!], 0.4, k.ink, 0.45);
        }
      });
      backStipple(0.9)(k);
      // Pectoral limb, set low on the flank like an arm.
      lobedFin(k, { x: k.x(0.28), y: C + k.h(0.28) * 0.3 }, 2.55, 20, 18, 11);
    },
  },
};
