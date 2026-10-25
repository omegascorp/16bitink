import { edgePoint, type EnemyCtx } from '../enemyTypes';
import { clamp, dist, pt, type Pt } from '../vec';
import { EnemyBase } from './base';

type StomperMode = 'away' | 'walk' | 'raise' | 'stomp' | 'rest' | 'flee';

/** How a stomper hunts: it walks up, raises a foot (or its bill) over a red ring, and brings it down (heron, secretary bird). */
export interface StomperSpec {
  readonly speed: number;
  /** It stops to stomp this far from the head, px. */
  readonly range: number;
  /** The ring it stomps, px. */
  readonly ringR: number;
  /** The raise: the ring follows the head this long, then holds a moment (the tell), s. */
  readonly aim: number;
  readonly hold: number;
  readonly rest: number;
  readonly cause: string;
  /** What it says as it stomps. */
  readonly word: string;
}

/**
 * A stomper: it walks after the snake, then raises a foot over a red ring
 * that follows the head a moment and holds; the stomp lands on the ring.
 * A head in the ring loses a life. After a stomp it stands a moment, open
 * to a strike that sends it off.
 */
export class Stomper extends EnemyBase<StomperMode> {
  /** Where the stomp will land, while raised or stomping. */
  ring: Pt | null = null;
  private target: Pt = pt(0, 0);

  constructor(id: number, kind: string, arriveIn: number, readonly spec: StomperSpec) {
    super(id, kind, pt(-60, -60), 'away');
    this.left = arriveIn;
  }

  get away(): boolean {
    return this.m === 'away';
  }

  get ringR(): number {
    return this.spec.ringR;
  }

  get ringT(): number {
    return this.raised;
  }

  /** How far through the raise it is, 0..1 (the ring tightens). */
  get raised(): number {
    return this.m === 'raise' ? Math.min(1, this.age / (this.spec.aim + this.spec.hold)) : this.m === 'stomp' ? 1 : 0;
  }

  frighten(ctx: EnemyCtx, from: Pt): boolean {
    if (this.m === 'away') return false;
    this.flee(ctx, from);
    return true;
  }

  step(ctx: EnemyCtx, dt: number): void {
    const done = this.tick(dt);
    const s = ctx.snake;
    switch (this.m) {
      case 'away': {
        if (!done) return;
        const e = edgePoint(ctx.rng, ctx.w, ctx.h, 20);
        this.x = e.x;
        this.y = e.y;
        this.go('walk', 1);
        ctx.emit({ type: 'arrive', kind: this.kind, x: this.x, y: this.y });
        return;
      }
      case 'walk':
        this.moveTo(s.head, this.spec.speed, dt);
        this.keepOn(ctx, 20);
        if (!s.hidden && dist(this, s.head) < this.spec.range) {
          this.ring = pt(s.head.x, s.head.y);
          this.go('raise', this.spec.aim + this.spec.hold);
        }
        return;
      case 'raise':
        if (this.ring && this.age < this.spec.aim) {
          const k = Math.min(1, dt * 3);
          this.ring = pt(this.ring.x + (s.head.x - this.ring.x) * k, this.ring.y + (s.head.y - this.ring.y) * k);
        }
        if (this.ring) this.heading = Math.atan2(this.ring.y - this.y, this.ring.x - this.x);
        if (done && this.ring) {
          this.go('stomp', 0.12);
          ctx.emit({ type: 'say', text: this.spec.word, x: this.ring.x, y: this.ring.y - 30, danger: true, sound: 'pounce' });
          if (!s.hidden && dist(s.head, this.ring) < this.spec.ringR) ctx.hurt(this.spec.cause, this.ring);
        }
        return;
      case 'stomp':
        if (done) {
          this.ring = null;
          this.go('rest', this.spec.rest);
        }
        return;
      case 'rest':
        if (this.struckBy(ctx, 40)) {
          ctx.emit({ type: 'scared', kind: this.kind, x: this.x, y: this.y });
          this.flee(ctx, s.head);
          return;
        }
        if (done) this.go('walk', 1);
        return;
      case 'flee':
        this.moveTo(this.target, this.spec.speed * 2, dt);
        if (done) this.go('away', 6 + ctx.rng() * 4);
        return;
    }
  }

  private flee(ctx: EnemyCtx, from: Pt): void {
    this.ring = null;
    const a = Math.atan2(this.y - from.y, this.x - from.x);
    this.target = pt(clamp(this.x + Math.cos(a) * 400, -60, ctx.w + 60), clamp(this.y + Math.sin(a) * 400, -60, ctx.h + 60));
    this.go('flee', 2);
  }
}
