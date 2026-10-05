import Phaser from 'phaser';
import { ART_RES } from '../../art/palette';
import { CHUNK_PAD, chunkHasGround, drawChunk, makeSandPatterns, type ChunkRect, type SandPatterns } from '../../art/sand';
import type { TilePos } from '../../logic/dig';
import type { Terrain } from '../../logic/terrain';

const CHUNK_TILES = 16;

interface Chunk {
  readonly rect: ChunkRect;
  readonly ctx: CanvasRenderingContext2D;
  readonly texture: Phaser.Textures.CanvasTexture;
}

/** The sand, drawn in chunks that are redrawn only when a dig or a clump changes them. */
export class TerrainView {
  private readonly chunks = new Map<string, Chunk>();
  private readonly dirty = new Set<string>();
  private patterns: SandPatterns | null = null;

  constructor(private readonly scene: Phaser.Scene, private readonly terrain: Terrain, private readonly tile: number) {
    for (let cy = 0; cy * CHUNK_TILES < terrain.height; cy++) {
      for (let cx = 0; cx * CHUNK_TILES < terrain.width; cx++) this.dirty.add(`${cx},${cy}`);
    }
    this.flush();
  }

  /**
   * Marks the chunks around changed tiles; a tile shapes the cells on all four
   * of its corners. Chunks further down its column are redrawn too, since
   * opening or closing a roof changes which hollows below count as burrows.
   */
  invalidate(tiles: readonly TilePos[]): void {
    for (const [x, y] of tiles) {
      const cx = Math.floor(x / CHUNK_TILES);
      for (let cy = Math.floor(y / CHUNK_TILES) + 1; cy * CHUNK_TILES < this.terrain.height; cy++) this.dirty.add(`${cx},${cy}`);
      for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, 0]] as const) {
        const cx = Math.floor((x + dx) / CHUNK_TILES);
        const cy = Math.floor((y + dy) / CHUNK_TILES);
        if (cx >= 0 && cy >= 0 && cx * CHUNK_TILES < this.terrain.width && cy * CHUNK_TILES < this.terrain.height) this.dirty.add(`${cx},${cy}`);
      }
    }
  }

  flush(): void {
    for (const key of this.dirty) {
      const [cx, cy] = key.split(',').map(Number) as [number, number];
      const rect: ChunkRect = { tx: cx * CHUNK_TILES, ty: cy * CHUNK_TILES, tiles: CHUNK_TILES };
      const chunk = this.chunks.get(key) ?? (chunkHasGround(this.terrain, rect) ? this.create(key, rect) : null);
      if (!chunk) continue;
      drawChunk(chunk.ctx, this.terrain, rect, this.tile, ART_RES, this.patternsFor(chunk.ctx));
      chunk.texture.refresh();
    }
    this.dirty.clear();
  }

  private patternsFor(ctx: CanvasRenderingContext2D): SandPatterns {
    this.patterns ??= makeSandPatterns(ctx, ART_RES);
    return this.patterns;
  }

  private create(key: string, rect: ChunkRect): Chunk | null {
    const px = (CHUNK_TILES * this.tile + CHUNK_PAD * 2) * ART_RES;
    const canvas = document.createElement('canvas');
    canvas.width = px;
    canvas.height = px;
    const ctx = canvas.getContext('2d');
    const texture = this.scene.textures.addCanvas(`sand-${key}`, canvas);
    if (!ctx || !texture) return null;
    this.scene.add.image(rect.tx * this.tile - CHUNK_PAD, rect.ty * this.tile - CHUNK_PAD, texture).setOrigin(0).setScale(1 / ART_RES).setDepth(1);
    const chunk = { rect, ctx, texture };
    this.chunks.set(key, chunk);
    return chunk;
  }
}
