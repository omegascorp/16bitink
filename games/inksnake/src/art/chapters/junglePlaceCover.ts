import { blob, castShadow, polar, SHADOW } from '../groundKit';
import { type Draw, pt, TAU } from '../kit';
import type { CoverDef } from '../../level/types';
import type { Pt } from '../pen';
import { glaze } from '../snakes/cornPaint';
import { frond } from './barrensPlaceFrond';
import { leaf, LEAF_TONES, MOSS_DEEP, rngAt, SHADE, UMBER } from './junglePlaceKit';

/**
 * The Jungle's cover, painted over the snake: a mound of leaf litter ('leaflitter': the heap of
 * dead leaves a king cobra gathers for its nest, the only snake that builds one), and a stand of
 * ferns ('fern'). Each stays inside a circle a little bigger than its r and is dense enough to
 * hide what's under it.
 */

/** A heap of dead leaves, domed: a dark core, leaves laid ring on ring from the rim to the top, the dome lit on its upper left and shaded below. */
function leafMound(d: Draw, c: CoverDef): void {
  const { pen } = d;
  const rng = rngAt(c.x, c.y, 7);
  const centre = pt(c.x, c.y);
  const { r } = c;
  const foot = blob(centre, r * 0.84, r * 0.78, rng, 0.12, 28, rng() * TAU);
  castShadow(d, foot, r * 0.22, 0.25);
  pen.fill(foot, UMBER, 0.92);
  pen.fill(foot, '#5a4430', 0.6);
  const rings = 8;
  for (let k = 0; k < rings; k++) {
    const rho = r * (0.9 - (k / rings) * 0.9);
    const n = Math.max(6, Math.round((rho * TAU) / 5.5));
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + rng() * 0.6;
      const p = polar(centre, a, rho + (rng() - 0.5) * 8);
      // The dome's shading: leaves on its lower right in shade, its top in the light.
      const towards = (Math.cos(a) * SHADOW.x + Math.sin(a) * SHADOW.y) * (rho / r);
      const len = 11 + rng() * 9;
      const turn = rng() * TAU;
      const at = polar(p, turn + Math.PI, len * 0.45);
      if (Math.hypot(at.x - c.x, at.y - c.y) + len * 0.75 > r * 1.12) continue;
      leaf(d, at, turn, len, rng, { age: Math.max(0, 0.15 + towards * 0.5 + (rng() - 0.5) * 0.2), lift: 1.4 + k * 0.25, tone: LEAF_TONES[Math.floor(rng() * LEAF_TONES.length)] });
    }
  }
  pen.clipped(foot, () => {
    pen.crescent(foot, pt(-SHADOW.x * r * 0.45, -SHADOW.y * r * 0.45), () => pen.fill(foot, UMBER, 0.32));
    pen.crescent(foot, pt(-SHADOW.x * r * 0.25, -SHADOW.y * r * 0.25), () => pen.hatch(foot, 2, 0.9, 0.4, { color: d.ink, alpha: 0.3 }));
    glaze(pen.ctx, c.x - r * 0.25, c.y - r * 0.3, r * 0.5, r * 0.4, 0, '#fff0c8', 0.22);
  });
  // A few twigs caught in the heap.
  for (let k = 0; k < 4; k++) {
    const a = rng() * TAU;
    const p = polar(centre, a, rng() * r * 0.5);
    const q = polar(p, a + (rng() - 0.5), r * (0.25 + rng() * 0.2));
    pen.stroke([pt(p.x + 1, p.y + 1.4), pt(q.x + 1, q.y + 1.4)], 1.4, UMBER, 0.35, false);
    pen.stroke([p, q], 1.2, '#7a5c40', 0.9, false);
  }
}

/** A stand of ferns: a dark understory under it, a ring of big fronds spread out from the middle, younger ones over them, all inside its reach. */
function fernStand(d: Draw, c: CoverDef): void {
  const { pen } = d;
  const rng = rngAt(c.x, c.y, 8);
  const centre = pt(c.x, c.y);
  const { r } = c;
  const keep = (p: Pt): boolean => Math.hypot(p.x - c.x, p.y - c.y) < r * 1.08;
  const under = blob(centre, r * 0.78, r * 0.72, rng, 0.2, 24, rng() * TAU);
  castShadow(d, under, r * 0.2, 0.22);
  pen.fill(under, MOSS_DEEP, 0.9);
  pen.fill(under, SHADE, 0.5);
  const big = 9;
  for (let k = 0; k < big; k++) {
    const a = (k / big) * TAU + (rng() - 0.5) * 0.4;
    frond(d, polar(centre, a + Math.PI, r * 0.08), a, r * (0.98 + rng() * 0.1), rng, { bronze: rng() < 0.15 ? 0.4 : 0, lift: 3, keep, broad: 1.4 });
  }
  const young = 6;
  for (let k = 0; k < young; k++) {
    const a = (k / young) * TAU + rng() * 0.6;
    frond(d, polar(centre, a + Math.PI, r * 0.05), a, r * (0.62 + rng() * 0.2), rng, { bronze: 0, lift: 5, keep, broad: 1.2 });
  }
  // The crown where the fronds rise, curled fiddleheads in it.
  for (let k = 0; k < 3; k++) {
    const p = polar(centre, rng() * TAU, r * 0.08);
    pen.circle(p.x, p.y, 1.6 + rng(), 0.9, '#5d6e2e');
  }
}

export function paintJungleCover(d: Draw, c: CoverDef): void {
  if (c.look === 'fern') return fernStand(d, c);
  leafMound(d, c);
}
