import { SLEEPER, SLEEPER_START, sleeperVisibility, stepSleeper, type SleeperMode, type SleeperState } from '../../../logic/bosses/sleeper';
import { relationTo } from '../../../logic/sizing';
import { aboveSeabed } from '../../../logic/water';
import type { Fish, PlayerView } from '../fish';
import { dazed, easeVelocity, Marks, swimBoss, type Boss, type BossHost } from './kit';

/** Where its eyes are, from its centre, in multiples of its size (facing right). */
const EYE = { ahead: 0.62, up: 0.16, gap: 0.12 } as const;
/** Asleep, a slow bubble of breath now and then, ms. */
const BREATH_EVERY_MS = 2600;

/** The sleeper shark in play: see logic/bosses/sleeper.ts for its rules. */
export class SleeperBoss implements Boss {
  private state: SleeperState = SLEEPER_START;
  private readonly marks: Marks;
  private nextBreath = 0;

  constructor(readonly fish: Fish, private readonly host: BossHost) {
    this.marks = new Marks(host.scene);
  }

  update(p: PlayerView, now: number, dt: number): void {
    const f = this.fish;
    const s = f.sprite;
    this.marks.clear();
    const d = Math.hypot(s.x - p.x, s.y - p.y);
    if (dazed(f, now, dt)) {
      this.show(d, false, dt);
      swimBoss(f, this.host.world, this.host.floorAt, dt);
      return;
    }
    const rel = relationTo(p.size, f.size);
    const before = this.state.mode;
    this.state = stepSleeper(this.state, {
      now,
      rel: rel === 'predator' ? 'hunt' : rel === 'prey' ? 'hide' : 'even',
      dist: d,
      seen: !p.hidden,
    });
    if (this.state.mode !== before) this.enter(this.state.mode, now);
    const { mode } = this.state;
    f.state = mode === 'lurch' ? 'chase' : 'cruise';
    this.steer(p, dt);
    swimBoss(f, this.host.world, this.host.floorAt, dt);
    this.show(d, mode === 'sleep', dt);
    if (mode === 'lurch') this.suck(dt);
    this.eyes(now);
    if (mode === 'sleep' && now >= this.nextBreath) {
      this.nextBreath = now + BREATH_EVERY_MS;
      this.host.burst(s.x + (f.turn < 0 ? -1 : 1) * f.size * 0.7, s.y - f.size * 0.3, 1);
    }
  }

  destroy(): void {
    this.marks.destroy();
  }

  private enter(mode: SleeperMode, now: number): void {
    const s = this.fish.sprite;
    if (mode === 'lurch') this.host.sfx('suck', s, 1.3, 0.8);
    if (mode === 'lumber') this.host.burst(s.x, s.y + this.fish.size * 0.3, 8);
    if (mode === 'sleep') this.nextBreath = now + BREATH_EVERY_MS;
  }

  /** Only what your light reaches of it shows; out there in the dark it's just a shape you can't see. */
  private show(d: number, asleep: boolean, dt: number): void {
    const f = this.fish;
    const target = sleeperVisibility(d, this.host.lightRadius(), asleep);
    f.sprite.alpha += (target - f.sprite.alpha) * Math.min(1, dt * 4);
    f.veiled = f.sprite.alpha < 0.5;
  }

  private steer(p: PlayerView, dt: number): void {
    const f = this.fish;
    const s = f.sprite;
    const dx = p.x - s.x;
    const dy = p.y - s.y;
    const d = Math.hypot(dx, dy) || 1;
    switch (this.state.mode) {
      case 'flare':
        return easeVelocity(f, Math.sign(dx) * 10, 0, 5, dt);
      case 'lurch':
        return easeVelocity(f, (dx / d) * SLEEPER.lurchSpeed, (dy / d) * SLEEPER.lurchSpeed, 6, dt);
      case 'rest':
        return easeVelocity(f, Math.sign(f.vx || 1) * 30, 0, 2, dt);
      case 'sleep': {
        // Lying still on the bottom.
        const bed = aboveSeabed(this.host.floorAt(s.x), f.size);
        easeVelocity(f, 0, (bed - s.y) * 2, 3, dt);
        f.vx = (f.turn < 0 ? -1 : 1) * 5;
        return;
      }
      case 'lumber': {
        const bed = aboveSeabed(this.host.floorAt(s.x), f.size);
        return easeVelocity(f, (-dx / d) * SLEEPER.lumberSpeed, (bed - s.y) * 0.8, 3, dt);
      }
      default: {
        // Drifting silently towards you.
        const v = Math.min(SLEEPER.driftSpeed, d * 0.4);
        return easeVelocity(f, (dx / d) * v, (dy / d) * v, 1, dt);
      }
    }
  }

  /** Its lurch sucks you in towards its mouth. */
  private suck(dt: number): void {
    const f = this.fish;
    const you = this.host.player().sprite;
    const mx = f.sprite.x + (f.turn < 0 ? -1 : 1) * f.size * 0.85;
    const dx = mx - you.x;
    const dy = f.sprite.y - you.y;
    const d = Math.hypot(dx, dy) || 1;
    if (d > SLEEPER.lurchRange * 1.2) return;
    this.host.drag((dx / d) * SLEEPER.pull * dt, (dy / d) * SLEEPER.pull * dt);
  }

  /** Two eye-glints in the dark while it hunts (flaring before a lurch); none while it sleeps. */
  private eyes(now: number): void {
    const f = this.fish;
    const { mode } = this.state;
    if (mode === 'sleep' || mode === 'lumber') return;
    const facing = f.turn < 0 ? -1 : 1;
    const x = f.sprite.x + facing * f.size * EYE.ahead;
    const y = f.sprite.y - f.size * EYE.up;
    const flare = mode === 'flare' ? 1 + Math.sin(now / 40) * 0.3 : 0;
    // Faint when you can see all of it anyway; bright out in the dark.
    const alpha = Math.max(0.15, 1 - f.sprite.alpha) * (flare ? 1 : 0.8);
    this.marks.glints(x, y, f.size * EYE.gap, Math.max(1.6, f.size * 0.035) * (1 + flare), alpha);
    if (mode === 'flare') this.marks.exclaim(f.sprite.x, f.sprite.y - f.size * 1.3, Math.max(26, f.size * 0.6), now / 1000);
  }
}
