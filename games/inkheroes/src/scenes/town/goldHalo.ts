import type Phaser from 'phaser';
import type { Pixels } from '../battle/pixelScenery';
import { PixelImage } from '../battle/pixelUi';

/** How far the halo sits outside the box it rings, pixels. */
const PAD = 3;
/** Its two rings, outer then inner: a bright gold that reads on the dark wood. */
const RINGS = [
  [255, 236, 150, 255],
  [236, 186, 64, 255],
] as const;

/** A w × h picture of the halo's rings, square-cornered. */
export function haloPixels(w: number, h: number): Pixels {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const ring = Math.min(x, y, w - 1 - x, h - 1 - y);
      const c = RINGS[ring];
      if (c) data.set(c, (y * w + x) * 4);
    }
  }
  return { data, w, h };
}

/** A gold ring just outside a w × h box, breathing so the eye finds it: the guide's "tap here". */
export class GoldHalo {
  private readonly pic: PixelImage;
  private readonly tween: Phaser.Tweens.Tween;

  constructor(scene: Phaser.Scene, w: number, h: number) {
    this.pic = new PixelImage(scene, haloPixels(w + PAD * 2, h + PAD * 2));
    this.tween = scene.tweens.add({ targets: this.pic.img, alpha: { from: 1, to: 0.45 }, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  get img(): Phaser.GameObjects.Image {
    return this.pic.img;
  }

  /** Rings the box whose top-left is (x, y). */
  setPosition(x: number, y: number): this {
    this.pic.setPosition(x - PAD, y - PAD);
    return this;
  }

  setVisible(on: boolean): this {
    this.pic.img.setVisible(on);
    return this;
  }

  destroy(): void {
    this.tween.remove();
    this.pic.destroy();
  }
}
