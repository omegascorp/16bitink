import { bezier, closed, cub, type Draw, oval, pt, tube } from '../kit';
import type { Pt } from '../pen';
import { PAPER_FILL } from '../palette';
import { BACKDROP_W, edges, FAR } from './common';
import { glow } from './estuary';

/**
 * The ice of the Labrador Sea in spring: broken pack ice drifting south in
 * flat white pans, turquoise where their edges run down under the water,
 * with slush and brash between them; icebergs off the Greenland glaciers,
 * tall and fissured, blue in their shade and their seams, grounded or
 * drifting; the ice foot still fast along the shore; and harp seals
 * hauled out on the pans, with a whitecoat pup. All sit on a waterline;
 * `s` scales them.
 */
const W = BACKDROP_W;
export const LAB_SEA = '#4a6a80';
export const LAB_SEA_FAR = '#7f9aab';
export const ICE = '#f7fbfc';
export const ICE_SHADE = '#b5cfdc';
export const ICE_BLUE = '#7fb2cc';
export const TURQUOISE = '#4fb6bb';
const MELT = '#8fd0d8';
const HARP_COAT = '#d6d9d6';
const HARP_DARK = '#2c2f36';
const PUP = '#fbf6e6';

/** A shape on paper under a wash, its edge inked. */
function washed(t: Draw, shape: readonly Pt[], color: string, alpha: number, w = 0.5, ink = 1): void {
  t.pen.fill(shape, PAPER_FILL, 1);
  t.pen.fill(shape, color, alpha);
  t.pen.stroke(edges(shape, 2), w, t.ink, FAR * ink, false);
}

/**
 * A pan of pack ice seen from the shore, nearly edge-on: a flat, broken
 * floe `w` across, its snowy top a thin irregular lens, its edge standing
 * `thick` out of the water, and the turquoise of its submerged foot
 * showing under the waterline. Bigger ones carry hummocks and melt ponds.
 * Returns the top surface's outline.
 */
export function icePan(t: Draw, x: number, water: number, w: number, thick: number, flat = 0.12): Pt[] {
  const { pen } = t;
  const n = 12 + Math.floor(pen.rng() * 4);
  const cy = water - thick;
  const ry = w * flat;
  // Broken, angular outline: jittered radii round an ellipse, a few corners cut straight.
  const top = Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2 + pen.jitter(0.12);
    const r = 0.78 + pen.rng() * 0.28;
    return pt(x + Math.cos(a) * (w / 2) * r, cy + Math.sin(a) * ry * r);
  });
  // The near half (lower on the page) is the edge that stands out of the water.
  const front = top.filter((p) => p.y >= cy - ry * 0.05).sort((a, b) => a.x - b.x);
  const left = top.reduce((m, p) => (p.x < m.x ? p : m));
  const right = top.reduce((m, p) => (p.x > m.x ? p : m));
  const rim = [left, ...front.filter((p) => p !== left && p !== right), right];
  const foot = rim.map((p) => pt(p.x, p.y + thick));
  const skirt = [...foot, ...[...foot].reverse().map((p, i) => pt(p.x + (i % 2 ? 1 : -1) * 0.5, p.y + thick * 1.4 + 1.5 + ry * 0.3))];
  pen.fill(skirt, TURQUOISE, 0.35);
  pen.fill(skirt.slice(0, foot.length).concat([...foot].reverse().map((p) => pt(p.x, p.y + thick * 0.6 + 0.8))), MELT, 0.45);
  const face = [...rim, ...[...foot].reverse()];
  pen.fill(face, PAPER_FILL, 1);
  pen.fill(face, ICE_SHADE, 0.55);
  if (w > 26) pen.clipped(face, () => pen.hatch(face, 1.4, 1.45, 0.3, { color: ICE_BLUE, alpha: 0.6 }));
  pen.fill(top, PAPER_FILL, 1);
  pen.fill(top, ICE, 0.7);
  if (w > 30) {
    pen.clipped(top, () => {
      // Hummocks pushed up where the floes ground together, each with a blue shade on its lee; a melt pond or two.
      for (let k = 0; k < w / 22; k++) {
        const hx = x + pen.jitter(w * 0.35);
        const hy = cy + pen.jitter(ry * 0.4);
        const hr = 2 + pen.rng() * w * 0.04;
        pen.fill(oval(hx + hr * 0.4, hy + 0.4, hr, hr * 0.35, 10), ICE_SHADE, 0.6);
        pen.hair(bezier(pt(hx - hr, hy + 0.3), pt(hx, hy - hr * 0.5), pt(hx + hr, hy + 0.3), 5), 0.35, t.ink, FAR * 0.35);
      }
      if (pen.rng() < 0.7) pen.fill(oval(x + pen.jitter(w * 0.25), cy + pen.jitter(ry * 0.3), w * 0.1, ry * 0.25, 12), MELT, 0.7);
    });
  }
  pen.hair(closed(top), 0.4, t.ink, FAR * 0.5);
  pen.hair(foot, 0.35, t.ink, FAR * 0.4);
  // Wash slopping against its edge.
  pen.hair(foot.filter((_, i) => i % 3 !== 1).map((p) => pt(p.x, p.y + 0.6)), 0.8, PAPER_FILL, 0.85);
  return top;
}

/** Slush and brash: small fragments of ice strewn on the water between the pans, from y0 to y1. */
export function brash(t: Draw, x0: number, x1: number, y0: number, y1: number, n: number): void {
  const { pen } = t;
  for (let k = 0; k < n; k++) {
    const u = pen.rng();
    const y = y0 + (y1 - y0) * u;
    const r = 0.8 + u * 2.5 + pen.rng() * 1.2;
    const x = x0 + r + pen.rng() * (x1 - x0 - r * 2);
    const bit = oval(x, y, r * 1.6, r * 0.45, 8).map((p) => pt(p.x + pen.jitter(r * 0.3), p.y));
    pen.fill(bit.map((p) => pt(p.x, p.y + r * 0.5)), TURQUOISE, 0.3);
    pen.fill(bit, PAPER_FILL, 0.95);
    if (r > 2) pen.hair(bit.slice(0, 5), 0.3, t.ink, FAR * 0.4);
  }
}

/**
 * Pack ice across a stretch of sea from y0 down to y1: `n` pans, small and
 * crowded far out, bigger and flatter-looking nearer, laid at random within
 * x0..x1 (none crossing the tile's edges, so the layer wraps cleanly) and
 * drawn far to near.
 */
export function packIce(t: Draw, x0: number, x1: number, y0: number, y1: number, n: number, size = 1): void {
  const { pen } = t;
  const pans = Array.from({ length: n }, () => {
    const u = pen.rng() ** 0.9;
    const w = (5 + 52 * u) * (0.45 + pen.rng() * 0.9) * size;
    const lo = Math.max(x0, w / 2 + 2);
    const hi = Math.min(x1, W - w / 2 - 2);
    return { x: lo + pen.rng() * Math.max(0, hi - lo), y: y0 + (y1 - y0) * u, w, u };
  }).sort((a, b) => a.y - b.y);
  for (const p of pans) icePan(t, p.x, p.y, p.w, (0.6 + 2.6 * p.u) * size, 0.08 + 0.08 * p.u);
}

/**
 * The outlines of the icebergs, from the left waterline over the top to the
 * right one, in px at s = 1: a pinnacle berg, a dry-dock berg with its
 * slot worn down between two horns, and a blocky tabular one.
 */
const BERGS = {
  pinnacle: [[-34, 0], [-30, -9], [-24, -13], [-19, -27], [-12, -33], [-7, -50], [-1, -60], [4, -53], [7, -47], [13, -44], [17, -29], [24, -22], [29, -10], [35, 0]],
  drydock: [[-36, 0], [-33, -14], [-27, -28], [-20, -40], [-14, -37], [-10, -18], [-3, -12], [4, -15], [8, -31], [14, -45], [21, -42], [27, -27], [33, -11], [37, 0]],
  tabular: [[-42, 0], [-41, -16], [-36, -21], [-14, -23], [8, -22], [30, -24], [38, -19], [43, -14], [44, 0]],
} as const;

export type BergKind = keyof typeof BERGS;

/**
 * An iceberg: dazzling white where the light catches it, cold blue in its
 * shade and down its fissures, a band of turquoise where the sea has cut a
 * notch along its waterline, and its great bulk glowing green-blue under
 * the water. `water` is its waterline.
 */
export function iceberg(t: Draw, x: number, water: number, s: number, kind: BergKind): void {
  const { pen } = t;
  const sky: Pt[] = BERGS[kind].map(([dx, dy]) => pt(x + dx * s + pen.jitter(0.6 * s), water + dy * s + (dy < 0 ? pen.jitter(0.6 * s) : 0)));
  const shape = edges([...sky, pt(sky[sky.length - 1]!.x, water + 0.5), pt(sky[0]!.x, water + 0.5)], 2);
  const xs = sky.map((p) => p.x);
  const w = Math.max(...xs) - Math.min(...xs);
  const h = water - Math.min(...sky.map((p) => p.y));
  // The bulk under the water: a broad turquoise glow below the waterline.
  glow(t, x, water + h * 0.12, w * 0.75, h * 0.2 + 3, TURQUOISE, 0.45);
  glow(t, x, water + 2, w * 0.5, 3 + h * 0.06, MELT, 0.6);
  pen.fill(shape, PAPER_FILL, 1);
  pen.fill(shape, ICE, 0.75);
  pen.clipped(shape, () => {
    // Shade away from the light, deepening in the hollows; hatched blue.
    pen.crescent(shape, pt(-w * 0.14, -h * 0.12), () => {
      pen.fill(shape, ICE_SHADE, 0.7);
      pen.hatch(shape, 1.5 + s * 0.4, 1.35, 0.35, { color: ICE_BLUE, alpha: 0.65 });
    });
    // Fissures and blue seams running down its faces from the peaks.
    for (let i = 1; i < sky.length - 1; i++) {
      const p = sky[i]!;
      if (p.y > water - h * 0.35 || pen.rng() < 0.3) continue;
      const len = (water - p.y) * (0.4 + pen.rng() * 0.45);
      const path = bezier(pt(p.x + 0.5, p.y + 1), pt(p.x + pen.jitter(2 * s), p.y + len * 0.5), pt(p.x + pen.jitter(4 * s), p.y + len), 6);
      pen.hair(path, 0.5, ICE_BLUE, 0.85);
      pen.hair(path, 0.3, t.ink, FAR * 0.35);
    }
    // A vein of clear blue ice running slantwise through it.
    const vy = water - h * (0.3 + pen.rng() * 0.25);
    pen.fill([pt(x - w, vy), pt(x + w, vy - w * 0.25), pt(x + w, vy - w * 0.25 + 1.6 * s), pt(x - w, vy + 1.6 * s)], ICE_BLUE, 0.5);
    // The wave-cut notch along the waterline.
    pen.fill([pt(x - w, water - 3 * s), pt(x + w, water - 3 * s), pt(x + w, water + 1), pt(x - w, water + 1)], TURQUOISE, 0.4);
    pen.hair([pt(x - w, water - 3 * s), pt(x + w, water - 3 * s)], 0.35, t.ink, FAR * 0.35);
  });
  pen.stroke(edges(sky, 2), 0.75, t.ink, FAR * 0.85, false);
  // Swell breaking white along its foot.
  for (let k = 0; k < w / 4; k++) {
    const fx = sky[0]!.x + pen.rng() * w;
    const fw = 2 + pen.rng() * 5 * s;
    pen.hair(bezier(pt(fx, water + 0.5), pt(fx + fw * 0.4, water - 1.5 * s), pt(fx + fw, water + 0.5), 4), 0.8, PAPER_FILL, 0.9);
  }
}

/**
 * The ice foot: the shelf of old ice still fast along the shore from x0 to
 * x1, a low white ledge at the waterline with a broken, overhanging front
 * and turquoise beneath it.
 */
export function iceFoot(t: Draw, x0: number, x1: number, water: number, h: number): void {
  const { pen } = t;
  const front: Pt[] = [];
  for (let x = x0; x <= x1; x += 3 + pen.rng() * 4) front.push(pt(x, water - h * (0.6 + pen.rng() * 0.5)));
  const ledge = [...front, pt(x1, water + 0.5), pt(x0, water + 0.5)];
  pen.fill(front.map((p) => pt(p.x, water + 0.5)).concat([...front].reverse().map((p) => pt(p.x, water + h * 1.2))), TURQUOISE, 0.35);
  pen.fill(ledge, PAPER_FILL, 1);
  pen.fill(ledge, ICE, 0.6);
  pen.fill(front.map((p) => pt(p.x, p.y + h * 0.4)).concat([...front].reverse().map((p) => pt(p.x, water + 0.5))), ICE_SHADE, 0.6);
  pen.hair(front, 0.45, t.ink, FAR * 0.6);
  pen.hair([pt(x0, water + 0.5), pt(x1, water + 0.5)], 0.8, PAPER_FILL, 0.8);
}

/**
 * A harp seal hauled out on the ice, lying side-on: silvery grey, the head
 * black, the dark harp-shaped saddle sweeping from its shoulders along its
 * flank and up over its hips, flippers lifted, a dark eye and whiskers.
 * `ground` is the ice under its belly; `dir` -1 faces it left.
 */
export function harpSeal(t: Draw, x: number, ground: number, s: number, dir: 1 | -1 = 1): void {
  const { pen } = t;
  const P = (dx: number, dy: number): Pt => pt(x + dx * s * dir, ground + dy * s);
  pen.fill(oval(x, ground + 0.5, 15 * s, 1.4, 20), ICE_BLUE, 0.35);
  const back = cub(P(-18, -5.5), P(-12, -8.5), P(-2, -10), P(8, -9.5), 12);
  const head = cub(P(8, -9.5), P(13, -10), P(16, -10.5), P(18.5, -8.6), 6);
  const belly = cub(P(16, -6.4), P(9, -2.4), P(0, 0.6), P(-12, 0), 12);
  const body = [...back, ...head.slice(1), P(19, -7.4), ...belly, ...bezier(P(-12, 0), P(-16, -1.4), P(-18, -5.5), 5).slice(1)];
  washed(t, body, HARP_COAT, 0.6, 0.6);
  pen.clipped(body, () => {
    // The harp: a dark band from the shoulders back along the flank, curving up over the hips.
    const harp = cub(P(6, -10), P(-2, -4.5), P(-10, -3.5), P(-15, -8), 12);
    pen.fill(tube(harp, 3.2 * s, 2 * s), HARP_DARK, 0.75);
    // The black head and face.
    pen.fill(oval(x + 13.5 * s * dir, ground - 8.6 * s, 6 * s, 3.4 * s, 16), HARP_DARK, 0.85);
    pen.crescent(body, pt(0, -3 * s), () => pen.hatch(body, 1.5, 1.1, 0.35, { color: t.ink, alpha: FAR * 0.35 }));
  });
  const hind = [P(-17, -5), P(-23, -8.5), P(-24.5, -6.6), P(-23.5, -4.4), P(-17, -2.6)];
  washed(t, hind, HARP_DARK, 0.6, 0.45);
  washed(t, [P(5, -3.2), P(9, -2.2), P(7.6, -1.2), P(3.4, -1.8)], HARP_COAT, 0.7, 0.4);
  pen.dot(x + 15.6 * s * dir, ground - 9.4 * s, 0.8 * s, '#111216', 0.95);
  pen.dot(x + 15.9 * s * dir, ground - 9.7 * s, 0.25 * s, PAPER_FILL, 0.9);
  for (const k of [-1, 0, 1]) pen.hair([P(18, -7.6 + k * 0.3), P(21.5, -7.8 + k * 1.1)], 0.25, PAPER_FILL, 0.7);
}

/** A whitecoat: a harp seal pup, a plump bundle of creamy fluff lying on the ice, big black eyes and nose. */
export function harpPup(t: Draw, x: number, ground: number, s: number, dir: 1 | -1 = 1): void {
  const { pen } = t;
  const P = (dx: number, dy: number): Pt => pt(x + dx * s * dir, ground + dy * s);
  pen.fill(oval(x, ground + 0.4, 9 * s, 1.1, 16), ICE_BLUE, 0.35);
  const body = [...cub(P(-10, -2), P(-8, -8), P(4, -9), P(8.5, -6), 12), ...cub(P(8.5, -6), P(10.5, -4), P(8, 0), P(2, 0), 6).slice(1), ...cub(P(2, 0), P(-4, 0.5), P(-9, 0.4), P(-10, -2), 6).slice(1)];
  washed(t, body, PUP, 0.9, 0.5, 0.8);
  pen.clipped(body, () => pen.crescent(body, pt(0, -2.5 * s), () => pen.fill(body, '#e6dcc0', 0.6)));
  // Fluff: short soft ticks round its back.
  for (let i = 1; i < 10; i++) {
    const p = body[i]!;
    pen.hair([p, pt(p.x + pen.jitter(0.8), p.y - 0.9 * s)], 0.3, t.ink, FAR * 0.4);
  }
  pen.dot(x + 6 * s * dir, ground - 5.4 * s, 0.9 * s, '#111216', 0.95);
  pen.dot(x + 6.3 * s * dir, ground - 5.7 * s, 0.3 * s, PAPER_FILL, 0.9);
  pen.dot(x + 9.2 * s * dir, ground - 4 * s, 0.55 * s, '#111216', 0.9);
  pen.hair([P(-10, -2), P(-12.5, -3.4)], 0.6 * s, t.ink, FAR * 0.5);
}
