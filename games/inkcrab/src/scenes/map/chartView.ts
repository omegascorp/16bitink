import Phaser from 'phaser';
import { drawChartChunk } from '../../art/map/chart';
import { makeCanvas } from '../../art/pen';
import type { MapLayout } from './layout';

/** World px across one baked chunk of the chart. */
const CHUNK = 1024;
/** World px each chunk reaches past its neighbours, so their opaque edges overlap instead of leaving a hairline. */
const OVERLAP = 2;
/** Chunks kept either side of the view; anything further is freed. */
const KEEP = 2;

/**
 * The chart's background, baked in chunks around the camera and freed when
 * far away, so a hundred-level chart never sits in memory whole. At most
 * one new chunk is baked per frame while scrolling, so it never stalls.
 */
export class ChartView {
  private readonly chunks = new Map<number, Phaser.GameObjects.Image>();
  private readonly count: number;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly layout: MapLayout,
    private readonly layer: Phaser.GameObjects.Layer,
    /** Texture px per world px. */
    private readonly res: number,
  ) {
    this.count = Math.ceil(layout.width / CHUNK);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroy());
  }

  /** Bakes whatever the view [left, right] needs: all of it now if `all`, else one chunk. */
  update(left: number, right: number, all = false): void {
    const first = Math.max(0, Math.floor(left / CHUNK) - 1);
    const last = Math.min(this.count - 1, Math.floor(right / CHUNK) + 1);
    for (const [i, img] of this.chunks) {
      if (i >= first - KEEP && i <= last + KEEP) continue;
      img.destroy();
      this.scene.textures.remove(this.key(i));
      this.chunks.delete(i);
    }
    // Nearest the middle of the view first.
    const mid = (left + right) / 2 / CHUNK;
    const missing = [];
    for (let i = first; i <= last; i++) if (!this.chunks.has(i)) missing.push(i);
    missing.sort((a, b) => Math.abs(a + 0.5 - mid) - Math.abs(b + 0.5 - mid));
    for (const i of all ? missing : missing.slice(0, 1)) this.bake(i);
  }

  private key(i: number): string {
    return `chart-${i}`;
  }

  private bake(i: number): void {
    const x0 = i * CHUNK - OVERLAP;
    const w = Math.min(CHUNK + OVERLAP * 2, this.layout.width - x0);
    const { canvas, ctx } = makeCanvas(Math.ceil(w * this.res), Math.ceil(this.layout.height * this.res));
    ctx.scale(this.res, this.res);
    ctx.translate(-x0, 0);
    drawChartChunk(ctx, this.layout, x0, w, i);
    const key = this.key(i);
    if (this.scene.textures.exists(key)) this.scene.textures.remove(key);
    this.scene.textures.addCanvas(key, canvas);
    const img = this.scene.add.image(x0, 0, key).setOrigin(0).setDisplaySize(w, this.layout.height);
    this.layer.add(img);
    this.chunks.set(i, img);
  }

  private destroy(): void {
    for (const [i, img] of this.chunks) {
      img.destroy();
      this.scene.textures.remove(this.key(i));
    }
    this.chunks.clear();
  }
}
