import { backStipple, bezier, bottomAt, C, PAPER_FILL, ring, spots, stripes, topAt, type Anatomy, type Kit } from '../../../../src/art/fish/kit';
import { ellipse } from '../../../../src/art/pen';
import { aboveBack, darkBack, eyeAt, fadeAtop, keyedProfile, limb, mottle, sparkle, tailBand } from './parts';

/** The three tiny contestants (and the mudskipper's big cousin), facing right. */

// ---------------------------------------------------------------- rivulus

/** Mangrove rivulus: the hero. A slim olive-brown killifish, a fan tail with a dark eyespot on its upper base, a big bright eye. */
export const RIVULUS: Anatomy = {
  hl: 76, hh: 19, peak: 0.4, blunt: 0.92, peduncle: 0.54, tail: 'round', tailSize: 1.3,
  dorsal: { from: 0.66, to: 0.83, height: 0.8 }, anal: { from: 0.57, to: 0.83, height: 0.78 },
  pectoral: 0.62, pelvic: true, scales: true, eye: { t: 0.11, r: 7.6 }, mouth: 'small',
  wash: '#86703a', finWash: '#a08248', finAlpha: 0.3, lateral: false,
  extras: (k) => {
    k.pen.fill(k.body, '#7c6634', 0.24);
    darkBack(k, '#4a3a1e', 0.36, -0.1);
    // Marbled flank (marmoratus): soft brown clouds and fine dark freckles.
    mottle(k, 18, [2.5, 5.5], '#4a3a1e', 0.34, 0.14, 0.99);
    spots(k, 40, [0.5, 1.1], '#2e2516', { from: 0.12, to: 0.99, outline: false, alpha: 0.65 });
    backStipple(1.1)(k);
    // A pale cream belly.
    k.pen.clipped(k.body, () => {
      for (let t = 0.12; t < 0.7; t += 0.05) k.pen.fill(ellipse(k.x(t), bottomAt(k.a, t) - k.h(t) * 0.25, 7, k.h(t) * 0.3, 8), PAPER_FILL, 0.2);
    });
  },
  face: (k) => {
    // The ocellus: a dark eyespot ringed in gold on the upper base of the tail.
    const x = k.x(1) - 6.5;
    const y = C - k.h(1) * 0.85;
    k.pen.fill(ellipse(x, y, 5.6, 5.2, 16), '#f2d06a', 0.95);
    k.pen.fill(ellipse(x, y, 3.8, 3.5, 14), '#17140f', 0.95);
    k.pen.hair(ring(x, y, 5.6, 5.2, 16), 0.6, k.ink, 0.9);
    k.pen.dot(x + 1, y - 1.1, 0.8, PAPER_FILL, 0.8);
    // A little upturned smile, and a second catch-light in the eye.
    const nx = k.x(0);
    k.pen.hair(bezier({ x: nx - 6, y: C + 2.5 }, { x: nx - 8.5, y: C + 3.6 }, { x: nx - 9.5, y: C + 1.8 }, 4), 0.7, k.ink, 0.85);
    sparkle(k);
  },
};

// ---------------------------------------------------------------- mudskippers

interface SkipperLook {
  readonly hl: number;
  readonly hh: number;
  readonly eyeR: number;
  readonly wash: string;
  readonly finWash: string;
  /** Overall darkening over the wash. */
  readonly skin: string;
  readonly skinAlpha: number;
  /** Blotches along the flank. */
  readonly blotch: string;
  /** The first dorsal's band colour. */
  readonly sail: string;
  /** Small pale spots scattered over the body. */
  readonly speckle: string;
  readonly speckles: number;
  /** A dark stripe along the middle of the flank (the giant has one). */
  readonly stripe?: string;
  /** Mouth reach back along the head, in t. */
  readonly gape: number;
}

/** Two eyes on turrets on top of the head, the far one peeking up behind the near one. */
function turretEyes(k: Kit, r: number): void {
  const t = 0.115;
  const top = topAt(k.a, t);
  const near = { x: k.x(t), y: top - r * 0.45 };
  const far = { x: near.x + r * 0.4, y: near.y - r * 0.55 };
  const above = aboveBack(k, 0.02, 0.24);
  for (const [e, s] of [[far, 0.86], [near, 1]] as const) {
    const dome = ellipse(e.x, e.y + r * 0.35, r * 1.28 * s, r * 1.25 * s, 18);
    k.pen.clipped(above, () => {
      k.pen.fill(dome, PAPER_FILL, 1);
      k.pen.fill(dome, k.a.wash, 0.32);
      k.pen.hair(dome.slice(9).map((p) => ({ x: p.x, y: p.y + 1.2 })), 0.45, k.ink, 0.45);
      k.pen.stroke([...dome, dome[0]!], 1.2, k.ink, 1, false);
    });
    eyeAt(k, e.x, e.y, r * s, { x: 0.22, y: -0.12 });
  }
}

function skipper(look: SkipperLook): Anatomy {
  return {
    hl: look.hl, hh: look.hh, peak: 0.2, blunt: 1, peduncle: 0.4, tail: 'round', tailSize: 1.2,
    dorsal: { from: 0.28, to: 0.42, height: 1.55, spiny: true }, dorsal2: { from: 0.5, to: 0.88, height: 0.56 },
    anal: { from: 0.58, to: 0.88, height: 0.42 }, pectoral: 0, pelvic: false, scales: true,
    // The engine's eye is hidden: these eyes sit on turrets on top of the head (face).
    eye: { t: 0, r: 0, buried: true }, mouth: 'none', wash: look.wash, finWash: look.finWash, finAlpha: 0.26, lateral: false,
    profile: keyedProfile([[0, -0.62, 0.82], [0.16, -1, 0.96], [0.5, -0.8, 0.9], [1, -0.38, 0.4]], 0.1),
    extras: (k) => {
      k.pen.fill(k.body, look.skin, look.skinAlpha);
      darkBack(k, look.skin, 0.25, -0.25);
      if (look.stripe) stripes(k, [0.02], { from: 0.16, to: 0.98, width: 3.2, color: look.stripe, alpha: 0.5 });
      // Saddle blotches along the flank and freckles on the back.
      for (let i = 0; i < 6; i++) {
        const t = 0.3 + i * 0.12;
        mottle(k, 2, [2.5, 4.5], look.blotch, 0.4, t, t + 0.04, [-0.4, 0.2]);
      }
      spots(k, 26, [0.6, 1.2], look.blotch, { from: 0.08, to: 0.95, outline: false, alpha: 0.7 });
      spots(k, look.speckles, [0.5, 1], look.speckle, { from: 0.12, to: 0.95, outline: false, alpha: 0.9 });
      backStipple(1.2)(k);
      // The flared first dorsal: a dark band and pale spots over the fin (only where it's drawn, above the back).
      k.pen.clipped(aboveBack(k, 0.24, 0.46, 0), () => {
        const { ctx } = k.pen;
        ctx.save();
        ctx.globalCompositeOperation = 'source-atop';
        const band = [
          { x: k.x(0.26), y: topAt(k.a, 0.28) - k.a.hh * 0.55 }, { x: k.x(0.42) - 18, y: topAt(k.a, 0.42) - k.a.hh * 0.3 },
          { x: k.x(0.42) - 22, y: topAt(k.a, 0.42) - k.a.hh * 0.75 }, { x: k.x(0.26) - 6, y: topAt(k.a, 0.28) - k.a.hh * 1.2 },
        ];
        k.pen.fill(band, look.sail, 0.55);
        for (let i = 0; i < 7; i++) k.pen.dot(k.x(0.3 + i * 0.018) - 4 - i, topAt(k.a, 0.3) - k.a.hh * (0.3 + (i % 3) * 0.3), 1.1, PAPER_FILL, 0.85);
        ctx.restore();
      });
    },
    face: (k) => {
      // Wide, low mouth with fleshy lips under the blunt snout, and puffed cheeks (it carries water in them).
      const nx = k.x(0);
      const my = C + k.h(0.03) * 0.45;
      const corner = { x: k.x(look.gape), y: C + k.h(look.gape) * 0.4 };
      k.pen.stroke(bezier({ x: nx - 1.5, y: my }, { x: (nx + corner.x) / 2, y: my + 2 }, corner, 8), 1.1, k.ink, 1, false);
      k.pen.hair(bezier({ x: nx - 2, y: my + 2.2 }, { x: (nx + corner.x) / 2, y: my + 4 }, { x: corner.x + 1, y: corner.y + 2 }, 6), 0.5, k.ink, 0.6);
      const ct = 0.2;
      k.pen.hair(bezier({ x: k.x(ct - 0.06), y: C + k.h(ct) * 0.55 }, { x: k.x(ct), y: C + k.h(ct) * 0.95 }, { x: k.x(ct + 0.07), y: C + k.h(ct) * 0.5 }, 8), 0.6, k.ink, 0.6);
      turretEyes(k, look.eyeR);
      // The arm-like pectoral it walks on: a muscled stalk down to a fan on the ground.
      const root = { x: k.x(0.3), y: C + k.h(0.3) * 0.3 };
      limb(k, root, Math.PI * 0.6, k.a.hh * 1.15, k.a.hh * 0.95, k.a.hh * 0.42);
      // The small fused pelvic fins just behind it.
      const p = { x: k.x(0.36), y: bottomAt(k.a, 0.36) - 1 };
      const pel = [p, ...bezier(p, { x: p.x - 3, y: p.y + 8 }, { x: p.x - 10, y: p.y + 6 }, 6), { x: p.x - 7, y: p.y }];
      k.pen.fill(pel, PAPER_FILL, 1);
      k.pen.fill(pel, look.finWash, 0.3);
      k.pen.stroke(pel, 0.9, k.ink, 1, false);
    },
  };
}

/** Mudskipper (Periophthalmus): grey-brown, spotted, eyes on turrets, walking on its arm-like pectorals, a flared first dorsal. */
export const MUDSKIPPER: Anatomy = skipper({
  hl: 80, hh: 22, eyeR: 6.8, wash: '#8a7c64', finWash: '#9a8a6a', skin: '#6a5e4a', skinAlpha: 0.14,
  blotch: '#3a3024', sail: '#2a3a6a', speckle: '#cfe2ee', speckles: 14, gape: 0.1,
});

/** Giant mudskipper (Periophthalmodon schlosseri): bulkier and darker, a dark stripe along the flank, pale-spotted, a bigger mouth. */
export const GIANT_MUDSKIPPER: Anatomy = skipper({
  hl: 86, hh: 27, eyeR: 7.4, wash: '#4e463c', finWash: '#5e5446', skin: '#2a251f', skinAlpha: 0.38,
  blotch: '#221d17', sail: '#15151a', speckle: '#e8eef0', speckles: 34, stripe: '#1e1a15', gape: 0.14,
});

// ---------------------------------------------------------------- pupfish

/** Desert pupfish, a breeding male: a stubby, deep little fish, bright blue, a yellow tail stalk and a black band on the tail's edge. */
export const PUPFISH: Anatomy = {
  hl: 58, hh: 27, peak: 0.4, blunt: 0.75, peduncle: 0.5, tail: 'round', tailSize: 0.95,
  dorsal: { from: 0.36, to: 0.62, height: 0.62 }, anal: { from: 0.6, to: 0.82, height: 0.6 },
  pectoral: 0.45, pelvic: true, scales: true, eye: { t: 0.15, r: 7 }, mouth: 'none',
  wash: '#3a7fd5', finWash: '#4a86d0', finAlpha: 0.3, lateral: false,
  extras: (k) => {
    k.pen.fill(k.body, '#2e74d0', 0.32);
    darkBack(k, '#1d3f86', 0.35, -0.35);
    // An iridescent sheen along the flank.
    stripes(k, [-0.1, 0.25], { from: 0.18, to: 0.92, width: 2.2, color: '#cfe6ff', alpha: 0.4 });
    backStipple(1)(k);
    // A yellow wash over the tail stalk and tail, then the black band on its edge.
    fadeAtop(k, k.x(1) - 4, k.x(0.8), '#efb52e', 0.5);
    tailBand(k, 0.17, '#16171c', 0.8, 0.06, 0.94);
    // The dark-edged dorsal of a displaying male.
    k.pen.clipped(aboveBack(k, 0.36, 0.64, 0), () => {
      const { ctx } = k.pen;
      ctx.save();
      ctx.globalCompositeOperation = 'source-atop';
      k.pen.fill([{ x: k.x(0.36), y: 0 }, { x: k.x(0.64) - 20, y: 0 }, { x: k.x(0.64) - 20, y: topAt(k.a, 0.5) - k.a.hh * 0.3 }, { x: k.x(0.36), y: topAt(k.a, 0.4) - k.a.hh * 0.38 }], '#1b2a4a', 0.55);
      ctx.restore();
    });
  },
  face: (k) => {
    // A small upturned mouth on the blunt snout.
    const nx = k.x(0);
    k.pen.stroke([{ x: nx - 0.5, y: C - 2.5 }, { x: nx - 4.5, y: C + 0.8 }, { x: nx - 7, y: C - 0.2 }], 1, k.ink, 1, false);
    sparkle(k);
  },
};
