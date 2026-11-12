import { SNAKE_W } from '../../../src/art/types';
import { ramp, VIDEO } from '../short';
import { drawBodyShadow, type Pt } from '../sprites';
import { spineOf } from '../pythonbear/python';
import type { Cast } from './cast';
import { COBRA } from './cobraArt';
import { COBRA_SNOUT } from './cobraHead';
import { drawHeadOn, drawLaid, drawTongue, type Lay } from './lay';
import { drawMonitor } from './monitor';
import { drawThroat, withHood } from './reared';
import { backOff, BACKED_AT, CUT, FACED_AT, rear, wrap } from './story';

/**
 * "The cobra faced it down, and the lizard backed OFF.": closer, on the mud
 * by the channel in the late light. The king cobra rears, a slim column
 * standing up off its coils, its small head held level at the monitor, and
 * spreads its hood: the neck itself widening flat right behind the head,
 * its pale banded throat facing the monitor (reared.ts). The monitor, side on, head up and tongue tasting, holds;
 * on "backed" it backs away to the right, legs walking backwards.
 */
/** Slim, as a king cobra is: the reared column several times as tall as it is wide. */
const CO_W = 92;
const ZOOM = 1.45;
const FOCUS = { x: 500, y: 1180 } as const;

/** Low on the mud, its head short of the monitor's. */
const LOW: readonly Pt[] = [
  { x: 290, y: 1430 }, { x: 230, y: 1434 }, { x: 175, y: 1440 }, { x: 130, y: 1448 }, { x: 95, y: 1458 }, { x: 65, y: 1470 },
  { x: 40, y: 1486 }, { x: 10, y: 1504 }, { x: -60, y: 1520 }, { x: -200, y: 1528 }, { x: -400, y: 1532 },
];
/** Reared: the neck straight up off the coils, the head on top of it bent forward over the hood (no long crook). */
const HIGH: readonly Pt[] = [
  { x: 380, y: 806 }, { x: 320, y: 792 }, { x: 258, y: 818 }, { x: 232, y: 880 }, { x: 234, y: 990 }, { x: 250, y: 1130 },
  { x: 290, y: 1280 }, { x: 340, y: 1420 }, { x: 250, y: 1500 }, { x: 70, y: 1530 }, { x: -400, y: 1536 },
];

/** The cobra's body from its head back, rearing by `r` (0 low .. 1 up), swaying a little once up. */
export function cobraRear(r: number, sway: number): Lay {
  const knots = LOW.map((p, i) => {
    const q = HIGH[i]!;
    const w = i < 5 ? sway * (1 - i / 5) : 0;
    return { x: p.x + (q.x - p.x) * r + w * 14, y: p.y + (q.y - p.y) * r + w * 4 };
  });
  const spine = spineOf(knots, 3);
  return { spine, widths: spine.map((_, i) => CO_W * (i < 4 ? 0.95 : 1)), base: CO_W, headRight: true };
}

/** The soft shadow under the coils on the mud only: none up the reared neck. */
function coilShadow(ctx: CanvasRenderingContext2D, l: Lay, alpha: number): void {
  const from = l.spine.findIndex((p) => p.y > 1440);
  if (from < 0) return;
  const spine = l.spine.slice(from);
  drawBodyShadow(ctx, { spine, widths: l.widths.slice(from), along: l.base / SNAKE_W }, l.base, alpha);
}

export function drawFace(ctx: CanvasRenderingContext2D, cast: Cast, t: number, boil: number): void {
  const u = wrap(t);
  // Pushed in on the two of them: the reared cobra on the left, the monitor's head on the right.
  ctx.save();
  ctx.translate(540, 1150);
  ctx.scale(ZOOM, ZOOM);
  ctx.translate(-FOCUS.x, -FOCUS.y);
  ctx.drawImage(cast.faceBg, 0, 0, VIDEO.width, VIDEO.height);
  const r = rear(t);
  const sway = r * Math.sin((u - CUT.face) * 2.6) * 0.6;
  const l = cobraRear(r, sway);
  // The hood spreads as it faces the monitor down.
  const hood = ramp(u, FACED_AT - 0.3, FACED_AT + 0.3);
  coilShadow(ctx, l, 0.6);
  const body = withHood(l, hood);
  drawLaid(ctx, cast.cobra, boil, body, COBRA.line, 0);
  drawThroat(ctx, body, r);
  const lift = 0.15 * (1 - r);
  drawHeadOn(ctx, cast.cobraHead.shut, boil, l, lift);
  const flick = (u - CUT.face) % 0.8;
  drawTongue(ctx, l, COBRA_SNOUT.x, lift, flick < 0.24 ? Math.sin((flick / 0.24) * Math.PI) : 0);
  // The monitor, holding, then backing off to the right from "backed".
  const b = backOff(t);
  const tongue = u < BACKED_AT ? Math.max(0, Math.sin(((u - CUT.face) / 0.7) * Math.PI * 2)) : 0;
  drawMonitor(ctx, { x: 820 + 300 * b, y: 1500 }, 3.6, -1, { gait: -2.4 * b, lift: 0.42 - 0.25 * b, tongue, sway: u * 1.2 }, boil);
  ctx.restore();
}
