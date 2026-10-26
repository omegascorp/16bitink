import { ellipse, INK, PAPER, type Pen } from '../../../../src/art/pen';
import { boilOf, penFor, type Pt, spline, trace } from './ink';

/**
 * The people: "you" (an average man, 5 ft 9 in, as an ink silhouette seen
 * from the front, shoulders 16 in across, painted dark with a cold rim light
 * and a paper halo so it reads on any water), a scuba diver side on, and a
 * walker side on. All to scale: "you" is drawn by height in px.
 */

/** Local units: 1000 = 5 ft 9 in, feet at y = 0, up negative. Shoulders 16 in = 232. */
const U = 1000;
const SHOULDER_HALF = 116;

export type Arms = 'down' | 'shrug' | 'point';

export interface YouLook {
  readonly arms?: Arms;
  /** The ink's colour (the thumbnail's yellow diver, a grey ghost). */
  readonly fill?: string;
  readonly alpha?: number;
  /** The paper halo round it, px (0 for none). */
  readonly halo?: number;
  /** Outline only, no fill (a ghost "you" for counting). */
  readonly ghost?: boolean;
}

const mirror = (pts: readonly Pt[]): Pt[] => pts.map((p) => ({ x: -p.x, y: p.y }));

/** Torso and legs, one closed outline (left side down, round the feet, up the right). */
const BODY_RIGHT: readonly Pt[] = [
  { x: 24, y: -872 }, { x: 26, y: -842 }, { x: 70, y: -830 }, { x: 108, y: -818 }, { x: 118, y: -790 }, { x: 104, y: -740 },
  { x: 92, y: -640 }, { x: 82, y: -540 }, { x: 96, y: -470 }, { x: 92, y: -360 }, { x: 74, y: -250 }, { x: 64, y: -140 },
  { x: 56, y: -40 }, { x: 84, y: -10 }, { x: 82, y: 0 }, { x: 22, y: 0 }, { x: 24, y: -40 }, { x: 30, y: -250 }, { x: 14, y: -440 }, { x: 0, y: -452 },
];
const BODY: readonly Pt[] = [...BODY_RIGHT, ...mirror(BODY_RIGHT).reverse().slice(1)];

/** An arm as a centre line, from the shoulder: down at the side, shrugging (palms up), or pointing out. */
function armLine(arms: Arms, side: 1 | -1): Pt[] {
  const s = { x: side * 104, y: -804 };
  if (arms === 'shrug') return [s, { x: side * 176, y: -650 }, { x: side * 250, y: -700 }, { x: side * 286, y: -738 }];
  if (arms === 'point' && side === 1) return [s, { x: 260, y: -770 }, { x: 420, y: -760 }];
  return [s, { x: side * 132, y: -640 }, { x: side * 128, y: -470 }, { x: side * 124, y: -400 }];
}

function drawYouLocal(ctx: CanvasRenderingContext2D, pen: Pen, look: YouLook, k: number): void {
  const fill = look.fill ?? '#20232b';
  const arms = look.arms ?? 'down';
  const head = ellipse(0, -930, 50, 64, 22);
  const body = spline(BODY, 3, true);
  const armW = 54;
  const drawArms = (width: number, colour: string, alpha = 1): void => {
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.strokeStyle = colour;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = width;
    for (const side of [1, -1] as const) {
      trace(ctx, spline(armLine(arms, side), 4), false);
      ctx.stroke();
    }
    ctx.restore();
  };
  const shapes = (colour: string, grow: number): void => {
    ctx.save();
    ctx.fillStyle = colour;
    ctx.strokeStyle = colour;
    ctx.lineWidth = grow * 2;
    ctx.lineJoin = 'round';
    for (const s of [head, body]) {
      trace(ctx, s);
      ctx.fill();
      if (grow > 0) ctx.stroke();
    }
    ctx.restore();
    drawArms(armW + grow * 2, colour);
  };
  // The paper halo, then the ink outline (a ring), then the painted fill.
  const halo = (look.halo ?? 10) / k;
  if (halo > 0) {
    ctx.save();
    ctx.globalAlpha *= 0.85;
    shapes(PAPER, halo + 6 / k);
    ctx.restore();
  }
  if (look.ghost) {
    shapes(INK, 3 / k);
    shapes(PAPER, 0);
    ctx.save();
    ctx.globalAlpha *= 0.35;
    shapes(fill, 0);
    ctx.restore();
    return;
  }
  shapes(INK, 4 / k);
  const g = ctx.createLinearGradient(-140, -1000, 140, 0);
  g.addColorStop(0, fill);
  g.addColorStop(0.6, fill);
  g.addColorStop(1, '#3a4250');
  shapes(fill, 0);
  ctx.save();
  ctx.globalAlpha *= 0.55;
  ctx.fillStyle = g;
  for (const s of [head, body]) {
    trace(ctx, s);
    ctx.fill();
  }
  ctx.restore();
  // A cold rim light down the right side, and wash hatching on the left.
  ctx.save();
  trace(ctx, body);
  ctx.clip();
  pen.hatch([{ x: -140, y: -900 }, { x: -20, y: -900 }, { x: -20, y: 0 }, { x: -140, y: 0 }], 22, 1.1, 2.4 / Math.max(0.3, k * 2), { color: '#000000', alpha: 0.35 });
  ctx.restore();
  pen.stroke(spline([{ x: 112, y: -800 }, { x: 98, y: -700 }, { x: 86, y: -560 }, { x: 94, y: -440 }, { x: 80, y: -260 }, { x: 62, y: -60 }], 4), 5 / Math.max(0.5, k * 3), '#b9c8d6', 0.5, false);
  pen.stroke(ellipse(0, -930, 50, 64, 22).slice(18).concat(ellipse(0, -930, 50, 64, 22).slice(0, 5)), 4 / Math.max(0.5, k * 3), '#b9c8d6', 0.45, false);
}

/** "You", standing with your feet's middle at (x, y) screen px, `height` px tall (5 ft 9 in). */
export function drawYou(ctx: CanvasRenderingContext2D, x: number, y: number, height: number, t: number, look: YouLook = {}): void {
  if (height < 2 || (look.alpha ?? 1) <= 0) return;
  const k = height / U;
  ctx.save();
  ctx.globalAlpha *= look.alpha ?? 1;
  ctx.translate(x, y);
  ctx.scale(k, k);
  drawYouLocal(ctx, penFor(ctx, 777, boilOf(t), Math.max(0.5, 1.2 / k)), look, k);
  ctx.restore();
}

/** "You" lying down along a line (head towards +x when `dir` is 1), for counting how many yous long an animal is. */
export function drawYouLying(ctx: CanvasRenderingContext2D, feetX: number, y: number, height: number, dir: 1 | -1, t: number, look: YouLook = {}): void {
  ctx.save();
  ctx.translate(feetX, y);
  ctx.rotate((dir * Math.PI) / 2);
  drawYou(ctx, 0, 0, height, t, look);
  ctx.restore();
}

/** Where "your" shoulders are (left and right ends), screen px, for a "you" drawn at (x, y) `height` tall. */
export function shouldersOf(x: number, y: number, height: number): { readonly left: Pt; readonly right: Pt } {
  const k = height / U;
  return { left: { x: x - SHOULDER_HALF * k, y: y - 812 * k }, right: { x: x + SHOULDER_HALF * k, y: y - 812 * k } };
}

// ---------------------------------------------------------------- the diver

export interface DiverLook {
  readonly fill?: string;
  readonly alpha?: number;
  readonly halo?: number;
  /** Tumbling: turned this far (radians) about its middle. */
  readonly spin?: number;
}

/** A scuba diver side on, head towards +x, as a silhouette: mask, tank, fins kicking. Local: 1000 from fin tips to head. */
function drawDiverLocal(ctx: CanvasRenderingContext2D, pen: Pen, kick: number, look: DiverLook, k: number): void {
  const fill = look.fill ?? '#1d2027';
  const f1 = 0.28 * Math.sin(kick);
  const f2 = -f1;
  const legs = (phase: number, dy: number): Pt[] => [
    { x: 130, y: dy }, { x: -60, y: dy + 10 + 30 * phase }, { x: -250, y: dy + 20 + 80 * phase },
  ];
  const fin = (phase: number, dy: number): Pt[] => {
    const a = { x: -250, y: dy + 20 + 80 * phase };
    return [a, { x: a.x - 190, y: a.y - 40 + 150 * phase }, { x: a.x - 200, y: a.y + 40 + 150 * phase }];
  };
  const body = spline([{ x: 470, y: -40 }, { x: 330, y: -64 }, { x: 160, y: -52 }, { x: 110, y: 0 }, { x: 160, y: 46 }, { x: 330, y: 50 }, { x: 440, y: 30 }], 4, true);
  const tank = spline([{ x: 400, y: -66 }, { x: 140, y: -74 }, { x: 128, y: -100 }, { x: 150, y: -122 }, { x: 400, y: -116 }, { x: 420, y: -92 }], 3, true);
  const head = ellipse(530, -14, 62, 54, 18);
  const arm = [{ x: 420, y: 30 }, { x: 520, y: 80 }, { x: 620, y: 70 }];
  const all = (colour: string, grow: number): void => {
    ctx.save();
    ctx.fillStyle = colour;
    ctx.strokeStyle = colour;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.lineWidth = grow * 2;
    for (const s of [body, tank, head]) {
      trace(ctx, s);
      ctx.fill();
      if (grow > 0) ctx.stroke();
    }
    for (const [ph, dy] of [[f1, -18], [f2, 18]] as const) {
      ctx.lineWidth = 64 + grow * 2;
      trace(ctx, spline(legs(ph, dy), 4), false);
      ctx.stroke();
      trace(ctx, fin(ph, dy));
      ctx.fill();
      if (grow > 0) {
        ctx.lineWidth = grow * 2;
        ctx.stroke();
      }
    }
    ctx.lineWidth = 46 + grow * 2;
    trace(ctx, spline(arm, 3), false);
    ctx.stroke();
    ctx.restore();
  };
  const halo = (look.halo ?? 8) / k;
  if (halo > 0) {
    ctx.save();
    ctx.globalAlpha *= 0.8;
    all(PAPER, halo + 4 / k);
    ctx.restore();
  }
  all(INK, 4 / k);
  all(fill, 0);
  // The mask's glint and the regulator's bubbles line.
  pen.fill(ellipse(574, -24, 26, 20, 12), '#9fc4d0', 0.75);
  pen.dot(568, -30, 6, '#ffffff', 0.8);
  pen.stroke([{ x: 400, y: -104 }, { x: 470, y: -80 }, { x: 560, y: 10 }], 6, '#5a6270', 0.8, false);
}

/** The diver with its middle at (x, y), `length` px fin tip to head, facing right (1) or left (-1). */
export function drawDiver(ctx: CanvasRenderingContext2D, x: number, y: number, length: number, facing: 1 | -1, t: number, look: DiverLook = {}): void {
  const k = length / 1000;
  ctx.save();
  ctx.globalAlpha *= look.alpha ?? 1;
  ctx.translate(x, y);
  ctx.rotate(look.spin ?? 0);
  ctx.scale(facing * k, k);
  ctx.translate(-160, 0);
  drawDiverLocal(ctx, penFor(ctx, 515, boilOf(t), Math.max(0.5, 1.2 / k)), t * 5, look, k);
  ctx.restore();
}

// ---------------------------------------------------------------- the walker

/** A person walking right, side on: legs and arms swinging with `phase`. Feet at (x, y), `height` px tall. */
export function drawWalker(ctx: CanvasRenderingContext2D, x: number, y: number, height: number, phase: number, t: number, fill = '#20232b'): void {
  const k = height / U;
  const swing = Math.sin(phase);
  const legs = (s: number): Pt[] => [{ x: 0, y: -470 }, { x: 60 * s, y: -250 }, { x: 110 * s - 10, y: -10 }];
  const arm = (s: number): Pt[] => [{ x: 0, y: -800 }, { x: -50 * s, y: -620 }, { x: -90 * s + 20, y: -460 }];
  const torso = spline([{ x: -40, y: -830 }, { x: 40, y: -830 }, { x: 50, y: -600 }, { x: 44, y: -460 }, { x: -44, y: -460 }, { x: -52, y: -600 }], 3, true);
  const head = ellipse(10, -930, 52, 64, 18);
  const pen = penFor(ctx, 909, boilOf(t), Math.max(0.5, 1.2 / k));
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(k, k);
  const all = (colour: string, grow: number): void => {
    ctx.fillStyle = colour;
    ctx.strokeStyle = colour;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const s of [torso, head]) {
      trace(ctx, s);
      ctx.fill();
      ctx.lineWidth = grow * 2;
      if (grow > 0) ctx.stroke();
    }
    for (const s of [swing, -swing]) {
      ctx.lineWidth = 78 + grow * 2;
      trace(ctx, spline(legs(s), 3), false);
      ctx.stroke();
      ctx.lineWidth = 50 + grow * 2;
      trace(ctx, spline(arm(s), 3), false);
      ctx.stroke();
    }
  };
  all(PAPER, 10 / k);
  all(INK, 3 / k);
  all(fill, 0);
  pen.stroke([{ x: 30, y: -800 }, { x: 46, y: -600 }], 6, '#b9c8d6', 0.5, false);
  ctx.restore();
}
