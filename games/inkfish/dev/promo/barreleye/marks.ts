import { PAPER } from '../../../src/art/pen';
import { drawTextLine, type TextInk } from '../captions';
import { arc, chalk, partOf, type Pt, spline } from './ink';

/**
 * The chalk marks over the picture: the depth tag, rings, labels with
 * arrows, a crossing-out, sight lines, the swivel arrow, the copepod and the
 * bite. Positions are on screen unless a function says otherwise.
 */
export const CHALK = '#e2dccf';
export const PAPER_ON_INK: TextInk = { fill: PAPER, halo: '#05091a' };
const SIGHT = '#a9f7b8';
const LABEL = 76;

/** A short arrowhead at the end of a stroke, pointing along its last step. */
function arrowHead(ctx: CanvasRenderingContext2D, pts: readonly Pt[], size: number, seed: number, boil: number, width: number, alpha = 1): void {
  if (pts.length < 2) return;
  const tip = pts[pts.length - 1]!;
  const back = pts[Math.max(0, pts.length - 4)]!;
  const a = Math.atan2(tip.y - back.y, tip.x - back.x);
  for (const side of [-1, 1]) {
    const w = a + Math.PI + side * 0.5;
    chalk(ctx, [tip, { x: tip.x + Math.cos(w) * size, y: tip.y + Math.sin(w) * size }], seed + side, boil, { width, color: CHALK, alpha, wander: 0.6 });
  }
}

/** A curved chalk arrow from `from` to `to`, bowing to one side, drawn on over `u` (0 .. 1). */
export function drawArrow(ctx: CanvasRenderingContext2D, from: Pt, to: Pt, bow: number, u: number, seed: number, boil: number): void {
  if (u <= 0) return;
  const mid = { x: (from.x + to.x) / 2 - (to.y - from.y) * bow, y: (from.y + to.y) / 2 + (to.x - from.x) * bow };
  const pts = partOf(spline([from, mid, to], false, 12), u);
  chalk(ctx, pts, seed, boil, { width: 4.5, color: CHALK });
  if (u >= 1) arrowHead(ctx, pts, 26, seed + 10, boil, 4.5);
}

export function label(ctx: CanvasRenderingContext2D, text: string, at: Pt, alpha: number, size = LABEL, colours = PAPER_ON_INK): void {
  drawTextLine(ctx, text, at.x, at.y, size, 700, alpha, colours);
}

/**
 * The depth tag, top left: a wavy surface line, a dashed line down from it
 * that grows with the count, and the metres.
 */
export function drawDepthTag(ctx: CanvasRenderingContext2D, show: number, metres: number, boil: number): void {
  if (show <= 0) return;
  ctx.save();
  ctx.globalAlpha = show;
  const x = 120;
  const top = 300;
  const surface = Array.from({ length: 25 }, (_, i) => ({ x: x - 70 + i * 10, y: top + 7 * Math.sin(i * 0.9) }));
  chalk(ctx, surface, 3000, boil, { width: 4, color: '#9fc6e8' });
  drawTextLine(ctx, 'surface', x + 240, top + 16, 58, 700, show * 0.85, PAPER_ON_INK);
  // The line runs down as the count goes up, towards the number, which stays put.
  const bottom = top + 30 + 160 * (metres / 700);
  ctx.setLineDash([14, 12]);
  chalk(ctx, [{ x, y: top + 22 }, { x, y: bottom }], 3010, boil, { width: 4, color: CHALK, wander: 0.5, retrace: false });
  ctx.setLineDash([]);
  arrowHead(ctx, [{ x, y: top + 22 }, { x, y: bottom }], 22, 3020, boil, 4);
  ctx.restore();
  drawTextLine(ctx, `${metres} m`, x + 190, top + 175, 124, 700, show, PAPER_ON_INK);
}

/** A ring drawn round the nostrils, in the fish's own px (so it rides on the fish), drawn on over `u`. */
export function drawNaresRing(ctx: CanvasRenderingContext2D, centre: Pt, u: number, boil: number): void {
  if (u <= 0) return;
  // Not quite closed, as if drawn in one go.
  const ring = arc(centre.x, centre.y, 62, 40, -2.6, Math.PI * 2 + 0.35, 48, -0.25);
  chalk(ctx, partOf(ring, u), 3100, boil, { width: 4, color: CHALK });
}

/** A line struck through a label, drawn on over `u`. */
export function drawStrike(ctx: CanvasRenderingContext2D, at: Pt, width: number, u: number, boil: number): void {
  if (u <= 0) return;
  const line = [{ x: at.x - width / 2 - 10, y: at.y - 18 }, { x: at.x + width / 2 + 10, y: at.y - 30 }];
  chalk(ctx, partOf(line, u), 3200, boil, { width: 7, color: '#ff7a6b' });
}

/** Dashed sight lines from the lenses, along the gaze, marching outwards. */
export function drawSight(ctx: CanvasRenderingContext2D, lenses: readonly Pt[], gaze: number, show: number, reach: number, t: number, flash: number): void {
  if (show <= 0) return;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.setLineDash([22, 16]);
  ctx.lineDashOffset = -t * 70;
  lenses.forEach((p, i) => {
    const len = 1500 * reach;
    const from = 40;
    ctx.globalAlpha = show * (i === 0 ? 0.75 : 0.4) * (1 + 0.6 * flash);
    ctx.strokeStyle = SIGHT;
    ctx.lineWidth = i === 0 ? 4 : 3;
    ctx.beginPath();
    ctx.moveTo(p.x + Math.cos(gaze) * from, p.y + Math.sin(gaze) * from);
    ctx.lineTo(p.x + Math.cos(gaze) * len, p.y + Math.sin(gaze) * len);
    ctx.stroke();
  });
  ctx.restore();
}

/**
 * The quarter turn the eyes make, in the fish's own px: an arc round the
 * eye's pivot from straight up to where the eye points now, arrowed.
 */
export function drawSwivel(ctx: CanvasRenderingContext2D, pivot: Pt, eyes: number, show: number, boil: number): void {
  if (show <= 0) return;
  const from = -Math.PI / 2 + 0.12;
  const sweep = eyes - from;
  if (sweep <= 0.05) return;
  ctx.save();
  ctx.globalAlpha = show;
  const r = 150;
  const pts = arc(pivot.x, pivot.y, r, r, from, sweep, 24);
  chalk(ctx, pts, 3300, boil, { width: 6, color: '#f5c84a' });
  arrowHead(ctx, pts, 28, 3310, boil, 6);
  ctx.restore();
}

/** A ring popping round the copepod as it is spotted, `u` 0 .. 1 over its life. */
export function drawSpotRing(ctx: CanvasRenderingContext2D, at: Pt, u: number, boil: number): void {
  if (u < 0 || u > 1) return;
  ctx.save();
  ctx.globalAlpha = Math.sin(Math.PI * Math.sqrt(u));
  const r = 40 + 60 * u;
  chalk(ctx, arc(at.x, at.y, r, r, 0, Math.PI * 2, 36), 3400, boil, { width: 4, color: SIGHT });
  ctx.restore();
  drawTextLine(ctx, '!', at.x + 52, at.y - 46 - 20 * u, 96, 700, Math.sin(Math.PI * Math.min(1, u * 1.2)), { fill: '#f5c84a', halo: '#05091a' });
}

/**
 * A copepod, `size` px long, swimming towards `heading`: a dark shadow
 * against the faint light from above, two long feelers swept back, a thin
 * tail, legs kicking.
 */
export function drawCopepod(ctx: CanvasRenderingContext2D, at: Pt, size: number, heading: number, kick: number, t: number, boil: number): void {
  const s = size / 100;
  ctx.save();
  ctx.translate(at.x, at.y);
  ctx.rotate(heading);
  ctx.scale(s, s);
  // Teardrop body, blunt head forward; a thin tail ending in a fork.
  const body = spline([{ x: 46, y: 0 }, { x: 40, y: -13 }, { x: 18, y: -18 }, { x: -12, y: -14 }, { x: -30, y: -6 }, { x: -30, y: 6 }, { x: -12, y: 14 }, { x: 18, y: 18 }, { x: 40, y: 13 }], true, 6);
  const swing = Math.sin(2 * Math.PI * 3 * t) * 4 * kick;
  const tail = [{ x: -28, y: 0 }, { x: -44, y: swing * 0.5 }, { x: -58, y: swing }];
  const fork = [-1, 1].map((side) => [{ x: -58, y: swing }, { x: -74, y: swing + 9 * side }]);
  // Long feelers straight out from the head to either side, swept a little back.
  const sweep = 0.25 + 0.25 * kick;
  const feelers = [-1, 1].map((side) => spline([{ x: 38, y: 10 * side }, { x: 30 - 30 * sweep, y: 50 * side }, { x: 18 - 70 * sweep, y: 92 * side }], false, 6));
  const legs = [0, 1, 2, 3].map((i) => {
    const x = 20 - i * 10;
    const a = Math.PI / 2 + 0.6 + 0.5 * kick * Math.sin(2 * Math.PI * 4 * t - i * 0.8);
    return [{ x, y: 12 }, { x: x + Math.cos(a) * 18, y: 12 + Math.sin(a) * 18 }];
  });
  const INKY = '#03050b';
  feelers.forEach((f, i) => chalk(ctx, f, 3500 + i, boil, { width: 3, color: INKY, wander: 0.6, retrace: false }));
  legs.forEach((l, i) => chalk(ctx, l, 3510 + i, boil, { width: 3.4, color: INKY, wander: 0.4, retrace: false }));
  chalk(ctx, tail, 3520, boil, { width: 7, color: INKY, wander: 0.4, retrace: false });
  fork.forEach((f, i) => chalk(ctx, f, 3525 + i, boil, { width: 3, color: INKY, wander: 0.3, retrace: false }));
  ctx.fillStyle = INKY;
  ctx.beginPath();
  body.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  ctx.fill();
  // A faint rim of light round it, so the shadow reads.
  chalk(ctx, body, 3530, boil, { width: 2.2, color: '#9fc6e8', alpha: 0.45, close: true, retrace: false });
  feelers.forEach((f, i) => chalk(ctx, f, 3540 + i, boil, { width: 1.2, color: '#9fc6e8', alpha: 0.35, wander: 0.6, retrace: false }));
  ctx.restore();
}

/** The snap: a burst of chalk strokes at the mouth, `u` 0 .. 1 over its life. */
export function drawBite(ctx: CanvasRenderingContext2D, at: Pt, size: number, u: number, boil: number): void {
  if (u < 0 || u > 1) return;
  ctx.save();
  ctx.globalAlpha = 1 - u;
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2 + 0.3;
    const r0 = size * (0.3 + 0.4 * u);
    const r1 = size * (0.55 + 0.6 * u);
    chalk(ctx, [{ x: at.x + Math.cos(a) * r0, y: at.y + Math.sin(a) * r0 }, { x: at.x + Math.cos(a) * r1, y: at.y + Math.sin(a) * r1 }], 3600 + k, boil, {
      width: 5, color: CHALK, wander: 0.5, retrace: false,
    });
  }
  ctx.restore();
}
