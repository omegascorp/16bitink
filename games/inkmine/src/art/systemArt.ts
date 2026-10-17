import type { World } from '../logic/starSystem';
import { edge, oval, pt, type Draw } from './kit';
import { dab, glow, SHADOW } from './paint';
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
