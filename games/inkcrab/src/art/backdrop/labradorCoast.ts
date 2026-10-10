import { bezier, closed, type Draw, oval, pt, tube } from '../kit';
import type { Pt } from '../pen';
import { PAPER_FILL } from '../palette';
import { edges, FAR } from './common';
import { glow } from './estuary';
import { woolsack } from './granite';
import { reflection } from './water';

/**
 * The land along the Labrador coast in early spring: barren hills of bare
 * dark rock and brown tundra, snow still lying in the gullies and on the
 * lee slopes; an inuksuk standing on the ridge; an outport at a cove, its
 * saltbox houses painted red and yellow and white, a little white church,
 * washing on the line and a flag standing out stiff in the wind; and the
 * fishing stages on their spindly stilts over the water.
 */
const ROCK = '#76726a';
const TUNDRA = '#8f7a58';
const TUNDRA_FAR = '#8197a8';
const ROCK_DARK = '#3c4148';
const SNOW = '#fbfdfd';
const SNOW_SHADE = '#c3d5e0';
const STONE = '#80827f';
const LICHEN = '#d98a3a';
const ROOF = '#3c3e45';
const TRIM = '#f6f2e8';
const PANE = '#3f5266';
const OCHRE = '#9a4a32';
const POST = '#7a6a58';
export const SALTBOX_RED = '#b8402f';
export const SALTBOX_YELLOW = '#e2b53a';
export const SALTBOX_WHITE = '#eeeae0';
export const SALTBOX_GREEN = '#4f8a7a';
export const SALTBOX_BLUE = '#4f7aa6';

/** A shape on paper under a wash, its edge inked. */
function washed(t: Draw, shape: readonly Pt[], color: string, alpha: number, w = 0.5, ink = 1): void {
  t.pen.fill(shape, PAPER_FILL, 1);
  t.pen.fill(shape, color, alpha);
  t.pen.stroke(edges(shape, 2), w, t.ink, FAR * ink, false);
}

/** A snow patch lying along the contour: a ragged lens `w` long tilted at `angle`, shaded blue along its lower edge. */
function snowPatch(t: Draw, x: number, y: number, w: number, h: number, angle: number, inked: boolean): void {
  const { pen } = t;
  const c = Math.cos(angle);
  const sn = Math.sin(angle);
  const patch = Array.from({ length: 12 }, (_, i) => {
    const a = (i / 12) * Math.PI * 2;
    const r = 0.75 + pen.rng() * 0.4;
    const px = Math.cos(a) * (w / 2) * r;
    const py = Math.sin(a) * (h / 2) * r * (Math.sin(a) > 0 ? 0.7 : 1.2);
    return pt(x + px * c - py * sn, y + px * sn + py * c);
  });
  pen.fill(patch, SNOW, 0.95);
  pen.clipped(patch, () => pen.fill(patch.map((p) => pt(p.x + 0.6, p.y + h * 0.45)), SNOW_SHADE, 0.5));
  if (inked) pen.hair(patch.slice(6, 12), 0.35, t.ink, FAR * 0.35);
}

/**
 * Barren hills from x0 to x1 standing on `base`: glaciated dark rock with
 * brown tundra on the lower slopes, bluer and paler the further off
 * (`fade` towards 0), shaded on the side away from the light, broken by
 * ledges of crag with snow lying on them, snow in ragged patches along the
 * contours (more of it higher up) and a cap of it under the crest of each
 * lee (right-facing) slope. Returns the hills' height at x.
 */
export function barrens(t: Draw, x0: number, x1: number, base: number, height: (x: number) => number, fade = 1, snow = 1): (x: number) => number {
  const { pen } = t;
  const top: Pt[] = [];
  for (let x = x0; x <= x1; x += 2) top.push(pt(x, base - height(x) + (height(x) > 3 ? pen.jitter(0.5) : 0)));
  const shape = [...top, pt(x1, base + 0.5), pt(x0, base + 0.5)];
  const hMax = Math.max(1, ...top.map((p) => base - p.y));
  const tilt = (x: number): number => Math.atan2(height(x - 6) - height(x + 6), 12) * 0.55;
  pen.fill(shape, PAPER_FILL, 1);
  pen.fill(shape, ROCK, 0.55 * fade);
  pen.fill(shape, TUNDRA_FAR, 0.5 * (1 - fade) + 0.06);
  pen.clipped(shape, () => {
    // Brown tundra over the lower slopes, fading out upwards.
    for (const k of [0.6, 0.4, 0.22]) {
      const low = top.map((p) => pt(p.x, base - (base - p.y) * k + 3 * Math.sin(p.x * 0.05)));
      pen.fill([...low, pt(x1, base + 1), pt(x0, base + 1)], TUNDRA, 0.16 * fade);
    }
    // The shade side, away from the light at the upper left.
    pen.crescent(shape, pt(-hMax * 0.3, -hMax * 0.12), () => {
      pen.fill(shape, ROCK_DARK, 0.22 * fade);
      if (fade > 0.5) pen.hatch(shape, 1.6, 1.1, 0.3, { color: t.ink, alpha: FAR * 0.32 * fade });
    });
    // Ledges of crag along the contours, each with snow lying along its top.
    for (let k = 0; k < (x1 - x0) / 34; k++) {
      const x = x0 + pen.rng() * (x1 - x0);
      const hx = height(x);
      if (hx < 8) continue;
      const y = base - hx + 4 + pen.rng() * hx * 0.75;
      const len = 6 + pen.rng() * 18;
      const a = tilt(x);
      const ledge = [pt(x - len / 2 * Math.cos(a), y - len / 2 * Math.sin(a)), pt(x + pen.jitter(2), y + pen.jitter(1)), pt(x + len / 2 * Math.cos(a), y + len / 2 * Math.sin(a))];
      pen.fill([...ledge, ...[...ledge].reverse().map((p, i) => pt(p.x - 1, p.y + (i === 1 ? 3 + pen.rng() * 3 : 1)))], ROCK_DARK, 0.4 * fade + 0.1);
      if (pen.rng() < 0.6) pen.hair(ledge.map((p) => pt(p.x, p.y - 0.6)), 1.1, SNOW, 0.9);
      if (fade > 0.5) pen.hair(ledge.map((p) => pt(p.x, p.y + 1.6)), 0.35, t.ink, FAR * 0.5);
    }
    // Snow in ragged patches along the contours, more of it higher up.
    for (let k = 0; k < ((x1 - x0) * hMax) / 520 * snow; k++) {
      const x = x0 + pen.rng() * (x1 - x0);
      const hx = height(x);
      if (hx < 3) continue;
      const e = pen.rng();
      if (pen.rng() > 0.15 + 0.85 * e) continue;
      const y = base - hx * e + 2;
      // Mostly small, now and then a broad snowfield.
      const w = 3 + pen.rng() ** 2.5 * (10 + hMax * 0.5);
      snowPatch(t, x, y, w, 1 + w * (0.15 + pen.rng() * 0.15), tilt(x), fade > 0.5 && w > 10);
    }
    // A cap of snow under the crest of each lee slope.
    for (let i = 4; i < top.length - 4; i++) {
      const p = top[i]!;
      const lee = top[i + 3]!.y - top[i - 3]!.y;
      if (lee < 0.8 || height(p.x) < 6 || pen.rng() > 0.5 * snow) continue;
      snowPatch(t, p.x, p.y + 2.5, 8 + pen.rng() * 10, 3 + pen.rng() * 2, tilt(p.x), false);
    }
  });
  for (let i = 0; i + 8 < top.length; i += 10 + Math.floor(pen.rng() * 6)) pen.hair(top.slice(i, i + 9), 0.5, t.ink, FAR * (0.3 + 0.5 * fade));
  return height;
}

/** Spindrift: snow blown off a crest at (x, y), streaming away downwind (right) in a thinning white plume. */
export function spindrift(t: Draw, x: number, y: number, len: number): void {
  const { pen } = t;
  for (let k = 0; k < 7; k++) {
    const u = k / 6;
    glow(t, x + len * u * 0.9, y - len * 0.08 * u + pen.jitter(1), 4 + len * 0.18 * u, 2 + len * 0.06 * u, SNOW, 0.95 * (1 - u * 0.7));
  }
  for (let k = 0; k < 8; k++) {
    const sy = y + pen.jitter(2);
    const l = len * (0.5 + pen.rng() * 0.5);
    pen.hair(bezier(pt(x, sy), pt(x + l * 0.5, sy - l * 0.08), pt(x + l, sy - l * 0.04 + pen.jitter(2)), 6), 0.4, PAPER_FILL, 0.8);
  }
}

/**
 * An inuksuk on the skyline: rough stones piled into the shape of a man,
 * two legs, a slab across the hips, a body, a long slab for the arms and a
 * round stone for the head, orange lichen on them.
 */
export function inuksuk(t: Draw, x: number, ground: number, s: number): void {
  const { pen } = t;
  const stone = (cx: number, cy: number, rx: number, ry: number): void => {
    const shape = woolsack(t, x + cx * s, ground + cy * s, rx * s, ry * s, 2.6);
    washed(t, shape, STONE, 0.6, 0.5);
    pen.hatch(shape, 1, 1.1, 0.3, { color: t.ink, alpha: FAR * 0.4, onlyBelow: ground + cy * s });
    if (pen.rng() < 0.7) pen.dot(x + (cx + pen.jitter(rx * 0.5)) * s, ground + (cy - ry * 0.4) * s, 0.5 * s, LICHEN, 0.8);
  };
  stone(-3.6, -3.5, 1.8, 3.5);
  stone(3.6, -3.5, 1.8, 3.5);
  stone(0, -8.2, 6.8, 1.3);
  stone(0, -12.2, 3, 2.8);
  stone(0.4, -16.2, 9, 1.3);
  stone(0.3, -19.6, 2.2, 2.1);
}

/** Smoke from a chimney, streaming away flat downwind (right) and thinning. */
function smoke(t: Draw, x: number, y: number, s: number): void {
  const { pen } = t;
  for (let k = 0; k < 6; k++) glow(t, x + (2 + k * 4) * s, y - (1 + k * 0.6) * s + pen.jitter(0.5), (2 + k * 1.2) * s, (1 + k * 0.3) * s, '#c9ced4', 0.5 - k * 0.07);
  pen.hair(bezier(pt(x, y), pt(x + 10 * s, y - 3 * s), pt(x + 24 * s, y - 3.5 * s), 8), 0.35, t.ink, FAR * 0.25);
}

/** A sash window with a white trim round it. */
function window(t: Draw, P: (dx: number, dy: number) => Pt, dx: number, dy: number, w: number, h: number): void {
  const frame = [P(dx - 0.5, dy + 0.5), P(dx + w + 0.5, dy + 0.5), P(dx + w + 0.5, dy - h - 0.5), P(dx - 0.5, dy - h - 0.5)];
  t.pen.fill(frame, TRIM, 0.95);
  t.pen.fill([P(dx, dy), P(dx + w, dy), P(dx + w, dy - h), P(dx, dy - h)], PANE, 0.55);
  t.pen.hair([P(dx, dy - h / 2), P(dx + w, dy - h / 2)], 0.3, TRIM, 0.9);
  t.pen.hair(edges(frame), 0.3, t.ink, FAR * 0.8);
}

/**
 * A Newfoundland saltbox house seen gable-end on: two storeys at the front
 * and one at the back under its long, lopsided roof, clapboard walls
 * painted bright with white corner boards and window trim, and smoke
 * streaming flat from its chimney. `dir` -1 mirrors it.
 */
export function saltbox(t: Draw, x: number, ground: number, s: number, wall: string, dir: 1 | -1 = 1): void {
  const { pen } = t;
  const P = (dx: number, dy: number): Pt => pt(x + dx * s * dir, ground + dy * s);
  const gable = [P(-10, 0), P(10, 0), P(10, -7.5), P(-3, -21), P(-10, -14)];
  const chimney = [P(-1.6, -21.5), P(1, -21.5), P(1, -18.6), P(-1.6, -20)];
  washed(t, chimney, '#7a4a3a', 0.6, 0.4);
  smoke(t, x + (dir > 0 ? 0 : -0.3) * s, ground - 22 * s, s);
  washed(t, gable, wall, 0.62, 0.6);
  pen.clipped(gable, () => {
    for (let y = -1.6; y > -21; y -= 1.4) pen.hair([P(-11, y), P(11, y)], 0.25, t.ink, FAR * 0.4);
    pen.hatch([P(2, 0), P(10, 0), P(10, -22), P(2, -22)], 1.4, 1.1, 0.3, { color: t.ink, alpha: FAR * 0.3 });
  });
  for (const dx of [-9.6, 9.6]) pen.hair([P(dx, -0.2), P(dx, dx < 0 ? -13.6 : -7.3)], 0.9 * s, TRIM, 0.9);
  window(t, P, -8, -9.5, 3, 3.6);
  window(t, P, -3, -9.5, 3, 3.6);
  window(t, P, -7.5, -2.5, 3, 3.6);
  window(t, P, 4.5, -2, 3, 3.4);
  window(t, P, -4, -15.2, 2.4, 2.8);
  const door = [P(-1.8, 0), P(1.4, 0), P(1.4, -5.4), P(-1.8, -5.4)];
  washed(t, door, '#5a3f30', 0.6, 0.4);
  // The roof's edge: a dark strip along both slopes, the eaves overhanging.
  pen.fill(tube([P(-11, -13.3), P(-3, -21.6), P(11, -6.8)], 1.6 * s, 1.6 * s), ROOF, 0.8);
  pen.fill(oval(x, ground + 0.5, 12 * s, 1.2 * s, 14), t.ink, 0.12);
}

/**
 * A little white church with its square tower and spire at the front, the
 * nave behind under a dark roof, and pointed windows.
 */
export function outportChurch(t: Draw, x: number, ground: number, s: number): void {
  const { pen } = t;
  const P = (dx: number, dy: number): Pt => pt(x + dx * s, ground + dy * s);
  const nave = [P(-2, 0), P(18, 0), P(18, -11), P(-2, -11)];
  washed(t, nave, SALTBOX_WHITE, 0.7, 0.5);
  pen.fill([P(-2.5, -10.6), P(18.5, -10.6), P(16, -16), P(0, -16)], ROOF, 0.75);
  pen.hair(edges([P(-2.5, -10.6), P(18.5, -10.6), P(16, -16), P(0, -16)]), 0.4, t.ink, FAR);
  for (const dx of [3, 8, 13]) {
    const win = [P(dx, -3), P(dx + 2, -3), P(dx + 2, -7), P(dx + 1, -8.4), P(dx, -7)];
    pen.fill(win, PANE, 0.55);
    pen.hair(edges(win), 0.3, t.ink, FAR * 0.8);
  }
  const tower = [P(-7, 0), P(-1, 0), P(-1, -17), P(-7, -17)];
  washed(t, tower, SALTBOX_WHITE, 0.7, 0.55);
  pen.clipped(tower, () => pen.hatch(tower, 1.2, 1.1, 0.3, { color: t.ink, alpha: FAR * 0.35, onlyBelow: ground - 17 * s }));
  pen.fill([P(-5.2, 0), P(-2.8, 0), P(-2.8, -4.6), P(-4, -5.6), P(-5.2, -4.6)], '#5a3f30', 0.6);
  pen.fill([P(-4.8, -11), P(-3.2, -11), P(-3.2, -13.6), P(-4, -14.4), P(-4.8, -13.6)], PANE, 0.6);
  const spire = [P(-7.6, -16.8), P(-0.4, -16.8), P(-4, -29)];
  washed(t, spire, ROOF, 0.8, 0.45);
  pen.hair([P(-4, -29), P(-4, -32.5)], 0.4, t.ink, FAR);
  pen.hair([P(-5.2, -31.4), P(-2.8, -31.4)], 0.4, t.ink, FAR);
}

/**
 * A fishing stage on the water: a shed of weathered red ochre on a deck
 * of poles standing on spindly stilts over the cove, braced crosswise, a
 * ladder down from the stagehead, a puncheon tub on the deck.
 */
export function fishingStage(t: Draw, x: number, water: number, s: number): void {
  const { pen } = t;
  const P = (dx: number, dy: number): Pt => pt(x + dx * s, water + dy * s);
  const deck = -9;
  // Stilts and their reflections, braced crosswise.
  for (let dx = -18; dx <= 22; dx += 4 + (dx % 3)) {
    pen.stroke([P(dx, deck), P(dx + pen.jitter(0.3), 0.5)], 0.7 * s, POST, 0.9, false);
    pen.hair([P(dx, 1.5), P(dx + pen.jitter(0.5), 4 + pen.rng() * 3)], 0.6 * s, '#4a4038', 0.35);
  }
  for (let dx = -18; dx < 18; dx += 8) {
    pen.hair([P(dx, deck + 0.5), P(dx + 8, -1)], 0.35, POST, 0.85);
    pen.hair([P(dx + 8, deck + 0.5), P(dx, -1)], 0.35, POST, 0.85);
  }
  const boards = [P(-19, deck), P(23, deck), P(23, deck + 1.4), P(-19, deck + 1.4)];
  washed(t, boards, '#8f8170', 0.6, 0.45);
  // The ladder at the stagehead.
  for (const dx of [20, 22]) pen.hair([P(dx, deck + 1), P(dx, -0.5)], 0.4, POST, 0.9);
  for (let dy = deck + 2.5; dy < 0; dy += 1.6) pen.hair([P(20, dy), P(22, dy)], 0.3, POST, 0.9);
  // The shed: board walls under a pitched roof, a door and a window.
  const shed = [P(-16, deck), P(6, deck), P(6, deck - 9), P(-5, deck - 15), P(-16, deck - 9)];
  washed(t, shed, OCHRE, 0.6, 0.55);
  pen.clipped(shed, () => {
    for (let dx = -15; dx < 6; dx += 1.3) pen.hair([P(dx, deck), P(dx, deck - 15)], 0.25, t.ink, FAR * 0.35);
    pen.hatch([P(-5, deck), P(6, deck), P(6, deck - 16), P(-5, deck - 16)], 1.3, 1.1, 0.3, { color: t.ink, alpha: FAR * 0.3 });
  });
  pen.fill(tube([P(-17, deck - 8.6), P(-5, deck - 15.6), P(7, deck - 8.6)], 1.4 * s, 1.4 * s), ROOF, 0.75);
  pen.fill([P(-12, deck), P(-8, deck), P(-8, deck - 6.5), P(-12, deck - 6.5)], '#2e2a28', 0.55);
  window(t, P, -1.5, deck - 4, 3, 2.6);
  const tub = [P(12, deck), P(15.4, deck), P(15.8, deck - 3.4), P(11.6, deck - 3.4)];
  washed(t, tub, '#a07c50', 0.6, 0.4);
  pen.hair([P(11.8, deck - 1.7), P(15.6, deck - 1.7)], 0.3, t.ink, FAR * 0.7);
  reflection(t, x - 5 * s, water + 1, 24 * s, 7 * s, OCHRE, 0.25);
}

/**
 * A washing line strung between two posts from `a` to `b`, the clothes on
 * it standing straight out downwind (right) and flogging in the gale.
 */
export function washLine(t: Draw, a: Pt, b: Pt, s: number, colors: readonly string[]): void {
  const { pen } = t;
  for (const p of [a, b]) {
    pen.stroke([pt(p.x, p.y + 12 * s), p], 0.6 * s, POST, 0.9, false);
    pen.hair([pt(p.x - 2 * s, p.y), pt(p.x + 2 * s, p.y)], 0.4, POST, 0.9);
  }
  const line = bezier(a, pt((a.x + b.x) / 2, (a.y + b.y) / 2 + 2.5 * s), b, 12);
  pen.hair(line, 0.35, t.ink, FAR * 0.8);
  colors.forEach((c, i) => {
    const p = line[2 + Math.round((i / colors.length) * (line.length - 4))]!;
    const len = (6 + (i % 2) * 2) * s;
    const h = (1.8 + (i % 3) * 0.5) * s;
    // Blown out flat downwind from its pegs, its free end rippling.
    const ripple = (u: number): number => Math.sin(u * Math.PI * 2.5 + i) * 0.5 * s * u;
    const top: Pt[] = [];
    const bot: Pt[] = [];
    for (let k = 0; k <= 6; k++) {
      const u = k / 6;
      top.push(pt(p.x + len * u, p.y - 0.3 * s * u + ripple(u)));
      bot.push(pt(p.x + len * u, p.y + h * (1 - 0.25 * u) + ripple(u)));
    }
    washed(t, [...top, ...bot.reverse()], c, 0.65, 0.35, 0.8);
  });
}

/** A flagpole on the slope, its flag (the Labrador tricolour, white over green over blue) standing out stiff downwind. */
export function flagpole(t: Draw, x: number, ground: number, h: number, s: number): void {
  const { pen } = t;
  pen.stroke([pt(x, ground), pt(x, ground - h)], 0.6 * s, t.ink, FAR, false);
  const fy = ground - h + 0.6;
  const w = 13 * s;
  const fh = 6 * s;
  // The cloth flogging: its edges waving more towards the fly.
  const at = (u: number, v: number): Pt => pt(x + w * u, fy + fh * v * (1 - 0.12 * u) + Math.sin(u * Math.PI * 3) * 0.9 * s * u);
  const band = (v0: number, v1: number, color: string): void => {
    const edge0 = Array.from({ length: 9 }, (_, k) => at(k / 8, v0));
    const edge1 = Array.from({ length: 9 }, (_, k) => at(k / 8, v1));
    const shape = [...edge0, ...edge1.reverse()];
    pen.fill(shape, PAPER_FILL, 1);
    pen.fill(shape, color, 0.75);
  };
  band(0, 0.45, '#f4f6f4');
  band(0.45, 0.6, '#3f8a4f');
  band(0.6, 1, '#2f5f9f');
  const outline = [...Array.from({ length: 9 }, (_, k) => at(k / 8, 0)), ...Array.from({ length: 9 }, (_, k) => at(1 - k / 8, 1))];
  pen.hair(closed(outline), 0.3, t.ink, FAR * 0.8);
}
