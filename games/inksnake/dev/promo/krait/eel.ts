import { closed, type Draw, pt } from '../../../src/art/kit';
import { PAPER_FILL } from '../../../src/art/palette';
import type { Pt } from '../../../src/art/pen';
import type { SpriteArt } from '../../../src/art/types';
import { glaze } from '../../../src/art/critters/preyKit';
import { type EelPose, EEL_POSES, type EelSpec, drawEel, teeth } from '../../../src/art/chapters/reefCrittersEel';
import { blots, type Body, lift, off, widthOf } from '../../../src/art/chapters/reefCrittersKit';

/**
 * The moray being swallowed: the game's yellow-margined moray
 * (reefCrittersMoray.ts, copied here with its painting unchanged) drawn
 * through the game's own eel painter (drawEel), but long and even, the
 * way a moray really looks in the open: a ribbon of the same width almost
 * to the end, tapering only at the tail tip, its dorsal fin edged yellow-
 * green the whole way, and only a gentle wave along it (no S-flare). Seen
 * from above facing +x, snout at s = 0.
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

/** Eel units: length, and the even width it keeps until the tip. */
export const LONG_EEL_LEN = 84;
export const LONG_EEL_WIDTH = 8.4;
const L = LONG_EEL_LEN;
const WIDTH = widthOf([[0, 3.6], [1.2, 5.4], [4, 7.2], [8, 8.2], [12, LONG_EEL_WIDTH], [L - 12, LONG_EEL_WIDTH], [L - 6, 6.4], [L - 2.5, 3], [L, 0.6]]);
const GAPE: Readonly<Record<EelPose, number>> = { out0: 3.2, out1: 2.8, swim0: 2, swim1: 2, sleep: 3.4 };

function pattern(d: Draw, z: Body): void {
  const { pen } = d;
  pen.clipped(z.shape, () => {
    for (let s = 6; s < z.len; s += 6) {
      const c = z.at(s, 0);
      glaze(d, c.x, c.y, z.width(s) * 0.9, z.width(s) * 0.4, 0, M.back, 0.5);
    }
    const h = z.at(3, 0);
    glaze(d, h.x, h.y, 6, 4, 0, M.head, 0.55);
  });
  blots(d, z, 300, 77, 1.0, M.mottle, 0.6, (s) => s > 4.5);
  blots(d, z, 40, 78, 0.5, M.mottle, 0.55, (s) => s < 7);
  pen.stipple(z.shape, 420, () => 0.7, 0.22, M.speck);
  // The dorsal fin's edge, bright, running the whole back to the tail tip.
  pen.clipped(z.shape, () => {
    const ridge = Array.from({ length: 60 }, (_, i) => z.at(9 + ((z.len - 9.5) * i) / 59, -0.1));
    pen.hair(ridge, 1.1, M.fin, 0.7);
    pen.hair(ridge.map((p) => pt(p.x - 0.3, p.y - 0.4)), 0.45, M.finEdge, 0.95);
  });
}

function across(z: Body, s: number, w: number): Pt {
  const c = z.at(s, 0);
  const { n } = z.frame(Math.max(0, s));
  return pt(c.x + n.x * w, c.y + n.y * w);
}

function jaw(d: Draw, z: Body, pose: EelPose): void {
  const { pen } = d;
  const g = GAPE[pose];
  const n = 16;
  const halfAt = (s: number): number => {
    const u = Math.min(1, (s + g) / 1.6);
    return (2.6 + Math.min(1.3, Math.max(0, s) * 0.28)) * Math.sqrt(u) * (0.55 + 0.45 * u);
  };
  const side = (k: number, from = -g, to = 7): Pt[] => Array.from({ length: n + 1 }, (_, i) => {
    const s = from + ((to - from) * i) / n;
    return across(z, s, k * halfAt(s));
  });
  const lower = [...side(1), ...side(-1).reverse().slice(1, -1)];
  pen.fill(lower, PAPER_FILL, 1);
  pen.fill(lower, lift(M.base, 0.2), 0.92);
  blots(d, { ...z, shape: lower } as Body, 30, 79, 0.5, M.mottle, 0.5);
  const inner = [...side(0.7, -g + 0.6, 6), ...side(-0.7, -g + 0.6, 6).reverse().slice(1, -1)];
  pen.fill(inner, M.mouth, 0.97);
  pen.clipped(inner, () => {
    const t = z.at(-g * 0.15, 0);
    glaze(d, t.x, t.y, 2.6, 1.9, 0, M.throat, 0.95);
  });
  teeth(d, side(0.74, -g + 0.7, 3).reverse(), 0.8, M.tooth);
  teeth(d, side(-0.74, -g + 0.7, 3), 0.8, M.tooth);
  pen.stroke(closed(lower), 0.4, d.ink, 0.9);
}

function head(d: Draw, z: Body): void {
  const { pen } = d;
  const front = Array.from({ length: 7 }, (_, i) => z.at(0.25 + Math.abs(i - 3) * 0.5, -0.85 + (i / 6) * 1.7));
  teeth(d, front.reverse(), 0.95, M.tooth);
  for (const v of [-1, 1]) {
    pen.hair([z.at(0.6, v * 0.78), z.at(3, v * 0.95), z.at(6.2, v * 0.93), z.at(7.6, v * 0.8)], 0.32, d.ink, 0.75);
    const n0 = z.at(0.5, v * 0.4);
    const n1 = off(z, 0.6, v * 0.6, 0.9, -0.5);
    pen.stroke([n0, n1], 0.6, M.deep, 0.9, false);
    pen.dot(n1.x, n1.y, 0.22, '#15120a', 1);
  }
}

const SPEC: EelSpec = {
  frame: 100,
  len: L,
  width: WIDTH,
  eye: 3.2,
  gill: 11.5,
  finFrom: 9,
  eyeR: 1,
  out: { snout: 18, hole: -9.1, sway: 4.2 },
  // A gentle travelling wave, not the game's swimming S.
  wave: { amp: 2.6, k: 1.15 },
  paint: { base: M.base, deep: M.deep, belly: M.belly, fin: M.fin, finEdge: M.finEdge, iris: M.iris, mouth: M.mouth },
  pattern,
  head,
  fins: jaw,
};

/** The snout's x in the sprite's frame for the swim poses (the eel painter lays the spine from 0.46 of the length). */
export const LONG_EEL_SNOUT = L * 0.46;
/** How long the spine runs along x (the painter shortens it a little for the wave). */
export const LONG_EEL_SPAN = L * 0.93;

export const LONG_EEL_ART: SpriteArt<EelPose> = { frame: SPEC.frame, res: 3, poses: EEL_POSES, draw: (d, pose) => drawEel(d, SPEC, pose) };
