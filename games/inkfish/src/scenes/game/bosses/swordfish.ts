import { aimLocked, stepSwordfish, SWORDFISH, SWORDFISH_START, type SwordfishMode, type SwordfishState } from '../../../logic/bosses/swordfish';
import { relationTo } from '../../../logic/sizing';
import { mouthOf } from '../swim';
import { stunFish, type Fish, type PlayerView } from '../fish';
import { dazed, easeVelocity, Marks, swimBoss, type Boss, type BossHost } from './kit';

interface Pt {
  readonly x: number;
  readonly y: number;
}

/** Small fish its bill passes this close to are knocked senseless, px. */
const CUT = 40;
const FISH_STUN_MS = 2600;

/** The swordfish in play: see logic/bosses/swordfish.ts for its rules. */
export class SwordfishBoss implements Boss {
  private state: SwordfishState = SWORDFISH_START;
  private readonly marks: Marks;
  /** Where the slash line ends: through you and out the other side. */
  private to: Pt = { x: 0, y: 0 };
  private readonly cut = new Set<Fish>();

  constructor(readonly fish: Fish, private readonly host: BossHost) {
    this.marks = new Marks(host.scene);
  }

  update(p: PlayerView, now: number, dt: number): void {
    const f = this.fish;
    const s = f.sprite;
    this.marks.clear();
    if (dazed(f, now, dt)) {
      swimBoss(f, this.host.world, this.host.floorAt, dt);
      return;
    }
    const rel = relationTo(p.size, f.size);
    const before = this.state.mode;
    this.state = stepSwordfish(this.state, {
      now, dt,
      rel: rel === 'predator' ? 'hunt' : rel === 'prey' ? 'hide' : 'even',
      dist: Math.hypot(s.x - p.x, s.y - p.y),
      seen: !p.hidden,
    });
    if (this.state.mode !== before) this.enter(this.state.mode);
    // Following you with its aim until the line locks.
    if (this.state.mode === 'aim' && !aimLocked(this.state, now)) this.line(p);
    f.state = this.state.mode === 'slash' || this.state.mode === 'sprint' ? 'chase' : this.state.mode === 'winded' ? 'tired' : 'cruise';
    this.steer(p, now, dt);
    swimBoss(f, this.host.world, this.host.floorAt, dt);
    if (this.state.mode === 'slash') this.slice(now);
    this.warn(now);
  }

  destroy(): void {
    this.marks.destroy();
  }

  /** The slash line from its bill, through you, carrying on past you. */
  private line(p: PlayerView): void {
    const s = this.fish.sprite;
    const dx = p.x - s.x;
    const dy = p.y - s.y;
    const d = Math.hypot(dx, dy) || 1;
    this.to = { x: p.x + (dx / d) * SWORDFISH.overshoot, y: p.y + (dy / d) * SWORDFISH.overshoot };
  }

  private enter(mode: SwordfishMode): void {
    const s = this.fish.sprite;
    if (mode === 'aim') this.host.sfx('spotted', s, 0.8, 0.7);
    if (mode === 'slash') {
      this.cut.clear();
      this.host.sfx('lash', s, 1.2);
      this.host.burst(s.x, s.y, 8);
    }
    if (mode === 'winded') {
      this.host.floatText(s.x, s.y - this.fish.size * 1.4, 'Out of breath!', '#1f3f8a', 28);
      this.host.burst(s.x, s.y - this.fish.size * 0.5, 5);
    }
  }

  private steer(p: PlayerView, now: number, dt: number): void {
    const f = this.fish;
    const s = f.sprite;
    const dx = p.x - s.x;
    const dy = p.y - s.y;
    const d = Math.hypot(dx, dy) || 1;
    switch (this.state.mode) {
      case 'aim':
        // Drawing back a little, nose on you, tail quivering.
        return easeVelocity(f, (-dx / d) * 40, (-dy / d) * 40, 4, dt);
      case 'slash': {
        const lx = this.to.x - s.x;
        const ly = this.to.y - s.y;
        const l = Math.hypot(lx, ly);
        // Straight down the line; once at its end it just runs on, out of control, until it can turn.
        if (l < 30) return easeVelocity(f, Math.sign(f.vx || 1) * SWORDFISH.slashSpeed * 0.6, 0, 1, dt);
        return easeVelocity(f, (lx / l) * SWORDFISH.slashSpeed, (ly / l) * SWORDFISH.slashSpeed, 10, dt);
      }
      case 'turn':
        return easeVelocity(f, Math.sign(f.vx || 1) * 80, 0, 1.5, dt);
      case 'sprint':
        return easeVelocity(f, (-dx / d) * SWORDFISH.sprintSpeed, (-dy / d) * SWORDFISH.sprintSpeed * 0.6, 5, dt);
      case 'winded':
        return easeVelocity(f, Math.sign(f.vx || 1) * 40, 15, 2, dt);
      case 'wary': {
        const near = d < SWORDFISH.waryDistance;
        return easeVelocity(f, near ? (-dx / d) * 220 : Math.sign(f.vx || 1) * 120, near ? (-dy / d) * 120 : Math.sin(now / 900) * 40, 2, dt);
      }
      default: {
        // Sweeping past at a distance, setting up its next run.
        const side = Math.sign(s.x - p.x) || 1;
        return easeVelocity(f, ((p.x + side * 450 - s.x) / 450) * SWORDFISH.cruiseSpeed, ((p.y - s.y) / 450) * 120, 2, dt);
      }
    }
  }

  /** Everything small its bill passes is knocked senseless. */
  private slice(now: number): void {
    const f = this.fish;
    const bill = mouthOf(f.sprite, f.size * 1.5, f.vx < 0 ? -1 : 1);
    for (const other of this.host.fish()) {
      if (other === f || other.role !== 'normal' || this.cut.has(other)) continue;
      if (Math.hypot(other.sprite.x - bill.x, other.sprite.y - bill.y) < CUT + other.size) {
        this.cut.add(other);
        stunFish(other, now, FISH_STUN_MS);
      }
    }
  }

  /** The tell: a dotted red line down its path, wobbling while it aims, steady once locked. */
  private warn(now: number): void {
    if (this.state.mode !== 'aim') return;
    const locked = aimLocked(this.state, now);
    const s = this.fish.sprite;
    this.marks.dotted(s.x, s.y, this.to.x, this.to.y, locked ? 3.4 : 2.4, locked ? 0.9 : 0.55);
    if (locked) this.marks.exclaim(s.x, s.y - this.fish.size * 1.3, Math.max(24, this.fish.size * 0.6), now / 1000);
  }
}
