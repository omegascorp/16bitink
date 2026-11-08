import type { LevelDef } from '../../level/types';
import type { EnemyCtx } from '../enemyTypes';
import { Lurker, type LurkerSpec } from '../enemies/lurker';
import { clamp, dist, pt, type Pt } from '../vec';
import { inZone } from '../zones';

/** The black caiman's lunge: it waits in the water and snaps at a snake that swims near. */
export const CAIMAN_SPEC: LurkerSpec = { zone: 'water', range: 125, tell: 0.85, lunge: 0.3, reach: 22, rest: 2.4, cause: 'snapped' };
/** It feels a submerged snake this close beside it, px (it can't see one any farther). */
const FEEL = 50;
/** It edges towards a snake it can see this far off, this fast, px and px/s. */
const STALK = 250;
const STALK_SPEED = 16;
/** The lunge is aimed this far ahead of the head, in seconds of its swimming: it reads where you're going. */
const LEAD = 0.5;
/** Its new spot after a lunge is at least this far from the snake, px; it swims there this fast. */
const AWAY = 190;
const SWIM = 62;

/** A lair for the `index`-th caiman: the level's spots in the water, or the middle of the board's water. */
export function caimanLair(level: LevelDef, index: number, w: number, h: number): Pt {
  const zones = level.zones ?? [];
  const wet = (level.spots ?? []).filter((p) => inZone(p, zones, 'water'));
  if (wet.length) return wet[index % wet.length]!;
  for (let i = 0; i < 40; i++) {
    const p = pt(w * (0.25 + 0.5 * (((i * 37 + index * 11) % 40) / 40)), h * (0.25 + 0.5 * (((i * 23 + index * 7) % 40) / 40)));
    if (inZone(p, zones, 'water')) return p;
  }
  return pt(w * 0.7, h * 0.5);
}

/**
 * The black caiman, a lurker: two eyes and a snout above the dark water.
 * Caimans take young anacondas. It edges towards a snake it can see; when
 * one swims within reach, bubbles rise and a red ring shows where it will
 * snap (a little ahead of the head: it reads where you're going), then it
 * lunges. A submerged snake it can't see at all, unless it brushes right
 * past. After a lunge it sinks and slides off to a new spot.
 */
export class BlackCaiman extends Lurker {
  private wait: number;
  private lungeFrom: Pt;
  private dest: Pt;

  constructor(id: number, at: Pt, arriveIn: number) {
    super(id, 'black-caiman', at, CAIMAN_SPEC);
    this.wait = arriveIn;
    this.lungeFrom = at;
    this.dest = at;
  }

  get away(): boolean {
    return this.wait > 0;
  }

  /** Whether it can find the snake's head now: seen in the water, or felt right beside it under the surface. */
  private senses(ctx: EnemyCtx, within: number): boolean {
    const s = ctx.snake;
    if (!ctx.inZone(s.head, 'water')) return false;
    const d = dist(s.head, this);
    if (s.cloak === 'submerged') return d < FEEL;
    return !s.hidden && d < within;
  }

  step(ctx: EnemyCtx, dt: number): void {
    if (this.wait > 0) {
      this.wait -= dt;
      if (this.wait <= 0) ctx.emit({ type: 'arrive', kind: this.kind, x: this.x, y: this.y });
      return;
    }
    const done = this.tick(dt);
    const s = ctx.snake;
    const spec = this.spec;
    switch (this.m) {
      case 'lurk': {
        this.heading = Math.atan2(s.head.y - this.y, s.head.x - this.x);
        if (this.senses(ctx, spec.range) && s.safe <= 0) {
          const lead = s.cloak === 'submerged' ? 0 : s.speed * LEAD;
          const want = pt(s.head.x + Math.cos(s.heading) * lead, s.head.y + Math.sin(s.heading) * lead);
          // It can't lunge farther than it can reach.
          const a = Math.atan2(want.y - this.y, want.x - this.x);
          const far = Math.min(dist(this, want), spec.range + 30);
          this.aim = pt(clamp(this.x + Math.cos(a) * far, 20, ctx.w - 20), clamp(this.y + Math.sin(a) * far, 20, ctx.h - 20));
          this.go('tell', spec.tell);
          ctx.emit({ type: 'say', text: 'blub… blub…', x: this.x, y: this.y - 18, danger: true, sound: 'plop' });
          return;
        }
        if (this.senses(ctx, STALK)) this.creep(ctx, s.head, STALK_SPEED, dt);
        return;
      }
      case 'tell':
        if (this.aim) this.heading = Math.atan2(this.aim.y - this.y, this.aim.x - this.x);
        if (done && this.aim) {
          this.lungeFrom = this.here();
          this.go('lunge', spec.lunge);
          ctx.emit({ type: 'say', text: 'SNAP!', x: this.x, y: this.y - 22, danger: true });
        }
        return;
      case 'lunge': {
        const a = this.aim;
        if (!a) {
          this.go('sink', spec.rest);
          return;
        }
        const t = Math.min(1, this.age / spec.lunge);
        this.x = this.lungeFrom.x + (a.x - this.lungeFrom.x) * t;
        this.y = this.lungeFrom.y + (a.y - this.lungeFrom.y) * t;
        if (dist(s.head, this) < spec.reach + s.width / 2) ctx.hurt(spec.cause, this.here());
        if (done) {
          this.aim = null;
          this.go('sink', spec.rest);
        }
        return;
      }
      case 'sink':
        if (done) {
          this.dest = this.newSpot(ctx);
          this.go('move', 3);
        }
        return;
      case 'move':
        this.creep(ctx, this.dest, SWIM, dt);
        if (done || dist(this, this.dest) < 4) this.go('lurk', 1);
        return;
    }
  }

  /** Swims towards `to`, never out of the water. */
  private creep(ctx: EnemyCtx, to: Pt, speed: number, dt: number): void {
    const bx = this.x;
    const by = this.y;
    this.moveTo(to, speed, dt);
    if (!ctx.inZone(this.here(), 'water')) {
      this.x = bx;
      this.y = by;
    }
  }

  /** Somewhere new in the water, out of the snake's way. */
  private newSpot(ctx: EnemyCtx): Pt {
    const wet = (ctx.level.spots ?? []).filter((p) => ctx.inZone(p, 'water') && dist(p, ctx.snake.head) > AWAY);
    if (wet.length) return wet[Math.floor(ctx.rng() * wet.length)]!;
    for (let i = 0; i < 30; i++) {
      const p = pt(50 + ctx.rng() * (ctx.w - 100), 50 + ctx.rng() * (ctx.h - 100));
      if (ctx.inZone(p, 'water') && dist(p, ctx.snake.head) > AWAY) return p;
    }
    return this.here();
  }
}
