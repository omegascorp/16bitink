import { type Draw } from '../../../src/art/kit';
import { VIPER_PAINT as V } from '../../../src/art/chapters/mountainsSnakePaint';
import { type Pt } from '../../../src/art/pen';
import { createRng } from '../../../src/logic/rng';
import { LINE, scale, scaleColour, through } from './bodyArt';
import { paintEye } from './eyeArt';
import { css, hex, mixRgb, vnoise } from './noise';
import { type HeadPose } from './story';

/**
 * The horned viper's head, a broad flat arrow seen from a little above and
 * to the side: narrow neck, bulging jaw angles, a short blunt snout, heavy
 * brows, a small pointed horn scale over each eye, small rough keeled scales
 * all over, a dark streak from the eye to the jaw's corner. Drawn from the jaw
 * hinge, +x along the jaw, -y up. The upper jaw and the lower hinge open past
 * 120 degrees round a pale pink lining and a dark throat; the fangs swing out
 * of their sheaths as they do. The two halves are drawn apart, so that what
 * the jaws close on can lie between them.
 */

const P = (x: number, y: number): Pt => ({ x, y });

const TOP = through([P(398, -36), P(388, -64), P(350, -90), P(300, -110), P(245, -128), P(175, -142), P(95, -154), P(25, -152), P(-30, -126), P(-66, -88)]);
const LIP = through([P(398, -28), P(358, -18), P(296, -13), P(225, -11), P(155, -8), P(95, 2), P(45, 14), P(4, 20), P(-22, 10), P(-44, -26)]);
const CHIN = through([P(392, -20), P(340, 2), P(262, 18), P(176, 28), P(92, 38), P(30, 44), P(-26, 34), P(-48, 8), P(-44, -26)]);

const at = (line: readonly Pt[], u: number): Pt => line[Math.min(line.length - 1, Math.round(u * (line.length - 1)))]!;
const lerp = (a: Pt, b: Pt, v: number): Pt => P(a.x + (b.x - a.x) * v, a.y + (b.y - a.y) * v);
const outline = (a: readonly Pt[], b: readonly Pt[]): Pt[] => [...a, ...[...b].reverse()];
const pathOf = (pts: readonly Pt[]): Path2D => {
  const p = new Path2D();
  pts.forEach((q, i) => (i === 0 ? p.moveTo(q.x, q.y) : p.lineTo(q.x, q.y)));
  p.closePath();
  return p;
};
const rot = (p: Pt, a: number): Pt => P(p.x * Math.cos(a) - p.y * Math.sin(a), p.x * Math.sin(a) + p.y * Math.cos(a));

const UNDER = '#4a3c30';
const EYE = P(258, -74);
const CRANIUM = outline(TOP, LIP);
const JAW = outline(LIP, CHIN);
const UP = 1.2;
const DOWN = 1.02;

const line3 = (ax: number, ay: number, bx: number, by: number, x: number, y: number): number => {
  const dx = bx - ax;
  const dy = by - ay;
  const u = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(x - ax - dx * u, y - ay - dy * u);
};

/** Is this place on the head one of its dark marks? (the streak from the eye to the jaw's corner, the crown's chevrons) */
function markAt(x: number, y: number): number {
  if (line3(235, -62, 30, -2, x, y) < 19 + 0.03 * (235 - x)) return 1;
  if (line3(170, -140, 110, -92, x, y) < 15 || line3(110, -92, 30, -142, x, y) < 15) return 1;
  if (line3(330, -92, 288, -60, x, y) < 8) return 1;
  return 0;
}

function skin(ctx: CanvasRenderingContext2D, shape: readonly Pt[], top: readonly Pt[], low: readonly Pt[], seed: number, cols: number, rows: number, jaw: boolean): void {
  ctx.save();
  const path = pathOf(shape);
  ctx.fillStyle = UNDER;
  ctx.fill(path);
  ctx.clip(path);
  const rng = createRng(seed);
  for (let c = cols; c >= -1; c--) {
    const u = c / cols;
    const a = at(top, Math.max(0, u));
    const b = at(low, Math.max(0, u));
    for (let r = 0; r <= rows; r++) {
      const v = (r + (c % 2 ? 0.5 : 0)) / rows;
      const p = lerp(a, b, v);
      const size = 15 + 13 * Math.min(1, u * 1.3);
      const dorsal = jaw ? -0.1 - v * 0.6 : 0.95 - v * 1.1;
      const ny = jaw ? 0.45 + v * 0.45 : -0.85 + v * 1.05;
      const nz = Math.sqrt(Math.max(0.04, 1 - ny * ny));
      const value = rng();
      const mark = jaw ? 0 : markAt(p.x, p.y);
      let col = scaleColour(0.18, ny, nz, 0.5, mark, value, 0.32 + value * 0.5);
      if (jaw) col = mixRgb(col, hex(V.lip), 0.35);
      if (dorsal > 0.5 && !mark) col = mixRgb(col, hex(V.stone), 0.18);
      scale(ctx, p.x, p.y, -0.98, 0.14, 0.14, 0.98, size * 1.5, size * 1.04, col, 0.9);
    }
  }
  ctx.restore();
}

/** The row of pale lip scales along an edge; `side` is the way into the jaw. */
function lipScales(d: Draw, edge: readonly Pt[], side: number, seed: number): void {
  const { ctx } = d.pen;
  const n = 10;
  for (let i = 0; i < n; i++) {
    const u0 = 0.02 + (i / n) * 0.68;
    const u1 = 0.02 + ((i + 1) / n) * 0.68;
    const a = at(edge, u0);
    const b = at(edge, u1);
    const h = (side > 0 ? 9 + 3 * (i / n) : 12 + 4 * (i / n)) * side;
    const c = 0.82 + 0.18 * vnoise(i * 2.7, seed);
    const shape = [a, b, P(b.x, b.y + h), P((a.x + b.x) / 2, a.y + h * 1.12), P(a.x, a.y + h)];
    ctx.fillStyle = css(mixRgb(hex(V.ground), hex(V.lip), c * 0.45));
    ctx.fill(pathOf(shape));
    d.pen.hair([b, P(b.x, b.y + h)], 1.3, LINE, 0.55);
    d.pen.hair([P(a.x, a.y + h), P((a.x + b.x) / 2, a.y + h * 1.12), P(b.x, b.y + h)], 1.2, LINE, 0.4);
  }
}

/** The small pointed horn scale over the eye, ringed with smaller spiky ones. */
function horn(d: Draw, x: number, y: number, tall: number, wide: number, tilt: number, far: boolean): void {
  const { ctx } = d.pen;
  const tip = P(x - tilt, y - tall);
  const shape = [P(x - wide, y + 6), P(x - wide * 0.62 - tilt * 0.4, y - tall * 0.5), tip, P(x + wide * 0.42 - tilt * 0.3, y - tall * 0.42), P(x + wide * 0.86, y + 6)];
  const g = ctx.createLinearGradient(x - wide, y - tall, x + wide, y);
  g.addColorStop(0, far ? '#b5a890' : '#efe7d4');
  g.addColorStop(0.55, far ? '#8a7c68' : '#c7b08a');
  g.addColorStop(1, far ? '#574a3e' : '#6e5c4a');
  ctx.fillStyle = g;
  ctx.fill(pathOf(shape));
  d.pen.stroke([...shape, shape[0]!], 2.6, LINE, 0.9, false);
  d.pen.hair([P(x, y - 2), P(x - tilt * 0.5, y - tall * 0.56), P(tip.x + 1, tip.y + 8)], 2.2, far ? '#c9bda6' : '#fff8e8', 0.85);
  if (far) return;
  for (let i = -3; i <= 3; i++) {
    const bx = x + i * wide * 0.5;
    const by = y + 9 - Math.abs(i) * 1.5;
    const s = [P(bx - 9, by + 8), P(bx - 3 - i, by - 19 + Math.abs(i) * 2), P(bx + 8, by + 8)];
    ctx.fillStyle = i % 2 ? '#a8977c' : '#c9b99a';
    ctx.fill(pathOf(s));
    d.pen.stroke([...s, s[0]!], 1.6, LINE, 0.8, false);
  }
}

/** The brow: a heavy ridge over the eye, casting its shade down on it. */
function brow(d: Draw, sorrow: number): void {
  const { ctx } = d.pen;
  const drop = sorrow * 16;
  const shape = [P(198, -92 + drop * 0.8), P(236, -116), P(290, -110), P(324, -86), P(296, -94), P(250, -104 + drop * 0.6), P(214, -88 + drop)];
  const g = ctx.createLinearGradient(0, -118, 0, -84);
  g.addColorStop(0, '#d8cfbb');
  g.addColorStop(1, '#6d5f50');
  ctx.fillStyle = g;
  ctx.fill(pathOf(shape));
  d.pen.stroke([shape[0]!, ...shape.slice(4), shape[3]!], 3.2, LINE, 0.9, false);
  d.pen.hair(shape.slice(0, 4), 1.6, LINE, 0.55);
}

function ridge(d: Draw): void {
  // The hard edge between the crown and the side of the head, lit along the top.
  const c = [P(372, -66), P(322, -82), P(300, -88)];
  d.pen.hair(c, 4, '#efe7d4', 0.6);
  d.pen.hair(c.map((q) => P(q.x, q.y + 4)), 2, '#3a2d24', 0.5);
  d.pen.fill([P(372, -58), P(362, -52), P(354, -48), P(350, -56), P(360, -62)], '#17100c', 0.95);
  d.pen.hair([P(376, -62), P(362, -68), P(346, -60)], 2, '#efe7d4', 0.7);
}

/** Pale pink along the inside of a jaw. */
function lining(ctx: CanvasRenderingContext2D, d: Draw, edge: readonly Pt[], deep: number): void {
  const a = edge.slice(0, Math.round(edge.length * 0.82));
  const b = a.map((p, i) => P(p.x - 6, p.y + deep * Math.sin(Math.PI * (0.1 + 0.8 * (i / a.length)))));
  const g = ctx.createLinearGradient(0, a[0]!.y, 0, a[0]!.y + deep);
  g.addColorStop(0, V.mouth);
  g.addColorStop(1, V.mouthDeep);
  ctx.fillStyle = g;
  ctx.fill(pathOf(outline(a, b)));
  d.pen.hair(a, 2.2, '#f7e4dc', 0.9);
  d.pen.hair(b, 1.6, '#7a4047', 0.6);
  for (let i = 4; i < b.length - 6; i += 14) d.pen.hair([P(a[i]!.x, a[i]!.y + deep * 0.14), lerp(a[i]!, b[i]!, 0.8)], 1.2, '#b97d80', 0.5);
}

/** One fang: a curved needle swung out by `out`, its root in a pink sheath. */
function fang(d: Draw, x: number, y: number, out: number, len: number, far: boolean): void {
  const { ctx } = d.pen;
  const a = Math.PI - 0.1 - out * 1.32;
  const dir = P(Math.cos(a), Math.sin(a));
  const side = P(-dir.y, dir.x);
  const pt = (u: number, s: number): Pt => P(x + dir.x * len * u + side.x * (s * (1 - u) * 16 - 26 * u * u), y + dir.y * len * u + side.y * (s * (1 - u) * 16 - 26 * u * u));
  const shape = [pt(0, -1), pt(0.35, -1), pt(0.7, -1), pt(1, 0), pt(0.7, 1), pt(0.35, 1), pt(0, 1)];
  ctx.fillStyle = far ? '#d9d0bc' : V.fang;
  ctx.fill(pathOf(shape));
  d.pen.stroke([...shape, shape[0]!], 2, LINE, 0.8, false);
  d.pen.hair([pt(0.14, 0.4), pt(0.5, 0.4), pt(0.86, 0.2)], 2.4, '#ffffff', 0.8);
  const c = pt(0.13, 0);
  const sheath = new Path2D();
  sheath.ellipse(c.x, c.y, len * 0.2, 20, a, 0, Math.PI * 2);
  ctx.fillStyle = far ? V.mouthDeep : V.mouth;
  ctx.fill(sheath);
  ctx.strokeStyle = '#8a4f55';
  ctx.lineWidth = 1.8;
  ctx.stroke(sheath);
  d.pen.hair([pt(0.02, 0.8), pt(0.14, 1), pt(0.3, 0.9)], 1.6, '#f7e4dc', 0.8);
}

function place(ctx: CanvasRenderingContext2D, h: HeadPose): void {
  ctx.translate(h.bx, h.by);
  ctx.rotate(h.theta);
  ctx.scale(h.size, Math.cos(h.theta) < 0 ? -h.size : h.size);
}

/** The dark of the throat and the stretched lining between the jaws. */
function mouthWeb(d: Draw, up: number, down: number): void {
  const { ctx } = d.pen;
  const reach = 300;
  const a = rot(P(reach, -12), -up);
  const b = rot(P(reach * 0.96, 8), down);
  const mid = rot(P(reach * 0.82, 0), (down - up) / 2);
  const web = new Path2D();
  web.moveTo(-34, 8);
  web.lineTo(a.x, a.y);
  web.quadraticCurveTo(mid.x, mid.y, b.x, b.y);
  web.closePath();
  const c = rot(P(58, 0), (down - up) / 2);
  const g = ctx.createRadialGradient(c.x, c.y, 8, c.x, c.y, reach * 0.8);
  g.addColorStop(0, V.throat);
  g.addColorStop(0.16, '#5a2a31');
  g.addColorStop(0.38, V.mouthDeep);
  g.addColorStop(0.7, V.mouth);
  g.addColorStop(1, '#f3d8cf');
  ctx.fillStyle = g;
  ctx.fill(web);
  const dark = new Path2D();
  dark.ellipse(c.x, c.y, 30 + 46 * Math.min(1, up), 20 + 34 * Math.min(1, up), (down - up) / 2, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(30,12,16,0.9)';
  ctx.fill(dark);
  d.pen.hair(through([a, mid, b]), 2.4, '#f7e4dc', 0.75);
  for (let i = 1; i < 5; i++) d.pen.hair([lerp(c, a, 0.3 + i * 0.1), lerp(a, mid, 0.42 + i * 0.05)], 1.3, '#a56a70', 0.5);
}

/** What lies behind what the jaws hold: the lower jaw, its lining, the throat. Draw the neck first. */
export function drawHeadBack(d: Draw, h: HeadPose): void {
  const { ctx } = d.pen;
  const up = h.open * UP;
  const down = h.open * DOWN;
  ctx.save();
  place(ctx, h);
  if (h.open > 0.02) mouthWeb(d, up, down);
  ctx.rotate(down);
  if (h.open > 0.02) lining(ctx, d, LIP, -30 * Math.min(1, h.open * 1.6));
  skin(ctx, JAW, LIP, CHIN, 91, 26, 3, true);
  ctx.save();
  ctx.clip(pathOf(JAW));
  lipScales(d, LIP, 1, 3);
  ctx.restore();
  d.pen.stroke(CHIN.filter((_, i) => i % 4 === 0), 3.2, LINE, 0.9, false);
  ctx.restore();
}

/** The upper jaw over what the jaws hold: fangs, crown, horns, eye. */
export function drawHeadFront(d: Draw, h: HeadPose): void {
  const { ctx } = d.pen;
  const up = h.open * UP;
  ctx.save();
  place(ctx, h);
  ctx.rotate(-up);
  if (h.open > 0.04) {
    const out = Math.min(1, h.open * 1.8);
    const len = 176 * (h.open > 0.7 ? 1 : 0.5 + 0.5 * Math.max(0, h.open - 0.37) / 0.33);
    lining(ctx, d, LIP, 34 * Math.min(1, h.open * 1.6));
    fang(d, 352, -4, out, len * 0.86, true);
    fang(d, 322, 0, out, len, false);
  }
  horn(d, 296, -106, 46, 18, -4, true);
  skin(ctx, CRANIUM, TOP, LIP, 77, 30, 9, false);
  ctx.save();
  ctx.clip(pathOf(CRANIUM));
  lipScales(d, LIP, -1, 5);
  ctx.restore();
  ridge(d);
  // The eye sits under the brow; the horn stands on the brow.
  paintEye(d, EYE.x, EYE.y, 31, h.lid, h.look, h.sorrow);
  brow(d, h.sorrow);
  horn(d, 248, -112, 72, 26, 14, false);
  d.pen.stroke(TOP.filter((_, i) => i % 4 === 0), 3.4, LINE, 0.92, false);
  d.pen.stroke(LIP.filter((_, i) => i % 4 === 0), 3, LINE, 0.9, false);
  ctx.restore();
}

/** Lays the head's outline over the rock's tone while it hides. */
export function headMask(h: HeadPose): Pt[] {
  const c = Math.cos(h.theta);
  const s = Math.sin(h.theta);
  return [...TOP, ...[...CHIN].reverse()].filter((_, i) => i % 3 === 0).map((p) => P(h.bx + h.size * (p.x * c + p.y * s), h.by + h.size * (p.x * s - p.y * c)));
}
