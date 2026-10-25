import { Chaser } from '../enemies/chaser';
import { catchable } from '../preyTypes';
import { isHesitant } from '../chapters/jungleMongoose';
import { holdStill } from '../chapters/junglePrey';
import { swallowRival } from '../chapters/jungleRival';
import { dist } from '../vec';
import type { Ability, AbilityCtx, AbilityInput, AbilityMaker } from './types';

/** Rearing up takes this long, held still, s; the hood spreads this far into it. */
const REAR = 0.7;
const SPREAD_AT = 0.12;
/** Everything this close to the head when the hood spreads freezes, px, for this long, s. */
export const HOOD_REACH = 160;
const FREEZE = 2;
/** Rest after a rear before the next, s. */
const REST = 5;

/**
 * The king cobra's hood: press the ability and it rears up a third of its
 * body, spreads its hood and growls (it holds still a moment, though it can
 * still strike from up there). Everything near freezes for a couple of
 * seconds, enemies and prey alike, except a honey badger, which isn't
 * impressed, and the Grey Mongoose, which only stops to stare. Then it
 * needs a rest. The cobra eats other snakes too: this ability also runs
 * its swallowing of rival snakes every frame (jungleRival.ts).
 */
export class Hood implements Ability {
  readonly id = 'hood';
  readonly label = 'Hood';
  readonly button = true;
  /** Seconds into the rear, or -1 when not rearing. */
  private t = -1;
  private rest = 0;
  private spread = false;
  private count = 0;

  get charge(): number {
    return this.rest > 0 ? 1 - this.rest / REST : 1;
  }

  get active(): boolean {
    return this.t >= 0;
  }

  /** How many times the hood has spread this level (the view rings each one). */
  get spreads(): number {
    return this.count;
  }

  /** How far the hood is spread, 0..1 (for the view: it opens, holds, and folds). */
  get open(): number {
    if (this.t < 0) return 0;
    const fold = 0.14;
    return Math.max(0, Math.min(1, this.t / SPREAD_AT, (REAR - this.t) / fold));
  }

  step(ctx: AbilityCtx, input: AbilityInput, dt: number): void {
    swallowRival(ctx);
    const s = ctx.snake;
    this.rest = Math.max(0, this.rest - dt);
    if (this.t < 0) {
      if (input.pressed && this.rest <= 0 && s.mode === 'move') {
        this.t = 0;
        this.spread = false;
        ctx.emit({ type: 'say', text: 'Hsssss…', x: s.head.x, y: s.head.y - 34, sound: 'growl' });
      }
      return;
    }
    this.t += dt;
    if (s.mode !== 'move' || this.t >= REAR) {
      this.t = -1;
      this.rest = REST;
      return;
    }
    s.hold = true;
    if (!this.spread && this.t >= SPREAD_AT) {
      this.spread = true;
      this.count += 1;
      this.spreadHood(ctx);
    }
  }

  /** The hood spreads: everything near freezes, the boss hesitates, a honey badger couldn't care less. */
  private spreadHood(ctx: AbilityCtx): void {
    const h = ctx.snake.head;
    for (const e of ctx.enemies) {
      if (e.away || dist(e, h) > HOOD_REACH) continue;
      if (e instanceof Chaser && e.spec.unmoved) ctx.emit({ type: 'say', text: 'Not scared!', x: e.x, y: e.y - 26, danger: true });
      else e.freeze?.(FREEZE);
    }
    for (const p of ctx.prey) if (catchable(p) && dist(p, h) <= HOOD_REACH) holdStill(p, FREEZE);
    const b = ctx.boss;
    if (b && !b.away && dist(b, h) <= HOOD_REACH && isHesitant(b)) b.hesitate(ctx.enemyCtx, h);
    // Silent: marks the moment for the hood's first-time hint (see chapters/jungle.ts).
    ctx.emit({ type: 'startle', x: h.x, y: h.y });
  }
}

/** Whether an ability is the king cobra's hood. */
export function isHood(a: Ability | null): a is Hood {
  return a instanceof Hood;
}

export const COBRA: AbilityMaker = () => new Hood();
