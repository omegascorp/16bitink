import { Chaser, type ChaserSpec } from '../enemies/chaser';
import type { EnemyCtx } from '../enemyTypes';

/** The hedgehog's numbers: slower than a warm adder, faster than a cold one; a strike only pricks the striker. */
export const HEDGEHOG: ChaserSpec = {
  speed: 72, prowl: 30, sight: 170, reach: 16, bite: { kind: 'nip', amount: 26 }, scared: 'prickly', avoid: 'water',
};

/**
 * The hedgehog (chapter 8): a chaser that snuffles about and runs at the
 * adder's head, too prickly to strike. Hedgehogs resist adder venom. A
 * nip takes some length; then it trundles off a while with its mouthful,
 * so a cold snake caught by one gets a moment to bask, not an endless chase.
 */
export class Hedgehog extends Chaser {
  private biting = false;

  constructor(id: number, arriveIn: number, spec: ChaserSpec = HEDGEHOG) {
    super(id, 'hedgehog', arriveIn, spec);
  }

  step(ctx: EnemyCtx, dt: number): void {
    super.step(ctx, dt);
    const biting = this.mode === 'bite';
    if (this.biting && !biting) this.frighten(ctx, ctx.snake.head);
    this.biting = biting;
  }
}
