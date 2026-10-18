import type Phaser from 'phaser';
import type { GroundStyle } from '../../art/palette';
import { ART_RES } from '../../art/palette';
import { looseRock } from '../../art/talusGround';
import { render } from '../../art/textures';
import type { Mine } from '../../logic/mine';
import type { Ring } from './ring';

/** px the rock's picture reaches past its tile on each side (a boulder sits a little into its neighbours). */
const BLEED = 10;
/** px a shaking rock jitters, and how fast (ms a shake). */
const SHAKE = { px: 1.6, ms: 70 } as const;

/**
 * Loose rock on the move (rocks.ts), drawn over the ground: a rock that's
 * started to shake jitters in place, over its own picture in the ground,
 * and a falling one drops with it, then the ground draws it where it lands.
 * Each keeps the look it had in the ground: its picture is that tile's rock,
 * baked the first time it moves.
 */
export class RocksView {
  private readonly pool: Phaser.GameObjects.Image[] = [];

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly mine: Mine,
    private readonly style: GroundStyle,
    private readonly world: string,
  ) {}

  update(ring: Ring, now: number): void {
    const T = this.mine.tile;
    const shown: { key: string; x: number; y: number }[] = [];
    for (const s of this.mine.rocks.shaking) {
      const k = Math.floor(now / SHAKE.ms);
      const dx = ((k * 7 + s.col) % 3) - 1;
      const dy = ((k * 5 + s.row) % 2) * -0.5;
      shown.push({ key: this.picture(s.col, s.row), x: s.col * T + dx * SHAKE.px, y: s.row * T + dy * SHAKE.px });
    }
    for (const r of this.mine.rocks.falling) shown.push({ key: this.picture(r.col, r.from), x: r.col * T, y: r.y });
    while (this.pool.length < shown.length) this.pool.push(this.scene.add.image(0, 0, shown[this.pool.length]!.key).setOrigin(0).setScale(1 / ART_RES).setDepth(1.9));
    this.pool.forEach((img, i) => {
      const it = shown[i];
      img.setVisible(!!it);
      if (it) img.setTexture(it.key).setPosition(ring.near(it.x) - BLEED, it.y - BLEED);
    });
  }

  /** The rock that was at (col, row) in the ground, baked once. Returns its key. */
  private picture(col: number, row: number): string {
    const key = `rock-${this.world}-${col}-${row}`;
    if (this.scene.textures.exists(key)) return key;
    const T = this.mine.tile;
    const size = T + BLEED * 2;
    // Drawn as the ground draws that tile, shifted so the tile's corner lands at (BLEED, BLEED).
    this.scene.textures.addCanvas(key, render(size, size, BLEED - col * T, BLEED - row * T, ART_RES, (ctx) => looseRock(ctx, col, row, T, this.style)));
    return key;
  }
}
