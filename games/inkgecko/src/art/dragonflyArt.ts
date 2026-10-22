import { closed, type Draw, edge, oval, pt, ribbon, shade, skin } from './kit';
import { PAPER_FILL } from './palette';
import type { Pt } from './pen';
import { mix } from './wash';

/**
 * The Dragonfly charm's flying sprite, seen from above with its nose up
 * (−y): big round eyes, a striped thorax, a slim segmented abdomen and four
 * veined, glassy wings. Bright teal so it reads over any ground. Local units,
 * centred at the origin; about 44 long with wings spread about 52.
 */
export const DRAGONFLY_FRAME = 64;

const BODY = '#1d9cb8';
const BODY_DEEP = '#135f86';
const EYE = '#2b78b8';
const WING = '#cfeaea';
const WING_ROOT = '#8fcfc9';
const STIGMA = '#3b2d33';

/** Paper, then a strong wash laid in register (thin parts would show paper through skin()'s offset), and a bloom of colour pooled at one side. */
function enamel(d: Draw, shape: readonly Pt[], wash: string): void {
  const { pen } = d;
  pen.fill(shape, PAPER_FILL, 1);
  pen.fill(shape, wash, 0.9);
  pen.clipped(shape, () => pen.fill(shape.map((p) => pt(p.x + 0.8, p.y + 0.5)), mix(wash, '#0b3550', 0.3), 0.35));
}

/** A wing's span and chord, units. */
const FORE = { len: 24, chord: 5.6, base: 0.7 } as const;
const HIND = { len: 22.5, chord: 6.8, base: 1 } as const;

interface WingPose {
  /** Angle from straight out sideways; positive sweeps it back. */
  readonly sweep: number;
  /** Foreshortening as the wing tilts up in the beat. */
  readonly reach: number;
}

/** Wing poses per flutter frame: [fore, hind]. */
const POSES: readonly (readonly [WingPose, WingPose])[] = [
  [{ sweep: -0.1, reach: 1 }, { sweep: 0.2, reach: 1 }],
  [{ sweep: 0.3, reach: 0.82 }, { sweep: 0.55, reach: 0.84 }],
];

/** A right-hand wing from `root`, as its outline plus the edges and veins inside it. */
function wingShape(root: Pt, spec: typeof FORE | typeof HIND, pose: WingPose): { shape: Pt[]; lead: Pt[]; trail: Pt[]; at: (t: number, k: number) => Pt } {
  const ux = Math.cos(pose.sweep);
  const uy = Math.sin(pose.sweep);
  // Towards the front edge (the head's side) of a wing pointing right.
  const fx = uy;
  const fy = -ux;
  const len = spec.len * pose.reach;
  const front = (t: number): number => spec.chord * 0.28 * Math.sqrt(Math.sin(Math.PI * Math.min(1, t * 0.98 + 0.02)));
  const back = (t: number): number => spec.chord * (0.72 * Math.sqrt(Math.sin(Math.PI * Math.min(1, t * 0.98 + 0.02)))) * (1 - 0.3 * t) * (0.8 + 0.4 * spec.base * (1 - t));
  /** The point t of the way out, k across from the front edge (0) to the back (1). */
  const at = (t: number, k: number): Pt => {
    const off = front(t) - (front(t) + back(t)) * k;
    return pt(root.x + ux * len * t + fx * off, root.y + uy * len * t + fy * off);
  };
  const n = 18;
  const lead = Array.from({ length: n + 1 }, (_, i) => at(i / n, 0));
  const trail = Array.from({ length: n + 1 }, (_, i) => at(i / n, 1));
  return { shape: [...lead, ...[...trail].reverse()], lead, trail, at };
}

/** One glassy wing: a pale wash darker at the root, its veins and cross-veins, the dark stigma near the tip. */
function paintWing(d: Draw, root: Pt, spec: typeof FORE | typeof HIND, pose: WingPose, mirror: boolean, alpha = 1): void {
  const { pen } = d;
  const w = wingShape(root, spec, pose);
  const m = (p: Pt): Pt => (mirror ? pt(-p.x, p.y) : p);
  const shape = w.shape.map(m);
  pen.fill(shape, PAPER_FILL, 0.5 * alpha);
  pen.fill(shape, WING, 0.45 * alpha);
  pen.clipped(shape, () => {
    pen.fill(oval(m(root).x, root.y, 6, 4, 14), WING_ROOT, 0.5 * alpha);
    for (let i = 1; i < 12; i++) {
      const t = i / 12;
      pen.hair([m(w.at(t, 0.05)), m(w.at(t + 0.02, 0.55)), m(w.at(t - 0.01, 0.98))], 0.22, d.ink, 0.22 * alpha);
    }
    for (const k of [0.3, 0.55, 0.8]) pen.hair(Array.from({ length: 9 }, (_, i) => m(w.at(0.04 + (i / 8) * 0.9, k))), 0.32, d.ink, 0.45 * alpha);
    pen.hair(w.lead.slice(2, 12).map((p) => m(pt(p.x, p.y + 0.6))), 0.9, PAPER_FILL, 0.55 * alpha);
  });
  const stigma = [w.at(0.8, 0.02), w.at(0.89, 0.02), w.at(0.89, 0.18), w.at(0.8, 0.18)].map(m);
  pen.fill(stigma, STIGMA, 0.85 * alpha);
  pen.stroke(w.lead.map(m), 0.75, d.ink, 0.9 * alpha, false);
  pen.hair(closed(shape), 0.45, d.ink, 0.7 * alpha);
}

/** The four wings in a flutter frame; on the back-swept frame a faint blur of where they were. */
function wings(d: Draw, wing: 0 | 1): void {
  const [fore, hind] = POSES[wing]!;
  const roots = { fore: pt(1.6, -8.5), hind: pt(1.6, -4.2) };
  for (const mirror of [false, true]) {
    if (wing === 1) {
      const [f0, h0] = POSES[0]!;
      paintWing(d, roots.hind, HIND, h0, mirror, 0.22);
      paintWing(d, roots.fore, FORE, f0, mirror, 0.22);
    }
    paintWing(d, roots.hind, HIND, hind, mirror);
    paintWing(d, roots.fore, FORE, fore, mirror);
  }
}

/** The slim abdomen: segment by segment, a pale line down its back, claspers at the tip. */
function abdomen(d: Draw): void {
  const { pen } = d;
  const spine = Array.from({ length: 25 }, (_, i) => pt(Math.sin(i * 0.25) * 0.15, -2.5 + i * 1.1));
  const girth = (u: number): number => (u < 0.12 ? 4.4 - u * 12 : 3 - 0.5 * u) + (u > 0.88 ? 0.5 : 0);
  const body = ribbon(spine, girth);
  enamel(d, body.shape, BODY);
  pen.clipped(body.shape, () => {
    for (let y = 0.8; y < 23; y += 2.9) {
      pen.fill([pt(-3, y), pt(3, y), pt(3, y + 1.1), pt(-3, y + 1.1)], BODY_DEEP, 0.7);
      pen.hair([pt(-3, y), pt(3, y)], 0.45, d.ink, 0.75);
    }
    pen.hair(spine.slice(1, 22).map((p) => pt(p.x - 0.4, p.y)), 0.6, PAPER_FILL, 0.5);
  });
  shade(d, body.shape, 0.35);
  edge(d, body.shape, 0.9, 0.95);
  const tip = spine[spine.length - 1]!;
  for (const s of [-1, 1]) pen.hair([pt(tip.x + s * 0.8, tip.y), pt(tip.x + s * 1.6, tip.y + 2.4)], 0.6, d.ink, 0.9);
}

/** Thorax and head: a striped thorax, then the big round eyes that meet at the top of the head. */
function foreparts(d: Draw): void {
  const { pen } = d;
  const thorax = oval(0, -7, 4.4, 5.8, 22);
  enamel(d, thorax, BODY);
  pen.clipped(thorax, () => {
    for (const s of [-1, 1]) pen.hair([pt(s * 1.2, -11.5), pt(s * 2.6, -6.5), pt(s * 2.2, -2.5)], 0.9, mix(BODY, PAPER_FILL, 0.6), 0.85);
    pen.hair([pt(0, -12), pt(0, -2)], 0.6, BODY_DEEP, 0.7);
  });
  shade(d, thorax, 0.4);
  edge(d, thorax, 1, 0.95);
  const face = oval(0, -18.4, 2.4, 1.5, 14);
  enamel(d, face, mix(BODY, PAPER_FILL, 0.35));
  edge(d, face, 0.6, 0.85);
  for (const s of [-1, 1]) {
    const eye = oval(s * 3, -15, 3.4, 3.6, 20);
    skin(d, eye, EYE, 0.9);
    pen.clipped(eye, () => pen.stipple(eye, 30, () => 0.6, 0.35, mix(EYE, d.ink, 0.5)));
    shade(d, eye, 0.35);
    edge(d, eye, 0.9, 1);
    pen.dot(s * 3 - 1, -16.3, 0.9, PAPER_FILL, 0.95);
  }
}

/**
 * The flying dragonfly, nose up, centred at 0,0 within DRAGONFLY_FRAME.
 * `wing` 0 has the wings spread wide; 1 has them swept back mid-beat with a
 * faint blur of the stroke, so alternating the two reads as a flutter.
 */
export function drawDragonfly(d: Draw, wing: 0 | 1): void {
  wings(d, wing);
  abdomen(d);
  foreparts(d);
}
