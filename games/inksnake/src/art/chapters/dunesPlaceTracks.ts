import type { Rng } from '../../logic/rng';
import { blob, polar, SHADOW } from '../groundKit';
import { cub, type Draw, oval, pt, TAU } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { specks } from '../places/farmGroundParts';
import { along, SAND, SAND_DEEP, SAND_LIT, type SandField } from './dunesPlaceKit';

/**
 * What's written in the Dunes' sand: a sidewinder's row of J-shaped tracks
 * (it throws its body sideways, so it touches down in separate bars, each
 * hooked where the head came down), a kangaroo rat's hops (the long hind
 * feet side by side, a tail-drag now and then), and a kangaroo rat's
 * burrow, its mouth dark under a fan of thrown-out sand.
 */

/** May a mark go at p: on loose sand, clear of the level's things. */
export type Room = (p: Pt) => boolean;

/** A shallow trough pressed into the sand along `pts`: shade on its upper-left wall, light on the far rim, a fine line. */
function trough(d: Draw, pts: readonly Pt[], w: number, alpha: number): void {
  const { pen } = d;
  pen.hair(pts.map((p) => pt(p.x + SHADOW.x * w * 0.25, p.y + SHADOW.y * w * 0.25)), w, SAND_DEEP, 0.42 * alpha);
  pen.hair(pts.map((p) => pt(p.x - SHADOW.x * w * 0.15, p.y - SHADOW.y * w * 0.15)), w * 0.55, '#7e6448', 0.32 * alpha);
  pen.hair(pts.map((p) => pt(p.x + SHADOW.x * w * 0.75, p.y + SHADOW.y * w * 0.75)), w * 0.45, SAND_LIT, 0.8 * alpha);
  pen.hair(pts, 0.35, d.ink, 0.22 * alpha);
}

/** Where a trail can start: a spot of open sand with room around it. */
function startOf(sand: SandField, room: Room, rng: Rng): Pt | null {
  for (let k = 0; k < 200; k++) {
    const p = pt(60 + rng() * 840, 50 + rng() * 440);
    if (sand(p.x, p.y) > 0.95 && room(p)) return p;
  }
  return null;
}

/** A sidewinder's trail: parallel bars at a slant to its way, each with its hook, one after another. */
export function sidewinderTrail(d: Draw, sand: SandField, room: Room, rng: Rng): void {
  const start = startOf(sand, room, rng);
  if (!start) return;
  const way = rng() * TAU;
  const dir = pt(Math.cos(way), Math.sin(way));
  const slant = way + (rng() < 0.5 ? 1 : -1) * (0.95 + rng() * 0.25);
  const bar = pt(Math.cos(slant), Math.sin(slant));
  const hookSide = pt(-bar.y, bar.x);
  const side = Math.sign(hookSide.x * dir.x + hookSide.y * dir.y) || 1;
  const n = 8 + Math.floor(rng() * 7);
  for (let i = 0, gone = 0; i < n; i++) {
    gone += 13 + rng() * 5;
    const c = along(along(start, dir, gone), bar, (rng() - 0.5) * 3);
    if (sand(c.x, c.y) < 0.85 || !room(c)) break;
    const len = 20 + rng() * 7;
    const a = along(c, bar, -len / 2);
    const b = along(c, bar, len / 2);
    // The hook: the bar's front end curling round towards the way it went.
    const hook = cub(b, along(b, bar, 4.5), pt(b.x + bar.x * 4.5 + hookSide.x * side * 6, b.y + bar.y * 4.5 + hookSide.y * side * 6), pt(b.x + bar.x * 0.5 + hookSide.x * side * 7.5, b.y + bar.y * 0.5 + hookSide.y * side * 7.5), 8);
    const fade = 1 - (i / n) * 0.45;
    trough(d, [a, ...cub(a, along(a, bar, len * 0.3), along(b, bar, -len * 0.3), b, 8).slice(1), ...hook.slice(1)], 2.4, fade);
  }
}

/** A kangaroo rat's hops across the sand: hind prints side by side every bound, a fore pair now and then, a tail-drag. */
export function kratHops(d: Draw, sand: SandField, room: Room, rng: Rng): void {
  const start = startOf(sand, room, rng);
  if (!start) return;
  let a = rng() * TAU;
  let p = start;
  const n = 10 + Math.floor(rng() * 8);
  const prints: (readonly [number, number, number])[] = [];
  for (let i = 0; i < n; i++) {
    a += (rng() - 0.5) * 0.5;
    p = polar(p, a, 18 + rng() * 10);
    if (sand(p.x, p.y) < 0.85 || !room(p)) break;
    const nx = -Math.sin(a);
    const ny = Math.cos(a);
    for (const s of [-1, 1]) {
      const c = pt(p.x + nx * s * 2.2, p.y + ny * s * 2.2);
      const foot = Array.from({ length: 10 }, (_, k) => {
        const t = (k / 10) * TAU;
        const lx = Math.cos(t) * 2.6;
        const ly = Math.sin(t) * 0.9;
        return pt(c.x + Math.cos(a) * lx - Math.sin(a) * ly, c.y + Math.sin(a) * lx + Math.cos(a) * ly);
      });
      d.pen.fill(foot.map((q) => pt(q.x + SHADOW.x * 0.5, q.y + SHADOW.y * 0.5)), SAND_DEEP, 0.4);
      d.pen.fill(foot, '#8d7050', 0.25);
    }
    if (rng() < 0.4) for (const s of [-1, 1]) prints.push([p.x + Math.cos(a) * 5 + nx * s * 1.5, p.y + Math.sin(a) * 5 + ny * s * 1.5, 0.7]);
    if (rng() < 0.3) d.pen.hair([polar(p, a + Math.PI, 3), polar(p, a + Math.PI + (rng() - 0.5) * 0.2, 12)], 0.45, SAND_DEEP, 0.35);
  }
  specks(d, '#8d7050', 0.45, prints);
}

/** A kangaroo rat's burrow at the foot of a drift: a dark mouth, the fan of thrown-out sand downhill from it, scratch lines across the fan. */
export function burrow(d: Draw, sand: SandField, room: Room, rng: Rng): void {
  let at: Pt | null = null;
  for (let k = 0; k < 300 && !at; k++) {
    const p = pt(40 + rng() * 880, 40 + rng() * 460);
    const s = sand(p.x, p.y);
    if (s > 0.35 && s < 0.9 && room(p)) at = p;
  }
  if (!at) return;
  const { pen } = d;
  const out = rng() * TAU;
  const fanC = polar(at, out, 9);
  const fan = blob(fanC, 13, 8, rng, 0.3, 18, out);
  pen.fill(fan, PAPER_FILL, 0.3);
  pen.fill(fan, SAND, 0.75);
  pen.crescent(fan, pt(-SHADOW.x * 3, -SHADOW.y * 3), () => pen.fill(fan, SAND_DEEP, 0.25));
  for (let k = 0; k < 6; k++) {
    const q = polar(at, out + (rng() - 0.5) * 0.9, 5 + rng() * 4);
    pen.hair([q, polar(q, out + (rng() - 0.5) * 0.3, 6 + rng() * 6)], 0.4, SAND_DEEP, 0.4);
  }
  const hole = oval(at.x, at.y, 4.2, 3.4, 16);
  pen.fill(hole, '#3a2a1e', 0.85);
  pen.clipped(hole, () => pen.fill(oval(at!.x + 1.4, at!.y + 1.6, 4, 3.2, 14), '#7a5a3a', 0.5));
  pen.hair([...hole, hole[0]!], 0.5, d.ink, 0.6);
}
