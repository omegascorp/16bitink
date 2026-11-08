import { sunnyAt } from '../abilities/adder';
import { EnemyBase } from '../enemies/base';
import type { Boss, EnemyCtx } from '../enemyTypes';
import { dist, pt, type Pt } from '../vec';

type BadgerMode = 'under' | 'rumble' | 'emerge' | 'lunge' | 'sniff' | 'startle' | 'dive' | 'gone';

/** Digging from one sett to the next, s (the first time a little longer). */
const UNDER_TIME = [1.6, 2.6] as const;
const FIRST_UNDER = 2.4;
/** The tell: the ground trembles and soil flies at the sett it's coming up at, s. */
export const RUMBLE_TIME = 1.25;
/** Out of the hole and aiming at the head (the ring follows a moment), then the lunge, s. */
const EMERGE_TIME = 0.6;
const LUNGE_TIME = 0.24;
/** How far from its sett the lunge reaches, and the ring the bite lands on, px. */
const LUNGE_REACH = 95;
export const BADGER_RING = 40;
/** Out in the open sniffing about: the moment to strike, s. Longer in the sun: a night animal, it's slow to dive back in daylight. */
const SNIFF_TIME = 2;
const SUN_SNIFF = 1.6;
const DIVE_TIME = 0.5;
const STRIKE_REACH = 48;
/** With no setts in the level, it digs in at these spots. */
const DEFAULT_SETTS: readonly Pt[] = [pt(200, 140), pt(760, 140), pt(480, 300), pt(200, 420), pt(760, 420)];

/**
 * The Badger, chapter 8's boss: badgers dig adders out and eat them. It
 * digs between its setts (the level's spots) underground. Each time, it
 * picks the sett nearest the snake: the ground there trembles and soil
 * flies (the tell), then it pops up and lunges at the head, biting a red
 * ring. Then it stays out a moment, sniffing about: the moment to strike.
 * In sunshine it lingers longer. Struck, or done sniffing, it dives back
 * down and comes up at another sett.
 */
export class Badger extends EnemyBase<BadgerMode> implements Boss {
  hp: number;
  readonly maxHp: number;
  /** Where the bite will land, while it aims and lunges. */
  ring: Pt | null = null;
  /** The sett it's under (or coming up at). */
  sett: Pt;
  /** Out in the sun this time: slow to go back. */
  sunned = false;
  private readonly setts: readonly Pt[];

  constructor(id: number, hp: number, setts: readonly Pt[] | undefined) {
    const list = setts && setts.length >= 2 ? setts : DEFAULT_SETTS;
    super(id, 'badger', list[0]!, 'under');
    this.setts = list;
    this.sett = list[0]!;
    this.hp = hp;
    this.maxHp = hp;
    this.left = FIRST_UNDER;
  }

  /** Underground (not drawn; the view shows the trembling sett) or gone. */
  get away(): boolean {
    return this.m === 'under' || this.m === 'rumble' || this.m === 'gone';
  }

  get beaten(): boolean {
    return this.hp <= 0;
  }

  get ringR(): number {
    return BADGER_RING;
  }

  get ringT(): number {
    return this.m === 'emerge' ? Math.min(1, this.age / EMERGE_TIME) : this.m === 'lunge' ? 1 : 0;
  }

  /** How far through the rumble it is, 0..1 (the view shakes the sett harder). */
  get rumble(): number {
    return this.m === 'rumble' ? Math.min(1, this.age / RUMBLE_TIME) : 0;
  }

  /** Every sett, for the view. */
  get holes(): readonly Pt[] {
    return this.setts;
  }

  step(ctx: EnemyCtx, dt: number): void {
    const done = this.tick(dt);
    const s = ctx.snake;
    switch (this.m) {
      case 'under':
        if (done) {
          this.sett = this.nextSett(s.head);
          this.x = this.sett.x;
          this.y = this.sett.y;
          this.go('rumble', RUMBLE_TIME);
          ctx.emit({ type: 'say', text: 'rumble…', x: this.sett.x, y: this.sett.y - 30, danger: true });
          ctx.emit({ type: 'growl', x: this.sett.x, y: this.sett.y });
        }
        return;
      case 'rumble':
        if (done) {
          this.ring = this.inReach(s.head);
          this.heading = Math.atan2(this.ring.y - this.y, this.ring.x - this.x);
          this.go('emerge', EMERGE_TIME);
          ctx.emit({ type: 'crouch', x: this.x, y: this.y });
        }
        return;
      case 'emerge':
        if (this.ring && this.age < EMERGE_TIME * 0.6) {
          const k = Math.min(1, dt * 3);
          this.ring = this.inReach(pt(this.ring.x + (s.head.x - this.ring.x) * k, this.ring.y + (s.head.y - this.ring.y) * k));
        }
        if (this.ring) this.heading = Math.atan2(this.ring.y - this.y, this.ring.x - this.x);
        if (done) {
          this.go('lunge', LUNGE_TIME);
          ctx.emit({ type: 'pounce', x: this.x, y: this.y });
        }
        return;
      case 'lunge': {
        const r = this.ring;
        if (!r) return;
        const t = Math.min(1, this.age / LUNGE_TIME);
        this.x = this.sett.x + (r.x - this.sett.x) * t;
        this.y = this.sett.y + (r.y - this.sett.y) * t;
        if (!done) return;
        const hit = dist(s.head, r) < BADGER_RING + s.width / 2 && ctx.hurt('badgered', r);
        if (!hit) ctx.emit({ type: 'miss', kind: this.kind, x: r.x, y: r.y });
        this.ring = null;
        this.sunned = sunnyAt(ctx.level, this.here(), ctx.elapsed);
        this.go('sniff', SNIFF_TIME * (this.sunned ? SUN_SNIFF : 1));
        ctx.emit({ type: 'say', text: this.sunned ? 'sniff… too bright…' : 'sniff… sniff…', x: this.x, y: this.y - 34 });
        return;
      }
      case 'sniff':
        // Nose down, snuffling about the spot.
        this.heading += Math.sin(this.age * 5) * dt * 1.5;
        if (this.struckBy(ctx, STRIKE_REACH)) {
          this.hit(ctx);
          return;
        }
        if (done) this.go('dive', DIVE_TIME);
        return;
      case 'startle':
        if (done) this.go('dive', DIVE_TIME);
        return;
      case 'dive':
        this.moveTo(this.sett, dist(this, this.sett) / Math.max(0.05, this.left) + 1, dt);
        if (!done) return;
        this.x = this.sett.x;
        this.y = this.sett.y;
        if (this.beaten) {
          this.go('gone');
          ctx.emit({ type: 'bossBeaten', x: this.x, y: this.y });
        } else this.go('under', UNDER_TIME[0] + ctx.rng() * (UNDER_TIME[1] - UNDER_TIME[0]));
        return;
      case 'gone':
        return;
    }
  }

  private hit(ctx: EnemyCtx): void {
    this.hp -= 1;
    ctx.emit({ type: 'bossHit', x: this.x, y: this.y });
    ctx.emit({ type: 'say', text: 'Grrf!', x: this.x, y: this.y - 40, danger: true });
    this.go('startle', 0.35);
  }

  /** The sett nearest the head, but never the one it just left. */
  private nextSett(head: Pt): Pt {
    const others = this.setts.filter((p) => p !== this.sett);
    return others.reduce((best, p) => (dist(p, head) < dist(best, head) ? p : best), others[0]!);
  }

  /** A point kept within its lunge's reach of the sett. */
  private inReach(p: Pt): Pt {
    const d = dist(this.sett, p);
    if (d <= LUNGE_REACH) return pt(p.x, p.y);
    const k = LUNGE_REACH / d;
    return pt(this.sett.x + (p.x - this.sett.x) * k, this.sett.y + (p.y - this.sett.y) * k);
  }
}
