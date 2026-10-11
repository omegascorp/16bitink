import Phaser from 'phaser';
import { drawWrack, HEAP_OVERHANG, HEAP_TILES } from '../../art/kelp';
import { ART_RES } from '../../art/palette';
import type { WrackSpec } from '../../logic/kelp';
import { surfaceRow, type Terrain } from '../../logic/terrain';

/** The heap sits behind what's in it (food, creatures, the crab)… */
const DEPTH = 3.9;
/** …with a thin copy in front of the crab while it's down in that heap, so it reads as under the kelp. */
const FRONT_DEPTH = 5.3;
const FRONT_ALPHA = 0.5;
/** Most tiles a heap settles below its highest sand, into a hole dug under it. */
const SETTLE = 3;

let views = 0;

interface Heap {
  readonly spec: WrackSpec;
  readonly texture: Phaser.Textures.CanvasTexture;
  readonly back: Phaser.GameObjects.Image;
  readonly front: Phaser.GameObjects.Image;
  /** The sand rows under it when it was last drawn. */
  rows: string;
}

/**
 * The kelp wrack: each heap drawn lying along the sand under it, and drawn
 * again whenever that sand changes, so a heap settles into a hole dug under
 * it. Food and creatures in a heap show in front of it; the crab down in
 * one gets a thin veil of kelp over it.
 */
export class KelpView {
  private readonly keys: string[] = [];
  private readonly heaps: Heap[] = [];
  private readonly prefix = `kelp${++views}`;

  constructor(scene: Phaser.Scene, private readonly terrain: Terrain, wrack: readonly WrackSpec[], private readonly tile: number) {
    wrack.forEach((spec, i) => {
      const tiles = spec[1] + HEAP_OVERHANG * 2;
      const key = `${this.prefix}-${i}`;
      const texture = scene.textures.createCanvas(key, Math.ceil(tiles * tile * ART_RES), Math.ceil((HEAP_TILES + 1 + SETTLE) * tile * ART_RES));
      if (!texture) return;
      this.keys.push(key);
      const image = (depth: number): Phaser.GameObjects.Image => scene.add.image(0, 0, key).setOrigin(0, 0).setScale(1 / ART_RES).setDepth(depth);
      this.heaps.push({ spec, texture, back: image(DEPTH), front: image(FRONT_DEPTH).setAlpha(FRONT_ALPHA), rows: '' });
    });
    this.update(null);
  }

  /** Redraws any heap whose sand has changed, and veils the heap the crab is in. */
  update(crabIn: WrackSpec | null): void {
    for (const heap of this.heaps) {
      this.settle(heap);
      heap.front.setVisible(heap.spec === crabIn);
    }
  }

  /** Draws the heap on the sand as it is now, if that's changed since it was last drawn. */
  private settle(heap: Heap): void {
    const [col, width] = heap.spec;
    const T = this.tile;
    // Sand rows under the heap's own columns; its loose ends lie level with its nearest column.
    const rows = Array.from({ length: width }, (_, k) => surfaceRow(this.terrain, col + k));
    const sig = rows.join(',');
    if (sig === heap.rows) return;
    heap.rows = sig;
    const high = Math.min(...rows);
    const left = (col - HEAP_OVERHANG) * T;
    const top = (high - HEAP_TILES - 1) * T;
    // The sand line (canvas px) under each point, eased between column middles so steps read as slopes.
    const row = (k: number): number => Math.min(high + SETTLE, rows[Math.max(0, Math.min(width - 1, k))]!);
    const ground = (x: number): number => {
      const c = x / T - HEAP_OVERHANG - 0.5;
      const k = Math.floor(c);
      const f = c - k;
      return (row(k) * (1 - f) + row(k + 1) * f) * T - top;
    };
    const ctx = heap.texture.context;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, heap.texture.width, heap.texture.height);
    ctx.scale(ART_RES, ART_RES);
    drawWrack(ctx, width, T, ground, col * 31 + width);
    heap.texture.refresh();
    heap.back.setPosition(left, top);
    heap.front.setPosition(left, top);
  }

  /** Frees the heap textures (the texture manager is shared by every scene). */
  destroy(scene: Phaser.Scene): void {
    for (const key of this.keys) scene.textures.remove(key);
    this.keys.length = 0;
  }
}
