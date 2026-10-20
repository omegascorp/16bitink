import { MAP } from '../../scenes/map/layout';
import { LEAF, MOSS, PAPER, PAPER_FILL } from '../palette';
import { mix, rgba } from '../wash';
import { Blobs, type Geo, hash, type Span, Ticks } from './common';

/**
 * The page under everything: cream paper with a faint mottle, and the
 * lawn's watercolour wash (a ragged-topped sheet of green with blooms and
 * mowing stripes) under the painted chapters. Small marks are seeded per
 * world cell, so every chunk agrees about them.
 */
export const LAWN = mix(LEAF, MOSS, 0.55);
const CELL = 160;
const TICK_CELL = 26;

/** Rows of world cells of `size` reaching into the span (with a margin). */
function cellRows(span: Span, size: number, pad: number): [number, number] {
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

/** The lawn's ragged top edge at x: where the painting stops. */
export function raggedEdge(x: number, base: number, salt: number): number {
  return base + Math.sin(x / 97 + salt) * 14 + Math.sin(x / 37 + salt * 2) * 6 + (hash(Math.floor(x / 20), salt, 9) - 0.5) * 8;
}

/**
 * The lawn: a green wash from `top` (ragged; painting stops there) down to
 * `bottom`, with soft blooms of deeper and paler green, faint mowing
 * stripes, and darker pooling along its ragged edge.
 */
export function paintLawn(ctx: CanvasRenderingContext2D, span: Span, top: number, bottom: number): void {
  if (span.y1 < top - 40 || span.y0 > bottom) return;
  const sheet = new Path2D();
  sheet.moveTo(-50, bottom);
  for (let x = -50; x <= MAP.width + 50; x += 10) sheet.lineTo(x, raggedEdge(x, top, 3));
  sheet.lineTo(MAP.width + 50, bottom);
  sheet.closePath();
  ctx.save();
  ctx.clip(sheet);
  ctx.fillStyle = rgba(LAWN, 0.22);
  ctx.fillRect(-50, span.y0 - 4, MAP.width + 100, span.y1 - span.y0 + 8);
  // Mowing stripes: every other swathe a touch paler.
  ctx.fillStyle = rgba(PAPER_FILL, 0.07);
  for (let y = Math.floor(span.y0 / 140) * 140; y < span.y1 + 140; y += 140) ctx.fillRect(-50, y, MAP.width + 100, 70);
  // Blooms of deeper and paler green, laid in three glazes so where they overlap they darken, as washes do.
  const glazes = [new Blobs(), new Blobs(), new Blobs()];
  const pale = new Blobs();
  const [r0, r1] = cellRows(span, CELL, 240);
  for (let cy = r0; cy <= r1; cy++) {
    for (let cx = -1; cx * CELL < MAP.width + CELL; cx++) {
      const x = (cx + hash(cx, cy, 12)) * CELL;
      const y = (cy + hash(cx, cy, 13)) * CELL;
      const seed = cx * 7919 + cy * 31;
      const rx = 50 + hash(cx, cy, 15) * 90;
      const ry = 24 + hash(cx, cy, 16) * 36;
      const rot = (hash(cx, cy, 17) - 0.5) * 0.7;
      if (hash(cx, cy, 14) < 0.6) glazes[Math.floor(hash(cx, cy, 18) * 3)]!.blot(x, y, rx, ry, rot, seed);
      else pale.blot(x, y, rx, ry, rot, seed);
    }
  }
  glazes.forEach((g, i) => g.fill(ctx, mix(LAWN, i === 0 ? '#2f5a33' : '#6f8f3a', 0.4), 0.07));
  pale.fill(ctx, PAPER_FILL, 0.14);
  ctx.restore();
  // Pigment pooling at the wash's ragged edge.
  ctx.save();
  ctx.strokeStyle = rgba(LAWN, 0.2);
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  for (let x = -50; x <= MAP.width + 50; x += 10) (x === -50 ? ctx.moveTo(x, raggedEdge(x, top, 3)) : ctx.lineTo(x, raggedEdge(x, top, 3)));
  ctx.stroke();
  ctx.restore();
}

/**
 * Grass marks and daisies over the lawn between rows `top` and `bottom`,
 * densest far from the groove; `skip(x, y)` keeps them off beds and water.
 */
export function lawnMarks(ctx: CanvasRenderingContext2D, geo: Geo, span: Span, top: number, bottom: number, skip: (x: number, y: number) => boolean): void {
  const ticks = new Ticks();
  const petals = new Blobs();
  const hearts = new Blobs();
  const grain = new Blobs();
  const [r0, r1] = cellRows(span, TICK_CELL, 20);
  for (let cy = Math.max(r0, Math.floor(top / TICK_CELL)); cy <= Math.min(r1, Math.floor(bottom / TICK_CELL)); cy++) {
    for (let cx = 0; cx * TICK_CELL < MAP.width; cx++) {
      const x = (cx + hash(cx, cy, 21)) * TICK_CELL;
      const y = (cy + hash(cx, cy, 22)) * TICK_CELL;
      if (y < raggedEdge(x, top, 3) + 10 || y > bottom || skip(x, y)) continue;
      // Pigment granulating in the paper's tooth.
      for (let k = 0; k < 3; k++) grain.add((cx + hash(cx, cy, 40 + k)) * TICK_CELL, (cy + hash(cx, cy, 43 + k)) * TICK_CELL, 0.45 + hash(cx, cy, 46 + k) * 0.5);
      const busy = geo.busy(x, y);
      if (hash(cx, cy, 23) > 0.08 + busy * 0.6) continue;
      if (hash(cx, cy, 24) < 0.06 * (0.3 + busy)) {
        for (let k = 0; k < 6; k++) {
          const a = (k / 6) * Math.PI * 2;
          petals.add(x + Math.cos(a) * 2.2, y + Math.sin(a) * 2.2, 1.6, 1.1, a);
        }
        hearts.add(x, y, 1.1);
        continue;
      }
      for (let k = 0; k < 3; k++) {
        const bx = x + (k - 1) * 2.4;
        const lean = (hash(cx, cy, 30 + k) - 0.5) * 3;
        ticks.add(bx, y, bx + lean, y - 4 - hash(cx, cy, 33 + k) * 4);
      }
    }
  }
  grain.fill(ctx, '#3f5f33', 0.22);
  ticks.stroke(ctx, mix(LEAF, '#26316a', 0.35), 0.6, 0.45);
  petals.fill(ctx, PAPER_FILL, 0.95);
  hearts.fill(ctx, '#e6b34a', 0.95);
}
