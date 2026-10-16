import Phaser from 'phaser';
import { BLUE_HEX, PAPER_HEX, RED_HEX } from '../../art/palette';
import type { Mine } from '../../logic/mine';
import type { Ring } from './ring';

/** Px the pole stands. */
const POLE = 30;

/**
 * The bag left behind (flag.ts): a stuffed sack on the ground with a pen
 * pole stuck in it and a little red pennant that flutters, so it can be
 * spotted down a tunnel.
 */
export class FlagView {
  private readonly g: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, private readonly tile: number) {
    this.g = scene.add.graphics().setDepth(3.7);
  }

  update(mine: Mine, now: number, ring: Ring): void {
    const g = this.g.clear();
    const d = mine.dropped;
    if (!d) return;
    const T = this.tile;
    const x = ring.near((d.col + 0.5) * T);
    const ground = (d.row + 1) * T;
    // The sack: a lumpy bag, tied at the neck.
    const sack = Array.from({ length: 12 }, (_, i) => {
      const a = (i / 12) * Math.PI * 2;
      const r = 9 + Math.sin(i * 2.7) * 1.2;
      return new Phaser.Math.Vector2(x + Math.cos(a) * r, ground - 8 + Math.sin(a) * r * 0.8);
    });
    g.fillStyle(PAPER_HEX, 1).fillPoints(sack, true);
    g.lineStyle(1.5, BLUE_HEX, 0.95).strokePoints(sack, true);
    g.lineStyle(1, BLUE_HEX, 0.7).lineBetween(x - 4, ground - 14, x + 3, ground - 13);
    // The pole and its pennant, fluttering.
    const top = ground - 8 - POLE;
    g.lineStyle(1.8, BLUE_HEX, 1).lineBetween(x + 2, ground - 10, x + 3, top);
    const flap = Math.sin(now / 160) * 2.5;
    const pennant = [
      new Phaser.Math.Vector2(x + 3, top),
      new Phaser.Math.Vector2(x + 13, top + 3 + flap * 0.5),
      new Phaser.Math.Vector2(x + 21, top + 5 + flap),
      new Phaser.Math.Vector2(x + 12, top + 8 + flap * 0.5),
      new Phaser.Math.Vector2(x + 3, top + 11),
    ];
    g.fillStyle(RED_HEX, 0.85).fillPoints(pennant, true);
    g.lineStyle(1.2, RED_HEX, 1).strokePoints(pennant, true);
  }
}
