import { createRng } from '../../logic/rng';
import { closed, type Draw, pt } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { glaze } from '../propsKit';
import { mix } from '../wash';

/**
 * Fur painting for the Barn Cat: a ginger wash rounded by light and shade,
 * tabby stripes brushed in wet, then hundreds of short pen hairs lying
 * along the coat, and a soft broken contour.
 */
export const FUR = {
  base: '#d98a43',
  deep: '#9a5124',
  stripe: '#82401a',
  light: '#f2c582',
  cream: '#f4e4c3',
  creamDeep: '#cdb08a',
  pink: '#d98f88',
  eye: '#b9bf3c',
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
 */
export function furEdge(d: Draw, shape: readonly Pt[], w: number, seed: number, every = 2): void {
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
    if (rng() > 0.45 + shade * 0.4) continue;
    const l = 1.2 + rng() * 1.4;
    pen.hair([pt(p.x - o.x * 1.2, p.y - o.y * 1.2), pt(p.x + o.x * l - o.y * 0.6, p.y + o.y * l + o.x * 0.6)], 0.4, d.ink, 0.7);
  }
}
