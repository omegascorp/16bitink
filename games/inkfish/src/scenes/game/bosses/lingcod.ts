import {
  inSuctionCone, LINGCOD, LINGCOD_START, overheadOf, stepLingcod, suctionAt, type LingcodMode, type LingcodState,
} from '../../../logic/bosses/lingcod';
import { relationTo } from '../../../logic/sizing';
import { aboveSeabed } from '../../../logic/water';
import { mouthOf } from '../swim';
import type { Fish, PlayerView } from '../fish';
import { dazed, easeVelocity, Marks, swimBoss, type Boss, type BossHost } from './kit';

/** How faint it gets lying camouflaged on the sand. */
const CAMO_ALPHA = 0.26;
/** A puff of sand (its breath) gives it away this often while camouflaged, ms. */
const PUFF_EVERY_MS = 2100;
/** It lies this far ahead of you on the sand when stalking, so you swim into its cone, px. */
const AHEAD = 240;

/** The lingcod in play: see logic/bosses/lingcod.ts for its rules. */
export class LingcodBoss implements Boss {
  private state: LingcodState = LINGCOD_START;
  private readonly marks: Marks;
  /** Which way its mouth points while it gulps: held still from the moment it opens. */
  private facing: 1 | -1 = 1;
  private nextPuff = 0;

  constructor(readonly fish: Fish, private readonly host: BossHost) {
    this.marks = new Marks(host.scene);
  }

  update(p: PlayerView, now: number, dt: number): void {
    const f = this.fish;
    const s = f.sprite;
    this.marks.clear();
    if (dazed(f, now, dt)) {
      this.reveal(dt);
      swimBoss(f, this.host.world, this.host.floorAt, dt);
      return;
    }
    const rel = relationTo(p.size, f.size);
    const mouth = mouthOf(s, f.size, this.facing);
    const before = this.state.mode;
    this.state = stepLingcod(this.state, {
      now,
      rel: rel === 'predator' ? 'hunt' : rel === 'prey' ? 'hide' : 'even',
      dist: Math.hypot(s.x - p.x, s.y - p.y),
      inCone: inSuctionCone(p.x - mouth.x, p.y - mouth.y, this.facingNow()),
      overhead: overheadOf(p.x - s.x, p.y - s.y),
      seen: !p.hidden,
      x: s.x,
      side: p.x >= s.x ? 1 : -1,
    });
    if (this.state.mode !== before) this.enter(this.state.mode, now);
    f.state = this.state.mode === 'bolt' || this.state.mode === 'launch' ? 'chase' : 'cruise';
    this.steer(p, dt);
    swimBoss(f, this.host.world, this.host.floorAt, dt);
    if (this.state.mode === 'camo') this.hide(now, dt);
    else this.reveal(dt);
    if (this.state.mode === 'suck') this.suck(dt);
    this.warn(now);
  }

  destroy(): void {
    this.marks.destroy();
  }

  /** The way it faces now: its body's facing while free, held still once it starts a gulp. */
  private facingNow(): 1 | -1 {
    const { mode } = this.state;
    if (mode === 'open' || mode === 'suck') return this.facing;
    return this.fish.turn < 0 ? -1 : 1;
  }

  private enter(mode: LingcodMode, now: number): void {
    const f = this.fish;
    const h = this.host;
    if (mode === 'open') {
      this.facing = f.turn < 0 ? -1 : 1;
      h.sfx('suck', f.sprite);
    }
    if (mode === 'bolt') {
      h.burst(f.sprite.x, f.sprite.y + f.size * 0.4, 10);
      h.sfx('dash', f.sprite, 0.6);
    }
    if (mode === 'camo') this.nextPuff = now + PUFF_EVERY_MS;
    if (mode === 'coil') {
      h.burst(f.sprite.x, f.sprite.y + f.size * 0.3, 8);
      h.sfx('rustle', f.sprite, 0.6);
    }
    if (mode === 'launch') {
      const you = h.player().sprite;
      this.target = { x: you.x, y: you.y };
      h.sfx('lunge', f.sprite);
      h.burst(f.sprite.x, f.sprite.y + f.size * 0.3, 12);
    }
  }

  /** Where a launch is aimed: where you were as it left the sand. */
  private target = { x: 0, y: 0 };

  /** Lying on the sand: where on the bottom it rests at x. */
  private bed(x: number): number {
    return aboveSeabed(this.host.floorAt(x), this.fish.size);
  }

  private steer(p: PlayerView, dt: number): void {
    const f = this.fish;
    const s = f.sprite;
    const { mode, boltX } = this.state;
    const toward = (x: number, speed: number, rate: number): void => {
      const dx = x - s.x;
      const v = Math.min(speed, Math.abs(dx) * 3);
      easeVelocity(f, Math.sign(dx) * v, (this.bed(s.x) - s.y) * 3, rate, dt);
    };
    if (mode === 'bolt') return toward(boltX, LINGCOD.boltSpeed, 6);
    if (mode === 'launch') {
      const dx = this.target.x - s.x;
      const dy = this.target.y - s.y;
      const d = Math.hypot(dx, dy) || 1;
      return easeVelocity(f, (dx / d) * LINGCOD.launchSpeed, (dy / d) * LINGCOD.launchSpeed, 8, dt);
    }
    if (mode === 'coil') {
      // Pressed into the sand, quivering, about to spring.
      easeVelocity(f, 0, (this.bed(s.x) - s.y) * 3, 6, dt);
      f.vx = (p.x >= s.x ? 1 : -1) * 6;
      return;
    }
    if (mode === 'open' || mode === 'suck' || mode === 'rest' || mode === 'camo') {
      // Still on the sand, its mouth kept pointing the way it chose.
      easeVelocity(f, 0, (this.bed(s.x) - s.y) * 3, 5, dt);
      const face = mode === 'camo' ? (f.turn < 0 ? -1 : 1) : this.facing;
      f.vx = face * 6;
      return;
    }
    // Stalking: creep along the bottom to lie ahead of you, facing you.
    const side = p.x >= s.x ? 1 : -1;
    const spot = p.x - side * AHEAD;
    toward(spot, LINGCOD.stalkSpeed, 2);
    if (Math.abs(spot - s.x) < 30) f.vx = side * 6;
  }

  /** The suction: you and any small fish in the cone are dragged towards its jaws. */
  private suck(dt: number): void {
    const f = this.fish;
    const mouth = mouthOf(f.sprite, f.size, this.facing);
    const pull = (x: number, y: number): { dx: number; dy: number } | null => {
      const dx = x - mouth.x;
      const dy = y - mouth.y;
      if (!inSuctionCone(dx, dy, this.facing)) return null;
      const d = Math.hypot(dx, dy) || 1;
      const v = suctionAt(d) * dt;
      return { dx: (-dx / d) * v, dy: (-dy / d) * v };
    };
    const you = this.host.player().sprite;
    const drag = pull(you.x, you.y);
    if (drag) this.host.drag(drag.dx, drag.dy);
    for (const other of this.host.fish()) {
      if (other === f || other.role !== 'normal') continue;
      const d = pull(other.sprite.x, other.sprite.y);
      if (d) other.sprite.setPosition(other.sprite.x + d.dx * 1.3, other.sprite.y + d.dy * 1.3);
    }
  }

  /** Fading into the sand, veiled from the goal marker; a puff of breath now and then gives it away. */
  private hide(now: number, dt: number): void {
    const f = this.fish;
    f.veiled = true;
    f.sprite.alpha += (CAMO_ALPHA - f.sprite.alpha) * Math.min(1, dt * 1.5);
    if (now >= this.nextPuff) {
      this.nextPuff = now + PUFF_EVERY_MS;
      this.host.burst(mouthOf(f.sprite, f.size, f.turn).x, f.sprite.y - f.size * 0.3, 3);
    }
  }

  private reveal(dt: number): void {
    const f = this.fish;
    f.veiled = false;
    f.sprite.alpha += (1 - f.sprite.alpha) * Math.min(1, dt * 6);
  }

  /** The tells: water rushing into its mouth while it opens and sucks, and a "!" as it opens. */
  private warn(now: number): void {
    const { mode } = this.state;
    const f = this.fish;
    if (mode === 'coil') {
      this.marks.exclaim(f.sprite.x, f.sprite.y - f.size * 1.4, Math.max(26, f.size * 0.7), now / 1000);
      return;
    }
    if (mode !== 'open' && mode !== 'suck') return;
    const mouth = mouthOf(f.sprite, f.size, this.facing);
    const t = now / 1000;
    this.marks.swirl(mouth.x, mouth.y, this.facing, LINGCOD.reach, LINGCOD.cone, t * (mode === 'suck' ? 1.8 : 0.8), mode === 'suck' ? 0.85 : 0.5, LINGCOD.lift);
    if (mode === 'open') this.marks.exclaim(f.sprite.x, f.sprite.y - f.size * 1.4, Math.max(26, f.size * 0.7), t);
  }
}
