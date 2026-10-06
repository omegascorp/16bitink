import Phaser from 'phaser';
import { nearestOnRing } from '../../logic/ring';

/** Something stretched under the whole view that slides along with it: the paper, the night. */
type Backdrop = Phaser.GameObjects.TileSprite | Phaser.GameObjects.Rectangle;

interface ParallaxSet {
  readonly objs: readonly Phaser.GameObjects.Image[];
  readonly factor: number;
  readonly period: number;
}

/**
 * Keeps the level a seamless ring (see logic/ring.ts). Once a frame, after
 * everything has moved and before it's drawn, every image is put at its copy
 * nearest the camera. Graphics, shapes and tile sprites are drawn where their
 * owners put them, which is always near the player, so they're left alone;
 * full-width backdrops slide along under the view instead.
 */
export class Ring {
  private readonly backdrops: Backdrop[] = [];
  private readonly parallax: ParallaxSet[] = [];

  constructor(private readonly scene: Phaser.Scene, readonly width: number) {
    scene.events.on(Phaser.Scenes.Events.POST_UPDATE, this.update, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => scene.events.off(Phaser.Scenes.Events.POST_UPDATE, this.update, this));
  }

  /** A backdrop one ring wide that follows the camera; a tile sprite keeps its pattern fixed to the world. */
  follow(obj: Backdrop): void {
    this.backdrops.push(obj);
  }

  /** Far-off scenery scrolling at `factor` of the camera, repeating every `period` px of its own. */
  addParallax(objs: readonly Phaser.GameObjects.Image[], factor: number, period: number): void {
    if (objs.length) this.parallax.push({ objs, factor, period });
  }

  private update(): void {
    const cam = this.scene.cameras.main;
    const cx = cam.midPoint.x;
    const w = this.width;
    const list = this.scene.children.list;
    for (let i = 0; i < list.length; i++) {
      const o = list[i];
      if (!(o instanceof Phaser.GameObjects.Image) || o.scrollFactorX !== 1) continue;
      // By the centre, so wide pieces (baked seabed chunks) swap over when out of sight.
      const centre = o.x + (0.5 - o.originX) * o.displayWidth;
      const moved = nearestOnRing(centre, cx, w);
      if (moved !== centre) o.x += moved - centre;
    }
    for (const b of this.backdrops) {
      b.x = cx - b.width / 2;
      if (b instanceof Phaser.GameObjects.TileSprite) b.tilePositionX = b.x;
    }
    for (const p of this.parallax) {
      const centre = cam.scrollX * p.factor + cam.width / 2;
      for (const o of p.objs) o.x = nearestOnRing(o.x, centre, p.period);
    }
  }
}
