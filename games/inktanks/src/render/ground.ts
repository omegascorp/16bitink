import type Phaser from 'phaser';
import { CELL, GROUNDS, type Ground, type Land } from '../logic/land';

/**
 * The ground, streamed in 512 px chunks round the camera. Each chunk is
 * painted once onto a canvas: the base texture, then every other ground type
 * through a soft blobby mask built from the ground grid, so edges are
 * organic, never square tiles. Closed land shows as paper.
 * Textures: src/art/pixel/world/ground/<name>.png when the world art is in,
 * else the density C test ground, tinted per type (placeholder only).
 */
export const CHUNK = 512;
const KEEP = 1;
const DROP = 2;
const PAPER = '#d9ccaa';

const worldGround = import.meta.glob<string>('../art/pixel/world/ground/*.png', { eager: true, query: '?url', import: 'default' });
const testGround = import.meta.glob<string>('../../dev/detail-test/assets/C/ground.png', { eager: true, query: '?url', import: 'default' });

const PLACEHOLDER_FILTER: Readonly<Record<Ground, string>> = {
  grass: 'none',
  grassDry: 'sepia(0.45) saturate(0.9) brightness(1.08)',
  dirt: 'sepia(1) saturate(0.7) hue-rotate(-12deg) brightness(0.82)',
  sand: 'sepia(0.85) saturate(0.6) brightness(1.35)',
  mud: 'sepia(1) saturate(0.8) brightness(0.55)',
  water: 'hue-rotate(150deg) saturate(1.6) brightness(0.75)',
  bridge: 'sepia(1) saturate(0.35) brightness(0.72)',
};

function groundUrl(name: Ground): string | null {
  const hit = Object.entries(worldGround).find(([p]) => p.endsWith(`/ground/${name}.png`));
  return hit?.[1] ?? null;
}

export function preloadGround(scene: Phaser.Scene): void {
  for (const g of GROUNDS) {
    const url = groundUrl(g);
    if (url) scene.load.image(`ground:${g}`, url);
  }
  const test = Object.values(testGround)[0];
  if (test) scene.load.image('ground:test', test);
}

/** Every ground type as a canvas to make patterns from. */
function sources(scene: Phaser.Scene): Map<Ground, HTMLCanvasElement> {
  const out = new Map<Ground, HTMLCanvasElement>();
  for (const g of GROUNDS) {
    // The bridge deck is a structure piece in the world art; under it, dirt.
    const name = g === 'bridge' && scene.textures.exists('ground:dirt') ? 'dirt' : g;
    const key = scene.textures.exists(`ground:${name}`) ? `ground:${name}` : 'ground:test';
    const img = scene.textures.get(key).getSourceImage() as HTMLImageElement;
    const c = document.createElement('canvas');
    c.width = img.width;
    c.height = img.height;
    const ctx = c.getContext('2d')!;
    if (key === 'ground:test') ctx.filter = PLACEHOLDER_FILTER[g];
    ctx.drawImage(img, 0, 0);
    out.set(g, c);
  }
  return out;
}

/** A cheap repeatable hash for blob jitter. */
const hash = (x: number, y: number): number => {
  const h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return h - Math.floor(h);
};

export class GroundStream {
  private readonly chunks = new Map<string, Phaser.GameObjects.Image>();
  private readonly src: Map<Ground, HTMLCanvasElement>;
  private n = 0;
  built = 0;

  constructor(private readonly scene: Phaser.Scene, private readonly land: Land) {
    this.src = sources(scene);
  }

  get count(): number {
    return this.chunks.size;
  }

  /** Bytes held by live chunk textures. */
  get bytes(): number {
    return this.chunks.size * CHUNK * CHUNK * 4;
  }

  update(view: Phaser.Geom.Rectangle): void {
    const cx0 = Math.floor(view.x / CHUNK);
    const cy0 = Math.floor(view.y / CHUNK);
    const cx1 = Math.floor((view.x + view.width) / CHUNK);
    const cy1 = Math.floor((view.y + view.height) / CHUNK);
    for (let cy = cy0 - KEEP; cy <= cy1 + KEEP; cy++) for (let cx = cx0 - KEEP; cx <= cx1 + KEEP; cx++) this.ensure(cx, cy);
    for (const [k, img] of this.chunks) {
      const [cx, cy] = k.split(',').map(Number) as [number, number];
      if (cx < cx0 - DROP || cx > cx1 + DROP || cy < cy0 - DROP || cy > cy1 + DROP) {
        const tex = img.texture.key;
        img.destroy();
        this.scene.textures.remove(tex);
        this.chunks.delete(k);
      }
    }
  }

  private ensure(cx: number, cy: number): void {
    const k = `${cx},${cy}`;
    if (this.chunks.has(k)) return;
    if (cx < 0 || cy < 0 || cx * CHUNK >= this.land.width || cy * CHUNK >= this.land.height) return;
    const key = `chunk:${this.n++}`;
    this.scene.textures.addCanvas(key, this.paint(cx * CHUNK, cy * CHUNK));
    this.chunks.set(k, this.scene.add.image(cx * CHUNK, cy * CHUNK, key).setOrigin(0, 0).setDepth(0));
    this.built++;
  }

  private paint(x0: number, y0: number): HTMLCanvasElement {
    const c = document.createElement('canvas');
    c.width = c.height = CHUNK;
    const ctx = c.getContext('2d')!;
    const l = this.land;
    const base = l.def.base;
    this.fill(ctx, this.src.get(base)!, x0, y0);
    const gx0 = Math.floor(x0 / CELL) - 1;
    const gy0 = Math.floor(y0 / CELL) - 1;
    const n = CHUNK / CELL + 3;
    const present = new Set<number>();
    for (let gy = gy0; gy < gy0 + n; gy++) for (let gx = gx0; gx < gx0 + n; gx++) present.add(this.groundIdx(gx, gy));
    for (const gi of [...present].sort((a, b) => a - b)) {
      const g = GROUNDS[gi]!;
      if (g === base) continue;
      this.blend(ctx, g, x0, y0, (gx, gy) => this.groundIdx(gx, gy) === gi);
    }
    this.blend(ctx, null, x0, y0, (gx, gy) => !this.isOpen(gx, gy));
    return c;
  }

  private fill(ctx: CanvasRenderingContext2D, src: HTMLCanvasElement, x0: number, y0: number): void {
    const pat = ctx.createPattern(src, 'repeat')!;
    pat.setTransform(new DOMMatrix().translate(-(x0 % src.width), -(y0 % src.height)));
    ctx.fillStyle = pat;
    ctx.fillRect(0, 0, CHUNK, CHUNK);
  }

  /** Paints a ground type (or paper, for null) where `has` holds, through soft jittered blobs. */
  private blend(ctx: CanvasRenderingContext2D, g: Ground | null, x0: number, y0: number, has: (gx: number, gy: number) => boolean): void {
    const mask = document.createElement('canvas');
    mask.width = mask.height = CHUNK;
    const m = mask.getContext('2d')!;
    let any = false;
    const gx0 = Math.floor(x0 / CELL) - 1;
    const gy0 = Math.floor(y0 / CELL) - 1;
    const n = CHUNK / CELL + 3;
    for (let gy = gy0; gy < gy0 + n; gy++) {
      for (let gx = gx0; gx < gx0 + n; gx++) {
        if (!has(gx, gy)) continue;
        any = true;
        const cx = (gx + 0.5) * CELL - x0 + (hash(gx, gy) - 0.5) * 12;
        const cy = (gy + 0.5) * CELL - y0 + (hash(gy, gx) - 0.5) * 12;
        const r = CELL * (0.95 + hash(gx * 3, gy * 7) * 0.35);
        const grad = m.createRadialGradient(cx, cy, r * 0.35, cx, cy, r);
        grad.addColorStop(0, 'rgba(0,0,0,1)');
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        m.fillStyle = grad;
        m.fillRect(cx - r, cy - r, r * 2, r * 2);
      }
    }
    if (!any) return;
    const layer = document.createElement('canvas');
    layer.width = layer.height = CHUNK;
    const lc = layer.getContext('2d')!;
    if (g) this.fill(lc, this.src.get(g)!, x0, y0);
    else {
      lc.fillStyle = PAPER;
      lc.fillRect(0, 0, CHUNK, CHUNK);
    }
    lc.globalCompositeOperation = 'destination-in';
    lc.drawImage(mask, 0, 0);
    ctx.drawImage(layer, 0, 0);
  }

  private groundIdx(gx: number, gy: number): number {
    const l = this.land;
    const x = Math.min(l.gridCols - 1, Math.max(0, gx));
    const y = Math.min(l.gridRows - 1, Math.max(0, gy));
    return l.ground[y * l.gridCols + x]!;
  }

  private isOpen(gx: number, gy: number): boolean {
    const l = this.land;
    if (gx < 0 || gy < 0 || gx >= l.gridCols || gy >= l.gridRows) return false;
    return true;
  }

  destroy(): void {
    for (const img of this.chunks.values()) {
      const tex = img.texture.key;
      img.destroy();
      this.scene.textures.remove(tex);
    }
    this.chunks.clear();
  }
}
