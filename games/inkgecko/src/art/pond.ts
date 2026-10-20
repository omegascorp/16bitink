import { createRng, type Rng } from '../logic/rng';
import { bezier, closed, type Draw, normals, oval, pt, shade } from './kit';
import { LEAF, MOSS, PAPER, PAPER_FILL, STONE, STONE_DARK } from './palette';
import type { Pt } from './pen';
import { goldfish, kingcups, lilyPad, reeds, ripple, steppingStone, WATER_DEEP, waterLily } from './pondLife';
import { type PondKeep, pondReach, shoreline } from './pondShore';
import { mix } from './wash';

export { KEEP_NOTHING, type PondKeep, pondReach } from './pondShore';

/**
 * Chapter 2's page, "The Pond": a terrace of big flat flagstones, laid
 * crazy-paving fashion and damp with moss, runs right across the play area;
 * the pond laps round it, in bays at the corners and a strip down the
 * sides, behind a ring of heavy coping stones. Lily pads, reeds, kingcups,
 * stepping stones and a goldfish gather in the water at the edges, so the
 * middle stays pale and quiet. Board coordinates.
 */
const JOINT = '#a6a787';
const WARM_STONE = '#cdc3a8';
const COOL_STONE = '#bcc2b6';
const DAMP = '#7f978d';
const SHALLOW = '#c4dad2';
/** Joint width between flagstones. */
const GAP = 1.7;
/** Flagstone grid pitch. */
const FLAG = 116;

const smooth01 = (a: number, b: number, t: number): number => {
  const c = Math.max(0, Math.min(1, (t - a) / (b - a)));
  return c * c * (3 - 2 * c);
};

/** The water: shallow and pale by the coping, deepening out into the bays, with blooms, hatching and reflections. */
function paintWater(d: Draw, w: number, h: number, edge: readonly Pt[], reach: (x: number, y: number) => number, rng: Rng): void {
  const { pen } = d;
  const { ctx } = pen;
  ctx.save();
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, w, h);
  ctx.globalAlpha = 0.75;
  ctx.fillStyle = WATER_DEEP;
  ctx.fillRect(0, 0, w, h);
  // Shallower towards the terrace: wide soft bands along its edge.
  ctx.lineJoin = 'round';
  ctx.strokeStyle = SHALLOW;
  const path = new Path2D();
  edge.forEach((p, i) => (i === 0 ? path.moveTo(p.x, p.y) : path.lineTo(p.x, p.y)));
  path.closePath();
  for (const [lw, a] of [[300, 0.35], [190, 0.35], [110, 0.4], [50, 0.45]] as const) {
    ctx.globalAlpha = a;
    ctx.lineWidth = lw;
    ctx.stroke(path);
  }
  ctx.restore();
  // Blooms of pigment and paler sky, as a wet wash dries.
  for (let i = 0; i < 70; i++) {
    const x = rng() * w;
    const y = rng() * h;
    if (reach(x, y) < 1) continue;
    const deep = rng() < 0.5;
    pen.fill(oval(x, y, 18 + rng() * 40, 8 + rng() * 16, 16), deep ? WATER_DEEP : '#e6efe9', deep ? 0.1 : 0.16);
  }
  // Pen hatching in the deep water of the bays.
  for (const [cx, cy, rx, ry] of [[w, h, 300, 150], [0, 0, 240, 120], [w, 0, 190, 90], [0, h, 170, 90]] as const) {
    pen.hatch(oval(cx, cy, rx, ry, 30), 4.6, -0.12, 0.5, { color: d.ink, alpha: 0.2 });
  }
  // Sky reflected in streaks.
  for (let i = 0; i < 120; i++) {
    const x = rng() * w;
    const y = rng() * h;
    if (reach(x, y) < 1.04) continue;
    const l = 10 + rng() * 26;
    pen.hair([pt(x, y), pt(x + l * 0.5, y + (rng() - 0.5) * 1.5), pt(x + l, y + (rng() - 0.5) * 2)], 0.7 + rng() * 0.5, PAPER_FILL, 0.35 + rng() * 0.3);
  }
}

interface Flag {
  readonly shape: Pt[];
  readonly sides: Pt[][];
  readonly c: Pt;
}

/** One flagstone from a polygon: inset by the joint, corners worn, edges a little irregular. */
function flagOf(poly: readonly Pt[], rng: Rng): Flag {
  const c = pt(poly.reduce((s, p) => s + p.x, 0) / poly.length, poly.reduce((s, p) => s + p.y, 0) / poly.length);
  const inset = poly.map((p) => {
    const l = Math.hypot(p.x - c.x, p.y - c.y) || 1;
    return pt(c.x + ((p.x - c.x) * (l - GAP * 1.5)) / l, c.y + ((p.y - c.y) * (l - GAP * 1.5)) / l);
  });
  const n = inset.length;
  const sides = inset.map((a, i) => {
    const b = inset[(i + 1) % n]!;
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const k = Math.min(4.5, len / 3);
    const steps = Math.max(2, Math.ceil(len / 16));
    return Array.from({ length: steps + 1 }, (_, s) => {
      const t = k / len + ((1 - (2 * k) / len) * s) / steps;
      const wob = s === 0 || s === steps ? 0 : (rng() - 0.5) * 1.6;
      return pt(a.x + (b.x - a.x) * t - ((b.y - a.y) / len) * wob, a.y + (b.y - a.y) * t + ((b.x - a.x) / len) * wob);
    });
  });
  return { shape: sides.flat(), sides, c };
}

/** The terrace's flagstones: a jittered, staggered grid, some cells split, so the paving looks laid by hand. */
function layFlags(rng: Rng, w: number, h: number): Flag[] {
  const rows = Math.ceil(h / (FLAG * 0.86)) + 3;
  const cols = Math.ceil(w / FLAG) + 3;
  const v = Array.from({ length: rows }, (_, j) =>
    Array.from({ length: cols }, (_, i) => pt((i - 1) * FLAG + (j % 2) * FLAG * 0.5 + (rng() - 0.5) * FLAG * 0.4, (j - 1) * FLAG * 0.86 + (rng() - 0.5) * FLAG * 0.34)),
  );
  const out: Flag[] = [];
  const mid = (a: Pt, b: Pt): Pt => {
    const t = 0.38 + rng() * 0.24;
    return pt(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t);
  };
  for (let j = 0; j + 1 < rows; j++) {
    for (let i = 0; i + 1 < cols; i++) {
      const [a, b, c, e] = [v[j]![i]!, v[j]![i + 1]!, v[j + 1]![i + 1]!, v[j + 1]![i]!];
      if (rng() < 0.4) {
        if (Math.hypot(b.x - a.x, b.y - a.y) > Math.hypot(e.x - a.x, e.y - a.y)) {
          const [m0, m1] = [mid(a, b), mid(e, c)];
          out.push(flagOf([a, m0, m1, e], rng), flagOf([m0, b, c, m1], rng));
        } else {
          const [m0, m1] = [mid(a, e), mid(b, c)];
          out.push(flagOf([a, b, m1, m0], rng), flagOf([m0, m1, c, e], rng));
        }
      } else out.push(flagOf([a, b, c, e], rng));
    }
  }
  return out;
}

/** One flagstone: a pale wash, weathering, damp and moss nearer the water, a worn shadowed edge, a broken outline. */
function paintFlag(d: Draw, f: Flag, rng: Rng, e: number): void {
  const { pen } = d;
  pen.fill(f.shape, PAPER_FILL, 0.92);
  pen.fill(f.shape, mix(rng() < 0.5 ? WARM_STONE : COOL_STONE, STONE, rng()), 0.15 + 0.12 * e + rng() * 0.06);
  pen.clipped(f.shape, () => {
    for (let i = 0; i < 4; i++) {
      pen.fill(oval(f.c.x + (rng() - 0.5) * 100, f.c.y + (rng() - 0.5) * 80, 14 + rng() * 24, 9 + rng() * 14, 16), rng() < e ? DAMP : STONE_DARK, 0.03 + 0.07 * e);
    }
    if (e > 0.25) pen.stipple(f.shape, Math.round(160 * e), () => e * 0.5, 1.1, rng() < 0.5 ? MOSS : LEAF);
    if (rng() < 0.2 + 0.4 * e) {
      const x = f.c.x + (rng() - 0.5) * 70;
      const y = f.c.y + (rng() - 0.5) * 50;
      const r = 3 + rng() * 5;
      pen.fill(oval(x, y, r, r * 0.8, 14), '#c4c98c', 0.35);
      pen.hair(closed(oval(x, y, r, r * 0.8, 14)), 0.4, d.ink, 0.15 + 0.15 * e);
    }
  });
  pen.crescent(f.shape, pt(-3, -4.4), () => pen.fill(f.shape, STONE_DARK, 0.13 + 0.1 * e));
  if (e > 0.35) pen.crescent(f.shape, pt(-7, -10), () => pen.hatch(f.shape, 4.2, 0.9, 0.45, { color: d.ink, alpha: 0.1 + 0.18 * e }));
  for (const side of f.sides) if (rng() < 0.8) pen.stroke(side, 0.75 + 0.35 * e, d.ink, 0.17 + 0.4 * e, false);
  if (rng() < 0.25 + 0.3 * e) {
    const x = f.c.x + (rng() - 0.5) * 70;
    const y = f.c.y + (rng() - 0.5) * 40;
    pen.hair([pt(x, y), pt(x + 9 + rng() * 10, y + (rng() - 0.5) * 12), pt(x + 18 + rng() * 14, y + (rng() - 0.5) * 18)], 0.45, d.ink, 0.2 + 0.25 * e);
  }
}

/** Moss cushions in the joints, thicker towards the water. */
function mossJoints(d: Draw, flags: readonly Flag[], rng: Rng, edgeness: (p: Pt) => number): void {
  const { pen } = d;
  for (const f of flags) {
    for (const side of f.sides) {
      for (let i = 0; i + 1 < side.length; i++) {
        const p = side[i]!;
        const q = side[i + 1]!;
        const e = edgeness(p);
        const n = Math.round((Math.hypot(q.x - p.x, q.y - p.y) / 7) * (0.2 + 1.1 * e));
        for (let k = 0; k < n; k++) {
          const t = rng();
          const r = 1.4 + rng() * 2.6 * (0.5 + e);
          pen.fill(oval(p.x + (q.x - p.x) * t + (rng() - 0.5) * 4, p.y + (q.y - p.y) * t + (rng() - 0.5) * 4, r, r * 0.8, 8), rng() < 0.3 ? LEAF : MOSS, 0.24 + 0.4 * e);
        }
      }
    }
  }
}

/** The heavy coping round the terrace: long rounded stones overhanging the water, shadow beneath, moss on their lips. */
function coping(d: Draw, edge: readonly Pt[], w: number, h: number, rng: Rng): void {
  const { pen } = d;
  const nrm = normals(closed(edge)).slice(0, edge.length);
  const out = Math.sign(nrm[0]!.x * (edge[0]!.x - w / 2) + nrm[0]!.y * (edge[0]!.y - h / 2)) || 1;
  const onBoard = (p: Pt): boolean => p.x > -30 && p.x < w + 30 && p.y > -30 && p.y < h + 30;
  for (let i = 0; i < edge.length; ) {
    const len = 10 + Math.floor(rng() * 7);
    const idx = Array.from({ length: len + 1 }, (_, k) => (i + k) % edge.length);
    i += len + 1;
    if (!idx.some((k) => onBoard(edge[k]!))) continue;
    const outer = 7 + rng() * 4;
    const inner = 19 + rng() * 8; // at most COPING_DEPTH in pondShore.ts
    const round = (k: number): number => Math.sqrt(Math.min(1, (k + 0.8) / 1.8, (len - k + 0.8) / 1.8));
    const side = (depth: number): Pt[] =>
      idx.map((k, j) => {
        const p = edge[k]!;
        const n = nrm[k]!;
        const r = depth * round(j);
        return pt(p.x + n.x * out * r, p.y + n.y * out * r);
      });
    const shape = [...side(outer), ...side(-inner).reverse()];
    const mid = edge[idx[len >> 1]!]!;
    pen.fill(shape.map((p) => pt(p.x + 4, p.y + 6)), WATER_DEEP, 0.35);
    pen.fill(shape, PAPER_FILL, 1);
    pen.fill(shape, mix(STONE, '#a9b1a4', rng()), 0.6);
    pen.clipped(shape, () => {
      for (let k = 0; k < 3; k++) pen.fill(oval(mid.x + (rng() - 0.5) * 40, mid.y + (rng() - 0.5) * 16, 5 + rng() * 8, 3 + rng() * 5, 12), STONE_DARK, 0.14);
      pen.stipple(shape, 60, () => 0.6, 0.45, STONE_DARK);
      // Moss along the lip over the water.
      for (const p of side(outer - 3)) {
        if (rng() < 0.45) pen.fill(oval(p.x + (rng() - 0.5) * 6, p.y + (rng() - 0.5) * 6, 2 + rng() * 3, 1.6 + rng() * 2.4, 8), rng() < 0.4 ? LEAF : MOSS, 0.6);
      }
    });
    pen.crescent(shape, pt(-2.6, -3.8), () => pen.fill(shape, STONE_DARK, 0.35));
    shade(d, shape, 0.28);
    pen.stroke(closed(shape), 1, d.ink, 0.8);
  }
}

/** A random spot in a box that lies between reach lo and hi, or null after a few tries. */
function spot(rng: Rng, x0: number, y0: number, x1: number, y1: number, reach: (x: number, y: number) => number, lo: number, hi: number): Pt | null {
  for (let k = 0; k < 40; k++) {
    const p = pt(x0 + rng() * (x1 - x0), y0 + rng() * (y1 - y0));
    const r = reach(p.x, p.y);
    if (r >= lo && r <= hi) return p;
  }
  return null;
}

/**
 * The pond page: see the module comment. The shoreline gives way round
 * `keep` (the level's grooves and pads) so water and coping stay clear of them.
 */
export function paintPond(d: Draw, w: number, h: number, keep: PondKeep): void {
  const { pen } = d;
  const rng = createRng(7270);
  const reach = (x: number, y: number): number => pondReach(x, y, w, h, keep);
  const edgeness = (p: Pt): number => smooth01(0.55, 1, reach(p.x, p.y));
  const edge = shoreline(w, h, keep, 4);
  paintWater(d, w, h, edge, reach, rng);
  // Life under and on the water, before the coping overhangs it.
  const wet = (x: number, y: number): boolean => reach(x, y) > 1.12;
  for (const [x, y, len, ang] of [[w - 120, h - 52, 38, -2.75], [70, 40, 30, 0.35]] as const) if (wet(x, y)) goldfish(d, pt(x, y), len, ang);
  for (const [x, y, r] of [[w - 150, h - 30, 21], [w - 95, h - 92, 19], [w - 40, h - 150, 17]] as const) if (wet(x, y)) steppingStone(d, pt(x, y), r, rng);
  const pads: [Pt, number][] = [];
  for (const [x0, y0, x1, y1, n] of [[w - 330, h - 120, w, h, 9], [0, 0, 300, 120, 7], [w - 240, 0, w, 90, 4], [0, h - 90, 220, h, 3], [0, 200, 40, h - 200, 2], [w - 40, 200, w, h - 200, 2]] as const) {
    for (let k = 0; k < n; k++) {
      const p = spot(rng, x0, y0, x1, y1, reach, 1.1, 9);
      if (p && pads.every(([q, r]) => Math.hypot(q.x - p.x, q.y - p.y) > r + 16)) pads.push([p, 10 + rng() * 15]);
    }
  }
  for (const [p, r] of pads) if (rng() < 0.4) ripple(d, p, r + 4, 2, rng);
  pads.forEach(([p, r], i) => {
    lilyPad(d, p, r, rng);
    if (i % 4 === 1) waterLily(d, pt(p.x + r * 0.2, p.y - r * 0.1), 7 + rng() * 3, rng);
  });
  // The terrace.
  pen.fill(edge, PAPER, 1);
  pen.fill(edge, JOINT, 0.6);
  const flags = layFlags(rng, w, h).filter((f) => reach(f.c.x, f.c.y) < 1.15);
  pen.clipped(edge, () => {
    for (const f of flags) paintFlag(d, f, rng, edgeness(f.c));
    mossJoints(d, flags, rng, edgeness);
  });
  coping(d, edge, w, h, rng);
  // Reeds and kingcups along the waterline.
  for (const [x0, y0, x1, y1, n, lean] of [[0, 0, 340, 170, 3, -2.4], [0, h - 140, 260, h, 2, 2.4], [w - 260, 0, w, 120, 2, -0.8], [w - 360, h - 150, w, h, 2, 0.8], [0, 160, 60, h - 160, 2, Math.PI]] as const) {
    for (let k = 0; k < n; k++) {
      const p = spot(rng, x0, y0, x1, y1, reach, 1.0, 1.12);
      if (p) reeds(d, p, lean + (rng() - 0.5) * 0.6, 34 + rng() * 14, rng);
    }
  }
  for (const [x0, y0, x1, y1, n] of [[0, 0, 360, 200, 2], [w - 380, h - 170, w, h, 3], [w - 280, 0, w, 140, 1], [0, h - 160, 280, h, 2], [w - 70, 150, w, h - 150, 1]] as const) {
    for (let k = 0; k < n; k++) {
      const p = spot(rng, x0, y0, x1, y1, reach, 0.97, 1.06);
      if (p) kingcups(d, p, 18 + rng() * 6, rng);
    }
  }
  // A few grass blades leaning out over the coping.
  for (let i = 0; i < 40; i++) {
    const p = spot(rng, 0, 0, w, h, reach, 0.96, 1.0);
    if (!p) continue;
    const a = Math.atan2(p.y - h / 2, p.x - w / 2) + (rng() - 0.5) * 1.2;
    const l = 8 + rng() * 10;
    pen.hair(bezier(p, pt(p.x + Math.cos(a) * l * 0.5 + 1.5, p.y + Math.sin(a) * l * 0.5), pt(p.x + Math.cos(a) * l, p.y + Math.sin(a) * l), 4), 0.6, mix(LEAF, d.ink, 0.35), 0.65);
  }
}
