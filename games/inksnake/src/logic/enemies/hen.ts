import type { EnemyCtx } from '../enemyTypes';
import { dist, pt, type Pt } from '../vec';
import { EnemyBase } from './base';

type HenMode = 'roost' | 'chase' | 'peck' | 'back' | 'scared';

/** A head this close to her nests sets her running, px. */
const GUARD = 125;
const CHASE_SPEED = 135;
/** She pecks a head this close, px, taking this much length. */
const PECK_REACH = 26;
export const HEN_NIP = 14;
const SCARE_REACH = 40;

/**
 * The hen guarding her eggs: she potters by the nests, and runs at a
 * snake's head that comes close, pecking it (a nip off the tail, never a
 * life). A strike sends her flapping off for a few seconds, which is the
 * moment to take an egg.
 */
export class Hen extends EnemyBase<HenMode> {
  constructor(id: number, private readonly home: Pt) {
    super(id, 'hen', home, 'roost');
  }

  get away(): boolean {
    return false;
  }

  step(ctx: EnemyCtx, dt: number): void {
    const done = this.tick(dt);
    const head = ctx.snake.head;
    const guarding = dist(head, this.home) < GUARD && !ctx.snake.hidden;
    if (this.m === 'scared') {
      const a = Math.atan2(this.y - head.y, this.x - head.x);
      this.moveTo(pt(this.x + Math.cos(a) * 50, this.y + Math.sin(a) * 50), 190, dt);
      this.keepOn(ctx, 24);
      if (done) this.go('back');
      return;
    }
    if (this.m !== 'back' && this.struckBy(ctx, SCARE_REACH)) {
      this.go('scared', 3);
      ctx.emit({ type: 'scared', kind: 'hen', x: this.x, y: this.y });
      return;
    }
    if (this.m === 'roost') {
      // Pottering: a small slow circle by the nests.
      this.moveTo(pt(this.home.x + Math.cos(this.age * 0.7) * 26, this.home.y + Math.sin(this.age * 0.7) * 18), 30, dt);
      if (guarding) {
        this.go('chase');
        ctx.emit({ type: 'cluck', x: this.x, y: this.y });
      }
      return;
    }
    if (this.m === 'chase') {
      this.moveTo(head, CHASE_SPEED, dt);
      if (dist(head, this) < PECK_REACH + ctx.snake.width / 2) {
        ctx.nip(HEN_NIP, this.here());
        ctx.emit({ type: 'cluck', x: this.x, y: this.y });
        this.go('peck', 0.9);
      } else if (!guarding && dist(this, this.home) > GUARD * 0.6) this.go('back');
      return;
    }
    if (this.m === 'peck') {
      if (done) this.go(guarding ? 'chase' : 'back');
      return;
    }
    if (this.moveTo(this.home, 80, dt)) this.go('roost');
    else if (guarding && this.age > 0.6) this.go('chase');
  }
}
