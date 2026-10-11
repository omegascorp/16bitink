import { bezier, type Draw, oval, pt } from '../kit';
import type { Pt } from '../pen';
import { PAPER_FILL, RED } from '../palette';
import { edges, FAR } from './common';
import { glow } from './estuary';

/**
 * Landforms and water of Florida's Gulf coast, Sanibel and Captiva way: a
 * long, low barrier island lying on the horizon, its fringe of mangrove,
 * pine and palm; the iron-frame lighthouse on its far point with the
 * keepers' cottages up on stilts; a channel marker; sandbars showing pale
 * through the shallows, the sun's glitter on calm green water; and the
 * pitted limestone rocks the old ship came to grief on.
 */
export const GULF = '#46a596';
export const GULF_FAR = '#79b8b4';
export const GULF_PALE = '#a9dccb';
const ISLAND = '#6e8f6b';
const ISLAND_DARK = '#4c6b52';
const BEACH = '#f6efdc';
const IRON = '#5b4a3f';
const COTTAGE = '#f3efe4';
const COTTAGE_ROOF = '#6f7d62';
const LAMP = '#f6dd8a';
const LIMESTONE = '#c4baa1';
const LIMESTONE_LIT = '#e9dfc6';
const LIMESTONE_SHADE = '#8f8673';
const WET_ROCK = '#5c584b';
const WEED = '#6f7f36';

/**
 * A palm on a far island, a few px tall: a thin trunk and a little burst
 * of fronds, all a faint silhouette.
 */
function farPalm(t: Draw, x: number, ground: number, h: number, fade: number): void {
  const { pen } = t;
  const top = pt(x + h * 0.12, ground - h);
  pen.hair(bezier(pt(x, ground), pt(x + h * 0.02, ground - h * 0.6), top, 4), 0.5, ISLAND_DARK, 0.7 * fade);
  for (const a of [-2.7, -2.1, -1.4, -0.8, -0.3]) {
    const len = h * (0.35 + pen.rng() * 0.12);
    pen.hair(bezier(top, pt(top.x + Math.cos(a) * len * 0.6, top.y + Math.sin(a) * len * 0.6 - 0.6), pt(top.x + Math.cos(a) * len, top.y + Math.sin(a) * len * 0.4 + len * 0.35), 4), 0.5, ISLAND_DARK, 0.75 * fade);
  }
}

/**
 * A barrier island far across the water: a long, low sliver of land, its
 * top scalloped by the crowns of mangrove and pine with a palm standing up
 * here and there, a thread of white beach along its foot. `fade` pales it
 * into the haze. Returns its skyline's height above the horizon.
 */
export function barrierIsland(t: Draw, x0: number, x1: number, horizon: number, h: number, fade = 1): (x: number) => number {
  const { pen } = t;
  const height = (x: number): number => {
    if (x <= x0 || x >= x1) return 0;
    const ends = Math.min(1, (x - x0) / 34) ** 0.6 * Math.min(1, (x1 - x) / 34) ** 0.6;
    const crowns = 0.9 * Math.abs(Math.sin(x * 0.83)) + 0.6 * Math.abs(Math.sin(x * 0.29 + 1.3));
    return ends * (h * (0.8 + 0.2 * Math.sin(x * 0.031)) + crowns);
  };
  const top: Pt[] = [];
  for (let x = x0; x <= x1; x += 1.5) top.push(pt(x, horizon - height(x)));
  const shape = [...top, pt(x1, horizon + 0.5), pt(x0, horizon + 0.5)];
  pen.fill(shape, PAPER_FILL, 0.7);
  pen.fill(shape, ISLAND, 0.38 * fade);
  pen.clipped(shape, () => pen.fill(top.map((p) => pt(p.x, p.y + h * 0.55)).concat([pt(x1, horizon + 1), pt(x0, horizon + 1)]), ISLAND_DARK, 0.18 * fade));
  pen.fill([pt(x0 + 6, horizon - 1.3), pt(x1 - 6, horizon - 1.3), pt(x1, horizon + 0.3), pt(x0, horizon + 0.3)], BEACH, 0.9);
  for (let x = x0 + 20 + pen.rng() * 30; x < x1 - 16; x += 36 + pen.rng() * 70) farPalm(t, x, horizon - height(x) + 1.5, h * (0.8 + pen.rng() * 0.5), fade);
  for (let i = 0; i + 10 < top.length; i += 12 + Math.floor(pen.rng() * 6)) pen.hair(top.slice(i, i + 10), 0.45, t.ink, FAR * 0.35 * fade);
  return height;
}

/** A keeper's cottage, Sanibel style: a square frame house up on posts, a deep porch all round, a pyramid roof. */
function stiltCottage(t: Draw, x: number, ground: number, s: number): void {
  const { pen } = t;
  const P = (dx: number, dy: number): Pt => pt(x + dx * s, ground + dy * s);
  for (const dx of [-4.4, -1.5, 1.5, 4.4]) pen.hair([P(dx, 0), P(dx, -3.6)], 0.4, t.ink, FAR * 0.8);
  const wall = [P(-5, -3.6), P(5, -3.6), P(5, -8.6), P(-5, -8.6)];
  pen.fill(wall, PAPER_FILL, 1);
  pen.fill(wall, COTTAGE, 0.6);
  pen.clipped(wall, () => pen.fill([P(-5, -3.6), P(5, -3.6), P(5, -5.4), P(-5, -5.4)], t.ink, FAR * 0.35));
  for (const dx of [-3.2, 0.4]) pen.fill([P(dx, -6.2), P(dx + 1.4, -6.2), P(dx + 1.4, -7.8), P(dx, -7.8)], t.ink, FAR * 0.7);
  pen.hair(edges(wall), 0.4, t.ink, FAR * 0.9);
  const roof = [P(-6.4, -8.6), P(6.4, -8.6), P(1.4, -12.2), P(-1.4, -12.2)];
  pen.fill(roof, PAPER_FILL, 1);
  pen.fill(roof, COTTAGE_ROOF, 0.6);
  pen.hair(edges(roof), 0.4, t.ink, FAR * 0.9);
}

/**
 * The lighthouse on the island's far point, Sanibel's own: a skeleton
 * tower of dark iron, four legs splayed round a slim central stair tube,
 * braced in X's, a dark watch room and gallery, the lantern glowing under
 * a conical cap; two keepers' cottages up on stilts beside it.
 */
export function ironLighthouse(t: Draw, x: number, ground: number, s: number): void {
  const { pen } = t;
  const P = (dx: number, dy: number): Pt => pt(x + dx * s, ground + dy * s);
  const H = 28;
  stiltCottage(t, x - 22 * s, ground, s * 0.9);
  stiltCottage(t, x - 11 * s, ground, s);
  const lamp = P(0, -H - 3.6);
  glow(t, lamp.x, lamp.y, 14 * s, 9 * s, '#fff4cc', 0.5);
  // Half its width at a height: the legs splay out to the foot.
  const half = (y: number): number => 5.2 - 3.6 * (y / H);
  pen.fill([P(-0.6, -3), P(0.6, -3), P(0.6, -H), P(-0.6, -H)], IRON, 0.75);
  for (const side of [-1, 1]) pen.stroke([P(side * half(0), 0), P(side * half(H), -H)], 0.6 * s, IRON, 0.9, false);
  for (let k = 1; k <= 5; k++) {
    const y0 = (H * (k - 1)) / 5;
    const y1 = (H * k) / 5;
    pen.hair([P(-half(y1), -y1), P(half(y1), -y1)], 0.35, IRON, 0.8);
    pen.hair([P(-half(y0), -y0), P(half(y1), -y1)], 0.25, IRON, 0.6);
    pen.hair([P(half(y0), -y0), P(-half(y1), -y1)], 0.25, IRON, 0.6);
  }
  const room = [P(-2.1, -H), P(2.1, -H), P(2.1, -H - 2.4), P(-2.1, -H - 2.4)];
  pen.fill(room, IRON, 0.85);
  pen.hair([P(-3, -H - 2.4), P(3, -H - 2.4)], 0.5, t.ink, FAR * 1.1);
  pen.hair([P(-3, -H - 3.4), P(3, -H - 3.4)], 0.3, t.ink, FAR * 0.8);
  const lantern = [P(-1.4, -H - 2.6), P(1.4, -H - 2.6), P(1.4, -H - 5.2), P(-1.4, -H - 5.2)];
  pen.fill(lantern, LAMP, 0.95);
  pen.hair(edges(lantern), 0.35, t.ink, FAR);
  pen.fill([P(-1.9, -H - 5.2), P(1.9, -H - 5.2), P(0, -H - 7.6)], IRON, 0.9);
  pen.dot(x, ground - (H + 7.8) * s, 0.45 * s, IRON, 0.9);
}

/** A channel marker: a piling with its day board on top, a red triangle or a green square. */
export function dayMarker(t: Draw, x: number, water: number, s: number, red: boolean): void {
  const { pen } = t;
  const P = (dx: number, dy: number): Pt => pt(x + dx * s, water + dy * s);
  pen.stroke([P(0, 1), P(0, -9)], 0.8 * s, t.ink, FAR * 0.9, false);
  const board = red ? [P(-2.4, -9), P(2.4, -9), P(0, -13.4)] : [P(-2, -9), P(2, -9), P(2, -13), P(-2, -13)];
  pen.fill(board, PAPER_FILL, 1);
  pen.fill(board, red ? RED : '#3f8a5a', 0.65);
  pen.hair(edges(board), 0.4, t.ink, FAR);
  pen.hair([P(-2, 1.2), P(2, 1.2)], 0.5, PAPER_FILL, 0.8);
}

/** The sun's glitter on calm water: short warm flecks, sparse far out, thicker towards the viewer and under the sun (`sunX`). */
export function glitter(t: Draw, x0: number, x1: number, y0: number, y1: number, n: number, sunX: number, color: string): void {
  const { pen } = t;
  for (let k = 0; k < n; k++) {
    const u = pen.rng() ** 0.8;
    const y = y0 + (y1 - y0) * u;
    // Half of them drawn into a column under the sun.
    const x = pen.rng() < 0.5 ? x0 + pen.rng() * (x1 - x0) : sunX + pen.jitter(30 + 60 * u);
    const len = 2 + u * 6 + pen.rng() * 3;
    pen.hair([pt(x, y), pt(x + len, y + pen.jitter(0.3))], 0.6 + u * 0.6, pen.rng() < 0.5 ? PAPER_FILL : color, 0.55 + u * 0.35);
  }
}

/** A sandbar showing through the shallows: a pale lens of green, rippled white along its edge. */
export function sandbar(t: Draw, x0: number, x1: number, y: number, h: number): void {
  const { pen } = t;
  const w = x1 - x0;
  const lens = oval((x0 + x1) / 2, y, w / 2, h / 2, 28).map((p) => pt(p.x + pen.jitter(1.5), p.y + pen.jitter(0.4)));
  pen.fill(lens, GULF_PALE, 0.4);
  pen.fill(oval((x0 + x1) / 2, y + h * 0.1, w * 0.36, h * 0.28, 20), '#e3eed6', 0.3);
  for (let x = x0 + w * 0.1; x < x1 - w * 0.1; x += 8 + pen.rng() * 14) {
    const yy = y - h * 0.4 * Math.sqrt(Math.max(0, 1 - ((x - (x0 + x1) / 2) / (w / 2)) ** 2)) + pen.jitter(0.4);
    pen.hair([pt(x, yy), pt(x + 4 + pen.rng() * 6, yy + pen.jitter(0.3))], 0.5, PAPER_FILL, 0.6);
  }
}

/**
 * Gulf limestone washed by the sea: a pale, warm rock, pitted all over
 * with solution holes, its shade side hatched; at the waterline a dark wet
 * band crusted with barnacles and fringed with weed. `water` is the sea's
 * level against it.
 */
export function limestone(t: Draw, shape: readonly Pt[], water: number, fade = 1): void {
  const { pen } = t;
  const xs = shape.map((p) => p.x);
  const ys = shape.map((p) => p.y);
  const [x0, x1, y0] = [Math.min(...xs), Math.max(...xs), Math.min(...ys)];
  const size = Math.max(x1 - x0, Math.max(...ys) - y0);
  pen.fill(shape, PAPER_FILL, 1);
  pen.fill(shape, LIMESTONE, 0.6 * fade);
  pen.crescent(shape, pt(size * 0.1, size * 0.16), () => pen.fill(shape, LIMESTONE_LIT, 0.5 * fade));
  pen.crescent(shape, pt(-size * 0.14, -size * 0.2), () => {
    pen.fill(shape, LIMESTONE_SHADE, 0.32 * fade);
    pen.hatch(shape, Math.max(1.4, size / 45), 1.05, 0.35, { color: t.ink, alpha: FAR * 0.4 * fade });
  });
  pen.clipped(shape, () => {
    // Solution holes: little dark pits, each with a lit lower lip.
    for (let k = 0; k < size * 0.6; k++) {
      const px = x0 + pen.rng() * (x1 - x0);
      const py = y0 + pen.rng() * (water - y0);
      const r = 0.4 + pen.rng() * 0.9;
      const pit = oval(px, py, r * (1 + pen.rng()), r * 0.6, 7).map((p) => pt(p.x + pen.jitter(0.3), p.y + pen.jitter(0.3)));
      pen.fill(pit, WET_ROCK, 0.5 * fade);
      if (pen.rng() < 0.5) pen.hair(pit.slice(0, 4), 0.25, PAPER_FILL, 0.6 * fade);
    }
    // Ledges: the rock's bedding, broken lines running along it.
    for (let y = y0 + 4 + pen.rng() * 4; y < water - 6; y += 4 + pen.rng() * 5) {
      const a = x0 + pen.rng() * (x1 - x0) * 0.5;
      pen.hair([pt(a, y), pt(a + (x1 - x0) * (0.2 + pen.rng() * 0.4), y + pen.jitter(1.2))], 0.4, t.ink, FAR * 0.45 * fade);
    }
    pen.fill([pt(x0 - 2, water - 6), pt(x1 + 2, water - 6), pt(x1 + 2, water + 3), pt(x0 - 2, water + 3)], WET_ROCK, 0.4 * fade);
    for (let x = x0; x < x1; x += 1.2 + pen.rng() * 2) {
      pen.dot(x + pen.jitter(0.5), water - 3.5 - pen.rng() * 2.5, 0.4 + pen.rng() * 0.3, PAPER_FILL, 0.7 * fade);
      if (pen.rng() < 0.5) pen.hair([pt(x, water - 2 - pen.rng() * 2), pt(x + pen.jitter(0.8), water + 0.5)], 0.6, WEED, 0.7 * fade);
    }
  });
  pen.stroke(edges(shape, 3), 0.85, t.ink, FAR * fade, false);
}

/**
 * The outline of a limestone ledge from `x` - w/2 to `x` + w/2, standing
 * `h` above the water: a low, flat-topped, blocky mass, its top broken
 * into steps and notches, its sides undercut by the sea.
 */
export function ledge(t: Draw, x: number, w: number, h: number, water: number): Pt[] {
  const { pen } = t;
  const n = Math.max(4, Math.round(w / 7));
  const top: Pt[] = [pt(x - w / 2 - 2, water + 3), pt(x - w / 2 + 1, water - h * 0.3)];
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    const env = Math.sin(Math.PI * (0.1 + u * 0.8)) ** 0.35;
    const y = water - h * env * (0.78 + pen.rng() * 0.22);
    const xx = x - w / 2 + 3 + (w - 6) * u;
    top.push(pt(xx - 1.5, y + (pen.rng() < 0.35 ? h * 0.12 : 0)), pt(xx + 1.5, y));
  }
  top.push(pt(x + w / 2 - 1, water - h * 0.35), pt(x + w / 2 + 2, water + 3));
  return top;
}
