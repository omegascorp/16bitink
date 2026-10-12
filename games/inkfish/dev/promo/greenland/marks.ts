import { INK, PAPER, Pen, type Pt } from '../../../src/art/pen';
import { drawTextLine, INK_ON_PAPER, type TextInk } from '../captions';
import { clamp01, ramp } from '../short';
import { toScreen } from './scenery';
import {
  type Camera, FLY_FROM, FLY_TO, grownM, GROW_FROM, GROW_TO, onShark, SHARK_M, stampAt, stampBurst, TAPE_ACROSS, tapeOut, tapeShow, yearsAt,
} from './story';

/**
 * Marks drawn over the scene: the tape measure laid along the shark's flank,
 * filling a metre as a century of growth is counted, and the big
 * "≈ 400 years" stamp that later flies up to the ribbon.
 */

const SPOKEN = '#f5c84a';
const CHALK = '#dcd6e6';
const TAPE = '#efe2bf';
const GOLD_ON_INK: TextInk = { fill: SPOKEN, halo: '#05091a' };
const PAPER_ON_INK: TextInk = { fill: PAPER, halo: '#05091a' };
/** The tape's width, world px. */
const TAPE_W = 34;

/** A point on the tape's middle line `m` metres from the tail end, on screen, and the way "up" across it. */
function tapeAt(cam: Camera, m: number, t: number): { readonly at: Pt; readonly up: Pt } {
  const along = (mm: number): number => 1 - mm / SHARK_M;
  const p = onShark(along(m), TAPE_ACROSS, t);
  const q = onShark(along(m + 0.02), TAPE_ACROSS, t);
  const a = toScreen(cam, p.x, p.y);
  const b = toScreen(cam, q.x, q.y);
  const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  return { at: a, up: { x: (b.y - a.y) / len, y: -(b.x - a.x) / len } };
}

const offset = (p: Pt, d: Pt, k: number): Pt => ({ x: p.x + d.x * k, y: p.y + d.y * k });

/** The tape band from `m0` to `m1` metres, on screen. */
function band(cam: Camera, m0: number, m1: number, t: number, w: number): Pt[] {
  const steps = Math.max(2, Math.ceil((m1 - m0) / 0.1));
  const mid = Array.from({ length: steps + 1 }, (_, i) => tapeAt(cam, m0 + ((m1 - m0) * i) / steps, t));
  return [...mid.map((s) => offset(s.at, s.up, w / 2)), ...mid.reverse().map((s) => offset(s.at, s.up, -w / 2))];
}

function fill(ctx: CanvasRenderingContext2D, pts: readonly Pt[], colour: string, alpha: number): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = colour;
  ctx.beginPath();
  pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** The tape: unrolling from the tail to the nose, its ticks, the century of growth filling it, and the years counted. */
export function drawTape(ctx: CanvasRenderingContext2D, cam: Camera, t: number, boil: number): void {
  const show = tapeShow(t);
  if (show <= 0) return;
  const out = tapeOut(t) * SHARK_M;
  if (out <= 0.01) return;
  const w = TAPE_W * cam.zoom;
  const pen = new Pen(ctx, 100 + boil * 19, 0.8);
  fill(ctx, band(cam, 0, out, t, w), TAPE, show * 0.95);
  const grown = Math.min(out, grownM(t));
  if (grown > 0.005) fill(ctx, band(cam, 0, grown, t, w), SPOKEN, show * 0.8);
  // Ticks every 10 cm, longer every 50, longest every metre, numbered.
  for (let cm = 0; cm <= out * 100 + 1e-6; cm += 10) {
    const s = tapeAt(cam, cm / 100, t);
    const len = cm % 100 === 0 ? 0.62 : cm % 50 === 0 ? 0.42 : 0.24;
    const top = offset(s.at, s.up, w / 2);
    pen.hair([top, offset(top, s.up, -w * len)], cm % 100 === 0 ? 2.4 : 1.4, INK, show * 0.9);
    if (cm % 100 === 0 && cm > 0) {
      const metre = cm / 100;
      const lit = metre === 1 ? ramp(t, GROW_TO - 0.15, GROW_TO + 0.1) : 0;
      const label = offset(s.at, s.up, -w * 0.05);
      drawTextLine(ctx, `${metre} m`, label.x + 26, label.y + 12, 34 * (1 + 0.5 * lit), 700, show, lit > 0.5 ? GOLD_ON_INK : INK_ON_PAPER);
    }
  }
  const edges = band(cam, 0, out, t, w);
  const half = edges.length / 2;
  pen.stroke(edges.slice(0, half), 2, INK, show, false);
  pen.stroke(edges.slice(half), 2, INK, show, false);
  drawRoll(ctx, pen, tapeAt(cam, out, t), w, show * (1 - clamp01((tapeOut(t) - 0.97) / 0.03)));
  drawYearsTag(ctx, pen, cam, t, show);
}

/** The roll the tape unwinds from, at its leading end. */
function drawRoll(ctx: CanvasRenderingContext2D, pen: Pen, end: { readonly at: Pt; readonly up: Pt }, w: number, alpha: number): void {
  if (alpha <= 0) return;
  const r = w * 0.75;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = TAPE;
  ctx.beginPath();
  ctx.arc(end.at.x, end.at.y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  const spiral = Array.from({ length: 30 }, (_, i) => {
    const a = i * 0.55;
    const rr = r * (0.15 + (0.85 * i) / 29);
    return { x: end.at.x + Math.cos(a) * rr, y: end.at.y + Math.sin(a) * rr };
  });
  pen.stroke(spiral, 1.8, INK, alpha, false);
}

/** "37 years" riding the end of the filled metre, counting up as it creeps along. */
function drawYearsTag(ctx: CanvasRenderingContext2D, pen: Pen, cam: Camera, t: number, show: number): void {
  const counting = ramp(t, GROW_FROM - 0.2, GROW_FROM);
  if (counting <= 0) return;
  const years = Math.round(yearsAt(t));
  const end = tapeAt(cam, grownM(t), t);
  const base = offset(end.at, end.up, TAPE_W * cam.zoom * 0.5 + 6);
  const top = offset(base, end.up, 46);
  pen.stroke([base, top], 3, SPOKEN, show * counting, false);
  const done = ramp(t, GROW_TO - 0.1, GROW_TO + 0.15);
  drawTextLine(ctx, `${years} year${years === 1 ? '' : 's'}`, top.x, top.y - 14, 64 * (1 + 0.15 * done), 700, show * counting, GOLD_ON_INK);
}

/** The stamp: "≈ 400 / years", popping in with an ink burst, later shrinking up onto the ribbon. */
export function drawStamp(ctx: CanvasRenderingContext2D, t: number, boil: number): number {
  const s = stampAt(t);
  if (s.show <= 0) return 0;
  const pen = new Pen(ctx, 400 + boil * 23, 1.2);
  const scale = s.size * s.pop;
  const fly = ramp(t, FLY_FROM, FLY_TO);
  const u = stampBurst(t);
  if (u > 0 && u < 1) {
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2 + 0.2;
      const [r0, r1] = [260 * (0.55 + 0.5 * u), 260 * (0.75 + 0.7 * u)];
      pen.stroke([{ x: s.x + Math.cos(a) * r0, y: s.y + Math.sin(a) * r0 * 0.7 }, { x: s.x + Math.cos(a) * r1, y: s.y + Math.sin(a) * r1 * 0.7 }], 5, CHALK, s.show * (1 - u), false);
    }
  }
  ctx.save();
  ctx.translate(s.x, s.y);
  ctx.rotate(-0.05 * (1 - fly));
  // A hand-drawn ring round it, like a stamp, let go of as it flies up.
  const ring = Array.from({ length: 49 }, (_, i) => {
    const a = (i / 48) * Math.PI * 2 * 1.04 - 0.2;
    return { x: Math.cos(a) * 300 * scale, y: Math.sin(a) * 175 * scale };
  });
  pen.stroke(ring, 6 * Math.max(0.4, scale), SPOKEN, s.show * (1 - fly), false);
  drawTextLine(ctx, '≈ 400', 0, 30 * scale, 210 * scale, 700, s.show, GOLD_ON_INK);
  drawTextLine(ctx, 'years', 0, 130 * scale, 110 * scale, 700, s.show, PAPER_ON_INK);
  ctx.restore();
  return s.show * fly;
}
