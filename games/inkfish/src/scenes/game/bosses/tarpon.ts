import { stepTarpon, TARPON, TARPON_START, tarponAirborne, type TarponMode, type TarponState } from '../../../logic/bosses/tarpon';
import { relationTo } from '../../../logic/sizing';
import { SKY, waterTop } from '../../../logic/water';
import { stunFish, type Fish, type PlayerView } from '../fish';
import { dazed, easeVelocity, Marks, swimBoss, type Boss, type BossHost } from './kit';

/** How far ahead of the landing spot it launches on a hunting leap, px. */
const HUNT_LEAP = 380;
/** It counts as up at the surface (ready to jump) this close to the highest it can swim, px. */
const LAUNCH_DEPTH = 14;
/** Fastest it flies sideways, px/s: a far landing spot makes a flatter, faster leap, never a teleport. */
const MAX_AIR_VX = 820;
/** How long a hunted fish stays dazed by the splash, ms. */
const FISH_STUN_MS = 2200;

/** The tarpon in play: see logic/bosses/tarpon.ts for its rules. */
export class TarponBoss implements Boss {
  private state: TarponState = TARPON_START;
  private readonly marks: Marks;

  constructor(readonly fish: Fish, private readonly host: BossHost) {
    this.marks = new Marks(host.scene);
  }

  update(p: PlayerView, now: number, dt: number): void {
    const f = this.fish;
    const s = f.sprite;
    this.marks.clear();
    if (this.state.mode !== 'air' && dazed(f, now, dt)) {
      swimBoss(f, this.host.world, this.host.floorAt, dt);
      return;
    }
    const rel = relationTo(p.size, f.size);
    const you = this.host.player();
    const landed = this.state.mode === 'air' && f.vy > 0 && s.y >= SKY.surfaceY + 10;
    const before = this.state.mode;
    this.state = stepTarpon(this.state, {
      now,
      rel: rel === 'predator' ? 'hunt' : rel === 'prey' ? 'hide' : 'even',
      dist: Math.hypot(s.x - p.x, s.y - p.y),
      x: s.x, px: p.x, pvx: you.vx,
      playerDepth: p.y - SKY.surfaceY,
      seen: !p.hidden,
      side: p.x >= s.x ? 1 : -1,
      atSurface: s.y <= waterTop(f.size) + LAUNCH_DEPTH,
      landed,
    });
    if (this.state.mode !== before) this.enter(this.state.mode, before, now);
    f.tucked = tarponAirborne(this.state.mode);
    f.state = this.state.mode === 'dive' ? 'chase' : this.state.mode === 'spent' ? 'tired' : 'cruise';
    if (this.state.mode === 'air') this.fly(dt);
    else {
      f.tilt = 0;
      this.steer(p, dt);
      swimBoss(f, this.host.world, this.host.floorAt, dt);
    }
    this.warn(now);
  }

  destroy(): void {
    this.marks.destroy();
  }

  private enter(mode: TarponMode, from: TarponMode, now: number): void {
    const f = this.fish;
    const h = this.host;
    if (mode === 'air') {
      // A ballistic arc that comes down on landX after airTime.
      const t = TARPON.airTime;
      f.vx = Math.max(-MAX_AIR_VX, Math.min(MAX_AIR_VX, (this.state.landX - f.sprite.x) / t));
      f.vy = (-TARPON.gravity * t) / 2;
      h.splash(f.sprite.x, f.size * 0.7);
      h.sfx('splash', f.sprite, 1.2, 0.8);
    }
    if (from === 'air') this.crash(now);
    if (mode === 'spent') h.burst(f.sprite.x, f.sprite.y - f.size * 0.5, 4);
  }

  /** Back in the water: a great splash, and when hunting, a stunning one. */
  private crash(now: number): void {
    const f = this.fish;
    const h = this.host;
    const x = f.sprite.x;
    h.splash(x, f.size * 1.8);
    h.sfx('splash', { x, y: SKY.surfaceY }, 0.55, 1);
    h.burst(x, SKY.surfaceY + 30, 12);
    if (!this.state.flop) return;
    h.shake(220, 0.007);
    const r = TARPON.splashRadius;
    const p = h.player().sprite;
    if (Math.hypot(p.x - x, p.y - SKY.surfaceY) < r) h.stunPlayer(TARPON.stunMs, 'Splash!');
    for (const other of h.fish()) {
      if (other !== f && other.role === 'normal' && Math.hypot(other.sprite.x - x, other.sprite.y - SKY.surfaceY) < r) stunFish(other, now, FISH_STUN_MS);
    }
  }

  private fly(dt: number): void {
    const f = this.fish;
    f.vy += TARPON.gravity * dt;
    f.sprite.x += f.vx * dt;
    f.sprite.y += f.vy * dt;
    // Nose up on the way up, nose down coming in: the arc of a leaping fish.
    const facing = f.vx < 0 ? -1 : 1;
    f.tilt = Math.atan2(f.vy, Math.abs(f.vx) + 1) * facing * 0.9;
  }

  private steer(p: PlayerView, dt: number): void {
    const f = this.fish;
    const s = f.sprite;
    const { mode, landX } = this.state;
    const toward = (x: number, y: number, speed: number, rate: number): void => {
      const dx = x - s.x;
      const dy = y - s.y;
      const d = Math.hypot(dx, dy) || 1;
      const v = Math.min(speed, d * 3);
      easeVelocity(f, (dx / d) * v, (dy / d) * v, rate, dt);
    };
    const side = p.x >= s.x ? 1 : -1;
    switch (mode) {
      case 'rise': {
        // Hunting, it launches short of where it'll land, so the arc comes down on you;
        // escaping, it goes straight up from where it is.
        const launchX = this.state.flop ? landX - Math.sign(landX - s.x || 1) * HUNT_LEAP : s.x;
        return toward(launchX, SKY.surfaceY + 10, TARPON.riseSpeed, 5);
      }
      case 'dive':
        return toward(p.x, p.y, TARPON.diveSpeed, 6);
      case 'recover':
        return easeVelocity(f, Math.sign(f.vx || 1) * 60, 30, 2, dt);
      case 'spent':
        return easeVelocity(f, Math.sign(f.vx || 1) * 50, 10, 2, dt);
      case 'wary': {
        // Keep its distance near the top of the water, where it can leap.
        const near = Math.hypot(s.x - p.x, s.y - p.y) < TARPON.waryDistance;
        return toward(near ? s.x - side * 400 : s.x + Math.sign(f.vx || 1) * 200, SKY.surfaceY + 140, near ? TARPON.wanderSpeed : 110, 2);
      }
      default:
        // Patrolling a little above you and off to one side.
        return toward(p.x - side * 260, Math.max(SKY.surfaceY + 120, p.y - 60), TARPON.cruiseSpeed, 2);
    }
  }

  /** A hunting leap shows where it'll come down: a red ring on the water. */
  private warn(now: number): void {
    const { mode, landX, flop } = this.state;
    if (!flop || (mode !== 'rise' && mode !== 'air')) return;
    const t = now / 1000;
    this.marks.ring(landX, SKY.surfaceY + 6, TARPON.splashRadius, t, 0.75);
    if (mode === 'rise') this.marks.exclaim(landX, SKY.surfaceY - 30, 34, t);
  }
}
