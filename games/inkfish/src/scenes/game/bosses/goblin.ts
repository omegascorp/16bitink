import { GOBLIN, GOBLIN_START, inJawReach, stepGoblin, type GoblinMode, type GoblinState } from '../../../logic/bosses/goblin';
import { relationTo } from '../../../logic/sizing';
import type { Fish, PlayerView } from '../fish';
import { dazed, easeVelocity, Marks, swimBoss, type Boss, type BossHost } from './kit';

interface Pt {
  readonly x: number;
  readonly y: number;
}

/** Where the jaws sit under the snout, from its centre, in multiples of its size (facing right). */
const JAW = { ahead: 0.75, down: 0.22 } as const;

/** The goblin shark in play: see logic/bosses/goblin.ts for its rules. */
export class GoblinBoss implements Boss {
  private state: GoblinState = GOBLIN_START;
  private readonly marks: Marks;
  /** This snap has already caught you. */
  private struck = false;

  constructor(readonly fish: Fish, private readonly host: BossHost) {
    this.marks = new Marks(host.scene);
  }

  update(p: PlayerView, now: number, dt: number): void {
    const f = this.fish;
    this.marks.clear();
    if (dazed(f, now, dt)) {
      swimBoss(f, this.host.world, this.host.floorAt, dt);
      return;
    }
    const rel = relationTo(p.size, f.size);
    const facing = this.facing();
    const head = this.head(facing);
    const before = this.state.mode;
    this.state = stepGoblin(this.state, {
      now,
      rel: rel === 'predator' ? 'hunt' : rel === 'prey' ? 'hide' : 'even',
      inFront: inJawReach(p.x - head.x, p.y - head.y, facing, this.reach()),
      seen: !p.hidden,
    });
    if (this.state.mode !== before) this.enter(this.state.mode);
    f.state = this.state.mode === 'snap' ? 'chase' : 'cruise';
    this.steer(p, dt);
    swimBoss(f, this.host.world, this.host.floorAt, dt);
    if (this.state.mode === 'snap') this.snap(now, rel === 'prey');
    if (this.state.mode === 'aim' || this.state.mode === 'turn') this.glow(now);
  }

  destroy(): void {
    this.marks.destroy();
  }

  private facing(): 1 | -1 {
    return this.fish.turn < 0 ? -1 : 1;
  }

  private reach(): number {
    return this.fish.size * GOBLIN.reach;
  }

  /** Where the jaws rest, tucked under the snout. */
  private head(facing: 1 | -1): Pt {
    const f = this.fish;
    return { x: f.sprite.x + facing * f.size * JAW.ahead, y: f.sprite.y + f.size * JAW.down };
  }

  private enter(mode: GoblinMode): void {
    const s = this.fish.sprite;
    if (mode === 'aim') this.host.sfx('rustle', s, 1.4, 0.5);
    if (mode === 'snap') {
      this.struck = false;
      this.host.sfx('lash', s, 1.5, 0.8);
    }
  }

  private steer(p: PlayerView, dt: number): void {
    const f = this.fish;
    const s = f.sprite;
    const dx = p.x - s.x;
    const dy = p.y - s.y;
    const d = Math.hypot(dx, dy) || 1;
    switch (this.state.mode) {
      case 'aim':
      case 'turn':
        // Stopping to face you square on.
        return easeVelocity(f, Math.sign(dx) * 12, (dy / d) * 20, 5, dt);
      case 'snap':
        return easeVelocity(f, 0, 0, 6, dt);
      case 'recoil':
        return easeVelocity(f, -this.facing() * 50, 0, 3, dt);
      case 'flee':
        return easeVelocity(f, (-dx / d) * GOBLIN.fleeSpeed, (-dy / d) * GOBLIN.fleeSpeed * 0.5, 2, dt);
      default: {
        const v = Math.min(GOBLIN.stalkSpeed, d * 0.6);
        return easeVelocity(f, (dx / d) * v, (dy / d) * v, 1.5, dt);
      }
    }
  }

  /** The tell: its long snout glows pale pink before it fires its jaws. */
  private glow(now: number): void {
    const f = this.fish;
    const facing = this.facing();
    const nose = { x: f.sprite.x + facing * f.size * 1.05, y: f.sprite.y - f.size * 0.02 };
    this.marks.glow(nose.x, nose.y, f.size * 0.45, 0.6 + Math.sin(now / 60) * 0.25);
    if (this.state.mode === 'aim') this.marks.exclaim(f.sprite.x, f.sprite.y - f.size * 1.3, Math.max(26, f.size * 0.6), now / 1000);
  }

  /** The jaws fire out and snap back; whatever they reach is bitten (or, if you're bigger, stunned). */
  private snap(now: number, outgrown: boolean): void {
    const f = this.fish;
    const facing = this.facing();
    const head = this.head(facing);
    const k = 1 - (this.state.until - now) / GOBLIN.snapMs;
    const out = Math.sin(Math.PI * Math.max(0, Math.min(1, k))) * this.reach();
    const tip = { x: head.x + facing * out, y: head.y };
    this.marks.jaws(head.x, head.y, tip.x, tip.y, facing, f.size * 0.7);
    const you = this.host.player();
    if (this.struck || Math.hypot(you.sprite.x - tip.x, you.sprite.y - tip.y) > f.size * 0.45 + you.size) return;
    this.struck = true;
    if (outgrown) {
      this.host.stunPlayer(GOBLIN.stunMs, 'Snap!');
      this.host.drag(facing * 40, 0);
    } else {
      this.host.bite(f);
    }
  }
}
