import { type Draw } from '../../../src/art/kit';
import { type Pt } from '../../../src/art/pen';
import { createRng } from '../../../src/logic/rng';
import { css, hex, mixRgb, type Rgb } from './noise';
import { type BirdPose } from './story';

/**
 * The warbler: tiny, round, short-legged, painted in soft overlapping
 * feathers rather than shapes: olive-brown above, pale below, a thin dark
 * bill, a pale stripe over the eye, a neat tail, fluffed when it is tired.
 * Drawn facing +x from its feet; in flight, spread wings with real primaries.
 */

interface Plumage {
  readonly back: Rgb;
  readonly deep: Rgb;
  readonly lit: Rgb;
  readonly flank: Rgb;
  readonly belly: Rgb;
  readonly brow: string;
  readonly wing: string;
  readonly edge: string;
}

const WARBLER: Plumage = { back: hex('#7f7342'), deep: hex('#4f4728'), lit: hex('#a99c62'), flank: hex('#d3bf90'), belly: hex('#f1e9d4'), brow: '#f3ecc8', wing: '#62563a', edge: '#d0c490' };
/** The other day's bird: greyer above, a lemon wash below. */
const OTHER: Plumage = { back: hex('#7b8467'), deep: hex('#47503e'), lit: hex('#a9b28b'), flank: hex('#e4d98e'), belly: hex('#f6efc0'), brow: '#fbf6d6', wing: '#6a7058', edge: '#d8dfba' };

const LINE = '#2e2418';
const CENTRE = { x: 0, y: -150 } as const;
const NECK = { x: 70, y: -54 } as const;
const HEAD = { x: 42, y: -34 } as const;
const HEAD_R = 74;
const BILL = 90;

const pitchOf = (b: BirdPose): number => b.tilt + 0.32 * b.dip;
const headTurn = (b: BirdPose): number => 0.8 * b.dip + 0.2 * b.limp;

/** The tip of the bill in the world. */
export function beakTip(b: BirdPose): Pt {
  const p = pitchOf(b);
  const h = p + headTurn(b);
  const rot = (x: number, y: number, a: number): Pt => ({ x: x * Math.cos(a) - y * Math.sin(a), y: x * Math.sin(a) + y * Math.cos(a) });
  const neck = rot(NECK.x, NECK.y, p);
  const head = rot(HEAD.x + HEAD_R + BILL - 4, HEAD.y + 6, h);
  return { x: b.x + b.face * b.size * (CENTRE.x + neck.x + head.x), y: b.y - b.lift + b.size * (CENTRE.y + neck.y + head.y) };
}

function bodyEdge(ruffle: number, n = 40): Pt[] {
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    const egg = 1 + 0.1 * Math.cos(a);
    const tuft = 1 + ruffle * 0.05 * Math.sin(a * 11 + 1) + ruffle * 0.035 * Math.sin(a * 23);
    return { x: Math.cos(a) * 128 * egg * tuft * (1 + 0.05 * ruffle), y: Math.sin(a) * 100 * tuft * (1 + 0.1 * ruffle) };
  });
}

/** One soft feather: a rounded leaf with a darker centre. */
function feather(ctx: CanvasRenderingContext2D, x: number, y: number, a: number, len: number, wid: number, col: Rgb, alpha: number): void {
  const c = Math.cos(a);
  const s = Math.sin(a);
  const tx = x + c * len;
  const ty = y + s * len;
  const nx = -s * wid * 0.5;
  const ny = c * wid * 0.5;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = css(col);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + c * len * 0.55 + nx * 1.5, y + s * len * 0.55 + ny * 1.5, tx, ty);
  ctx.quadraticCurveTo(x + c * len * 0.55 - nx * 1.5, y + s * len * 0.55 - ny * 1.5, x, y);
  ctx.fill();
  ctx.globalAlpha = alpha * 0.55;
  ctx.strokeStyle = css([col[0] * 0.62, col[1] * 0.62, col[2] * 0.6]);
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(x + c * len * 0.5 - nx * 1.1, y + s * len * 0.5 - ny * 1.1);
  ctx.quadraticCurveTo(tx - c * 2, ty - s * 2, x + c * len * 0.5 + nx * 1.1, y + s * len * 0.5 + ny * 1.1);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

function plumageAt(P: Plumage, y: number, rx: number): Rgb {
  const v = y + rx * 0.14;
  if (v < -28) return mixRgb(P.lit, P.back, Math.min(1, (v + 100) / 50));
  if (v < 20) return mixRgb(P.back, P.flank, (v + 28) / 48);
  return mixRgb(P.flank, P.belly, Math.min(1, (v - 20) / 50));
}

function paintBody(ctx: CanvasRenderingContext2D, P: Plumage, ruffle: number, seed: number): void {
  const edge = bodyEdge(ruffle);
  ctx.save();
  ctx.beginPath();
  edge.forEach((q, i) => (i === 0 ? ctx.moveTo(q.x, q.y) : ctx.lineTo(q.x, q.y)));
  ctx.closePath();
  const g = ctx.createLinearGradient(0, -100, 0, 104);
  g.addColorStop(0, css(P.back));
  g.addColorStop(0.42, css(P.flank));
  g.addColorStop(0.8, css(P.belly));
  g.addColorStop(1, '#b8a98a');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.clip();
  const rng = createRng(seed);
  const dabs = Array.from({ length: 210 }, () => {
    const a = rng() * Math.PI * 2;
    const r = Math.sqrt(rng()) * 1.05;
    return { x: Math.cos(a) * r * 138, y: Math.sin(a) * r * 108, v: rng(), w: rng() };
  }).sort((p, q) => p.x - q.x);
  for (const f of dabs) {
    const flow = Math.PI + (f.y / 108) * -0.42 + (f.w - 0.5) * 0.4 * (1 + ruffle * 1.4);
    const col = mixRgb(plumageAt(P, f.y, f.x), f.v > 0.5 ? P.lit : P.deep, 0.1 + 0.12 * Math.abs(f.v - 0.5));
    feather(ctx, f.x, f.y, flow, 40 + f.w * 16, 26 + f.w * 8, col, 0.72);
  }
  const shade = ctx.createLinearGradient(-30, -80, 30, 120);
  shade.addColorStop(0.55, 'rgba(60,44,30,0)');
  shade.addColorStop(1, 'rgba(60,44,30,0.42)');
  ctx.fillStyle = shade;
  ctx.fillRect(-170, -130, 340, 260);
  ctx.restore();
}

/** The folded wing lying along the flank: two rows of coverts with pale tips, then the long flight feathers, each edged pale. */
function foldedWing(d: Draw, P: Plumage, droop: number): void {
  const { ctx } = d.pen;
  ctx.save();
  ctx.translate(58, -34);
  ctx.rotate(-0.13 + droop * 0.32);
  const wing = hex(P.wing);
  const edge = hex(P.edge);
  for (let i = 6; i >= 0; i--) {
    flight(d, { x: -24, y: 22 + i * 8.6 }, Math.PI - 0.02 - i * 0.012, 190 - i * 15, 22, css(mixRgb(wing, i % 2 ? P.back : P.deep, 0.25)), P.edge);
  }
  const rng = createRng(21);
  for (let row = 0; row < 3; row++) {
    for (let i = 0; i < 7 - row; i++) {
      const x = 12 - i * 20 - row * 14 + rng() * 4;
      const y = -12 + row * 17 + i * 1.8;
      feather(ctx, x, y, Math.PI + 0.06, 46 - row * 3, 26, mixRgb(row === 2 ? wing : P.back, P.deep, row * 0.14), 0.98);
      feather(ctx, x - 34, y + 1, Math.PI + 0.06, 12, 12, edge, 0.7);
    }
  }
  ctx.restore();
}

/** One long flight feather from `at`, its pale edge, its shaft. */
function flight(d: Draw, at: Pt, a: number, len: number, wid: number, col: string, edge: string): void {
  const { ctx } = d.pen;
  const c = Math.cos(a);
  const s = Math.sin(a);
  const nx = -s * wid * 0.5;
  const ny = c * wid * 0.5;
  const tip = { x: at.x + c * len, y: at.y + s * len };
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.moveTo(at.x + nx * 0.4, at.y + ny * 0.4);
  ctx.quadraticCurveTo(at.x + c * len * 0.72 + nx * 1.4, at.y + s * len * 0.72 + ny * 1.4, tip.x, tip.y);
  ctx.quadraticCurveTo(at.x + c * len * 0.72 - nx * 1.2, at.y + s * len * 0.72 - ny * 1.2, at.x - nx * 0.4, at.y - ny * 0.4);
  ctx.fill();
  d.pen.hair([{ x: at.x + nx, y: at.y + ny }, { x: at.x + c * len * 0.72 + nx * 1.1, y: at.y + s * len * 0.72 + ny * 1.1 }, tip], 2, edge, 0.8);
  d.pen.hair([at, tip], 1.1, LINE, 0.5);
}

/** A spread wing from the shoulder: primaries fanned at the hand, secondaries along the arm, two rows of coverts. */
function spreadWing(d: Draw, P: Plumage, flap: number, open: number, far: boolean): void {
  const { ctx } = d.pen;
  const lift = Math.sin(flap);
  const arm = -Math.PI / 2 + 0.28 + lift * 0.95 + (1 - open) * 1.3;
  const reach = 118 * (0.62 + 0.38 * open);
  const root: Pt = far ? { x: 56, y: -74 } : { x: 34, y: -50 };
  const hand = { x: root.x + Math.cos(arm) * reach, y: root.y + Math.sin(arm) * reach };
  const size = far ? 0.72 : 0.86;
  const col = far ? css(mixRgb(P.deep, P.back, 0.4)) : P.wing;
  const edge = far ? css(P.back) : P.edge;
  ctx.save();
  for (let i = 0; i < 7; i++) {
    const u = i / 6;
    const at = { x: root.x + (hand.x - root.x) * (0.25 + 0.75 * u), y: root.y + (hand.y - root.y) * (0.25 + 0.75 * u) };
    flight(d, at, arm - 1.62 + 0.12 * u, (176 + 24 * u) * size * (0.8 + 0.2 * open), 62 * size, col, edge);
  }
  for (let i = 0; i < 9; i++) {
    const u = i / 8;
    flight(d, hand, arm - 1.4 + u * 1.5 * open, (236 + 60 * Math.sin(u * 2.4)) * size * (0.62 + 0.38 * open), 56 * size, col, edge);
  }
  // The coverts over the feathers' roots, and the arm itself.
  const covert = far ? P.deep : mixRgb(P.back, hex(P.wing), 0.3);
  for (let i = 0; i < 9; i++) {
    const u = i / 8;
    const at = { x: root.x + (hand.x - root.x) * u, y: root.y + (hand.y - root.y) * u };
    feather(ctx, at.x, at.y, arm - 1.5 + u * 0.7, 104 * size, 44 * size, mixRgb(covert, hex(P.edge), 0.1), 0.98);
  }
  for (let i = 0; i < 8; i++) {
    const u = i / 7;
    const at = { x: root.x + (hand.x - root.x) * u, y: root.y + (hand.y - root.y) * u };
    feather(ctx, at.x, at.y, arm - 1.5 + u * 0.7, 56 * size, 34 * size, far ? P.back : P.lit, 0.96);
  }
  ctx.restore();
}

function tail(d: Draw, P: Plumage, ruffle: number): void {
  const col = css(mixRgb(P.deep, hex(P.wing), 0.5));
  for (let i = 0; i < 6; i++) {
    const a = Math.PI + 0.1 + (i - 2.5) * (0.035 + ruffle * 0.02);
    flight(d, { x: -104, y: -8 + (i - 2.5) * 5 }, a, 136 - Math.abs(i - 2.5) * 5, 30, col, P.edge);
  }
}

function leg(d: Draw, hip: Pt, foot: Pt, limp: number): void {
  const knee = { x: (hip.x + foot.x) / 2 - 6, y: (hip.y + foot.y) / 2 + 2 };
  const col = '#8d6a56';
  d.pen.stroke([hip, knee, foot], 11, LINE, 0.9, false);
  d.pen.stroke([hip, knee, foot], 7.5, col, 1, false);
  const toes = limp > 0.5 ? [[16, 20], [-2, 26], [-14, 18]] : [[42, 5], [30, 11], [-26, 6]];
  for (const [x, y] of toes) {
    d.pen.stroke([foot, { x: foot.x + x! * 0.6, y: foot.y + y! * 0.5 }, { x: foot.x + x!, y: foot.y + y! }], 5, LINE, 0.85, false);
    d.pen.stroke([foot, { x: foot.x + x! * 0.6, y: foot.y + y! * 0.5 }, { x: foot.x + x!, y: foot.y + y! }], 3, col, 1, false);
  }
}

function paintHead(d: Draw, P: Plumage, b: BirdPose, seed: number): void {
  const { ctx } = d.pen;
  ctx.save();
  ctx.translate(HEAD.x, HEAD.y);
  const r = HEAD_R * (1 + 0.05 * b.ruffle);
  const g = ctx.createLinearGradient(0, -r, 0, r);
  g.addColorStop(0, css(P.lit));
  g.addColorStop(0.46, css(P.back));
  g.addColorStop(0.62, css(P.flank));
  g.addColorStop(1, css(P.belly));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 1.06, r, 0, 0, Math.PI * 2);
  ctx.fill();
  const rng = createRng(seed + 3);
  for (let i = 0; i < 90; i++) {
    const a = rng() * Math.PI * 2;
    const q = Math.sqrt(rng()) * r * 0.92;
    const x = Math.cos(a) * q;
    const y = Math.sin(a) * q;
    feather(ctx, x, y, Math.PI + (y / r) * -0.5 + (rng() - 0.5) * 0.5 * (1 + b.ruffle), 20 + rng() * 6, 14, plumageAt(P, y * 1.3, 0), 0.62);
  }
  // The pale stripe over the eye, the dark line through it, the pale cheek.
  const brow: Pt[] = [{ x: r - 2, y: -13 }, { x: 38, y: -29 }, { x: 4, y: -33 }, { x: -36, y: -22 }];
  d.pen.stroke(brow, 13, P.brow, 0.96, false);
  const through: Pt[] = [{ x: r, y: -2 }, { x: 40, y: -10 }, { x: 8, y: -9 }, { x: -40, y: 2 }];
  d.pen.stroke(through, 7, css(P.deep), 0.8, false);
  // The bill: thin, dark, two fine halves.
  const open = b.beak * 0.2;
  const tip = { x: r + BILL, y: 2 };
  const upper = [{ x: r - 8, y: -11 }, { x: r + 30, y: -7 }, { x: tip.x, y: tip.y - open * 60 }, { x: r + 30, y: 2 }, { x: r - 8, y: 4 }];
  const lower = [{ x: r - 8, y: 3 }, { x: r + 30, y: 3 }, { x: tip.x - 12, y: tip.y + 2 + open * 60 }, { x: r + 24, y: 8 }, { x: r - 8, y: 10 }];
  d.pen.fill(lower, '#4a4034', 1);
  d.pen.fill(upper, '#2a241d', 1);
  d.pen.hair([{ x: r + 4, y: -8 }, { x: r + 36, y: -5 }], 1.6, '#8a7e6e', 0.8);
  d.pen.dot(r + 12, -4, 2.4, '#0f0c0a', 0.9);
  // The eye: dark and round with a catchlight; a tired lid or a shut one.
  const ex = 34;
  const ey = -9;
  const er = 12.5;
  ctx.fillStyle = '#17110c';
  ctx.beginPath();
  ctx.ellipse(ex, ey, er, er, 0, 0, Math.PI * 2);
  ctx.fill();
  d.pen.dot(ex - 4, ey - 4.4, 3.4, '#fff8ea', 0.95);
  d.pen.dot(ex + 3.5, ey + 4, 1.4, '#c9b89a', 0.7);
  if (b.eye > 0.02) {
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(ex, ey, er + 1.5, er + 1.5, 0, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = b.eye > 0.9 ? P.brow : css(P.back);
    ctx.fillRect(ex - er - 2, ey - er - 2, 2 * er + 4, 2 * (er + 2) * b.eye);
    ctx.restore();
    const y = ey - er + 2 * er * b.eye;
    if (b.eye > 0.9) d.pen.stroke([{ x: ex - er - 5, y: ey - 3 }, { x: ex - 6, y: ey + 5 }, { x: ex + 6, y: ey + 5 }, { x: ex + er + 5, y: ey - 3 }], 5.6, LINE, 1, false);
    else d.pen.hair([{ x: ex - er, y }, { x: ex + er, y }], 2, LINE, 0.8);
  } else d.pen.hair(Array.from({ length: 13 }, (_, i) => ({ x: ex + Math.cos(i * 0.52) * (er + 1), y: ey + Math.sin(i * 0.52) * (er + 1) })), 1.4, LINE, 0.7);
  ctx.restore();
}

/** The fine broken contour: firm on the back, soft on the belly. */
function contour(d: Draw, ruffle: number): void {
  const edge = bodyEdge(ruffle, 60);
  d.pen.hair(edge.slice(33, 52), 2.2, LINE, 0.62);
  d.pen.hair(edge.slice(4, 24), 1.6, LINE, 0.34);
}

export function drawBird(d: Draw, b: BirdPose): void {
  const { ctx } = d.pen;
  const P = b.other ? OTHER : WARBLER;
  const seed = b.other ? 5 : 2;
  const pitch = pitchOf(b);
  const flying = b.wing > 0.03;
  ctx.save();
  ctx.translate(b.x, b.y - b.lift);
  ctx.scale(b.face * b.size, b.size);
  if (b.lift <= 0.5 && b.limp < 0.1 && !(flying && b.flap > 0 && b.dip < 0.2)) {
    const shadow = ctx.createRadialGradient(0, 4, 8, 0, 4, 170);
    shadow.addColorStop(0, 'rgba(30,20,14,0.5)');
    shadow.addColorStop(1, 'rgba(30,20,14,0)');
    ctx.save();
    ctx.scale(1, 0.2);
    ctx.fillStyle = shadow;
    ctx.fillRect(-180, -170, 360, 340);
    ctx.restore();
  }
  ctx.translate(CENTRE.x, CENTRE.y);
  // The legs, short and thin, planted while the body tips over them.
  const hipAt = (x: number): Pt => ({ x: x * Math.cos(pitch) - 88 * Math.sin(pitch), y: x * Math.sin(pitch) + 88 * Math.cos(pitch) });
  const dangle = (x: number): Pt => ({ x: hipAt(x).x - 14, y: hipAt(x).y + 62 });
  const tucked = b.lift > 1 || (flying && b.dip < 0.2);
  const foot = (x: number): Pt => (b.limp > 0.3 ? dangle(x) : tucked ? { x: hipAt(x).x - 26, y: hipAt(x).y + 42 } : { x: x + 8, y: 150 });
  leg(d, hipAt(16), foot(26), b.limp);
  ctx.save();
  ctx.rotate(pitch);
  if (flying) spreadWing(d, P, b.flap, b.wing, true);
  tail(d, P, b.ruffle);
  paintBody(ctx, P, b.ruffle, seed);
  contour(d, b.ruffle);
  if (!flying) foldedWing(d, P, b.limp);
  ctx.save();
  ctx.translate(NECK.x, NECK.y);
  ctx.rotate(headTurn(b));
  paintHead(d, P, b, seed);
  ctx.restore();
  ctx.restore();
  leg(d, hipAt(-16), foot(-12), b.limp);
  if (flying) {
    ctx.save();
    ctx.rotate(pitch);
    spreadWing(d, P, b.flap, b.wing, false);
    ctx.restore();
  }
  ctx.restore();
}
