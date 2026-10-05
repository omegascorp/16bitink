import type Phaser from 'phaser';
import { makeCanvas } from './pen';
import { emptySkyline, fitOn, placeOn, type Skyline } from './skyline';

/**
 * Packs the generated ink textures into a few shared atlas pages, so a frame
 * full of different fish, weeds and props binds a handful of GPU textures
 * instead of dozens (old mobile GPUs batch only ~8 textures per draw call).
 *
 * Every drawing keeps its own texture key: each key is a texture aliasing its
 * page's GPU texture, with its base frame cut to its region. Code using the
 * keys (setTexture, frames, flips, pivots) doesn't change.
 *
 * Regions start on a 16 px grid with at least 16 transparent px between
 * them, so mipmaps down to 1/16 scale never blend one drawing into another.
 */
const PAGE = 2048;
const GRID = 16;
/** Bigger drawings get a texture of their own; they would waste a page. */
const MAX_SIDE = 1024;
/** Phaser.Core.Events.PRE_RENDER, spelled out so this module loads without Phaser (tests import the art). */
const PRE_RENDER = 'prerender';

interface Page {
  readonly key: string;
  readonly texture: Phaser.Textures.CanvasTexture;
  readonly ctx: CanvasRenderingContext2D;
  /** The filled outline, for packing (see skyline.ts). */
  skyline: Skyline;
  dirty: boolean;
}

interface Slot {
  readonly page: Page;
  readonly x: number;
  readonly y: number;
  /** Slot size: the drawing rounded up to the grid, plus the gutter. */
  readonly w: number;
  readonly h: number;
}

const up = (n: number): number => Math.ceil(n / GRID) * GRID;
/** Alpha at or below this counts as clear paper (a stray speck of a stroke's antialiasing). */
const CLEAR_ALPHA = 2;

let scratch: CanvasRenderingContext2D | null = null;

/** True when the outer GRID px of the drawing are transparent all round. */
function clearBorder(source: CanvasImageSource, w: number, h: number): boolean {
  if (w <= GRID * 2 || h <= GRID * 2) return false;
  if (!scratch) {
    const canvas = document.createElement('canvas');
    canvas.width = MAX_SIDE;
    canvas.height = GRID;
    scratch = canvas.getContext('2d', { willReadFrequently: true });
    if (!scratch) return false;
  }
  const ctx = scratch;
  // Each edge strip, laid flat along the scratch canvas (the side strips rotated).
  const strips: [number, number, number, number, boolean][] = [
    [0, 0, w, GRID, false], [0, h - GRID, w, GRID, false], [0, 0, GRID, h, true], [w - GRID, 0, GRID, h, true],
  ];
  for (const [x, y, sw, sh, side] of strips) {
    ctx.clearRect(0, 0, MAX_SIDE, GRID);
    ctx.save();
    if (side) ctx.setTransform(0, 1, 1, 0, 0, 0);
    ctx.drawImage(source, x, y, sw, sh, 0, 0, sw, sh);
    ctx.restore();
    const len = side ? sh : sw;
    const { data } = ctx.getImageData(0, 0, len, GRID);
    for (let i = 3; i < data.length; i += 4) if (data[i]! > CLEAR_ALPHA) return false;
  }
  return true;
}

class Atlas {
  private readonly pages: Page[] = [];
  private readonly slots = new Map<string, Slot>();
  /** Freed slots by size, reused for drawings of the same size (fish textures all share one). */
  private readonly free = new Map<string, Slot[]>();
  private flushQueued = false;

  constructor(private readonly game: Phaser.Game) {}

  /**
   * Draws `source` into a free region and registers it under `key`.
   * Returns false when it should have a texture of its own instead.
   */
  place(key: string, source: CanvasImageSource, w: number, h: number): boolean {
    if (w > MAX_SIDE || h > MAX_SIDE) return false;
    // A drawing with a transparent margin of its own needs no extra gutter.
    const gutter = clearBorder(source, w, h) ? 0 : GRID;
    const sw = up(w) + gutter;
    const sh = up(h) + gutter;
    const slot = this.reuse(sw, sh) ?? this.allocate(sw, sh);
    slot.page.ctx.drawImage(source, slot.x, slot.y);
    this.markDirty(slot.page);
    const glTexture = slot.page.texture.source[0]?.glTexture;
    const texture = glTexture ? this.game.textures.addGLTexture(key, glTexture) : null;
    if (!texture) {
      this.release(slot);
      return false;
    }
    texture.get('__BASE').setSize(w, h, slot.x, slot.y);
    this.slots.set(key, slot);
    return true;
  }

  has(key: string): boolean {
    return this.slots.has(key);
  }

  /** Removes `key`'s texture and frees its region; the shared page stays. */
  remove(key: string): void {
    const slot = this.slots.get(key);
    if (!slot) return;
    const texture = this.game.textures.get(key);
    // The alias must not delete the page's GPU texture when it goes.
    for (const source of texture.source) source.glTexture = null;
    this.game.textures.remove(key);
    this.slots.delete(key);
    this.release(slot);
  }

  private release(slot: Slot): void {
    slot.page.ctx.clearRect(slot.x, slot.y, slot.w, slot.h);
    this.markDirty(slot.page);
    const size = `${slot.w}x${slot.h}`;
    this.free.set(size, [...(this.free.get(size) ?? []), slot]);
  }

  private reuse(w: number, h: number): Slot | undefined {
    const list = this.free.get(`${w}x${h}`);
    const slot = list?.pop();
    return slot;
  }

  /** The lowest free spot on any page, else a new page. */
  private allocate(w: number, h: number): Slot {
    for (const page of this.pages) {
      const at = fitOn(page.skyline, PAGE, w, h);
      if (!at) continue;
      page.skyline = placeOn(page.skyline, at.x, at.y, w, h);
      return { page, x: at.x, y: at.y, w, h };
    }
    const page = this.newPage();
    page.skyline = placeOn(page.skyline, 0, 0, w, h);
    return { page, x: 0, y: 0, w, h };
  }

  private newPage(): Page {
    const key = `__ink-atlas-${this.pages.length}`;
    const { canvas, ctx } = makeCanvas(PAGE, PAGE);
    const texture = this.game.textures.addCanvas(key, canvas);
    if (!texture) throw new Error(`Could not create atlas page ${key}`);
    const page: Page = { key, texture, ctx, skyline: emptySkyline(PAGE), dirty: false };
    this.pages.push(page);
    return page;
  }

  /** Pages are re-uploaded once, just before the next frame renders, however many drawings went in. */
  private markDirty(page: Page): void {
    page.dirty = true;
    if (this.flushQueued) return;
    this.flushQueued = true;
    this.game.events.once(PRE_RENDER, () => this.flush());
  }

  private flush(): void {
    this.flushQueued = false;
    for (const page of this.pages) {
      if (!page.dirty) continue;
      page.dirty = false;
      page.texture.refresh();
    }
  }
}

const atlases = new WeakMap<Phaser.Game, Atlas>();

/** The game's atlas (one per game: textures are shared by all its scenes). */
export function atlasOf(game: Phaser.Game): Atlas {
  const existing = atlases.get(game);
  if (existing) return existing;
  const atlas = new Atlas(game);
  atlases.set(game, atlas);
  return atlas;
}

/** Where `key`'s drawing starts inside its texture source: frames cut from it are offset by this. */
export function originOf(texture: Phaser.Textures.Texture): { x: number; y: number } {
  const base = texture.get('__BASE');
  return { x: base.cutX, y: base.cutY };
}
