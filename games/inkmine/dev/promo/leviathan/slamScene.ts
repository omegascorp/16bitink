import { makeDraw, pt } from '../../../src/art/kit';
import { makeCanvas } from '../../../src/art/pen';
import { PAPER_FILL, RED } from '../../../src/art/palette';
import { rgba } from '../../../src/art/paint';
import { VIDEO } from '../short';
import { drawSprite } from '../sprites';
import { bubblesIn, drawBubbles } from './bubbles';
import { makeCaveBack } from './cave';
import { FLEE_SCALE } from './chaseScene';
import type { Figures } from './figures';
import { HIT_AT, slamAt, SLAM_AT, wrap } from './story';

const SCALE = 5.4;
const BODY_Y = 1400;
const HIT = pt(690, 900);
/** The nose ahead of the sprite's origin (drawing units). */
const NOSE = 170;

/** An inked burst where it hit: paper spikes and red ones. */
function drawBurst(ctx: CanvasRenderingContext2D, age: number, boil: number): void {
  if (age < 0 || age > 0.34) return;
  const d = makeDraw(ctx, 8500 + boil, boil, 0, PAPER_FILL);
  const u = age / 0.34;
  for (let i = 0; i < 16; i++) {
    const a = i * 2.399 + boil * 0.2;
    const r0 = 40 + 170 * u;
    const r1 = r0 + (i % 2 ? 150 : 240) * (1 - u * 0.5);
    d.pen.stroke([pt(HIT.x + Math.cos(a) * r0, HIT.y + Math.sin(a) * r0), pt(HIT.x + Math.cos(a) * r1, HIT.y + Math.sin(a) * r1)], 16 * (1 - u), i % 3 === 0 ? RED : PAPER_FILL, 1 - u * 0.6, false);
  }
}

/** Side on, as the game plays it: the awake body sweeps through and throws the prospector away. */
export function makeSlamScene(figures: Figures): (ctx: CanvasRenderingContext2D, t: number, boil: number) => void {
  const back = makeCaveBack();
  const { canvas: grade, ctx: g } = makeCanvas(VIDEO.width + 120, VIDEO.height + 120);
  g.fillStyle = '#8580bb';
  g.fillRect(0, 0, grade.width, grade.height);
  return (ctx, time, boil) => {
    const t = wrap(time);
    const s = slamAt(t);
    ctx.drawImage(back, -60, -60);
    drawBubbles(ctx, bubblesIn(t, 18, 9.1, { x0: 0, x1: 1080, y0: 200, y1: 1700, rMin: 5, rMax: 16 }), 0.8);
    const at = { x: s.nose - NOSE * SCALE, y: BODY_Y, scale: SCALE };
    drawSprite(ctx, figures.awake, boil, at);
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.drawImage(grade, -60, -60);
    ctx.restore();
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    drawSprite(ctx, figures.awakeLights, boil, at);
    ctx.restore();
    const figure = s.thrown
      ? { x: s.thrown.x, y: s.thrown.y, rotation: s.thrown.spin, scale: FLEE_SCALE * 1.5 }
      : { x: HIT.x + (t - SLAM_AT) * 80, y: HIT.y, rotation: 0.3, scale: FLEE_SCALE * 1.5 };
    drawSprite(ctx, figures.fly, boil, figure);
    drawBurst(ctx, t - HIT_AT, boil);
    if (s.flash > 0) {
      ctx.fillStyle = rgba('#ffffff', 0.55 * s.flash);
      ctx.fillRect(-60, -60, VIDEO.width + 120, VIDEO.height + 120);
    }
  };
}
