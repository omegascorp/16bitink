import { createRng, type Rng } from '../logic/rng';
import { blob, castShadow, type Edgeness, edgenessOf, edgeWash, groundWash, polar, wash } from './groundKit';
import { fits, type GroundKeep, type Room, roomOf, spotFor, type Taken } from './keep';
import { type Draw, pt, TAU } from './kit';
import { apple, basket, fallenLeaf, ladder, leafCluster, tuft, wildflower } from './orchardThings';
import { PAPER_FILL, STONE, STONE_DARK } from './palette';
import type { Pt } from './pen';
import { mix, rgba } from './wash';

/**
 * Chapter 4's page, "The Orchard": mown grass under old apple trees, pale
 * and striped where play happens, long grass and wildflowers at the edges,
 * the canopies of three trees overhanging from the corners with apples on
 * the bough, their dappled shade, windfalls and fallen leaves, a ladder and
 * a basket left on the grass. The grooves run in stone-edged channels. Big
 * things keep clear of `keep`. Board coordinates.
 */
const GRASS = '#b8cc8a';
const GRASS_DEEP = '#7c9f57';
const MEADOW = '#6e9450';
const DAPPLE = '#3f5f4a';
const CANOPY_SHADE = '#2c4430';
const BOUGH = '#4e3b2c';
const KERB = '#ddd3bd';
const FALL = ['#c9a447', '#b7773c', '#9fae55', '#d0b05a'] as const;
/** Kerb either side of the groove (TRACK_W = 40 in placesArt.ts), board units. */
const CHANNEL_W = 40 + 20;
/** How far a canopy cluster's leaves spill past its radius. */
const CLUSTER_SPILL = 16;
/** The trees: centre (off the board, at a corner) and canopy reach, as shares of the board and px. */
const TREES: readonly (readonly [number, number, number])[] = [
  [-0.05, -0.12, 280],
  [1.04, -0.08, 230],
  [1.06, 1.1, 300],
];

/** Mown grass: a pale green ground, the mower's broad stripes, and blades flecked in, thicker at the edges. */
function lawn(d: Draw, w: number, h: number, edge: Edgeness, rng: Rng): void {
  const { ctx } = d.pen;
  groundWash(d, w, h, GRASS, 0.42);
  edgeWash(d, w, h, GRASS_DEEP, 0.38);
  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.rotate(-0.12);
  ctx.fillStyle = rgba(PAPER_FILL, 0.13);
  for (let x = -w; x < w; x += 180) ctx.fillRect(x, -h, 90, h * 2);
  ctx.restore();
  // Blooms where the wash dried unevenly.
  for (let k = 0; k < 40; k++) {
    const p = pt(rng() * w, rng() * h);
    d.pen.fill(blob(p, 30 + rng() * 60, 18 + rng() * 30, rng, 0.25, 18, rng() * TAU), rng() < 0.6 ? GRASS_DEEP : PAPER_FILL, 0.05 + 0.06 * edge(p.x, p.y));
  }
  ctx.save();
  ctx.lineCap = 'round';
  for (const [colour, a] of [['#5f8a3f', 0.35], ['#8fb35a', 0.4], ['#3f6b3a', 0.25]] as const) {
    ctx.strokeStyle = rgba(colour, a);
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    for (let k = 0; k < 2600; k++) {
      const x = rng() * w;
      const y = rng() * h;
      const e = edge(x, y);
      if (rng() > 0.3 + 0.7 * e) continue;
      const l = 2.5 + 4 * e + rng() * 2;
      const a = -Math.PI / 2 + (rng() - 0.5) * 1.1;
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
    }
    ctx.stroke();
  }
  ctx.restore();
}

/** Dappled shade: clusters of soft shadow with sun-flecks in them, round the trees and here and there at the edges. */
function dapple(d: Draw, w: number, h: number, edge: Edgeness, rng: Rng): void {
  for (const [fx, fy, reach] of TREES) {
    const t = pt(fx * w, fy * h);
    for (let k = 0; k < 46; k++) {
      const p = polar(t, rng() * TAU, reach * (0.75 + rng() * 0.55));
      wash(d, blob(p, 14 + rng() * 26, 9 + rng() * 16, rng, 0.35, 16, rng() * TAU), DAPPLE, 0.07 + rng() * 0.05, 0.3);
    }
  }
  for (let k = 0; k < 30; k++) {
    const p = pt(rng() * w, rng() * h);
    if (rng() > edge(p.x, p.y)) continue;
    wash(d, blob(p, 10 + rng() * 18, 6 + rng() * 12, rng, 0.35, 14, rng() * TAU), DAPPLE, 0.06, 0.3);
  }
}

/** A polyline moved `off` to the left of travel. */
function offset(pts: readonly Pt[], off: number): Pt[] {
  return pts.map((p, i) => {
    const a = pts[Math.max(0, i - 1)]!;
    const b = pts[Math.min(pts.length - 1, i + 1)]!;
    const l = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    return pt(p.x - ((b.y - a.y) / l) * off, p.y + ((b.x - a.x) / l) * off);
  });
}

/** The stone channels the grooves run in: a band of setts either side, grass edging them, broken where channels meet. */
function channels(d: Draw, grooves: readonly (readonly Pt[])[], rng: Rng): void {
  const { pen } = d;
  const { ctx } = pen;
  const path = (g: readonly Pt[]): Path2D => {
    const p = new Path2D();
    g.forEach((q, i) => (i === 0 ? p.moveTo(q.x, q.y) : p.lineTo(q.x, q.y)));
    return p;
  };
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const g of grooves) {
    ctx.lineWidth = CHANNEL_W + 3;
    ctx.strokeStyle = rgba(STONE_DARK, 0.25);
    ctx.stroke(path(g));
    ctx.lineWidth = CHANNEL_W;
    ctx.strokeStyle = rgba(mix(KERB, PAPER_FILL, 0.2), 0.95);
    ctx.stroke(path(g));
  }
  // Dashes across the band are the setts and their joints (butt ends, or they'd round into a smear).
  ctx.lineCap = 'butt';
  for (const g of grooves) {
    ctx.lineWidth = CHANNEL_W;
    ctx.setLineDash([11, 13]);
    ctx.strokeStyle = rgba(STONE, 0.35);
    ctx.stroke(path(g));
    ctx.setLineDash([1.6, 10.4]);
    ctx.strokeStyle = rgba(STONE_DARK, 0.6);
    ctx.stroke(path(g));
  }
  ctx.restore();
  // Grass edging, kept off any other channel.
  const all = grooves.flat();
  const clear = (q: Pt): boolean => all.every((p) => Math.abs(p.x - q.x) > CHANNEL_W / 2 - 1 || Math.abs(p.y - q.y) > CHANNEL_W / 2 - 1 || Math.hypot(p.x - q.x, p.y - q.y) > CHANNEL_W / 2 - 1);
  for (const g of grooves) {
    for (const side of [1, -1]) {
      const line = offset(g, (side * CHANNEL_W) / 2);
      let run: Pt[] = [];
      const flush = (): void => {
        if (run.length > 2) pen.stroke(run, 0.8, d.ink, 0.55, false);
        run = [];
      };
      line.forEach((q, i) => {
        if (i % 2 === 1 && !clear(q)) flush();
        else {
          run.push(q);
          if (run.length > 30) {
            const last = q;
            flush();
            run.push(last);
          }
        }
        // Blades of grass leaning over the kerb.
        if (i % 9 === 0 && rng() < 0.6 && clear(q)) {
          const a = Math.atan2(g[i]!.y - q.y, g[i]!.x - q.x) + (rng() - 0.5) * 1.2;
          pen.hair([q, polar(q, a, 3 + rng() * 4)], 0.8, MEADOW, 0.8);
        }
      });
      flush();
    }
  }
}

/** Long grass and wildflowers at the edges, kept out of the channels. */
function meadow(d: Draw, w: number, h: number, edge: Edgeness, room: Room, rng: Rng): void {
  for (let k = 0; k < 90; k++) {
    const p = pt(rng() * w, rng() * h);
    if (edge(p.x, p.y) < 0.55 || room(p.x, p.y) < -6) continue;
    wash(d, blob(p, 20 + rng() * 30, 12 + rng() * 18, rng, 0.3, 16, rng() * TAU), MEADOW, 0.12, 0.3);
  }
  for (let k = 0; k < 420; k++) {
    const p = pt(rng() * w, rng() * h);
    const e = edge(p.x, p.y);
    if (rng() > e * e || room(p.x, p.y) < 4) continue;
    const lean = Math.atan2(p.y - h / 2, p.x - w / 2) + (rng() - 0.5) * 1.4;
    tuft(d, p, lean, 10 + 12 * e, rng);
  }
  for (let k = 0; k < 260; k++) {
    const p = pt(rng() * w, rng() * h);
    if (rng() > edge(p.x, p.y) ** 2 || room(p.x, p.y) < -6) continue;
    wildflower(d, p, rng);
  }
}

/** Whether a spot lies under one of the canopies. */
function underTrees(p: Pt, w: number, h: number, extra: number): boolean {
  return TREES.some(([fx, fy, reach]) => Math.hypot(p.x - fx * w, p.y - fy * h) < reach + extra);
}

/** Windfalls and fallen leaves under the trees, a ladder and a basket left on the grass. */
function leftOnGrass(d: Draw, w: number, h: number, room: Room, rng: Rng): void {
  const taken: Taken[] = [];
  for (const [fx, fy, reach] of TREES) {
    const t = pt(fx * w, fy * h);
    for (let k = 0; k < 12; k++) {
      const p = polar(t, rng() * TAU, reach * (0.5 + rng() * 0.75));
      if (p.x < 8 || p.y < 8 || p.x > w - 8 || p.y > h - 8 || room(p.x, p.y) < 10) continue;
      if (rng() < 0.45) apple(d, p, 8 + rng() * 2.5, rng);
      else fallenLeaf(d, p, 16 + rng() * 8, rng() * TAU, FALL[Math.floor(rng() * FALL.length)]!);
    }
  }
  // The ladder: try lying it along an edge clear of the channels and the trees.
  for (let k = 0; k < 60; k++) {
    const a = pt(40 + rng() * (w - 80), 40 + rng() * (h - 80));
    const ang = rng() * TAU;
    const len = 190 + rng() * 40;
    const b = polar(a, ang, len);
    const foot = Array.from({ length: 12 }, (_, i) => polar(polar(a, ang, (len * i) / 11), ang + Math.PI / 2, (i % 2 ? 1 : -1) * 26));
    const mid = polar(a, ang, len / 2);
    if (b.x < 10 || b.y < 10 || b.x > w - 10 || b.y > h - 10) continue;
    if (!fits(room, foot) || underTrees(mid, w, h, 40) || Math.hypot(mid.x - w / 2, mid.y - h / 2) < 300) continue;
    ladder(d, a, b, 46, rng);
    taken.push({ x: mid.x, y: mid.y, r: len / 2 });
    break;
  }
  for (let k = 0; k < 2; k++) {
    const p = spotFor(rng, room, [40, 40, w - 40, h - 40], 44, taken, 20, 80);
    if (!p || Math.hypot(p.x - w / 2, p.y - h / 2) < 280) continue;
    basket(d, p, 36, rng);
    taken.push({ x: p.x, y: p.y, r: 44 });
    break;
  }
}

/** A tree's canopy overhanging from a corner: clusters kept clear of the grooves and pads, their shadow, a few apples. */
function canopy(d: Draw, t: Pt, reach: number, w: number, h: number, room: Room, rng: Rng): void {
  const clusters: [Pt, number][] = [];
  for (let k = 0; k < 260; k++) {
    const dist = Math.sqrt(rng()) * reach;
    const p = polar(t, rng() * TAU, dist);
    const r = 44 - 18 * (dist / reach) + rng() * 10;
    if (p.x < -r || p.y < -r || p.x > w + r || p.y > h + r) continue;
    if (room(p.x, p.y) < r + CLUSTER_SPILL || clusters.some(([q, s]) => Math.hypot(q.x - p.x, q.y - p.y) < (r + s) * 0.45)) continue;
    clusters.push([p, r]);
  }
  for (const [p, r] of clusters) castShadow(d, blob(p, r * 1.05, r, rng, 0.2, 18), 34, 0.1, DAPPLE);
  // The deep shade inside the crown, between the clusters, and the boughs glimpsed through it.
  for (const [p, r] of clusters) {
    const k = Math.min(r * 1.3, room(p.x, p.y));
    d.pen.fill(blob(p, k, k * 0.92, rng, 0.2, 16), CANOPY_SHADE, 0.8);
  }
  for (const [p] of clusters.filter(() => rng() < 0.3)) {
    d.pen.stroke([t, polar(t, Math.atan2(p.y - t.y, p.x - t.x) + 0.06, Math.hypot(p.x - t.x, p.y - t.y) * 0.6), p], 5, BOUGH, 0.8, false);
  }
  clusters.sort((a, b) => Math.hypot(b[0].x - t.x, b[0].y - t.y) - Math.hypot(a[0].x - t.x, a[0].y - t.y));
  for (const [p, r] of clusters) leafCluster(d, p, r, rng);
  clusters.filter(() => rng() < 0.22).forEach(([p, r]) => apple(d, polar(p, rng() * TAU, r * 0.4), 9 + rng() * 2.5, rng));
}

/** The orchard page: see the module comment. */
export function paintOrchard(d: Draw, w: number, h: number, keep: GroundKeep): void {
  const rng = createRng(4410);
  const edge = edgenessOf(w, h, 0.42);
  const room = roomOf(keep, w, h);
  lawn(d, w, h, edge, rng);
  dapple(d, w, h, edge, rng);
  channels(d, keep.grooves, rng);
  meadow(d, w, h, edge, room, rng);
  leftOnGrass(d, w, h, room, rng);
  for (const [fx, fy, reach] of TREES) canopy(d, pt(fx * w, fy * h), reach, w, h, room, rng);
}
