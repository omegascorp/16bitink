import { createRng } from '../../logic/rng';
import { closed, type Draw, pt } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { mix } from '../wash';
import { glaze } from './tomcatKit';

/**
 * Fur painting for the Old Tomcat, after InkGecko's barn cat: a grey-brown
 * wash rounded by light and shade, mackerel stripes brushed in wet, then
 * hundreds of short pen hairs lying along the coat, and a soft broken
 * contour that bristles when his fur stands on end.
 */
export const FUR = {
  base: '#9a8f7b',
  deep: '#574e43',
  stripe: '#2a2520',
  light: '#d9cfb9',
  white: '#f7f2e7',
  whiteDeep: '#bdb4a3',
  pink: '#c4837b',
  pad: '#b56c67',
  eye: '#d9a636',
  eyeDeep: '#8f5d18',
  scar: '#ecc9bc',
  warm: '#8a6a45',
  cool: '#7d8288',
} as const;

/** Paper, the wash, and its shadow crescent away from the light. */
export function wash(d: Draw, shape: readonly Pt[], color: string, shift: Pt, deep = 0.5): void {
  const { pen } = d;
  pen.fill(shape, PAPER_FILL, 1);
  pen.fill(shape, color, 0.93);
  pen.clipped(shape, () => pen.crescent(shape, shift, () => pen.fill(shape, mix(color, FUR.deep, 0.55), deep)));
}

/** How a part's fur lies at a point (an angle) and what colour a hair there is. */
export interface Coat {
  readonly dir: (p: Pt) => number;
  readonly color: (p: Pt, r: number) => string;
}

/** Short hairs over a part, lying along its coat; `len` long, `n` of them. */
export function hairs(d: Draw, shape: readonly Pt[], coat: Coat, n: number, seed: number, len: number, w = 0.42): void {
  const { pen } = d;
  const rng = createRng(seed);
  const xs = shape.map((p) => p.x);
  const ys = shape.map((p) => p.y);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  pen.clipped(shape, () => {
    for (let i = 0; i < n; i++) {
      const p = pt(x0 + rng() * (x1 - x0), y0 + rng() * (y1 - y0));
      const a = coat.dir(p) + (rng() - 0.5) * 0.35;
      const l = len * (0.7 + rng() * 0.6);
      const q = pt(p.x + Math.cos(a) * l, p.y + Math.sin(a) * l);
      const m = pt((p.x + q.x) / 2 + Math.cos(a + 1.57) * l * 0.08, (p.y + q.y) / 2 + Math.sin(a + 1.57) * l * 0.08);
      pen.hair([p, m, q], w, coat.color(p, rng()), 0.75);
    }
  });
}

/** Volume over the fur: lit at the upper left, deepening at the lower right. */
export function model(d: Draw, shape: readonly Pt[], c: Pt, rx: number, ry: number, shift: Pt): void {
  const { pen } = d;
  pen.clipped(shape, () => {
    glaze(d, c.x - rx * 0.25, c.y - ry * 0.35, rx * 0.8, ry * 0.6, 0, FUR.light, 0.35);
    pen.crescent(shape, shift, () => pen.fill(shape, FUR.deep, 0.32));
  });
}

/**
 * A furry contour: a fine pen line round the part, with small hairs
 * flicking out across it so the edge reads soft, more on the shadow side.
 * `bristle` above 1 lengthens and multiplies them: fur standing on end.
 */
export function furEdge(d: Draw, shape: readonly Pt[], w: number, seed: number, every = 2, bristle = 1): void {
  const { pen } = d;
  pen.stroke(closed(shape), w, d.ink, 0.85);
  const rng = createRng(seed);
  const n = shape.length;
  let cx = 0;
  let cy = 0;
  for (const p of shape) {
    cx += p.x / n;
    cy += p.y / n;
  }
  for (let i = 0; i < n; i += every) {
    const p = shape[i]!;
    const r = Math.hypot(p.x - cx, p.y - cy) || 1;
    const o = pt((p.x - cx) / r, (p.y - cy) / r);
    const shade = o.x * 0.55 + o.y * 0.84;
    if (rng() > 0.45 + shade * 0.4 + (bristle - 1) * 0.3) continue;
    const l = (1.2 + rng() * 1.4) * bristle;
    pen.hair([pt(p.x - o.x * 1.2, p.y - o.y * 1.2), pt(p.x + o.x * l - o.y * 0.6, p.y + o.y * l + o.x * 0.6)], 0.4, d.ink, 0.7);
  }
}

/**
 * A stripe brushed in fur: short hairs in `color` scattered within w/2 of
 * the curve (a few strays further out), each lying along the coat, so the
 * stripe's edges stay hairy instead of hard. `density` is hairs per unit².
 */
export function furStripe(d: Draw, curve: readonly Pt[], w: number, color: string, dir: (p: Pt) => number, seed: number, density = 1.5, len = 2.4, alpha = 0.8): void {
  const { pen } = d;
  const rng = createRng(seed);
  for (let i = 0; i < curve.length - 1; i++) {
    const a = curve[i]!;
    const b = curve[i + 1]!;
    const seg = Math.hypot(b.x - a.x, b.y - a.y);
    if (seg < 1e-6) continue;
    const nrm = pt(-(b.y - a.y) / seg, (b.x - a.x) / seg);
    const count = Math.ceil(seg * w * density);
    for (let k = 0; k < count; k++) {
      const t = rng();
      const off = (rng() - 0.5) * w * (rng() < 0.25 ? 1.6 : 1);
      const p = pt(a.x + (b.x - a.x) * t + nrm.x * off, a.y + (b.y - a.y) * t + nrm.y * off);
      const ang = dir(p) + (rng() - 0.5) * 0.4;
      const l = len * (0.6 + rng() * 0.7);
      const u = pt(Math.cos(ang) * l * 0.5, Math.sin(ang) * l * 0.5);
      pen.hair([pt(p.x - u.x, p.y - u.y), pt(p.x + u.x, p.y + u.y)], 0.45, color, alpha * (0.7 + rng() * 0.3));
    }
  }
}
