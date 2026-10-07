import { dhoni } from '../backdrop/boats';
import { edges } from '../backdrop/common';
import { villa } from '../backdrop/homes';
import { palm } from '../backdrop/tropic';
import type { BiomeId } from '../../level/biomes';
import { bezier, type Draw, oval, pt } from '../kit';
import type { Pt } from '../pen';
import { PAPER_FILL, RED } from '../palette';

/**
 * The little drawings that tell the islands apart on the map, as a
 * cartographer sketches landmarks into a chart. Each gets the island's
 * span and its shoreline, and places its own things inland, on the sand
 * and out in the water.
 */
export interface Island {
  readonly x0: number;
  readonly x1: number;
  /** Shoreline y at x. */
  readonly coast: (x: number) => number;
  /** Top of the sand (the scrub line) at x. */
  readonly scrub: (x: number) => number;
}

const INK = 0.75;

/** Evenly spread x positions across an island, nudged a little. */
function spread(d: Draw, is: Island, n: number, margin = 60): number[] {
  const w = is.x1 - is.x0 - margin * 2;
  return Array.from({ length: n }, (_, i) => is.x0 + margin + (w * (i + 0.5)) / n + d.pen.jitter(w / n / 4));
}

function rock(d: Draw, x: number, y: number, r: number, wash: string): void {
  const shape = oval(x, y, r, r * 0.7, 12).map((p) => pt(p.x + d.pen.jitter(r * 0.12), p.y + d.pen.jitter(r * 0.1)));
  d.pen.fill(shape, PAPER_FILL, 1);
  d.pen.fill(shape, wash, 0.75);
  d.pen.crescent(shape, pt(-r * 0.35, -r * 0.3), () => d.pen.hatch(shape, 1.8, 0.8, 0.5, { color: d.ink, alpha: 0.5 }));
  d.pen.stroke([...shape, shape[0]!], 1, d.ink, INK, false);
}

function pine(d: Draw, x: number, y: number, h: number, wash: string): void {
  const tiers = 3;
  for (let k = 0; k < tiers; k++) {
    const ty = y - (h * k) / tiers * 0.7;
    const w = h * 0.32 * (1 - k * 0.25);
    const tri = [pt(x - w, ty), pt(x + w, ty), pt(x, ty - h * 0.45)];
    d.pen.fill(tri, wash, 0.8);
    d.pen.stroke(edges(tri, 2), 0.9, d.ink, INK, false);
  }
  d.pen.stroke([pt(x, y), pt(x, y + h * 0.12)], 1.4, d.ink, INK, false);
}

function atoll(d: Draw, is: Island): void {
  for (const x of spread(d, is, 7)) palm(d, x, is.scrub(x) + 12 + d.pen.rng() * 20, 46 + d.pen.rng() * 20, d.pen.jitter(0.25), 0.55);
  const vx = is.x0 + (is.x1 - is.x0) * 0.62;
  for (let i = 0; i < 4; i++) villa(d, vx + i * 30, is.coast(vx + i * 30) + 70, 0.6, i);
  dhoni(d, is.x0 + (is.x1 - is.x0) * 0.25, is.coast(is.x0 + (is.x1 - is.x0) * 0.25) + 95, 0.7);
}

function mangrove(d: Draw, is: Island): void {
  for (const x of spread(d, is, 9, 40)) {
    const y = is.coast(x) + 6;
    for (let k = -3; k <= 3; k++) d.pen.stroke(bezier(pt(x + k * 2, y - 22), pt(x + k * 6, y - 14), pt(x + k * 8, y + 4), 6), 0.8, d.ink, INK, false);
    const canopy = oval(x, y - 30, 22, 14, 14).map((p) => pt(p.x + d.pen.jitter(2.5), p.y + d.pen.jitter(2)));
    d.pen.fill(canopy, PAPER_FILL, 1);
    d.pen.fill(canopy, '#5f8a52', 0.75);
    d.pen.stipple(canopy, 50, () => 0.7, 0.6, d.ink);
    d.pen.stroke([...canopy, canopy[0]!], 1, d.ink, INK, false);
  }
  // Mudflat channels winding out across the shallows.
  for (const x of spread(d, is, 3)) d.pen.hair(bezier(pt(x, is.coast(x) + 8), pt(x + 40, is.coast(x) + 40), pt(x - 10, is.coast(x) + 80), 10), 1.4, '#8a7a5a', 0.6);
}

function rockpool(d: Draw, is: Island): void {
  for (const x of spread(d, is, 8)) {
    const y = is.coast(x) - 10 - d.pen.rng() * 40;
    rock(d, x, y, 12 + d.pen.rng() * 10, '#a7a598');
    const pool = oval(x + 26, y + 12, 12, 6, 12);
    d.pen.fill(pool, '#7fb7c9', 0.6);
    d.pen.hair([...pool, pool[0]!], 0.7, d.ink, INK);
  }
  // A starfish on the sand.
  const sx = is.x0 + (is.x1 - is.x0) * 0.4;
  const sy = is.coast(sx) - 30;
  const star: Pt[] = Array.from({ length: 10 }, (_, i) => {
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    const r = i % 2 ? 4 : 10;
    return pt(sx + Math.cos(a) * r, sy + Math.sin(a) * r);
  });
  d.pen.fill(star, '#e3907a', 0.85);
  d.pen.stroke(edges(star, 2), 0.8, d.ink, INK, false);
}

function basalt(d: Draw, is: Island): void {
  const cx = is.x0 + (is.x1 - is.x0) * 0.45;
  const base = is.scrub(cx) + 10;
  const cone = [pt(cx - 120, base), pt(cx - 22, base - 120), pt(cx + 22, base - 120), pt(cx + 120, base)];
  d.pen.fill(cone, '#6f675c', 0.85);
  d.pen.crescent(cone, pt(-30, -20), () => d.pen.hatch(cone, 2.2, 0.9, 0.6, { color: d.ink, alpha: 0.6 }));
  d.pen.stroke(edges(cone, 3), 1.2, d.ink, INK, false);
  d.pen.fill([pt(cx - 20, base - 119), pt(cx + 20, base - 119), pt(cx + 10, base - 104), pt(cx - 12, base - 106)], RED, 0.5);
  for (let k = 0; k < 5; k++) d.pen.circle(cx + 8 + k * 9, base - 140 - k * 18, 9 + k * 3, 0.8, d.ink);
  // Basalt columns stepping down to the shore: six-sided prisms, their tops catching the light.
  for (const x of spread(d, is, 5)) {
    const y = is.coast(x) - 2;
    for (let k = 0; k < 5; k++) {
      const hx = x + k * 8;
      const h = 22 - k * 4 + d.pen.jitter(2);
      const col = [pt(hx - 4, y), pt(hx + 4, y), pt(hx + 4, y - h), pt(hx - 4, y - h)];
      d.pen.fill(col, '#4a4540', 0.8);
      d.pen.hair([pt(hx + 1.5, y), pt(hx + 1.5, y - h)], 0.5, d.ink, 0.5);
      d.pen.stroke(edges(col, 2), 0.7, d.ink, INK, false);
      const cap = Array.from({ length: 6 }, (_, i) => pt(hx + Math.cos((i / 6) * Math.PI * 2) * 4.2, y - h + Math.sin((i / 6) * Math.PI * 2) * 2));
      d.pen.fill(cap, '#8d867c', 0.9);
      d.pen.stroke(edges(cap, 1), 0.6, d.ink, INK, false);
    }
  }
}

function kelp(d: Draw, is: Island): void {
  for (const x of spread(d, is, 10, 40)) pine(d, x, is.scrub(x) - 4 - d.pen.rng() * 30, 30 + d.pen.rng() * 14, '#4f7a5a');
  // A lighthouse on the point.
  const lx = is.x1 - 120;
  const ly = is.coast(lx) - 20;
  const tower = [pt(lx - 9, ly), pt(lx + 9, ly), pt(lx + 6, ly - 56), pt(lx - 6, ly - 56)];
  d.pen.fill(tower, PAPER_FILL, 1);
  for (const k of [0.2, 0.55]) d.pen.fill([pt(lx - 8.5 + k * 3, ly - 56 * k), pt(lx + 8.5 - k * 3, ly - 56 * k), pt(lx + 8 - k * 3 - 1, ly - 56 * k - 12), pt(lx - 8 + k * 3 + 1, ly - 56 * k - 12)], RED, 0.6);
  d.pen.stroke(edges(tower, 2), 1, d.ink, INK, false);
  d.pen.stroke(edges([pt(lx - 7, ly - 56), pt(lx + 7, ly - 56), pt(lx + 5, ly - 66), pt(lx - 5, ly - 66)], 2), 1, d.ink, INK, false);
  for (const a of [-0.25, 0.25]) d.pen.hair([pt(lx, ly - 61), pt(lx + Math.cos(a) * 60, ly - 61 + Math.sin(a) * 60)], 0.8, '#d9b84a', 0.7);
  // Kelp beds in the water.
  for (const x of spread(d, is, 6)) {
    const y = is.coast(x) + 50 + d.pen.rng() * 50;
    for (let k = 0; k < 4; k++) d.pen.hair(bezier(pt(x + k * 6, y), pt(x + k * 6 + 8, y + 12), pt(x + k * 6 - 4, y + 26), 8), 1.2, '#6a7f3e', 0.7);
  }
}

function dunes(d: Draw, is: Island): void {
  for (const x of spread(d, is, 5)) {
    const y = is.scrub(x) - 10;
    const ridge = bezier(pt(x - 90, y + 20), pt(x, y - 50), pt(x + 90, y + 20), 14);
    const face = [...ridge, pt(x + 90, y + 24), pt(x - 90, y + 24)];
    d.pen.fill(face, '#e7c487', 0.85);
    d.pen.crescent(face, pt(-28, -10), () => d.pen.hatch(face, 2.4, 0.4, 0.5, { color: d.ink, alpha: 0.45 }));
    d.pen.stroke(ridge, 1.1, d.ink, INK, false);
    for (let k = 1; k < 3; k++) d.pen.hair(bezier(pt(x - 70 + k * 10, y + 14), pt(x - 10, y - 30 + k * 12), pt(x + 60, y + 16), 10), 0.5, d.ink, 0.4);
  }
  // A green oasis.
  const ox = is.x0 + (is.x1 - is.x0) * 0.7;
  palm(d, ox, is.scrub(ox) + 30, 40, 0.15, 0.5);
  palm(d, ox + 22, is.scrub(ox) + 34, 34, -0.2, 0.5);
}

function wreck(d: Draw, is: Island): void {
  const wx = is.x0 + (is.x1 - is.x0) * 0.55;
  const wy = is.coast(wx) + 24;
  const hull = [pt(wx - 70, wy - 10), pt(wx + 50, wy - 30), pt(wx + 62, wy - 18), pt(wx + 40, wy + 10), pt(wx - 60, wy + 14)];
  d.pen.fill(hull, '#8f6f4c', 0.8);
  d.pen.clipped(hull, () => {
    for (let k = 0; k < 6; k++) d.pen.hair([pt(wx - 70, wy - 8 + k * 4), pt(wx + 60, wy - 28 + k * 6)], 0.6, d.ink, 0.6);
  });
  d.pen.stroke(edges(hull, 3), 1.2, d.ink, INK, false);
  for (const [mx, lean] of [[-20, -0.4], [20, 0.3]] as const) d.pen.stroke([pt(wx + mx, wy - 14), pt(wx + mx + Math.sin(lean) * 60, wy - 14 - Math.cos(lean) * 60)], 1.6, d.ink, INK, false);
  for (const x of spread(d, is, 6)) {
    const y = is.coast(x) - 20 - d.pen.rng() * 30;
    d.pen.stroke([pt(x - 14, y), pt(x + 14, y - 4)], 2.4, '#b9a684', 0.8);
    d.pen.hair([pt(x - 14, y), pt(x + 14, y - 4)], 0.6, d.ink, INK);
  }
  for (const x of spread(d, is, 4)) rock(d, x, is.coast(x) + 16, 10, '#8c8a80');
}

function harbour(d: Draw, is: Island): void {
  const hx = is.x0 + 120;
  for (let i = 0; i < 6; i++) villa(d, hx + i * 34, is.coast(hx + i * 34) + 40, 0.65, i + 1);
  for (const x of [is.x0 + (is.x1 - is.x0) * 0.6, is.x0 + (is.x1 - is.x0) * 0.78]) dhoni(d, x, is.coast(x) + 100, 0.75);
  // Nets drying on poles.
  for (const x of spread(d, is, 3, 300)) {
    const y = is.coast(x) - 30;
    d.pen.stroke([pt(x - 20, y), pt(x - 20, y - 26)], 1, d.ink, INK, false);
    d.pen.stroke([pt(x + 20, y), pt(x + 20, y - 26)], 1, d.ink, INK, false);
    const net = bezier(pt(x - 20, y - 24), pt(x, y - 8), pt(x + 20, y - 24), 10);
    d.pen.stroke(net, 0.8, d.ink, INK, false);
    for (let k = 1; k < 6; k++) d.pen.hair([pt(x - 20 + k * 6.6, y - 24), net[k * 2]!], 0.4, d.ink, 0.5);
  }
  for (const x of spread(d, is, 8, 40)) palm(d, x, is.scrub(x) + 4, 40, d.pen.jitter(0.2), 0.45);
}

function frost(d: Draw, is: Island): void {
  for (const x of spread(d, is, 9, 40)) pine(d, x, is.scrub(x) - 6 - d.pen.rng() * 26, 28 + d.pen.rng() * 10, '#6f8f84');
  for (const x of spread(d, is, 7)) {
    const y = is.coast(x) + 40 + d.pen.rng() * 70;
    const floe = Array.from({ length: 6 }, (_, i) => {
      const a = (i / 6) * Math.PI * 2 + d.pen.rng();
      const r = 14 + d.pen.rng() * 12;
      return pt(x + Math.cos(a) * r * 1.4, y + Math.sin(a) * r * 0.6);
    });
    d.pen.fill(floe, PAPER_FILL, 0.95);
    d.pen.stroke(edges(floe, 2), 0.9, d.ink, INK, false);
    d.pen.hair([pt(floe[3]!.x, floe[3]!.y + 2), pt(floe[1]!.x, floe[1]!.y + 2)], 0.5, '#7fa7c9', 0.6);
  }
  for (let i = 0; i < 60; i++) {
    const x = is.x0 + 40 + d.pen.rng() * (is.x1 - is.x0 - 80);
    const y = is.coast(x) - 8 - d.pen.rng() * 60;
    const p = oval(x, y, 3, 2, 8);
    d.pen.fill(p, '#a4a6a2', 0.8);
    d.pen.hair([...p, p[0]!], 0.4, d.ink, 0.7);
  }
}

function moonlit(d: Draw, is: Island): void {
  const mx = is.x0 + (is.x1 - is.x0) * 0.5;
  const my = is.coast(mx) + 130;
  // The moon's path on the water, and glowing surf along the whole shore.
  for (let k = 0; k < 14; k++) d.pen.hair([pt(mx - 30 + d.pen.jitter(14), my - 70 + k * 7), pt(mx + 30 + d.pen.jitter(14), my - 70 + k * 7)], 1.2, '#f3e9b0', 0.6 - k * 0.03);
  for (let x = is.x0 + 30; x < is.x1 - 30; x += 6) d.pen.dot(x, is.coast(x) + 6 + d.pen.jitter(3), 1.2, '#8ff0e0', 0.8);
  for (let i = 0; i < 50; i++) d.pen.dot(is.x0 + d.pen.rng() * (is.x1 - is.x0), is.coast(is.x0) + 40 + d.pen.rng() * 160, 0.8, '#f3e9b0', 0.7);
  for (const x of spread(d, is, 7)) palm(d, x, is.scrub(x) + 14, 44, d.pen.jitter(0.2), 0.5);
}

export const LANDMARKS: Readonly<Record<BiomeId, (d: Draw, is: Island) => void>> = { atoll, mangrove, rockpool, basalt, kelp, dunes, wreck, harbour, frost, moonlit };
