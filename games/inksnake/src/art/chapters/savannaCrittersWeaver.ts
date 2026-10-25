import { createRng } from '../../logic/rng';
import { closed, cub, type Draw, pt, TAU } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import type { SpriteArt } from '../types';
import { boxOf, glaze, model, petalBlade, rimLight, shadowOf } from '../critters/birdKit';
import { buildWing, covertRows, mapWing, mirrorY, paintWing, type Wing } from '../critters/birdWing';
import { foldedWing, WEAVER, weaverFeather, weaverFoot, weaverHead, weaverPlumage } from './savannaCrittersWeaverPaint';

/**
 * The village weaver, seen from above facing +x, about 17 long: a stocky
 * yellow finch-like bird, black-masked, with a heavy cone of a bill.
 * 'perch' clings to its hanging nest, wings folded, tail hanging down out
 * of sight but for its tip, toes gripping the weave; 'fly0' (wings swept
 * full out on the downstroke) and 'fly1' (raised and flexed back) are its
 * whirring flight, span about 28; 'dart' hovers over the snake, wings
 * raised high and blurred, the head tipped down to nip.
 */
type Pose = 'perch' | 'fly0' | 'fly1' | 'dart';

const W = WEAVER;
const SEED = 5527;

/** The body: a stout egg. */
function egg(cx: number, rx: number, ry: number): Pt[] {
  return Array.from({ length: 32 }, (_, i) => {
    const a = (i / 32) * TAU;
    const c = Math.cos(a);
    return pt(cx + c * rx, Math.sin(a) * ry * (1 - 0.2 * Math.max(0, -c) ** 1.5));
  });
}

interface Spread {
  readonly lead: readonly [Pt, Pt, Pt, Pt, Pt, Pt, Pt];
  readonly hand: readonly [number, number];
  readonly chord: readonly [number, number, number];
}

const PI = Math.PI;
const WRIST = 0.5;

function wingOf(s: Spread): Wing {
  const [p0, c0, c1, w, c2, c3, end] = s.lead;
  const lead = [...cub(p0, c0, c1, w, 8), ...cub(w, c2, c3, end, 8).slice(1)];
  const [arm, hand, outer] = s.chord;
  return buildWing({
    lead, wrist: WRIST,
    dir: (t) => (t < WRIST ? PI - 0.05 - (t / WRIST) * 0.08 : s.hand[0] + (s.hand[1] - s.hand[0]) * ((t - WRIST) / (1 - WRIST)) ** 1.5),
    chord: (t) => (t < WRIST ? arm : t < 0.85 ? arm + (hand - arm) * ((t - WRIST) / 0.35) : hand + (outer - hand) * ((t - 0.85) / 0.15)),
    secondaries: 6, primaries: 7, secW: 2.6, priW: 2.5,
    coverts: (t) => (t < WRIST ? 0.55 : 0.55 - (t - WRIST) * 0.45),
  });
}

const DOWN: Spread = { lead: [pt(2, 3), pt(3.2, 4.6), pt(4, 6.5), pt(4, 7.8), pt(4, 9.2), pt(3.6, 10.6), pt(2.8, 11.8)], hand: [PI - 0.15, PI / 2 + 0.4], chord: [5, 5.8, 4.4] };
const UP: Spread = { lead: [pt(2, 3), pt(2.8, 4.3), pt(3, 5.6), pt(2.4, 6.8), pt(1.4, 7.8), pt(-0.4, 8.7), pt(-2.6, 9.3)], hand: [PI - 0.05, PI / 2 + 0.9], chord: [4.6, 5.2, 4] };
const HOVER: Spread = { lead: [pt(2.5, 3), pt(3.2, 4), pt(3.6, 5), pt(3.6, 6), pt(3.6, 7), pt(3.4, 8), pt(3, 9)], hand: [PI - 0.2, PI / 2 + 0.5], chord: [4.2, 4.8, 3.8] };

function paintOpen(d: Draw, w: Wing, rng: () => number): void {
  paintWing(d, w, {
    feather: (x) => weaverFeather(d, x.f, x.w, x.primary ? 0.3 : 0.26),
    coverts: (wing) => {
      const b = boxOf(wing.coverts);
      d.pen.fill(wing.coverts, PAPER_FILL, 1);
      d.pen.fill(wing.coverts, W.black, 0.9);
      d.pen.clipped(wing.coverts, () => {
        glaze(d, b.cx, b.cy, b.rx * 0.8, b.ry * 0.6, 0.3, W.olive, 0.4);
        covertRows(wing, 2, (t) => (t < WRIST ? 0.55 : 0.55 - (t - WRIST) * 0.45), (t, r) => 2.2 - r * 0.4 - t * 0.5, (f) => {
          d.pen.fill(f.shape, W.black, 0.6);
          d.pen.hair(f.shape.slice(3, 9), 0.35, rng() < 0.7 ? W.edge : W.lemon, 0.85);
        });
        // The yellow shoulder at the leading edge.
        d.pen.stroke(Array.from({ length: 12 }, (_, i) => wing.at((i / 11) * 0.55, 0.12)), 1.3, W.yellow, 0.8, false);
      });
      model(d, wing.coverts, 1.2, W.deep, { shade: 0.3, hatch: 0.12, lit: 0.05, line: 0 });
      rimLight(d, wing.coverts, W.lemon, 0.4, 0.4);
    },
  });
}

/** The tail: a short square fan of blackish feathers, `spread` across, `len` long. */
function tail(d: Draw, x: number, len: number, spread: number): Pt[] {
  const blades = Array.from({ length: 6 }, (_, i) => {
    const u = i / 5 - 0.5;
    return petalBlade(pt(x, u * 1.6), PI + u * spread, len * (1 - Math.abs(u) * 0.1), 2.4);
  });
  [...blades.slice(0, 3), ...blades.slice(3).reverse()].forEach((b) => weaverFeather(d, b, 2.4, 0.3));
  return blades.flatMap((b) => b.shape);
}

/** Blur ticks round wings beating too fast to see. */
function whirr(d: Draw, side: 1 | -1, r: number): void {
  for (const [a, k] of [[0.5, 1], [0.95, 0.85], [1.35, 0.7]] as const) {
    const c = Math.cos(a);
    const s = Math.sin(a) * side;
    d.pen.hair([pt(c * r, s * r), pt(c * (r + 2.2 * k), s * (r + 2.2 * k))], 0.4, d.ink, 0.55);
  }
}

function draw(d: Draw, pose: Pose): void {
  const rng = createRng(SEED);
  const body = pose === 'perch' ? egg(0, 5.6, 4.2) : egg(0, 6.2, 3.9);
  const backMottle = (p: Pt): number => (p.x < 2.5 && p.x > -4.5 && Math.abs(p.y) < 2.6 ? 0.42 : 0.04);
  if (pose === 'perch') {
    shadowOf(d, [body], 1.2, 0.16);
    tail(d, -4, 3.4, 0.5);
    weaverFoot(d, pt(3.2, 3.6), 1);
    weaverFoot(d, pt(3.2, -3.6), -1);
    weaverPlumage(d, body, rng, { n: 60, size: 1.5, mottle: backMottle });
    foldedWing(d, rng, 1, 0.8);
    foldedWing(d, rng, -1, 0.8);
    weaverHead(d, rng, pt(5.6, 0), 3.1);
    return;
  }
  const spread = pose === 'fly0' ? DOWN : pose === 'fly1' ? UP : HOVER;
  const right = wingOf(spread);
  const wings = [right, mapWing(right, mirrorY)];
  if (pose === 'dart') for (const s of [1, -1] as const) whirr(d, s, 10);
  tail(d, -4.5, pose === 'dart' ? 5.6 : 6.4, pose === 'dart' ? 0.9 : 0.6);
  for (const w of wings) paintOpen(d, w, rng);
  weaverPlumage(d, body, rng, { n: 60, size: 1.5, mottle: backMottle });
  weaverHead(d, rng, pt(6.2, 0), pose === 'dart' ? 2.8 : 3.1, pose === 'dart' ? 1 : 0);
}

export const WEAVER_ART: SpriteArt<Pose> = { frame: 40, res: 3, poses: ['perch', 'fly0', 'fly1', 'dart'], draw };
