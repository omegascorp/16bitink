import { createRng } from '../../logic/rng';
import { closed, type Draw, pt, shade } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { glaze, skinWash } from '../critters/preyKit';
import { type Body, fishEye } from './reefCrittersKit';
import { SHARK } from './reefBossFins';

/**
 * The Tiger Shark's skin: blue-grey washed darker down the back, the dark
 * broken bars across it that give it its name (bolder towards the tail),
 * spots on the crown, the fine grain of its denticles, a wet sheen on the
 * lit side; then its head: the broad blunt snout, the nostrils and their
 * flaps, eyes at the sides and the five gill slits.
 */

/** One broken bar across the back at s: wavy, thicker in the middle, gaps here and there. */
function bar(d: Draw, z: Body, s: number, w: number, alpha: number, rng: () => number): void {
  const { pen } = d;
  const n = 9;
  const pts: Pt[] = Array.from({ length: n + 1 }, (_, i) => {
    const v = -0.92 + (1.84 * i) / n;
    return z.at(s + Math.sin(v * 3.2 + s) * 1.6 - Math.abs(v) * 2.2, v);
  });
  // Broken into two or three dashes.
  let i = 0;
  while (i < n) {
    const len = 2 + Math.floor(rng() * 4);
    const seg = pts.slice(i, Math.min(n + 1, i + len + 1));
    if (seg.length > 1) pen.hair(seg, w * (0.7 + rng() * 0.5), SHARK.bar, alpha * (0.75 + rng() * 0.25));
    i += len + (rng() < 0.5 ? 1 : 0);
  }
}

export function sharkSkin(d: Draw, z: Body): void {
  const { pen } = d;
  const { shape } = z;
  const rng = createRng(4411);
  skinWash(d, shape, SHARK.base, SHARK.deep, { at: z.at(30, -0.45), r: 22 }, 0.38);
  pen.clipped(shape, () => {
    // Darker down the back, the pale belly just showing at the edges.
    for (let s = 6; s < z.len; s += 7) {
      const c = z.at(s, 0.05);
      glaze(d, c.x, c.y, z.width(s) * 0.62, z.width(s) * 0.36, 0, SHARK.back, 0.55);
    }
    for (const v of [-1, 1]) pen.hair(Array.from({ length: 24 }, (_, i) => z.at(8 + i * 4, v * 0.97)), 1.4, SHARK.pale, 0.35);
    // The bars, fainter forward, bold over the hind body.
    for (let s = 36, k = 0; s < z.len - 2; s += 5.6 + rng() * 2.2, k++) {
      const u = (s - 36) / (z.len - 36);
      bar(d, z, s, 1.6 + 2.2 * u * (1 - u * 0.4) + z.width(s) * 0.04, 0.32 + 0.4 * u, rng);
    }
    // Spots and short marks on the crown and nape.
    for (let i = 0; i < 26; i++) {
      const s = 10 + rng() * 26;
      const v = (rng() * 2 - 1) * 0.75;
      const c = z.at(s, v);
      pen.dot(c.x, c.y, 0.5 + rng() * 0.6, SHARK.bar, 0.35 + rng() * 0.25);
    }
    // The grain of the skin, and a wet sheen along the lit side.
    pen.stipple(shape, 520, () => 0.6, 0.22, SHARK.deep);
    pen.hair(Array.from({ length: 20 }, (_, i) => z.at(6 + i * 4.6, -0.5)), 2.4, PAPER_FILL, 0.16);
    pen.hair(Array.from({ length: 12 }, (_, i) => z.at(8 + i * 4.2, -0.58)), 0.7, PAPER_FILL, 0.35);
  });
  shade(d, shape, 0.22);
}

/** The head's details and the body's contour. */
export function sharkHead(d: Draw, z: Body, open: boolean): void {
  const { pen } = d;
  pen.stroke(closed(z.shape), 1.1, d.ink, 0.95);
  for (const v of [-1, 1]) {
    // Nostrils with their short flaps, near the front of the blunt snout.
    const no = z.at(2.4, v * 0.62);
    pen.hair([z.at(1.8, v * 0.5), no, z.at(2.6, v * 0.78)], 0.7, SHARK.deep, 0.85);
    // The eyes, at the sides of the head under a ridge of brow.
    const e = z.at(11.5, v * 0.86);
    pen.hair([z.at(9, v * 0.8), z.at(11.5, v * 0.72), z.at(14, v * 0.8)], 0.6, SHARK.deep, 0.7);
    fishEye(d, e, 1.35, '#8f8a6a');
    // Five gill slits curving down the sides, the last over the pectoral's root.
    for (let i = 0; i < 5; i++) {
      const s = 19 + i * 2.6;
      pen.hair([z.at(s - 0.6, v * 0.74), z.at(s, v * 0.86), z.at(s + 0.4, v * 0.99)], 0.55, SHARK.deep, 0.75);
      pen.hair([z.at(s + 0.5, v * 0.76), z.at(s + 0.9, v * 0.9)], 0.3, PAPER_FILL, 0.4);
    }
  }
  // The snout's blunt front, a little lit; open, its tip lifts over the thrust jaws.
  const t = z.at(2, -0.2);
  pen.clipped(z.shape, () => glaze(d, t.x, t.y, 6, 4, 0, PAPER_FILL, open ? 0.45 : 0.3));
}
