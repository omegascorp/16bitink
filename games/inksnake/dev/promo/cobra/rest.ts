import { drawTextLine, PAPER_ON_DARK } from '../captions';
import type { Pt } from '../sprites';
import { lengths, spineOf } from '../pythonbear/python';
import type { Cast } from './cast';
import { COBRA } from './cobraArt';
import { COBRA_SNOUT } from './cobraHead';
import { drawHeadOn, drawLaid, drawTongue, type Lay } from './lay';
import { latinName, snakeEater, tongueAt, wrap } from './story';

/**
 * "Its scientific name literally means snake eater, because": the cobra lies
 * full on the mud at dusk, a long python-shaped swell down its body, head up
 * and tongue flicking at us; over it, Ophiophagus = snake eater, and the call
 * to action (cta.ts).
 */
const W = 112;

/** The swell of the python inside, from `from` px along, `len` long. */
function swell(s: number, from: number, len: number): number {
  const v = (s - from) / len;
  if (v <= 0 || v >= 1) return 0;
  return Math.sin(v * Math.PI) ** 0.6;
}

function layOf(knots: readonly Pt[], from: number, headRight: boolean, start: number): Lay {
  const spine = spineOf(knots, 3);
  const s = lengths(spine);
  return { spine, widths: s.map((d) => W * (1 + 0.62 * swell(d + start, 200, 1000))), base: W, headRight, offset: start / (W / 24) + from };
}

/** The front half from the head on the left of centre off the right edge, and the back half looping back across the front. */
const FRONT = layOf([{ x: 640, y: 1430 }, { x: 820, y: 1440 }, { x: 1000, y: 1458 }, { x: 1200, y: 1480 }, { x: 1300, y: 1490 }], 0, false, 0);
const BACK = layOf([{ x: 1300, y: 1600 }, { x: 1000, y: 1640 }, { x: 640, y: 1656 }, { x: 260, y: 1640 }, { x: -200, y: 1610 }], 0, true, 760);

export function drawRest(ctx: CanvasRenderingContext2D, cast: Cast, t: number, boil: number): void {
  const u = wrap(t);
  ctx.drawImage(cast.restBg, 0, 0);
  drawLaid(ctx, cast.cobra, boil, BACK, COBRA.line, 0.7);
  drawLaid(ctx, cast.cobra, boil, FRONT, COBRA.line, 0.7);
  const lift = 0.12 + 0.04 * Math.sin(u * 2);
  drawHeadOn(ctx, cast.cobraHead.shut, boil, FRONT, lift);
  drawTongue(ctx, FRONT, COBRA_SNOUT.x, lift, tongueAt(t));
  drawTextLine(ctx, 'Ophiophagus', 540, 700, 120, 700, latinName(t), { fill: '#ffd98a', halo: '#0b1a2a' });
  drawTextLine(ctx, '= snake eater', 540, 812, 92, 700, snakeEater(t), PAPER_ON_DARK);
}
