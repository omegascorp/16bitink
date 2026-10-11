import { bezier, oval, pt } from '../../kit';
import type { Pt } from '../../pen';
import { PAPER_FILL } from '../../palette';
import { type IslandArt, offsetShape } from '../context';
import type { BiomeArt } from '../island';
import { breakers, cliffTicks, conifer, cottage, hachures, lighthouse } from '../symbols';
import { centre, grid, name, place, watersOf } from './common';

/**
 * Beach 6, Fog & Kelp: a cold Pacific coast cut by fjords, dark with
 * conifers to the water's edge under two snowy peaks, kelp beds floating
 * offshore, sea stacks with the surf on them, a lighthouse on the eastern
 * point, cabins at the fjord heads, and banks of fog rolling in.
 */
const FOREST = '#3f6a4f';
const KELP = '#7a6a2e';

/** The two peaks the forest stops short of. */
function peaks(a: IslandArt): Pt[] {
  return [pt(a.at(0.33), a.inland(a.at(0.33)) - 10), pt(a.at(0.64), a.inland(a.at(0.64)) - 18)];
}

function kelpBed(a: IslandArt, x: number, y: number, w: number): void {
  a.el(x, y, w + 10, (e) => {
    const bed = oval(x, y, w, w * 0.32, 18).map((p) => pt(p.x + e.pen.jitter(w * 0.12), p.y + e.pen.jitter(w * 0.06)));
    e.pen.fill(bed, KELP, 0.18);
    for (let k = 0; k < w / 3; k++) {
      const fx = x + e.pen.jitter(w * 0.85);
      const fy = y + e.pen.jitter(w * 0.25);
      e.pen.hair(bezier(pt(fx, fy), pt(fx + 6, fy + e.pen.jitter(4)), pt(fx + 12, fy + e.pen.jitter(3)), 5), 0.6, KELP, 0.75);
      if (k % 2 === 0) e.pen.dot(fx, fy, 1.2, KELP, 0.85);
    }
  });
}

function sea(a: IslandArt): void {
  for (const [u, y, w] of [[0.08, 580, 40], [0.36, 615, 54], [0.58, 590, 36], [0.86, 620, 48], [0.2, 70, 34], [0.86, 56, 40], [1.08, 330, 30], [-0.08, 260, 28]] as const) kelpBed(a, a.at(u), y, w);
  name(a, 'kelp beds', a.at(0.36), 646, 14);
  for (const s of a.plan.islets) {
    const c = centre(s.shape);
    a.el(c.x, c.y, 30, (e) => breakers(e, offsetShape(s.shape, 5, 1), 5, 2.4, 0.5));
  }
  name(a, 'sea stacks', a.at(-0.04), a.coast(a.at(-0.03)) + 64, 13);
}

function land(a: IslandArt): void {
  const tops = peaks(a);
  // Snowy peaks in contours and hachures.
  for (const p of tops) {
    a.el(p.x, p.y, 70, (e) => {
      for (let k = 0; k < 4; k++) {
        const r = 52 - k * 12;
        const ring = oval(p.x - k * 2, p.y - k * 3, r, r * 0.6, 26).map((v) => pt(v.x + e.pen.jitter(2), v.y + e.pen.jitter(1.5)));
        e.pen.fill(ring, k > 1 ? PAPER_FILL : '#9aa59a', k > 1 ? 0.8 : 0.18);
        e.pen.hair([...ring, ring[0]!], 0.5, a.ink, 0.45);
      }
      hachures(e, p.x - 4, p.y - 6, 10, 50, 90, 0.6, 0.5);
    });
  }
  // Forest to the water's edge: conifer marks wherever there's ground.
  const trees = grid(a, 15, (q) => a.interior(q.x, q.y + 2, 4) && tops.every((t) => Math.hypot((q.x - t.x) / 56, (q.y - t.y) / 36) > 1));
  for (const p of trees) {
    const h = 12 + a.rng() * 5;
    a.el(p.x, p.y, h, (e) => conifer(e, p.x, p.y, h, a.rng() < 0.3 ? '#557f5e' : FOREST));
  }
  // Steep banks down every fjord.
  for (const w of watersOf(a, 'fjord')) {
    const bank = offsetShape(w.shape, 2, 1).filter((p) => a.interior(p.x, p.y, 0) || a.onLand(p.x, p.y, 0));
    a.el(centre(w.shape).x, centre(w.shape).y, 180, (e) => cliffTicks(e, bank, -5, 2, 0.5));
  }
  const fjords = watersOf(a, 'fjord').filter((_, i) => i % 2 === 0);
  for (const [i, w] of fjords.entries()) {
    const head = w.spine.at(-1)!;
    a.el(head.x, head.y, 24, (e) => cottage(e, head.x + 14, head.y + 8, 0.75, '#c9b28a', '#6d5a4a'));
    if (i === 1) name(a, 'fjord', w.spine[5]!.x + 22, w.spine[5]!.y, 13, 1.3);
  }
  // The lighthouse on the eastern point.
  const lx = a.at(1.0);
  const ly = a.coast(lx) - 16;
  if (a.clear(lx, ly - 20, 14)) a.el(lx, ly - 20, 60, (e) => lighthouse(e, lx, ly, 1.1));
  name(a, 'Point Light', lx + 50, ly + 12, 14);
  // Drift logs on the grey beach.
  for (const p of place(a, 20, () => pt(a.at(-0.04 + a.rng() * 1.08), a.coast(a.at(0.5)) - 20), () => true, 0, 20)) {
    const y = a.coast(p.x) - 6 - a.rng() * 22;
    if (!a.clear(p.x, y, 12) || !a.onLand(p.x, y, 3)) continue;
    a.el(p.x, y, 14, (e) => {
      const ang = e.pen.jitter(0.5);
      const log = [pt(p.x - Math.cos(ang) * 11, y - Math.sin(ang) * 11), pt(p.x + Math.cos(ang) * 11, y + Math.sin(ang) * 11)];
      e.pen.stroke(log, 3, '#b9a684', 0.9, false);
      e.pen.hair(log, 0.5, a.ink, 0.8);
    });
  }
}

/** Fog banks: soft white drifts with a dashed edge, over the sea and the northern woods. */
function over(a: IslandArt): void {
  for (const [u, y, w, h] of [[0.12, 150, 150, 34], [0.86, 140, 170, 36], [0.5, 205, 120, 26], [0.28, 650, 190, 30], [0.75, 655, 160, 26], [1.1, 250, 120, 40]] as const) {
    const x = a.at(u);
    a.el(x, y, w + 10, (e) => {
      const bank = oval(x, y, w, h, 28).map((p, i) => pt(p.x + e.pen.jitter(6), p.y + Math.sin(i * 1.7) * h * 0.18));
      e.pen.fill(bank, PAPER_FILL, 0.5);
      e.pen.fill(offsetShape(bank, -h * 0.35, 2), PAPER_FILL, 0.35);
      for (let i = 0; i < bank.length - 1; i += 2) e.pen.hair([bank[i]!, bank[i + 1]!], 0.5, a.ink, 0.35);
    });
  }
  name(a, 'fog', a.at(0.86), 140, 15);
}

export const KELP_COAST: BiomeArt = { sea, land, over, shallows: '#c4d9dc', inner: '#4f7f94', edge: 'soft' };
