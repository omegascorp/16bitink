import { bezier, type Draw, oval, pt } from '../../kit';
import type { Pt } from '../../pen';
import { PAPER_FILL } from '../../palette';
import { type IslandArt, offsetShape } from '../context';
import type { BiomeArt } from '../island';
import { cottage, crown, palmStar } from '../symbols';
import { turtle } from '../creatures';
import { anywhere, centre, name, place, ring, watersOf } from './common';

/**
 * Beach 10, Moonlit Bay: a Queensland reef bay at night, the island bent
 * into a crescent round it under a full moon, its glade shimmering across
 * the water, the surf glowing blue-green all along the shore, a coral reef
 * across the bay's mouth, turtles coming in to nest and their tracks up
 * the sand, rainforest behind with fireflies in it.
 */
const GLOW = '#8ff0e0';
const MOON = '#f6efc8';

/** A four-pointed twinkle. */
function twinkle(d: Draw, x: number, y: number, r: number, color = MOON): void {
  d.pen.hair([pt(x - r, y), pt(x + r, y)], 0.5, color, 0.9);
  d.pen.hair([pt(x, y - r), pt(x, y + r)], 0.5, color, 0.9);
  d.pen.dot(x, y, 0.8, color, 1);
}

function moon(d: Draw, x: number, y: number, r: number, ink: string): void {
  for (let k = 3; k > 0; k--) d.pen.fill(oval(x, y, r + k * 9, r + k * 9, 30), MOON, 0.08);
  d.pen.fill(oval(x, y, r, r, 36), PAPER_FILL, 1);
  d.pen.fill(oval(x, y, r, r, 36), MOON, 0.9);
  for (const [cx, cy, cr] of [[-0.3, -0.2, 0.22], [0.25, 0.1, 0.16], [-0.05, 0.38, 0.12], [0.35, -0.35, 0.09]] as const) {
    const crater = oval(x + cx * r, y + cy * r, cr * r, cr * r * 0.85, 14);
    d.pen.fill(crater, '#d9cf9e', 0.8);
    d.pen.hair([...crater, crater[0]!], 0.4, ink, 0.5);
  }
  d.pen.circle(x, y, r, 1, ink);
}

/** Turtle tracks up the sand from the sea: two rows of flipper marks with a drag line between. */
function tracks(a: IslandArt, x: number): void {
  const y0 = a.coast(x) - 2;
  const y1 = a.scrub(x) + 8;
  const steps: Pt[] = [];
  for (let y = y0; y > y1; y -= 6) {
    const p = pt(x + 6 * Math.sin((y0 - y) / 30), y);
    if (!a.clear(p.x, p.y, 4)) break;
    steps.push(p);
  }
  if (steps.length < 4) return;
  a.el(x, (y0 + y1) / 2, 80, (e) => {
    for (const p of steps) {
      for (const dir of [-1, 1]) e.pen.hair([pt(p.x + dir * 3, p.y), pt(p.x + dir * 6, p.y + 2.5)], 0.6, a.ink, 0.65);
    }
    e.pen.hair(steps, 0.4, a.ink, 0.4);
  });
}

function sea(a: IslandArt): void {
  const d = a.pen(10);
  // The surf glowing along every shore.
  const glow = (shape: readonly Pt[], w: number): void => {
    d.pen.stroke([...shape, shape[0]!], w, GLOW, a.draft ? 0.08 : 0.28, false);
    d.pen.hair([...offsetShape(shape, w * 0.3, 2), offsetShape(shape, w * 0.3, 2)[0]!], 0.8, GLOW, a.draft ? 0.2 : 0.8);
  };
  glow(ring(a, 6), 12);
  for (const s of a.plan.islets) glow(offsetShape(s.shape, 4, 1), 7);
  // The moon's glade across the bay.
  const mx = a.at(0.5);
  for (let k = 0; k < 16; k++) {
    const y = a.coast(mx) + 170 + k * 7;
    const w = 14 + k * 3.5;
    a.el(mx, y, w + 10, (e) => e.pen.stroke([pt(mx - w + e.pen.jitter(8), y), pt(mx + w + e.pen.jitter(8), y)], 1.4, MOON, 0.7 - k * 0.035, false));
  }
  // A coral reef across the bay's mouth, glowing.
  const reef = bezier(pt(a.at(0.16), a.coast(a.at(0.16)) + 90), pt(a.at(0.5), 700), pt(a.at(0.94), a.coast(a.at(0.94)) + 60), 50);
  for (const [i, p] of reef.entries()) {
    a.el(p.x, p.y, 8, (e) => {
      e.pen.circle(p.x + e.pen.jitter(4), p.y + e.pen.jitter(4), 2 + e.pen.rng() * 2.5, 0.5, a.ink);
      e.pen.dot(p.x + e.pen.jitter(6), p.y + e.pen.jitter(5), 1.1, i % 3 ? GLOW : '#f0a0c0', 0.9);
    });
  }
  name(a, 'the glowing reef', a.at(0.78), a.coast(a.at(0.78)) + 120, 14, -0.4);
  // Phosphorescence and starlight on the night water.
  for (const p of place(a, 90, () => pt(a.at(-0.1 + a.rng() * 1.2), a.rng() * a.layout.height), (q) => !a.onLand(q.x, q.y, -20) && (q.y < a.top(q.x) - 20 || q.y > a.coast(q.x) + 30), 14)) {
    a.el(p.x, p.y, 4, (e) => (e.pen.rng() < 0.3 ? twinkle(e, p.x, p.y, 2.5) : e.pen.dot(p.x, p.y, 0.9, GLOW, 0.8)));
  }
}

function land(a: IslandArt): void {
  // Rainforest behind the beach, pandanus at its edge, fireflies in it.
  for (const p of place(a, 150, () => anywhere(a), (q) => a.interior(q.x, q.y, 5), 12)) a.el(p.x, p.y, 9, (e) => crown(e, p.x, p.y, 5 + e.pen.rng() * 2.5, '#3f5a5f', 0.85));
  for (const p of place(a, 30, () => anywhere(a), (q) => a.interior(q.x, q.y, 4) && q.y > a.scrub(q.x) - 26, 22)) a.el(p.x, p.y, 10, (e) => palmStar(e, p.x, p.y, 7, '#4f7a6a'));
  for (const p of place(a, 40, () => anywhere(a), (q) => a.interior(q.x, q.y, 2), 10)) a.el(p.x, p.y, 3, (e) => e.pen.dot(p.x, p.y, 1.3, '#f3e06a', 0.95));
  const lake = watersOf(a, 'lake')[0];
  if (lake) name(a, 'billabong', centre(lake.shape).x, centre(lake.shape).y + 24, 13);
  // Turtle tracks up the sand between the levels.
  for (let k = -1; k < 10; k++) for (const dx of [36, 76]) tracks(a, a.at(0) + 170 + k * 112 + dx);
  name(a, 'turtle rookery', a.at(0.5), a.coast(a.at(0.5)) + 24, 14);
  // A ranger's hut at the western horn.
  const hx = a.at(0.03);
  const hy = a.scrub(hx) - 6;
  a.el(hx, hy, 16, (e) => cottage(e, hx, hy, 0.8, '#c9c2b0', '#4a5a6a'));
}

function over(a: IslandArt): void {
  // The full moon riding over the bay, turtles swimming in under it.
  const mx = a.at(0.5);
  const my = a.coast(mx) + 132;
  a.el(mx, my, 70, (e) => moon(e, mx, my, 30, a.ink));
  for (const [u, dy, ang] of [[0.32, 150, -0.6], [0.66, 170, -2.4], [0.42, 230, -1.2]] as const) {
    const x = a.at(u);
    a.el(x, a.coast(x) + dy, 20, (e) => turtle(e, x, a.coast(x) + dy, 0.9, ang, '#5f7a6a'));
  }
}

export const MOONLIT: BiomeArt = { sea, land, over, shallows: '#6f8fb8', inner: '#2f4d7a', edge: 'soft' };
