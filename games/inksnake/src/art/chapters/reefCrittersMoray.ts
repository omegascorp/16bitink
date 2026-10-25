import { closed, type Draw, pt } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import type { SpriteArt } from '../types';
import { glaze } from '../critters/preyKit';
import { type EelPose, EEL_POSES, type EelSpec, drawEel, teeth } from './reefCrittersEel';
import { blots, type Body, lift, off, widthOf } from './reefCrittersKit';

/**
 * The yellow-margined moray, seen from above facing +x: a thick muscular
 * eel about 64 long, yellowish olive-brown densely mottled and speckled
 * with dark brown, the fin fold down its back edged yellow-green, a small
 * yellow eye, tubular nostrils at the snout, the dark hole of its gill,
 * and its jaws always a little open (a moray breathes by gaping): the
 * lower jaw showing past the snout, the pale inside of the mouth and its
 * needle teeth.
 */
const M = {
  base: '#a8994c',
  deep: '#3b3216',
  mottle: '#4a3c1a',
  speck: '#e3d58a',
  back: '#7d6f33',
  head: '#b8a65a',
  belly: '#cfc48a',
  fin: '#8f8a3a',
  finEdge: '#c3d24f',
  iris: '#e2bd3a',
  mouth: '#ead2c8',
  throat: '#5a2c2a',
  tooth: '#fbf6ea',
} as const;

const LEN = 64;
const WIDTH = widthOf([[0, 4], [1.2, 6], [4, 7.9], [8, 9.2], [12, 10], [15, 10.6], [30, 10.2], [44, 8.5], [54, 5.4], [60, 2.8], [LEN, 0.6]]);

/** How far the lower jaw shows past the snout. */
const GAPE: Readonly<Record<EelPose, number>> = { out0: 3.4, out1: 3, swim0: 2.2, swim1: 2.2, sleep: 3.6 };

function pattern(d: Draw, z: Body): void {
  const { pen } = d;
  pen.clipped(z.shape, () => {
    for (let i = 0; i < 9; i++) {
      const s = 6 + i * 6.5;
      if (s > z.len) break;
      const c = z.at(s, 0);
      glaze(d, c.x, c.y, z.width(s) * 0.9, z.width(s) * 0.4, 0, M.back, 0.5);
    }
    const h = z.at(3, 0);
    glaze(d, h.x, h.y, 6, 4, 0, M.head, 0.55);
  });
  // Dense dark mottling, finer on the head, then pale speckles between.
  blots(d, z, 190, 77, 1.05, M.mottle, 0.6, (s) => s > 4.5);
  blots(d, z, 40, 78, 0.5, M.mottle, 0.55, (s) => s < 7);
  pen.stipple(z.shape, 260, () => 0.7, 0.22, M.speck);
}

/** A point s along the spine, `w` out to the +y side (absolute, not a share of the body's width). */
function across(z: Body, s: number, w: number): Pt {
  const c = z.at(s, 0);
  const { n } = z.frame(Math.max(0, s));
  return pt(c.x + n.x * w, c.y + n.y * w);
}

/** The lower jaw (under the head, its tip showing past the snout) and the pale open mouth between them. */
function jaw(d: Draw, z: Body, pose: EelPose): void {
  const { pen } = d;
  const g = GAPE[pose];
  const n = 16;
  const halfAt = (s: number): number => {
    const u = Math.min(1, (s + g) / 1.6);
    return (2.9 + Math.min(1.5, Math.max(0, s) * 0.3)) * Math.sqrt(u) * (0.55 + 0.45 * u);
  };
  const side = (k: number, from = -g, to = 7): Pt[] => Array.from({ length: n + 1 }, (_, i) => {
    const s = from + ((to - from) * i) / n;
    return across(z, s, k * halfAt(s));
  });
  const lower = [...side(1), ...side(-1).reverse().slice(1, -1)];
  pen.fill(lower, PAPER_FILL, 1);
  pen.fill(lower, lift(M.base, 0.2), 0.92);
  blots(d, { ...z, shape: lower } as Body, 30, 79, 0.5, M.mottle, 0.5);
  // The inside of the mouth, pale, deepening to the throat; the lower teeth round the jaw's rim.
  const inner = [...side(0.7, -g + 0.6, 6), ...side(-0.7, -g + 0.6, 6).reverse().slice(1, -1)];
  pen.fill(inner, M.mouth, 0.97);
  pen.clipped(inner, () => {
    const t = z.at(-g * 0.15, 0);
    glaze(d, t.x, t.y, 2.6, 1.9, 0, M.throat, 0.95);
    glaze(d, t.x + 0.5, t.y, 1.4, 1, 0, '#1c0d10', 0.9);
  });
  teeth(d, side(0.74, -g + 0.7, 3).reverse(), 0.85, M.tooth);
  teeth(d, side(-0.74, -g + 0.7, 3), 0.85, M.tooth);
  pen.stroke(closed(lower), 0.4, d.ink, 0.9);
}

function head(d: Draw, z: Body, pose: EelPose): void {
  const { pen } = d;
  // Fangs along the upper jaw's front edge, over the open mouth.
  const front = Array.from({ length: 7 }, (_, i) => z.at(0.25 + Math.abs(i - 3) * 0.55, -0.85 + (i / 6) * 1.7));
  teeth(d, front.reverse(), 1.05, M.tooth);
  for (const v of [-1, 1]) {
    // The gape runs back past the eye.
    pen.hair([z.at(0.6, v * 0.78), z.at(3, v * 0.95), z.at(6.2, v * 0.93), z.at(7.6, v * 0.8)], 0.32, d.ink, 0.75);
    const side = [z.at(1, v * 0.86), z.at(2, v * 0.92), z.at(3, v * 0.95), z.at(4, v * 0.95), z.at(5, v * 0.94)];
    teeth(d, v > 0 ? side.reverse() : side, 0.42, M.tooth);
    // Tubular front nostrils poking forward from the snout tip; the back ones over the eyes.
    const n0 = z.at(0.5, v * 0.4);
    const n1 = off(z, 0.6, v * 0.6, 0.9, -0.5);
    pen.stroke([n0, n1], 0.6, M.deep, 0.9, false);
    pen.dot(n1.x, n1.y, 0.22, '#15120a', 1);
    const n2 = z.at(3.2, v * 0.25);
    pen.dot(n2.x, n2.y, 0.3, M.deep, 0.85);
  }
  if (pose === 'sleep') {
    const c = z.at(5, 0);
    pen.clipped(z.shape, () => glaze(d, c.x, c.y, 5, 4, 0, '#8a8f7a', 0.18));
  }
}

const SPEC: EelSpec = {
  frame: 76,
  len: LEN,
  width: WIDTH,
  eye: 3.4,
  gill: 12.4,
  finFrom: 9,
  eyeR: 1.1,
  out: { snout: 18, hole: -9.1, sway: 4.2 },
  wave: { amp: 7, k: 0.9 },
  paint: { base: M.base, deep: M.deep, belly: M.belly, fin: M.fin, finEdge: M.finEdge, iris: M.iris, mouth: M.mouth },
  pattern,
  head,
  fins: jaw,
};

export const MORAY_ART: SpriteArt<EelPose> = { frame: 76, res: 3, poses: EEL_POSES, draw: (d, pose) => drawEel(d, SPEC, pose) };
