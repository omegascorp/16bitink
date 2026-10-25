import { edgePoint, type Boss, type EnemyCtx } from '../enemyTypes';
import { EnemyBase } from '../enemies/base';
import { clamp, dist, nearestOnSegment, pt, type Pt } from '../vec';

export type RoadrunnerMode = 'enter' | 'watch' | 'aim' | 'dash' | 'skid' | 'startle' | 'retreat' | 'gone';

/** It watches from about this far, and dashes from within this range, px. */
const WATCH = 250;
const DASH_RANGE = [130, 460] as const;
const TROT = 120;
/** The tell: head down, tail up, a dotted lane through the snake, s. The lane follows the head for the first share of it. */
export const AIM_TIME = 1.0;
const AIM_FOLLOW = 0.6;
/** The dash: this fast, on past the snake by this much (more when it can't see a buried one), px/s and px. */
const DASH_SPEED = 600;
const OVERSHOOT = 150;
const FOOLED_OVERSHOOT = 260;
/** Its grab reaches this far either side of its run, px. */
export const LANE_HALF = 24;
/** Skidding to a stop after a dash, off balance: the moment to strike, s (longer after a buried snake fooled it). */
const SKID_TIME = 1.7;
const FOOLED_SKID = 2.8;
/** How fast the skid slows it, per s. */
const SKID_DRAG = 3.2;
const STRIKE_REACH = 40;
const NIP = 26;
/** Keeps this far in from the edges, px. */
const EDGE = 34;

/** What it says, by moment (picked by turn). */
const AIM_WORDS = ['meep meep!', 'meep?', 'beep-beep!'] as const;
const HIT_WORDS = ['MEEP!', 'meep!?', 'MEEEP!'] as const;

/**
 * The Roadrunner, chapter 3's boss. It trots round the snake at a distance,
 * then lowers its head and raises its tail (the tell) while a dotted lane
 * runs from its feet through the snake, and dashes down it, fast and
 * straight, grabbing at the snake: a head in the lane loses a life, a body
 * only a nip (a cartoon grab: it lets go). Real roadrunners kill rattlesnakes.
 * After every dash it skids to a stop, off balance: strike it then (three
 * times). A snake buried in the sand isn't there to grab: it runs right
 * over, overshoots, and skids longer.
 */
export class Roadrunner extends EnemyBase<RoadrunnerMode> implements Boss {
  hp: number;
  readonly maxHp: number;
  /** The dash's lane, from its feet to where it means to stop, while it aims and dashes. */
  lane: { readonly from: Pt; readonly to: Pt } | null = null;
  /** The last dash was fooled by a buried snake (it skids longer). */
  fooled = false;
  private target: Pt = pt(0, 0);
  private orbit = 1;
  private speed = 0;
  private grabbed = false;
  private nipped = false;
  private said = 0;

  constructor(id: number, hp: number, w: number, h: number) {
    super(id, 'roadrunner', pt(w + 60, h * 0.5), 'enter');
    this.hp = hp;
    this.maxHp = hp;
    this.left = 1.4;
    this.target = pt(w - 160, h * 0.5);
  }

  get away(): boolean {
    return this.m === 'gone';
  }

  get beaten(): boolean {
    return this.hp <= 0;
  }

  /** How far through its tell it is, 0..1 (the lane darkens). */
  get aiming(): number {
    return this.m === 'aim' ? Math.min(1, this.age / AIM_TIME) : this.m === 'dash' ? 1 : 0;
  }

  /** Whether it's open to a strike now: skidding, off balance. */
  get open(): boolean {
    return this.m === 'skid';
  }

  step(ctx: EnemyCtx, dt: number): void {
    const done = this.tick(dt);
    switch (this.m) {
      case 'enter':
        this.moveTo(this.target, 200, dt);
        if (done) this.go('watch', 1.6);
        return;
      case 'watch':
        this.watch(ctx, dt, done);
        return;
      case 'aim':
        this.aim(ctx, done);
        return;
      case 'dash':
        this.dash(ctx, dt);
        return;
      case 'skid':
        this.skid(ctx, dt, done);
        return;
      case 'startle':
        this.moveTo(this.target, 320, dt);
        this.alt = Math.sin(Math.min(1, this.age / 0.5) * Math.PI) * 0.4;
        if (done) {
          this.alt = 0;
          if (this.beaten) {
            this.target = edgePoint(ctx.rng, ctx.w, ctx.h, 140);
            this.go('retreat', 2);
            ctx.emit({ type: 'bossBeaten', x: this.x, y: this.y });
            ctx.emit({ type: 'say', text: 'meep… meep…', x: this.x, y: this.y - 36 });
          } else this.go('retreat', 1.1);
        }
        return;
      case 'retreat':
        this.moveTo(this.target, this.beaten ? 420 : 200, dt);
        if (done) this.go(this.beaten ? 'gone' : 'watch', 1.8);
        return;
      case 'gone':
        return;
    }
  }

  /** Trots round the snake at a distance, then lines up a dash. A strike at it now only makes it hop back. */
  private watch(ctx: EnemyCtx, dt: number, done: boolean): void {
    const s = ctx.snake;
    if (this.struckBy(ctx, STRIKE_REACH)) {
      ctx.emit({ type: 'say', text: 'meep!', x: this.x, y: this.y - 34, sound: 'cluck' });
      this.retreatFrom(ctx, s.head, 0.8);
      return;
    }
    const a = Math.atan2(this.y - s.head.y, this.x - s.head.x) + dt * 0.5 * this.orbit;
    const spot = pt(clamp(s.head.x + Math.cos(a) * WATCH, EDGE, ctx.w - EDGE), clamp(s.head.y + Math.sin(a) * WATCH, EDGE, ctx.h - EDGE));
    this.moveTo(spot, TROT, dt);
    this.heading = Math.atan2(s.head.y - this.y, s.head.x - this.x);
    const d = dist(this, s.head);
    if (done && d > DASH_RANGE[0] && d < DASH_RANGE[1]) {
      this.lane = { from: this.here(), to: this.laneEnd(ctx, s.head, OVERSHOOT) };
      this.go('aim', AIM_TIME);
      ctx.emit({ type: 'crouch', x: this.x, y: this.y });
      ctx.emit({ type: 'say', text: AIM_WORDS[this.said++ % AIM_WORDS.length]!, x: this.x, y: this.y - 34, sound: 'cluck' });
    } else if (done) this.left = 0.4;
  }

  /** The tell: head down, tail up, the lane following the snake a moment and then holding. */
  private aim(ctx: EnemyCtx, done: boolean): void {
    const s = ctx.snake;
    if (this.lane && this.age < AIM_TIME * AIM_FOLLOW) this.lane = { from: this.here(), to: this.laneEnd(ctx, s.head, OVERSHOOT) };
    const lane = this.lane;
    if (!lane) return;
    this.heading = Math.atan2(lane.to.y - lane.from.y, lane.to.x - lane.from.x);
    if (!done) return;
    // It can't see a snake down in the sand: it runs on past where it last saw it.
    this.fooled = s.cloak === 'buried';
    if (this.fooled) this.lane = { from: lane.from, to: this.extend(ctx, lane, FOOLED_OVERSHOOT - OVERSHOOT) };
    this.grabbed = false;
    this.nipped = false;
    this.speed = DASH_SPEED;
    this.go('dash');
    ctx.emit({ type: 'pounce', x: this.x, y: this.y });
  }

  /** Down the lane, fast and straight, grabbing at whatever of the snake is in it. */
  private dash(ctx: EnemyCtx, dt: number): void {
    const lane = this.lane;
    if (!lane) {
      this.go('watch', 1);
      return;
    }
    const before = this.here();
    const arrived = this.moveTo(lane.to, DASH_SPEED, dt);
    this.grab(ctx, before);
    if (!arrived) return;
    this.lane = null;
    this.go('skid', this.fooled ? FOOLED_SKID : SKID_TIME);
    ctx.emit({ type: 'dazed', x: this.x, y: this.y });
    ctx.emit({ type: 'say', text: this.fooled ? 'meep?! skrrt…' : 'skrrt!', x: this.x, y: this.y - 32, sound: 'bump' });
  }

  /** A grab at the head costs a life, at the body a nip; a buried snake isn't there to grab. */
  private grab(ctx: EnemyCtx, before: Pt): void {
    const s = ctx.snake;
    if (s.cloak === 'buried') return;
    const reach = LANE_HALF + s.width / 2;
    const swept = (p: Pt): boolean => dist(nearestOnSegment(p, before, this.here()), p) < reach;
    if (!this.grabbed && swept(s.head)) {
      this.grabbed = true;
      if (ctx.hurt('grabbed', s.head)) ctx.emit({ type: 'say', text: 'gotcha! meep!', x: this.x, y: this.y - 36, danger: true });
      return;
    }
    if (!this.nipped && !this.grabbed && s.trail.pts.slice(s.neck, s.trail.count).some(swept)) {
      this.nipped = true;
      ctx.nip(NIP, this.here());
    }
  }

  /** Sliding to a stop, wings out, off balance: a strike now hits. */
  private skid(ctx: EnemyCtx, dt: number, done: boolean): void {
    this.speed *= Math.exp(-SKID_DRAG * dt);
    this.x = clamp(this.x + Math.cos(this.heading) * this.speed * 0.25 * dt, EDGE, ctx.w - EDGE);
    this.y = clamp(this.y + Math.sin(this.heading) * this.speed * 0.25 * dt, EDGE, ctx.h - EDGE);
    if (this.struckBy(ctx, STRIKE_REACH)) {
      this.hit(ctx);
      return;
    }
    if (done) {
      this.orbit = ctx.rng() < 0.5 ? 1 : -1;
      this.go('watch', 1.4 + ctx.rng() * 0.8);
    }
  }

  private hit(ctx: EnemyCtx): void {
    this.hp -= 1;
    ctx.emit({ type: 'bossHit', x: this.x, y: this.y });
    ctx.emit({ type: 'say', text: HIT_WORDS[(this.maxHp - this.hp - 1) % HIT_WORDS.length]!, x: this.x, y: this.y - 44, danger: true, sound: 'cluck' });
    this.retreatFrom(ctx, ctx.snake.head, 0.5);
    this.go('startle', 0.5);
  }

  private retreatFrom(ctx: EnemyCtx, from: Pt, seconds: number): void {
    const a = Math.atan2(this.y - from.y, this.x - from.x);
    this.target = pt(clamp(this.x + Math.cos(a) * 200, 50, ctx.w - 50), clamp(this.y + Math.sin(a) * 200, 50, ctx.h - 50));
    this.go('retreat', seconds);
  }

  /** Where a dash through `at` from here stops: `over` px past it, kept on the board. */
  private laneEnd(ctx: EnemyCtx, at: Pt, over: number): Pt {
    const a = Math.atan2(at.y - this.y, at.x - this.x);
    return this.clip(ctx, this.here(), a, dist(this, at) + over);
  }

  private extend(ctx: EnemyCtx, lane: { readonly from: Pt; readonly to: Pt }, more: number): Pt {
    const a = Math.atan2(lane.to.y - lane.from.y, lane.to.x - lane.from.x);
    return this.clip(ctx, lane.from, a, dist(lane.from, lane.to) + more);
  }

  /** A point `len` along heading `a` from `from`, cut short at the board's edge. */
  private clip(ctx: EnemyCtx, from: Pt, a: number, len: number): Pt {
    const cx = Math.cos(a);
    const cy = Math.sin(a);
    let t = len;
    if (cx > 1e-6) t = Math.min(t, (ctx.w - EDGE - from.x) / cx);
    if (cx < -1e-6) t = Math.min(t, (EDGE - from.x) / cx);
    if (cy > 1e-6) t = Math.min(t, (ctx.h - EDGE - from.y) / cy);
    if (cy < -1e-6) t = Math.min(t, (EDGE - from.y) / cy);
    t = Math.max(0, t);
    return pt(from.x + cx * t, from.y + cy * t);
  }
}
