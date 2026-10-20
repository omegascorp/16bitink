import { closed, type Draw, makeDraw, pt } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { mix, rgba } from '../wash';
import { MAP } from '../../scenes/map/layout';
import { Blobs, eachRun, type Geo, hash, seedOf, type Span, Ticks, tracePath } from './common';
import type { PondPlan } from './pondBand';

/**
 * Paints the pond's water and banks and its bridges: a pale wash deepening
 * towards the page's edges, shallows paler along the banks, the banks'
 * shadows on the water, sky reflections and pen ripple lines out in the
 * open water, then inked shores.
 */
const WATER = '#a5c6c9';
const DEEP = '#3f6f86';
const SHADE = '#2c4f5c';
const WOOD = '#b98f5c';
const CELL = 120;

function lands(plan: PondPlan, dx = 0, dy = 0): Path2D {
  const p = new Path2D();
  for (const l of plan.lands) tracePath(p, l, dx, dy);
  return p;
}

/** Runs `draw` clipped to the open water. */
function inWater(ctx: CanvasRenderingContext2D, plan: PondPlan, draw: () => void): void {
  const outer = new Path2D();
  tracePath(outer, plan.outer);
  const holes = lands(plan);
  holes.rect(-200, -1e6, MAP.width + 400, 2e6);
  ctx.save();
  ctx.clip(outer);
  ctx.clip(holes, 'evenodd');
  draw();
  ctx.restore();
}

export function paintWater(ctx: CanvasRenderingContext2D, geo: Geo, plan: PondPlan, span: Span): void {
  const top = plan.region.top;
  const bottom = plan.region.gate.y;
  if (span.y1 < top || span.y0 > bottom) return;
  const x0 = -60;
  const w = MAP.width + 120;
  const y0 = span.y0 - 4;
  const h = span.y1 - span.y0 + 8;
  inWater(ctx, plan, () => {
    ctx.fillStyle = PAPER_FILL;
    ctx.fillRect(x0, y0, w, h);
    ctx.fillStyle = rgba(WATER, 0.6);
    ctx.fillRect(x0, y0, w, h);
    const g = ctx.createLinearGradient(0, 0, MAP.width, 0);
    g.addColorStop(0, rgba(DEEP, 0.38));
    g.addColorStop(0.28, rgba(DEEP, 0.06));
    g.addColorStop(0.72, rgba(DEEP, 0.06));
    g.addColorStop(1, rgba(DEEP, 0.38));
    ctx.fillStyle = g;
    ctx.fillRect(x0, y0, w, h);
    // Shallows: paler along every bank.
    ctx.save();
    ctx.lineJoin = 'round';
    ctx.strokeStyle = rgba(PAPER_FILL, 0.22);
    ctx.lineWidth = 46;
    ctx.stroke(lands(plan));
    ctx.lineWidth = 20;
    ctx.stroke(lands(plan));
    const shore = new Path2D();
    tracePath(shore, plan.outer);
    ctx.lineWidth = 46;
    ctx.stroke(shore);
    ctx.restore();
    // Blooms of deeper colour, and the sky's pale reflections lying across the water.
    const deep = new Blobs();
    const sky = new Blobs();
    const lines = new Ticks();
    const grain = new Blobs();
    for (let cy = Math.floor((span.y0 - CELL) / CELL); cy <= Math.floor((span.y1 + CELL) / CELL); cy++) {
      for (let cx = -1; cx * CELL < MAP.width + CELL; cx++) {
        const x = (cx + hash(cx, cy, 81)) * CELL;
        const y = (cy + hash(cx, cy, 82)) * CELL;
        deep.blot(x, y, 40 + hash(cx, cy, 83) * 70, 16 + hash(cx, cy, 84) * 24, (hash(cx, cy, 85) - 0.5) * 0.3, cx * 131 + cy * 7);
        for (let k = 0; k < 10; k++) grain.add(cx * CELL + hash(cx, cy, 200 + k) * CELL, cy * CELL + hash(cx, cy, 220 + k) * CELL, 0.5 + hash(cx, cy, 240 + k) * 0.5);
        if (hash(cx, cy, 86) < 0.5) sky.add(x + 30, y + 40, 50 + hash(cx, cy, 87) * 60, 4 + hash(cx, cy, 88) * 4);
        const busy = geo.busy(x, y);
        if (hash(cx, cy, 89) > busy * 0.9) continue;
        // A little run of pen ripple lines.
        const n = 2 + Math.floor(hash(cx, cy, 90) * 3);
        for (let k = 0; k < n; k++) {
          const lx = x + (hash(cx, cy, 91 + k) - 0.5) * 30;
          const ly = y + k * 5;
          const l = 10 + hash(cx, cy, 95 + k) * 18;
          lines.add(lx - l / 2, ly, lx + l / 2, ly + (hash(cx, cy, 99 + k) - 0.5) * 1.5);
        }
      }
    }
    deep.fill(ctx, DEEP, 0.08);
    grain.fill(ctx, SHADE, 0.2);
    sky.fill(ctx, PAPER_FILL, 0.28);
    lines.stroke(ctx, '#26316a', 0.6, 0.35);
    // The banks' shadows on the water, thrown to the lower right.
    ctx.fillStyle = rgba(SHADE, 0.22);
    ctx.fill(lands(plan, 6, 9));
    const above = new Path2D();
    above.rect(-200, -1e6, MAP.width + 400, 2e6);
    tracePath(above, plan.outer, 6, 9);
    ctx.fill(above, 'evenodd');
  });
}

/** The shores inked, in fixed runs so chunks agree, only where water really meets land. */
export function paintShores(ctx: CanvasRenderingContext2D, plan: PondPlan, span: Span): void {
  const salt = 8500 + plan.region.index;
  const half = Math.floor(plan.outer.length / 2);
  const outerKeep = (p: Pt): boolean => !plan.onLand(p.x, p.y);
  const landKeep = (p: Pt): boolean => p.y > plan.shoreHigh(p.x) - 1 && p.y < plan.shoreLow(p.x) + 1;
  const lines: [Pt[], (p: Pt) => boolean][] = [
    [plan.outer.slice(0, half), outerKeep],
    [plan.outer.slice(half), outerKeep],
    ...plan.lands.map((l): [Pt[], (p: Pt) => boolean] => [closed(l), landKeep]),
  ];
  lines.forEach(([line, keep], j) => {
    eachRun(line, 22, span, 30, (part, k) => {
      const { pen } = makeDraw(ctx, seedOf(salt, j, k), 0, 0);
      let run: Pt[] = [];
      const flush = (): void => {
        if (run.length > 1) {
          pen.stroke(run, 1.15, '#26316a', 0.75, false);
          pen.hair(run.map((p) => pt(p.x + 2.5, p.y + 3.5)), 0.5, SHADE, 0.35);
        }
        run = [];
      };
      for (const p of part) {
        if (keep(p)) run.push(p);
        else flush();
      }
      flush();
    });
  });
}

/** A footbridge carrying the path over a channel: planks across, a rail each side on posts, its shadow on the water. */
export function paintBridge(d: Draw, geo: Geo, range: readonly [number, number]): void {
  const { pen } = d;
  const { pts, nrm } = geo;
  const [i0, i1] = range;
  const at = (i: number, off: number): Pt => pt(pts[i]!.x + nrm[i]!.x * off, pts[i]!.y + nrm[i]!.y * off);
  const deck: Pt[] = [];
  for (let i = i0; i <= i1; i++) deck.push(at(i, 31));
  for (let i = i1; i >= i0; i--) deck.push(at(i, -31));
  pen.fill(deck.map((p) => pt(p.x + 10, p.y + 15)), SHADE, 0.25);
  pen.fill(deck, PAPER_FILL, 1);
  for (let i = i0; i < i1; i += 2) {
    const j = Math.min(i1, i + 2);
    const plank = [at(i, 30), at(j, 30), at(j, -30), at(i, -30)].map((p, k) => pt(p.x + (k < 2 ? -0.3 : 0.3), p.y));
    pen.fill(plank, mix(WOOD, '#d8c3a0', hash(i, 7) * 0.5), 0.7);
    pen.hair([at(j, 30), at(j, -30)], 0.45, d.ink, 0.45);
  }
  for (const side of [1, -1]) {
    const rail: Pt[] = [];
    for (let i = i0; i <= i1; i++) rail.push(at(i, side * 33));
    for (let i = i1; i >= i0; i--) rail.push(at(i, side * 28));
    pen.fill(rail, mix(WOOD, '#26316a', 0.3), 0.75);
    pen.stroke(rail.slice(0, i1 - i0 + 1), 1, d.ink, 0.85, false);
    for (const i of [i0 + 1, Math.round((i0 + i1) / 2), i1 - 1]) {
      const c = at(i, side * 31);
      const post = [pt(c.x - 4.5, c.y - 4.5), pt(c.x + 4.5, c.y - 4.5), pt(c.x + 4.5, c.y + 4.5), pt(c.x - 4.5, c.y + 4.5)];
      pen.fill(post.map((p) => pt(p.x + 4, p.y + 6)), SHADE, 0.25);
      pen.fill(post, PAPER_FILL, 1);
      pen.fill(post, mix(WOOD, '#26316a', 0.35), 0.8);
      pen.stroke(closed(post), 0.8, d.ink, 0.9, false);
    }
  }
  pen.stroke(deck.slice(0, i1 - i0 + 1), 0.9, d.ink, 0.6, false);
  pen.stroke(deck.slice(i1 - i0 + 1), 0.9, d.ink, 0.6, false);
}
