import Phaser from 'phaser';
import { ART_RES } from '../../art/palette';
import { chunkHasRoots, drawRootChunk } from '../../art/roots';
import { CHUNK_PAD, type ChunkRect } from '../../art/sand';
import type { Roots } from '../../logic/roots';
import { surfaceRow, type Terrain } from '../../logic/terrain';

const CHUNK_TILES = 16;
/** Behind the sand (so roots run down into the mud), in front of the backdrop. */
const DEPTH = 0.97;

/** Each view's textures get their own prefix, so a restarted level never collides with the last. */
let views = 0;

/**
 * The mangrove roots and crowns, drawn once in chunks when the level
 * starts: roots never change. Chunks with nothing in them are skipped.
 */
export class RootsView {
  private readonly keys: string[] = [];
  private readonly prefix = `roots${++views}`;

  constructor(private readonly scene: Phaser.Scene, terrain: Terrain, roots: Roots, tile: number) {
    const ground = (x: number): number => surfaceRow(terrain, x);
    const px = (CHUNK_TILES * tile + CHUNK_PAD * 2) * ART_RES;
    for (let cy = 0; cy * CHUNK_TILES < roots.height; cy++) {
      for (let cx = 0; cx * CHUNK_TILES < roots.width; cx++) {
        const rect: ChunkRect = { tx: cx * CHUNK_TILES, ty: cy * CHUNK_TILES, tiles: CHUNK_TILES };
        if (!chunkHasRoots(roots, rect, tile)) continue;
        const canvas = document.createElement('canvas');
        canvas.width = px;
        canvas.height = px;
        const ctx = canvas.getContext('2d');
        if (!ctx) continue;
        drawRootChunk(ctx, roots, rect, tile, ART_RES, CHUNK_PAD, ground);
        const key = `${this.prefix}-${cx},${cy}`;
        if (!scene.textures.addCanvas(key, canvas)) continue;
        this.keys.push(key);
        scene.add.image(rect.tx * tile - CHUNK_PAD, rect.ty * tile - CHUNK_PAD, key).setOrigin(0).setScale(1 / ART_RES).setDepth(DEPTH);
      }
    }
  }

  /** Frees the chunk textures (the texture manager is shared by every scene). */
  destroy(): void {
    for (const key of this.keys) this.scene.textures.remove(key);
    this.keys.length = 0;
  }
}
