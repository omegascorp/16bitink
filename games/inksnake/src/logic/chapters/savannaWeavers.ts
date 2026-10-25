import { edgePoint, type EnemyCtx } from '../enemyTypes';
import { EnemyBase } from '../enemies/base';
import { clamp, dist, pt, type Pt } from '../vec';

type WeaverMode = 'away' | 'home' | 'perch' | 'mob' | 'dart' | 'flee';

/** How a weaver guards its nest. */
export interface WeaverSpec {
  /** A head this close to its nest sets it mobbing, px. */
  readonly guard: number;
  /** It gives up and flies home once the head is this far from its nest, px. */
  readonly give: number;
  /** Px a nip takes off the tail. */
  readonly nip: number;
  /** The dart's tell: it hangs still over the snake this long before it nips, s. */
  readonly windup: number;
  /** Seconds between darts while it mobs. */
  readonly every: readonly [number, number];
  /** A strike this close sends it off, px. */
  readonly scareReach: number;
  /** Seconds away after it's sent off. */
  readonly awayTime: readonly [number, number];
}

export const WEAVER: WeaverSpec = { guard: 105, give: 190, nip: 14, windup: 0.45, every: [1.6, 2.4], scareReach: 46, awayTime: [7, 10] };

/** Flying in and out takes this long, s; it circles the head this far out, px, this fast, rad/s. */
const FLY_TIME = 1.1;
const ORBIT = 46;
const ORBIT_SPEED = 2.6;
const FLY_SPEED = 260;
/** Height while perched on its hanging nest, and while mobbing, 0..1. */
const PERCH_ALT = 0.3;
const MOB_ALT = 0.45;

/**
 * A weaver bird at its nest (chapter 4): it sits on its hanging nest in an
 * acacia's branch tips, and when a snake's head comes near it flies up and
 * mobs it, fluttering round its head with a chatter and darting down now
 * and then to nip its tail (length, never a life). Leave the nest and it
 * flies home; a strike or a rasp sends it off for a while. (Weavers mobbing
 * snakes at their nests is a game choice, not checked: see the research.)
 */
export class Weaver extends EnemyBase<WeaverMode> {
  /** The nest it guards. */
  readonly home: Pt;
  private from: Pt = pt(0, 0);
  private to: Pt = pt(0, 0);
  private readonly turn: number;

  constructor(id: number, kind: string, home: Pt, arriveIn: number, readonly spec: WeaverSpec = WEAVER) {
    super(id, kind, pt(-100, -100), 'away');
    this.home = home;
    this.left = arriveIn;
    this.turn = (id * 2.39) % (Math.PI * 2);
  }

  get away(): boolean {
    return this.m === 'away';
  }

  /** Sent off by a rasp: off it goes for a while. */
  frighten(ctx: EnemyCtx): boolean {
    if (this.m === 'away' || this.m === 'flee') return false;
    this.flee(ctx);
    return true;
  }

  step(ctx: EnemyCtx, dt: number): void {
    const done = this.tick(dt);
    const s = ctx.snake;
    switch (this.m) {
      case 'away':
        if (done) this.flyHome(ctx, edgePoint(ctx.rng, ctx.w, ctx.h, 80), true);
        return;
      case 'home': {
        const t = Math.min(1, this.age / FLY_TIME);
        this.x = this.from.x + (this.to.x - this.from.x) * t;
        this.y = this.from.y + (this.to.y - this.from.y) * t;
        this.heading = Math.atan2(this.to.y - this.from.y, this.to.x - this.from.x);
        this.alt = PERCH_ALT + (1 - PERCH_ALT) * Math.max(0, 1 - t * 1.4) * 0.6;
        if (t >= 1) this.go('perch');
        return;
      }
      case 'perch':
        this.alt = PERCH_ALT;
        this.x = this.to.x + Math.sin(this.age * 2.1 + this.turn) * 2;
        this.heading = this.turn + Math.sin(this.age * 0.7) * 0.6;
        if (!s.hidden && dist(s.head, this.home) < this.spec.guard) {
          this.go('mob', this.nextDart(ctx));
          ctx.emit({ type: 'say', text: 'chit-chit-chit!', x: this.x, y: this.y - 26, sound: 'squeak', danger: true });
        }
        return;
      case 'flee':
        this.alt = Math.min(1, this.alt + dt * 1.6);
        this.moveTo(this.to, 320, dt);
        if (done) {
          const [a, b] = this.spec.awayTime;
          this.go('away', a + ctx.rng() * (b - a));
        }
        return;
      default:
        break;
    }
    // Mobbing, or about to dart.
    if (this.struckBy(ctx, this.spec.scareReach)) {
      ctx.emit({ type: 'scared', kind: this.kind, x: this.x, y: this.y });
      this.flee(ctx);
      return;
    }
    if (dist(s.head, this.home) > this.spec.give || s.hidden) {
      this.flyHome(ctx, this.here(), false);
      return;
    }
    this.alt = MOB_ALT;
    if (this.m === 'mob') {
      const a = this.turn + ctx.elapsed * ORBIT_SPEED;
      const spot = pt(clamp(s.head.x + Math.cos(a) * ORBIT, 16, ctx.w - 16), clamp(s.head.y + Math.sin(a) * ORBIT, 16, ctx.h - 16));
      this.moveTo(spot, FLY_SPEED, dt);
      if (done) this.go('dart', this.spec.windup);
      return;
    }
    // The dart: it hangs still over the snake (the tell), then nips.
    this.heading = Math.atan2(s.head.y - this.y, s.head.x - this.x);
    if (done) {
      if (dist(s.head, this) < ORBIT * 2.2) ctx.nip(this.spec.nip, this.here());
      this.go('mob', this.nextDart(ctx));
    }
  }

  private nextDart(ctx: EnemyCtx): number {
    const [a, b] = this.spec.every;
    return a + ctx.rng() * (b - a);
  }

  /** Back to its nest, from `from` (flying in from the edge the first time and after being sent off). */
  private flyHome(ctx: EnemyCtx, from: Pt, arriving: boolean): void {
    this.from = from;
    this.to = pt(this.home.x, this.home.y - 8);
    this.x = from.x;
    this.y = from.y;
    this.go('home');
    if (arriving) {
      this.alt = 1;
      ctx.emit({ type: 'arrive', kind: this.kind, x: this.to.x, y: this.to.y });
    }
  }

  private flee(ctx: EnemyCtx): void {
    this.to = edgePoint(ctx.rng, ctx.w, ctx.h, 140);
    this.go('flee', 1.3);
  }
}
