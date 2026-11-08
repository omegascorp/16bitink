import { edgePoint, type Boss, type EnemyCtx } from '../enemyTypes';
import { EnemyBase } from '../enemies/base';
import { clamp, dist, nearestOnSegment, pt, pushOut, type Pt, type Shape } from '../vec';

type BoarMode = 'enter' | 'root' | 'paw' | 'charge' | 'dazed' | 'skid' | 'startle' | 'retreat' | 'gone';

/** Its body's reach, px: what a charge hits, and how far short of a rock it crashes. */
export const BOAR_R = 24;
/** The dotted lane's half width, px (the view draws it). */
export const BOAR_LANE = 26;
/** Rooting about between charges, s; slowly, px/s. */
const ROOT_TIME = [2.2, 3.4] as const;
const ROOT_SPEED = 52;
/** It charges at a head this far off, px. */
const CHARGE_RANGE = [140, 620] as const;
/** Pawing the ground (the tell): the lane follows the head for the first part, then holds, s. */
export const PAW_TIME = 1.15;
const PAW_TRACK = 0.45;
const CHARGE_SPEED = 430;
/** Stunned after running into a rock: the moment to strike, s. */
const DAZED_TIME = 3.2;
const SKID_TIME = 0.6;
const STRIKE_REACH = 40;
/** What a charge through the body takes off the tail, px. */
const BODY_NIP = 18;
/** Keeps this far in from the board's edges, px. */
const PAD = 34;

/**
 * The Wild Boar, chapter 7's boss: a big male rooting about the hillside.
 * Now and then it lowers its head and paws the ground (the tell: a dotted
 * lane from its snout through the snake's head, to the first rock in the
 * way or the board's edge) and charges straight down it. A charge through
 * the head costs a life, through the body a nip. A charge that ends in a
 * crag or a boulder leaves it dazed, stars round its head: the moment to
 * strike. One that runs out on open ground it skids out of and roots on.
 * It doesn't hunt the snake (boars aren't viper-eaters): it's simply a
 * dangerous animal to be in the way of.
 */
export class WildBoar extends EnemyBase<BoarMode> implements Boss {
  hp: number;
  readonly maxHp: number;
  /** The charge's lane while it paws and charges, and whether it ends in a rock. */
  lane: { readonly from: Pt; readonly to: Pt; readonly rock: boolean } | null = null;
  private target: Pt = pt(0, 0);
  private hitHead = false;
  private hitBody = false;

  constructor(id: number, hp: number, w: number, h: number) {
    super(id, 'boar', pt(w + 70, h * 0.5), 'enter');
    this.hp = hp;
    this.maxHp = hp;
    this.left = 1.8;
    this.target = pt(w - 150, h * 0.5);
    this.heading = Math.PI;
  }

  get away(): boolean {
    return this.m === 'gone';
  }

  get beaten(): boolean {
    return this.hp <= 0;
  }

  /** How far through the tell it is, 0..1 (the lane darkens). */
  get pawing(): number {
    return this.m === 'paw' ? Math.min(1, this.age / PAW_TIME) : this.m === 'charge' ? 1 : 0;
  }

  step(ctx: EnemyCtx, dt: number): void {
    const done = this.tick(dt);
    switch (this.m) {
      case 'enter':
        this.moveTo(this.target, 120, dt);
        if (done) this.rootAbout(ctx);
        return;
      case 'root':
        this.root(ctx, dt, done);
        return;
      case 'paw':
        this.paw(ctx, done);
        return;
      case 'charge':
        this.charge(ctx, dt);
        return;
      case 'dazed':
        if (this.struckBy(ctx, STRIKE_REACH)) {
          this.hit(ctx);
          return;
        }
        if (done) this.rootAbout(ctx);
        return;
      case 'skid':
        if (done) this.rootAbout(ctx);
        return;
      case 'startle':
        this.moveTo(this.target, 260, dt);
        this.slide(ctx);
        this.alt = Math.sin(Math.min(1, this.age / 0.5) * Math.PI) * 0.3;
        if (!done) return;
        this.alt = 0;
        if (this.beaten) {
          this.target = edgePoint(ctx.rng, ctx.w, ctx.h, 140);
          this.go('retreat', 2.4);
          ctx.emit({ type: 'bossBeaten', x: this.x, y: this.y });
        } else this.go('retreat', 1.2);
        return;
      case 'retreat':
        this.moveTo(this.target, this.beaten ? 300 : 140, dt);
        if (!this.beaten) this.slide(ctx);
        if (done) {
          if (this.beaten) this.go('gone');
          else this.rootAbout(ctx);
        }
        return;
      case 'gone':
        return;
    }
  }

  /** Snuffling about with its nose down; when the time's up and the snake's in range, it squares up to charge. */
  private root(ctx: EnemyCtx, dt: number, done: boolean): void {
    if (this.moveTo(this.target, ROOT_SPEED, dt)) this.target = this.rootSpot(ctx);
    this.slide(ctx);
    if (!done) return;
    const d = dist(this, ctx.snake.head);
    if (d < CHARGE_RANGE[0] || d > CHARGE_RANGE[1]) {
      this.left = 0.4;
      return;
    }
    this.aim(ctx);
    this.go('paw', PAW_TIME);
    ctx.emit({ type: 'say', text: 'Snort!', x: this.x, y: this.y - 36, danger: true, sound: 'growl' });
  }

  /** Pawing the ground: the lane follows the head a moment, then it's set. */
  private paw(ctx: EnemyCtx, done: boolean): void {
    if (this.age < PAW_TRACK) this.aim(ctx);
    if (!done || !this.lane) return;
    this.hitHead = false;
    this.hitBody = false;
    this.go('charge', 10);
    ctx.emit({ type: 'pounce', x: this.x, y: this.y });
  }

  /** Down the lane at full tilt: through the snake, into whatever ends it. */
  private charge(ctx: EnemyCtx, dt: number): void {
    const lane = this.lane;
    if (!lane) {
      this.rootAbout(ctx);
      return;
    }
    const arrived = this.moveTo(lane.to, CHARGE_SPEED, dt);
    const s = ctx.snake;
    const front = this.here();
    if (!this.hitHead && dist(s.head, front) < BOAR_R + s.width / 2) {
      this.hitHead = true;
      ctx.hurt('charged', s.head);
    } else if (!this.hitBody && s.trail.pts.slice(s.neck, s.trail.count).some((p) => dist(p, front) < BOAR_R)) {
      this.hitBody = true;
      ctx.nip(BODY_NIP, front);
    }
    if (!arrived) return;
    this.lane = null;
    if (lane.rock) {
      this.go('dazed', DAZED_TIME);
      ctx.emit({ type: 'dazed', x: this.x, y: this.y });
      ctx.emit({ type: 'say', text: 'Bonk!', x: this.x, y: this.y - 40, sound: 'bump' });
    } else this.go('skid', SKID_TIME);
  }

  /** The lane from its snout through the snake's head, to the first rock in the way or the board's edge. */
  private aim(ctx: EnemyCtx): void {
    const h = ctx.snake.head;
    const a = Math.atan2(h.y - this.y, h.x - this.x);
    const u = pt(Math.cos(a), Math.sin(a));
    const edge = edgeDistance(this, u, ctx.w, ctx.h);
    const rock = Math.min(...ctx.solids.map((sh) => hitDistance(this, u, sh, BOAR_R)));
    const t = Math.min(edge, rock);
    this.heading = a;
    this.lane = { from: this.here(), to: pt(this.x + u.x * t, this.y + u.y * t), rock: rock <= edge };
  }

  private hit(ctx: EnemyCtx): void {
    this.hp -= 1;
    ctx.emit({ type: 'bossHit', x: this.x, y: this.y });
    ctx.emit({ type: 'say', text: 'Squeal!', x: this.x, y: this.y - 44, danger: true });
    const a = Math.atan2(this.y - ctx.snake.head.y, this.x - ctx.snake.head.x);
    this.target = pt(clamp(this.x + Math.cos(a) * 160, PAD, ctx.w - PAD), clamp(this.y + Math.sin(a) * 160, PAD, ctx.h - PAD));
    this.go('startle', 0.5);
  }

  private rootAbout(ctx: EnemyCtx): void {
    this.lane = null;
    this.target = this.rootSpot(ctx);
    this.go('root', ROOT_TIME[0] + ctx.rng() * (ROOT_TIME[1] - ROOT_TIME[0]));
  }

  /** Somewhere to root next: not far, on the board, off the rocks. */
  private rootSpot(ctx: EnemyCtx): Pt {
    for (let i = 0; i < 20; i++) {
      const a = ctx.rng() * Math.PI * 2;
      const r = 60 + ctx.rng() * 110;
      const p = pt(clamp(this.x + Math.cos(a) * r, PAD * 2, ctx.w - PAD * 2), clamp(this.y + Math.sin(a) * r, PAD * 2, ctx.h - PAD * 2));
      if (!ctx.solids.some((sh) => pushOut(p, BOAR_R + 6, sh))) return p;
    }
    return this.here();
  }

  /** Keeps it on the board and out of the rocks while it potters. */
  private slide(ctx: EnemyCtx): void {
    this.keepOn(ctx, PAD);
    for (const sh of ctx.solids) {
      const out = pushOut(this, BOAR_R, sh);
      if (!out) continue;
      this.x = out.p.x;
      this.y = out.p.y;
    }
  }

  /** Whether `p` lies in the lane, `margin` px to spare (for the bot). */
  inLane(p: Pt, margin = 0): boolean {
    const l = this.lane;
    if (!l) return false;
    return dist(nearestOnSegment(p, l.from, l.to), p) < BOAR_LANE + margin;
  }
}

/** How far along `u` from `p` it can run before reaching the board's padded edge, px. */
function edgeDistance(p: Pt, u: Pt, w: number, h: number): number {
  const tx = u.x > 1e-6 ? (w - PAD - p.x) / u.x : u.x < -1e-6 ? (PAD - p.x) / u.x : Infinity;
  const ty = u.y > 1e-6 ? (h - PAD - p.y) / u.y : u.y < -1e-6 ? (PAD - p.y) / u.y : Infinity;
  return Math.max(0, Math.min(tx, ty));
}

/** How far along `u` from `p` a body of radius `r` runs into `shape`, px (Infinity if it never does, or starts inside). */
function hitDistance(p: Pt, u: Pt, shape: Shape, r: number): number {
  if (shape.kind === 'circle') {
    const R = shape.r + r;
    const fx = p.x - shape.x;
    const fy = p.y - shape.y;
    const b = fx * u.x + fy * u.y;
    const c = fx * fx + fy * fy - R * R;
    if (c <= 0) return Infinity;
    const disc = b * b - c;
    if (disc < 0) return Infinity;
    const t = -b - Math.sqrt(disc);
    return t > 0 ? t : Infinity;
  }
  // A box grown by r on every side (its corners squared off: close enough for a boar).
  const x0 = shape.x - r;
  const y0 = shape.y - r;
  const x1 = shape.x + shape.w + r;
  const y1 = shape.y + shape.h + r;
  if (p.x > x0 && p.x < x1 && p.y > y0 && p.y < y1) return Infinity;
  let tmin = -Infinity;
  let tmax = Infinity;
  for (const [o, d, lo, hi] of [[p.x, u.x, x0, x1], [p.y, u.y, y0, y1]] as const) {
    if (Math.abs(d) < 1e-9) {
      if (o < lo || o > hi) return Infinity;
      continue;
    }
    const a = (lo - o) / d;
    const b = (hi - o) / d;
    tmin = Math.max(tmin, Math.min(a, b));
    tmax = Math.min(tmax, Math.max(a, b));
  }
  return tmax >= tmin && tmin > 0 ? tmin : Infinity;
}
