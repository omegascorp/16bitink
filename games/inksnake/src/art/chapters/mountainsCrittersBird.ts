import { createRng, type Rng } from '../../logic/rng';
import { ellipseAt, glaze, lanceBlade, shadowOf } from '../critters/birdKit';
import { mapWing } from '../critters/birdWing';
import { type Draw, pt } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import type { SpriteArt } from '../types';
import { mix } from '../wash';
import { type Bird, bill, billShape, egg, eye, feet, plumage, songFeather, tail } from './mountainsCrittersBirdKit';
import { folded, foldedOutlines, openWings, paintFolded, paintOpen } from './mountainsCrittersBirdWing';

/**
 * One of the Mountains' songbirds, all poses: 'idle' (standing, head up,
 * toes by the chest), 'hop' (mid-hop, wings tight, tail cocked, its shadow
 * fallen away), 'peck' (head thrust down at the ground, the bill
 * foreshortened, tail tipped up), 'fly0' (wings spread, downstroke),
 * 'fly1' (wings raised and swept), 'sleep' (fluffed round, head sunk in,
 * eyes shut). Painted in bird units (about 44 bill to tail) and scaled to
 * `length` board px.
 */
export type BirdPose = 'idle' | 'hop' | 'peck' | 'fly0' | 'fly1' | 'sleep';
export const BIRD_POSES: readonly BirdPose[] = ['idle', 'hop', 'peck', 'fly0', 'fly1', 'sleep'];

/** A bird's head as one pose holds it. */
interface Head {
  readonly c: Pt;
  readonly rx: number;
  readonly ry: number;
  /** How much of the bill shows (1 level, less pointed down). */
  readonly bill: number;
  readonly shut: boolean;
}

/** The crest (a lark's): pointed crown feathers raised and fanned back over the nape, dark-streaked. */
function crest(d: Draw, bird: Bird, h: Head, len: number): void {
  const { p } = bird;
  const root = pt(h.c.x + h.rx * 0.5, 0);
  // A spray of pointed feathers fanned back over the nape, the longest down the middle, their dark centres making it spiky.
  const blades = [-0.5, 0.5, -0.26, 0.26, 0].map((a, i) => lanceBlade(pt(root.x - Math.abs(a) * 2, a * 1.6), Math.PI + a, len * (i === 4 ? 1 : 0.8 - Math.abs(a) * 0.45), 4.6 - Math.abs(a) * 2.6, -a * 0.1));
  shadowOf(d, blades.map((b) => b.shape), 2.6, 0.3);
  const tone = mix(p.crown ?? p.base, p.streak, 0.35);
  for (const b of blades) songFeather(d, b, 3, { base: tone, centre: mix(p.streak, '#000000', 0.25), edge: p.fringe, centreK: 0.7, edgeW: 0.4, line: 0.3 });
}

/** The head: crown feathers combed back, the brow, a mask or a rosy face, the eyes at its sides, the bill. */
function head(d: Draw, bird: Bird, rng: Rng, h: Head): void {
  const { pen } = d;
  const { p, b } = bird;
  const shape = ellipseAt(h.c.x, h.c.y, h.rx, h.ry, 0, 28);
  plumage(d, shape, rng, p, { n: 22, size: 1.7, streak: p.streaks * 0.8, tone: p.crown ?? p.base, line: 0 });
  // Firm round the face, soft where the nape runs into the back.
  const ring = [...shape, shape[0]!];
  pen.stroke([...ring.slice(22), ...ring.slice(1, 7)], 0.6, d.ink, 0.95, false);
  pen.hair(ring.slice(6, 23), 0.35, d.ink, 0.55);
  const e = (s: number): Pt => pt(h.c.x + h.rx * 0.28, s * (h.ry - 0.75));
  pen.clipped(shape, () => {
    for (const s of [-1, 1]) {
      if (p.face) glaze(d, h.c.x + h.rx * 0.3, s * h.ry * 0.8, h.rx * 0.6, h.ry * 0.35, 0, p.face, 0.6);
      if (p.mask) {
        // The black mask: from the bill's base back through the eye to the ear, a band down the head's side.
        const band = [pt(h.c.x + h.rx * 1.05, s * 0.7), pt(h.c.x + h.rx * 0.45, s * h.ry * 0.64), pt(h.c.x - h.rx * 0.4, s * h.ry * 0.74), pt(h.c.x - h.rx * 1.05, s * h.ry * 0.86), pt(h.c.x - h.rx, s * h.ry * 1.3), pt(h.c.x + h.rx * 1.1, s * h.ry * 1.3)];
        pen.fill(band, p.mask, 0.92);
        pen.hair(band.slice(0, 4), 0.35, mix(p.mask, PAPER_FILL, 0.3), 0.4);
      }
      if (p.brow) pen.hair([pt(h.c.x + h.rx * 0.85, s * h.ry * (p.mask ? 0.5 : 0.38)), pt(h.c.x + h.rx * 0.2, s * h.ry * (p.mask ? 0.58 : 0.48)), pt(h.c.x - h.rx * 0.6, s * h.ry * (p.mask ? 0.64 : 0.5))], 0.9, p.brow, 0.85);
    }
  });
  for (const s of [-1, 1]) eye(d, e(s), 0.85, s, p.eye, h.shut);
  if (b.crest) crest(d, bird, h, b.crest);
  bill(d, bird, h.c.x + h.rx * 0.82, h.bill);
}

/** Grit flicked up where the bill strikes the ground. */
function grit(d: Draw, at: Pt): void {
  for (const [a, r, s] of [[-1, 1.6, 0.32], [0.3, 2.1, 0.28], [1.1, 1.5, 0.3], [-0.3, 2.8, 0.22], [0.8, 3, 0.2]] as const) d.pen.dot(at.x + Math.cos(a) * r, at.y + Math.sin(a) * r, s, d.ink, 0.85);
}

/** On the ground: tail, body, folded wings, head. */
function grounded(d: Draw, bird: Bird, pose: 'idle' | 'hop' | 'peck' | 'sleep', seed: number): void {
  const { p, b } = bird;
  const rng = createRng(seed);
  const sleep = pose === 'sleep';
  const body = sleep ? egg(-0.3, b.rx * 0.97, b.ry * 1.24) : egg(0, b.rx, b.ry);
  const [tl, th] = b.tail;
  const t = pose === 'hop' ? [tl * 0.86, th * 1.35] : pose === 'peck' ? [tl * 0.84, th * 1.12] : sleep ? [tl * 0.9, th] : [tl, th];
  const x0 = -b.rx * 0.72;
  const h: Head = pose === 'peck'
    ? { c: pt(b.hx + 2.4, 0), rx: b.hr[0] * 0.94, ry: b.hr[1] * 0.92, bill: 0.55, shut: false }
    : sleep ? { c: pt(b.hx - 1.8, 0), rx: b.hr[0] * 1.04, ry: b.hr[1] * 1.12, bill: 0.72, shut: true }
      : { c: pt(b.hx, 0), rx: b.hr[0], ry: b.hr[1], bill: 1, shut: false };
  const wings = [folded(bird, false, sleep ? 0.9 : 0), folded(bird, true, sleep ? 0.9 : 0)];
  const neck = ellipseAt(b.hx - 0.5, 0, b.hr[0] * 0.9, b.hr[1] * 0.85, 0, 18);
  const sil = [body, ellipseAt(h.c.x, 0, h.rx, h.ry), billShape(b, h.c.x + h.rx * 0.82, h.bill), ...wings.flatMap(foldedOutlines), ...(pose === 'peck' ? [neck] : [])];
  shadowOf(d, sil, pose === 'hop' ? 4.5 : 1.6, pose === 'hop' ? 0.1 : 0.2);
  if (pose === 'idle') feet(d, bird, b.rx * 0.6, b.ry * 0.72);
  tail(d, bird, x0, t[0]!, t[1]!);
  plumage(d, body, rng, p, { n: 62, size: 2.5, streak: p.streaks, ruffle: sleep ? 0.6 : 0 });
  if (p.rump) d.pen.clipped(body, () => glaze(d, -b.rx * 0.85, 0, b.rx * 0.45, b.ry * 0.55, 0, p.rump!, 0.7));
  for (const w of wings) paintFolded(d, bird, w, rng);
  if (pose === 'peck') plumage(d, neck, rng, p, { n: 12, size: 1.8, streak: p.streaks * 0.6, tone: p.crown ?? p.base, line: 0.6 });
  head(d, bird, rng, h);
  if (pose === 'peck') grit(d, pt(h.c.x + h.rx * 0.82 + b.bill[0] * 0.55 + 0.6, 0));
}

/** In the air: fanned tail, spread wings, the body over their roots, head. */
function flying(d: Draw, bird: Bird, up: boolean, seed: number, reach: number): void {
  const { p, b } = bird;
  const rng = createRng(seed + 1);
  tail(d, bird, -b.rx * 0.72, b.tail[0] * 0.95, b.tail[1] * 1.7);
  // The wings drawn no wider than the frame allows.
  const k = Math.min(1, reach / 37);
  for (const w of openWings(bird, up)) paintOpen(d, bird, mapWing(w, (q) => pt(q.x, q.y * k)));
  const body = egg(0.4, b.rx * 0.96, b.ry * 0.86);
  plumage(d, body, rng, p, { n: 50, size: 2.4, streak: p.streaks });
  if (p.rump) d.pen.clipped(body, () => glaze(d, -b.rx * 0.8, 0, b.rx * 0.4, b.ry * 0.5, 0, p.rump!, 0.7));
  head(d, bird, rng, { c: pt(b.hx, 0), rx: b.hr[0], ry: b.hr[1], bill: 1, shut: false });
}

/** A songbird's sprite: `frame` board px across, the bird `length` board px from bill tip to tail tip. */
export function songbird(bird: Bird, frame: number, length: number, seed: number): SpriteArt<BirdPose> {
  const total = bird.b.hx + bird.b.hr[0] * 0.82 + bird.b.bill[0] + bird.b.rx * 0.72 + bird.b.tail[0];
  const k = length / total;
  // Centre the bird on the frame: its bill tip and tail tip sit equally far out.
  const shift = (bird.b.rx * 0.72 + bird.b.tail[0] - (bird.b.hx + bird.b.hr[0] * 0.82 + bird.b.bill[0])) / 2;
  return {
    frame,
    res: 4,
    poses: BIRD_POSES,
    draw: (d: Draw, pose: BirdPose) => {
      const { ctx } = d.pen;
      ctx.save();
      ctx.scale(k, k);
      ctx.translate(shift, 0);
      if (pose === 'fly0' || pose === 'fly1') flying(d, bird, pose === 'fly1', seed, frame / 2 / k - 2.5);
      else grounded(d, bird, pose, seed);
      ctx.restore();
    },
  };
}
