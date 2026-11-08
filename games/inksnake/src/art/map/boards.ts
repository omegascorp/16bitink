import { createRng } from '../../logic/rng';
import { closed, pt } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { mix } from '../wash';
import { boxPts, type Brush } from './brush';

/** A chapter's name board, world px, centred on the region's `sign` point (the map's sign text sits on it). */
export const SIGN_BOARD = { w: 300, h: 74 } as const;

const WOOD = '#c49a66';
const POST = '#8f6a44';

/** Clips a polygon's corners by `k` px, so a board reads as cut timber. */
function chamfer(poly: readonly Pt[], k: number): Pt[] {
  const xs = poly.map((p) => p.x);
  const ys = poly.map((p) => p.y);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  return poly.map((p) => {
    const dx = Math.min(p.x - x0, x1 - p.x);
    const dy = Math.min(p.y - y0, y1 - p.y);
    if (dx + dy >= k) return p;
    const sx = p.x - x0 < x1 - p.x ? 1 : -1;
    const sy = p.y - y0 < y1 - p.y ? 1 : -1;
    const t = (k - dx - dy) / 2;
    return pt(p.x + sx * t, p.y + sy * t);
  });
}

/**
 * The chapter's name board on two stout posts: weathered planks with grain
 * only near their edges, so the middle stays plain and light for the
 * lettering the game writes on it, nail heads in the corners, a shadow on
 * the ground. Pencilled for a draft.
 */
export function nameBoard(b: Brush, c: Pt): void {
  const { pen } = b;
  const { w, h } = SIGN_BOARD;
  const rng = createRng(pen.rng() * 1e9);
  const shape = chamfer(boxPts(c.x - w / 2, c.y - h / 2, c.x + w / 2, c.y + h / 2, 14), 6);
  for (const side of [-1, 1]) {
    const x = c.x + side * (w / 2 - 50);
    const post = boxPts(x - 7, c.y - h / 2 - 14, x + 7, c.y + h / 2 + 24, 8);
    b.cast(boxPts(x - 6, c.y + h / 2 + 16, x + 10, c.y + h / 2 + 26, 6), 5, 0.14);
    b.body(post, POST, 0.65);
    b.shade(post, 5, b.deep(POST, 0.3), 0.3);
    b.edge(post, 0.8, 0.8);
    const cap = boxPts(x - 9, c.y - h / 2 - 18, x + 9, c.y - h / 2 - 12, 8);
    b.body(cap, mix(POST, b.d.ink, 0.3), 0.7);
    b.edge(cap, 0.7, 0.8);
  }
  b.cast(shape, 10, 0.13);
  if (b.draft) {
    pen.fill(shape, PAPER_FILL, 0.92);
    b.done = 1;
    b.edge(shape, 1, 0.75);
    pen.crescent(shape, pt(-5, -7), () => b.hatch(shape, 3.2, 0.9, 0.38));
    b.dot(c.x - w / 2 + 10, c.y - h / 2 + 10, 1.6, b.ink, 0.7);
    b.dot(c.x + w / 2 - 10, c.y - h / 2 + 10, 1.6, b.ink, 0.7);
    return;
  }
  pen.fill(shape, PAPER_FILL, 1);
  pen.fill(shape, WOOD, 0.38);
  // Two planks: their seam, grain near the top and bottom edges only.
  pen.hair([pt(c.x - w / 2 + 3, c.y + 1), pt(c.x, c.y + 1.5), pt(c.x + w / 2 - 3, c.y + 1)], 0.5, mix(WOOD, b.d.ink, 0.5), 0.25);
  for (const [y0, y1] of [[c.y - h / 2 + 4, c.y - h / 2 + 13], [c.y + h / 2 - 13, c.y + h / 2 - 4]] as const) {
    for (let i = 0; i < 4; i++) {
      const y = y0 + rng() * (y1 - y0);
      const x0 = c.x - w / 2 + 10 + rng() * 70;
      const x1 = c.x + w / 2 - 10 - rng() * 70;
      pen.hair([pt(x0, y), pt((x0 + x1) / 2, y + (rng() - 0.5) * 2), pt(x1, y + (rng() - 0.5) * 2)], 0.4, mix(WOOD, b.d.ink, 0.5), 0.35);
    }
  }
  // A knot at one end, well clear of the lettering.
  const kx = c.x + (rng() < 0.5 ? -1 : 1) * (w / 2 - 26);
  pen.hair(closed(boxPts(kx - 5, c.y + h / 2 - 12, kx + 5, c.y + h / 2 - 7, 3)), 0.45, mix(WOOD, b.d.ink, 0.5), 0.5);
  pen.fill(chamfer(boxPts(c.x - w / 2 + 18, c.y - h / 2 + 15, c.x + w / 2 - 18, c.y + h / 2 - 15, 20), 8), PAPER_FILL, 0.32);
  pen.crescent(shape, pt(-4, -6), () => pen.fill(shape, mix(WOOD, b.d.ink, 0.45), 0.42));
  for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) pen.dot(c.x + sx * (w / 2 - 10), c.y + sy * (h / 2 - 10), 1.6, b.d.ink, 0.75);
  pen.stroke(closed(shape), 1.3, b.d.ink, 0.9);
}
