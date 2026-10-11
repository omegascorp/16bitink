import { bezier, type Draw, oval, pt } from '../kit';
import type { Pt } from '../pen';
import { PAPER_FILL, RED } from '../palette';
import { BACKDROP_W, edges, FAR } from './common';

/**
 * Detail for open water and lagoon: long swells, the net of light that
 * dances over shallow sand, reflections drawn as broken horizontal strokes,
 * and the small craft and markers of a resort lagoon.
 */

/** Long, low swells rolling in on the open ocean: faint lines with a dark trough under each. */
export function swells(t: Draw, y0: number, y1: number): void {
  const { pen } = t;
  for (let row = 0; row < 4; row++) {
    const y = y0 + ((y1 - y0) * (row + 0.5)) / 4;
    for (let x = (row * 97) % 160; x < BACKDROP_W; x += 120 + pen.rng() * 90) {
      const len = 50 + pen.rng() * 60;
      const crest = bezier(pt(x, y), pt(x + len / 2, y - 1.2), pt(x + len, y), 10);
      pen.hair(crest, 0.5, PAPER_FILL, 0.55);
      pen.hair(crest.map((p) => pt(p.x + 3, p.y + 1.2)), 0.45, t.ink, FAR * 0.35);
    }
  }
}

/**
 * Caustics: the bright, wobbling mesh of light on sand under shallow water,
 * cells widening towards the viewer.
 */
export function caustics(t: Draw, y0: number, y1: number): void {
  const { pen } = t;
  const rows: Pt[][] = [];
  let y = y0;
  for (let r = 0; y < y1; r++) {
    const k = (y - y0) / (y1 - y0);
    const sx = 9 + 10 * k;
    const row: Pt[] = [];
    for (let x = -sx + (r % 2) * sx * 0.5; x < BACKDROP_W + sx; x += sx) row.push(pt(x + pen.jitter(sx * 0.3), y + pen.jitter(1 + k)));
    rows.push(row);
    y += 3 + 4 * k;
  }
  for (let r = 0; r < rows.length; r++) {
    const k = r / rows.length;
    const a = 0.18 + 0.3 * k;
    const row = rows[r]!;
    const next = rows[r + 1];
    for (let i = 0; i < row.length; i++) {
      const p = row[i]!;
      const q = row[i + 1];
      if (q && pen.rng() < 0.8) pen.hair(bezier(p, pt((p.x + q.x) / 2, (p.y + q.y) / 2 - 1), q, 4), 0.55 + 0.3 * k, PAPER_FILL, a);
      const below = next?.[i];
      if (below && pen.rng() < 0.55) pen.hair([p, below], 0.5 + 0.3 * k, PAPER_FILL, a * 0.8);
    }
  }
}

/** A reflection: the object's colour as broken horizontal strokes under it, shortening with depth. */
export function reflection(t: Draw, x: number, water: number, w: number, depth: number, color: string, alpha: number): void {
  const { pen } = t;
  for (let y = water + 1.5; y < water + depth; y += 1.6) {
    const k = (y - water) / depth;
    const half = (w / 2) * (1 - k * 0.5);
    let px = x - half + pen.rng() * 3;
    while (px < x + half) {
      const len = 2 + pen.rng() * 5;
      pen.hair([pt(px, y), pt(Math.min(x + half, px + len), y)], 0.8, color, alpha * (1 - k));
      px += len + 1 + pen.rng() * 3;
    }
  }
}

/** Channel buoys marking the gap through the reef: a bobbing float with a stubby topmark. */
export function buoy(t: Draw, x: number, water: number, s: number, red: boolean): void {
  const { pen } = t;
  const body = oval(x, water - 2 * s, 2.4 * s, 2.2 * s, 10);
  pen.fill(body, PAPER_FILL, 1);
  pen.fill(body, red ? RED : '#3f9a6a', 0.55);
  pen.stroke(edges(body), 0.6, t.ink, FAR, false);
  pen.hair([pt(x, water - 4 * s), pt(x, water - 7 * s)], 0.6, t.ink, FAR);
  pen.hair([pt(x - 3 * s, water + 0.8), pt(x + 3 * s, water + 0.8)], 0.4, t.ink, FAR * 0.5);
}

/** Wispy cirrus high up: a few fine, combed strands with hooked ends. */
export function cirrus(t: Draw, x: number, y: number, w: number): void {
  const { pen } = t;
  for (let k = 0; k < 5; k++) {
    const x0 = x + pen.jitter(w * 0.15);
    const y0 = y + k * 3 + pen.jitter(1);
    const len = w * (0.5 + pen.rng() * 0.5);
    pen.hair(bezier(pt(x0, y0), pt(x0 + len * 0.6, y0 - 4), pt(x0 + len, y0 - 9 - pen.rng() * 3), 10), 0.55, t.ink, FAR * 0.4);
  }
}
