import { bezier, cub, type Draw, lerp, oval, pt } from '../kit';
import type { Pt } from '../pen';
import { PAPER_FILL, RED } from '../palette';
import { figure, wash } from './boats';
import { edges, FAR } from './common';
import { reflection } from './water';

/**
 * The boats of a Kerala fishing harbour: the vallam, a long plank-built
 * open boat with high upswept ends, painted in bright bands, worked by a
 * crew with an outboard on a bracket at the stern; and a small wooden
 * trawler with her wheelhouse aft, a mast forward and bunting strung from
 * it. All face right; `s` scales them.
 */
export interface Bands {
  readonly top: string;
  readonly stripe: string;
  readonly mid: string;
  readonly bottom: string;
}

export const VALLAM_BLUE: Bands = { top: '#f1ece0', stripe: RED, mid: '#2f6fb0', bottom: '#3f4a5c' };
export const VALLAM_GREEN: Bands = { top: '#e9c74a', stripe: '#2f6fb0', mid: '#3f8f5a', bottom: '#5a4a3a' };
export const VALLAM_RED: Bands = { top: '#2f6fb0', stripe: '#f1ece0', mid: RED, bottom: '#3f4a5c' };
const NET_HEAP = '#3f7f8a';
const ENGINE = '#8f979c';
const TEAK = '#9b7a52';
const HULL_WHITE = '#f4f1ea';
const BUNTING = ['#c4423a', '#e9c74a', '#3f8f5a', '#2f6fb0', '#e8823a'];

/** A shape on paper under a wash, its edge inked. */
function washed(t: Draw, shape: readonly Pt[], color: string, alpha: number, w = 0.5, ink = 1): void {
  t.pen.fill(shape, PAPER_FILL, 1);
  t.pen.fill(shape, color, alpha);
  t.pen.stroke(edges(shape, 2), w, t.ink, FAR * ink, false);
}

/**
 * A vallam's hull, local to `P` (the keel's foot at y 0, bow right): a low
 * waist sweeping up to tall pointed ends, painted in bands following the
 * sheer, the seams of its planks showing. Returns the sheer line.
 */
export function vallamHull(t: Draw, P: (dx: number, dy: number) => Pt, bands: Bands, s: number): Pt[] {
  const { pen } = t;
  const sheer = cub(P(-30, -15), P(-20, -4), P(14, -4), P(33, -19), 18);
  const keel = cub(P(22, 0), P(10, 1.6), P(-14, 1.6), P(-22, 0), 18);
  const hull = [...sheer, ...cub(P(33, -19), P(31.5, -10), P(28, -3), P(22, 0), 6).slice(1), ...keel.slice(1), ...cub(P(-22, 0), P(-26.5, -3), P(-29.5, -9), P(-30, -15), 6).slice(1)];
  const strake = (k: number): Pt[] => sheer.map((p, i) => lerp(p, keel[keel.length - 1 - i]!, k));
  const between = (a: number, b: number): Pt[] => [...strake(a), ...[...strake(b)].reverse()];
  pen.fill(hull, PAPER_FILL, 1);
  pen.fill(hull, bands.bottom, 0.5);
  pen.clipped(hull, () => {
    pen.fill(between(-0.2, 0.2), bands.top, 0.7);
    pen.fill(between(0.2, 0.3), bands.stripe, 0.65);
    pen.fill(between(0.3, 0.68), bands.mid, 0.6);
    for (const k of [0.2, 0.3, 0.45, 0.68, 0.84]) pen.hair(strake(k), 0.35, t.ink, FAR * 0.55);
    // Rows of stitching and butt joints along the planks.
    for (let i = 3; i < sheer.length - 3; i += 2) {
      const a = lerp(sheer[i]!, keel[keel.length - 1 - i]!, 0.5 + (i % 3) * 0.1);
      pen.hair([a, pt(a.x + 0.2, a.y + 1.6 * s)], 0.3, t.ink, FAR * 0.5);
    }
    pen.hatch(hull, 1.5, 0.35, 0.35, { color: t.ink, alpha: FAR * 0.45, onlyBelow: P(0, -2.2).y });
  });
  pen.hair(sheer.map((p) => pt(p.x, p.y + 0.9 * s)), 0.7 * s, '#4f3a28', 0.55);
  pen.stroke(edges(hull), 0.9 * s, t.ink, FAR * 1.1, false);
  // The pointed tips: a little carved finial standing off each end.
  pen.stroke(bezier(P(33, -19), P(34.5, -21), P(36, -21), 4), 0.9 * s, t.ink, FAR, false);
  pen.stroke(bezier(P(-30, -15), P(-31, -17), P(-32.5, -17.5), 4), 0.9 * s, t.ink, FAR, false);
  return sheer;
}

/** A heap of nylon net piled in a boat or on the sand, showing over a line (`rim`). */
export function netPile(t: Draw, x: number, rim: number, w: number, h: number, color = NET_HEAP): void {
  const { pen } = t;
  const top: Pt[] = [];
  for (let k = 0; k <= 10; k++) {
    const u = k / 10;
    top.push(pt(x - w / 2 + w * u, rim - h * Math.sin(Math.PI * u) ** 0.7 * (0.8 + pen.rng() * 0.3)));
  }
  const shape = [...top, pt(x + w / 2, rim + 1), pt(x - w / 2, rim + 1)];
  washed(t, shape, color, 0.6, 0.4, 0.8);
  pen.clipped(shape, () => {
    for (let k = 0; k < w * 0.6; k++) {
      const a = pt(x - w / 2 + pen.rng() * w, rim - pen.rng() * h);
      pen.hair(bezier(a, pt(a.x + pen.jitter(3), a.y - 1.5), pt(a.x + pen.jitter(4), a.y + pen.jitter(1)), 4), 0.3, t.ink, FAR * 0.45);
    }
  });
}

/**
 * A vallam under way: the banded hull, a heap of net amidships, the crew
 * standing and sitting, and an outboard on its bracket over the stern
 * quarter, its leg down in the water.
 */
export function vallam(t: Draw, x: number, water: number, s: number): void {
  const P = (dx: number, dy: number): Pt => pt(x + dx * s, water + dy * s);
  reflection(t, x, water + 1, 56 * s, 10 * s, '#2f6fb0', 0.3);
  // The outboard: a cowl on its bracket, the leg raked down into the water behind the stern.
  t.pen.stroke([P(-23, -8), P(-29, 2)], 0.8 * s, t.ink, FAR, false);
  washed(t, [P(-26.5, -9), P(-21.5, -9.4), P(-21, -13.2), P(-25.4, -13.6)], ENGINE, 0.6, 0.45);
  netPile(t, x + 2 * s, water - 4.6 * s, 18 * s, 5 * s);
  figure(t, x - 17 * s, water - 5 * s, s * 1.2, '#e9dcc0', false);
  figure(t, x - 6 * s, water - 4.5 * s, s * 1.2, '#d9876b', true);
  figure(t, x + 9 * s, water - 4.5 * s, s * 1.2, '#7fa4c4', false);
  figure(t, x + 17 * s, water - 5.5 * s, s * 1.2, '#e3b23c', true);
  vallamHull(t, P, VALLAM_BLUE, s);
  wash(t, P(23, 0), P(-22, 0), s);
}

/**
 * A vallam drawn up on the sand: the hull resting on a log roller, tipped
 * a little, net heaped inside and showing over the gunwale.
 */
export function beachedVallam(t: Draw, x: number, ground: number, s: number, bands: Bands, tilt: number): void {
  const { pen } = t;
  const c = Math.cos(tilt);
  const sn = Math.sin(tilt);
  const P = (dx: number, dy: number): Pt => pt(x + (dx * c - dy * sn) * s, ground - 1.5 * s + (dx * sn + dy * c) * s);
  pen.fill(oval(x, ground + 1, 30 * s, 3 * s, 24), t.ink, 0.1);
  netPile(t, x + 3 * s, P(3, -4.6).y, 26 * s, 5 * s);
  vallamHull(t, P, bands, s);
  const roller = oval(x - 6 * s, ground - 1.2 * s, 2 * s, 1.8 * s, 12);
  washed(t, roller, TEAK, 0.7, 0.45);
  pen.hair([pt(x - 6 * s - 6 * s, ground + 0.4), pt(x - 6 * s + 6 * s, ground + 0.4)], 0.4, t.ink, FAR * 0.5);
}

/**
 * A small Kerala trawler: a wooden hull painted blue over white over red,
 * the bow standing high, the wheelhouse aft with a lamp mast on it, a mast
 * forward with its derrick, nets heaped on deck, and a string of bunting
 * from the masthead to the stem and down to the wheelhouse.
 */
export function keralaTrawler(t: Draw, x: number, water: number, s: number): void {
  const { pen } = t;
  const P = (dx: number, dy: number): Pt => pt(x + dx * s, water + dy * s);
  reflection(t, x, water + 0.5, 46 * s, 7 * s, '#3f6fa0', 0.3);
  const head = P(7, -36);
  pen.stroke([P(7, -6), head], 0.9 * s, t.ink, FAR, false);
  pen.hair([P(4, -30), P(10, -30)], 0.5, t.ink, FAR);
  pen.stroke([P(7, -10), P(-6, -24)], 0.6 * s, t.ink, FAR * 0.9, false);
  pen.hair([head, P(-6, -24)], 0.3, t.ink, FAR * 0.6);
  // Bunting: little flags strung from the masthead forward to the stem and aft to the wheelhouse.
  for (const end of [P(24, -14), P(-14, -21)]) {
    const line = bezier(head, pt((head.x + end.x) / 2, (head.y + end.y) / 2 + 3 * s), end, 10);
    pen.hair(line, 0.3, t.ink, FAR * 0.6);
    for (let k = 1; k < line.length - 1; k++) {
      const p = line[k]!;
      pen.fill([p, pt(p.x + 1.4 * s, p.y), pt(p.x + 0.7 * s, p.y + 2 * s)], BUNTING[k % BUNTING.length]!, 0.8);
    }
  }
  netPile(t, x - 2 * s, water - 6 * s, 12 * s, 4 * s, '#4f8f6a');
  // The wheelhouse aft, windows round it, a lamp mast on its roof.
  const house = [P(-21, -6), P(-9, -6), P(-9.4, -17), P(-20.6, -17)];
  washed(t, house, HULL_WHITE, 0.8, 0.5);
  for (const dx of [-19, -15.5, -12]) pen.fill([P(dx, -12), P(dx + 2.4, -12), P(dx + 2.4, -15), P(dx, -15)], t.ink, FAR * 0.7);
  washed(t, [P(-22, -17), P(-8, -17), P(-8.6, -18.6), P(-21.4, -18.6)], '#2f6fb0', 0.6, 0.45);
  pen.hair([P(-14, -18.6), P(-14, -23)], 0.45, t.ink, FAR);
  figure(t, x + 1 * s, water - 6 * s, s * 0.85, '#e3b23c', false);
  // The hull: the sheer rising to a high bow, painted bands, a rubbing strake.
  const sheer = bezier(P(-26, -6.5), P(0, -5.5), P(25, -14), 12);
  const hull = [...sheer, ...bezier(P(25, -14), P(23, -4), P(17, 0), 6).slice(1), P(-22, 0), P(-26.5, -2.6)];
  pen.fill(hull, PAPER_FILL, 1);
  pen.fill(hull, HULL_WHITE, 0.8);
  pen.clipped(hull, () => {
    pen.fill([...sheer, ...[...sheer].reverse().map((p) => pt(p.x, p.y + 3 * s))], '#2f6fb0', 0.6);
    pen.fill([P(-30, -1.6), P(30, -1.6), P(30, 1), P(-30, 1)], RED, 0.45);
    pen.hair(sheer.map((p) => pt(p.x, p.y + 3.4 * s)), 0.4, t.ink, FAR * 0.5);
    pen.hatch(hull, 1.5, 0.3, 0.35, { color: t.ink, alpha: FAR * 0.4, onlyBelow: water - 2.5 * s });
  });
  pen.stroke(edges(hull), 0.75 * s, t.ink, FAR * 1.1, false);
  wash(t, P(23, 0), P(-24, 0), s * 0.8);
}
