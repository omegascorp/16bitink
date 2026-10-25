import type { LevelDef } from '../../level/types';
import { edgePoint, type Boss, type EnemyCtx } from '../enemyTypes';
import { EnemyBase } from '../enemies/base';
import { clamp, dist, pt, type Pt } from '../vec';

type EagleMode = 'enter' | 'perch' | 'lift' | 'lock' | 'swoop' | 'climb' | 'settle' | 'open' | 'startle' | 'leave' | 'gone';

/** The red ring its swoop aims for, px. */
export const EAGLE_RING = 44;
/** Watching from a perch, s (the first wait is longer). */
const PERCH_TIME = [2, 3.2] as const;
/** Up off the perch before the lock, s. */
const LIFT_TIME = 0.45;
/** The ring follows the head this long, then holds still this long before the swoop, s. */
const LOCK_TIME = 1.2;
const STOOP_TIME = 0.5;
const SWOOP_TIME = 0.38;
/** Flying from crown to crown, s. */
const FLY_TIME = 1.3;
const SETTLE_TIME = 0.7;
/** On a crown after a miss, wings half open: the moment to strike it, s. */
export const OPEN_TIME = 3.8;
/** It lands at least this far from the snake after a miss, so it's a glide away, px. */
const SETTLE_AWAY = 120;
const STRIKE_REACH = 44;
/** Heights: perched up in a tall crown, flying, high overhead. */
const ALT = { perch: 0.22, fly: 0.75, high: 1 } as const;

/**
 * The Crested Serpent Eagle, chapter 5's boss: a bird that lives on snakes.
 * It watches from the tall crowns (the level's spots, or its tree crowns),
 * lifts off, and a red ring locks on to the snake's head, follows it, then
 * holds: the swoop lands on the ring, a life if the head is still in it.
 * A glide is the quickest way out. After a miss it lands on a crown a
 * glide away, wings half open: glide over and strike it there. Three
 * strikes (its `hp`) drive it off.
 */
export class SerpentEagle extends EnemyBase<EagleMode> implements Boss {
  hp: number;
  readonly maxHp: number;
  /** Where the swoop will land, while it locks on and swoops. */
  ring: Pt | null = null;
  private readonly perches: readonly Pt[];
  private from: Pt = pt(0, 0);
  private to: Pt = pt(0, 0);

  constructor(id: number, hp: number, level: LevelDef, w: number, h: number) {
    super(id, 'serpent-eagle', pt(w + 80, -80), 'enter');
    this.hp = hp;
    this.maxHp = hp;
    this.perches = perchesOf(level, w, h);
    this.alt = ALT.high;
    this.from = this.here();
    this.to = this.perches[0]!;
    this.left = 1.8;
  }

  get away(): boolean {
    return this.m === 'gone';
  }

  get beaten(): boolean {
    return this.hp <= 0;
  }

  get ringR(): number {
    return EAGLE_RING;
  }

  get ringT(): number {
    if (this.m === 'lock') return Math.min(1, this.age / (LOCK_TIME + STOOP_TIME));
    return this.m === 'swoop' ? 1 : 0;
  }

  /** On a crown after a miss: open to a strike. */
  get open(): boolean {
    return this.m === 'open';
  }

  step(ctx: EnemyCtx, dt: number): void {
    const done = this.tick(dt);
    const s = ctx.snake;
    switch (this.m) {
      case 'enter':
      case 'climb':
      case 'settle':
        this.fly(this.m === 'settle' ? SETTLE_TIME : this.m === 'enter' ? 1.8 : FLY_TIME, this.m === 'settle' ? 0 : ALT.perch);
        if (!done) return;
        if (this.m === 'settle') {
          this.go('open', OPEN_TIME);
          ctx.emit({ type: 'land', kind: this.kind, x: this.x, y: this.y });
          ctx.emit({ type: 'say', text: 'kluee…', x: this.x, y: this.y - 34 });
        } else this.go('perch', PERCH_TIME[0] + ctx.rng() * (PERCH_TIME[1] - PERCH_TIME[0]) + (this.m === 'enter' ? 1 : 0));
        return;
      case 'perch':
        this.alt = ALT.perch;
        this.heading = Math.atan2(s.head.y - this.y, s.head.x - this.x);
        if (done) {
          this.from = this.here();
          this.go('lift', LIFT_TIME);
          ctx.emit({ type: 'cry', x: this.x, y: this.y });
        }
        return;
      case 'lift':
        this.alt = ALT.perch + (ALT.fly - ALT.perch) * Math.min(1, this.age / LIFT_TIME);
        if (done) {
          this.ring = pt(s.head.x, s.head.y);
          this.go('lock', LOCK_TIME + STOOP_TIME);
          ctx.emit({ type: 'lock', kind: this.kind, x: this.ring.x, y: this.ring.y });
        }
        return;
      case 'lock':
        this.lock(ctx, dt, done);
        return;
      case 'swoop':
        this.swoop(ctx, done);
        return;
      case 'open':
        this.alt = 0;
        if (this.struckBy(ctx, STRIKE_REACH)) {
          this.hit(ctx);
          return;
        }
        if (done) this.flyTo(this.farPerch(ctx), 'climb');
        return;
      case 'startle':
        this.alt = Math.min(ALT.fly, this.alt + dt * 2);
        if (!done) return;
        if (this.beaten) {
          this.from = this.here();
          this.to = edgePoint(ctx.rng, ctx.w, ctx.h, 160);
          this.go('leave', 2);
          ctx.emit({ type: 'bossBeaten', x: this.x, y: this.y });
        } else this.flyTo(this.farPerch(ctx), 'climb');
        return;
      case 'leave':
        this.fly(2, ALT.high);
        if (done) this.go('gone');
        return;
      case 'gone':
        return;
    }
  }

  /** The ring follows the head (a little behind), then holds for the stoop. */
  private lock(ctx: EnemyCtx, dt: number, done: boolean): void {
    const s = ctx.snake;
    const r = this.ring;
    if (!r) return;
    if (this.age < LOCK_TIME) {
      const k = Math.min(1, dt * 2.4);
      this.ring = pt(r.x + (s.head.x - r.x) * k, r.y + (s.head.y - r.y) * k);
    }
    // Hanging in the air over its perch, eyes on the ring.
    this.heading = Math.atan2(r.y - this.y, r.x - this.x);
    this.alt = ALT.fly;
    if (done && this.ring) {
      this.from = this.here();
      this.go('swoop', SWOOP_TIME);
      ctx.emit({ type: 'say', text: 'Swoop!', x: this.ring.x, y: this.ring.y - 40, danger: true, sound: 'dive' });
    }
  }

  private swoop(ctx: EnemyCtx, done: boolean): void {
    const r = this.ring;
    if (!r) return;
    const t = Math.min(1, this.age / SWOOP_TIME);
    this.x = this.from.x + (r.x - this.from.x) * t;
    this.y = this.from.y + (r.y - this.from.y) * t;
    this.alt = ALT.fly * (1 - t);
    this.heading = Math.atan2(r.y - this.from.y, r.x - this.from.x);
    if (!done) return;
    const s = ctx.snake;
    const hit = dist(s.head, r) < EAGLE_RING && ctx.hurt('taloned', r);
    ctx.emit({ type: hit ? 'dive' : 'miss', kind: this.kind, x: r.x, y: r.y });
    this.ring = null;
    if (hit) this.flyTo(this.farPerch(ctx), 'climb');
    else this.flyTo(this.settleSpot(ctx, r), 'settle');
  }

  private hit(ctx: EnemyCtx): void {
    this.hp -= 1;
    ctx.emit({ type: 'bossHit', x: this.x, y: this.y });
    ctx.emit({ type: 'say', text: 'kek-kek-kek!', x: this.x, y: this.y - 44, danger: true });
    this.go('startle', 0.5);
  }

  private flyTo(to: Pt, mode: 'climb' | 'settle'): void {
    this.from = this.here();
    this.to = to;
    this.go(mode, mode === 'settle' ? SETTLE_TIME : FLY_TIME);
  }

  /** Along from `from` to `to` over `time` s, arcing up off the ground and settling at `endAlt`. */
  private fly(time: number, endAlt: number): void {
    const t = Math.min(1, this.age / time);
    const e = t * t * (3 - 2 * t);
    this.x = this.from.x + (this.to.x - this.from.x) * e;
    this.y = this.from.y + (this.to.y - this.from.y) * e;
    if (dist(this.from, this.to) > 1) this.heading = Math.atan2(this.to.y - this.from.y, this.to.x - this.from.x);
    this.alt = Math.max(endAlt, Math.sin(t * Math.PI) * ALT.fly + endAlt * t);
  }

  /** A perch well away from the snake. */
  private farPerch(ctx: EnemyCtx): Pt {
    const h = ctx.snake.head;
    const far = this.perches.filter((p) => dist(p, h) > 260);
    const list = far.length ? far : this.perches;
    return list[Math.floor(ctx.rng() * list.length)]!;
  }

  /** The crown it lands on after a miss: the nearest to the ring that's a glide away from the head. */
  private settleSpot(ctx: EnemyCtx, ring: Pt): Pt {
    const h = ctx.snake.head;
    const away = this.perches.filter((p) => dist(p, h) > SETTLE_AWAY);
    const list = away.length ? away : this.perches;
    return list.reduce((best, p) => (dist(p, ring) < dist(best, ring) ? p : best), list[0]!);
  }
}

/** Where it perches: the level's spots, else the middles of its round tree crowns, else the board's corners. */
function perchesOf(level: LevelDef, w: number, h: number): readonly Pt[] {
  if (level.spots?.length) return level.spots;
  const crowns = (level.zones ?? []).flatMap((z) => (z.kind === 'tree' && z.shape === 'circle' ? [pt(z.x, z.y)] : []));
  if (crowns.length) return crowns;
  return [pt(clamp(w * 0.2, 40, w), h * 0.25), pt(w * 0.8, h * 0.25), pt(w * 0.5, h * 0.75)];
}
