import { catchable } from '../preyTypes';
import { dist, turnTowards } from '../vec';
import type { Ability, AbilityCtx, AbilityInput, AbilityMaker } from './types';

/** Shimmying down into the sand takes this long before it's hidden, s. */
export const SINK_TIME = 0.6;
/** It can stay buried this long at a stretch, s (then it comes up for a moment). */
const MAX_BURIED = 8;
/** After a burial it needs this long before the next, s. */
const REST = 1.2;
/** Off loose sand (gravel, rock) sidewinding grips badly: this much of its speed. */
const OFF_SAND_SPEED = 0.85;
/** On sand it throws its loops a little sharper. */
const SAND_TURN = 1.1;
/** Buried, it turns its head to follow prey this close, px, this fast, rad/s (the ambush's aim). */
const AIM_REACH = 130;
const AIM_TURN = 2.4;
/**
 * After a big meal the head has turned to it (perhaps back over its own
 * body): it may slide over itself this long, s, as after a coil, rather
 * than knot the moment it moves off.
 */
const SLIDE_OFF = 0.9;
/** Prey this close to a buried snake drifts towards it, unafraid, turning this fast, rad/s. */
const LURE_REACH = 200;
const LURE_TURN = 0.9;

/**
 * The sidewinder buries itself ("cratering"): hold the ability on sand and
 * it stops and shimmies down until only its eyes show. Buried, hunters
 * can't see it (the `buried` cloak), prey isn't afraid of it and wanders
 * close, and its head turns to follow prey near it: a strike from the sand
 * is the ambush, and it ends the burial. Let go, or steer, to come up.
 * It also sidewinds: full speed and sharper turns over loose sand, slower
 * over gravel and rock.
 */
class Bury implements Ability {
  readonly id = 'bury';
  readonly label = 'Bury';
  readonly button = true;
  /** Seconds into a burial (sinking, then buried), or -1 when not. */
  private t = -1;
  private rest = 0;
  /** The snake's mode last step, to see a swallow end. */
  private was: string = 'move';

  get charge(): number {
    return this.rest > 0 ? 1 - this.rest / REST : 1;
  }

  get active(): boolean {
    return this.t >= 0;
  }

  /** Whether it's down in the sand now (not just sinking). */
  get buried(): boolean {
    return this.t >= SINK_TIME;
  }

  step(ctx: AbilityCtx, input: AbilityInput, dt: number): void {
    const s = ctx.snake;
    if (this.was === 'swallow' && s.mode === 'move') s.uncoil = Math.max(s.uncoil, SLIDE_OFF);
    this.was = s.mode;
    const onSand = ctx.inZone(s.head, 'sand');
    s.speedScale = onSand ? 1 : OFF_SAND_SPEED;
    s.turnScale = onSand ? SAND_TURN : 1;
    this.rest = Math.max(0, this.rest - dt);
    if (this.t < 0) {
      if (input.held && onSand && this.rest <= 0 && s.mode === 'move' && !s.striking) {
        this.t = 0;
        ctx.emit({ type: 'say', text: 'shff…', x: s.head.x, y: s.head.y - 26, sound: 'bump' });
      }
      return;
    }
    this.t += dt;
    // A strike from the sand is the ambush: it bursts out, and the burial is over.
    const done = !input.held || input.steering || s.striking || s.mode !== 'move' || this.t > MAX_BURIED + SINK_TIME;
    if (done) {
      this.rest = REST;
      this.t = -1;
      return;
    }
    s.hold = true;
    if (this.t < SINK_TIME) return;
    s.cloak = 'buried';
    this.ambush(ctx, dt);
  }

  /** Buried: the head follows the nearest prey in reach, and prey near it wanders closer, unafraid. */
  private ambush(ctx: AbilityCtx, dt: number): void {
    const s = ctx.snake;
    const h = s.head;
    let near: { x: number; y: number } | null = null;
    let nd = AIM_REACH;
    for (const p of ctx.prey) {
      if (!catchable(p) || p.mode === 'sleep') continue;
      const d = dist(p, h);
      if (d < nd) {
        nd = d;
        near = p;
      }
      if (d < LURE_REACH && d > s.width && p.mode === 'walk') p.heading = turnTowards(p.heading, Math.atan2(h.y - p.y, h.x - p.x), LURE_TURN * dt);
    }
    if (near) s.heading = turnTowards(s.heading, Math.atan2(near.y - h.y, near.x - h.x), AIM_TURN * dt);
  }
}

export const SIDEWINDER: AbilityMaker = () => new Bury();
