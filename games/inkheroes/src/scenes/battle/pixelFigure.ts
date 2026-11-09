import type Phaser from 'phaser';
import type { Pose, UnitArt } from '../../art/pixel/manifest';

/** Idle frames a second: a slow breath. */
const IDLE_FPS = 6;
/** Walk (or wingbeat, gallop) frames a second while it travels. */
export const WALK_FPS = 10;
/** How long each attack frame holds, ms. */
const ATTACK_FRAME_MS = 85;
/** A short (stand-in) attack still lasts this long, so the blow can be seen. */
const MIN_ATTACK_MS = 300;
/** Depth of figures standing on the ground: back rows (smaller y) first. */
export const FIGURE_DEPTH = 100;

/**
 * One pixel-art figure on the battlefield: a sprite of the manifest's strips,
 * its feet pinned to a whole native pixel, facing right or mirrored to face
 * left (the feet stay on the same pixel either way). Plays the idle loop
 * (from a random frame, so a line of troops doesn't breathe in step), the
 * walk while it travels, and an attack that calls back on the strike frame.
 * Frame counts come from the manifest. Call `update` every frame.
 */
export class PixelFigure {
  readonly sprite: Phaser.GameObjects.Sprite;
  /** The ground point under the feet (whole pixels). */
  feet: { x: number; y: number };
  /** How far a flyer is lifted off the ground, and a sideways jolt when hit, native pixels. */
  private lift = 0;
  private nudge = 0;
  private left: boolean;
  private pose: Pose = 'idle';
  private frame: number;
  private clock: number;
  private fps = IDLE_FPS;
  /** The ground line it sorts on, when it stands high above it (on a tower). */
  private sortLine: number | null = null;
  /** A pose looped for review instead of the battle's own (the sandbox's anim=). */
  private held: Pose | null = null;
  private strike: (() => void) | null = null;
  private done: (() => void) | null = null;

  constructor(scene: Phaser.Scene, layer: Phaser.GameObjects.Layer, readonly art: UnitArt & { readonly tint?: number }, private readonly key: (pose: Pose) => string, feet: { x: number; y: number }, left: boolean) {
    this.feet = { x: Math.round(feet.x), y: Math.round(feet.y) };
    this.left = left;
    this.frame = Math.floor(Math.random() * art.frames.idle);
    this.clock = Math.random() * (1000 / IDLE_FPS);
    this.sprite = scene.add.sprite(0, 0, key('idle'), this.frame);
    layer.add(this.sprite);
    this.restTint();
    this.show();
  }

  /** Back to its own colours after a flash: a stand-in keeps the tint that tells it apart. */
  restTint(): void {
    this.sprite.clearTint();
    if (this.art.tint) this.sprite.setTint(this.art.tint);
  }

  get facingLeft(): boolean {
    return this.left;
  }

  /** Feet on (x, y), rounded to the pixel. */
  setFeet(x: number, y: number): void {
    this.feet = { x: Math.round(x), y: Math.round(y) };
    this.place();
  }

  /** Sorts it among the figures by `y` instead of its feet (null: its feet again). */
  sortOn(y: number | null): void {
    this.sortLine = y;
    this.place();
  }

  /** Lifts a flyer `px` off the ground and jolts it `dx` sideways (both rounded to the pixel). */
  offset(px: number, dx = 0): void {
    this.lift = Math.round(px);
    this.nudge = Math.round(dx);
    this.place();
  }

  face(left: boolean): void {
    this.left = left;
    this.place();
  }

  /** Loops `pose` for review, whatever the battle asks of it. */
  hold(pose: Pose): void {
    this.held = pose;
    this.set(pose, pose === 'idle' ? IDLE_FPS : pose === 'walk' ? WALK_FPS : 1000 / ATTACK_FRAME_MS);
  }

  idle(): void {
    this.finishAttack();
    if (!this.held) this.set('idle', IDLE_FPS);
  }

  walk(fps = WALK_FPS): void {
    this.finishAttack();
    if (!this.held) this.set('walk', fps);
  }

  /** How long the attack takes to reach its strike frame, ms. */
  msToStrike(): number {
    return this.art.strike * this.attackFrameMs();
  }

  /** One attack: `onStrike` fires on the strike frame; resolves back in the idle loop. */
  attack(onStrike?: () => void): Promise<void> {
    this.finishAttack();
    this.strike = onStrike ?? null;
    const promise = new Promise<void>((resolve) => {
      this.done = resolve;
    });
    if (this.held) {
      // Reviewing a pose: the blow still lands, the loop goes on.
      this.finishAttack();
      return promise;
    }
    this.pose = 'attack';
    this.frame = 0;
    this.clock = 0;
    this.show();
    if (this.art.strike <= 0) this.fireStrike();
    return promise;
  }

  update(delta: number): void {
    this.clock += delta;
    const hold = this.pose === 'attack' && !this.held ? this.attackFrameMs() : 1000 / this.fps;
    if (this.clock < hold) return;
    this.clock -= hold;
    const count = this.art.frames[this.pose];
    if (this.pose === 'attack' && !this.held) {
      if (this.frame + 1 >= count) {
        this.idle();
        return;
      }
      this.frame++;
      if (this.frame === this.art.strike) this.fireStrike();
    } else this.frame = (this.frame + 1) % count;
    this.show();
  }

  /** Where a shot leaves, in native pixels: the manifest's point, mirrored when facing left. */
  shotPoint(): { x: number; y: number } {
    const at = this.art.shotFrom ?? { x: this.art.footX + 12, y: this.art.footY - 30 };
    const dx = at.x - this.art.footX;
    return { x: this.feet.x + (this.left ? -dx : dx), y: this.feet.y - this.lift + at.y - this.art.footY };
  }

  /** Where a blow or a shot lands on this figure: a little above its feet. */
  chest(): { x: number; y: number } {
    return { x: this.feet.x, y: this.feet.y - Math.min(24, Math.round(this.art.footY * 0.25)) };
  }

  destroy(): void {
    this.sprite.destroy();
  }

  private attackFrameMs(): number {
    return Math.max(ATTACK_FRAME_MS, MIN_ATTACK_MS / this.art.frames.attack);
  }

  private fireStrike(): void {
    const strike = this.strike;
    this.strike = null;
    strike?.();
  }

  private set(pose: Pose, fps: number): void {
    if (this.pose !== pose) {
      this.frame = 0;
      this.clock = 0;
    }
    this.pose = pose;
    this.fps = fps;
    this.frame %= this.art.frames[pose];
    this.show();
  }

  /** Ends an attack cut short, firing what it still owes. */
  private finishAttack(): void {
    const done = this.done;
    this.done = null;
    this.fireStrike();
    done?.();
  }

  private show(): void {
    this.sprite.setTexture(this.key(this.pose), this.frame);
    this.place();
  }

  /**
   * Pins the feet: Phaser mirrors a flipped frame within its own bounds, so a
   * figure facing left takes its origin from the mirrored foot column.
   */
  private place(): void {
    const a = this.art;
    const foot = this.pose === 'walk' ? a.walkFootX ?? a.footX : a.footX;
    this.sprite
      .setFlipX(this.left)
      .setDisplayOrigin(this.left ? a.w - 1 - foot : foot, a.footY)
      .setPosition(this.feet.x + this.nudge, this.feet.y - this.lift)
      .setDepth(FIGURE_DEPTH + (this.sortLine ?? this.feet.y));
  }
}
