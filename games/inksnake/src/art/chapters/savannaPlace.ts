import type { SolidDef } from '../../level/types';
import { arc, blob, body, castShadow, polar, SHADOW } from '../groundKit';
import { closed, type Draw, edge, oval, pt, skin, TAU, tube } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import type { PlaceArt } from '../places/types';
import { mix, rgba } from '../wash';
import { rngAt } from './barrensPlaceKit';
import { umbrellaThorn } from './savannaPlaceAcacia';
import { paintSavannaGround } from './savannaPlaceGround';
import { BARK, BARK_DARK, NEST, NEST_DEEP, NEST_GREEN, SHADE, STRAW_PALE, treeOf } from './savannaPlaceKit';
import { granite, termiteMound } from './savannaPlaceSolids';

/**
 * The Savanna (chapter 4), painted: East African savanna from above in the
 * dry season, ink and wash. The ground (with its grass, tall grass and the
 * litter under the acacias) is in savannaPlaceGround.ts, the acacias in
 * savannaPlaceAcacia.ts, the termite mounds and boulders in
 * savannaPlaceSolids.ts; the weavers' nests are here. The Savanna has no
 * cover: its tall grass is ground, with the view's live blades over it.
 */

/** A solid of a look the Savanna has no painting for: a plain washed shape, so a new look still shows. */
function plain(d: Draw, s: SolidDef): void {
  const shape = s.kind === 'circle' ? oval(s.x, s.y, s.r, s.r, 24) : [pt(s.x, s.y), pt(s.x + s.w, s.y), pt(s.x + s.w, s.y + s.h), pt(s.x, s.y + s.h)];
  castShadow(d, shape, 8, 0.2);
  skin(d, shape, '#a8805a', 0.6);
  edge(d, shape, 1.4);
}

function solid(d: Draw, s: SolidDef): void {
  if (s.kind === 'circle') {
    const c = pt(s.x, s.y);
    if (s.look === 'acacia') return umbrellaThorn(d, c, s.r);
    if (s.look === 'termite') return termiteMound(d, c, s.r);
    if (s.look === 'rock') return granite(d, c, s.r);
  }
  plain(d, s);
}

/** Woven strands round a ring: short arcs laid one over another as a weaver knots them, in one colour. */
function strands(d: Draw, c: Pt, r0: number, r1: number, n: number, colour: string, alpha: number, width: number, seed: number): void {
  const rng = rngAt(c.x, c.y, seed);
  const { ctx } = d.pen;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = rgba(colour, alpha);
  ctx.lineWidth = width;
  ctx.beginPath();
  for (let k = 0; k < n; k++) {
    const a = rng() * TAU;
    const r = r0 + rng() * (r1 - r0);
    const span = 0.5 + rng() * 0.9;
    const p0 = polar(c, a, r);
    const pm = polar(c, a + span / 2, r + (rng() - 0.5) * 3);
    const p1 = polar(c, a + span, r + (rng() - 0.5) * 2);
    ctx.moveTo(p0.x, p0.y);
    ctx.quadraticCurveTo(pm.x, pm.y, p1.x, p1.y);
  }
  ctx.stroke();
  ctx.restore();
}

/**
 * A weaver's nest hanging from its acacia's twig, seen from above (the egg
 * is drawn by the game in its hollow): a ball woven of fresh green and
 * drying straw-gold grass strips, knotted round the twig it hangs from,
 * loose ends sticking out, the hollow dark inside, its shadow on the
 * ground well below and to the right (it hangs high).
 */
function weaverNest(d: Draw, p: Pt): void {
  const { pen } = d;
  const rng = rngAt(p.x, p.y, 11);
  const tree = treeOf(p);
  const toTree = tree ? Math.atan2(tree.y - p.y, tree.x - p.x) : -2.4;
  const ball = blob(p, 13.5, 12.5, rng, 0.14, 26, rng() * TAU);
  pen.fill(ball.map((q) => pt(q.x + SHADOW.x * 11, q.y + SHADOW.y * 11)), SHADE, 0.16);
  // The twig it hangs from, its shadow too.
  const twig = arc(polar(p, toTree, 20), polar(p, toTree + Math.PI, 3), (rng() - 0.5) * 4, 8);
  const twigShape = tube(twig, 2.2, 1.2);
  pen.fill(twigShape.map((q) => pt(q.x + SHADOW.x * 11, q.y + SHADOW.y * 11)), SHADE, 0.14);
  body(d, ball, NEST, 0.85);
  strands(d, p, 4, 13, 70, NEST_DEEP, 0.75, 0.8, 1);
  strands(d, p, 5, 13.5, 60, NEST, 0.95, 0.9, 2);
  strands(d, p, 6, 13, 45, NEST_GREEN, 0.9, 0.85, 3);
  strands(d, p, 7, 13, 30, STRAW_PALE, 0.85, 0.6, 4);
  pen.crescent(ball, pt(-SHADOW.x * 6, -SHADOW.y * 6), () => pen.fill(ball, NEST_DEEP, 0.35));
  // The hollow: dark, the rim's shade on its near (upper-left) wall, its far wall lit.
  const hollow = blob(p, 7.4, 6.4, rng, 0.15, 18, rng() * TAU);
  pen.fill(hollow, '#3b2c18', 0.85);
  pen.crescent(hollow, pt(SHADOW.x * 3, SHADOW.y * 3), () => pen.fill(hollow, '#1c140b', 0.55));
  pen.crescent(hollow, pt(-SHADOW.x * 2.5, -SHADOW.y * 2.5), () => pen.fill(hollow, mix(NEST, NEST_DEEP, 0.4), 0.5));
  pen.hair(closed(hollow), 0.5, d.ink, 0.5);
  // Loose strip ends poking out of the weave.
  for (let k = 0; k < 9; k++) {
    const a = rng() * TAU;
    const from = polar(p, a, 11 + rng() * 2);
    const tip = polar(from, a + (rng() - 0.5) * 1.2, 3 + rng() * 5);
    pen.hair([pt(from.x + 1.5, from.y + 2.2), pt(tip.x + 1.5, tip.y + 2.2)], 0.6, SHADE, 0.18);
    pen.hair([from, tip], 0.7, rng() < 0.5 ? NEST_GREEN : NEST, 0.95);
  }
  pen.stroke(closed(ball), 0.8, mix(NEST_DEEP, d.ink, 0.5), 0.7);
  // The twig over the rim, strips knotted round it.
  body(d, twigShape, BARK, 0.95);
  pen.hair(twig.map((q) => pt(q.x - SHADOW.x * 0.6, q.y - SHADOW.y * 0.6)), 0.45, PAPER_FILL, 0.4);
  pen.hair(closed(twigShape), 0.4, BARK_DARK, 0.8);
  for (let i = 3; i < twig.length - 1; i += 2) {
    const q = twig[i]!;
    const n = polar(q, toTree + Math.PI / 2, 2.4);
    const m = polar(q, toTree - Math.PI / 2, 2.4);
    pen.hair([n, polar(q, toTree + 0.4, 1), m], 0.7, NEST_GREEN, 0.95);
  }
}

export const SAVANNA_PLACE: PlaceArt | undefined = {
  ground: paintSavannaGround,
  solid,
  nest: weaverNest,
  cover: () => undefined,
};
