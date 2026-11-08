import { type Draw } from '../../../src/art/kit';
import { VIPER_PAINT as V } from '../../../src/art/chapters/mountainsSnakePaint';
import { type Pt } from '../../../src/art/pen';
import { createRng } from '../../../src/logic/rng';
import { LINE, scale, scaleColour } from './bodyArt';
import { paintEye } from './eyeArt';
import { hex, mixRgb, sstep } from './noise';

/**
 * The sad close-up: the same viper turned to the camera, so the face reads at
 * phone size: the broad flat arrow of the head from the front, both horns
 * wilting, heavy lids sliding down, the pupils on the bare stub, and a small
 * downturned mouth at the blunt end of the snout.
 */

const P = (x: number, y: number): Pt => ({ x, y });

/** The right half of the head from the top of the crown round to the middle of the snout. */
const RIGHT: readonly Pt[] = [P(0, -214), P(92, -208), P(188, -160), P(262, -84), P(286, -20), P(262, 34), P(200, 96), P(142, 158), P(98, 196), P(46, 214), P(0, 218)];

const smoothEdge = (pts: readonly Pt[]): Pt[] => {
  const out: Pt[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i]!;
    const b = pts[i + 1]!;
    for (let j = 0; j < 6; j++) out.push(P(a.x + ((b.x - a.x) * j) / 6, a.y + ((b.y - a.y) * j) / 6));
  }
  return out;
};

const SHAPE = (() => {
  const r = smoothEdge(RIGHT);
  return [...r, ...r.map((p) => P(-p.x, p.y)).reverse()];
})();

const pathOf = (pts: readonly Pt[]): Path2D => {
  const p = new Path2D();
  pts.forEach((q, i) => (i === 0 ? p.moveTo(q.x, q.y) : p.lineTo(q.x, q.y)));
  p.closePath();
  return p;
};

function faceSkin(ctx: CanvasRenderingContext2D): void {
  const rng = createRng(61);
  const path = pathOf(SHAPE);
  ctx.save();
  ctx.fillStyle = '#2b2219';
  ctx.fill(path);
  ctx.clip(path);
  for (let row = 0; row <= 19; row++) {
    const y = -226 + row * 24.5;
    const cols = 14;
    for (let c = -cols; c <= cols; c++) {
      const x = (c + (row % 2 ? 0.5 : 0)) * 24;
      const value = rng();
      const nx = x / 330;
      const ny = 0.1 + (y / 240) * 0.78;
      const nz = Math.sqrt(Math.max(0.05, 1 - nx * nx - ny * ny));
      const streak = Math.abs(Math.abs(x) - (150 + (y + 20) * -0.15 + 24)) < 34 && y > -20 && y < 80 ? 1 : 0;
      const chevron = y < -96 && Math.abs(Math.abs(x) * 0.55 + y + 148) < 14 ? 1 : 0;
      const col = scaleColour(nx * 0.7 - 0.08, ny * 0.5 - 0.42, nz, 0.7, streak || chevron, value, 0.34 + value * 0.5);
      const pale = sstep(120, 190, y);
      scale(ctx, x, y, Math.sign(x) * 0.25, -0.97, 0.97, Math.sign(x) * 0.25, 38, 28, mixRgb(col, hex(V.lip), pale * 0.75), 0.9);
    }
  }
  ctx.restore();
}

function wiltedHorn(d: Draw, x: number, side: number): void {
  const { ctx } = d.pen;
  const shape = [P(x - 30 * side, -128), P(x + 8 * side, -196), P(x + 70 * side, -212), P(x + 44 * side, -160), P(x + 34 * side, -118)];
  const g = ctx.createLinearGradient(x, -212, x, -118);
  g.addColorStop(0, '#efe7d4');
  g.addColorStop(1, '#7a6854');
  ctx.fillStyle = g;
  ctx.fill(pathOf(shape));
  d.pen.stroke([...shape, shape[0]!], 3, LINE, 0.92, false);
  d.pen.hair([P(x, -138), P(x + 18 * side, -178), P(x + 58 * side, -206)], 2.6, '#fff8e8', 0.8);
}

function sadBrow(d: Draw, x: number, side: number, sorrow: number): void {
  const { ctx } = d.pen;
  const drop = 34 * sorrow;
  const inner = -108 - 4 * sorrow;
  const outer = -80 + drop;
  const shape = [P(x - 78 * side, inner + 8), P(x, -122 + drop * 0.34), P(x + 92 * side, outer), P(x + 60 * side, outer + 16), P(x, -94 + drop * 0.5), P(x - 66 * side, inner + 30)];
  const g = ctx.createLinearGradient(0, -126, 0, -60);
  g.addColorStop(0, '#d8cfbb');
  g.addColorStop(1, '#5e5044');
  ctx.fillStyle = g;
  ctx.fill(pathOf(shape));
  d.pen.stroke([...shape, shape[0]!], 3.4, LINE, 0.92, false);
}

/** The mouth: a small line, its corners turned down, at the tip of the snout. */
function mouth(d: Draw, sorrow: number): void {
  const down = 34 * sorrow;
  const w = 88;
  const line = Array.from({ length: 13 }, (_, i) => {
    const u = i / 12 - 0.5;
    return P(u * 2 * w, 176 - 4 + down * (4 * u * u) * 1 - down * 0.2);
  });
  d.pen.stroke(line, 7, LINE, 0.95, false);
  d.pen.hair(line.map((q) => P(q.x, q.y + 6)), 2, '#f1e6d0', 0.7);
  for (const s of [-1, 1]) {
    d.pen.fill([P(s * 42 - 13, 118), P(s * 42 + 13, 110), P(s * 42 + 9, 126), P(s * 42 - 10, 132)], '#17100c', 0.95);
    d.pen.hair([P(s * 42 - 16, 112), P(s * 42 + 2, 102), P(s * 42 + 17, 106)], 2.2, '#efe7d4', 0.7);
  }
}

/** The face, centred at (x, y); `look` slides the pupils (0 towards the stub on the left). */
export function drawSadFace(d: Draw, x: number, y: number, size: number, lid: number, sorrow: number, look: number): void {
  const { ctx } = d.pen;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size, size);
  wiltedHorn(d, -158, -1);
  wiltedHorn(d, 158, 1);
  faceSkin(ctx);
  d.pen.stroke([...SHAPE.filter((_, i) => i % 3 === 0), SHAPE[0]!], 3.6, LINE, 0.92, false);
  for (const side of [-1, 1]) {
    const ex = side * 148;
    paintEye(d, ex, -46, 62, lid, look, -side * sorrow);
    sadBrow(d, side * 148, -side * -1, sorrow);
  }
  mouth(d, sorrow);
  ctx.restore();
}
