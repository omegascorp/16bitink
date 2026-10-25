import type { Rng } from '../../logic/rng';
import { blob, polar, SHADOW } from '../groundKit';
import { type Draw, pt, TAU } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { noiseOf, resample } from '../places/farmKit';
import { specks, stripShape } from '../places/farmGroundParts';
import { rgba } from '../wash';
import { PEAT, SAND_DEEP, SAND_GREY, SAND_PALE, STONE, STONE_DEEP, STONE_LIT } from './heathPlaceKit';

/**
 * The Heath's sandy path, from above: a ribbon of pale bleached sand worn a
 * little below the heather (its upper-left rim in shade, the far rim lit),
 * a darker, firmer line down the middle where feet go, fine grit and white
 * quartz grains, a few flints, and the peat showing through where rain
 * pooled.
 */

/** A smooth polyline through the control points (Catmull-Rom), about every 4 px. */
export function smoothPath(ctrl: readonly Pt[]): Pt[] {
  const out: Pt[] = [];
  const at = (i: number): Pt => ctrl[Math.max(0, Math.min(ctrl.length - 1, i))]!;
  for (let i = 0; i < ctrl.length - 1; i++) {
    const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)];
    for (let k = 0; k < 24; k++) {
      const t = k / 24;
      const t2 = t * t;
      const t3 = t2 * t;
      out.push(pt(
        0.5 * (2 * p1.x + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
        0.5 * (2 * p1.y + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
      ));
    }
  }
  out.push(ctrl[ctrl.length - 1]!);
  return resample(out, 4);
}

/** A flint or pebble lying on the sand: a small rounded stone, lit, shaded, its shadow. */
function flint(d: Draw, c: Pt, s: number, rng: Rng): void {
  const shape = blob(c, s, s * (0.6 + rng() * 0.3), rng, 0.25, 10, rng() * TAU);
  d.pen.fill(shape.map((p) => pt(p.x + SHADOW.x * s * 0.6, p.y + SHADOW.y * s * 0.6)), d.ink, 0.2);
  d.pen.fill(shape, rng() < 0.5 ? STONE : '#b9a990', 0.95);
  d.pen.crescent(shape, pt(-SHADOW.x * s * 0.5, -SHADOW.y * s * 0.5), () => d.pen.fill(shape, STONE_DEEP, 0.45));
  d.pen.fill(blob(pt(c.x - s * 0.25, c.y - s * 0.25), s * 0.35, s * 0.22, rng, 0.2, 8), STONE_LIT, 0.6);
  d.pen.hair([...shape, shape[0]!], 0.4, d.ink, 0.55);
}

/** The path along `pts`, `half` either side, wandering. */
export function sandyPath(d: Draw, pts: readonly Pt[], half: number, rng: Rng): void {
  const { pen } = d;
  const n = noiseOf(rng, 70);
  const wob = (i: number, s: number): number => half * (1 + 0.28 * n(pts[i]!.x + s * 300, pts[i]!.y));
  const strip = stripShape(pts, (i) => wob(i, 0), (i) => wob(i, 1));
  const shape = strip.shape;
  const area = (r = 1): Pt => polar(pts[Math.floor(rng() * pts.length)]!, rng() * TAU, Math.sqrt(rng()) * half * r);
  pen.fill(shape, PAPER_FILL, 0.55);
  pen.fill(shape, SAND_PALE, 0.6);
  pen.clipped(shape, () => {
    for (let k = 0; k < pts.length / 3; k++) pen.fill(blob(area(), 8 + rng() * 18, 5 + rng() * 9, rng, 0.35, 12, rng() * TAU), rng() < 0.6 ? SAND_GREY : PEAT, 0.08 + rng() * 0.06);
    const { ctx } = pen;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = rgba(SAND_DEEP, 0.16);
    ctx.lineWidth = half * 0.7;
    ctx.beginPath();
    pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.stroke();
    ctx.restore();
    const grit = Array.from({ length: pts.length * 14 }, () => {
      const p = area();
      return [p.x, p.y, 0.3 + rng() * 0.5] as const;
    });
    specks(d, SAND_DEEP, 0.5, grit.slice(0, grit.length * 0.6));
    specks(d, PAPER_FILL, 0.8, grit.slice(grit.length * 0.6));
  });
  pen.crescent(shape, pt(SHADOW.x * 4, SHADOW.y * 4), () => pen.fill(shape, PEAT, 0.3));
  pen.crescent(shape, pt(SHADOW.x * 7, SHADOW.y * 7), () => pen.hatch(shape, 2.4, 0.9, 0.38, { color: d.ink, alpha: 0.2 }));
  pen.crescent(shape, pt(-SHADOW.x * 2.5, -SHADOW.y * 2.5), () => pen.fill(shape, PAPER_FILL, 0.35));
  for (const e of [strip.left, [...strip.right].reverse()]) {
    for (let i = 0; i < e.length - 2;) {
      const k = 3 + Math.floor(rng() * 6);
      if (rng() < 0.6) pen.hair(e.slice(i, i + k + 1), 0.55, d.ink, 0.38);
      i += k;
    }
  }
  for (let k = 0; k < pts.length / 9; k++) flint(d, area(0.8), 1.2 + rng() * 1.8, rng);
}
