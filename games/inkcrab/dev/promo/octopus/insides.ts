import { bezier, type Draw, oval, pt, ribbon } from '../../../src/art/kit';
import { PAPER_FILL } from '../../../src/art/palette';
import type { Pt } from '../../../src/art/pen';
import { lerp } from '../short';
import type { P } from './motion';
import {
  beatAt, blueAt, blueFlashAt, bodyFlowAt, bodyFlowOffset, DASH, gillFlowAt, gillFlowOffset, type HeartId, heartLitAt, oxygenLabel, stoppedAt,
} from './story';

/**
 * What the X-ray shows inside the mantle, in its local units (mantle up):
 * the two gills, a small gill heart at the foot of each (1 and 2) and the
 * main heart between them (3), and the vessels: up through each gill and
 * on to the main heart, and from it down into the body and the arms. Blood
 * runs along them as moving dashes, grey until "BLUE" floods them blue; the
 * main heart's circuit holds still while that heart is stopped.
 */
export const HEARTS: Readonly<Record<HeartId, { readonly x: number; readonly y: number; readonly s: number }>> = {
  1: { x: -12.5, y: -29.5, s: 5.4 },
  2: { x: 12.5, y: -29.5, s: 5.4 },
  3: { x: 0, y: -42, s: 8.4 },
};
/** Where each heart's number sits, local units (outside the gill hearts, above the main one). */
export const NUMBER_AT: Readonly<Record<HeartId, P>> = { 1: { x: -26, y: -27 }, 2: { x: 26, y: -27 }, 3: { x: 0, y: -56 } };

const GREY = '#a59ea2';
const BLUE = '#1f5fdc';
const HEART = '#d24f48';
const GILL = '#e39a96';

const gillSpine = (side: number): Pt[] => bezier(pt(side * 12.5, -32), pt(side * 19, -46), pt(side * 13.5, -64), 12);
const gillOut = (side: number): Pt[] => bezier(pt(side * 13.5, -64), pt(side * 3.5, -63), pt(side * 2.5, -50), 10);
const AORTA: Pt[] = bezier(pt(0, -34), pt(0.6, -24), pt(0, -8), 8);

/** A gill: a feathery pink plume with fine leaflets either side. */
function gill(d: Draw, side: number, a: number): void {
  const spine = gillSpine(side);
  const { shape } = ribbon(spine, (u) => 6.5 * (1 - 0.5 * u));
  d.pen.fill(shape, GILL, 0.55 * a);
  spine.forEach((p, i) => {
    if (i === 0 || i === spine.length - 1) return;
    const q = spine[i + 1]!;
    const a = Math.atan2(q.y - p.y, q.x - p.x) + Math.PI / 2;
    const l = 3.4 * (1 - (0.5 * i) / spine.length);
    d.pen.hair([pt(p.x - Math.cos(a) * l, p.y - Math.sin(a) * l), pt(p.x + Math.cos(a) * l, p.y + Math.sin(a) * l)], 0.35, d.ink, 0.6 * a);
  });
  d.pen.hair(spine, 0.5, d.ink, 0.8 * a);
}

/** Length along a polyline, and the point at a distance along it. */
function lengths(pts: readonly P[]): number[] {
  const out = [0];
  for (let i = 1; i < pts.length; i++) out.push(out[i - 1]! + Math.hypot(pts[i]!.x - pts[i - 1]!.x, pts[i]!.y - pts[i - 1]!.y));
  return out;
}
function upTo(pts: readonly P[], u: number): P[] {
  const ls = lengths(pts);
  const stop = ls[ls.length - 1]! * u;
  const out: P[] = [pts[0]!];
  for (let i = 1; i < pts.length; i++) {
    if (ls[i]! <= stop) out.push(pts[i]!);
    else {
      const k = (stop - ls[i - 1]!) / (ls[i]! - ls[i - 1]! || 1);
      out.push({ x: lerp(pts[i - 1]!.x, pts[i]!.x, k), y: lerp(pts[i - 1]!.y, pts[i]!.y, k) });
      break;
    }
  }
  return out;
}

function path(ctx: CanvasRenderingContext2D, pts: readonly P[]): void {
  ctx.beginPath();
  pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
}

/** A vessel with blood running along it: grey, flooded blue up to `blue` of its length, dashes moving `offset` along. */
export function vessel(ctx: CanvasRenderingContext2D, pts: readonly P[], w: number, blue: number, offset: number, alpha: number): void {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = w;
  ctx.strokeStyle = GREY;
  path(ctx, pts);
  ctx.stroke();
  if (blue > 0) {
    ctx.strokeStyle = BLUE;
    path(ctx, upTo(pts, blue));
    ctx.stroke();
  }
  ctx.setLineDash([DASH / 3, (DASH * 2) / 3]);
  ctx.lineDashOffset = -offset;
  ctx.strokeStyle = PAPER_FILL;
  ctx.lineWidth = w * 0.42;
  ctx.globalAlpha *= 0.85;
  path(ctx, pts);
  ctx.stroke();
  ctx.setLineDash([]);
  // Which way it flows.
  const a = pts[pts.length - 2]!;
  const b = pts[pts.length - 1]!;
  const ang = Math.atan2(b.y - a.y, b.x - a.x);
  ctx.globalAlpha /= 0.85;
  ctx.strokeStyle = blue >= 1 ? BLUE : GREY;
  ctx.lineWidth = w * 0.7;
  ctx.beginPath();
  for (const s of [-1, 1]) {
    ctx.moveTo(b.x, b.y);
    ctx.lineTo(b.x - w * 1.9 * Math.cos(ang + s * 0.6), b.y - w * 1.9 * Math.sin(ang + s * 0.6));
  }
  ctx.stroke();
  ctx.restore();
}

/** A hand-drawn heart, its point down, swollen by `beat`. */
export function heartShape(x: number, y: number, s: number): Pt[] {
  return Array.from({ length: 30 }, (_, i) => {
    const a = (i / 30) * Math.PI * 2;
    const hx = 16 * Math.sin(a) ** 3;
    const hy = -(13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a));
    return pt(x + (hx * s) / 16, y + ((hy + 2) * s) / 16);
  });
}

function heart(d: Draw, id: HeartId, t: number, a: number): void {
  const h = HEARTS[id];
  const beat = beatAt(id, t);
  const lit = heartLitAt(id, t);
  const off = id === 3 ? stoppedAt(t) : 0;
  const shape = heartShape(h.x, h.y, h.s * (1 + 0.22 * beat + 0.08 * lit));
  d.pen.fill(shape, PAPER_FILL, a);
  d.pen.fill(shape, HEART, (0.55 + 0.35 * lit) * (1 - 0.6 * off) * a);
  d.pen.fill(shape, GREY, 0.5 * off * a);
  d.pen.clipped(shape, () => d.pen.fill(oval(h.x - h.s * 0.35, h.y - h.s * 0.3, h.s * 0.3, h.s * 0.2, 10), PAPER_FILL, 0.6 * a));
  d.pen.stroke([...shape, shape[0]!], 0.8 + 0.5 * lit, d.ink, a, false);
}

/** Everything inside the mantle (drawn clipped to it by octopus.ts), faded to `a`. */
export function drawInsides(d: Draw, t: number, a: number): void {
  const { ctx } = d.pen;
  const blue = blueAt(t);
  const gillFlow = gillFlowAt(t);
  const bodyFlow = bodyFlowAt(t);
  const go = gillFlowOffset(t);
  const bo = bodyFlowOffset(t);
  const flash = blueFlashAt(t);
  if (flash > 0) d.pen.fill(oval(0, -44, 26, 32, 20), BLUE, 0.3 * flash * a);
  for (const side of [-1, 1]) gill(d, side, a);
  for (const side of [-1, 1]) {
    vessel(ctx, gillSpine(side), 2.6, blue, go, gillFlow * a);
    vessel(ctx, gillOut(side), 2.6, blue, go, gillFlow * a);
  }
  vessel(ctx, AORTA, 3, blue, bo, bodyFlow * a);
  // Oxygen riding along to the main heart, on "oxygen".
  const o2 = oxygenLabel(t) * a;
  if (o2 > 0) {
    for (const side of [-1, 1]) {
      const pts = gillOut(side);
      for (const k of [0, 0.5]) {
        const u = ((go / 30 + k) % 1 + 1) % 1;
        const p = upTo(pts, Math.max(0.02, u)).at(-1)!;
        d.pen.fill(oval(p.x, p.y, 1.5, 1.5, 10), PAPER_FILL, o2);
        d.pen.hair([...oval(p.x, p.y, 1.5, 1.5, 10)], 0.4, BLUE, o2);
      }
    }
  }
  for (const id of [1, 2, 3] as const) heart(d, id, t, a);
}

/** The main heart's blood running out along an arm (arms 2 and 5), in the arms' local units. */
export function drawArmFlow(ctx: CanvasRenderingContext2D, spine: readonly P[], t: number, alpha: number): void {
  if (alpha <= 0) return;
  const from = Math.round(spine.length * 0.08);
  const to = Math.round(spine.length * 0.72);
  vessel(ctx, spine.slice(from, to), 2.2, blueAt(t), bodyFlowOffset(t), alpha * bodyFlowAt(t));
}
