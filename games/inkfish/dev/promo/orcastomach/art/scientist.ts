import { INK, type Pt } from '../../../../src/art/pen';
import { spline } from '../../kraken/whale';
import { curve, dab, path, smoothLoop, softLine } from '../../seal/art/paint';
import { drawFace } from './scientistFace';

/**
 * The naturalist of 1861, in natural proportions and painted like the animals:
 * soft gradient washes, thin ink, soft shading. A dark frock coat over a
 * waistcoat with a watch chain, a white wing collar and black cravat; the head
 * (./scientistFace.ts) about an eighth of his height. Drawn from the hips up,
 * so a whale's back or his table hides the rest. His two hands can come up
 * beside his head, palms out, fingers spread.
 *
 * Own units: the head 100 tall, centred on 0,0.
 */

export type { Mood, ScientistLook } from './scientistFace';
import type { ScientistLook } from './scientistFace';

const SKIN = '#e0b08c';
const COAT = '#262a35';
const COAT_LIT = '#464d5e';
const WAISTCOAT = '#4a4043';

export interface Placement {
  readonly x: number;
  readonly y: number;
  readonly scale: number;
}

const lerp = (a: number, b: number, u: number): number => a + (b - a) * u;
const mixPt = (a: Pt, b: Pt, u: number): Pt => ({ x: lerp(a.x, b.x, u), y: lerp(a.y, b.y, u) });

const ink = (ctx: CanvasRenderingContext2D, width: number, colour = INK): void => {
  ctx.strokeStyle = colour;
  ctx.lineWidth = width;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.stroke();
};

function coatWash(ctx: CanvasRenderingContext2D): CanvasGradient {
  const g = ctx.createLinearGradient(-130, 60, 130, 300);
  g.addColorStop(0, COAT_LIT);
  g.addColorStop(0.42, COAT);
  g.addColorStop(1, '#14161e');
  return g;
}

const TORSO: readonly Pt[] = [
  { x: -34, y: 74 }, { x: -96, y: 92 }, { x: -122, y: 124 }, { x: -116, y: 220 }, { x: -96, y: 320 }, { x: -106, y: 420 }, { x: -124, y: 560 },
  { x: 124, y: 560 }, { x: 106, y: 420 }, { x: 96, y: 320 }, { x: 116, y: 220 }, { x: 122, y: 124 }, { x: 96, y: 92 }, { x: 34, y: 74 },
];

function front(ctx: CanvasRenderingContext2D): void {
  // The shirt and waistcoat in the coat's V, the collar, the cravat.
  const vee: readonly Pt[] = [{ x: -34, y: 74 }, { x: 34, y: 74 }, { x: 52, y: 240 }, { x: 44, y: 330 }, { x: -44, y: 330 }, { x: -52, y: 240 }];
  path(ctx, vee);
  const w = ctx.createLinearGradient(-50, 0, 50, 0);
  w.addColorStop(0, '#5e5255');
  w.addColorStop(0.45, WAISTCOAT);
  w.addColorStop(1, '#262024');
  ctx.fillStyle = w;
  ctx.fill();
  ink(ctx, 1.4);
  const shirt: readonly Pt[] = [{ x: -26, y: 76 }, { x: 26, y: 76 }, { x: 8, y: 160 }, { x: 0, y: 176 }, { x: -8, y: 160 }];
  path(ctx, shirt);
  const s = ctx.createLinearGradient(-26, 0, 26, 0);
  s.addColorStop(0, '#fbf8ef');
  s.addColorStop(1, '#c9cdd2');
  ctx.fillStyle = s;
  ctx.fill();
  ink(ctx, 1.1);
  for (const side of [-1, 1]) {
    path(ctx, [{ x: side * 4, y: 74 }, { x: side * 30, y: 66 }, { x: side * 33, y: 90 }, { x: side * 12, y: 92 }]);
    ctx.fillStyle = '#fbf9f1';
    ctx.fill();
    ink(ctx, 1.1);
  }
  ctx.beginPath();
  ctx.moveTo(-20, 88);
  ctx.quadraticCurveTo(0, 80, 20, 88);
  ctx.lineTo(9, 100);
  ctx.lineTo(16, 124);
  ctx.lineTo(0, 110);
  ctx.lineTo(-16, 124);
  ctx.lineTo(-9, 100);
  ctx.closePath();
  ctx.fillStyle = '#0f1016';
  ctx.fill();
  ink(ctx, 1);
  // Waistcoat buttons and the gold watch chain looping to the pocket.
  ctx.fillStyle = '#c9a85a';
  for (const y of [186, 222, 258, 294]) {
    ctx.beginPath();
    ctx.arc(0, y, 3.2, 0, Math.PI * 2);
    ctx.fill();
    ink(ctx, 0.8);
  }
  ctx.beginPath();
  ctx.moveTo(0, 258);
  ctx.quadraticCurveTo(24, 288, 44, 262);
  ink(ctx, 1.6, '#d7b768');
}

function lapels(ctx: CanvasRenderingContext2D): void {
  for (const s of [-1, 1]) {
    const l: readonly Pt[] = [{ x: s * 34, y: 74 }, { x: s * 54, y: 104 }, { x: s * 82, y: 136 }, { x: s * 58, y: 158 }, { x: s * 62, y: 180 }, { x: s * 44, y: 330 }, { x: s * 53, y: 240 }, { x: s * 40, y: 130 }];
    path(ctx, l);
    const g = ctx.createLinearGradient(s * 30, 70, s * 80, 170);
    g.addColorStop(0, '#50586b');
    g.addColorStop(1, '#2a2e3a');
    ctx.fillStyle = g;
    ctx.fill();
    ink(ctx, 1.2);
  }
}

function torso(ctx: CanvasRenderingContext2D): void {
  const neck: readonly Pt[] = [{ x: -22, y: 30 }, { x: 22, y: 30 }, { x: 28, y: 84 }, { x: -28, y: 84 }];
  path(ctx, neck);
  ctx.fillStyle = '#b98a68';
  ctx.fill();
  const shape = smoothLoop(TORSO, 4);
  path(ctx, shape);
  ctx.fillStyle = coatWash(ctx);
  ctx.fill();
  ctx.save();
  ctx.clip();
  // The cloth's soft folds: the chest, under the arm, the waist seam and skirt.
  dab(ctx, -66, 150, 64, '120,130,152', 0.3);
  dab(ctx, 80, 260, 80, '6,7,12', 0.5);
  softLine(ctx, [{ x: -100, y: 322 }, { x: -40, y: 336 }, { x: 40, y: 336 }, { x: 100, y: 322 }], 9, '#0c0d13', 0.5);
  softLine(ctx, [{ x: -74, y: 340 }, { x: -82, y: 430 }, { x: -96, y: 540 }], 18, '#585f72', 0.2);
  softLine(ctx, [{ x: 66, y: 340 }, { x: 72, y: 430 }, { x: 88, y: 540 }], 18, '#08090e', 0.34);
  ctx.restore();
  path(ctx, shape);
  ink(ctx, 1.6);
  front(ctx);
  lapels(ctx);
  ctx.beginPath();
  ctx.moveTo(0, 330);
  ctx.lineTo(0, 560);
  ink(ctx, 1.4);
}

/** A sleeve from shoulder to wrist, one soft bend through the elbow, tapering, shaded round, a crease or two at the bend. */
function sleeve(ctx: CanvasRenderingContext2D, a: Pt, e: Pt, w: Pt, side: 1 | -1): void {
  const line = spline([a, { x: (a.x + e.x) / 2 + side * 5, y: (a.y + e.y) / 2 }, e, { x: (e.x + w.x) / 2 + side * 4, y: (e.y + w.y) / 2 }, w], 8);
  const n = line.length - 1;
  const half = (i: number): number => lerp(33, 20, i / n);
  const normal = (i: number): Pt => {
    const [p, q] = [line[Math.max(0, i - 1)]!, line[Math.min(n, i + 1)]!];
    const len = Math.hypot(q.x - p.x, q.y - p.y) || 1;
    return { x: -(q.y - p.y) / len, y: (q.x - p.x) / len };
  };
  const left = line.map((p, i) => ({ x: p.x + normal(i).x * half(i), y: p.y + normal(i).y * half(i) }));
  const right = line.map((p, i) => ({ x: p.x - normal(i).x * half(i), y: p.y - normal(i).y * half(i) }));
  const shape = [...left, ...[...right].reverse()];
  path(ctx, shape);
  ctx.fillStyle = COAT;
  ctx.fill();
  ctx.save();
  ctx.clip();
  // The lit edge faces up and left whichever way the arm bends.
  softLine(ctx, side < 0 ? right : left, 26, COAT_LIT, 0.8, 10);
  softLine(ctx, side < 0 ? left : right, 26, '#0e1016', 0.8, 10);
  const mid = line[Math.round(n / 2)]!;
  softLine(ctx, curve({ x: mid.x - 20, y: mid.y - 16 }, { x: mid.x, y: mid.y - 4 }, { x: mid.x + 20, y: mid.y - 14 }, 6), 4, '#0c0d13', 0.5);
  softLine(ctx, curve({ x: mid.x - 18, y: mid.y + 10 }, { x: mid.x, y: mid.y + 18 }, { x: mid.x + 18, y: mid.y + 8 }, 6), 3, '#5a6276', 0.4);
  ctx.restore();
  path(ctx, shape);
  ink(ctx, 1.5);
}

/** Hand and fingers, a little nearer the camera than the head. */
const FINGERS: readonly (readonly [number, number, number, number])[] = [
  // x on the palm, length, width, fan (radians)
  [-20, 37, 9.4, -0.34], [-7, 45, 10, -0.11], [7, 47, 10, 0.09], [20, 41, 9.4, 0.3],
];

function hand(ctx: CanvasRenderingContext2D, at: Pt, aim: number, side: 1 | -1, spread: number): void {
  ctx.save();
  ctx.translate(at.x, at.y);
  ctx.rotate(aim);
  ctx.scale(-side * 1.24, 1.24);
  const skin = ctx.createLinearGradient(-28, 0, 28, 0);
  skin.addColorStop(0, '#f0c9a8');
  skin.addColorStop(0.55, SKIN);
  skin.addColorStop(1, '#b98560');
  // The thumb, then the palm, then the four fingers over it.
  ctx.save();
  ctx.translate(28, -6);
  ctx.rotate(0.62 + 0.3 * spread);
  ctx.beginPath();
  ctx.roundRect(-6, -40, 13, 46, 6.5);
  ctx.fillStyle = skin;
  ctx.fill();
  ink(ctx, 1);
  ctx.restore();
  for (const [x, len, w, fan] of FINGERS) {
    ctx.save();
    ctx.translate(x, -20);
    ctx.rotate(fan * spread);
    ctx.beginPath();
    ctx.roundRect(-w / 2, -len, w, len + 10, w / 2);
    ctx.fillStyle = skin;
    ctx.fill();
    ink(ctx, 1);
    softLine(ctx, [{ x: -w * 0.3, y: -len * 0.62 }, { x: w * 0.3, y: -len * 0.62 }], 1, '#8a5a40', 0.6, 2);
    softLine(ctx, [{ x: -w * 0.3, y: -len * 0.3 }, { x: w * 0.3, y: -len * 0.3 }], 1, '#8a5a40', 0.6, 2);
    ctx.restore();
  }
  const palm = smoothLoop([{ x: -27, y: -24 }, { x: 0, y: -28 }, { x: 27, y: -24 }, { x: 30, y: 8 }, { x: 22, y: 30 }, { x: -20, y: 30 }, { x: -29, y: 6 }], 5);
  path(ctx, palm);
  ctx.fillStyle = skin;
  ctx.fill();
  ctx.save();
  ctx.clip();
  dab(ctx, 2, 2, 24, '168,110,80', 0.3);
  dab(ctx, -14, -12, 16, '255,236,214', 0.4);
  softLine(ctx, [{ x: 20, y: 20 }, { x: 6, y: 2 }, { x: 12, y: -18 }], 1.4, '#8a5a40', 0.6, 2);
  ctx.restore();
  // Only the sides and heel get ink, so the fingers run into the palm.
  ctx.beginPath();
  ctx.moveTo(-28, -18);
  ctx.quadraticCurveTo(-30, 12, -20, 30);
  ctx.moveTo(29, 4);
  ctx.quadraticCurveTo(28, 20, 22, 30);
  ink(ctx, 1);
  // The white cuff.
  ctx.beginPath();
  ctx.roundRect(-23, 28, 46, 13, 3);
  ctx.fillStyle = '#f6f3ea';
  ctx.fill();
  ink(ctx, 1);
  ctx.restore();
}

/** The scientist, centred on his head at (x, y); his arms hang, or come up with `hands`. */
export function drawScientist(ctx: CanvasRenderingContext2D, at: Placement, look: ScientistLook): void {
  const up = look.hands;
  ctx.save();
  ctx.translate(at.x, at.y);
  ctx.scale(at.scale, at.scale);
  torso(ctx);
  for (const s of [-1, 1] as const) {
    const shoulder = { x: s * 106, y: 116 };
    const elbow = mixPt({ x: s * 132, y: 246 }, { x: s * 176, y: 206 }, up);
    const wrist = mixPt({ x: s * 126, y: 366 }, { x: s * 192, y: 76 }, up);
    sleeve(ctx, shoulder, elbow, wrist, s);
    const aim = Math.atan2(wrist.y - elbow.y, wrist.x - elbow.x) + Math.PI / 2;
    const along = { x: wrist.x - elbow.x, y: wrist.y - elbow.y };
    const reach = 34 / (Math.hypot(along.x, along.y) || 1);
    hand(ctx, { x: wrist.x + along.x * reach, y: wrist.y + along.y * reach }, aim, s, 0.12 + 0.88 * up);
  }
  drawFace(ctx, look);
  ctx.restore();
}
