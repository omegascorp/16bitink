import { glaze } from '../../../src/art/snakes/cornPaint';
import { Pen } from '../../../src/art/pen';
import { drawTextLine, PAPER_ON_DARK } from '../captions';
import { drawHeadOn } from '../cobra/lay';
import { lerp } from '../short';
import { drawSprite, type Pt } from '../sprites';
import type { Cast } from './cast';
import { coilOf, drawCoil } from './lay';
import { beamTilt, fawnDrop, fawnWeight, snakeWeight, wrap } from './story';

/**
 * "The snake: thirty-one pounds. The fawn: THIRTY-FIVE!": a big wooden
 * balance on the bank, the python coiled on the left pan (31.5 lb, 14.3 kg
 * small under); on "fawn" the fawn drops onto the right pan and the beam
 * tips over with a thunk and a wobble (35 lb, 15.9 kg). Pounds first.
 */
const PIVOT: Pt = { x: 540, y: 1330 };
/** The beam and what is on it, drawn a little bigger about the pivot. */
const BIG = 1.12;
const ARM = 320;
const BEAM = { half: 470, thick: 34 } as const;
const TRAY = { half: 168, h: 34 } as const;
const COIL = coilOf({ x: -ARM, y: -TRAY.h - 66 }, 128, 34, 2.4, 54, 0.4, 0.6);
const FAWN_K = 0.74;
const FAWN_Y = -TRAY.h - 94 * FAWN_K + 4;

const WOOD = { lit: '#c08a52', mid: '#94643a', deep: '#5a3a20', line: '#20140a' } as const;

function plank(ctx: CanvasRenderingContext2D, pen: Pen, x0: number, y0: number, w: number, h: number): void {
  const g = ctx.createLinearGradient(0, y0, 0, y0 + h);
  g.addColorStop(0, WOOD.lit);
  g.addColorStop(0.5, WOOD.mid);
  g.addColorStop(1, WOOD.deep);
  ctx.fillStyle = g;
  ctx.fillRect(x0, y0, w, h);
  for (let k = 0; k < 5; k++) pen.hair([{ x: x0 + 8, y: y0 + h * (0.2 + k * 0.15) }, { x: x0 + w - 8, y: y0 + h * (0.22 + k * 0.15) }], 1, WOOD.deep, 0.35);
  ctx.strokeStyle = WOOD.line;
  ctx.lineWidth = 3;
  ctx.strokeRect(x0, y0, w, h);
}

function stand(ctx: CanvasRenderingContext2D, pen: Pen): void {
  const foot = PIVOT.y + 250;
  const shape = [{ x: PIVOT.x - 30, y: PIVOT.y }, { x: PIVOT.x + 30, y: PIVOT.y }, { x: PIVOT.x + 130, y: foot }, { x: PIVOT.x - 130, y: foot }];
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(PIVOT.x, foot + 6, 220, 26, 0, 0, Math.PI * 2);
  ctx.fill();
  pen.fill(shape, WOOD.mid, 1);
  pen.clipped(shape, () => {
    glaze(ctx, PIVOT.x - 50, PIVOT.y + 120, 80, 140, 0, WOOD.lit, 0.6);
    glaze(ctx, PIVOT.x + 80, PIVOT.y + 170, 70, 120, 0, WOOD.deep, 0.6);
  });
  ctx.strokeStyle = WOOD.line;
  ctx.lineWidth = 3.5;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  shape.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  ctx.stroke();
}

function beam(ctx: CanvasRenderingContext2D, pen: Pen): void {
  plank(ctx, pen, -BEAM.half, -BEAM.thick / 2, BEAM.half * 2, BEAM.thick);
  for (const s of [-1, 1]) {
    const x = s * ARM;
    for (const p of [-TRAY.half + 20, TRAY.half - 20]) plank(ctx, pen, x + p - 7, -BEAM.thick / 2 - 12, 14, 12);
    plank(ctx, pen, x - TRAY.half, -BEAM.thick / 2 - 12 - TRAY.h + 12, TRAY.half * 2, TRAY.h - 12);
  }
  // The brass pivot bolt.
  ctx.fillStyle = '#d8b060';
  ctx.beginPath();
  ctx.arc(0, 0, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = WOOD.line;
  ctx.lineWidth = 3;
  ctx.stroke();
}

export function drawScale(ctx: CanvasRenderingContext2D, cast: Cast, t: number, boil: number): void {
  const pen = new Pen(ctx, 9100 + boil, 0.6);
  const tilt = beamTilt(t);
  const drop = fawnDrop(t);
  ctx.drawImage(cast.scaleBg, 0, 0);
  stand(ctx, pen);
  ctx.save();
  ctx.translate(PIVOT.x, PIVOT.y);
  ctx.rotate(tilt);
  ctx.scale(BIG, BIG);
  beam(ctx, pen);
  drawCoil(ctx, cast.burm, boil, COIL, 0.5);
  drawHeadOn(ctx, cast.head.shut, boil, COIL.head, 0.35 + 0.05 * Math.sin(wrap(t) * 2));
  if (drop >= 1) drawSprite(ctx, cast.fawn, boil, { x: ARM, y: FAWN_Y, scale: FAWN_K });
  ctx.restore();
  if (drop > 0 && drop < 1) {
    // Falling in from above, landing on the right pan.
    const c = Math.cos(tilt);
    const s = Math.sin(tilt);
    const land = { x: PIVOT.x + (ARM * c - FAWN_Y * s) * BIG, y: PIVOT.y + (ARM * s + FAWN_Y * c) * BIG };
    drawSprite(ctx, cast.fawn, boil, { x: land.x, y: lerp(land.y - 1100, land.y, drop), scale: FAWN_K * BIG, rotation: lerp(-0.3, tilt, drop) });
  }
  const a31 = snakeWeight(t);
  const a35 = fawnWeight(t);
  if (a31 > 0) {
    drawTextLine(ctx, '31.5 lb', PIVOT.x - ARM * BIG + 10, 790, 118, 700, a31, PAPER_ON_DARK);
    drawTextLine(ctx, '14.3 kg', PIVOT.x - ARM * BIG + 10, 875, 66, 700, a31, PAPER_ON_DARK);
  }
  if (a35 > 0) {
    drawTextLine(ctx, '35 lb', PIVOT.x + ARM * BIG - 10, 790, 132, 700, a35, { fill: '#ffd27a', halo: '#0b1a2a' });
    drawTextLine(ctx, '15.9 kg', PIVOT.x + ARM * BIG - 10, 875, 66, 700, a35, PAPER_ON_DARK);
  }
}
