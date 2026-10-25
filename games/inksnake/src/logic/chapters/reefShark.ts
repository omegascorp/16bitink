import { edgePoint, type Boss, type EnemyCtx } from '../enemyTypes';
import { EnemyBase } from '../enemies/base';
import { clamp, dist, nearestOnSegment, pt, turnTowards, type Pt } from '../vec';

type SharkMode = 'enter' | 'circle' | 'tell' | 'charge' | 'turn' | 'struck' | 'retreat' | 'gone';

/** It circles the snake this far off, this fast, for this long between charges. */
const CIRCLE_R = 210;
const CIRCLE_SPEED = 120;
const CIRCLE_TIME = [2.6, 4] as const;
/** It charges at a head this far off in the water, px. */
const RANGE = [90, 480] as const;
/** The tell: it turns to face you and its fin rises, s. */
const TELL = 1.15;
/** The charge: this fast, along a lane running this far past where the head was. */
const CHARGE_SPEED = 470;
const LANE_PAST = 170;
/** The lane's half width, px: a head inside it as the shark passes is bitten. */
export const LANE_HALF = 30;
/** It aims this many seconds ahead of the head. */
const LEAD = 0.22;
/** After a charge it turns, slow and heavy: the open moment, s, and how fast it comes round, radians/s. */
const TURN_TIME = 2.6;
const TURN_RATE = 0.9;
/** Its snout is this far ahead of its middle, px; a strike this close to it lands. */
export const SNOUT = 36;
const STRIKE_REACH = 38;
/** It bites a head this close to its jaws while charging, px; the body gets a nip. */
const BITE = 30;
const NIP = 18;
/** It keeps this far in from the board's edges, px. */
const PAD = 24;

/**
 * The Tiger Shark, chapter 6's boss (tiger sharks eat sea snakes): it
 * circles the krait in the water, then turns to face it, fin rising, and a
 * dotted lane shows where it will charge. It charges straight down the
 * lane: a head in its path loses a life. It can't come onto land, so a
 * cay is a safe place to breathe; but after a charge it turns slowly, and
 * that's the moment to swim in and strike its snout.
 */
export class Shark extends EnemyBase<SharkMode> implements Boss {
  /** Over the snake's body, not stopped by it: it swims below. */
  readonly overBody = true;
  hp: number;
  readonly maxHp: number;
  /** Where the charge runs, while it tells and charges. */
  lane: { readonly from: Pt; readonly to: Pt } | null = null;
  private angle = 0;
  private dir = 1;
  private target: Pt;
  private bit = false;
  private nipped = false;

  constructor(id: number, hp: number, w: number, h: number) {
    super(id, 'shark', pt(w + 90, h * 0.62), 'enter');
    this.hp = hp;
    this.maxHp = hp;
    this.heading = Math.PI;
    this.target = pt(w - 110, h * 0.62);
    this.left = 1.8;
  }

  get away(): boolean {
    return this.m === 'gone';
  }

  get beaten(): boolean {
    return this.hp <= 0;
  }

  /** Open to a strike: turning slowly after a charge. */
  get open(): boolean {
    return this.m === 'turn';
  }

  /** How high its fin stands, 0..1: it rises through the tell and stays up through the charge. */
  get fin(): number {
    if (this.m === 'tell') return Math.min(1, this.age / TELL);
    return this.m === 'charge' ? 1 : 0;
  }

  /** Where its snout is. */
  get snout(): Pt {
    return pt(this.x + Math.cos(this.heading) * SNOUT, this.y + Math.sin(this.heading) * SNOUT);
  }

  step(ctx: EnemyCtx, dt: number): void {
    const done = this.tick(dt);
    const s = ctx.snake;
    switch (this.m) {
      case 'enter':
        this.moveTo(this.target, 130, dt);
        if (done) {
          this.angle = Math.atan2(this.y - s.head.y, this.x - s.head.x);
          this.go('circle', this.circleRoll(ctx));
        }
        return;
      case 'circle':
        this.circle(ctx, dt);
        if (!done) return;
        if (this.canCharge(ctx)) this.tell(ctx);
        else this.left = 0.4;
        return;
      case 'tell': {
        const lane = this.lane;
        if (!lane) return;
        const want = Math.atan2(lane.to.y - lane.from.y, lane.to.x - lane.from.x);
        this.heading = turnTowards(this.heading, want, 5 * dt);
        if (done) {
          this.heading = want;
          this.bit = false;
          this.nipped = false;
          this.go('charge', 10);
          ctx.emit({ type: 'pounce', x: this.x, y: this.y });
        }
        return;
      }
      case 'charge':
        this.charge(ctx, dt);
        return;
      case 'turn': {
        const want = Math.atan2(s.head.y - this.y, s.head.x - this.x);
        this.heading = turnTowards(this.heading, want, TURN_RATE * dt);
        this.swim(ctx, this.ahead(60), 22, dt, false);
        if (s.striking && (dist(s.head, this.snout) < STRIKE_REACH + s.width / 2 || dist(s.head, this) < STRIKE_REACH + 6 + s.width / 2)) {
          this.hit(ctx);
          return;
        }
        if (done) this.go('circle', this.circleRoll(ctx));
        return;
      }
      case 'struck':
        this.swim(ctx, this.target, 260, dt);
        if (done) {
          if (this.beaten) {
            this.target = edgePoint(ctx.rng, ctx.w, ctx.h, 160);
            this.go('retreat', 2.6);
            ctx.emit({ type: 'bossBeaten', x: this.x, y: this.y });
          } else this.go('retreat', 1.4);
        }
        return;
      case 'retreat':
        if (this.beaten) this.moveTo(this.target, 240, dt);
        else this.swim(ctx, this.target, 150, dt);
        if (done) {
          if (this.beaten) this.go('gone');
          else {
            this.angle = Math.atan2(this.y - s.head.y, this.x - s.head.x);
            this.go('circle', this.circleRoll(ctx));
          }
        }
        return;
      case 'gone':
        return;
    }
  }

  /** Round and round the snake, in the water only. */
  private circle(ctx: EnemyCtx, dt: number): void {
    const h = ctx.snake.head;
    this.angle += dt * 0.55 * this.dir;
    let spot = this.ring(h, this.angle);
    // Land or the board's edge in the way: further round the circle, or back the other way.
    for (let i = 0; i < 8 && !this.wet(ctx, spot); i++) {
      this.angle += 0.4 * this.dir;
      spot = this.ring(h, this.angle);
    }
    if (!this.wet(ctx, spot)) this.dir = -this.dir;
    this.swim(ctx, spot, CIRCLE_SPEED, dt);
  }

  private ring(h: Pt, a: number): Pt {
    return pt(h.x + Math.cos(a) * CIRCLE_R, h.y + Math.sin(a) * CIRCLE_R);
  }

  /** A head in the water (not on a cay), in range. */
  private canCharge(ctx: EnemyCtx): boolean {
    const h = ctx.snake.head;
    const d = dist(this, h);
    return !ctx.inZone(h, 'land') && d > RANGE[0] && d < RANGE[1];
  }

  /** The tell: the lane is laid through where the head is heading, and the fin comes up. */
  private tell(ctx: EnemyCtx): void {
    const s = ctx.snake;
    const ahead = s.spec.speed * s.speedScale * LEAD;
    const aim = pt(s.head.x + Math.cos(s.heading) * ahead, s.head.y + Math.sin(s.heading) * ahead);
    const a = Math.atan2(aim.y - this.y, aim.x - this.x);
    const len = dist(this, aim) + LANE_PAST;
    const to = pt(clamp(this.x + Math.cos(a) * len, PAD, ctx.w - PAD), clamp(this.y + Math.sin(a) * len, PAD, ctx.h - PAD));
    this.lane = { from: this.here(), to };
    this.go('tell', TELL);
    ctx.emit({ type: 'crouch', x: this.x, y: this.y });
    ctx.emit({ type: 'say', text: 'Fin!', x: this.x, y: this.y - 34, danger: true });
  }

  /** Straight down the lane: it stops at the lane's end, or where the water gets too shallow (land). */
  private charge(ctx: EnemyCtx, dt: number): void {
    const lane = this.lane;
    if (!lane) return;
    const s = ctx.snake;
    const left = dist(this, lane.to);
    const step = Math.min(left, CHARGE_SPEED * dt);
    const next = pt(this.x + Math.cos(this.heading) * step, this.y + Math.sin(this.heading) * step);
    const blocked = ctx.inZone(this.ahead(SNOUT * 0.6, next), 'land');
    if (!blocked) {
      this.x = next.x;
      this.y = next.y;
    }
    const jaws = nearestOnSegment(s.head, this.here(), this.snout);
    if (!this.bit && dist(jaws, s.head) < BITE + s.width / 2) {
      this.bit = true;
      ctx.hurt('shark', s.head);
    } else if (!this.nipped && s.trail.pts.slice(s.neck, s.trail.count).some((p) => dist(p, this) < BITE)) {
      this.nipped = true;
      ctx.nip(NIP, this.here());
    }
    if (blocked || left - step < 1) {
      this.lane = null;
      this.go('turn', TURN_TIME);
      ctx.emit({ type: 'say', text: blocked ? 'Splash!' : 'Whoosh!', x: this.x, y: this.y - 30 });
    }
  }

  private hit(ctx: EnemyCtx): void {
    this.hp -= 1;
    ctx.emit({ type: 'bossHit', x: this.x, y: this.y });
    ctx.emit({ type: 'say', text: 'Thrash!', x: this.x, y: this.y - 44, danger: true });
    const h = ctx.snake.head;
    const a = Math.atan2(this.y - h.y, this.x - h.x);
    this.target = pt(clamp(this.x + Math.cos(a) * 230, PAD, ctx.w - PAD), clamp(this.y + Math.sin(a) * 230, PAD, ctx.h - PAD));
    this.go('struck', 0.6);
  }

  /** Swims towards `to`, never onto land: it slides round the shore instead. */
  private swim(ctx: EnemyCtx, to: Pt, speed: number, dt: number, face = true): void {
    const d = dist(this, to);
    if (d < 1) return;
    const want = Math.atan2(to.y - this.y, to.x - this.x);
    const step = Math.min(d, speed * dt);
    for (const off of [0, 0.5, -0.5, 1, -1, 1.6, -1.6]) {
      const a = want + off;
      const next = pt(clamp(this.x + Math.cos(a) * step, PAD, ctx.w - PAD), clamp(this.y + Math.sin(a) * step, PAD, ctx.h - PAD));
      if (ctx.inZone(next, 'land')) continue;
      this.x = next.x;
      this.y = next.y;
      if (face) this.heading = turnTowards(this.heading, a, 4 * dt);
      return;
    }
  }

  /** In the water and on the board. */
  private wet(ctx: EnemyCtx, p: Pt): boolean {
    return p.x > PAD && p.y > PAD && p.x < ctx.w - PAD && p.y < ctx.h - PAD && !ctx.inZone(p, 'land');
  }

  private ahead(d: number, from: Pt = this.here()): Pt {
    return pt(from.x + Math.cos(this.heading) * d, from.y + Math.sin(this.heading) * d);
  }

  private circleRoll(ctx: EnemyCtx): number {
    return CIRCLE_TIME[0] + ctx.rng() * (CIRCLE_TIME[1] - CIRCLE_TIME[0]);
  }
}
