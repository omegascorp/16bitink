import { createRng } from '../logic/rng';
import { edge, oval, pt, shade, skin, type Draw } from './kit';
import type { GroundStyle } from './palette';
import type { Pt } from './pen';

/**
 * Graphite's sky: stars in ink, a ringed planet hanging over the horizon
 * and the rims of far craters. Two layers so they can scroll at different
 * speeds: the far sky (`drawSky`) and the crater ridges (`drawRidges`),
 * each drawn from the top-left of its canvas with the horizon at
 * `horizon`; below it they carry on down to the canvas's bottom edge, so no
 * paper shows where the ground dips.
 */
export const SKY_W = 2600;
export const RIDGE_W = 3200;

export function drawSky(d: Draw, w: number, h: number, horizon: number, style: GroundStyle): void {
  const { pen } = d;
  pen.fill([pt(0, 0), pt(w, 0), pt(w, h), pt(0, h)], style.sky, 0.55);
  const rng = createRng(77);
  // Stars: dots and small ink crosses, thinning towards the horizon.
  for (let i = 0; i < 140; i++) {
    const x = rng() * w;
    const y = rng() * rng() * horizon * 0.9;
    const r = 0.5 + rng() * 0.9;
    if (rng() < 0.2) {
      pen.hair([pt(x - r * 3, y), pt(x + r * 3, y)], 0.6, d.ink, 0.8);
      pen.hair([pt(x, y - r * 3), pt(x, y + r * 3)], 0.6, d.ink, 0.8);
    } else pen.dot(x, y, r, d.ink, 0.65);
  }
  ringedPlanet(d, pt(w * 0.42, horizon * 0.58), Math.min(70, horizon * 0.2));
  const moon = oval(w * 0.12, horizon * 0.45, 13, 13, 22);
  skin(d, moon, '#e6e0cf', 0.5);
  shade(d, moon, 0.5, true);
  edge(d, moon, 1.2);
}

function ringedPlanet(d: Draw, c: Pt, r: number): void {
  const tilt = -0.32;
  const ring = (k: number, half: 'back' | 'front'): Pt[] => {
    const pts: Pt[] = [];
    for (let i = 0; i <= 40; i++) {
      const a = (half === 'back' ? Math.PI : 0) + (i / 40) * Math.PI;
      const x = Math.cos(a) * r * k;
      const y = Math.sin(a) * r * k * 0.28;
      pts.push(pt(c.x + x * Math.cos(tilt) - y * Math.sin(tilt), c.y + x * Math.sin(tilt) + y * Math.cos(tilt)));
    }
    return pts;
  };
  for (const k of [1.55, 1.85, 2.05]) d.pen.stroke(ring(k, 'back'), 1.1, d.ink, 0.75, false);
  const globe = oval(c.x, c.y, r, r, 40);
  skin(d, globe, '#d8c9a6', 0.6);
  // Cloud bands across the globe.
  d.pen.clipped(globe, () => {
    for (const [k, w] of [[-0.45, 0.12], [-0.1, 0.07], [0.3, 0.14]] as const) {
      const y = c.y + r * k;
      d.pen.fill([pt(c.x - r, y), pt(c.x + r, y - r * 0.1), pt(c.x + r, y - r * 0.1 + r * w), pt(c.x - r, y + r * w)], '#b9a27a', 0.45);
    }
  });
  shade(d, globe, 0.55, true);
  edge(d, globe, 1.6);
  for (const k of [1.55, 1.85, 2.05]) d.pen.stroke(ring(k, 'front'), 1.3, d.ink, 0.9, false);
}

/** Far crater rims along the horizon: two hatched ranges, the nearer darker. */
export function drawRidges(d: Draw, w: number, h: number, horizon: number, style: GroundStyle): void {
  const rng = createRng(91);
  for (const [base, height, wash, alpha] of [[horizon - 6, horizon * 0.55, style.soil, 0.45], [horizon, horizon * 0.35, style.stone, 0.6]] as const) {
    const pts: Pt[] = [pt(0, h)];
    let x = 0;
    while (x <= w) {
      const crater = rng() < 0.35;
      const span = 60 + rng() * 140;
      const top = base - height * (0.3 + rng() * 0.7);
      if (crater) {
        // A crater rim: up, a dip for the bowl, down.
        pts.push(pt(x + span * 0.25, top), pt(x + span * 0.4, top + height * 0.12), pt(x + span * 0.6, top + height * 0.1), pt(x + span * 0.75, top));
      } else pts.push(pt(x + span * 0.5, top));
      x += span;
      pts.push(pt(x, base - height * 0.15 * rng()));
    }
    pts.push(pt(w, h));
    skin(d, pts, wash, alpha);
    d.pen.hatch(pts, 4.5, 2.2, 0.5, { color: d.ink, alpha: 0.35 });
    d.pen.stroke(pts.slice(1, -1), 1.3, d.ink, 0.85, false);
  }
}
