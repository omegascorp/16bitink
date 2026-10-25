import type { Rng } from '../../logic/rng';
import { arc, blob, body, castShadow, polar, SHADOW } from '../groundKit';
import { closed, type Draw, pt, shade, TAU, tube } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { mix, rgba } from '../wash';
import {
  BARK, BARK_DARK, BARK_GREY, BARK_PLATE, BARK_RED, CHAR, CHAR_SHEEN, type Needle, NEEDLE_GREEN, NEEDLE_GREEN_DEEP, NEEDLE_GREEN_LIT, needleShadows, ringOf, rngAt,
  SAND_PALE, SHADE, strokeNeedles,
} from './barrensPlaceKit';

/**
 * A pitch pine's foot seen from above, filling its collision circle: the
 * dappled shade of its crown far down-right and the trunk's long shadow;
 * root flares swelling out into the sand; the trunk in thick plated bark,
 * its ridges running out from the middle, cinnamon under a grey crust with
 * near-black fissures between; a couple of low branches; and the sprays of
 * needles a pitch pine sprouts straight from its trunk. Charred in a burn.
 */

const lightOf = (a: number): number => (1 - Math.cos(a - 3.99)) / 2;

/**
 * Bark seen from above on a disc of radius R round c: ridges of plates
 * running out from `inner` × R to the rim, each ridge broken into plates,
 * each plate cinnamon at its edges under a grey weathered crust, lit
 * towards the upper left; the dark fissures between them are the disc's ground.
 */
export function radialBark(d: Draw, c: Pt, R: number, rng: Rng, char: number, inner = 0.15): void {
  const { pen } = d;
  const n = Math.round(R * 1.1) + 8;
  const ph = rng() * TAU;
  for (let i = 0; i < n; i++) {
    const a = ph + ((i + (rng() - 0.5) * 0.35) / n) * TAU;
    const lit = lightOf(a);
    for (let r0 = R * (inner + rng() * 0.08); r0 < R * 0.97; ) {
      const r1 = Math.min(R * 1.02, r0 + R * (0.2 + rng() * 0.28));
      const half = (rho: number): number => (((rho * TAU) / n) * (0.36 + rng() * 0.06)) / Math.max(rho, 1);
      const steps = 5;
      const sideA = Array.from({ length: steps + 1 }, (_, k) => {
        const rho = r0 + ((r1 - r0) * k) / steps;
        return polar(c, a - half(rho), rho);
      });
      const sideB = Array.from({ length: steps + 1 }, (_, k) => {
        const rho = r1 - ((r1 - r0) * k) / steps;
        return polar(c, a + half(rho), rho);
      });
      const plate = [...sideA, ...sideB];
      const tone = mix(mix(BARK_PLATE, BARK_RED, 0.3 + rng() * 0.5), BARK_DARK, (1 - lit) * 0.55);
      pen.fill(plate, mix(tone, CHAR, char), 0.95);
      const mid = (r0 + r1) / 2;
      const crust = blob(polar(c, a, mid), (r1 - r0) * 0.36, ((mid * TAU) / n) * 0.2, rng, 0.3, 8, a);
      pen.fill(crust, mix(BARK_GREY, CHAR_SHEEN, char), 0.22 + lit * 0.35);
      // The plate's edge towards the light catches it.
      pen.hair(sideA, 0.4, mix(PAPER_FILL, tone, 0.4), 0.25 + lit * 0.4);
      pen.hair(closed(plate), 0.35, BARK_DARK, 0.55);
      r0 = r1 + R * (0.03 + rng() * 0.04);
    }
  }
}

/** The long shadow of something tall standing at c, `wide` across at its foot, `len` long, fading. */
function longShadow(d: Draw, c: Pt, wide: number, len: number, alpha: number): void {
  const { ctx } = d.pen;
  const u = pt(SHADOW.x, SHADOW.y);
  const n = pt(-u.y, u.x);
  const end = polar(c, Math.atan2(u.y, u.x), len);
  const shape = [
    ...Array.from({ length: 7 }, (_, i) => polar(c, Math.atan2(n.y, n.x) + (i / 6) * Math.PI, wide / 2)),
    pt(end.x - n.x * wide * 0.32, end.y - n.y * wide * 0.32),
    pt(end.x + n.x * wide * 0.32, end.y + n.y * wide * 0.32),
  ];
  const g = ctx.createLinearGradient(c.x, c.y, end.x, end.y);
  g.addColorStop(0, rgba(SHADE, alpha));
  g.addColorStop(0.45, rgba(SHADE, alpha * 0.6));
  g.addColorStop(1, rgba(SHADE, 0));
  ctx.save();
  ctx.fillStyle = g;
  ctx.beginPath();
  shape.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** Root flares swelling out from a trunk's foot and sinking into the sand, the sand heaped pale along them. */
export function roots(d: Draw, c: Pt, r: number, rng: Rng, char: number, reach = 1.12): void {
  const { pen } = d;
  const n = 4 + Math.floor(rng() * 2);
  const ph = rng() * TAU;
  for (let k = 0; k < n; k++) {
    const a = ph + ((k + (rng() - 0.5) * 0.5) / n) * TAU;
    const line = arc(polar(c, a, r * 0.4), polar(c, a + (rng() - 0.5) * 0.3, r * (reach + rng() * 0.1)), (rng() - 0.5) * r * 0.25, 10);
    const shape = tube(line, r * 0.95, r * 0.3);
    pen.fill(tube(line, r * 1.1, r * 0.45), SAND_PALE, 0.35);
    castShadow(d, shape, 2, 0.2, SHADE);
    body(d, shape, mix(mix(BARK_PLATE, BARK, 0.5), CHAR, char), 0.92);
    pen.clipped(shape, () => {
      for (const t of [-0.22, 0.05, 0.25]) pen.hair(line.map((p, i) => polar(p, a + Math.PI / 2, t * r * 0.7 * (1 - i / line.length))), 0.45, BARK_DARK, 0.5);
    });
    pen.crescent(shape, pt(-SHADOW.x * 2.5, -SHADOW.y * 2.5), () => pen.fill(shape, BARK_DARK, 0.4));
    pen.crescent(shape, pt(SHADOW.x * 1.5, SHADOW.y * 1.5), () => pen.fill(shape, PAPER_FILL, 0.2));
    pen.hair(closed(shape), 0.45, BARK_DARK, 0.6);
  }
}

/** A spray of stiff needles springing from p, fanned round the way `a` points (`spread` either side), `s` long, its shadow `lift` down. */
function needleSpray(d: Draw, p: Pt, a: number, spread: number, s: number, rng: Rng, n = 70, lift = 2.6): void {
  const all: Needle[] = [];
  for (let k = 0; k < n; k++) {
    const ang = a + (rng() - 0.5) * 2 * spread;
    const from = polar(p, ang, rng() * s * 0.25);
    all.push([from.x, from.y, ang + (rng() - 0.5) * 0.3, s * (0.45 + rng() * 0.55), (rng() - 0.5) * s * 0.12]);
  }
  needleShadows(d, all, 0.26, 0.9, lift);
  const lit = (q: Needle): number => lightOf(q[2]);
  strokeNeedles(d, all.filter((q) => lit(q) < 0.4), mix(NEEDLE_GREEN_DEEP, '#3d4a26', 0.3), 0.95, 0.5);
  strokeNeedles(d, all.filter((q) => lit(q) >= 0.4 && lit(q) < 0.75), mix(NEEDLE_GREEN, '#7d8a3a', 0.35), 0.95, 0.48);
  strokeNeedles(d, all.filter((q) => lit(q) >= 0.75), NEEDLE_GREEN_LIT, 0.95, 0.45);
  d.pen.dot(p.x, p.y, Math.max(0.9, s * 0.08), BARK_DARK, 0.9);
}

export function pitchPine(d: Draw, c: Pt, r: number, char: number): void {
  const { pen } = d;
  const rng = rngAt(c.x, c.y, 1);
  const crown = polar(c, Math.atan2(SHADOW.y, SHADOW.x), r * 5.5);
  for (let k = 0; k < 9; k++) pen.fill(blob(polar(crown, rng() * TAU, Math.sqrt(rng()) * r * 2.6), r * (0.9 + rng() * 1.1), r * (0.6 + rng() * 0.7), rng, 0.5, 14, rng() * TAU), SHADE, 0.05);
  longShadow(d, c, r * 1.8, r * 7.5, 0.42);
  roots(d, c, r, rng, char);
  const R = r * 0.92;
  const ridges = 14 + Math.floor(rng() * 5);
  const rph = rng() * TAU;
  const trunk = ringOf(c, 72, (a) => R * (0.95 + 0.06 * Math.abs(Math.sin(((a + rph) * ridges) / 2)) ** 0.5));
  castShadow(d, trunk, r * 0.3, 0.3, SHADE);
  body(d, trunk, mix(BARK_DARK, CHAR, char), 0.97);
  pen.clipped(trunk, () => {
    radialBark(d, c, R, rng, char * 0.85);
    pen.crescent(trunk, pt(-SHADOW.x * R * 0.6, -SHADOW.y * R * 0.6), () => pen.fill(trunk, BARK_DARK, 0.42));
    pen.crescent(trunk, pt(SHADOW.x * R * 0.5, SHADOW.y * R * 0.5), () => pen.fill(trunk, PAPER_FILL, 0.12));
    // The trunk rises out of sight: its middle sinks into the crown's shade.
    const { ctx } = pen;
    const g = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, R * 0.7);
    g.addColorStop(0, rgba(BARK_DARK, 0.55));
    g.addColorStop(1, rgba(BARK_DARK, 0));
    ctx.save();
    ctx.fillStyle = g;
    ctx.fillRect(c.x - R, c.y - R, R * 2, R * 2);
    ctx.restore();
  });
  shade(d, trunk, 0.22);
  pen.stroke(closed(trunk), 0.9, mix(BARK_DARK, d.ink, 0.5), 0.85);
  // Low branches out over the roots, a spray of needles at each end; sprouts straight from the trunk.
  const nb = 2 + Math.floor(rng() * 2);
  const bph = rng() * TAU;
  for (let k = 0; k < nb; k++) {
    const a = bph + (k / nb) * TAU + (rng() - 0.5) * 0.8;
    const line = arc(polar(c, a, R * 0.3), polar(c, a, r * 0.95), (rng() - 0.5) * r * 0.25, 8);
    const limb = tube(line, 3.6, 1.5);
    castShadow(d, limb, 4, 0.3, SHADE);
    body(d, limb, mix(BARK, CHAR, char * 0.6), 0.95);
    pen.hair(line.map((p) => pt(p.x - SHADOW.x * 0.8, p.y - SHADOW.y * 0.8)), 0.5, PAPER_FILL, 0.4);
    pen.hair(closed(limb), 0.45, BARK_DARK, 0.85);
    needleSpray(d, line[line.length - 2]!, a, 1.3, r * 0.55, rng, 110, 3.2);
  }
  const sa = bph + Math.PI / nb;
  needleSpray(d, polar(c, sa, R * 0.55), sa, 1.0, r * 0.5, rng, 80, 2.4);
}
