import Phaser from 'phaser';
import { BLUE_HEX, PAPER_HEX, RED_HEX } from '../../art/palette';
import type { Mine } from '../../logic/mine';
import type { Ring } from './ring';

const H = 30;
const W = 6;
/** Px behind the prospector's middle. */
const BEHIND = 20;

/**
 * The jetpack's tank (spec: it shows only while you fly, beside the
 * prospector, so the HUD stays small): a little hatched pencil bar behind
 * them while the tank isn't full, red when it's nearly dry.
 */
export class JetGaugeView {
  private readonly g: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene) {
    this.g = scene.add.graphics().setDepth(5.5);
  }

  update(mine: Mine, ring: Ring): void {
    const g = this.g.clear();
    const s = mine.suit;
    if (s.fuel >= s.maxFuel) return;
    const p = mine.player;
    const share = s.fuel / s.maxFuel;
    const ink = share < 0.25 ? RED_HEX : BLUE_HEX;
    const x = ring.near(p.x + p.w / 2) - mine.facing * BEHIND - W / 2;
    const y = p.y + p.h / 2 - H / 2;
    g.fillStyle(PAPER_HEX, 0.85).fillRect(x, y, W, H);
    g.lineStyle(1, ink, 0.9);
    for (let k = 2; k < H * share; k += 2.4) g.lineBetween(x + 1, y + H - k, x + W - 1, y + H - k - 2);
    g.lineStyle(1.2, ink, 0.95).strokeRect(x, y, W, H);
  }
}
