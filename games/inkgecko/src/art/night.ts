import { createRng, type Rng } from '../logic/rng';
import { blob, edgeWash, groundWash, wash } from './groundKit';
import { fits, type GroundKeep, type Room, roomOf, spotFor, type Taken } from './keep';
import { type Draw, normals, pt, TAU } from './kit';
import { NIGHT_BLOOM_SIZE, type NightBloom, nightBloom } from './nightFlora';
import { BOX, BOX_DEEP, BOX_LIT, type Clump, clumps, GRAVEL, GRAVEL_DEEP, GRAVEL_LIT, type GrooveDist, grooveDist, LAWN, LAWN_DEEP, LAWN_LIT, MOON, NIGHT_SKY } from './nightKit';
import { boxBall, dewGlints, groundLantern, moonDial, reflectingPool, urn } from './nightThings';
import type { Pt } from './pen';
import { rgba } from './wash';

/**
 * Chapter 10's page, "The Night Garden": the estate's formal garden at the
 * top of the climb under a full moon, from above. A dew-wet lawn mown in
 * moonlit stripes; pale gravel walks the grooves run along, edged with
 * clipped box and lit here and there by little lanterns; a round reflecting
 * pool with the moon in it at a corner, a moon-dial, stone urns, box balls,
 * and white flowers that glow in the dark: moonflowers, night-scented stock,
 * evening primroses, white roses. Moderately dark (the game lays its own
 * darkness over it), lit from the upper left. Big things keep clear of
 * `keep`. Board coordinates.
 */
/** Half the gravel walk either side of a groove's centre line (the groove is 40 wide). */
export const WALK_HALF = 33;
/** The box edging's clump radius, and how far apart lanterns stand along a walk. */
const EDGE_R = 7.4;
const LANTERN_EVERY = 420;
const POOL_RADII = [150, 128, 108, 92];

/** The lawn: a cool wash mown in broad diagonal stripes, mottled, flecked with blades and beaded with dew. */
function lawn(d: Draw, w: number, h: number, rng: Rng): void {
  const { ctx } = d.pen;
  groundWash(d, w, h, LAWN, 0.9);
  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.rotate(-0.62);
  ctx.fillStyle = rgba(LAWN_LIT, 0.1);
  for (let x = -w; x < w; x += 104) ctx.fillRect(x, -w, 52, w * 2);
  ctx.restore();
  for (let k = 0; k < 90; k++) {
    const p = pt(rng() * w, rng() * h);
    const tone = rng();
    wash(d, blob(p, 40 + rng() * 90, 25 + rng() * 50, rng, 0.3, 44, rng() * TAU), tone < 0.5 ? LAWN_DEEP : tone < 0.8 ? LAWN_LIT : '#4d6a5c', 0.06 + rng() * 0.1, 0.25);
  }
  ctx.save();
  ctx.lineCap = 'round';
  for (const [colour, alpha, width] of [[LAWN_DEEP, 0.45, 0.8], [LAWN_LIT, 0.3, 0.6], ['#a8bfc4', 0.18, 0.5]] as const) {
    ctx.strokeStyle = rgba(colour, alpha);
    ctx.lineWidth = width;
    ctx.beginPath();
    for (let k = 0; k < 3400; k++) {
      const x = rng() * w;
      const y = rng() * h;
      const l = 1.5 + rng() * 3;
      const a = -Math.PI / 2 + (rng() - 0.5) * 1.8;
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
    }
    ctx.stroke();
  }
  ctx.fillStyle = rgba(MOON, 0.3);
  ctx.beginPath();
  for (let k = 0; k < 2600; k++) {
    const x = rng() * w;
    const y = rng() * h;
    const r = 0.3 + rng() * 0.45;
    ctx.moveTo(x + r, y);
    ctx.arc(x, y, r, 0, TAU);
  }
  ctx.fill();
  ctx.restore();
}

/** Strokes every groove's centre line, `width` wide. */
function strokeGrooves(ctx: CanvasRenderingContext2D, grooves: readonly (readonly Pt[])[], width: number, colour: string): void {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = width;
  ctx.strokeStyle = colour;
  ctx.beginPath();
  for (const g of grooves) g.forEach((q, i) => (i === 0 ? ctx.moveTo(q.x, q.y) : ctx.lineTo(q.x, q.y)));
  ctx.stroke();
  ctx.restore();
}

/** The gravel walks the grooves run along: pale pea gravel, a dark lawn margin, speckled. */
function walks(d: Draw, grooves: readonly (readonly Pt[])[], rng: Rng): void {
  const { ctx } = d.pen;
  strokeGrooves(ctx, grooves, WALK_HALF * 2 + 3, rgba(LAWN_DEEP, 0.7));
  strokeGrooves(ctx, grooves, WALK_HALF * 2, GRAVEL);
  strokeGrooves(ctx, grooves, WALK_HALF * 1.1, rgba(GRAVEL_LIT, 0.12));
  // Grains as tiny dabs (short strokes are far cheaper than many little discs), and a few pebbles.
  ctx.save();
  ctx.lineCap = 'round';
  for (const [colour, alpha, width, per] of [[GRAVEL_DEEP, 0.6, 1.2, 4], [GRAVEL_LIT, 0.65, 1, 4], ['#6e778a', 0.5, 2.4, 0.5]] as const) {
    ctx.strokeStyle = rgba(colour, alpha);
    ctx.lineWidth = width;
    ctx.beginPath();
    for (const g of grooves) {
      for (let i = 0; i < g.length; i++) {
        for (let k = 0; k < per; k++) {
          if (per < 1 && rng() > per) continue;
          const a = rng() * TAU;
          const r = Math.sqrt(rng()) * (WALK_HALF - 1.5);
          const x = g[i]!.x + Math.cos(a) * r;
          const y = g[i]!.y + Math.sin(a) * r;
          const l = 0.2 + rng() * 0.5;
          ctx.moveTo(x, y);
          ctx.lineTo(x + l, y + l * 0.4);
        }
      }
    }
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * The clipped box along both sides of every walk, broken where another walk
 * comes near, by the gecko's stones, and here and there for a lantern;
 * returns where the lanterns go.
 */
function edging(d: Draw, keep: GroundKeep, dist: GrooveDist, w: number, h: number, rng: Rng): Pt[] {
  const cs: Clump[] = [];
  const lamps: Pt[] = [];
  const clear = (c: Pt, r: number): boolean =>
    c.x > -20 && c.y > -20 && c.x < w + 20 && c.y < h + 20 && dist(c) >= WALK_HALF + r - 1.2 && keep.pads.every((p) => Math.hypot(p.x - c.x, p.y - c.y) > 58 + r + 10);
  keep.grooves.forEach((g, gi) => {
    const nrm = normals(g);
    for (const s of [1, -1]) {
      let run = gi * 97 + (s > 0 ? 0 : LANTERN_EVERY / 2) + 120;
      for (let i = 0; i < g.length; i += 2) {
        run += Math.hypot(g[i]!.x - g[Math.max(0, i - 2)]!.x, g[i]!.y - g[Math.max(0, i - 2)]!.y);
        const r = EDGE_R + Math.sin(i * 0.37 + s) * 0.6 + (rng() - 0.5) * 0.8;
        const c = pt(g[i]!.x + nrm[i]!.x * s * (WALK_HALF + r - 0.5), g[i]!.y + nrm[i]!.y * s * (WALK_HALF + r - 0.5));
        if (!clear(c, r)) continue;
        if (run % LANTERN_EVERY < 16) {
          const lamp = pt(g[i]!.x + nrm[i]!.x * s * (WALK_HALF + 8), g[i]!.y + nrm[i]!.y * s * (WALK_HALF + 8));
          if (run % LANTERN_EVERY < 4 && c.x > 20 && c.y > 20 && c.x < w - 20 && c.y < h - 20) lamps.push(lamp);
          continue;
        }
        cs.push({ x: c.x, y: c.y, r });
      }
    }
  });
  clumps(d, cs, { lift: 6, deep: BOX_DEEP, mid: BOX, lit: BOX_LIT, ticks: 5 }, rng);
  return lamps;
}

/** The pool at a corner, hanging off the board, as big as the layout allows. */
function poolSpot(w: number, h: number, room: Room, rng: Rng): { c: Pt; r: number; inward: Pt } | null {
  const corners = [pt(w, 0), pt(0, 0), pt(w, h), pt(0, h)];
  const start = Math.floor(rng() * 4);
  for (const r of POOL_RADII) {
    for (let k = 0; k < 4; k++) {
      const corner = corners[(start + k) % 4]!;
      const inward = pt(corner.x === 0 ? 1 : -1, corner.y === 0 ? 1 : -1);
      const c = pt(corner.x + inward.x * r * 0.32, corner.y + inward.y * r * 0.3);
      const foot = Array.from({ length: 28 }, (_, i) => pt(c.x + Math.cos((i / 28) * TAU) * (r + 16), c.y + Math.sin((i / 28) * TAU) * (r + 16)))
        .filter((p) => p.x > -10 && p.y > -10 && p.x < w + 10 && p.y < h + 10)
        .concat([c]);
      if (fits(room, foot, 0)) return { c, r, inward };
    }
  }
  return null;
}

/** The pool, the moon-dial, urns, box balls and lone lanterns, wherever the layout leaves room. */
function things(d: Draw, w: number, h: number, room: Room, taken: Taken[], rng: Rng): void {
  const pool = poolSpot(w, h, room, rng);
  if (pool) {
    const l = Math.SQRT2;
    const moonAt = pt(pool.c.x + (pool.inward.x / l) * pool.r * 0.42, pool.c.y + (pool.inward.y / l) * pool.r * 0.42);
    reflectingPool(d, pool.c, pool.r, moonAt, rng);
    taken.push({ x: pool.c.x, y: pool.c.y, r: pool.r + 16 });
  }
  const dial = spotFor(rng, room, [90, 90, w - 90, h - 90], 34, taken, 30, 80);
  if (dial) {
    moonDial(d, dial, rng);
    taken.push({ x: dial.x, y: dial.y, r: 34 });
  }
  for (let k = 0, made = 0; k < 6 && made < 3; k++) {
    const p = spotFor(rng, room, [40, 40, w - 40, h - 40], 26, taken, 60, 40);
    if (!p) continue;
    urn(d, p, 14 + rng() * 3, rng);
    taken.push({ x: p.x, y: p.y, r: 26 });
    made++;
  }
  for (let k = 0, made = 0; k < 14 && made < 6; k++) {
    const r = 11 + rng() * 7;
    const p = spotFor(rng, room, [30, 30, w - 30, h - 30], r + 6, taken, 26, 30);
    if (!p) continue;
    boxBall(d, p, r, rng);
    taken.push({ x: p.x, y: p.y, r: r + 4 });
    made++;
  }
}

const BLOOM_WEIGHTS: readonly (readonly [NightBloom, number])[] = [['moonflower', 3], ['stock', 3], ['primrose', 2], ['rose', 2]];

function pickBloom(rng: Rng): NightBloom {
  let r = rng() * 10;
  for (const [kind, wt] of BLOOM_WEIGHTS) if ((r -= wt) < 0) return kind;
  return 'stock';
}

/**
 * White flowers: knots of low leafy plants along the outside of the box
 * edging and drifts of them out in the lawn, each plant a mound of leaves
 * with a flower or two open on it.
 */
function flowers(d: Draw, w: number, h: number, keep: GroundKeep, dist: GrooveDist, taken: readonly Taken[], rng: Rng): void {
  const leaves: Clump[] = [];
  const blooms: [Pt, NightBloom, number][] = [];
  const plant = (p: Pt, kind: NightBloom): void => {
    const r = 5 + rng() * 3.5;
    const ok =
      p.x > -5 && p.y > -5 && p.x < w + 5 && p.y < h + 5 &&
      dist(p) >= WALK_HALF + EDGE_R * 2 + r + 2 &&
      keep.pads.every((q) => Math.hypot(q.x - p.x, q.y - p.y) > 58 + 18 + r) &&
      taken.every((t) => Math.hypot(t.x - p.x, t.y - p.y) > t.r + r + 3) &&
      leaves.every((q) => Math.hypot(q.x - p.x, q.y - p.y) > (q.r + r) * 0.6);
    if (!ok) return;
    leaves.push({ x: p.x, y: p.y, r });
    if (rng() < 0.25) return;
    const s = Math.min(r * 1.15, NIGHT_BLOOM_SIZE[kind] * (0.75 + rng() * 0.35));
    const f = pt(p.x + (rng() - 0.5) * r * 0.6, p.y + (rng() - 0.5) * r * 0.6);
    if (blooms.every(([q, , qs]) => Math.hypot(q.x - f.x, q.y - f.y) > (qs + s) * 0.8)) blooms.push([f, kind, s]);
  };
  const drift = (c: Pt, spread: number, n: number, kind: NightBloom, turn: number): void => {
    for (let j = 0; j < n; j++) {
      const a = rng() * TAU;
      const r = spread * Math.sqrt(rng());
      const x = Math.cos(a) * r * 1.4;
      const y = Math.sin(a) * r * 0.8;
      plant(pt(c.x + x * Math.cos(turn) - y * Math.sin(turn), c.y + x * Math.sin(turn) + y * Math.cos(turn)), kind);
    }
  };
  for (const g of keep.grooves) {
    const nrm = normals(g);
    for (let i = 0; i < g.length; i += 6) {
      if (rng() < 0.5) continue;
      const s = rng() < 0.5 ? 1 : -1;
      const off = WALK_HALF + EDGE_R * 2 + 12 + rng() * 8;
      drift(pt(g[i]!.x + nrm[i]!.x * s * off, g[i]!.y + nrm[i]!.y * s * off), 10 + rng() * 6, 4 + Math.floor(rng() * 4), pickBloom(rng), Math.atan2(nrm[i]!.x, -nrm[i]!.y));
    }
  }
  for (let k = 0; k < 60; k++) {
    const c = pt(rng() * w, rng() * h);
    if (dist(c) < 75) continue;
    drift(c, 16 + rng() * 22, 8 + Math.floor(rng() * 12), pickBloom(rng), rng() * TAU);
  }
  clumps(d, leaves, { lift: 3, deep: '#13201b', mid: '#2b4537', lit: '#7a9a8a', ticks: 4 }, rng);
  blooms.sort((a, b) => a[0].y - b[0].y);
  for (const [p, kind, s] of blooms) nightBloom(d, kind, p, s, rng);
}

/** Moonlight from the upper left over everything, the edges falling into the night. */
function moonlight(d: Draw, w: number, h: number): void {
  const { ctx } = d.pen;
  const g = ctx.createRadialGradient(-w * 0.1, -h * 0.25, 0, -w * 0.1, -h * 0.25, w * 1.25);
  g.addColorStop(0, rgba('#dfe8ff', 0.2));
  g.addColorStop(0.55, rgba('#dfe8ff', 0.05));
  g.addColorStop(1, rgba(NIGHT_SKY, 0.18));
  ctx.save();
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
  edgeWash(d, w, h, NIGHT_SKY, 0.42, 230);
}

/** The night garden page: see the module comment. */
export function paintNight(d: Draw, w: number, h: number, keep: GroundKeep): void {
  const rng = createRng(9150);
  const room = roomOf(keep, w, h);
  const dist = grooveDist(keep.grooves, 96);
  lawn(d, w, h, rng);
  walks(d, keep.grooves, rng);
  const lamps = edging(d, keep, dist, w, h, rng);
  const taken: Taken[] = lamps.map((p) => ({ x: p.x, y: p.y, r: 12 }));
  things(d, w, h, room, taken, rng);
  flowers(d, w, h, keep, dist, taken, rng);
  const glints: Pt[] = [];
  for (let k = 0; k < 400 && glints.length < 70; k++) {
    const p = pt(rng() * w, rng() * h);
    if (dist(p) > 50 && taken.every((t) => Math.hypot(t.x - p.x, t.y - p.y) > t.r)) glints.push(p);
  }
  dewGlints(d.pen.ctx, glints);
  moonlight(d, w, h);
  // Lanterns last, so their warm light isn't dimmed by the night.
  for (const p of lamps) groundLantern(d, p, 0.42);
}
