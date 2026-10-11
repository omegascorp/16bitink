import type { FindId } from '../logic/finds';
import { add, bezier, contact, cub, type Draw, edge, glint, lerp, oval, pt, ribbon, shade, skin, tint } from './kit';
import type { Pt } from './pen';
import { PAPER_FILL } from './palette';

/*
 * The beachcomber's finds a dig-up mission buries, one per beach, drawn in
 * the food frame (see itemArt.ts) like food and the old ink bottle: about
 * 28 units across, resting on the ground line. They show at a dozen pixels,
 * so each is a bold silhouette in one strong colour, most with a sparkle.
 */

/** A thin oval turned by `a` radians: a petal, a crystal blade. */
function blade(cx: number, cy: number, rx: number, ry: number, a: number, n = 16): Pt[] {
  const [c, s] = [Math.cos(a), Math.sin(a)];
  return oval(0, 0, rx, ry, n).map((p) => pt(cx + p.x * c - p.y * s, cy + p.x * s + p.y * c));
}

/** A shape shrunk by `k` towards a point: an inner ring, a band. */
function inset(shape: readonly Pt[], c: Pt, k: number): Pt[] {
  return shape.map((p) => pt(c.x + (p.x - c.x) * k, c.y + (p.y - c.y) * k));
}

/** A four-pointed sparkle, paper white with a fine ink rim. */
function sparkle(d: Draw, x: number, y: number, r: number): void {
  const star = Array.from({ length: 8 }, (_, i) => {
    const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
    const k = i % 2 === 0 ? r : r * 0.26;
    return pt(x + Math.cos(a) * k, y + Math.sin(a) * k);
  });
  d.pen.fill(star, PAPER_FILL, 1);
  d.pen.hair([...star, star[0]!], 0.4, d.ink, 0.7);
}

/** A steady pseudo-random 0..1 for a pair of numbers: the same freckles and flecks on every boil frame. */
function hash(a: number, b: number): number {
  const s = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453;
  return s - Math.floor(s);
}

/** A tiger cowrie, lying mouth up: a glossy cream egg, its spotted brown back curling over the rim, the toothed slit running its length. */
function cowrie(d: Draw): void {
  contact(d, 0, 15);
  const shell = oval(0, 7.5, 15.5, 10.5, 32);
  skin(d, shell, '#f3e2b8', 0.9);
  d.pen.clipped(shell, () => {
    // The spotted back, showing round the far edge.
    const back = [...bezier(pt(-17, 9), pt(0, -3), pt(17, 9), 12), pt(17, -5), pt(-17, -5)];
    tint(d, back, '#a8612e', 0.85);
    for (let i = 0; i < 18; i++) d.pen.dot(-13 + hash(i, 1) * 26, -2.5 + hash(i, 2) * 5.5, 0.6 + hash(i, 3) * 0.7, '#3a1e12', 0.85);
    tint(d, oval(-2, 12, 11, 4), '#fff8e8', 0.7);
    glint(d, bezier(pt(-12, 9), pt(-10, 14), pt(-4, 16), 8), 1.6, 0.9);
  });
  shade(d, shell, 0.3);
  edge(d, shell, 1.3);
  // The mouth: a narrow dark slit, ridged with teeth across both lips.
  const top = bezier(pt(-13, 9), pt(0, 6.2), pt(13, 9), 14);
  const bot = bezier(pt(-13, 9), pt(0, 9.6), pt(13, 9), 14);
  d.pen.fill([...top, ...[...bot].reverse()], '#2e1c14', 0.95);
  for (let i = 2; i < 13; i++) {
    d.pen.hair([add(top[i]!, pt(0, 0.4)), add(top[i]!, pt(-0.3, -2.6))], 0.8, '#5a3018', 0.9);
    d.pen.hair([add(bot[i]!, pt(0, -0.4)), add(bot[i]!, pt(0.3, 2.6))], 0.8, '#5a3018', 0.9);
  }
  sparkle(d, -6, 2, 3.2);
}

/** A scalloped ring of a desert rose: `n` blades round a centre, their rims bulging out. */
function scallop(cx: number, cy: number, rx: number, ry: number, n: number, phase: number): Pt[] {
  return Array.from({ length: n * 8 }, (_, i) => {
    const t = (i / (n * 8)) * Math.PI * 2;
    const r = 0.84 + 0.16 * Math.abs(Math.sin((t * n) / 2 + phase));
    return pt(cx + Math.cos(t) * rx * r, cy + Math.sin(t) * ry * r);
  });
}

/** A desert rose: gypsum crystals grown into a rosette, ring within ring of thin curved blades, the colour of the sand they grew in. */
function desertrose(d: Draw): void {
  contact(d, 0, 15);
  // [centre y, radius x, radius y, blades, wash]: outer ring first, each inner ring standing a little higher.
  const rings: [number, number, number, number, string][] = [
    [7.5, 16, 11, 9, '#c4836a'], [5.5, 12, 8.5, 7, '#d69a80'], [3.5, 8, 6, 6, '#e2b096'], [2.5, 4.5, 3.5, 4, '#edc6ac'],
  ];
  rings.forEach(([cy, rx, ry, n, wash], i) => {
    const ring = scallop(0, cy, rx, ry, n, i * 0.9);
    skin(d, ring, wash, 0.92);
    d.pen.clipped(ring, () => {
      d.pen.stipple(ring, 30, () => 0.6, 0.45, '#6e3e30');
      // The lit rims of this ring's blades.
      glint(d, ring.slice(n * 4 + 2, n * 8 - 2).map((p) => lerp(p, pt(0, cy), 0.08)), 0.9, 0.7);
    });
    shade(d, ring, 0.35);
    edge(d, ring, i === 0 ? 1.2 : 0.9);
  });
  d.pen.hair(bezier(pt(-1.5, 2), pt(0.5, 0.5), pt(1.5, 3), 6), 0.7, d.ink, 0.8);
  sparkle(d, 6, -3, 3.4);
}

/** A sea urchin test: the pale purple dome left without its spines, ringed with rows of dots, a little hole at the top. */
function urchin(d: Draw): void {
  contact(d, 0, 15);
  const dome = [
    ...cub(pt(-15, 16), pt(-16, 2), pt(-8, -5), pt(0, -5), 12),
    ...cub(pt(0, -5), pt(8, -5), pt(16, 2), pt(15, 16), 12).slice(1),
    ...bezier(pt(15, 16), pt(0, 19.5), pt(-15, 16), 10).slice(1),
  ];
  skin(d, dome, '#c595c4', 0.8);
  d.pen.clipped(dome, () => {
    tint(d, oval(-4, 1, 8, 5), '#f4e4f2', 0.6);
    // Five bands of paired pores from the crown down, three in view, and knobs between.
    for (const bx of [-13, -6.5, 0.5, 7.5, 14]) {
      const band = bezier(pt(0, -4), pt(bx * 1.15, -3), pt(bx, 17.5), 10);
      for (let i = 1; i < band.length; i++) {
        const p = band[i]!;
        const w = 0.5 + i * 0.12;
        d.pen.dot(p.x - w, p.y, 0.55 + i * 0.03, d.ink, 0.85);
        d.pen.dot(p.x + w, p.y, 0.55 + i * 0.03, d.ink, 0.85);
      }
    }
    for (const bx of [-10, -3, 4, 11]) {
      const row = bezier(pt(0, -4), pt(bx * 1.15, -3), pt(bx, 17.5), 6);
      for (let i = 1; i < row.length; i++) d.pen.dot(row[i]!.x, row[i]!.y, 0.9 + i * 0.1, '#7d4a7e', 0.7);
    }
    glint(d, bezier(pt(-11, 4), pt(-9, -2), pt(-3, -3.5), 8), 1.5, 0.85);
  });
  shade(d, dome, 0.35);
  edge(d, dome, 1.2);
  d.pen.fill(oval(0, -4, 2.2, 1, 10), '#4a2a4a', 0.85);
}

/** A sea heart: a big drift seed, flat, glossy chestnut brown, a groove running round its rim and a dark scar at the notch. */
function seabean(d: Draw): void {
  contact(d, 0, 15);
  const seed = [
    ...cub(pt(1, -1), pt(-3, -6), pt(-14, -5), pt(-15, 5), 10),
    ...cub(pt(-15, 5), pt(-16, 15), pt(-6, 18), pt(1, 18), 10).slice(1),
    ...cub(pt(1, 18), pt(10, 18), pt(16, 13), pt(15, 4), 10).slice(1),
    ...cub(pt(15, 4), pt(14, -5), pt(4, -6), pt(1, -1), 10).slice(1),
  ];
  skin(d, seed, '#7e3f20', 0.92);
  d.pen.clipped(seed, () => {
    tint(d, oval(-4, 4, 9, 6), '#b8662e', 0.55);
    d.pen.hair(inset(seed, pt(0, 8), 0.8), 0.8, '#2e140a', 0.7);
    glint(d, bezier(pt(-11, 6), pt(-10, -1), pt(-4, -2), 8), 1.9, 0.9);
    glint(d, [pt(7, 0), pt(10, 1.5)], 1.2, 0.7);
  });
  shade(d, seed, 0.4, true);
  edge(d, seed, 1.3);
  d.pen.fill(oval(1, 0.5, 2.2, 1.4, 10), '#1d0d06', 0.9);
}

/** One olivine crystal: a green prism with a pointed end, lit on its left facet, dark on its right. */
function crystal(d: Draw, x: number, y: number, w: number, h: number, a: number): Pt {
  const u = pt(Math.sin(a), -Math.cos(a));
  const v = pt(Math.cos(a), Math.sin(a));
  const at = (s: number, t: number): Pt => pt(x + v.x * s * w / 2 + u.x * t * h, y + v.y * s * w / 2 + u.y * t * h);
  const shape = [at(-1, 0), at(-1, 0.72), at(0, 1), at(1, 0.72), at(1, 0)];
  skin(d, shape, '#8cc63a', 0.92);
  d.pen.fill([at(0.25, 0), at(0.25, 0.92), at(0, 1), at(1, 0.72), at(1, 0)], '#4f8a1c', 0.6);
  d.pen.fill([at(-1, 0.72), at(0, 1), at(-0.15, 0.86), at(-0.7, 0.66)], '#e6f7a0', 0.8);
  d.pen.hair([at(0.25, 0.05), at(0.25, 0.92), at(0, 1)], 0.5, d.ink, 0.7);
  glint(d, [at(-0.6, 0.12), at(-0.6, 0.6)], 1.1, 0.85);
  edge(d, shape, 1);
  return at(0, 1);
}

/** Olivine: a cluster of bright green crystals on a crumb of the black basalt the volcano threw them out in. */
function olivine(d: Draw): void {
  contact(d, 0, 15);
  const rock = [...bezier(pt(-15, 17), pt(-12, 8), pt(0, 9), 8), ...bezier(pt(0, 9), pt(12, 8), pt(15, 17), 8).slice(1), ...bezier(pt(15, 17), pt(0, 19.5), pt(-15, 17), 8).slice(1)];
  skin(d, rock, '#3c3a3c', 0.9);
  d.pen.stipple(rock, 30, () => 0.8, 0.5, '#9a9488');
  edge(d, rock, 1);
  crystal(d, -8, 15, 7, 15, -0.55);
  crystal(d, 8, 15, 7, 14, 0.6);
  crystal(d, -3, 16, 5, 9, -1.15);
  const tip = crystal(d, 0, 16, 9, 23, 0.06);
  crystal(d, 4, 17, 6, 8, 1.05);
  sparkle(d, tip.x + 1, tip.y + 2, 3.6);
}

/** An agate: a honey-coloured pebble, broken open on its fine rings of amber and white, glowing where the light comes through. */
function agate(d: Draw): void {
  contact(d, 0, 15);
  const stone = [
    ...cub(pt(-15, 12), pt(-16, 2), pt(-6, -3), pt(2, -3), 10),
    ...cub(pt(2, -3), pt(11, -3), pt(16, 5), pt(15, 11), 10).slice(1),
    ...cub(pt(15, 11), pt(14, 18), pt(-13, 20), pt(-15, 12), 12).slice(1),
  ];
  const core = pt(1, 8);
  skin(d, stone, '#8a3a1c', 0.92);
  d.pen.clipped(stone, () => {
    const bands = ['#e8a03c', '#fff1d6', '#d27a2a', '#f7c25a', '#fff6e4', '#e08e34', '#fbe2a8', '#ffd76a'];
    bands.forEach((c, i) => d.pen.fill(inset(stone, core, 0.86 - i * 0.1), c, 0.95));
    for (let i = 0; i < bands.length; i++) d.pen.hair(inset(stone, core, 0.86 - i * 0.1), 0.35, '#7a3a14', 0.5);
    // Light through the stone, on the side away from the sun.
    tint(d, oval(8, 11, 5, 3.5), '#ffe08a', 0.3);
    glint(d, bezier(pt(-11, 6), pt(-9, 0), pt(-3, -1.5), 8), 1.7, 0.9);
  });
  shade(d, stone, 0.3);
  edge(d, stone, 1.2);
}

/** A gold doubloon: a thick, slightly lopsided coin propped on its rim, a worn cross on its face, beads round its edge. */
function doubloon(d: Draw): void {
  contact(d, 1, 13);
  const face = oval(0, 6.5, 11.5, 11.5, 28).map((p, i) => add(p, pt(0, i % 7 === 0 ? 0.5 : 0)));
  const rim = face.map((p) => add(p, pt(2.2, 0.4)));
  skin(d, rim, '#a8731c', 0.92);
  edge(d, rim, 1);
  skin(d, face, '#e9b938', 0.92);
  d.pen.clipped(face, () => {
    tint(d, oval(-3, 2, 7, 6), '#fbe28a', 0.6);
    d.pen.hair(inset(face, pt(0, 6.5), 0.78), 0.6, '#8a5a14', 0.8);
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2;
      d.pen.dot(Math.cos(a) * 10, 6.5 + Math.sin(a) * 10, 0.55, '#8a5a14', 0.8);
    }
    // The cross, worn smooth, with little bars at the ends of its arms.
    for (const [a, b] of [[pt(0, 0), pt(0, 13)], [pt(-6.5, 6.5), pt(6.5, 6.5)]] as const) d.pen.stroke([a, b], 2.4, '#8f5d16', 0.85, false);
    for (const [a, b] of [[pt(-2, 0.2), pt(2, 0.2)], [pt(-2, 12.8), pt(2, 12.8)], [pt(-6.3, 4.5), pt(-6.3, 8.5)], [pt(6.3, 4.5), pt(6.3, 8.5)]] as const) d.pen.hair([a, b], 1, '#8f5d16', 0.8);
    glint(d, bezier(pt(-9, 4), pt(-8, -1.5), pt(-3, -3.5), 8), 1.6, 0.85);
  });
  shade(d, face, 0.3);
  edge(d, face, 1.2);
  sparkle(d, 8.5, -2.5, 3.8);
}

/** A pearl, lustrous and faintly pink, sitting in the opened oyster, its rough shell grey outside and nacre within. */
function pearl(d: Draw): void {
  contact(d, 0, 15);
  const valve = [...bezier(pt(-16, 9), pt(-2, 6.5), pt(15, 9), 10), ...cub(pt(15, 9), pt(16, 16), pt(6, 19), pt(-2, 19), 8).slice(1), ...cub(pt(-2, 19), pt(-11, 19), pt(-17, 15), pt(-16, 9), 8).slice(1)];
  skin(d, valve, '#8c8574', 0.85);
  d.pen.clipped(valve, () => {
    for (let k = 0; k < 4; k++) d.pen.hair(bezier(pt(-15, 12 + k * 2), pt(0, 15 + k * 2.4), pt(15, 12 + k * 2), 10), 0.5, d.ink, 0.45);
  });
  shade(d, valve, 0.35);
  edge(d, valve, 1.1);
  // The nacre: the inside of the valve, a pearly lip.
  const nacre = oval(-0.5, 9.5, 14, 3.4, 20);
  skin(d, nacre, '#dfe6ea', 0.7);
  d.pen.clipped(nacre, () => {
    tint(d, oval(-7, 10, 6, 2.5), '#f0cfdc', 0.6);
    tint(d, oval(7, 9.5, 6, 2.5), '#c6dbe6', 0.6);
  });
  edge(d, nacre, 0.8);
  const ball = oval(0, 1.5, 8.5, 8.5, 24);
  skin(d, ball, '#f1e2e2', 0.6);
  d.pen.clipped(ball, () => {
    tint(d, oval(3, 5, 6.5, 5), '#d9c2d2', 0.55);
    tint(d, oval(4.5, 7, 4, 2.2), '#c6dbe6', 0.5);
    d.pen.dot(-3, -2.5, 2.2, PAPER_FILL, 1);
  });
  shade(d, ball, 0.2);
  edge(d, ball, 1.1);
  sparkle(d, -4, -3.5, 3.8);
}

/** Labradorite: a dull grey stone, broken into facets, with a sweep of blue and gold flashing out of it. */
function labradorite(d: Draw): void {
  contact(d, 0, 15);
  const stone = [pt(-14, 17), pt(-16, 7), pt(-10, -3), pt(1, -6), pt(12, -1), pt(16, 9), pt(11, 18)];
  skin(d, stone, '#6b707a', 0.9);
  d.pen.clipped(stone, () => {
    // The flash: gold at its fringe, through green to a deep peacock blue, swept across the grain.
    const sweep = cub(pt(-18, 5), pt(-6, -6), pt(4, 16), pt(18, 6), 14);
    for (const [w, c, a] of [[15, '#e2bf3c', 0.85], [11, '#38b6a6', 0.85], [7, '#2a7fd8', 0.95]] as const) d.pen.fill(ribbon(sweep, (u) => w * (0.5 + 0.5 * Math.sin(Math.PI * u))).shape, c, a);
    for (const k of [-1.5, 1.5]) d.pen.hair(sweep.slice(2, 13).map((p) => add(p, pt(0, k))), 0.6, '#c4ecff', 0.85);
    // The facets it broke into.
    d.pen.hair([pt(-10, -3), pt(-3, 8), pt(-14, 17)], 0.5, d.ink, 0.6);
    d.pen.hair([pt(-3, 8), pt(12, -1)], 0.5, d.ink, 0.5);
    d.pen.hair([pt(-3, 8), pt(11, 18)], 0.5, d.ink, 0.5);
    d.pen.stipple(stone, 25, () => 0.8, 0.5, '#2a2a30');
  });
  shade(d, stone, 0.35);
  edge(d, stone, 1.2);
  sparkle(d, 3, 4.5, 3.6);
}

/** A boulder opal: a brown ironstone lump with a window of opal in it, blue fire in a mosaic of green, red and gold that shifts as it boils. */
function opal(d: Draw): void {
  contact(d, 0, 15);
  const rock = [
    ...cub(pt(-15, 15), pt(-17, 3), pt(-7, -5), pt(2, -4), 10),
    ...cub(pt(2, -4), pt(12, -4), pt(16, 5), pt(15, 12), 10).slice(1),
    ...cub(pt(15, 12), pt(14, 19), pt(-12, 20), pt(-15, 15), 12).slice(1),
  ];
  skin(d, rock, '#8a5230', 0.9);
  d.pen.stipple(rock, 40, () => 0.8, 0.5, '#4a2a18');
  const patch = [...cub(pt(-11, 7), pt(-11, -1), pt(-2, -2), pt(4, -1), 8), ...cub(pt(4, -1), pt(12, 0), pt(12, 8), pt(9, 12), 8).slice(1), ...cub(pt(9, 12), pt(4, 16), pt(-10, 15), pt(-11, 7), 8).slice(1)];
  d.pen.fill(patch, '#1d3c96', 1);
  const fire = ['#2fd09a', '#38c8ff', '#ff4a32', '#ffb52e', '#a06cff', '#7af0c0'];
  d.pen.clipped(patch, () => {
    for (let gy = -2; gy < 16; gy += 2.6) {
      for (let gx = -12; gx < 13; gx += 2.6) {
        const h = hash(gx, gy);
        if (h < 0.22) continue;
        const c = fire[Math.floor(h * 97 + d.f) % fire.length]!;
        d.pen.fill(blade(gx + hash(gy, gx) * 1.5, gy + 1, 1.7, 1.1, h * 3, 6), c, 0.9);
      }
    }
    glint(d, bezier(pt(-8, 2), pt(-6, -0.5), pt(-1, -0.5), 6), 1.2, 0.8);
  });
  d.pen.hair([...patch, patch[0]!], 0.6, d.ink, 0.8);
  shade(d, rock, 0.35);
  edge(d, rock, 1.2);
  sparkle(d, 6, 0.5, 3.8);
}

const FINDS_ART: Readonly<Record<FindId, (d: Draw) => void>> = { cowrie, desertrose, urchin, seabean, olivine, agate, doubloon, pearl, labradorite, opal };

/** A beach's find (a dig-up mission's treasure), drawn in the food frame. */
export function drawFind(d: Draw, find: FindId): void {
  FINDS_ART[find](d);
}
