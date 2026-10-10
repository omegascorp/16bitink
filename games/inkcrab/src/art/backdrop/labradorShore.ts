import { bezier, closed, cub, type Draw, oval, pt, tube } from '../kit';
import type { Pt } from '../pen';
import { PAPER_FILL } from '../palette';
import { edges, FAR } from './common';
import { ICE, ICE_BLUE, ICE_SHADE, TURQUOISE } from './packIce';

/**
 * What lies on a Labrador storm beach in spring: the shingle ridge itself,
 * rounded pebbles and cobbles of grey granite, ochre sandstone, slate and
 * white quartz; snow drifted into the lee of the boulders, carved smooth by
 * the wind; lyme grass, last year's straw bent flat by the wind; wooden lath
 * lobster pots and their buoys; a dory turned turtle on the ridge for the
 * winter; and blocks of sea ice the tide has stranded on the stones.
 */
export const PEBBLES = ['#9b9b96', '#5f6b75', '#b9965a', '#cfc9bb', '#8f6a50', '#7d8a96', '#4f5358', '#e6e2d6', '#a8a08c'];
export const SHINGLE = '#a9a69c';
export const SHINGLE_DARK = '#6f6c66';
const SNOW = '#fbfdfd';
const SNOW_SHADE = '#bccfdc';
const LYME = '#8fa79a';
const STRAW = '#cfb987';
const LATH = '#b39f7e';
const LATH_DARK = '#6f6556';
const NET_HEAD = '#c9c96a';
const DORY = '#c4553a';
const DORY_RAIL = '#d9b56a';

/** A shape on paper under a wash, its edge inked. */
function washed(t: Draw, shape: readonly Pt[], color: string, alpha: number, w = 0.5, ink = 1): void {
  t.pen.fill(shape, PAPER_FILL, 1);
  t.pen.fill(shape, color, alpha);
  t.pen.stroke(edges(shape, 2), w, t.ink, FAR * ink, false);
}

/** One beach stone worn round: a flattened oval, lit along its top, a shadow under it, its outline inked. */
export function cobble(t: Draw, x: number, y: number, rx: number, ry: number, color: string, ink = 1): void {
  const { pen } = t;
  const stone = oval(x, y, rx, ry, 12).map((p) => pt(p.x + pen.jitter(rx * 0.06), p.y + pen.jitter(ry * 0.06)));
  pen.fill(oval(x + rx * 0.2, y + ry * 0.7, rx * 0.95, ry * 0.35, 10), t.ink, 0.12);
  pen.fill(stone, PAPER_FILL, 1);
  pen.fill(stone, color, 0.68);
  pen.fill(stone.slice(1, 6).map((p) => pt(p.x, p.y - ry * 0.35)).concat(stone.slice(1, 6).reverse()), t.ink, 0.1);
  pen.hair(stone.slice(7, 11).map((p) => pt(x + (p.x - x) * 0.7, y + (p.y - y) * 0.6)), 0.4, PAPER_FILL, 0.75);
  if (ink > 0) pen.hair(closed(stone), 0.4, t.ink, FAR * 0.7 * ink);
}

/**
 * Shingle from x0 to x1: `n` pebbles strewn from the line `top(x)` down
 * `depth`, laid back to front so the nearer ones overlap, bigger ones up
 * on the crest where the storms threw them. They stay inside x0..x1.
 */
export function shingle(t: Draw, x0: number, x1: number, top: (x: number) => number, depth: number, n: number, size = 1): void {
  const { pen } = t;
  const stones = Array.from({ length: n }, () => {
    const u = pen.rng();
    const r = (1.2 + pen.rng() * 2.4 + (u < 0.3 ? pen.rng() * 2 : 0)) * size;
    const x = x0 + r + pen.rng() * (x1 - x0 - r * 2);
    return { x, y: top(x) + u * depth, r, c: PEBBLES[Math.floor(pen.rng() * PEBBLES.length)]! };
  }).sort((a, b) => a.y - b.y);
  for (const s of stones) cobble(t, s.x, s.y, s.r * (1.1 + pen.rng() * 0.4), s.r * (0.6 + pen.rng() * 0.25), s.c, s.r > 1.8 * size ? 1 : 0.5);
}

/**
 * The storm ridge: a long bank of shingle the winter seas have thrown up
 * at the back of the beach, from x0 to x1, standing `h` above the beach
 * (`ground`) at its crest, its face strewn with stones that break its
 * skyline, snow lying in the hollows of its back. Returns its crest.
 */
export function stormRidge(t: Draw, x0: number, x1: number, ground: (x: number) => number, h: number): (x: number) => number {
  const { pen } = t;
  const crest = (x: number): number => {
    const u = (x - x0) / (x1 - x0);
    if (u <= 0 || u >= 1) return ground(x);
    return ground(x) - h * Math.sin(Math.PI * u) ** 0.6 * (0.85 + 0.15 * Math.sin(u * 13));
  };
  const edge: Pt[] = [];
  for (let x = x0; x <= x1; x += 4) edge.push(pt(x, crest(x)));
  const shape = [...edge, pt(x1, ground(x1) + 4), pt(x0, ground(x0) + 4)];
  pen.fill(shape, PAPER_FILL, 1);
  pen.fill(shape, SHINGLE, 0.55);
  pen.stipple(shape, Math.round((x1 - x0) * h * 0.12), () => 0.6, 0.4, SHINGLE_DARK);
  pen.clipped(shape, () => {
    pen.hatch(shape, 1.8, 1.15, 0.35, { color: t.ink, alpha: FAR * 0.25, onlyBelow: Math.min(...edge.map((p) => p.y)) + h * 0.55 });
    // Snow lying in the hollows along its back.
    for (let x = x0 + 20; x < x1 - 20; x += 30 + pen.rng() * 40) {
      const y = crest(x) + 3 + pen.rng() * h * 0.3;
      const w = 10 + pen.rng() * 24;
      pen.fill(oval(x, y, w, 1.6 + pen.rng() * 2, 12).map((p) => pt(p.x + pen.jitter(1.5), p.y)), SNOW, 0.9);
    }
  });
  shingle(t, x0 + 6, x1 - 6, crest, h * 0.9, Math.round((x1 - x0) * h * 0.035), 0.85);
  pen.hair(edge, 0.6, t.ink, FAR * 0.5);
  return crest;
}

/**
 * A snowdrift in the lee of a boulder: banked up `h` high against its
 * downwind (right) side at x and tapering smooth for `w` along the stones,
 * blue in its shade, rippled by the wind.
 */
export function snowDrift(t: Draw, x: number, ground: number, w: number, h: number): void {
  const { pen } = t;
  const top = cub(pt(x - w * 0.08, ground - h), pt(x + w * 0.25, ground - h * 1.05), pt(x + w * 0.6, ground - h * 0.35), pt(x + w, ground + 0.5), 16);
  const drift = [pt(x - w * 0.12, ground - h * 0.7), ...top, pt(x + w, ground + 1), pt(x - w * 0.1, ground + 1)];
  pen.fill(drift, PAPER_FILL, 1);
  pen.fill(drift, SNOW, 0.9);
  pen.clipped(drift, () => {
    pen.fill(top.map((p) => pt(p.x + 2, p.y + h * 0.55)).concat([pt(x + w + 2, ground + 2), pt(x - w * 0.2, ground + 2)]), SNOW_SHADE, 0.55);
    for (let k = 1; k < 4; k++) pen.hair(top.slice(3, 14).map((p) => pt(p.x + k * 3, p.y + k * h * 0.18)), 0.3, SNOW_SHADE, 0.9);
  });
  pen.hair(top, 0.45, t.ink, FAR * 0.55);
}

/**
 * A tuft of lyme grass on the shingle, last year's straw with a little
 * blue-green coming at the base: broad blades all streaming over to the
 * right in the wind, a few stiff seed spikes leaning with them.
 */
export function lymeGrass(t: Draw, x: number, ground: number, h: number): void {
  const { pen } = t;
  const n = 8 + Math.floor(pen.rng() * 6);
  for (let k = 0; k < n; k++) {
    const len = h * (0.55 + pen.rng() * 0.55);
    const bend = 0.5 + pen.rng() * 0.5;
    const base = pt(x + pen.jitter(2.5), ground);
    const tip = pt(base.x + len * (0.55 + 0.45 * bend), ground - len * (0.75 - 0.5 * bend));
    const blade = bezier(base, pt(base.x + len * 0.1, ground - len * 0.85), tip, 8);
    const green = k % 4 === 0;
    pen.fill(tube(blade, 1.6, 0.2), green ? LYME : STRAW, 0.85);
    pen.hair(blade, 0.3, t.ink, FAR * 0.6);
  }
  for (let k = 0; k < 2; k++) {
    const base = pt(x + pen.jitter(2), ground);
    const top = pt(base.x + h * (0.45 + pen.rng() * 0.2), ground - h * (0.8 + pen.rng() * 0.25));
    pen.hair(bezier(base, pt(base.x + h * 0.08, ground - h * 0.6), top, 6), 0.45, t.ink, FAR * 0.7);
    const spike = tube([top, pt(top.x + 4, top.y + 1.6)], 1.8, 0.8);
    pen.fill(spike, STRAW, 0.9);
    pen.hair(spike, 0.3, t.ink, FAR * 0.6);
  }
}

/**
 * A Newfoundland lobster pot, seen three-quarters from its end: a wooden
 * box of laths with a half-round top on bent bows, the twine net head
 * across its end, laths running back along it, a brick for ballast.
 */
export function lobsterPot(t: Draw, x: number, ground: number, s: number): void {
  const { pen } = t;
  const P = (dx: number, dy: number): Pt => pt(x + dx * s, ground + dy * s);
  const back = (p: Pt): Pt => pt(p.x + 15 * s, p.y - 3.2 * s);
  // The end bow: straight sides rising to a half-round top.
  const arch: Pt[] = [P(-6, 0), P(-6, -5), ...Array.from({ length: 9 }, (_, i) => {
    const a = Math.PI + (i / 8) * Math.PI;
    return P(Math.cos(a) * 6, -5 + Math.sin(a) * 5);
  }), P(6, -5), P(6, 0)];
  // Its silhouette: up the near bow to its crown, then over the far bow and down to the ground.
  const hull = [...arch.slice(0, 7), ...arch.slice(6).map(back), arch[arch.length - 1]!];
  pen.fill(oval(x + 8 * s, ground + 0.4, 15 * s, 1.6 * s, 16), t.ink, 0.12);
  pen.fill(hull, PAPER_FILL, 0.9);
  pen.fill(hull, LATH, 0.35);
  // Laths along the length: from each point of the bow back to the far bow.
  for (let i = 1; i < arch.length - 1; i++) pen.stroke([arch[i]!, back(arch[i]!)], 0.75 * s, LATH, 0.95, false);
  for (let i = 1; i < arch.length - 1; i += 2) pen.hair([arch[i]!, back(arch[i]!)], 0.3, t.ink, FAR * 0.6);
  pen.stroke([P(6, 0), back(P(6, 0))], 0.9 * s, LATH_DARK, 0.9, false);
  pen.hair(arch.map(back), 0.6 * s, LATH_DARK, 0.8);
  // The twine head across the near end, a funnel into it.
  const end = arch;
  pen.fill(end, NET_HEAD, 0.35);
  pen.clipped(end, () => {
    pen.hatch(end, 1.1 * s, 0.8, 0.25, { color: t.ink, alpha: FAR * 0.5 });
    pen.hatch(end, 1.1 * s, -0.8, 0.25, { color: t.ink, alpha: FAR * 0.5 });
  });
  pen.fill(oval(x, ground - 4.5 * s, 2 * s, 1.6 * s, 10), t.ink, 0.35);
  pen.stroke(edges(end, 2), 0.9 * s, LATH_DARK, 0.95, false);
  pen.hair(edges(end, 2), 0.35, t.ink, FAR);
  // A brick for ballast, seen through the twine.
  pen.fill([P(-3, -0.4), P(2, -0.4), P(2.4, -2), P(-2.6, -2)], '#a4553a', 0.55);
}

/**
 * A dory turned turtle on the ridge for the winter: the narrow, tarred
 * bottom uppermost with a skin of snow on it, the flared sides painted red
 * with a buff rail, the raked bow and the narrow tombstone stern, the
 * gunwale sprung up off the stones amidships with the shadow under it.
 */
export function upturnedDory(t: Draw, x: number, ground: number, s: number): void {
  const { pen } = t;
  const P = (dx: number, dy: number): Pt => pt(x + dx * s, ground + dy * s);
  pen.fill(oval(x, ground + 0.5, 27 * s, 2 * s, 20), t.ink, 0.15);
  // The dark gap under her amidships, where the gunwale lifts off the stones.
  pen.fill([P(-21, 0.4), ...bezier(P(-21, 0.4), P(0, -9), P(21, 0.4), 10).slice(1)], t.ink, 0.45);
  const gunwale = bezier(P(-25, 0.4), P(0, -8.5), P(24, 0.4), 16);
  const bottom = cub(P(13, -12.5), P(4, -13.4), P(-6, -13.4), P(-14, -12.4), 10);
  const hull = [...gunwale, P(22, -2), ...bottom, P(-23, -2.5)];
  washed(t, hull, DORY, 0.65, 0.75, 1.1);
  pen.clipped(hull, () => {
    // Her strakes, following the gunwale's sweep up to the flat bottom.
    for (const k of [0.3, 0.55, 0.78]) pen.hair(gunwale.map((p) => pt(p.x * (1 - k * 0.12) + x * k * 0.12, p.y + (ground - 12.8 * s - p.y) * k)), 0.4, t.ink, FAR * 0.65);
    pen.fill(gunwale.map((p) => pt(p.x, p.y - 2 * s)).concat([...gunwale].reverse()), DORY_RAIL, 0.75);
    pen.hair(gunwale.map((p) => pt(p.x, p.y - 2 * s)), 0.4, t.ink, FAR * 0.6);
    pen.crescent(hull, pt(-3 * s, -4 * s), () => pen.hatch(hull, 1.4, 1.1, 0.35, { color: t.ink, alpha: FAR * 0.45 }));
  });
  pen.stroke(edges(hull, 2), 0.9, t.ink, FAR * 1.2, false);
  // The tarred bottom seen edge-on, and snow lying along it, blown off its windward end.
  pen.stroke(bottom, 1.4 * s, '#2c2a28', 0.7, false);
  const snow = [P(-10, -13.2), ...bezier(P(-10, -13.2), P(2, -16), P(14, -12.8), 8).slice(1)];
  pen.fill(snow, PAPER_FILL, 1);
  pen.fill(snow, SNOW, 0.9);
  pen.hair(snow.slice(1), 0.35, t.ink, FAR * 0.5);
}

/**
 * A block of sea ice stranded on the stones by the tide: angular, its top
 * white and pitted, its broken side glassy blue and turquoise, tipped up.
 */
export function strandedIce(t: Draw, x: number, ground: number, w: number, h: number, tilt = 0): void {
  const { pen } = t;
  const P = (dx: number, dy: number): Pt => pt(x + dx * w, ground + dy * h - dx * w * tilt);
  const topFace = [P(-0.5, -0.75), P(-0.1, -1), P(0.5, -0.92), P(0.42, -0.62), P(-0.42, -0.55)];
  const side = [P(-0.42, -0.55), P(0.42, -0.62), P(0.5, -0.92), P(0.52, 0), P(-0.46, 0.05), P(-0.5, -0.75)];
  pen.fill(oval(x, ground + 0.6, w * 0.6, 1.6, 12), ICE_BLUE, 0.35);
  washed(t, side, ICE_SHADE, 0.6, 0.55);
  pen.clipped(side, () => {
    pen.fill([P(-0.6, -0.15), P(0.6, -0.25), P(0.6, 0.1), P(-0.6, 0.1)], TURQUOISE, 0.35);
    for (let k = 0; k < 4; k++) {
      const dx = -0.4 + pen.rng() * 0.8;
      pen.hair([P(dx, -0.55), P(dx + pen.jitter(0.05), -0.1)], 0.4, PAPER_FILL, 0.7);
    }
    pen.hatch(side, 1.3, 1.45, 0.3, { color: ICE_BLUE, alpha: 0.6 });
  });
  washed(t, topFace, ICE, 0.75, 0.5);
  for (let k = 0; k < 3; k++) pen.dot(x + pen.jitter(w * 0.3), ground - h * (0.72 + pen.rng() * 0.15), 0.6, ICE_SHADE, 0.8);
}
