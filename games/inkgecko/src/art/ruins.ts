import { createRng, type Rng } from '../logic/rng';
import { blob, body, type Edgeness, edgenessOf, polar, SHADOW } from './groundKit';
import { type GroundKeep, type Room, roomOf, spotFor, type Taken } from './keep';
import { closed, type Draw, pt, TAU } from './kit';
import type { Pt } from './pen';
import { fern } from './rockeryThings';
import { flagFloor, mosaic } from './ruinsFloor';
import { brokenColumn } from './ruinsParts';
import { ashlar, fallenShaft, ivyMat, ivyRun, LIMESTONE, mossPatch, roseBush, rubble, statuePlinth, stoneBench, toppledUrn } from './ruinsThings';

/**
 * Chapter 9's page, "The Ruins": the overgrown ruins of an old garden
 * chapel at the top of the estate, seen from above. Worn, cracked
 * flagstones and the faded remains of a mosaic in the nave, pale and quiet
 * in the middle; the stubs of low broken walls along the board's edges
 * with ivy over them and wild roses against them; a toppled urn, an empty
 * statue plinth, a stone bench, fallen masonry, ferns and moss. The
 * level's broken columns (`keep.pillars`) stand where they are, exactly
 * their radius. Big things keep clear of `keep`. Board coordinates.
 */
type Side = 'top' | 'bottom' | 'left' | 'right';
/** A wall stub's thickness (two courses) and its blocks' shortest and longest. */
const WALL = 30;
const BLOCK_MIN = 24;
const BLOCK_MAX = 42;

/** Wall-local (u along the side, v in from it) to board coordinates. */
const sideAt = (side: Side, w: number, h: number) => (u: number, v: number): Pt =>
  side === 'top' ? pt(u, v) : side === 'bottom' ? pt(u, h - v) : side === 'left' ? pt(v, u) : pt(w - v, u);

/** Whether a disc keeps clear of everything already painted. */
const clearOf = (taken: readonly Taken[], p: Pt, r: number, gap = 6): boolean => !taken.some((t) => Math.hypot(t.x - p.x, t.y - p.y) < t.r + r + gap);

/**
 * Low broken walls along each side: runs of two courses of dressed blocks
 * with gaps between, their ends ruined down to the lower course, never
 * where a groove comes in. Returns where rubble has fallen from them.
 */
function wallStubs(d: Draw, w: number, h: number, room: Room, taken: Taken[], rng: Rng): Pt[] {
  const falls: Pt[] = [];
  for (const side of ['top', 'left', 'right', 'bottom'] as const) {
    const L = sideAt(side, w, h);
    const len = side === 'top' || side === 'bottom' ? w : h;
    let u = -20 + rng() * 80;
    while (u < len + 20) {
      const run = 100 + rng() * 240;
      const end = Math.min(len + 20, u + run);
      for (let row = 0; row < 2; row++) {
        // The inner course is ruined back further at each end.
        const trim = row === 1 ? 24 + rng() * 70 : rng() * 20;
        for (let a = u + trim + (row === 1 ? 12 : 0); a < end - trim; ) {
          const l = BLOCK_MIN + rng() * (BLOCK_MAX - BLOCK_MIN);
          const v0 = row * (WALL / 2) - 4;
          const mid = L(a + l / 2, v0 + WALL / 4);
          if (room(mid.x, mid.y) >= l / 2 && clearOf(taken, mid, l / 2, 0) && rng() > 0.1) {
            // Each block set a little out of true, as old work settles.
            const j = (): number => (rng() - 0.5) * 3;
            ashlar(d, [L(a + j(), v0 + j()), L(a + l + j(), v0 + j()), L(a + l + j(), v0 + WALL / 2 + j()), L(a + j(), v0 + WALL / 2 + j())], rng, row === 1 ? 8 : 11);
          } else if (row === 1 && room(mid.x, mid.y) >= l) falls.push(L(a + l / 2, WALL + 16 + rng() * 20));
          a += l;
        }
      }
      if (rng() < 0.6) falls.push(L(end + 10 + rng() * 30, WALL * 0.5 + rng() * 30));
      u = end + 80 + rng() * 220;
    }
    // Ivy over the wall here and there, and moss on its tops.
    for (let k = 0; k < len / 240; k++) {
      const a = rng() * len;
      const r = 14 + rng() * 12;
      const p = L(a, WALL * 0.45);
      if (room(p.x, p.y) < r || !clearOf(taken, p, r, 0)) continue;
      ivyMat(d, p, r, rng);
      const to = L(a + (rng() - 0.5) * 80, WALL + 70);
      if (rng() < 0.7) ivyRun(d, L(a, WALL * 0.6), Math.atan2(to.y - p.y, to.x - p.x), 40 + rng() * 50, rng, 7.5, (q) => room(q.x, q.y) > 0);
    }
    for (let k = 0; k < len / 90; k++) {
      const p = L(rng() * len, rng() * WALL);
      if (room(p.x, p.y) > 10) mossPatch(d, p, 4 + rng() * 5, rng, 0.45);
    }
  }
  return falls;
}

/** A spot for something radius r in one of the edge boxes, keeping clear, or null. */
function edgeSpot(boxes: readonly (readonly [number, number, number, number])[], room: Room, taken: readonly Taken[], edge: Edgeness, r: number, rng: Rng): Pt | null {
  for (let t = 0; t < 8; t++) {
    const box = boxes[Math.floor(rng() * boxes.length)]!;
    const p = spotFor(rng, room, box, r, taken, 10, 8);
    if (p && edge(p.x, p.y) > 0.35) return p;
  }
  return null;
}

/** The urn, plinth, bench, fallen column, rubble, roses, ferns and moss at the edges. */
function furnish(d: Draw, w: number, h: number, edge: Edgeness, room: Room, taken: Taken[], pillarCount: number, falls: readonly Pt[], rng: Rng): void {
  const W = WALL + 6;
  const boxes = [[W, W, w - W, 190], [W, h - 190, w - W, h - W], [W, W, 220, h - W], [w - 220, W, w - W, h - W]] as const;
  const toCentre = (p: Pt): Pt => {
    const l = Math.hypot(w / 2 - p.x, h / 2 - p.y) || 1;
    return pt((w / 2 - p.x) / l, (h / 2 - p.y) / l);
  };
  const place = (r: number, paint: (p: Pt) => void): Pt | null => {
    const p = edgeSpot(boxes, room, taken, edge, r, rng);
    if (!p) return null;
    paint(p);
    taken.push({ x: p.x, y: p.y, r });
    return p;
  };
  const shadeSide = Math.atan2(SHADOW.y, SHADOW.x);
  const pillarsClear = (p: Pt, r: number): boolean => clearOf(taken.slice(0, pillarCount), p, r, 0);
  const ferny: [Pt, number][] = [];
  const plinthAt = place(52, (p) => statuePlinth(d, p, 52, rng() * 0.5 - 0.25, rng));
  if (plinthAt) ferny.push([plinthAt, 40]);
  place(46, (p) => toppledUrn(d, p, polar(pt(0, 0), rng() * TAU, 1), 74, rng));
  const benchAt = place(48, (p) => stoneBench(d, p, toCentre(p), 88, rng));
  if (benchAt) ferny.push([benchAt, 30]);
  for (let k = 0; k < 2; k++) place(50, (p) => fallenShaft(d, p, polar(pt(0, 0), rng() * TAU, 1), 64 + rng() * 34, 12 + rng() * 3, rng));
  for (const f of falls) {
    const r = 18 + rng() * 14;
    if (room(f.x, f.y) >= r && clearOf(taken, f, r)) {
      rubble(d, f, r, rng);
      taken.push({ x: f.x, y: f.y, r: r * 0.8 });
    }
  }
  for (let k = 0; k < 3; k++) place(28, (p) => rubble(d, p, 22 + rng() * 10, rng));
  for (let k = 0; k < 6; k++) {
    const p = place(26, (q) => roseBush(d, q, 18 + rng() * 10, rng));
    if (p) ferny.push([p, 20]);
  }
  for (const [p, r] of ferny) {
    const base = polar(p, shadeSide + (rng() - 0.5) * 0.8, r);
    const len = 36 + rng() * 16;
    if (room(base.x, base.y) >= len * 0.8 && pillarsClear(base, len)) fern(d, base, shadeSide + (rng() - 0.5) * 0.6, len);
  }
  for (let k = 0; k < 4; k++) place(30, (p) => fern(d, p, rng() * TAU, 34 + rng() * 14));
  for (let k = 0; k < 40; k++) {
    const p = spotFor(rng, room, boxes[k % boxes.length]!, 8, taken, 2, 4);
    if (p && edge(p.x, p.y) > 0.5) mossPatch(d, p, 5 + rng() * 7, rng, 0.5);
  }
  chips(d, w, h, edge, room, taken, rng);
}

/** Small chips of stone scattered towards the edges. */
function chips(d: Draw, w: number, h: number, edge: Edgeness, room: Room, taken: readonly Taken[], rng: Rng): void {
  for (let k = 0; k < 260; k++) {
    const p = pt(rng() * w, rng() * h);
    const e = edge(p.x, p.y);
    if (rng() > e * e || room(p.x, p.y) < -16 || !clearOf(taken, p, 2, 0)) continue;
    const cr = 1.4 + rng() * 2.6;
    const chip = blob(p, cr * 1.3, cr, rng, 0.3, 8, rng() * TAU);
    d.pen.fill(chip.map((q) => pt(q.x + SHADOW.x * cr * 0.6, q.y + SHADOW.y * cr * 0.6)), d.ink, 0.14);
    body(d, chip, LIMESTONE, 0.65);
    d.pen.hair(closed(chip), 0.45, d.ink, 0.6);
  }
}

/** The ruins page: see the module comment. */
export function paintRuins(d: Draw, w: number, h: number, keep: GroundKeep): void {
  const rng = createRng(9190);
  const edge = edgenessOf(w, h, 0.45);
  const room = roomOf(keep, w, h);
  flagFloor(d, w, h, edge, rng);
  mosaic(d, pt(w / 2 + (rng() - 0.5) * 140, h / 2 + (rng() - 0.5) * 60), 290 + rng() * 60, 170 + rng() * 30, rng);
  const pillars = keep.pillars ?? [];
  // Each column and its long shadow are kept clear of everything else.
  const taken: Taken[] = pillars.flatMap((p) => [{ x: p.x, y: p.y, r: p.r + 16 }, { x: p.x + SHADOW.x * p.r * 1.6, y: p.y + SHADOW.y * p.r * 1.6, r: p.r + 6 }]);
  const falls = wallStubs(d, w, h, room, taken, rng);
  furnish(d, w, h, edge, room, taken, pillars.length * 2, falls, rng);
  pillars.forEach((p, i) => brokenColumn(d, pt(p.x, p.y), p.r, createRng(4400 + i * 37 + Math.round(p.x)), i % 2 === 0 || p.r > 34));
}
