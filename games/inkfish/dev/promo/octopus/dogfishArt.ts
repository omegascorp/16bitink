import { bottomAt, C, gillSlits, heightAt, PAPER_FILL, topAt, type Anatomy, type Kit } from '../../../src/art/fish/kit';
import { ANATOMY } from '../../../src/art/fish/registry';
import { sickle } from '../../../src/art/fish/species/giants';
import { bezier } from '../../../src/art/fish/kit';
import { ellipse, type Pt } from '../../../src/art/pen';

/**
 * The spiny dogfish, drawn to read as a shark at a glance: a blunt, rounded
 * snout overhanging an underslung mouth, a cat-like eye, five gill slits, big
 * sickle pectorals, two triangular dorsals each with a spine in front, no
 * anal fin, a shark's tail (upper lobe longer), a grey back with white spots
 * over a pale belly. About 1 m (3–4 ft) long.
 */

const SHARK = ANATOMY.shark;
const SPOT = '#f4efe2';
const GREY = '#7b7f84';

/** Half-height profile, 0 at the nose: a rounded snout, deepest at a third, tapering to the tail stalk. */
function depth(t: number): number {
  if (t <= 0.34) return Math.pow(Math.sin((Math.max(0, t) / 0.34) * (Math.PI / 2)), 0.42);
  return 0.2 + 0.8 * Math.pow(Math.cos(((t - 0.34) / 0.66) * (Math.PI / 2)), 1.2);
}

/** A short spine standing up in front of the dorsal fin starting at t. */
function spine(k: Kit, t: number, h: number): void {
  const base = { x: k.x(t) + 1, y: topAt(k.a, t) + 1 };
  k.pen.stroke([base, { x: base.x - h * 0.4, y: base.y - h }], 1.3, k.ink, 1, false);
}

export const DOGFISH: Anatomy = {
  ...SHARK,
  hh: 22,
  peak: 0.34,
  blunt: 0.8,
  peduncle: 0.2,
  tailSize: 1.3,
  // The snout overhangs: the belly line starts a little behind the nose.
  profile: (t) => ({ top: -(0.2 + 0.84 * depth(t)), bottom: 0.0 + 0.88 * depth((t - 0.06) / 0.94) }),
  dorsal: { from: 0.36, to: 0.46, height: 1.05, tri: true },
  dorsal2: { from: 0.68, to: 0.76, height: 0.85, tri: true },
  anal: undefined,
  // Its own cat-like eye is drawn in `face`; the generic one is hidden.
  eye: { t: 0.14, r: 0.4, buried: true },
  wash: GREY,
  finWash: '#6c7075',
  under: (k) => {
    sickle(k, { x: k.x(0.58), y: bottomAt(k.a, 0.58) - 2 }, { x: k.x(0.66), y: bottomAt(k.a, 0.58) + 10 }, 10);
  },
  extras: (k) => {
    k.pen.clipped(k.body, () => {
      // Countershading: a grey back over a pale belly.
      const line: Pt[] = [];
      for (let t = 0; t <= 1.001; t += 0.04) line.push({ x: k.x(t), y: C + heightAt(k.a, t) * 0.12 });
      k.pen.fill([...line, ...[...line].reverse().map((p) => ({ x: p.x, y: C - 60 }))], '#4c5156', 0.42);
      k.pen.fill([...line, ...[...line].reverse().map((p) => ({ x: p.x, y: C + 60 }))], PAPER_FILL, 0.65);
      k.pen.hair(line, 0.5, k.ink, 0.35);
      for (let i = 0; i < 220; i++) {
        const t = 0.05 + k.pen.rng() * 0.9;
        k.pen.dot(k.x(t), C - heightAt(k.a, t) * k.pen.rng(), 0.35, k.ink, 0.3);
      }
      // White spots scattered along the back and flanks.
      for (let i = 0; i < 16; i++) {
        const t = 0.22 + (i / 16) * 0.66 + (k.pen.rng() - 0.5) * 0.03;
        const y = C - heightAt(k.a, t) * (0.15 + k.pen.rng() * 0.65);
        const r = 1.4 + k.pen.rng() * 1.0;
        k.pen.fill(ellipse(k.x(t), y, r, r * 0.9, 8), SPOT, 0.95);
      }
    });
    gillSlits(k, 0.22, 5);
    spine(k, 0.36, 9);
    spine(k, 0.68, 8);
    // Big sickle pectoral under the gills.
    sickle(k, { x: k.x(0.29), y: bottomAt(k.a, 0.29) - 3 }, { x: k.x(0.44), y: bottomAt(k.a, 0.3) + 20 }, 11, '#6c7075', 0.55);
  },
  face: (k) => {
    // The underslung mouth: a crescent under the snout, and a nostril on the snout's underside.
    const mouth = bezier({ x: k.x(0.08), y: bottomAt(k.a, 0.08) - 1 }, { x: k.x(0.13), y: bottomAt(k.a, 0.13) + 1.5 }, { x: k.x(0.19), y: bottomAt(k.a, 0.19) - 3 }, 10);
    k.pen.stroke(mouth, 1.7, k.ink, 1, false);
    for (let i = 2; i < mouth.length - 2; i += 2) {
      const p = mouth[i]!;
      k.pen.fill([{ x: p.x - 0.8, y: p.y - 0.3 }, { x: p.x, y: p.y + 1.6 }, { x: p.x + 0.8, y: p.y - 0.3 }], PAPER_FILL, 1);
    }
    k.pen.hair([{ x: k.x(0.035), y: C + 1 }, { x: k.x(0.055), y: C + 2 }], 0.9, k.ink, 0.9);
    // Big cat-like eye: green-gold with a slit pupil, under a brow.
    const ex = k.x(0.14);
    const ey = C - 10;
    const r = 4.6;
    k.pen.fill(ellipse(ex, ey, r * 1.15, r * 0.85, 14), '#c8cc7a', 0.97);
    k.pen.fill(ellipse(ex, ey, r * 0.25, r * 0.78, 10), '#141518', 0.97);
    k.pen.stroke([...ellipse(ex, ey, r * 1.15, r * 0.85, 14), { x: ex + r * 1.15, y: ey }], 1, k.ink, 1, false);
    k.pen.dot(ex + 1.3, ey - 1.6, 0.8, PAPER_FILL, 0.95);
    k.pen.hair([{ x: ex - r * 1.4, y: ey - r * 1.2 }, { x: ex + r * 1.3, y: ey - r * 1.1 }], 0.8, k.ink, 0.7);
  },
};
