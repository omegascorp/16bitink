import Phaser from 'phaser';
import { BLUE_HEX, PAPER_HEX } from '../../art/palette';
import type { Terrain } from '../../logic/terrain';
import { plugged, VENT, ventState, type Vent } from '../../logic/vents';

/** Sulphur crust round a vent's mouth, and the steam's pale grey shading. */
const SULPHUR_HEX = 0xe2c43c;
const STEAM_SHADE_HEX = 0xc9cfd2;
/** Wisps rising from a quiet vent, and spurting from a hissing one. */
const WISPS = 4;
const SPURTS = 7;
/** Puffs making up the column of a blow. */
const COLUMN = 14;

/**
 * The steam vents: a crust of sulphur round each mouth; a lazy wisp when
 * it's quiet; quick spurts of steam as it hisses (the warning); and, when
 * it blows, a billowing column as high as it throws. A plugged vent shows
 * nothing. Drawn behind the crab, so it can be seen riding the steam.
 */
export class VentsView {
  private readonly crust: Phaser.GameObjects.Graphics;
  private readonly steam: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, private readonly vents: readonly Vent[], private readonly terrain: Terrain, private readonly tile: number) {
    this.crust = scene.add.graphics().setDepth(1.5);
    this.steam = scene.add.graphics().setDepth(4.6);
    for (const v of vents) this.drawCrust(v);
  }

  private drawCrust(v: Vent): void {
    const T = this.tile;
    const g = this.crust;
    const cx = (v.col + 0.5) * T;
    const y = v.top * T;
    for (let i = 0; i < 9; i++) {
      const a = (i / 8) * Math.PI;
      const r = T * (0.55 + (i % 3) * 0.12);
      g.fillStyle(SULPHUR_HEX, 0.75).fillCircle(cx - Math.cos(a) * r, y + 1.5 - Math.sin(a) * 1.5, 1.4 + (i % 2) * 0.6);
    }
  }

  update(time: number): void {
    const g = this.steam.clear();
    const t = time / 1000;
    this.vents.forEach((v, i) => {
      if (plugged(this.terrain, v)) return;
      const s = ventState(v, t);
      if (s.phase === 'blow') this.column(g, v, s.k, t, i);
      else this.wisps(g, v, s.phase === 'hiss' ? SPURTS : WISPS, s.phase === 'hiss' ? 2.4 + s.k * 2 : 0.5, s.phase === 'hiss' ? 2.5 + s.k * 1.5 : 2, t, i);
    });
  }

  /** Puffs rising from the mouth and fading, `rate` a second each, up to `rise` tiles. */
  private wisps(g: Phaser.GameObjects.Graphics, v: Vent, n: number, rate: number, rise: number, t: number, i: number): void {
    const T = this.tile;
    const cx = (v.col + 0.5) * T;
    for (let k = 0; k < n; k++) {
      const p = (t * rate * 0.35 + k / n + i * 0.13) % 1;
      const x = cx + Math.sin(p * 5 + k * 1.7 + i) * T * 0.3 * p;
      const y = v.top * T - p * rise * T;
      this.puff(g, x, y, T * (0.18 + p * 0.3), (1 - p) * 0.75);
    }
  }

  /**
   * The blow: a column shooting up to its height in the first moments,
   * billowing wider as it rises (puffs of every size, drifting apart), then
   * thinning away. The ink only rings its outer puffs, so it reads as one cloud.
   */
  private column(g: Phaser.GameObjects.Graphics, v: Vent, k: number, t: number, i: number): void {
    const T = this.tile;
    const cx = (v.col + 0.5) * T;
    const reach = Math.min(1, k / 0.25) * v.height;
    const fade = k < 0.6 ? 1 : 1 - (k - 0.6) / 0.4;
    const puffs: { x: number; y: number; r: number; a: number }[] = [];
    for (let j = 0; j < COLUMN * 2; j++) {
      const u = (j + 0.5) / (COLUMN * 2);
      const h = (n: number): number => (Math.sin(j * 12.9898 + i * 78.233 + n * 37.719) * 43758.5453) % 1;
      const spread = T * (0.15 + u * 0.9);
      const x = cx + (Math.abs(h(1)) - 0.5) * 2 * spread + Math.sin(t * 7 + j) * T * 0.08 * u;
      const y = v.top * T - u * reach * T - Math.abs(h(2)) * T * 0.4;
      const r = T * (0.3 + u * 0.5) * (0.7 + Math.abs(h(3)) * 0.6);
      puffs.push({ x, y, r, a: fade * (0.95 - u * 0.4) });
    }
    // Shade under every puff first, then the pale tops, so overlaps merge into one billow.
    for (const p of puffs) g.fillStyle(STEAM_SHADE_HEX, p.a * 0.6).fillCircle(p.x, p.y + p.r * 0.18, p.r);
    for (const p of puffs) g.fillStyle(PAPER_HEX, p.a).fillCircle(p.x - p.r * 0.1, p.y - p.r * 0.1, p.r * 0.85);
    for (const p of puffs.slice(-6)) g.lineStyle(0.6, BLUE_HEX, p.a * 0.35).beginPath().arc(p.x, p.y, p.r, Math.PI * 1.05, Math.PI * 1.95).strokePath();
  }

  /** One puff of steam: pale, shaded underneath, with a light pen edge. */
  private puff(g: Phaser.GameObjects.Graphics, x: number, y: number, r: number, alpha: number): void {
    if (alpha <= 0.02) return;
    g.fillStyle(STEAM_SHADE_HEX, alpha * 0.7).fillCircle(x, y + r * 0.15, r);
    g.fillStyle(PAPER_HEX, alpha).fillCircle(x - r * 0.1, y - r * 0.08, r * 0.85);
    g.lineStyle(0.6, BLUE_HEX, alpha * 0.45).strokeCircle(x, y, r);
  }
}
