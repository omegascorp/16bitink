import { type Draw } from '../../../src/art/kit';
import { type Pt } from '../../../src/art/pen';
import { hex, mixRgb } from './noise';
import { scale, LINE } from './bodyArt';

/**
 * The lure, the thing the whole animal is built round: a soft swollen bulb at
 * the very tip of the tail, the size of a fat spider's body, fringed with long
 * curved scales that droop from it and splay on the rock like soft legs. Seen
 * from a bird's height, a spider low on the stone; close to, plainly scales.
 */

export interface LureLook {
  readonly x: number;
  readonly y: number;
  /** Size, and how flat the view is (about 0.6 from rock level, 1 from above). */
  readonly size: number;
  readonly squash: number;
  readonly twitch: number;
  readonly jolt: number;
  readonly phase: number;
  /** 0 lying on the rock .. 1 hanging from a beak. */
  readonly hang: number;
  /** Where the tail comes in from (radians). */
  readonly tail: number;
}

const BULB_X = 98;
const BULB_Y = 72;

/** The long scales: their way out from the bulb (0 the far side from the tail), reach and width. */
const LEGS: readonly (readonly [number, number, number])[] = [
  [-0.42, 318, 25], [0.42, 330, 25], [-1.05, 344, 26], [1.08, 352, 26], [-1.72, 336, 25], [1.74, 348, 25], [-2.4, 286, 23], [2.42, 282, 23],
];

interface LegPath {
  readonly base: Pt;
  readonly ctrl: Pt;
  readonly tip: Pt;
  readonly width: number;
}

const on = (l: LegPath, u: number): Pt => {
  const v = 1 - u;
  return { x: v * v * l.base.x + 2 * v * u * l.ctrl.x + u * u * l.tip.x, y: v * v * l.base.y + 2 * v * u * l.ctrl.y + u * u * l.tip.y };
};

function legPath(l: LureLook, i: number): LegPath {
  const [off, reach, width] = LEGS[i]!;
  const flick = l.twitch * 0.1 * Math.sin(l.phase * (0.7 + i * 0.09) + i * 2.1) * (0.5 + 0.5 * Math.sin(l.phase * 0.23 + i)) + l.jolt * 0.09 * (i % 2 ? 1 : -1);
  const a = l.tail + Math.PI + off + flick;
  const flat = 0.46 + (l.squash - 0.56) * 1.23;
  const base = { x: Math.cos(a) * BULB_X * 0.84, y: Math.sin(a) * BULB_Y * 0.5 * (0.6 + 0.4 * l.squash) + 10 * (1 - l.squash) };
  const tipRock = { x: Math.cos(a) * reach, y: Math.sin(a) * reach * flat + 30 * (1 - l.squash) };
  const tipHung = { x: Math.cos(a) * reach * 0.36, y: reach * (0.6 + 0.1 * (i % 3)) };
  const tip = { x: tipRock.x + (tipHung.x - tipRock.x) * l.hang, y: tipRock.y + (tipHung.y - tipRock.y) * l.hang };
  // Soft legs: out from the bulb, arched over, the point drooping down on to the stone.
  const arch = (reach * 0.3 * (1 - l.hang) * (1 - l.squash) * (1 - 0.72 * Math.max(0, Math.sin(a))) + l.twitch * 5 * Math.sin(l.phase * (0.5 + i * 0.13))) * 1.5;
  const bow = l.squash > 0.9 ? 0.2 * (i % 2 ? 1 : -1) : 0;
  const ctrl = { x: base.x + (tip.x - base.x) * 0.62 - (tip.y - base.y) * bow, y: base.y + (tip.y - base.y) * 0.3 + (tip.x - base.x) * bow - arch };
  return { base, ctrl, tip, width };
}

/** One long scale: a blade swelling from a narrow root, tapering to a soft point. */
function bladeShape(p: LegPath): Pt[] {
  const left: Pt[] = [];
  const right: Pt[] = [];
  const n = 16;
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    const a = on(p, Math.max(0, u - 0.02));
    const b = on(p, Math.min(1, u + 0.02));
    const c = on(p, u);
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const l = Math.hypot(dx, dy) || 1;
    const w = (p.width / 2) * (0.7 + 0.5 * Math.sin(Math.PI * Math.min(1, u * 1.2 + 0.08))) * (u > 0.6 ? 1 - ((u - 0.6) / 0.4) ** 1.5 : 1);
    left.push({ x: c.x - (dy / l) * w, y: c.y + (dx / l) * w });
    right.push({ x: c.x + (dy / l) * w, y: c.y - (dx / l) * w });
  }
  return [...left, ...right.reverse()];
}

function paintBlade(d: Draw, p: LegPath, depth: number): void {
  const { ctx } = d.pen;
  const shape = bladeShape(p);
  const g = ctx.createLinearGradient(p.base.x, p.base.y, p.tip.x, p.tip.y);
  g.addColorStop(0, depth > 0 ? '#46352a' : '#35291f');
  g.addColorStop(0.4, depth > 0 ? '#6c5641' : '#4f3e2f');
  g.addColorStop(0.8, depth > 0 ? '#957e60' : '#6e5a45');
  g.addColorStop(1, '#b7a27f');
  ctx.fillStyle = g;
  ctx.beginPath();
  shape.forEach((q, i) => (i === 0 ? ctx.moveTo(q.x, q.y) : ctx.lineTo(q.x, q.y)));
  ctx.closePath();
  ctx.fill();
  // The keel down the blade, its lit side, a few fine grooves, the thin contour.
  const keel = Array.from({ length: 9 }, (_, i) => on(p, 0.06 + i * 0.105));
  d.pen.hair(keel, Math.max(1.4, p.width * 0.1), '#c9b796', 0.8);
  d.pen.hair(keel.map((q) => ({ x: q.x + 1.6, y: q.y + 2 })), 1.2, '#2e2219', 0.5);
  d.pen.stroke([...shape, shape[0]!], 1.6, LINE, 0.82, false);
}

function legShadow(d: Draw, l: LureLook, p: LegPath): void {
  const { ctx } = d.pen;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(30,20,14,0.2)';
  for (const w of [p.width * 1.15, p.width * 0.6]) {
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(p.base.x + 8, p.base.y + 14);
    ctx.quadraticCurveTo((p.base.x + p.tip.x) / 2 + 12, (p.base.y + p.tip.y) / 2 + 12 + l.squash * 8, p.tip.x + 5, p.tip.y + 5);
    ctx.stroke();
  }
  ctx.restore();
}

const LIT = hex('#d9c6a4');
const MID = hex('#9a8061');
const DARK = hex('#4c3a2b');

/** The bulb: a fat soft body under small rounded scales, dark round its middle. */
function bulb(d: Draw, l: LureLook): void {
  const { ctx } = d.pen;
  const ry = BULB_Y * (0.72 + 0.28 * l.squash);
  const breath = 1 + 0.015 * Math.sin(l.phase * 0.31) + 0.05 * l.jolt;
  const rx = BULB_X * breath;
  const path = new Path2D();
  path.ellipse(0, 0, rx, ry * breath, l.tail + Math.PI, 0, Math.PI * 2);
  ctx.save();
  const g = ctx.createRadialGradient(-rx * 0.28, -ry * 0.42, 4, 0, 0, rx * 1.15);
  g.addColorStop(0, '#c7b08c');
  g.addColorStop(0.5, '#7f6850');
  g.addColorStop(1, '#31251c');
  ctx.fillStyle = g;
  ctx.fill(path);
  ctx.clip(path);
  for (let j = -7; j <= 7; j++) {
    const yy = (j / 7) * ry;
    for (let i = -7; i <= 7; i++) {
      const xx = ((i + (j % 2 ? 0.5 : 0)) / 7) * rx;
      const u = Math.hypot(xx / rx, yy / ry);
      if (u > 1.1) continue;
      const lit = Math.max(0, 1 - Math.hypot(xx / rx + 0.3, yy / ry + 0.45));
      const band = 0.72 + 0.28 * Math.sin(xx * 0.03 + yy * 0.01 + 0.6);
      const c = mixRgb(mixRgb(DARK, MID, band * (1.2 - u * 0.75)), LIT, lit * 0.8);
      scale(ctx, xx, yy, Math.cos(l.tail), Math.sin(l.tail), -Math.sin(l.tail), Math.cos(l.tail), 27, 24 * Math.max(0.5, 1.15 - u * 0.5), c, 0.32);
    }
  }
  const sheen = ctx.createRadialGradient(-rx * 0.3, -ry * 0.5, 2, -rx * 0.3, -ry * 0.5, rx * 0.6);
  sheen.addColorStop(0, 'rgba(255,246,224,0.34)');
  sheen.addColorStop(1, 'rgba(255,246,224,0)');
  ctx.fillStyle = sheen;
  ctx.fillRect(-rx * 1.2, -ry * 1.3, rx * 2.4, ry * 2.6);
  ctx.restore();
  const rim = Array.from({ length: 33 }, (_, i) => {
    const a = (i / 32) * Math.PI * 2;
    const c = Math.cos(a) * rx;
    const s = Math.sin(a) * ry * breath;
    const r = l.tail + Math.PI;
    return { x: c * Math.cos(r) - s * Math.sin(r), y: c * Math.sin(r) + s * Math.cos(r) };
  });
  d.pen.stroke(rim, 2, LINE, 0.75, false);
}

/** The lure at the tail's tip; `x, y` is the bulb's centre. */
export function drawLure(d: Draw, l: LureLook): void {
  if (l.size < 0.02) return;
  const { ctx } = d.pen;
  ctx.save();
  ctx.translate(l.x, l.y);
  ctx.scale(l.size, l.size);
  const paths = LEGS.map((_, i) => legPath(l, i));
  const behind = (p: LegPath): boolean => p.tip.y < p.base.y + 6;
  if (l.hang < 0.5) {
    ctx.save();
    const shadow = ctx.createRadialGradient(10, 26, 10, 10, 26, BULB_X * 1.5);
    shadow.addColorStop(0, 'rgba(30,20,14,0.6)');
    shadow.addColorStop(1, 'rgba(30,20,14,0)');
    ctx.fillStyle = shadow;
    ctx.translate(0, 26);
    ctx.scale(1, 0.55);
    ctx.fillRect(-180, -180, 380, 360);
    ctx.restore();
    paths.forEach((p) => legShadow(d, l, p));
  }
  paths.filter(behind).forEach((p) => paintBlade(d, p, 0));
  bulb(d, l);
  paths.filter((p) => !behind(p)).forEach((p) => paintBlade(d, p, 1));
  ctx.restore();
}

/** The bare end of the tail once the bulb has gone: a blunt little tip, nothing more. */
export function drawStub(d: Draw, x: number, y: number, r: number, angle: number): void {
  const { ctx } = d.pen;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  const g = ctx.createRadialGradient(-r * 0.3, -r * 0.4, 1, 0, 0, r * 1.2);
  g.addColorStop(0, '#d9c8a8');
  g.addColorStop(1, '#7c6750');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 1.15, r * 0.98, 0, 0, Math.PI * 2);
  ctx.fill();
  d.pen.hair(Array.from({ length: 13 }, (_, i) => ({ x: Math.cos(-1.7 + i * 0.28) * r * 1.15, y: Math.sin(-1.7 + i * 0.28) * r * 0.98 })), 2, LINE, 0.8);
  ctx.restore();
}
