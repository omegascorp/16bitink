import { edgePoint, type Boss, type EnemyCtx, type Ringed } from '../enemyTypes';
import { EnemyBase } from '../enemies/base';
import { clamp, dist, pt, type Pt } from '../vec';

type SecretaryMode = 'enter' | 'walk' | 'raise' | 'stamp' | 'down' | 'startle' | 'retreat' | 'gone';

/** Its long-legged stride after the snake, px/s. */
const WALK_SPEED = 72;
/** It raises a foot once the head is this close, after walking at least this long, s. */
const RANGE = 150;
const WALK_MIN = 1.1;
/** The stamp's ring, px. */
export const STAMP_RING = 40;
/** The raise: the ring follows the head this long, then holds this long (the last chance to slip out), s. */
const AIM = 0.75;
const HOLD = 0.5;
/** A second stamp in a row (when it's half beaten) aims quicker, s. */
const AIM_AGAIN = 0.45;
/** The ring aims at where the head will be this far ahead, s. */
const LEAD = 0.3;
/** The stamp: the bird steps onto its foot this fast, s. */
const STAMP_TIME = 0.14;
/** Foot down after the stamp: the open moment to strike it, s. */
const DOWN_TIME = 1.9;
/** A strike this close to it while its foot is down lands, px. */
const STRIKE_REACH = 50;
/** It keeps its body within this of the ring as it aims (a long leg reaches far), px. */
const LEG = 70;

/**
 * The Secretary Bird, chapter 4's boss: long-legged, it walks the grass
 * after the egg-eater and stamps (secretary birds kill snakes by stamping
 * on them: a kick of about five times their weight in about 15 ms). Each
 * stamp is told: a red ring follows the head a moment, then holds; then
 * the foot comes down on it. A head in the ring loses a life. After a
 * stamp its foot is down, pinned to the ground: the open moment to strike
 * it. Tall grass doesn't hide you from it (it stamps the tufts), and the
 * rasp doesn't scare it. Once half beaten it stamps twice in a row.
 */
export class SecretaryBird extends EnemyBase<SecretaryMode> implements Boss, Ringed {
  hp: number;
  readonly maxHp: number;
  /** Where the stamp lands, while the foot is raised and stamping. */
  ring: Pt | null = null;
  private from: Pt = pt(0, 0);
  private target: Pt = pt(0, 0);
  /** Stamps still to come before the foot rests. */
  private stamps = 0;
  private aim = AIM;

  constructor(id: number, hp: number, w: number, h: number) {
    super(id, 'secretary-bird', pt(w + 60, h * 0.5), 'enter');
    this.hp = hp;
    this.maxHp = hp;
    this.left = 1.6;
    this.target = pt(w - 170, h * 0.5);
    this.heading = Math.PI;
  }

  get away(): boolean {
    return this.m === 'gone';
  }

  get beaten(): boolean {
    return this.hp <= 0;
  }

  get ringR(): number {
    return STAMP_RING;
  }

  /** How far through the raise it is, 0..1 (the ring tightens). */
  get ringT(): number {
    return this.m === 'raise' ? Math.min(1, this.age / (this.aim + HOLD)) : this.m === 'stamp' ? 1 : 0;
  }

  step(ctx: EnemyCtx, dt: number): void {
    const done = this.tick(dt);
    const s = ctx.snake;
    switch (this.m) {
      case 'enter':
        this.moveTo(this.target, 130, dt);
        if (done) this.go('walk', WALK_MIN);
        return;
      case 'walk':
        if (dist(this, s.head) > RANGE * 0.6) this.moveTo(s.head, WALK_SPEED * (this.hp < this.maxHp ? 1.25 : 1), dt);
        else this.heading = Math.atan2(s.head.y - this.y, s.head.x - this.x);
        this.keepOn(ctx, 30);
        if (done && dist(this, s.head) < RANGE) {
          this.stamps = this.hp <= this.maxHp / 2 ? 2 : 1;
          this.raise(ctx, AIM);
        }
        return;
      case 'raise': {
        const r = this.ring;
        if (!r) return;
        if (this.age < this.aim) {
          const want = this.lead(ctx);
          const k = Math.min(1, dt * 7);
          this.ring = pt(r.x + (want.x - r.x) * k, r.y + (want.y - r.y) * k);
        }
        const ring = this.ring!;
        if (dist(this, ring) > LEG) this.moveTo(pt(ring.x - Math.cos(this.heading) * LEG, ring.y - Math.sin(this.heading) * LEG), 160, dt);
        this.heading = Math.atan2(ring.y - this.y, ring.x - this.x);
        if (done) {
          this.from = this.here();
          this.go('stamp', STAMP_TIME);
          ctx.emit({ type: 'say', text: 'Stamp!', x: ring.x, y: ring.y - 32, danger: true, sound: 'pounce' });
          if (dist(s.head, ring) < STAMP_RING) ctx.hurt('stamped', ring);
        }
        return;
      }
      case 'stamp': {
        // The body comes down over the foot.
        const r = this.ring;
        if (!r) return;
        const t = Math.min(1, this.age / STAMP_TIME);
        this.x = this.from.x + (r.x - this.from.x) * t * 0.7;
        this.y = this.from.y + (r.y - this.from.y) * t * 0.7;
        if (!done) return;
        this.ring = null;
        this.stamps -= 1;
        if (this.stamps > 0) this.raise(ctx, AIM_AGAIN);
        else this.go('down', DOWN_TIME);
        return;
      }
      case 'down':
        if (this.struckBy(ctx, STRIKE_REACH)) {
          this.hit(ctx);
          return;
        }
        if (done) this.go('walk', WALK_MIN);
        return;
      case 'startle':
        this.moveTo(this.target, 300, dt);
        this.alt = Math.sin(Math.min(1, this.age / 0.6) * Math.PI) * 0.5;
        if (done) {
          this.alt = 0;
          if (this.beaten) {
            this.target = edgePoint(ctx.rng, ctx.w, ctx.h, 160);
            this.go('retreat', 2.2);
            ctx.emit({ type: 'bossBeaten', x: this.x, y: this.y });
          } else this.go('walk', WALK_MIN + 0.8);
        }
        return;
      case 'retreat':
        this.moveTo(this.target, 260, dt);
        this.alt = Math.min(0.8, this.alt + dt * 0.8);
        if (done) this.go('gone');
        return;
      case 'gone':
        return;
    }
  }

  /** Where the head will be in a moment, on the board. */
  private lead(ctx: EnemyCtx): Pt {
    const s = ctx.snake;
    const ahead = s.mode === 'move' ? s.spec.speed * LEAD : 0;
    return pt(clamp(s.head.x + Math.cos(s.heading) * ahead, 24, ctx.w - 24), clamp(s.head.y + Math.sin(s.heading) * ahead, 24, ctx.h - 24));
  }

  private raise(ctx: EnemyCtx, aim: number): void {
    this.aim = aim;
    this.ring = this.lead(ctx);
    this.go('raise', aim + HOLD);
    ctx.emit({ type: 'crouch', x: this.x, y: this.y });
  }

  private hit(ctx: EnemyCtx): void {
    this.hp -= 1;
    ctx.emit({ type: 'bossHit', x: this.x, y: this.y });
    ctx.emit({ type: 'say', text: 'Kraak!', x: this.x, y: this.y - 44, danger: true });
    const head = ctx.snake.head;
    const a = Math.atan2(this.y - head.y, this.x - head.x);
    this.target = pt(clamp(this.x + Math.cos(a) * 190, 50, ctx.w - 50), clamp(this.y + Math.sin(a) * 190, 50, ctx.h - 50));
    this.go('startle', 0.6);
  }
}
