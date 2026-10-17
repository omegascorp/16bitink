import Phaser from 'phaser';
import { hash } from '../../logic/noise';
import { TILE, tileAt, type Terrain } from '../../logic/terrain';
import type { Water } from '../../logic/water';
import type { Ring } from './ring';

/** How a world's water is painted. */
export interface WaterLook {
  /** The wash near the surface, and down deep. */
  readonly top: number;
  readonly deep: number;
  /** The light along the surface line, and the glints on it. */
  readonly line: number;
  readonly glint: number;
}

/** Brine's sea: purple with the microbes floating in it, darker going down. */
export const BRINE_WATER: WaterLook = { top: 0x8a64b8, deep: 0x3b2a63, line: 0xe8d8f6, glint: 0xfff4ff };

/** Metres over which the wash goes from its top colour to its deep one. */
const DEEP_AT = 24;
/** The wash's strength at the surface and fully deep. */
const ALPHA = { top: 0.34, deep: 0.62 } as const;

/**
 * The world's water, painted over the ground and the prospector (so they
 * read as under it) and redrawn each frame near the camera: a wash that
 * deepens and darkens going down, a pale surface line that rocks gently
 * with a slow swell, and a few glints riding on it. Water in the open sky
 * (the sea between islands) is drawn the same way, over the sky.
 */
export class WaterView {
  private readonly g: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, private readonly water: Water, private readonly terrain: Terrain, private readonly tile: number, private readonly look: WaterLook) {
    this.g = scene.add.graphics().setDepth(5.2);
  }

  update(view: Phaser.Geom.Rectangle, ring: Ring, now: number): void {
    const g = this.g.clear();
    const T = this.tile;
    const t = this.terrain;
    const w = this.water;
    const x0 = Math.floor(view.x / T) - 1;
    const x1 = Math.ceil(view.right / T) + 1;
    const y0 = Math.max(0, Math.floor(view.y / T) - 1);
    const y1 = Math.min(t.height - 1, Math.ceil(view.bottom / T) + 1);
    const top = Phaser.Display.Color.IntegerToColor(this.look.top);
    const deep = Phaser.Display.Color.IntegerToColor(this.look.deep);
    for (let x = x0; x <= x1; x++) {
      // Where this column is drawn: its copy nearest the camera.
      const px = ring.near(x * T + T / 2) - T / 2;
      let run = 0;
      for (let y = y0; y <= y1; y++) {
        if (!w.isWet(x, y)) {
          run = 0;
          continue;
        }
        // How far under the surface: counted down from the last dry tile above.
        if (run === 0) run = w.depthAt(x, y);
        else run++;
        const k = Math.min(1, (run - 1) / DEEP_AT);
        const c = Phaser.Display.Color.Interpolate.ColorWithColor(top, deep, 100, Math.round(k * 100));
        g.fillStyle(Phaser.Display.Color.GetColor(c.r, c.g, c.b), ALPHA.top + (ALPHA.deep - ALPHA.top) * k);
        g.fillRect(px, y * T, T + 0.5, T + 0.5);
        if (run === 1 && tileAt(t, x, y - 1) === TILE.air) this.surface(g, px, y * T, x, now);
      }
    }
  }

  /** The surface over one tile: a pale line rocking with the swell, and now and then a glint. */
  private surface(g: Phaser.GameObjects.Graphics, px: number, py: number, col: number, now: number): void {
    const T = this.tile;
    const swell = (x: number): number => Math.sin(x * 0.045 + now * 0.0016) * 1.6 + Math.sin(x * 0.11 - now * 0.0023) * 0.7;
    const wx = col * T;
    g.lineStyle(1.4, this.look.line, 0.85);
    g.beginPath();
    for (let i = 0; i <= 4; i++) {
      const x = (i / 4) * T;
      const y = py + 2 + swell(wx + x);
      if (i === 0) g.moveTo(px + x, y);
      else g.lineTo(px + x, y);
    }
    g.strokePath();
    // A glint rides the swell now and then, never the same tile twice in a row.
    const phase = (now * 0.0004 + hash(col, 0, 77)) % 1;
    if (phase < 0.18) {
      const gx = px + T * (0.2 + 0.6 * hash(col, 1, 78));
      g.fillStyle(this.look.glint, 0.9 * Math.sin((phase / 0.18) * Math.PI));
      g.fillEllipse(gx, py + 2 + swell(wx + gx - px), 6, 1.6);
    }
  }
}
