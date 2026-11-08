import { bezier, closed, type Draw, pt, shade } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { type Blade, glaze, petalBlade } from '../propsKit';
import { mix } from '../wash';

/**
 * Paint for the Magpie: glossy blue-black plumage washed with iridescent
 * blue, green and purple, cool-shaded whites, single feathers as rounded
 * blades with a pale shaft, and a cool rim light so the black still reads
 * on a dark ground. Local units, light from the upper left.
 */
export const MAG = {
  black: '#1f2231',
  deep: '#0b0c14',
  blue: '#2f5cb4',
  green: '#26907a',
  purple: '#6f42a3',
  bronze: '#8d7f3c',
  white: '#fbf8f0',
  whiteShade: '#8f98b0',
  line: '#7483aa',
  bill: '#16171f',
  eye: '#2a1c1a',
  foot: '#2c2d36',
} as const;

/** A blade whose every point goes through `f` (mirrored, swept, turned). */
export function mapBlade(b: Blade, f: (p: Pt) => Pt): Blade {
  return { shape: b.shape.map(f), at: (t, w) => f(b.at(t, w)) };
}

/** A rounded feather from `root` along `ang`. */
export const feather = (root: Pt, ang: number, len: number, width: number): Blade => petalBlade(root, ang, len, width);

/** A cool light along the upper-left rim of a dark shape, from inside it. */
export function rimLight(d: Draw, shape: readonly Pt[], w = 1.2, alpha = 0.65): void {
  const { pen } = d;
  pen.clipped(shape, () => pen.stroke(closed(shape.map((p) => pt(p.x + 1.1, p.y + 1.5))), w, '#9fb0d8', alpha, false));
}

/** Glossy black plumage over a shape: deep base, iridescent glazes at `spots`, shadow, a soft sheen. */
export function plumage(d: Draw, shape: readonly Pt[], spots: readonly (readonly [number, number, number, string])[], line = 1.2): void {
  const { pen } = d;
  pen.fill(shape, PAPER_FILL, 1);
  pen.fill(shape, MAG.black, 0.95);
  pen.clipped(shape, () => {
    for (const [x, y, r, c] of spots) glaze(d, x, y, r, r * 0.7, 0.3, c, 0.3);
    pen.crescent(shape, pt(-2.5, -3.5), () => pen.fill(shape, MAG.deep, 0.55));
    const xs = shape.map((p) => p.x);
    const ys = shape.map((p) => p.y);
    const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    glaze(d, x0 + (x1 - x0) * 0.38, y0 + (y1 - y0) * 0.3, (x1 - x0) * 0.3, (y1 - y0) * 0.2, -0.3, '#c9d4f0', 0.09);
  });
  rimLight(d, shape);
  pen.stroke(closed(shape), line, d.ink, 1);
}

/** White plumage: paper-white, cool grey in its shadow and soft feathering. */
export function whites(d: Draw, shape: readonly Pt[], line = 1.1, hatched = false): void {
  const { pen } = d;
  pen.fill(shape, PAPER_FILL, 1);
  pen.fill(shape, MAG.white, 0.8);
  pen.clipped(shape, () => {
    pen.crescent(shape, pt(-2, -3), () => pen.fill(shape, MAG.whiteShade, 0.5));
    pen.crescent(shape, pt(-0.8, -1.2), () => pen.fill(shape, MAG.whiteShade, 0.35));
    pen.stipple(shape, 60, () => 0.4, 0.3, MAG.whiteShade);
  });
  if (hatched) shade(d, shape, 0.3);
  pen.stroke(closed(shape), line, d.ink, 0.95);
}

/** A shape's edge broken into soft scallops (feather tips), `depth` out from its centre, about `step` apart. */
export function scalloped(shape: readonly Pt[], step: number, depth: number): Pt[] {
  const cx = shape.reduce((a, p) => a + p.x, 0) / shape.length;
  const cy = shape.reduce((a, p) => a + p.y, 0) / shape.length;
  const ring = closed(shape);
  const pts: Pt[] = [];
  let carry = 0;
  for (let i = 0; i + 1 < ring.length; i++) {
    const a = ring[i]!;
    const b = ring[i + 1]!;
    const l = Math.hypot(b.x - a.x, b.y - a.y);
    for (let s = carry; s < l; s += step) pts.push(pt(a.x + ((b.x - a.x) * s) / l, a.y + ((b.y - a.y) * s) / l));
    carry = (carry - l) % step;
    if (carry < 0) carry += step;
  }
  return pts.flatMap((p, i) => {
    const q = pts[(i + 1) % pts.length]!;
    const m = pt((p.x + q.x) / 2, (p.y + q.y) / 2);
    const l = Math.hypot(m.x - cx, m.y - cy) || 1;
    return bezier(p, pt(m.x + ((m.x - cx) / l) * depth * 2, m.y + ((m.y - cy) / l) * depth * 2), q, 4).slice(0, -1);
  });
}

/** Barbs: fine strokes raked from the shaft out to the edge, `side` 1 or −1. */
function barbs(d: Draw, f: Blade, w: number, color: string, alpha: number): void {
  for (let t = 0.14; t < 0.9; t += 0.11) {
    for (const s of [1, -1]) d.pen.hair([f.at(t, 0), f.at(t + 0.08, s * w * 0.42)], 0.25, color, alpha);
  }
}

/**
 * One black feather, glossed in iridescent colours from root to tip
 * (`sheen`), its shaft and edges picked out in a cool grey.
 */
export function blackFeather(d: Draw, f: Blade, w: number, sheen: readonly string[], line = 0.7): void {
  const { pen } = d;
  pen.fill(f.shape, PAPER_FILL, 1);
  pen.fill(f.shape, MAG.black, 0.95);
  pen.clipped(f.shape, () => {
    sheen.forEach((c, i) => {
      const p = f.at((i + 0.6) / (sheen.length + 0.2), w * 0.12);
      glaze(d, p.x, p.y, w * 0.95, w * 0.6, 0, c, 0.36);
    });
    pen.crescent(f.shape, pt(-1.2, -1.6), () => pen.fill(f.shape, MAG.deep, 0.45));
    barbs(d, f, w, MAG.line, 0.3);
    pen.hair(Array.from({ length: 7 }, (_, i) => f.at(0.1 + i * 0.12, -w * 0.22)), w * 0.12, '#c9d4f0', 0.2);
    pen.hair(Array.from({ length: 8 }, (_, i) => f.at(0.15 + i * 0.11, -w * 0.44)), 0.5, '#aebde4', 0.4);
  });
  pen.hair(Array.from({ length: 7 }, (_, i) => f.at(0.02 + i * 0.14, 0)), 0.45, MAG.line, 0.75);
  pen.stroke(closed(f.shape), line, d.ink, 1, false);
  pen.hair(closed(f.shape), 0.3, MAG.line, 0.45);
}

/**
 * A primary flight feather: white inner web, black outer web on the `outer`
 * side (−1 or 1 across the blade) and a black tip, the black glossed blue.
 */
export function primary(d: Draw, f: Blade, w: number, outer: 1 | -1): void {
  const { pen } = d;
  pen.fill(f.shape, PAPER_FILL, 1);
  pen.fill(f.shape, MAG.white, 0.85);
  const ts = Array.from({ length: 11 }, (_, i) => i / 10);
  const web = [...ts.map((t) => f.at(t, 0.4 * outer)), ...[...ts].reverse().map((t) => f.at(t, outer * w))];
  const tip = [f.at(0.66, -w), f.at(0.72, 0), f.at(0.66, w), f.at(1.2, w), f.at(1.2, -w)];
  pen.clipped(f.shape, () => {
    pen.crescent(f.shape, pt(-1, -1.4), () => pen.fill(f.shape, MAG.whiteShade, 0.45));
    for (const s of [web, tip]) pen.fill(s, MAG.black, 0.95);
    const p = f.at(0.85, 0);
    glaze(d, p.x, p.y, w * 0.9, w * 0.6, 0, MAG.blue, 0.5);
    barbs(d, f, w, MAG.whiteShade, 0.35);
  });
  pen.hair(Array.from({ length: 7 }, (_, i) => f.at(0.02 + i * 0.14, 0)), 0.45, mix(MAG.line, MAG.black, 0.3), 0.8);
  pen.stroke(closed(f.shape), 0.7, d.ink, 1, false);
}

/** A white patch of overlapping feathers along a blade's midline (the scapulars), tip feathers last. */
export function whitePatch(d: Draw, b: Blade, n: number, len: number, width: number): void {
  const a0 = b.at(0, 0);
  const a1 = b.at(1, 0);
  const ang = Math.atan2(a1.y - a0.y, a1.x - a0.x);
  for (let i = n - 1; i >= 0; i--) {
    const t = i / n;
    for (const s of [0.9, -0.9]) {
      const f = feather(b.at(t * 0.78, s * (1.2 - t)), ang + s * 0.12, len * (1 - t * 0.25), width * (1 - t * 0.2));
      whites(d, f.shape, 0.6);
      barbs(d, f, width, MAG.whiteShade, 0.3);
    }
  }
}

/**
 * A loose feather drifting down, curved, its vane split in a couple of
 * places: a white one tipped black (a primary) or a glossy black one.
 */
export function looseFeather(d: Draw, c: Pt, ang: number, len: number, white: boolean): void {
  const { pen } = d;
  const w = len * 0.3;
  const root = pt(c.x - (Math.cos(ang) * len) / 2, c.y - (Math.sin(ang) * len) / 2);
  const f = petalBlade(root, ang, len, w, 0.12);
  pen.fill(f.shape.map((p) => pt(p.x + 3, p.y + 4.5)), d.ink, 0.1);
  if (white) primary(d, f, w, -1);
  else blackFeather(d, f, w, [MAG.blue, MAG.purple], 0.6);
  // Splits in the vane, and the bare quill.
  for (const [t, s] of [[0.42, 1], [0.66, -1]] as const) pen.hair([f.at(t, s * w * 0.08), f.at(t + 0.1, s * w * 0.55)], 0.6, PAPER_FILL, 0.9);
  const quill = [root, pt(root.x - Math.cos(ang - 0.2) * 3.2, root.y - Math.sin(ang - 0.2) * 3.2)];
  pen.hair([f.at(0, 0), f.at(0.95, 0)], 0.55, white ? MAG.whiteShade : MAG.line, 0.9);
  pen.hair(quill, 0.7, d.ink, 0.95);
}
