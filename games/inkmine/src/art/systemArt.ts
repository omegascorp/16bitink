import type { World } from '../logic/starSystem';
import { capsule, edge, oval, pt, type Draw } from './kit';
import { dab, glow, mix, SHADOW } from './paint';
import { guildMark, hullPlate } from './landerParts';
import { part, rivets, roundRect, seam, sheen, WASH } from './prospector/parts';
import { ringedPlanet, sphere } from './skyArt';

/**
 * The star map's pictures (spec, "The first star system"), painted as the
 * sky's planets are: each world a washed sphere with a lit side and a
 * hatched night side, in its own colours, with the one mark that tells it
 * apart (craters, cracks, a haze, a glow). Origin at the world's centre.
 */

/** Each world's lit and shaded wash. */
const COLOURS: Readonly<Record<string, readonly [string, string]>> = {
  ember: ['#e9a46a', '#7a2f22'],
  prism: ['#e4ebf2', '#8a93a8'],
  talus: ['#dc8f62', '#7d3b2a'],
  brine: ['#ad92cf', '#4b3f7a'],
  graphite: ['#c2bfba', '#5b5a62'],
  mycel: ['#b0c98f', '#4f6b3e'],
  cardia: ['#dc7f78', '#7a2f3a'],
  indigo: ['#86a4dc', '#2e3f7a'],
  umbra: ['#f0f4f7', '#8d9db0'],
  pumice: ['#dcd5c6', '#8f877a'],
  rime: ['#f3f7f9', '#a3b4c4'],
};

/** How big a world is drawn: by the cube root of its mass, giants bigger. */
export function worldRadius(w: World): number {
  if (w.id === 'sepia') return 26;
  if (w.kind === 'giant') return 22;
  return Math.round(6 + 11 * Math.cbrt(w.mass));
}

/** Room a world's picture needs round its centre (Sepia's rings reach out past it). */
export const worldFrame = (w: World): number => Math.ceil(worldRadius(w) * (w.id === 'sepia' ? 2.2 : 1.25)) * 2;

/** The mark that sets each world apart, painted over its sphere. */
function mark(d: Draw, w: World, r: number): void {
  const ink = d.ink;
  const globe = oval(0, 0, r, r, 32);
  d.pen.clipped(globe, () => {
    if (w.id === 'graphite' || w.id === 'pumice') {
      // Craters (Graphite) or pits (Pumice).
      const pits: readonly (readonly [number, number, number])[] = w.id === 'graphite'
        ? [[-0.35, -0.2, 0.22], [0.3, 0.25, 0.16], [0.05, -0.5, 0.1]]
        : [[-0.4, -0.1, 0.12], [0.1, 0.3, 0.14], [0.35, -0.3, 0.1], [-0.1, -0.45, 0.08], [0.45, 0.2, 0.08]];
      for (const [x, y, k] of pits) {
        dab(d, oval(x * r, y * r, k * r, k * r * 0.8, 14), SHADOW, 0.35, 0.6);
        d.pen.hair(oval(x * r, y * r, k * r, k * r * 0.8, 14), 0.4, ink, 0.6);
      }
    } else if (w.id === 'umbra') {
      // Cracks across the ice shell.
      for (const c of [[-0.9, -0.2, 0.2, 0.1, 0.8, -0.3], [-0.5, 0.6, 0.1, 0.2, 0.5, 0.7]] as const) {
        d.pen.hair([pt(c[0] * r, c[1] * r), pt(c[2] * r, c[3] * r), pt(c[4] * r, c[5] * r)], 0.6, '#9b5a4a', 0.8);
      }
    } else if (w.id === 'brine') {
      for (const [x, y] of [[-0.3, -0.3], [0.2, 0.1], [0.45, -0.4]] as const) d.pen.fill(oval(x * r, y * r, r * 0.14, r * 0.08, 10), '#c7a978', 0.9);
    } else if (w.id === 'indigo') {
      for (const k of [-0.35, 0.1, 0.45]) d.pen.hair([pt(-r, k * r), pt(r, k * r - r * 0.08)], 0.8, '#5a75b4', 0.6);
    } else if (w.id === 'talus') {
      d.pen.fill(oval(0, -r * 0.86, r * 0.4, r * 0.14, 12), '#f6efe4', 0.9);
    } else if (w.id === 'prism') {
      for (const [x, y] of [[-0.3, -0.2], [0.25, 0.3]] as const) d.pen.stroke([pt(x * r - 2, y * r), pt(x * r + 2, y * r)], 0.6, '#ffffff', 0.9, false);
    }
  });
  if (w.id === 'ember') glow(d.pen.ctx, pt(r * 0.45, r * 0.4), r * 0.7, '#ff7a3a', 0.5);
  if (w.id === 'mycel' || w.id === 'cardia') {
    // A haze of air round it: the worlds big enough to hold some.
    d.pen.hair(oval(0, 0, r + 1.6, r + 1.6, 32), 1.4, w.id === 'mycel' ? '#9fc07c' : '#e8a49c', 0.6);
  }
}

export function drawWorld(d: Draw, w: World): void {
  const r = worldRadius(w);
  if (w.id === 'sepia') {
    ringedPlanet(d, pt(0, 0), r);
    return;
  }
  const [light, dark] = COLOURS[w.id] ?? ['#ddd', '#888'];
  const globe = oval(0, 0, r, r, 32);
  sphere(d, pt(0, 0), r, globe, light, dark);
  mark(d, w, r);
  edge(d, globe, r > 12 ? 1.2 : 0.9);
}

/** The star's frame: a big disc, cut by the map's left edge. */
export const STAR_ART = { w: 220, h: 440, r: 150 } as const;

/** The orange star, a slice of its disc at the map's left edge, glowing. Origin at the frame's right edge's middle; the disc stops 30 short of it. */
export function drawStar(d: Draw): void {
  const ctx = d.pen.ctx;
  const c = pt(-STAR_ART.r - 30, 0);
  glow(ctx, c, STAR_ART.r + 60, '#ffb35a', 0.55);
  const disc = oval(c.x, c.y, STAR_ART.r, STAR_ART.r, 64);
  const g = ctx.createRadialGradient(c.x, c.y, STAR_ART.r * 0.2, c.x, c.y, STAR_ART.r);
  g.addColorStop(0, '#fff1c9');
  g.addColorStop(0.7, '#ffc46e');
  g.addColorStop(1, '#f08a3c');
  d.pen.clipped(disc, () => {
    ctx.fillStyle = g;
    ctx.fillRect(c.x - STAR_ART.r, c.y - STAR_ART.r, STAR_ART.r * 2, STAR_ART.r * 2);
    // Granules on its face.
    for (let k = 0; k < 40; k++) dab(d, oval(c.x + STAR_ART.r * (0.5 + Math.sin(k * 7.3) * 0.45), c.y + STAR_ART.r * Math.cos(k * 3.1) * 0.9, 6, 4, 8), '#e0782f', 0.12, 1);
  });
  edge(d, disc, 1.4, 0.8);
}

/** The ship's frame. */
export const SHIP_ART = { w: 104, h: 44 } as const;

const HULL = '#cfcbc0';
const WINDOW_LIT = '#ffe6a3';
const WINDOW_DARK = '#3a3f55';

/**
 * Your ship, side on, nose to the right (spec, "Your starship and
 * travel"): a long plated mining hull on a spine, three ore pods slung
 * under it, an engine block at the back with radiator fins and two bells,
 * the jump drive's ring round her waist (burnt dark: it's dead), a bridge
 * with a strip of windows, a dish, and the guild's mark. Her windows are
 * dark until her power's back (`lit`). Origin at the centre.
 */
export function drawShip(d: Draw, lit: boolean): void {
  const ink = d.ink;
  // Radiator fins, above and below the engine block, behind everything.
  for (const dir of [-1, 1]) {
    const fin = [pt(-40, dir * 5), pt(-30, dir * 5), pt(-32, dir * 15), pt(-44, dir * 15)];
    part(d, fin, '#9aa6b8', { shadow: 0.35, line: 0.6, hatch: 0 });
    for (let x = -42; x < -31; x += 2) d.pen.hair([pt(x + 1, dir * 6), pt(x, dir * 14.4)], 0.35, ink, 0.45);
  }
  // Two engine bells out of the back.
  for (const y of [-3.4, 3.4]) {
    const b = [pt(-44, y - 1.8), pt(-44, y + 1.8), pt(-50, y + 3.6), pt(-50, y - 3.6)];
    part(d, b, '#6d6874', { shadow: 0.5, line: 0.7, gloss: true, hatch: 0 });
  }
  const block = roundRect(-45, -6.5, -28, 6.5, 2);
  part(d, block, WASH.darkMetal, { shadow: 0.5, line: 0.8, gloss: true, hatch: 0.2 });
  // The spine and the hull along it.
  const hull = [pt(-29, -7), pt(26, -7), pt(36, -4.6), pt(42, -1), pt(42, 1.6), pt(36, 4.6), pt(26, 7), pt(-29, 7)];
  // An upper deck along her back, behind the hull's top edge.
  const deck = [pt(-20, -7), pt(-17, -10.4), pt(20, -10.4), pt(26, -7)];
  part(d, deck, mix(HULL, SHADOW, 0.12), { shadow: 0.45, line: 0.75, gloss: true, hatch: 0.1 });
  for (const x of [-12, -6, 0, 6, 12]) {
    if (lit) glow(d.pen.ctx, pt(x, -8.6), 1.8, WINDOW_LIT, 0.45);
    part(d, roundRect(x - 1.6, -9.4, x + 1.6, -7.8, 0.4), lit ? WINDOW_LIT : WINDOW_DARK, { shadow: 0, line: 0.35, hatch: 0, alpha: 1 });
  }
  hullPlate(d, hull, HULL, -29, 42, -7, 7, 0.15);
  // Shade her underside, and run the guild's cobalt stripe along her.
  d.pen.clipped(hull, () => {
    dab(d, roundRect(-30, 3.4, 44, 8, 2), SHADOW, 0.22, 1.5);
    d.pen.fill([pt(-29, 0.6), pt(36, 0.6), pt(39, 2.4), pt(-29, 2.4)], '#3d4f86', 0.85);
  });
  edge(d, hull, 1);
  for (const x of [-16, -3, 10, 23]) seam(d, [pt(x, -6.8), pt(x, 6.8)], 0.45);
  rivets(d, [-22, -10, 3, 16].map((x) => pt(x, -5.4)), 0.45);
  guildMark(d, pt(-9, 4.6), 1.6);
  // The bridge: a strip of windows in the nose.
  const glass = [pt(30, -4.6), pt(37, -3), pt(40.4, -0.6), pt(30, -0.6)];
  if (lit) glow(d.pen.ctx, pt(35, -2.4), 7, WINDOW_LIT, 0.55);
  part(d, glass, lit ? WINDOW_LIT : '#26314f', { shadow: lit ? 0 : 0.3, line: 0.6, hatch: 0, gloss: !lit, alpha: 1 });
  // Portholes down her side.
  for (const x of [-24, -19, 6, 12, 18]) {
    if (lit) glow(d.pen.ctx, pt(x, -2.6), 2.4, WINDOW_LIT, 0.5);
    d.pen.dot(x, -2.6, 1, lit ? WINDOW_LIT : WINDOW_DARK);
    d.pen.hair(oval(x, -2.6, 1.15, 1.15, 10), 0.35, ink, 0.8);
  }
  // Three ore pods under her, clamped on.
  for (const x of [-21, -6, 9]) {
    d.pen.stroke([pt(x + 2, 7), pt(x + 2, 9)], 0.9, ink, 0.85, false);
    d.pen.stroke([pt(x + 9, 7), pt(x + 9, 9)], 0.9, ink, 0.85, false);
    const pod = capsule(pt(x, 12), pt(x + 11, 12), 3.4, 3.4);
    part(d, pod, '#b48a55', { shadow: 0.5, line: 0.75, gloss: true });
    d.pen.hair([pt(x + 5.5, 8.8), pt(x + 5.5, 15.2)], 0.4, ink, 0.6);
  }
  // The jump drive's ring round her waist, burnt dark.
  const ringBack = oval(-33, 0, 3.4, 16, 28);
  d.pen.stroke(ringBack.slice(7, 22), 2.6, '#2b2e3c', 0.9, false);
  part(d, roundRect(-35, -16.5, -31, -13, 1), '#3a3d4c', { shadow: 0.4, line: 0.6, hatch: 0 });
  part(d, roundRect(-35, 13, -31, 16.5, 1), '#3a3d4c', { shadow: 0.4, line: 0.6, hatch: 0 });
  d.pen.stroke([...ringBack.slice(21), ...ringBack.slice(0, 8)], 2.6, '#3a3d4c', 1, false);
  d.pen.hair([...ringBack.slice(21), ...ringBack.slice(0, 8)], 0.5, ink, 0.9);
  dab(d, oval(-31, -6, 2.4, 4, 10), '#141622', 0.4, 1);
  // The dish on its mast.
  d.pen.stroke([pt(16, -7), pt(18, -13)], 0.8, ink, 0.9, false);
  const dishShape = [pt(13.4, -14), pt(22.6, -15.6), pt(21, -12.4), pt(15.4, -11.6)];
  part(d, dishShape, '#d9dce2', { shadow: 0.4, line: 0.6, hatch: 0, gloss: true });
  sheen(d, [pt(-26, -6), pt(24, -6)], 0.7);
  if (!lit) dab(d, oval(0, 0, 40, 7, 24), SHADOW, 0.12, 2);
}
