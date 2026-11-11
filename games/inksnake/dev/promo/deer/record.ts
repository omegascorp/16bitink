import { Pen } from '../../../src/art/pen';
import { drawTextLine, PAPER_ON_DARK } from '../captions';
import { drawHeadOn, drawTongue } from '../cobra/lay';
import { lengths, spineOf } from '../pythonbear/python';
import { drawSprite, type Pt } from '../sprites';
import { BURM_SNOUT } from './burmeseHead';
import type { Cast } from './cast';
import { bodyShare, drawSnake } from './lay';
import { percentAt, percentPop, ribbonAt, ribbonPop, tongueAt } from './story';

/**
 * "Scientists think it's the biggest meal for its size ever recorded in a
 * Burmese python.": the fawn lying on the grass and the python, slim again,
 * stretched beside it, its head by the fawn; 111% pops in on "biggest" and a
 * record rosette on "recorded".
 */
const KNOTS: readonly Pt[] = [{ x: 640, y: 1420 }, { x: 800, y: 1440 }, { x: 980, y: 1480 }, { x: 960, y: 1580 }, { x: 700, y: 1610 }, { x: 400, y: 1640 }, { x: 120, y: 1620 }, { x: -40, y: 1600 }];
const SPINE = spineOf(KNOTS, 3);
const S = lengths(SPINE);
const LAY = { spine: SPINE, widths: S.map((d) => 64 * bodyShare(d / S[S.length - 1]!)), base: 64, headRight: false } as const;

function rosette(ctx: CanvasRenderingContext2D, c: Pt, r: number, a: number, boil: number): void {
  if (a <= 0) return;
  const pen = new Pen(ctx, 9300 + boil, 0.5);
  ctx.save();
  ctx.globalAlpha = a;
  for (const s of [-1, 1]) {
    const tail = [{ x: c.x + s * r * 0.15, y: c.y }, { x: c.x + s * r * 0.75, y: c.y + r * 1.9 }, { x: c.x + s * r * 0.45, y: c.y + r * 1.65 }, { x: c.x + s * r * 0.2, y: c.y + r * 1.95 }, { x: c.x - s * r * 0.2, y: c.y }];
    pen.fill(tail, '#b8322a', a);
    pen.stroke([...tail, tail[0]!], 3, '#2a0c08', a, false);
  }
  const petals = Array.from({ length: 48 }, (_, i) => {
    const t = (i / 48) * Math.PI * 2;
    const k = i % 2 === 0 ? 1 : 0.86;
    return { x: c.x + Math.cos(t) * r * k, y: c.y + Math.sin(t) * r * k };
  });
  pen.fill(petals, '#d23b30', a);
  pen.stroke([...petals, petals[0]!], 3, '#2a0c08', a, false);
  const g = ctx.createRadialGradient(c.x - r * 0.2, c.y - r * 0.2, 4, c.x, c.y, r * 0.66);
  g.addColorStop(0, '#ffe7a0');
  g.addColorStop(1, '#d8a038');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(c.x, c.y, r * 0.64, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#2a0c08';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();
  drawTextLine(ctx, 'RECORD', c.x, c.y + r * 0.14, r * 0.42, 700, a, { fill: '#5a1a10', halo: '#ffe7a0' });
}

export function drawRecord(ctx: CanvasRenderingContext2D, cast: Cast, t: number, boil: number): void {
  ctx.drawImage(cast.recordBg, 0, 0);
  drawSprite(ctx, cast.fawn, boil, { x: 300, y: 1430, scale: 0.95 });
  drawSnake(ctx, cast.burm, boil, LAY, 0.8);
  drawHeadOn(ctx, cast.head.shut, boil, LAY, 0.12);
  drawTongue(ctx, LAY, BURM_SNOUT.x, 0.12, tongueAt(t));
  const a = percentAt(t);
  const pop = 1 + 0.18 * percentPop(t);
  drawTextLine(ctx, '111%', 470, 860, 250 * pop, 700, a, { fill: '#ffd27a', halo: '#0b1a2a' });
  drawTextLine(ctx, 'of its own weight', 470, 968, 70, 700, a, PAPER_ON_DARK);
  rosette(ctx, { x: 880, y: 830 }, 110 * (1 + 0.2 * ribbonPop(t)), ribbonAt(t), boil);
}
