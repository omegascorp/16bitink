import Phaser from 'phaser';
import { BOIL } from '../../art/palette';
import { snakeArt } from '../../art/snakes/index';
import { TEX } from '../../art/textures';
import type { SnakeId } from '../../logic/species';

export type PortraitMood = 'happy' | 'glum';

/**
 * The snake's portrait on the result card: its head big, looking up out of
 * a pool of wash. Happy: tongue flicking, a little bob. Glum: head drooped
 * to one side, a slow sigh.
 */
export class SnakePortrait {
  readonly root: Phaser.GameObjects.Container;
  private readonly head: Phaser.GameObjects.Image;
  private readonly tongue: Phaser.GameObjects.Image;

  constructor(private readonly scene: Phaser.Scene, private readonly id: SnakeId, x: number, y: number, private readonly mood: PortraitMood, size = 1) {
    const art = snakeArt(id);
    // The head about 120 units long, wherever its frame puts it.
    const k = (2.4 * size) / art.head.res;
    this.tongue = scene.add.image(0, -art.snout * 2.4 * size, TEX.tongue(id, 0)).setScale((2.4 * size) / art.tongue.res).setAngle(-90).setVisible(false);
    this.head = scene.add.image(0, 0, TEX.head(id, 'shut', 0)).setScale(k).setAngle(-90);
    this.root = scene.add.container(x, y, [this.tongue, this.head]);
    if (mood === 'glum') this.root.setAngle(-14);
  }

  update(time: number): void {
    const f = Math.floor(time / 150) % BOIL;
    if (this.mood === 'happy') {
      // Tasting the air: the tongue flicks out in quick bursts.
      const flick = time % 1100 < 700;
      this.head.setTexture(TEX.head(this.id, 'shut', f));
      this.tongue.setVisible(flick).setTexture(TEX.tongue(this.id, f)).setAngle(-90 + Math.sin(time / 30) * 10);
      this.root.setY(this.root.y + Math.sin(time / 180) * 0.15);
    } else {
      this.head.setTexture(TEX.head(this.id, 'shut', f));
      this.root.setScale(1 + Math.sin(time / 900) * 0.015);
    }
  }
}
