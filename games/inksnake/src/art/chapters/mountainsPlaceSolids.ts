import type { SolidDef } from '../../level/types';
import { outline, polar, SHADOW } from '../groundKit';
import { type Draw, pt, TAU } from '../kit';
import type { Pt } from '../pen';
import { crackLine, LIME_BUFF, rngAt, rockMass, rockShape } from './mountainsPlaceKit';
import { dryTuft, stone, thymeMat } from './mountainsPlaceParts';

/**
 * The Mountains' solid things seen from above, each filling its collision
 * shape: a crag (a block of bedded limestone standing out of the slope,
 * rect or round, its beds stepping down its flanks, a joint split down it,
 * grass and thyme rooted in its cracks, fallen stones at its foot) and a
 * boulder (one weathered lump of limestone), all lit from the upper left
 * with their shadows thrown down and right.
 */

/** A rect's outline, its edges chipped and notched as broken rock is, kept just inside the rect. */
function rockyRect(x: number, y: number, w: number, h: number, seed: number): Pt[] {
  const rng = rngAt(x, y, seed);
  const cut = Math.min(w, h) * 0.3;
  const corners = [pt(x + cut * rng(), y), pt(x + w - cut * rng(), y), pt(x + w, y + cut * rng()), pt(x + w, y + h - cut * rng()), pt(x + w - cut * rng(), y + h), pt(x + cut * rng(), y + h), pt(x, y + h - cut * rng()), pt(x, y + cut * rng())];
  const cx = x + w / 2;
  const cy = y + h / 2;
  return outline(corners, 11).slice(0, -1).map((p, i) => {
    // Now and then a chunk broken out of an edge.
    const k = 1 - rng() * 0.03 - (Math.sin(i * 1.7 + seed) > 0.8 ? 0.06 : 0);
    return pt(cx + (p.x - cx) * k, cy + (p.y - cy) * k);
  });
}

/** Stones fallen from a crag, scattered round its foot on the shadow side. */
function talus(d: Draw, c: Pt, r: number, n: number, seed: number): void {
  const rng = rngAt(c.x, c.y, seed);
  for (let k = 0; k < n; k++) {
    const a = Math.atan2(SHADOW.y, SHADOW.x) + (rng() - 0.5) * 2.6;
    stone(d, polar(c, a, r * (1.02 + rng() * 0.25)), 1.5 + rng() * 3, rng);
  }
}

/** Grass and thyme rooted in a crag's cracks, here and there on its top. */
function rooted(d: Draw, c: Pt, rx: number, ry: number, seed: number): void {
  const rng = rngAt(c.x, c.y, seed);
  for (let k = 0; k < 2 + Math.floor(rng() * 2); k++) {
    const p = pt(c.x + (rng() - 0.5) * rx * 1.1, c.y + (rng() - 0.5) * ry * 1.1);
    if (rng() < 0.65) dryTuft(d, p, 4 + rng() * 4, rng);
    else thymeMat(d, p, 3 + rng() * 2.5, rng, 0.5);
  }
}

/** A crag filling x, y, w × h: a jagged block of bedded limestone, a joint split across it, plants in its cracks, fallen stones at its foot. */
export function cragBlock(d: Draw, x: number, y: number, w: number, h: number): void {
  const rng = rngAt(x, y, 1);
  const shape = rockyRect(x, y, w, h, 2);
  const c = pt(x + w / 2, y + h / 2);
  talus(d, c, Math.hypot(w, h) / 2, 7, 3);
  rockMass(d, shape, rng, { height: Math.min(18, Math.min(w, h) * 0.32), ledges: 2, tone: '#b5ae9f' });
  // A joint splitting the block, slantwise across its shorter way.
  const along = w >= h;
  const t0 = 0.3 + rng() * 0.4;
  const slant = (rng() - 0.5) * 0.5;
  d.pen.clipped(shape, () => {
    const path = Array.from({ length: 14 }, (_, i) => {
      const t = i / 13;
      const jig = (rng() - 0.5) * 3;
      return along ? pt(x + w * (t0 + slant * (t - 0.5)) + jig, y - 2 + t * (h + 4)) : pt(x - 2 + t * (w + 4), y + h * (t0 + slant * (t - 0.5)) + jig);
    });
    crackLine(d, path, 1.6, 0.95);
  });
  rooted(d, c, w / 2, h / 2, 4);
}

/** A round crag (an outcrop) of radius r at c. */
export function cragKnoll(d: Draw, c: Pt, r: number): void {
  const rng = rngAt(c.x, c.y, 5);
  const shape = rockShape(c, r * 0.98, r * 0.94, rng, rng() * TAU, 13);
  talus(d, c, r, 5, 6);
  rockMass(d, shape, rng, { height: Math.min(16, r * 0.5), ledges: 2, tone: '#b7b0a1' });
  rooted(d, c, r * 0.8, r * 0.7, 7);
}

/** A boulder of radius r at c: one weathered lump, rounder and buffer than the crags. */
export function boulder(d: Draw, c: Pt, r: number): void {
  const rng = rngAt(c.x, c.y, 8);
  const shape = rockShape(c, r * 0.97, r * (0.84 + rng() * 0.12), rng, rng() * TAU, 9);
  rockMass(d, shape, rng, { height: r * 0.55, ledges: 0, tone: rng() < 0.5 ? '#bdb5a4' : LIME_BUFF });
}

/** A solid by its look, or null when the Mountains have no painting for that look. */
export function mountainSolid(d: Draw, s: SolidDef): boolean {
  if (s.look === 'crag') {
    if (s.kind === 'rect') cragBlock(d, s.x, s.y, s.w, s.h);
    else cragKnoll(d, pt(s.x, s.y), s.r);
    return true;
  }
  if (s.look === 'boulder' || s.look === 'rock') {
    if (s.kind === 'circle') boulder(d, pt(s.x, s.y), s.r);
    else cragBlock(d, s.x, s.y, s.w, s.h);
    return true;
  }
  return false;
}
