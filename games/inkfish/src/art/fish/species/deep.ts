import type { SpeciesId } from '../../../levels/types';
import { ellipse, type Pt } from '../../pen';
import { backStipple, barbel, bezier, bottomAt, C, glow, PAPER_FILL, photophores, ring, spots, topAt, type Anatomy, type Kit } from '../kit';

// ---------------------------------------------------------------- palette

const BLUE_LIGHT = '#8fc4ff';
const RED_LIGHT = '#e8503f';
const MOUTH = '#2a2228';

// ---------------------------------------------------------------- local helpers

/** Eye centre, as fishArt draws it. */
function eyeAt(k: Kit): Pt {
  return { x: k.x(k.a.eye.t), y: C - k.h(k.a.eye.t) * 0.3 };
}

/** Deepens the body wash: deep-sea fish are dark, but the ink must still show. */
function darken(k: Kit, color: string, alpha: number): void {
  k.pen.fill(k.body, color, alpha);
}

/** A white needle tooth (or fang) from `base` to `tip`, slightly curved, outlined in ink. */
function fang(k: Kit, base: Pt, tip: Pt, width: number): void {
  const dx = tip.x - base.x;
  const dy = tip.y - base.y;
  const d = Math.hypot(dx, dy) || 1;
  const nx = (-dy / d) * (width / 2);
  const ny = (dx / d) * (width / 2);
  const bend = { x: (base.x + tip.x) / 2 - nx * 0.5, y: (base.y + tip.y) / 2 - ny * 0.5 };
  const tooth = [
    { x: base.x + nx, y: base.y + ny },
    ...bezier({ x: base.x + nx, y: base.y + ny }, { x: bend.x + nx * 0.5, y: bend.y + ny * 0.5 }, tip, 5),
    ...bezier(tip, { x: bend.x - nx * 0.5, y: bend.y - ny * 0.5 }, { x: base.x - nx, y: base.y - ny }, 5),
  ];
  k.pen.fill(tooth, PAPER_FILL, 1);
  k.pen.hair([...tooth, tooth[0]!], 0.5, k.ink, 0.95);
}

/** A long jaw line from the nose back to `to`, with fine teeth (bristlemouths, lizardfish). */
function longJaw(k: Kit, to: number, teeth: number, len: number, droop = 0.25): Pt[] {
  const nose = { x: k.x(0) - 1, y: C + 1 };
  const corner = { x: k.x(to), y: C + k.h(to) * droop };
  const jaw = bezier(nose, { x: (nose.x + corner.x) / 2, y: C + 3 }, corner, 16);
  k.pen.stroke(jaw, 1.1, k.ink, 1, false);
  for (let i = 1; i <= teeth; i++) {
    const p = jaw[Math.round((i / (teeth + 1)) * (jaw.length - 1))]!;
    k.pen.hair([p, { x: p.x - 0.5, y: p.y - len }], 0.5, k.ink, 0.9);
    k.pen.hair([p, { x: p.x - 0.5, y: p.y + len * 0.8 }], 0.5, k.ink, 0.9);
  }
  return jaw;
}

/** A pointed, rayed fin that wraps the tail tip (rattails, cusk-eels, halosaurs). Draw it under the body. */
function leafTail(k: Kit, from: number, len: number, spread = 1.3): void {
  const x0 = k.x(from);
  const h = k.h(from);
  const tip = { x: k.x(1) - len, y: C };
  const top = { x: x0, y: C - h };
  const bot = { x: x0, y: C + h };
  const mid = (x0 + tip.x) / 2;
  const edge = [
    ...bezier(top, { x: mid, y: C - h * spread - 3 }, tip, 12),
    ...bezier(tip, { x: mid, y: C + h * spread + 3 }, bot, 12),
  ];
  k.pen.fill(edge, PAPER_FILL, 1);
  k.pen.fill(edge, k.a.finWash ?? k.a.wash, k.heavy ? 0.3 : 0.18);
  edge.forEach((p, i) => {
    if (i % 2) return;
    k.pen.hair([{ x: p.x + 6, y: C }, p], 0.45, k.ink, 0.55);
  });
  k.pen.stroke(edge, 1, k.ink, 1, false);
}

/**
 * A long tapering rat tail continuing from the tail stalk, fringed by the
 * dorsal and anal fins (rattails, halosaurs). Draw it under the body, which
 * should end in a stalk (tail 'point' with a peduncle) so the two join.
 */
function ratTail(k: Kit, end: Pt, fringe: number): void {
  const x0 = k.x(1) + 2;
  const h = k.h(1);
  const mid = (x0 + end.x) / 2;
  const top = bezier({ x: x0, y: C - h * 1.04 }, { x: mid, y: C - h * 0.45 }, end, 16);
  const bot = bezier(end, { x: mid, y: C + h * 0.4 }, { x: x0, y: C + h * 0.92 }, 16);
  const n = top.length - 1;
  const fin = [
    ...top.map((p, i) => ({ x: p.x, y: p.y - fringe * (1 - i / n) - 0.5 })),
    ...bot.map((p, i) => ({ x: p.x, y: p.y + fringe * (i / n) + 0.5 })),
  ];
  k.pen.fill(fin, PAPER_FILL, 1);
  k.pen.fill(fin, k.a.finWash ?? k.a.wash, k.heavy ? 0.3 : 0.16);
  top.forEach((p, i) => {
    if (i % 2 || i === n) return;
    const f = fringe * (1 - i / n);
    k.pen.hair([p, { x: p.x - f * 0.5, y: p.y - f }], 0.45, k.ink, 0.55);
    const b = bot[n - i]!;
    k.pen.hair([b, { x: b.x - f * 0.5, y: b.y + f }], 0.45, k.ink, 0.55);
  });
  k.pen.stroke(fin, 0.9, k.ink, 1, false);
}

/** The flesh of the rat tail, drawn over the body's stalk end so the join is seamless (an extras step). */
function ratTailFlesh(k: Kit, end: Pt): void {
  const x0 = k.x(1) + 2;
  const h = k.h(1);
  const mid = (x0 + end.x) / 2;
  const top = bezier({ x: x0, y: C - h * 1.04 }, { x: mid, y: C - h * 0.45 }, end, 16);
  const bot = bezier(end, { x: mid, y: C + h * 0.4 }, { x: x0, y: C + h * 0.92 }, 16);
  const flesh = [...top, ...bot];
  k.pen.fill(flesh, PAPER_FILL, 1);
  k.pen.fill(flesh, k.a.wash, k.heavy ? 0.38 : 0.22);
  k.pen.clipped(flesh, () => {
    for (let x = end.x; x < x0; x += 3) k.pen.hair([{ x, y: C + h * 0.15 }, { x: x + 3, y: C + h }], 0.45, k.ink, 0.5);
  });
  k.pen.stroke(top, 1.7, k.ink, 1, false);
  k.pen.stroke(bot, 1.7, k.ink, 1, false);
}

/** A thin whip continuing past the tail, optionally ending in a light. */
function whip(k: Kit, end: Pt, bow: number, tip?: string): void {
  const root = { x: k.x(1) + 6, y: C };
  const ctrl = { x: (root.x + end.x) / 2, y: C + bow };
  k.pen.stroke(bezier(root, ctrl, end, 14), 1, k.ink, 1, false);
  if (tip) glow(k, end.x, end.y, 2.6, tip);
}

/** Two thin fin rays as feelers: chin barbels or pelvic filaments. */
function feelers(k: Kit, at: number, len: number, lean: number): void {
  const root = { x: k.x(at), y: bottomAt(k.a, at) - 1 };
  for (const s of [0, 1]) {
    const end = { x: root.x + lean + s * 3, y: root.y + len - s * 3 };
    k.pen.stroke(bezier(root, { x: root.x + lean * 0.2, y: root.y + len * 0.7 }, end, 6), 0.7, k.ink, 1, false);
  }
}

/** Large overlapping scale arcs (bigscales). */
function bigScales(k: Kit, size: number): void {
  k.pen.clipped(k.body, () => {
    let row = 0;
    for (let v = -0.85; v <= 0.9; v += (size * 1.25) / k.a.hh, row++) {
      for (let t = 0.3 + (row % 2) * (size / (4 * k.a.hl)); t < 0.98; t += (size * 1.3) / (2 * k.a.hl)) {
        const x = k.x(t);
        const y = C + k.h(t) * v;
        const arc: Pt[] = [];
        for (let i = 0; i <= 8; i++) {
          const ang = -Math.PI / 2 + (i / 8) * Math.PI;
          arc.push({ x: x - Math.cos(ang) * size * 0.7, y: y + Math.sin(ang) * size * 0.75 });
        }
        k.pen.hair(arc, 0.6, k.ink, 0.7);
        k.pen.hair([{ x: x - size * 0.35, y: y - size * 0.2 }, { x: x - size * 0.6, y }], 0.4, k.ink, 0.4);
      }
    }
  });
}

/** Glassy upward tube eye: a cylinder rising from the eye with a bright lens on top. */
function tubeEye(k: Kit, base: Pt, height: number, r: number, lens: string, alpha = 1): void {
  const top = { x: base.x - 1, y: base.y - height };
  const wall = [
    { x: base.x - r, y: base.y }, { x: top.x - r, y: top.y }, { x: top.x + r, y: top.y }, { x: base.x + r, y: base.y },
  ];
  k.pen.fill(wall, lens, 0.35 * alpha);
  k.pen.hair([wall[0]!, wall[1]!], 0.7, k.ink, 0.9 * alpha);
  k.pen.hair([wall[3]!, wall[2]!], 0.7, k.ink, 0.9 * alpha);
  k.pen.fill(ellipse(top.x, top.y, r * 1.6, r * 1.6, 14), lens, 0.25 * alpha);
  k.pen.fill(ellipse(top.x, top.y, r, r * 0.8, 14), lens, alpha);
  k.pen.hair(ring(top.x, top.y, r, r * 0.8, 14), 0.7, k.ink, alpha);
  k.pen.dot(top.x + r * 0.3, top.y - r * 0.25, Math.max(0.7, r * 0.25), PAPER_FILL, alpha);
}

/** Twilight zone to the trench (chapters 7 to 10). */
export const DEEP: Partial<Record<SpeciesId, Anatomy>> = {
  // ---------------------------------------------------------------- twilight
  bristlemouth: {
    hl: 92, hh: 17, peak: 0.3, blunt: 0.35, peduncle: 0.3, tail: 'fork', tailSize: 1.5,
    dorsal: { from: 0.48, to: 0.6, height: 0.8 }, anal: { from: 0.5, to: 0.8, height: 0.6 },
    pectoral: 0.35, pelvic: false, scales: false, eye: { t: 0.08, r: 4.5 }, mouth: 'small',
    wash: '#3e3d4a', lateral: false,
    extras: (k) => {
      darken(k, '#34333f', 0.2);
      backStipple(1.5)(k);
      longJaw(k, 0.24, 13, 2.4);
      photophores(k, 15, 0.12, 0.92, 1.4, BLUE_LIGHT);
      for (let i = 0; i < 9; i++) {
        const t = 0.2 + i * 0.075;
        glow(k, k.x(t), C + k.h(t) * 0.3, 1.1, BLUE_LIGHT);
      }
    },
  },
  pearleye: {
    hl: 86, hh: 24, peak: 0.35, blunt: 0.45, peduncle: 0.32, tail: 'fork', tailSize: 1.25,
    dorsal: { from: 0.4, to: 0.52, height: 0.8 }, dorsal2: { from: 0.8, to: 0.85, height: 0.35 },
    anal: { from: 0.6, to: 0.86, height: 0.5 }, pectoral: 0.4, pelvic: true, scales: true,
    eye: { t: 0.17, r: 6.5 }, mouth: 'teeth', wash: '#8a95a3', finWash: '#a8b0b8',
    under: (k) => {
      // The lens bulges above the head.
      const e = eyeAt(k);
      tubeEye(k, { x: e.x, y: topAt(k.a, k.a.eye.t) + 2 }, 13, 9, '#d8e6ee');
    },
    extras: (k) => {
      backStipple(1.2)(k);
      const e = eyeAt(k);
      tubeEye(k, e, e.y - topAt(k.a, k.a.eye.t) + 11, 9, '#d8e6ee');
      // The pearl: a white spot beside the eye.
      glow(k, e.x + 9, e.y - 2, 2.2, '#ffffff');
    },
  },
  barreleye: {
    hl: 72, hh: 25, peak: 0.42, blunt: 0.75, peduncle: 0.3, tail: 'fork', tailSize: 0.95,
    dorsal: { from: 0.55, to: 0.66, height: 0.55 }, anal: { from: 0.7, to: 0.82, height: 0.4 },
    pectoral: 0.75, pelvic: true, scales: true, eye: { t: 0.06, r: 3 }, mouth: 'small',
    wash: '#4a4242', finWash: '#6d6060',
    extras: (k) => {
      darken(k, '#3a3333', 0.2);
      backStipple(1.3)(k);
      // Transparent shield over the head, with green tube eyes inside.
      const cx = k.x(0.2);
      const base = topAt(k.a, 0.2);
      const rx = k.a.hl * 0.36;
      const ry = 30;
      const dome: Pt[] = [];
      for (let i = 0; i <= 20; i++) {
        const ang = Math.PI + (i / 20) * Math.PI;
        dome.push({ x: cx + Math.cos(ang) * rx, y: base + 8 + Math.sin(ang) * ry });
      }
      k.pen.fill(dome, '#bfe8ee', 0.45);
      k.pen.fill(dome, PAPER_FILL, 0.2);
      tubeEye(k, { x: cx + 5, y: base + 6 }, 18, 4.5, '#72c46a', 0.55);
      tubeEye(k, { x: cx - 1, y: base + 8 }, 19, 5, '#5fbf5a');
      k.pen.stroke(dome, 1.5, k.ink, 1, false);
      k.pen.hair(bezier({ x: cx + rx * 0.55, y: base - ry * 0.45 }, { x: cx + rx * 0.2, y: base - ry * 0.95 }, { x: cx - rx * 0.35, y: base - ry * 0.85 }, 8), 1.4, PAPER_FILL, 0.9);
    },
  },
  sabertooth: {
    hl: 88, hh: 22, peak: 0.3, blunt: 0.5, peduncle: 0.32, tail: 'fork', tailSize: 1.35,
    dorsal: { from: 0.42, to: 0.56, height: 0.85 }, dorsal2: { from: 0.82, to: 0.86, height: 0.3 },
    anal: { from: 0.55, to: 0.86, height: 0.6 }, pectoral: 0.4, pelvic: true, scales: false,
    eye: { t: 0.13, r: 10 }, mouth: 'teeth', wash: '#55566a',
    extras: (k) => {
      backStipple(1.5)(k);
      // Long sabre fangs hanging past the chin.
      fang(k, { x: k.x(0.03), y: C }, { x: k.x(0.035) - 2, y: C + 22 }, 3.8);
      fang(k, { x: k.x(0.075), y: C + 1 }, { x: k.x(0.085), y: C + 19 }, 3.4);
      fang(k, { x: k.x(0.12), y: C + 2 }, { x: k.x(0.125), y: C + 12 }, 2.4);
    },
  },
  dragonfish: {
    hl: 106, hh: 17, peak: 0.24, blunt: 0.5, peduncle: 0.38, tail: 'fork', tailSize: 1.6,
    dorsal: { from: 0.82, to: 0.93, height: 1.0 }, anal: { from: 0.8, to: 0.94, height: 1.0 },
    pectoral: 0.25, pelvic: false, scales: false, eye: { t: 0.07, r: 5 }, mouth: 'small',
    wash: '#26222c', finWash: '#4a4450', lateral: false,
    extras: (k) => {
      darken(k, '#1d1a22', 0.42);
      // Hexagon-scaled pattern of the scaly dragonfish.
      k.pen.clipped(k.body, () => {
        for (let t = 0.18; t < 0.98; t += 0.05) {
          k.pen.hair([{ x: k.x(t), y: topAt(k.a, t) }, { x: k.x(t + 0.025), y: C }, { x: k.x(t), y: bottomAt(k.a, t) }], 0.5, k.ink, 0.5);
        }
      });
      // Big jaw with fangs crossing the lips.
      const jaw = longJaw(k, 0.17, 0, 0, 0.2);
      for (let i = 1; i <= 4; i++) {
        const p = jaw[Math.round((i / 5) * (jaw.length - 1))]!;
        const len = 9 - i * 1.2;
        fang(k, { x: p.x, y: p.y - 2 }, { x: p.x - 1.5, y: p.y + len }, 2.2);
        fang(k, { x: p.x - 4, y: p.y + 2 }, { x: p.x - 5, y: p.y - len * 0.7 }, 1.8);
      }
      photophores(k, 16, 0.12, 0.94, 1.2, BLUE_LIGHT);
      // Red cheek light under the eye.
      const e = eyeAt(k);
      glow(k, e.x - 2, e.y + k.a.eye.r + 2.5, 2.2, RED_LIGHT);
      barbel(k, 38, BLUE_LIGHT);
    },
  },

  // ---------------------------------------------------------------- midnight
  bigscale: {
    hl: 68, hh: 34, peak: 0.26, blunt: 0.95, peduncle: 0.34, tail: 'fork', tailSize: 1.0,
    dorsal: { from: 0.38, to: 0.6, height: 0.55 }, anal: { from: 0.68, to: 0.8, height: 0.45 },
    pectoral: 0.5, pelvic: true, scales: false, eye: { t: 0.15, r: 6 }, mouth: 'small',
    wash: '#5c4838', finWash: '#7a6656', lateral: false,
    extras: (k) => {
      darken(k, '#4a3a2e', 0.18);
      bigScales(k, 12);
      // Spongy head with bony crests.
      k.pen.clipped(k.body, () => {
        for (let i = 0; i < 4; i++) {
          const t = 0.06 + i * 0.05;
          k.pen.hair(bezier({ x: k.x(t), y: topAt(k.a, t) + 1 }, { x: k.x(t) - 6, y: C - k.h(t) * 0.55 }, { x: k.x(t + 0.02), y: C - k.h(t) * 0.05 }, 6), 0.6, k.ink, 0.7);
        }
      });
    },
  },
  fangtooth: {
    hl: 70, hh: 46, peak: 0.26, blunt: 0.9, peduncle: 0.3, tail: 'fork', tailSize: 0.9,
    dorsal: { from: 0.45, to: 0.74, height: 0.38 }, anal: { from: 0.7, to: 0.84, height: 0.32 },
    pectoral: 0.4, pelvic: true, scales: true, eye: { t: 0.2, r: 4.5 }, mouth: 'gape',
    wash: '#3a2a26', finWash: '#5a4440',
    extras: (k) => {
      darken(k, '#2e221f', 0.32);
      k.pen.stipple(k.body, 1100, () => 0.3, 0.5, k.ink);
      // Bony, cavernous head.
      k.pen.clipped(k.body, () => {
        for (let i = 0; i < 5; i++) {
          const t = 0.05 + i * 0.045;
          k.pen.hair(bezier({ x: k.x(t), y: topAt(k.a, t) + 2 }, { x: k.x(t) - 8, y: C - k.h(t) * 0.5 }, { x: k.x(t) + 2, y: C - k.h(t) * 0.12 }, 6), 0.6, k.ink, 0.7);
        }
      });
      // The two giant lower fangs reach up past the snout into the head.
      const nx = k.x(0);
      const hh = k.a.hh;
      fang(k, { x: nx + 3, y: C + hh * 0.4 }, { x: nx - 2, y: C - hh * 0.34 }, 6);
      fang(k, { x: nx - 12, y: C + hh * 0.34 }, { x: nx - 16, y: C - hh * 0.3 }, 5);
    },
  },
  gulper: {
    hl: 94, hh: 13, peak: 0.2, blunt: 0.35, peduncle: 0.03, tail: 'point', tailSize: 0,
    dorsal: { from: 0.28, to: 0.96, height: 0.35 }, anal: { from: 0.42, to: 0.96, height: 0.3 },
    pectoral: 0.15, pelvic: false, scales: false, eye: { t: 0.03, r: 2.4 }, mouth: 'small',
    wash: '#26222c', finWash: '#4a4450', gills: 'none', lateral: false, wave: 5,
    under: (k) => whip(k, { x: 12, y: C - 10 }, 22, '#ff7aa8'),
    extras: (k) => {
      darken(k, '#1d1a22', 0.4);
      // The huge hinged jaw: an open gape and a sagging pouch far bigger than the head.
      const hingeT = 0.34;
      const hinge = { x: k.x(hingeT), y: bottomAt(k.a, hingeT) - 1 };
      const snout = { x: k.x(0) - 1, y: C + 1 };
      const tip = { x: k.x(0) - 2, y: C + 34 };
      const upper: Pt[] = [];
      for (let t = 0.02; t <= hingeT; t += 0.02) upper.push({ x: k.x(t), y: bottomAt(k.a, t) - 1 });
      const pouchEdge = bezier(tip, { x: k.x(0.06), y: C + 92 }, { x: k.x(0.44), y: bottomAt(k.a, 0.44) }, 18);
      const pouch = [...pouchEdge, ...[...upper].reverse(), snout];
      k.pen.fill(pouch, PAPER_FILL, 1);
      k.pen.fill(pouch, '#4a3e4c', k.heavy ? 0.5 : 0.36);
      k.pen.clipped(pouch, () => {
        for (let x = hinge.x - 30; x < tip.x + 6; x += 2.6) k.pen.hair([{ x, y: C }, { x: x - 8, y: C + 90 }], 0.5, k.ink, 0.45);
      });
      // Dark gape between the jaws.
      const lower = bezier(tip, { x: k.x(0.14), y: C + 22 }, hinge, 12);
      const gape = [snout, ...upper, ...[...lower].reverse()];
      k.pen.fill(gape, MOUTH, 0.85);
      k.pen.stroke(pouchEdge, 1.7, k.ink, 1, false);
      k.pen.stroke(lower, 1.5, k.ink, 1, false);
      k.pen.stroke([snout, { x: snout.x + 2, y: (snout.y + tip.y) / 2 }, tip], 1.2, k.ink, 1, false);
      for (let i = 1; i < 7; i++) {
        const p = lower[Math.round((i / 7) * (lower.length - 1))]!;
        k.pen.hair([p, { x: p.x - 0.5, y: p.y - 2.4 }], 0.6, PAPER_FILL, 0.95);
      }
    },
  },
  blackdragon: {
    hl: 112, hh: 14, peak: 0.24, blunt: 0.5, peduncle: 0.3, tail: 'fork', tailSize: 1.5,
    dorsal: { from: 0.45, to: 0.95, height: 0.7 }, anal: { from: 0.6, to: 0.95, height: 0.7 },
    pectoral: 0, pelvic: false, scales: false, eye: { t: 0.07, r: 4.2 }, mouth: 'small',
    wash: '#16141a', finWash: '#3a3640', lateral: false, wave: 7,
    extras: (k) => {
      darken(k, '#121016', 0.5);
      const jaw = longJaw(k, 0.15, 0, 0, 0.2);
      for (let i = 1; i <= 4; i++) {
        const p = jaw[Math.round((i / 5) * (jaw.length - 1))]!;
        fang(k, { x: p.x, y: p.y - 2 }, { x: p.x - 1.5, y: p.y + 8 - i }, 2);
        fang(k, { x: p.x - 3, y: p.y + 2 }, { x: p.x - 4, y: p.y - 6 + i * 0.8 }, 1.6);
      }
      photophores(k, 18, 0.1, 0.95, 1.1, BLUE_LIGHT);
      const e = eyeAt(k);
      glow(k, e.x - 1, e.y + k.a.eye.r + 2, 1.8, RED_LIGHT);
      barbel(k, 50, '#f6d76a');
    },
  },
  whalefish: {
    hl: 86, hh: 33, peak: 0.36, blunt: 0.95, peduncle: 0.3, tail: 'round', tailSize: 0.85,
    dorsal: { from: 0.66, to: 0.82, height: 0.6 }, anal: { from: 0.66, to: 0.82, height: 0.6 },
    pectoral: 0.3, pelvic: false, scales: false, eye: { t: 0.09, r: 2.4 }, mouth: 'small',
    wash: '#d9622a', finWash: '#e3884a', lateral: false,
    extras: (k) => {
      darken(k, '#c4501f', 0.18);
      backStipple(1.0)(k);
      // A huge whale mouth running far back along the head.
      const nose = { x: k.x(0) - 1, y: C + 3 };
      const corner = { x: k.x(0.36), y: C + k.h(0.36) * 0.22 };
      const upper = bezier(nose, { x: k.x(0.18), y: C + 2 }, corner, 14);
      const lower = bezier({ x: k.x(0.015), y: C + 11 }, { x: k.x(0.18), y: C + 13 }, corner, 14);
      const mouth = [...upper, ...[...lower].reverse()];
      k.pen.fill(mouth, '#4a1a12', 0.75);
      k.pen.stroke(upper, 1.3, k.ink, 1, false);
      k.pen.stroke(lower, 1.4, k.ink, 1, false);
      k.pen.hair(bezier({ x: k.x(0.02), y: C + 15 }, { x: k.x(0.18), y: C + 19 }, { x: corner.x - 2, y: corner.y + 6 }, 10), 0.6, k.ink, 0.6);
      // Big hollow lateral-line pores.
      for (let i = 0; i < 9; i++) {
        const t = 0.42 + i * 0.06;
        k.pen.hair(ring(k.x(t), C - k.h(t) * 0.15, 2, 1.6, 10), 0.6, k.ink, 0.85);
      }
      // Glowing tissue at the fin bases.
      for (const side of [-1, 1]) {
        const t = 0.74;
        k.pen.fill(ellipse(k.x(t), C + side * k.h(t) * 0.78, 7, 2.4, 12), '#f6a35a', 0.6);
      }
    },
  },

  // ---------------------------------------------------------------- abyss
  rattail: {
    hl: 66, hh: 31, peak: 0.22, blunt: 0.55, peduncle: 0.24, tail: 'point', tailSize: 0,
    dorsal: { from: 0.26, to: 0.4, height: 1.0, spiny: true }, dorsal2: { from: 0.5, to: 1.0, height: 0.3 },
    anal: { from: 0.42, to: 1.0, height: 0.36 }, pectoral: 0.5, pelvic: true, scales: true,
    eye: { t: 0.17, r: 9.5 }, mouth: 'small', wash: '#7a6f66', finWash: '#958a80',
    under: (k) => ratTail(k, { x: 10, y: C + 3 }, 7),
    extras: (k) => {
      backStipple(1.1)(k);
      ratTailFlesh(k, { x: 10, y: C + 3 });
      barbel(k, 12);
      // Ridged snout overhanging the mouth.
      k.pen.hair(bezier({ x: k.x(0.0), y: C - 1 }, { x: k.x(0.06), y: C - k.h(0.06) * 0.6 }, { x: k.x(0.12), y: topAt(k.a, 0.12) + 4 }, 6), 0.7, k.ink, 0.8);
    },
  },
  tripodfish: {
    hl: 80, hh: 18, peak: 0.3, blunt: 0.45, peduncle: 0.35, tail: 'fork', tailSize: 1.2,
    dorsal: { from: 0.34, to: 0.48, height: 1.0 }, anal: { from: 0.62, to: 0.78, height: 0.5 },
    pectoral: 0, pelvic: false, scales: true, eye: { t: 0.08, r: 3 }, mouth: 'small',
    wash: '#5f7286', finWash: '#8696a6',
    under: (k) => {
      // Stilts: two long pelvic rays and the lower tail ray, with little feet.
      const ground = C + 82;
      const pel = { x: k.x(0.42), y: bottomAt(k.a, 0.42) - 2 };
      for (const dx of [0, 4]) {
        const foot = { x: pel.x + 8 + dx, y: ground - dx * 0.5 };
        k.pen.stroke(bezier(pel, { x: pel.x - 2 + dx, y: (pel.y + foot.y) / 2 }, foot, 10), 1.2, k.ink, 1, false);
        k.pen.stroke([foot, { x: foot.x + 5, y: foot.y + 1 }], 1, k.ink, 1, false);
      }
      const tailRoot = { x: k.x(1) - 6, y: C + 6 };
      const tailFoot = { x: k.x(1) - 4, y: ground };
      k.pen.stroke(bezier(tailRoot, { x: tailRoot.x - 12, y: (tailRoot.y + ground) / 2 }, tailFoot, 10), 1.3, k.ink, 1, false);
      k.pen.stroke([tailFoot, { x: tailFoot.x + 6, y: tailFoot.y + 1 }], 1, k.ink, 1, false);
      // Pectoral rays held up and forward like feelers.
      const pec = { x: k.x(0.28), y: C };
      for (const [dx, dy] of [[52, -50], [60, -40], [44, -56]] as const) {
        k.pen.hair(bezier(pec, { x: pec.x + dx * 0.3, y: pec.y + dy * 0.9 }, { x: pec.x + dx, y: pec.y + dy }, 10), 0.7, k.ink, 0.9);
      }
    },
    extras: backStipple(1.2),
  },
  cuskeel: {
    hl: 100, hh: 20, peak: 0.25, blunt: 0.75, peduncle: 0.02, tail: 'point', tailSize: 0,
    dorsal: { from: 0.3, to: 0.95, height: 0.42 }, anal: { from: 0.45, to: 0.95, height: 0.42 },
    pectoral: 0.45, pelvic: false, scales: false, eye: { t: 0.1, r: 4.5 }, mouth: 'small',
    wash: '#b8988a', finWash: '#c8b0a4', wave: 4,
    under: (k) => leafTail(k, 0.78, 16, 1.6),
    extras: (k) => {
      backStipple(1.0)(k);
      feelers(k, 0.12, 12, 4);
    },
  },
  lizardfish: {
    hl: 92, hh: 21, peak: 0.36, blunt: 0.25, peduncle: 0.42, tail: 'fork', tailSize: 1.25,
    dorsal: { from: 0.32, to: 0.45, height: 1.0 }, dorsal2: { from: 0.8, to: 0.84, height: 0.3 },
    anal: { from: 0.72, to: 0.84, height: 0.5 }, pectoral: 0.45, pelvic: true, scales: true,
    eye: { t: 0.13, r: 6 }, mouth: 'small', wash: '#8a7a56', finWash: '#a8986c',
    extras: (k) => {
      spots(k, 18, [2.5, 5], '#5a4a30', { from: 0.25, to: 0.95, outline: false, alpha: 0.5 });
      k.pen.clipped(k.body, () => {
        for (const t0 of [0.3, 0.48, 0.66, 0.84]) {
          for (let t = t0; t < t0 + 0.05; t += 0.008) k.pen.hair([{ x: k.x(t), y: topAt(k.a, t) }, { x: k.x(t) - 2, y: C + k.h(t) * 0.1 }], 0.5, k.ink, 0.6);
        }
      });
      // Lizard grin: a long jaw packed with teeth.
      longJaw(k, 0.26, 16, 2.4, 0.15);
      // Flat skull lines above the eye.
      k.pen.hair(bezier({ x: k.x(0.02), y: C - 3 }, { x: k.x(0.12), y: topAt(k.a, 0.12) + 2 }, { x: k.x(0.26), y: topAt(k.a, 0.26) + 3 }, 8), 0.6, k.ink, 0.7);
    },
  },
  halosaur: {
    hl: 74, hh: 16, peak: 0.3, blunt: 0.1, peduncle: 0.4, tail: 'point', tailSize: 0,
    dorsal: { from: 0.36, to: 0.48, height: 1.0 }, anal: { from: 0.55, to: 1.0, height: 0.4 },
    pectoral: 0.5, pelvic: true, scales: true, eye: { t: 0.12, r: 4.5 }, mouth: 'small',
    wash: '#a9a69c', finWash: '#bdb9ae', wave: 3,
    under: (k) => {
      ratTail(k, { x: 10, y: C - 2 }, 6);
      // A long soft snout overhanging the mouth.
      const nose = k.x(0);
      const snout = [
        { x: k.x(0.08), y: topAt(k.a, 0.08) + 0.5 },
        ...bezier({ x: k.x(0.08), y: topAt(k.a, 0.08) + 0.5 }, { x: nose + 4, y: C - 6 }, { x: nose + 14, y: C - 2 }, 10),
        ...bezier({ x: nose + 14, y: C - 2 }, { x: nose + 8, y: C + 1 }, { x: nose - 2, y: C + 1 }, 6),
      ];
      k.pen.fill(snout, PAPER_FILL, 1);
      k.pen.fill(snout, k.a.wash, k.heavy ? 0.38 : 0.22);
      k.pen.stroke(snout, 1.6, k.ink, 1, false);
    },
    extras: (k) => {
      backStipple(1.2)(k);
      ratTailFlesh(k, { x: 10, y: C - 2 });
    },
  },

  // ---------------------------------------------------------------- trench
  blobfish: {
    hl: 76, hh: 40, peak: 0.25, blunt: 1, peduncle: 0.14, tail: 'round', tailSize: 0.6,
    dorsal: { from: 0.45, to: 0.7, height: 0.3 }, anal: { from: 0.6, to: 0.8, height: 0.25 },
    pectoral: 0.6, pelvic: false, scales: false, eye: { t: 0.17, r: 5.5 }, mouth: 'small',
    wash: '#c89894', finWash: '#d4aaa6', gills: 'none', lateral: false,
    under: (k) => {
      // The soft droopy nose.
      const n = { x: k.x(0) + 1, y: C + 11 };
      const nose = ellipse(n.x, n.y, 12, 11, 20);
      k.pen.fill(nose, PAPER_FILL, 1);
      k.pen.fill(nose, k.a.wash, k.heavy ? 0.45 : 0.3);
      k.pen.stroke([...nose, nose[0]!], 1.8, k.ink, 1, false);
    },
    extras: (k) => {
      // Loose gelatinous skin: soft folds and a faint sheen.
      k.pen.stipple(k.body, 700, () => 0.25, 0.45, k.ink);
      for (let i = 0; i < 6; i++) {
        const t = 0.3 + i * 0.1;
        k.pen.hair(bezier({ x: k.x(t), y: C - k.h(t) * 0.7 }, { x: k.x(t) - 5, y: C }, { x: k.x(t) + 1, y: C + k.h(t) * 0.75 }, 8), 0.5, k.ink, 0.45);
      }
      k.pen.hair(bezier({ x: k.x(0.2), y: C - k.h(0.2) * 0.75 }, { x: k.x(0.4), y: C - k.h(0.4) * 0.95 }, { x: k.x(0.6), y: C - k.h(0.6) * 0.7 }, 10), 2, PAPER_FILL, 0.7);
      // Droopy frown under the nose.
      const m0 = { x: k.x(0.06), y: C + 21 };
      k.pen.stroke(bezier(m0, { x: k.x(0.12), y: C + 17 }, { x: k.x(0.2), y: C + 25 }, 8), 1.3, k.ink, 1, false);
    },
  },
  ghostshark: {
    hl: 96, hh: 30, peak: 0.22, blunt: 0.85, peduncle: 0.02, tail: 'point', tailSize: 0,
    dorsal: { from: 0.24, to: 0.34, height: 1.3, tri: true }, dorsal2: { from: 0.42, to: 0.9, height: 0.3 },
    anal: { from: 0.7, to: 0.92, height: 0.25 }, pectoral: 1.15, pelvic: true, scales: false,
    eye: { t: 0.14, r: 10 }, mouth: 'beak', wash: '#a8a4b8', finWash: '#bcb8c8', gills: 'none', lateral: false,
    under: (k) => {
      // The long thin rat tail.
      const root = { x: k.x(0.96), y: C };
      const end = { x: 8, y: C + 4 };
      k.pen.stroke(bezier(root, { x: (root.x + end.x) / 2, y: C - 6 }, end, 14), 1.2, k.ink, 1, false);
    },
    extras: (k) => {
      backStipple(0.9)(k);
      // Wavy sensory canals over the head and along the flank.
      const canal = (pts: Pt[]): void => k.pen.hair(pts, 0.6, k.ink, 0.75);
      const e = eyeAt(k);
      canal(bezier({ x: k.x(0.01), y: C - 2 }, { x: e.x + 6, y: e.y + 16 }, { x: k.x(0.3), y: C + 2 }, 12));
      canal(bezier({ x: k.x(0.02), y: C - 8 }, { x: e.x + 4, y: e.y - 16 }, { x: k.x(0.28), y: C - k.h(0.28) * 0.5 }, 12));
      const flank: Pt[] = [];
      for (let t = 0.28; t < 0.97; t += 0.012) flank.push({ x: k.x(t), y: C - k.h(t) * 0.2 + Math.sin(t * 60) * 1.4 });
      canal(flank);
      // Single gill crease.
      const g = k.x(0.25);
      k.pen.stroke(bezier({ x: g + 2, y: C - k.h(0.25) * 0.3 }, { x: g - 4, y: C + 4 }, { x: g + 2, y: C + k.h(0.25) * 0.5 }, 8), 0.9, k.ink, 1, false);
      // The venomous dorsal spine along the fin's leading edge.
      const base = { x: k.x(0.24), y: topAt(k.a, 0.24) + 3 };
      const tip = { x: k.x(0.27) - k.a.hh * 1.3 * 0.8 - 3, y: topAt(k.a, 0.27) - k.a.hh * 1.38 };
      k.pen.stroke([base, tip], 2.6, k.ink, 1, false);
      for (let i = 1; i < 6; i++) {
        const f = i / 6;
        const p = { x: base.x + (tip.x - base.x) * f, y: base.y + (tip.y - base.y) * f };
        k.pen.hair([p, { x: p.x - 3, y: p.y + 1 }], 0.6, k.ink, 0.9);
      }
    },
  },
  snipeeel: {
    hl: 92, hh: 8, peak: 0.12, blunt: 0.4, peduncle: 0.05, tail: 'point', tailSize: 0,
    dorsal: { from: 0.15, to: 0.98, height: 0.7 }, anal: { from: 0.2, to: 0.98, height: 0.7 },
    pectoral: 0.8, pelvic: false, scales: false, eye: { t: 0.05, r: 3.6 }, mouth: 'small',
    wash: '#6a5442', finWash: '#8a7462', gills: 'none', lateral: false, wave: 10,
    under: (k) => {
      // The body thins into a thread.
      const root = { x: k.x(0.97), y: C };
      k.pen.stroke(bezier(root, { x: 24, y: C + 6 }, { x: 8, y: C - 2 }, 12), 0.9, k.ink, 1, false);
    },
    extras: (k) => {
      darken(k, '#5a4434', 0.2);
      // Bird-beak jaws that curve apart and never meet.
      const nose = k.x(0);
      const jaw = (dir: number, len: number): void => {
        const root = { x: nose - 6, y: C + dir * 1.2 };
        const tip = { x: nose + len, y: C + dir * 15 };
        const ctrl = { x: nose + len * 0.55, y: C + dir * 1.5 };
        const outer = bezier({ x: root.x, y: root.y + dir * 1.6 }, { x: ctrl.x, y: ctrl.y + dir * 1.6 }, tip, 12);
        const inner = bezier(tip, { x: ctrl.x, y: ctrl.y - dir * 0.6 }, { x: root.x, y: root.y - dir * 0.8 }, 12);
        const shape = [...outer, ...inner];
        k.pen.fill(shape, PAPER_FILL, 1);
        k.pen.fill(shape, k.a.wash, 0.4);
        k.pen.stroke([...shape, shape[0]!], 0.9, k.ink, 1, false);
      };
      jaw(-1, 29);
      jaw(1, 25);
    },
  },
};
