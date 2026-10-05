import Phaser from 'phaser';
import { ensureFishGlow } from '../../art/textures';
import type { FishShape } from '../../art/fishArt';
import { keepDepth } from './sync';

/**
 * Glow twins: a glow layer laid over a drawing with additive blending,
 * following the sprite (position, turn, flip, fade) until it's destroyed.
 * The level uses them in the deep zones (deepLight.ts), the map for its
 * deep chapters.
 */
export interface GlowOpts {
  /** Peak brightness, 0..1. */
  readonly alpha?: number;
  /** Tint for the plain soft dot; glow layers with their own colours leave it out. */
  readonly tint?: number;
  /** Pulses per second; 0 for a steady light. */
  readonly pulse?: number;
  /** Depth above the sprite it glows on. */
  readonly lift?: number;
  /** Fixed depth for the glow, for scenery that sits under the night layer. */
  readonly depth?: number;
  /** Centre the glow on the sprite instead of copying its origin: fish show a body frame pivoted on their centre. */
  readonly centred?: boolean;
}

interface Twin {
  readonly glow: Phaser.GameObjects.Image;
  readonly alpha: number;
  readonly pulse: number;
  readonly phase: number;
  readonly lift: number;
  readonly depth: number | undefined;
  readonly originX: number;
  readonly originY: number;
}

export class GlowTwins {
  private readonly twins = new Map<Phaser.GameObjects.Image, Twin>();
  private readonly tracked = new WeakSet<Phaser.GameObjects.Image>();

  /**
   * `ordered`: the caller stacks the glows itself (the map adds them to its
   * layer right after their sprite), so twins leave depth alone.
   */
  constructor(private readonly scene: Phaser.Scene, private readonly ordered = false) {
    scene.events.on(Phaser.Scenes.Events.POST_UPDATE, this.follow, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => scene.events.off(Phaser.Scenes.Events.POST_UPDATE, this.follow, this));
  }

  /** Gives a fish its glow layer, once; returns null for fish without lights. */
  trackFish(sprite: Phaser.GameObjects.Image, shape: FishShape): Phaser.GameObjects.Image | null {
    if (this.tracked.has(sprite)) return null;
    this.tracked.add(sprite);
    const key = ensureFishGlow(this.scene, shape);
    return key ? this.attach(sprite, key, { alpha: 0.9, pulse: 0.35, centred: true }) : null;
  }

  /** Lays a glow twin over `sprite`, following it until it's destroyed. */
  attach(sprite: Phaser.GameObjects.Image, key: string, opts: GlowOpts = {}): Phaser.GameObjects.Image | null {
    if (this.twins.has(sprite)) return null;
    const glow = this.scene.add.image(sprite.x, sprite.y, key).setBlendMode(Phaser.BlendModes.ADD);
    if (opts.tint !== undefined) glow.setTint(opts.tint);
    const twin: Twin = {
      glow, alpha: opts.alpha ?? 1, pulse: opts.pulse ?? 0, phase: Math.random() * Math.PI * 2, lift: opts.lift ?? 0.05, depth: opts.depth,
      originX: opts.centred ? 0.5 : sprite.originX, originY: opts.centred ? 0.5 : sprite.originY,
    };
    this.twins.set(sprite, twin);
    sprite.once(Phaser.GameObjects.Events.DESTROY, () => {
      this.twins.delete(sprite);
      glow.destroy();
    });
    this.place(sprite, twin, this.scene.time.now);
    return glow;
  }

  private follow(): void {
    const now = this.scene.time.now;
    this.twins.forEach((twin, sprite) => this.place(sprite, twin, now));
  }

  private place(s: Phaser.GameObjects.Image, twin: Twin, now: number): void {
    const breathe = twin.pulse ? 0.7 + 0.3 * Math.sin((now / 1000) * twin.pulse * Math.PI * 2 + twin.phase) : 1;
    // Dead or stunned fish (tinted) go dim.
    const lit = s.isTinted ? 0.25 : 1;
    twin.glow.setPosition(s.x, s.y).setRotation(s.rotation).setScale(s.scaleX, s.scaleY).setFlip(s.flipX, s.flipY)
      .setOrigin(twin.originX, twin.originY).setVisible(s.visible).setAlpha(s.alpha * twin.alpha * breathe * lit);
    if (!this.ordered) keepDepth(twin.glow, twin.depth ?? s.depth + twin.lift);
  }
}
