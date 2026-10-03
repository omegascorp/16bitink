import Phaser from 'phaser';
import { ART_RES, boilKey } from '../../art/textures';
import { capsuleTouchesCircle, type Capsule } from '../../logic/body';
import { bottleDropX, bottlesToDrop } from '../../logic/bottles';
import { rangeOf, type Rng } from '../../logic/rng';
import { WATER } from '../../logic/water';

interface Point {
  readonly x: number;
  readonly y: number;
}

interface Bottle {
  readonly sprite: Phaser.GameObjects.Image;
  readonly sway: number;
}

/** Sinking speed, world units per second: slow enough to swim up and meet. */
const SINK = 55;
/** Pause between two bottles going in, and after one smashes, ms. */
const STAGGER_MS = 1600;
const AFTER_SMASH_MS = 2200;
/** How much of the current a sinking bottle feels. */
const CURRENT_SHARE = 0.4;
const CATCH_RADIUS = 18;
const BLUE = 0x1f3f8a;
const WASH = 0x3466c2;
const GLASS = 0xcfe0e6;

/**
 * The "Ink bottles" task: bottles of ink tossed in from above sink one or two
 * at a time. Catch them on the way down; one that reaches the seabed smashes
 * into a cloud of ink and a new one follows.
 */
export class InkBottles {
  private bottles: Bottle[] = [];
  private caught = 0;
  private nextDropAt: number;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly count: number,
    private readonly world: { readonly width: number },
    private readonly floorAt: (x: number) => number,
    private readonly rng: Rng,
  ) {
    this.nextDropAt = scene.time.now + 800;
  }

  /** The bottles still sinking, for goal arrows. */
  get targets(): readonly Point[] {
    return this.bottles.map((b) => b.sprite);
  }

  /** Drops new bottles near the player, sinks the rest. Returns where any smashed. */
  update(now: number, dt: number, frame: number, playerX: number, current: number): Point[] {
    if (now >= this.nextDropAt && bottlesToDrop(this.count, this.caught, this.bottles.length) > 0) {
      this.bottles = [...this.bottles, this.drop(playerX)];
      this.nextDropAt = now + STAGGER_MS;
    }
    for (const b of this.bottles) {
      const s = b.sprite.setTexture(boilKey('inkbottle', frame));
      s.y += SINK * dt;
      s.x = Phaser.Math.Clamp(s.x + (Math.sin(now / 800 + b.sway) * 16 + current * CURRENT_SHARE) * dt, 40, this.world.width - 40);
      s.rotation = Math.sin(now / 1100 + b.sway) * 0.5;
    }
    const broken = this.bottles.filter((b) => b.sprite.y >= this.floorAt(b.sprite.x) - 12);
    if (broken.length === 0) return [];
    this.bottles = this.bottles.filter((b) => !broken.includes(b));
    const smashed = broken.map((b) => ({ x: b.sprite.x, y: this.floorAt(b.sprite.x) - 10 }));
    for (const b of broken) b.sprite.destroy();
    for (const p of smashed) inkSplash(this.scene, p.x, p.y, this.rng);
    this.nextDropAt = Math.max(this.nextDropAt, now + AFTER_SMASH_MS);
    return smashed;
  }

  /** Catches the bottles the player's body touches; returns where each one was. */
  collect(body: Capsule): Point[] {
    const got = this.bottles.filter((b) => capsuleTouchesCircle(body, b.sprite.x, b.sprite.y, CATCH_RADIUS));
    if (got.length === 0) return [];
    this.bottles = this.bottles.filter((b) => !got.includes(b));
    this.caught += got.length;
    return got.map((b) => {
      const at = { x: b.sprite.x, y: b.sprite.y };
      this.scene.tweens.add({ targets: b.sprite, scale: 0, alpha: 0, duration: 220, ease: 'Back.In', onComplete: () => b.sprite.destroy() });
      return at;
    });
  }

  private drop(playerX: number): Bottle {
    const x = bottleDropX(playerX, this.world.width, this.rng);
    const sprite = this.scene.add.image(x, WATER.surface, boilKey('inkbottle', 0)).setDepth(13).setScale(0.8 / ART_RES);
    return { sprite, sway: this.rng() * Math.PI * 2 };
  }
}

/** A bottle breaks on the seabed: glass shards skitter off and its ink billows up and fades. */
function inkSplash(scene: Phaser.Scene, x: number, y: number, rng: Rng): void {
  for (let i = 0; i < 6; i++) {
    const blot = scene.add.circle(x + rangeOf(rng, -10, 10), y - rangeOf(rng, 0, 12), rangeOf(rng, 8, 16), i % 2 ? WASH : BLUE, 0.55).setDepth(12);
    scene.tweens.add({
      targets: blot,
      x: blot.x + rangeOf(rng, -40, 40),
      y: blot.y - rangeOf(rng, 20, 70),
      scale: rangeOf(rng, 2.2, 3.4),
      alpha: 0,
      duration: rangeOf(rng, 2200, 3200),
      ease: 'Sine.Out',
      onComplete: () => blot.destroy(),
    });
  }
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI * (0.1 + 0.8 * (i / 4));
    const shard = scene.add.triangle(x, y, 0, 0, 5, 1, 2, 6, GLASS, 0.9).setStrokeStyle(1, 0x1b1a1f, 0.8).setDepth(13);
    scene.tweens.add({
      targets: shard,
      x: x + Math.cos(a) * rangeOf(rng, 20, 45),
      y: y + Math.sin(a) * rangeOf(rng, 6, 18) + 8,
      angle: rangeOf(rng, -240, 240),
      alpha: 0,
      duration: rangeOf(rng, 700, 1100),
      ease: 'Quad.Out',
      onComplete: () => shard.destroy(),
    });
  }
}
