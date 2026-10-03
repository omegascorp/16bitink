import type { PlayerFishId } from '../../../levels/types';
import { ellipse, type Pt } from '../../pen';
import { bands, bezier, bottomAt, C, finlets, glow, PAPER_FILL, photophores, ring, topAt, type Anatomy, type Kit } from '../kit';

const INK_BLUE = '#1f3f8a';
const WASH = '#3466c2';
const WASH_DEEP = '#2a4d9e';
const FIN_BLUE = '#7fa3e0';

/**
 * An eye drawn by hand where the engine's fixed placement would be wrong
 * (gobies' eyes sit on top of the head, hatchetfish look straight up).
 * Use with `eye: { t: 0, r: 0 }` so the engine's own eye vanishes into the snout.
 */
function eyeAt(k: Kit, x: number, y: number, r: number, look: Pt = { x: 0.08, y: 0 }, ry = r): void {
  const { pen, ink } = k;
  pen.fill(ellipse(x, y, r, ry, 18), PAPER_FILL, 1);
  pen.stroke(ring(x, y, r, ry, 18), 0.9, ink, 1, false);
  pen.hair(ring(x, y, r * 0.68, ry * 0.68, 16), 0.45, ink, 0.7);
  const px = x + look.x * r;
  const py = y + look.y * ry;
  pen.dot(px, py, r * 0.4, ink);
  pen.dot(px + r * 0.15, py - r * 0.2, Math.max(0.6, r * 0.13), PAPER_FILL);
  if (k.heavy) pen.stroke([{ x: x - r * 1.2, y: y - ry * 1.3 }, { x: x + r * 1.1, y: y - ry * 0.8 }], 1.6, ink, 1, false);
}

/** A white needle fang from `base` to `tip`. */
function fang(k: Kit, base: Pt, tip: Pt, width: number): void {
  const dx = tip.x - base.x;
  const dy = tip.y - base.y;
  const d = Math.hypot(dx, dy) || 1;
  const nx = (-dy / d) * (width / 2);
  const ny = (dx / d) * (width / 2);
  const tooth = [{ x: base.x + nx, y: base.y + ny }, tip, { x: base.x - nx, y: base.y - ny }];
  k.pen.fill(tooth, PAPER_FILL, 1);
  k.pen.stroke([...tooth, tooth[0]!], 0.75, k.ink, 1, false);
}

/** The fish you swim as: one per chapter, always in blue ink so "you" read the same everywhere. */
export const PLAYERS: Partial<Record<PlayerFishId, Anatomy>> = {
  inkling: {
    hl: 70, hh: 40, peak: 0.38, blunt: 0.8, peduncle: 0.3, tail: 'round', tailSize: 1.0,
    dorsal: { from: 0.34, to: 0.72, height: 0.55 }, anal: { from: 0.6, to: 0.82, height: 0.42 },
    pectoral: 0.55, pelvic: true, scales: true, eye: { t: 0.17, r: 11 }, mouth: 'small',
    wash: WASH, ink: INK_BLUE,
  },
  goby: {
    // Blunt head, eyes perched on top, two dorsals, a fan tail and a sucker disc underneath.
    hl: 74, hh: 27, peak: 0.26, blunt: 1, peduncle: 0.46, tail: 'round', tailSize: 1.15,
    dorsal: { from: 0.3, to: 0.45, height: 0.95, spiny: true }, dorsal2: { from: 0.52, to: 0.84, height: 0.75 },
    anal: { from: 0.58, to: 0.84, height: 0.62 }, pectoral: 0.85, pelvic: false, scales: true,
    eye: { t: 0, r: 0 }, mouth: 'small', wash: WASH, finWash: FIN_BLUE, ink: INK_BLUE,
    under: (k) => {
      // Fused pelvic fins: a round suction cup under the chest.
      const cx = k.x(0.3);
      const cy = bottomAt(k.a, 0.3) + 2;
      const cup = [...bezier({ x: cx + 12, y: cy - 5 }, { x: cx + 10, y: cy + 15 }, { x: cx - 3, y: cy + 15 }, 8), ...bezier({ x: cx - 3, y: cy + 15 }, { x: cx - 18, y: cy + 14 }, { x: cx - 15, y: cy - 5 }, 8)];
      k.pen.fill(cup, PAPER_FILL, 1);
      k.pen.fill(cup, FIN_BLUE, 0.3);
      for (let i = 1; i < 8; i++) {
        const p = cup[Math.round((i / 8) * (cup.length - 1))]!;
        k.pen.hair([{ x: cx - 2, y: cy - 4 }, p], 0.45, k.ink, 0.6);
      }
      k.pen.stroke(cup, 1.1, k.ink, 1, false);
    },
    extras: (k) => {
      // Dusky saddles and freckles along the back.
      k.pen.clipped(k.body, () => {
        for (let b = 0; b < 5; b++) {
          const t0 = 0.36 + b * 0.12;
          for (let t = t0; t < t0 + 0.035; t += 0.008) k.pen.hair([{ x: k.x(t), y: topAt(k.a, t) }, { x: k.x(t) - 1.5, y: C + k.h(t) * 0.05 }], 0.5, k.ink, 0.55);
        }
        for (let i = 0; i < 14; i++) {
          const t = 0.32 + k.pen.rng() * 0.6;
          k.pen.dot(k.x(t), C + k.h(t) * (k.pen.rng() * 1.2 - 0.3), 1.1, k.ink, 0.6);
        }
      });
      // Big frog-like eyes on top of the head.
      const t = 0.12;
      eyeAt(k, k.x(t), topAt(k.a, t) + 9, 9, { x: 0.15, y: -0.15 });
    },
  },
  perchfry: {
    hl: 64, hh: 36, peak: 0.38, blunt: 0.7, peduncle: 0.28, tail: 'fork', tailSize: 0.95,
    dorsal: { from: 0.22, to: 0.5, height: 0.7, spiny: true }, dorsal2: { from: 0.55, to: 0.74, height: 0.5 },
    anal: { from: 0.64, to: 0.8, height: 0.45 }, pectoral: 0.5, pelvic: true, scales: true,
    eye: { t: 0.16, r: 10 }, mouth: 'small', wash: WASH, finWash: FIN_BLUE, ink: INK_BLUE,
    extras: (k) => {
      k.pen.clipped(k.body, () => {
        for (let b = 0; b < 4; b++) {
          const t0 = 0.32 + b * 0.14;
          for (let t = t0; t < t0 + 0.045; t += 0.008) {
            k.pen.hair([{ x: k.x(t), y: topAt(k.a, t) }, { x: k.x(t) - 2, y: C + k.h(t) * 0.4 }], 0.5, k.ink, 0.6);
          }
        }
      });
    },
  },
  butterfly: {
    // A tall compressed disc with a pointed snout, a dark mask through the eye and a false eye by the tail.
    hl: 56, hh: 50, peak: 0.44, blunt: 0.12, peduncle: 0.24, tail: 'round', tailSize: 0.62,
    dorsal: { from: 0.26, to: 0.62, height: 0.42, spiny: true }, dorsal2: { from: 0.62, to: 0.88, height: 0.5 },
    anal: { from: 0.56, to: 0.88, height: 0.5 }, pectoral: 0.4, pelvic: true, scales: true,
    eye: { t: 0.2, r: 7.5 }, mouth: 'small', wash: WASH, finWash: FIN_BLUE, ink: INK_BLUE,
    extras: (k) => {
      // Fine diagonal chevron lines across the flank.
      k.pen.clipped(k.body, () => {
        for (let i = 0; i < 9; i++) {
          const t = 0.34 + i * 0.06;
          k.pen.hair([{ x: k.x(t) + 8, y: topAt(k.a, t) }, { x: k.x(t) - 8, y: bottomAt(k.a, t) }], 0.6, k.ink, 0.4);
        }
      });
      // Eye mask: a dark band straight down through the eye.
      bands(k, [k.a.eye.t - 0.035], 0.07, { fill: WASH_DEEP, alpha: 0.85 });
      // False eye-spot on the rear upper flank: dark disc in a pale ring.
      const x = k.x(0.74);
      const y = C - k.h(0.74) * 0.38;
      k.pen.fill(ellipse(x, y, 9.5, 9.5, 18), PAPER_FILL, 1);
      k.pen.hair(ring(x, y, 9.5, 9.5, 18), 0.6, k.ink, 0.8);
      k.pen.fill(ellipse(x, y, 6.5, 6.5, 16), WASH_DEEP, 1);
      k.pen.stroke(ring(x, y, 6.5, 6.5, 16), 0.8, k.ink, 1, false);
      k.pen.dot(x + 1.5, y - 1.8, 1.2, PAPER_FILL, 0.8);
    },
  },
  barracuda: {
    hl: 96, hh: 20, peak: 0.45, blunt: 0.15, peduncle: 0.4, tail: 'fork', tailSize: 1.5,
    dorsal: { from: 0.4, to: 0.5, height: 0.9, spiny: true }, dorsal2: { from: 0.7, to: 0.8, height: 0.8 },
    anal: { from: 0.72, to: 0.82, height: 0.7 }, pectoral: 0.45, pelvic: true, scales: true,
    eye: { t: 0.14, r: 7 }, mouth: 'teeth', wash: WASH, ink: INK_BLUE,
    extras: (k) => {
      // Dark chevrons along the flank.
      for (let i = 0; i < 9; i++) {
        const t = 0.3 + i * 0.065;
        const x = k.x(t);
        k.pen.hair([{ x: x + 3, y: C - k.h(t) * 0.75 }, { x: x - 2, y: C - k.h(t) * 0.1 }, { x: x + 3, y: C + k.h(t) * 0.3 }], 0.7, k.ink, 0.6);
      }
    },
  },
  tuna: {
    // A torpedo: stiff crescent tail on a pencil-thin stalk, little sail fins, finlets to the tail.
    hl: 80, hh: 29, peak: 0.4, blunt: 0.42, peduncle: 0.12, tail: 'lunate', tailSize: 1.65,
    dorsal: { from: 0.3, to: 0.42, height: 0.75, tri: true }, dorsal2: { from: 0.54, to: 0.62, height: 0.7, tri: true },
    anal: { from: 0.57, to: 0.65, height: 0.65, tri: true }, pectoral: 0.55, pelvic: true, scales: false,
    eye: { t: 0.15, r: 8.5 }, mouth: 'small', wash: WASH, finWash: FIN_BLUE, ink: INK_BLUE, lateral: false,
    extras: (k) => {
      // Dark back with a sharp line above the silvery belly.
      k.pen.clipped(k.body, () => {
        const back: Pt[] = [];
        for (let t = 0; t <= 1.001; t += 0.04) back.push({ x: k.x(t), y: C - k.h(t) * 0.15 });
        const shape = [...back, ...[...back].reverse().map((p) => ({ x: p.x, y: C - 80 }))];
        k.pen.fill(shape, WASH_DEEP, 0.45);
        k.pen.hair(back, 0.6, k.ink, 0.7);
        // Faint wavy marks on the back.
        for (let i = 0; i < 8; i++) {
          const t = 0.3 + i * 0.07;
          k.pen.hair(bezier({ x: k.x(t) + 3, y: C - k.h(t) * 0.85 }, { x: k.x(t) - 3, y: C - k.h(t) * 0.55 }, { x: k.x(t) + 2, y: C - k.h(t) * 0.25 }, 5), 0.5, k.ink, 0.5);
        }
      });
      finlets(k, 0.68, 6);
      // Keel on the tail stalk.
      k.pen.hair([{ x: k.x(0.86), y: C }, { x: k.x(1) - 2, y: C }], 1, k.ink, 0.8);
    },
  },
  lanternfish: {
    hl: 66, hh: 26, peak: 0.32, blunt: 0.9, peduncle: 0.3, tail: 'fork', tailSize: 1.15,
    dorsal: { from: 0.42, to: 0.58, height: 0.8 }, anal: { from: 0.6, to: 0.8, height: 0.55 },
    pectoral: 0.5, pelvic: true, scales: true, eye: { t: 0.13, r: 12 }, mouth: 'small',
    wash: WASH_DEEP, ink: INK_BLUE,
    extras: (k) => {
      photophores(k, 10, 0.2, 0.83, 1.8);
      glow(k, k.x(0.06), C - k.h(0.06) * 0.1, 2.4);
    },
  },
  hatchetfish: {
    // Paper-thin silver hatchet: a deep keeled chest, a thin stalk, photophores along the keel, eyes looking up.
    hl: 52, hh: 44, peak: 0.34, blunt: 0.8, peduncle: 0.12, tail: 'fork', tailSize: 0.75,
    dorsal: { from: 0.52, to: 0.64, height: 0.55, tri: true }, anal: { from: 0.7, to: 0.84, height: 0.4 },
    pectoral: 0.45, pelvic: false, scales: false, eye: { t: 0, r: 0 }, mouth: 'small',
    wash: '#4f7ed0', finWash: FIN_BLUE, ink: INK_BLUE, lateral: false,
    under: (k) => {
      // The "blade": a deep keel below the chest, outlined and silvered.
      const t0 = 0.04;
      const t1 = 0.8;
      const keelTop: Pt[] = [];
      for (let t = t0; t <= t1 + 0.001; t += 0.03) keelTop.push({ x: k.x(t), y: bottomAt(k.a, t) - 6 });
      const tip = { x: k.x(0.3), y: C + 68 };
      const edge = [
        ...bezier({ x: k.x(t0), y: bottomAt(k.a, t0) }, { x: k.x(0.08), y: C + 58 }, tip, 12),
        ...bezier(tip, { x: k.x(0.62), y: C + 62 }, { x: k.x(t1), y: bottomAt(k.a, t1) }, 14),
      ];
      const keel = [...edge, ...[...keelTop].reverse()];
      k.pen.fill(keel, PAPER_FILL, 1);
      k.pen.fill(keel, '#4f7ed0', k.heavy ? 0.38 : 0.24);
      // Silver sheen: vertical hairlines and a pale band.
      k.pen.clipped(keel, () => {
        for (let x = k.x(t1); x < k.x(t0); x += 2.6) k.pen.hair([{ x, y: C }, { x: x - 1, y: C + 80 }], 0.45, k.ink, 0.35);
      });
      k.pen.stroke(edge, 1.9, k.ink, 1, true);
      // Two rows of light organs following the keel edge.
      for (let i = 1; i < 14; i++) {
        const p = edge[Math.round((i / 14) * (edge.length - 1))]!;
        glow(k, p.x, p.y - 4, 1.6);
      }
    },
    extras: (k) => {
      // Mirror-silver flank: fine vertical lines and a few bright flashes.
      k.pen.clipped(k.body, () => {
        for (let t = 0.2; t < 0.8; t += 0.03) k.pen.hair([{ x: k.x(t), y: C - k.h(t) * 0.6 }, { x: k.x(t) - 1, y: bottomAt(k.a, t) }], 0.45, k.ink, 0.35);
        k.pen.fill(ellipse(k.x(0.38), C + 2, 13, 18, 16), PAPER_FILL, 0.45);
      });
      // Belly photophores where the body meets the keel.
      photophores(k, 7, 0.2, 0.62, 1.6);
      // Tubular eye pointing upward.
      const x = k.x(0.17);
      const y = topAt(k.a, 0.17) + 11;
      eyeAt(k, x, y, 7.5, { x: 0.05, y: -0.45 }, 9.5);
    },
  },
  viperfish: {
    // Long slim dragon: fangs too big for the mouth, a long first dorsal ray, rows of photophores.
    hl: 100, hh: 16, peak: 0.24, blunt: 0.6, peduncle: 0.26, tail: 'fork', tailSize: 1.3,
    dorsal: { from: 0.17, to: 0.24, height: 0.9 }, anal: { from: 0.82, to: 0.92, height: 0.7 },
    pectoral: 0.4, pelvic: true, scales: false, eye: { t: 0.08, r: 6.5 }, mouth: 'teeth',
    wash: WASH_DEEP, finWash: FIN_BLUE, ink: INK_BLUE, lateral: false,
    under: (k) => {
      // First dorsal ray: a long whip arcing back with a tiny lure at the tip.
      const root = { x: k.x(0.17), y: topAt(k.a, 0.17) };
      const tip = { x: k.x(0.62), y: C - 58 };
      k.pen.stroke(bezier(root, { x: root.x - 6, y: C - 66 }, tip, 14), 0.9, k.ink, 1, false);
      glow(k, tip.x, tip.y, 2.2);
    },
    extras: (k) => {
      // Dark back, hexagonal skin pattern hinted with stipple.
      k.pen.stipple(k.body, 900, (_x, y) => (y < C ? 0.45 : 0.15), 0.5, k.ink);
      photophores(k, 16, 0.12, 0.9, 1.5);
      for (let i = 0; i < 12; i++) {
        const t = 0.15 + i * 0.06;
        glow(k, k.x(t), C + k.h(t) * 0.3, 1.1);
      }
      glow(k, k.x(0.11), C - k.h(0.11) * 0.05, 2);
      // Fangs that don't fit inside the mouth: lower ones rise in front of the snout,
      // upper ones hang below the chin.
      const nose = k.x(0);
      // Lower jaw jutting forward under the snout.
      k.pen.stroke(bezier({ x: k.x(0.16), y: bottomAt(k.a, 0.16) }, { x: nose - 2, y: C + 11 }, { x: nose + 5, y: C + 6 }, 8), 1.4, k.ink, 1, false);
      fang(k, { x: nose + 4, y: C + 6 }, { x: nose + 8, y: C - 24 }, 4.2);
      fang(k, { x: nose - 3, y: C + 8 }, { x: nose, y: C - 15 }, 3.4);
      fang(k, { x: nose - 1, y: C - 1 }, { x: nose - 3, y: C + 24 }, 4);
      fang(k, { x: nose - 9, y: C + 1 }, { x: nose - 10, y: C + 16 }, 3);
    },
  },
  snailfish: {
    // Hadal snailfish: pale, soft and see-through, a big head, tiny eyes, fins merging into the tail.
    hl: 82, hh: 34, peak: 0.2, blunt: 1, peduncle: 0.08, tail: 'round', tailSize: 0.5,
    dorsal: { from: 0.32, to: 1, height: 0.42 }, anal: { from: 0.42, to: 1, height: 0.4 },
    pectoral: 0.75, pelvic: false, scales: false, eye: { t: 0.11, r: 4.5 }, mouth: 'small',
    wash: '#5b86d4', finWash: '#a8c1ec', ink: INK_BLUE, lateral: false,
    extras: (k) => {
      // Gelatinous: knock the wash back towards the paper and show what's inside.
      k.pen.fill(k.body, PAPER_FILL, 0.35);
      k.pen.clipped(k.body, () => {
        // Backbone with faint vertebrae.
        const spine: Pt[] = [];
        for (let t = 0.3; t <= 1; t += 0.03) spine.push({ x: k.x(t), y: C - k.h(t) * 0.12 });
        k.pen.hair(spine, 0.6, k.ink, 0.35);
        for (let t = 0.32; t < 0.98; t += 0.035) {
          const x = k.x(t);
          const y = C - k.h(t) * 0.12;
          k.pen.hair([{ x: x + 1.5, y: y - k.h(t) * 0.25 }, { x, y }, { x: x + 1.5, y: y + k.h(t) * 0.22 }], 0.4, k.ink, 0.3);
        }
        // Gut and liver showing through the belly.
        k.pen.fill(ellipse(k.x(0.3), C + k.h(0.3) * 0.38, 14, 9, 16), '#2a4d9e', 0.18);
        k.pen.hair(ring(k.x(0.3), C + k.h(0.3) * 0.38, 14, 9, 16), 0.45, k.ink, 0.35);
        // Soft skin folds.
        for (let i = 0; i < 4; i++) {
          const t = 0.12 + i * 0.05;
          k.pen.hair(bezier({ x: k.x(t), y: topAt(k.a, t) + 4 }, { x: k.x(t) - 4, y: C }, { x: k.x(t), y: bottomAt(k.a, t) - 4 }, 6), 0.45, k.ink, 0.25);
        }
      });
    },
  },
};
