import { arc, blob, body, castShadow, polar, SHADOW } from '../groundKit';
import { closed, type Draw, oval, pt, shade, TAU } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { specks } from '../places/farmGroundParts';
import { mix } from '../wash';
import { radialBark, roots } from './barrensPlacePine';
import {
  ASH, BARK, BARK_DARK, BARK_GREY, BARK_PLATE, BARK_RED, CHAR, CHAR_SHEEN, LICHEN, LICHEN_DEEP, NEEDLE, type Needle, needleShadows, ringOf, rngAt, strokeNeedles, WOOD, WOOD_DEEP,
  WOOD_GREY,
} from './barrensPlaceKit';

/**
 * The Pine Barrens' solid things seen from above, each filling its
 * collision shape, lit from the upper left with its shadow thrown
 * down-right: a pitch pine's foot (plated bark, root flares, low branches
 * and the tufts of needles that sprout from its trunk, its long shadow and
 * the dappled shade of its crown), a fallen pine log, a cut stump. On a
 * fire level, those standing in the burn are charred.
 */

/**
 * A fallen pine log filling x, y, w × h: a cylinder of plated bark, lit
 * along its upper side and shaded under, a patch where the bark has
 * sloughed to grey wood with beetle galleries, a knot, lichen, a sawn end
 * and a broken, splintered one; charred in a burn.
 */
export function pineLog(d: Draw, x: number, y: number, w: number, h: number, char: number): void {
  const { pen } = d;
  const rng = rngAt(x, y, 2);
  const along = w >= h;
  const len = along ? w : h;
  const hw = (along ? h : w) / 2 - 0.8;
  const flip = rng() < 0.5;
  const o = along ? pt(x, y + h / 2) : pt(x + w / 2, y);
  const u = along ? pt(1, 0) : pt(0, 1);
  const n = pt(-u.y, u.x);
  // s along the log from its sawn end, t across it (-1 the side towards the light).
  const at = (s: number, t: number): Pt => {
    const ss = flip ? len - s : s;
    return pt(o.x + u.x * ss + n.x * t * hw * (along ? 1 : -1), o.y + u.y * ss + n.y * t * hw * (along ? 1 : -1));
  };
  const taper = (s: number): number => 1 - 0.1 * (s / len);
  // The broken end: splinters of every length, a long one or two torn out past the rest.
  const jag = Array.from({ length: 13 }, (_, i) => {
    const t = -1 + (2 * i) / 12 + (rng() - 0.5) * 0.06;
    // The break runs slantwise across the log, ragged with splinters.
    const slant = (t + 1) * 5;
    const deep = slant + (i % 2 ? 2 + rng() * 6 : rng() < 0.25 ? -3 - rng() * 3 : rng() * 2);
    return at(len - 3 - deep, Math.max(-1, Math.min(1, t)) * taper(len) * 0.97);
  });
  const sideA = Array.from({ length: 14 }, (_, i) => at(3 + ((len - 6) * i) / 13, -taper(3 + ((len - 6) * i) / 13)));
  const sideB = Array.from({ length: 14 }, (_, i) => at(len - 3 - ((len - 6) * i) / 13, taper(len - 3 - ((len - 6) * i) / 13)));
  const sawn = Array.from({ length: 7 }, (_, i) => at(3 - 3 * Math.sin((Math.PI * (i + 1)) / 8), 1 - (2 * (i + 1)) / 8));
  const shape = [...sideA, ...jag, ...sideB, ...sawn];
  castShadow(d, shape, hw * 0.75, 0.2);
  castShadow(d, shape, hw * 0.38, 0.18);
  body(d, shape, mix(BARK, CHAR, char), 0.95);
  pen.clipped(shape, () => {
    // Bark plates in rows along the log, narrowing towards its sides as the cylinder turns away.
    for (let row = -0.9; row <= 0.91; row += 0.2) {
      const across = Math.sqrt(1 - row * row);
      for (let s = rng() * 10 - 6; s < len - 2; s += 13 + rng() * 12) {
        const l = 11 + rng() * 13;
        const c = at(s + l / 2, row + (rng() - 0.5) * 0.06);
        const plate = blob(c, l / 2, hw * 0.1 * across + 0.7, rng, 0.45, 12, Math.atan2(u.y, u.x));
        const lit = (1 - row) / 2;
        const tone = mix(mix(BARK_PLATE, BARK_RED, rng() * 0.6), BARK_DARK, (1 - lit) * 0.45);
        pen.fill(plate, mix(tone, CHAR, char), 0.95);
        pen.fill(blob(c, l * 0.3, hw * 0.07 * across + 0.4, rng, 0.3, 8, Math.atan2(u.y, u.x)), mix(BARK_GREY, CHAR_SHEEN, char), 0.25 + lit * 0.3);
        pen.hair(closed(plate), 0.35, BARK_DARK, 0.55);
      }
    }
    // Where the bark has sloughed: grey wood with its grain and the beetles' galleries.
    const s0 = len * (0.45 + rng() * 0.15);
    const s1 = s0 + len * (0.18 + rng() * 0.1);
    const bare = blob(at((s0 + s1) / 2, -0.15), (s1 - s0) / 2, hw * 0.55, rng, 0.3, 18, Math.atan2(u.y, u.x));
    pen.fill(bare, mix(WOOD_GREY, CHAR, char), 0.75);
    pen.clipped(bare, () => {
      for (let t = -0.8; t < 0.6; t += 0.12) pen.hair([at(s0 - 4, t), at((s0 + s1) / 2, t + (rng() - 0.5) * 0.06), at(s1 + 4, t)], 0.4, mix(WOOD_DEEP, d.ink, 0.3), 0.45);
      for (let k = 0; k < 3; k++) {
        const g0 = at(s0 + rng() * (s1 - s0), -0.5 + rng() * 0.6);
        pen.hair(Array.from({ length: 8 }, (_, i) => pt(g0.x + i * 2 * u.x + Math.sin(i * 1.7) * 1.4 * n.x, g0.y + i * 2 * u.y + Math.sin(i * 1.7) * 1.4 * n.y)), 0.55, BARK_DARK, 0.6);
      }
    });
    pen.hair(closed(bare), 0.45, BARK_DARK, 0.45);
    // A knot where a branch broke off.
    const kn = at(len * (0.2 + rng() * 0.15), -0.25);
    const knot = oval(kn.x, kn.y, 3.6, 3, 12);
    pen.fill(knot, mix(WOOD_DEEP, CHAR, char), 0.95);
    pen.hair(closed(oval(kn.x, kn.y, 2.2, 1.8, 10)), 0.4, BARK_DARK, 0.7);
    pen.hair(closed(knot), 0.6, d.ink, 0.8);
    if (char < 0.5) {
      for (let k = 0; k < 3; k++) {
        const p = at(len * (0.1 + rng() * 0.8), -0.4 + rng() * 0.6);
        const lb = blob(p, 3 + rng() * 3, 2 + rng() * 2, rng, 0.3, 10);
        pen.fill(lb, LICHEN, 0.8);
        pen.hair(closed(lb), 0.35, LICHEN_DEEP, 0.6);
      }
    }
    // The cylinder's light: shade under, a glaze of light along the top.
    pen.crescent(shape, pt(-n.x * hw * 0.9 * (along ? 1 : -1), -n.y * hw * 0.9 * (along ? 1 : -1)), () => pen.fill(shape, BARK_DARK, 0.55));
    pen.crescent(shape, pt(-n.x * hw * 0.5 * (along ? 1 : -1), -n.y * hw * 0.5 * (along ? 1 : -1)), () => pen.hatch(shape, 2.2, 0.9, 0.4, { color: d.ink, alpha: 0.3 }));
    pen.crescent(shape, pt(n.x * hw * 1.3 * (along ? 1 : -1), n.y * hw * 1.3 * (along ? 1 : -1)), () => pen.fill(shape, PAPER_FILL, 0.2));
    if (char > 0) {
      for (let k = 0; k < len * 0.7; k++) {
        const p = at(rng() * len, -0.9 + rng() * 1.8);
        pen.hair([p, pt(p.x + u.x * (2 + rng() * 3), p.y + u.y * (2 + rng() * 3))], 0.5, CHAR_SHEEN, 0.7 * char);
        pen.hair([p, pt(p.x + n.x * 2, p.y + n.y * 2)], 0.4, CHAR_SHEEN, 0.6 * char);
      }
    }
  });
  // The broken end: splinters of pale wood, dark between them.
  pen.clipped(shape, () => {
    const end = blob(at(len - 9, 0), 10, hw * 1.1, rng, 0.25, 16, Math.atan2(u.y, u.x));
    pen.fill(end, mix(WOOD, CHAR, char * 0.8), 0.9);
    for (let t = -0.85; t < 0.9; t += 0.17) pen.hair([at(len - 13 - rng() * 4, t), at(len - rng() * 3, t + (rng() - 0.5) * 0.1)], 0.55, mix(WOOD_DEEP, d.ink, 0.35), 0.7);
    pen.crescent(end, pt(-SHADOW.x * 3, -SHADOW.y * 3), () => pen.fill(end, WOOD_DEEP, 0.5));
  });
  // The sawn end: a sliver of pale end grain catching the light.
  pen.stroke(sawn, 2, mix(WOOD, CHAR, char * 0.7), 0.9, false);
  pen.hair(sawn.map((p) => pt(p.x + u.x * (flip ? -1.4 : 1.4), p.y + u.y * (flip ? -1.4 : 1.4))), 0.4, WOOD_DEEP, 0.7);
  shade(d, shape, 0.2);
  pen.stroke(closed(shape), 1, mix(d.ink, BARK_DARK, 0.5), 0.9);
  // A few needles fallen across it.
  const fallen: Needle[] = Array.from({ length: Math.round(len / 9) }, () => {
    const p = at(rng() * len * 0.9, -0.6 + rng() * 1.1);
    return [p.x, p.y, rng() * TAU, 8 + rng() * 6, (rng() - 0.5) * 2] as const;
  });
  if (char < 0.5) {
    needleShadows(d, fallen, 0.25, 0.8);
    strokeNeedles(d, fallen, NEEDLE, 0.9, 0.65);
  }
}

/** A cut stump's top, radius r round c: rings round an off-centre pith, darker heartwood, checks split out from the middle, grey weathering, saw marks; a rim of plated bark; root flares; its shadow. Burnt, a black crackled crown round a burnt-out heart. */
export function pineStump(d: Draw, c: Pt, r: number, char: number): void {
  const { pen } = d;
  const rng = rngAt(c.x, c.y, 3);
  const burnt = char > 0.3;
  const rim = ringOf(c, 40, (a) => r * (0.94 + 0.05 * Math.sin(a * 4 + c.y) + 0.02 * Math.sin(a * 11)));
  castShadow(d, rim, r * 0.6, 0.2);
  castShadow(d, rim, r * 0.3, 0.2);
  roots(d, c, r, rng, char);
  body(d, rim, mix(BARK, CHAR, char), 0.95);
  pen.clipped(rim, () => radialBark(d, c, r * 0.98, rng, char, 0.62));
  const fr = r * 0.74;
  const pith = polar(c, rng() * TAU, fr * 0.14);
  const face = ringOf(c, 36, (a) => fr * (1 + 0.04 * Math.sin(a * 3 + c.x)));
  pen.crescent(rim, pt(-SHADOW.x * r * 0.4, -SHADOW.y * r * 0.4), () => pen.fill(rim, BARK_DARK, 0.5));
  body(d, face, burnt ? CHAR : mix(WOOD, WOOD_GREY, 0.45), 0.95);
  pen.clipped(face, () => {
    if (!burnt) {
      pen.fill(oval(pith.x, pith.y, fr * 0.55, fr * 0.52, 20), WOOD_DEEP, 0.35);
      pen.fill(blob(pt(c.x - fr * 0.3, c.y - fr * 0.3), fr * 0.5, fr * 0.4, rng, 0.3, 14), PAPER_FILL, 0.15);
    }
    // Growth rings round the pith.
    for (let rr = 1.8; rr < fr * 1.15; rr += 1.6 + rng() * 1.2) {
      const ring = ringOf(pith, 30, (a) => rr * (1 + 0.05 * Math.sin(a * 3 + rr)));
      pen.hair([...ring, ring[0]!], 0.4, burnt ? CHAR_SHEEN : mix(WOOD_DEEP, d.ink, 0.25), burnt ? 0.45 : 0.4 + rng() * 0.2);
    }
    if (burnt) {
      // Crackled char: blocks lit grey on their edges, a burnt-out hollow at the heart, ash in the cracks.
      for (let k = 0; k < 26; k++) {
        const p = polar(c, rng() * TAU, Math.sqrt(rng()) * fr);
        const a = rng() * TAU;
        pen.hair([polar(p, a, -3 - rng() * 3), polar(p, a + 0.4, 3 + rng() * 3)], 0.5, '#8e8780', 0.6);
      }
      const hollow = blob(pith, fr * 0.36, fr * 0.3, rng, 0.35, 14);
      pen.fill(hollow, '#0d0b0a', 0.9);
      pen.crescent(hollow, pt(SHADOW.x * 3, SHADOW.y * 3), () => pen.fill(hollow, CHAR_SHEEN, 0.5));
      specks(d, ASH, 0.7, Array.from({ length: 40 }, () => {
        const p = polar(c, rng() * TAU, fr * (0.7 + rng() * 0.3));
        return [p.x, p.y, 0.4 + rng() * 0.6] as const;
      }));
    } else {
      // Saw marks: faint arcs across the cut.
      const sa = rng() * TAU;
      for (let k = -4; k <= 4; k++) {
        const o = polar(c, sa + Math.PI / 2, k * fr * 0.22);
        pen.hair(arc(polar(o, sa, -fr), polar(o, sa, fr), fr * 0.3, 8), 0.35, WOOD_DEEP, 0.25);
      }
      // Checks split out from the pith.
      for (let k = 0; k < 3 + Math.floor(rng() * 3); k++) {
        const a = rng() * TAU;
        const from = polar(pith, a, fr * (0.1 + rng() * 0.2));
        const to = polar(pith, a + (rng() - 0.5) * 0.2, fr * (0.6 + rng() * 0.45));
        pen.stroke([from, polar(from, a + (rng() - 0.5) * 0.15, Math.hypot(to.x - from.x, to.y - from.y) * 0.5), to], 0.9, BARK_DARK, 0.75, false);
      }
      for (let k = 0; k < 2; k++) {
        const p = polar(c, rng() * TAU, fr * (0.75 + rng() * 0.2));
        const lb = blob(p, 2.5 + rng() * 2, 2 + rng() * 1.5, rng, 0.3, 10);
        pen.fill(lb, LICHEN, 0.8);
        pen.hair(closed(lb), 0.35, LICHEN_DEEP, 0.6);
      }
    }
    // The bark rim stands a little proud: its shade on the face's edge towards the light.
    pen.crescent(face, pt(SHADOW.x * 2.5, SHADOW.y * 2.5), () => pen.fill(face, d.ink, 0.22));
  });
  pen.hair(closed(face), 0.7, d.ink, 0.85);
  shade(d, rim, 0.26);
  pen.stroke(closed(rim), 1, mix(d.ink, BARK_DARK, 0.5), 0.9);
  // A cone or a few needles on the cut.
  if (!burnt) {
    const fallen: Needle[] = Array.from({ length: 4 }, () => {
      const p = polar(c, rng() * TAU, rng() * fr * 0.6);
      return [p.x, p.y, rng() * TAU, 7 + rng() * 5, (rng() - 0.5) * 2] as const;
    });
    needleShadows(d, fallen, 0.25, 0.8);
    strokeNeedles(d, fallen, NEEDLE, 0.9, 0.65);
  }
}
