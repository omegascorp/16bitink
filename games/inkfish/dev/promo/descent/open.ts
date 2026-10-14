import type { FishShape } from '../../../src/art/fishArt';
import type { Pose } from '../chain';
import { drawChomp } from '../effects';
import { ramp } from '../short';
import type { Sprite } from '../sprites';
import { drawSwimmer } from '../swimmer';
import { drawBarreleyeAt } from './barreleye';
import { FRAME } from './frame';
import { T } from './timeline';

/**
 * The cold open's close-ups, before the dive: three of the strangest fish
 * down there, filling the picture, one per line of the hook. Frame 1 is the
 * viperfish snapping. Its drawing is already all gape and fangs (they're
 * too long to close over), so it snaps by lunging, not by opening wider.
 *
 *   0       "The deeper you go…": the viperfish snaps, and again on "teeth"
 *   heads   "Heads you can see straight through": the barreleye, its eyes turning up
 *   search  "Searchlights…": the stoplight loosejaw, its red beam sweeping
 *   keep    "But keep going": the dive takes over (render.ts)
 */

const W = FRAME.width;
const H = FRAME.height;

export interface CloseUp {
  readonly shape: FishShape;
  readonly from: number;
  readonly to: number;
}

export const CLOSE_UPS: readonly CloseUp[] = [
  { shape: 'viperfish', from: 0, to: T.heads - 0.15 },
  { shape: 'barreleye', from: T.heads - 0.15, to: T.searchlights - 0.15 },
  { shape: 'loosejaw', from: T.searchlights - 0.15, to: T.keepGoing },
];

/** The viperfish snaps in the very first frames, and again as "teeth" is said. */
export const SNAPS = [0.12, T.fangs + 0.35] as const;
/** How far the viperfish's head is thrown forward at a snap, 0 .. 1: fast out, landing on the snap, slower back. */
const lungeAt = (t: number): number => Math.max(...SNAPS.map((s) => {
  const d = t - s;
  if (d < -0.12 || d > 0.45) return 0;
  return d < 0 ? Math.sin((Math.PI / 2) * (1 + d / 0.12)) : 0.5 + 0.5 * Math.cos((Math.PI * d) / 0.45);
}));
/** The lunge's reach (px) and nose dip (radians). */
const LUNGE_PX = 90;
const LUNGE_DIP = 0.07;

export const closeUpAt = (t: number): CloseUp | null => CLOSE_UPS.find((c) => t >= c.from && t < c.to) ?? null;

/** Black water with a little blue in it, and drifting motes. */
function drawDeep(ctx: CanvasRenderingContext2D, t: number): void {
  const g = ctx.createRadialGradient(W / 2, H / 2, 100, W / 2, H / 2, 1100);
  g.addColorStop(0, '#0d1838');
  g.addColorStop(1, '#03060f');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.fillStyle = '#dfe8ff';
  for (let i = 0; i < 160; i++) {
    const x = (i * 397.3 + 13 * Math.sin(t * 0.3 + i)) % W;
    const y = (i * 211.7 + 18 * t) % H;
    ctx.globalAlpha = 0.18 + 0.12 * Math.sin(i);
    ctx.beginPath();
    ctx.arc(x, y, 1.2 + (i % 3) * 0.6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** The loosejaw's beam: a red cone from in front of its eye, sweeping slowly. */
export function drawRedBeam(ctx: CanvasRenderingContext2D, x: number, y: number, facing: 1 | -1, reach: number, sweep: number, strength: number): void {
  if (strength <= 0) return;
  const dir = (facing > 0 ? 0 : Math.PI) + facing * sweep;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(x, y, 6, x, y, reach);
  g.addColorStop(0, `rgba(255,70,50,${(0.5 * strength).toFixed(3)})`);
  g.addColorStop(0.5, `rgba(220,40,30,${(0.2 * strength).toFixed(3)})`);
  g.addColorStop(1, 'rgba(200,30,20,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, reach, dir - 0.3, dir + 0.3);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** Draws the close-up for time t. `glowFor` draws a fish's own lights. */
export function drawCloseUp(
  ctx: CanvasRenderingContext2D, shot: CloseUp, t: number, sprite: Sprite, boil: number, glow: (pose: Pose, strength: number) => void,
): void {
  drawDeep(ctx, t);
  const since = t - shot.from;
  const drift = 22 * since;
  let pose: Pose;
  if (shot.shape === 'viperfish') {
    const lunge = lungeAt(t);
    pose = {
      j: 0, shape: 'viperfish', age: 0, x: 1060 - drift - LUNGE_PX * lunge, y: 560 + 12 * lunge, length: 1150, facing: -1,
      tilt: 0.04 * Math.sin(t) - LUNGE_DIP * lunge, beat: 2 * Math.PI * 0.6 * t + 3 * lunge, effort: 0.25 + 0.6 * lunge,
    };
    drawSwimmer(ctx, sprite, pose, boil);
    glow(pose, 0.4);
    for (const s of SNAPS) drawChomp(ctx, pose, (t - s) / 0.3);
  } else if (shot.shape === 'barreleye') {
    // Its eyes turn inside its clear head, to look straight up through it.
    const up = ramp(t, shot.from + 0.9, shot.from + 1.7);
    drawBarreleyeAt(ctx, { x: 860 + drift, y: 640, length: 1150, facing: 1, tilt: 0, eyesUp: up, beat: 2 * Math.PI * 0.5 * t, effort: 0.15, alpha: 1 }, boil);
    return;
  } else {
    pose = { j: 0, shape: 'loosejaw', age: 0, x: 760 + drift, y: 560, length: 1000, facing: 1, tilt: 0.03 * Math.sin(t * 0.8), beat: 2 * Math.PI * 0.7 * t, effort: 0.3 };
    drawSwimmer(ctx, sprite, pose, boil);
    glow(pose, 1);
    const eye = { x: pose.x + pose.length * 0.36, y: pose.y + 10 };
    drawRedBeam(ctx, eye.x, eye.y, 1, 1400, 0.18 * Math.sin((t - shot.from) * 1.4), ramp(t, shot.from + 0.1, shot.from + 0.5));
  }
}
