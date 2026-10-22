import { MAP } from '../../scenes/map/layout';
import { closed, makeDraw, oval, pt, TAU } from '../kit';
import { PAPER_FILL, STONE, STONE_DARK } from '../palette';
import type { Pt } from '../pen';
import { mix, rgba } from '../wash';
import { Blobs, type Geo, hash, LIGHT_DIR, PATH_HALF, PENCIL, POCKET_R, RING_R, SHADOW_DIR, seedOf, type Span, Ticks } from './common';

/**
 * The worn groove the levels sit along, as drawTrack draws it on the
 * boards but narrower: a channel MAP.groove wide with a smooth floor, the
 * wall nearer the light in shadow and the far one catching it, grit, and
 * two wobbling pen rims broken at each pocket. On a bridge it becomes a
 * timber trough. The drafts get the same groove in pencil.
 *
 * Floors and bands are plain canvas fills over the path indices a chunk
 * needs (identical wherever chunks overlap); the pen rims are drawn in
 * fixed runs of RUN points, each with its own seed, so seams never show.
 */
const HALF = MAP.groove / 2;
const RUN = 32;
const WOOD = '#c39a66';

/** The path indices a chunk paints, within a style's range i0..i1. */
function visible(geo: Geo, span: Span, i0: number, i1: number): [number, number] {
  const [a, b] = geo.range(span.y0, span.y1, 70);
  return [Math.max(a, i0), Math.min(b, i1)];
}

function polyline(pts: readonly Pt[], a: number, b: number): Path2D {
  const p = new Path2D();
  for (let i = a; i <= b; i++) (i === a ? p.moveTo(pts[i]!.x, pts[i]!.y) : p.lineTo(pts[i]!.x, pts[i]!.y));
  return p;
}

/** A band hugging the rim whose wall faces `toward`, up to `depth` deep where it faces it squarely. */
function wallBand(ctx: CanvasRenderingContext2D, geo: Geo, a: number, b: number, toward: Pt, depth: number, colour: string, alpha: number): void {
  const { pts, nrm } = geo;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = colour;
  for (const side of [1, -1]) {
    const path = new Path2D();
    for (let i = a; i <= b; i++) {
      const n = nrm[i]!;
      const x = pts[i]!.x + n.x * side * HALF;
      const y = pts[i]!.y + n.y * side * HALF;
      (i === a ? path.moveTo(x, y) : path.lineTo(x, y));
    }
    for (let i = b; i >= a; i--) {
      const n = nrm[i]!;
      const f = Math.max(0, side * (n.x * toward.x + n.y * toward.y));
      const off = HALF - depth * f;
      path.lineTo(pts[i]!.x + n.x * side * off, pts[i]!.y + n.y * side * off);
    }
    path.closePath();
    ctx.fill(path);
  }
  ctx.restore();
}

function floor(ctx: CanvasRenderingContext2D, geo: Geo, a: number, b: number, wood: boolean): void {
  const path = polyline(geo.pts, a, b);
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = MAP.groove;
  if (wood) {
    ctx.strokeStyle = rgba(PAPER_FILL, 1);
    ctx.stroke(path);
    ctx.strokeStyle = rgba(WOOD, 0.62);
    ctx.stroke(path);
    ctx.lineWidth = MAP.groove * 0.5;
    ctx.strokeStyle = rgba(mix(WOOD, '#5a3d22', 0.4), 0.12);
    ctx.stroke(path);
  } else {
    ctx.strokeStyle = rgba(mix(STONE, PAPER_FILL, 0.4), 0.75);
    ctx.stroke(path);
    ctx.strokeStyle = rgba(STONE_DARK, 0.16);
    ctx.stroke(path);
    ctx.lineWidth = MAP.groove * 0.45;
    ctx.strokeStyle = rgba(STONE_DARK, 0.06);
    ctx.stroke(path);
  }
  ctx.restore();
}

/** Points within this of a pocket's centre are inside its dimple: no rim there. */
const inPocket = (pockets: readonly Pt[], q: Pt, r: number): boolean => pockets.some((c) => (c.x - q.x) ** 2 + (c.y - q.y) ** 2 < r * r);

/** One rim (or the faint line where a wall meets the floor), in fixed pen runs. */
function rims(ctx: CanvasRenderingContext2D, geo: Geo, span: Span, i0: number, i1: number, pockets: readonly Pt[], o: { inset: number; width: number; alpha: number; ink: string; salt: number; gaps?: number }): void {
  const { pts, nrm } = geo;
  const [a, b] = visible(geo, span, i0, i1);
  for (let k = Math.floor(a / RUN); k * RUN <= b; k++) {
    const r0 = Math.max(i0, k * RUN);
    const r1 = Math.min(i1, (k + 1) * RUN + (o.gaps ? 2 : 0));
    if (r1 - r0 < 2) continue;
    for (const side of [1, -1]) {
      if (o.gaps && hash(k, side, o.salt) < o.gaps) continue;
      const { pen } = makeDraw(ctx, seedOf(o.salt, k, side), 0, 0);
      const ph1 = hash(side, o.salt, 1) * TAU;
      const ph2 = hash(side, o.salt, 2) * TAU;
      let run: Pt[] = [];
      let heavy = 0;
      const flush = (): void => {
        if (run.length > 2) pen.stroke(run, o.width * (heavy < 0 ? 0.8 : 1.3), o.ink, o.alpha, false);
        run = [];
        heavy = 0;
      };
      for (let i = r0; i <= r1 && i < pts.length; i++) {
        const n = nrm[i]!;
        const off = HALF - o.inset + Math.sin((i * 4) / 37 + ph1) * 0.7 + Math.sin((i * 4) / 13 + ph2) * 0.35;
        const q = pt(pts[i]!.x + n.x * side * off, pts[i]!.y + n.y * side * off);
        if (inPocket(pockets, q, POCKET_R - 1.5)) {
          flush();
          continue;
        }
        run.push(q);
        heavy += side * (n.x * LIGHT_DIR.x + n.y * LIGHT_DIR.y);
      }
      flush();
    }
  }
}

/**
 * The painted groove over path indices i0..i1 (one style's stretch): `wood(i)`
 * marks the stretches over bridges. Pockets (node centres) break the rims.
 */
export function paintedGroove(ctx: CanvasRenderingContext2D, geo: Geo, span: Span, i0: number, i1: number, wood: (i: number) => boolean, pockets: readonly Pt[]): void {
  const [a, b] = visible(geo, span, i0, i1);
  if (b - a < 1) return;
  for (let s = a; s < b; ) {
    const w = wood(s);
    let e = s + 1;
    while (e < b && wood(e) === w) e++;
    floor(ctx, geo, s, e, w);
    s = e;
  }
  wallBand(ctx, geo, a, b, LIGHT_DIR, 9, STONE_DARK, 0.2);
  wallBand(ctx, geo, a, b, LIGHT_DIR, 4.5, mix(STONE_DARK, '#26316a', 0.3), 0.3);
  wallBand(ctx, geo, a, b, SHADOW_DIR, 3.5, PAPER_FILL, 0.55);
  // Grit on a stone floor; plank seams across a wooden one.
  const grit = new Blobs();
  const seams = new Ticks();
  const { pts, nrm } = geo;
  for (let i = a; i <= b; i++) {
    const p = pts[i]!;
    const n = nrm[i]!;
    if (wood(i)) {
      if (i % 2 === 0) seams.add(p.x + n.x * HALF, p.y + n.y * HALF, p.x - n.x * HALF, p.y - n.y * HALF);
    } else if (i % 2 === 0) {
      const r = (hash(i, 1) - 0.5) * MAP.groove * 0.8;
      const ang = hash(i, 2) * TAU;
      grit.add(p.x + Math.cos(ang) * r, p.y + Math.sin(ang) * r, 0.4 + hash(i, 3) * 0.6);
    }
  }
  grit.fill(ctx, STONE_DARK, 0.45);
  seams.stroke(ctx, '#5a3d22', 0.6, 0.35);
  rims(ctx, geo, span, i0, i1, pockets, { inset: 0, width: 1, alpha: 0.75, ink: '#26316a', salt: 9101 });
  rims(ctx, geo, span, i0, i1, pockets, { inset: 4.5, width: 0.6, alpha: 0.22, ink: '#26316a', salt: 9102 });
}

/**
 * The groove as a pencil draft: its rims sketched in runs that overlap and
 * sometimes leave a gap, light hatching on the shadowed wall, the paved
 * path's edges barely begun, and each pocket's dimple and ring of setts.
 */
export function pencilGroove(ctx: CanvasRenderingContext2D, geo: Geo, span: Span, i0: number, i1: number, pockets: readonly Pt[]): void {
  const [a, b] = visible(geo, span, i0, i1);
  if (b - a < 1) return;
  rims(ctx, geo, span, i0, i1, pockets, { inset: 0, width: 0.75, alpha: 0.6, ink: PENCIL, salt: 9201, gaps: 0.1 });
  const { pts, nrm } = geo;
  const hatch = new Ticks();
  for (let i = a + (a & 1); i <= b; i += 2) {
    for (const side of [1, -1]) {
      const n = nrm[i]!;
      if (side * (n.x * LIGHT_DIR.x + n.y * LIGHT_DIR.y) < 0.25) continue;
      const p = pts[i]!;
      const o = pt(p.x + n.x * side * (HALF - 0.5), p.y + n.y * side * (HALF - 0.5));
      if (inPocket(pockets, o, POCKET_R + 1)) continue;
      const l = 4 + hash(i, side, 31) * 3;
      hatch.add(o.x, o.y, o.x - n.x * side * l + 1.5, o.y - n.y * side * l + 1.5);
    }
  }
  hatch.stroke(ctx, PENCIL, 0.5, 0.35);
  // The path's edges, only begun here and there.
  for (const side of [1, -1]) {
    for (let k = Math.floor(a / RUN); k * RUN <= b; k++) {
      if (hash(k, side, 41) < 0.45) continue;
      const r0 = Math.max(i0, k * RUN + 4);
      const r1 = Math.min(i1, (k + 1) * RUN - 4);
      const line: Pt[] = [];
      for (let i = r0; i <= r1; i++) {
        const q = pt(pts[i]!.x + nrm[i]!.x * side * PATH_HALF, pts[i]!.y + nrm[i]!.y * side * PATH_HALF);
        if (inPocket(pockets, q, RING_R + 2)) break;
        line.push(q);
      }
      if (line.length > 3) makeDraw(ctx, seedOf(9301, k, side), 0, 0).pen.hair(line, 0.6, PENCIL, 0.3);
    }
  }
}

/** A pocket in pencil: the dimple traced twice, the setts round it sketched in part. */
export function pencilPocket(ctx: CanvasRenderingContext2D, c: Pt, seed: number): void {
  const { pen } = makeDraw(ctx, seed, 0, 0);
  pen.fill(oval(c.x, c.y, POCKET_R, POCKET_R, 32), PAPER_FILL, 0.35);
  pen.stroke(closed(oval(c.x, c.y, POCKET_R, POCKET_R, 32)), 0.8, PENCIL, 0.7);
  pen.hair(closed(oval(c.x + 0.8, c.y - 0.6, POCKET_R - 1, POCKET_R - 1.5, 30)), 0.5, PENCIL, 0.35);
  pen.crescent(oval(c.x, c.y, POCKET_R, POCKET_R, 32), pt(7, 10), () => pen.hatch(oval(c.x, c.y, POCKET_R, POCKET_R, 32), 3.4, 0.9, 0.45, { color: PENCIL, alpha: 0.35 }));
  const from = pen.rng() * TAU;
  const ring = oval(c.x, c.y, RING_R - 2, RING_R - 2, 36);
  const start = Math.floor((from / TAU) * 36);
  pen.hair([...ring.slice(start), ...ring.slice(0, start)].slice(0, 22), 0.55, PENCIL, 0.45);
  for (let k = 0; k < 9; k++) {
    const a = from + (k / 9) * (TAU * 0.6);
    pen.hair([pt(c.x + Math.cos(a) * (POCKET_R + 2), c.y + Math.sin(a) * (POCKET_R + 2)), pt(c.x + Math.cos(a) * (RING_R - 2), c.y + Math.sin(a) * (RING_R - 2))], 0.45, PENCIL, 0.4);
  }
}
