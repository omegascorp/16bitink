import { edgePoint, type EnemyCtx } from '../enemyTypes';
import { dist, pt, type Pt } from '../vec';
import { EnemyBase } from './base';

import type { ZoneKind } from '../../level/types';
import type { Cloak } from '../snake';

type DiverMode = 'away' | 'circle' | 'lock' | 'dive' | 'ground' | 'rise';

/** The red ring a hawk's dive aims for, px. */
export const RING_R = 46;

/** How a bird of prey hunts from the air: the hawk's numbers by default (see HAWK). */
export interface DiverSpec {
  /** The red ring its dive aims for, px. */
  readonly ringR: number;
  /** How long it circles before it locks on, s (more while the snake is hidden). */
  readonly circleTime: readonly [number, number];
  /** The lock: the ring follows the head for this long, then holds still for `stoop` before the dive. */
  readonly lockTime: number;
  readonly stoop: number;
  readonly diveTime: number;
  /** On the ground after a miss: the moment it can be struck, s. */
  readonly groundTime: number;
  readonly circleR: number;
  /** A head hidden this long while it circles: it gives up and leaves, s. */
  readonly giveUp: number;
  /** Seconds away between hunts. */
  readonly awayTime: readonly [number, number];
  /** It only locks on to a head over this ground (a sea eagle: land, never the water). */
  readonly over?: ZoneKind;
  /** Cloaks it sees through (a fox's nose sees through playing dead; few birds do). */
  readonly seesThrough?: readonly Cloak[];
  /** What a hit is called (the result card titles it). */
  readonly cause: string;
}

export const HAWK: DiverSpec = {
  ringR: RING_R, circleTime: [4, 6.5], lockTime: 1.1, stoop: 0.45, diveTime: 0.32, groundTime: 1.1, circleR: 135, giveUp: 2.4,
  awayTime: [6, 9], cause: 'snatched',
};
const RISE_TIME = 0.7;

/**
 * A diver (the red-tailed hawk, eagles, the buzzard): its shadow circles over the board, then a
 * red ring locks on to the snake's head and follows it a moment before
 * holding still. Then it stoops. A head in the ring when it lands costs a
 * life; a head under cover can't be locked on to, and hiding mid-lock
 * makes it lose you. After a miss it stands on the ground a moment, open
 * to a strike that sends it off.
 */
export class Diver extends EnemyBase<DiverMode> {
  /** Where the dive will land, while locked or diving. */
  ring: Pt | null = null;
  private centre: Pt = pt(0, 0);
  private angle = 0;
  private hiddenFor = 0;
  private from: Pt = pt(0, 0);
  /** How long it stays away once it has flown off, s. */
  private awayFor = 0;

  constructor(id: number, kind: string, arriveIn: number, readonly spec: DiverSpec = HAWK) {
    super(id, kind, pt(-200, -200), 'away');
    this.left = arriveIn;
  }

  /** Whether it can see the head to lock on: not hidden (unless it sees through the cloak), over its ground. */
  private sees(ctx: EnemyCtx): boolean {
    const s = ctx.snake;
    const cloaked = s.cloak !== 'none' && !(this.spec.seesThrough ?? []).includes(s.cloak);
    const covered = s.hidden && s.cloak === 'none';
    if (cloaked || covered) return false;
    return !this.spec.over || ctx.inZone(s.head, this.spec.over);
  }

  get away(): boolean {
    return this.m === 'away';
  }

  get ringR(): number {
    return this.spec.ringR;
  }

  get ringT(): number {
    return this.lockProgress;
  }

  /** How far through the lock it is, 0..1 (the ring tightens and reddens). */
  get lockProgress(): number {
    return this.m === 'lock' ? Math.min(1, this.age / (this.spec.lockTime + this.spec.stoop)) : this.m === 'dive' ? 1 : 0;
  }

  step(ctx: EnemyCtx, dt: number): void {
    const done = this.tick(dt);
    const snake = ctx.snake;
    if (this.m === 'away') {
      if (done) this.arrive(ctx);
      return;
    }
    if (this.m === 'circle') {
      this.circle(ctx, dt);
      const seen = this.sees(ctx);
      this.hiddenFor = seen ? 0 : this.hiddenFor + dt;
      if (this.hiddenFor > this.spec.giveUp) {
        this.leave(ctx, this.awayRoll(ctx));
        return;
      }
      if (done && seen) {
        this.ring = pt(snake.head.x, snake.head.y);
        this.go('lock', this.spec.lockTime + this.spec.stoop);
        ctx.emit({ type: 'lock', kind: this.kind, x: this.ring.x, y: this.ring.y });
      } else if (done) this.left = 0.5;
      return;
    }
    if (this.m === 'lock') {
      this.circle(ctx, dt);
      if (!this.sees(ctx)) {
        // Lost you under the leaves.
        this.ring = null;
        this.go('circle', 2 + ctx.rng() * 1.5);
        return;
      }
      // The ring follows the head (a little behind) until the stoop, then holds.
      if (this.ring && this.age < this.spec.lockTime) {
        const k = Math.min(1, dt * 2.6);
        this.ring = pt(this.ring.x + (snake.head.x - this.ring.x) * k, this.ring.y + (snake.head.y - this.ring.y) * k);
      }
      if (done && this.ring) {
        this.from = this.here();
        this.go('dive', this.spec.diveTime);
        ctx.emit({ type: 'cry', x: this.ring.x, y: this.ring.y });
      }
      return;
    }
    if (this.m === 'dive' && this.ring) {
      const t = Math.min(1, this.age / this.spec.diveTime);
      this.x = this.from.x + (this.ring.x - this.from.x) * t;
      this.y = this.from.y + (this.ring.y - this.from.y) * t;
      this.alt = 1 - t;
      this.heading = Math.atan2(this.ring.y - this.from.y, this.ring.x - this.from.x);
      if (!done) return;
      const hit = this.sees(ctx) && dist(snake.head, this.ring) < this.spec.ringR && ctx.hurt(this.spec.cause, this.ring);
      ctx.emit({ type: hit ? 'dive' : 'miss', kind: this.kind, x: this.ring.x, y: this.ring.y });
      this.ring = null;
      this.alt = 0;
      if (hit) this.leave(ctx, this.awayRoll(ctx));
      else this.go('ground', this.spec.groundTime);
      return;
    }
    if (this.m === 'ground') {
      if (this.struckBy(ctx, 30)) {
        ctx.emit({ type: 'scared', kind: this.kind, x: this.x, y: this.y });
        this.leave(ctx, this.awayRoll(ctx) + 3);
        return;
      }
      if (done) this.leave(ctx, this.awayRoll(ctx) - 1);
      return;
    }
    if (this.m === 'rise') {
      this.alt = Math.min(1, this.age / RISE_TIME);
      this.moveTo(this.from, 260, dt);
      if (done) this.go('away', this.awayFor);
    }
  }

  private arrive(ctx: EnemyCtx): void {
    const e = edgePoint(ctx.rng, ctx.w, ctx.h, 60);
    this.x = e.x;
    this.y = e.y;
    this.alt = 1;
    this.centre = pt(ctx.snake.head.x, ctx.snake.head.y);
    this.angle = Math.atan2(e.y - this.centre.y, e.x - this.centre.x);
    this.hiddenFor = 0;
    this.go('circle', this.spec.circleTime[0] + ctx.rng() * (this.spec.circleTime[1] - this.spec.circleTime[0]));
    ctx.emit({ type: 'arrive', kind: this.kind, x: this.x, y: this.y });
    ctx.emit({ type: 'cry', x: this.x, y: this.y });
  }

  /** Circles over the snake: the centre drifts after the head, the shadow glides round it. */
  private circle(ctx: EnemyCtx, dt: number): void {
    const head = ctx.snake.head;
    const k = Math.min(1, dt * 0.6);
    this.centre = pt(this.centre.x + (head.x - this.centre.x) * k, this.centre.y + (head.y - this.centre.y) * k);
    this.angle += dt * 1.05;
    const target = pt(this.centre.x + Math.cos(this.angle) * this.spec.circleR, this.centre.y + Math.sin(this.angle) * this.spec.circleR);
    this.moveTo(target, 300, dt);
    this.heading = this.angle + Math.PI / 2;
    this.alt = 1;
  }

  /** Flies up and off the board, back in `seconds`. */
  private leave(ctx: EnemyCtx, seconds: number): void {
    this.ring = null;
    this.from = edgePoint(ctx.rng, ctx.w, ctx.h, 120);
    this.awayFor = seconds;
    this.go('rise', RISE_TIME);
  }

  private awayRoll(ctx: EnemyCtx): number {
    const [a, b] = this.spec.awayTime;
    return a + ctx.rng() * (b - a);
  }

  /** Scared off (a bluff): it flies up and away for a while. */
  frighten(ctx: EnemyCtx): boolean {
    if (this.m === 'away' || this.m === 'rise' || this.m === 'dive') return false;
    ctx.emit({ type: 'scared', kind: this.kind, x: this.x, y: this.y });
    this.leave(ctx, this.awayRoll(ctx));
    return true;
  }
}

/** The red-tailed hawk (chapter 1). */
export class Hawk extends Diver {
  constructor(id: number, arriveIn: number) {
    super(id, 'hawk', arriveIn, HAWK);
  }
}
