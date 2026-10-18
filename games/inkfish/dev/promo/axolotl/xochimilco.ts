import { PAPER_FILL } from '../../../src/art/fish/kit';
import { ellipse, INK, type Pen } from '../../../src/art/pen';
import { createRng } from '../../../src/logic/rng';
import { VIDEO } from '../short';
import { bez, closed, livePen, pt } from './ink';
import { type Camera, CENTRE, SURFACE_Y, toScreen } from './story';

/**
 * Above the canal, seen as the camera pulls back out of the water: the canals
 * of Xochimilco in Mexico City. A hazy sky, the two snowy volcanoes far off,
 * the city's towers rising out of the haze, the far bank lined with tall slim
 * willows, and trajineras (the canal's painted flat boats, flowers on their
 * arches, no lettering) drifting on the water. In world px, like the canal.
 */

const S = SURFACE_Y;

/** Runs `draw` in world px (the camera's transform), with line widths given in screen px through `lw`. */
function inWorld(ctx: CanvasRenderingContext2D, cam: Camera, draw: (lw: (px: number) => number) => void): void {
  ctx.save();
  ctx.translate(CENTRE.x - cam.x * cam.zoom, CENTRE.y - cam.y * cam.zoom);
  ctx.scale(cam.zoom, cam.zoom);
  draw((px) => px / cam.zoom);
  ctx.restore();
}

function drawVolcanoes(pen: Pen, lw: (px: number) => number): void {
  // Popocatépetl, a tall cone, and the long ridge of Iztaccíhuatl beside it.
  const cone = [pt(500, S), pt(1250, S - 1180), pt(1420, S - 1230), pt(1600, S - 1170), pt(2500, S)];
  const ridge = [pt(-1400, S), pt(-900, S - 620), pt(-640, S - 760), pt(-380, S - 690), pt(-120, S - 840), pt(160, S - 700), pt(520, S - 420), pt(800, S)];
  for (const m of [ridge, cone]) {
    pen.fill(m, '#a6b5c3', 0.85);
    pen.hair(m, lw(1.2), '#56657a', 0.5);
  }
  pen.fill([pt(1180, S - 1080), pt(1250, S - 1180), pt(1420, S - 1230), pt(1600, S - 1170), pt(1680, S - 1050), pt(1530, S - 1100), pt(1400, S - 1040), pt(1300, S - 1100)], '#f1f4f6', 0.95);
  pen.fill([pt(-720, S - 700), pt(-640, S - 760), pt(-380, S - 690), pt(-120, S - 840), pt(60, S - 750), pt(-140, S - 770), pt(-380, S - 640), pt(-620, S - 700)], '#f1f4f6', 0.9);
}

const TOWERS = (() => {
  const rng = createRng(1815);
  const out: { x: number; w: number; h: number; tone: number }[] = [];
  for (let x = -1500; x < 2900; x += 90 + rng() * 140) out.push({ x, w: 90 + rng() * 150, h: 160 + rng() * (rng() < 0.15 ? 760 : 380), tone: rng() });
  return out;
})();

/** The city's towers, rising out of the haze by `rise` 0 .. 1. */
function drawCity(pen: Pen, lw: (px: number) => number, rise: number): void {
  if (rise <= 0.01) return;
  const sink = (1 - rise) * 260;
  for (const b of TOWERS) {
    const top = S - 40 - b.h + sink;
    const shape = [pt(b.x, S), pt(b.x, top), pt(b.x + b.w, top), pt(b.x + b.w, S)];
    pen.fill(shape, b.tone < 0.5 ? '#8f9aa6' : '#a3a9b0', 0.9 * rise);
    pen.hair(closed(shape), lw(1), '#4b5560', 0.6 * rise);
    // Rows of windows.
    for (let y = top + 30; y < S - 60; y += 46) pen.hair([pt(b.x + 14, y), pt(b.x + b.w - 14, y)], lw(1.4), '#5d6874', 0.35 * rise);
  }
}

const TREES = (() => {
  const rng = createRng(77);
  const out: { x: number; h: number; w: number }[] = [];
  for (let x = -1700; x < 3000; x += 170 + rng() * 150) out.push({ x, h: 650 + rng() * 380, w: 100 + rng() * 60 });
  return out;
})();

/** The far bank: a strip of green, lined with tall slim willows (ahuejotes). */
function drawBank(pen: Pen, lw: (px: number) => number): void {
  const bank = [pt(-2600, S + 2), pt(-2600, S - 70), pt(4000, S - 70), pt(4000, S + 2)];
  pen.fill(bank, '#6d8a4f', 1);
  for (const tr of TREES) {
    const base = pt(tr.x, S - 60);
    const crown = [...bez(pt(base.x - tr.w * 0.3, base.y - 60), pt(base.x - tr.w * 0.75, base.y - tr.h * 0.5), pt(base.x, base.y - tr.h), 12), ...bez(pt(base.x, base.y - tr.h), pt(base.x + tr.w * 0.75, base.y - tr.h * 0.5), pt(base.x + tr.w * 0.3, base.y - 60), 12)];
    pen.stroke([base, pt(base.x, base.y - 120)], lw(2), '#3d3324', 1, false);
    pen.fill(crown, '#4e6e3a', 1);
    pen.hatch(crown, lw(9), 1.2, lw(1.1), { color: '#2a3f20', alpha: 0.6 });
    pen.stroke(closed(crown), lw(1.6), '#22331a', 0.9, false);
  }
  pen.stroke([pt(-2600, S - 70), pt(4000, S - 70)], lw(1.6), '#2f4224', 0.8, false);
}

interface Boat {
  readonly x: number;
  readonly hull: readonly [string, string];
  readonly arch: string;
  readonly flowers: readonly string[];
}
const BOATS: readonly Boat[] = [
  { x: -620, hull: ['#2f8f83', '#f2c230'], arch: '#d8452f', flowers: ['#f2c230', '#2f7fd0', '#ffffff', '#5bb04a', '#f07aa0'] },
  { x: 640, hull: ['#c9392c', '#2a6fc0'], arch: '#f0b52c', flowers: ['#d8452f', '#2f8f83', '#f07aa0', '#ffffff', '#6b3fa0'] },
  { x: 1900, hull: ['#e0a52a', '#3e9a4a'], arch: '#2f7fd0', flowers: ['#f2c230', '#d8452f', '#ffffff', '#f07aa0', '#5bb04a'] },
];
const BOAT_LEN = 820;

/** A trajinera: a long flat hull in painted bands, a canopy on poles, and the painted arch at its bow. */
function drawBoat(pen: Pen, lw: (px: number) => number, b: Boat, x: number): void {
  const L = BOAT_LEN;
  const hull = [pt(x, S - 70), pt(x + L, S - 70), pt(x + L - 40, S + 30), pt(x + 40, S + 30)];
  pen.fill(hull, PAPER_FILL, 1);
  pen.fill(hull, b.hull[0], 0.95);
  pen.fill([pt(x + 8, S - 50), pt(x + L - 8, S - 50), pt(x + L - 14, S - 26), pt(x + 14, S - 26)], b.hull[1], 0.95);
  pen.stroke(closed(hull), lw(2.2), INK, 1, false);
  // The canopy: a flat roof on four poles, its edge scalloped.
  const roofY = S - 300;
  for (const k of [0.12, 0.4, 0.68, 0.92]) pen.stroke([pt(x + L * k, S - 70), pt(x + L * k, roofY)], lw(1.8), '#4a3726', 1, false);
  const roof = [pt(x + L * 0.05, roofY - 40), pt(x + L * 0.98, roofY - 40), pt(x + L * 0.98, roofY + 10), pt(x + L * 0.05, roofY + 10)];
  pen.fill(roof, '#e9dcc0', 1);
  pen.fill(roof, b.hull[0], 0.35);
  pen.stroke(closed(roof), lw(2), INK, 1, false);
  for (let i = 0; i < 10; i++) {
    const sx = x + L * 0.05 + (L * 0.93 * (i + 0.5)) / 10;
    pen.fill(ellipse(sx, roofY + 12, L * 0.045, 14, 10).filter((p) => p.y >= roofY + 10), b.hull[1], 0.9);
  }
  // The arch at the bow, painted with flowers and bands.
  const ax = x + L - 60;
  const arch = [...bez(pt(ax - 150, S - 70), pt(ax - 150, S - 420), pt(ax, S - 420), 10), ...bez(pt(ax, S - 420), pt(ax + 150, S - 420), pt(ax + 150, S - 70), 10)];
  pen.fill(arch, PAPER_FILL, 1);
  pen.fill(arch, b.arch, 0.95);
  pen.stroke(closed(arch), lw(2.2), INK, 1, false);
  const inner = arch.map((p) => pt(ax + (p.x - ax) * 0.72, S - 70 + (p.y - S + 70) * 0.78));
  pen.fill(inner, '#fff4dc', 0.9);
  pen.stroke(closed(inner), lw(1.4), INK, 0.8, false);
  b.flowers.forEach((c, i) => {
    const a = Math.PI * (0.12 + (0.76 * i) / (b.flowers.length - 1));
    const f = pt(ax - Math.cos(a) * 92, S - 120 - Math.sin(a) * 200);
    for (let k = 0; k < 5; k++) pen.fill(ellipse(f.x + Math.cos(k * 1.26) * 16, f.y + Math.sin(k * 1.26) * 16, 12, 12, 8), c, 0.95);
    pen.fill(ellipse(f.x, f.y, 9, 9, 8), '#f6d23a', 1);
  });
}

/** Everything above the water, if the surface is in the picture: drift moves the boats along. */
export function drawAboveWater(ctx: CanvasRenderingContext2D, cam: Camera, boil: number, rise: number, drift: number): void {
  const line = toScreen(cam, pt(0, S)).y;
  if (line <= 0) return;
  const sky = ctx.createLinearGradient(0, 0, 0, line);
  sky.addColorStop(0, '#d9cfb3');
  sky.addColorStop(0.7, '#e8e0c8');
  sky.addColorStop(1, '#cfd8c6');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, VIDEO.width, line + 2);
  const pen = livePen(ctx, boil, 5, 0.9);
  inWorld(ctx, cam, (lw) => {
    drawVolcanoes(pen, lw);
    drawCity(pen, lw, rise);
    drawBank(pen, lw);
    BOATS.forEach((b, i) => drawBoat(pen, lw, b, b.x + drift * (0.8 + 0.2 * i)));
  });
  // The murky water closes over the boats' bottoms, and a bright line marks the surface.
  ctx.save();
  ctx.fillStyle = 'rgba(80,120,92,0.6)';
  ctx.fillRect(0, line, VIDEO.width, 40 * cam.zoom);
  ctx.restore();
  pen.stroke([pt(-20, line), pt(VIDEO.width / 2, line + 2), pt(VIDEO.width + 20, line)], 2.4, '#f4f6e6', 0.8, false);
}
