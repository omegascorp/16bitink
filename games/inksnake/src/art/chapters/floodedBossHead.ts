import { createRng } from '../../logic/rng';
import { polar } from '../groundKit';
import { bezier, closed, type Draw, pt, TAU } from '../kit';
import { PAPER_FILL } from '../palette';
import { ellipseAt, glaze } from '../critters/preyKit';
import { paintFur, type Pelt } from './barrensCrittersBeast';
import { HEAD_K, type Jag } from './floodedBossParts';
import { JAG } from './floodedBossPaint';
import { rings } from './floodedCrittersKit';

/**
 * The Jaguar's head from above: big and broad, the heaviest head of any
 * cat for its size, the crown peppered with small black spots, small round
 * ears black-backed with a gold centre, amber eyes under heavy brows, the
 * pale whisker pads dotted in rows, long white whiskers and a broad
 * pink-brown nose. Lowered to drink, the head shortens and the pink tongue
 * laps the water; raised, it comes nearer the eye.
 */
const J = JAG;

const HEAD_PELT: Pelt = { base: J.base, deep: J.deep, light: J.light, hair: (_p, r) => (r < 0.12 ? J.deep : r < 0.75 ? J.base : J.light) };

/** Where the ears sit round the crown (angle from forward) and how they lie, for each set. */
const EARS = { up: { a: 2.05, r: 10.6, len: 1 }, fwd: { a: 1.8, r: 10.4, len: 1 }, flat: { a: 2.5, r: 10.6, len: 1.45 } } as const;

function ear(d: Draw, c: Jag, side: 1 | -1, k: number): void {
  const { pen } = d;
  const e = EARS[c.ears];
  const at = polar(c.C, side * e.a, e.r * k);
  const rot = side * e.a;
  const shape = ellipseAt(at.x, at.y, 3.3 * k * e.len, 4 * k / e.len, rot, 18);
  pen.fill(shape.map((q) => pt(q.x + 1, q.y + 1.5)), d.ink, 0.25);
  pen.fill(shape, J.dark, 1);
  // The gold centre on the black back of each ear.
  pen.fill(ellipseAt(at.x + Math.cos(rot) * 0.6, at.y + Math.sin(rot) * 0.6, 1.6 * k * e.len, 1.9 * k / e.len, rot, 12), J.warm, 0.85);
  pen.clipped(shape, () => glaze(d, at.x - 0.8, at.y - 1, 1.6, 1.2, 0, PAPER_FILL, 0.3));
  pen.stroke(closed(shape), 0.6, d.ink, 0.95);
}

function eyes(d: Draw, c: Jag, k: number): void {
  const { pen } = d;
  for (const s of [-1, 1]) {
    const e = pt(c.C.x + 6.2 * k, c.C.y + s * 4.3 * k);
    const open = c.eyes === 'wide' ? 1.25 : c.eyes === 'soft' ? 0.55 : c.eyes === 'keen' ? 0.75 : 0.9;
    // The dark rim and the pale fur round it, as on every big cat.
    pen.fill(ellipseAt(e.x - 0.3 * k, e.y, 2.6 * k, 1.8 * k * Math.max(0.7, open), s * 0.35, 14), J.light, 0.55);
    const ball = ellipseAt(e.x, e.y, 1.9 * k, 1.2 * k * open, s * 0.35, 14);
    pen.fill(ball, '#d39a2a', 1);
    pen.clipped(ball, () => {
      glaze(d, e.x + 0.5, e.y + s * 0.4, 1.6 * k, 1.2 * k, 0, '#8a5a12', 0.6);
      const pr = c.eyes === 'wide' ? 1.1 : c.eyes === 'fixed' ? 0.55 : 0.8;
      pen.dot(e.x + 0.4 * k, e.y, pr * k, '#100d0c', 1);
      pen.dot(e.x - 0.3 * k, e.y - 0.45 * k, 0.35 * k, PAPER_FILL, 0.95);
      // The heavy upper lid's shadow.
      pen.fill(ellipseAt(e.x - 0.9 * k, e.y - s * 0.4, 2 * k, 1.4 * k, s * 0.25, 10), J.deep, 0.35);
    });
    pen.stroke(closed(ball), 0.55, d.ink, 1, false);
    // The brow over it, and the dark line running back from its corner.
    pen.hair(bezier(pt(e.x - 2.4 * k, e.y - s * 1.6 * k), pt(e.x - 0.5 * k, e.y - s * 2.6 * k), pt(e.x + 2 * k, e.y - s * 1.8 * k), 5), 0.6, J.dark, 0.85);
    pen.hair(bezier(pt(e.x - 2.2 * k, e.y + s * 0.8 * k), pt(e.x - 4 * k, e.y + s * 2.4 * k), pt(e.x - 6 * k, e.y + s * 2.8 * k), 5), 0.7, J.dark, 0.75);
  }
}

/** Muzzle, nose, whisker pads and whiskers; and lapping at the water, the tongue. */
function muzzle(d: Draw, c: Jag, k: number): void {
  const { pen } = d;
  const N = pt(c.C.x + c.snout * k, c.C.y);
  for (const s of [-1, 1]) {
    const padC = pt(N.x - 4 * k, N.y + s * 3.3 * k);
    const pad = ellipseAt(padC.x, padC.y, 3.6 * k, 2.6 * k, s * 0.3, 16);
    pen.fill(pad, J.white, 0.6);
    pen.clipped(pad, () => pen.crescent(pad, pt(-0.5, -0.7), () => pen.fill(pad, J.light, 0.6)));
    for (let row = 0; row < 3; row++) {
      for (let i = 0; i < 3; i++) {
        const q = pt(padC.x - 1.6 * k + i * 1.3 * k + row * 0.4 * k, padC.y + s * (row - 1) * 0.8 * k);
        pen.dot(q.x, q.y, 0.2 * k, J.dark, 0.6);
      }
    }
    if (c.pose !== 'drink') {
      for (const [a, l] of [[0.35, 15], [0.6, 17], [0.85, 15], [1.15, 12]] as const) {
        const root = pt(padC.x + 0.5, padC.y + s * 0.6);
        const back = c.ears === 'flat' ? 0.5 : 0;
        const ang = s * (a + back);
        const tip = polar(root, ang, l * k);
        pen.hair(bezier(root, polar(root, ang - s * 0.15, l * 0.5 * k), tip, 6), 0.35, PAPER_FILL, 0.95);
        pen.hair(bezier(root, polar(root, ang - s * 0.15, l * 0.5 * k), tip, 6).map((q) => pt(q.x + 0.3, q.y + 0.4)), 0.2, d.ink, 0.35);
      }
    }
  }
  // The broad nose, pink-brown, its leather finely lined, the nostrils at its sides.
  const nose = [pt(N.x - 2.8 * k, N.y - 1.8 * k), pt(N.x - 0.5 * k, N.y - 1.5 * k), pt(N.x + 0.1 * k, N.y - 0.5 * k), pt(N.x + 0.1 * k, N.y + 0.5 * k), pt(N.x - 0.5 * k, N.y + 1.5 * k), pt(N.x - 2.8 * k, N.y + 1.8 * k), pt(N.x - 3.6 * k, N.y)];
  pen.fill(nose, '#8a5246', 1);
  pen.clipped(nose, () => {
    pen.crescent(nose, pt(-0.4, -0.6), () => pen.fill(nose, '#6e3a32', 0.6));
    pen.dot(N.x - 2.6 * k, N.y - 0.8 * k, 0.6 * k, '#f0c4b6', 0.7);
  });
  pen.stroke(closed(nose), 0.5, d.ink, 0.95, false);
  for (const s of [-1, 1]) pen.hair([pt(N.x - 0.6 * k, N.y + s * 1.2 * k), pt(N.x + 0.6 * k, N.y + s * 1.9 * k)], 0.5, '#2a1612', 0.9);
  if (c.pose === 'drink') {
    // The tongue curled to lap, and the water rings at the nose.
    const t = pt(N.x + 3.5 * k, N.y);
    const tongue = ellipseAt(t.x, t.y, 2.8 * k, 2.2 * k, 0, 16);
    pen.fill(tongue, '#e08a8a', 1);
    pen.hair([pt(t.x - 1.8 * k, t.y), pt(t.x + 1.4 * k, t.y)], 0.4, '#a3525a', 0.7);
    pen.stroke(closed(tongue), 0.4, d.ink, 0.9, false);
    rings(d, t, 5 * k, 6 * k, 3, 1101, 0.8);
  }
}

/** Paints the head (ears first, behind the crown's fur), scaled up by `lift` when it's raised towards the eye. */
export function paintJagHead(d: Draw, c: Jag): void {
  const k = HEAD_K * Math.max(1, c.lift);
  const rng = createRng(1080);
  const spots = Array.from({ length: 26 }, () => {
    const a = (rng() - 0.5) * 2.6 + Math.PI;
    const r = rng() * 8.5 * k;
    return pt(c.C.x + 2 * k + Math.cos(a) * r, c.C.y + Math.sin(a) * r * 0.95);
  });
  for (const s of [-1, 1] as const) ear(d, c, s, k);
  const N = pt(c.C.x + c.snout * k, c.C.y);
  paintFur(d, HEAD_PELT, {
    shape: c.head,
    dir: (p) => Math.atan2(p.y - N.y, p.x - N.x),
    wet: () => {
      glaze(d, c.C.x + 2, c.C.y, 9 * k, 6 * k, 0, J.light, 0.4);
      glaze(d, c.C.x - 4, c.C.y, 6 * k, 7 * k, 0, J.warm, 0.5);
      for (const s of spots) d.pen.fill(ellipseAt(s.x, s.y, 0.75, 0.6, rng() * TAU, 8), J.dark, 0.85);
    },
    hair: (p, r) => (spots.some((s) => (p.x - s.x) ** 2 + (p.y - s.y) ** 2 < 0.8) ? J.dark : HEAD_PELT.hair(p, r)),
    n: 760, len: 1.9, seed: 1081, tuft: 1 + c.puff, line: 0.05,
  });
  // The contour round the face only: behind, the head runs into the neck's fur.
  const { pen } = d;
  const front = c.head.filter((p) => p.x > c.C.x - 5 * k).sort((a, b) => Math.atan2(a.y - c.C.y, a.x - c.C.x - 4) - Math.atan2(b.y - c.C.y, b.x - c.C.x - 4));
  pen.stroke(front, 0.9, d.ink, 0.9);
  pen.clipped(c.head, () => {
    for (let i = 0; i < 90; i++) {
      const y = c.C.y + (((i * 37) % 90) / 90 - 0.5) * 22 * k;
      const x = c.C.x - 11 * k + ((i * 53) % 13) * 0.5;
      pen.hair([pt(x - 1, y), pt(x + 2.6 + ((i * 7) % 5) * 0.4, y + (y - c.C.y) * 0.08)], 0.35, i % 4 ? J.base : J.deep, 0.75);
    }
  });
  eyes(d, c, k);
  muzzle(d, c, k);
}
