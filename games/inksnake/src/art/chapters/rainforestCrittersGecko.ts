import { createRng } from '../../logic/rng';
import { blob } from '../groundKit';
import { closed, type Draw, pt, shade, TAU } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import type { SpriteArt } from '../types';
import { mix } from '../wash';
import { castShadow, glaze, skinWash } from '../critters/preyKit';
import { type Gecko, type GeckoBend, type GeckoBuild, gecko, geckoLegs, granules, legJoints, type LimbPaint, slitEye } from './rainforestCrittersGeckoKit';

/**
 * Kuhl's flying gecko, seen from above facing +x: about 30 long with its
 * tail, bark-mottled olive and tan with wavy dark chevrons, a broad head
 * with big slit-pupilled eyes, skin flaps along the cheeks and flanks,
 * webbed padded toes, and a flat tail edged with scalloped lobes ending in
 * a broad flap (it parachutes between trees on them).
 *  - 'idle': resting, tail in a lazy curve;
 *  - 'run0', 'run1': scurrying, the body swinging, legs in diagonal pairs;
 *  - 'flat': pressed flat to the bark while a glide passes over, legs and
 *    flaps spread wide, all but vanishing into the bark.
 */
const G = {
  base: '#a19b6b',
  deep: '#3e3a26',
  olive: '#7f8a4c',
  chevron: '#4b452d',
  pale: '#d8d0a2',
  flap: '#b9b183',
  pad: '#c6bc8f',
  iris: '#b9a25a',
  irisDeep: '#5f4f22',
  bark: '#6f6446',
} as const;

type Pose = 'idle' | 'run0' | 'run1' | 'flat';

const BUILD: GeckoBuild = {
  len: 31,
  snout: 12.5,
  shoulder: 8.6,
  hip: 16,
  tailFrom: 17,
  width: [[0, 1.4], [1.2, 3.6], [3.5, 5.4], [5.4, 5.6], [7, 4.2], [9, 5.6], [12.5, 6.8], [16, 6.2], [17.6, 3.8], [22, 2.8], [27, 2], [29.5, 2.4], [31, 0.6]],
  arm: [2.8, 2.6, 1.9],
  thigh: [3.3, 3, 2.3],
  toe: [2.5, 0.55],
};

const BENDS: Readonly<Record<Pose, GeckoBend>> = {
  idle: { trunk: 0.4, tail: 4, whip: -1.6, legs: [0.4, 0.3, 0.1, 0.2] },
  run0: { trunk: 1.5, tail: -6, whip: 2.2, legs: [1, -1, -1, 1] },
  run1: { trunk: -1.5, tail: 6, whip: -2.2, legs: [-1, 1, 1, -1] },
  flat: { trunk: 0.2, tail: 2.4, whip: -0.8, legs: [0.6, 0.6, 0.3, 0.3], splay: 1.3, flat: 0.18 },
};

const PAINT: LimbPaint = { wash: G.base, deep: G.deep, mark: G.chevron, pad: G.pad };

/** A frilly skin flap along one side from s0 to s1, reaching `out` beyond the body, its edge softly scalloped. */
function flap(z: Gecko, side: number, s0: number, s1: number, out: number, lobes: number): Pt[] {
  const n = lobes * 4;
  const edge = Array.from({ length: n + 1 }, (_, i) => {
    const s = s0 + ((s1 - s0) * i) / n;
    const u = i / n;
    const bulge = Math.sin(Math.PI * u) ** 0.6 * (0.75 + 0.25 * Math.abs(Math.sin((Math.PI * i) / 4)));
    const p = z.at(s, side * 0.92);
    const { n: nn } = z.frame(s);
    return pt(p.x + nn.x * side * out * bulge, p.y + nn.y * side * out * bulge);
  });
  const inner = Array.from({ length: 7 }, (_, i) => z.at(s1 - ((s1 - s0) * i) / 6, side * 0.6));
  return [...edge, ...inner];
}

/** The cheek, flank and tail flaps: thin pale skin, veined, edged in a fine line. */
function flaps(d: Draw, z: Gecko, wide: number): Pt[][] {
  const shapes: Pt[][] = [];
  for (const side of [-1, 1]) {
    shapes.push(flap(z, side, 3.2, 7, 0.9 * wide, 2), flap(z, side, 9.6, 15.6, 1.6 * wide, 3), flap(z, side, 18, 29.6, 1.5 * wide, 7));
  }
  for (const s of shapes) {
    skinWash(d, s, G.flap, G.deep, undefined, 0.3);
    d.pen.clipped(s, () => {
      for (let i = 0; i < s.length - 8; i += 2) {
        const p = s[i]!;
        d.pen.hair([p, s[Math.min(s.length - 1, s.length - 1 - Math.floor((i / (s.length - 8)) * 6))]!], 0.12, G.chevron, 0.35);
      }
    });
    d.pen.stroke(closed(s), 0.26, d.ink, 0.8, false);
  }
  return shapes;
}

/** The back: washed and rounded, greenish at the flanks, pale blotches, the dark wavy chevrons down back and tail. */
function back(d: Draw, z: Gecko, flat: boolean): void {
  const { pen } = d;
  const { shape } = z;
  const rng = createRng(7301);
  skinWash(d, shape, G.base, G.deep, { at: z.at(10, -0.3), r: 5 }, 0.4);
  pen.clipped(shape, () => {
    for (const v of [-0.8, 0.8]) {
      const c = z.at(12, v);
      glaze(d, c.x, c.y, 6, 1.8, 0, G.olive, 0.5);
    }
    for (let i = 0; i < 16; i++) {
      const s = 2 + rng() * 26;
      const c = z.at(s, (rng() - 0.5) * 1.4);
      pen.fill(blob(c, 0.6 + rng() * 0.6, 0.45 + rng() * 0.4, rng, 0.3, 10, rng() * TAU), G.pale, 0.45);
    }
    // Wavy chevrons pointing back, from the neck down the tail.
    for (const [s, w, a] of [[6.8, 0.75, 0.75], [10.2, 0.95, 0.85], [13.4, 0.95, 0.85], [16.4, 0.8, 0.8], [20, 0.7, 0.75], [23.4, 0.6, 0.7], [26.6, 0.5, 0.65]] as const) {
      const pts = [-0.92, -0.55, -0.2, 0, 0.2, 0.55, 0.92].map((v, i) => z.at(s + Math.abs(v) * 1.3 - (i % 2) * 0.4, v));
      pen.hair(pts, w, G.chevron, a);
      pen.hair(pts.map((p) => pt(p.x + 0.55, p.y)), w * 0.4, G.pale, a * 0.6);
    }
    const crown = z.at(3, 0);
    glaze(d, crown.x, crown.y, 3, 2.2, 0, G.chevron, 0.3);
    if (flat) {
      // Pressed to the bark: a bark-coloured glaze swallows the pattern.
      const c = z.at(14, 0);
      glaze(d, c.x, c.y, 18, 6, 0, G.bark, 0.35);
    }
  });
  pen.clipped(shape, () => granules(d, z, 1.5, BUILD.len - 1.5, 0.8, G.deep, 0.22));
  shade(d, shape, 0.18);
  pen.clipped(shape, () => pen.crescent(shape, pt(-0.5, -0.8), () => pen.fill(shape, G.deep, 0.25)));
  pen.stroke(closed(shape), 0.4, d.ink, 0.95);
}

/** The head: a lit crown, nostrils at the snout, a lip line, the big eyes. */
function head(d: Draw, z: Gecko): void {
  const { pen } = d;
  const c = z.at(2.2, -0.2);
  glaze(d, c.x, c.y, 1.8, 1.1, 0, PAPER_FILL, 0.3);
  for (const v of [-1, 1]) {
    const nos = z.at(0.7, v * 0.5);
    pen.dot(nos.x, nos.y, 0.2, d.ink, 0.9);
    pen.hair([z.at(0.5, v * 0.85), z.at(2.5, v * 0.98), z.at(4.8, v * 0.95)], 0.16, d.ink, 0.5);
    slitEye(d, z.at(3.8, v * 0.72), 1.05, G.iris, G.irisDeep, G.base, v);
  }
}

function draw(d: Draw, pose: Pose): void {
  const bend = BENDS[pose];
  const z = gecko(BUILD, bend);
  const flat = pose === 'flat';
  const legs = legJoints(BUILD, z, bend);
  castShadow(d, z.shape, flat ? pt(0.3, 0.45) : pt(0.8, 1.2), flat ? 0.12 : 0.18);
  geckoLegs(d, BUILD, legs, PAINT, 0.55);
  flaps(d, z, flat ? 1.35 : 1);
  back(d, z, flat);
  head(d, z);
  if (flat) {
    // Its toes' web and the flaps' edges press down: fine lines round where it meets the bark.
    d.pen.hair(closed(z.shape).map((p) => pt(p.x + 0.4, p.y + 0.6)).slice(10, 40), 0.16, mix(G.deep, PAPER_FILL, 0.2), 0.3);
  }
}

export const FLYING_GECKO_ART: SpriteArt<Pose> = {
  frame: 48,
  res: 3,
  poses: ['idle', 'run0', 'run1', 'flat'],
  draw,
};
