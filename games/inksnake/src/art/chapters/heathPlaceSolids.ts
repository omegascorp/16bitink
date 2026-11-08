import type { Rng } from '../../logic/rng';
import { blob, castShadow, outline, polar, SHADOW } from '../groundKit';
import { closed, type Draw, pt, shade, TAU } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { mix } from '../wash';
import {
  FELDSPAR, GRANITE, GRANITE_DEEP, GRANITE_LIT, LICHEN, LICHEN_DEEP, LICHEN_YELLOW, MOSS, MOSS_LIT, rngAt, SHADE, STONE, STONE_DEEP, STONE_LIT,
} from './heathPlaceKit';

/**
 * The Heath's solid things, from above, light from the upper left: a
 * granite boulder (rounded by weather, grained with black mica, pink
 * feldspar and white quartz, a joint or two cracked across it, crusted
 * with map lichen, moss in its shade) and a dry-stone wall (its top a row
 * of coping stones set on edge, no mortar, dark gaps between, its height
 * casting a long shadow, a few stones tumbled at its foot).
 */

/** A crust of lichen at p: a pale rosette with a darker rim, or the yellow-green of map lichen with its black line. */
function crust(d: Draw, p: Pt, s: number, rng: Rng): void {
  const shape = blob(p, s, s * 0.8, rng, 0.35, 14, rng() * TAU);
  const yellow = rng() < 0.45;
  d.pen.fill(shape, yellow ? LICHEN_YELLOW : LICHEN, 0.7);
  d.pen.stipple(shape, Math.round(s * s * 1.2), () => 0.7, 0.28, yellow ? '#8a7a2e' : LICHEN_DEEP);
  d.pen.hair(closed(shape), yellow ? 0.45 : 0.3, yellow ? '#222' : LICHEN_DEEP, 0.6);
}

/** A granite boulder of radius r at c. */
export function boulder(d: Draw, c: Pt, r: number): void {
  const { pen } = d;
  const rng = rngAt(c.x, c.y, 1);
  const shape = blob(c, r * 1.02, r * 0.94, rng, 0.13, 30, rng() * TAU);
  castShadow(d, shape, r * 0.5, 0.18, SHADE);
  castShadow(d, shape, r * 0.25, 0.22, SHADE);
  pen.fill(shape, PAPER_FILL, 1);
  pen.fill(shape, GRANITE, 0.85);
  pen.clipped(shape, () => {
    pen.fill(blob(pt(c.x - r * 0.28, c.y - r * 0.3), r * 0.6, r * 0.45, rng, 0.3, 18, -0.6), GRANITE_LIT, 0.55);
    pen.fill(blob(pt(c.x + r * 0.25, c.y + r * 0.3), r * 0.75, r * 0.55, rng, 0.3, 18, 0.6), mix(GRANITE, '#8a8478', 0.5), 0.35);
    // The grain: black mica, pink feldspar, white quartz.
    pen.stipple(shape, Math.round(r * r * 1.1), () => 0.8, 0.35, '#2e2c2c');
    pen.stipple(shape, Math.round(r * r * 0.5), () => 0.8, 0.6, FELDSPAR);
    pen.stipple(shape, Math.round(r * r * 0.6), (x, y) => (x + y < c.x + c.y ? 0.9 : 0.3), 0.45, PAPER_FILL);
    // A joint cracked across, its lit lip.
    const a = rng() * TAU;
    const j0 = polar(c, a, r * 1.1);
    const j1 = polar(c, a + Math.PI + (rng() - 0.5) * 0.6, r * 1.1);
    const mid = pt((j0.x + j1.x) / 2 + (rng() - 0.5) * r * 0.4, (j0.y + j1.y) / 2 + (rng() - 0.5) * r * 0.4);
    pen.hair([j0, mid, j1], 0.9, GRANITE_DEEP, 0.75);
    pen.hair([j0, mid, j1].map((p) => pt(p.x - 0.7, p.y - 0.7)), 0.5, PAPER_FILL, 0.5);
    for (let i = 0; i < 3 + Math.floor(rng() * 3); i++) crust(d, polar(c, rng() * TAU, rng() * r * 0.7), 2 + rng() * r * 0.16, rng);
    // Moss in the shade low on the far side.
    for (let i = 0; i < 4; i++) {
      const p = polar(c, Math.atan2(SHADOW.y, SHADOW.x) + (rng() - 0.5) * 1.6, r * (0.75 + rng() * 0.2));
      const m = blob(p, 3 + rng() * 3, 2 + rng() * 2, rng, 0.35, 12);
      pen.fill(m, MOSS, 0.65);
      pen.stipple(m, 14, () => 0.7, 0.3, MOSS_LIT);
    }
  });
  shade(d, shape, 0.45, true);
  pen.stroke(closed(shape), 1.6, d.ink, 1);
}

/** One coping stone: an upright slab across the wall, `t` thick along it, spanning `across`. */
function copingStone(d: Draw, a: Pt, along: Pt, across: Pt, t: number, span: number, rng: Rng): void {
  const { pen } = d;
  const lean = (rng() - 0.5) * t * 0.5;
  const pts: Pt[] = [];
  const corner = (u: number, v: number): Pt => pt(a.x + along.x * u + across.x * v, a.y + along.y * u + across.y * v);
  const n = 5;
  for (let i = 0; i <= n; i++) pts.push(corner((rng() - 0.5) * 0.8 + lean * (i / n - 0.5), span * (i / n) + (rng() - 0.5)));
  for (let i = n; i >= 0; i--) pts.push(corner(t + (rng() - 0.5) * 0.9 + lean * (i / n - 0.5), span * (i / n) + (rng() - 0.5)));
  const tone = [STONE, '#9c968a', '#b0a796', '#a7a294'][Math.floor(rng() * 4)]!;
  pen.fill(pts, PAPER_FILL, 1);
  pen.fill(pts, tone, 0.88);
  pen.crescent(pts, pt(SHADOW.x * 1.6, SHADOW.y * 1.6), () => pen.fill(pts, STONE_LIT, 0.6));
  pen.crescent(pts, pt(-SHADOW.x * 1.8, -SHADOW.y * 1.8), () => pen.fill(pts, STONE_DEEP, 0.5));
  pen.stipple(pts, Math.round(t * span * 0.5), () => 0.7, 0.3, STONE_DEEP);
  if (rng() < 0.3) crust(d, corner(t * 0.5, span * (0.2 + rng() * 0.6)), 1.6 + rng() * 1.8, rng);
  if (rng() < 0.18) pen.fill(blob(corner(t * 0.5, span * rng()), 2 + rng() * 2, 1.6, rng, 0.3, 10), MOSS, 0.7);
  pen.stroke(closed(pts), 0.9, d.ink, 0.9);
}

/** A dry-stone wall filling the rect x, y, w × h (running along its longer side). */
export function dryStoneWall(d: Draw, x: number, y: number, w: number, h: number): void {
  const { pen } = d;
  const rng = rngAt(x, y, 2);
  const flat = w >= h;
  const length = flat ? w : h;
  const width = flat ? h : w;
  const along = flat ? pt(1, 0) : pt(0, 1);
  const across = flat ? pt(0, 1) : pt(1, 0);
  const box = [pt(x - 1, y - 1), pt(x + w + 1, y - 1), pt(x + w + 1, y + h + 1), pt(x - 1, y + h + 1)];
  castShadow(d, box, 14, 0.16, SHADE);
  castShadow(d, box, 8, 0.2, SHADE);
  // The wall's face showing below the coping on the side away from the light, and the dark of the gaps.
  pen.fill(box.map((p) => pt(p.x + SHADOW.x * 2.5, p.y + SHADOW.y * 2.5)), STONE_DEEP, 0.9);
  pen.fill(box, '#3b3631', 0.85);
  let u = 0.5;
  while (u < length - 2) {
    const t = Math.min(length - u - 0.5, 3.5 + rng() * 5.5);
    const off = (rng() - 0.5) * 2.4;
    const a = pt(x + along.x * u + across.x * (off - 0.5), y + along.y * u + across.y * (off - 0.5));
    copingStone(d, a, along, across, t, width + 0.5 + (rng() - 0.5) * 3, rng);
    u += t + 0.6 + rng() * 0.8;
  }
  pen.stroke(outline(box, 4), 1.2, d.ink, 0.7);
  // Stones tumbled at its foot.
  for (let i = 0; i < 3 + Math.floor(rng() * 3); i++) {
    const side = rng() < 0.65 ? 1 : -1;
    const s = rng() * length;
    const off = side > 0 ? width + 3 + rng() * 5 : -3 - rng() * 5;
    const p = pt(x + along.x * s + across.x * off, y + along.y * s + across.y * off);
    const st = blob(p, 2.5 + rng() * 2.5, 1.8 + rng() * 1.6, rng, 0.25, 10, rng() * TAU);
    castShadow(d, st, 2, 0.25, SHADE);
    pen.fill(st, STONE, 0.95);
    pen.crescent(st, pt(-SHADOW.x * 1.5, -SHADOW.y * 1.5), () => pen.fill(st, STONE_DEEP, 0.5));
    pen.hair(closed(st), 0.5, d.ink, 0.75);
  }
}
