import type { LevelDef } from '../../level/types';
import { edgePoint, type Boss, type EnemyCtx, type Ringed } from '../enemyTypes';
import { EnemyBase } from '../enemies/base';
import { clamp, dist, pt, pushOut, type Pt, type Shape } from '../vec';
import { inZone } from '../zones';
import { bankSpots, boardWater } from './floodedBanks';

type JaguarMode = 'enter' | 'prowl' | 'crouch' | 'leap' | 'swim' | 'shake' | 'drink' | 'look' | 'startle' | 'retreat' | 'gone';

/** Prowling the banks, and swimming (jaguars swim well), px/s; a little faster once it's angry. */
const PROWL_SPEED = 80;
const SWIM_SPEED = 60;
const ANGRY_PACE = 1.15;
/** It sees a snake at the surface (or on land) this far, px; a submerged one only this close. */
const SIGHT = 340;
const FEEL = 46;
/** It leaps from the bank at a head this far off, px. */
const LEAP_RANGE = [85, 290] as const;
/** Crouched at the bank, tail twitching, before the leap (the tell): calm, then angry, s. */
const CROUCH_TIME = [1, 0.82] as const;
const LEAP_TIME = 0.62;
export const JAGUAR_RING = 48;
/** The ring is aimed this far ahead of the head, in seconds of its swimming. */
const LEAD = 0.3;
/** Between leaps, calm then angry, s. */
const LEAP_REST = [3.4, 2.3] as const;
/** Prowling this long without finding the snake, it goes down to drink, s. */
const THIRST = [5.5, 8] as const;
/** Head down at the water: the open moment, calm then angry, s. */
const DRINK_TIME = [4.8, 4] as const;
/** Drinking, it looks up at a snake it sees swimming at the surface this close, or anything this near, px. */
const NOTICE_WATER = 175;
const NOTICE_NEAR = 70;
/** Looking up, ears pricked, before it springs at what it saw: a strike now still lands, s. */
const LOOK_TIME = 0.42;
const STRIKE_REACH = 52;
/** A strike counts as from under the water if the snake was submerged this recently, s. */
const AMBUSH = 0.6;
/** Swimming, it bites a head this close, px. */
const SWIM_BITE = 24;
/** Waypoints along the bank: it steps between bank spots this near, px. */
const WAY_STEP = 66;

/**
 * The Jaguar, the last chapter's boss. Jaguars kill caimans, and now and
 * then an anaconda. It prowls the banks shadowing a snake it can see, and
 * leaps into the water at it: it crouches at the bank, tail twitching, and
 * a red ring shows where it will land. A head in the ring when it lands is
 * mauled. Under the water, only your eyes showing, it can't see you unless
 * you're very close, so it loses you, and goes down to drink at one of the
 * banks. Head down, lapping, it's open: swim up under the water and strike
 * from below (a strike from the surface it sees coming). Three strikes and
 * it's driven off into the trees. Each strike makes it angrier: quicker to
 * leap and quicker to drink, but its tell never shortens much.
 */
export class Jaguar extends EnemyBase<JaguarMode> implements Boss, Ringed {
  hp: number;
  readonly maxHp: number;
  /** Where its leap comes down, while crouched and leaping. */
  ring: Pt | null = null;
  private readonly banks: readonly Pt[];
  private readonly drinks: readonly Pt[];
  private from: Pt = pt(0, 0);
  private goal: Pt = pt(0, 0);
  private way: Pt | null = null;
  /** Where it drinks next, while it's on its way there. */
  private drinkAt: Pt | null = null;
  /** The way the water lies from its drinking spot. */
  private facing = 0;
  private leapRest = 2;
  private thirst: number;
  private wander = 0;
  /** Seconds since the snake was last submerged (a strike from under the water). */
  private sinceUnder = 99;
  private crouchFor: number = CROUCH_TIME[0];

  constructor(id: number, hp: number, level: LevelDef, w: number, h: number) {
    const zones = level.zones ?? [];
    const shapes: Shape[] = (level.solids ?? []).map((s) => (s.kind === 'circle' ? { kind: 'circle', x: s.x, y: s.y, r: s.r } : { kind: 'rect', x: s.x, y: s.y, w: s.w, h: s.h }));
    const isWater = (q: Pt): boolean => inZone(q, zones, 'water');
    const banks = bankSpots(w, h, (q) => !isWater(q), (q) => boardWater(q, w, h, isWater), (q) => shapes.some((s) => pushOut(q, 18, s)));
    const start = banks.reduce<Pt>((b, p) => (p.x < b.x ? p : b), banks[0] ?? pt(60, h / 2));
    super(id, 'jaguar', pt(-70, start.y), 'enter');
    this.hp = hp;
    this.maxHp = hp;
    this.banks = banks.length ? banks : [pt(60, h / 2)];
    const own = (level.spots ?? []).filter((p) => !isWater(p));
    this.drinks = own.length ? own : this.banks.filter((_, i) => i % 7 === 0);
    this.goal = start;
    this.left = 2.2;
    this.thirst = THIRST[1];
  }

  get away(): boolean {
    return this.m === 'gone';
  }

  get beaten(): boolean {
    return this.hp <= 0;
  }

  get ringR(): number {
    return JAGUAR_RING;
  }

  /** How far through the leap's tell it is, 0..1 (the ring tightens). */
  get ringT(): number {
    return this.m === 'crouch' ? Math.min(1, this.age / this.crouchFor) : this.m === 'leap' ? 1 : 0;
  }

  /** Angry after its first strike: half its hits gone or more. */
  private get angry(): boolean {
    return this.hp <= this.maxHp / 2;
  }

  private pick(range: readonly [number, number]): number {
    return this.angry ? range[1] : range[0];
  }

  /** Whether it can see the snake's head: at the surface or on land in sight, or submerged right by it. */
  private sees(ctx: EnemyCtx): boolean {
    const s = ctx.snake;
    const d = dist(s.head, this);
    if (s.cloak === 'submerged') return d < FEEL;
    return !s.hidden && d < SIGHT;
  }

  private wet(ctx: EnemyCtx, p: Pt = this.here()): boolean {
    return ctx.inZone(p, 'water');
  }

  step(ctx: EnemyCtx, dt: number): void {
    const done = this.tick(dt);
    const s = ctx.snake;
    this.sinceUnder = s.cloak === 'submerged' ? 0 : this.sinceUnder + dt;
    this.leapRest = Math.max(0, this.leapRest - dt);
    switch (this.m) {
      case 'enter':
        this.moveTo(this.goal, PROWL_SPEED * 1.4, dt);
        if (done) {
          this.go('prowl', 1);
          ctx.emit({ type: 'say', text: 'ROAR!', x: this.x, y: this.y - 40, danger: true, sound: 'growl' });
        }
        return;
      case 'prowl':
        this.prowl(ctx, dt);
        return;
      case 'crouch':
        if (this.ring) this.heading = Math.atan2(this.ring.y - this.y, this.ring.x - this.x);
        if (done) {
          this.from = this.here();
          this.go('leap', LEAP_TIME);
          ctx.emit({ type: 'pounce', x: this.x, y: this.y });
        }
        return;
      case 'leap':
        this.leap(ctx, done);
        return;
      case 'swim':
        this.swimBack(ctx, dt);
        return;
      case 'shake':
        if (done) this.go('prowl', 1);
        return;
      case 'drink':
        this.heading = this.facing;
        if (this.ambushed(ctx)) return;
        if (this.notices(ctx)) {
          this.go('look', LOOK_TIME);
          ctx.emit({ type: 'say', text: '!', x: this.x, y: this.y - 36, danger: true });
          return;
        }
        if (done) {
          this.thirst = this.pick(THIRST);
          this.go('prowl', 1.5);
        }
        return;
      case 'look':
        this.heading = Math.atan2(s.head.y - this.y, s.head.x - this.x);
        if (this.ambushed(ctx)) return;
        if (done) {
          if (this.sees(ctx) && !this.wet(ctx)) this.crouchAt(ctx, true);
          else this.go('prowl', 1);
        }
        return;
      case 'startle':
        this.moveTo(this.goal, 300, dt);
        this.alt = Math.sin(Math.min(1, this.age / 0.5) * Math.PI) * 0.45;
        if (done) {
          this.alt = 0;
          if (this.beaten) {
            this.goal = edgePoint(ctx.rng, ctx.w, ctx.h, 160);
            this.go('retreat', 2.4);
            ctx.emit({ type: 'bossBeaten', x: this.x, y: this.y });
            ctx.emit({ type: 'say', text: '…into the trees', x: this.x, y: this.y - 60 });
          } else {
            this.goal = this.farBank(ctx);
            this.way = null;
            this.go('retreat', 1.4);
          }
        }
        return;
      case 'retreat':
        if (this.beaten) this.moveTo(this.goal, PROWL_SPEED * 3.4, dt);
        else this.walk(ctx, this.goal, PROWL_SPEED * 1.8, dt);
        if (done) {
          if (this.beaten) {
            this.go('gone');
            return;
          }
          this.leapRest = 0.8;
          this.go('prowl', 1);
          if (this.hp === Math.ceil(this.maxHp / 2)) ctx.emit({ type: 'say', text: 'Grrr… it\'s angry now!', x: this.x, y: this.y - 44, danger: true, sound: 'growl' });
        }
        return;
      case 'gone':
        return;
    }
  }

  /** On the banks: shadowing a snake it can see and leaping when it's in range, or, having lost it, off for a drink. */
  private prowl(ctx: EnemyCtx, dt: number): void {
    const s = ctx.snake;
    const sees = this.sees(ctx);
    const d = dist(s.head, this);
    const pace = PROWL_SPEED * (this.angry ? ANGRY_PACE : 1);
    if (sees) {
      this.drinkAt = null;
      if (this.leapRest <= 0 && d > LEAP_RANGE[0] && d < LEAP_RANGE[1] && !this.wet(ctx)) {
        this.crouchAt(ctx, false);
        return;
      }
      // Too close to leap: it backs along the bank; otherwise it keeps level with the snake.
      this.goal = d <= LEAP_RANGE[0] ? this.bankAwayFrom(s.head) : this.bankNear(s.head);
      this.walk(ctx, this.goal, pace, dt);
      this.heading = Math.atan2(s.head.y - this.y, s.head.x - this.x);
      if (ctx.rng() < dt * 0.25) ctx.emit({ type: 'growl', x: this.x, y: this.y });
      return;
    }
    this.thirst -= dt;
    if (this.thirst <= 0 && !this.drinkAt) {
      this.drinkAt = this.drinkSpot(ctx);
      this.goal = this.drinkAt;
      this.way = null;
    }
    if (this.drinkAt) {
      if (this.walk(ctx, this.drinkAt, pace, dt)) {
        this.facing = this.waterWay(ctx, this.drinkAt);
        this.drinkAt = null;
        this.go('drink', this.pick(DRINK_TIME));
        ctx.emit({ type: 'say', text: 'lap… lap…', x: this.x, y: this.y - 34 });
      }
      return;
    }
    this.wander -= dt;
    if (this.wander <= 0 || dist(this, this.goal) < 8) {
      this.wander = 3 + ctx.rng() * 2;
      this.goal = this.banks[Math.floor(ctx.rng() * this.banks.length)]!;
      this.way = null;
    }
    this.walk(ctx, this.goal, pace * 0.8, dt);
  }

  /** Down at the bank, tail twitching: the ring goes where the snake is heading. */
  private crouchAt(ctx: EnemyCtx, quick: boolean): void {
    const s = ctx.snake;
    const ahead = s.speed * LEAD;
    const want = pt(s.head.x + Math.cos(s.heading) * ahead, s.head.y + Math.sin(s.heading) * ahead);
    const a = Math.atan2(want.y - this.y, want.x - this.x);
    const far = Math.min(dist(this, want), LEAP_RANGE[1] + 30);
    this.ring = pt(clamp(this.x + Math.cos(a) * far, 30, ctx.w - 30), clamp(this.y + Math.sin(a) * far, 30, ctx.h - 30));
    this.crouchFor = this.pick(CROUCH_TIME) * (quick ? 0.9 : 1);
    this.go('crouch', this.crouchFor);
    ctx.emit({ type: 'crouch', x: this.x, y: this.y });
  }

  private leap(ctx: EnemyCtx, done: boolean): void {
    const r = this.ring;
    const s = ctx.snake;
    if (!r) {
      this.go('prowl', 1);
      return;
    }
    const t = Math.min(1, this.age / LEAP_TIME);
    this.x = this.from.x + (r.x - this.from.x) * t;
    this.y = this.from.y + (r.y - this.from.y) * t;
    this.alt = Math.sin(t * Math.PI) * 0.8;
    if (!done) return;
    this.alt = 0;
    this.ring = null;
    this.leapRest = this.pick(LEAP_REST);
    if (dist(s.head, this) < JAGUAR_RING + s.width / 2) ctx.hurt('mauled', this.here());
    if (this.wet(ctx)) {
      ctx.emit({ type: 'say', text: 'SPLASH!', x: this.x, y: this.y - 30 });
      this.goal = this.bankNear(this.here());
      this.go('swim', 6);
    } else this.go('prowl', 1);
  }

  /** Swimming back to the nearest bank, then a shake on dry land. */
  private swimBack(ctx: EnemyCtx, dt: number): void {
    const s = ctx.snake;
    this.goal = this.bankNear(this.here());
    this.moveTo(this.goal, SWIM_SPEED, dt);
    this.unstick(ctx);
    if (dist(s.head, this) < SWIM_BITE + s.width / 2 && s.cloak !== 'submerged') ctx.hurt('mauled', this.here());
    if (!this.wet(ctx) || dist(this, this.goal) < 4 || this.left <= 0) this.go('shake', 0.8);
  }

  /** Drinking (or just looking up): struck by a snake that came at it from under the water. */
  private ambushed(ctx: EnemyCtx): boolean {
    if (!this.struckBy(ctx, STRIKE_REACH) || this.sinceUnder > AMBUSH) return false;
    this.hp -= 1;
    ctx.emit({ type: 'bossHit', x: this.x, y: this.y });
    ctx.emit({ type: 'say', text: this.beaten ? 'RRROWR!' : 'Rowr!', x: this.x, y: this.y - 46, danger: true });
    // It springs back up the bank, away from the water.
    const a = this.facing + Math.PI;
    this.goal = pt(clamp(this.x + Math.cos(a) * 90, 30, ctx.w - 30), clamp(this.y + Math.sin(a) * 90, 30, ctx.h - 30));
    this.go('startle', 0.5);
    return true;
  }

  /** Drinking, whether it looks up: a snake at the surface swimming near, anything right by it. */
  private notices(ctx: EnemyCtx): boolean {
    const s = ctx.snake;
    const d = dist(s.head, this);
    if (s.cloak === 'submerged') return d < FEEL * 0.8;
    if (s.hidden) return false;
    return d < NOTICE_NEAR || (d < NOTICE_WATER && ctx.inZone(s.head, 'water'));
  }

  /** Walks towards `to` along the bank (from bank spot to bank spot), swimming any water in the way; true on arrival. */
  private walk(ctx: EnemyCtx, to: Pt, speed: number, dt: number): boolean {
    if (dist(this, to) < 6) return true;
    if (!this.way || dist(this, this.way) < 6) this.way = this.nextWay(to);
    this.moveTo(this.way, this.wet(ctx) ? SWIM_SPEED : speed, dt);
    this.unstick(ctx);
    return dist(this, to) < 6;
  }

  /** The next bank spot on the way to `to`: the nearby one that gets closest to it, or straight there. */
  private nextWay(to: Pt): Pt {
    const here = this.here();
    const left = dist(here, to);
    if (left < WAY_STEP) return to;
    let best = to;
    let bestLeft = left - 4;
    for (const b of this.banks) {
      const step = dist(b, here);
      if (step > WAY_STEP || step < 12) continue;
      const l = dist(b, to);
      if (l < bestLeft) {
        bestLeft = l;
        best = b;
      }
    }
    return best;
  }

  /** Out of anything solid (it walks round trunks). */
  private unstick(ctx: EnemyCtx): void {
    for (const sh of ctx.solids) {
      const out = pushOut(this.here(), 16, sh);
      if (out) {
        this.x = out.p.x;
        this.y = out.p.y;
      }
    }
    this.keepOn(ctx, 20);
  }

  private bankNear(p: Pt): Pt {
    return this.banks.reduce((b, q) => (dist(q, p) < dist(b, p) ? q : b), this.banks[0]!);
  }

  /** A bank spot within a short walk that's farther from `p` (backing off to leap). */
  private bankAwayFrom(p: Pt): Pt {
    let best = this.here();
    let bd = dist(best, p);
    for (const b of this.banks) {
      if (dist(b, this) > 140) continue;
      const d = dist(b, p);
      if (d > bd) {
        bd = d;
        best = b;
      }
    }
    return best;
  }

  /** A bank spot well away from the snake, to retreat to after a strike. */
  private farBank(ctx: EnemyCtx): Pt {
    const far = this.banks.filter((b) => dist(b, ctx.snake.head) > 260 && dist(b, this) < 320);
    const list = far.length ? far : this.banks;
    return list[Math.floor(ctx.rng() * list.length)]!;
  }

  /** Where it drinks next: one of its drinking spots, not right on top of the snake. */
  private drinkSpot(ctx: EnemyCtx): Pt {
    const head = ctx.snake.head;
    const ok = this.drinks.filter((p) => dist(p, head) > 150);
    const list = ok.length ? ok : this.drinks;
    return list[Math.floor(ctx.rng() * list.length)]!;
  }

  /** The way the water lies from a bank spot. */
  private waterWay(ctx: EnemyCtx, p: Pt): number {
    let best = this.heading;
    let br = Infinity;
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      for (let r = 8; r < 120 && r < br; r += 8) {
        if (!boardWater(pt(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r), ctx.w, ctx.h, (q) => ctx.inZone(q, 'water'))) continue;
        br = r;
        best = a;
      }
    }
    return best;
  }
}
