import { createRng } from '../../logic/rng';
import { blob } from '../groundKit';
import { closed, type Draw, pt, shade, TAU } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import type { SpriteArt } from '../types';
import { mix } from '../wash';
import { castShadow, glaze, skinWash } from '../critters/preyKit';
import { bump, scatter } from './barrensCrittersKit';
import { type Gecko, type GeckoBend, type GeckoBuild, gecko, geckoLegs, granules, legJoints, type LimbPaint, slitEye } from './rainforestCrittersGeckoKit';

/**
 * The tokay gecko, seen from above facing +x: a big, stout gecko about 54
 * long with its tail, blue-grey with brick-orange spots and pale bluish
 * ones, warty tubercles in rows, a broad triangular head with huge
 * orange-gold eyes, a tail ringed grey and pale, and broad padded toes.
 *  - 'idle': resting, tail in a lazy curve;
 *  - 'run0', 'run1': scurrying, the body swinging, legs in diagonal pairs;
 *  - 'sleep': bitten and asleep, curled round on itself, eyes shut, z's;
 *  - 'flat': pressed flat to the bark while a glide passes, legs splayed.
 */
const T = {
  base: '#7e8eae',
  deep: '#2c3350',
  grey: '#9aa6c0',
  orange: '#df7a3a',
  orangeDeep: '#9c4420',
  pale: '#d7e0f1',
  ring: '#4f5a7a',
  pad: '#b9c2d6',
  iris: '#e3a13a',
  irisDeep: '#8e5418',
  lip: '#c7cfe0',
} as const;

type Pose = 'idle' | 'run0' | 'run1' | 'sleep' | 'flat';

const BUILD: GeckoBuild = {
  len: 56,
  snout: 25,
  shoulder: 15.5,
  hip: 30.5,
  tailFrom: 32,
  width: [[0, 3], [2, 7], [5.5, 10.4], [9, 12.2], [11.5, 10.6], [13.5, 9.4], [16, 11.6], [23, 13.4], [30, 12.2], [33, 7.6], [40, 5.6], [48, 3.4], [56, 0.8]],
  arm: [5.6, 5, 3.3],
  thigh: [6.4, 6, 4],
  toe: [4.6, 1.15],
};

const BENDS: Readonly<Record<Pose, GeckoBend>> = {
  idle: { trunk: 0.8, tail: 7, whip: -3, legs: [0.4, 0.3, 0.1, 0.2] },
  run0: { trunk: 2.8, tail: -10, whip: 4, legs: [1, -1, -1, 1] },
  run1: { trunk: -2.8, tail: 10, whip: -4, legs: [-1, 1, 1, -1] },
  sleep: { trunk: 4.5, tail: 0, whip: 0, legs: [-0.2, 0.7, 0.7, -0.5], splay: 0.75, curl: 3.6 },
  flat: { trunk: 0.3, tail: 3, whip: -1, legs: [0.6, 0.6, 0.3, 0.3], splay: 1.25, flat: 0.14 },
};

const PAINT: LimbPaint = { wash: T.base, deep: T.deep, mark: T.ring, pad: T.pad };

/** Where the spots sit: (s, v) along and across the back, orange or pale. */
const SPOTS: readonly (readonly [number, number, 'o' | 'p'])[] = [
  [7, -0.45, 'o'], [7, 0.45, 'o'], [10.5, 0, 'p'], [16, -0.6, 'o'], [16.5, 0.55, 'o'], [18.5, 0, 'p'], [20.5, -0.75, 'p'], [20.5, 0.75, 'p'],
  [22.5, -0.35, 'o'], [22.5, 0.4, 'o'], [25.5, -0.75, 'o'], [25.5, 0.72, 'o'], [26, 0, 'p'], [28.6, -0.4, 'p'], [28.6, 0.42, 'p'], [30.5, -0.7, 'o'], [30.5, 0.7, 'o'],
  [13.5, -0.8, 'p'], [13.5, 0.8, 'p'], [4, 0, 'o'],
];

/** The back: blue-grey washed and rounded, the orange and pale spots, rows of tubercles, the tail's rings. */
function back(d: Draw, z: Gecko): void {
  const { pen } = d;
  const { shape } = z;
  const rng = createRng(7501);
  skinWash(d, shape, T.base, T.deep, { at: z.at(18, -0.35), r: 9 }, 0.42);
  pen.clipped(shape, () => {
    const c = z.at(22, 0);
    glaze(d, c.x, c.y, 12, 4, 0, T.grey, 0.4);
    // The tail's rings: dark bands between pale ones.
    for (let s = 34; s < BUILD.len - 1; s += 4.2) {
      const band = [-1.2, -0.6, 0, 0.6, 1.2].map((v) => z.at(s + Math.abs(v) * 0.4, v));
      pen.hair(band, 2, T.ring, 0.7);
      pen.hair(band.map((p, i) => { const q = z.at(s + 2.1 + Math.abs(i - 2) * 0.2, [-1.2, -0.6, 0, 0.6, 1.2][i]!); return pt((p.x + q.x * 3) / 4, (p.y + q.y * 3) / 4); }), 1, T.pale, 0.55);
    }
    for (const [s, v, k] of SPOTS) {
      const c2 = z.at(s, v);
      const r = (k === 'o' ? 1.25 : 1) * (0.85 + rng() * 0.3);
      const b = blob(c2, r, r * 0.85, rng, 0.3, 12, rng() * TAU);
      pen.fill(b, k === 'o' ? T.orange : T.pale, k === 'o' ? 0.92 : 0.8);
      if (k === 'o') pen.clipped(b, () => pen.crescent(b, pt(-0.3, -0.4), () => pen.fill(b, T.orangeDeep, 0.5)));
      pen.hair(closed(b).slice(3, 10), 0.14, d.ink, 0.35);
    }
    const crown = z.at(6, 0);
    glaze(d, crown.x, crown.y, 4.5, 3.5, 0, T.grey, 0.4);
  });
  pen.clipped(shape, () => granules(d, z, 2, BUILD.len - 2, 1.05, T.deep, 0.25));
  // Tubercles: raised bumps in loose rows over the trunk, a few on the tail.
  const tub = createRng(7511);
  pen.clipped(shape, () => {
    for (const p of scatter(tub, shape, 46, 2.1, (q) => q.x < BUILD.snout - 13 && q.x > BUILD.snout - 44)) {
      bump(d, p, 0.5 + tub() * 0.3, mix(T.base, T.pale, 0.25), T.pale, T.deep, 0.16);
    }
  });
  shade(d, shape, 0.18);
  pen.clipped(shape, () => pen.crescent(shape, pt(-0.8, -1.2), () => pen.fill(shape, T.deep, 0.25)));
  pen.stroke(closed(shape), 0.55, d.ink, 0.95);
}

/** The head: lit crown and snout, nostrils, the wide lip line, ear openings, and the big eyes (or shut). */
function head(d: Draw, z: Gecko, shut: boolean): void {
  const { pen } = d;
  const c = z.at(4, -0.25);
  glaze(d, c.x, c.y, 3, 1.8, 0, PAPER_FILL, 0.3);
  for (const v of [-1, 1]) {
    const nos = z.at(1, v * 0.45);
    pen.dot(nos.x, nos.y, 0.35, d.ink, 0.9);
    pen.hair([z.at(0.6, v * 0.75), z.at(4.5, v * 0.96), z.at(9.6, v * 0.97), z.at(11, v * 0.86)], 0.45, T.lip, 0.6);
    pen.hair([z.at(0.6, v * 0.8), z.at(4.5, v * 1), z.at(10, v * 1)], 0.22, d.ink, 0.6);
    const ear = z.at(11.6, v * 0.8);
    pen.fill([pt(ear.x - 0.5, ear.y), pt(ear.x, ear.y - 0.4), pt(ear.x + 0.5, ear.y), pt(ear.x, ear.y + 0.4)], T.deep, 0.8);
    const e = z.at(7, v * 0.68);
    if (shut) {
      const lid = [z.at(5.4, v * 0.62), z.at(7, v * 0.78), z.at(8.6, v * 0.62)];
      pen.fill([...lid, z.at(7, v * 0.5)], mix(T.base, T.pale, 0.2), 0.95);
      pen.hair(lid, 0.4, d.ink, 0.9);
    } else {
      slitEye(d, e, 1.9, T.iris, T.irisDeep, T.base, v);
    }
  }
}

/** Little z's floating off a sleeper. */
function zzz(d: Draw, at: Pt): void {
  for (const [dx, dy, s] of [[0, 0, 1.7], [4.4, -3.8, 1.35], [8, -7, 1.05]] as const) {
    const o = pt(at.x + dx, at.y + dy);
    d.pen.stroke([pt(o.x - s, o.y - s), pt(o.x + s, o.y - s), pt(o.x - s, o.y + s), pt(o.x + s, o.y + s)], 0.6, d.ink, 0.75, false);
  }
}

function draw(d: Draw, pose: Pose): void {
  const bend = BENDS[pose];
  const z = gecko(BUILD, bend);
  const flat = pose === 'flat';
  castShadow(d, z.shape, flat ? pt(0.4, 0.6) : pt(1.2, 1.8), flat ? 0.12 : 0.18);
  geckoLegs(d, BUILD, legJoints(BUILD, z, bend), PAINT, 0);
  back(d, z);
  head(d, z, pose === 'sleep');
  if (pose === 'sleep') zzz(d, pt(BUILD.snout + 4, -9));
}

export const TOKAY_ART: SpriteArt<Pose> = {
  frame: 84,
  res: 2,
  poses: ['idle', 'run0', 'run1', 'sleep', 'flat'],
  draw,
};
