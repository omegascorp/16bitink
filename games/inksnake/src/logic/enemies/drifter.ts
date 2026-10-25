import type { ZoneKind } from '../../level/types';
import type { EnemyCtx } from '../enemyTypes';
import { dist, pt, type Pt } from '../vec';
import { EnemyBase } from './base';

/** How a drifter floats about and stings (box jellies on the reef). */
export interface DrifterSpec {
  /** It drifts this fast, px/s, in its ground. */
  readonly speed: number;
  readonly zone: ZoneKind;
  /** It stings any part of the snake this close, px: a nip of this much length (a head too costs a life, if `cause`). */
  readonly reach: number;
  readonly nip: number;
  readonly cause?: string;
  /** Seconds before it can sting again. */
  readonly rest: number;
}

/**
 * A drifter: it floats slowly through its ground, pulsing, and stings
 * whatever part of the snake touches it (a nip off the tail; the head may
 * cost a life). It can't be struck or scared: steer round it.
 */
export class Drifter extends EnemyBase<'drift'> {
  /** Over the snake's body, not stopped by it: it drifts over. */
  readonly overBody = true;
  private target: Pt;
  private rest = 0;

  constructor(id: number, kind: string, at: Pt, readonly spec: DrifterSpec) {
    super(id, kind, at, 'drift');
    this.target = at;
  }

  get away(): boolean {
    return false;
  }

  step(ctx: EnemyCtx, dt: number): void {
    const done = this.tick(dt);
    this.rest = Math.max(0, this.rest - dt);
    if (done || dist(this, this.target) < 4) {
      for (let i = 0; i < 20; i++) {
        const p = pt(this.x + (ctx.rng() - 0.5) * 260, this.y + (ctx.rng() - 0.5) * 260);
        if (p.x > 30 && p.y > 30 && p.x < ctx.w - 30 && p.y < ctx.h - 30 && ctx.inZone(p, this.spec.zone)) {
          this.target = p;
          break;
        }
      }
      this.left = 4 + ctx.rng() * 4;
    }
    // Pulsing: it moves in little pushes.
    const pulse = 0.4 + 0.6 * Math.max(0, Math.sin(this.age * 3));
    this.moveTo(this.target, this.spec.speed * pulse, dt);
    if (this.rest > 0) return;
    const s = ctx.snake;
    if (dist(s.head, this) < this.spec.reach + s.width / 2) {
      this.rest = this.spec.rest;
      if (!(this.spec.cause && ctx.hurt(this.spec.cause, this.here()))) ctx.nip(this.spec.nip, this.here());
      ctx.emit({ type: 'say', text: 'Sting!', x: this.x, y: this.y - 20, danger: true, sound: 'nip' });
      return;
    }
    const reach = this.spec.reach + s.width / 2;
    if (s.trail.pts.slice(s.neck, s.trail.count).some((p) => dist(p, this) < reach)) {
      this.rest = this.spec.rest;
      ctx.nip(this.spec.nip, this.here());
      ctx.emit({ type: 'say', text: 'Sting!', x: this.x, y: this.y - 20, danger: true, sound: 'nip' });
    }
  }
}
