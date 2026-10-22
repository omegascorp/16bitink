import { createRng } from '../../logic/rng';
import { MAP, type MapLayout } from '../../scenes/map/layout';
import { closed, type Draw, makeDraw, oval, pt } from '../kit';
import { PAPER_FILL, STONE, STONE_DARK } from '../palette';
import type { Pt } from '../pen';
import { mix } from '../wash';
import { hash, PENCIL, seedOf, smoothstep, type Span, Ticks, touches } from './common';
import { star } from './draftKit';
import { castShadow, shrub } from './flora';
import { chamfer } from './paving';

/**
 * The ends of the scroll, mostly bare paper: at the foot, the edge of the
 * house's back step where the groove begins, a pot either side; at the
 * head, a night sky only begun in pencil, a crescent moon and a few stars.
 */
const TERRACOTTA = '#c06a43';
const COIR = '#c8a46a';
const BRICK = '#b9765a';

const slab = (x0: number, y0: number, x1: number, y1: number): Pt[] => {
  const out: Pt[] = [];
  for (let x = x0; x < x1; x += 20) out.push(pt(x, y0));
  for (let y = y0; y < y1; y += 20) out.push(pt(x1, y));
  for (let x = x1; x > x0; x -= 20) out.push(pt(x, y1));
  for (let y = y1; y > y0; y -= 20) out.push(pt(x0, y));
  return chamfer(out, 4);
};

/** A terracotta pot from above with a little plant in it. */
function pot(d: Draw, c: Pt, r: number, bloom: string): void {
  const { pen } = d;
  const rim = oval(c.x, c.y, r, r, 28);
  castShadow(d, rim, r * 0.5, 0.14);
  pen.fill(rim, PAPER_FILL, 1);
  pen.fill(rim, TERRACOTTA, 0.6);
  pen.fill(oval(c.x, c.y, r * 0.8, r * 0.8, 24), '#6b4a33', 0.6);
  pen.crescent(rim, pt(-r * 0.2, -r * 0.3), () => pen.fill(rim, mix(TERRACOTTA, d.ink, 0.4), 0.35));
  pen.stroke(closed(rim), 1, d.ink, 0.85);
  shrub(d, pt(c.x - 2, c.y - 3), r * 0.72, createRng(d.pen.rng() * 1e9), bloom);
}

/** A coir doormat: a bristly oblong with a darker border. */
function doormat(d: Draw, x0: number, y0: number, x1: number, y1: number): void {
  const { pen } = d;
  const mat = slab(x0, y0, x1, y1);
  pen.fill(mat.map((p) => pt(p.x + 3, p.y + 4)), d.ink, 0.12);
  pen.fill(mat, PAPER_FILL, 1);
  pen.fill(mat, COIR, 0.7);
  pen.clipped(mat, () => pen.hatch(mat, 2.2, Math.PI / 2, 0.4, { color: mix(COIR, d.ink, 0.5), alpha: 0.4 }));
  const inner = slab(x0 + 7, y0 + 7, x1 - 7, y1 - 7);
  pen.stroke(closed(inner), 0.6, d.ink, 0.45, false);
  pen.stroke(closed(mat), 1, d.ink, 0.8, false);
}

/** The house's back step at the very foot of the map: the wall with its doorway the groove comes out of, the step, a mat and two pots. */
function backStep(d: Draw, height: number): void {
  const { pen } = d;
  const wallTop = height - 38;
  const step = slab(MAP.mid - 240, height - 118, MAP.mid + 240, wallTop + 2);
  pen.fill(step.map((p) => pt(p.x + 8, p.y + 12)), d.ink, 0.12);
  pen.fill(step, PAPER_FILL, 1);
  pen.fill(step, mix(STONE, '#cfc2a6', 0.4), 0.55);
  pen.fill(oval(MAP.mid, height - 78, 120, 26, 28), PAPER_FILL, 0.35);
  pen.crescent(step, pt(-4, -6), () => pen.fill(step, STONE_DARK, 0.3));
  pen.crescent(step, pt(-9, -13), () => pen.hatch(step, 4, 0.9, 0.45, { color: d.ink, alpha: 0.22 }));
  pen.stroke(closed(step), 1.3, d.ink, 0.85);
  // The house wall, its courses only begun, and the doorway.
  const wall = slab(-20, wallTop, MAP.width + 20, height + 12);
  pen.fill(wall, PAPER_FILL, 1);
  pen.fill(wall, BRICK, 0.4);
  pen.clipped(wall, () => pen.hatch(wall, 4.5, 0.9, 0.45, { color: d.ink, alpha: 0.18 }));
  for (const y of [wallTop + 12, wallTop + 24]) pen.hair([pt(-20, y), pt(MAP.width + 20, y)], 0.45, d.ink, 0.3);
  const door = slab(MAP.mid - 46, wallTop - 2, MAP.mid + 46, height + 12);
  pen.fill(door, PAPER_FILL, 1);
  pen.fill(door, '#3a3348', 0.55);
  pen.crescent(door, pt(6, 9), () => pen.fill(door, '#3a3348', 0.3));
  pen.stroke([pt(-20, wallTop), pt(MAP.mid - 46, wallTop + 0.5)], 1.3, d.ink, 0.8, false);
  pen.stroke([pt(MAP.mid + 46, wallTop), pt(MAP.width + 20, wallTop + 0.5)], 1.3, d.ink, 0.8, false);
  pen.stroke(closed(door).slice(0, 12), 1.2, d.ink, 0.85, false);
  doormat(d, MAP.mid - 170, height - 104, MAP.mid - 40, height - 56);
  pot(d, pt(MAP.mid - 300, height - 76), 27, '#d0607a');
  pot(d, pt(MAP.mid + 296, height - 80), 22, '#9b86c4');
  pot(d, pt(MAP.mid + 338, height - 58), 16, '#e6b34a');
}

/** A crescent moon pencilled in, its dark limb hatched. */
function moon(d: Draw, c: Pt, r: number): void {
  const { pen } = d;
  const disc = oval(c.x, c.y, r, r, 36);
  const bite = oval(c.x + r * 0.45, c.y - r * 0.2, r * 0.85, r * 0.85, 36);
  pen.fill(disc, PAPER_FILL, 0.85);
  pen.stroke(closed(disc).slice(8, 34), 1.1, PENCIL, 0.85);
  pen.hair(closed(bite).slice(16, 34), 0.6, PENCIL, 0.6);
  pen.clipped(bite, () => pen.hatch(disc, 3.2, 0.9, 0.4, { color: PENCIL, alpha: 0.3 }));
  pen.hair(closed(oval(c.x, c.y, r * 1.5, r * 1.5, 40)).slice(0, 14), 0.4, PENCIL, 0.25);
}

/** The night sky, being drawn: hatching thickest at the very top that frays out downwards, a moon and stars. */
function nightSky(ctx: CanvasRenderingContext2D, span: Span, bottom: number): void {
  // Diagonal hatching laid in bands, densest at the top where it is cross-hatched, fraying out downwards.
  const hatch = new Ticks();
  const cross = new Ticks();
  const BAND = 30;
  for (let row = Math.max(0, Math.floor((span.y0 - 40) / BAND)); row * BAND < Math.min(bottom, span.y1 + 10); row++) {
    const y = row * BAND;
    const thick = 1 - smoothstep(y / bottom);
    for (let k = 0; k * 6 < MAP.width + 40; k++) {
      const x = k * 6 - 20 + hash(k, row, 404) * 3;
      if (Math.abs(x - MAP.mid) < 80 || hash(k, row, 401) > thick * 1.1) continue;
      const l = (BAND + 6) * (0.7 + hash(k, row, 402) * 0.5);
      hatch.add(x, y, x + l * 0.6, y + l * 0.8);
      if (hash(k, row, 405) < thick * thick - 0.35) cross.add(x + l * 0.6, y, x, y + l * 0.8);
    }
  }
  cross.stroke(ctx, PENCIL, 0.45, 0.3);
  hatch.stroke(ctx, PENCIL, 0.55, 0.42);
  if (touches(span, 130, 90)) moon(makeDraw(ctx, 4401, 0, 0), pt(MAP.width - 330, 130), 52);
  for (let i = 0; i < 30; i++) {
    const c = pt(60 + hash(i, 1, 410) * (MAP.width - 120), 20 + hash(i, 2, 410) ** 1.6 * (bottom - 40));
    if (Math.abs(c.x - MAP.mid) < 140 || !touches(span, c.y, 12)) continue;
    const d = makeDraw(ctx, seedOf(4402, i), 0, 0);
    if (hash(i, 3, 410) < 0.6) star(d, c, 5 + hash(i, 4, 410) * 5, createRng(1), 1);
    else d.pen.dot(c.x, c.y, 1.6, PENCIL, 0.7);
  }
  // A constellation joined up in dots, as if worked out on the page.
  const plough = [pt(180, 70), pt(240, 92), pt(300, 88), pt(352, 112), pt(360, 168), pt(440, 176), pt(450, 128)];
  if (touches(span, 120, 80)) {
    const d = makeDraw(ctx, 4403, 0, 0);
    for (let i = 0; i < plough.length; i++) {
      const p = plough[i]!;
      star(d, p, 4, createRng(2), 1);
      const q = plough[i + 1];
      if (!q) continue;
      for (let t = 0.15; t < 0.9; t += 0.12) d.pen.dot(p.x + (q.x - p.x) * t, p.y + (q.y - p.y) * t, 0.6, PENCIL, 0.45);
    }
  }
}

/** Paints whichever end of the map the span reaches. */
export function paintEnds(ctx: CanvasRenderingContext2D, layout: MapLayout, span: Span): void {
  const last = layout.regions[layout.regions.length - 1]!;
  if (span.y0 < last.top + 160) nightSky(ctx, span, last.top + 160);
  if (span.y1 > layout.height - 140) backStep(makeDraw(ctx, 4301, 0, 0), layout.height);
}
