import { PAPER_FILL } from '../../../../src/art/fish/kit';
import { INK } from '../../../../src/art/pen';
import { createRng } from '../../../../src/logic/rng';
import { type Pt, spline } from '../../kraken/whale';
import {
  type Brush, contour, curve, dab, type Edge, edgeAt, mix, path, px, smoothLoop, softLine, step01, type Stops, taper,
} from '../../seal/art/paint';
import {
  BODY, CHEEK, CORNER, EYE, HINGE, JAW, JAW_BOTTOM, JAW_TOP, jawBottomAt, jawTopAt, LIP, mouthAt, NECK_BOTTOM, neckBottomAt, NOSTRIL, THROAT, TOP, topAt,
} from './trexShape';

/**
 * The T. rex's painted sprites (head and neck; the lower jaw), in the manner of
 * the great white and the saltwater crocodile: washes laid column by column
 * from a dark earth-brown back to an olive flank and a pale countershaded
 * throat, soft airbrushed light and shade for the boxy planes of the skull,
 * a skin of small pebbly scales (laid out the same in every line-boil frame),
 * a few larger scutes along the brow, scaly lips, thin interior ink and a
 * firm outline.
 */

const DARK = '#17130b';
const LIP_PALE = '#c7b68b';

// ---------------------------------------------------------------- washes

function headStops(x: number): Stops {
  const snout = step01(x, -10, 30);
  return [
    [0, '#1d180e'], [0.1, mix('#2f2817', '#3a3119', snout)], [0.3, mix('#4b4127', '#58492a', snout)], [0.52, mix('#665a36', '#75633a', snout)],
    [0.72, mix('#80714a', '#8d7a4e', snout)], [0.88, '#9d8a5e'], [1, '#ad9b70'],
  ];
}

/** The head's wash runs from the top line down to the lip; behind the corner of the mouth it runs on over the cheek to the throat. */
const headBottom = (x: number): number => mouthAt(x) + (25 - mouthAt(x)) * step01(x, CORNER.x, CORNER.x - 16);

function neckStops(): Stops {
  return [[0, '#1b160d'], [0.14, '#30291a'], [0.34, '#4d4329'], [0.52, '#6b5f3a'], [0.64, '#8a7c52'], [0.74, '#b3a57b'], [0.84, '#cfc39d'], [1, '#d8ceab']];
}

/** Columns of colour from `top` to `bottom`, each faded by `alpha(x)`. Clip first. */
function wash(ctx: CanvasRenderingContext2D, x0: number, x1: number, step: number, top: Edge, bottom: Edge, stops: (x: number) => Stops, alpha: (x: number) => number): void {
  for (let x = x0; x <= x1; x += step) {
    const a = alpha(x);
    if (a <= 0) continue;
    const t = top(x);
    const b = Math.max(t + 1, bottom(x));
    const g = ctx.createLinearGradient(0, t, 0, b);
    for (const [at, colour] of stops(x)) g.addColorStop(at, colour);
    ctx.globalAlpha = a;
    ctx.fillStyle = g;
    ctx.fillRect(x - step / 2 - 0.3, t - 30, step + 0.6, b - t + 60);
  }
  ctx.globalAlpha = 1;
}

// ---------------------------------------------------------------- skin

/**
 * Small pebbly scales over a region: a jittered grid of rounded bumps, each lit
 * on top and shadowed below. Laid out by a fixed seed so the skin holds still
 * while the ink boils.
 */
function pebbles(ctx: CanvasRenderingContext2D, x0: number, x1: number, y0: number, y1: number, size: (x: number, y: number) => number, strength: (x: number, y: number) => number, seed: number): void {
  const rng = createRng(seed);
  const base = 1.25;
  for (let y = y0, row = 0; y < y1; y += base * 0.86, row++) {
    for (let x = x0 + (row % 2) * base * 0.5; x < x1; x += base) {
      const s = size(x, y);
      if (rng() > base / s) continue;
      const cx = x + (rng() - 0.5) * s * 0.5;
      const cy = y + (rng() - 0.5) * s * 0.5;
      const a = strength(cx, cy);
      if (a <= 0.01) continue;
      const r = s * (0.3 + rng() * 0.16);
      ctx.fillStyle = `rgba(14,10,4,${0.24 * a})`;
      ctx.beginPath();
      ctx.ellipse(cx + r * 0.2, cy + r * 0.28, r, r * 0.86, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgba(226,212,168,${0.1 * a})`;
      ctx.beginPath();
      ctx.ellipse(cx - r * 0.06, cy - r * 0.08, r * 0.8, r * 0.7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgba(246,236,200,${0.2 * a})`;
      ctx.beginPath();
      ctx.ellipse(cx - r * 0.3, cy - r * 0.34, r * 0.34, r * 0.26, -0.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/** A raised scale or knob: domed, lit from above, inked. */
function knob(k: Brush, x: number, y: number, w: number, h: number, alpha = 1): void {
  const { pen, ctx } = k;
  const shape = smoothLoop([{ x: x - w, y: y + h * 0.3 }, { x: x - w * 0.6, y: y - h }, { x: x + w * 0.6, y: y - h }, { x: x + w, y: y + h * 0.3 }, { x: x + w * 0.4, y: y + h }, { x: x - w * 0.4, y: y + h }], 3);
  pen.fill(shape, '#3a3220', 0.9 * alpha);
  pen.clipped(shape, () => {
    const g = ctx.createLinearGradient(0, y - h, 0, y + h);
    g.addColorStop(0, `rgba(214,198,150,${0.6 * alpha})`);
    g.addColorStop(0.5, `rgba(110,94,58,${0.25 * alpha})`);
    g.addColorStop(1, `rgba(10,8,3,${0.55 * alpha})`);
    ctx.fillStyle = g;
    ctx.fillRect(x - w - 1, y - h - 1, 2 * w + 2, 2 * h + 2);
  });
  pen.stroke(shape, px(k, 0.7), INK, 0.6 * alpha, false);
}

/** Lip scales: a row of squarish plates along an edge, pale, with dark seams between them. */
function lipScales(k: Brush, edge: Edge, x0: number, x1: number, gap: number, depth: number, dir: 1 | -1): void {
  const { pen, ctx } = k;
  for (let x = x0; x > x1; x -= gap) {
    const g2 = gap * (0.9 + 0.2 * Math.sin(x * 1.7));
    const e0 = edge(x);
    const e1 = edge(x - g2);
    const plate = [
      { x, y: e0 + dir * 0.3 }, { x: x - g2, y: e1 + dir * 0.3 },
      { x: x - g2 + 0.2, y: e1 - dir * depth }, { x: x - 0.2, y: e0 - dir * depth },
    ];
    pen.fill(plate, LIP_PALE, 0.32);
    ctx.save();
    path(ctx, plate);
    ctx.clip();
    const g = ctx.createLinearGradient(0, e0 - dir * depth, 0, e0);
    g.addColorStop(0, 'rgba(40,30,14,0.25)');
    g.addColorStop(0.6, 'rgba(236,224,186,0.16)');
    g.addColorStop(1, 'rgba(60,46,22,0.16)');
    ctx.fillStyle = g;
    ctx.fillRect(x - g2 - 1, e0 - depth - 2, g2 + 2, 2 * depth + 4);
    ctx.restore();
    pen.hair([{ x: x - 0.1, y: e0 - dir * depth }, { x, y: e0 }], px(k, 0.6), DARK, 0.32);
  }
  pen.hair(contour(edge, edge, 0, x0, x1, 2).map((p) => ({ x: p.x, y: p.y - dir * depth })), px(k, 0.6), DARK, 0.3);
}

// ---------------------------------------------------------------- the head and neck

function paintWashes(k: Brush): void {
  const { ctx } = k;
  const neckBottom = (x: number): number => neckBottomAt(x);
  wash(ctx, -160, 44, 0.6, topAt, neckBottom, neckStops, () => 1);
  // Behind the corner of the mouth the head's colour runs on down over the cheek to the throat, as the jaw's does.
  wash(ctx, -68, 44, 0.6, topAt, headBottom, headStops, (x) => step01(x, -68, -50));
  // Mottling: faint dark blotches over the back and the neck, olive breaking through on the flank.
  const rng = createRng(77);
  for (let i = 0; i < 70; i++) {
    const x = -150 + rng() * 190;
    const top = topAt(x);
    const y = top + 3 + rng() * (x < -50 ? 44 : 26);
    dab(ctx, x, y, 2.5 + rng() * 5, rng() < 0.5 ? '28,22,10' : '70,76,40', 0.22 + rng() * 0.16);
  }
  // Faint bands across the neck.
  for (let x = -68; x > -150; x -= 16) {
    softLine(ctx, [{ x, y: topAt(x) + 2 }, { x: x + 6, y: topAt(x + 6) + 16 }, { x: x + 13, y: topAt(x + 13) + 30 }], 7, '#1a150b', 0.2);
  }
  // The countershading breaks ragged along the neck.
  for (let x = -40; x > -150; x -= 3.2) {
    const v = topAt(x) + (neckBottomAt(x) - topAt(x)) * (0.66 + 0.05 * Math.sin(x * 0.4));
    dab(ctx, x, v, 2.6 + rng() * 2.4, rng() < 0.5 ? '60,50,30' : '210,200,160', 0.22);
  }
}

/** Light and shade for the planes of the skull: the broad flat top of the snout, the brow, the jaw muscles, the cheek. */
function paintForm(k: Brush): void {
  const { ctx } = k;
  // The top plane of the snout catching the light, broken at the edge where the skull turns down.
  softLine(ctx, contour(topAt, topAt, 0, 38, -8, 2).map((p) => ({ x: p.x, y: p.y + 2.2 })), 4, '#cdbb88', 0.38);
  softLine(ctx, contour(topAt, topAt, 0, 36, -6, 2).map((p) => ({ x: p.x, y: p.y + 5.4 })), 3, '#1c160b', 0.28);
  softLine(ctx, contour(topAt, topAt, 0, -26, -150, 3).map((p) => ({ x: p.x, y: p.y + 3 })), 5, '#b3a274', 0.26);
  // The antorbital hollow: a soft shadow in front of the eye.
  dab(ctx, -6, -19, 11, '22,16,8', 0.3);
  dab(ctx, 6, -11, 8, '210,190,140', 0.16);
  // The jaw muscles bulging behind the eye: lit on top, shade under.
  dab(ctx, -42, -32, 15, '206,186,134', 0.26);
  dab(ctx, -46, -12, 13, '20,14,6', 0.3);
  softLine(ctx, spline([{ x: -32, y: -24 }, { x: -44, y: -20 }, { x: -54, y: -12 }, { x: -58, y: 0 }], 5), 5, '#d2bd8a', 0.16);
  // The cheek under the eye, catching light; shade gathering along the lip and at the corner of the mouth.
  dab(ctx, -24, -17, 10, '214,196,148', 0.2);
  softLine(ctx, contour(mouthAt, mouthAt, 0, 38, -50, 2).map((p) => ({ x: p.x, y: p.y - 6.4 })), 4, '#2a2112', 0.18);
  dab(ctx, -37, -3, 6, '18,12,4', 0.4);
  // Shade under the throat's turn and down the far side of the neck.
  softLine(ctx, NECK_BOTTOM.map((p) => ({ x: p.x + 2, y: p.y - 3 })), 6, '#6e6040', 0.28);
  // Where the skull meets the neck: a soft fold of shadow from behind the crest down past the ear.
  softLine(ctx, spline([{ x: -61, y: -40 }, { x: -65, y: -28 }, { x: -67, y: -12 }, { x: -65, y: 6 }, { x: -59, y: 22 }], 6), 11, '#17110a', 0.2);
  softLine(ctx, spline([{ x: -56, y: -40 }, { x: -59, y: -28 }, { x: -60, y: -12 }, { x: -58, y: 6 }], 6), 6, '#cdb985', 0.08);
}

/** Skin: the pebbly scales, larger scutes along the brow and the top of the skull, horn-like knobs above and behind the eye. */
function paintScales(k: Brush): void {
  const { ctx } = k;
  const size = (x: number, y: number): number => {
    const head = x > -56;
    const lipNear = head ? Math.max(0, 1 - (mouthAt(x) - y) / 8) : 0;
    return (head ? 1.35 : 1.7) - lipNear * 0.45;
  };
  const strength = (x: number, y: number): number => {
    const t = topAt(x);
    const depth = (x > -52 ? mouthAt(x) : neckBottomAt(x)) - t;
    const v = (y - t) / Math.max(1, depth);
    const pale = x < -46 ? step01(v, 0.55, 0.85) : 0;
    return (0.5 + 0.5 * (1 - v)) * (1 - 0.75 * pale) * (1 - step01(-x, 105, 140));
  };
  pebbles(ctx, -158, 44, -50, 116, size, strength, 911);
  // Larger scutes along the brow and the top of the skull, in two short rows.
  for (let x = 30; x > -56; x -= 3.4) {
    const t = topAt(x);
    const big = x < 0 && x > -44;
    const n = Math.round(x / 3.4);
    if (n % 5 === 2) continue;
    knob(k, x, t + 2.2, (big ? 1.6 : 1.2) * (1 + 0.15 * Math.sin(n * 2.3)), big ? 0.95 : 0.75, 0.6);
    if (x < 8 && x > -50 && n % 2 === 0) knob(k, x - 1.7, t + 5, 1.2, 0.8, 0.4);
  }
  // A few low scutes running down the back of the neck.
  for (let x = -64; x > -126; x -= 4.4) knob(k, x, topAt(x) + 2.2, 1.2, 0.95, 0.6 * (1 - step01(-x, 100, 126)));
}

/** The lacrimal horn in front of the eye, the postorbital boss and the little horn-like bumps behind it, the brow ridge. */
function paintHorns(k: Brush): void {
  const { pen, ctx } = k;
  // The lacrimal horn: a rough raised boss over the front of the eye.
  dab(ctx, -15.4, -39.6, 4.4, '226,206,156', 0.4);
  for (const [x, y, w] of [[-15.6, -40.4, 1.8], [-13.4, -39.2, 1.4], [-17.4, -39.2, 1.3], [-14.8, -37.8, 1.1]] as const) knob(k, x, y, w, w * 0.8);
  // The postorbital boss and a cluster of small horns behind and above the eye.
  dab(ctx, -29.4, -40.4, 4.8, '226,206,156', 0.36);
  for (const [x, y, w] of [[-28.6, -41, 2], [-31.8, -40.2, 1.6], [-26.2, -39.6, 1.3], [-30.4, -37.8, 1.25], [-34.4, -38.6, 1.1], [-33, -35.6, 1]] as const) knob(k, x, y, w, w * 0.85);
  // Small knobs on the jugal behind and under the eye.
  knob(k, -33.5, -25, 1.3, 0.85, 0.55);
  knob(k, -36.2, -23, 1.05, 0.7, 0.45);
  // The brow ridge: a heavy shelf over the eye, lit on top, a deep shadow under it.
  const brow = curve({ x: EYE.x - 6.4, y: EYE.y - 2 }, { x: EYE.x + 0.4, y: EYE.y - 6.6 }, { x: EYE.x + 6.8, y: EYE.y - 2.6 }, 10);
  softLine(ctx, brow.map((p) => ({ x: p.x, y: p.y + 1.8 })), 4.2, '#0e0b05', 0.62);
  softLine(ctx, brow.map((p) => ({ x: p.x, y: p.y - 1.6 })), 3.2, '#cbb684', 0.3);
  taper(ctx, brow, 0.8 * px(k, 1.4) + 0.4, 0.4, INK, 0.8);
  // Wrinkled skin round the eye.
  for (let i = 0; i < 4; i++) {
    const r = 4.8 + i * 1.3;
    pen.hair(curve({ x: EYE.x - r, y: EYE.y + 1 }, { x: EYE.x, y: EYE.y + r * 1.05 }, { x: EYE.x + r * 0.9, y: EYE.y + 1.4 }, 8), px(k, 0.7), DARK, 0.32 - i * 0.05);
  }
}

/** The nostril high at the front of the snout, the pits along the jaw, creases at the corner of the mouth, folds on the neck. */
function paintDetail(k: Brush): void {
  const { pen, ctx } = k;
  // The nostril: an oval slit, its rim lit.
  const n = NOSTRIL;
  dab(ctx, n.x - 0.5, n.y + 0.4, 3.8, '20,14,6', 0.5);
  ctx.save();
  ctx.fillStyle = '#0c0905';
  ctx.beginPath();
  ctx.ellipse(n.x, n.y, 2.2, 1.1, -0.55, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  pen.stroke(curve({ x: n.x - 2.6, y: n.y + 0.6 }, { x: n.x - 0.6, y: n.y - 2.2 }, { x: n.x + 2.4, y: n.y - 1.4 }, 6), px(k, 1), '#e4d3a4', 0.6, false);
  pen.stroke(curve({ x: n.x - 2.2, y: n.y + 1.2 }, { x: n.x + 0.2, y: n.y + 1.6 }, { x: n.x + 2.2, y: n.y - 0.8 }, 6), px(k, 0.9), INK, 0.75, false);
  // Pits (nerve openings) in a loose row above the lip.
  const rng = createRng(4242);
  for (let x = 36; x > -18; x -= 2 + rng() * 1.6) {
    const y = mouthAt(x) - 5.6 - rng() * 2.4 - (x > 30 ? (x - 30) * 0.6 : 0);
    pen.dot(x, y, px(k, 0.9) + 0.12, '#120d06', 0.7);
    pen.dot(x - 0.25, y - 0.3, px(k, 0.5) + 0.05, '#d8c79c', 0.4);
  }
  // Creases fanning from the corner of the mouth, and the skin over the hinge.
  for (let i = 0; i < 4; i++) {
    const a = CORNER;
    pen.hair(curve({ x: a.x - 1 - i * 2.2, y: a.y - 1.4 - i * 1.6 }, { x: a.x - 5 - i * 2.4, y: a.y + 2 - i * 0.6 }, { x: a.x - 8 - i * 2.4, y: a.y + 6 + i * 0.4 }, 6), px(k, 0.7), DARK, 0.36);
  }
  taper(ctx, curve({ x: CORNER.x + 2, y: CORNER.y + 0.4 }, { x: CORNER.x - 1, y: CORNER.y - 0.2 }, { x: CORNER.x - 3.2, y: CORNER.y - 2.6 }, 6), 1.4, 0.3, INK, 0.85);
  // The ear behind the hinge, a shallow oval under a fold.
  dab(ctx, -60, -15, 4, '18,12,4', 0.4);
  pen.hair(curve({ x: -62, y: -20 }, { x: -57, y: -18.6 }, { x: -56.6, y: -12 }, 8), px(k, 0.8), DARK, 0.5);
  pen.hair(curve({ x: -61.6, y: -19.2 }, { x: -58, y: -17.4 }, { x: -58, y: -12.6 }, 8), px(k, 0.6), '#cdbb8d', 0.35);
  // Long folds down the neck and across the throat.
  for (let i = 0; i < 4; i++) {
    const x = -70 - i * 13;
    const t = topAt(x) + 9;
    const xb = x + 20;
    const b = neckBottomAt(xb) - 3;
    const fold = spline([{ x: x - 2, y: t }, { x: x + 9, y: t + (b - t) * 0.3 }, { x: x + 14, y: t + (b - t) * 0.62 }, { x: xb, y: b }], 6);
    pen.hair(fold, px(k, 0.8), DARK, 0.18 - i * 0.025);
    pen.hair(fold.map((p) => ({ x: p.x + 1, y: p.y - 0.6 })), px(k, 0.6), '#d8c99e', 0.14);
  }
  for (let i = 0; i < 6; i++) {
    const x = -40 - i * 6;
    const y = neckBottomAt(x);
    pen.hair([{ x: x + 4, y: y - 8 }, { x: x + 1, y: y - 3.6 }, { x: x - 0.4, y: y }], px(k, 0.7), '#5a4b2c', 0.36);
  }
}

/** Fades the far end of the neck, left and below, so the bust melts into the page. */
function fadeNeck(ctx: CanvasRenderingContext2D): void {
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  // Along the neck, down and back: clear by the time it reaches the shoulders.
  const g = ctx.createLinearGradient(-96, 18, -130, 50);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,0,1)');
  ctx.fillStyle = g;
  ctx.fillRect(-170, -60, 220, 190);
  ctx.restore();
}

export function paintBody(k: Brush): void {
  const { pen, ctx } = k;
  pen.fill(BODY, PAPER_FILL, 1);
  pen.clipped(BODY, () => {
    paintWashes(k);
    paintForm(k);
    paintScales(k);
    lipScales(k, (x) => mouthAt(x), 39, -32, 2.3, 2.5, 1);
    paintHorns(k);
    paintDetail(k);
  });
  // The outline: firm along the top and the snout, the lip, the throat and the neck's underside.
  pen.stroke(TOP.filter((p) => p.x > -118), px(k, 2.8), INK, 0.95, true);
  pen.stroke(LIP, px(k, 2.2), INK, 1, true);
  pen.stroke(CHEEK, px(k, 1.5), INK, 0.85, false);
  pen.stroke(NECK_BOTTOM.filter((p) => p.x > -100), px(k, 2.6), INK, 0.9, true);
  fadeNeck(ctx);
}

// ---------------------------------------------------------------- the lower jaw

export function paintJaw(k: Brush): void {
  const { pen, ctx } = k;
  pen.fill(JAW, PAPER_FILL, 1);
  pen.clipped(JAW, () => {
    const stops = (x: number): Stops => {
      const back = 1 - step01(x, -44, -24);
      return [[0, mix('#806f47', '#4d4127', back)], [0.22, mix('#8e7c51', '#5d4f30', back)], [0.48, mix('#a2905f', '#7f6f48', back)], [0.7, '#c2b48a'], [0.86, '#d3c8a2'], [1, '#c4b993']];
    };
    wash(ctx, -62, 40, 0.6, jawTopAt, jawBottomAt, stops, () => 1);
    // Behind the corner of the mouth the jaw is cheek: the head's own colour, so it runs on unbroken when shut and as the jaw opens.
    wash(ctx, -62, -20, 0.6, topAt, headBottom, headStops, (x) => 1 - step01(x, -40, -24));
    dab(ctx, -40, 14, 9, '18,12,4', 0.18);
    softLine(ctx, JAW_TOP.filter((p) => p.x < CORNER.x + 2).map((p) => ({ x: p.x, y: p.y + 1.6 })), 4, '#1a1309', 0.3);
    softLine(ctx, JAW_BOTTOM.filter((p) => p.x > -50).map((p) => ({ x: p.x - 0.4, y: p.y - 3.4 })), 4, '#e6dcb8', 0.25);
    softLine(ctx, contour(jawTopAt, jawBottomAt, 0.42, 34, -50, 2), 2.4, '#3a2f18', 0.22);
    pebbles(ctx, -62, 40, -6, 27, (x, y) => 1.2 - Math.max(0, 1 - (y - jawTopAt(x)) / 6) * 0.3, (x, y) => 0.8 - 0.5 * step01(y - jawTopAt(x), 8, 20), 313);
    lipScales(k, (x) => jawTopAt(x) + 1.2, 37, -32, 2.2, 2.3, -1);
    // Pits along the jaw, and the long groove under them.
    const rng = createRng(5151);
    for (let x = 35; x > -26; x -= 2 + rng() * 1.8) {
      const y = jawTopAt(x) + 5.4 + rng() * 2;
      pen.dot(x, y, px(k, 0.85) + 0.1, '#120d06', 0.6);
    }
    pen.hair(spline([{ x: 34, y: 6.6 }, { x: 18, y: 10.6 }, { x: 0, y: 13 }, { x: -20, y: 14 }, { x: -40, y: 14.2 }], 5), px(k, 0.8), DARK, 0.3);
  });
  pen.stroke(JAW_BOTTOM.filter((p) => p.x > -36), px(k, 2.6), INK, 0.95, true);
  // Behind the corner the jaw's top edge lies under the stretched cheek: a dark seam, no paper fringe.
  pen.hair(JAW_TOP.filter((p) => p.x < CORNER.x + 2), px(k, 1.6), '#3a3020', 0.9);
  pen.stroke(JAW_TOP.map((p) => ({ x: p.x, y: p.y + 1.25 })).filter((p) => p.x > -34), px(k, 1.2), INK, 0.75, false);
}
