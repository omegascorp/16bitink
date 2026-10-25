import type { Ability, AbilityCtx, AbilityInput, AbilityMaker } from './types';

/** Sinking until only the eyes and nostrils show takes this long, s. */
const SINK = 0.3;
/** Under the water it's slower; on land it's slow anyway (a heavy snake out of the water). */
const UNDER_SPEED = 0.65;
const LAND_SPEED = 0.8;
/** It can stay under this long on one breath, s, and takes this long at the surface to fill up again from empty. */
const BREATH_FOR = 8;
const REFILL = 3;
/** Out of breath, it can't go under again until its breath is back to this much. */
const READY = 0.4;
/** Its "blub" is said at most this often, s. */
const SAY_EVERY = 2.5;

/**
 * The green anaconda submerges: hold the ability in the water and it sinks
 * until only its eyes and nostrils show (they sit on top of its head for
 * just this). Under the water hunters lose it (the `submerged` cloak: the
 * caiman, the bigger anaconda and the jaguar can't see it unless it's
 * very close), and prey coming to drink at the banks doesn't see it
 * either: the ambush. It swims slower under the water and must come up for
 * air now and then. A strike bursts out of the water; let go, or leave
 * the water, to surface. On land it's slow anyway; at the surface it
 * swims at full speed.
 */
class Submerge implements Ability {
  readonly id = 'submerge';
  readonly label = 'Submerge';
  readonly button = true;
  /** Seconds under (sinking, then submerged), or -1 at the surface. */
  private t = -1;
  private breath = 1;
  /** Came up out of breath: it has to catch it first. */
  private gasping = false;
  private quiet = 0;

  get charge(): number {
    return this.gasping ? Math.min(1, this.breath / READY) : 1;
  }

  get active(): boolean {
    return this.t >= 0;
  }

  step(ctx: AbilityCtx, input: AbilityInput, dt: number): void {
    const s = ctx.snake;
    const wet = ctx.inZone(s.head, 'water');
    this.quiet = Math.max(0, this.quiet - dt);
    s.speedScale = wet ? 1 : LAND_SPEED;
    if (this.t >= 0 && (!input.held || !wet || s.striking || s.mode === 'stun' || this.breath <= 0)) {
      if (this.breath <= 0) {
        this.gasping = true;
        ctx.emit({ type: 'say', text: 'gasp!', x: s.head.x, y: s.head.y - 28, danger: true });
      }
      this.t = -1;
    }
    if (this.t < 0) {
      this.breath = Math.min(1, this.breath + dt / REFILL);
      if (this.gasping && this.breath >= READY) this.gasping = false;
      if (input.held && wet && !this.gasping && !s.striking && s.mode !== 'stun') {
        this.t = 0;
        if (this.quiet <= 0) {
          this.quiet = SAY_EVERY;
          ctx.emit({ type: 'say', text: 'blub…', x: s.head.x, y: s.head.y - 26, sound: 'plop' });
        }
      }
    }
    if (this.t >= 0) {
      this.t += dt;
      this.breath = Math.max(0, this.breath - dt / BREATH_FOR);
      s.speedScale = UNDER_SPEED;
      if (this.t >= SINK) s.cloak = 'submerged';
    }
    s.meter = this.breath < 1 ? { label: 'Breath', value: this.breath, low: this.breath < 0.25 } : null;
  }
}

export const ANACONDA: AbilityMaker = () => new Submerge();
