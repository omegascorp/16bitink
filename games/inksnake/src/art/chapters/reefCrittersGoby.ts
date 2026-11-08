import { closed, type Draw, pt, shade } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import type { SpriteArt } from '../types';
import { castShadow, glaze } from '../critters/preyKit';
import { type Body, bodyOf, fin, fishEye, lift, off, roundness, scaleRows, widthOf } from './reefCrittersKit';

/**
 * The yellow watchman goby (it keeps house with a shrimp in the reef's
 * sand), seen from above facing +x: a small blunt-headed fish about 21
 * long with its tail, butter-yellow with faint brownish saddles and
 * pale-blue spots on the head and cheeks, the eyes bulging high on top of
 * the head, two thin dorsal fins down the back and broad rounded pectoral
 * fans. 'idle' hovers with every fin spread; 'dart' is the quick burst,
 * the body bent, the fins clapped back.
 */
const G = {
  base: '#e6b23e',
  deep: '#94611c',
  saddle: '#b9852c',
  head: '#efc457',
  blue: '#5fa9d6',
  blueDeep: '#2f5f8f',
  fin: '#f0c75a',
  finDeep: '#c08a2c',
  iris: '#d7a335',
} as const;

type Pose = 'idle' | 'dart';

/** Snout to the root of the tail; the tail fin runs on past it. */
const LEN = 16;
const TAIL = 5.6;
const SNOUT = 10.6;

const WIDTH = widthOf([[0, 2.4], [1, 3.8], [2.6, 4.7], [4.6, 5.1], [7, 4.7], [10, 3.7], [13, 2.5], [LEN, 1.7]]);

/** How a pose bends it: the spine's swing (tail), the head's counter-swing, how spread the fins are. */
interface Bend {
  readonly tail: number;
  readonly head: number;
  readonly spread: number;
}

const BENDS: Readonly<Record<Pose, Bend>> = {
  idle: { tail: 0.9, head: -0.2, spread: 1 },
  dart: { tail: -4.6, head: 1.1, spread: 0.25 },
};

function spineAt(b: Bend, s: number): Pt {
  const u = s / LEN;
  return pt(SNOUT - s, b.tail * u ** 1.8 + b.head * (1 - u) ** 2 - b.head * 0.25);
}

/** The tail fin: rounded and a little pointed, its rays fanning from the root, bending with the spine. */
function tailFin(d: Draw, z: Body, b: Bend): void {
  const n = 14;
  const root = Array.from({ length: n + 1 }, (_, i) => z.at(LEN - 0.3, -1 + (2 * i) / n));
  const end = spineAt(b, LEN);
  const { f, n: nn } = z.frame(LEN);
  // The fin carries on the spine's curve a little.
  const curl = b.tail * 0.09;
  const half = 1.6 + 1.7 * b.spread;
  const edge = Array.from({ length: n + 1 }, (_, i) => {
    const v = -1 + (2 * i) / n;
    const reach = TAIL * (1 - 0.32 * v * v) + 0.4 * Math.abs(Math.sin(v * 7));
    return pt(end.x - f.x * reach + nn.x * (v * half + curl * reach), end.y - f.y * reach + nn.y * (v * half + curl * reach));
  });
  const shape = fin(d, root, edge, { wash: G.fin, alpha: 0.6, ray: G.finDeep, rays: 11, margin: G.blue, marginAlpha: 0.35, line: 0.26 });
  d.pen.clipped(shape, () => {
    for (const [t, v] of [[0.45, -0.4], [0.6, 0.3], [0.75, -0.1], [0.4, 0.6]] as const) {
      const p = pt(end.x - f.x * TAIL * t + nn.x * v * half, end.y - f.y * TAIL * t + nn.y * v * half);
      d.pen.dot(p.x, p.y, 0.32, G.blue, 0.7);
    }
  });
}

/** The pectoral fans: broad and round, spread out and back when hovering, clapped to the flanks in a dart. */
function pectorals(d: Draw, z: Body, b: Bend): void {
  for (const side of [-1, 1]) {
    const s0 = 3.9;
    const s1 = 5.5;
    const n = 10;
    const root = Array.from({ length: n + 1 }, (_, i) => z.at(s0 + ((s1 - s0) * i) / n, side * 0.8));
    const { f, n: nn } = z.frame((s0 + s1) / 2);
    const c = z.at((s0 + s1) / 2, side * 0.8);
    const out = pt(nn.x * side, nn.y * side);
    // Fanned from just forward of straight out to lying back along the flank; folded, only the back part.
    const [p0, p1] = [-0.35 + 1.3 * (1 - b.spread), 1.62];
    const reach = 3.1 + 0.6 * b.spread;
    const edge = Array.from({ length: n + 1 }, (_, i) => {
      const t = i / n;
      const p = p0 + (p1 - p0) * t;
      const r = reach * (0.82 + 0.28 * Math.sin(Math.PI * t)) * (t < 0.08 ? 0.75 + t * 3 : 1);
      const dir = pt(out.x * Math.cos(p) - f.x * Math.sin(p), out.y * Math.cos(p) - f.y * Math.sin(p));
      return pt(c.x + dir.x * r, c.y + dir.y * r);
    });
    fin(d, root, edge, { wash: G.fin, alpha: 0.55, ray: G.finDeep, rays: 10, margin: G.finDeep, marginAlpha: 0.25, line: 0.24 });
  }
}

/** A dorsal fin seen from above: a thin sliver along the midline, leaning a little so its rays catch the light. */
function dorsal(d: Draw, z: Body, s0: number, s1: number, lean: number, spots: boolean): void {
  const n = 8;
  const root = Array.from({ length: n + 1 }, (_, i) => z.at(s0 + ((s1 - s0) * i) / n, 0.05));
  const edge = Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n;
    return z.at(s0 + (s1 - s0) * t + 0.5, -lean * Math.sin(Math.PI * Math.min(1, t * 1.15)));
  });
  const shape = fin(d, root, edge, { wash: G.fin, alpha: 0.55, ray: G.deep, rays: 6, line: 0.22 });
  if (spots) d.pen.clipped(shape, () => edge.slice(2, 7).forEach((p, i) => i % 2 === 0 && d.pen.dot(p.x, p.y, 0.28, G.blue, 0.8)));
  d.pen.hair(root, 0.32, G.deep, 0.7);
}

/** The body: washed yellow, rounded, faint saddles, scales, the blue-spotted head, the bulging eyes. */
function body(d: Draw, z: Body): void {
  const { pen } = d;
  const { shape } = z;
  pen.fill(shape, PAPER_FILL, 1);
  pen.fill(shape, G.base, 0.9);
  pen.clipped(shape, () => {
    const h = z.at(2.4, 0);
    glaze(d, h.x, h.y, 3.6, 2.6, 0, G.head, 0.7);
    for (const [s, w] of [[6.2, 1.5], [9.2, 1.45], [12.2, 1.25], [14.9, 1]] as const) {
      pen.hair([z.at(s + 0.5, -1.1), z.at(s - 0.2, -0.45), z.at(s - 0.45, 0), z.at(s - 0.2, 0.45), z.at(s + 0.5, 1.1)], w, G.saddle, 0.62);
      pen.hair([z.at(s + 0.1, -0.5), z.at(s - 0.25, 0), z.at(s + 0.1, 0.5)], w * 0.35, G.deep, 0.35);
    }
    pen.hair(Array.from({ length: 10 }, (_, i) => z.at(4 + i * 1.3, 0)), 0.9, G.deep, 0.22);
    pen.stipple(shape, 70, () => 0.5, 0.18, G.deep);
  });
  scaleRows(d, z, 5.2, LEN, 0.85, G.deep, 0.32, 0.13);
  roundness(d, z, 1, LEN - 1, G.deep, 0.34);
  shade(d, shape, 0.14);
  pen.clipped(shape, () => {
    // Pale-blue spots edged darker on the cheeks and nape.
    for (const [s, v, r] of [[1.6, 0.62, 0.42], [2.9, -0.7, 0.4], [3.6, 0.78, 0.36], [1.2, -0.45, 0.32], [4.8, -0.55, 0.3], [4.6, 0.45, 0.3], [5.8, 0.75, 0.26], [6.4, -0.8, 0.26]] as const) {
      const c = z.at(s, v);
      pen.dot(c.x + 0.12, c.y + 0.15, r * 1.15, G.blueDeep, 0.5);
      pen.dot(c.x, c.y, r, G.blue, 0.95);
    }
  });
  pen.stroke(closed(shape), 0.4, d.ink, 0.95);
  // Mouth: a fine line round the blunt snout; gill covers behind the cheeks.
  pen.hair([z.at(0.9, -0.85), z.at(0.25, -0.4), z.at(0.05, 0), z.at(0.25, 0.4), z.at(0.9, 0.85)], 0.22, d.ink, 0.6);
  for (const v of [-1, 1]) pen.hair([z.at(3.6, v * 0.95), z.at(4.5, v * 0.7), z.at(4.9, v * 0.3)], 0.2, G.deep, 0.6);
  // The eyes, high and close together, bulging from the crown.
  for (const v of [-1, 1]) {
    const e = z.at(2.3, v * 0.44);
    pen.dot(e.x, e.y, 1.15, lift(G.head, 0.2), 1);
    fishEye(d, e, 0.92, G.iris);
  }
}

function draw(d: Draw, pose: Pose): void {
  const b = BENDS[pose];
  const z = bodyOf((s) => spineAt(b, s), WIDTH, LEN, 48);
  castShadow(d, z.shape, pt(1.6, 2.2), 0.16);
  tailFin(d, z, b);
  pectorals(d, z, b);
  body(d, z);
  dorsal(d, z, 5.6, 8.8, 0.55 * (0.5 + b.spread * 0.5), false);
  dorsal(d, z, 9.6, 14.4, 0.5 * (0.5 + b.spread * 0.5), true);
}

export const GOBY_ART: SpriteArt<Pose> = { frame: 30, res: 4, poses: ['idle', 'dart'], draw };
