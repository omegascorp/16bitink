import type { SpeciesId } from '../../../levels/types';
import { ellipse, type Pt } from '../../pen';
import {
  backStipple, bands, bezier, bottomAt, C, FISH_TEX, PAPER_FILL, ring, spots, stripes, topAt, xAt, type Anatomy, type Kit,
} from '../kit';

// ---------------------------------------------------------------- local helpers

/** Tints whatever is already drawn between two x positions (body and fins), leaving the paper around it. */
function tint(k: Kit, x0: number, x1: number, color: string, alpha: number): void {
  const { ctx } = k.pen;
  ctx.save();
  ctx.globalCompositeOperation = 'source-atop';
  k.pen.fill([{ x: x0, y: 0 }, { x: x1, y: 0 }, { x: x1, y: FISH_TEX }, { x: x0, y: FISH_TEX }], color, alpha);
  ctx.restore();
}

/** Soft irregular blotches (no outline): camouflage mottling. */
function mottle(k: Kit, count: number, r: readonly [number, number], color: string, alpha: number, from = 0.15, to = 0.95): void {
  spots(k, count, r, color, { from, to, outline: false, alpha });
}

/** A small branched skin tentacle (cirrus) rising from `root`. */
function cirrus(k: Kit, root: Pt, len: number, lean: number): void {
  const tip = { x: root.x + lean, y: root.y - len };
  k.pen.stroke(bezier(root, { x: root.x + lean * 0.2, y: root.y - len * 0.6 }, tip, 6), 1.1, k.ink, 1, false);
  for (const f of [0.45, 0.75]) {
    const b = { x: root.x + lean * f * f, y: root.y - len * f };
    k.pen.hair([b, { x: b.x - 2.2, y: b.y - 2.4 }], 0.6, k.ink, 0.9);
    k.pen.hair([b, { x: b.x + 2.2, y: b.y - 2 }], 0.6, k.ink, 0.9);
  }
}

/** Fades from `color` at x `solid` to nothing at x `clear`, over whatever is drawn (body and fins). */
function fade(k: Kit, solid: number, clear: number, color: string, alpha: number): void {
  const { ctx } = k.pen;
  const grad = ctx.createLinearGradient(solid, 0, clear, 0);
  grad.addColorStop(0, color);
  grad.addColorStop(1, `${color}00`);
  const far = solid > clear ? FISH_TEX : 0;
  ctx.save();
  ctx.globalCompositeOperation = 'source-atop';
  ctx.globalAlpha = alpha;
  ctx.fillStyle = grad;
  ctx.fillRect(Math.min(far, clear), 0, Math.abs(far - clear), FISH_TEX);
  ctx.restore();
}

/** Darker back above `level` (-1 top .. 1 belly), clipped to the body. */
function darkBack(k: Kit, color: string, alpha: number, level: number): void {
  const n = 40;
  const top = Array.from({ length: n + 1 }, (_, i) => ({ x: k.x(i / n), y: topAt(k.a, i / n) - 2 }));
  const mid = Array.from({ length: n + 1 }, (_, i) => ({ x: k.x(1 - i / n), y: C + k.h(1 - i / n) * level }));
  k.pen.clipped(k.body, () => k.pen.fill([...top, ...mid], color, alpha));
}

/** Eye centre, as fishArt draws it. */
function eyeAt(k: Kit): Pt {
  return { x: k.x(k.a.eye.t), y: C - k.h(k.a.eye.t) * 0.3 };
}

/** Tide pool, seagrass and kelp forest (chapters 1 to 3). */
export const SHALLOWS: Partial<Record<SpeciesId, Anatomy>> = {
  minnow: {
    hl: 78, hh: 21, peak: 0.36, blunt: 0.5, peduncle: 0.32, tail: 'fork', tailSize: 1.5,
    dorsal: { from: 0.42, to: 0.58, height: 0.95 }, anal: { from: 0.66, to: 0.8, height: 0.6 },
    pectoral: 0.45, pelvic: true, scales: true, eye: { t: 0.12, r: 6 }, mouth: 'small',
    wash: '#8fa3a8', extras: backStipple(1.4),
  },
  perch: {
    hl: 68, hh: 42, peak: 0.38, blunt: 0.55, peduncle: 0.26, tail: 'fork', tailSize: 0.95,
    dorsal: { from: 0.2, to: 0.52, height: 0.78, spiny: true }, dorsal2: { from: 0.56, to: 0.76, height: 0.55 },
    anal: { from: 0.66, to: 0.82, height: 0.48 }, pectoral: 0.5, pelvic: true, scales: true,
    eye: { t: 0.15, r: 8 }, mouth: 'small', wash: '#b59a4a', finWash: '#c0563f',
    extras: (k) => {
      // Dark saddle bands, drawn as dense vertical hatching.
      k.pen.clipped(k.body, () => {
        for (let b = 0; b < 5; b++) {
          const t0 = 0.3 + b * 0.13;
          for (let t = t0; t < t0 + 0.05; t += 0.007) {
            const x = k.x(t);
            k.pen.hair([{ x, y: topAt(k.a, t) }, { x: x - 2, y: C + k.h(t) * 0.45 }], 0.5, k.ink, 0.7);
          }
        }
      });
    },
  },
  puffer: {
    hl: 58, hh: 52, peak: 0.45, blunt: 0.95, peduncle: 0.24, tail: 'round', tailSize: 0.75,
    dorsal: { from: 0.7, to: 0.82, height: 0.42 }, anal: { from: 0.72, to: 0.84, height: 0.38 },
    pectoral: 0.4, pelvic: false, scales: false, eye: { t: 0.22, r: 10 }, mouth: 'beak', wash: '#c9b36a',
    extras: (k) => {
      // Spines: a base dot with a fine prickle pointing backwards.
      k.pen.clipped(k.body, () => {
        const ex = k.x(k.a.eye.t);
        const ey = C - k.h(k.a.eye.t) * 0.3;
        for (let i = 0; i < 70; i++) {
          const t = 0.12 + k.pen.rng() * 0.75;
          const y = C + k.h(t) * (k.pen.rng() * 1.7 - 0.85);
          const x = k.x(t);
          if (Math.hypot(x - ex, y - ey) < k.a.eye.r * 2.2) continue;
          k.pen.dot(x, y, 0.8, k.ink, 0.8);
          k.pen.hair([{ x, y }, { x: x - 4, y: y + (y < C ? -2 : 2) }], 0.45, k.ink, 0.7);
        }
      });
      // Outline prickles.
      k.body.forEach((p, i) => {
        if (i % 4 || p.x < xAt(k.a, 0.85)) return;
        const dx = p.x - C;
        const dy = p.y - C;
        const d = Math.hypot(dx, dy) || 1;
        k.pen.hair([p, { x: p.x + (dx / d) * 5, y: p.y + (dy / d) * 5 }], 0.6, k.ink, 0.9);
      });
    },
  },
  pike: {
    hl: 92, hh: 22, peak: 0.45, blunt: 0.15, peduncle: 0.45, tail: 'fork', tailSize: 1.3,
    dorsal: { from: 0.72, to: 0.86, height: 0.95 }, anal: { from: 0.74, to: 0.88, height: 0.8 },
    pectoral: 0.4, pelvic: true, scales: true, eye: { t: 0.13, r: 6 }, mouth: 'teeth', wash: '#5f7f4e',
    extras: (k) => {
      // Pale bean-shaped spots, each ringed in stipple.
      for (let i = 0; i < 16; i++) {
        const t = 0.28 + k.pen.rng() * 0.6;
        const y = C + k.h(t) * (k.pen.rng() * 1.2 - 0.6);
        const spot = ellipse(k.x(t), y, 3.2, 1.8, 10);
        k.pen.fill(spot, PAPER_FILL, 0.85);
        k.pen.hair(spot.concat([spot[0]!]), 0.4, k.ink, 0.6);
      }
      backStipple(1.2)(k);
    },
  },
  eel: {
    hl: 108, hh: 13, peak: 0.3, blunt: 0.6, peduncle: 0.12, tail: 'point', tailSize: 0,
    dorsal: { from: 0.32, to: 1, height: 0.75 }, anal: { from: 0.55, to: 1, height: 0.65 },
    pectoral: 0.6, pelvic: false, scales: false, eye: { t: 0.07, r: 4.5 }, mouth: 'small', wash: '#4c5a66',
    extras: backStipple(1.6), wave: 9,
  },
  blenny: {
    hl: 70, hh: 25, peak: 0.22, blunt: 1, peduncle: 0.34, tail: 'round', tailSize: 0.95,
    dorsal: { from: 0.2, to: 0.94, height: 0.62 }, anal: { from: 0.5, to: 0.94, height: 0.5 },
    pectoral: 0.75, pelvic: false, scales: false, eye: { t: 0.1, r: 6.5 }, mouth: 'small',
    wash: '#8b7b4f', finWash: '#a08a52', lateral: false,
    extras: (k) => {
      mottle(k, 12, [3, 6], '#5b4a2e', 0.32, 0.2, 0.95);
      bands(k, [0.32, 0.47, 0.62, 0.77], 0.045, { depth: 0.35, alpha: 0.45 });
      // Branched cirri over the eye: the blenny's "eyebrows".
      const e = eyeAt(k);
      const top = topAt(k.a, k.a.eye.t);
      cirrus(k, { x: e.x + 1.5, y: top + 1.5 }, 13, 3);
      cirrus(k, { x: e.x - 3.5, y: top + 2 }, 9, -1.5);
      // Down-turned mouth corner: the frown.
      const corner = { x: k.x(0.085), y: C + k.h(0.085) * 0.2 };
      k.pen.hair(bezier(corner, { x: corner.x - 2, y: corner.y + 1 }, { x: corner.x - 3, y: corner.y + 4.5 }, 4), 0.8, k.ink, 0.9);
      // Jugular pelvic fins: two thin rays under the throat.
      const t = 0.2;
      const b = { x: k.x(t), y: bottomAt(k.a, t) - 1 };
      for (const dx of [0, 3]) k.pen.stroke([{ x: b.x - dx, y: b.y }, { x: b.x - dx - 5, y: b.y + 8 }], 0.9, k.ink, 1, false);
    },
  },
  sculpin: {
    hl: 70, hh: 36, peak: 0.2, blunt: 0.8, peduncle: 0.2, tail: 'round', tailSize: 0.85,
    dorsal: { from: 0.27, to: 0.48, height: 0.6, spiny: true }, dorsal2: { from: 0.5, to: 0.88, height: 0.55 },
    anal: { from: 0.56, to: 0.88, height: 0.42 }, pectoral: 1.05, pelvic: true, scales: false,
    eye: { t: 0.15, r: 7.5 }, mouth: 'small', wash: '#7d6a52', finWash: '#9a6a4a',
    extras: (k) => {
      mottle(k, 16, [3.5, 8], '#4a3a2c', 0.35, 0.08, 0.98);
      mottle(k, 7, [2, 4], '#d8c49a', 0.55, 0.25, 0.9);
      backStipple(1.3)(k);
      // A wide mouth whose jaw runs back under the eye.
      const nx = k.x(0);
      k.pen.stroke(bezier({ x: nx - 1, y: C + 2 }, { x: k.x(0.08), y: C + k.h(0.08) * 0.34 }, { x: k.x(0.19), y: C + k.h(0.19) * 0.24 }, 8), 1.1, k.ink, 1, false);
      // Preopercular spines on the gill cover.
      const x = k.x(0.255);
      const h = k.h(0.255);
      for (const [v, len] of [[-0.2, 8], [0.05, 6], [0.28, 4]] as const) {
        const root = { x, y: C + h * v };
        k.pen.stroke([root, { x: root.x - len, y: root.y - len * 0.45 }], 1, k.ink, 1, false);
      }
    },
  },
  sandlance: {
    hl: 102, hh: 11, peak: 0.45, blunt: 0.05, peduncle: 0.36, tail: 'fork', tailSize: 1.6,
    dorsal: { from: 0.3, to: 0.92, height: 0.55 }, anal: { from: 0.66, to: 0.92, height: 0.5 },
    pectoral: 0.55, pelvic: false, scales: false, eye: { t: 0.08, r: 3.8 }, mouth: 'small',
    wash: '#9db0bf', finWash: '#b9c6cf', lateral: false,
    extras: (k) => {
      // Blue-green back over a bright silver belly.
      darkBack(k, '#3f6f7c', 0.4, -0.15);
      backStipple(1)(k);
      // Oblique skin folds (plicae) running down and back.
      k.pen.clipped(k.body, () => {
        for (let t = 0.2; t < 0.96; t += 0.024) {
          const x = k.x(t);
          k.pen.hair([{ x, y: C - k.h(t) * 0.7 }, { x: x - 3, y: C + k.h(t) * 0.7 }], 0.4, k.ink, 0.35);
        }
      });
      // The long lower jaw juts past the snout.
      const nx = k.x(0);
      const jaw = [{ x: nx - 8, y: C + 0.8 }, { x: nx + 5, y: C + 0.4 }, { x: nx - 8, y: C + 3.6 }];
      k.pen.fill(jaw, PAPER_FILL, 1);
      k.pen.stroke([...jaw, jaw[0]!], 0.8, k.ink, 1, false);
    },
  },
  pipefish: {
    hl: 96, hh: 9, peak: 0.3, blunt: 1, peduncle: 0.45, tail: 'round', tailSize: 1.5,
    dorsal: { from: 0.42, to: 0.6, height: 0.9 }, pectoral: 0, pelvic: false, scales: false,
    eye: { t: 0.07, r: 3.4 }, mouth: 'small', wash: '#7c8a4c', gills: 'none', lateral: false,
    extras: (k) => {
      // Bony body rings and the ridges along the flank.
      k.pen.clipped(k.body, () => {
        for (let t = 0.13; t < 0.99; t += 0.028) {
          const x = k.x(t);
          k.pen.hair(bezier({ x, y: topAt(k.a, t) }, { x: x - 1.5, y: C }, { x, y: bottomAt(k.a, t) }, 4), 0.45, k.ink, 0.65);
        }
      });
      stripes(k, [-0.35, 0.4], { from: 0.12, to: 0.99, width: 0.5, alpha: 0.5 });
      // Little gill cover behind the eye, and a tiny pectoral fan.
      const g = k.x(0.12);
      k.pen.hair(bezier({ x: g + 1, y: C - k.h(0.12) * 0.7 }, { x: g - 2.5, y: C }, { x: g + 1, y: C + k.h(0.12) * 0.7 }, 5), 0.6, k.ink, 0.9);
      const p = { x: k.x(0.14), y: C + 1 };
      const fan = [p, { x: p.x - 5, y: p.y - 1.5 }, { x: p.x - 4.5, y: p.y + 2.5 }];
      k.pen.fill(fan, PAPER_FILL, 0.9);
      k.pen.hair([...fan, p], 0.45, k.ink, 0.8);
      // The tubular snout, with a tiny upturned mouth at its tip.
      const nx = k.x(0);
      const snout = [
        { x: nx - 6, y: C - 2.6 }, { x: nx + 15, y: C - 1.7 }, { x: nx + 16.5, y: C - 0.2 },
        { x: nx + 15, y: C + 1.5 }, { x: nx - 6, y: C + 2.6 },
      ];
      k.pen.fill(snout, PAPER_FILL, 1);
      k.pen.fill(snout, k.a.wash, 0.3);
      k.pen.stroke(snout, 0.9, k.ink, 1, false);
      k.pen.hair([{ x: nx + 16.5, y: C - 1.8 }, { x: nx + 16.5, y: C + 1 }], 0.6, k.ink, 0.9);
    },
  },
  wrasse: {
    hl: 84, hh: 27, peak: 0.4, blunt: 0.5, peduncle: 0.42, tail: 'round', tailSize: 0.95,
    dorsal: { from: 0.24, to: 0.88, height: 0.45 }, anal: { from: 0.55, to: 0.88, height: 0.42 },
    pectoral: 0.5, pelvic: true, scales: true, eye: { t: 0.12, r: 5.5 }, mouth: 'small',
    wash: '#3f9a7c', finWash: '#d0648a',
    extras: (k) => {
      k.pen.fill(k.body, '#3f9a7c', 0.18);
      // Wavy magenta lines down the flank and fanning back from the eye.
      k.pen.clipped(k.body, () => {
        for (const v of [-0.55, -0.15, 0.25, 0.62]) {
          const pts: Pt[] = [];
          for (let t = 0.28; t <= 0.98; t += 0.015) pts.push({ x: k.x(t), y: C + k.h(t) * v + Math.sin(t * 46 + v * 3) * 1.3 });
          k.pen.stroke(pts, 1.5, '#c2477a', 0.8, false);
        }
        const e = eyeAt(k);
        for (const v of [-0.65, 0.1, 0.6]) {
          const end = { x: k.x(0.27), y: C + k.h(0.27) * v };
          k.pen.stroke(bezier({ x: e.x - k.a.eye.r * 0.6, y: e.y + v * k.a.eye.r * 1.4 }, { x: (e.x + end.x) / 2, y: end.y - 3 }, end, 8), 1.4, '#c2477a', 0.85, false);
        }
      });
      // Thick lips.
      const nx = k.x(0);
      k.pen.hair(bezier({ x: nx - 1, y: C - 1.5 }, { x: nx - 4, y: C + 3 }, { x: k.x(0.05), y: C + 3.5 }, 5), 0.9, k.ink, 0.8);
    },
  },
  filefish: {
    hl: 60, hh: 46, peak: 0.45, blunt: 0.25, peduncle: 0.22, tail: 'round', tailSize: 0.75,
    dorsal2: { from: 0.58, to: 0.84, height: 0.42 }, anal: { from: 0.56, to: 0.84, height: 0.42 },
    pectoral: 0.28, pelvic: false, scales: false, eye: { t: 0.27, r: 6 }, mouth: 'small',
    wash: '#a4955e', finWash: '#c4ae6a', lateral: false,
    extras: (k) => {
      // Sandpaper skin: an even fine stipple, with dull blotches.
      k.pen.stipple(k.body, 2600, () => 0.4, 0.45, k.ink);
      mottle(k, 9, [4, 8], '#6b6a3a', 0.3, 0.3, 0.9);
      // The single tall first-dorsal spine, barbed along its back.
      const t = 0.27;
      const root = { x: k.x(t), y: topAt(k.a, t) + 3 };
      const tip = { x: root.x - 7, y: root.y - k.a.hh * 0.95 };
      const sail = [root, tip, { x: root.x - 9, y: root.y + 1 }];
      k.pen.fill(sail, PAPER_FILL, 1);
      k.pen.fill(sail, k.a.finWash ?? k.a.wash, 0.25);
      k.pen.hair(bezier(tip, { x: root.x - 6, y: root.y - 12 }, { x: root.x - 10, y: root.y + 1 }, 6), 0.6, k.ink, 0.8);
      k.pen.stroke([root, tip], 2.3, k.ink, 1, false);
      for (let i = 1; i <= 5; i++) {
        const f = 0.3 + i * 0.12;
        const p = { x: root.x + (tip.x - root.x) * f, y: root.y + (tip.y - root.y) * f };
        k.pen.hair([p, { x: p.x + 2, y: p.y + 2.5 }], 0.6, k.ink, 0.9);
      }
      // Belly flap (dewlap) ending in the pelvic spine.
      const a0 = { x: k.x(0.32), y: bottomAt(k.a, 0.32) - 1 };
      const a1 = { x: k.x(0.56), y: bottomAt(k.a, 0.56) - 1 };
      const spine = { x: k.x(0.47), y: bottomAt(k.a, 0.47) + 7 };
      const flap = [...bezier(a0, { x: k.x(0.4), y: spine.y + 1 }, spine, 6), ...bezier(spine, { x: k.x(0.52), y: spine.y - 1 }, a1, 6)];
      k.pen.fill([...flap, a0], PAPER_FILL, 1);
      k.pen.fill([...flap, a0], k.a.wash, 0.3);
      k.pen.stroke(flap, 0.9, k.ink, 1, false);
      k.pen.stroke([{ x: spine.x + 3, y: spine.y - 2 }, { x: spine.x - 2, y: spine.y + 1.5 }], 1.2, k.ink, 1, false);
    },
  },
  mullet: {
    hl: 86, hh: 24, peak: 0.36, blunt: 0.85, peduncle: 0.42, tail: 'fork', tailSize: 1.3,
    dorsal: { from: 0.4, to: 0.5, height: 0.75, spiny: true }, dorsal2: { from: 0.66, to: 0.78, height: 0.65 },
    anal: { from: 0.65, to: 0.8, height: 0.55 }, pectoral: 0.45, pelvic: true, scales: true,
    eye: { t: 0.1, r: 5.5 }, mouth: 'small', wash: '#8e979b', finWash: '#9aa0a0',
    extras: (k) => {
      backStipple(1.2)(k);
      // Grey stripes along the scale rows.
      stripes(k, [-0.62, -0.38, -0.14, 0.1, 0.34], { from: 0.22, to: 0.97, width: 1.1, color: '#4f5a60', alpha: 0.5 });
      // Adipose eyelid: a clear ring of jelly around the eye.
      const e = eyeAt(k);
      k.pen.hair(ring(e.x, e.y, k.a.eye.r * 1.7, k.a.eye.r * 1.4), 0.45, k.ink, 0.55);
    },
  },
  sardine: {
    hl: 80, hh: 19, peak: 0.42, blunt: 0.35, peduncle: 0.3, tail: 'fork', tailSize: 1.7,
    dorsal: { from: 0.4, to: 0.54, height: 0.9 }, anal: { from: 0.76, to: 0.9, height: 0.4 },
    pectoral: 0.4, pelvic: true, scales: true, eye: { t: 0.11, r: 5.5 }, mouth: 'small',
    wash: '#9fb8c6', finWash: '#b8c4c8', lateral: false,
    extras: (k) => {
      darkBack(k, '#2f6680', 0.38, -0.2);
      backStipple(1.1)(k);
      // The row of dark spots along the flank, a few more below.
      for (let i = 0; i < 9; i++) {
        const t = 0.3 + i * 0.07;
        k.pen.dot(k.x(t), C - k.h(t) * 0.12, 2, k.ink, 0.85);
        if (i % 3 === 1) k.pen.dot(k.x(t + 0.03), C + k.h(t) * 0.22, 1.4, k.ink, 0.6);
      }
      // Striations on the silvery gill cover.
      for (let i = 0; i < 4; i++) {
        const x = k.x(0.2 + i * 0.015);
        k.pen.hair([{ x, y: C - k.h(0.2) * 0.3 }, { x: x - 2, y: C + k.h(0.2) * 0.5 }], 0.4, k.ink, 0.45);
      }
    },
  },
  kelpfish: {
    hl: 94, hh: 19, peak: 0.42, blunt: 0.12, peduncle: 0.38, tail: 'fork', tailSize: 1.05,
    dorsal: { from: 0.17, to: 0.62, height: 0.85, spiny: true }, dorsal2: { from: 0.62, to: 0.95, height: 0.72 },
    anal: { from: 0.5, to: 0.95, height: 0.6 }, pectoral: 0.5, pelvic: true, scales: true,
    eye: { t: 0.12, r: 5 }, mouth: 'small', wash: '#a07c32', finWash: '#8f7a30',
    extras: (k) => {
      k.pen.fill(k.body, '#a07c32', 0.18);
      // Kelp-blade streaks: dark lines and pale silvery bands along the body.
      stripes(k, [-0.5, 0.02, 0.52], { from: 0.12, to: 0.98, width: 0.9, color: '#5a4a1e', alpha: 0.55 });
      stripes(k, [-0.24, 0.28], { from: 0.2, to: 0.96, width: 1.6, color: PAPER_FILL, alpha: 0.6 });
      mottle(k, 8, [2.5, 5], '#5a4a1e', 0.3, 0.2, 0.95);
      backStipple(0.9)(k);
    },
  },
  rockfish: {
    hl: 68, hh: 38, peak: 0.36, blunt: 0.55, peduncle: 0.3, tail: 'round', tailSize: 0.8,
    dorsal: { from: 0.2, to: 0.56, height: 0.95, spiny: true }, dorsal2: { from: 0.58, to: 0.8, height: 0.62 },
    anal: { from: 0.64, to: 0.8, height: 0.6 }, pectoral: 0.6, pelvic: true, scales: true,
    eye: { t: 0.15, r: 9 }, mouth: 'small', wash: '#c4553c', finWash: '#c4553c',
    extras: (k) => {
      k.pen.fill(k.body, '#c4553c', 0.2);
      mottle(k, 13, [4, 8], '#7a2a20', 0.35, 0.25, 0.95);
      // Big jaw: the upper jaw reaches back under the eye.
      const nx = k.x(0);
      k.pen.stroke(bezier({ x: nx - 1, y: C + 2 }, { x: k.x(0.1), y: C + k.h(0.1) * 0.45 }, { x: k.x(0.18), y: C + k.h(0.18) * 0.3 }, 8), 1.1, k.ink, 1, false);
      // Two dark bars radiating back from the eye.
      const e = eyeAt(k);
      for (const v of [0.35, 0.8]) {
        const end = { x: k.x(0.3), y: C + k.h(0.3) * v };
        k.pen.stroke([{ x: e.x - k.a.eye.r * 0.6, y: e.y + k.a.eye.r * v }, end], 2.2, '#5a1e18', 0.6, false);
      }
      // Head spines over the eye and on the gill cover.
      const top = topAt(k.a, k.a.eye.t);
      for (const dx of [-5, 0, 5]) k.pen.hair([{ x: e.x + dx, y: top + 3 }, { x: e.x + dx - 3, y: top - 2 }], 0.8, k.ink, 0.9);
      const g = k.x(0.27);
      for (const v of [-0.15, 0.1, 0.35]) k.pen.hair([{ x: g, y: C + k.h(0.27) * v }, { x: g - 6, y: C + k.h(0.27) * v + 1 }], 0.8, k.ink, 0.9);
    },
  },
  garibaldi: {
    hl: 62, hh: 44, peak: 0.42, blunt: 0.85, peduncle: 0.32, tail: 'round', tailSize: 0.85,
    dorsal: { from: 0.26, to: 0.56, height: 0.45, spiny: true }, dorsal2: { from: 0.56, to: 0.86, height: 0.62 },
    anal: { from: 0.6, to: 0.86, height: 0.62 }, pectoral: 0.5, pelvic: true, scales: true,
    eye: { t: 0.17, r: 7 }, mouth: 'small', wash: '#ef7a1a', finWash: '#ef7a1a',
    extras: (k) => {
      // Solid bright orange over body and fins.
      tint(k, 0, FISH_TEX, '#f07818', 0.45);
      k.pen.clipped(k.body, () => k.pen.fill(k.body, '#e8a020', 0.15));
    },
  },
  sheephead: {
    hl: 80, hh: 37, peak: 0.34, blunt: 0.8, peduncle: 0.36, tail: 'round', tailSize: 0.75,
    dorsal: { from: 0.24, to: 0.86, height: 0.42 }, anal: { from: 0.6, to: 0.86, height: 0.48 },
    pectoral: 0.5, pelvic: true, scales: true, eye: { t: 0.13, r: 6 }, mouth: 'small',
    wash: '#c9585a', finWash: '#c9585a',
    extras: (k) => {
      // Red-pink saddle, black head and black rear half (a male).
      k.pen.fill(k.body, '#d0505a', 0.45);
      fade(k, k.x(0.27), k.x(0.31), '#252024', 0.8);
      fade(k, k.x(0.71), k.x(0.66), '#252024', 0.8);
      // White chin.
      k.pen.clipped(k.body, () => {
        k.pen.fill(ellipse(k.x(0.07), C + k.h(0.07) * 0.75, k.a.hl * 0.16, k.h(0.12) * 0.5, 16), PAPER_FILL, 0.92);
      });
      // Buck teeth jutting from the snout.
      const nx = k.x(0);
      for (const [y0, y1] of [[C - 1, C + 2.5], [C + 4.5, C + 1.5]] as const) {
        const tooth = [{ x: nx - 3, y: y0 - 1.6 }, { x: nx + 3.5, y: y1 }, { x: nx - 3, y: y0 + 1.6 }];
        k.pen.fill(tooth, PAPER_FILL, 1);
        k.pen.hair([...tooth, tooth[0]!], 0.5, k.ink, 0.9);
      }
    },
  },
};
