import type { LevelDef } from '../../level/types';
import { EnemyBase } from '../enemies/base';
import { edgePoint, type EnemyCtx } from '../enemyTypes';
import { clamp, dist, pt, type Pt } from '../vec';

type HeronMode = 'away' | 'fly' | 'stand' | 'wade' | 'raise' | 'stab' | 'rest' | 'flee';

/** How the heron hunts: it waits by its pool, then stabs a red ring with its bill. */
export interface HeronSpec {
  /** It wades this fast, and never further than `leash` from its pool's middle, px/s and px. */
  readonly wade: number;
  readonly leash: number;
  /** It aims at a head this close (its neck's reach), px. */
  readonly range: number;
  readonly ringR: number;
  /** The aim: the ring follows the head this long, then holds (the tell), s. */
  readonly aim: number;
  readonly hold: number;
  /** Bill down after a stab: open to a strike, s. */
  readonly rest: number;
  /** Away after it's been sent off, s. */
  readonly awayTime: readonly [number, number];
  readonly cause: string;
}

export const HERON: HeronSpec = {
  wade: 38, leash: 110, range: 120, ringR: 36, aim: 0.75, hold: 0.45, rest: 1.3, awayTime: [8, 12], cause: 'heronstab',
};

/** Flying in or off, s. */
const FLY_TIME = 1.6;
const STAB_TIME = 0.14;
const STRIKE_REACH = 40;

/** The middle of the level's first pool (water zone), if it has one. */
export function poolOf(level: LevelDef): Pt | null {
  const z = (level.zones ?? []).find((q) => q.kind === 'water');
  if (!z) return null;
  if (z.shape === 'circle') return pt(z.x, z.y);
  if (z.shape === 'rect') return pt(z.x + z.w / 2, z.y + z.h / 2);
  const n = z.points.length;
  return pt(z.points.reduce((s, q) => s + q.x, 0) / n, z.points.reduce((s, q) => s + q.y, 0) / n);
}

/**
 * The grey heron (chapter 8): it flies in to the pool and stands in the
 * shallows, wading a little after the snake but never far from the water.
 * A head that comes within its neck's reach gets a red ring that follows
 * it a moment and holds: then the bill stabs down. A head in the ring loses
 * a life (a head in the heather is hidden). With its bill down after a
 * stab it's open to a strike, and flies off. With no pool it wades anywhere.
 */
export class Heron extends EnemyBase<HeronMode> {
  /** Where the stab will land, while aiming or stabbing. */
  ring: Pt | null = null;
  private from: Pt = pt(0, 0);
  private to: Pt = pt(0, 0);

  constructor(id: number, arriveIn: number, private readonly home: Pt | null, readonly spec: HeronSpec = HERON) {
    super(id, 'heron', pt(-80, -80), 'away');
    this.left = arriveIn;
  }

  get away(): boolean {
    return this.m === 'away';
  }

  get ringR(): number {
    return this.spec.ringR;
  }

  get ringT(): number {
    return this.m === 'raise' ? Math.min(1, this.age / (this.spec.aim + this.spec.hold)) : this.m === 'stab' ? 1 : 0;
  }

  frighten(ctx: EnemyCtx, from: Pt): boolean {
    if (this.m === 'away' || this.m === 'fly' || this.m === 'flee') return false;
    ctx.emit({ type: 'scared', kind: this.kind, x: this.x, y: this.y });
    this.flyOff(ctx, from);
    return true;
  }

  step(ctx: EnemyCtx, dt: number): void {
    const done = this.tick(dt);
    const s = ctx.snake;
    switch (this.m) {
      case 'away':
        if (done) this.arrive(ctx);
        return;
      case 'fly':
      case 'flee': {
        const t = Math.min(1, this.age / FLY_TIME);
        this.x = this.from.x + (this.to.x - this.from.x) * t;
        this.y = this.from.y + (this.to.y - this.from.y) * t;
        this.heading = Math.atan2(this.to.y - this.from.y, this.to.x - this.from.x);
        this.alt = this.m === 'fly' ? 1 - t : t;
        if (!done) return;
        this.alt = 0;
        if (this.m === 'fly') this.go('stand', 1);
        else this.go('away', this.roll(ctx));
        return;
      }
      case 'stand':
      case 'wade': {
        const want = this.home ? this.leashed(s.head) : s.head;
        // Standing still, or wading a step after the snake (the age carries on: it's one wait).
        this.m = dist(this, want) > 8 ? 'wade' : 'stand';
        if (this.m === 'wade') this.moveTo(want, this.spec.wade, dt);
        this.keepOn(ctx, 20);
        if (done && !s.hidden && dist(this, s.head) < this.spec.range) {
          this.ring = pt(s.head.x, s.head.y);
          this.go('raise', this.spec.aim + this.spec.hold);
          ctx.emit({ type: 'say', text: 'eyes on you…', x: this.x, y: this.y - 34 });
        }
        return;
      }
      case 'raise':
        if (this.ring && this.age < this.spec.aim) {
          const k = Math.min(1, dt * 3);
          this.ring = this.inReach(pt(this.ring.x + (s.head.x - this.ring.x) * k, this.ring.y + (s.head.y - this.ring.y) * k));
        }
        if (this.ring) this.heading = Math.atan2(this.ring.y - this.y, this.ring.x - this.x);
        if (done && this.ring) {
          this.go('stab', STAB_TIME);
          ctx.emit({ type: 'say', text: 'Stab!', x: this.ring.x, y: this.ring.y - 30, danger: true, sound: 'pounce' });
          if (!s.hidden && dist(s.head, this.ring) < this.spec.ringR) ctx.hurt(this.spec.cause, this.ring);
        }
        return;
      case 'stab':
        if (done) {
          this.ring = null;
          this.go('rest', this.spec.rest);
        }
        return;
      case 'rest':
        if (this.struckBy(ctx, STRIKE_REACH)) {
          ctx.emit({ type: 'scared', kind: this.kind, x: this.x, y: this.y });
          this.flyOff(ctx, s.head);
          return;
        }
        if (done) this.go('stand', 0.6);
        return;
    }
  }

  /** Where it would wade to watch the head: towards it, but on its leash round the pool. */
  private leashed(head: Pt): Pt {
    const h = this.home!;
    const d = dist(h, head);
    if (d <= this.spec.leash) return head;
    const k = this.spec.leash / d;
    return pt(h.x + (head.x - h.x) * k, h.y + (head.y - h.y) * k);
  }

  /** The ring kept within its neck's reach. */
  private inReach(p: Pt): Pt {
    const d = dist(this, p);
    const max = this.spec.range + 20;
    if (d <= max) return p;
    const k = max / d;
    return pt(this.x + (p.x - this.x) * k, this.y + (p.y - this.y) * k);
  }

  private arrive(ctx: EnemyCtx): void {
    this.from = edgePoint(ctx.rng, ctx.w, ctx.h, 60);
    const h = this.home ?? pt(ctx.w / 2, ctx.h / 2);
    this.to = pt(clamp(h.x, 30, ctx.w - 30), clamp(h.y, 30, ctx.h - 30));
    this.x = this.from.x;
    this.y = this.from.y;
    this.alt = 1;
    this.go('fly', FLY_TIME);
    ctx.emit({ type: 'arrive', kind: this.kind, x: this.to.x, y: this.to.y });
    ctx.emit({ type: 'say', text: 'kraak!', x: this.to.x, y: this.to.y - 30 });
  }

  /** Up and away from `from`, back in a while. */
  private flyOff(ctx: EnemyCtx, from: Pt): void {
    this.ring = null;
    const a = Math.atan2(this.y - from.y, this.x - from.x);
    this.from = this.here();
    this.to = pt(this.x + Math.cos(a) * 700, this.y + Math.sin(a) * 700);
    this.go('flee', FLY_TIME);
  }

  private roll(ctx: EnemyCtx): number {
    const [a, b] = this.spec.awayTime;
    return a + ctx.rng() * (b - a);
  }
}
