import { edgePoint, type EnemyCtx } from '../enemyTypes';
import type { ZoneKind } from '../../level/types';
import { dist, pt, type Pt } from '../vec';
import { EnemyBase } from './base';

type PeckerMode = 'away' | 'fly' | 'hop' | 'peck' | 'flee';

/** How a pecker goes for the tail: the crow's numbers by default (see CROW). */
export interface PeckerSpec {
  /** Px a peck takes off the tail. */
  readonly nip: number;
  /** It pecks once the tail tip is this close, px. */
  readonly reach: number;
  /** The wind-up before a peck lands: the tell, s. */
  readonly windup: number;
  /** A strike this close scares it off, px. */
  readonly scareReach: number;
  /** It backs off from a head that comes this close without striking, px. */
  readonly shy: number;
  /** Its speed after the tail, px/s (hops in bursts if `hops`). */
  readonly speed: number;
  readonly hops: boolean;
  /** It flies in and off (a bird); otherwise it walks in from the edge and runs off (a raccoon). */
  readonly flies: boolean;
  /** Seconds away after it's scared off. */
  readonly awayTime: readonly [number, number];
  /** Where it lives: it won't follow the tail off this ground (a hornbill in the trees). */
  readonly zone?: ZoneKind;
}

export const CROW: PeckerSpec = { nip: 16, reach: 26, windup: 0.5, scareReach: 44, shy: 70, speed: 75, hops: true, flies: true, awayTime: [7, 11] };
const FLY_TIME = 1.1;

/**
 * A pecker (the crow, the raccoon, weavers, the hornbill): it flies in, hops after the snake's tail tip and
 * pecks it, taking a little length each time. It never costs a life. A
 * strike scares it away for a while; a head that comes near without
 * striking only makes it hop back.
 */
export class Pecker extends EnemyBase<PeckerMode> {
  private from: Pt = pt(0, 0);
  private to: Pt = pt(0, 0);

  constructor(id: number, kind: string, arriveIn: number, readonly spec: PeckerSpec = CROW) {
    super(id, kind, pt(-100, -100), 'away');
    this.left = arriveIn;
  }

  get away(): boolean {
    return this.m === 'away';
  }

  step(ctx: EnemyCtx, dt: number): void {
    const done = this.tick(dt);
    const tail = ctx.snake.trail.tail;
    if (this.m === 'away') {
      if (done) this.flyIn(ctx, tail);
      return;
    }
    if (this.m === 'fly') {
      const t = Math.min(1, this.age / FLY_TIME);
      this.x = this.from.x + (this.to.x - this.from.x) * t;
      this.y = this.from.y + (this.to.y - this.from.y) * t;
      this.heading = Math.atan2(this.to.y - this.from.y, this.to.x - this.from.x);
      this.alt = this.spec.flies ? Math.sin(t * Math.PI * 0.5 + Math.PI * 0.5) : 0;
      if (t >= 1) {
        this.alt = 0;
        this.go('hop');
        ctx.emit({ type: 'caw', x: this.x, y: this.y });
      }
      return;
    }
    if (this.m === 'flee') {
      if (this.spec.flies) this.alt = Math.min(1, this.alt + dt * 1.6);
      this.moveTo(this.to, this.spec.flies ? 320 : 220, dt);
      const [a, b] = this.spec.awayTime;
      if (done) this.go('away', a + ctx.rng() * (b - a));
      return;
    }
    if (this.struckBy(ctx, this.spec.scareReach)) {
      this.scare(ctx);
      return;
    }
    const head = ctx.snake.head;
    if (this.m === 'hop') {
      // Shy of the head: back off a few hops, then come round again.
      if (dist(head, this) < this.spec.shy) {
        const a = Math.atan2(this.y - head.y, this.x - head.x);
        this.moveTo(pt(this.x + Math.cos(a) * 40, this.y + Math.sin(a) * 40), this.spec.speed * 1.6, dt);
        this.keepOn(ctx, 20);
        return;
      }
      // Hops come in little bursts.
      const moving = !this.spec.hops || Math.sin(this.age * 9) > 0;
      const zone = this.spec.zone;
      if (moving && (!zone || ctx.inZone(tail, zone))) this.moveTo(tail, this.spec.speed, dt);
      if (dist(tail, this) < this.spec.reach) this.go('peck', this.spec.windup);
      return;
    }
    if (this.m === 'peck' && done) {
      if (dist(ctx.snake.trail.tail, this) < this.spec.reach + 10 && ctx.nip(this.spec.nip, this.here()) > 0 && this.kind === 'crow') ctx.emit({ type: 'caw', x: this.x, y: this.y });
      this.go('hop');
    }
  }

  private flyIn(ctx: EnemyCtx, tail: Pt): void {
    this.from = edgePoint(ctx.rng, ctx.w, ctx.h, this.spec.flies ? 80 : 30);
    const a = ctx.rng() * Math.PI * 2;
    this.to = pt(Math.min(ctx.w - 40, Math.max(40, tail.x + Math.cos(a) * 90)), Math.min(ctx.h - 40, Math.max(40, tail.y + Math.sin(a) * 90)));
    this.x = this.from.x;
    this.y = this.from.y;
    this.alt = this.spec.flies ? 1 : 0;
    this.go('fly');
    ctx.emit({ type: 'arrive', kind: this.kind, x: this.to.x, y: this.to.y });
  }

  private scare(ctx: EnemyCtx): void {
    this.to = edgePoint(ctx.rng, ctx.w, ctx.h, 140);
    this.go('flee', this.spec.flies ? 1.2 : 2.2);
    ctx.emit({ type: 'scared', kind: this.kind, x: this.x, y: this.y });
  }

  /** Scared off by a bluff: off it goes for a while. */
  frighten(ctx: EnemyCtx): boolean {
    if (this.m === 'away' || this.m === 'flee') return false;
    this.scare(ctx);
    return true;
  }
}

/** The American crow (chapter 1). */
export class Crow extends Pecker {
  constructor(id: number, arriveIn: number) {
    super(id, 'crow', arriveIn, CROW);
  }
}
