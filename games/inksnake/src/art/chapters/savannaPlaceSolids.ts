import type { Rng } from '../../logic/rng';
import { blob, body, castShadow, polar, SHADOW } from '../groundKit';
import { closed, type Draw, pt, shade, TAU } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { mix, rgba } from '../wash';
import { rngAt } from './barrensPlaceKit';
import {
  CLAY, CLAY_DEEP, CLAY_LIT, dots, EARTH_DEEP, EARTH_PALE, GRANITE, GRANITE_DEEP, GRANITE_LIT, LICHEN_ORANGE, LICHEN_PALE, paintBlades, SHADE, STRAW, STRAW_DEEP,
  STRAW_PALE, tuft,
} from './savannaPlaceKit';

/**
 * The Savanna's other solid things, from above: a termite mound
 * (Macrotermes: a dome of orange-red clay built grain by grain, its
 * chimneys rising out of it each with a vent, rain-cut runnels down its
 * sides, an apron of washed-down soil round its foot) and a granite boulder
 * (a kopje's rounded tor: pink-grey and speckled, peeling in curved sheets,
 * blotched with orange and pale lichen). Each casts its shadow down-right
 * and has a little dry grass at its foot.
 */

/** A soft-edged gradient fill of a shape: `inner` at the light side, `outer` at the far side. */
function lit(d: Draw, shape: readonly Pt[], c: Pt, r: number, inner: string, outer: string, alpha: number): void {
  const { ctx } = d.pen;
  const g = ctx.createRadialGradient(c.x - r * 0.35, c.y - r * 0.45, r * 0.05, c.x, c.y, r * 1.15);
  g.addColorStop(0, rgba(inner, alpha));
  g.addColorStop(0.55, rgba(mix(inner, outer, 0.5), alpha));
  g.addColorStop(1, rgba(outer, alpha));
  d.pen.clipped(shape, () => {
    ctx.fillStyle = g;
    ctx.fillRect(c.x - r * 1.3, c.y - r * 1.3, r * 2.6, r * 2.6);
  });
}

/** A ring of dry grass round a thing's foot. */
function footGrass(d: Draw, c: Pt, r: number, rng: Rng, n: number): void {
  const blades = [];
  for (let k = 0; k < n; k++) {
    const a = rng() * TAU;
    blades.push(...tuft(polar(c, a, r * (0.95 + rng() * 0.25)), 5 + rng() * 5, 7, rng, a, 0.6));
  }
  paintBlades(d, blades, [STRAW_DEEP, STRAW, STRAW_PALE], 0.6, 1.6, 0.16);
}

/** A turret of the mound, from above: a round lumpy top lit upper left, shaded off; the tallest has its vent, a dark hole. */
function turret(d: Draw, c: Pt, r: number, rng: Rng, vent: boolean): void {
  const { pen } = d;
  const top = blob(c, r, r * (0.8 + rng() * 0.2), rng, 0.25, 18, rng() * TAU);
  castShadow(d, top, r * (vent ? 1.3 : 0.7), 0.22, SHADE);
  body(d, top, CLAY, 0.9);
  lit(d, top, c, r, CLAY_LIT, CLAY_DEEP, 0.75);
  pen.clipped(top, () => pen.stipple(top, r * r * 3, () => 0.8, 0.4, rgba(CLAY_DEEP, 0.5)));
  pen.crescent(top, pt(-SHADOW.x * r * 0.5, -SHADOW.y * r * 0.5), () => pen.fill(top, CLAY_DEEP, 0.22));
  if (vent) {
    const hole = blob(pt(c.x - r * 0.1, c.y - r * 0.05), r * 0.24, r * 0.2, rng, 0.25, 12, rng() * TAU);
    pen.fill(hole, '#4a2616', 0.75);
    pen.crescent(hole, pt(SHADOW.x * r * 0.2, SHADOW.y * r * 0.2), () => pen.fill(hole, CLAY_LIT, 0.35));
  }
  pen.hair(closed(top).slice(9, 19), 0.45, CLAY_DEEP, 0.5);
}

export function termiteMound(d: Draw, c: Pt, r: number): void {
  const { pen } = d;
  const rng = rngAt(c.x, c.y, 7);
  // The apron of soil the rain washed down off it.
  const apron = blob(c, r * 1.55, r * 1.45, rng, 0.22, 28, rng() * TAU);
  pen.fill(apron, CLAY, 0.18);
  pen.fill(blob(c, r * 1.3, r * 1.2, rng, 0.2, 24, rng() * TAU), CLAY_LIT, 0.16);
  dots(d, CLAY_DEEP, 0.4, Array.from({ length: 160 }, () => {
    const p = polar(c, rng() * TAU, r * (1 + rng() * 0.55));
    return [p.x, p.y, 0.3 + rng() * 0.6] as const;
  }));
  footGrass(d, c, r * 1.1, rng, 9);
  const dome = blob(c, r * 1.05, r * 0.92, rng, 0.2, 34, rng() * TAU);
  castShadow(d, dome, r * 1.2, 0.22, SHADE);
  castShadow(d, dome, r * 0.6, 0.22, SHADE);
  body(d, dome, CLAY, 0.92);
  lit(d, dome, c, r, CLAY_LIT, CLAY_DEEP, 0.9);
  pen.clipped(dome, () => {
    // Runnels the rain cut down its sides, running out from the top.
    for (let k = 0; k < 22; k++) {
      const a = rng() * TAU;
      const p0 = polar(c, a, r * (0.35 + rng() * 0.2));
      const p1 = polar(c, a + (rng() - 0.5) * 0.2, r * 1.02);
      pen.hair([p0, polar(p0, a + (rng() - 0.5) * 0.3, r * 0.3), p1], 0.45, CLAY_DEEP, 0.45);
      pen.hair([pt(p0.x - 0.6, p0.y - 0.6), pt(p1.x - 0.6, p1.y - 0.6)], 0.35, PAPER_FILL, 0.2);
    }
    // The grains of clay it's built of.
    pen.stipple(dome, 900, () => 0.8, 0.45, rgba(CLAY_DEEP, 0.5));
    pen.stipple(dome, 400, (x, y) => (x + y < c.x + c.y ? 0.9 : 0.2), 0.4, rgba(CLAY_LIT, 0.7));
    pen.crescent(dome, pt(-SHADOW.x * r * 0.55, -SHADOW.y * r * 0.55), () => pen.hatch(dome, 2, 0.9, 0.4, { color: d.ink, alpha: 0.3 }));
  });
  shade(d, dome, 0.25);
  pen.stroke(closed(dome), 0.9, mix(CLAY_DEEP, d.ink, 0.45), 0.75);
  // Turrets built up on it: lumps and buttresses round the side, the tall chimney with its vent.
  const n = 3 + Math.floor(rng() * 2);
  const ph = rng() * TAU;
  for (let k = 0; k < n; k++) turret(d, polar(c, ph + (k / n) * TAU + (rng() - 0.5) * 0.8, r * (0.5 + rng() * 0.2)), r * (0.16 + rng() * 0.1), rng, false);
  turret(d, polar(c, ph + 2, r * 0.25), r * 0.3, rng, false);
  turret(d, polar(c, ph + 4.5, r * 0.15), r * 0.34, rng, true);
}

/** Granite's grain: pink feldspar, white quartz and black mica flecks. */
function grain(d: Draw, shape: readonly Pt[], n: number): void {
  d.pen.stipple(shape, n, () => 0.8, 0.5, rgba('#c9958a', 0.6));
  d.pen.stipple(shape, n * 0.7, () => 0.8, 0.45, rgba(GRANITE_LIT, 0.8));
  d.pen.stipple(shape, n * 0.5, () => 0.8, 0.35, rgba('#2e2a2c', 0.6));
}

export function granite(d: Draw, c: Pt, r: number): void {
  const { pen } = d;
  const rng = rngAt(c.x, c.y, 9);
  footGrass(d, c, r * 0.95, rng, 10);
  const rock = blob(c, r * 1.04, r * 0.92, rng, 0.12, 32, rng() * TAU);
  castShadow(d, rock, r * 0.5, 0.32, SHADE);
  body(d, rock, GRANITE, 0.92);
  lit(d, rock, c, r, GRANITE_LIT, GRANITE_DEEP, 0.85);
  pen.clipped(rock, () => {
    grain(d, rock, 700);
    // Exfoliation: curved sheets peeling off the dome, each edge a crack lit on its upper side.
    for (let k = 0; k < 2; k++) {
      const rr = r * (0.55 + k * 0.25 + rng() * 0.06);
      const a0 = rng() * TAU;
      const arcPts = Array.from({ length: 10 }, (_, i) => polar(polar(c, a0 + 1, r * 0.15), a0 + (i / 9) * (0.9 + rng() * 0.6), rr));
      pen.hair(arcPts, 0.6, GRANITE_DEEP, 0.75);
      pen.hair(arcPts.map((p) => pt(p.x - 0.7, p.y - 0.8)), 0.45, PAPER_FILL, 0.45);
    }
    // Lichen: orange rosettes and pale grey-green crusts.
    for (let k = 0; k < 6; k++) {
      const p = polar(c, rng() * TAU, Math.sqrt(rng()) * r * 0.8);
      const s = blob(p, 2 + rng() * 4, 1.6 + rng() * 3, rng, 0.45, 12, rng() * TAU);
      pen.fill(s, rng() < 0.5 ? LICHEN_ORANGE : LICHEN_PALE, 0.55);
      pen.stipple(s, 20, () => 0.8, 0.35, rgba(PAPER_FILL, 0.5));
    }
    pen.crescent(rock, pt(-SHADOW.x * r * 0.55, -SHADOW.y * r * 0.55), () => pen.hatch(rock, 1.8, 0.9, 0.4, { color: d.ink, alpha: 0.3 }));
  });
  shade(d, rock, 0.25);
  pen.stroke(closed(rock), 1, mix(GRANITE_DEEP, d.ink, 0.3), 0.8);
  // The dust banked against its foot on the windward side.
  pen.fill(blob(polar(c, 3.9, r * 0.9), r * 0.5, r * 0.18, rng, 0.3, 12, 2.3), EARTH_PALE, 0.25);
  pen.hair(blob(polar(c, 0.9, r * 1.02), r * 0.55, r * 0.14, rng, 0.2, 10, 2.5).slice(0, 6), 0.5, EARTH_DEEP, 0.3);
}
