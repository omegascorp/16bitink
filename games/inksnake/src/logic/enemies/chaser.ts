import type { ZoneKind } from '../../level/types';
import { edgePoint, type EnemyCtx } from '../enemyTypes';
import type { Cloak } from '../snake';
import { clamp, dist, pt, type Pt } from '../vec';
import { EnemyBase } from './base';

type ChaserMode = 'away' | 'enter' | 'prowl' | 'chase' | 'bite' | 'flee' | 'frozen';

/** How a chaser hunts on the ground (coyote, mongoose, opossum, monitor, hedgehog, honey badger). */
export interface ChaserSpec {
  /** Running speed after the head, and prowling speed, px/s. */
  readonly speed: number;
  readonly prowl: number;
  /** It sees a head this close (unless the snake is hidden), px. */
  readonly sight: number;
  /** It bites a head this close, px. */
  readonly reach: number;
  /** A bite costs a life ('hurt'), or only nips the tail's length ('nip', px). */
  readonly bite: { readonly kind: 'hurt'; readonly cause: string } | { readonly kind: 'nip'; readonly amount: number };
  /** A strike sends it off (most can be); a prickly one hurts the striker instead (the hedgehog: a nip off your tail). */
  readonly scared: 'strike' | 'never' | 'prickly';
  /** Cloaks it sees through (a honey badger isn't fooled by playing dead). */
  readonly seesThrough?: readonly Cloak[];
  /** Ground it keeps to (a monitor on the forest floor: never in the trees). */
  readonly keepTo?: ZoneKind;
  /** Ground it never enters (most chasers: water). */
  readonly avoid?: ZoneKind;
  /** It arrives after this many s, from an edge. */
  readonly from?: number;
  /** Bluffs don't work on it: no hiss, rasp or hood scares or freezes it (a honey badger). */
  readonly unmoved?: boolean;
}

const BITE_REST = 1.6;
const FLEE_TIME = 3.2;
/** Fooled by a snake playing dead (or gone to ground) while it chased: it loses interest this long, s. */
const BORED_TIME = 5;

/**
 * A chaser: it prowls the board, and runs at the snake's head once it sees
 * it, biting (a life, or a nip). Most turn tail at a strike; a prickly one
 * makes a strike cost you instead. Cover and cloaks hide you, unless it
 * sees through them. Some keep to one kind of ground.
 */
export class Chaser extends EnemyBase<ChaserMode> {
  private target: Pt = pt(0, 0);
  private frozenFor = 0;
  /** Seconds it still has no interest in the snake. */
  private bored = 0;

  constructor(id: number, kind: string, arriveIn: number, readonly spec: ChaserSpec) {
    super(id, kind, pt(-60, -60), 'away');
    this.left = arriveIn;
  }

  get away(): boolean {
    return this.m === 'away';
  }

  freeze(seconds: number): void {
    if (this.m === 'away' || this.spec.unmoved) return;
    this.frozenFor = seconds;
    this.go('frozen', seconds);
  }

  frighten(ctx: EnemyCtx, from: Pt): boolean {
    if (this.m === 'away' || this.spec.scared === 'never' || this.spec.unmoved) return false;
    this.fleeFrom(ctx, from);
    return true;
  }

  /** Whether it can see the head now. */
  private sees(ctx: EnemyCtx): boolean {
    const s = ctx.snake;
    if (this.bored > 0 || dist(s.head, this) > this.spec.sight) return false;
    if (s.cloak !== 'none') return (this.spec.seesThrough ?? []).includes(s.cloak);
    return !s.hidden;
  }

  /** Whether it may stand at `p`. */
  private allowed(ctx: EnemyCtx, p: Pt): boolean {
    if (this.spec.keepTo && !ctx.inZone(p, this.spec.keepTo)) return false;
    return !(this.spec.avoid && ctx.inZone(p, this.spec.avoid));
  }

  /** Moves towards `to`, but never onto ground it can't take. */
  private go2(ctx: EnemyCtx, to: Pt, speed: number, dt: number): void {
    const bx = this.x;
    const by = this.y;
    this.moveTo(to, speed, dt);
    this.keepOn(ctx, 16);
    if (!this.allowed(ctx, this.here())) {
      this.x = bx;
      this.y = by;
      this.target = this.wanderSpot(ctx);
    }
  }

  private wanderSpot(ctx: EnemyCtx): Pt {
    for (let i = 0; i < 20; i++) {
      const p = pt(40 + ctx.rng() * (ctx.w - 80), 40 + ctx.rng() * (ctx.h - 80));
      if (this.allowed(ctx, p)) return p;
    }
    return this.here();
  }

  step(ctx: EnemyCtx, dt: number): void {
    const done = this.tick(dt);
    const s = ctx.snake;
    this.bored = Math.max(0, this.bored - dt);
    switch (this.m) {
      case 'away': {
        if (!done) return;
        let e = edgePoint(ctx.rng, ctx.w, ctx.h, 20);
        for (let i = 0; i < 12 && this.spec.keepTo && !ctx.inZone(pt(clamp(e.x, 30, ctx.w - 30), clamp(e.y, 30, ctx.h - 30)), this.spec.keepTo); i++) e = edgePoint(ctx.rng, ctx.w, ctx.h, 20);
        this.x = e.x;
        this.y = e.y;
        this.target = this.wanderSpot(ctx);
        this.go('enter', 1.2);
        ctx.emit({ type: 'arrive', kind: this.kind, x: this.x, y: this.y });
        return;
      }
      case 'enter':
        this.moveTo(this.target, this.spec.prowl * 1.6, dt);
        if (done) this.go('prowl', 2);
        return;
      case 'frozen':
        if (done) this.go('prowl', 1);
        return;
      case 'flee':
        this.go2(ctx, this.target, this.spec.speed, dt);
        if (done) this.go('prowl', 2);
        return;
      case 'bite':
        if (done) this.go('prowl', 1);
        return;
      default:
        break;
    }
    if (this.spec.scared !== 'never' && s.striking && dist(s.head, this) < this.spec.reach + 16 + s.width / 2) {
      if (this.spec.scared === 'prickly') {
        ctx.nip(28, this.here());
        ctx.emit({ type: 'say', text: 'Prickly!', x: this.x, y: this.y - 20, danger: true });
      } else ctx.emit({ type: 'scared', kind: this.kind, x: this.x, y: this.y });
      this.fleeFrom(ctx, s.head);
      return;
    }
    if (this.sees(ctx)) {
      if (this.m !== 'chase') ctx.emit({ type: 'say', text: '!', x: this.x, y: this.y - 24, danger: true });
      this.m = 'chase';
      this.go2(ctx, s.head, this.spec.speed, dt);
      if (dist(s.head, this) < this.spec.reach + s.width / 2) this.bite(ctx);
      return;
    }
    if (this.m === 'chase') {
      // It lost the snake mid-chase: a cloak it can't see through makes it lose interest a while, and wander off.
      if (s.cloak !== 'none') {
        this.bored = BORED_TIME;
        ctx.emit({ type: 'say', text: '…huh?', x: this.x, y: this.y - 22 });
        const a = Math.atan2(this.y - s.head.y, this.x - s.head.x);
        this.target = pt(clamp(this.x + Math.cos(a) * 220, 30, ctx.w - 30), clamp(this.y + Math.sin(a) * 220, 30, ctx.h - 30));
      }
      this.go('prowl', 2.5);
    }
    if ((done || dist(this, this.target) < 6) && this.bored <= 0) {
      this.target = this.wanderSpot(ctx);
      this.left = 2 + ctx.rng() * 2;
    }
    this.go2(ctx, this.target, this.spec.prowl, dt);
  }

  private bite(ctx: EnemyCtx): void {
    const b = this.spec.bite;
    if (b.kind === 'hurt') ctx.hurt(b.cause, this.here());
    else ctx.nip(b.amount, this.here());
    this.go('bite', BITE_REST);
    // It backs off a little after a bite.
    const a = Math.atan2(this.y - ctx.snake.head.y, this.x - ctx.snake.head.x);
    this.x = clamp(this.x + Math.cos(a) * 30, 16, ctx.w - 16);
    this.y = clamp(this.y + Math.sin(a) * 30, 16, ctx.h - 16);
  }

  private fleeFrom(ctx: EnemyCtx, from: Pt): void {
    const a = Math.atan2(this.y - from.y, this.x - from.x);
    this.target = pt(clamp(this.x + Math.cos(a) * 260, 30, ctx.w - 30), clamp(this.y + Math.sin(a) * 260, 30, ctx.h - 30));
    this.go('flee', FLEE_TIME);
  }
}
