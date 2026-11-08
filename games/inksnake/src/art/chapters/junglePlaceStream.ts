import type { Rng } from '../../logic/rng';
import { blob, castShadow, softBand } from '../groundKit';
import { closed, type Draw, oval, pt, TAU } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { glaze } from '../snakes/cornPaint';
import { mix } from '../wash';
import { H, leaf, MOSS, MOSS_DEEP, MOSS_LIT, PEBBLE, SHADE, SILT, SILT_WET, STONE_DEEP, STONE_LIT, UMBER, WATER, WATER_DEEP, WATER_LIT } from './junglePlaceKit';

/**
 * A forest stream from above ('water' zones, look 'stream'): its banks of
 * wet silt and pebbles, then the water: clear and sandy-shallow at the
 * edges, deepening green-blue down the channel, the canopy's shadows lying
 * dark on it and the sky's light in long streaks along the current, flow
 * lines bending round mossy stones, a few leaves floating down.
 */

/** Where a horizontal line at y crosses the polygon: its leftmost and rightmost crossing, or null. */
function across(poly: readonly Pt[], y: number): readonly [number, number] | null {
  const xs: number[] = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]!;
    const b = poly[(i + 1) % poly.length]!;
    if ((a.y <= y && b.y > y) || (b.y <= y && a.y > y)) xs.push(a.x + ((y - a.y) / (b.y - a.y)) * (b.x - a.x));
  }
  if (xs.length < 2) return null;
  return [Math.min(...xs), Math.max(...xs)];
}

/** The stream's two banks and its middle, sampled down the board (it runs top to bottom), smoothed. */
function course(poly: readonly Pt[]): { left: Pt[]; right: Pt[]; mid: Pt[]; width: number[] } {
  const rows: (readonly [number, number, number])[] = [];
  for (let y = -16; y <= H + 16; y += 6) {
    const c = across(poly, y);
    if (c) rows.push([y, c[0], c[1]]);
  }
  const smooth = (k: 1 | 2): number[] => rows.map((_, i) => {
    let s = 0;
    let n = 0;
    for (let j = Math.max(0, i - 4); j <= Math.min(rows.length - 1, i + 4); j++) {
      s += rows[j]![k];
      n += 1;
    }
    return s / n;
  });
  const l = smooth(1);
  const r = smooth(2);
  const left = rows.map((row, i) => pt(l[i]!, row[0]));
  const right = rows.map((row, i) => pt(r[i]!, row[0]));
  return { left, right, mid: rows.map((row, i) => pt((l[i]! + r[i]!) / 2, row[0])), width: rows.map((_, i) => r[i]! - l[i]!) };
}

function pebbles(d: Draw, bank: readonly Pt[], side: 1 | -1, rng: Rng): void {
  const { pen } = d;
  for (let k = 0; k < bank.length * 1.2; k++) {
    const p = bank[Math.floor(rng() * bank.length)]!;
    const q = pt(p.x + side * (2 + rng() * 12), p.y + (rng() - 0.5) * 6);
    const r = 0.8 + rng() * 2.4;
    const shape = oval(q.x, q.y, r * (1 + rng() * 0.5), r, 10);
    castShadow(d, shape, 1, 0.2, UMBER);
    pen.fill(shape, mix(PEBBLE, rng() < 0.3 ? STONE_LIT : STONE_DEEP, rng() * 0.6), 0.85);
    pen.dot(q.x - r * 0.3, q.y - r * 0.35, r * 0.35, PAPER_FILL, 0.45);
    pen.hair(closed(shape), 0.3, d.ink, 0.5);
  }
}

/** A mossy stone at the water's edge, the current curling round it. */
function stone(d: Draw, c: Pt, r: number, rng: Rng): void {
  const { pen } = d;
  const shape = blob(c, r, r * 0.75, rng, 0.2, 18, rng() * TAU);
  for (const k of [1.6, 2.2]) pen.hair(closed(blob(pt(c.x, c.y - 1), r * k * 0.9, r * k * 0.7, rng, 0.15, 18, 0)).slice(10, 19), 0.5, WATER_LIT, 0.6);
  castShadow(d, shape, 2.5, 0.25, WATER_DEEP);
  pen.fill(shape, PAPER_FILL, 1);
  pen.fill(shape, STONE_DEEP, 0.55);
  pen.clipped(shape, () => {
    glaze(pen.ctx, c.x - r * 0.3, c.y - r * 0.35, r * 0.8, r * 0.55, 0, STONE_LIT, 0.65);
    pen.fill(blob(pt(c.x - r * 0.2, c.y - r * 0.3), r * 0.7, r * 0.45, rng, 0.3, 14, 0), MOSS, 0.6);
    pen.stipple(shape, Math.round(r * 4), () => 0.7, 0.35, MOSS_LIT);
    pen.crescent(shape, pt(-r * 0.4, -r * 0.5), () => pen.fill(shape, MOSS_DEEP, 0.35));
  });
  pen.hair(closed(shape), 0.7, d.ink, 0.8);
}

export function paintStream(d: Draw, poly: readonly Pt[], rng: Rng): void {
  const { pen } = d;
  const { left, right, mid, width } = course(poly);
  if (mid.length < 4) return;
  const water = [...left, ...[...right].reverse()];
  // The banks: wet silt darkening to the water's edge, pebbles strewn along them.
  for (const [bank, side] of [[left, -1], [right, 1]] as const) {
    const out = bank.map((p) => pt(p.x + side * 9, p.y));
    softBand(d, out, 30, SILT, 0.75);
    softBand(d, bank, 14, SILT_WET, 0.5);
    pebbles(d, bank, side, rng);
  }
  // The water: sand showing through the shallows, the channel deepening down the middle.
  pen.fill(water, PAPER_FILL, 0.8);
  pen.fill(water, WATER, 0.75);
  pen.clipped(water, () => {
    for (const bank of [left, right]) softBand(d, bank, 16, SILT, 0.55);
    softBand(d, mid, Math.max(8, Math.min(...width) * 0.55), WATER_DEEP, 0.55);
    softBand(d, mid.map((p, i) => pt(p.x + Math.sin(i * 0.4) * 4, p.y)), Math.max(4, Math.min(...width) * 0.25), WATER_DEEP, 0.4);
    // The canopy's reflections lying dark, the sky's light in streaks along the current.
    for (let k = 0; k < 10; k++) {
      const p = mid[Math.floor(rng() * mid.length)]!;
      glaze(pen.ctx, p.x + (rng() - 0.5) * 24, p.y, 10 + rng() * 12, 20 + rng() * 26, Math.PI / 2 + (rng() - 0.5) * 0.4, SHADE, 0.22);
    }
    for (let k = 0; k < 26; k++) {
      const i = Math.floor(rng() * (mid.length - 6));
      const off = (rng() - 0.5) * 0.7;
      const seg = mid.slice(i, i + 3 + Math.floor(rng() * 4)).map((p, j) => pt(p.x + off * width[i + j]!, p.y));
      pen.hair(seg, 0.5 + rng() * 0.6, WATER_LIT, 0.35 + rng() * 0.35);
    }
    // Flow lines in ink, following the current.
    for (let k = 0; k < 14; k++) {
      const i = Math.floor(rng() * (mid.length - 8));
      const off = (rng() - 0.5) * 0.8;
      const seg = mid.slice(i, i + 4 + Math.floor(rng() * 5)).map((p, j) => pt(p.x + off * width[i + j]!, p.y));
      pen.hair(seg, 0.4, d.ink, 0.25);
    }
    // Pebbles under the water, blurred and blued.
    for (let k = 0; k < 30; k++) {
      const p = (rng() < 0.5 ? left : right)[Math.floor(rng() * left.length)]!;
      const q = pt(p.x + (rng() - 0.5) * 18, p.y);
      pen.fill(oval(q.x, q.y, 1.4 + rng() * 2, 1.2 + rng() * 1.4, 10), mix(PEBBLE, WATER, 0.5), 0.35);
    }
    // The bank's shadow on the water along the far side.
    softBand(d, right.map((p) => pt(p.x - 2, p.y)), 6, WATER_DEEP, 0.35);
  });
  // The water's edges in a fine broken pen line.
  for (const bank of [left, right]) {
    for (let i = 0; i < bank.length - 4; i += 4 + Math.floor(rng() * 3)) pen.hair(bank.slice(i, i + 4), 0.55, d.ink, 0.55);
  }
  const stones = 2 + Math.floor(rng() * 2);
  for (let k = 0; k < stones; k++) {
    const i = 3 + Math.floor(rng() * (mid.length - 6));
    const bank = rng() < 0.5 ? left[i]! : right[i]!;
    if (bank.y < 20 || bank.y > H - 20) continue;
    stone(d, pt(bank.x + (bank === left[i] ? 2 : -2), bank.y), 5 + rng() * 4, rng);
  }
  // A few leaves floating down the stream.
  for (let k = 0; k < 4; k++) {
    const i = Math.floor(rng() * mid.length);
    const p = mid[i]!;
    leaf(d, pt(p.x + (rng() - 0.5) * width[i]! * 0.5, p.y), Math.PI / 2 + (rng() - 0.5) * 1.2, 9 + rng() * 6, rng, { age: 0.1, lift: 1.4 });
  }
}
