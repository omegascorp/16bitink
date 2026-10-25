import type { Rng } from '../../logic/rng';
import { blob, castShadow, polar, SHADOW } from '../groundKit';
import { closed, type Draw, normals, oval, pt, TAU } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import type { Busy } from '../places/farmKit';
import { glaze } from '../snakes/cornPaint';
import { mix } from '../wash';
import {
  BARK, BARK_DEEP, BARK_LIT, CLAY, CLAY_DEEP, CLAY_LIT, H, inAny, leafShape, MOSS, MOSS_DEEP, MOSS_LIT, UMBER, W,
} from './junglePlaceKit';

/**
 * Small things on the Jungle's ground: surface roots, moss, seedlings, a
 * termite mound of red clay.
 */

/** A thick strip along a polyline, `w(u)` wide (u 0..1 along it). */
export function strip(spine: readonly Pt[], w: (u: number) => number): { top: Pt[]; bot: Pt[]; shape: Pt[] } {
  const n = normals(spine);
  const half = (i: number): number => w(i / Math.max(1, spine.length - 1)) / 2;
  const top = spine.map((p, i) => pt(p.x + n[i]!.x * half(i), p.y + n[i]!.y * half(i)));
  const bot = spine.map((p, i) => pt(p.x - n[i]!.x * half(i), p.y - n[i]!.y * half(i)));
  return { top, bot, shape: [...top, ...[...bot].reverse()] };
}

/** A root lying along `spine`, `w0` thick where it comes in, tapering: bark wash, the lit ridge, the shaded flank, cracks across it. */
export function root(d: Draw, spine: readonly Pt[], w0: number, rng: Rng): void {
  const { pen } = d;
  const s = strip(spine, (u) => w0 * (1 - 0.8 * u) + 0.8);
  castShadow(d, s.shape, 2.2, 0.22, UMBER);
  pen.fill(s.shape, PAPER_FILL, 0.6);
  pen.fill(s.shape, BARK, 0.85);
  pen.clipped(s.shape, () => {
    // The side turned from the light in shade, a lit ridge along the top.
    const lit = s.top.map((p, i) => pt((p.x * 2 + spine[i]!.x) / 3, (p.y * 2 + spine[i]!.y) / 3));
    const litFirst = SHADOW.y * (s.top[0]!.y - spine[0]!.y) + SHADOW.x * (s.top[0]!.x - spine[0]!.x) < 0;
    pen.stroke(litFirst ? lit : s.bot.map((p, i) => pt((p.x * 2 + spine[i]!.x) / 3, (p.y * 2 + spine[i]!.y) / 3)), w0 * 0.35, BARK_LIT, 0.55, false);
    pen.stroke(litFirst ? s.bot : s.top, w0 * 0.5, BARK_DEEP, 0.5, false);
    for (let i = 2; i < spine.length - 1; i += 2 + Math.floor(rng() * 2)) {
      if (rng() < 0.4) continue;
      pen.hair([s.top[i]!, pt((s.top[i]!.x + s.bot[i]!.x) / 2 + (rng() - 0.5), (s.top[i]!.y + s.bot[i]!.y) / 2), s.bot[i]!], 0.4, BARK_DEEP, 0.6);
    }
  });
  pen.hair(closed(s.shape), 0.7, d.ink, 0.7);
}

/** A root coming in from the board's edge from a tree off it, wandering inwards till the ground gets busy (or a keep, or the water), a rootlet or two off it. */
export function rootRun(d: Draw, rng: Rng, busy: Busy, water: readonly (readonly Pt[])[]): void {
  const side = Math.floor(rng() * 4);
  const along = 0.1 + rng() * 0.8;
  let p = side === 0 ? pt(along * W, -6) : side === 1 ? pt(W + 6, along * H) : side === 2 ? pt(along * W, H + 6) : pt(-6, along * H);
  let a = Math.atan2(H / 2 - p.y, W / 2 - p.x) + (rng() - 0.5) * 1.2;
  const spine: Pt[] = [p];
  const turn = (rng() - 0.5) * 0.08;
  for (let k = 0; k < 60; k++) {
    a += turn + (rng() - 0.5) * 0.18;
    p = polar(p, a, 6);
    if (busy(p.x, p.y) < 0.35 || inAny(water, p.x, p.y, 6)) break;
    spine.push(p);
  }
  if (spine.length < 6) return;
  const w0 = 10 + rng() * 6;
  root(d, spine, w0, rng);
  for (let k = 0; k < 2; k++) {
    const i = 2 + Math.floor(rng() * (spine.length - 4));
    const b = spine[i]!;
    const dir = Math.atan2(spine[i + 1]!.y - b.y, spine[i + 1]!.x - b.x) + (rng() < 0.5 ? 1 : -1) * (0.6 + rng() * 0.5);
    const twig: Pt[] = [b];
    let q = b;
    let aa = dir;
    for (let j = 0; j < 8; j++) {
      aa += (rng() - 0.5) * 0.4;
      q = polar(q, aa, 5);
      if (busy(q.x, q.y) < 0.3 || inAny(water, q.x, q.y, 4)) break;
      twig.push(q);
    }
    if (twig.length > 3) root(d, twig, w0 * 0.35, rng);
  }
}

/** A cushion of moss: a soft green wash, its lit tips stippled, a few darker hollows. */
export function mossPatch(d: Draw, c: Pt, r: number, rng: Rng): void {
  const { pen } = d;
  const shape = blob(c, r, r * (0.6 + rng() * 0.3), rng, 0.3, 18, rng() * TAU);
  pen.fill(shape, MOSS_DEEP, 0.4);
  pen.fill(shape.map((p) => pt(p.x - 0.8, p.y - 0.8)), MOSS, 0.45);
  pen.stipple(shape, Math.round(r * 5), () => 0.8, 0.45, MOSS_LIT);
  pen.stipple(shape, Math.round(r * 2), () => 0.6, 0.4, MOSS_DEEP);
}

/** A seedling: a little stem and two to four leaves, lit and shaded, with their shadow. */
export function seedling(d: Draw, c: Pt, s: number, rng: Rng): void {
  const { pen } = d;
  const n = 2 + Math.floor(rng() * 3);
  const a0 = rng() * TAU;
  for (let k = 0; k < n; k++) {
    const a = a0 + (k * TAU) / n + (rng() - 0.5) * 0.5;
    const shape = leafShape(c, a, s * (0.8 + rng() * 0.4), 0.3, (rng() - 0.5) * 2);
    pen.fill(shape.map((p) => pt(p.x + SHADOW.x * 3, p.y + SHADOW.y * 3)), UMBER, 0.2);
    pen.fill(shape, PAPER_FILL, 0.7);
    pen.fill(shape, mix(MOSS, MOSS_LIT, rng() * 0.6), 0.85);
    pen.hair([c, polar(c, a, s * 0.8)], 0.35, MOSS_DEEP, 0.7);
    pen.hair(closed(shape), 0.35, d.ink, 0.55);
  }
  pen.dot(c.x, c.y, 0.8, MOSS_DEEP, 0.9);
}

/**
 * A termite mound of red clay, from above: a lumpy base with a few
 * pinnacles rising out of it, each lit on its upper left and shaded on its
 * lower right, the clay granular, vent holes dark, a long shadow cast.
 */
export function termiteMound(d: Draw, c: Pt, r: number, rng: Rng): void {
  const { pen } = d;
  const { ctx } = pen;
  const base = blob(c, r, r * 0.85, rng, 0.25, 26, rng() * TAU);
  castShadow(d, base, r * 0.9, 0.2, UMBER);
  castShadow(d, base, r * 0.45, 0.14, UMBER);
  pen.fill(base, PAPER_FILL, 1);
  pen.fill(base, CLAY, 0.85);
  pen.crescent(base, pt(-SHADOW.x * r * 0.5, -SHADOW.y * r * 0.5), () => pen.fill(base, CLAY_DEEP, 0.5));
  const peaks = 2 + Math.floor(rng() * 3);
  for (let k = 0; k < peaks; k++) {
    const p = polar(c, rng() * TAU, rng() * r * 0.45);
    const pr = r * (0.28 + rng() * 0.22);
    const peak = blob(p, pr, pr * 0.85, rng, 0.2, 18, rng() * TAU);
    pen.fill(peak.map((q) => pt(q.x + SHADOW.x * pr * 0.8, q.y + SHADOW.y * pr * 0.8)), CLAY_DEEP, 0.45);
    pen.fill(peak, CLAY, 0.9);
    pen.clipped(peak, () => {
      glaze(ctx, p.x - pr * 0.35, p.y - pr * 0.4, pr * 0.7, pr * 0.55, 0, CLAY_LIT, 0.7);
      pen.crescent(peak, pt(-SHADOW.x * pr * 0.6, -SHADOW.y * pr * 0.6), () => pen.hatch(peak, 1.4, 0.95, 0.35, { color: d.ink, alpha: 0.4 }));
    });
    pen.hair(closed(peak), 0.5, d.ink, 0.7);
  }
  pen.stipple(base, Math.round(r * 9), () => 0.8, 0.4, CLAY_DEEP);
  pen.stipple(base, Math.round(r * 5), () => 0.8, 0.35, CLAY_LIT);
  for (let k = 0; k < 5; k++) {
    const p = polar(c, rng() * TAU, r * (0.3 + rng() * 0.55));
    pen.fill(oval(p.x, p.y, 0.9 + rng() * 0.8, 0.7 + rng() * 0.5, 10), '#2a1810', 0.8);
  }
  pen.stroke(closed(base), 1.3, d.ink, 0.85);
}
