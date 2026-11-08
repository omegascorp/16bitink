import { BOARD } from '../../level/types';
import { BIRD_WEIGHTS, isBird, STARTLE } from '../chapters/mountainsBirds';
import { catchable, type Prey } from '../preyTypes';
import type { Snake } from '../snake';
import { SPACING } from '../trail';
import { dist, pt, pushOut, type Pt, type Shape, TAU, turnTowards, wrapAngle } from '../vec';
import type { Ability, AbilityCtx, AbilityInput, AbilityMaker } from './types';

/** Curling up to lure takes this long, s. */
const CURL_TIME = 0.45;
/** The first bird comes down this long into a lure, the next ones this often, s. */
const FIRST_BIRD = 1.1;
const BIRD_EVERY = [2.3, 3.1] as const;
/** At most this many lured birds on the board at once. */
const MAX_SUMMONED = 2;
/** It can lure this long at a stretch, s; afterwards it rests this long (a short try, less). */
const MAX_LURE = 14;
const REST = 2;
const SHORT_REST = 0.5;
/** Birds already on the ground this close to the spider hop over to it, px. */
const PULL = 230;
/** Luring, the head follows prey this close, px, this fast, rad/s, within this much of the way it faced (open side, coil side). */
const AIM_REACH = 125;
const AIM_TURN = 3.4;
const AIM_OPEN = 1.35;
const AIM_COIL = 0.2;
/** Lured birds land this far from the head, px, this far round to the open side, rad, flying in from this far off. */
const LAND_R = [72, 90] as const;
const LAND_ARC = [0.2, 1.15] as const;
const ARRIVE_FROM = 300;
/** After a lure it may slide over its own coil while it slides out of it: about the time it takes, s. */
const UNCOIL = [1.3, 4] as const;
/** Loose scree slips under it: this much of its speed. */
const SCREE_SPEED = 0.82;
/** Each bird's call as it comes down. */
const CALLS: Readonly<Record<string, string>> = { lark: 'chirrup!', warbler: 'tsip!', 'desert-finch': 'tink!', shrike: 'chek!' };

/**
 * The spider-tailed horned viper's lure: hold the ability and it curls up
 * still on the rock, its tail tip (a bulb fringed with long scales, like a
 * spider) held up beside its head and waving in a figure of eight. Birds
 * come down to it: they land out on the open side and hop up to peck at
 * the "spider", passing in front of the head, which follows them: strike!
 * Only a lure brings birds down. Let go, steer or strike and the lure is
 * over: a bird near it takes fright and flies off a moment later, unless
 * the strike got it first. Loose scree slows the snake a little.
 */
export class Lure implements Ability {
  readonly id = 'lure';
  readonly label = 'Lure';
  readonly button = true;
  /** The spider (the tail tip) while luring, for the view. */
  tip: Pt | null = null;
  /** A bird is coming to the spider: it wags faster. */
  excited = false;
  /** Seconds into a lure, or -1 when not luring. */
  private t = -1;
  private rest = 0;
  private next = 0;
  /** The way the head faced as the lure began, and which side the coil lies (+1: to its left of the way it faces). */
  private facing = 0;
  private side: 1 | -1 = 1;
  private curl: { readonly from: readonly Pt[]; readonly to: readonly Pt[] } | null = null;

  get charge(): number {
    return this.rest > 0 ? 1 - this.rest / REST : 1;
  }

  get active(): boolean {
    return this.t >= 0;
  }

  step(ctx: AbilityCtx, input: AbilityInput, dt: number): void {
    const s = ctx.snake;
    if (ctx.inZone(s.head, 'sand')) s.speedScale = SCREE_SPEED;
    this.rest = Math.max(0, this.rest - dt);
    this.clearGone(ctx);
    if (this.t < 0) {
      this.pull(ctx, null);
      if (input.held && !input.steering && this.rest <= 0 && s.mode === 'move' && !s.striking) this.begin(ctx);
      return;
    }
    this.t += dt;
    const done = !input.held || input.steering || s.striking || s.mode !== 'move' || this.t > MAX_LURE;
    if (done) {
      this.end(ctx);
      return;
    }
    s.hold = true;
    // Coiling up, the body sweeps past the still head: that's no bite.
    s.uncoil = Math.max(s.uncoil, 0.1);
    this.curlUp(s);
    this.tip = s.trail.tail;
    this.pull(ctx, this.tip);
    this.aim(ctx, dt);
    this.landings(ctx);
    this.next -= dt;
    if (this.next <= 0 && this.t > CURL_TIME) this.summon(ctx);
  }

  private begin(ctx: AbilityCtx): void {
    const s = ctx.snake;
    this.t = 0;
    this.facing = s.heading;
    this.side = bestSide(s, ctx.enemyCtx.solids);
    this.curl = { from: s.trail.pts.map((p) => pt(p.x, p.y)), to: coilPose(s, this.side) };
    this.next = FIRST_BIRD;
    ctx.emit({ type: 'say', text: 'wiggle, wiggle…', x: s.head.x, y: s.head.y - 30 });
  }

  /** The lure's over: lured birds take fright, the coil may be slid out of. */
  private end(ctx: AbilityCtx): void {
    for (const p of ctx.prey) {
      const d = p.data;
      if (!d || !isBird(p.kind) || !catchable(p) && p.mode !== 'hidden') continue;
      if (d.fly && d.summoned && !d.away) {
        // Still on its way down: it thinks better of it and flies on.
        d.away = 1;
        d.tx = p.x + Math.cos(p.heading) * 900;
        d.ty = p.y + Math.sin(p.heading) * 900;
      } else if (d.lure && !d.fly) d.fright = STARTLE;
      d.lure = 0;
    }
    const s = ctx.snake;
    if (this.t > CURL_TIME * 0.5) s.uncoil = Math.min(UNCOIL[1], Math.max(UNCOIL[0], s.length / s.spec.speed));
    this.rest = this.t > 0.6 ? REST : SHORT_REST;
    this.t = -1;
    this.curl = null;
    this.tip = null;
    this.excited = false;
  }

  /** The body drawn up into its coil over the first moments, the tail tip brought round beside the head. */
  private curlUp(s: Snake): void {
    const c = this.curl;
    if (!c || this.t > CURL_TIME + 0.05) return;
    const k = Math.min(1, this.t / CURL_TIME);
    const e = k * k * (3 - 2 * k);
    const pts = s.trail.pts;
    const n = Math.min(pts.length, c.from.length, c.to.length);
    for (let i = 1; i < n; i++) {
      const a = c.from[i]!;
      const b = c.to[i]!;
      pts[i] = pt(a.x + (b.x - a.x) * e, a.y + (b.y - a.y) * e);
    }
  }

  /** Birds on the ground near the spider hop over to it (the rest go about their business). */
  private pull(ctx: AbilityCtx, spider: Pt | null): void {
    for (const p of ctx.prey) {
      if (!isBird(p.kind)) continue;
      const d = p.data ?? (p.data = {});
      const lured = spider !== null && !d.fly && catchable(p) && (d.fright ?? 0) <= 0 && dist(p, spider) < PULL;
      d.lure = lured ? 1 : 0;
      if (lured && spider) {
        d.sx = spider.x;
        d.sy = spider.y;
      }
    }
  }

  /** The head follows the nearest prey in reach, birds first, within what it can strike without biting its coil. */
  private aim(ctx: AbilityCtx, dt: number): void {
    const s = ctx.snake;
    const h = s.head;
    let best: Prey | null = null;
    let bd = Infinity;
    this.excited = false;
    for (const p of ctx.prey) {
      if (!catchable(p) || p.mode === 'sleep' || p.mode === 'stagger') continue;
      const d = dist(p, h) + (isBird(p.kind) ? 0 : 60);
      if (isBird(p.kind) && (p.data?.lure || p.data?.fly)) this.excited = true;
      if (d < bd && dist(p, h) < AIM_REACH) {
        bd = d;
        best = p;
      }
    }
    if (!best) return;
    const want = Math.atan2(best.y - h.y, best.x - h.x);
    // Offsets towards the coil are positive: the head may turn well out to the open side, barely towards the coil.
    const off = wrapAngle(want - this.facing) * this.side;
    const clamped = Math.max(-AIM_OPEN, Math.min(AIM_COIL, off));
    s.heading = turnTowards(s.heading, this.facing + clamped * this.side, AIM_TURN * dt);
  }

  /** A lured bird touching down: said so (the coach waits for it). */
  private landings(ctx: AbilityCtx): void {
    for (const p of ctx.prey) {
      const d = p.data;
      if (!d?.summoned || d.landed || d.fly) continue;
      d.landed = 1;
      ctx.emit({ type: 'land', kind: p.kind, x: p.x, y: p.y });
    }
  }

  /** A bird comes down to the spider: it lands out on the open side, flying in from beyond. */
  private summon(ctx: AbilityCtx): void {
    this.next = 0.5;
    const kinds = birdKinds(ctx);
    const summoned = ctx.prey.filter((p) => p.data?.summoned && !p.data.gone).length;
    if (!kinds.length || summoned >= MAX_SUMMONED) return;
    const at = this.landingSpot(ctx);
    if (!at) return;
    const kind = pickKind(kinds, ctx);
    const h = ctx.snake.head;
    const a = Math.atan2(at.y - h.y, at.x - h.x) + (ctx.rng() - 0.5) * 1.4;
    const p = ctx.spawnPrey(kind, pt(at.x + Math.cos(a) * ARRIVE_FROM, at.y + Math.sin(a) * ARRIVE_FROM));
    if (!p) return;
    p.mode = 'hidden';
    p.shown = 1;
    p.timer = 0;
    p.alt = 1;
    p.heading = a + Math.PI;
    p.data = { fly: 1, tx: at.x, ty: at.y, away: 0, summoned: 1 };
    const g = ctx.level.goal;
    if (g?.kind === 'feast' && g.food === kind) p.marked = true;
    this.next = BIRD_EVERY[0] + ctx.rng() * (BIRD_EVERY[1] - BIRD_EVERY[0]);
    ctx.emit({ type: 'say', text: CALLS[kind] ?? 'tweet!', x: at.x, y: at.y - 22 });
  }

  /** Where a bird can land: out on the open side in front of the head, on the board and off the rocks. */
  private landingSpot(ctx: AbilityCtx): Pt | null {
    const h = ctx.snake.head;
    const solids = ctx.enemyCtx.solids;
    for (let i = 0; i < 12; i++) {
      const a = this.facing - this.side * (LAND_ARC[0] + ctx.rng() * (LAND_ARC[1] - LAND_ARC[0]));
      const r = LAND_R[0] + ctx.rng() * (LAND_R[1] - LAND_R[0]);
      const p = pt(h.x + Math.cos(a) * r, h.y + Math.sin(a) * r);
      if (p.x < 30 || p.y < 30 || p.x > BOARD.w - 30 || p.y > BOARD.h - 30) continue;
      if (solids.some((sh) => pushOut(p, 12, sh))) continue;
      return p;
    }
    return null;
  }

  /** Birds that have flown off the board are gone for good. */
  private clearGone(ctx: AbilityCtx): void {
    for (const p of ctx.prey.filter((q) => q.data?.gone)) ctx.enemyCtx.takePrey(p);
  }
}

/** The birds this level has (only those come down to a lure). */
function birdKinds(ctx: AbilityCtx): string[] {
  return [...new Set(ctx.level.prey.map((d) => d.kind).filter(isBird))];
}

/** A bird kind by how often each comes, a feast's bird three times as often. */
function pickKind(kinds: readonly string[], ctx: AbilityCtx): string {
  const g = ctx.level.goal;
  const weight = (k: string): number => (BIRD_WEIGHTS[k] ?? 1) * (g?.kind === 'feast' && g.food === k ? 3 : 1);
  const total = kinds.reduce((sum, k) => sum + weight(k), 0);
  let r = ctx.rng() * total;
  for (const k of kinds) {
    r -= weight(k);
    if (r <= 0) return k;
  }
  return kinds[kinds.length - 1]!;
}

/**
 * The coiled-up pose, for every body sample: a short neck straight back
 * from the head, then one loop round to `side` that ends with the tail tip
 * back beside the neck. The neck is long enough that no part of the loop
 * comes within a body width of the head, so it can't bite itself, and the
 * loop never crosses the line straight ahead of the head (the strike's).
 */
export function coilPose(s: Snake, side: 1 | -1): Pt[] {
  const h = s.head;
  const f = pt(Math.cos(s.heading), Math.sin(s.heading));
  const q = pt(-f.y * side, f.x * side);
  const w = s.width;
  const clear = w * 1.05;
  const gap = w * 1.4;
  const total = (s.trail.count - 1) * SPACING;
  let r = 20;
  let neck = 40;
  for (let k = 0; k < 8; k++) {
    r = Math.max(w * 0.9, (total - neck + gap) / TAU);
    neck = Math.sqrt(clear * clear + 2 * r * clear);
  }
  const n = pt(h.x - f.x * neck, h.y - f.y * neck);
  const c = pt(n.x + q.x * r, n.y + q.y * r);
  return s.trail.pts.map((_, i) => {
    const d = i * SPACING;
    if (d <= neck) return pt(h.x - f.x * d, h.y - f.y * d);
    const a = (d - neck) / r;
    return pt(c.x - q.x * r * Math.cos(a) - f.x * r * Math.sin(a), c.y - q.y * r * Math.cos(a) - f.y * r * Math.sin(a));
  });
}

/** The side to coil to: the one with less of the coil off the board or in rocks, and room for birds on the other; else the side the tail already lies. */
function bestSide(s: Snake, solids: readonly Shape[]): 1 | -1 {
  const h = s.head;
  const tail = s.trail.tail;
  const f = pt(Math.cos(s.heading), Math.sin(s.heading));
  const natural: 1 | -1 = f.x * (tail.y - h.y) - f.y * (tail.x - h.x) >= 0 ? 1 : -1;
  const blocked = (p: Pt, r: number): boolean => p.x < r || p.y < r || p.x > BOARD.w - r || p.y > BOARD.h - r || solids.some((sh) => pushOut(p, r, sh));
  const cost = (side: 1 | -1): number => {
    const coil = coilPose(s, side).filter((_, i) => i % 3 === 0 && blocked(_, s.width * 0.4)).length;
    let open = 0;
    for (const a of [0.4, 0.8]) {
      const b = s.heading - side * a;
      if (blocked(pt(h.x + Math.cos(b) * 80, h.y + Math.sin(b) * 80), 30)) open += 5;
    }
    return coil + open;
  };
  const here = cost(natural);
  const there = cost(natural === 1 ? -1 : 1);
  return there < here ? (natural === 1 ? -1 : 1) : natural;
}

export const SPIDERTAIL: AbilityMaker = () => new Lure();
