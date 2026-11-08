import { edgePoint, type Boss, type EnemyCtx, type Ringed } from '../enemyTypes';
import { EnemyBase } from '../enemies/base';
import { clamp, dist, pt, type Pt } from '../vec';

type MongooseMode = 'enter' | 'circle' | 'feint' | 'wobble' | 'crouch' | 'dart' | 'stare' | 'struck' | 'retreat' | 'gone';

/** It circles the head this far out, this fast (radians/s), for this long, s. */
const CIRCLE_R = 150;
const CIRCLE_TURN = 1.7;
const CIRCLE_TIME = [1.6, 2.4] as const;
const RUN = 320;
/** The feint: a dart in to this close, this long, then back out (a fake, to draw a strike), s. */
const FEINT_IN = 0.24;
const FEINT_OUT = 0.3;
const FEINT_CLOSE = 62;
/** Off balance after a feint: the moment to strike, s. */
const WOBBLE_TIME = 1.15;
/** Low and tense before the real dart, s: a red ring where the head will be. */
const CROUCH_TIME = 0.6;
const DART_TIME = 0.3;
export const MONGOOSE_RING = 36;
/** A spread hood makes it stop and stare this long, s: a second chance to strike. */
const STARE_TIME = 1.7;
const STRIKE_REACH = 48;

/** Something a cobra's hood makes hesitate rather than freeze (the boss). */
export interface Hesitant {
  hesitate(ctx: EnemyCtx, from: Pt): void;
}

/** Whether an enemy hesitates at a spread hood. */
export function isHesitant(e: object): e is Hesitant {
  return 'hesitate' in e && typeof (e as { hesitate: unknown }).hesitate === 'function';
}

/**
 * The Grey Mongoose, chapter 9's boss. Mongooses resist cobra venom, and
 * this one fights the way they do: it circles fast, feints (darts in and
 * straight back out, to draw a strike), and then darts in for real at the
 * head. A strike at the feint hits nothing; right after it, though, it's
 * off balance for a moment: strike then. The real dart is told by a red
 * ring where the head is going: turn out of it. Spread your hood at it and
 * it stops and stares a moment: a second chance to strike.
 */
export class Mongoose extends EnemyBase<MongooseMode> implements Boss, Ringed {
  hp: number;
  readonly maxHp: number;
  /** Where the real dart lands, while it crouches and darts. */
  ring: Pt | null = null;
  private target: Pt;
  private from: Pt = pt(0, 0);
  /** Which way round it circles. */
  private turn = 1;
  /** A strike already dodged in this feint (told once). */
  private dodged = false;

  constructor(id: number, hp: number, _w: number, h: number) {
    super(id, 'grey-mongoose', pt(-60, h * 0.5), 'enter');
    this.hp = hp;
    this.maxHp = hp;
    this.left = 1.3;
    this.target = pt(150, h * 0.5);
  }

  get away(): boolean {
    return this.m === 'gone';
  }

  get beaten(): boolean {
    return this.hp <= 0;
  }

  get ringR(): number {
    return MONGOOSE_RING;
  }

  get ringT(): number {
    return this.m === 'crouch' ? Math.min(1, this.age / CROUCH_TIME) : this.m === 'dart' ? 1 : 0;
  }

  /** Open to a strike: off balance after a feint, or staring at a spread hood. */
  get open(): boolean {
    return this.m === 'wobble' || this.m === 'stare';
  }

  hesitate(ctx: EnemyCtx, from: Pt): void {
    if (this.m === 'enter' || this.m === 'struck' || this.m === 'retreat' || this.m === 'gone' || this.m === 'stare') return;
    this.ring = null;
    this.heading = Math.atan2(from.y - this.y, from.x - this.x);
    this.go('stare', STARE_TIME);
    ctx.emit({ type: 'say', text: '…?!', x: this.x, y: this.y - 30 });
  }

  step(ctx: EnemyCtx, dt: number): void {
    const done = this.tick(dt);
    const s = ctx.snake;
    switch (this.m) {
      case 'enter':
        this.moveTo(this.target, 220, dt);
        if (done) {
          ctx.emit({ type: 'say', text: 'Rikk-tikk!', x: this.x, y: this.y - 32, danger: true });
          this.go('circle', CIRCLE_TIME[1]);
        }
        return;
      case 'circle': {
        const a = Math.atan2(this.y - s.head.y, this.x - s.head.x) + this.turn * CIRCLE_TURN * dt;
        this.moveTo(this.ringSpot(ctx, s.head, a, CIRCLE_R), RUN, dt);
        this.heading = Math.atan2(s.head.y - this.y, s.head.x - this.x);
        if (done) {
          this.from = this.here();
          this.dodged = false;
          this.go('feint', FEINT_IN + FEINT_OUT);
          ctx.emit({ type: 'say', text: 'Feint!', x: this.x, y: this.y - 30 });
        }
        return;
      }
      case 'feint':
        this.feint(ctx, dt);
        if (done) {
          this.go('wobble', WOBBLE_TIME);
          ctx.emit({ type: 'say', text: 'off balance!', x: this.x, y: this.y - 30 });
        }
        return;
      case 'wobble':
      case 'stare':
        if (this.struckBy(ctx, STRIKE_REACH)) {
          this.hit(ctx);
          return;
        }
        if (this.m === 'stare') this.heading = Math.atan2(s.head.y - this.y, s.head.x - this.x);
        if (done) this.crouch(ctx);
        return;
      case 'crouch':
        if (this.ring) this.heading = Math.atan2(this.ring.y - this.y, this.ring.x - this.x);
        if (done) {
          this.from = this.here();
          this.go('dart', DART_TIME);
          ctx.emit({ type: 'pounce', x: this.x, y: this.y });
        }
        return;
      case 'dart':
        this.dart(ctx, done);
        return;
      case 'struck':
        this.moveTo(this.target, 360, dt);
        if (done) {
          if (this.beaten) {
            this.target = edgePoint(ctx.rng, ctx.w, ctx.h, 140);
            this.go('retreat', 2.2);
            ctx.emit({ type: 'bossBeaten', x: this.x, y: this.y });
          } else this.go('retreat', 1.1);
        }
        return;
      case 'retreat':
        this.moveTo(this.target, this.beaten ? 300 : 200, dt);
        if (done) {
          if (this.beaten) this.go('gone');
          else {
            this.turn = ctx.rng() < 0.5 ? 1 : -1;
            this.go('circle', CIRCLE_TIME[0] + ctx.rng() * (CIRCLE_TIME[1] - CIRCLE_TIME[0]));
          }
        }
        return;
      case 'gone':
        return;
    }
  }

  /** In towards the head and straight back out. A strike at it now finds nothing: it was drawing one. */
  private feint(ctx: EnemyCtx, dt: number): void {
    const s = ctx.snake;
    if (this.age < FEINT_IN) {
      if (dist(this, s.head) > FEINT_CLOSE) this.moveTo(s.head, 430, dt);
    } else {
      const a = Math.atan2(this.y - s.head.y, this.x - s.head.x);
      this.moveTo(this.ringSpot(ctx, s.head, a, 115), 330, dt);
    }
    this.heading = Math.atan2(s.head.y - this.y, s.head.x - this.x);
    if (!this.dodged && s.striking && dist(s.head, this) < STRIKE_REACH + 30) {
      this.dodged = true;
      ctx.emit({ type: 'miss', kind: this.kind, x: this.x, y: this.y });
    }
  }

  /** Low and tense: the ring goes down where the head is heading. */
  private crouch(ctx: EnemyCtx): void {
    const s = ctx.snake;
    const ahead = s.speed * (CROUCH_TIME + DART_TIME) * 0.85;
    this.ring = pt(clamp(s.head.x + Math.cos(s.heading) * ahead, 30, ctx.w - 30), clamp(s.head.y + Math.sin(s.heading) * ahead, 30, ctx.h - 30));
    this.go('crouch', CROUCH_TIME);
    ctx.emit({ type: 'crouch', x: this.x, y: this.y });
  }

  /** The real dart, onto the ring: a head still in it is bitten. */
  private dart(ctx: EnemyCtx, done: boolean): void {
    const r = this.ring;
    if (!r) {
      this.go('circle', CIRCLE_TIME[0]);
      return;
    }
    const t = Math.min(1, this.age / DART_TIME);
    this.x = this.from.x + (r.x - this.from.x) * t;
    this.y = this.from.y + (r.y - this.from.y) * t;
    if (!done) return;
    this.ring = null;
    const s = ctx.snake;
    if (dist(s.head, this) < MONGOOSE_RING + s.width / 2 && ctx.hurt('bitten', this.here())) {
      this.target = this.awayFrom(ctx, s.head, 190);
      this.go('retreat', 1.4);
    } else {
      ctx.emit({ type: 'miss', kind: this.kind, x: this.x, y: this.y });
      this.go('circle', CIRCLE_TIME[0]);
    }
  }

  private hit(ctx: EnemyCtx): void {
    this.hp -= 1;
    ctx.emit({ type: 'bossHit', x: this.x, y: this.y });
    ctx.emit({ type: 'say', text: 'Kek-kek!', x: this.x, y: this.y - 40, danger: true });
    this.ring = null;
    this.target = this.awayFrom(ctx, ctx.snake.head, 200);
    this.go('struck', 0.5);
  }

  /** A point on a circle of radius `r` round `c` at angle `a`, kept on the board. */
  private ringSpot(ctx: EnemyCtx, c: Pt, a: number, r: number): Pt {
    return pt(clamp(c.x + Math.cos(a) * r, 36, ctx.w - 36), clamp(c.y + Math.sin(a) * r, 36, ctx.h - 36));
  }

  private awayFrom(ctx: EnemyCtx, from: Pt, far: number): Pt {
    const a = Math.atan2(this.y - from.y, this.x - from.x);
    return this.ringSpot(ctx, this.here(), a, far);
  }
}
