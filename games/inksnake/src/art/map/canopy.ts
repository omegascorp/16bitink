import { MAP, type MapRegion } from '../../scenes/map/layout';
import { TAU } from '../kit';
import { PAPER_FILL } from '../palette';
import { mix, rgba } from '../wash';
import { type Geo, hash, PENCIL, type Span } from './common';
import { cellRows } from './paper';

/**
 * A forest's closed canopy from above, laid as ground: hundreds of crowns
 * on a jittered grid filling the band wherever the trail, its calm and the
 * labels leave room. Too many for a pen each, so they are batched: every
 * crown's shade side (offset down-right), its body, its lit top (offset up
 * and left, smaller) and its outline go into a few shared paths, filled and
 * stroked once each, which reads as massed foliage lit from the upper left.
 * Seeded per world cell, so chunks agree. Pencilled in a draft: outlines
 * and a little hatching only.
 */
export interface CanopyLook {
  readonly leaf: string;
  readonly deep: string;
  readonly lit: string;
  /** Crown radius range. */
  readonly r: readonly [number, number];
  /** Share of cells that hold a crown. */
  readonly fill: number;
  /** How far from the trail's middle crowns keep, world px. */
  readonly clear: number;
}

function crownPath(p: Path2D, x: number, y: number, r: number, seed: number): void {
  const lobes = 7 + Math.floor(hash(seed, 1) * 4);
  const n = lobes * 4;
  const ph = hash(seed, 2) * TAU;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * TAU + ph;
    const u = (i % 4) / 4;
    const rr = r * (0.86 + 0.14 * Math.sin(Math.PI * u) ** 0.6 * (0.7 + hash(seed, 10 + Math.floor(i / 4)) * 0.6));
    const px = x + Math.cos(a) * rr;
    const py = y + Math.sin(a) * rr;
    if (i === 0) p.moveTo(px, py);
    else p.lineTo(px, py);
  }
  p.closePath();
}

/** Paints the canopy over the band's rows; `skip(x, y, r)` keeps crowns off water and landmarks. */
export function paintCanopy(ctx: CanvasRenderingContext2D, geo: Geo, span: Span, region: MapRegion, look: CanopyLook, draft: boolean, salt: number, skip: (x: number, y: number, r: number) => boolean = () => false): void {
  const CELL = Math.round((look.r[0] + look.r[1]) * 0.75);
  const rows = cellRows(span, CELL, look.r[1] * 2);
  const crowns: [number, number, number, number][] = [];
  for (let cy = Math.max(rows[0], Math.floor((region.top + 20) / CELL)); cy <= Math.min(rows[1], Math.floor((region.bottom - 20) / CELL)); cy++) {
    for (let cx = -1; cx * CELL < MAP.width + CELL; cx++) {
      if (hash(cx, cy, salt) > look.fill) continue;
      const r = look.r[0] + hash(cx, cy, salt + 1) * (look.r[1] - look.r[0]);
      const x = (cx + 0.15 + hash(cx, cy, salt + 2) * 0.7) * CELL;
      const y = (cy + 0.15 + hash(cx, cy, salt + 3) * 0.7) * CELL;
      if (y - r < region.top + 10 || y + r > region.bottom - 10) continue;
      if (geo.dist(x, y, look.clear + r + 10) < look.clear + r * 0.6 || geo.onLabel(x, y, r * 0.7) || skip(x, y, r)) continue;
      crowns.push([x, y, r, cx * 7919 + cy * 31 + salt]);
    }
  }
  // Lower crowns overlap higher ones: sort by y, and paint each whole (body, then shade and light clipped to it, then its outline).
  crowns.sort((a, b) => a[1] - b[1]);
  const shadow = new Path2D();
  for (const [x, y, r, seed] of crowns) crownPath(shadow, x + r * 0.3, y + r * 0.45, r, seed);
  ctx.save();
  ctx.fillStyle = draft ? rgba(PENCIL, 0.06) : rgba(mix(look.deep, '#1b2a20', 0.4), 0.22);
  ctx.fill(shadow);
  ctx.restore();
  const bodyFill = draft ? rgba(PAPER_FILL, 0.35) : rgba(mix(look.leaf, PAPER_FILL, 0.12), 0.95);
  const edge = draft ? rgba(PENCIL, 0.6) : rgba(mix(look.deep, '#26316a', 0.5), 0.6);
  for (const [x, y, r, seed] of crowns) {
    const body = new Path2D();
    crownPath(body, x, y, r, seed);
    ctx.fillStyle = bodyFill;
    ctx.fill(body);
    ctx.save();
    ctx.clip(body);
    const shade = new Path2D();
    crownPath(shade, x - r * 0.22, y - r * 0.32, r * 0.95, seed + 1);
    // The shade: everything not covered by the crown shifted towards the light.
    const rim = new Path2D();
    rim.rect(x - r * 2, y - r * 2, r * 4, r * 4);
    rim.addPath(shade);
    if (draft) {
      ctx.strokeStyle = rgba(PENCIL, 0.35);
      ctx.lineWidth = 0.45;
      ctx.beginPath();
      for (let k = -r; k < r * 1.6; k += 3.4) {
        ctx.moveTo(x + k, y + r);
        ctx.lineTo(x + k + r * 0.6, y + r * 0.1);
      }
      ctx.save();
      ctx.clip(rim, 'evenodd');
      ctx.stroke();
      ctx.restore();
    } else {
      ctx.fillStyle = rgba(look.deep, 0.42);
      ctx.fill(rim, 'evenodd');
      const lit = new Path2D();
      crownPath(lit, x - r * 0.25, y - r * 0.3, r * 0.48, seed + 2);
      ctx.fillStyle = rgba(look.lit, 0.5);
      ctx.fill(lit);
      // A few leaf ticks.
      ctx.strokeStyle = rgba(mix(look.deep, '#26316a', 0.5), 0.35);
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      for (let k = 0; k < 6; k++) {
        const a = hash(seed, 40 + k) * TAU;
        const d = r * Math.sqrt(hash(seed, 50 + k)) * 0.8;
        const px = x + Math.cos(a) * d;
        const py = y + Math.sin(a) * d;
        ctx.moveTo(px - 2.5, py - 1);
        ctx.quadraticCurveTo(px, py + 1.5, px + 2.5, py - 1);
      }
      ctx.stroke();
    }
    ctx.restore();
    ctx.strokeStyle = edge;
    ctx.lineWidth = draft ? 0.7 : 0.85;
    ctx.stroke(body);
  }
}
