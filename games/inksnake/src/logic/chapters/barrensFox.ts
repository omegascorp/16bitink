import { edgePoint, type Boss, type EnemyCtx, type Prompt } from '../enemyTypes';
import type { Snake } from '../snake';
import { EnemyBase } from '../enemies/base';
import { clamp, dist, pt, type Pt } from '../vec';

type FoxMode = 'enter' | 'stalk' | 'crouch' | 'leap' | 'sniff' | 'shake' | 'startle' | 'retreat' | 'gone';

/** It likes to watch from this far, and leaps from within this range, px. */
const WATCH = 190;
const LEAP_RANGE = [110, 300] as const;
const STALK_SPEED = 85;
/** Crouched, ears pricked, before the leap (the tell), s. */
const CROUCH_TIME = 0.75;
/** The "mousing" leap: high and arcing, onto a ring where the head was, s. */
const LEAP_TIME = 0.7;
export const FOX_RING = 44;
/** Nose down over a snake that's playing dead: the moment to strike, s. */
const SNIFF_TIME = 2.2;
const STRIKE_REACH = 46;
const LEAD = 0.25;

/** What to do at each moment of the fight. */
const PROMPTS = {
  playDead: { mouse: 'The fox is leaping! Hold E to play dead', touch: 'The fox is leaping! Hold Play dead' },
  still: { mouse: 'Keep still… let it land', touch: 'Keep still… let it land' },
  strike: { mouse: 'It\u2019s sniffing you: strike now! (click or Space)', touch: 'It\u2019s sniffing you: tap to strike now!' },
  missed: { mouse: 'It only stops to sniff a snake playing dead', touch: 'It only stops to sniff a snake playing dead' },
  ready: { mouse: 'When the fox crouches, hold E to play dead', touch: 'When the fox crouches, hold Play dead' },
} as const satisfies Record<string, Prompt>;

/**
 * The Red Fox, chapter 2's boss: it stalks the hognose and leaps high, the
 * way foxes pounce on mice, coming down on a red ring where the head was.
 * A head in the ring loses a life. A snake playing dead when it lands
 * near is no prey to it at first: it stops to sniff, nose down, and that's
 * the moment to strike. A plain miss it shakes off at once: only playing
 * dead opens it up.
 */
export class Fox extends EnemyBase<FoxMode> implements Boss {
  hp: number;
  readonly maxHp: number;
  /** Where the leap comes down, while crouched and leaping. */
  ring: Pt | null = null;
  private from: Pt = pt(0, 0);
  private target: Pt = pt(0, 0);

  constructor(id: number, hp: number, w: number, h: number) {
    super(id, 'fox', pt(-60, h * 0.5), 'enter');
    this.hp = hp;
    this.maxHp = hp;
    this.left = 1.4;
    this.target = pt(140, h * 0.5);
    void w;
  }

  /** It has come down once on a snake that wasn't playing dead: the reminder shows while it stalks. */
  private missed = false;

  get away(): boolean {
    return this.m === 'gone';
  }

  get beaten(): boolean {
    return this.hp <= 0;
  }

  get ringR(): number {
    return FOX_RING;
  }

  get ringT(): number {
    return this.aiming;
  }

  /** How far through the leap's tell it is, 0..1 (the ring tightens). */
  get aiming(): number {
    return this.m === 'crouch' ? Math.min(1, this.age / CROUCH_TIME) : this.m === 'leap' ? 1 : 0;
  }

  /** The fight told step by step: play dead as it leaps, keep still as it lands, strike while it sniffs. */
  prompt(snake: Snake): Prompt | null {
    const dead = snake.cloak === 'dead';
    switch (this.m) {
      case 'crouch':
      case 'leap':
        return dead ? PROMPTS.still : PROMPTS.playDead;
      case 'sniff':
        return PROMPTS.strike;
      case 'shake':
        return PROMPTS.missed;
      case 'stalk':
        return this.missed && !dead ? PROMPTS.ready : null;
      default:
        return null;
    }
  }

  step(ctx: EnemyCtx, dt: number): void {
    const done = this.tick(dt);
    const s = ctx.snake;
    switch (this.m) {
      case 'enter':
        this.moveTo(this.target, 150, dt);
        if (done) this.go('stalk', 2.2);
        return;
      case 'stalk': {
        const a = Math.atan2(this.y - s.head.y, this.x - s.head.x) + dt * 0.4;
        const spot = pt(clamp(s.head.x + Math.cos(a) * WATCH, 40, ctx.w - 40), clamp(s.head.y + Math.sin(a) * WATCH, 40, ctx.h - 40));
        this.moveTo(spot, STALK_SPEED, dt);
        this.heading = Math.atan2(s.head.y - this.y, s.head.x - this.x);
        const d = dist(this, s.head);
        // Its ears find the snake even under the leaves: only distance stops a leap.
        if (done && d > LEAP_RANGE[0] && d < LEAP_RANGE[1]) {
          const ahead = s.cloak === 'dead' ? 0 : s.spec.speed * LEAD;
          this.ring = pt(clamp(s.head.x + Math.cos(s.heading) * ahead, 30, ctx.w - 30), clamp(s.head.y + Math.sin(s.heading) * ahead, 30, ctx.h - 30));
          this.go('crouch', CROUCH_TIME);
          ctx.emit({ type: 'crouch', x: this.x, y: this.y });
        } else if (done) this.left = 0.5;
        return;
      }
      case 'crouch':
        if (this.ring) this.heading = Math.atan2(this.ring.y - this.y, this.ring.x - this.x);
        if (done) {
          this.from = this.here();
          this.go('leap', LEAP_TIME);
          ctx.emit({ type: 'pounce', x: this.x, y: this.y });
        }
        return;
      case 'leap': {
        const r = this.ring;
        if (!r) return;
        const t = Math.min(1, this.age / LEAP_TIME);
        this.x = this.from.x + (r.x - this.from.x) * t;
        this.y = this.from.y + (r.y - this.from.y) * t;
        this.alt = Math.sin(t * Math.PI);
        if (!done) return;
        this.alt = 0;
        this.ring = null;
        const near = dist(s.head, this) < FOX_RING + s.width / 2;
        if (s.cloak === 'dead' && dist(s.head, this) < 110) {
          // Not prey, is it? Nose down for a sniff.
          this.go('sniff', SNIFF_TIME);
          ctx.emit({ type: 'say', text: 'sniff… sniff…', x: this.x, y: this.y - 34 });
        } else {
          this.missed = true;
          if (near && ctx.hurt('pounced', this.here())) this.retreatFrom(ctx, s.head, 1.6);
          else this.go('shake', 0.8);
        }
        return;
      }
      case 'sniff':
        if (this.struckBy(ctx, STRIKE_REACH)) {
          this.hit(ctx);
          return;
        }
        if (done) this.go('stalk', 1.5);
        return;
      case 'shake':
        if (done) this.go('stalk', 1.6 + ctx.rng());
        return;
      case 'startle':
        this.moveTo(this.target, 380, dt);
        this.alt = Math.sin(Math.min(1, this.age / 0.5) * Math.PI) * 0.5;
        if (done) {
          this.alt = 0;
          if (this.beaten) {
            this.target = edgePoint(ctx.rng, ctx.w, ctx.h, 140);
            this.go('retreat', 2);
            ctx.emit({ type: 'bossBeaten', x: this.x, y: this.y });
          } else this.go('retreat', 1.2);
        }
        return;
      case 'retreat':
        this.moveTo(this.target, this.beaten ? 280 : 130, dt);
        if (done) this.go(this.beaten ? 'gone' : 'stalk', 2);
        return;
      case 'gone':
        return;
    }
  }

  private hit(ctx: EnemyCtx): void {
    this.hp -= 1;
    ctx.emit({ type: 'bossHit', x: this.x, y: this.y });
    ctx.emit({ type: 'say', text: 'Yip!', x: this.x, y: this.y - 40, danger: true });
    this.retreatFrom(ctx, ctx.snake.head, 0.5);
    this.go('startle', 0.5);
  }

  private retreatFrom(ctx: EnemyCtx, from: Pt, seconds: number): void {
    const a = Math.atan2(this.y - from.y, this.x - from.x);
    this.target = pt(clamp(this.x + Math.cos(a) * 200, 50, ctx.w - 50), clamp(this.y + Math.sin(a) * 200, 50, ctx.h - 50));
    this.go('retreat', seconds);
  }
}
