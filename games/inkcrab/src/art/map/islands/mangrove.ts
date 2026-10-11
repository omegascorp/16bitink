import { bezier, pt } from '../../kit';
import type { Pt } from '../../pen';
import { edgeDistance } from '../../../scenes/map/plan';
import { type IslandArt, offsetShape } from '../context';
import type { BiomeArt } from '../island';
import { boatTop, crown, roof } from '../symbols';
import { anywhere, centre, grid, name, place, ring, watersOf } from './common';

/**
 * Beach 4, Mangrove Margins: a maze of creeks winding in from the north
 * through a solid canopy of mangroves, stilt roots fringing every bank,
 * mudflats spreading off the south shore with channels and fish traps,
 * mangrove islets offshore and a stilt village at a creek mouth.
 */
const CANOPY = '#4f7f45';
const MUD = '#a8936a';

/** Distance to the nearest creek, or Infinity. */
function creekDistance(a: IslandArt, p: Pt): number {
  let best = Infinity;
  for (const w of a.plan.waters) best = Math.min(best, edgeDistance(w.shape, p));
  return best;
}

function sea(a: IslandArt): void {
  const d = a.pen(10);
  // Mudflats off the south shore.
  const flats = ring(a, 56);
  d.pen.fill(flats, MUD, a.draft ? 0.1 : 0.28);
  d.pen.stipple(flats, 2400, (x, y) => (y > a.coast(x) && y < a.coast(x) + 56 ? 0.5 : 0), 0.6, '#6b5a3c');
  // Tidal channels draining across them.
  for (const u of [0.04, 0.3, 0.55, 0.8, 0.97]) {
    const x = a.at(u);
    const ch = bezier(pt(x, a.coast(x) + 2), pt(x + 26, a.coast(x) + 30), pt(x - 8, a.coast(x) + 64), 12);
    a.el(x, a.coast(x) + 30, 50, (e) => e.pen.stroke(ch, 2, '#5f8f9a', 0.6, false));
  }
  // Fish traps: V-shaped lines of stakes out on the flats.
  for (const u of [0.18, 0.68]) {
    const x = a.at(u);
    const y = a.coast(x) + 74;
    a.el(x, y, 40, (e) => {
      for (let k = 0; k < 12; k++) {
        const t = k / 11;
        for (const dir of [-1, 1]) e.pen.dot(x + dir * (30 - t * 30), y - 16 + t * 22, 0.9, a.ink, 0.8);
      }
      e.pen.circle(x, y + 8, 5, 0.6, a.ink);
    });
  }
  name(a, 'mudflats', a.at(0.42), a.coast(a.at(0.42)) + 92, 14);
}

function land(a: IslandArt): void {
  // A solid canopy, denser and darker along the creeks.
  const trees = grid(a, 14, (q) => a.interior(q.x, q.y, 4));
  for (const p of trees) {
    const near = creekDistance(a, p);
    const r = near < 20 ? 6.5 : 5 + a.rng() * 2;
    a.el(p.x, p.y, r + 2, (e) => crown(e, p.x, p.y, r, near < 22 ? CANOPY : '#6c9a58', 0.85));
  }
  for (const s of a.plan.islets) {
    const c = centre(s.shape);
    a.el(c.x, c.y, 40, (e) => {
      for (const v of s.shape.filter((_, i) => i % 2 === 0)) crown(e, (v.x + c.x * 2) / 3, (v.y + c.y * 2) / 3, 5, CANOPY);
      crown(e, c.x, c.y, 6, CANOPY);
    });
  }
  // Stilt roots arching out of the canopy's edge onto the mud.
  const d = a.pen(16);
  for (let x = a.at(-0.04); x < a.at(1.04); x += 7) {
    const y = a.scrub(x) + 2;
    if (!a.clear(x, y + 4, 4) || !a.onLand(x, y, 0)) continue;
    if (x < a.span.x0 - 10 || x > a.span.x1 + 10) continue;
    d.pen.hair(bezier(pt(x - 3, y - 3), pt(x, y - 9), pt(x + 3, y + 2), 5), 0.5, a.ink, 0.6);
  }
  // Root fringes along every creek bank too.
  for (const w of watersOf(a, 'creek')) {
    const bank = offsetShape(w.shape, 2, 1);
    a.el(centre(w.shape).x, centre(w.shape).y, 160, (e) => {
      for (let i = 0; i < bank.length; i += 2) {
        const p = bank[i]!;
        if (!a.interior(p.x, p.y, 0)) continue;
        e.pen.hair([pt(p.x - 2, p.y), pt(p.x, p.y - 3), pt(p.x + 2, p.y)], 0.4, a.ink, 0.5);
      }
    });
  }
  // A stilt village and a dugout at a creek mouth.
  const mouth = watersOf(a, 'creek')[2]?.spine[0];
  if (mouth) {
    for (let k = 0; k < 5; k++) {
      const hx = mouth.x + 26 + k * 15;
      const hy = a.top(hx) + 12 + (k % 2) * 6;
      a.el(hx, hy, 10, (e) => roof(e, hx, hy, 11, 8, 0.2 * (k % 2 ? 1 : -1), '#b58b55'));
    }
    a.el(mouth.x, mouth.y + 20, 16, (e) => boatTop(e, mouth.x - 2, mouth.y + 26, 16, 1.4, '#8a6a48'));
    name(a, 'stilt village', mouth.x + 60, a.top(mouth.x) + 34, 13);
  }
  // A heron at the head of a creek.
  const head = watersOf(a, 'creek')[0]?.spine.at(-1);
  if (head) {
    a.el(head.x, head.y, 14, (e) => {
      e.pen.hair([pt(head.x, head.y - 2), pt(head.x - 1, head.y - 12), pt(head.x + 4, head.y - 16), pt(head.x + 8, head.y - 15)], 0.9, a.ink, 0.9);
      e.pen.stroke(bezier(pt(head.x - 1, head.y - 4), pt(head.x - 6, head.y - 7), pt(head.x - 8, head.y - 3), 5), 2.6, '#9aa4ad', 0.9, false);
      for (const lx of [-1, 1]) e.pen.hair([pt(head.x + lx, head.y - 3), pt(head.x + lx * 2, head.y + 4)], 0.5, a.ink, 0.9);
    });
  }
  for (const w of watersOf(a, 'creek').filter((_, i) => i % 2 === 0).slice(1, 3)) name(a, 'creek', w.spine[6]!.x + 20, w.spine[6]!.y, 13, 1.2);
  // Crab holes on the mud of the beach, clear of the route.
  for (const p of place(a, 80, () => anywhere(a), (q) => q.y > a.scrub(q.x) + 6 && a.onLand(q.x, q.y, 4) && a.clear(q.x, q.y, 4), 10)) a.el(p.x, p.y, 3, (e) => e.pen.dot(p.x, p.y, 1.1, a.ink, 0.6));
  for (const p of place(a, 20, () => anywhere(a), (q) => !a.onLand(q.x, q.y, -6) && q.y > a.coast(q.x) + 8 && q.y < a.coast(q.x) + 50, 30)) a.el(p.x, p.y, 3, (e) => e.pen.dot(p.x, p.y, 1, a.ink, 0.5));
}

export const MANGROVE: BiomeArt = { sea, land, shallows: '#d2e6d8', inner: '#5f8f8a', edge: 'scallop' };
