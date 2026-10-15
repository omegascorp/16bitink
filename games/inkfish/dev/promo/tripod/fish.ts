import type { FishShape } from '../../../src/art/fishArt';
import { ANATOMY } from '../../../src/art/fish/registry';
import type { Pose } from '../chain';
import { makeSprite, type Sprite } from '../sprites';
import { drawSwimmer, type SwimLook } from '../swimmer';
import { type Fish, PECTORAL_RAYS, pectoralAt, type Pt, type Stilt, STILTS, stiltAt } from './body';
import { CHALK, mudSurface, NIGHT, SPOKEN } from './scene';

/** Drawing the fish: the game's sprites, and the tripodfish's own stilts and front fins on top of its body. */

/** The game's tripodfish without the short stilts and feelers it draws itself (body.ts has full-length ones). */
export function makeTripodSprite(res: number): Sprite {
  const { under: _drawnHere, ...body } = ANATOMY.tripodfish;
  return makeSprite('tripodfish', res, 'light', body);
}

/** A fish as drawSwimmer wants it, at the origin facing right: drawFishAt turns it by `face`. */
const poseOf = (shape: FishShape, f: Fish): Pose => ({
  j: 0, shape, age: 0, x: 0, y: 0, length: f.len, facing: 1, tilt: f.tilt, beat: f.beat, effort: f.effort,
});

export function drawFishAt(ctx: CanvasRenderingContext2D, sprite: Sprite, shape: FishShape, f: Fish, boil: number, look: SwimLook = {}): void {
  ctx.save();
  ctx.translate(f.x, f.y);
  ctx.scale(f.face, 1);
  drawSwimmer(ctx, sprite, poseOf(shape, f), boil, look);
  ctx.restore();
}

/** Pale fin rays, outlined dark so they read on the water. */
const RAY = '#cfd8e2';

function strokeRay(ctx: CanvasRenderingContext2D, from: Pt, ctrl: Pt, to: Pt, width: number, alpha: number, flash: number): void {
  const path = (): void => {
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.quadraticCurveTo(ctrl.x, ctrl.y, to.x, to.y);
  };
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.lineCap = 'round';
  path();
  ctx.strokeStyle = NIGHT;
  ctx.lineWidth = width + 5;
  ctx.stroke();
  path();
  ctx.strokeStyle = RAY;
  ctx.lineWidth = width;
  ctx.stroke();
  if (flash > 0) {
    ctx.globalAlpha = alpha * flash;
    ctx.strokeStyle = SPOKEN;
    ctx.stroke();
  }
  ctx.restore();
}

/** Where a stilt is on screen: root, the bow of the curve, and its foot (never below the mud). */
export function stiltShape(stilt: Stilt, f: Fish, down: number): { readonly root: Pt; readonly ctrl: Pt; readonly foot: Pt } {
  const { root, foot: free } = stiltAt(stilt, f, down);
  const foot = { x: free.x, y: Math.min(free.y, mudSurface(free.x)) };
  const dx = foot.x - root.x;
  const dy = foot.y - root.y;
  // Floppy while folded, near straight once stiffened: bowed back towards the tail.
  const bow = (0.03 + 0.08 * (1 - down)) * Math.hypot(dx, dy);
  const n = Math.hypot(dx, dy) || 1;
  const flip = (dy / n) * -f.face < 0 ? -1 : 1;
  const normal = { x: (flip * dy) / n, y: (-flip * dx) / n };
  return { root, foot, ctrl: { x: (root.x + foot.x) / 2 + normal.x * bow, y: (root.y + foot.y) / 2 + normal.y * bow } };
}

/** The far pelvic ray, drawn behind everything of the fish's. */
export function drawFarStilt(ctx: CanvasRenderingContext2D, f: Fish, down: number, flash: number): void {
  const s = stiltShape(STILTS[1]!, f, down);
  strokeRay(ctx, s.root, s.ctrl, s.foot, 4.5, 0.7, flash);
}

/** The near pelvic ray and the tail ray, behind the body. */
export function drawNearStilts(ctx: CanvasRenderingContext2D, f: Fish, down: number, flash: number): void {
  for (const stilt of [STILTS[2]!, STILTS[0]!]) {
    const s = stiltShape(stilt, f, down);
    strokeRay(ctx, s.root, s.ctrl, s.foot, 6, 1, flash);
  }
}

/** The front fins: long thin rays from behind the head, laid back or held forwards; feeling about, they twitch at the tips. */
export function drawPectorals(ctx: CanvasRenderingContext2D, f: Fish, reach: number, wiggle: (i: number) => number, ticks: number, t: number): void {
  for (let i = 0; i < PECTORAL_RAYS; i++) {
    const { root, tip } = pectoralAt(f, i, reach, wiggle(i));
    const ctrl = { x: (root.x + tip.x) / 2, y: (root.y + tip.y) / 2 - 14 };
    strokeRay(ctx, root, ctrl, tip, 3.5, 0.95, 0);
    if (ticks > 0 && i % 2 === 0) {
      // Little motion ticks either side of a feeling fingertip.
      ctx.save();
      ctx.globalAlpha = ticks * (0.6 + 0.4 * Math.sin(t * 10 + i));
      ctx.strokeStyle = CHALK;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.arc(tip.x, tip.y, 18, Math.PI / 2 + s * 1.1 - 0.4, Math.PI / 2 + s * 1.1 + 0.4);
        ctx.stroke();
      }
      ctx.restore();
    }
  }
}
