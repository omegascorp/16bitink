import type { Rng } from '../../logic/rng';
import type { ZoneDef } from '../../level/types';
import { inZoneShape } from '../../logic/zones';
import { blob } from '../groundKit';
import { type Draw, pt, TAU } from '../kit';
import type { Pt } from '../pen';
import { type Busy, noiseOf, perArea, smoothstep } from '../places/farmKit';
import { rgba } from '../wash';
import {
  type Blade, dots, EARTH_DEEP, OAT, OAT_DEEP, OLIVE, paintBlades, SHADE, STRAW, STRAW_DARK, STRAW_DEEP, STRAW_PALE, strokeBlades, tuft, W, H,
} from './savannaPlaceKit';

/**
 * The Savanna's grass, painted on the ground: short dry grass in scattered
 * straw-coloured tufts over the red earth (thick at the board's edges,
 * thin in the middle and round the level's things, where the snake hunts),
 * and each tall-grass zone as a stand of red oat grass (Themeda triandra)
 * gone rust and gold in the dry season: a shadowed bed, tuft over tuft,
 * drooping seed heads, its edge ragged. The live blades over the snake are
 * the view's (savannaView.ts).
 */

/** How far into a zone a point lies, px (negative outside). */
function depthIn(z: ZoneDef, p: Pt): number {
  if (z.shape === 'circle') return z.r - Math.hypot(p.x - z.x, p.y - z.y);
  if (z.shape === 'rect') return Math.min(p.x - z.x, z.x + z.w - p.x, p.y - z.y, z.y + z.h - p.y);
  return inZoneShape(p, z) ? 20 : -20;
}

/** A zone's bounding box, padded. */
function boxOf(z: ZoneDef, pad: number): { x: number; y: number; w: number; h: number } {
  if (z.shape === 'circle') return { x: z.x - z.r - pad, y: z.y - z.r - pad, w: (z.r + pad) * 2, h: (z.r + pad) * 2 };
  if (z.shape === 'rect') return { x: z.x - pad, y: z.y - pad, w: z.w + pad * 2, h: z.h + pad * 2 };
  const xs = z.points.map((q) => q.x);
  const ys = z.points.map((q) => q.y);
  return { x: Math.min(...xs) - pad, y: Math.min(...ys) - pad, w: Math.max(...xs) - Math.min(...xs) + pad * 2, h: Math.max(...ys) - Math.min(...ys) + pad * 2 };
}

/** How much tall grass stands at a spot (0..1): full well inside any zone, ragged at the edge. */
export type Tall = (x: number, y: number) => number;

export function tallOf(zones: readonly ZoneDef[], rng: Rng): Tall {
  const ragged = noiseOf(rng, 22);
  const grass = zones.filter((z) => z.kind === 'grass');
  return (x, y) => {
    let v = 0;
    for (const z of grass) v = Math.max(v, smoothstep((depthIn(z, pt(x, y)) + 10 + ragged(x, y) * 18) / 26));
    return v;
  };
}

/** The bed under a stand: the earth darkened and warmed where the grass stands thick, its shade pooled low. */
function bed(d: Draw, z: ZoneDef, tall: Tall, rng: Rng): void {
  const b = boxOf(z, 20);
  for (let k = 0; k < (b.w * b.h) / 140; k++) {
    const p = pt(b.x + rng() * b.w, b.y + rng() * b.h);
    const t = tall(p.x, p.y);
    if (t < 0.2) continue;
    d.pen.fill(blob(p, 10 + rng() * 14, 7 + rng() * 9, rng, 0.4, 12, rng() * TAU), rng() < 0.5 ? STRAW_DARK : OAT_DEEP, 0.1 * t);
  }
}

/** Drooping seed heads: little clusters of rusty spikelets nodding off the tallest stems. */
function seedHeads(d: Draw, heads: readonly Pt[], rng: Rng): void {
  const { ctx } = d.pen;
  const shadow: [number, number, number][] = [];
  const rust: [number, number, number][] = [];
  const pale: [number, number, number][] = [];
  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = rgba(STRAW_DEEP, 0.75);
  ctx.lineWidth = 0.45;
  ctx.beginPath();
  for (const h of heads) {
    const a = rng() * TAU;
    const n = 3 + Math.floor(rng() * 3);
    for (let i = 0; i < n; i++) {
      const b = a + (i - n / 2) * 0.5 + (rng() - 0.5) * 0.3;
      const l = 3 + rng() * 3;
      const tip = pt(h.x + Math.cos(b) * l, h.y + Math.sin(b) * l);
      ctx.moveTo(h.x, h.y);
      ctx.lineTo(tip.x, tip.y);
      shadow.push([tip.x + 1.6, tip.y + 2.4, 1.2]);
      (rng() < 0.7 ? rust : pale).push([tip.x, tip.y, 0.8 + rng() * 0.5]);
    }
  }
  ctx.stroke();
  ctx.restore();
  dots(d, SHADE, 0.18, shadow);
  dots(d, OAT_DEEP, 0.9, rust);
  dots(d, STRAW_PALE, 0.85, pale);
}

/** One tall-grass zone: the bed, then the tufts in three layers (deepest first), then seed heads and a few lit stems on top. */
function stand(d: Draw, z: ZoneDef, tall: Tall, rng: Rng): void {
  bed(d, z, tall, rng);
  const b = boxOf(z, 16);
  const layers: Blade[][] = [[], [], []];
  const heads: Pt[] = [];
  const crowns: [number, number, number][] = [];
  const n = Math.round((b.w * b.h) / 55);
  for (let k = 0; k < n; k++) {
    const c = pt(b.x + rng() * b.w, b.y + rng() * b.h);
    const t = tall(c.x, c.y);
    if (t < 0.05 || rng() > t * 0.95 + 0.05) continue;
    const layer = Math.min(2, Math.floor(rng() * 3 * (0.5 + 0.5 * t)));
    const r = (9 + rng() * 9) * (0.5 + 0.5 * t);
    layers[layer]!.push(...tuft(c, r, 14 + Math.floor(rng() * 10), rng, 3.6 + (rng() - 0.5), 0.3));
    if (layer === 0) crowns.push([c.x, c.y, r * 0.3]);
    if (rng() < 0.12 * t) heads.push(pt(c.x + (rng() - 0.5) * r, c.y + (rng() - 0.5) * r));
  }
  dots(d, OAT_DEEP, 0.45, crowns);
  paintBlades(d, layers[0]!, [OAT_DEEP, STRAW_DEEP, OAT], 0.95, 2.2, 0.2);
  paintBlades(d, layers[1]!, [STRAW_DEEP, OAT, STRAW], 0.85, 3, 0.18);
  paintBlades(d, layers[2]!, [OAT, STRAW, STRAW_PALE], 0.75, 3.8, 0.16);
  seedHeads(d, heads, rng);
}

export function paintTallGrass(d: Draw, zones: readonly ZoneDef[], tall: Tall, rng: Rng): void {
  for (const z of zones) if (z.kind === 'grass') stand(d, z, tall, rng);
}

/** How grassy the open ground is at a spot (0..1): patchy by a slow noise, thick where `busy` allows, none in the tall grass or on bare ground. */
export type Sward = (x: number, y: number) => number;

export function swardOf(busy: Busy, tall: Tall, bare: (x: number, y: number) => number, rng: Rng): Sward {
  const patch = noiseOf(rng, 150);
  const fine = noiseOf(rng, 45);
  return (x, y) => smoothstep((0.65 * patch(x, y) + 0.35 * fine(x, y) + 0.3) / 0.6) * (0.38 + 0.62 * busy(x, y)) * (1 - tall(x, y)) * (1 - bare(x, y));
}

/** The straw-gold of the grassy ground under its tufts: soft washes, densest where the sward is. */
function swardWash(d: Draw, sward: Sward, rng: Rng): void {
  for (let k = 0; k < perArea(900); k++) {
    const p = pt(rng() * W, rng() * H);
    const v = sward(p.x, p.y);
    if (v < 0.08) continue;
    d.pen.fill(blob(p, 12 + rng() * 22, 8 + rng() * 14, rng, 0.45, 12, rng() * TAU), rng() < 0.7 ? STRAW : STRAW_DEEP, 0.09 * v);
  }
}

/** A carpet of fine short blades over the sward: thousands of little dashes, combed a little by the wind. */
function stubble(d: Draw, sward: Sward, rng: Rng): void {
  const wind = noiseOf(rng, 220);
  const sets: Blade[][] = [[], [], []];
  for (let k = 0; k < perArea(60000); k++) {
    const x = rng() * W;
    const y = rng() * H;
    const v = sward(x, y);
    if (rng() > v * 0.9) continue;
    const a = rng() < 0.5 ? -1.9 + wind(x, y) * 1.2 + (rng() - 0.5) * 0.8 : rng() * TAU;
    sets[Math.floor(rng() * 3)]!.push([x, y, a, 2 + rng() * 3.5, (rng() - 0.5) * 1.2]);
  }
  strokeBlades(d, sets[0]!, STRAW_DARK, 0.45, 0.5);
  strokeBlades(d, sets[1]!, STRAW_DEEP, 0.55, 0.5);
  strokeBlades(d, sets[2]!, STRAW_PALE, 0.6, 0.5);
}

/**
 * The short dry grass over the open ground: a straw wash and a carpet of
 * fine blades where the sward grows, tufts in it (withered straw, a little
 * olive left in a few), the bare stubs of grazed ones.
 */
export function paintShortGrass(d: Draw, sward: Sward, rng: Rng): void {
  swardWash(d, sward, rng);
  stubble(d, sward, rng);
  const low: Blade[] = [];
  const high: Blade[] = [];
  const green: Blade[] = [];
  const stubs: [number, number, number][] = [];
  const crowns: [number, number, number][] = [];
  for (let k = 0; k < perArea(9000); k++) {
    const x = rng() * W;
    const y = rng() * H;
    const v = sward(x, y);
    if (rng() > v * v) continue;
    if (rng() < 0.1) {
      stubs.push([x, y, 1 + rng() * 1.4]);
      continue;
    }
    const r = 4 + rng() * 5 * (0.5 + v);
    const set = tuft(pt(x, y), r, 14 + Math.floor(rng() * 12), rng, 3.6, 0.25);
    crowns.push([x + 0.4, y + 0.6, r * 0.32]);
    (rng() < 0.1 ? green : rng() < 0.5 ? low : high).push(...set);
  }
  dots(d, STRAW_DARK, 0.4, stubs);
  // Each tuft's dense crown, dark at its heart where the old stems crowd.
  dots(d, SHADE, 0.14, crowns.map(([x, y, r]) => [x + 0.8, y + 1.2, r * 1.2] as const));
  dots(d, STRAW_DARK, 0.5, crowns);
  paintBlades(d, low, [STRAW_DARK, STRAW_DEEP, STRAW], 0.55, 1.2, 0.14);
  paintBlades(d, green, [EARTH_DEEP, OLIVE, '#c2c088'], 0.55, 1.2, 0.12);
  paintBlades(d, high, [STRAW_DEEP, STRAW, STRAW_PALE], 0.5, 1.5, 0.12);
}
