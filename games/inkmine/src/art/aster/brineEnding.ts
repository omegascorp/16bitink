import { hash } from '../../logic/noise';
import { cub, oval, pt, TAU, type Draw } from '../kit';
import { dab, gleam, glow, mix, paint, SHADOW, soft } from '../paint';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { lash, rib } from './gear';
import { ASTER } from './style';

/**
 * The end of chapter 3 (spec, "Brine"): the Aster craft's drive crystal,
 * lost down a crack in the reef into the flooded underworld where the
 * Leviathan sleeps, and two pictures in the Aster's plum ink: the crew's
 * drawing of how it fell, and the star chart they give you, the way on to
 * Talus. The crystal is theirs, so it's in their language (aster/style.ts):
 * hexagonal glass glowing teal, set in a glazed ceramic collar lashed with
 * dark red cord, their star on it.
 */

/** The drive crystal lying on a cave floor. Origin on the floor under its middle. */
export const DRIVE_CRYSTAL = { w: 44, h: 32, ox: 22, oy: 28 } as const;

const GLASS_DEEP = '#2f7d72';
const GLOW_CORE = '#e9fff8';
const SILT = '#958a9c';
/** How bright its heart is on each boil frame: it breathes. */
const BREATH = [1, 0.8, 1.15] as const;

// ---------------------------------------------------------------- the drive crystal

/** Its base end, bedded in the silt, its axis rising to the right, its length to where the point begins, its half-thickness. */
const BASE = pt(-12, -5);
const AXIS = -0.55;
const LEN = 23;
const HALF_T = 4.6;
const TIP = 6.5;

/** A point on the crystal: `u` along its axis from the base, `v` across it (negative is its upper side). */
function at(u: number, v: number): Pt {
  const c = Math.cos(AXIS);
  const s = Math.sin(AXIS);
  return pt(BASE.x + c * u - s * v, BASE.y + s * u + c * v);
}

/** The glass: three faces of the hexagonal prism seen side on (a narrow lit one, the broad middle, a narrow dark one), each ending in a facet of the point. */
function prism(d: Draw, breath: number): Pt[] {
  const bands: readonly [number, number, string][] = [
    [-HALF_T, -HALF_T * 0.5, mix(ASTER.glass, GLOW_CORE, 0.45)],
    [-HALF_T * 0.5, HALF_T * 0.5, ASTER.glass],
    [HALF_T * 0.5, HALF_T, mix(ASTER.glass, GLASS_DEEP, 0.55)],
  ];
  const apex = at(LEN + TIP, 0);
  for (const [v0, v1, wash] of bands) {
    const face = [at(0, v0), at(LEN - Math.abs(v0) * 0.2, v0), ...(v0 * v1 < 0 ? [at(LEN, v1 * 0.2), apex] : [apex]), at(LEN - Math.abs(v1) * 0.2, v1), at(0, v1)];
    paint(d, face, wash, { alpha: 0.9, shadow: 0.25, hatch: 0, line: 0, gloss: true });
  }
  const outline = [at(0, -HALF_T), at(LEN - HALF_T * 0.2, -HALF_T), apex, at(LEN - HALF_T * 0.2, HALF_T), at(0, HALF_T)];
  d.pen.clipped(outline, () => {
    // The light inside it: a core along its axis, brighter as it breathes, and the flaws it catches.
    soft(d.pen.ctx, 1.4, () => d.pen.stroke([at(2, 0.4), at(LEN + 1, 0)], 2.6 * breath, GLOW_CORE, 0.55 * breath, false));
    glow(d.pen.ctx, at(LEN * 0.45, 0), 9 * breath, GLOW_CORE, 0.55 * breath);
    for (const [u, v, l] of [[7, -1.4, 4], [14, 1.6, 3], [18, -0.6, 2.6]] as const) d.pen.hair([at(u, v), at(u + l * 0.6, v - l * 0.3), at(u + l, v + 0.4)], 0.3, mix(ASTER.glass, PAPER_FILL, 0.6), 0.7);
    for (let k = 0; k < 5; k++) d.pen.dot(at(4 + hash(k, 1, 6720) * 16, (hash(k, 2, 6720) - 0.5) * 5).x, at(4 + hash(k, 1, 6720) * 16, (hash(k, 2, 6720) - 0.5) * 5).y, 0.35, PAPER_FILL, 0.8);
  });
  // The facet edges, the point's ridges, and light along the top edge.
  for (const v of [-HALF_T * 0.5, HALF_T * 0.5]) d.pen.hair([at(0.4, v), at(LEN - Math.abs(v) * 0.2, v), apex], 0.4, GLASS_DEEP, 0.75);
  d.pen.stroke([...outline, outline[0]!], 0.7, d.ink, 0.9);
  gleam(d, [at(3, -HALF_T + 0.8), at(LEN - 2, -HALF_T + 0.8)], 0.7, 0.85);
  gleam(d, [at(LEN + 0.6, -HALF_T * 0.4), at(LEN + TIP - 1.4, -0.3)], 0.5, 0.7);
  return outline;
}

/** The collar its base sits in: glazed ceramic, ribbed round, lashed on with cord, their star scratched on its end. */
function collar(d: Draw): void {
  const r = HALF_T + 1.4;
  const ring = [at(-3, -r), at(4, -r - 0.2), at(4.6, 0), at(4, r + 0.2), at(-3, r), at(-4, 0)];
  paint(d, ring, ASTER.shell, { alpha: 1, shadow: 0.5, hatch: 0.12, line: 0.7, gloss: true });
  d.pen.clipped(ring, () => {
    dab(d, [at(-3, r * 0.2), at(4.6, r * 0.2), at(4.6, r + 1), at(-3, r + 1)], ASTER.glaze, 0.6, 1);
    for (const u of [-1.2, 1.4]) rib(d, at(u, -r + 0.6), at(u, r - 0.6), 0);
  });
  lash(d, at(2.6, -r - 0.6), at(2.6, r + 0.6), 2);
  // Its end, a dark cathode disc seen edge on, and the star.
  const end = [at(-3.6, -r * 0.8), at(-4.6, 0), at(-3.6, r * 0.8), at(-3, 0)];
  paint(d, end, '#3b3640', { alpha: 1, shadow: 0.3, hatch: 0, line: 0.5, gloss: true });
}

/** The silt round it: a bed it sank into, a lip pushed up in front, grains, a pebble or two. */
function silt(d: Draw, front: boolean): void {
  const bed = front
    ? [pt(-21, 1.5), ...cub(pt(-21, 0), pt(-17, -4.4), pt(-9, -4.6), pt(-3, -2), 8), ...cub(pt(-3, -2), pt(2, -0.6), pt(10, -1.6), pt(16, 0), 6).slice(1), pt(16, 1.5)]
    : [pt(-20, 2), ...cub(pt(-20, 0), pt(-12, -6.5), pt(4, -6), pt(19, 0), 10), pt(19, 2)];
  const wash = front ? SILT : mix(SILT, SHADOW, 0.25);
  paint(d, bed, wash, { alpha: 1, shadow: 0.45, hatch: front ? 0.15 : 0, line: front ? 0.6 : 0.4 });
  d.pen.clipped(bed, () => {
    d.pen.stipple(bed, front ? 70 : 40, () => 0.7, 0.3, mix(SILT, SHADOW, 0.5));
    d.pen.stipple(bed, 24, () => 0.6, 0.25, PAPER_FILL);
    glow(d.pen.ctx, at(LEN * 0.4, 6), 12, ASTER.glow, 0.35);
  });
  if (!front) return;
  for (const [x, y, rx] of [[11, -0.6, 1.8], [-18, -0.4, 1.4], [14.5, -0.2, 1]] as const) paint(d, oval(x, y, rx, rx * 0.7, 10), '#5f5866', { alpha: 1, shadow: 0.4, hatch: 0, line: 0.4, gloss: true });
}

/** The craft's drive crystal, fallen into the Leviathan's cave (spec, "Brine", the ending): teal glass in a ceramic collar, lying in the silt, glowing softly, breathing with the boil frames. */
export function drawDriveCrystal(d: Draw): void {
  const breath = BREATH[d.f]!;
  silt(d, false);
  prism(d, breath);
  collar(d);
  silt(d, true);
}

/** Round it (drawn after its finish): its glow in the dark water, and on the silt. */
export function drawDriveCrystalAir(d: Draw): void {
  const breath = BREATH[d.f]!;
  glow(d.pen.ctx, at(LEN * 0.55, 0), 20 * breath, ASTER.glow, 0.32 * breath);
  glow(d.pen.ctx, pt(2, -1), 18, ASTER.glow, 0.18 * breath);
}

// ---------------------------------------------------------------- the pictures' surfaces

/** A picture's frame (the same as Brine's other card pictures). */
const FRAME = { w: 140, h: 100 } as const;

/** A slab with rounded corners and a slightly rough edge, inset from the frame. */
function slab(seed: number, inset = 4): Pt[] {
  return Array.from({ length: 40 }, (_, i) => {
    const a = (i / 40) * TAU;
    const k = 1 + (hash(i, seed, 6730) - 0.5) * 0.05;
    const x = Math.sign(Math.cos(a)) * Math.pow(Math.abs(Math.cos(a)), 0.4) * (FRAME.w / 2 - inset) * k;
    const y = Math.sign(Math.sin(a)) * Math.pow(Math.abs(Math.sin(a)), 0.4) * (FRAME.h / 2 - inset) * k;
    return pt(x, y);
  });
}

/** Glazed ceramic, bone-white with the lilac glaze pooled low, and crazing in the glaze; `ribs` curve across it as a hull's do. */
function ceramic(d: Draw, seed: number, ribs: boolean): Pt[] {
  const s = slab(seed);
  paint(d, s, ASTER.shell, { alpha: 1, shadow: 0.3, hatch: 0.08, line: 0.9, gloss: true });
  d.pen.clipped(s, () => {
    dab(d, oval(0, 52, 90, 24, 24), ASTER.glaze, 0.5, 6);
    if (ribs) {
      for (let k = -4; k <= 4; k++) {
        const line = cub(pt(k * 17.6, -52), pt(k * 14.7, -18), pt(k * 14.7, 18), pt(k * 17.6, 52), 12);
        d.pen.hair(line, 0.8, mix(ASTER.glaze, SHADOW, 0.35), 0.4);
        d.pen.hair(line.map((p) => pt(p.x - 1, p.y)), 0.5, PAPER_FILL, 0.45);
      }
    }
    // Crazing: fine cracks in the glaze, in short broken runs.
    for (let k = 0; k < 16; k++) {
      const c = pt((hash(k, seed, 6731) - 0.5) * 130, (hash(k, seed, 6732) - 0.5) * 90);
      const a = hash(k, seed, 6733) * TAU;
      d.pen.hair([c, pt(c.x + Math.cos(a) * 5, c.y + Math.sin(a) * 5), pt(c.x + Math.cos(a + 0.8) * 9, c.y + Math.sin(a + 0.8) * 7)], 0.3, mix(ASTER.glaze, SHADOW, 0.3), 0.35);
    }
    for (let k = 0; k < 14; k++) dab(d, oval((hash(k, seed, 6734) - 0.5) * 130, (hash(k, seed, 6735) - 0.5) * 90, 3 + hash(k, seed, 6736) * 6, 2 + hash(k, seed, 6737) * 3, 10), '#a99bc0', 0.1, 2);
  });
  return s;
}

// ---------------------------------------------------------------- marks

/** A scratch, inked plum: the groove, with its far wall catching the light. */
function scratch(d: Draw, pts: readonly Pt[], w = 1.2): void {
  d.pen.stroke(pts, w, ASTER.ink, 0.9, false);
  d.pen.hair(pts.map((p) => pt(p.x + w * 0.45, p.y + w * 0.45)), w * 0.35, PAPER_FILL, 0.5);
}

const ring = (c: Pt, r: number, n = 18): Pt[] => {
  const o = oval(c.x, c.y, r, r, n);
  return [...o, o[0]!];
};

/** A dashed path: short scratches with gaps. */
function dashes(d: Draw, path: readonly Pt[], every: number, w = 1): void {
  for (let i = 0; i + 1 < path.length; i += every) scratch(d, path.slice(i, Math.min(path.length, i + Math.ceil(every / 2) + 1)), w);
}

/** A dotted path: pricked dots. */
function dots(d: Draw, path: readonly Pt[], every: number, r = 0.9): void {
  path.forEach((p, i) => i % every === 0 && (d.pen.dot(p.x + r * 0.4, p.y + r * 0.4, r * 0.8, PAPER_FILL, 0.5), d.pen.dot(p.x, p.y, r, ASTER.ink, 0.9)));
}

function arrowHead(d: Draw, path: readonly Pt[], size: number, w = 1.1): void {
  const b = path[path.length - 1]!;
  const a = path[path.length - 3] ?? path[0]!;
  const ang = Math.atan2(b.y - a.y, b.x - a.x);
  for (const k of [-1, 1]) scratch(d, [pt(b.x + Math.cos(ang + Math.PI - k * 0.5) * size, b.y + Math.sin(ang + Math.PI - k * 0.5) * size), b], w);
}

/** Their star, scratched: four long strokes crossing, short ones between. */
function starMark(d: Draw, c: Pt, r: number, w = 0.8): void {
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI;
    const q = k % 2 === 0 ? r : r * 0.6;
    scratch(d, [pt(c.x - Math.cos(a) * q, c.y - Math.sin(a) * q), pt(c.x + Math.cos(a) * q, c.y + Math.sin(a) * q)], w);
  }
}

/** A word of their writing: a rosette of strokes round a centre, which nobody can read. */
function rosette(d: Draw, c: Pt, r: number, seed: number): void {
  const n = 5 + Math.floor(hash(seed, 1, 6740) * 4);
  for (let k = 0; k < n; k++) {
    const a = (k / n) * TAU + hash(seed, 2, 6740);
    const l = r * (0.55 + hash(seed, k, 6741) * 0.45);
    scratch(d, [pt(c.x + Math.cos(a) * r * 0.3, c.y + Math.sin(a) * r * 0.3), pt(c.x + Math.cos(a) * l, c.y + Math.sin(a) * l)], 0.6);
  }
  d.pen.dot(c.x, c.y, 0.6, ASTER.ink, 0.9);
}

/** Their craft as they draw it, the cup of petals with its sides rising and a dome over it; `cracked` splits its keel. */
function craftMark(d: Draw, c: Pt, s: number, cracked: boolean): void {
  const { ctx } = d.pen;
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.scale(s, s);
  for (const side of [-1, 1]) {
    const leaf = [pt(side * 10, 1), pt(side * 13, -5), pt(side * 17, -12), pt(side * 15.4, -12.4), pt(side * 16.2, -14), pt(side * 12, -9), pt(side * 8.6, -3)];
    d.pen.fill(leaf, ASTER.ink, 0.12);
    scratch(d, [...leaf, leaf[0]!], 1 / s);
  }
  scratch(d, Array.from({ length: 11 }, (_, i) => pt(-9 + (i / 10) * 18, -Math.sin((i / 10) * Math.PI) * 7)), 0.9 / s);
  const cup = [pt(-13, 0), ...cub(pt(-13, 0), pt(-12, 9.6), pt(12, 9.6), pt(13, 0), 12), pt(-13, 0)];
  d.pen.fill(cup, PAPER_FILL, 0.6);
  d.pen.fill(cup, ASTER.ink, 0.12);
  scratch(d, cup, 1.3 / s);
  starMark(d, pt(0, 3.4), 2.2, 0.7 / s);
  if (cracked) scratch(d, [pt(-3, 1), pt(-1, 3.4), pt(-2.6, 5.2), pt(0.4, 7.4)], 1 / s);
  ctx.restore();
}

/** The crystal as they draw it: a long hexagon, its facet lines, short strokes of light round it. */
function crystalMark(d: Draw, c: Pt, s: number, tilt: number, lit: boolean): void {
  const { ctx } = d.pen;
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.rotate(tilt);
  ctx.scale(s, s);
  const hex = [pt(-6, -2), pt(4, -2), pt(7, 0), pt(4, 2), pt(-6, 2), pt(-7, 0)];
  d.pen.fill(hex, ASTER.glass, 0.35);
  scratch(d, [...hex, hex[0]!], 0.9 / s);
  scratch(d, [pt(-6, 0), pt(7, 0)], 0.5 / s);
  if (lit) for (let k = 0; k < 8; k++) {
    const a = (k / 8) * TAU;
    scratch(d, [pt(Math.cos(a) * 9, Math.sin(a) * 5), pt(Math.cos(a) * 12, Math.sin(a) * 7)], 0.6 / s);
  }
  ctx.restore();
}

// ---------------------------------------------------------------- the crystal falling

/**
 * The crew's drawing (spec, "Brine", the ending), scratched in plum on the
 * inside of the craft's shell: the craft sitting on the reef under the
 * waves, its keel cracked, the crystal dropping out of it and down a crack
 * in the rock, into a great cave below where a vast shape lies asleep,
 * bubbles rising off it, the crystal glowing on the floor by its head.
 */
export function drawCrystalFallPicture(d: Draw): void {
  d.pen.clipped(ceramic(d, 11, true), () => fallMarks(d));
}

function fallMarks(d: Draw): void {
  // The surface.
  scratch(d, Array.from({ length: 36 }, (_, i) => pt(-63 + i * 3.6, -42 + Math.sin(i * 0.8) * 1.4)), 1.2);
  // The rock: the reef standing up on the left, the seabed off to the right, the cave's roof under it, hatched between.
  const top = [pt(-66, -16), ...cub(pt(-66, -16), pt(-56, -24), pt(-40, -25), pt(-24, -24), 10), ...cub(pt(-24, -24), pt(-10, -22), pt(0, -12), pt(20, -12), 10).slice(1), pt(66, -10)];
  const roof = [pt(66, 6), ...cub(pt(66, 6), pt(46, -2), pt(24, 0), pt(4, -1), 10), ...cub(pt(4, -1), pt(-14, -2), pt(-40, 2), pt(-66, 0), 10).slice(1)];
  const rock = [...top, ...roof];
  d.pen.fill(rock, ASTER.ink, 0.06);
  d.pen.clipped(rock, () => {
    for (let k = -14; k <= 14; k++) scratch(d, [pt(k * 9 - 8, 10), pt(k * 9 + 12, -30)], 0.45);
  });
  scratch(d, top, 1.3);
  scratch(d, roof, 1.3);
  // The crack, from under the craft down through the rock into the cave, its walls drawn apart.
  const crack = [pt(-26, -24), pt(-23, -18), pt(-25, -13), pt(-20, -8), pt(-21, -3), pt(-17, 0)];
  d.pen.fill([...crack, ...crack.map((p) => pt(p.x + 3.4, p.y)).reverse()], PAPER_FILL, 0.85);
  scratch(d, crack, 1);
  scratch(d, crack.map((p) => pt(p.x + 3.4, p.y)), 1);
  // The craft on the reef, cracked, and the crystal dropping out of its keel.
  craftMark(d, pt(-36, -29.5), 0.82, true);
  crystalMark(d, pt(-29, -19.5), 0.55, 1.1, false);
  for (const x of [-32, -27]) scratch(d, [pt(x, -26), pt(x + 0.6, -23)], 0.6);
  // Its fall, dashed, down the crack and through the cave to the floor.
  const fall = cub(pt(-22, -12), pt(-19, -2), pt(-22, 18), pt(-30, 33), 18);
  dashes(d, fall, 3, 0.9);
  arrowHead(d, fall, 3, 0.9);
  // The floor of the cave.
  scratch(d, [pt(-66, 41), pt(-30, 40), pt(10, 41.4), pt(66, 40)], 1.2);
  // The sleeper: a vast long shape along the floor, its head by the crystal, its tail curled up the far wall.
  const back = cub(pt(-16, 38), pt(-14, 20), pt(20, 16), pt(44, 22), 16);
  const tail = cub(pt(44, 22), pt(58, 25), pt(62, 12), pt(54, 8), 10);
  const belly = cub(pt(52, 14), pt(58, 22), pt(54, 36), pt(36, 39), 10);
  const body = [...back, ...tail.slice(1), pt(50, 11), ...belly, pt(-16, 39)];
  d.pen.fill(body, ASTER.ink, 0.2);
  scratch(d, [...back, ...tail.slice(1)], 1.5);
  scratch(d, [pt(50, 11), pt(52, 14), ...belly.slice(1), pt(-16, 39)], 1.3);
  // Plates along its back, a long fin, its eye shut, the line of its mouth.
  for (let i = 3; i < back.length - 1; i += 2) {
    const p = back[i]!;
    scratch(d, [p, pt(p.x + 1.4, p.y - 3)], 0.7);
  }
  scratch(d, cub(pt(16, 30), pt(22, 34), pt(30, 36), pt(36, 34), 8), 0.8);
  scratch(d, cub(pt(-10, 27), pt(-8, 29.4), pt(-4.6, 29.4), pt(-2.6, 27), 6), 1.1);
  for (const x of [-9, -6.3, -3.6]) scratch(d, [pt(x, 29), pt(x - 0.4, 30.8)], 0.5);
  scratch(d, cub(pt(-15, 34), pt(-10, 35), pt(-4, 35.4), pt(2, 34.6), 6), 0.7);
  // Asleep: bubbles rising off its head to the roof.
  for (const [x, y, r] of [[-6, 16, 1], [-8, 10, 1.4], [-5, 4.6, 1.8]] as const) scratch(d, ring(pt(x, y), r), 0.7);
  // The crystal on the floor in front of it, glowing.
  crystalMark(d, pt(-32, 37), 0.6, -0.15, true);
  // Their writing beside it: "this".
  rosette(d, pt(-52, 28), 4.4, 3);
  rosette(d, pt(50, -26), 3.6, 5);
}

// ---------------------------------------------------------------- the star chart

/** Where the star sits (off the chart's left edge) and how far out each world's orbit is drawn. */
const SUN = pt(-76, 4);
const ORBIT = { ember: 27, prism: 42, talus: 62, brine: 88, sepia: 118 } as const;
const onOrbit = (r: number, a: number): Pt => pt(SUN.x + Math.cos(a) * r, SUN.y + Math.sin(a) * r);

/** A world on the chart: a ring, washed with its colour. */
function world(d: Draw, c: Pt, r: number, wash: string, alpha = 0.55): void {
  dab(d, oval(c.x, c.y, r, r, 18), wash, alpha, 0.6);
  dab(d, oval(c.x - r * 0.35, c.y - r * 0.35, r * 0.4, r * 0.35, 10), PAPER_FILL, 0.4, r * 0.15);
  scratch(d, ring(c, r), 1);
}

/**
 * The Aster's star chart (spec, "Brine", the ending), scratched in plum on
 * a glazed tile and touched with mineral washes: the orange star at the
 * left edge with its rays, orbit arcs round it, the ringed giant with its
 * three little moons, the sea world, and a dotted course from the moons in
 * over Brine's orbit to the rust-coloured world, Talus, ringed and marked with
 * their star.
 */
export function drawStarChartPicture(d: Draw): void {
  const tile = ceramic(d, 13, false);
  d.pen.clipped(tile, () => chartMarks(d));
  // Cord through two holes at its top, to hang it by.
  for (const x of [-52, 52]) {
    paint(d, oval(x, -40, 2, 2, 10), '#5e4a63', { alpha: 1, shadow: 0.2, hatch: 0, line: 0.5 });
    lash(d, pt(x, -40), pt(x + Math.sign(x) * 4, -47), 2);
  }
}

function chartMarks(d: Draw): void {
  const { ctx } = d.pen;
  // The star: a disc washed orange at the edge, with rays.
  glow(ctx, SUN, 36, '#f2a14a', 0.5);
  dab(d, oval(SUN.x, SUN.y, 15, 15, 30), '#e08a34', 0.7, 1);
  dab(d, oval(SUN.x + 4, SUN.y - 3, 7, 6, 16), '#f6c46a', 0.6, 2);
  scratch(d, ring(SUN, 15, 30), 1.4);
  for (let k = -5; k <= 5; k++) {
    const a = k * 0.2;
    scratch(d, [onOrbit(17.5, a), onOrbit(k % 2 ? 20.5 : 23, a)], 0.8);
  }
  // The orbits: arcs round it, the far one dashed.
  for (const r of Object.values(ORBIT)) {
    const arc = Array.from({ length: 40 }, (_, i) => onOrbit(r, -0.62 + (i / 39) * 1.24));
    if (r === ORBIT.sepia) dashes(d, arc, 2, 0.6);
    else scratch(d, arc, 0.55);
  }
  world(d, onOrbit(ORBIT.ember, 0.42), 2.6, '#c46a3c', 0.5);
  world(d, onOrbit(ORBIT.prism, -0.46), 3, '#a8a2b8', 0.45);
  // The ringed giant, banded, its rings across it, and its three moons.
  const giant = onOrbit(ORBIT.sepia, -0.06);
  world(d, giant, 10, '#a77d52', 0.55);
  d.pen.clipped(oval(giant.x, giant.y, 10, 10, 20), () => {
    for (const y of [-5, -1.4, 3, 6.4]) scratch(d, [pt(giant.x - 11, giant.y + y + 1.4), pt(giant.x + 11, giant.y + y - 1.4)], 0.6);
  });
  const rings = oval(giant.x, giant.y, 17, 4, 30).map((p) => pt(p.x, p.y + (p.x - giant.x) * -0.14));
  scratch(d, [...rings, rings[0]!], 0.9);
  const moons = [pt(giant.x - 18, giant.y + 12), pt(giant.x - 22, giant.y - 4), pt(giant.x - 4, giant.y + 20)];
  moons.forEach((m, i) => world(d, m, 2.4, ['#8f8a90', '#7fa877', '#c97a88'][i]!, 0.6));
  // The sea world, waves on it.
  const sea = onOrbit(ORBIT.brine, 0.3);
  world(d, sea, 7.4, '#7a5fae', 0.55);
  d.pen.clipped(oval(sea.x, sea.y, 7.4, 7.4, 18), () => {
    for (const y of [-2.6, 1, 4.4]) scratch(d, Array.from({ length: 9 }, (_, i) => pt(sea.x - 8 + i * 2, sea.y + y + Math.sin(i * 1.4) * 0.8)), 0.6);
  });
  // Talus, further in: rust red, pitted, ringed round, their star beside it.
  const talus = onOrbit(ORBIT.talus, -0.3);
  world(d, talus, 6.4, '#a4482a', 0.7);
  for (const [x, y] of [[-2, -1], [2, 2], [1, -3]] as const) scratch(d, ring(pt(talus.x + x, talus.y + y), 0.8, 8), 0.45);
  scratch(d, ring(talus, 10.4, 26), 0.8);
  starMark(d, pt(talus.x - 3, talus.y - 17), 4, 0.9);
  // The course: dotted from the moons, curving in over the sea world's orbit, to Talus.
  const course = cub(pt(moons[1]!.x - 4, moons[1]!.y - 2), pt(giant.x - 50, giant.y - 30), pt(talus.x + 34, talus.y - 22), pt(talus.x + 12, talus.y - 3), 30);
  dots(d, course, 2, 0.75);
  arrowHead(d, course, 3.4, 0.9);
  // Their writing by the worlds, and a word under Talus.
  rosette(d, pt(giant.x + 4, giant.y - 20), 3.4, 7);
  rosette(d, pt(sea.x + 12, sea.y + 4), 3, 8);
  rosette(d, pt(talus.x + 2, talus.y + 17), 4, 9);
  rosette(d, pt(talus.x + 12, talus.y + 18), 3, 10);
}
