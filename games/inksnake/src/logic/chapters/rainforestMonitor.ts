import { edgePoint, type EnemyCtx } from '../enemyTypes';
import { EnemyBase } from '../enemies/base';
import { clamp, dist, pt, type Pt } from '../vec';

type MonitorMode = 'away' | 'enter' | 'prowl' | 'chase' | 'bite' | 'lost';

/** How the water monitor hunts the forest floor. */
export interface MonitorSpec {
  /** Running speed after the head, and prowling speed, px/s. */
  readonly speed: number;
  readonly prowl: number;
  /** It sees a head on the floor this close, px. */
  readonly sight: number;
  /** It bites a head this close, px: a life. */
  readonly reach: number;
  readonly cause: string;
}

const BITE_REST = 1.6;
/** Tongue flicking where the snake went up a tree, before it wanders off, s. */
const LOST_TIME = 1.4;
/** Turns it tries, radians, to get round a tree it can't climb. */
const DETOURS = [0, 0.6, -0.6, 1.2, -1.2, 1.8, -1.8] as const;

/**
 * The water monitor: a big lizard that keeps to the forest floor. It
 * prowls between the trunks and runs at a snake whose head is down on the
 * floor, biting (a life). It can't follow it up into the crowns or reach
 * it in the air: a head back in a tree, or gliding, loses it. Strikes
 * don't scare it off: the way out is up.
 */
export class Monitor extends EnemyBase<MonitorMode> {
  private target: Pt = pt(0, 0);

  constructor(id: number, kind: string, arriveIn: number, readonly spec: MonitorSpec) {
    super(id, kind, pt(-60, -60), 'away');
    this.left = arriveIn;
  }

  get away(): boolean {
    return this.m === 'away';
  }

  /** Whether the snake's head is down on the floor, in sight. */
  private sees(ctx: EnemyCtx): boolean {
    const s = ctx.snake;
    return s.cloak === 'none' && !ctx.inZone(s.head, 'tree') && dist(s.head, this) < this.spec.sight;
  }

  step(ctx: EnemyCtx, dt: number): void {
    const done = this.tick(dt);
    const s = ctx.snake;
    switch (this.m) {
      case 'away':
        if (done) this.enter(ctx);
        return;
      case 'enter':
        this.moveTo(this.target, this.spec.prowl * 1.6, dt);
        if (done) this.go('prowl', 2);
        return;
      case 'bite':
      case 'lost':
        if (done) this.go('prowl', 1.5);
        return;
      default:
        break;
    }
    if (this.sees(ctx)) {
      if (this.m !== 'chase') {
        ctx.emit({ type: 'say', text: '!', x: this.x, y: this.y - 24, danger: true });
        this.go('chase');
      }
      this.walk(ctx, s.head, this.spec.speed, dt);
      if (dist(s.head, this) < this.spec.reach + s.width / 2) this.bite(ctx);
      return;
    }
    if (this.m === 'chase') {
      ctx.emit({ type: 'say', text: '…', x: this.x, y: this.y - 22 });
      this.go('lost', LOST_TIME);
      return;
    }
    if (done || dist(this, this.target) < 8) {
      this.target = this.floorSpot(ctx);
      this.left = 2.5 + ctx.rng() * 2;
    }
    this.walk(ctx, this.target, this.spec.prowl, dt);
  }

  /** In from an edge, on the floor. */
  private enter(ctx: EnemyCtx): void {
    let e = edgePoint(ctx.rng, ctx.w, ctx.h, 20);
    for (let i = 0; i < 16 && ctx.inZone(pt(clamp(e.x, 30, ctx.w - 30), clamp(e.y, 30, ctx.h - 30)), 'tree'); i++) e = edgePoint(ctx.rng, ctx.w, ctx.h, 20);
    this.x = e.x;
    this.y = e.y;
    this.target = pt(clamp(e.x, 40, ctx.w - 40), clamp(e.y, 40, ctx.h - 40));
    this.go('enter', 1.2);
    ctx.emit({ type: 'arrive', kind: this.kind, x: this.x, y: this.y });
  }

  /** Walks towards `to` on the floor, turning aside round the trees it can't climb. */
  private walk(ctx: EnemyCtx, to: Pt, speed: number, dt: number): void {
    const want = Math.atan2(to.y - this.y, to.x - this.x);
    const stepLen = Math.min(dist(this, to), speed * dt);
    if (stepLen < 0.01) return;
    for (const off of DETOURS) {
      const a = want + off;
      const next = pt(clamp(this.x + Math.cos(a) * stepLen, 16, ctx.w - 16), clamp(this.y + Math.sin(a) * stepLen, 16, ctx.h - 16));
      if (ctx.inZone(next, 'tree')) continue;
      this.x = next.x;
      this.y = next.y;
      this.heading = a;
      return;
    }
    // Hemmed in by crowns: it waits, and picks somewhere else to go.
    this.target = this.floorSpot(ctx);
  }

  private floorSpot(ctx: EnemyCtx): Pt {
    for (let i = 0; i < 24; i++) {
      const p = pt(40 + ctx.rng() * (ctx.w - 80), 40 + ctx.rng() * (ctx.h - 80));
      if (!ctx.inZone(p, 'tree')) return p;
    }
    return this.here();
  }

  private bite(ctx: EnemyCtx): void {
    ctx.hurt(this.spec.cause, this.here());
    this.go('bite', BITE_REST);
    const a = Math.atan2(this.y - ctx.snake.head.y, this.x - ctx.snake.head.x);
    const back = pt(clamp(this.x + Math.cos(a) * 30, 16, ctx.w - 16), clamp(this.y + Math.sin(a) * 30, 16, ctx.h - 16));
    if (!ctx.inZone(back, 'tree')) {
      this.x = back.x;
      this.y = back.y;
    }
  }
}
