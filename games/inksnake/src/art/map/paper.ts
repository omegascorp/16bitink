import { MAP } from '../../scenes/map/layout';
import { PAPER, PAPER_FILL } from '../palette';
import { mix, rgba } from '../wash';
import { Blobs, type Geo, hash, PENCIL, type Span, Ticks } from './common';

/**
 * The page under everything: cream paper with a faint mottle, and each
 * painted place's watercolour wash (a sheet with ragged top and bottom
 * edges, blooms where it dried unevenly, pigment pooled at its edges).
 * Small marks are seeded per world cell, so every chunk agrees on them.
 */
const CELL = 160;

/** Rows of world cells of `size` reaching into the span (with a margin). */
export function cellRows(span: Span, size: number, pad: number): [number, number] {
  return [Math.floor((span.y0 - pad) / size), Math.floor((span.y1 + pad) / size)];
}

/** Cream paper over the chunk, faintly mottled like a sheet that has been handled. */
export function paintPaper(ctx: CanvasRenderingContext2D, span: Span): void {
  ctx.fillStyle = PAPER;
  ctx.fillRect(-50, span.y0 - 4, MAP.width + 100, span.y1 - span.y0 + 8);
  const warm = new Blobs();
  const cool = new Blobs();
  const [r0, r1] = cellRows(span, CELL, 240);
  for (let cy = r0; cy <= r1; cy++) {
    for (let cx = 0; cx * CELL < MAP.width; cx++) {
      if (hash(cx, cy, 1) > 0.45) continue;
      const x = (cx + hash(cx, cy, 2)) * CELL;
      const y = (cy + hash(cx, cy, 3)) * CELL;
      (hash(cx, cy, 4) < 0.5 ? warm : cool).blot(x, y, 60 + hash(cx, cy, 5) * 90, 30 + hash(cx, cy, 6) * 50, hash(cx, cy, 7) * 3, cx * 977 + cy);
    }
  }
  warm.fill(ctx, '#e8dcbc', 0.08);
  cool.fill(ctx, PAPER_FILL, 0.16);
}

/** A wash's ragged edge at x: where the painting stops. */
export function raggedEdge(x: number, base: number, salt: number): number {
  return base + Math.sin(x / 97 + salt) * 14 + Math.sin(x / 37 + salt * 2) * 6 + (hash(Math.floor(x / 20), salt, 9) - 0.5) * 8;
}

export interface WashLook {
  readonly colour: string;
  readonly alpha: number;
  /** Deeper blooms (two glazes) and paler ones. */
  readonly deep: readonly [string, string];
  /** How strongly the blooms show (1 is the lawn's). */
  readonly bloom?: number;
}

/** The sheet of a wash between ragged edges `top` and `bottom` (world y). */
function sheet(top: number, bottom: number, salt: number): Path2D {
  const p = new Path2D();
  p.moveTo(-50, raggedEdge(-50, bottom, salt + 5));
  for (let x = -50; x <= MAP.width + 50; x += 10) p.lineTo(x, raggedEdge(x, top, salt));
  for (let x = MAP.width + 50; x >= -50; x -= 10) p.lineTo(x, raggedEdge(x, bottom, salt + 5));
  p.closePath();
  return p;
}

/**
 * A place's ground wash from `top` to `bottom`, both edges ragged, with
 * blooms of deeper and paler colour laid in glazes (darkening where they
 * overlap, as washes do) and pigment pooled along both edges.
 */
export function paintWash(ctx: CanvasRenderingContext2D, span: Span, top: number, bottom: number, look: WashLook, salt: number): void {
  if (span.y1 < top - 40 || span.y0 > bottom + 40) return;
  const k = look.bloom ?? 1;
  ctx.save();
  ctx.clip(sheet(top, bottom, salt));
  ctx.fillStyle = rgba(look.colour, look.alpha);
  ctx.fillRect(-50, span.y0 - 4, MAP.width + 100, span.y1 - span.y0 + 8);
  const glazes = [new Blobs(), new Blobs()];
  const pale = new Blobs();
  const [r0, r1] = cellRows(span, CELL, 240);
  for (let cy = r0; cy <= r1; cy++) {
    for (let cx = -1; cx * CELL < MAP.width + CELL; cx++) {
      const x = (cx + hash(cx, cy, salt + 12)) * CELL;
      const y = (cy + hash(cx, cy, salt + 13)) * CELL;
      const seed = cx * 7919 + cy * 31 + salt;
      const rx = 50 + hash(cx, cy, 15) * 90;
      const ry = 24 + hash(cx, cy, 16) * 36;
      const rot = (hash(cx, cy, 17) - 0.5) * 0.7;
      if (hash(cx, cy, salt + 14) < 0.6) glazes[hash(cx, cy, 18) < 0.5 ? 0 : 1]!.blot(x, y, rx, ry, rot, seed);
      else pale.blot(x, y, rx, ry, rot, seed);
    }
  }
  glazes.forEach((g, i) => g.fill(ctx, look.deep[i]!, 0.08 * k));
  pale.fill(ctx, PAPER_FILL, 0.14 * k);
  ctx.restore();
  // Pigment pooling at the wash's ragged edges.
  ctx.save();
  ctx.strokeStyle = rgba(mix(look.colour, look.deep[0], 0.4), Math.min(0.35, look.alpha * 0.8));
  ctx.lineWidth = 2.5;
  for (const [base, s] of [[top, salt], [bottom, salt + 5]] as const) {
    if (!(span.y0 - 30 < base && base < span.y1 + 30)) continue;
    ctx.beginPath();
    for (let x = -50; x <= MAP.width + 50; x += 10) (x === -50 ? ctx.moveTo(x, raggedEdge(x, base, s)) : ctx.lineTo(x, raggedEdge(x, base, s)));
    ctx.stroke();
  }
  ctx.restore();
}

/** Inside the ragged sheet from top to bottom at x? */
export const inSheet = (x: number, y: number, top: number, bottom: number, salt: number): boolean =>
  y > raggedEdge(x, top, salt) + 8 && y < raggedEdge(x, bottom, salt + 5) - 8;

export interface MarkLook {
  readonly tick: string;
  readonly grain: string;
  /** Share of cells that get a tuft of ticks, far from the trail (0..1). */
  readonly density: number;
  /** Little flowers among them: petal and heart colours, and how many. */
  readonly flower?: readonly [string, string, number];
  /** How tall the ticks are. */
  readonly height?: number;
  /** How strongly pigment granulates in the paper's tooth (0: none). */
  readonly grainAlpha?: number;
}

/**
 * Grass marks (or a draft's pencil ticks) over the rows top..bottom,
 * densest far from the trail; `skip(x, y)` keeps them off fields and water.
 */
export function groundMarks(ctx: CanvasRenderingContext2D, geo: Geo, span: Span, top: number, bottom: number, look: MarkLook, salt: number, skip: (x: number, y: number) => boolean): void {
  const CELL_T = 26;
  const ticks = new Ticks();
  const petals = new Blobs();
  const hearts = new Blobs();
  const grain = new Blobs();
  const tall = look.height ?? 1;
  const [r0, r1] = cellRows(span, CELL_T, 20);
  for (let cy = Math.max(r0, Math.floor(top / CELL_T)); cy <= Math.min(r1, Math.floor(bottom / CELL_T)); cy++) {
    for (let cx = 0; cx * CELL_T < MAP.width; cx++) {
      const x = (cx + hash(cx, cy, salt + 21)) * CELL_T;
      const y = (cy + hash(cx, cy, salt + 22)) * CELL_T;
      if (!inSheet(x, y, top, bottom, salt) || skip(x, y)) continue;
      if (look.grainAlpha !== 0) for (let k = 0; k < 2; k++) grain.add((cx + hash(cx, cy, 40 + k)) * CELL_T, (cy + hash(cx, cy, 43 + k)) * CELL_T, 0.45 + hash(cx, cy, 46 + k) * 0.5);
      const busy = geo.busy(x, y);
      if (hash(cx, cy, salt + 23) > 0.05 + busy * look.density) continue;
      if (look.flower && hash(cx, cy, 24) < look.flower[2] * (0.3 + busy)) {
        for (let k = 0; k < 5; k++) {
          const a = (k / 5) * Math.PI * 2;
          petals.add(x + Math.cos(a) * 2.2, y + Math.sin(a) * 2.2, 1.6, 1.1, a);
        }
        hearts.add(x, y, 1.1);
        continue;
      }
      for (let k = 0; k < 3; k++) {
        const bx = x + (k - 1) * 2.4;
        const lean = (hash(cx, cy, 30 + k) - 0.5) * 3;
        ticks.add(bx, y, bx + lean, y - (4 + hash(cx, cy, 33 + k) * 4) * tall);
      }
    }
  }
  grain.fill(ctx, look.grain, look.grainAlpha ?? 0.2);
  ticks.stroke(ctx, look.tick, 0.6, 0.45);
  if (look.flower) {
    petals.fill(ctx, look.flower[0], 0.95);
    hearts.fill(ctx, look.flower[1], 0.95);
  }
}

/** A draft band's ground: sparse pencil ticks far from the trail, and a few contour-like lines rubbed in. */
export function pencilGround(ctx: CanvasRenderingContext2D, geo: Geo, span: Span, top: number, bottom: number, salt: number, skip: (x: number, y: number) => boolean = () => false): void {
  groundMarks(ctx, geo, span, top, bottom, { tick: PENCIL, grain: PENCIL, density: 0.1, grainAlpha: 0 }, salt, skip);
}
