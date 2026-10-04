import type { SpeciesId } from '../../../levels/types';
import { ellipse, type Pt } from '../../pen';
import {
  backStipple, bands, barbel, bezier, bill, bottomAt, C, finlets, PAPER_FILL, ring, spots, stripes, topAt, type Anatomy, type Kit,
} from '../kit';

// ---------------------------------------------------------------- local helpers

/** Fin membrane outside the engine's fin slots: paper, faint wash, fanned rays, outline. */
function membrane(k: Kit, shape: readonly Pt[], root: Pt, rays: number, wash?: string): void {
  const { pen, ink } = k;
  pen.fill(shape, PAPER_FILL, 1);
  pen.fill(shape, wash ?? k.a.finWash ?? k.a.wash, k.heavy ? 0.3 : 0.18);
  for (let i = 1; i < rays; i++) {
    const p = shape[Math.round((i / rays) * (shape.length - 1))]!;
    pen.hair([root, { x: (root.x + p.x) / 2 + pen.jitter(0.6), y: (root.y + p.y) / 2 }, p], 0.5, ink, 0.55);
  }
  pen.stroke([...shape], 1.1, ink, 1, false);
}

/** A soft rounded fin on the back or belly, for fins the anatomy has no slot for (cod's third dorsal). */
function softFin(k: Kit, from: number, to: number, height: number, side: 'top' | 'bottom'): void {
  const dir = side === 'top' ? -1 : 1;
  const edgeY = (t: number): number => (side === 'top' ? topAt(k.a, t) : bottomAt(k.a, t));
  const n = 10;
  const base: Pt[] = [];
  const tips: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const f = i / n;
    const t = from + (to - from) * f;
    const h = k.a.hh * height * Math.max(0.12, Math.pow(Math.sin(Math.PI * Math.min(1, f * 1.15)), 0.7));
    base.push({ x: k.x(t), y: edgeY(t) - dir * 2 });
    tips.push({ x: k.x(t) - h * 0.45, y: edgeY(t) + dir * h });
  }
  const shape = [...base, ...[...tips].reverse()];
  k.pen.fill(shape, PAPER_FILL, 1);
  k.pen.fill(shape, k.a.finWash ?? k.a.wash, 0.16);
  base.forEach((b, i) => {
    if (i % 2 === 0) k.pen.hair([b, tips[i]!], 0.5, k.ink, 0.6);
  });
  k.pen.stroke(tips, 1.1, k.ink, 1, false);
}

/** A white needle tooth from `base` to `tip`. */
function tooth(k: Kit, base: Pt, tip: Pt, width: number): void {
  const d = Math.hypot(tip.x - base.x, tip.y - base.y) || 1;
  const nx = (-(tip.y - base.y) / d) * (width / 2);
  const ny = ((tip.x - base.x) / d) * (width / 2);
  const shape = [{ x: base.x + nx, y: base.y + ny }, tip, { x: base.x - nx, y: base.y - ny }];
  k.pen.fill(shape, PAPER_FILL, 1);
  k.pen.hair(shape, 0.4, k.ink, 0.9);
}

/** Fills the part of the body above (or below) a line at fraction `v` of the half height. */
function tint(k: Kit, color: string, alpha: number, side: 'back' | 'belly', v = 0): void {
  const pts: Pt[] = [];
  for (let t = 0; t <= 1.001; t += 0.05) pts.push({ x: k.x(t), y: C + k.h(t) * v });
  const far = side === 'back' ? 0 : 256;
  k.pen.clipped(k.body, () => k.pen.fill([...pts, { x: k.x(1) - 4, y: far }, { x: k.x(0) + 4, y: far }], color, alpha));
}

/** A ragged skin flap (scorpionfish cirri): a few hairs fanning from a root. */
function flap(k: Kit, p: Pt, dx: number, dy: number, size: number): void {
  const tips = [-0.5, 0, 0.5].map((s) => ({ x: p.x + (dx - dy * s) * size, y: p.y + (dy + dx * s) * size }));
  k.pen.fill([p, ...tips], k.a.wash, 0.6);
  for (const tip of tips) k.pen.hair([p, tip], 0.6, k.ink, 0.9);
}

// ---------------------------------------------------------------- species

/** Reef, wreck and drop-off (chapters 4 to 6). */
export const REEF: Partial<Record<SpeciesId, Anatomy>> = {
  // ------------------------------------------------ reef
  chromis: {
    hl: 64, hh: 30, peak: 0.38, blunt: 0.7, peduncle: 0.24, tail: 'fork', tailSize: 1.55,
    dorsal: { from: 0.26, to: 0.54, height: 0.62, spiny: true }, dorsal2: { from: 0.54, to: 0.74, height: 0.75 },
    anal: { from: 0.6, to: 0.8, height: 0.65 }, pectoral: 0.5, pelvic: true, scales: true,
    eye: { t: 0.14, r: 8 }, mouth: 'small', wash: '#4aa6a8', finWash: '#6cb8cf',
    extras: (k) => {
      tint(k, '#3d8fb8', 0.22, 'back', 0.1);
      backStipple(0.9)(k);
    },
  },
  clownfish: {
    hl: 62, hh: 34, peak: 0.4, blunt: 0.85, peduncle: 0.38, tail: 'round', tailSize: 0.95,
    dorsal: { from: 0.24, to: 0.48, height: 0.55, spiny: true }, dorsal2: { from: 0.5, to: 0.8, height: 0.72 },
    anal: { from: 0.62, to: 0.84, height: 0.62 }, pectoral: 0.55, pelvic: true, scales: false,
    eye: { t: 0.15, r: 8 }, mouth: 'small', wash: '#e8762a', finWash: '#e8762a', lateral: false,
    extras: (k) => {
      k.pen.fill(k.body, '#e8762a', 0.42);
      // Three white bands, edged in black: behind the eye, mid-body (bulging forward), tail stalk.
      const bandsAt: readonly [number, number, number][] = [[0.22, 0.31, 6], [0.5, 0.6, 9], [0.88, 0.95, 2]];
      k.pen.clipped(k.body, () => {
        for (const [t0, t1, bulge] of bandsAt) {
          const front = bezier({ x: k.x(t0), y: topAt(k.a, t0) - 6 }, { x: k.x(t0) + bulge, y: C }, { x: k.x(t0), y: bottomAt(k.a, t0) + 6 }, 12);
          const back = bezier({ x: k.x(t1), y: topAt(k.a, t1) - 6 }, { x: k.x(t1) + bulge, y: C }, { x: k.x(t1), y: bottomAt(k.a, t1) + 6 }, 12);
          k.pen.fill([...front, ...[...back].reverse()], PAPER_FILL, 0.97);
          k.pen.stroke(front, 1.7, k.ink, 1, false);
          k.pen.stroke(back, 1.7, k.ink, 1, false);
        }
      });
    },
  },
  angelfish: {
    hl: 50, hh: 56, peak: 0.42, blunt: 0.75, peduncle: 0.3, tail: 'round', tailSize: 0.62,
    dorsal: { from: 0.3, to: 0.92, height: 0.42 }, anal: { from: 0.42, to: 0.92, height: 0.38 },
    pectoral: 0.38, pelvic: true, scales: true, eye: { t: 0.2, r: 7 }, mouth: 'small',
    wash: '#4f86ad', finWash: '#e2bb3c',
    under: (k) => {
      // Long trailing tips of the dorsal and anal fins, sweeping back past the tail.
      const { hh } = k.a;
      const tailX = k.x(1);
      for (const dir of [-1, 1]) {
        const edge = (t: number): number => (dir < 0 ? topAt(k.a, t) : bottomAt(k.a, t));
        const p0 = { x: k.x(0.58), y: edge(0.58) + dir * hh * 0.38 };
        const tip = { x: tailX - 36, y: C + dir * hh * 1.5 };
        const p1 = { x: k.x(0.93), y: edge(0.93) - dir * 2 };
        const shape = [
          ...bezier(p0, { x: k.x(0.86), y: C + dir * hh * 1.3 }, tip, 12),
          ...bezier(tip, { x: tailX - 4, y: C + dir * hh * 0.85 }, p1, 10),
          { x: k.x(0.58), y: edge(0.58) - dir * 2 },
        ];
        membrane(k, shape, { x: k.x(0.72), y: edge(0.72) }, 10, '#e2bb3c');
        k.pen.hair(bezier(p0, { x: k.x(0.86), y: C + dir * hh * 1.3 }, tip, 12), 1.2, '#2f6aa8', 0.8);
      }
    },
    extras: (k) => {
      // Blue crown spot on the forehead, ringed in electric blue; a cheek spine.
      const x = k.x(0.3);
      const y = topAt(k.a, 0.3) + 12;
      k.pen.fill(ellipse(x, y, 7, 6, 14), '#1d2a52', 0.8);
      k.pen.hair(ring(x, y, 8.5, 7.5, 16), 1.1, '#3d8fd0', 0.9);
      k.pen.dot(x + 1, y, 1.2, '#7fb4e0', 0.9);
      const gx = k.x(0.27);
      k.pen.stroke([{ x: gx + 2, y: C + k.h(0.27) * 0.55 }, { x: gx - 8, y: C + k.h(0.27) * 0.68 }], 1, k.ink, 1, false);
      tint(k, '#3f7fb0', 0.22, 'back', 0.2);
      tint(k, '#e2bb3c', 0.35, 'belly', 0.45);
    },
  },
  parrotfish: {
    hl: 72, hh: 38, peak: 0.4, blunt: 0.88, peduncle: 0.4, tail: 'lunate', tailSize: 0.9,
    dorsal: { from: 0.24, to: 0.82, height: 0.32 }, anal: { from: 0.62, to: 0.86, height: 0.34 },
    pectoral: 0.5, pelvic: true, scales: false, eye: { t: 0.14, r: 6.5 }, mouth: 'beak',
    wash: '#2fa89a', finWash: '#d77a9a',
    extras: (k) => {
      k.pen.fill(k.body, '#2fa89a', 0.22);
      // Big plate-like scales, each edged in salmon pink.
      const s = 6.5;
      k.pen.clipped(k.body, () => {
        let row = 0;
        for (let v = -0.85; v <= 0.85; v += (s * 1.5) / k.a.hh, row++) {
          for (let t = 0.3 + (row % 2) * (s / (2 * k.a.hl)); t < 0.97; t += (s * 1.7) / (2 * k.a.hl)) {
            const x = k.x(t);
            const y = C + k.h(t) * v;
            const arc: Pt[] = [];
            for (let i = 0; i <= 6; i++) {
              const ang = -Math.PI / 2 + (i / 6) * Math.PI;
              arc.push({ x: x - Math.cos(ang) * s * 0.75, y: y + Math.sin(ang) * s });
            }
            k.pen.hair(arc, 1.1, '#d77a9a', 0.55);
            k.pen.hair(arc, 0.45, k.ink, 0.55);
          }
        }
      });
      // Salmon stripes around the snout and eye.
      const ex = k.x(k.a.eye.t);
      const ey = C - k.h(k.a.eye.t) * 0.3;
      k.pen.stroke([{ x: k.x(0.02), y: C + 4 }, { x: ex - 2, y: ey + 9 }, { x: k.x(0.26), y: ey + 6 }], 1.4, '#d77a9a', 0.8, false);
      k.pen.stroke([{ x: k.x(0.03), y: C - 6 }, { x: ex + 4, y: ey - 7 }], 1.3, '#d77a9a', 0.8, false);
      // Fused beak teeth: two pale plates at the nose.
      const nx = k.x(0);
      const beak = [{ x: nx - 5, y: C - 6 }, ...bezier({ x: nx - 2, y: C - 6 }, { x: nx + 6, y: C - 3 }, { x: nx + 3, y: C + 6 }, 8), { x: nx - 5, y: C + 6 }];
      k.pen.fill(beak, '#eef2e4', 1);
      k.pen.stroke(beak, 1, k.ink, 1, false);
      k.pen.hair([{ x: nx - 4, y: C + 0.5 }, { x: nx + 4, y: C + 0.5 }], 0.7, k.ink, 0.9);
    },
  },
  triggerfish: {
    hl: 62, hh: 42, peak: 0.44, blunt: 0.3, peduncle: 0.28, tail: 'lunate', tailSize: 0.7,
    dorsal: { from: 0.3, to: 0.4, height: 0.95, spiny: true }, dorsal2: { from: 0.55, to: 0.86, height: 0.72 },
    anal: { from: 0.55, to: 0.86, height: 0.72 }, pectoral: 0.32, pelvic: false, scales: false,
    eye: { t: 0.3, r: 6.5 }, mouth: 'small', wash: '#c7b48c', finWash: '#d9cba8', gills: 'none', lateral: false,
    extras: (k) => {
      // Picasso triggerfish: dark saddle, blue bars from the eye, yellow lip line, tail-stalk chevrons.
      const saddle = [
        ...bezier({ x: k.x(0.4), y: topAt(k.a, 0.4) - 4 }, { x: k.x(0.5), y: C - 4 }, { x: k.x(0.56), y: bottomAt(k.a, 0.56) + 4 }, 10),
        ...bezier({ x: k.x(0.78), y: bottomAt(k.a, 0.78) + 4 }, { x: k.x(0.64), y: C - 8 }, { x: k.x(0.62), y: topAt(k.a, 0.62) - 4 }, 10),
      ];
      k.pen.clipped(k.body, () => {
        k.pen.fill(saddle, '#5a4030', 0.5);
        k.pen.stipple(saddle, 900, () => 0.6, 0.5, k.ink);
        tint(k, '#f1ead8', 0.5, 'belly', 0.35);
        const ex = k.x(k.a.eye.t);
        const ey = C - k.h(k.a.eye.t) * 0.3;
        for (let i = -1; i <= 1; i++) {
          k.pen.stroke([{ x: ex + 2 + i * 4, y: ey - 10 }, { x: ex - 1 + i * 4, y: ey + 22 }], 1.4, '#2f6aa8', 0.85, false);
        }
        k.pen.stroke(bezier({ x: k.x(0.01), y: C + 2 }, { x: k.x(0.15), y: C + k.h(0.15) * 0.35 }, { x: k.x(0.32), y: C + k.h(0.32) * 0.25 }, 8), 2, '#e0aa28', 0.9, false);
        for (let i = 0; i < 4; i++) {
          const t = 0.8 + i * 0.05;
          k.pen.stroke([{ x: k.x(t) + 4, y: C - k.h(t) * 0.7 }, { x: k.x(t) - 3, y: C }, { x: k.x(t) + 4, y: C + k.h(t) * 0.7 }], 1.3, k.ink, 0.8, false);
        }
      });
      // Small gill slit just ahead of the pectoral, and the thick first spine.
      const gx = k.x(0.35);
      k.pen.hair([{ x: gx + 1, y: C - 3 }, { x: gx - 1, y: C + 6 }], 0.9, k.ink, 0.9);
      const sb = { x: k.x(0.3), y: topAt(k.a, 0.3) };
      k.pen.stroke([sb, { x: sb.x - k.a.hh * 0.42, y: sb.y - k.a.hh * 0.95 }], 1.8, k.ink, 1, false);
    },
  },
  lionfish: {
    hl: 56, hh: 32, peak: 0.38, blunt: 0.6, peduncle: 0.32, tail: 'round', tailSize: 1.0,
    dorsal2: { from: 0.62, to: 0.86, height: 0.7 }, anal: { from: 0.66, to: 0.86, height: 0.62 },
    pectoral: 0, pelvic: true, scales: false, eye: { t: 0.17, r: 6.5 }, mouth: 'small',
    wash: '#c45a46', finWash: '#d07a64', lateral: false,
    under: (k) => {
      const red = '#a8382c';
      // Long, separate venomous dorsal spines, each with a narrow membrane flag.
      for (let i = 0; i < 12; i++) {
        const t = 0.18 + i * 0.037;
        const base = { x: k.x(t), y: topAt(k.a, t) + 3 };
        const len = k.a.hh * (2.0 - i * 0.07);
        const tip = { x: base.x - len * (0.22 + i * 0.03), y: base.y - len };
        const at = (f: number): Pt => ({ x: base.x + (tip.x - base.x) * f, y: base.y + (tip.y - base.y) * f });
        const flag = [base, at(0.55), { x: at(0.4).x - 6, y: at(0.4).y + 4 }, { x: base.x - 7, y: base.y }];
        k.pen.fill(flag, PAPER_FILL, 1);
        k.pen.fill(flag, k.a.finWash!, 0.3);
        k.pen.hair([at(0.55), { x: at(0.4).x - 6, y: at(0.4).y + 4 }, { x: base.x - 7, y: base.y }], 0.45, k.ink, 0.7);
        k.pen.stroke([base, tip], 0.9, k.ink, 1, false);
        for (let f = 0.12; f < 0.95; f += 0.2) k.pen.hair([at(f), at(f + 0.08)], 1.6, red, 0.8);
      }
      // Huge feathery pectorals fanning below the body: free banded rays, webbed near the root.
      const root = { x: k.x(0.32), y: C + k.h(0.32) * 0.2 };
      const rays: Pt[] = [];
      for (let i = 0; i < 15; i++) {
        const ang = (80 + i * 7) * (Math.PI / 180);
        const len = k.a.hh * (1.9 + Math.sin((i / 14) * Math.PI) * 0.7);
        rays.push({ x: root.x + Math.cos(ang) * len, y: root.y + Math.sin(ang) * len });
      }
      const mid = (p: Pt, f: number): Pt => ({ x: root.x + (p.x - root.x) * f, y: root.y + (p.y - root.y) * f });
      const web = [root, ...rays.map((p, i) => mid(p, i % 2 ? 0.62 : 0.72))];
      k.pen.fill(web, PAPER_FILL, 1);
      k.pen.fill(web, k.a.finWash!, 0.25);
      k.pen.hair(web.slice(1), 0.5, k.ink, 0.6);
      for (const p of rays) {
        k.pen.stroke([root, p], 0.8, k.ink, 0.95, false);
        for (let f = 0.15; f < 0.95; f += 0.16) k.pen.hair([mid(p, f), mid(p, f + 0.07)], 1.8, red, 0.75);
      }
    },
    extras: (k) => {
      k.pen.fill(k.body, '#f3e2cf', 0.4);
      const starts = Array.from({ length: 11 }, (_, i) => 0.05 + i * 0.085);
      bands(k, starts, 0.042, { color: '#7a2219', alpha: 0.6, fill: '#b2402f' });
      // Fleshy tentacle above the eye.
      const ex = k.x(k.a.eye.t);
      const ey = topAt(k.a, k.a.eye.t);
      k.pen.stroke(bezier({ x: ex, y: ey + 2 }, { x: ex + 4, y: ey - 8 }, { x: ex - 2, y: ey - 14 }, 6), 1.2, k.ink, 1, false);
    },
  },
  boxfish: {
    hl: 62, hh: 38, peak: 0.6, blunt: 1, peduncle: 0.2, tail: 'round', tailSize: 0.62,
    dorsal: { from: 0.8, to: 0.92, height: 0.36 }, anal: { from: 0.82, to: 0.94, height: 0.32 },
    pectoral: 0.3, pelvic: false, scales: false, eye: { t: 0.22, r: 7.5 }, mouth: 'small',
    wash: '#e2be22', finWash: '#e7cf6a', gills: 'none', lateral: false,
    extras: (k) => {
      k.pen.fill(k.body, '#e8c42a', 0.4);
      // Rigid carapace of hexagonal plates, each with a dark spot.
      const r = 7;
      const ex = k.x(k.a.eye.t);
      const ey = C - k.h(k.a.eye.t) * 0.3;
      k.pen.clipped(k.body, () => {
        let row = 0;
        for (let y = C - 50; y < C + 50; y += r * 1.5, row++) {
          for (let x = k.x(0.9) + (row % 2) * r * 0.87; x < k.x(0) + r; x += r * 1.74) {
            const hex = Array.from({ length: 7 }, (_, i) => {
              const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
              return { x: x + Math.cos(a) * r, y: y + Math.sin(a) * r };
            });
            k.pen.hair(hex, 0.5, k.ink, 0.55);
            if (Math.hypot(x - ex, y - ey) > r * 1.5) k.pen.dot(x, y, 1.7, '#1d1b24', 0.85);
          }
        }
      });
      // Carapace ridges: straight keels along the back and belly make it read as a box.
      for (const v of [-0.72, 0.68]) {
        k.pen.stroke([{ x: k.x(0.12), y: C + k.a.hh * v * 0.92 }, { x: k.x(0.72), y: C + k.a.hh * v }], 1.1, k.ink, 0.85, false);
      }
      // Pursed lips.
      const nx = k.x(0);
      k.pen.fill(ellipse(nx - 1, C + 4, 3, 2.4, 10), '#d98c54', 0.8);
      k.pen.hair(ring(nx - 1, C + 4, 3, 2.4, 10), 0.6, k.ink, 0.9);
    },
  },

  // ------------------------------------------------ wreck
  sweeper: {
    // Glassy sweeper: a short, deep wedge, tallest just behind the big eyes, the belly
    // sloping in a long straight line to a thin tail stalk along a long anal fin;
    // one short high dorsal; coppery and see-through, with a dark line at the anal fin base.
    hl: 56, hh: 34, peak: 0.3, blunt: 0.7, peduncle: 0.14, tail: 'fork', tailSize: 1.05,
    dorsal: { from: 0.28, to: 0.42, height: 0.8, tri: true }, anal: { from: 0.46, to: 0.92, height: 0.42 },
    pectoral: 0.5, pelvic: true, scales: true, eye: { t: 0.13, r: 10 }, mouth: 'small',
    wash: '#c58f55', finWash: '#ddb27a', lateral: false,
    profile: (t) => {
      const ease = (u: number): number => Math.pow(Math.sin(u * Math.PI / 2), 0.8);
      const top = t <= 0.3 ? -0.08 - 0.77 * ease(t / 0.3) : -0.14 - 0.71 * Math.pow(Math.cos(((t - 0.3) / 0.7) * Math.PI / 2), 1.1);
      const bottom = t <= 0.32 ? 0.08 + 0.92 * ease(t / 0.32) : 0.14 + 0.86 * Math.pow(1 - (t - 0.32) / 0.68, 1.15);
      return { top, bottom };
    },
    extras: (k) => {
      tint(k, '#8a5a2e', 0.28, 'back', -0.35);
      tint(k, '#f3dcc4', 0.3, 'belly', 0.45);
      // Glassy sheen: a few faint highlights across the flank.
      for (let i = 0; i < 3; i++) {
        const t = 0.3 + i * 0.14;
        k.pen.hair([{ x: k.x(t), y: C - k.h(t) * 0.3 }, { x: k.x(t + 0.08), y: C + k.h(t) * 0.1 }], 0.6, PAPER_FILL, 0.7);
      }
      // Dark line along the base of the anal fin.
      const base: Pt[] = [];
      for (let t = 0.46; t <= 0.921; t += 0.04) base.push({ x: k.x(t), y: bottomAt(k.a, t) - 2 });
      k.pen.stroke(base, 1.4, '#1d1b24', 0.75, false);
    },
  },
  snapper: {
    hl: 70, hh: 40, peak: 0.4, blunt: 0.35, peduncle: 0.28, tail: 'fork', tailSize: 1.0,
    dorsal: { from: 0.22, to: 0.5, height: 0.6, spiny: true }, dorsal2: { from: 0.5, to: 0.76, height: 0.55 },
    anal: { from: 0.64, to: 0.8, height: 0.55, tri: true }, pectoral: 0.62, pelvic: true, scales: true,
    eye: { t: 0.18, r: 7.5 }, mouth: 'teeth', wash: '#c8463c', finWash: '#d4604c',
    extras: (k) => {
      k.pen.fill(k.body, '#c8463c', 0.22);
      tint(k, '#a82f2a', 0.25, 'back', -0.2);
      tint(k, '#f1d8c8', 0.3, 'belly', 0.5);
    },
  },
  jack: {
    hl: 66, hh: 40, peak: 0.36, blunt: 0.78, peduncle: 0.15, tail: 'fork', tailSize: 1.3,
    dorsal: { from: 0.3, to: 0.42, height: 0.45, spiny: true }, dorsal2: { from: 0.46, to: 0.8, height: 0.8, tri: true },
    anal: { from: 0.56, to: 0.8, height: 0.7, tri: true }, pectoral: 0.75, pelvic: true, scales: false,
    eye: { t: 0.14, r: 7.5 }, mouth: 'small', wash: '#93a6a6', finWash: '#d4b44c',
    extras: (k) => {
      tint(k, '#4d6e7a', 0.3, 'back', -0.25);
      backStipple(1.1)(k);
      // Bony scutes along the tail stalk.
      for (let t = 0.8; t < 0.99; t += 0.024) {
        const x = k.x(t);
        const y = C - k.h(t) * 0.05;
        const s = 2.2 + (t - 0.8) * 4;
        const plate = [{ x: x + s * 1.2, y }, { x, y: y - s }, { x: x - s * 1.2, y }, { x, y: y + s }, { x: x + s * 1.2, y }];
        k.pen.fill(plate, PAPER_FILL, 0.9);
        k.pen.hair(plate, 0.6, k.ink, 0.9);
      }
      // Dark spot on the gill cover.
      k.pen.fill(ellipse(k.x(0.25), C - k.h(0.25) * 0.4, 3, 2.4, 10), '#1d1b24', 0.75);
    },
  },
  barracuda: {
    // Great barracuda: a long silver pike of a fish with an underbite, dark bars and a few black blotches.
    hl: 96, hh: 20, peak: 0.45, blunt: 0.15, peduncle: 0.4, tail: 'fork', tailSize: 1.5,
    dorsal: { from: 0.4, to: 0.5, height: 0.9, spiny: true }, dorsal2: { from: 0.7, to: 0.8, height: 0.8 },
    anal: { from: 0.72, to: 0.82, height: 0.7 }, pectoral: 0.45, pelvic: true, scales: true,
    eye: { t: 0.14, r: 7 }, mouth: 'teeth', wash: '#8e9aa3', finWash: '#9c9a86',
    extras: (k) => {
      // Dark chevrons along the flank.
      for (let i = 0; i < 9; i++) {
        const t = 0.3 + i * 0.065;
        const x = k.x(t);
        k.pen.hair([{ x: x + 3, y: C - k.h(t) * 0.75 }, { x: x - 2, y: C - k.h(t) * 0.1 }, { x: x + 3, y: C + k.h(t) * 0.3 }], 0.8, k.ink, 0.65);
      }
      // A few inky blotches low on the flank, towards the tail.
      for (const t of [0.6, 0.72, 0.83]) k.pen.fill(ellipse(k.x(t), C + k.h(t) * 0.35, 2.6, 1.8, 10), '#2a2d33', 0.7);
    },
  },
  moray: {
    hl: 108, hh: 19, peak: 0.3, blunt: 0.85, peduncle: 0.28, tail: 'point', tailSize: 0,
    dorsal: { from: 0.14, to: 1, height: 0.32 }, anal: { from: 0.45, to: 1, height: 0.3 },
    pectoral: 0, pelvic: false, scales: false, eye: { t: 0.055, r: 4.2 }, mouth: 'small',
    wash: '#6f7434', finWash: '#7d7a40', gills: 'none', lateral: false, wave: 11,
    extras: (k) => {
      // Mottled skin: dark blotches and pale freckles.
      spots(k, 34, [2.2, 4.5], '#3d3a1e', { from: 0.12, to: 0.98, outline: false, alpha: 0.65 });
      spots(k, 26, [0.9, 1.6], '#efe6c4', { from: 0.1, to: 0.98, outline: false, alpha: 0.9 });
      // Gaping jaw lined with needle teeth.
      const nx = k.x(0);
      const corner = { x: k.x(0.15), y: C + k.h(0.15) * 0.1 };
      const upper = bezier({ x: nx, y: C - 1 }, { x: k.x(0.07), y: C + 1 }, corner, 10);
      const lower = bezier({ x: k.x(0.025), y: C + k.h(0.025) * 0.85 }, { x: k.x(0.08), y: C + k.h(0.08) * 0.8 }, corner, 10);
      k.pen.fill([...upper, ...[...lower].reverse()], '#2a2228', 0.85);
      for (let i = 1; i < 6; i++) {
        const u = upper[i * 2 - 1]!;
        tooth(k, u, { x: u.x - 0.6, y: u.y + 3 }, 1.6);
        const l = lower[i * 2 - 1]!;
        tooth(k, l, { x: l.x - 0.6, y: l.y - 2.6 }, 1.6);
      }
      k.pen.stroke(lower, 1, k.ink, 1, false);
      // Small round gill opening.
      k.pen.fill(ellipse(k.x(0.2), C + 1, 1.8, 2.4, 8), '#1d1b24', 0.8);
    },
  },
  scorpionfish: {
    hl: 64, hh: 38, peak: 0.3, blunt: 0.72, peduncle: 0.3, tail: 'round', tailSize: 0.85,
    dorsal: { from: 0.2, to: 0.56, height: 0.8, spiny: true }, dorsal2: { from: 0.58, to: 0.8, height: 0.55 },
    anal: { from: 0.66, to: 0.82, height: 0.5, spiny: true }, pectoral: 0.75, pelvic: true, scales: false,
    eye: { t: 0.17, r: 7 }, mouth: 'small', wash: '#9c5a3c', finWash: '#b06e4e', lateral: false,
    extras: (k) => {
      // Camouflage: rusty blotches, pale patches, dense stipple.
      spots(k, 16, [3.5, 7], '#5a3424', { from: 0.1, to: 0.98, outline: false, alpha: 0.55 });
      spots(k, 12, [2.5, 5], '#e8d6b4', { from: 0.15, to: 0.95, outline: false, alpha: 0.6 });
      k.pen.stipple(k.body, 1100, () => 0.3, 0.5, k.ink);
      // Big upturned mouth.
      const nx = k.x(0);
      k.pen.stroke(bezier({ x: nx + 1, y: C - 2 }, { x: k.x(0.08), y: C + 6 }, { x: k.x(0.17), y: C + k.h(0.17) * 0.32 }, 8), 1.2, k.ink, 1, false);
      // Head ridges and spines.
      for (const t of [0.1, 0.2, 0.26]) k.pen.hair([{ x: k.x(t) + 3, y: topAt(k.a, t) + 4 }, { x: k.x(t) - 4, y: topAt(k.a, t) + 9 }], 0.8, k.ink, 0.8);
      // Skin flaps: over the eye, on the chin, and along the flank.
      const ex = k.x(k.a.eye.t);
      flap(k, { x: ex, y: topAt(k.a, k.a.eye.t) + 1 }, -0.3, -1, 8);
      flap(k, { x: k.x(0.06), y: bottomAt(k.a, 0.06) - 1 }, -0.2, 1, 6);
      flap(k, { x: k.x(0.12), y: bottomAt(k.a, 0.12) - 1 }, -0.4, 1, 5);
      for (const t of [0.42, 0.58, 0.74]) flap(k, { x: k.x(t), y: C - k.h(t) * 0.1 }, -1, -0.4, 4);
    },
  },
  cod: {
    hl: 80, hh: 30, peak: 0.33, blunt: 0.65, peduncle: 0.3, tail: 'fork', tailSize: 0.85,
    dorsal: { from: 0.24, to: 0.42, height: 0.62 }, dorsal2: { from: 0.46, to: 0.66, height: 0.5 },
    anal: { from: 0.44, to: 0.64, height: 0.45 }, pectoral: 0.5, pelvic: true, scales: false,
    eye: { t: 0.13, r: 6.5 }, mouth: 'small', wash: '#9a8a58', finWash: '#a89a6a',
    under: (k) => {
      // The third dorsal and second anal fin.
      softFin(k, 0.7, 0.9, 0.48, 'top');
      softFin(k, 0.68, 0.88, 0.42, 'bottom');
    },
    extras: (k) => {
      tint(k, '#6b5e34', 0.25, 'back', -0.2);
      spots(k, 70, [0.8, 1.7], '#5a4a28', { from: 0.06, to: 0.97, outline: false, alpha: 0.7 });
      // Pale lateral line.
      stripes(k, [-0.12], { from: 0.26, to: 0.96, width: 1.8, color: '#f1e9d0', alpha: 0.85 });
      barbel(k, 12);
    },
  },

  // ------------------------------------------------ drop-off
  anchovy: {
    hl: 70, hh: 15, peak: 0.4, blunt: 0.55, peduncle: 0.35, tail: 'fork', tailSize: 1.8,
    dorsal: { from: 0.44, to: 0.56, height: 0.95 }, anal: { from: 0.64, to: 0.8, height: 0.6 },
    pectoral: 0.45, pelvic: true, scales: true, eye: { t: 0.1, r: 5.5 }, mouth: 'small',
    wash: '#7c97a6', finWash: '#b5c2c8', lateral: false,
    extras: (k) => {
      backStipple(1.4)(k);
      // Silver side stripe.
      stripes(k, [0.05], { from: 0.2, to: 0.97, width: 3, color: '#d9e2e6', alpha: 0.95 });
      stripes(k, [-0.08, 0.18], { from: 0.22, to: 0.96, width: 0.5, alpha: 0.5 });
      // Long underslung jaw running back past the eye.
      k.pen.stroke(bezier({ x: k.x(0.03), y: C + k.h(0.03) * 0.5 }, { x: k.x(0.12), y: C + k.h(0.12) * 0.6 }, { x: k.x(0.22), y: C + k.h(0.22) * 0.3 }, 8), 1, k.ink, 1, false);
    },
  },
  mackerel: {
    hl: 84, hh: 22, peak: 0.42, blunt: 0.35, peduncle: 0.16, tail: 'fork', tailSize: 1.5,
    dorsal: { from: 0.3, to: 0.46, height: 0.8, spiny: true }, dorsal2: { from: 0.58, to: 0.68, height: 0.6 },
    anal: { from: 0.6, to: 0.7, height: 0.55 }, pectoral: 0.42, pelvic: true, scales: false,
    eye: { t: 0.12, r: 6 }, mouth: 'small', wash: '#4a8a86', finWash: '#9ab0aa',
    extras: (k) => {
      tint(k, '#2f6f78', 0.35, 'back', -0.05);
      tint(k, '#f1ece0', 0.45, 'belly', 0.2);
      // Wavy tiger bars over the back.
      k.pen.clipped(k.body, () => {
        for (let i = 0; i < 20; i++) {
          const t0 = 0.22 + i * 0.037;
          const pts: Pt[] = [];
          for (let j = 0; j <= 6; j++) {
            const f = j / 6;
            pts.push({ x: k.x(t0) + Math.sin(f * 7 + i) * 2.2 - f * 3, y: topAt(k.a, t0) - 2 + f * (k.h(t0) * 1.0) });
          }
          k.pen.stroke(pts, 1.2, k.ink, 0.85, false);
        }
      });
      finlets(k, 0.73, 5);
    },
  },
  flyingfish: {
    hl: 78, hh: 20, peak: 0.4, blunt: 0.6, peduncle: 0.35, tail: 'fork', tailSize: 1.3,
    dorsal: { from: 0.62, to: 0.78, height: 0.7 }, anal: { from: 0.66, to: 0.8, height: 0.6 },
    pectoral: 0, pelvic: true, scales: true, eye: { t: 0.1, r: 6.5 }, mouth: 'small',
    wash: '#3d6fa0', finWash: '#a9c2da',
    under: (k) => {
      // Longer lower tail lobe.
      const x0 = k.x(1) + 3;
      const L = k.a.hh * k.a.tailSize;
      const S = L * 0.85;
      const tip = { x: x0 - L * 1.5, y: C + S * 1.35 };
      const lobe = [
        { x: x0, y: C }, ...bezier({ x: x0, y: C }, { x: x0 - L * 0.7, y: C + S * 0.35 }, tip, 10),
        ...bezier(tip, { x: x0 - L * 0.6, y: C + S * 1.0 }, { x: x0, y: C + k.h(1) * 0.9 }, 10),
      ];
      membrane(k, lobe, { x: x0 + 2, y: C }, 8);
      // Wing-like pectorals: the far one raised above the back, the near one swept below.
      const root = { x: k.x(0.24), y: C - k.h(0.24) * 0.1 };
      for (const dir of [-1, 1]) {
        const span = dir < 0 ? 1 : 0.85;
        const wingTip = { x: root.x - 100 * span, y: C + dir * 58 * span };
        const wing = [
          root,
          ...bezier(root, { x: root.x - 30, y: C + dir * 52 * span }, wingTip, 12),
          ...bezier(wingTip, { x: root.x - 60 * span, y: C + dir * 18 }, { x: root.x - 12, y: C + dir * 3 }, 12),
        ];
        membrane(k, wing, root, 14);
      }
    },
    extras: (k) => {
      tint(k, '#24476e', 0.3, 'back', -0.1);
      backStipple(1.2)(k);
    },
  },
  mahi: {
    hl: 80, hh: 27, peak: 0.2, blunt: 1, peduncle: 0.2, tail: 'fork', tailSize: 1.4,
    dorsal: { from: 0.06, to: 0.92, height: 0.75 }, anal: { from: 0.5, to: 0.92, height: 0.45 },
    pectoral: 0.45, pelvic: true, scales: false, eye: { t: 0.1, r: 6 }, mouth: 'small',
    wash: '#7aa83a', finWash: '#3a78b0',
    extras: (k) => {
      tint(k, '#2f8a62', 0.35, 'back', -0.15);
      tint(k, '#e6c235', 0.5, 'belly', 0.05);
      spots(k, 26, [0.9, 1.6], '#2e6fa8', { from: 0.2, to: 0.9, outline: false, alpha: 0.8 });
      // The long dorsal is a deep blue: wash over it.
      const fin: Pt[] = [];
      for (let t = 0.06; t <= 0.92; t += 0.02) fin.push({ x: k.x(t), y: topAt(k.a, t) + 1 });
      for (let t = 0.92; t >= 0.06; t -= 0.02) {
        const f = (t - 0.06) / 0.86;
        const h = k.a.hh * 0.75 * Math.max(0.12, Math.pow(Math.sin(Math.PI * Math.min(1, f * 1.15)), 0.7));
        fin.push({ x: k.x(t) - h * 0.45, y: topAt(k.a, t) - h });
      }
      k.pen.fill(fin, '#2f6aa8', k.heavy ? 0.3 : 0.38);
    },
  },
  bonito: {
    hl: 82, hh: 26, peak: 0.4, blunt: 0.35, peduncle: 0.12, tail: 'lunate', tailSize: 1.45,
    dorsal: { from: 0.28, to: 0.52, height: 0.65, spiny: true }, dorsal2: { from: 0.58, to: 0.66, height: 0.75, tri: true },
    anal: { from: 0.62, to: 0.7, height: 0.65, tri: true }, pectoral: 0.42, pelvic: true, scales: false,
    eye: { t: 0.12, r: 6 }, mouth: 'small', wash: '#3e5f86', finWash: '#8a9db2',
    extras: (k) => {
      tint(k, '#26405e', 0.35, 'back', -0.15);
      tint(k, '#eef0ea', 0.45, 'belly', 0.15);
      // Oblique dark stripes running up and back over the back.
      k.pen.clipped(k.body, () => {
        for (let i = 0; i < 9; i++) {
          const t = 0.2 + i * 0.075;
          const t2 = Math.min(1, t + 0.16);
          k.pen.stroke([{ x: k.x(t), y: C - k.h(t) * 0.05 }, { x: k.x(t2), y: topAt(k.a, t2) - 2 }], 1.7, k.ink, 0.8, false);
        }
      });
      finlets(k, 0.72, 6);
      // Keel on the tail stalk.
      k.pen.stroke([{ x: k.x(0.86), y: C }, { x: k.x(1) + 1, y: C }], 1.3, k.ink, 1, false);
    },
  },
  needlefish: {
    hl: 86, hh: 12, peak: 0.5, blunt: 0.3, peduncle: 0.4, tail: 'fork', tailSize: 1.8,
    dorsal: { from: 0.72, to: 0.88, height: 1.3 }, anal: { from: 0.7, to: 0.86, height: 1.25 },
    pectoral: 0.4, pelvic: true, scales: false, eye: { t: 0.07, r: 5 }, mouth: 'small',
    wash: '#4f86a0', finWash: '#9ab8c8',
    extras: (k) => {
      tint(k, '#2c5f78', 0.35, 'back', 0);
      stripes(k, [0.1], { from: 0.12, to: 0.96, width: 1.6, color: '#dde6e8', alpha: 0.9 });
      // Long toothy beak, the lower jaw a touch longer.
      const len = 30;
      bill(k, len, 3.6, { lower: true });
      const nx = k.x(0);
      for (let x = nx + 2; x < nx + len - 4; x += 3.2) {
        k.pen.hair([{ x, y: C - 1 }, { x: x - 0.6, y: C - 2.4 }], 0.5, k.ink, 0.9);
        k.pen.hair([{ x: x + 1.5, y: C - 1 }, { x: x + 0.9, y: C + 0.4 }], 0.5, k.ink, 0.9);
      }
    },
  },

  angler: {
    hl: 62, hh: 46, peak: 0.3, blunt: 0.95, peduncle: 0.3, tail: 'round', tailSize: 0.7,
    dorsal: { from: 0.62, to: 0.78, height: 0.5 }, anal: { from: 0.66, to: 0.8, height: 0.4 },
    pectoral: 0.6, pelvic: false, scales: false, eye: { t: 0.24, r: 5.5 }, mouth: 'gape', wash: '#6a5148',
    extras: (k) => {
      // Warty skin.
      k.pen.stipple(k.body, 1400, () => 0.35, 0.5, k.ink);
      for (let i = 0; i < 12; i++) {
        const t = 0.25 + k.pen.rng() * 0.6;
        const y = C + k.h(t) * (k.pen.rng() * 1.4 - 0.7);
        k.pen.hair(ellipse(k.x(t), y, 1.8, 1.4, 8).concat([{ x: k.x(t) + 1.8, y }]), 0.45, k.ink, 0.7);
      }
      // Lure on a jointed stalk, with a glowing bulb.
      const root = { x: k.x(0.28), y: topAt(k.a, 0.28) };
      const bulb = { x: k.x(0) + 16, y: topAt(k.a, 0.3) - 26 };
      k.pen.stroke(bezier(root, { x: k.x(0.12), y: bulb.y - 18 }, bulb), 1.1, k.ink, 1, false);
      k.pen.fill(ellipse(bulb.x, bulb.y, 9, 9, 16), '#f0c94a', 0.25);
      k.pen.fill(ellipse(bulb.x, bulb.y, 5, 5, 14), '#f0c94a', 0.95);
      k.pen.stroke(ellipse(bulb.x, bulb.y, 5, 5, 14).concat([{ x: bulb.x + 5, y: bulb.y }]), 0.8, k.ink, 1, false);
      for (let i = 0; i < 8; i++) {
        const ang = (i / 8) * Math.PI * 2;
        k.pen.hair([{ x: bulb.x + Math.cos(ang) * 7, y: bulb.y + Math.sin(ang) * 7 }, { x: bulb.x + Math.cos(ang) * 10, y: bulb.y + Math.sin(ang) * 10 }], 0.45, '#b08a1a', 0.8);
      }
    },
  },
};
