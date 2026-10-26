import { PAPER_FILL } from '../../../src/art/fish/kit';
import { ellipse, INK, type Pen, type Pt } from '../../../src/art/pen';
import { livePen, smoothOpen } from './ink';
import { frontAt, PREY_LEN, preyHalfWidth, preyOutline, type SpinePt, spineAt } from './shape';

/**
 * The brown-banded bamboo shark, drawn live along its spine every frame (it
 * bends and its tail flips): slender and pale cream, with bold brown bands,
 * shaded on its far side, a little rolled so its two dorsal fins lean over
 * and show from above like shark fins; pelvic fins by the wobbegong's lip,
 * a long tail with its low fin and notch. Only its back half shows: it's
 * drawn clipped to the water in front of the wobbegong's upper jaw.
 *
 * Also: its swallowed front half seen through the wobbegong (an X-ray on
 * "head-first"), and the glow round it when the narrator names it.
 */

const CREAM = '#efe2c2';
const BAND = '#6b4527';
const SHADE = '#3f2c1b';
const GLOW = '255,226,120';
const XRAY = '#c8f0ff';

/** Its bands: centre and width along it, s mm from its snout. */
const BANDS: readonly (readonly [number, number])[] = [
  [140, 62], [235, 62], [330, 60], [430, 58], [532, 54], [612, 50], [690, 46], [766, 42], [838, 38], [904, 32], [962, 24],
];

/** Clips to the water in front of the wobbegong's upper jaw (its head is below it on screen). */
export function clipOutsideMouth(ctx: CanvasRenderingContext2D): void {
  const BIG = 6000;
  ctx.beginPath();
  ctx.moveTo(-BIG, -BIG);
  ctx.lineTo(BIG, -BIG);
  ctx.lineTo(BIG, 200);
  for (let x = 272; x >= -272; x -= 8) ctx.lineTo(x, frontAt(x) + 3);
  ctx.lineTo(-BIG, 200);
  ctx.closePath();
  ctx.clip();
}

/** A point beside the spine: at s, `off` mm to its right (+) or left (-). */
function beside(spine: readonly SpinePt[], s: number, off: number): Pt {
  const q = spineAt(spine, s);
  return { x: q.p.x + q.n.x * off, y: q.p.y + q.n.y * off };
}

/**
 * A shark fin leaning over to one side: its base along the spine from s0 to
 * s1, `height` mm tall: a curved leading edge sloping back to a rounded
 * apex, a hollow trailing edge and a free rear tip behind the base.
 */
function sharkFin(spine: readonly SpinePt[], s0: number, s1: number, height: number, side: 1 | -1, root = 0.3): Pt[] {
  const L = s1 - s0;
  const at = (a: number, o: number): Pt => {
    const s = s0 + a * L;
    return beside(spine, s, side * (preyHalfWidth(Math.min(PREY_LEN, s)) * root + height * o));
  };
  return smoothOpen([at(0, 0), at(0.22, 0.5), at(0.5, 0.86), at(0.72, 1), at(0.86, 0.9), at(0.84, 0.5), at(0.98, 0.2), at(1.22, 0.06), at(1, 0)], 4);
}

/** The long, low tail fin along its underside. */
function tailFin(spine: readonly SpinePt[], side: 1 | -1): Pt[] {
  const edge: Pt[] = [];
  for (let s = 800; s <= PREY_LEN; s += 10) {
    const f = (s - 800) / (PREY_LEN - 800);
    const h = 8 + 44 * Math.sin(Math.PI * Math.min(1, f * 1.1)) ** 0.6;
    edge.push(beside(spine, s, side * (preyHalfWidth(s) + h)));
  }
  const base = [beside(spine, PREY_LEN, 0), beside(spine, 900, side * preyHalfWidth(900) * 0.5), beside(spine, 800, side * preyHalfWidth(800) * 0.6)];
  return [...edge, ...base];
}

function paintFin(pen: Pen, shape: readonly Pt[], shade: number): void {
  pen.fill(shape, PAPER_FILL, 1);
  pen.fill(shape, CREAM, 0.95);
  pen.fill(shape, BAND, 0.18 + shade);
  pen.hatch(shape, 5, 1.1, 0.7, { color: SHADE, alpha: 0.2 });
  pen.stroke([...shape, shape[0]!], 2.4, INK, 1, false);
}

/** Its back half, from where it disappears into the mouth to the tail tip. */
export function drawPrey(ctx: CanvasRenderingContext2D, spine: readonly SpinePt[], inside: number, boil: number): void {
  const pen = livePen(ctx, 61, boil, 0.55);
  const s0 = inside - 40;
  // Rolled onto its side as it struggles: seen in profile, its back on the outside of its curl.
  const BACK = -1;
  const BELLY = 1;
  // The fins first, so the body covers their roots: two dorsals on its back; pelvic, anal and the long low tail fin under it.
  for (const [a, b, h] of [[590, 662, 84], [700, 762, 68]] as const) paintFin(pen, sharkFin(spine, a, b, h, BACK, 0.9), 0.12);
  paintFin(pen, sharkFin(spine, 540, 600, 52, BELLY, 0.9), 0.04);
  paintFin(pen, sharkFin(spine, 772, 812, 30, BELLY, 0.9), 0.04);
  paintFin(pen, tailFin(spine, BELLY), 0.06);

  const body = preyOutline(spine, s0);
  pen.fill(body, PAPER_FILL, 1);
  pen.fill(body, CREAM, 0.97);
  pen.clipped(body, () => {
    const along = spine.filter((q) => q.s >= s0);
    const strip = (k0: number, k1: number): Pt[] => [...along.map((q) => beside(spine, q.s, preyHalfWidth(q.s) * k0)), ...along.map((q) => beside(spine, q.s, preyHalfWidth(q.s) * k1)).reverse()];
    // Soft washes (blurred, as wet paint spreads): a darker back fading to a pale belly, then the bands.
    const m = ctx.getTransform();
    const px = Math.hypot(m.a, m.b);
    ctx.save();
    ctx.filter = `blur(${(14 * px).toFixed(1)}px)`;
    pen.fill(strip(BACK * 1.4, BACK * 0.05), BAND, 0.32);
    pen.fill(strip(BELLY * 0.3, BELLY * 1.4), '#fffaf0', 0.5);
    ctx.filter = `blur(${(3.5 * px).toFixed(1)}px)`;
    for (const [c, w] of BANDS) {
      if (c + w < s0) continue;
      // Each band bowed round the body.
      const from = Math.max(s0, c - w / 2);
      const to = Math.min(PREY_LEN, c + w / 2);
      const bow = (j: number): number => 12 * (1 - (j / 1.4) ** 2);
      const pts: Pt[] = [];
      for (let j = -1.4; j <= 1.4 + 1e-6; j += 0.1) pts.push(beside(spine, to + bow(j), preyHalfWidth(to) * j));
      for (let j = 1.4; j >= -1.4 - 1e-6; j -= 0.1) pts.push(beside(spine, from + bow(j), preyHalfWidth(from) * j));
      pen.fill(pts, BAND, 0.62);
    }
    ctx.restore();
  });
  const edge = (k: number): Pt[] => spine.filter((q) => q.s >= s0).map((q) => beside(spine, q.s, preyHalfWidth(q.s) * k));
  pen.stroke(edge(BACK), 3, INK, 1);
  pen.stroke(edge(BELLY), 2.6, INK, 1);
}

/** The glow round it as the narrator names it, 0 .. 1. */
export function drawPreyGlow(ctx: CanvasRenderingContext2D, spine: readonly SpinePt[], inside: number, amount: number, t: number): void {
  if (amount <= 0.01) return;
  const body = preyOutline(spine, inside - 10);
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.globalCompositeOperation = 'screen';
  const pulse = 0.85 + 0.15 * Math.sin(t * 12);
  for (const [w, a] of [[46, 0.18], [22, 0.35], [8, 0.8]] as const) {
    ctx.globalAlpha = a * amount * pulse;
    ctx.strokeStyle = `rgb(${GLOW})`;
    ctx.lineWidth = w;
    ctx.beginPath();
    body.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.closePath();
    ctx.stroke();
  }
  ctx.restore();
}

/** Its swallowed front half seen through the wobbegong's head: a dark window, the shark a bright ghost in it, head deepest. */
export function drawXray(ctx: CanvasRenderingContext2D, spine: readonly SpinePt[], inside: number, amount: number, boil: number): void {
  if (amount <= 0.01) return;
  const pen = livePen(ctx, 71, boil, 0.5);
  const ghost = preyOutline(spine, 0, inside + 4);
  const head = spineAt(spine, 0);
  ctx.save();
  ctx.globalAlpha = amount;
  // The window: the wobbegong's skin darkened round its throat.
  const win = ellipse(0, inside * 0.5, 150, inside * 0.5 + 90, 32);
  ctx.save();
  ctx.filter = 'blur(10px)';
  pen.fill(win, '#081626', 0.62);
  ctx.restore();
  pen.fill(ghost, XRAY, 0.28);
  for (const k of [-1, 1] as const) {
    // Its pectoral fins, its eyes, and the five gill slits behind them on each side.
    const root = spineAt(spine, 150);
    const fin = smoothOpen([{ x: root.p.x + k * 52, y: root.p.y - 40 }, { x: root.p.x + k * 128, y: root.p.y + 50 }, { x: root.p.x + k * 92, y: root.p.y + 62 }, { x: root.p.x + k * 54, y: root.p.y + 30 }], 3);
    pen.fill(fin, XRAY, 0.3);
    pen.hair([...fin, fin[0]!], 2.2, XRAY, 0.95);
    pen.fill(ellipse(head.p.x + k * 24, head.p.y - 46, 8, 6, 10), '#ffffff', 1);
    for (let g = 0; g < 5; g++) {
      const q = spineAt(spine, 92 + g * 11);
      const w = preyHalfWidth(92 + g * 11);
      pen.hair([{ x: q.p.x + k * w * 0.55, y: q.p.y - 4 }, { x: q.p.x + k * w * 0.85, y: q.p.y + 3 }], 2.2, XRAY, 0.85);
    }
  }
  // Its mouth, a little smile under the snout.
  pen.hair([{ x: head.p.x - 18, y: head.p.y - 22 }, { x: head.p.x, y: head.p.y - 16 }, { x: head.p.x + 18, y: head.p.y - 22 }], 2, XRAY, 0.8);
  ctx.globalCompositeOperation = 'screen';
  ctx.lineJoin = 'round';
  for (const [w, a] of [[16, 0.25], [5, 1]] as const) {
    ctx.globalAlpha = a * amount;
    ctx.strokeStyle = XRAY;
    ctx.lineWidth = w;
    ctx.beginPath();
    ghost.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.stroke();
  }
  ctx.restore();
}
