import { INK, PAPER, RED } from '../../../src/art/palette';
import { route } from '../krait/path';
import { smooth } from '../short';
import type { Pt } from '../sprites';
import type { Cast } from './cast';
import { card, write } from './hud';
import { drawStep } from './scene';
import type { Step } from './steps';
import { T, sectionStart as s } from './timeline';

/**
 * Section 3, the game: the game's own "Rat Run" farm board seen whole, as
 * the player sees it, with the corn snake at game proportions gliding in,
 * coiling round a rat (its route spirals in, so the body wraps round) and
 * swallowing it; the title card on "InkSnake", "10 real snakes" and "free".
 */

const RAT_AT: Pt = { x: 600, y: 370 };

function spiral(): Pt[] {
  const entry: Pt[] = [{ x: 1300, y: 250 }, { x: 980, y: 200 }, { x: 800, y: 300 }, { x: 690, y: 310 }];
  const turns: Pt[] = Array.from({ length: 22 }, (_, i) => {
    const u = i / 21;
    const a = -Math.PI * 0.6 - u * Math.PI * 2.3;
    const r = 78 * (1 - u * 0.82);
    return { x: RAT_AT.x + Math.cos(a) * r, y: RAT_AT.y + Math.sin(a) * r };
  });
  return [...entry, ...turns];
}

const r = route(spiral());

/** The route distance where the spiral reaches the rat. */
function nearRat(): number {
  const d = Array.from({ length: Math.ceil(r.length * 0.4) }, (_, i) => r.length * 0.6 + i);
  return d.reduce((best, x) => (Math.hypot(r.at(x).x - RAT_AT.x, r.at(x).y - RAT_AT.y) < Math.hypot(r.at(best).x - RAT_AT.x, r.at(best).y - RAT_AT.y) ? x : best), d[0]!);
}
const near = nearRat();

export const GAME_STEP: Step = {
  id: 'game', board: 'game', snake: 'corn', meal: 'rat', scale: 3.5, cm: 70, wide: 4.3, route: r, mealS: near,
  gulp: [[s(3) - 0.3, -1], [T.tenReal + 0.4, -0.02], [T.tenReal + 0.8, 0], [T.free - 0.4, 1]],
  lump: [T.free - 0.4, s(4)], rest: 0.4,
  cams: [{ t: s(3), x: 480, y: 270, zoom: 2 }, { t: T.tenReal, x: 600, y: 330, zoom: 2.8 }, { t: T.free, x: 560, y: 320, zoom: 2.4 }],
};

/** Draws the game section at t. */
export function drawGame(ctx: CanvasRenderingContext2D, cast: Cast, t: number, boil: number): void {
  drawStep(ctx, cast, GAME_STEP, t, boil);
  // The title card, left.
  const a = smooth((t - T.inkSnake + 0.2) / 0.4);
  if (a <= 0) return;
  const drop = (1 - a) * -60;
  card(ctx, 60, 120 + drop, 560, 420, a, -0.02);
  write(ctx, 'InkSnake', 340, 280 + drop, 150, { alpha: a, fill: INK });
  write(ctx, '10 real snakes', 340, 380 + drop, 64, { alpha: a * smooth((t - T.tenReal) / 0.4) });
  write(ctx, 'free · 16bit.ink', 340, 480 + drop, 66, { alpha: a * smooth((t - T.free) / 0.4), fill: RED, halo: PAPER });
}
