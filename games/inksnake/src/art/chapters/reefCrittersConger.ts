import type { Draw } from '../kit';
import { PAPER_FILL } from '../palette';
import type { SpriteArt } from '../types';
import { glaze } from '../critters/preyKit';
import { type EelPose, EEL_POSES, type EelSpec, drawEel } from './reefCrittersEel';
import { blots, type Body, fin, off, widthOf } from './reefCrittersKit';

/**
 * A young conger eel (the reef's moustache conger), seen from above facing
 * +x: slim, about 44 long, plain grey-olive darkening along the back and
 * paler at the flanks, a row of pale pores down each side, a dark streak
 * back from the big silvery eye, small rounded pectoral fins behind the
 * head, the dorsal fin's fold edged black down the back, and the upper jaw
 * overhanging the lower.
 */
const C = {
  base: '#8b9187',
  deep: '#3a3e3a',
  back: '#5c625b',
  belly: '#d8d5c6',
  fin: '#6a6f68',
  finEdge: '#1d1f1e',
  iris: '#cfc7a2',
  mouth: '#c2a39b',
  olive: '#7d8456',
} as const;

const LEN = 44;
const WIDTH = widthOf([[0, 1.6], [1.4, 3], [3.8, 4.3], [7, 4.9], [11, 5.2], [24, 5], [32, 3.8], [39, 2], [LEN, 0.4]]);

function pattern(d: Draw, z: Body): void {
  const { pen } = d;
  pen.clipped(z.shape, () => {
    // The back darker down the middle, the flanks paler.
    for (let i = 0; i < 10; i++) {
      const c = z.at(3 + i * 4.3, 0);
      glaze(d, c.x, c.y, z.width(3 + i * 4.3) * 0.9, z.width(3 + i * 4.3) * 0.42, 0, C.back, 0.55);
    }
    for (const v of [-1, 1]) pen.hair(Array.from({ length: 20 }, (_, i) => z.at(8 + i * 1.8, v * 0.8)), 0.8, PAPER_FILL, 0.25);
    for (let i = 0; i < 5; i++) {
      const c = z.at(6 + i * 7.5, i % 2 ? 0.4 : -0.4);
      glaze(d, c.x, c.y, 4, 1.6, 0, C.olive, 0.35);
    }
  });
  blots(d, z, 26, 41, 0.9, C.deep, 0.18, (s) => s > 6);
  pen.clipped(z.shape, () => {
    // The lateral line: a row of pale pores down each side.
    for (const v of [-1, 1]) {
      for (let s = 8; s < z.len - 4; s += 2.1) {
        const p = z.at(s, v * 0.66);
        pen.dot(p.x, p.y, 0.15, PAPER_FILL, 0.45);
      }
    }
  });
}

function head(d: Draw, z: Body, pose: EelPose): void {
  const { pen } = d;
  for (const v of [-1, 1]) {
    // The mouth runs back under the eye; the snout overhangs it.
    const gape = pose === 'sleep' ? 0.22 : 0;
    const jaw = [z.at(0.4, v * 0.55), z.at(1.6, v * (0.86 + gape)), z.at(3.2, v * (0.95 + gape)), z.at(4.1, v * 0.85)];
    pen.hair(jaw, 0.26, d.ink, 0.75);
    if (pose === 'sleep') pen.hair(jaw.map((p, i) => (i === 0 || i === 3 ? p : z.at(1.6 + (i - 1) * 1.6, v * 1.08))), 0.5, C.mouth, 0.6);
    // The dark streak back from the eye.
    pen.hair([z.at(3.2, v * 0.62), z.at(4.6, v * 0.7), z.at(6.2, v * 0.74)], 0.5, C.deep, 0.55);
    // Tubular front nostrils at the snout's tip.
    const n0 = z.at(0.35, v * 0.36);
    const n1 = off(z, 0.1, v * 0.36, 0, -0.7);
    pen.hair([n0, n1], 0.36, C.deep, 0.8);
  }
}

/** Small rounded pectoral fins just behind the gill openings, held out a little, laid back when swimming. */
function fins(d: Draw, z: Body, pose: EelPose): void {
  const swim = pose === 'swim0' || pose === 'swim1';
  for (const side of [-1, 1]) {
    const s0 = 7.4;
    const s1 = 8.8;
    const root = Array.from({ length: 9 }, (_, i) => z.at(s0 + ((s1 - s0) * i) / 8, side * 0.85));
    const edge = Array.from({ length: 9 }, (_, i) => {
      const t = i / 8;
      return off(z, s0 + (s1 - s0) * t, side, Math.sin(Math.PI * Math.min(1, t * 1.1)) * (swim ? 1.4 : 2.3) + 0.2, (swim ? 1.8 : 0.9) * t);
    });
    fin(d, root, edge, { wash: C.fin, alpha: 0.55, ray: C.deep, rays: 6, margin: C.finEdge, marginAlpha: 0.35, line: 0.22 });
  }
}

const SPEC: EelSpec = {
  frame: 52,
  len: LEN,
  width: WIDTH,
  eye: 2.5,
  gill: 7.1,
  finFrom: 9.5,
  eyeR: 0.9,
  out: { snout: 13, hole: -4.9, sway: 3 },
  wave: { amp: 5.2, k: 0.95 },
  paint: { base: C.base, deep: C.deep, belly: C.belly, fin: C.fin, finEdge: C.finEdge, iris: C.iris, mouth: C.mouth },
  pattern,
  head,
  fins,
};

export const CONGER_ART: SpriteArt<EelPose> = { frame: 52, res: 3, poses: EEL_POSES, draw: (d, pose) => drawEel(d, SPEC, pose) };
