import { type Draw, oval, pt } from '../../kit';
import type { Pt } from '../../pen';
import { PAPER_FILL } from '../../palette';
import { inside } from '../../../scenes/map/plan';
import { type IslandArt, offsetShape, straight } from '../context';
import type { BiomeArt } from '../island';
import { boatTop, conifer, cottage, hachures, rock } from '../symbols';
import { ripples } from '../creatures';
import { anywhere, centre, grid, name, place, watersOf } from './common';

/**
 * Beach 9, Frost Shingle: a Labrador coast locked in pack ice, floes
 * crowding the shore and thinning out to sea with icebergs among them,
 * bare snowy hills of grey rock with tuckamore in the hollows, frozen
 * ponds, an inuksuk on the height, and a little outport of saltbox houses
 * and a fishing stage on the north shore.
 */
const ICE = '#e3edf2';

/** One ice floe: a broken plate, washed blue at its edges. */
function floe(d: Draw, x: number, y: number, r: number): void {
  const n = 6 + Math.floor(d.pen.rng() * 3);
  const pts: Pt[] = Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2 + d.pen.jitter(0.25);
    const rr = r * (0.65 + d.pen.rng() * 0.45);
    return pt(x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.75);
  });
  d.pen.fill(pts, PAPER_FILL, 0.95);
  d.pen.fill(pts, ICE, 0.8);
  d.pen.fill(offsetShape(pts, -2, 1).map((p) => pt(p.x + 1, p.y + 1.5)), '#b9d0dc', 0.35);
  d.pen.hair(straight(pts, 2), 0.6, d.ink, 0.7);
  if (d.pen.rng() < 0.3) d.pen.hair([pts[0]!, pt(x, y), pts[Math.floor(n / 2)]!], 0.35, '#7fa7c9', 0.7);
}

/** An iceberg in elevation: an angular berg above the waterline and its bulk dashed in below. */
function iceberg(d: Draw, x: number, y: number, s: number): void {
  const above = [pt(x - 26 * s, y), pt(x - 18 * s, y - 16 * s), pt(x - 6 * s, y - 20 * s), pt(x + 2 * s, y - 34 * s), pt(x + 14 * s, y - 18 * s), pt(x + 28 * s, y)];
  d.pen.fill(above, PAPER_FILL, 1);
  d.pen.fill(above, ICE, 0.7);
  d.pen.fill([pt(x + 2 * s, y - 34 * s), pt(x + 14 * s, y - 18 * s), pt(x + 28 * s, y), pt(x + 4 * s, y)], '#9fc0d4', 0.55);
  d.pen.stroke(straight(above, 2, true), 1, d.ink, 0.9, false);
  const below = [pt(x - 26 * s, y + 2), pt(x - 34 * s, y + 18 * s), pt(x - 8 * s, y + 34 * s), pt(x + 26 * s, y + 24 * s), pt(x + 28 * s, y + 2)];
  for (let i = 0; i < below.length - 1; i++) {
    const p = below[i]!;
    const q = below[i + 1]!;
    for (let t = 0; t < 1; t += 0.25) d.pen.hair([pt(p.x + (q.x - p.x) * t, p.y + (q.y - p.y) * t), pt(p.x + (q.x - p.x) * (t + 0.13), p.y + (q.y - p.y) * (t + 0.13))], 0.5, d.ink, 0.45);
  }
  ripples(d, x, y + 2, 36 * s, 0.5);
}

/** An inuksuk: stones stacked into a figure with outstretched arms. */
function inuksuk(d: Draw, x: number, y: number, s: number): void {
  const block = (cx: number, cy: number, w: number, h: number): void => {
    const b = [pt(x + (cx - w) * s, y + (cy - h) * s), pt(x + (cx + w) * s, y + (cy - h) * s), pt(x + (cx + w) * s, y + (cy + h) * s), pt(x + (cx - w) * s, y + (cy + h) * s)];
    d.pen.fill(b, '#8d8a84', 0.9);
    d.pen.hair(straight(b, 1.5), 0.6, d.ink, 0.9);
  };
  block(-4, -3, 2, 3);
  block(4, -3, 2, 3);
  block(0, -8, 6, 2);
  block(0, -12.5, 10, 1.6);
  block(0, -16.5, 3.5, 2.4);
}

function sea(a: IslandArt): void {
  // Fast ice along the northern shore.
  const d = a.pen(10);
  const far: Pt[] = [];
  for (let x = a.at(-0.04); x < a.at(1.04); x += 6) far.push(pt(x, a.top(x) - 5));
  d.pen.stroke(far, 12, PAPER_FILL, 0.75, false);
  // Pack ice crowding the shore, thinning out to sea, a lead of open water winding through it.
  const lead = (p: Pt): boolean => Math.abs(p.y - (a.coast(p.x) + 90 + 30 * Math.sin(p.x / 140))) < 12;
  const islets = a.plan.islets;
  const floes = grid(a, 30, (q) => {
    if (a.onLand(q.x, q.y, -16) || lead(q)) return false;
    if (islets.some((s) => inside(offsetShape(s.shape, 10, 1), q))) return false;
    const off = q.y > a.coast(q.x) ? q.y - a.coast(q.x) : a.top(q.x) - q.y;
    return off > 0 && a.rng() < 1.1 - off / 190;
  }, 0, a.layout.height - 20, 120);
  for (const p of floes) {
    const r = 8 + a.rng() * 7;
    a.el(p.x, p.y, r, (e) => floe(e, p.x, p.y, r));
  }
  name(a, 'pack ice', a.at(0.22), a.coast(a.at(0.22)) + 130, 15);
  name(a, 'lead', a.at(0.6), a.coast(a.at(0.6)) + 92 + 30 * Math.sin(a.at(0.6) / 140), 13);
}

function land(a: IslandArt): void {
  // Bare hills of grey rock under snow, contoured and hachured.
  for (const [u, dy, r] of [[0.16, -10, 46], [0.47, 0, 56], [0.7, -14, 44]] as const) {
    const x = a.at(u);
    const y = a.inland(x) + dy;
    a.el(x, y, r + 10, (e) => {
      for (let k = 0; k < 3; k++) {
        const ring = oval(x - k * 2, y - k * 3, r * (1 - k * 0.28), r * 0.55 * (1 - k * 0.28), 24).map((p) => pt(p.x + e.pen.jitter(2), p.y + e.pen.jitter(1.5)));
        if (ring.some((p) => !a.interior(p.x, p.y, 0))) continue;
        e.pen.hair([...ring, ring[0]!], 0.5, a.ink, 0.45);
      }
      hachures(e, x - 4, y - 5, 10, r, 80, 0.55, 0.45);
    });
  }
  for (const p of place(a, 26, () => anywhere(a), (q) => a.interior(q.x, q.y, 10), 40)) a.el(p.x, p.y, 8, (e) => rock(e, p.x, p.y, 3 + e.pen.rng() * 4, '#8d8a84'));
  // Tuckamore: stunted spruce huddled in the sheltered hollows above the beach.
  for (const p of place(a, 80, () => anywhere(a), (q) => a.interior(q.x, q.y, 6) && q.y > a.scrub(q.x) - 46, 13)) {
    a.el(p.x, p.y, 10, (e) => conifer(e, p.x, p.y, 9 + e.pen.rng() * 3, '#5f7f6a'));
  }
  // Frozen ponds, crazed with cracks.
  for (const w of watersOf(a, 'lake')) {
    const c = centre(w.shape);
    a.el(c.x, c.y, 40, (e) => {
      e.pen.fill(w.shape, ICE, 0.6);
      for (let k = 0; k < 4; k++) e.pen.hair([pt(c.x + e.pen.jitter(20), c.y + e.pen.jitter(8)), pt(c.x + e.pen.jitter(24), c.y + e.pen.jitter(9))], 0.4, '#7fa7c9', 0.8);
    });
  }
  // The inuksuk on the height.
  const ix = a.at(0.47);
  const iy = a.inland(ix) - 8;
  a.el(ix, iy, 20, (e) => inuksuk(e, ix, iy, 1.2));
  name(a, 'inuksuk', ix + 30, iy + 2, 13);
  // The outport: saltbox houses and a fishing stage on the north shore, dories at the landwash.
  const ox = a.at(0.88);
  for (const [k, [dx, wall]] of ([[-40, '#b3322b'], [-14, '#d9a441'], [12, '#e6e1d4'], [36, '#3f6f8f'], [58, '#b3322b']] as const).entries()) {
    const hx = ox + dx;
    const hy = a.top(hx) + 30 + (k % 2) * 10;
    a.el(hx, hy, 16, (e) => cottage(e, hx, hy, 0.8, wall, '#4a4540', true));
  }
  const sx = ox - 70;
  a.el(sx, a.top(sx), 24, (e) => {
    const deck = [pt(sx - 12, a.top(sx) + 4), pt(sx + 12, a.top(sx) + 4), pt(sx + 12, a.top(sx) - 14), pt(sx - 12, a.top(sx) - 14)];
    e.pen.fill(deck, '#9b8a6a', 0.9);
    e.pen.hair(straight(deck, 1.5), 0.6, a.ink, 0.9);
    for (const k of [-10, -4, 2, 8]) e.pen.hair([pt(sx + k, a.top(sx) - 14), pt(sx + k, a.top(sx) - 20)], 0.6, a.ink, 0.8);
    boatTop(e, sx + 24, a.top(sx) - 12, 14, 0.3, '#b3322b');
  });
  name(a, 'outport', ox + 6, a.top(ox) + 60, 13);
  // Shingle on the beach, clear of the route.
  for (const p of place(a, 130, () => anywhere(a), (q) => q.y > a.scrub(q.x) && a.onLand(q.x, q.y, 3) && a.clear(q.x, q.y, 3), 7)) {
    a.el(p.x, p.y, 3, (e) => {
      const peb = oval(p.x, p.y, 2 + e.pen.rng() * 1.5, 1.4 + e.pen.rng(), 8);
      e.pen.fill(peb, ['#a4a6a2', '#8d8a84', '#b9b3a2'][Math.floor(e.pen.rng() * 3)]!, 0.85);
      e.pen.hair([...peb, peb[0]!], 0.35, a.ink, 0.7);
    });
  }
}

function over(a: IslandArt): void {
  for (const [u, y, s] of [[0.36, 640, 1.1], [0.7, 612, 0.8], [1.08, 330, 0.9], [0.06, 70, 0.8]] as const) {
    const x = a.at(u);
    a.el(x, y, 40, (e) => iceberg(e, x, y, s));
  }
  name(a, 'icebergs', a.at(0.52), 650, 14);
  // A seal hauled out on a floe.
  const sx = a.at(0.12);
  const sy = a.coast(sx) + 112;
  a.el(sx, sy, 16, (e) => {
    floe(e, sx, sy, 14);
    e.pen.stroke([pt(sx - 7, sy + 1), pt(sx, sy - 3), pt(sx + 7, sy)], 4, '#6e6a66', 0.95, false);
    e.pen.dot(sx + 6, sy - 1, 0.8, a.ink, 1);
  });
}

export const FROST: BiomeArt = { sea, land, over, shallows: '#d8e6ee', inner: '#6c9cb8', edge: 'rock' };
