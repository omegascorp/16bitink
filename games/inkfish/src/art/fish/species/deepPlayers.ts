import { ellipse, type Pt } from '../../pen';
import { bezier, bottomAt, C, glow, outline, PAPER_FILL, photophores, ring, topAt, type Anatomy, type Kit } from '../kit';

/**
 * The deep-water heroes (chapters 7-10): the fish you unlock by going deep, so
 * each one has a striking silhouette and its own light in the dark.
 */
const INK_BLUE = '#1f3f8a';
const WASH_DEEP = '#2a4d9e';
const FIN_BLUE = '#7fa3e0';
const GHOST = '#a8c1ec';
const GOLD = '#f6d76a';
const RED_LIGHT = '#e0483a';

/** A curved fang, `base` to `tip`, bowing towards `bend`. */
function fang(k: Kit, base: Pt, bend: Pt, tip: Pt, width: number): void {
  const dx = tip.x - base.x;
  const dy = tip.y - base.y;
  const d = Math.hypot(dx, dy) || 1;
  const nx = (-dy / d) * (width / 2);
  const ny = (dx / d) * (width / 2);
  const tooth = [
    ...bezier({ x: base.x + nx, y: base.y + ny }, { x: bend.x + nx * 0.5, y: bend.y + ny * 0.5 }, tip, 6),
    ...bezier(tip, { x: bend.x - nx * 0.5, y: bend.y - ny * 0.5 }, { x: base.x - nx, y: base.y - ny }, 6),
  ];
  k.pen.fill(tooth, PAPER_FILL, 1);
  k.pen.stroke([...tooth, tooth[0]!], 0.7, k.ink, 1, false);
}

/** Dark back fading to a pale belly, split by a crisp line `level` (-1 top .. 1 belly). */
function countershade(k: Kit, level: number, alpha: number): void {
  k.pen.clipped(k.body, () => {
    const line: Pt[] = [];
    for (let t = 0; t <= 1.001; t += 0.04) line.push({ x: k.x(t), y: C + k.h(t) * level });
    k.pen.fill([...line, ...[...line].reverse().map((p) => ({ x: p.x, y: C - 90 }))], WASH_DEEP, alpha);
    k.pen.hair(line, 0.55, k.ink, 0.6);
  });
}

/** A soft halo just outside the body: reads as a glow against dark water. */
function aura(k: Kit, color: string, rings: readonly (readonly [number, number])[]): void {
  for (const [grow, alpha] of rings) {
    const halo = outline({ ...k.a, hl: k.a.hl + grow, hh: k.a.hh + grow });
    k.pen.fill(halo, color, alpha);
  }
}

const lanternfish: Anatomy = {
  // Sleek and bright-eyed: a headlamp at the nose, rows of lights down the flank, a glowing tail gland.
  hl: 76, hh: 23, peak: 0.28, blunt: 0.72, peduncle: 0.22, tail: 'fork', tailSize: 1.5,
  dorsal: { from: 0.38, to: 0.54, height: 1, tri: true }, anal: { from: 0.6, to: 0.8, height: 0.62 },
  pectoral: 0.62, pelvic: true, scales: true, eye: { t: 0.15, r: 11 }, mouth: 'small',
  wash: WASH_DEEP, finWash: FIN_BLUE, ink: INK_BLUE, lateral: false,
  under: (k) => aura(k, GOLD, [[7, 0.08], [3, 0.1]]),
  extras: (k) => {
    countershade(k, -0.05, 0.4);
    // Little adipose fin between the dorsal and the tail.
    const ax = k.x(0.78);
    const ay = topAt(k.a, 0.78);
    const fin = bezier({ x: ax + 5, y: ay + 1 }, { x: ax, y: ay - 9 }, { x: ax - 7, y: ay + 1 }, 8);
    k.pen.fill(fin, PAPER_FILL, 1);
    k.pen.fill(fin, FIN_BLUE, 0.3);
    k.pen.stroke(fin, 0.9, k.ink, 1, false);
    // Two rows of lights: along the belly and in a line down the flank.
    photophores(k, 12, 0.18, 0.88, 1.9);
    for (let i = 0; i < 8; i++) {
      const t = 0.3 + i * 0.075;
      glow(k, k.x(t), C + k.h(t) * (0.28 - i * 0.02), 1.5);
    }
    // Headlamp in front of the eye, and the bright gland on top of the tail stalk.
    glow(k, k.x(0.06), C - k.h(0.06) * 0.05, 2.8);
    glow(k, k.x(0.9), topAt(k.a, 0.9) + 3, 2.6);
  },
};

const viperfish: Anatomy = {
  // Jaws open, fangs too long to close over, and a lure dangling in front of its own face.
  hl: 94, hh: 21, peak: 0.2, blunt: 0.55, peduncle: 0.22, tail: 'fork', tailSize: 1.4,
  dorsal: { from: 0.16, to: 0.23, height: 0.8 }, anal: { from: 0.8, to: 0.92, height: 0.8 },
  pectoral: 0.5, pelvic: true, scales: false, eye: { t: 0.09, r: 8 }, mouth: 'none',
  wash: WASH_DEEP, finWash: FIN_BLUE, ink: INK_BLUE, lateral: false, face: (k) => viperJaws(k),
  under: (k) => {
    // The first dorsal ray: a whip arcing forward over the head to a lit lure.
    const root = { x: k.x(0.17), y: topAt(k.a, 0.17) + 2 };
    const tip = { x: k.x(0) + 10, y: C - 40 };
    k.pen.stroke(bezier(root, { x: k.x(0.04), y: C - 82 }, tip, 16), 1, k.ink, 1, false);
    glow(k, tip.x, tip.y, 3.4);
  },
  extras: (k) => {
    countershade(k, 0.15, 0.45);
    // Honeycomb skin across the back.
    k.pen.clipped(k.body, () => {
      for (let row = 0; row < 3; row++) {
        for (let t = 0.2 + (row % 2) * 0.03; t < 0.92; t += 0.06) {
          const y = C - k.h(t) * (0.7 - row * 0.4);
          k.pen.hair(ring(k.x(t), y, 4.2, 3.4, 6), 0.4, k.ink, 0.35);
        }
      }
    });
    photophores(k, 16, 0.14, 0.9, 1.6);
    for (let i = 0; i < 11; i++) glow(k, k.x(0.2 + i * 0.065), C + k.h(0.2 + i * 0.065) * 0.35, 1.1);
  },
};

function viperJaws(k: Kit): void {
  const { pen, ink } = k;
  const nx = k.x(0);
  const hinge = { x: k.x(0.2), y: C + k.h(0.2) * 0.2 };
  const tip = { x: nx, y: C + 20 };
  // Upper lip, and the lower jaw dropped wide open below it.
  const upperLip = bezier({ x: nx, y: C }, { x: nx - 20, y: C + 4 }, hinge, 10);
  const lowerTop = bezier(hinge, { x: nx - 22, y: C + 16 }, tip, 10);
  const lowerBottom = bezier({ x: tip.x - 1, y: tip.y + 4 }, { x: nx - 24, y: C + 24 }, { x: k.x(0.24), y: bottomAt(k.a, 0.24) - 1 }, 10);
  // Dark gape: the white fangs read against it.
  pen.fill([...upperLip, ...lowerTop], ink, 0.88);
  const jaw = [...lowerTop, ...lowerBottom];
  pen.fill(jaw, PAPER_FILL, 1);
  pen.fill(jaw, WASH_DEEP, 0.35);
  pen.stroke([...jaw, jaw[0]!], 1.3, ink, 1, false);
  pen.stroke(upperLip, 1.3, ink, 1, false);
  // Upper fangs hang down across the gape; lower fangs rise past the snout.
  fang(k, { x: nx - 4, y: C + 1 }, { x: nx - 3, y: C + 12 }, { x: nx - 9, y: C + 21 }, 4);
  fang(k, { x: nx - 16, y: C + 3 }, { x: nx - 15, y: C + 9 }, { x: nx - 19, y: C + 14 }, 3);
  fang(k, { x: tip.x - 1, y: tip.y - 1 }, { x: tip.x + 7, y: C + 8 }, { x: tip.x + 5, y: C - 8 }, 4.6);
  fang(k, { x: nx - 12, y: C + 16 }, { x: nx - 8, y: C + 9 }, { x: nx - 11, y: C + 3 }, 3);
}

const loosejaw: Anatomy = {
  // Stoplight loosejaw: a jaw with no floor swung wide open, and a red searchlight
  // only it can see by. Fins sit far back like a pike's, for a sudden lunge.
  hl: 90, hh: 20, peak: 0.24, blunt: 0.92, peduncle: 0.3, tail: 'fork', tailSize: 1.25,
  dorsal: { from: 0.76, to: 0.9, height: 1 }, anal: { from: 0.74, to: 0.9, height: 1 },
  pectoral: 0.4, pelvic: true, scales: false, eye: { t: 0.1, r: 6.5 }, mouth: 'none',
  wash: WASH_DEEP, finWash: FIN_BLUE, ink: INK_BLUE, lateral: false, face: (k) => loosejawMouth(k),
  under: (k) => {
    // The searchlight's beam, faint red reaching ahead.
    // Stacked cones, so it fades out instead of ending in a hard edge.
    const src = { x: k.x(0.14), y: C + 2 };
    for (const reach of [0.4, 0.65, 1]) {
      const x = src.x + (250 - src.x) * reach;
      const spread = 26 * reach;
      k.pen.fill([src, { x, y: src.y - spread }, { x: x + 4, y: src.y + 3 }, { x, y: src.y + spread }], RED_LIGHT, 0.08);
    }
  },
  extras: (k) => {
    // Velvet-black skin: dense stipple over the whole body.
    k.pen.stipple(k.body, 1400, (_x, y) => (y < C ? 0.6 : 0.4), 0.5, k.ink);
    k.pen.fill(k.body, WASH_DEEP, 0.18);
    photophores(k, 10, 0.3, 0.86, 1.3);
    // Red searchlight under the eye, a small gold light behind it.
    glow(k, k.x(0.14), C + 2, 4.4, RED_LIGHT);
    k.pen.fill(ellipse(k.x(0.14) + 1, C + 1, 1.6, 1.2, 8), PAPER_FILL, 0.8);
    glow(k, k.x(0.2), C - k.h(0.2) * 0.2, 2.2);
  },
};

function loosejawMouth(k: Kit): void {
  const { pen, ink } = k;
  const nx = k.x(0);
  const hinge = { x: k.x(0.24), y: C + k.h(0.24) * 0.55 };
  // Upper jaw edge with a row of hooked teeth.
  const upper = bezier({ x: nx - 1, y: C + 3 }, { x: nx - 24, y: C + 7 }, hinge, 10);
  pen.stroke(upper, 1.2, ink, 1, false);
  for (let i = 1; i < 7; i++) {
    const p = upper[Math.round((i / 7) * (upper.length - 1))]!;
    fang(k, p, { x: p.x + 1, y: p.y + 3 }, { x: p.x - 1, y: p.y + 4 + (i % 2) * 3 }, 1.5);
  }
  // The floorless lower jaw: a thin bony bar dropped open, needle teeth pointing up.
  const tip = { x: nx + 2, y: C + 42 };
  const bar = [hinge, ...bezier({ x: hinge.x + 4, y: hinge.y + 2 }, { x: (hinge.x + tip.x) / 2, y: tip.y - 2 }, tip, 10)];
  const under = bezier(tip, { x: (hinge.x + tip.x) / 2 - 2, y: tip.y + 3 }, { x: hinge.x - 2, y: hinge.y + 5 }, 10);
  pen.fill([...bar, ...under], PAPER_FILL, 1);
  pen.fill([...bar, ...under], WASH_DEEP, 0.4);
  pen.stroke([...bar, ...under, bar[0]!], 1.1, ink, 1, false);
  for (let i = 2; i < 10; i++) {
    const p = bar[Math.round((i / 10) * (bar.length - 1))]!;
    fang(k, { x: p.x, y: p.y - 1 }, { x: p.x + 1, y: p.y - 4 }, { x: p.x + 2, y: p.y - 6 - (i % 2) * 3 }, 1.4);
  }
  glow(k, tip.x, tip.y, 1.6);
}

const snailfish: Anatomy = {
  // Hadal snailfish as a ghost: see-through, with long veil fins and a faint
  // glow around it. Its skeleton shows through the body.
  hl: 88, hh: 25, peak: 0.2, blunt: 1, peduncle: 0.1, tail: 'round', tailSize: 0.9,
  pectoral: 1.15, pelvic: false, scales: false, eye: { t: 0.1, r: 6 }, mouth: 'small',
  wash: '#5b86d4', finWash: GHOST, ink: INK_BLUE, lateral: false,
  under: (k) => {
    aura(k, GHOST, [[16, 0.12], [9, 0.16], [4, 0.2]]);
    veil(k, -1);
    veil(k, 1);
  },
  extras: (k) => {
    k.pen.fill(k.body, PAPER_FILL, 0.4);
    k.pen.clipped(k.body, () => {
      // Backbone, vertebrae and rib arcs.
      const spine: Pt[] = [];
      for (let t = 0.24; t <= 1; t += 0.03) spine.push({ x: k.x(t), y: C - k.h(t) * 0.1 });
      k.pen.stroke(spine, 0.8, k.ink, 0.5, false);
      for (let t = 0.26; t < 0.98; t += 0.04) {
        const x = k.x(t);
        const y = C - k.h(t) * 0.1;
        k.pen.hair([{ x: x + 2, y: y - k.h(t) * 0.45 }, { x, y }, { x: x + 2, y: y + k.h(t) * 0.42 }], 0.45, k.ink, 0.38);
        k.pen.dot(x, y, 0.9, k.ink, 0.5);
      }
      // Skull and gut showing through the head.
      k.pen.hair(ring(k.x(0.12), C - 4, 15, 13, 18), 0.5, k.ink, 0.3);
      k.pen.fill(ellipse(k.x(0.3), C + k.h(0.3) * 0.42, 14, 8, 16), WASH_DEEP, 0.2);
      // A pale sheen along the top of the head.
      k.pen.fill(ellipse(k.x(0.14), C - k.h(0.14) * 0.55, 18, 6, 16), PAPER_FILL, 0.55);
    });
  },
};

/** A long soft fin that grows taller towards the tail and ripples at its edge. */
function veil(k: Kit, side: -1 | 1): void {
  const from = side < 0 ? 0.34 : 0.42;
  const edge = (t: number): number => (side < 0 ? topAt(k.a, t) : bottomAt(k.a, t));
  const base: Pt[] = [];
  const rim: Pt[] = [];
  for (let t = from; t <= 1.001; t += 0.025) {
    const u = (t - from) / (1 - from);
    // Rises from nothing, tallest near the tail, then sweeps down into it.
    const height = 2 + 22 * Math.pow(Math.sin(Math.PI * Math.min(1, 0.06 + u * 0.82)), 0.7) * (0.45 + 0.55 * u) + Math.sin(u * 17) * 1.8 * u;
    base.push({ x: k.x(t), y: edge(t) - side * 3 });
    rim.push({ x: k.x(t) - height * 0.3, y: edge(t) + side * height });
  }
  const shape = [...base, ...[...rim].reverse()];
  k.pen.fill(shape, PAPER_FILL, 0.7);
  k.pen.fill(shape, GHOST, 0.35);
  base.forEach((b, i) => {
    if (i % 2 === 0) k.pen.hair([b, rim[i]!], 0.45, k.ink, 0.4);
  });
  k.pen.stroke(rim, 1, k.ink, 0.9, false);
}

export const DEEP_PLAYERS = { lanternfish, viperfish, loosejaw, snailfish } as const;
