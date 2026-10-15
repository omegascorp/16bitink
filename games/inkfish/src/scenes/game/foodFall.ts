import Phaser from 'phaser';
import { ART_RES, boilKey } from '../../art/textures';
import type { FoodId } from '../../levels/foodFalls';
import { capsuleTouchesCircle, type Capsule } from '../../logic/body';
import { morselDropX, morselsToDrop } from '../../logic/foodFall';
import { rangeOf, type Rng } from '../../logic/rng';
import { WATER } from '../../logic/water';

interface Point {
  readonly x: number;
  readonly y: number;
}

interface Morsel {
  readonly sprite: Phaser.GameObjects.Image;
  readonly sway: number;
}

/** Sinking speed, world units per second: slow enough to swim up and meet. */
const SINK = 55;
/** Pause between two pieces going in, and after the scavengers take one, ms. */
const STAGGER_MS = 1600;
const AFTER_LOST_MS = 2200;
/** How much of the current a sinking piece feels. */
const CURRENT_SHARE = 0.4;
const CATCH_RADIUS = 18;
const SILT = 0xb8a58a;
const SILT_DARK = 0x8a7a62;

/**
 * The "Food fall" task: the zone's food sinks from above one or two pieces at
 * a time. Eat them on the way down; one that reaches the seabed is taken by
 * the scavengers there, in a puff of silt, and a new one follows.
 */
export class FoodFall {
  private morsels: Morsel[] = [];
  private eaten = 0;
  private nextDropAt: number;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly kind: FoodId,
    private readonly count: number,
    private readonly floorAt: (x: number) => number,
    private readonly rng: Rng,
  ) {
    this.nextDropAt = scene.time.now + 800;
  }

  /** The pieces still sinking, for goal arrows. */
  get targets(): readonly Point[] {
    return this.morsels.map((m) => m.sprite);
  }

  /** Drops new pieces near the player, sinks the rest. Returns where any were lost to the seabed. */
  update(now: number, dt: number, frame: number, playerX: number, current: number): Point[] {
    if (now >= this.nextDropAt && morselsToDrop(this.count, this.eaten, this.morsels.length) > 0) {
      this.morsels = [...this.morsels, this.drop(playerX)];
      this.nextDropAt = now + STAGGER_MS;
    }
    for (const m of this.morsels) {
      const s = m.sprite.setTexture(boilKey(`food-${this.kind}`, frame));
      s.y += SINK * dt;
      s.x += (Math.sin(now / 800 + m.sway) * 16 + current * CURRENT_SHARE) * dt;
      s.rotation = Math.sin(now / 1100 + m.sway) * 0.5;
    }
    const landed = this.morsels.filter((m) => m.sprite.y >= this.floorAt(m.sprite.x) - 12);
    if (landed.length === 0) return [];
    this.morsels = this.morsels.filter((m) => !landed.includes(m));
    const lost = landed.map((m) => ({ x: m.sprite.x, y: this.floorAt(m.sprite.x) - 10 }));
    for (const m of landed) this.snatch(m.sprite);
    for (const p of lost) siltPuff(this.scene, p.x, p.y, this.rng);
    this.nextDropAt = Math.max(this.nextDropAt, now + AFTER_LOST_MS);
    return lost;
  }

  /** Eats the pieces the player's body touches; returns where each one was. */
  eat(body: Capsule): Point[] {
    const got = this.morsels.filter((m) => capsuleTouchesCircle(body, m.sprite.x, m.sprite.y, CATCH_RADIUS));
    if (got.length === 0) return [];
    this.morsels = this.morsels.filter((m) => !got.includes(m));
    this.eaten += got.length;
    return got.map((m) => {
      const at = { x: m.sprite.x, y: m.sprite.y };
      this.scene.tweens.add({ targets: m.sprite, scale: 0, alpha: 0, duration: 220, ease: 'Back.In', onComplete: () => m.sprite.destroy() });
      return at;
    });
  }

  private drop(playerX: number): Morsel {
    const x = morselDropX(playerX, this.rng);
    const sprite = this.scene.add.image(x, WATER.surface, boilKey(`food-${this.kind}`, 0)).setDepth(13).setScale(0.8 / ART_RES);
    return { sprite, sway: this.rng() * Math.PI * 2 };
  }

  /** Something on the seabed grabs it: a couple of tugs, then it's dragged into the silt. */
  private snatch(sprite: Phaser.GameObjects.Image): void {
    this.scene.tweens.chain({
      targets: sprite,
      tweens: [
        { x: sprite.x - 4, angle: -18, duration: 110, yoyo: true, repeat: 1 },
        { y: sprite.y + 14, scaleY: 0, alpha: 0, duration: 380, ease: 'Quad.In', onComplete: () => sprite.destroy() },
      ],
    });
  }
}

/** A scavenger stirs up the seabed: a low cloud of silt spreads and settles. */
function siltPuff(scene: Phaser.Scene, x: number, y: number, rng: Rng): void {
  for (let i = 0; i < 7; i++) {
    const blot = scene.add.circle(x + rangeOf(rng, -12, 12), y - rangeOf(rng, 0, 8), rangeOf(rng, 6, 12), i % 2 ? SILT : SILT_DARK, 0.6).setDepth(12);
    scene.tweens.add({
      targets: blot,
      x: blot.x + rangeOf(rng, -50, 50),
      y: blot.y - rangeOf(rng, 8, 30),
      scale: rangeOf(rng, 2, 3),
      alpha: 0,
      duration: rangeOf(rng, 1600, 2400),
      ease: 'Sine.Out',
      onComplete: () => blot.destroy(),
    });
  }
}
