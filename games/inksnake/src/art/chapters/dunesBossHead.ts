import type { Rng } from '../../logic/rng';
import { polar } from '../groundKit';
import { closed, cub, type Draw, pt, ribbon, TAU } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { ellipseAt, glaze, lanceBlade } from '../critters/birdKit';
import type { Runner } from './dunesBossParts';
import { plumage, RR } from './dunesBossPaint';

/**
 * The Roadrunner's neck and head from above: a streaky neck, a flat crown
 * under a shaggy blue-black crest spotted buff (laid back, sleeked flat,
 * or raised in a ragged fan), pale eyes with the bare patch of blue and
 * orange-red skin behind each, and a long, heavy, dark bill.
 */

export function paintNeck(d: Draw, r: Runner, rng: Rng): Pt[] {
  const shape = ribbon(r.neck, (u) => r.neckW[0] + (r.neckW[1] - r.neckW[0]) * u).shape;
  const back = Math.atan2(r.neck[0]!.y - r.head.y, r.neck[0]!.x - r.head.x);
  plumage(d, shape, rng, { n: 34, size: 2.6, dir: () => back, line: 0.6, pale: 0.6 });
  return shape;
}

/** The crest: dark lance feathers from the crown, each with a buff spot near its tip. */
function crest(d: Draw, r: Runner, rng: Rng): void {
  const { pen } = d;
  const c = r.head;
  const R = r.headR;
  const kind = r.crest;
  const n = kind === 'up' ? 13 : 9;
  for (let i = 0; i < n; i++) {
    const u = i / (n - 1);
    let root: Pt;
    let ang: number;
    let len: number;
    if (kind === 'up') {
      // Raised: a ragged fan standing off the crown, seen from above as a starburst leaning back.
      ang = Math.PI + (u - 0.5) * 3.4 + (rng() - 0.5) * 0.3;
      root = polar(pt(c.x - R * 0.2, c.y), ang, R * 0.15);
      len = R * (0.9 + rng() * 0.6) * (1 - 0.35 * Math.abs(u - 0.5));
    } else {
      const spread = kind === 'sleek' ? 0.45 : 0.9;
      ang = Math.PI + (u - 0.5) * spread + (rng() - 0.5) * 0.12;
      root = pt(c.x + R * (0.1 - Math.abs(u - 0.5) * 0.5), c.y + (u - 0.5) * R * 0.5);
      len = R * (kind === 'sleek' ? 2.5 : 2.3) * (1 - 0.35 * Math.abs(u - 0.5) * 2) + rng() * 1.4;
    }
    const f = lanceBlade(root, ang, len, kind === 'up' ? 2.2 : 2.5, (rng() - 0.5) * 0.25);
    pen.fill(f.shape.map((p) => pt(p.x + 0.6, p.y + 0.9)), d.ink, 0.18);
    pen.fill(f.shape, PAPER_FILL, 1);
    pen.fill(f.shape, RR.crest, 0.95);
    pen.hair(f.shape.slice(2, 10), 0.35, RR.buff, 0.5);
    const s = f.at(0.72, 0);
    pen.dot(s.x, s.y, 0.45, RR.buff, 0.85);
    pen.hair([f.at(0.1, 0), f.at(0.85, 0)], 0.3, '#5a6278', 0.6);
    pen.stroke(closed(f.shape), 0.35, d.ink, 0.85, false);
  }
}

/** The long bill: a heavy dark wedge, its ridge lit, the hooked tip just showing; `open` parts it. */
function bill(d: Draw, r: Runner, open: boolean): void {
  const { pen } = d;
  const c = r.head;
  const b0 = c.x + r.headR * 0.75;
  const l = r.bill;
  const half = 1.9;
  const upper = [...cub(pt(b0, -half), pt(b0 + l * 0.5, -half * 0.9), pt(b0 + l * 0.85, -half * 0.45), pt(b0 + l, 0), 8), ...cub(pt(b0 + l, 0), pt(b0 + l * 0.85, half * 0.45), pt(b0 + l * 0.5, half * 0.9), pt(b0, half), 8).slice(1)].map((p) => pt(p.x, p.y + c.y));
  pen.fill(upper.map((p) => pt(p.x + 0.8, p.y + 1.2)), d.ink, 0.2);
  if (open) {
    const lower = upper.map((p) => pt(p.x - 0.8, c.y + (p.y - c.y) * 0.8 + 1.6));
    pen.fill(lower, '#5c3a36', 1);
    pen.hair(closed(lower), 0.5, d.ink, 0.9);
  }
  pen.fill(upper, RR.bill, 1);
  pen.clipped(upper, () => {
    pen.crescent(upper, pt(-0.4, -0.7), () => pen.fill(upper, '#141210', 0.7));
    glaze(d, b0 + 1.2, c.y, 1.8, 1.6, 0, '#8d8070', 0.6);
  });
  pen.hair([pt(b0 + 0.8, c.y - 0.35), pt(b0 + l * 0.85, c.y - 0.2)], 0.45, '#b4aca0', 0.65);
  pen.stroke(closed(upper), 0.6, d.ink, 1, false);
}

/** An eye on the side of the head, the bare skin behind it blue, then orange-red. */
function eye(d: Draw, c: Pt, R: number, s: number, wide: boolean): void {
  const { pen } = d;
  const e = pt(c.x + R * 0.3, c.y + s * R * 0.72);
  const patch = ellipseAt(e.x - 1.8, e.y + s * 0.15, 1.9, 0.8, -s * 0.15, 14);
  pen.fill(patch, RR.blue, 0.8);
  pen.fill(ellipseAt(e.x - 3.2, e.y + s * 0.25, 1, 0.7, 0, 12), RR.red, 0.8);
  const ball = ellipseAt(e.x, e.y, wide ? 1.35 : 1.15, wide ? 1.15 : 0.95, 0, 12);
  pen.fill(ball, RR.eye, 1);
  pen.dot(e.x + 0.15, e.y, wide ? 0.45 : 0.55, '#120f0c', 1);
  pen.dot(e.x - 0.3, e.y - 0.35, 0.25, PAPER_FILL, 0.95);
  pen.stroke(closed(ball), 0.4, d.ink, 0.95, false);
  pen.hair([pt(e.x - 1.3, e.y - s * 0.9), pt(e.x + 1.5, e.y - s * 0.8)], 0.45, d.ink, 0.75);
}

/** The head: crest behind, the streaky crown, eyes and bill. */
export function paintHead(d: Draw, r: Runner, rng: Rng): Pt[] {
  const c = r.head;
  const R = r.headR;
  const shape = Array.from({ length: 30 }, (_, i) => {
    const a = (i / 30) * TAU;
    return pt(c.x + Math.cos(a) * R * (Math.cos(a) > 0 ? 1.05 : 1.15), c.y + Math.sin(a) * R * 0.88);
  });
  const fright = r.pose === 'startle' || r.pose === 'skid';
  plumage(d, shape, rng, { n: 16, size: 2.2, line: 0.8, pale: 0.4 });
  for (const s of [-1, 1]) eye(d, c, R, s, fright);
  crest(d, r, rng);
  bill(d, r, r.pose === 'startle');
  return shape;
}
