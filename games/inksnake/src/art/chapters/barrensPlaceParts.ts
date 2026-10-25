import type { Rng } from '../../logic/rng';
import { arc, blob, body, castShadow, polar, SHADOW } from '../groundKit';
import { closed, type Draw, oval, pt, TAU, tube } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { specks } from '../places/farmGroundParts';
import { mix } from '../wash';
import {
  BARK_PLATE, BARK_RED, BERRY_RED, BLUESTEM, BLUESTEM_DEEP, BLUESTEM_LIT, CHAR, CONE, CONE_DEEP, CONE_LIT, LICHEN, LICHEN_DEEP, LICHEN_SHADE, MOSS, MOSS_LIT,
  NEEDLE_OLD, ringOf, SAND_DEEP, WINTERGREEN, WINTERGREEN_LIT, WOOD_GREY,
} from './barrensPlaceKit';

/**
 * The Pine Barrens floor's small things, seen from above, lit from the
 * upper left: cushions of reindeer lichen, wintergreen with its red
 * berries, bronze tufts of little bluestem, haircap moss, pitch-pine cones
 * (shut and open), dead twigs, flakes of bark, a scrub-oak leaf, tracks
 * pressed in the sand, and the charred stalks a fire leaves. Board
 * coordinates; each takes the rng it draws its variety from.
 */

/**
 * A cushion of reindeer lichen, radius s: a soft scalloped mound of pale
 * grey-green, its fine branched tips as a froth of dots and tiny rings,
 * lit on top towards the light, sunk into shade down-right, its shadow on the sand.
 */
export function lichen(d: Draw, c: Pt, s: number, rng: Rng): void {
  const { pen } = d;
  const ph = rng() * TAU;
  const lobes = 9 + Math.floor(rng() * 6);
  const shape = ringOf(c, 40, (a) => s * (0.9 + 0.1 * Math.sin(a * lobes + ph) + 0.05 * Math.sin(a * 3 + ph * 2)));
  castShadow(d, shape, s * 0.35, 0.16);
  castShadow(d, shape, s * 0.15, 0.12);
  body(d, shape, mix(LICHEN, rng() < 0.5 ? '#c9c8b0' : '#a9b896', rng() * 0.6), 0.92);
  pen.clipped(shape, () => {
    // The froth of tips: shadowed gaps between them, lit crowns, tiny rings where the tips curl.
    const gaps: [number, number, number][] = [];
    const tips: [number, number, number][] = [];
    for (let k = 0; k < s * s * 1.1; k++) {
      const p = polar(c, rng() * TAU, Math.sqrt(rng()) * s);
      const lit = (c.x - p.x) * SHADOW.x + (c.y - p.y) * SHADOW.y;
      if (rng() < 0.55) gaps.push([p.x, p.y, 0.35 + rng() * 0.5]);
      else if (lit > -s * 0.2) tips.push([p.x, p.y, 0.4 + rng() * 0.5]);
    }
    specks(d, LICHEN_DEEP, 0.4, gaps);
    specks(d, PAPER_FILL, 0.55, tips);
    for (let k = 0; k < s * 0.9; k++) {
      const p = polar(c, rng() * TAU, Math.sqrt(rng()) * s * 0.9);
      pen.hair(closed(oval(p.x, p.y, 0.9 + rng() * 0.6, 0.8 + rng() * 0.5, 6)), 0.3, LICHEN_DEEP, 0.45);
    }
  });
  pen.crescent(shape, pt(-SHADOW.x * s * 0.42, -SHADOW.y * s * 0.42), () => pen.fill(shape, LICHEN_SHADE, 0.5));
  pen.crescent(shape, pt(-SHADOW.x * s * 0.2, -SHADOW.y * s * 0.2), () => pen.fill(shape, LICHEN_DEEP, 0.3));
  pen.crescent(shape, pt(SHADOW.x * s * 0.25, SHADOW.y * s * 0.25), () => pen.fill(shape, PAPER_FILL, 0.22));
  pen.hair(closed(shape), 0.45, mix(LICHEN_DEEP, d.ink, 0.4), 0.55);
}

/** A colony of lichen cushions round c, `reach` across: a few big ones and smaller ones crowding them. */
export function lichenColony(d: Draw, c: Pt, reach: number, rng: Rng, ok: (p: Pt) => boolean): void {
  const n = 3 + Math.floor(rng() * 6);
  const spots = Array.from({ length: n }, () => [polar(c, rng() * TAU, Math.sqrt(rng()) * reach), 4.5 + rng() * (rng() < 0.3 ? 9 : 5)] as const);
  spots.sort((a, b) => a[0].y - b[0].y);
  for (const [p, s] of spots) if (ok(p)) lichen(d, p, s, rng);
}

/** A sprig of wintergreen: three to five glossy dark leaves round a stem, a reddened one, and a red berry or two. */
export function wintergreen(d: Draw, c: Pt, s: number, rng: Rng): void {
  const { pen } = d;
  const n = 3 + Math.floor(rng() * 3);
  const turn = rng() * TAU;
  for (let k = 0; k < n; k++) {
    const a = turn + (k / n) * TAU + (rng() - 0.5) * 0.5;
    const base = polar(c, a, s * 0.15);
    const tip = polar(c, a, s * (0.95 + rng() * 0.25));
    const leaf = [...arc(base, tip, s * 0.32, 6), ...arc(tip, base, s * 0.32, 6).slice(1)];
    castShadow(d, leaf, s * 0.22, 0.22);
    const red = rng() < 0.2;
    const tone = red ? mix('#8a3a2a', WINTERGREEN, 0.3) : mix(WINTERGREEN, '#2a4a30', rng() * 0.4);
    body(d, leaf, tone, 0.92);
    pen.crescent(leaf, pt(SHADOW.x * s * 0.2, SHADOW.y * s * 0.2), () => pen.fill(leaf, red ? '#c0644a' : WINTERGREEN_LIT, 0.55));
    pen.hair(arc(base, tip, s * 0.04, 4), 0.4, mix(PAPER_FILL, tone, 0.4), 0.6);
    // The gloss: a short bright glint on the lit side.
    const g = polar(polar(c, a, s * 0.55), a - Math.PI / 2, s * 0.1);
    pen.hair([polar(g, a, -s * 0.15), polar(g, a, s * 0.15)], 0.6, PAPER_FILL, 0.7);
    pen.hair(closed(leaf), 0.45, d.ink, 0.7);
  }
  const berries = rng() < 0.6 ? 1 + Math.floor(rng() * 2) : 0;
  for (let k = 0; k < berries; k++) {
    const p = polar(c, turn + 0.6 + k * 1.3, s * 0.25);
    const br = s * 0.26;
    const b = oval(p.x, p.y, br, br, 12);
    castShadow(d, b, br * 0.6, 0.3);
    body(d, b, BERRY_RED, 0.95);
    pen.crescent(b, pt(-SHADOW.x * br * 0.5, -SHADOW.y * br * 0.5), () => pen.fill(b, '#7a1a18', 0.5));
    pen.dot(p.x - br * 0.35, p.y - br * 0.4, br * 0.28, PAPER_FILL, 0.9);
    pen.hair(closed(b), 0.45, d.ink, 0.8);
  }
}

/** A tuft of little bluestem, bronze in autumn: a fan of fine blades from one root, leaning the way `lean` points, the shadow-side blades deep and the lit ones pale. */
export function bluestem(d: Draw, c: Pt, s: number, rng: Rng, lean = -2.3 + (rng() - 0.5) * 1.2): void {
  const { pen } = d;
  pen.fill(blob(pt(c.x + SHADOW.x * s * 0.4, c.y + SHADOW.y * s * 0.4), s * 0.55, s * 0.35, rng, 0.3, 12, lean), d.ink, 0.1);
  const n = 12 + Math.floor(rng() * 10);
  const blades = Array.from({ length: n }, () => {
    const a = lean + (rng() - 0.5) * (rng() < 0.75 ? 1.8 : 4.4);
    return { a, len: s * (0.45 + rng() * 0.65), base: pt(c.x + (rng() - 0.5) * s * 0.2, c.y + (rng() - 0.5) * s * 0.14) };
  });
  blades.sort((p, q) => q.len - p.len);
  for (const b of blades) {
    const light = (1 - Math.cos(b.a - 0.99)) / 2;
    const colour = mix(mix(BLUESTEM_DEEP, BLUESTEM, 0.5), BLUESTEM_LIT, light * 0.7 + rng() * 0.3);
    const tip = polar(b.base, b.a, b.len);
    const bend = (rng() - 0.5) * b.len * 0.35;
    pen.hair(arc(b.base, tip, bend, 6).map((p) => pt(p.x + SHADOW.x * 1.2, p.y + SHADOW.y * 1.2)), 0.8, d.ink, 0.12);
    pen.hair(arc(b.base, tip, bend, 6), 0.65 + rng() * 0.45, colour, 0.9);
  }
}

/** A star of haircap moss: dark green spokes round a bright crown, in a tight clump with its neighbours. */
export function mossStar(d: Draw, c: Pt, s: number, rng: Rng): void {
  const { pen } = d;
  pen.fill(oval(c.x + SHADOW.x * s * 0.3, c.y + SHADOW.y * s * 0.3, s * 0.9, s * 0.8, 10), d.ink, 0.12);
  const n = 7 + Math.floor(rng() * 4);
  const ph = rng() * TAU;
  for (let k = 0; k < n; k++) {
    const a = ph + (k / n) * TAU;
    const lit = (1 - Math.cos(a - 3.99)) / 2;
    pen.hair([c, polar(c, a, s * (0.75 + rng() * 0.3))], 0.7, mix(MOSS, '#2e4a22', 0.6 * (1 - lit)), 0.9);
  }
  pen.dot(c.x - s * 0.08, c.y - s * 0.1, s * 0.22, MOSS_LIT, 0.95);
}

/** A cushion of haircap moss round c: stars packed together over a dark green base. */
export function mossCushion(d: Draw, c: Pt, r: number, rng: Rng): void {
  const shape = blob(c, r, r * 0.8, rng, 0.3, 18, rng() * TAU);
  castShadow(d, shape, 2.5, 0.14);
  body(d, shape, mix(MOSS, '#3a5a2a', 0.4), 0.85);
  const n = Math.round(r * r * 0.2);
  const stars = Array.from({ length: n }, () => polar(c, rng() * TAU, Math.sqrt(rng()) * r * 0.85));
  stars.sort((a, b) => a.y - b.y);
  for (const p of stars) mossStar(d, p, 2.4 + rng() * 1.2, rng);
  d.pen.crescent(shape, pt(-SHADOW.x * r * 0.3, -SHADOW.y * r * 0.3), () => d.pen.fill(shape, '#1f3318', 0.3));
}

/**
 * A pitch-pine cone lying on its side, `len` long: an egg of woody scales
 * set in crossing spirals, each scale's boss catching the light, its prickle;
 * or, open, a rosette of spread scales round its dark heart.
 */
export function pineCone(d: Draw, c: Pt, len: number, rng: Rng, open = rng() < 0.45): void {
  const { pen } = d;
  if (open) {
    const r = len * 0.5;
    const disc = ringOf(c, 28, (a) => r * (0.9 + 0.12 * Math.abs(Math.sin(a * 6.5))));
    castShadow(d, disc, r * 0.55, 0.26);
    body(d, disc, CONE_DEEP, 0.92);
    for (const [k, rr, n] of [[0, 1, 11], [1, 0.68, 8], [2, 0.38, 5]] as const) {
      const ph = rng() * TAU;
      for (let i = 0; i < n; i++) {
        const a = ph + (i / n) * TAU;
        const tip = polar(c, a, r * rr);
        const base = polar(c, a, r * rr * 0.35);
        const scale = [...arc(base, tip, r * 0.2 * rr, 4), ...arc(tip, base, r * 0.2 * rr, 4).slice(1)];
        const lit = (1 - Math.cos(a - 3.99)) / 2;
        pen.fill(scale, mix(mix(CONE, CONE_DEEP, k * 0.25), CONE_LIT, lit * 0.6), 0.95);
        pen.hair(closed(scale), 0.35, d.ink, 0.55);
      }
    }
    pen.dot(c.x, c.y, r * 0.14, CONE_DEEP, 0.95);
    pen.hair(closed(disc), 0.5, d.ink, 0.4);
    return;
  }
  const a = rng() * TAU;
  const u = pt(Math.cos(a), Math.sin(a));
  const n = pt(-u.y, u.x);
  const hl = len / 2;
  const hw = len * 0.32;
  const at = (s: number, t: number): Pt => pt(c.x + u.x * s + n.x * t, c.y + u.y * s + n.y * t);
  // Egg-shaped: broad at the base, pointed at the tip.
  const shape = Array.from({ length: 28 }, (_, i) => {
    const th = (i / 28) * TAU;
    const s = Math.cos(th) * hl;
    const w = Math.sin(th) * hw * (1 - 0.3 * (s / hl));
    return at(s, w);
  });
  castShadow(d, shape, len * 0.3, 0.28);
  body(d, shape, CONE, 0.92);
  pen.clipped(shape, () => {
    for (const dir of [1, -1]) {
      for (let k = -6; k <= 6; k++) {
        const line = Array.from({ length: 9 }, (_, i) => {
          const s = -hl + (i / 8) * len;
          return at(s, k * len * 0.12 + dir * (s / len) * len * 0.75);
        });
        pen.hair(line, 0.45, CONE_DEEP, 0.75);
      }
    }
    for (let k = 0; k < len * 1.6; k++) {
      const p = at((rng() - 0.5) * len * 0.9, (rng() - 0.5) * hw * 1.6);
      pen.dot(p.x - 0.4, p.y - 0.5, 0.55, CONE_LIT, 0.7);
    }
  });
  pen.crescent(shape, pt(-SHADOW.x * hw * 0.6, -SHADOW.y * hw * 0.6), () => pen.fill(shape, CONE_DEEP, 0.5));
  pen.crescent(shape, pt(SHADOW.x * hw * 0.4, SHADOW.y * hw * 0.4), () => pen.fill(shape, CONE_LIT, 0.3));
  pen.hair(closed(shape), 0.6, d.ink, 0.85);
  const stalk = at(hl * 1.05, 0);
  pen.hair([stalk, at(hl * 1.3, 0.6)], 1, CONE_DEEP, 0.9);
}

/** A dead twig lying on the sand from a towards ang, `len` long: grey-brown, a fork or two, its shadow. */
export function twig(d: Draw, a: Pt, ang: number, len: number, rng: Rng, colour = mix(NEEDLE_OLD, WOOD_GREY, rng() * 0.6)): void {
  const { pen } = d;
  const tip = polar(a, ang, len);
  const main = arc(a, tip, (rng() - 0.5) * len * 0.15, 8);
  const forks: Pt[][] = [main];
  for (let k = 0; k < 1 + Math.floor(rng() * 3); k++) {
    const from = main[2 + Math.floor(rng() * (main.length - 3))]!;
    const fa = ang + (rng() < 0.5 ? 1 : -1) * (0.4 + rng() * 0.5);
    forks.push(arc(from, polar(from, fa, len * (0.2 + rng() * 0.25)), (rng() - 0.5) * 3, 4));
  }
  for (const f of forks) {
    const w0 = f === main ? 2.2 : 1.2;
    const shape = tube(f, w0, 0.5);
    castShadow(d, shape, 2.4, 0.22);
  }
  for (const f of forks) {
    const w0 = f === main ? 2.2 : 1.2;
    const shape = tube(f, w0, 0.5);
    body(d, shape, colour, 0.9);
    pen.hair(f.map((p) => pt(p.x - SHADOW.x * 0.5, p.y - SHADOW.y * 0.5)), 0.35, PAPER_FILL, 0.5);
    pen.hair(closed(shape), 0.35, d.ink, 0.7);
  }
}

/** A flake of pine bark shed at a trunk's foot: a small irregular plate, cinnamon under a grey crust. */
export function barkFlake(d: Draw, c: Pt, s: number, rng: Rng): void {
  const { pen } = d;
  const shape = blob(c, s, s * (0.5 + rng() * 0.3), rng, 0.35, 9, rng() * TAU);
  castShadow(d, shape, s * 0.3, 0.22);
  body(d, shape, mix(BARK_RED, BARK_PLATE, rng()), 0.9);
  pen.crescent(shape, pt(SHADOW.x * s * 0.3, SHADOW.y * s * 0.3), () => pen.fill(shape, '#b3a69a', 0.45));
  pen.hair(closed(shape), 0.4, d.ink, 0.7);
}

/** A fallen scrub-oak leaf: brown, lobed, curled a little, its veins and shadow. */
export function oakLeaf(d: Draw, c: Pt, s: number, rng: Rng): void {
  const { pen } = d;
  const a = rng() * TAU;
  const leaf = ringOf(c, 30, (t) => {
    const rel = t - a;
    const along = Math.abs(Math.cos(rel));
    return s * (0.32 + 0.5 * along ** 1.5) * (1 + 0.18 * Math.sin(rel * 7));
  });
  castShadow(d, leaf, s * 0.3, 0.2);
  const tone = mix('#8a5a32', rng() < 0.5 ? '#b08048' : '#6e4a2e', rng());
  body(d, leaf, tone, 0.88);
  pen.hair([polar(c, a, -s * 0.85), polar(c, a, s * 0.85)], 0.5, mix(tone, d.ink, 0.4), 0.7);
  for (let k = -2; k <= 2; k++) {
    if (k === 0) continue;
    const base = polar(c, a, k * s * 0.25);
    for (const side of [1, -1]) pen.hair([base, polar(base, a + side * 1.0, s * 0.45)], 0.35, mix(tone, d.ink, 0.35), 0.5);
  }
  pen.crescent(leaf, pt(-SHADOW.x * s * 0.2, -SHADOW.y * s * 0.2), () => pen.fill(leaf, '#4a2e1c', 0.3));
  pen.hair(closed(leaf), 0.45, d.ink, 0.65);
}

/** A mark pressed into the sand: its wall towards the light in shade, the far wall lit, the mark itself darker. */
function pressed(d: Draw, shape: readonly Pt[], alpha: number): void {
  d.pen.fill(shape.map((p) => pt(p.x + SHADOW.x * 0.7, p.y + SHADOW.y * 0.7)), PAPER_FILL, alpha * 1.2);
  d.pen.fill(shape, SAND_DEEP, alpha);
  d.pen.fill(shape.map((p) => pt(p.x - SHADOW.x * 0.35, p.y - SHADOW.y * 0.35)), d.ink, alpha * 0.45);
}

/** A raccoon's print at p, pointing along a: a small palm and five long fingers splayed like a hand. */
export function raccoonPrint(d: Draw, p: Pt, a: number, rng: Rng, alpha = 0.4): void {
  pressed(d, blob(p, 2.6, 2.2, rng, 0.2, 10, a), alpha);
  for (let k = -2; k <= 2; k++) {
    const t = polar(polar(p, a, 3), a + k * 0.42, 2.8 + (k === 0 ? 0.6 : 0));
    pressed(d, oval(t.x, t.y, 0.9, 0.9, 6), alpha);
  }
}

/** A fox's print at p, pointing along a: an oval pad, four neat toes, two claw nicks. */
export function foxPrint(d: Draw, p: Pt, a: number, rng: Rng, alpha = 0.4): void {
  pressed(d, blob(p, 2, 2.3, rng, 0.15, 10, a), alpha);
  for (const [off, ang] of [[3.6, 0.35], [3.6, -0.35], [2.8, 1.05], [2.8, -1.05]] as const) {
    const t = polar(p, a + ang, off);
    pressed(d, oval(t.x, t.y, 1.1, 1.3, 6), alpha);
  }
}

/** A deer's slot at p, pointing along a: two cloven halves, a heart pointed forward. */
export function deerPrint(d: Draw, p: Pt, a: number, rng: Rng, alpha = 0.4): void {
  for (const s of [1, -1]) {
    const half = [polar(p, a + s * 1.6, 1.6), polar(polar(p, a, 4.6), a + s * 1.4, 0.6), polar(polar(p, a, -1.4), a + s * 1.4, 2.2)];
    pressed(d, blob(pt((half[0]!.x + half[1]!.x + half[2]!.x) / 3, (half[0]!.y + half[1]!.y + half[2]!.y) / 3), 2.6, 1.3, rng, 0.15, 10, a), alpha);
  }
}

/** A charred stalk left standing after a fire (huckleberry, sweet fern): a black stub seen from above, a twig or two off it, its thin long shadow. */
export function charredStalk(d: Draw, c: Pt, s: number, rng: Rng): void {
  const { pen } = d;
  const reach = s * (1.6 + rng());
  pen.hair([c, pt(c.x + SHADOW.x * reach, c.y + SHADOW.y * reach)], 0.9, d.ink, 0.3);
  for (let k = 0; k < 1 + Math.floor(rng() * 3); k++) {
    const a = rng() * TAU;
    const tip = polar(c, a, s * (0.5 + rng() * 0.6));
    pen.hair(arc(c, tip, (rng() - 0.5) * 2, 4), 0.7, CHAR, 0.9);
    pen.hair([tip, pt(tip.x + SHADOW.x * s * 0.7, tip.y + SHADOW.y * s * 0.7)], 0.5, d.ink, 0.18);
  }
  pen.dot(c.x, c.y, 0.9 + rng() * 0.5, CHAR, 1);
  pen.dot(c.x - 0.4, c.y - 0.4, 0.45, '#8a8580', 0.8);
}
