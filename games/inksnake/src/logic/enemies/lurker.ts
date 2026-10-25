import type { ZoneKind } from '../../level/types';
import type { EnemyCtx } from '../enemyTypes';
import { dist, pt, type Pt } from '../vec';
import { EnemyBase } from './base';

type LurkerMode = 'lurk' | 'tell' | 'lunge' | 'sink' | 'move';

/** How a lurker waits in its ground and lunges (a caiman in the water, a grouper in the coral). */
export interface LurkerSpec {
  readonly zone: ZoneKind;
  /** It lunges at a head this close, px. */
  readonly range: number;
  /** Bubbles before the lunge (the tell), the lunge itself, s. */
  readonly tell: number;
  readonly lunge: number;
  /** It bites a head this close at the end of the lunge, px. */
  readonly reach: number;
  /** After a lunge it sinks and moves to a new spot, s. */
  readonly rest: number;
  readonly cause: string;
}

/**
 * A lurker: two eyes in the water at a spot of its own. When the snake's
 * head comes within range (and isn't hidden), bubbles rise, then it lunges
 * at where the head was. A head still there loses a life. Then it sinks
 * and slides off to a new spot.
 */
export class Lurker extends EnemyBase<LurkerMode> {
  /** Over the snake's body, not stopped by it: it waits in its hole. */
  readonly overBody = true;
  /** Where the lunge is aimed, while it tells and lunges. */
  aim: Pt | null = null;
  private from: Pt;
  private next: Pt;

  constructor(id: number, kind: string, at: Pt, readonly spec: LurkerSpec) {
    super(id, kind, at, 'lurk');
    this.from = at;
    this.next = at;
  }

  get away(): boolean {
    return false;
  }

  /** How much of it shows above the water, 0 (sunk) .. 1 (lunging). */
  get showing(): number {
    if (this.m === 'lunge') return 1;
    if (this.m === 'tell') return 0.5;
    if (this.m === 'lurk') return 0.25;
    return 0;
  }

  step(ctx: EnemyCtx, dt: number): void {
    const done = this.tick(dt);
    const s = ctx.snake;
    switch (this.m) {
      case 'lurk':
        this.heading = Math.atan2(s.head.y - this.y, s.head.x - this.x);
        if (!s.hidden && dist(s.head, this) < this.spec.range && ctx.inZone(s.head, this.spec.zone)) {
          this.aim = pt(s.head.x, s.head.y);
          this.go('tell', this.spec.tell);
          ctx.emit({ type: 'say', text: 'blub…', x: this.x, y: this.y - 16, danger: true, sound: 'plop' });
        }
        return;
      case 'tell':
        if (done && this.aim) {
          this.from = this.here();
          this.go('lunge', this.spec.lunge);
        }
        return;
      case 'lunge': {
        const a = this.aim;
        if (!a) return;
        const t = Math.min(1, this.age / this.spec.lunge);
        this.x = this.from.x + (a.x - this.from.x) * t;
        this.y = this.from.y + (a.y - this.from.y) * t;
        if (dist(s.head, this) < this.spec.reach + s.width / 2) ctx.hurt(this.spec.cause, this.here());
        if (done) {
          this.aim = null;
          this.go('sink', this.spec.rest);
        }
        return;
      }
      case 'sink':
        if (done) {
          this.next = this.spot(ctx);
          this.go('move', 2.5);
        }
        return;
      case 'move':
        this.moveTo(this.next, 70, dt);
        if (done) this.go('lurk', 1);
        return;
    }
  }

  /** A new spot in its ground, not on top of the snake. */
  private spot(ctx: EnemyCtx): Pt {
    for (let i = 0; i < 30; i++) {
      const p = pt(40 + ctx.rng() * (ctx.w - 80), 40 + ctx.rng() * (ctx.h - 80));
      if (ctx.inZone(p, this.spec.zone) && dist(p, ctx.snake.head) > this.spec.range * 1.3) return p;
    }
    return this.here();
  }
}
