import { createRng, type Rng } from '../../logic/rng';
import { BOARD, type LevelDef } from '../../level/types';
import { blob, body, edgenessOf, edgeWash, groundWash, outline, polar, SHADOW } from '../groundKit';
import { closed, type Draw, pt, TAU } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { mix, rgba } from '../wash';
import { specks } from './farmGroundParts';
import { type Busy, busyOf, perArea, keepsOf, OAK_DARK, seedOf, STRAW, STRAW_DEEP, STRAW_LIT, strokes } from './farmKit';

/**
 * 'The Barn at Night' (farm-9): inside the old barn, seen from above, painted
 * by day (the game darkens it). Wide worn floorboards, pale in the middle,
 * broken towards the walls to the packed earth beneath, straw drifted along
 * the edges and spilt round the bales' feet. After InkGecko's barn floor.
 */
const FLOOR = '#d7c4a2';
const FLOOR_DEEP = '#93704c';
const PLANK_TONES = ['#b08a60', '#c4a074', '#9c7a58', '#bfa486'] as const;
const EARTH = '#8c6c4a';
const PLANK_W = 46;
const JOIST = 300;

const W = BOARD.w;
const H = BOARD.h;

/** Floorboards in rows, butt joints staggered, grain, knots and nails, firmer towards the edges. Returns the rows' edges. */
function floorboards(d: Draw, edge: (x: number, y: number) => number, rng: Rng): number[] {
  const { pen } = d;
  const { ctx } = pen;
  groundWash(d, W, H, FLOOR, 0.5);
  edgeWash(d, W, H, FLOOR_DEEP, 0.3, W * 0.23);
  const rows: number[] = [];
  for (let y = -8 - rng() * 20; y < H + PLANK_W; y += PLANK_W + (rng() - 0.5) * 5) rows.push(y);
  for (let r = 0; r + 1 < rows.length; r++) {
    const [y0, y1] = [rows[r]!, rows[r + 1]!];
    for (let x = -30 - rng() * 220; x < W; ) {
      const len = 170 + rng() * 330;
      const k = edge(x + len / 2, (y0 + y1) / 2);
      pen.fill([pt(x + 1, y0 + 1), pt(x + len - 1, y0 + 1), pt(x + len - 1, y1 - 1), pt(x + 1, y1 - 1)], PLANK_TONES[Math.floor(rng() * PLANK_TONES.length)]!, 0.06 + 0.18 * k + rng() * 0.07);
      ctx.save();
      ctx.strokeStyle = rgba(OAK_DARK, 0.08 + 0.28 * k);
      ctx.lineWidth = 0.55;
      ctx.beginPath();
      for (let g = 0; g < 3 + Math.round(k * 3); g++) {
        const gy = y0 + 4 + rng() * (y1 - y0 - 8);
        const ph = rng() * TAU;
        ctx.moveTo(x + 2, gy);
        for (let gx = x + 2; gx < x + len - 2; gx += 18) ctx.lineTo(gx, gy + Math.sin(gx / 55 + ph) * 2.2);
      }
      ctx.stroke();
      ctx.restore();
      if (rng() < 0.15 + 0.4 * k) {
        const c = pt(x + 20 + rng() * (len - 40), y0 + 10 + rng() * (y1 - y0 - 20));
        const knot = blob(c, 4 + rng() * 4, 2.2 + rng() * 1.5, rng, 0.15, 12);
        pen.fill(knot, OAK_DARK, 0.2 + 0.35 * k);
        pen.hair(closed(knot), 0.5, d.ink, 0.15 + 0.45 * k);
        pen.hair(closed(blob(c, 9, 4.5, rng, 0.2, 14)), 0.4, OAK_DARK, 0.1 + 0.3 * k);
      }
      const ex = x + len;
      if (ex > 0 && ex < W) {
        const kk = edge(ex, (y0 + y1) / 2);
        pen.stroke([pt(ex, y0 + 1), pt(ex + (rng() - 0.5), (y0 + y1) / 2), pt(ex, y1 - 1)], 0.7 + 0.5 * kk, d.ink, 0.2 + 0.5 * kk, false);
        for (const dx of [-5, 5]) for (const t of [0.3, 0.7]) pen.dot(ex + dx, y0 + (y1 - y0) * t, 0.8, d.ink, 0.15 + 0.45 * kk);
      }
      x += len;
    }
    for (let jx = 80; jx < W; jx += JOIST) {
      const kk = edge(jx, (y0 + y1) / 2);
      for (const t of [0.3, 0.7]) pen.dot(jx + (rng() - 0.5) * 2, y0 + (y1 - y0) * t, 0.85, d.ink, 0.12 + 0.4 * kk);
    }
  }
  for (const y of rows) {
    for (let x = 0; x < W; x += 80) {
      const k = edge(x + 40, y);
      if (rng() > 0.35 + 0.65 * k) continue;
      pen.stroke([pt(x, y + (rng() - 0.5)), pt(x + 40, y + (rng() - 0.5) * 1.4), pt(x + 80, y + (rng() - 0.5))], 0.6 + 0.6 * k, d.ink, 0.14 + 0.45 * k, false);
      pen.hair([pt(x + 4, y + 1.6), pt(x + 76, y + 1.6)], 0.8, PAPER_FILL, 0.15 + 0.2 * k);
    }
  }
  return rows;
}

/** Where the boards have gone and the packed earth shows, out towards the edges. */
function earthPatches(d: Draw, rows: readonly number[], busy: Busy, rng: Rng): void {
  const { pen } = d;
  const made: Pt[] = [];
  for (let t = 0; t < 120 && made.length < 3; t++) {
    const r = 1 + Math.floor(rng() * (rows.length - 3));
    const [y0, y1] = [rows[r]!, rows[r + 1 + (rng() < 0.4 ? 1 : 0)]!];
    const len = 70 + rng() * 120;
    const x0 = 20 + rng() * (W - 40 - len);
    const mid = pt(x0 + len / 2, (y0 + y1) / 2);
    if (busy(mid.x, mid.y) < 0.4 || busy(x0, mid.y) < 0.3 || busy(x0 + len, mid.y) < 0.3 || made.some((m) => Math.hypot(m.x - mid.x, m.y - mid.y) < W * 0.25)) continue;
    const ragged = (x: number, dir: number): Pt[] => Array.from({ length: 6 }, (_, i) => pt(x + dir * (rng() * 10 - (i % 2) * 6), y0 + ((y1 - y0) * i) / 5));
    const shape = [...ragged(x0, 1), ...ragged(x0 + len, -1).reverse()];
    body(d, shape, EARTH, 0.78);
    pen.clipped(shape, () => {
      pen.fill(blob(pt(x0 + len * 0.6, (y0 + y1) / 2), len * 0.35, (y1 - y0) * 0.35, rng, 0.3, 14), '#6e5238', 0.18);
      pen.stipple(shape, Math.round(len * 4), () => 0.7, 0.6, mix(EARTH, d.ink, 0.5));
      for (let k = 0; k < len / 12; k++) {
        const p = pt(x0 + rng() * len, y0 + rng() * (y1 - y0));
        pen.fill(blob(p, 1.5 + rng() * 2, 1.2 + rng() * 1.5, rng, 0.2, 8), mix('#c9bba0', '#8f8676', rng()), 0.75);
      }
    });
    pen.crescent(shape, pt(SHADOW.x * 5, SHADOW.y * 5), () => pen.fill(shape, d.ink, 0.22));
    pen.crescent(shape, pt(SHADOW.x * 9, SHADOW.y * 9), () => pen.hatch(shape, 2.6, 0.9, 0.4, { color: d.ink, alpha: 0.25 }));
    pen.stroke(outline(shape, 6), 0.9, d.ink, 0.75, false);
    made.push(mid);
  }
}

/** Loose straw: drifts along the edges, spilt round the bales' feet, a stray stalk in the middle. */
function looseStraw(d: Draw, level: LevelDef, busy: Busy, rng: Rng): void {
  const bales = (level.solids ?? []).filter((s) => s.look === 'bale' && s.kind === 'rect');
  const spill = (): Pt | null => {
    if (bales.length === 0 || rng() < 0.5) {
      const p = pt(rng() * W, rng() * H);
      const e = busy(p.x, p.y);
      return rng() < 0.02 + e * e ? p : null;
    }
    const b = bales[Math.floor(rng() * bales.length)]!;
    if (b.kind !== 'rect') return null;
    const side = rng();
    const out = Math.abs(rng() - rng()) * 26;
    // Most spills out on the side away from the light, where it was pulled off.
    if (side < 0.4) return pt(b.x + rng() * b.w, b.y + b.h + out);
    if (side < 0.7) return pt(b.x + b.w + out, b.y + rng() * b.h);
    if (side < 0.85) return pt(b.x + rng() * b.w, b.y - out);
    return pt(b.x - out, b.y + rng() * b.h);
  };
  for (const [colour, alpha, wd] of [[STRAW_DEEP, 0.7, 1], [STRAW, 0.85, 1], [STRAW_LIT, 0.9, 0.9]] as const) {
    strokes(d, colour, alpha, wd, perArea(2200), () => {
      const p = spill();
      return p ? [p.x, p.y, rng() * TAU, 4 + rng() * 9, (rng() - 0.5) * 3] : null;
    });
  }
  for (let k = 0; k < perArea(120); k++) {
    const p = pt(rng() * W, rng() * H);
    if (rng() > busy(p.x, p.y)) continue;
    d.pen.hair([p, polar(p, rng() * TAU, 6 + rng() * 8)], 0.45, d.ink, 0.45);
  }
  // Grain spilt from a sack long gone: pale specks near an edge.
  const c = pt(80 + rng() * (W - 160), rng() < 0.5 ? 40 : H - 40);
  if (busy(c.x, c.y) > 0.4) specks(d, '#e8d9a8', 0.85, Array.from({ length: 70 }, () => {
    const p = polar(c, rng() * TAU, Math.abs(rng() - rng()) * 40);
    return [p.x, p.y, 0.9 + rng() * 0.4] as const;
  }));
}

/** The barn floor for a level: see the module comment. */
export function paintBarnFloor(d: Draw, level: LevelDef): void {
  const rng = createRng(seedOf(level.id));
  const busy = busyOf(keepsOf(level));
  const rows = floorboards(d, edgenessOf(W, H, 0.42), rng);
  earthPatches(d, rows, busy, rng);
  looseStraw(d, level, busy, rng);
}
