import { createRng } from '../../logic/rng';
import { closed, type Draw, pt } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import type { SpriteArt } from '../types';
import { swish } from '../critters/birdKit';
import { glaze } from '../critters/preyKit';
import { softShadow } from './barrensCrittersBeast';
import { bentSpine, type Body, bodyAlong, keyFin, local, rings, scaleRows, wake, WATER } from './floodedCrittersKit';

/**
 * The red-bellied piranha from above facing +x, banked a little so its
 * right flank shows: a deep, blunt, bulldog-jawed fish about 24 long, its
 * back slate-olive, its flanks silver flecked with glitter, the throat and
 * belly fiery red-orange (the red running back to the anal fin), the fins
 * smoky, the tail's edge dark. 'swim0', 'swim1' sweep the tail; 'dart'
 * bends it hard as it bolts, fins pressed back, the water torn behind.
 */
type Pose = 'swim0' | 'swim1' | 'dart';

const P = {
  back: '#465049',
  backDeep: '#262d2a',
  flank: '#a7b0aa',
  sheen: '#e4ebe5',
  belly: '#d8502b',
  bellyDeep: '#8f2a1b',
  fin: '#727a74',
  finDeep: '#343a37',
  pec: '#d9926a',
  anal: '#c0432a',
  eye: '#cdbba4',
  iris: '#b8432c',
} as const;

const LEN = 22;
/** Half width along the body: a broad blunt head rounded at the nose, a deep body, a slim tail stock. */
function half(u: number): number {
  if (u < 0.16) return 5 * Math.sqrt(Math.max(0, 1 - (1 - u / 0.16) ** 2)) * (0.75 + 0.25 * (u / 0.16));
  if (u < 0.4) return 5 + ((u - 0.16) / 0.24) * 0.4;
  return 5.4 - ((u - 0.4) / 0.6) ** 1.15 * 4.1;
}

const BEND: Readonly<Record<Pose, (u: number) => number>> = {
  swim0: (u) => 4 * u * u - 1.1 * u,
  swim1: (u) => -4 * u * u + 1.1 * u,
  dart: (u) => -9 * u * u + 1.8 * u,
};

/** A frame on the body at u, v: x along the heading, y to its left (+y side when facing +x). */
const on = (b: Body, u: number, v: number, turn = 0): ((x: number, y: number) => Pt) => local(b.at(u, v), b.ang(u) + turn);

function tailFin(d: Draw, b: Body, dart: boolean): void {
  // Behind the tail stock, x running back along the fish.
  const f = on(b, 0.985, 0, Math.PI);
  const s = dart ? 0.75 : 1;
  keyFin(d, f, [[0, -1.3], [2.5, -3.2 * s], [6.6, -5.8 * s], [6.2, -2.4 * s], [5, 0], [6.2, 2.4 * s], [6.6, 5.8 * s], [2.5, 3.2 * s], [0, 1.3]], [-0.5, 0], P.fin, P.finDeep, { alpha: 0.7, rays: 13, rim: P.backDeep, line: 0.4 });
}

/** A pectoral or pelvic fin on `side`, a paddle swept back by `sweep`. */
function paddle(d: Draw, b: Body, u: number, side: 1 | -1, len: number, sweep: number, wash: string): void {
  const f = on(b, u, side * 0.86, Math.PI - side * sweep);
  const w = len * 0.42;
  keyFin(d, f, [[-0.4, side * -w * 0.4], [len * 0.55, side * -w * 0.55], [len, side * -w * 0.1], [len * 0.92, side * w * 0.45], [len * 0.4, side * w * 0.5], [-0.3, side * w * 0.3]], [-0.6, 0], wash, P.bellyDeep, { alpha: 0.62, rays: 6, line: 0.32 });
}

/** A fin running along the body from u0 to u1 at v, standing out `h` at its peak (`peak` of the way along). */
function stripFin(d: Draw, b: Body, u0: number, u1: number, v: number, h: number, peak: number, wash: string, deep: string): void {
  const { pen } = d;
  const n = 9;
  const side = Math.sign(v);
  const root = Array.from({ length: n + 1 }, (_, i) => b.at(u0 + ((u1 - u0) * i) / n, v));
  const out = root.map((p, i) => {
    const t = i / n;
    const k = t < peak ? Math.sin((t / peak) * Math.PI * 0.5) : Math.cos(((t - peak) / (1 - peak)) * Math.PI * 0.5) ** 0.7;
    const a = b.ang(u0 + (u1 - u0) * t) + side * 2.3;
    return pt(p.x + Math.cos(a) * h * k, p.y + Math.sin(a) * h * k);
  });
  const shape = [...root, ...[...out].reverse()];
  pen.fill(shape, PAPER_FILL, 0.5);
  pen.fill(shape, wash, 0.8);
  pen.clipped(shape, () => {
    root.forEach((p, i) => i > 0 && i < n && pen.hair([p, out[i]!], 0.24, deep, 0.55));
    pen.stroke(out, 1, deep, 0.45, false);
  });
  pen.stroke(closed(shape), 0.35, d.ink, 0.85, false);
}

/** The body: silver washed over, the slate back along the top, the fiery belly along the shown flank, glitter and scales. */
function paintBody(d: Draw, b: Body): void {
  const { pen } = d;
  const s = b.shape;
  pen.fill(s, PAPER_FILL, 1);
  pen.fill(s, P.flank, 0.9);
  const band = (u0: number, u1: number, v0: (t: number) => number, v1: number): Pt[] => [
    ...Array.from({ length: 14 }, (_, i) => b.at(u0 + ((u1 - u0) * i) / 13, v0(i / 13))),
    ...Array.from({ length: 14 }, (_, i) => b.at(u1 - ((u1 - u0) * i) / 13, v1)),
  ];
  pen.clipped(s, () => {
    // The belly's red, from the throat back to the vent, on the side it's banked to.
    pen.fill(band(0.04, 0.8, (t) => 0.5 + 0.12 * Math.sin(t * Math.PI) + (t > 0.85 ? (t - 0.85) * 2.5 : 0), 1.3), P.belly, 0.88);
    const g = b.at(0.3, 0.9);
    glaze(d, g.x, g.y, 6, 2, b.ang(0.3), P.bellyDeep, 0.5);
    // The dark back, a band along the top of the fish (towards -y, as it banks).
    pen.fill(band(0, 1.02, (t) => -0.12 + 0.18 * Math.sin(t * Math.PI), -1.3), P.back, 0.88);
    const k = b.at(0.4, -0.65);
    glaze(d, k.x, k.y, 8, 2, b.ang(0.4), P.backDeep, 0.5);
    // Silver along the flank, brightest mid-body.
    const m = b.at(0.45, 0.22);
    glaze(d, m.x, m.y, 7.5, 1.7, b.ang(0.45), P.sheen, 0.75);
    scaleRows(d, b, 0.3, 0.95, 12, 6, P.backDeep, 0.3, 0.18);
    const rng = createRng(4401);
    for (let i = 0; i < 40; i++) {
      const p = b.at(0.22 + rng() * 0.72, -0.7 + rng() * 1.45);
      if (rng() < 0.5) pen.dot(p.x, p.y, 0.2, PAPER_FILL, 0.8);
      else pen.dot(p.x, p.y, 0.26, P.backDeep, 0.6);
    }
    // The gill cover's arc, lit along its rim.
    pen.hair([b.at(0.23, -0.95), b.at(0.28, -0.25), b.at(0.26, 0.5), b.at(0.2, 1)], 0.4, P.backDeep, 0.75);
    pen.hair([b.at(0.25, -0.55), b.at(0.29, 0), b.at(0.27, 0.45)], 0.45, PAPER_FILL, 0.45);
    pen.crescent(s, pt(-1.1, -1.5), () => pen.fill(s, P.backDeep, 0.28));
    pen.crescent(s, pt(0.9, 1.3), () => pen.fill(s, PAPER_FILL, 0.16));
  });
  pen.stroke(closed(s), 0.5, d.ink, 0.95);
}

function paintHead(d: Draw, b: Body): void {
  const { pen } = d;
  // The heavy underslung jaw jutting past the snout: its lip line, the chin's red.
  pen.hair([b.at(0.07, -0.8), b.at(0.012, -0.2), b.at(0.012, 0.3), b.at(0.08, 0.88)], 0.45, d.ink, 0.85);
  pen.hair([b.at(0.03, 0.5), b.at(0.1, 0.72)], 0.35, P.bellyDeep, 0.6);
  for (const side of [-1, 1] as const) {
    const e = b.at(0.14, side * 0.7);
    const r = side > 0 ? 1.1 : 0.9;
    const ball = Array.from({ length: 14 }, (_, i) => pt(e.x + Math.cos((i / 14) * 6.283) * r, e.y + Math.sin((i / 14) * 6.283) * r * 0.9));
    pen.fill(ball, P.eye, 1);
    pen.dot(e.x, e.y, r * 0.72, P.iris, 0.9);
    pen.dot(e.x + 0.1, e.y + side * 0.05, r * 0.42, '#161316', 1);
    pen.dot(e.x - r * 0.3, e.y - r * 0.35, r * 0.2, PAPER_FILL, 0.95);
    pen.stroke(closed(ball), 0.3, d.ink, 0.85, false);
    const n = b.at(0.06, side * 0.36);
    pen.dot(n.x, n.y, 0.26, d.ink, 0.8);
  }
}

function draw(d: Draw, pose: Pose): void {
  const dart = pose === 'dart';
  const spine = bentSpine(pt(12, 0), LEN, BEND[pose]);
  const b = bodyAlong(spine, half);
  rings(d, pt(0.5, 0), 13, 8.5, dart ? 1 : 2, 4410, dart ? 0.35 : 0.5);
  if (dart) {
    wake(d, pt(11, 0), 18, 7, 0.65);
    for (const [y, l] of [[-5, 8], [2, 10], [6, 6]] as const) swish(d, pt(-13, y - 6), Math.PI + 0.15, l, 1, 0.45);
  }
  softShadow(d, [b.shape], pt(2.4, 3.4), 0.2, 1.4);
  tailFin(d, b, dart);
  stripFin(d, b, 0.6, 0.9, 0.9, 2.6, 0.25, P.anal, P.bellyDeep);
  paddle(d, b, 0.5, 1, 3, 0.55, P.anal);
  for (const side of [-1, 1] as const) paddle(d, b, 0.27, side, dart ? 3.2 : 4.4, dart ? 1.15 : 0.7, P.pec);
  paintBody(d, b);
  // The dorsal fin, seen nearly edge-on along the back, and the small adipose fin behind it.
  stripFin(d, b, 0.4, 0.68, -0.3, 2.2, 0.3, P.finDeep, P.backDeep);
  const adi = b.at(0.87, -0.3);
  d.pen.fill(Array.from({ length: 10 }, (_, i) => pt(adi.x + Math.cos((i / 10) * 6.283) * 1.1, adi.y + Math.sin((i / 10) * 6.283) * 0.55)), P.backDeep, 0.85);
  paintHead(d, b);
  // The water's glint over the back.
  d.pen.hair(Array.from({ length: 8 }, (_, i) => b.at(0.15 + i * 0.1, -0.5)), 0.35, WATER.lit, 0.35);
}

export const PIRANHA_ART: SpriteArt<Pose> = { frame: 40, res: 3, poses: ['swim0', 'swim1', 'dart'], draw };
