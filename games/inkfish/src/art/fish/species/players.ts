import type { PlayerFishId } from '../../../levels/types';
import { DEEP_PLAYERS } from './deepPlayers';
import { ellipse, type Pt } from '../../pen';
import { bands, bezier, bottomAt, C, finlets, PAPER_FILL, ring, topAt, type Anatomy, type Kit } from '../kit';

const INK_BLUE = '#1f3f8a';
const WASH = '#3466c2';
const WASH_DEEP = '#2a4d9e';
const FIN_BLUE = '#7fa3e0';

/**
 * An eye drawn by hand where the engine's fixed placement would be wrong
 * (gobies' eyes sit on top of the head).
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
  ...DEEP_PLAYERS,
};
