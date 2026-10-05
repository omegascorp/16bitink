import { biteOarfish, OARFISH, OARFISH_START, oarfishSlipping, stepOarfish, type OarfishMode, type OarfishState } from '../../../logic/bosses/oarfish';
import { capsuleTouchesCircle } from '../../../logic/body';
import { relationTo } from '../../../logic/sizing';
import { bodyOf } from '../swim';
import { stunFish, type Fish, type PlayerView } from '../fish';
import { dazed, easeVelocity, Marks, swimBoss, type Boss, type BossHost } from './kit';

/** How much of the drawing a shed piece of tail is, from the tail end. */
const PIECE = 0.32;
const FISH_STUN_MS = 2000;

/** The oarfish in play: see logic/bosses/oarfish.ts for its rules. */
export class OarfishBoss implements Boss {
  private state: OarfishState = OARFISH_START;
  private readonly marks: Marks;
  /** How upright it is: 1 hanging head-up, 0 level. */
  private upright = 1;
  /** This lash has already caught you. */
  private struck = false;

  constructor(readonly fish: Fish, private readonly host: BossHost) {
    this.marks = new Marks(host.scene);
  }

  /** You bit it: it sheds a piece of tail and bolts, unless it has none left to spare. */
  resist(now: number): boolean {
    const bite = biteOarfish(this.state, now);
    if (!bite.resisted) return false;
    if (bite.state.sheds > this.state.sheds) this.shed();
    this.state = bite.state;
    return true;
  }

  update(p: PlayerView, now: number, dt: number): void {
    const f = this.fish;
    const s = f.sprite;
    this.marks.clear();
    if (dazed(f, now, dt)) {
      this.pose(0, dt);
      swimBoss(f, this.host.world, this.host.floorAt, dt);
      return;
    }
    const rel = relationTo(p.size, f.size);
    const before = this.state.mode;
    this.state = stepOarfish(this.state, {
      now,
      rel: rel === 'predator' ? 'hunt' : rel === 'prey' ? 'hide' : 'even',
      dist: Math.hypot(s.x - p.x, s.y - p.y),
      seen: !p.hidden,
    });
    if (this.state.mode !== before) this.enter(this.state.mode);
    f.tucked = oarfishSlipping(this.state.mode);
    f.state = this.state.mode === 'shed' || this.state.mode === 'lash' ? 'chase' : 'cruise';
    this.steer(p, now, dt);
    swimBoss(f, this.host.world, this.host.floorAt, dt);
    if (this.state.mode === 'lash') this.sweep(now);
    if (this.state.mode === 'quiver') this.marks.exclaim(s.x, s.y - f.size * 2.2, Math.max(26, f.size * 0.6), now / 1000);
  }

  destroy(): void {
    this.marks.destroy();
  }

  private enter(mode: OarfishMode): void {
    if (mode === 'quiver') this.host.sfx('rustle', this.fish.sprite, 0.7);
    if (mode === 'lash') {
      this.struck = false;
      this.host.sfx('lash', this.fish.sprite, 0.8);
    }
  }

  /** Holds it upright (1) or level (0), facing the way it swims. */
  private pose(target: number, dt: number, rate = 3): void {
    const f = this.fish;
    this.upright += (target - this.upright) * Math.min(1, dt * rate);
    const facing = f.turn < 0 ? -1 : 1;
    f.tilt = -facing * (Math.PI / 2) * this.upright;
  }

  private steer(p: PlayerView, now: number, dt: number): void {
    const f = this.fish;
    const s = f.sprite;
    const dx = p.x - s.x;
    const dy = p.y - s.y;
    const d = Math.hypot(dx, dy) || 1;
    switch (this.state.mode) {
      case 'quiver':
        // Upright and shivering from end to end.
        this.pose(1, dt, 6);
        f.tilt += Math.sin(now / 30) * 0.06;
        return easeVelocity(f, Math.sign(dx) * 6, 0, 5, dt);
      case 'lash':
        // The whole length whips down through the water.
        this.pose(0, dt, 1000 / OARFISH.lashMs * 1.6);
        return easeVelocity(f, Math.sign(dx) * 160, 0, 4, dt);
      case 'swim':
        this.pose(0, dt);
        return easeVelocity(f, Math.sign(f.vx || 1) * 120, 0, 2, dt);
      case 'shed':
        this.pose(0, dt, 8);
        return easeVelocity(f, (-dx / d) * OARFISH.shedSpeed, (-dy / d) * OARFISH.shedSpeed * 0.5, 6, dt);
      case 'drift':
        this.pose(0, dt);
        return easeVelocity(f, d < 600 ? (-dx / d) * OARFISH.driftSpeed : Math.sign(f.vx || 1) * 90, d < 600 ? (-dy / d) * 80 : 0, 2, dt);
      default:
        // Hanging head-up, drifting slowly to stay near you, rising and sinking a little.
        this.pose(1, dt);
        if (Math.abs(f.vx) < 6) f.vx = Math.sign(dx || 1) * 6;
        return easeVelocity(f, Math.sign(dx) * Math.min(OARFISH.hangSpeed, Math.abs(dx) * 0.2), Math.sin(now / 1400) * 25 + dy * 0.1, 1, dt);
    }
  }

  /** The lash: anything its sweeping body touches is knocked senseless (once a lash for you). */
  private sweep(now: number): void {
    const f = this.fish;
    const body = bodyOf(f.sprite, f.species);
    const you = this.host.player();
    if (!this.struck && capsuleTouchesCircle(body, you.sprite.x, you.sprite.y, you.size * 1.2)) {
      this.struck = this.host.stunPlayer(OARFISH.stunMs, 'Lashed!');
      if (this.struck) this.host.shake(160, 0.006);
    }
    for (const other of this.host.fish()) {
      if (other === f || other.role !== 'normal' || other.state === 'stunned') continue;
      if (capsuleTouchesCircle(body, other.sprite.x, other.sprite.y, other.size)) stunFish(other, now, FISH_STUN_MS);
    }
  }

  /** A piece of tail breaks off and sinks away; what's left is shorter. */
  private shed(): void {
    const f = this.fish;
    const s = f.sprite;
    const h = this.host;
    const piece = h.scene.add.image(s.x, s.y, s.texture.key).setScale(s.scaleX, s.scaleY).setFlip(s.flipX, s.flipY)
      .setRotation(s.rotation).setDepth(s.depth - 0.1);
    piece.setCrop(0, 0, piece.width * PIECE, piece.height);
    h.scene.tweens.add({
      targets: piece, y: s.y + 160, rotation: s.rotation + (s.flipX ? -0.8 : 0.8), alpha: 0,
      duration: 2200, ease: 'Sine.In', onComplete: () => piece.destroy(),
    });
    f.baseSize *= OARFISH.shedShare;
    f.size = f.baseSize;
    h.burst(s.x, s.y, 12);
    h.sfx('splash', s, 0.6);
    h.floatText(s.x, s.y - f.size * 1.6, 'It shed its tail!', '#1f3f8a', 30);
  }
}
