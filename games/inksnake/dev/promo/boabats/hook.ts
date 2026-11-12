import { zoomAbout } from '../heartbeat/boaRig';
import { drawSprite, type Pt } from '../sprites';
import { VIDEO } from '../short';
import { drawVignette } from './cave';
import { type Cast, HOOK_MOUTH, MARGIN } from './cast';
import { type Boa, drawBoa } from './rig';
import { hookClock, hookPose } from './story';

/**
 * Frame 1: a Cuban boa hanging from the cave's rock ceiling, its front third
 * looping down and up again, its jaws shut on a Jamaican fruit bat in mid-
 * air, the bat's wings spread wide against the dusk-orange glow of the cave
 * mouth, a few more bats flying out through the glow behind. Big: the snake
 * and the bat span most of the frame's width.
 */
const RIM: Pt = { x: 800, y: 1110 };
const HEADING = -0.1;
const BAT_TURN = 0;

/** The body from the hinge back: down to the loop's foot, round, and up the left side into the ceiling. */
function knots(sway: number): Pt[] {
  return [
    { x: 330, y: 1164 },
    { x: 196 + sway * 0.3, y: 1110 },
    { x: 140 + sway * 0.5, y: 950 },
    { x: 196 + sway * 0.6, y: 770 },
    { x: 300 + sway * 0.4, y: 610 },
    { x: 318 + sway * 0.2, y: 370 },
    { x: 262, y: 180 },
    { x: 250, y: -260 },
  ];
}

/** A few bats far off, flying out through the glow (on the hook's own clock, so nothing jumps at the loop point). */
function drawDistant(ctx: CanvasRenderingContext2D, cast: Cast, u: number, boil: number): void {
  for (let j = 0; j < 9; j++) {
    const a = -2.6 + j * 0.62;
    const p = (((u * 0.22 + j * 0.37) % 1) + 1) % 1;
    const r = 60 + p * 240;
    const x = HOOK_MOUTH.x + Math.cos(a) * r * 1.1;
    const y = HOOK_MOUTH.y - 40 + Math.sin(a) * r * 0.7;
    const pose = Math.floor(u * 9 + j * 0.5) % 2 === 0 ? 'fly1' : 'fly0';
    drawSprite(ctx, cast.bats.far[pose], boil, { x, y, scale: 0.8 + p * 0.9, rotation: a, alpha: 0.85 * Math.min(1, p * 4) });
  }
}

export function drawHook(ctx: CanvasRenderingContext2D, cast: Cast, t: number, boil: number): void {
  const p = hookPose(t);
  const u = hookClock(t);
  ctx.save();
  zoomAbout(ctx, { x: 700, y: 1040 }, p.zoom, p.kick * 7 * Math.sin(u * 60), p.kick * 6);
  ctx.drawImage(cast.hookBg, -MARGIN, -MARGIN);
  drawDistant(ctx, cast, u, boil);
  const boa: Boa = {
    rim: { x: RIM.x + p.sway * 0.4, y: RIM.y - p.kick * 6 },
    heading: HEADING + p.wiggle * 0.25,
    len: 340,
    neck: 140,
    girth: 1.16,
    knots: knots(p.sway),
    gape: 32,
    eye: 'open',
    held: { pose: 'fly1', scale: 15, turn: BAT_TURN + p.wiggle, back: 0.14, across: 0 },
    offset: 52,
  };
  drawBoa(ctx, cast.boa, cast.bats, boil, boa);
  ctx.drawImage(cast.hookCeiling, -MARGIN, -MARGIN);
  drawVignette(ctx, VIDEO.width, VIDEO.height, 0.55);
  ctx.restore();
}
