import Phaser from 'phaser';
import { paintAtlasChunk } from '../../art/atlas';
import { makeCanvas } from '../../art/pen';
import type { MapLayout } from './layout';

/** World px down one baked band of the page. */
const CHUNK = 1024;
/** World px each band reaches past its neighbours, so their edges overlap instead of leaving a hairline. */
const OVERLAP = 2;
/** Bands kept either side of the view; anything further is freed. */
const KEEP = 1;

/**
 * The Atlas page, baked in horizontal bands around the camera and freed
 * when far away, so the whole climb never sits in memory at once. At most
 * one new band is baked per frame while scrolling, so it never stalls.
 */
export class MapView {
  private readonly chunks = new Map<number, Phaser.GameObjects.Image>();
  private readonly count: number;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly layout: MapLayout,
    private readonly layer: Phaser.GameObjects.Layer,
    /** Texture px per world px. */
    private readonly res: number,
  ) {
    this.count = Math.ceil(layout.height / CHUNK);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroy());
  }

  /** Bakes whatever the view [top, bottom] needs: all of it now if `all`, else one band. */
  update(top: number, bottom: number, all = false): void {
    const first = Math.max(0, Math.floor(top / CHUNK) - 1);
    const last = Math.min(this.count - 1, Math.floor(bottom / CHUNK) + 1);
    for (const [i, img] of this.chunks) {
      if (i >= first - KEEP && i <= last + KEEP) continue;
      img.destroy();
      this.free(i);
      this.chunks.delete(i);
    }
    const mid = (top + bottom) / 2 / CHUNK;
    const missing: number[] = [];
    for (let i = first; i <= last; i++) if (!this.chunks.has(i)) missing.push(i);
    missing.sort((a, b) => Math.abs(a + 0.5 - mid) - Math.abs(b + 0.5 - mid));
    for (const i of all ? missing : missing.slice(0, 1)) this.bake(i);
  }

  private key(i: number): string {
    return `atlas-${i}`;
  }

  private free(i: number): void {
    if (this.scene.textures.exists(this.key(i))) this.scene.textures.remove(this.key(i));
  }

  private bake(i: number): void {
    const y0 = Math.max(0, i * CHUNK - OVERLAP);
    const h = Math.min(CHUNK + OVERLAP * 2, this.layout.height - y0);
    const { canvas, ctx } = makeCanvas(Math.ceil(this.layout.width * this.res), Math.ceil(h * this.res));
    ctx.scale(this.res, this.res);
    ctx.translate(0, -y0);
    paintAtlasChunk(ctx, this.layout, y0, h);
    this.free(i);
    // A plain image texture: addCanvas would keep a second, read-back copy.
    this.scene.textures.addImage(this.key(i), canvas as unknown as HTMLImageElement);
    const img = this.scene.add.image(0, y0, this.key(i)).setOrigin(0).setDisplaySize(this.layout.width, h);
    this.layer.add(img);
    this.layer.sendToBack(img);
    this.chunks.set(i, img);
  }

  private destroy(): void {
    for (const [i, img] of this.chunks) {
      img.destroy();
      this.free(i);
    }
    this.chunks.clear();
  }
}
