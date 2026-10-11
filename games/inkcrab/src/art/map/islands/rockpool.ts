import { bezier, type Draw, oval, pt, ribbon } from '../../kit';
import type { Pt } from '../../pen';
import { PAPER_FILL } from '../../palette';
import { type IslandArt, offsetShape, straight } from '../context';
import type { BiomeArt } from '../island';
import { awash, breakers, cliffTicks, cottage, rock, shadow } from '../symbols';
import { anywhere, centre, name, place, watersOf } from './common';

/**
 * Beach 3, Tide Pool Notes: a granite island of tors, heather and gorse
 * cut into little stone-walled fields, its shore stepped into rock
 * shelves full of tide pools and starfish, skerries all round with the
 * surf breaking on them, and a coastguard lookout on the northern head.
 */
const GRANITE = '#a7a598';

/** A tide pool: a still blue hollow in the rock with anemones and a starfish. */
function tidePool(d: Draw, x: number, y: number, r: number): void {
  const pool = oval(x, y, r, r * 0.55, 12).map((p) => pt(p.x + d.pen.jitter(r * 0.15), p.y + d.pen.jitter(r * 0.1)));
  d.pen.fill(offsetShape(pool, 2.5, 1), '#b9b3a2', 0.9);
  d.pen.fill(pool, '#6fb3c6', 0.75);
  d.pen.hair(offsetShape(pool, -1.5, 1), 0.4, PAPER_FILL, 0.7);
  d.pen.hair([...pool, pool[0]!], 0.7, d.ink, 0.85);
  for (let k = 0; k < 3; k++) d.pen.dot(x + d.pen.jitter(r * 0.6), y + d.pen.jitter(r * 0.3), 1, '#d0584a', 0.9);
}

function starfish(d: Draw, x: number, y: number, r: number): void {
  const pts: Pt[] = Array.from({ length: 10 }, (_, i) => {
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2 + 0.3;
    const rr = i % 2 ? r * 0.4 : r;
    return pt(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  });
  d.pen.fill(pts, '#e3876a', 0.9);
  d.pen.hair(straight(pts, 1), 0.5, d.ink, 0.85);
}

/** A slab of granite shelf: an angular outline, washed, its edge hatched. */
function shelf(d: Draw, x: number, y: number, r: number): void {
  const n = 5 + Math.floor(d.pen.rng() * 2);
  const pts: Pt[] = Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2 + d.pen.jitter(0.3);
    const rr = r * (0.7 + d.pen.rng() * 0.4);
    return pt(x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.55);
  });
  d.pen.fill(pts, GRANITE, 0.45);
  d.pen.crescent(pts, pt(-3, -3), () => d.pen.hatch(pts, 1.6, 0.9, 0.35, { color: d.ink, alpha: 0.45 }));
  d.pen.hair(straight(pts, 2), 0.6, d.ink, 0.65);
}

/** A rounded slab of granite, w × h, its lit top and shaded underside. */
function slab(d: Draw, x: number, y: number, w: number, h: number): void {
  const r = h * 0.45;
  const box: Pt[] = [
    ...bezier(pt(x - w / 2, y), pt(x - w / 2, y - h), pt(x - w / 2 + r, y - h), 4),
    ...bezier(pt(x + w / 2 - r, y - h), pt(x + w / 2, y - h), pt(x + w / 2, y), 4),
    ...bezier(pt(x + w / 2, y), pt(x + w / 2, y + h * 0.15), pt(x + w / 2 - r, y + h * 0.15), 3),
    ...bezier(pt(x - w / 2 + r, y + h * 0.15), pt(x - w / 2, y + h * 0.15), pt(x - w / 2, y), 3),
  ];
  d.pen.fill(box, PAPER_FILL, 1);
  d.pen.fill(box, GRANITE, 0.8);
  d.pen.crescent(box, pt(-w * 0.12, -h * 0.35), () => d.pen.hatch(box, 1.2, 0.9, 0.3, { color: d.ink, alpha: 0.5 }));
  d.pen.hair([pt(x - w / 2 + r, y - h + 1.2), pt(x + w / 2 - r, y - h + 1.2)], 0.5, PAPER_FILL, 0.8);
  d.pen.hair([...box, box[0]!], 0.6, d.ink, 0.85);
}

/**
 * A tor: weathered granite slabs stacked on a low rise, as Dartmoor's are,
 * with a cast shadow and short slope strokes on the shaded side only.
 */
function tor(d: Draw, x: number, y: number, s: number): void {
  for (let i = 0; i < 16; i++) {
    const a = -0.3 + (i / 15) * 1.9;
    const r0 = 13 * s;
    const r1 = r0 + (5 + 6 * Math.sin((i / 15) * Math.PI)) * s;
    d.pen.hair([pt(x + Math.cos(a) * r0, y + 3 * s + Math.sin(a) * r0 * 0.5), pt(x + Math.cos(a) * r1, y + 3 * s + Math.sin(a) * r1 * 0.5)], 0.4, d.ink, 0.4);
  }
  shadow(d, x, y + 2 * s, 13 * s, 4 * s);
  slab(d, x - 2 * s, y + 2 * s, 20 * s, 5 * s);
  slab(d, x + 1 * s, y - 3 * s, 15 * s, 4.5 * s);
  slab(d, x - 1 * s, y - 7.5 * s, 9 * s, 4 * s);
}

function sea(a: IslandArt): void {
  for (const [i, s] of a.plan.islets.entries()) {
    const c = centre(s.shape);
    a.el(c.x, c.y, 40, (e) => breakers(e, offsetShape(s.shape, 7, 1), 6, 2.5, 0.5));
    if (i % 3 === 0) a.el(c.x + 24, c.y + 10, 8, (e) => awash(e, c.x + 26, c.y + 12, 3));
  }
  const rocks = place(a, 34, () => anywhere(a, -0.06, 1.06), (q) => !a.onLand(q.x, q.y, -8) && (q.y > a.coast(q.x) + 12 ? q.y < a.coast(q.x) + 70 : q.y > a.top(q.x) - 60), 22);
  for (const p of rocks) a.el(p.x, p.y, 6, (e) => (e.pen.rng() < 0.6 ? awash(e, p.x, p.y, 3, 0.6) : rock(e, p.x, p.y, 3, GRANITE)));
}

function fields(a: IslandArt): void {
  // Stone walls dividing the eastern moor into small fields: dotted wandering lines.
  const d = a.pen(14);
  const x0 = a.at(0.5);
  const x1 = a.at(0.95);
  const walls: Pt[][] = [];
  for (let x = x0; x < x1; x += 70 + a.rng() * 30) walls.push(bezier(pt(x, Math.max(10, a.top(x)) + 20), pt(x + 20, a.inland(x)), pt(x - 10, a.scrub(x) - 22), 12));
  for (let k = 0; k < 2; k++) {
    const line: Pt[] = [];
    for (let x = x0; x < x1; x += 14) line.push(pt(x, a.inland(x) + (k ? 36 : -30) + 6 * Math.sin(x / 40)));
    walls.push(line);
  }
  // Each wall a fine line studded with stones, broken where it leaves the moor.
  for (const w of walls) {
    let run: Pt[] = [];
    const finish = (): void => {
      if (run.length > 1) d.pen.hair(run, 0.6, '#6b6860', 0.7);
      run = [];
    };
    for (const [i, p] of w.entries()) {
      if (!a.interior(p.x, p.y, 8)) {
        finish();
        continue;
      }
      run.push(p);
      const q = w[i + 1];
      if (!q) continue;
      for (let k = 0; k < 3; k++) {
        const t = (k + 0.5) / 3;
        d.pen.dot(p.x + (q.x - p.x) * t + d.pen.jitter(0.8), p.y + (q.y - p.y) * t + d.pen.jitter(0.8), 0.8, '#77746a', 0.7);
      }
    }
    finish();
  }
}

/** A stone circle: standing stones in a ring on the moor. */
function stoneCircle(d: Draw, x: number, y: number, r: number): void {
  for (let k = 0; k < 11; k++) {
    const a = (k / 11) * Math.PI * 2;
    const sx = x + Math.cos(a) * r;
    const sy = y + Math.sin(a) * r * 0.6;
    const stone = [pt(sx - 1.6, sy), pt(sx + 1.6, sy), pt(sx + 1.2, sy - 5), pt(sx - 1.2, sy - 5.4)];
    d.pen.fill(stone, '#8d8a84', 0.95);
    d.pen.hair(straight(stone, 1), 0.5, d.ink, 0.85);
  }
}

/** An old mine's engine house: a roofless gable with its tall chimney. */
function engineHouse(d: Draw, x: number, y: number, s: number): void {
  const house = [pt(x - 8 * s, y), pt(x + 6 * s, y), pt(x + 6 * s, y - 12 * s), pt(x - 1 * s, y - 18 * s), pt(x - 8 * s, y - 12 * s)];
  d.pen.fill(house, '#b9b3a2', 0.9);
  d.pen.fill([pt(x - 4 * s, y - 4 * s), pt(x - 1 * s, y - 4 * s), pt(x - 1 * s, y - 10 * s), pt(x - 4 * s, y - 10 * s)], d.ink, 0.6);
  d.pen.stroke(straight(house, 2), 0.8, d.ink, 0.9, false);
  const stack = [pt(x + 8 * s, y), pt(x + 12 * s, y), pt(x + 11 * s, y - 28 * s), pt(x + 9 * s, y - 28 * s)];
  d.pen.fill(stack, '#9a9488', 0.9);
  d.pen.stroke(straight(stack, 2), 0.8, d.ink, 0.9, false);
}

/** Soft patches of heather, gorse and bracken washed over the moor. */
function moor(a: IslandArt): void {
  const colours = ['#9a7f9f', '#d9c25a', '#b08a4a', '#9a7f9f'];
  for (const [i, p] of place(a, 30, () => anywhere(a), (q) => a.interior(q.x, q.y, 18), 40).entries()) {
    a.el(p.x, p.y, 60, (e) => {
      const r = 22 + e.pen.rng() * 30;
      const ph = e.pen.rng() * 6;
      const patch = oval(p.x, p.y, r, r * 0.5, 28).map((v, k) => {
        const w = 1 + 0.16 * Math.sin(k * 0.67 + ph) + 0.08 * Math.sin(k * 1.9 + ph);
        return pt(p.x + (v.x - p.x) * w, p.y + (v.y - p.y) * w);
      });
      const colour = colours[i % colours.length]!;
      e.pen.clipped(a.land, () => {
        e.pen.fill(offsetShape(patch, 5, 2), colour, 0.12);
        e.pen.fill(patch, colour, 0.2);
        e.pen.stipple(patch, Math.round(r * 4), () => 0.8, 0.75, colour);
      });
    });
  }
}

function land(a: IslandArt): void {
  const d = a.pen(15);
  moor(a);
  d.pen.stipple(a.land, 1400, (x, y) => (a.interior(x, y, 4) ? 0.6 : 0), 0.5, '#5f5a50');
  fields(a);
  // Granite cliffs along the northern shore.
  const far: Pt[] = [];
  for (let x = a.at(-0.03); x < a.at(1.03); x += 5) far.push(pt(x, a.top(x) + 1));
  a.el((far[0]!.x + far.at(-1)!.x) / 2, 100, 900, (e) => cliffTicks(e, far, 7, 2, 0.5));
  for (const p of place(a, 10, () => anywhere(a, 0.02, 0.98), (q) => a.interior(q.x, q.y, 26), 110)) a.el(p.x, p.y, 44, (e) => tor(e, p.x, p.y, 1.4 + e.pen.rng() * 0.6));
  const sc = pt(a.at(0.4), a.inland(a.at(0.4)) - 10);
  if (a.interior(sc.x, sc.y, 20)) {
    a.el(sc.x, sc.y, 30, (e) => stoneCircle(e, sc.x, sc.y, 15));
    name(a, 'standing stones', sc.x, sc.y + 22, 13);
  }
  const mx = a.at(0.66);
  const my = a.inland(mx) + 20;
  if (a.interior(mx, my, 14)) {
    a.el(mx, my, 30, (e) => engineHouse(e, mx, my, 1.1));
    name(a, 'old tin mine', mx + 4, my + 14, 13);
  }
  // A stream from the tarn to the north shore.
  const tarn = watersOf(a, 'pool')[0];
  if (tarn) {
    const c = centre(tarn.shape);
    // It winds in small bends and widens as it nears the sea.
    const course = bezier(pt(c.x, c.y - 8), pt(c.x + 40, (c.y + a.top(c.x)) / 2), pt(c.x + 20, a.top(c.x + 20) + 2), 24);
    const stream = course.map((p, i) => {
      const u = i / (course.length - 1);
      return pt(p.x + Math.sin(u * Math.PI * 5) * 5 * Math.sin(Math.PI * u), p.y);
    });
    const bed = ribbon(stream, (u) => 1.4 + u * 2.2);
    a.el(c.x + 20, (c.y + a.top(c.x)) / 2, 100, (e) => {
      e.pen.fill(bed.shape, '#7fb7c9', 0.9);
      e.pen.hair(bed.top, 0.45, a.ink, 0.6);
      e.pen.hair(bed.bot, 0.45, a.ink, 0.6);
    });
    name(a, 'tarn', c.x - 34, c.y + 2, 13);
  }
  // The shore: granite shelves with pools and starfish, kept off the route.
  for (const p of place(a, 70, () => anywhere(a, -0.04, 1.04), (q) => q.y > a.scrub(q.x) - 4 && a.onLand(q.x, q.y, 6) && a.clear(q.x, q.y, 10), 18)) {
    a.el(p.x, p.y, 16, (e) => {
      const k = e.pen.rng();
      if (k < 0.45) shelf(e, p.x, p.y, 9 + e.pen.rng() * 6);
      else if (k < 0.85) tidePool(e, p.x, p.y, 5 + e.pen.rng() * 4);
      else starfish(e, p.x, p.y, 4.5);
    });
  }
  name(a, 'tide pools', a.at(0.02), a.coast(a.at(0.02)) - 40, 14);
  // The coastguard lookout on the northern head.
  const hx = a.at(0.82);
  const hy = a.top(hx) + 34;
  a.el(hx, hy, 30, (e) => {
    cottage(e, hx - 14, hy, 1, '#e6e1d4', '#59646e');
    cottage(e, hx + 12, hy + 6, 0.8, '#d9d2c0', '#6d5a4a');
  });
  name(a, 'lookout', hx, hy + 18, 13);
}

function over(a: IslandArt): void {
  // A seal hauled out on a skerry.
  const s = a.plan.islets[4];
  if (!s) return;
  const c = centre(s.shape);
  a.el(c.x, c.y, 16, (e) => {
    const body = bezier(pt(c.x - 9, c.y + 1), pt(c.x, c.y - 7), pt(c.x + 9, c.y - 2), 10);
    e.pen.stroke(body, 4.5, '#6e6a66', 0.95, false);
    e.pen.hair(body, 0.6, a.ink, 0.9);
    e.pen.dot(c.x + 8, c.y - 3, 0.8, a.ink, 1);
  });
}

export const ROCKPOOL: BiomeArt = { sea, land, over, shallows: '#cde6ea', edge: 'rock' };
