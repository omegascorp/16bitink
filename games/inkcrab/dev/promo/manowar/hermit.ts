import { crabSprite, drawSprite, shellSprite, type Sprite } from '../sprites';
import { CRAB_SCALE, type CrabPose } from './story';

/**
 * The game's own hermit crab (the player, in a whelk) on the beach: creeping
 * up to the tentacle, or shut in its shell (the game's hide), spun about the
 * shell's middle as it backflips away from the sting.
 */
export interface HermitSprites {
  readonly back: Sprite;
  readonly shell: Sprite;
  readonly front: Sprite;
}

export const makeHermit = (): HermitSprites => ({ back: crabSprite('back'), shell: shellSprite('whelk'), front: crabSprite('front') });

/** How far above its ground point the shell's middle is. */
const MIDDLE = 34 * CRAB_SCALE;
/** Where its claws are, from its ground point (for the zap). */
export const CLAW = { x: 52 * CRAB_SCALE, y: -16 * CRAB_SCALE } as const;

export function drawHermit(ctx: CanvasRenderingContext2D, sp: HermitSprites, pose: CrabPose, boil: number): void {
  // Turned about the shell's middle, not its foot.
  const at = {
    x: pose.x - Math.sin(pose.rot) * MIDDLE,
    y: pose.y - MIDDLE + Math.cos(pose.rot) * MIDDLE,
    scale: CRAB_SCALE,
    rotation: pose.rot,
  };
  const out = 1 - pose.hidden;
  if (out > 0) drawSprite(ctx, sp.back, boil, { ...at, alpha: out });
  drawSprite(ctx, sp.shell, boil, at);
  // Pulled in: the head and claws slide back into the opening as they go.
  if (out > 0) drawSprite(ctx, sp.front, boil, { ...at, x: at.x - 14 * pose.hidden, alpha: out });
}
