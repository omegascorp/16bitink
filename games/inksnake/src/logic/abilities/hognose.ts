import type { Ability, AbilityCtx, AbilityInput, AbilityMaker } from './types';

/** Rolling over takes this long, and rolling back, s. */
const ROLL = 0.25;
/** It can play dead this long at a stretch, s. */
const MAX_DEAD = 5;
/** After a long enough act it needs this long before the next, s. */
const REST = 2.2;

/**
 * The eastern hognose plays dead: hold the ability and it rolls belly-up,
 * mouth open, tongue out, and lies still. Hunters that hunt by sight and
 * want live prey lose interest (most enemies treat it as hidden; a fox's
 * nose isn't fooled, see Diver/Chaser `seesThrough`). Prey isn't scared of
 * a dead snake either. Let go, or steer, and it rolls back.
 */
class PlayDead implements Ability {
  readonly id = 'playdead';
  readonly label = 'Play dead';
  readonly button = true;
  /** Seconds into the act (rolling over, then lying dead), or -1 when not. */
  private t = -1;
  private rest = 0;

  get charge(): number {
    return this.rest > 0 ? 1 - this.rest / REST : 1;
  }

  get active(): boolean {
    return this.t >= 0;
  }

  step(ctx: AbilityCtx, input: AbilityInput, dt: number): void {
    const s = ctx.snake;
    this.rest = Math.max(0, this.rest - dt);
    if (this.t < 0) {
      if (input.held && this.rest <= 0 && s.mode === 'move') {
        this.t = 0;
        ctx.emit({ type: 'say', text: 'Ack!', x: s.head.x, y: s.head.y - 30, sound: 'knot' });
      }
      return;
    }
    this.t += dt;
    const done = !input.held || input.steering || this.t > MAX_DEAD + ROLL || s.mode !== 'move';
    if (done) {
      if (this.t > 1) this.rest = REST;
      this.t = -1;
      return;
    }
    s.hold = true;
    if (this.t >= ROLL) s.cloak = 'dead';
  }
}

export const HOGNOSE: AbilityMaker = () => new PlayDead();
