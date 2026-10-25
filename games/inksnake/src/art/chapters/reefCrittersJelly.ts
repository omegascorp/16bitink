import { createRng } from '../../logic/rng';
import { closed, type Draw, pt } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import type { SpriteArt } from '../types';
import { glaze } from '../critters/preyKit';

/**
 * A box jelly, seen from above drifting +x: the clear bell a rounded
 * square about 18 across, glassy and faintly blue, the cross of its stomach
 * and four pale gonad folds showing through, a small dark eye cluster at the
 * middle of each side, and a fleshy arm at each corner trailing a bundle of
 * long fine tentacles behind it, beaded with stinging cells. Everything is
 * translucent: the water shows through. 'pulse0' has the bell open,
 * 'pulse1' squeezed, the tentacles drawn in closer.
 */
const J = {
  bell: '#cfe7f2',
  rim: '#9cc7dc',
  deep: '#5f8fb0',
  gonad: '#f1e4cf',
  gut: '#e9c9a8',
  tentacle: '#b7d3e3',
  bead: '#f6efe0',
  eye: '#3a2c3a',
} as const;

type Pose = 'pulse0' | 'pulse1';

/** A rounded square (a superellipse), centre c, half sizes a × b. */
function box(c: Pt, a: number, b: number, n = 36, k = 3.2): Pt[] {
  return Array.from({ length: n }, (_, i) => {
    const t = (i / n) * Math.PI * 2;
    const cs = Math.cos(t);
    const sn = Math.sin(t);
    return pt(c.x + a * Math.sign(cs) * Math.abs(cs) ** (2 / k), c.y + b * Math.sign(sn) * Math.abs(sn) ** (2 / k));
  });
}

/** The tentacles: four bundles from the corners, trailing back in slow waves, beaded with stinging cells. */
function tentacles(d: Draw, c: Pt, a: number, b: number, squeeze: number): void {
  const { pen } = d;
  const rng = createRng(611);
  for (const [sx, sy] of [[1, -1], [1, 1], [-1, -1], [-1, 1]] as const) {
    const root = pt(c.x + sx * a * 0.78, c.y + sy * b * 0.78);
    // The fleshy arm (pedalium) at the corner, bending back.
    const arm = [root, pt(root.x - 2.6, root.y + sy * 1.4 * squeeze), pt(root.x - 5.2, root.y + sy * 1.6 * squeeze)];
    pen.stroke(arm, 2.4, J.rim, 0.45, false);
    pen.hair(arm, 0.3, d.ink, 0.45);
    const base = arm[2]!;
    for (let i = 0; i < 6; i++) {
      const spread = (i - 2.5) * 0.9 * squeeze;
      const len = (17 + rng() * 6) * (sx > 0 ? 1 : 0.9);
      const ph = rng() * 6;
      const pts = Array.from({ length: 14 }, (_, k) => {
        const u = k / 13;
        return pt(base.x - len * u, base.y + sy * (0.6 + spread * 0.5) * u * 3 * squeeze + Math.sin(ph + u * 7) * 1.6 * u);
      });
      pen.hair(pts, 0.7, J.tentacle, 0.4);
      pen.hair(pts, 0.24, d.ink, 0.32 + rng() * 0.22);
      for (let k = 3; k < 13; k += 3) pen.dot(pts[k]!.x, pts[k]!.y, 0.2, J.bead, 0.45);
    }
  }
}

function draw(d: Draw, pose: Pose): void {
  const { pen } = d;
  const squeeze = pose === 'pulse1' ? 0.8 : 1;
  const c = pt(9, 0);
  const a = 8.6 * squeeze;
  const b = 9.6 * (pose === 'pulse1' ? 0.86 : 1);
  const bell = box(c, a, b);
  // Its faint shadow on the sand far below.
  glaze(d, c.x + 3, c.y + 4.5, a * 1.05, b * 1.05, 0, d.ink, 0.06);
  tentacles(d, c, a, b, squeeze);
  // The glassy bell: a thin blue wash, deeper at the rim, a bright bloom where the light hits.
  pen.fill(bell, J.bell, 0.46);
  pen.clipped(bell, () => {
    pen.stroke(closed(bell.map((p) => pt(c.x + (p.x - c.x) * 0.92, c.y + (p.y - c.y) * 0.92))), 2.2, J.rim, 0.4, false);
    glaze(d, c.x - a * 0.3, c.y - b * 0.35, a * 0.6, b * 0.45, -0.5, PAPER_FILL, 0.5);
    glaze(d, c.x + a * 0.4, c.y + b * 0.45, a * 0.6, b * 0.4, -0.5, J.deep, 0.22);
    // Through the bell: the four pale gonad folds and the cross of the stomach.
    for (const [sx, sy] of [[1, -1], [1, 1], [-1, -1], [-1, 1]] as const) {
      const g = [pt(c.x + sx * 1.2, c.y + sy * 1.2), pt(c.x + sx * a * 0.55, c.y + sy * b * 0.2), pt(c.x + sx * a * 0.62, c.y + sy * b * 0.6), pt(c.x + sx * a * 0.2, c.y + sy * b * 0.6)];
      const m = pt((g[1]!.x + g[3]!.x) / 2, (g[1]!.y + g[3]!.y) / 2);
      glaze(d, m.x, m.y, a * 0.34, b * 0.22, Math.atan2(sy, sx), J.gonad, 0.55);
      pen.hair([g[0]!, g[1]!, g[2]!], 0.16, J.deep, 0.3);
    }
    const cross = [pt(c.x + 2.4, c.y), pt(c.x, c.y + 2.4), pt(c.x - 2.4, c.y), pt(c.x, c.y - 2.4)];
    glaze(d, c.x, c.y, 2.8, 2.8, 0, J.gut, 0.6);
    pen.hair(closed(cross), 0.16, d.ink, 0.3);
    // The bell's dome: a soft ring of light and a deeper wash towards its shadowed rim.
    pen.hair(closed(bell.map((p) => pt(c.x - 0.6 + (p.x - c.x) * 0.55, c.y - 0.8 + (p.y - c.y) * 0.55))), 1.2, PAPER_FILL, 0.18);
    // The rim's fold (the velarium) a fine ring just inside the edge.
    pen.hair(closed(bell.map((p) => pt(c.x + (p.x - c.x) * 0.8, c.y + (p.y - c.y) * 0.8))), 0.2, J.deep, 0.35);
  });
  // The four eye clusters, one at the middle of each side.
  for (const [ex, ey] of [[a * 0.9, 0], [-a * 0.9, 0], [0, b * 0.9], [0, -b * 0.9]] as const) {
    pen.dot(c.x + ex, c.y + ey, 0.55, J.rim, 0.8);
    pen.dot(c.x + ex, c.y + ey, 0.3, J.eye, 0.9);
  }
  pen.stroke(closed(bell), 0.6, d.ink, 0.7);
  pen.hair(bell.slice(18, 30), 0.7, PAPER_FILL, 0.6);
  pen.dot(c.x - a * 0.45, c.y - b * 0.5, 0.8, PAPER_FILL, 0.85);
}

export const JELLY_ART: SpriteArt<Pose> = { frame: 56, res: 3, poses: ['pulse0', 'pulse1'], draw };
