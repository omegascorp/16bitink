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

/**
 * A shark's fin: stiff and smooth, no rays. A convex leading edge from `front`
 * up to a slightly rounded `tip`, then a concave trailing edge sweeping back to
 * a small free rear tip just past `back`. Shaded with lines that follow the
 * trailing edge, and a pale catch-light along the leading edge.
 */
function sharkFin(k: Kit, front: Pt, back: Pt, tip: Pt, alpha = 0.78): void {
  const { pen, ink } = k;
  const sub2 = (p: Pt, q: Pt): Pt => ({ x: p.x - q.x, y: p.y - q.y });
  const len = (p: Pt): number => Math.hypot(p.x, p.y) || 1;
  const along = (p: Pt, d: Pt, s: number): Pt => ({ x: p.x + (d.x / len(d)) * s, y: p.y + (d.y / len(d)) * s });
  const lead = sub2(tip, front);
  // Normal to the leading edge, on the side away from the fin's base.
  let n = { x: lead.y / len(lead), y: -lead.x / len(lead) };
  if (n.x * (back.x - front.x) + n.y * (back.y - front.y) > 0) n = { x: -n.x, y: -n.y };
  const baseDir = sub2(back, front);
  const baseMid = { x: (front.x + back.x) / 2, y: (front.y + back.y) / 2 };
  const rear = along(along(back, baseDir, len(baseDir) * 0.14), sub2(tip, baseMid), 2.5);
  const tipIn = along(tip, sub2(front, tip), 2.2);
  const tipOut = along(tip, sub2(rear, tip), 2.6);
  const leadEdge = bezier(front, { x: front.x + lead.x * 0.55 + n.x * len(lead) * 0.11, y: front.y + lead.y * 0.55 + n.y * len(lead) * 0.11 }, tipIn, 12);
  const round = bezier(tipIn, tip, tipOut, 4);
  const trailMid = { x: (tipOut.x + rear.x) / 2, y: (tipOut.y + rear.y) / 2 };
  const trailCtrl = { x: trailMid.x + (baseMid.x - trailMid.x) * 0.38, y: trailMid.y + (baseMid.y - trailMid.y) * 0.38 };
  const trailEdge = bezier(tipOut, trailCtrl, rear, 12);
  const shape = [...leadEdge, ...round.slice(1), ...trailEdge.slice(1), back, front];
  pen.fill(shape, PAPER_FILL, 1);
  pen.fill(shape, WASH_DEEP, alpha);
  pen.clipped(shape, () => {
    // Shading that follows the trailing edge, fading in towards the leading edge.
    for (const f of [0.12, 0.24, 0.36]) {
      const shift = (p: Pt): Pt => ({ x: p.x + (baseMid.x - trailMid.x) * f * 0.5 + n.x * -len(lead) * f * 0.1, y: p.y + (baseMid.y - trailMid.y) * f * 0.5 });
      pen.hair(trailEdge.map(shift), 0.5, ink, 0.5 - f * 0.6);
    }
    // A catch-light just inside the leading edge.
    pen.hair(leadEdge.slice(2, -2).map((p) => ({ x: p.x - n.x * 1.6, y: p.y - n.y * 1.6 })), 0.9, PAPER_FILL, 0.55);
  });
  pen.stroke([...leadEdge, ...round.slice(1), ...trailEdge.slice(1)], 1.25, ink, 1, false);
  pen.hair([rear, back], 0.9, ink, 0.9);
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
  mako: {
    // A shortfin mako pup, after the field guides: a long cone of a snout, tipped up a
    // little; the back arching high just behind the head over a flatter belly; a slim
    // tail stalk with a keel and a tall crescent tail; a broad dorsal behind long, low
    // pectorals; five gill slits; deep blue above a crisp line, white below.
    hl: 88, hh: 17.5, peak: 0.36, blunt: 0.1, peduncle: 0.18, tail: 'lunate', tailSize: 2.3,
    dorsal2: { from: 0.8, to: 0.83, height: 0.42, tri: true },
    anal: { from: 0.81, to: 0.84, height: 0.36, tri: true }, pectoral: 0, pelvic: false, scales: false,
    eye: { t: 0, r: 0 }, mouth: 'none', wash: '#eef2fb', finWash: WASH_DEEP, finAlpha: 0.72, smoothFins: true, ink: INK_BLUE, gills: 'slits', lateral: false,
    profile: (t) => {
      const nose = -0.1;
      const top = t <= 0.4
        ? nose + (-1.05 - nose) * Math.pow(Math.sin((t / 0.4) * Math.PI / 2), 0.78)
        : -0.17 - (1.05 - 0.17) * Math.pow(Math.cos(((t - 0.4) / 0.6) * Math.PI / 2), 1.25);
      const bottom = t <= 0.3
        ? nose + (0.78 - nose) * Math.pow(Math.sin((t / 0.3) * Math.PI / 2), 0.85)
        : 0.17 + (0.78 - 0.17) * Math.pow(Math.cos(((t - 0.3) / 0.7) * Math.PI / 2), 1.05);
      return { top, bottom };
    },
    under: (k) => {
      // The first dorsal: a broad stiff triangle with a curved trailing edge, rising just
      // behind the pectorals; drawn first so the back overlaps its base.
      sharkFin(k, { x: k.x(0.3), y: topAt(k.a, 0.3) + 3 }, { x: k.x(0.45), y: topAt(k.a, 0.45) + 3 }, { x: k.x(0.42), y: topAt(k.a, 0.36) - 30 });
      // The tail's upper lobe reaches a little further than the lower one.
      const reach = k.a.hh * k.a.tailSize;
      sharkFin(k, { x: k.x(1) + 8, y: C - k.h(1) + 1 }, { x: k.x(1) - 6, y: C - 2 }, { x: k.x(1) - reach * 0.98, y: C - reach * 1.18 }, 0.72);
      // Pelvic fin, small, under the belly.
      sharkFin(k, { x: k.x(0.61), y: bottomAt(k.a, 0.61) - 3 }, { x: k.x(0.67), y: bottomAt(k.a, 0.67) - 3 }, { x: k.x(0.69), y: bottomAt(k.a, 0.64) + 9 }, 0.72);
    },
    extras: (k) => {
      // Deep blue back down to a crisp line just below the eye, white belly.
      const line: Pt[] = [];
      for (let t = 0; t <= 1.001; t += 0.025) {
        const top = topAt(k.a, t);
        const bottom = bottomAt(k.a, t);
        line.push({ x: k.x(t), y: top + (bottom - top) * (t < 0.1 ? 0.5 + t * 1.5 : 0.62) });
      }
      const back = [...line, ...[...line].reverse().map((p) => ({ x: p.x, y: C - 90 }))];
      k.pen.clipped(k.body, () => {
        k.pen.fill(back, WASH_DEEP, 0.82);
        k.pen.clipped(back, () => {
          for (let t = 0.04; t < 0.98; t += 0.012) {
            const x = k.x(t);
            k.pen.hair([{ x, y: topAt(k.a, t) }, { x: x - 3, y: line[Math.round(t / 0.025)]!.y }], 0.5, k.ink, 0.35);
          }
        });
        k.pen.stipple(k.body, 700, (_x, y) => (y < C ? 0.35 : 0.04), 0.5, k.ink);
        k.pen.hair(line, 0.7, k.ink, 0.8);
      });
      // Five long gill slits ahead of the pectoral.
      for (let i = 0; i < 5; i++) {
        const t = 0.19 + i * 0.022;
        const x = k.x(t);
        const top = topAt(k.a, t);
        const bottom = bottomAt(k.a, t);
        const h = bottom - top;
        k.pen.stroke(bezier({ x: x + 1.5, y: top + h * 0.3 }, { x: x - 2.5, y: top + h * 0.55 }, { x: x + 0.5, y: top + h * 0.85 }, 6), 0.9, k.ink, 1, false);
      }
      // Underslung mouth: a long crescent under the snout, back to below the eye, teeth showing.
      const m0 = { x: k.x(0.045), y: bottomAt(k.a, 0.045) - 1.2 };
      const m1 = { x: k.x(0.15), y: bottomAt(k.a, 0.15) - 4.5 };
      const mouth = bezier(m0, { x: k.x(0.1), y: bottomAt(k.a, 0.1) + 0.5 }, m1, 10);
      for (let i = 1; i < 8; i++) {
        const p = mouth[Math.round((i / 8) * (mouth.length - 1))]!;
        const len = 3.2 - i * 0.22;
        const tooth = [{ x: p.x - 0.8, y: p.y - 0.3 }, { x: p.x + (i % 2 ? 0.7 : -0.3), y: p.y + len * (i % 2 ? 1 : -0.8) }, { x: p.x + 0.8, y: p.y - 0.3 }];
        k.pen.fill(tooth, PAPER_FILL, 1);
        k.pen.hair(tooth, 0.4, k.ink, 0.9);
      }
      k.pen.stroke(mouth, 1.2, k.ink, 1, false);
      // The mako's eye: round and jet black, with a glint, just above the colour line.
      const ex = k.x(0.11);
      const ey = topAt(k.a, 0.11) + (bottomAt(k.a, 0.11) - topAt(k.a, 0.11)) * 0.42;
      k.pen.fill(ellipse(ex, ey, 3.6, 3.4, 14), '#0f1a33', 1);
      k.pen.stroke(ring(ex, ey, 3.6, 3.4, 14), 0.7, k.ink, 1, false);
      k.pen.dot(ex + 1.1, ey - 1.1, 0.9, PAPER_FILL, 0.9);
      // Keel along the tail stalk.
      k.pen.stroke([{ x: k.x(0.86), y: C }, { x: k.x(1) - 3, y: C }], 1.2, k.ink, 0.85, false);
      // Long pectoral, low on the flank, swept back and down.
      sharkFin(k, { x: k.x(0.225), y: C + k.h(0.225) * 0.2 }, { x: k.x(0.335), y: C + k.h(0.335) * 0.7 }, { x: k.x(0.47), y: bottomAt(k.a, 0.28) + 27 });
    },
  },
  ...DEEP_PLAYERS,
};
