import type { EnemyCtx } from '../enemyTypes';
import { clamp, nearestOnSegment, pt, dist, type Pt } from '../vec';
import { EnemyBase } from './base';

type ChargerMode = 'wait' | 'warn' | 'run';

/**
 * How a charge sweeps across the board (a wildebeest stampede, a rockfall,
 * a wildfire's front, a boar's rush): a lane through the snake's head from
 * one edge to the other.
 */
export interface ChargerSpec {
  /** Seconds between charges, the warning (the dotted lane), the run across. */
  readonly every: readonly [number, number];
  readonly warn: number;
  readonly run: number;
  /** The lane's half width, px. */
  readonly halfWidth: number;
  /** A head in the lane loses a life; the rest of the body only a nip of this much. */
  readonly cause: string;
  readonly nip: number;
  /** What's said as it comes ("Stampede!", "Rockfall!"). */
  readonly word: string;
}

/**
 * A charge across the board: a dotted lane appears through the snake's
 * head from edge to edge, then whatever it is sweeps along it. A head in
 * the lane as it passes loses a life; the body only a nip. Get your head
 * out of the lane, and as much of your body as you can.
 */
export class Charger extends EnemyBase<ChargerMode> {
  /** The lane, edge to edge, while it warns and runs. */
  lane: { readonly from: Pt; readonly to: Pt } | null = null;
  private hitHead = false;
  private hitBody = false;

  constructor(id: number, kind: string, firstIn: number, readonly spec: ChargerSpec) {
    super(id, kind, pt(-200, -200), 'wait');
    this.left = firstIn;
  }

  get away(): boolean {
    return this.m === 'wait';
  }

  /** How far along the lane the charge is, 0..1 (while it runs). */
  get along(): number {
    return this.m === 'run' ? Math.min(1, this.age / this.spec.run) : 0;
  }

  step(ctx: EnemyCtx, dt: number): void {
    const done = this.tick(dt);
    const s = ctx.snake;
    if (this.m === 'wait') {
      if (!done) return;
      // Across the board's long side or short side, through the head.
      const across = ctx.rng() < 0.5;
      const h = s.head;
      const from = across ? pt(-40, clamp(h.y + (ctx.rng() - 0.5) * 40, 40, ctx.h - 40)) : pt(clamp(h.x + (ctx.rng() - 0.5) * 40, 40, ctx.w - 40), -40);
      const to = across ? pt(ctx.w + 40, from.y) : pt(from.x, ctx.h + 40);
      const flip = ctx.rng() < 0.5;
      this.lane = flip ? { from: to, to: from } : { from, to };
      this.go('warn', this.spec.warn);
      ctx.emit({ type: 'say', text: this.spec.word, x: clamp(h.x, 80, ctx.w - 80), y: clamp(h.y - 50, 40, ctx.h - 40), danger: true });
      return;
    }
    const lane = this.lane;
    if (!lane) return;
    if (this.m === 'warn') {
      this.x = lane.from.x;
      this.y = lane.from.y;
      this.heading = Math.atan2(lane.to.y - lane.from.y, lane.to.x - lane.from.x);
      if (done) {
        this.hitHead = false;
        this.hitBody = false;
        this.go('run', this.spec.run);
      }
      return;
    }
    const t = this.along;
    this.x = lane.from.x + (lane.to.x - lane.from.x) * t;
    this.y = lane.from.y + (lane.to.y - lane.from.y) * t;
    const front = this.here();
    const near = (p: Pt): boolean => dist(nearestOnSegment(p, lane.from, front), p) < this.spec.halfWidth && dist(p, front) < this.spec.halfWidth * 1.6;
    if (!this.hitHead && near(s.head)) {
      this.hitHead = true;
      ctx.hurt(this.spec.cause, s.head);
    } else if (!this.hitBody && s.trail.pts.slice(s.neck, s.trail.count).some(near)) {
      this.hitBody = true;
      ctx.nip(this.spec.nip, front);
    }
    if (done) {
      this.lane = null;
      const [a, b] = this.spec.every;
      this.go('wait', a + ctx.rng() * (b - a));
    }
  }
}
