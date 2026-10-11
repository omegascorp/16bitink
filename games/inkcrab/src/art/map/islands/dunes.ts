import { bezier, type Draw, oval, pt } from '../../kit';
import type { Pt } from '../../pen';
import { PAPER_FILL } from '../../palette';
import { inside } from '../../../scenes/map/plan';
import { type IslandArt, offsetShape } from '../context';
import type { BiomeArt } from '../island';
import { crown, palmStar, roof, tuft } from '../symbols';
import { anywhere, centre, grid, name, place, watersOf } from './common';

/**
 * Beach 2, the Dune Sea: desert running off the top of the chart into the
 * ocean, a field of crescent dunes marching east with the wind, an oasis
 * with its palms and caravan trail, a dry wadi, a salt pan, and a long sand
 * spit hooking round a lagoon of flamingos.
 */
const DUNE = '#e3bf7f';

/** A barchan from above: a crescent with its horns trailing downwind (east), its slip face hatched in shadow. */
function barchan(d: Draw, x: number, y: number, r: number): void {
  const outer: Pt[] = [pt(x + r * 1.05, y - r * 0.9)];
  for (let i = 0; i <= 16; i++) {
    const t = Math.PI * (0.38 + (1.24 * i) / 16);
    outer.push(pt(x + Math.cos(t) * r, y - Math.sin(t) * r * 0.8));
  }
  outer.push(pt(x + r * 1.05, y + r * 0.9));
  const inner = bezier(pt(x + r * 1.05, y + r * 0.9), pt(x - r * 0.05, y + r * 0.1), pt(x + r * 1.05, y - r * 0.9), 14);
  const shape = [...outer, ...inner.slice(1, -1)];
  d.pen.fill(shape, PAPER_FILL, 0.6);
  d.pen.fill(shape, DUNE, 0.8);
  const slip = [...inner, ...bezier(pt(x + r * 1.05, y - r * 0.9), pt(x + r * 0.32, y), pt(x + r * 1.05, y + r * 0.9), 10).slice(1, -1)];
  d.pen.fill(slip, '#b98a4c', 0.35);
  d.pen.hatch(slip, 1.6, 0.25, 0.4, { color: d.ink, alpha: 0.5 });
  d.pen.hair(outer, 0.55, d.ink, 0.5);
  d.pen.stroke(inner, 0.9, d.ink, 0.85, false);
}

/** A tiny camel in elevation, walking: a humped silhouette on stilt legs. */
function camel(d: Draw, x: number, y: number, s: number): void {
  const body = [pt(x - 7 * s, y - 6 * s), ...bezier(pt(x - 6 * s, y - 8 * s), pt(x - 1 * s, y - 15 * s), pt(x + 4 * s, y - 8 * s), 6), pt(x + 7 * s, y - 9 * s), pt(x + 9 * s, y - 14 * s), pt(x + 12 * s, y - 13 * s), pt(x + 11 * s, y - 11.5 * s), pt(x + 9 * s, y - 11 * s), pt(x + 7 * s, y - 5 * s), pt(x - 6 * s, y - 4.5 * s)];
  d.pen.fill(body, '#a8804e', 0.9);
  d.pen.hair([...body, body[0]!], 0.5, d.ink, 0.85);
  for (const lx of [-5, -3, 4, 6]) d.pen.hair([pt(x + lx * s, y - 5 * s), pt(x + lx * s + (lx % 2 ? 0.8 : -0.6) * s, y)], 0.7, d.ink, 0.9);
  d.pen.fill(oval(x + 1, y + 0.5, 8 * s, 1.2 * s, 10), 'rgba(38,49,106,0.15)', 1);
}

function sea(a: IslandArt): void {
  // Long Atlantic swells rolling in, and sandbars off the beach.
  const d = a.pen(10);
  for (let k = 0; k < 4; k++) {
    const y = 560 + k * 22;
    const line: Pt[] = [];
    for (let x = a.at(0.05); x < a.at(0.95); x += 12) line.push(pt(x, y + 6 * Math.sin(x / 90 + k)));
    if (line.length > 2) d.pen.hair(line, 0.5, a.ink, 0.22);
  }
  for (const p of place(a, 5, () => pt(a.at(0.45 + a.rng() * 0.5), 560 + a.rng() * 70), (q) => a.plan.islets.every((s) => !s.shape.some((v) => Math.hypot(v.x - q.x, v.y - q.y) < 60)), 90)) {
    a.el(p.x, p.y, 50, (e) => {
      const bar = oval(p.x, p.y, 34 + e.pen.rng() * 16, 6, 14).map((v) => pt(v.x, v.y + Math.sin(v.x / 9) * 1.5));
      e.pen.fill(bar, '#ead9ad', 0.5);
      e.pen.stipple(bar, 70, () => 0.6, 0.45, '#9c8a62');
    });
  }
}

function oasis(a: IslandArt): void {
  const pool = watersOf(a, 'pool')[0];
  if (!pool) return;
  const c = centre(pool.shape);
  a.el(c.x, c.y, 80, (e) => {
    e.pen.fill(oval(c.x, c.y + 2, 64, 36, 20).map((p) => pt(p.x + e.pen.jitter(5), p.y + e.pen.jitter(4))), '#8fbf6a', 0.55);
    e.pen.fill(pool.shape, '#7fb7c9', 0.35);
  });
  for (const p of place(a, 14, () => pt(c.x + (a.rng() - 0.5) * 120, c.y + (a.rng() - 0.5) * 60), (q) => !inside(offsetShape(pool.shape, 6, 1), q) && Math.hypot((q.x - c.x) / 60, (q.y - c.y) / 32) < 1, 13)) {
    a.el(p.x, p.y, 12, (e) => palmStar(e, p.x, p.y, 8 + e.pen.rng() * 2, '#5f9a48'));
  }
  for (const [k, dx] of [-46, -32].entries()) a.el(c.x + dx, c.y - 26, 10, (e) => roof(e, c.x + dx, c.y - 26 + k * 4, 11, 8, 0.1, '#d8b48a'));
  name(a, 'Oasis', c.x + 6, c.y + 46, 16);
  // The caravan trail through it, from the west and away north.
  const trail = [...bezier(pt(a.at(-0.02), a.inland(a.at(0)) + 30), pt(a.at(0.18), c.y + 40), pt(c.x - 30, c.y + 6), 16), ...bezier(pt(c.x + 40, c.y - 10), pt(a.at(0.46), c.y - 60), pt(a.at(0.5), Math.max(0, a.top(a.at(0.5))) - 10), 16)];
  const d = a.pen(12);
  for (let k = 0; k < trail.length - 1; k += 2) d.pen.dot(trail[k]!.x, trail[k]!.y, 0.8, a.ink, 0.6);
  for (const [k, t] of [9, 11, 13].entries()) a.el(trail[t]!.x, trail[t]!.y, 16, (e) => camel(e, trail[t]!.x + k * 2, trail[t]!.y + 2, 1.4));
  name(a, 'caravan trail', trail[6]!.x, trail[6]!.y - 14, 13, -0.15);
}

function land(a: IslandArt): void {
  // A salt pan, crazed with cracks.
  const sx = a.at(0.52);
  const sy = a.inland(sx) + 46;
  a.el(sx, sy, 60, (e) => {
    const pan = oval(sx, sy, 54, 20, 18).map((p) => pt(p.x + e.pen.jitter(5), p.y + e.pen.jitter(3)));
    e.pen.fill(pan, PAPER_FILL, 0.95);
    e.pen.fill(pan, '#e9e4d6', 0.6);
    for (let k = 0; k < 14; k++) {
      const p = pt(sx + e.pen.jitter(44), sy + e.pen.jitter(14));
      e.pen.hair([p, pt(p.x + e.pen.jitter(9), p.y + e.pen.jitter(6)), pt(p.x + e.pen.jitter(14), p.y + e.pen.jitter(8))], 0.4, a.ink, 0.5);
    }
    e.pen.hair([...pan, pan[0]!], 0.6, a.ink, 0.6);
  });
  name(a, 'salt pan', sx, sy + 32, 13);
  // A dry wadi braiding down from the north.
  const wx = a.at(0.66);
  const d = a.pen(13);
  for (let k = 0; k < 3; k++) {
    const w = bezier(pt(wx - 30 + k * 12, Math.max(0, a.top(wx))), pt(wx + 50 - k * 20, a.inland(wx)), pt(wx + 10 + k * 8, a.scrub(wx) - 16), 18);
    for (let i = 0; i < w.length - 1; i += 2) d.pen.hair([w[i]!, w[i + 1]!], 0.6, '#8a6d45', 0.6);
  }
  name(a, 'wadi', wx + 34, a.inland(wx) - 24, 13);
  oasis(a);
  // The dune field, crescents marching east.
  const dunes = grid(a, 70, (q) => a.interior(q.x, q.y, 14) && a.clear(q.x, q.y, 30) && q.y > 4 && !(Math.abs(q.x - sx) < 80 && Math.abs(q.y - sy) < 40));
  for (const p of dunes) {
    const r = 8 + a.rng() * a.rng() * 26;
    const pool = watersOf(a, 'pool')[0];
    if (pool && Math.hypot(p.x - centre(pool.shape).x, p.y - centre(pool.shape).y) < 90) continue;
    if (Math.abs(p.x - wx) < 40) continue;
    a.el(p.x, p.y, r * 1.4, (e) => barchan(e, p.x, p.y, r));
  }
  // Marram along the beach crest and over the spit.
  for (const p of place(a, 60, () => anywhere(a, -0.05, 1.2), (q) => a.onLand(q.x, q.y, 2) && Math.abs(q.y - a.scrub(q.x)) < 16 && a.clear(q.x, q.y, 6), 16)) a.el(p.x, p.y, 6, (e) => tuft(e, p.x, p.y, 7));
  const spit = a.plan.islets.find((s) => s.kind === 'spit');
  if (spit) {
    for (let k = 3; k < spit.spine.length - 2; k += 3) a.el(spit.spine[k]!.x, spit.spine[k]!.y, 6, (e) => tuft(e, spit.spine[k]!.x + e.pen.jitter(4), spit.spine[k]!.y + 3, 6));
    const tip = spit.spine.at(-2)!;
    a.el(tip.x, tip.y, 16, (e) => crown(e, tip.x, tip.y, 4, '#9cae6a'));
    name(a, 'the Spit', spit.spine[14]!.x + 30, spit.spine[14]!.y, 14, -1.2);
    const lag = pt(a.at(0.9), 200);
    name(a, 'flamingo lagoon', lag.x, lag.y - 26, 14);
    for (let k = 0; k < 9; k++) {
      const fx = lag.x - 10 + (k % 3) * 9;
      const fy = lag.y + Math.floor(k / 3) * 8;
      a.el(fx, fy, 4, (e) => e.pen.dot(fx, fy, 1.4, '#e58a9a', 0.95));
    }
  }
}

function over(a: IslandArt): void {
  // A dhow under its lateen sail.
  const x = a.at(0.3);
  const y = 650;
  a.el(x, y, 30, (e) => {
    const hull = [pt(x - 16, y - 4), pt(x + 18, y - 6), pt(x + 12, y + 1), pt(x - 12, y + 1)];
    e.pen.fill(hull, '#8a6a48', 0.85);
    e.pen.hair([...hull, hull[0]!], 0.7, a.ink, 0.9);
    const sail = [pt(x - 12, y - 8), pt(x + 14, y - 30), pt(x + 4, y - 6)];
    e.pen.fill(sail, PAPER_FILL, 1);
    e.pen.fill(sail, '#efe1bd', 0.6);
    e.pen.stroke([...sail, sail[0]!], 0.8, a.ink, 0.9, false);
  });
}

export const DUNES: BiomeArt = { sea, land, over, shallows: '#cfe8ea', edge: 'soft' };
