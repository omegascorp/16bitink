import { INK, PAPER } from '../../../src/art/pen';
import { CAPTION_FONT, drawTextLine } from '../captions';
import { clamp01, smooth } from '../short';
import { GREEN, RED } from './scene';
import type { RowId } from './story';

/**
 * The checklist card pinned up over the reef: "the mirror test", "most
 * animals fail", then a row for each animal, sketched sitting in front of a
 * little mirror: dog ✗, cat ✗, cleaner wrasse ✓.
 */

export const CARD = { x: 540, y: 522, w: 830, h: 484 } as const;
const ROW_Y: Readonly<Record<RowId, number>> = { dog: 558, cat: 650, wrasse: 742 };
const SKETCH_SCALE = 0.84;
const NAME: Readonly<Record<RowId, string>> = { dog: 'dog', cat: 'cat', wrasse: 'cleaner wrasse' };
const SKETCH_X = 230;
const NAME_X = 590;
const STAMP_X = 875;
const DOG_WASH = '#d9b07a';
const CAT_WASH = '#b9b4c4';

export interface CardState {
  /** 0 off the top .. 1 in place. */
  readonly show: number;
  readonly title: number;
  readonly most: number;
  readonly fail: number;
  readonly rows: Readonly<Record<RowId, { readonly shown: number; readonly stamp: number; readonly ring: number }>>;
  /** The dog's ✗ jolting on "fails". */
  readonly jolt: number;
}

/** Ink strokes on a wash: a sketch's outline, filled, then stroked. */
function sketch(ctx: CanvasRenderingContext2D, path: Path2D, wash: string, detail: Path2D): void {
  ctx.fillStyle = wash;
  ctx.fill(path);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 4;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.stroke(path);
  ctx.lineWidth = 3;
  ctx.stroke(detail);
}

/** A dog sitting up, facing right, its paws at (0, 0). */
function drawDog(ctx: CanvasRenderingContext2D): void {
  const body = new Path2D();
  body.moveTo(-46, 0);
  body.bezierCurveTo(-60, -30, -50, -60, -18, -64);
  body.lineTo(6, -70);
  body.bezierCurveTo(4, -84, 10, -100, 28, -100);
  body.bezierCurveTo(40, -100, 44, -92, 46, -86);
  body.lineTo(62, -82);
  body.bezierCurveTo(66, -76, 62, -70, 54, -70);
  body.lineTo(36, -68);
  body.bezierCurveTo(30, -50, 26, -30, 24, 0);
  body.closePath();
  const detail = new Path2D();
  // Floppy ear, eye, nose, front leg, haunch, tail.
  detail.moveTo(20, -98);
  detail.bezierCurveTo(8, -96, 6, -80, 12, -72);
  detail.moveTo(38, -90);
  detail.arc(36, -89, 2.5, 0, Math.PI * 2);
  detail.moveTo(66, -80);
  detail.arc(62, -80, 4, 0, Math.PI * 2);
  detail.moveTo(14, -36);
  detail.lineTo(12, 0);
  detail.moveTo(-34, -6);
  detail.bezierCurveTo(-30, -26, -14, -30, -6, -10);
  detail.moveTo(-50, -14);
  detail.bezierCurveTo(-66, -20, -72, -36, -66, -50);
  sketch(ctx, body, DOG_WASH, detail);
}

/** A cat sitting up, facing right, its paws at (0, 0). */
function drawCat(ctx: CanvasRenderingContext2D): void {
  const body = new Path2D();
  body.moveTo(-38, 0);
  body.bezierCurveTo(-48, -36, -30, -66, 0, -68);
  body.lineTo(4, -72);
  body.lineTo(2, -96);
  body.lineTo(16, -84);
  body.lineTo(30, -86);
  body.lineTo(40, -100);
  body.lineTo(42, -78);
  body.bezierCurveTo(48, -66, 40, -56, 26, -56);
  body.bezierCurveTo(28, -36, 26, -18, 22, 0);
  body.closePath();
  const detail = new Path2D();
  // Eye, nose, whiskers, front leg, and a tail curled round the paws.
  detail.moveTo(34, -76);
  detail.lineTo(38, -74);
  detail.moveTo(44, -68);
  detail.arc(43, -68, 2, 0, Math.PI * 2);
  for (const dy of [-66, -61]) {
    detail.moveTo(44, dy);
    detail.lineTo(64, dy - 4 + (dy + 63) * 0.8);
  }
  detail.moveTo(12, -30);
  detail.lineTo(12, 0);
  detail.moveTo(-38, -2);
  detail.bezierCurveTo(-20, 8, 20, 8, 34, -2);
  sketch(ctx, body, CAT_WASH, detail);
}

/** A little standing mirror, its foot at (0, 0). */
function drawMiniMirror(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = '#d4e6f0';
  ctx.fillRect(-14, -86, 28, 82);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 5;
  ctx.strokeRect(-14, -86, 28, 82);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-4, -76);
  ctx.lineTo(-9, -58);
  ctx.stroke();
}

/** ✗ in red or ✓ in green, `size` across, scaled by `pop`. */
export function drawStamp(ctx: CanvasRenderingContext2D, kind: 'cross' | 'tick', x: number, y: number, size: number, pop: number, turn = 0): void {
  if (pop <= 0) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(turn);
  ctx.scale(pop, pop);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const h = size / 2;
  const path = new Path2D();
  if (kind === 'cross') {
    path.moveTo(-h, -h);
    path.lineTo(h, h * 0.9);
    path.moveTo(h * 0.9, -h);
    path.lineTo(-h * 0.9, h);
  } else {
    path.moveTo(-h, 0);
    path.lineTo(-h * 0.3, h * 0.75);
    path.lineTo(h, -h);
  }
  ctx.strokeStyle = PAPER;
  ctx.lineWidth = size * 0.34;
  ctx.stroke(path);
  ctx.strokeStyle = kind === 'cross' ? RED : GREEN;
  ctx.lineWidth = size * 0.2;
  ctx.stroke(path);
  ctx.restore();
}

/** The card's paper, border and tape. */
function drawSheet(ctx: CanvasRenderingContext2D): void {
  const { w, h } = CARD;
  ctx.fillStyle = 'rgba(27,26,31,0.18)';
  ctx.fillRect(-w / 2 + 10, -h / 2 + 12, w, h);
  ctx.fillStyle = PAPER;
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 4;
  ctx.strokeRect(-w / 2, -h / 2, w, h);
  ctx.fillStyle = 'rgba(240,214,120,0.7)';
  for (const sx of [-1, 1]) {
    ctx.save();
    ctx.translate((sx * w) / 2 - sx * 30, -h / 2);
    ctx.rotate(sx * 0.6);
    ctx.fillRect(-45, -14, 90, 28);
    ctx.restore();
  }
}

/** A ring pulsing round a row as the hook names it, `u` 0 .. 1. */
function drawRowRing(ctx: CanvasRenderingContext2D, y: number, u: number): void {
  if (u < 0 || u > 1) return;
  ctx.save();
  ctx.strokeStyle = '#e2632a';
  ctx.lineWidth = 6;
  ctx.globalAlpha = 0.9 * Math.sin(Math.PI * u);
  ctx.beginPath();
  ctx.ellipse(CARD.x, y - 34, 385 + 20 * u, 50 + 8 * u, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

/** The whole card; `drawWrasse` draws the little cleaner wrasse for its row, its middle at (x, y). */
export function drawCard(ctx: CanvasRenderingContext2D, s: CardState, drawWrasse: (x: number, y: number) => void): void {
  if (s.show <= 0) return;
  ctx.save();
  ctx.translate(0, -820 * (1 - smooth(s.show)));
  ctx.save();
  ctx.translate(CARD.x, CARD.y);
  ctx.rotate(-0.012);
  drawSheet(ctx);
  ctx.restore();

  drawTextLine(ctx, 'the mirror test', CARD.x, 352, 88, 700, clamp01(s.title * 3));
  if (s.title > 0) {
    // Underlined as it is written.
    ctx.save();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(CARD.x - 220, 372);
    ctx.lineTo(CARD.x - 220 + 440 * smooth(s.title), 368);
    ctx.stroke();
    ctx.restore();
  }
  ctx.save();
  ctx.font = `700 58px ${CAPTION_FONT}`;
  const most = ctx.measureText('most animals ').width;
  const fail = ctx.measureText('fail').width;
  ctx.restore();
  const left = CARD.x - (most + fail) / 2;
  drawTextLine(ctx, 'most animals', left + most / 2 - 8, 434, 58, 700, s.most);
  drawTextLine(ctx, 'fail', left + most + fail / 2, 434, 58, 700, s.fail, { fill: RED, halo: PAPER });

  for (const id of ['dog', 'cat', 'wrasse'] as const) {
    const row = s.rows[id];
    const y = ROW_Y[id];
    drawRowRing(ctx, y, row.ring);
    if (row.shown <= 0) continue;
    const e = smooth(row.shown);
    ctx.save();
    ctx.globalAlpha = e;
    ctx.translate(70 * (1 - e), 0);
    ctx.save();
    ctx.translate(SKETCH_X, y);
    ctx.scale(SKETCH_SCALE, SKETCH_SCALE);
    if (id === 'dog') drawDog(ctx);
    if (id === 'cat') drawCat(ctx);
    ctx.translate(id === 'wrasse' ? 110 : 116, 0);
    drawMiniMirror(ctx);
    ctx.restore();
    if (id === 'wrasse') drawWrasse(SKETCH_X - 6, y - 36);
    drawTextLine(ctx, NAME[id], NAME_X, y - 18, id === 'wrasse' ? 62 : 68, 700, 1);
    ctx.restore();
    const jolt = id === 'dog' ? s.jolt : 0;
    drawStamp(ctx, id === 'wrasse' ? 'tick' : 'cross', STAMP_X, y - 34, 74, row.stamp * (1 + 0.25 * jolt), 0.25 * jolt * Math.sin(jolt * 9));
  }
  ctx.restore();
}
