import type { Rng } from '../logic/rng';
import { blob, body, outline, SHADOW } from './groundKit';
import type { GroundKeep } from './keep';
import { closed, type Draw, pt, TAU } from './kit';
import { PAPER_FILL } from './palette';
import type { Pt } from './pen';
import { OAK, OAK_DARK } from './barnParts';
import { mix, rgba } from './wash';

/**
 * The barn's walls, seen from above: heavy timber along the left, right and
 * top of the board, exactly BARN_WALL deep, which marble shots bounce off.
 * Each is a strip of weathered vertical boarding (its top edge) on the
 * outside and a dark oak wall plate inside it, broken by the end grain of
 * the posts; square-cut holes where a groove runs through; the plate's
 * shadow thrown in across the floor. The bottom is open: the big doors
 * stand open on the yard, daylight and grass at the threshold.
 */

/** How deep the walls reach in from the left, right and top edges: shots bounce at this line. */
export const BARN_WALL = 14;
/** Half a groove's width (TRACK_W / 2 in placesArt.ts), and the clearance a hole in the wall leaves each side of it. */
const GROOVE_HALF = 20;
const HOLE_SPARE = 6;
/** The weathered boarding's share of the wall's depth, outside the plate. */
const BOARDING = 5;
/** Posts along a wall: their pitch and half their width. */
const POST_PITCH = 190;
const POST_HALF = 9;
const WEATHERED = '#6b6052';
const PLATE = '#4e3523';
const END_GRAIN = '#b88e60';
const IRON = '#45464e';
const DAY = '#fff4d2';
const GRASS = '#7c9f57';
const YARD = '#c8b48e';

export type WallSide = 'top' | 'left' | 'right';

/** Wall-local (u along the wall, v in from the board's edge) to the board. */
export const wallPoint =
  (side: WallSide, w: number) =>
  (u: number, v: number): Pt =>
    side === 'top' ? pt(u, v) : side === 'left' ? pt(v, u) : pt(w - v, u);

/** Board to wall-local [u, v]. */
const wallLocal = (side: WallSide, w: number, p: Pt): readonly [number, number] => (side === 'top' ? [p.x, p.y] : side === 'left' ? [p.y, p.x] : [p.y, w - p.x]);

/** Where grooves run through a wall: merged [u0, u1] spans along it. */
export function wallHoles(side: WallSide, w: number, keep: GroundKeep): [number, number][] {
  const spans: [number, number][] = [];
  const reach = GROOVE_HALF + HOLE_SPARE;
  for (const g of keep.grooves) {
    for (const p of g) {
      const [u, v] = wallLocal(side, w, p);
      if (v > -GROOVE_HALF && v < BARN_WALL + GROOVE_HALF) spans.push([u - reach, u + reach]);
    }
  }
  spans.sort((a, b) => a[0] - b[0]);
  const out: [number, number][] = [];
  for (const s of spans) {
    const last = out[out.length - 1];
    if (last && s[0] <= last[1]) last[1] = Math.max(last[1], s[1]);
    else out.push([s[0], s[1]]);
  }
  return out;
}

/** The solid runs of a wall from u0 to u1 between its holes. */
function runsBetween(u0: number, u1: number, holes: readonly [number, number][]): [number, number][] {
  const out: [number, number][] = [];
  let at = u0;
  for (const [a, b] of holes) {
    if (b <= at || a >= u1) continue;
    if (a > at) out.push([at, a]);
    at = Math.max(at, b);
  }
  if (at < u1) out.push([at, u1]);
  return out.filter(([a, b]) => b - a > 3);
}

/** Where a run of wall from u0 to u1 has its posts: at their pitch, wherever the wall is whole round them. */
function postsAlong(u0: number, u1: number, holes: readonly [number, number][]): number[] {
  const out: number[] = [];
  for (let u = POST_PITCH * 0.6; u < u1; u += POST_PITCH) {
    if (u - POST_HALF < u0 + 2 || u + POST_HALF > u1 - 2) continue;
    if (holes.some(([a, b]) => u + POST_HALF > a - 4 && u - POST_HALF < b + 4)) continue;
    out.push(u);
  }
  return out;
}

/** Every post along a wall (u, along it), for hanging things on. */
export function wallPosts(side: WallSide, w: number, h: number, keep: GroundKeep): number[] {
  const holes = wallHoles(side, w, keep);
  return runsBetween(side === 'top' ? 0 : BARN_WALL, side === 'top' ? w : h, holes).flatMap(([a, b]) => postsAlong(a, b, holes));
}

/** The shadow the walls throw in across the floor: deep under the top and left walls (the light's side), a faint line under the right. */
export function wallShadows(d: Draw, w: number, h: number, keep: GroundKeep): void {
  const { pen } = d;
  const { ctx } = pen;
  const depth: Record<WallSide, readonly [number, number]> = { top: [36, 0.46], left: [30, 0.4], right: [10, 0.18] };
  for (const side of ['top', 'left', 'right'] as const) {
    const L = wallPoint(side, w);
    const len = side === 'top' ? w : h;
    const [reach, alpha] = depth[side];
    const from = L(0, BARN_WALL);
    const to = L(0, BARN_WALL + reach);
    for (const [u0, u1] of runsBetween(side === 'top' ? 0 : BARN_WALL, len, wallHoles(side, w, keep))) {
      const quad = [L(u0 + 2, BARN_WALL), L(u1 - 2, BARN_WALL), L(u1 - 2 + reach * 0.4, BARN_WALL + reach), L(u0 + 2 + reach * 0.4, BARN_WALL + reach)];
      const g = ctx.createLinearGradient(from.x, from.y, to.x, to.y);
      g.addColorStop(0, rgba(d.ink, alpha));
      g.addColorStop(0.3, rgba(d.ink, alpha * 0.55));
      g.addColorStop(1, rgba(d.ink, 0));
      ctx.save();
      ctx.fillStyle = g;
      ctx.beginPath();
      quad.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      if (side !== 'right' && u1 - u0 > 12) {
        const band = [L(u0 + 3, BARN_WALL), L(u1 - 3, BARN_WALL), L(u1 - 3, BARN_WALL + reach * 0.45), L(u0 + 3, BARN_WALL + reach * 0.45)];
        pen.hatch(band, 2.8, side === 'top' ? 1.25 : 0.35, 0.5, { color: d.ink, alpha: 0.3 });
      }
    }
  }
}

/** A square of end grain (a post's top or a cut beam end): rings round its heart, a check, shade. */
function endGrain(d: Draw, quad: readonly Pt[], rng: Rng): void {
  const { pen } = d;
  const c = pt(quad.reduce((s, p) => s + p.x, 0) / quad.length, quad.reduce((s, p) => s + p.y, 0) / quad.length);
  body(d, quad, mix(END_GRAIN, OAK, rng() * 0.35), 0.82);
  const heart = pt(c.x + (rng() - 0.5) * 4, c.y + (rng() - 0.5) * 4);
  pen.clipped(quad, () => {
    for (const k of [0.25, 0.5, 0.75, 1.02]) pen.hair(closed(quad.map((p) => pt(heart.x + (p.x - c.x) * k, heart.y + (p.y - c.y) * k))), 0.4, OAK_DARK, 0.55);
    const a = rng() * TAU;
    pen.hair([heart, pt(heart.x + Math.cos(a) * 9, heart.y + Math.sin(a) * 9)], 0.8, OAK_DARK, 0.75);
  });
  pen.crescent(quad, pt(-SHADOW.x * 2.5, -SHADOW.y * 2.5), () => pen.fill(quad, OAK_DARK, 0.35));
  pen.stroke(outline(quad, 4), 1, d.ink, 0.95, false);
}

/** One solid run of wall from u0 to u1: boarding outside, the oak plate inside, posts showing their end grain, pegged joints. */
function wallRun(d: Draw, side: WallSide, w: number, u0: number, u1: number, holes: readonly [number, number][], rng: Rng): void {
  const { pen } = d;
  const { ctx } = pen;
  const L = wallPoint(side, w);
  const rect = (a: number, b: number, v0: number, v1: number): Pt[] => [L(a, v0), L(b, v0), L(b, v1), L(a, v1)];
  // The boarding's top edge: weathered grey, one board after another.
  const boards = rect(u0, u1, -3, BOARDING);
  body(d, boards, WEATHERED, 0.88);
  ctx.save();
  ctx.strokeStyle = rgba(d.ink, 0.5);
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  for (let u = u0 + 4 + rng() * 6; u < u1 - 2; u += 7 + rng() * 6) {
    const a = L(u, -3);
    const b = L(u + (rng() - 0.5), BOARDING);
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
  }
  ctx.stroke();
  ctx.restore();
  // The plate: dark oak, grain running along, a crescent of shade on its inner edge.
  const plate = rect(u0, u1, BOARDING, BARN_WALL);
  body(d, plate, mix(PLATE, OAK_DARK, rng() * 0.4), 0.92);
  ctx.save();
  ctx.lineWidth = 0.55;
  for (const [colour, alpha] of [['#2c1d12', 0.6], [PAPER_FILL, 0.2]] as const) {
    ctx.strokeStyle = rgba(colour, alpha);
    ctx.beginPath();
    for (let k = 0; k < (u1 - u0) / 9; k++) {
      const u = u0 + rng() * (u1 - u0);
      const v = BOARDING + 1.2 + rng() * (BARN_WALL - BOARDING - 2.4);
      const l = 12 + rng() * 40;
      const a = L(u, v);
      const m = L(Math.min(u1, u + l / 2), v + (rng() - 0.5) * 0.8);
      const b = L(Math.min(u1, u + l), v + (rng() - 0.5) * 1.2);
      ctx.moveTo(a.x, a.y);
      ctx.quadraticCurveTo(m.x, m.y, b.x, b.y);
    }
    ctx.stroke();
  }
  ctx.restore();
  // Joints in the plate, each held with two oak pegs.
  for (let u = u0 + 120 + rng() * 120; u < u1 - 40; u += 210 + rng() * 120) {
    pen.stroke([L(u, BOARDING), L(u + 1.5, (BOARDING + BARN_WALL) / 2), L(u + 0.5, BARN_WALL)], 0.9, d.ink, 0.85, false);
    for (const du of [-6, 6]) pen.dot(L(u + du, (BOARDING + BARN_WALL) / 2).x, L(u + du, (BOARDING + BARN_WALL) / 2).y, 1.3, END_GRAIN, 0.95);
  }
  pen.stroke(outline(boards, 8).slice(0, -1), 0.8, d.ink, 0.6, false);
  // Posts at their pitch, where the wall is whole round them.
  for (const u of postsAlong(u0, u1, holes)) {
    const post = rect(u - POST_HALF, u + POST_HALF, 0, BARN_WALL);
    if (side !== 'right') d.pen.fill([post[3]!, post[2]!, ...[post[2]!, post[3]!].map((p) => pt(p.x + SHADOW.x * 7, p.y + SHADOW.y * 7))], d.ink, 0.22);
    endGrain(d, post, rng);
  }
  // The cut ends either side of a hole.
  for (const [a, b] of holes) {
    if (Math.abs(a - u1) < 0.5) endGrain(d, rect(u1 - 4, u1, 0, BARN_WALL), rng);
    if (Math.abs(b - u0) < 0.5) endGrain(d, rect(u0, u0 + 4, 0, BARN_WALL), rng);
  }
  // The inner face: the line shots bounce off, the firmest line on the page.
  pen.hair([L(u0 + 2, BOARDING + 1.6), L(u1 - 2, BOARDING + 1.6)], 0.9, PAPER_FILL, 0.3);
  pen.hatch(boards, 2.4, side === 'top' ? 0.9 : 2.2, 0.4, { color: d.ink, alpha: 0.35 });
  const steps = Math.max(2, Math.ceil((u1 - u0) / 24));
  pen.stroke(Array.from({ length: steps + 1 }, (_, i) => L(u0 + ((u1 - u0) * i) / steps, BARN_WALL)), 2.3, d.ink, 1, false);
  pen.stroke(Array.from({ length: steps + 1 }, (_, i) => L(u0 + ((u1 - u0) * i) / steps, 0)), 1, d.ink, 0.8, false);
}

/** A hole where a groove runs through a wall: the floor under it in shade, a threshold board worn pale. */
function hole(d: Draw, side: WallSide, w: number, a: number, b: number): void {
  const L = wallPoint(side, w);
  const gap = [L(a, -4), L(b, -4), L(b, BARN_WALL), L(a, BARN_WALL)];
  d.pen.fill(gap, d.ink, 0.12);
  d.pen.fill([L(a, BARN_WALL - 4), L(b, BARN_WALL - 4), L(b, BARN_WALL), L(a, BARN_WALL)], mix(END_GRAIN, PAPER_FILL, 0.4), 0.55);
}

/** The three walls, their corner posts, and the big posts of the open doorway at the bottom. */
export function barnWalls(d: Draw, w: number, h: number, keep: GroundKeep, rng: Rng): void {
  for (const side of ['left', 'right', 'top'] as const) {
    const len = side === 'top' ? w : h;
    const holes = wallHoles(side, w, keep);
    const from = side === 'top' ? 0 : BARN_WALL;
    for (const [a, b] of holes) if (b > from && a < len) hole(d, side, w, Math.max(from, a), Math.min(len, b));
    for (const [u0, u1] of runsBetween(from, len, holes)) wallRun(d, side, w, u0, u1, holes, rng);
  }
  // Corner posts where the top wall meets the sides.
  for (const x of [0, w - BARN_WALL]) endGrain(d, [pt(x, 0), pt(x + BARN_WALL, 0), pt(x + BARN_WALL, BARN_WALL), pt(x, BARN_WALL)], rng);
  // The doorposts at the open bottom, a hinge strap on each.
  for (const side of ['left', 'right'] as const) {
    const L = wallPoint(side, w);
    const holes = wallHoles(side, w, keep);
    if (holes.some(([a, b]) => b > h - 30 && a < h)) continue;
    const post = [L(h - 26, 0), L(h + 2, 0), L(h + 2, BARN_WALL), L(h - 26, BARN_WALL)];
    endGrain(d, post, rng);
    for (const u of [h - 20, h - 8]) {
      const strap = [L(u - 1.6, -2), L(u + 1.6, -2), L(u + 1.6, 4), L(u - 1.6, 4)];
      d.pen.fill(strap, IRON, 0.9);
    }
  }
}

/**
 * The open doorway along the bottom: daylight falling in across the floor,
 * the boards giving way to the yard's packed earth and grass at the sill.
 */
export function doorway(d: Draw, w: number, h: number, inGroove: (p: Pt) => boolean, rng: Rng): void {
  const { pen } = d;
  const { ctx } = pen;
  const g = ctx.createLinearGradient(0, h, 0, h - 200);
  g.addColorStop(0, rgba(DAY, 0.75));
  g.addColorStop(0.3, rgba(DAY, 0.3));
  g.addColorStop(1, rgba(DAY, 0));
  ctx.save();
  ctx.fillStyle = g;
  ctx.fillRect(BARN_WALL, h - 200, w - 2 * BARN_WALL, 200);
  ctx.restore();
  // The yard at the threshold: a ragged strip of earth below the last board.
  const edge = Array.from({ length: Math.ceil(w / 16) + 1 }, (_, i) => pt(i * 16, h - 15 - Math.sin(i * 0.7) * 2.5 - rng() * 4));
  const yard = [...edge, pt(w, h + 4), pt(0, h + 4)];
  pen.fill(yard, PAPER_FILL, 0.8);
  pen.fill(yard, YARD, 0.55);
  pen.fill(yard.map((p) => pt(p.x, p.y + 3)), d.ink, 0.06);
  pen.stipple(yard, 1400, () => 0.7, 0.6, mix(YARD, d.ink, 0.4));
  for (let k = 0; k < 40; k++) {
    const p = pt(30 + rng() * (w - 60), h - 2 - rng() * 10);
    if (inGroove(p)) continue;
    const stone = blob(p, 3 + rng() * 4, 2 + rng() * 3, rng, 0.2, 8);
    pen.fill(stone, mix('#cfc4ae', '#8f8676', rng()), 0.85);
    pen.hair(closed(stone), 0.45, d.ink, 0.55);
  }
  pen.stroke(edge, 1.1, d.ink, 0.7, false);
  // Grass poking in over the sill.
  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = rgba(GRASS, 0.85);
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  for (let k = 0; k < 420; k++) {
    const p = pt(BARN_WALL + rng() * (w - 2 * BARN_WALL), h + 2 - rng() * 8);
    if (inGroove(p)) continue;
    const a = -Math.PI / 2 + (rng() - 0.5) * 1.2;
    const l = 4 + rng() * 12;
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x + Math.cos(a) * l, p.y + Math.sin(a) * l);
  }
  ctx.stroke();
  ctx.restore();
}
