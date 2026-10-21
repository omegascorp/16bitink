import { createRng, type Rng } from '../logic/rng';
import { arc, blob, body, type Edgeness, edgenessOf, edgeWash, groundWash, polar, SHADOW } from './groundKit';
import { type GroundKeep, type Room, roomOf, spotFor, type Taken } from './keep';
import { type Draw, normals, pt, ribbon, TAU } from './kit';
import { PAPER_FILL } from './palette';
import type { Pt } from './pen';
import { alpine, boulder, fern, pebble } from './rockeryThings';
import { rgba } from './wash';

/**
 * Chapter 5's page, "The Rockery": pale gravel, calm in the middle where
 * play happens, with big weathered boulders and slabs at the edges, alpine
 * cushions tucked against them, ferns in their shade and a little rill of
 * water trickling between stones along one side. Big things and the rill
 * keep clear of `keep`. Board coordinates.
 */
const GRAVEL = '#d7d0bf';
const GRAVEL_DEEP = '#a39a86';
const GRIT = ['#9b9282', '#c2b8a3', '#7f7a70', '#b3a58c'] as const;
const WATER = '#a7c6c2';
const WATER_DEEP = '#5f8f94';
const DAMP = '#8a8572';
/** The rill: half its width, how far in from the edge it runs, its shortest and longest run. */
const RILL_HALF = 11;
const RILL_IN = 52;
const RILL_MIN = 200;
const RILL_MAX = 640;
/** Bank stones reach this far beyond the water's edge. */
const RILL_BANK = 16;

/** Gravel: a pale wash, grit flecked in denser towards the edges, a scatter of bigger stones there. */
function gravel(d: Draw, w: number, h: number, edge: Edgeness, room: Room, rng: Rng): void {
  const { ctx } = d.pen;
  groundWash(d, w, h, GRAVEL, 0.5);
  edgeWash(d, w, h, GRAVEL_DEEP, 0.28);
  for (let k = 0; k < 30; k++) {
    const p = pt(rng() * w, rng() * h);
    d.pen.fill(blob(p, 40 + rng() * 70, 25 + rng() * 40, rng, 0.25, 18, rng() * TAU), rng() < 0.5 ? GRAVEL_DEEP : PAPER_FILL, 0.04 + 0.05 * edge(p.x, p.y));
  }
  ctx.save();
  for (const colour of GRIT) {
    ctx.fillStyle = rgba(colour, 0.55);
    ctx.beginPath();
    for (let k = 0; k < 3200; k++) {
      const x = rng() * w;
      const y = rng() * h;
      const e = edge(x, y);
      if (rng() > 0.25 + 0.75 * e) continue;
      // Tiny rects: a canvas fills thousands of them far faster than ellipses, and at this size they read as grit.
      const r = 0.6 + rng() * (0.7 + 1.5 * e);
      ctx.rect(x, y, r, r * (0.55 + rng() * 0.45));
    }
    ctx.fill();
  }
  ctx.restore();
  for (let k = 0; k < 320; k++) {
    const p = pt(rng() * w, rng() * h);
    const e = edge(p.x, p.y);
    if (rng() > e * e * 0.9 || room(p.x, p.y) < -14) continue;
    pebble(d, p, 1.8 + rng() * 2.6 * (0.5 + e), rng);
  }
}

/** A meandering line along one side of the board, RILL_IN in from it, every 8 units. */
function rillLine(side: number, w: number, h: number, rng: Rng): Pt[] {
  const ph = rng() * TAU;
  const along = side < 2 ? w : h;
  const n = Math.ceil((along + 80) / 8);
  return Array.from({ length: n }, (_, i) => {
    const u = -40 + i * 8;
    const v = RILL_IN + Math.sin(u / 70 + ph) * 12 + Math.sin(u / 23 + ph * 2) * 4;
    return side === 0 ? pt(u, v) : side === 1 ? pt(u, h - v) : side === 2 ? pt(v, u) : pt(w - v, u);
  });
}

/** The longest stretch of the candidate lines that keeps clear, at most RILL_MAX long, or null. */
function rillCourse(w: number, h: number, room: Room, rng: Rng): Pt[] | null {
  let best: Pt[] = [];
  let score = 0;
  // Sides first; the bottom (where a rail level's branch lies) only if it's much the longest.
  for (const [side, weight] of [[2, 1], [3, 1], [0, 1], [1, 0.6]] as const) {
    const line = rillLine(side, w, h, rng);
    let run: Pt[] = [];
    for (const p of [...line, null]) {
      if (p && room(p.x, p.y) >= RILL_HALF + RILL_BANK) run.push(p);
      else {
        if (Math.min(run.length * 8, RILL_MAX) * weight > score) {
          best = run;
          score = Math.min(run.length * 8, RILL_MAX) * weight;
        }
        run = [];
      }
    }
  }
  if (best.length * 8 < RILL_MIN) return null;
  const keep = Math.floor(RILL_MAX / 8);
  const from = best.length > keep ? Math.floor(rng() * (best.length - keep)) : 0;
  return best.slice(from, from + keep);
}

/** The rill: damp banks, clear shallow water over stones, ripples, stones along both banks. */
function rill(d: Draw, course: readonly Pt[], rng: Rng): Taken[] {
  const { pen } = d;
  const width = (u: number): number => 2 * RILL_HALF * (0.75 + 0.25 * Math.sin(u * 9 + 1)) * Math.min(1, u * 8, (1 - u) * 8 + 0.3);
  const bank = ribbon(course, (u) => width(u) + 16).shape;
  pen.fill(bank, DAMP, 0.25);
  const water = ribbon(course, width);
  body(d, water.shape, WATER, 0.8);
  pen.clipped(water.shape, () => {
    pen.stroke(course, RILL_HALF, WATER_DEEP, 0.3, false);
    for (let k = 0; k < course.length / 2; k++) pebble(d, polar(course[Math.floor(rng() * course.length)]!, rng() * TAU, rng() * RILL_HALF), 1.5 + rng() * 2.5, rng);
    pen.fill(water.shape, WATER, 0.35);
    for (let i = 2; i < course.length - 3; i += 2) {
      const p = polar(course[i]!, rng() * TAU, rng() * RILL_HALF * 0.6);
      pen.hair(arc(p, course[i + 2]!, (rng() - 0.5) * 4, 4).map((q) => polar(q, rng() * TAU, 0.6)), 0.8, PAPER_FILL, 0.6);
    }
  });
  pen.crescent(water.shape, pt(SHADOW.x * 4, SHADOW.y * 4), () => pen.fill(water.shape, WATER_DEEP, 0.3));
  pen.stroke(water.top, 0.9, d.ink, 0.75, false);
  pen.stroke(water.bot, 0.9, d.ink, 0.75, false);
  // Stones along the banks, bigger here and there, and a few in the stream with the water parting round them.
  const nrm = normals(course);
  const taken: Taken[] = [];
  for (let i = 1; i < course.length - 1; i += 2 + Math.floor(rng() * 2)) {
    for (const s of [1, -1]) {
      if (rng() < 0.3) continue;
      const half = width(i / (course.length - 1)) / 2;
      const r = 3 + rng() * 5;
      const p = pt(course[i]!.x + nrm[i]!.x * s * (half + r * 0.6), course[i]!.y + nrm[i]!.y * s * (half + r * 0.6));
      pebble(d, p, r, rng);
    }
  }
  for (let i = 6; i < course.length - 6; i += 9 + Math.floor(rng() * 8)) {
    const p = course[i]!;
    const q = course[i + 2]!;
    const a = Math.atan2(q.y - p.y, q.x - p.x);
    for (const s of [0.5, -0.5]) pen.hair([polar(p, a + Math.PI + s, 10), p], 0.8, PAPER_FILL, 0.8);
    pebble(d, p, 4 + rng() * 3, rng);
  }
  course.forEach((p, i) => {
    if (i % 6 === 0) taken.push({ x: p.x, y: p.y, r: RILL_HALF + 6 });
  });
  return taken;
}

/** Boulders and slabs at the edges, alpines tucked round them and in the gravel, ferns in their shade. */
function rocks(d: Draw, w: number, h: number, edge: Edgeness, room: Room, taken: Taken[], rng: Rng): void {
  const placed: [Pt, number][] = [];
  const boxes = [[-30, -30, w + 30, 140], [-30, h - 140, w + 30, h + 30], [-30, -30, 160, h + 30], [w - 160, -30, w + 30, h + 30]] as const;
  for (let k = 0; k < 140 && placed.length < 18; k++) {
    const r = 26 + rng() * 52;
    const box = boxes[k % boxes.length]!;
    const p = spotFor(rng, room, box, r * 1.12, taken, 6, 10);
    if (!p || edge(p.x, p.y) < 0.5) continue;
    const slab = rng() < 0.35;
    boulder(d, p, slab ? r * 1.2 : r, rng, slab ? 0.55 : 0.85 + rng() * 0.15);
    taken.push({ x: p.x, y: p.y, r: r * 1.05 });
    placed.push([p, r]);
    // A companion stone or two set against it.
    for (let c = 0; c < 2; c++) {
      const q = polar(p, rng() * TAU, r + 8 + rng() * 10);
      const cr = 10 + rng() * 12;
      if (room(q.x, q.y) < cr * 1.12 || taken.some((t) => t !== taken[taken.length - 1] && Math.hypot(t.x - q.x, t.y - q.y) < t.r + cr)) continue;
      boulder(d, q, cr, rng, 0.8);
    }
  }
  const shadowSide = Math.atan2(SHADOW.y, SHADOW.x);
  for (const [p, r] of placed) {
    const base = polar(p, shadowSide + (rng() - 0.5) * 0.8, r * 0.85);
    const len = 40 + rng() * 16;
    if (room(base.x, base.y) >= len && rng() < 0.7) fern(d, base, shadowSide + (rng() - 0.5) * 0.6, len);
  }
  for (const [p, r] of placed) {
    for (let k = 0; k < 4; k++) {
      const cr = 9 + rng() * 9;
      const q = polar(p, rng() * TAU, r + cr * 0.4);
      if (room(q.x, q.y) >= cr) alpine(d, q, cr, rng);
    }
  }
  for (let k = 0; k < 40; k++) {
    const cr = 8 + rng() * 10;
    const q = spotFor(rng, room, boxes[k % boxes.length]!, cr, taken, 4, 6);
    if (q && edge(q.x, q.y) > 0.5) alpine(d, q, cr, rng);
  }
}

/** The rockery page: see the module comment. */
export function paintRockery(d: Draw, w: number, h: number, keep: GroundKeep): void {
  const rng = createRng(5520);
  const edge = edgenessOf(w, h, 0.45);
  const room = roomOf(keep, w, h);
  gravel(d, w, h, edge, room, rng);
  const course = rillCourse(w, h, room, rng);
  const taken = course ? rill(d, course, rng) : [];
  rocks(d, w, h, edge, room, taken, rng);
}
