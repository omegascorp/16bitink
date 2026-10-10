import { bezier, type Draw, oval, pt } from '../kit';
import type { Pt } from '../pen';
import { PAPER_FILL, RED } from '../palette';
import { BACKDROP_W, edges, FAR } from './common';
import { glow } from './estuary';

/**
 * Landforms and water of the Malabar coast in the monsoon: the grey-green
 * Arabian Sea running short and choppy with whitecaps; a low far coast
 * fringed with coconut palms; a harbour breakwater of granite rubble with
 * its light on the end; the red laterite cliffs of Varkala, banded and
 * gullied by the rain, capped with green; the red-and-white striped
 * lighthouse on the headland; and the granite boulders of a sea wall.
 */
const W = BACKDROP_W;
export const SEA = '#5b847c';
export const SEA_FAR = '#8aa39f';
export const SEA_DARK = '#3f5f5c';
export const LATERITE = '#b4603c';
const LATERITE_LIT = '#d4895a';
const LATERITE_DARK = '#7a3f2a';
const CLAY = '#dcc08e';
const CAP = '#5f8a4c';
const CAP_DARK = '#3f6338';
const FAR_LAND = '#6f857a';
const FAR_PALM = '#4f6658';
const GRANITE = '#9c978d';
const GRANITE_LIT = '#c9c4b8';
const GRANITE_SHADE = '#5f5c57';
const LAMP = '#f6dd8a';

/**
 * Choppy water from y0 down to y1: short, steep crests with a dark trough
 * under each, smaller and closer far off, laid at random over exactly one
 * tile so it wraps.
 */
export function chop(t: Draw, y0: number, y1: number, n: number): void {
  const { pen } = t;
  for (let k = 0; k < n; k++) {
    const u = pen.rng() ** 1.4;
    const y = y0 + (y1 - y0) * u;
    const x = pen.rng() * W;
    const len = 4 + 16 * u + pen.rng() * 8;
    const crest = [pt(x, y), pt(x + len * 0.55, y - 0.8 - 1.4 * u), pt(x + len, y + 0.3)];
    pen.hair(crest, 0.4 + 0.5 * u, PAPER_FILL, 0.5 + 0.3 * u);
    pen.hair(crest.map((p) => pt(p.x + 1, p.y + 1 + u)), 0.35, t.ink, FAR * (0.15 + 0.25 * u));
  }
}

/** Whitecaps: little breaking crests flecked white, with a puff of spray, denser towards the viewer. */
export function whitecaps(t: Draw, y0: number, y1: number, n: number): void {
  const { pen } = t;
  for (let k = 0; k < n; k++) {
    const u = pen.rng() ** 0.9;
    const y = y0 + (y1 - y0) * u;
    const x = pen.rng() * W;
    const w = 3 + 9 * u + pen.rng() * 5;
    pen.hair(bezier(pt(x, y), pt(x + w * 0.4, y - 1.5 - u * 2), pt(x + w, y + 0.4), 5), 0.8 + 0.8 * u, PAPER_FILL, 0.9);
    pen.hair([pt(x + w * 0.2, y + 1), pt(x + w * 0.9, y + 1.3)], 0.4, t.ink, FAR * 0.3);
    if (u > 0.4 && pen.rng() < 0.4) glow(t, x + w * 0.5, y - 1.5, w * 0.6, 2.5 + u * 2, '#ffffff', 0.6);
  }
}

/** A far palm: a few px of trunk and a little burst of fronds, a faint silhouette. */
function farPalm(t: Draw, x: number, ground: number, h: number, lean: number, fade: number): void {
  const { pen } = t;
  const top = pt(x + lean * h, ground - h);
  pen.hair(bezier(pt(x, ground), pt(x + lean * h * 0.2, ground - h * 0.6), top, 4), 0.5, FAR_PALM, 0.75 * fade);
  for (const a of [-2.8, -2.2, -1.6, -1, -0.35]) {
    const len = h * (0.3 + pen.rng() * 0.12);
    pen.hair(bezier(top, pt(top.x + Math.cos(a) * len * 0.6, top.y + Math.sin(a) * len * 0.6 - 0.5), pt(top.x + Math.cos(a) * len, top.y + Math.sin(a) * len * 0.3 + len * 0.4), 4), 0.5, FAR_PALM, 0.8 * fade);
  }
}

/**
 * A low far coast seen across the water: a long hazy line of coconut
 * groves, the palms' crowns standing up all along it, a thread of pale
 * sand at its foot. Returns its height above the horizon.
 */
export function farCoast(t: Draw, x0: number, x1: number, horizon: number, h: number, fade = 1): (x: number) => number {
  const { pen } = t;
  const height = (x: number): number => {
    if (x <= x0 || x >= x1) return 0;
    const ends = Math.min(1, (x - x0) / 40) ** 0.7 * Math.min(1, (x1 - x) / 40) ** 0.7;
    return ends * (h * (0.75 + 0.25 * Math.sin(x * 0.02)) + 0.8 * Math.abs(Math.sin(x * 0.7)));
  };
  const top: Pt[] = [];
  for (let x = x0; x <= x1; x += 1.5) top.push(pt(x, horizon - height(x)));
  const shape = [...top, pt(x1, horizon + 0.5), pt(x0, horizon + 0.5)];
  pen.fill(shape, PAPER_FILL, 0.6);
  pen.fill(shape, FAR_LAND, 0.42 * fade);
  pen.fill([pt(x0 + 8, horizon - 1.2), pt(x1 - 8, horizon - 1.2), pt(x1, horizon + 0.3), pt(x0, horizon + 0.3)], CLAY, 0.6 * fade);
  for (let x = x0 + 8 + pen.rng() * 10; x < x1 - 8; x += 7 + pen.rng() * 16) farPalm(t, x, horizon - height(x) + 1.5, h * (0.7 + pen.rng() * 0.6), pen.jitter(0.25), fade);
  for (let i = 0; i + 10 < top.length; i += 14 + Math.floor(pen.rng() * 8)) pen.hair(top.slice(i, i + 10), 0.4, t.ink, FAR * 0.35 * fade);
  return height;
}

/** A granite block of rubble: a rough, faceted lump, lit on top, shaded below. */
export function boulder(t: Draw, x: number, y: number, rx: number, ry: number, fade = 1): Pt[] {
  const { pen } = t;
  const n = 7 + Math.floor(pen.rng() * 3);
  const shape = Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2 + pen.jitter(0.25);
    const r = 0.8 + pen.rng() * 0.3;
    return pt(x + Math.cos(a) * rx * r, y + Math.min(0.8, Math.sin(a)) * ry * r);
  });
  pen.fill(shape, PAPER_FILL, 1);
  pen.fill(shape, GRANITE, 0.55 * fade);
  pen.crescent(shape, pt(rx * 0.25, ry * 0.35), () => pen.fill(shape, GRANITE_LIT, 0.55 * fade));
  pen.crescent(shape, pt(-rx * 0.3, -ry * 0.4), () => {
    pen.fill(shape, GRANITE_SHADE, 0.3 * fade);
    pen.hatch(shape, Math.max(1.2, rx / 8), 1.05, 0.3, { color: t.ink, alpha: FAR * 0.4 * fade });
  });
  pen.stroke(edges(shape, 2), 0.6, t.ink, FAR * 0.9 * fade, false);
  return shape;
}

/**
 * A harbour breakwater running out from x0 to x1 along the water: a long,
 * low rubble mound of granite blocks, the swell breaking white along its
 * seaward face, and a little light tower on its end (`red` or green top).
 */
export function breakwater(t: Draw, x0: number, x1: number, water: number, h: number, s: number, red: boolean): void {
  const { pen } = t;
  const top = (x: number): number => water - h * Math.min(1, (x - x0) / (h * 3), (x1 - x) / (h * 1.5) + 0.4);
  const ridge: Pt[] = [];
  for (let x = x0; x <= x1; x += 2) ridge.push(pt(x, top(x) + pen.jitter(0.5)));
  const mound = [...ridge, pt(x1 + h * 0.6, water + 0.5), pt(x0, water + 0.5)];
  pen.fill(mound, PAPER_FILL, 1);
  pen.fill(mound, GRANITE, 0.5);
  pen.clipped(mound, () => {
    for (let x = x0; x < x1; x += 2 * s + pen.rng() * 3 * s) {
      const y = top(x) + pen.rng() * h * 0.8;
      const blk = oval(x, y, 1.6 * s, 1 * s, 6).map((p) => pt(p.x + pen.jitter(0.4), p.y + pen.jitter(0.3)));
      pen.hair(edges(blk), 0.3, t.ink, FAR * 0.45);
    }
    pen.fill([pt(x0, water - h * 0.35), pt(x1 + h, water - h * 0.35), pt(x1 + h, water + 1), pt(x0, water + 1)], GRANITE_SHADE, 0.35);
  });
  pen.hair(ridge, 0.5, t.ink, FAR * 0.8);
  for (let x = x0 + 4; x < x1; x += 6 + pen.rng() * 10) {
    if (pen.rng() < 0.4) glow(t, x, water - 1.5, 4 + pen.rng() * 6, 2.5, '#ffffff', 0.8);
    pen.hair([pt(x, water), pt(x + 3 + pen.rng() * 5, water - 0.4)], 0.8, PAPER_FILL, 0.9);
  }
  const P = (dx: number, dy: number): Pt => pt(x1 - 2 * s + dx * s, top(x1 - 2 * s) + dy * s);
  const tower = [P(-1.6, 0), P(1.6, 0), P(1.1, -9), P(-1.1, -9)];
  pen.fill(tower, PAPER_FILL, 1);
  pen.clipped(tower, () => pen.fill([P(-2, -5), P(2, -5), P(2, -9.5), P(-2, -9.5)], red ? RED : '#3f8a5a', 0.6));
  pen.hair(edges(tower), 0.35, t.ink, FAR);
  pen.fill(oval(x1 - 2 * s, top(x1 - 2 * s) - 10 * s, 0.9 * s, 0.9 * s, 8), LAMP, 0.9);
}

/**
 * The red laterite cliffs of Varkala, from x0 to x1 above `foot`: a sheer
 * face banded red over ochre over pale clay, gullied by the rain into
 * runnels and pitted all over, a green cap of scrub along the top, a dark
 * wet foot. `height(x)` is its height over the foot. Returns its top.
 */
export function lateriteCliff(t: Draw, x0: number, x1: number, foot: number, height: (x: number) => number): (x: number) => number {
  const { pen } = t;
  const top = (x: number): number => foot - height(x);
  const edge: Pt[] = [];
  for (let x = x0; x <= x1; x += 2) edge.push(pt(x, top(x) + pen.jitter(0.6)));
  const face = [...edge, pt(x1, foot + 3), pt(x0, foot + 3)];
  const below = (k: number): Pt[] => edge.map((p) => pt(p.x, p.y + (foot - p.y) * k));
  pen.fill(face, PAPER_FILL, 1);
  pen.fill(face, CLAY, 0.5);
  pen.clipped(face, () => {
    // Red laterite above, deepening into ochre, then the pale clay beds below.
    pen.fill([...edge, ...below(0.55).reverse()], LATERITE, 0.62);
    pen.fill([...below(0.4), ...below(0.7).reverse()], LATERITE_LIT, 0.45);
    // Runnels: the rain's gullies down the face, each a dark groove with a lit edge.
    for (let x = x0 + 3; x < x1 - 2; x += 4 + pen.rng() * 7) {
      const y0 = top(x) + 4 + pen.rng() * 6;
      const y1 = y0 + (foot - y0) * (0.35 + pen.rng() * 0.55);
      const groove = bezier(pt(x, y0), pt(x + pen.jitter(2), (y0 + y1) / 2), pt(x + pen.jitter(1.5), y1), 6);
      pen.hair(groove, 0.5 + pen.rng() * 0.5, LATERITE_DARK, 0.55);
      pen.hair(groove.map((p) => pt(p.x + 1, p.y)), 0.35, PAPER_FILL, 0.4);
    }
    // Bedding: broken lines running along the face.
    for (let k = 0.2; k < 0.95; k += 0.09 + pen.rng() * 0.08) {
      const line = below(k).filter((_, i) => (i + Math.floor(k * 37)) % 11 < 7);
      for (let i = 0; i + 4 < line.length; i += 6) pen.hair(line.slice(i, i + 5), 0.35, t.ink, FAR * 0.3);
    }
    pen.stipple(face, Math.round((x1 - x0) * 3), (_, y) => (y < foot - 8 ? 0.6 : 0.2), 0.4, LATERITE_DARK);
    pen.hatch(face, 1.8, 1.25, 0.35, { color: t.ink, alpha: FAR * 0.22 });
    pen.fill([pt(x0, foot - 7), pt(x1, foot - 7), pt(x1, foot + 3), pt(x0, foot + 3)], LATERITE_DARK, 0.35);
  });
  // The green cap: scrub and grass hanging over the lip.
  const cap = [...edge.map((p) => pt(p.x, p.y - 2.5 - Math.abs(Math.sin(p.x * 0.3)) * 2)), ...edge.map((p) => pt(p.x, p.y + 3 + Math.abs(Math.sin(p.x * 0.17)) * 3)).reverse()];
  pen.fill(cap, PAPER_FILL, 1);
  pen.fill(cap, CAP, 0.6);
  pen.clipped(cap, () => pen.hatch(cap, 1.4, 1.6, 0.3, { color: CAP_DARK, alpha: 0.6 }));
  for (let x = x0 + 2; x < x1; x += 3 + pen.rng() * 5) pen.hair([pt(x, top(x) + 2), pt(x + pen.jitter(1), top(x) + 5 + pen.rng() * 5)], 0.4, CAP_DARK, 0.6);
  pen.stroke(edge, 0.8, t.ink, FAR, false);
  pen.hair([pt(x1, top(x1)), pt(x1, foot)], 0.6, t.ink, FAR * 0.8);
  return top;
}

/**
 * The lighthouse on the headland: a slender round tower banded red and
 * white, a gallery with its rail, the lantern glowing under a dark domed
 * cap, and the keeper's small house at its foot.
 */
export function stripedLighthouse(t: Draw, x: number, ground: number, s: number): void {
  const { pen } = t;
  const P = (dx: number, dy: number): Pt => pt(x + dx * s, ground + dy * s);
  const H = 44;
  const house = [P(-13, 0), P(-4, 0), P(-4, -5), P(-13, -5)];
  pen.fill(house, PAPER_FILL, 1);
  pen.fill(house, '#efe8d8', 0.6);
  pen.hair(edges(house), 0.4, t.ink, FAR * 0.9);
  const roof = [P(-14, -5), P(-3, -5), P(-5, -8), P(-12, -8)];
  pen.fill(roof, LATERITE, 0.6);
  pen.hair(edges(roof), 0.4, t.ink, FAR * 0.9);
  const half = (y: number): number => 3.6 - 1.4 * (y / H);
  const tower = [P(-half(0), 0), P(half(0), 0), P(half(H), -H), P(-half(H), -H)];
  pen.fill(tower, PAPER_FILL, 1);
  pen.clipped(tower, () => {
    for (let k = 0; k < 7; k += 2) {
      const y0 = (H * k) / 7;
      const y1 = (H * (k + 1)) / 7;
      pen.fill([P(-5, -y0), P(5, -y0), P(5, -y1), P(-5, -y1)], RED, 0.55);
    }
    pen.fill([P(0.8, 0), P(5, 0), P(5, -H), P(0.6, -H)], '#5d6b85', 0.22);
  });
  pen.stroke(edges(tower), 0.55, t.ink, FAR * 1.1, false);
  pen.hair([P(-3.4, -H), P(3.4, -H)], 0.7, t.ink, FAR);
  for (const dx of [-3, -1.5, 0, 1.5, 3]) pen.hair([P(dx, -H), P(dx, -H - 1.4)], 0.3, t.ink, FAR * 0.8);
  pen.hair([P(-3.2, -H - 1.4), P(3.2, -H - 1.4)], 0.35, t.ink, FAR * 0.8);
  const lamp = [P(-1.5, -H), P(1.5, -H), P(1.5, -H - 3.2), P(-1.5, -H - 3.2)];
  glow(t, x, ground - (H + 1.6) * s, 10 * s, 6 * s, '#fff4cc', 0.6);
  pen.fill(lamp, LAMP, 0.95);
  pen.hair(edges(lamp), 0.35, t.ink, FAR);
  pen.fill([...bezier(P(-2, -H - 3.2), P(0, -H - 6.4), P(2, -H - 3.2), 6)], '#3b3f4a', 0.85);
  pen.hair([P(0, -H - 5), P(0, -H - 6.6)], 0.35, t.ink, FAR);
}
