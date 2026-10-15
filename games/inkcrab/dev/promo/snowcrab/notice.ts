import { pt } from '../../../src/art/kit';
import { BOIL, INK, PAPER_FILL, RED } from '../../../src/art/palette';
import { makeCanvas, Pen } from '../../../src/art/pen';
import { CAPTION_FONT, drawTextLine, INK_ON_PAPER, type TextInk } from '../captions';
import { clamp01, smooth } from '../short';
import { drawSprite, type Sprite } from '../sprites';
import { inkLine, textWidth, writeOn } from './labels';

/**
 * The payoff: a fishing notice for the Bering Sea snow crab season, and the
 * red CANCELLED stamp that comes down on it. The notice is a sketched paper
 * sheet (no real agency's name or seal), written on word by word.
 */
export const NOTICE = { x: 110, y: 310, w: 860, h: 790 } as const;
const RED_INK: TextInk = { fill: RED, halo: PAPER_FILL };

/** The paper sheet, one canvas per boil frame. */
export function makeNoticeSheet(): readonly HTMLCanvasElement[] {
  return Array.from({ length: BOIL }, (_, f) => {
    const { canvas, ctx } = makeCanvas(NOTICE.w + 40, NOTICE.h + 40);
    ctx.translate(20, 20);
    const pen = new Pen(ctx, 6200 + f, 0.7);
    const sheet = [pt(0, 0), pt(NOTICE.w, 0), pt(NOTICE.w, NOTICE.h), pt(0, NOTICE.h)];
    pen.fill(sheet.map((p) => pt(p.x + 10, p.y + 12)), INK, 0.28);
    pen.fill(sheet, PAPER_FILL, 1);
    pen.fill(sheet, '#f1e7cc', 0.5);
    // A ruled border, and a rule under the heading.
    const inset = [pt(22, 22), pt(NOTICE.w - 22, 22), pt(NOTICE.w - 22, NOTICE.h - 22), pt(22, NOTICE.h - 22)];
    pen.stroke([...sheet, sheet[0]!], 3, INK, 0.9);
    pen.stroke([...inset, inset[0]!], 1.6, INK, 0.6, false);
    pen.hair([pt(60, 112), pt(NOTICE.w - 60, 112)], 1.6, INK, 0.7);
    // A pushpin at the top.
    pen.dot(NOTICE.w / 2, 4, 13, RED, 0.9);
    pen.dot(NOTICE.w / 2 - 4, 0, 4, PAPER_FILL, 0.9);
    return canvas;
  });
}

export interface NoticeState {
  readonly show: number;
  readonly year: number;
  readonly alaska: number;
  readonly season: number;
  readonly stamp: number;
  readonly jolt: number;
  readonly first: number;
  readonly ever: number;
}

/** The stamp: a red double-ruled box round CANCELLED, centred at (x, y). */
function drawStamp(ctx: CanvasRenderingContext2D, x: number, y: number, s: number): void {
  if (s <= 0) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.13);
  ctx.scale(s, s);
  ctx.globalAlpha *= clamp01((1.8 - s) / 0.5) * 0.92;
  ctx.strokeStyle = RED;
  ctx.lineJoin = 'round';
  ctx.lineWidth = 11;
  ctx.strokeRect(-340, -95, 680, 190);
  ctx.lineWidth = 4;
  ctx.strokeRect(-322, -77, 644, 154);
  ctx.fillStyle = RED;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `700 150px ${CAPTION_FONT}`;
  ctx.fillText('CANCELLED', 0, 8);
  ctx.restore();
}

/** The notice, slid up from below, jolted by the stamp, written on as the narrator goes. */
export function drawNotice(ctx: CanvasRenderingContext2D, sheet: readonly HTMLCanvasElement[], crab: Sprite, boil: number, s: NoticeState): void {
  if (s.show <= 0) return;
  const e = smooth(s.show);
  const { x, y, w, h } = NOTICE;
  // Text sets its own alpha, so everything on the sheet is multiplied by the sheet's.
  const a = clamp01(s.show * 2.5);
  ctx.save();
  ctx.globalAlpha = a;
  ctx.translate(x + w / 2, y + h / 2 + 260 * (1 - e) + 8 * s.jolt);
  ctx.rotate(0.015 + 0.06 * (1 - e) + 0.012 * s.jolt);
  ctx.translate(-w / 2, -h / 2);
  ctx.drawImage(sheet[boil % sheet.length]!, -20, -20);
  const cx = w / 2;
  drawTextLine(ctx, 'FISHING  NOTICE', cx - 70, 88, 58, 700, a * 0.85);
  writeOn(ctx, '2022', w - 120, 92, 84, 700, s.year, RED_INK, a);
  writeOn(ctx, 'ALASKA', cx, 230, 120, 700, s.alaska, INK_ON_PAPER, a);
  drawTextLine(ctx, 'Bering Sea', cx, 320, 66, 500, a * 0.9);
  drawTextLine(ctx, 'snow crab season', cx, 410, 92, 700, a);
  const sw = textWidth(ctx, 'snow crab season', 92, 700);
  inkLine(ctx, cx - sw / 2, 432, cx + sw / 2, 428, s.season, 6);
  drawSprite(ctx, crab, boil, { x: cx, y: 640, scale: 2.6 });
  drawStamp(ctx, cx, 565, s.stamp);
  writeOn(ctx, 'first time EVER', cx, 742, 96, 700, s.first, RED_INK, a);
  const ew = textWidth(ctx, 'EVER', 96, 700);
  const fw = textWidth(ctx, 'first time EVER', 96, 700);
  const ex = cx + fw / 2 - ew;
  inkLine(ctx, ex - 4, 762, ex + ew + 6, 758, s.ever * 2, 6, RED);
  inkLine(ctx, ex + 2, 776, ex + ew + 2, 773, s.ever * 2 - 1, 5, RED);
  ctx.restore();
}
