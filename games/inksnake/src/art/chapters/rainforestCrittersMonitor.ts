import { createRng } from '../../logic/rng';
import { blob } from '../groundKit';
import { capsule, closed, type Draw, pt, shade, TAU } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import type { SpriteArt } from '../types';
import { mix } from '../wash';
import { castShadow, glaze, skinWash } from '../critters/preyKit';
import { type Gecko, type GeckoBend, type GeckoBuild, gecko, granules, type LegAt, legJoints, limb, type LimbPaint } from './rainforestCrittersGeckoKit';
import { gape, headMarks, M, tongue } from './rainforestCrittersMonitorHead';

/**
 * The Asian water monitor, seen from above facing +x, prowling the forest
 * floor: about 116 long, more than half of it tail, dark olive-black with
 * rows of pale yellow eye-spots across its back, a long neck and narrow
 * head, sprawling legs with long clawed toes, and a tail banded pale,
 * keeled along the top for swimming.
 *  - 'walk0', 'walk1': a slow sway, legs in diagonal pairs;
 *  - 'run0', 'run1': running at a head, the body swinging hard;
 *  - 'bite': lunging, the head tipped up and jaws wide;
 *  - 'look': lost you, head raised, the forked tongue out tasting the air.
 */
type Pose = 'walk0' | 'walk1' | 'run0' | 'run1' | 'bite' | 'look';

const WIDTH: GeckoBuild['width'] = [
  [0, 2], [2.5, 4.6], [7, 6.6], [11.5, 8.4], [14.5, 8.6], [17.5, 7], [21, 7.6], [26, 13.6], [33, 21], [43, 20.4], [50, 14.6], [54, 10.4], [65, 7.4], [80, 4.8], [100, 2.4], [116, 0.6],
];

const BUILD: GeckoBuild = {
  len: 116,
  snout: 38,
  shoulder: 27,
  hip: 47,
  tailFrom: 51,
  width: WIDTH,
  arm: [8.6, 7.6, 5.2],
  thigh: [10, 8.6, 6.4],
  toe: [5.4, 0.9],
};

/** Looking up, the head is raised towards the eye: drawn a little bigger. */
const LOOK: GeckoBuild = { ...BUILD, width: WIDTH.map(([s, w]) => [s, s < 18 ? w * 1.12 : w] as const) };

const BENDS: Readonly<Record<Pose, GeckoBend>> = {
  walk0: { trunk: 3.6, tail: -11, whip: 6, legs: [0.9, -0.9, -0.9, 0.9] },
  walk1: { trunk: -3.6, tail: 11, whip: -6, legs: [-0.9, 0.9, 0.9, -0.9] },
  run0: { trunk: 6.2, tail: -18, whip: 10, legs: [1, -1, -1, 1], splay: 1.1 },
  run1: { trunk: -6.2, tail: 18, whip: -10, legs: [-1, 1, 1, -1], splay: 1.1 },
  bite: { trunk: 1.2, tail: 8, whip: -4, legs: [0.9, 0.9, -0.6, -0.6], splay: 1.05 },
  look: { trunk: 0.8, tail: 12, whip: -5, legs: [0.3, 0.2, 0, 0.1] },
};

const PAINT: LimbPaint = { wash: M.base, deep: M.deep, mark: M.dark, pad: M.olive };

/** Long thin toes fanned from the foot, each ending in a dark hooked claw. */
function claws(d: Draw, base: Pt, ang: number, spread: number, lens: readonly number[], w: number): void {
  const { pen } = d;
  lens.forEach((l, i) => {
    const a = ang + (i / (lens.length - 1) - 0.5) * spread;
    const end = pt(base.x + Math.cos(a) * l, base.y + Math.sin(a) * l);
    const toe = capsule(base, end, w, w * 0.6);
    skinWash(d, toe, M.base, M.deep);
    pen.stroke(closed(toe), 0.25, d.ink, 0.9, false);
    const tip = pt(end.x + Math.cos(a + 0.35) * 1.6, end.y + Math.sin(a + 0.35) * 1.6);
    pen.hair([end, tip], 0.5, M.claw, 0.95);
  });
}

/** The legs: two banded, scaly segments each and a fan of clawed toes, the hind pair first. */
function legs(d: Draw, joints: readonly LegAt[]): void {
  const [, , w0] = BUILD.arm;
  const [, , h0] = BUILD.thigh;
  for (const i of [2, 3, 0, 1]) {
    const L = joints[i]!;
    const hind = i >= 2;
    const lens = (hind ? [0.55, 0.85, 1, 1.05, 0.7] : [0.55, 0.8, 0.95, 0.85, 0.6]).map((k) => k * BUILD.toe[0] * (hind ? 1.15 : 1));
    claws(d, L.end, L.toeAng, hind ? 1.6 : 1.8, lens, BUILD.toe[1]);
    for (const [a, b, wa, wb] of [[L.joint, L.end, (hind ? h0 : w0) * 0.72, (hind ? h0 : w0) * 0.5], [L.root, L.joint, hind ? h0 : w0, (hind ? h0 : w0) * 0.74]] as const) {
      const shape = limb(d, a, b, wa, wb, PAINT, 0.4);
      d.pen.clipped(shape, () => {
        const rng = createRng(7700 + i);
        for (let k = 0; k < 5; k++) {
          const t = 0.15 + k * 0.18;
          const p = pt(a.x + (b.x - a.x) * t + (rng() - 0.5), a.y + (b.y - a.y) * t + (rng() - 0.5));
          d.pen.dot(p.x, p.y, 0.45 + rng() * 0.3, M.ocellus, 0.55);
        }
      });
    }
  }
}

/** A pale yellow eye-spot with a darker heart, as the rows across a water monitor's back. */
function ocellus(d: Draw, c: Pt, r: number, rng: () => number): void {
  const b = blob(c, r, r * 0.8, rng, 0.25, 12, rng() * TAU);
  d.pen.fill(b, M.ocellus, 0.75);
  d.pen.fill(blob(c, r * 0.45, r * 0.35, rng, 0.3, 10, rng() * TAU), M.dark, 0.65);
  d.pen.hair(closed(b).slice(3, 10), 0.16, d.ink, 0.35);
}

/** The body: dark olive washed and rounded, rows of eye-spots across the back, the tail's pale bands and keel, beaded scales. */
function body(d: Draw, z: Gecko): void {
  const { pen } = d;
  const { shape } = z;
  const rng = createRng(7711);
  skinWash(d, shape, M.base, M.deep, { at: z.at(34, -0.4), r: 14 }, 0.45);
  pen.clipped(shape, () => {
    for (const v of [-0.85, 0.85]) {
      const c = z.at(36, v);
      glaze(d, c.x, c.y, 16, 4, 0, M.olive, 0.4);
    }
    const back = z.at(36, 0);
    glaze(d, back.x, back.y, 18, 5, 0, M.dark, 0.45);
    // Rows of eye-spots across the back, from the shoulders to the hips.
    for (const s of [24, 29.5, 35, 40.5, 46, 51]) {
      const across = Math.max(3, Math.round(z.widthAt(s) / 3.4));
      for (let j = 0; j < across; j++) {
        const v = -0.82 + (1.64 * j) / (across - 1);
        ocellus(d, z.at(s + (rng() - 0.5) * 1.2, v + (rng() - 0.5) * 0.1), 1.05 + rng() * 0.35, rng);
      }
    }
    // The neck's fine pale speckling.
    for (let i = 0; i < 26; i++) {
      const p = z.at(16 + rng() * 9, (rng() - 0.5) * 1.6);
      pen.dot(p.x, p.y, 0.25 + rng() * 0.25, M.pale, 0.5);
    }
    // The tail: pale bands, each a broken ring, and the dark keel along its top.
    for (let s = 54; s < BUILD.len - 4; s += 6.4) {
      const band = [-1, -0.5, 0, 0.5, 1].map((v) => z.at(s + Math.abs(v) * 0.8, v * 1.1));
      pen.hair(band, Math.max(0.6, z.widthAt(s) * 0.22), M.ocellus, 0.5);
    }
    pen.hair(Array.from({ length: 20 }, (_, i) => z.at(50 + i * 3.3, 0)), 0.9, M.deep, 0.55);
    pen.hair(Array.from({ length: 20 }, (_, i) => z.at(50 + i * 3.3, -0.2)), 0.35, M.pale, 0.35);
  });
  pen.clipped(shape, () => granules(d, z, 2, BUILD.len - 2, 1.25, M.deep, 0.35));
  shade(d, shape, 0.22, true);
  pen.clipped(shape, () => pen.crescent(shape, pt(-1.2, -1.8), () => pen.fill(shape, M.deep, 0.3)));
  pen.stroke(closed(shape), 0.65, d.ink, 0.95);
  // Loose folds of skin at the neck.
  for (const s of [19, 21]) for (const v of [-1, 1]) pen.hair([z.at(s, v * 0.95), z.at(s + 0.6, v * 0.55)], 0.3, M.deep, 0.6);
  const lit = z.at(30, -0.5);
  pen.clipped(shape, () => glaze(d, lit.x, lit.y, 7, 2.4, 0, mix(M.olive, PAPER_FILL, 0.4), 0.25));
}

function draw(d: Draw, pose: Pose): void {
  const bend = BENDS[pose];
  const build = pose === 'look' ? LOOK : BUILD;
  const z = gecko(build, bend);
  castShadow(d, z.shape, pt(1.6, 2.4), 0.2);
  legs(d, legJoints(build, z, bend));
  if (pose === 'bite') gape(d, z, 10);
  body(d, z);
  headMarks(d, z, pose === 'bite');
  if (pose === 'look') tongue(d, z, 14, 0.6);
}

export const MONITOR_ART: SpriteArt<Pose> = {
  frame: 170,
  res: 2,
  poses: ['walk0', 'walk1', 'run0', 'run1', 'bite', 'look'],
  draw,
};
