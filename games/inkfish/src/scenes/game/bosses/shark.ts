import { SHARK, SHARK_START, stepShark, type SharkMode, type SharkState } from '../../../logic/bosses/shark';
import { relationTo } from '../../../logic/sizing';
import type { Fish, PlayerView } from '../fish';
import { dazed, easeVelocity, Marks, swimBoss, type Boss, type BossHost } from './kit';

interface Pt {
  readonly x: number;
  readonly y: number;
}

/** The circle is squashed top to bottom: water is wider than it is deep near you. */
const ORBIT_SQUASH = 0.7;

/** The reef shark in play: see logic/bosses/shark.ts for its rules. */
export class SharkBoss implements Boss {
  private state: SharkState = SHARK_START;
  private readonly marks: Marks;
  /** Where it is on its circle around you, radians. */
  private angle = 0;
  /** Laps go one way or the other. */
  private spin: 1 | -1 = 1;
  private strike: Pt = { x: 0, y: 0 };
  private blood: Pt | null = null;
  private lastDash = 0;

  constructor(readonly fish: Fish, private readonly host: BossHost) {
    this.marks = new Marks(host.scene);
  }

  /** A fish was eaten at (x, y): it smells the blood. */
  smell(x: number, y: number): void {
    this.blood = { x, y };
  }

  update(p: PlayerView, now: number, dt: number): void {
    const f = this.fish;
    const s = f.sprite;
    this.marks.clear();
    const blood = this.blood;
    this.blood = null;
    if (dazed(f, now, dt)) {
      f.tilt = 0;
      swimBoss(f, this.host.world, this.host.floorAt, dt);
      return;
    }
    const you = this.host.player();
    const dashed = you.dashedAt > this.lastDash;
    this.lastDash = you.dashedAt;
    const rel = relationTo(p.size, f.size);
    const before = this.state.mode;
    this.state = stepShark(this.state, {
      now, dt,
      rel: rel === 'predator' ? 'hunt' : rel === 'prey' ? 'hide' : 'even',
      dist: Math.hypot(s.x - p.x, s.y - p.y),
      seen: !p.hidden,
      dashed: dashed && this.state.mode === 'circle',
      blood: blood ? { ...blood, dist: Math.hypot(blood.x - s.x, blood.y - s.y) } : null,
    });
    if (this.state.mode !== before) this.enter(this.state.mode, p);
    if (dashed && before === 'circle' && this.state.mode === 'circle') this.host.floatText(p.x, p.y - 40, 'Broke the circle!', '#1f3f8a', 26);
    f.state = this.state.mode === 'strike' || this.state.mode === 'frenzy' ? 'chase' : 'cruise';
    this.steer(p, now, dt);
    swimBoss(f, this.host.world, this.host.floorAt, dt);
    if (this.state.mode === 'flex') this.marks.exclaim(s.x, s.y - f.size * 1.3, Math.max(26, f.size * 0.7), now / 1000);
  }

  destroy(): void {
    this.marks.destroy();
  }

  private enter(mode: SharkMode, p: PlayerView): void {
    const s = this.fish.sprite;
    if (mode === 'circle') {
      this.angle = Math.atan2((s.y - p.y) / ORBIT_SQUASH, s.x - p.x);
      this.spin = this.fish.vx >= 0 ? 1 : -1;
    }
    if (mode === 'strike') {
      this.strike = { x: p.x, y: p.y };
      this.host.sfx('lunge', s, 1.1);
    }
    if (mode === 'frenzy') this.host.sfx('spotted', s, 0.6, 0.6);
  }

  private steer(p: PlayerView, now: number, dt: number): void {
    const f = this.fish;
    const s = f.sprite;
    const { mode, radius, bloodX, bloodY } = this.state;
    const toward = (x: number, y: number, speed: number, rate: number): void => {
      const dx = x - s.x;
      const dy = y - s.y;
      const d = Math.hypot(dx, dy) || 1;
      const v = Math.min(speed, d * 4);
      easeVelocity(f, (dx / d) * v, (dy / d) * v, rate, dt);
    };
    f.tilt = mode === 'flex' ? Math.sin(now / 38) * 0.18 : 0;
    switch (mode) {
      case 'circle': {
        // Round and round you, tighter each lap, the point on the circle running ahead of it.
        this.angle += this.spin * SHARK.orbitSpeed * Math.PI * 2 * dt;
        const a = this.angle + this.spin * 0.5;
        return toward(p.x + Math.cos(a) * radius, p.y + Math.sin(a) * radius * ORBIT_SQUASH, 320, 4);
      }
      case 'flex':
        return easeVelocity(f, Math.sign(p.x - s.x) * 30, 0, 4, dt);
      case 'strike':
        return toward(this.strike.x, this.strike.y, SHARK.strikeSpeed, 7);
      case 'rest':
        return easeVelocity(f, Math.sign(f.vx || 1) * 70, 0, 2, dt);
      case 'frenzy':
        return toward(bloodX, bloodY, relationTo(p.size, f.size) === 'prey' ? SHARK.lureSpeed : SHARK.frenzySpeed, 4);
      case 'wary': {
        const dx = s.x - p.x;
        const dy = s.y - p.y;
        const d = Math.hypot(dx, dy) || 1;
        if (d < SHARK.waryRange) return easeVelocity(f, (dx / d) * SHARK.fleeSpeed, (dy / d) * SHARK.fleeSpeed * 0.6, 3, dt);
        // Patrolling at a distance, keeping you in sight.
        return toward(p.x + Math.sign(dx || 1) * SHARK.waryDistance, p.y + Math.sin(now / 1500) * 120, 160, 1.5);
      }
      default:
        return toward(p.x + Math.sign(s.x - p.x || 1) * 200, p.y, SHARK.cruiseSpeed, 2);
    }
  }
}
