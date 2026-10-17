import Phaser from 'phaser';
import { CHUNK_PAD, chunkHasGround, drawChunk, makeGroundPatterns, roofRows, type ChunkRect, type GroundPatterns, type TooHard } from '../../art/ground';
import { ART_RES, type GroundStyle } from '../../art/palette';
import type { Terrain, TilePos } from '../../logic/terrain';

const CHUNK_TILES = 16;
/** Chunks drawn ahead of the camera on every side. */
const MARGIN = 1;
/** Chunks further than this from the view are freed (their canvas kept for reuse). */
const KEEP = 2;
/** Most chunks drawn in one frame, so scrolling into new ground never hitches. */
const DRAWS_PER_FRAME = 2;

interface Chunk {
  readonly key: string;
  rect: ChunkRect;
  readonly ctx: CanvasRenderingContext2D;
  readonly texture: Phaser.Textures.CanvasTexture;
  readonly image: Phaser.GameObjects.Image;
}

/** Each view's textures get their own prefix, so a restarted level never collides with the last. */
let views = 0;

/**
 * The ground, drawn in chunks around the camera (InkCrab's TerrainView, made
 * to scale to maps many screens deep): only chunks near the view exist,
 * far ones are freed and their canvases reused, and a dig redraws only the
 * chunks it touches.
 *
 * On a wrapping world chunks are placed wherever the camera is, any number
 * of times round, and each is drawn from the folded columns it stands for.
 * The world is a whole number of chunks round, so they repeat cleanly.
 * Chunks are keyed by where they stand; what's dirty, by what they show.
 */
export class GroundView {
  private readonly chunks = new Map<string, Chunk>();
  private readonly pool: Chunk[] = [];
  private readonly dirty = new Set<string>();
  private readonly prefix = `ground${++views}`;
  /** The ground's surface as the builder carved it: anything dug below it is inside the planet, even a shaft open to the sky. */
  private readonly roof: Int32Array;
  /** Chunks round a wrapping world (Infinity otherwise). */
  private readonly around: number;
  private patterns: GroundPatterns | null = null;
  private made = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly terrain: Terrain,
    private readonly tile: number,
    private readonly style: GroundStyle,
    private readonly tooHard: TooHard,
    /** The roof rows (art/ground.ts) of the ground as carved, before a save's digging; by default the ground as given. */
    roof?: Int32Array,
  ) {
    this.roof = roof ?? roofRows(terrain);
    if (terrain.wrap && terrain.width % CHUNK_TILES) throw new Error(`A wrapping world must be a whole number of ${CHUNK_TILES}-tile chunks round`);
    this.around = terrain.wrap ? terrain.width / CHUNK_TILES : Infinity;
  }

  /** The chunk column `cx` shows: folded round a wrapping world. */
  private fold(cx: number): number {
    return Number.isFinite(this.around) ? cx - this.around * Math.floor(cx / this.around) : cx;
  }

  /** Marks the chunks around changed tiles (a tile shapes the cells on all four corners). */
  invalidate(tiles: readonly TilePos[]): void {
    for (const [x, y] of tiles) {
      for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, 0]] as const) {
        this.dirty.add(`${this.fold(Math.floor((x + dx) / CHUNK_TILES))},${Math.floor((y + dy) / CHUNK_TILES)}`);
      }
    }
  }

  /** Redraws everything (after the drill changes, which changes what's too hard). */
  invalidateAll(): void {
    for (const chunk of this.chunks.values()) this.dirty.add(this.shows(chunk.key));
  }

  /** The dirty key for a chunk standing at `key`: the folded chunk it shows. */
  private shows(key: string): string {
    const [cx, cy] = key.split(',').map(Number) as [number, number];
    return `${this.fold(cx)},${cy}`;
  }

  /** Brings the chunks around `view` (world px) up to date. */
  update(view: Phaser.Geom.Rectangle): void {
    const span = CHUNK_TILES * this.tile;
    const cx0 = Math.floor(view.x / span) - MARGIN;
    const cx1 = Math.floor(view.right / span) + MARGIN;
    const cy0 = Math.floor(view.y / span) - MARGIN;
    const cy1 = Math.floor(view.bottom / span) + MARGIN;
    for (const chunk of [...this.chunks.values()]) {
      const [cx, cy] = chunk.key.split(',').map(Number) as [number, number];
      if (cx < cx0 - KEEP || cx > cx1 + KEEP || cy < cy0 - KEEP || cy > cy1 + KEEP) this.free(chunk);
    }
    let budget = DRAWS_PER_FRAME;
    // Visible chunks first, nearest the view's middle first.
    const midX = (cx0 + cx1) / 2;
    const midY = (cy0 + cy1) / 2;
    const wrap = Number.isFinite(this.around);
    const wanted: [number, number][] = [];
    for (let cy = Math.max(0, cy0); cy <= cy1 && cy * CHUNK_TILES < this.terrain.height; cy++) {
      for (let cx = wrap ? cx0 : Math.max(0, cx0); cx <= cx1 && (wrap || cx * CHUNK_TILES < this.terrain.width); cx++) wanted.push([cx, cy]);
    }
    wanted.sort((a, b) => Math.hypot(a[0] - midX, a[1] - midY) - Math.hypot(b[0] - midX, b[1] - midY));
    const redrawn = new Set<string>();
    for (const [cx, cy] of wanted) {
      const key = `${cx},${cy}`;
      const shows = `${this.fold(cx)},${cy}`;
      const have = this.chunks.get(key);
      if (have && !this.dirty.has(shows)) continue;
      const rect: ChunkRect = { tx: this.fold(cx) * CHUNK_TILES, ty: cy * CHUNK_TILES, tiles: CHUNK_TILES };
      if (!have && !chunkHasGround(this.terrain, this.roof, rect)) continue;
      // A dug tile in view is always redrawn at once; new ground arrives a couple of chunks a frame.
      if (!have && budget-- <= 0) continue;
      const chunk = have ?? this.take(key, rect, cx * CHUNK_TILES * this.tile);
      this.draw(chunk);
      redrawn.add(shows);
    }
    for (const shows of redrawn) this.dirty.delete(shows);
  }

  destroy(): void {
    for (const chunk of [...this.chunks.values(), ...this.pool]) {
      chunk.image.destroy();
      this.scene.textures.remove(chunk.texture.key);
    }
    this.chunks.clear();
    this.pool.length = 0;
  }

  private draw(chunk: Chunk): void {
    this.patterns ??= makeGroundPatterns(chunk.ctx, ART_RES, this.style);
    drawChunk(chunk.ctx, this.terrain, this.roof, chunk.rect, this.tile, ART_RES, this.patterns, this.style, this.tooHard);
    chunk.texture.refresh();
  }

  /** A chunk showing `rect`, standing at world x `at` (its left edge, px). */
  private take(key: string, rect: ChunkRect, at: number): Chunk {
    const x = at - CHUNK_PAD;
    const y = rect.ty * this.tile - CHUNK_PAD;
    const reused = this.pool.pop();
    if (reused) {
      const chunk: Chunk = { ...reused, key, rect };
      chunk.image.setPosition(x, y).setVisible(true);
      this.chunks.set(key, chunk);
      return chunk;
    }
    const px = (CHUNK_TILES * this.tile + CHUNK_PAD * 2) * ART_RES;
    const canvas = document.createElement('canvas');
    canvas.width = px;
    canvas.height = px;
    const ctx = canvas.getContext('2d');
    const texture = ctx && this.scene.textures.addCanvas(`${this.prefix}-${this.made++}`, canvas);
    if (!ctx || !texture) throw new Error('Could not make a ground texture');
    const image = this.scene.add.image(x, y, texture).setOrigin(0).setScale(1 / ART_RES).setDepth(1);
    const chunk: Chunk = { key, rect, ctx, texture, image };
    this.chunks.set(key, chunk);
    return chunk;
  }

  private free(chunk: Chunk): void {
    this.chunks.delete(chunk.key);
    chunk.image.setVisible(false);
    this.pool.push(chunk);
  }
}
