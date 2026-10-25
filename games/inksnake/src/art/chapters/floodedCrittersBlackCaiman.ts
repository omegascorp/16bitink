import { createRng } from '../../logic/rng';
import { blob } from '../groundKit';
import { type Draw, pt } from '../kit';
import type { SpriteArt } from '../types';
import { ellipseAt, glaze } from '../critters/preyKit';
import { onLayer } from '../critters/tomcatKit';
import { gape } from './floodedCrittersBlackCaimanJaws';
import { CROC_U, type CrocLeg, crocBody, crocEyes, type CrocPaint, paintCroc } from './floodedCrittersCroc';
import { type Body, bubble, film, rings, wake, WATER } from './floodedCrittersKit';

/**
 * The black caiman, the Flooded Forest's lurker, from above facing +x: the
 * Amazon's biggest predator, near-black with faint grey crossbands on its
 * flanks, a heavy brownish head and a pale lower jaw. The frame's centre is
 * its head (where it bites); the rest lies under the black water. 'eyes':
 * only its eyes and nostrils break the surface, a dark shape just below;
 * 'bubbles': bubbles rising round its snout, the tell; 'lunge': jaws wide,
 * head and shoulders thrown out of the water in a burst of spray; 'under':
 * a long dark shape gliding beneath the surface.
 */
type Pose = 'eyes' | 'bubbles' | 'lunge' | 'under';

export const BLACK_CAIMAN: CrocPaint = {
  base: '#2f302a',
  deep: '#121210',
  light: '#5c5c50',
  band: '#6c6a58',
  scute: '#2b2b25',
  head: '#3d392e',
  jaw: '#b2a47c',
  foot: '#2a2a24',
  iris: '#c99c30',
};

const LEN = 150;
const K = LEN / 108;
/** The snout's tip: the eyes sit about the frame's centre. */
const SNOUT = 20;

const LUNGE_LEGS: readonly CrocLeg[] = [
  { u: CROC_U.fore, side: 1, elbow: [3, 7], foot: [9, 9], hind: false },
  { u: CROC_U.fore, side: -1, elbow: [3, 7], foot: [9, 9], hind: false },
];

/** Fades a layer out towards the back (x below `from`, gone by `to`): what's under the black water. */
function fadeBack(d: Draw, from: number, to: number): void {
  const { ctx } = d.pen;
  ctx.save();
  ctx.globalCompositeOperation = 'destination-in';
  const g = ctx.createLinearGradient(from, 0, to, 0);
  g.addColorStop(0, 'rgba(0,0,0,1)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(-120, -120, 240, 240);
  ctx.restore();
}

/** The dark shape of the whole animal just under the surface, soft and fading back into the depth. */
function shadowShape(d: Draw, b: Body, alpha: number, blur: number, fadeFrom: number): void {
  onLayer(d, (l) => {
    l.pen.fill(b.shape, BLACK_CAIMAN.deep, 1);
    for (const u of [CROC_U.fore, CROC_U.hind]) {
      for (const s of [-1, 1]) {
        const q = b.at(u, s * 1.2);
        l.pen.fill(ellipseAt(q.x, q.y, 4 * K, 2.4 * K, b.ang(u) + s * 0.6, 10), BLACK_CAIMAN.deep, 1);
      }
    }
    fadeBack(l, fadeFrom, -96);
  }, alpha, blur);
}

/** Glints of light on the surface over a submerged shape. */
function surface(d: Draw, seed: number, n: number, rx: number, ry: number, cx: number): void {
  const rng = createRng(seed + d.f * 13);
  for (let i = 0; i < n; i++) {
    const p = pt(cx + (rng() - 0.5) * rx * 2, (rng() - 0.5) * ry * 2);
    const l = 2 + rng() * 5;
    d.pen.hair([p, pt(p.x + l * 0.5, p.y + 0.4), pt(p.x + l, p.y)], 0.55, WATER.lit, 0.4 + rng() * 0.3);
  }
}

/** Just the eyes and the nostrils' disc above the water, each with its own little ring. */
function eyesUp(d: Draw, b: Body): void {
  const { pen } = d;
  shadowShape(d, b, 0.3, 3, 0);
  for (const s of [-1, 1]) {
    const e = b.at(CROC_U.eye, s * 0.52);
    rings(d, e, 4.2 * K, 3.4 * K, 2, 8100 + s, 0.75);
  }
  const n = b.at(0.022, 0);
  rings(d, n, 3.2 * K, 3.6 * K, 2, 8103, 0.75);
  // The skull's top, a dark wet line between them, barely awash.
  const ridge = [b.at(CROC_U.eye - 0.02, -0.4), b.at(CROC_U.eye + 0.02, 0), b.at(CROC_U.eye - 0.02, 0.4)];
  pen.hair(ridge, 1.4 * K, BLACK_CAIMAN.head, 0.6);
  pen.hair(ridge, 0.35 * K, WATER.lit, 0.4);
  crocEyes(d, b, BLACK_CAIMAN, K);
  const disc = ellipseAt(n.x, n.y, 1.9 * K, 2.3 * K, b.ang(0.022), 14);
  pen.fill(disc, BLACK_CAIMAN.head, 1);
  pen.clipped(disc, () => pen.crescent(disc, pt(-0.4 * K, -0.6 * K), () => pen.fill(disc, BLACK_CAIMAN.deep, 0.55)));
  for (const s of [-1, 1]) {
    const q = b.at(0.022, s * 0.32);
    pen.fill(ellipseAt(q.x, q.y, 0.75 * K, 0.4 * K, b.ang(0.022) + s * 0.5, 8), '#0c0b0c', 0.95);
  }
  pen.stroke([...disc, disc[0]!], 0.35 * K, d.ink, 0.85, false);
  // Water beading on the bumps.
  for (const s of [-1, 1]) {
    const e = b.at(CROC_U.eye, s * 0.52);
    film(d, ellipseAt(e.x + 2.2 * K, e.y, 2.6 * K, 2.6 * K, 0, 12), 0.25, 8110 + s);
  }
}

/** Bubbles rising round the snout, drifting a little with each boil frame. */
function bubbles(d: Draw, b: Body): void {
  const rng = createRng(8120 + d.f * 31);
  const n = b.at(0.05, 0);
  for (let i = 0; i < 9; i++) {
    const a = rng() * Math.PI * 2;
    const r = (3 + rng() * 9) * K;
    bubble(d, pt(n.x + Math.cos(a) * r + 2, n.y + Math.sin(a) * r * 0.9), (0.8 + rng() * 1.5) * K);
  }
  rings(d, n, 8 * K, 7 * K, 3, 8121, 0.6);
}

/** White water where the body bursts from the surface: foam along the waterline, a crown of drops flung out. */
function splash(d: Draw, b: Body): void {
  const { pen } = d;
  const rng = createRng(8130 + d.f * 7);
  for (const s of [-1, 1]) {
    for (let i = 0; i < 7; i++) {
      const u = 0.24 + i * 0.03;
      const q = b.at(u, s * (1.05 + rng() * 0.25));
      const foam = blob(q, (1.1 + rng() * 1.2) * K, (0.7 + rng() * 0.7) * K, rng, 0.35, 12, b.ang(u));
      pen.fill(foam, WATER.lit, 0.55);
      pen.hair(foam.slice(2, 8), 0.3, WATER.lit, 0.9);
    }
    for (let i = 0; i < 7; i++) {
      const u = 0.12 + rng() * 0.22;
      const base = b.at(u, s * 1.2);
      const a = b.ang(u) + s * (Math.PI / 2 + (rng() - 0.3) * 0.9);
      const r = (4 + rng() * 9) * K;
      const q = pt(base.x + Math.cos(a) * r, base.y + Math.sin(a) * r);
      const rr = (0.5 + rng() * 0.7) * K;
      // A drop flung out, a short streak behind it.
      pen.hair([pt(q.x - Math.cos(a) * rr * 3, q.y - Math.sin(a) * rr * 3), q], rr * 0.8, WATER.lit, 0.55);
      pen.dot(q.x, q.y, rr, WATER.lit, 0.95);
      pen.dot(q.x + rr * 0.3, q.y + rr * 0.4, rr * 0.5, WATER.deep, 0.25);
    }
  }
}

/** The lunge: head and shoulders out of the water in a burst of spray, the jaws thrown wide. */
function lunge(d: Draw): void {
  const b = crocBody(pt(SNOUT + 12, 0), LEN, (u) => 3 * u * u);
  rings(d, b.at(0.26, 0), 16 * K, 13 * K, 3, 8131, 0.7);
  shadowShape(d, b, 0.4, 2.5, -10);
  onLayer(d, (l) => {
    paintCroc(l, b, BLACK_CAIMAN, LUNGE_LEGS, K, { bands: 0.35 });
    gape(l, b, BLACK_CAIMAN, LEN);
    fadeBack(l, -2, -50);
  }, 1, 0);
  // The water closing over the back, and the spray thrown up round the shoulders.
  const back = [b.at(0.3, 1.6), b.at(0.3, -1.6), pt(-100, -26), pt(-100, 26)];
  d.pen.fill(back, WATER.murk, 0.25);
  splash(d, b);
}

function draw(d: Draw, pose: Pose): void {
  const b = crocBody(pt(SNOUT, 0), LEN, (u) => (pose === 'under' ? 9 * Math.sin(u * 3.4) * u : 2.5 * u * u));
  switch (pose) {
    case 'eyes':
      eyesUp(d, b);
      return;
    case 'bubbles':
      eyesUp(d, b);
      bubbles(d, b);
      return;
    case 'lunge':
      lunge(d);
      return;
    case 'under': {
      shadowShape(d, b, 0.42, 2.2, 0);
      surface(d, 8140, 10, 40, 14, -10);
      // The pale stirred water over the head as it noses along.
      const h = b.at(0.06, 0);
      glaze(d, h.x, h.y, 10 * K, 6 * K, 0, WATER.lit, 0.12);
      wake(d, b.at(0, 0), 26 * K, 10 * K, 0.35);
    }
  }
}

export const BLACK_CAIMAN_ART: SpriteArt<Pose> = { frame: 200, res: 2, poses: ['eyes', 'bubbles', 'lunge', 'under'], draw };
