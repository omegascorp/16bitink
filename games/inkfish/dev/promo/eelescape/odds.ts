import { INK } from '../../../src/art/pen';
import { drawTextLine } from '../captions';
import { lerp } from '../short';
import { drawEel, EEL_LOOK } from './eelArt';
import { HALO } from './labels';
import { TEXT } from './script';
import { cycles, eelInAt, greyAt, ratioAt, swimOffAt, winnerAt, wrap } from './story';
import { drawSpecks, drawVignette, drawWater, glow, type Rgb, sparkle } from './water';

/**
 * "About one in four made it.": four little eels in a row on soft
 * teal-grey water. On "one" the first turns gold; on "four", a ding and
 * "1 in 4"; on "made it" it swims off in a trail of sparkles while the
 * other three fade to grey outlines (no harm shown).
 */

const TOP: Rgb = [40, 60, 62];
const MID: Rgb = [18, 30, 32];
const BOTTOM: Rgb = [5, 10, 11];

export const ROWS: readonly number[] = [600, 762, 924, 1086];
const LEN = 470;
const HALF = 14;

/** Eel i's head (x, y) at t. */
export function oddsHeadAt(i: number, t: number): { readonly x: number; readonly y: number } {
  const u = wrap(t);
  const arrive = eelInAt(i, u);
  const off = i === 0 ? swimOffAt(u) : 0;
  return { x: 300 + (1 - arrive) * 500 - 950 * off, y: ROWS[i]! - 300 * off };
}

export function drawOdds(ctx: CanvasRenderingContext2D, sheet: HTMLCanvasElement, t: number, boil: number): void {
  const u = wrap(t);
  drawWater(ctx, sheet, TOP, MID, BOTTOM);
  drawSpecks(ctx, t, '#d6e6e2', 0.9);
  const grey = greyAt(u);
  const gold = winnerAt(u);
  for (let i = ROWS.length - 1; i >= 0; i--) {
    const arrive = eelInAt(i, u);
    if (arrive <= 0.01) continue;
    const head = oddsHeadAt(i, u);
    const dull = i === 0 ? 0 : grey;
    const amp = (1 - 0.85 * dull) * (i === 0 ? 1 + swimOffAt(u) : 1);
    const spine = Array.from({ length: 40 }, (_, k) => {
      const f = k / 39;
      return { x: head.x + f * LEN, y: head.y + amp * (5 + 17 * f) * Math.sin(f * 6.5 - cycles(30, t) + i * 1.3) - (i === 0 ? 120 * swimOffAt(u) * f : 0) };
    });
    if (i === 0 && gold > 0.01) glow(ctx, head.x + LEN * 0.4, head.y, 300, '255,205,90', 0.4 * gold);
    ctx.save();
    ctx.globalAlpha = arrive;
    const line = dull > 0 ? `rgb(${Math.round(lerp(27, 150, dull))},${Math.round(lerp(26, 160, dull))},${Math.round(lerp(31, 164, dull))})` : INK;
    drawEel(ctx, spine, HALF, 7300 + i * 59 + boil * 131, { ...EEL_LOOK, fill: 1 - dull, gold: i === 0 ? gold : 0, line, lineAlpha: 1 - 0.3 * dull });
    ctx.restore();
    if (i === 0 && gold > 0.01) {
      for (let k = 0; k < 7; k++) {
        const f = k / 6;
        const tw = 0.5 + 0.5 * Math.sin(cycles(54, t) + k * 2.1);
        const trail = swimOffAt(u) * 260 * f;
        sparkle(ctx, head.x + 40 + f * LEN * 0.9 + trail, head.y - 34 + (k % 2) * 70, 10 + 8 * tw, '#fff1b8', gold * (0.4 + 0.6 * tw));
      }
    }
  }
  const r = ratioAt(u);
  if (r > 0.01) {
    const pop = 1 + (TEXT.pop - 1) * Math.max(0, 1 - Math.abs(r - 0.6) / 0.4) * (r < 1 ? 1 : 0);
    drawTextLine(ctx, '1 in 4', 540, TEXT.ratio.y, TEXT.ratio.size * pop, 700, r, { fill: '#f5c84a', halo: HALO });
  }
  drawVignette(ctx, 0.6, '2,6,7');
}
