import { ellipse, type Pt } from '../../pen';
import { bezier, bottomAt, C, PAPER_FILL, ring, topAt, type Anatomy, type Kit } from '../kit';

/**
 * Where the lure's bulb sits on the drawing, in fish-texture px (before any
 * finer resolution). The game lights it there (see game/bosses/seadevil.ts),
 * so the drawing itself doesn't glow: the body has to stay dark.
 */
export const SEADEVIL_ESCA: Pt = { x: C + 74, y: C - 84 };

const BLACK = '#18161c';
const BULB = '#e4efe6';

/** The rod: a fin ray grown long, rising from the forehead and arching forward over the mouth. */
function rod(k: Kit): void {
  const root = { x: k.x(0.3), y: topAt(k.a, 0.3) + 3 };
  const tip = { x: SEADEVIL_ESCA.x - 2, y: SEADEVIL_ESCA.y + 5 };
  const arc = bezier(root, { x: k.x(0.22), y: C - 112 }, tip, 16);
  k.pen.stroke(arc, 2.2, k.ink, 1, false);
  k.pen.hair(arc.map((p) => ({ x: p.x + 0.8, y: p.y + 0.6 })), 0.5, '#6d6774', 0.8);
  // A little knuckle where it hinges on the skull.
  k.pen.fill(ellipse(root.x, root.y, 3, 2.4, 10), BLACK, 0.9);
}

/** The bulb: pale and soft, with a dark cap that shades the light upwards and filaments trailing below. */
function bulb(k: Kit): void {
  const { x, y } = SEADEVIL_ESCA;
  k.pen.fill(ellipse(x, y, 6.5, 7, 16), BULB, 1);
  k.pen.clipped(ellipse(x, y, 6.5, 7, 16), () => k.pen.fill(ellipse(x - 2, y - 6, 8, 5, 12), BLACK, 0.85));
  k.pen.hair(ring(x, y, 6.5, 7, 16), 0.6, k.ink, 1);
  k.pen.dot(x + 1.5, y + 1.5, 1.6, '#ffffff', 0.9);
  for (const [dx, len, sway] of [[-3, 9, -2], [0, 12, 1], [3, 8, 3]] as const) {
    const top = { x: x + dx, y: y + 6 };
    k.pen.hair(bezier(top, { x: top.x + sway, y: top.y + len * 0.6 }, { x: top.x + sway * 0.5, y: top.y + len }, 6), 0.6, k.ink, 0.85);
  }
}

/** The tiny male fused to her belly for life, as anglerfish males are. */
function mate(k: Kit): void {
  const at = { x: k.x(0.6), y: bottomAt(k.a, 0.6) - 1 };
  const body = ellipse(at.x - 7, at.y + 4, 8, 3.2, 12).map((p) => ({ x: p.x, y: p.y + (p.x - at.x) * 0.25 }));
  k.pen.fill(body, '#4a4450', 0.95);
  k.pen.hair([...body, body[0]!], 0.5, k.ink, 1);
  k.pen.hair([{ x: at.x - 15, y: at.y + 2 }, { x: at.x - 18, y: at.y }, { x: at.x - 18, y: at.y + 6 }, { x: at.x - 15, y: at.y + 4 }], 0.5, k.ink, 0.9);
  k.pen.dot(at.x - 3, at.y + 4, 0.8, PAPER_FILL, 0.9);
}

/**
 * Giant black seadevil (Melanocetus): a black ball of a body that's nearly
 * all head, a huge upturned mouth of glassy fangs, a tiny eye, and the rod
 * with its bulb arching over the mouth.
 */
export const SEADEVIL_ART: Anatomy = {
  hl: 66, hh: 52, peak: 0.36, blunt: 0.95, peduncle: 0.26, tail: 'round', tailSize: 0.55,
  dorsal: { from: 0.68, to: 0.8, height: 0.45 }, anal: { from: 0.72, to: 0.82, height: 0.38 },
  pectoral: 0.45, pelvic: false, scales: false, eye: { t: 0.22, r: 2.6 }, mouth: 'gape',
  wash: '#2a2630', finWash: '#3b3642', finAlpha: 0.55, gills: 'none', lateral: false,
  extras: (k) => {
    // Velvet-black skin, blacker over the back, with soft folds.
    k.pen.clipped(k.body, () => {
      k.pen.fill(k.body, BLACK, 0.55);
      for (let t = 0.05; t < 1; t += 0.06) k.pen.fill(ellipse(k.x(t), topAt(k.a, t) + 6, 10, k.h(t) * 0.7, 8), BLACK, 0.12);
      for (let i = 0; i < 7; i++) {
        const t = 0.3 + i * 0.08;
        k.pen.hair(bezier({ x: k.x(t), y: topAt(k.a, t) + 6 }, { x: k.x(t) - 6, y: C + 4 }, { x: k.x(t) + 1, y: bottomAt(k.a, t) - 6 }, 8), 0.5, '#5c5664', 0.55);
      }
    });
    k.pen.stipple(k.body, 3200, (_x, y) => (y < C ? 0.6 : 0.4), 0.55, k.ink);
    // Pale sense pores in lines over the head and down the flank.
    for (const [from, to, v] of [[0.12, 0.5, -0.45], [0.2, 0.75, 0.05], [0.15, 0.55, 0.5]] as const) {
      for (let t = from; t < to; t += 0.045) k.pen.dot(k.x(t), C + k.h(t) * v + Math.sin(t * 20) * 1.5, 0.9, '#cfc8d6', 0.75);
    }
    mate(k);
  },
  face: (k) => {
    rod(k);
    bulb(k);
  },
};
