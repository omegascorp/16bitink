import { BIG_MEAL } from '../species';
import { dist, type Pt } from '../vec';
import type { Ability, AbilityCtx, AbilityInput, AbilityMaker } from './types';

/** The rasp: coiled still this long, s; it scares off what's this close, px; then it rests this long, s. */
const RASP_TIME = 0.5;
export const RASP_REACH = 150;
const RASP_REST = 5;
/** An egg's shell comes back out this long after it went down, s. */
const SPIT_AFTER = 0.9;

/** An eggshell spat out: where, and when (s into the level), for the chapter's view. */
export interface SpatShell {
  readonly x: number;
  readonly y: number;
  readonly at: number;
  /** A big egg's shell (a guineafowl's). */
  readonly big: boolean;
}

/**
 * The African egg-eater's rasp: press the ability and it throws its body
 * into C-shaped coils and rubs its keeled scales together with a rasping
 * hiss, as a saw-scaled viper does. Every enemy close by that can be
 * frightened runs off (the boss can't be: the Secretary Bird isn't fooled).
 * Then it needs a rest. It also keeps track of the eggs going down: each
 * egg is cracked in the throat and its shell spat out a moment later
 * (`shells`, for the view; a big one says so).
 */
class Rasp implements Ability {
  readonly id = 'rasp';
  readonly label = 'Rasp';
  readonly button = true;
  /** The shells spat out so far this level, newest last (a few kept). */
  readonly shells: SpatShell[] = [];
  /** Seconds into the rasp, or -1 when not rasping. */
  private t = -1;
  private rest = 0;
  /** The lumps already counted (each is an egg that went down). */
  private readonly seen = new WeakSet<object>();
  /** Eggs on their way down: when each shell comes out, and whether it's a big one. */
  private spits: { in: number; big: boolean }[] = [];

  get charge(): number {
    return this.rest > 0 ? 1 - this.rest / RASP_REST : 1;
  }

  get active(): boolean {
    return this.t >= 0;
  }

  step(ctx: AbilityCtx, input: AbilityInput, dt: number): void {
    const s = ctx.snake;
    this.rest = Math.max(0, this.rest - dt);
    this.watchEggs(ctx, dt);
    if (this.t < 0) {
      if (input.pressed && this.rest <= 0 && s.mode === 'move') this.rasp(ctx);
      return;
    }
    this.t += dt;
    if (this.t >= RASP_TIME || s.mode !== 'move') {
      this.t = -1;
      return;
    }
    s.hold = true;
  }

  private rasp(ctx: AbilityCtx): void {
    const h = ctx.snake.head;
    this.t = 0;
    this.rest = RASP_REST;
    ctx.emit({ type: 'say', text: 'rasp-rasp-rasp', x: h.x, y: h.y - 30, sound: 'squeeze' });
    for (const e of ctx.enemies) {
      if (e === ctx.boss || e.away || dist(e, h) > RASP_REACH) continue;
      if (e.frighten?.(ctx.enemyCtx, h)) ctx.emit({ type: 'scared', kind: e.kind, x: e.x, y: e.y });
    }
    const b = ctx.boss;
    if (b && !b.away && dist(b, h) < RASP_REACH * 1.5) ctx.emit({ type: 'say', text: 'Not impressed.', x: b.x, y: b.y - 40 });
  }

  /** A new lump is an egg gone down: its shell comes back out shortly. */
  private watchEggs(ctx: AbilityCtx, dt: number): void {
    const s = ctx.snake;
    for (const l of s.lumps) {
      if (this.seen.has(l)) continue;
      this.seen.add(l);
      this.spits.push({ in: SPIT_AFTER, big: l.size > s.width * BIG_MEAL });
    }
    for (const sp of this.spits) sp.in -= dt;
    while (this.spits[0] && this.spits[0].in <= 0 && s.mode === 'move') {
      const sp = this.spits.shift()!;
      this.spit(ctx, s.head, sp.big);
    }
  }

  private spit(ctx: AbilityCtx, at: Pt, big: boolean): void {
    const s = ctx.snake;
    // The shell lands a little to one side of the head.
    const side = s.heading + (ctx.rng() < 0.5 ? 1 : -1) * 1.8;
    const x = at.x + Math.cos(side) * (s.width + 4);
    const y = at.y + Math.sin(side) * (s.width + 4);
    this.shells.push({ x, y, at: ctx.elapsed, big });
    if (this.shells.length > 12) this.shells.shift();
    if (big) ctx.emit({ type: 'say', text: 'ptoo!', x, y: y - 22 });
  }
}

/** Whether an ability is the egg-eater's rasp (the chapter's view reads its shells). */
export function isRasp(a: Ability | null): a is Ability & { readonly shells: readonly SpatShell[] } {
  return a instanceof Rasp;
}

export const EGGEATER: AbilityMaker = () => new Rasp();
