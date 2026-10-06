import type Phaser from 'phaser';
import { BLUE_HEX, HIGHLIGHT_HEX } from '../art/palette';
import { wobblyRect } from './ui';

export interface BarRect {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

/**
 * The level's growth bar (after InkFish's): the starting size on the left,
 * the goal on the right, a tick for each size between. A dashed mark shows
 * where the current shell stops growth; when the crab is there, the bar is
 * highlighted, since a bigger shell is the thing to go and get.
 */
export function drawGrowthBar(g: Phaser.GameObjects.Graphics, r: BarRect, progress: number, marks: readonly number[], cap: number, capped: boolean): void {
  if (capped) g.fillStyle(HIGHLIGHT_HEX, 0.85).fillRect(r.x - 5, r.y - 5, r.w + 10, r.h + 10);
  g.fillStyle(BLUE_HEX, 0.7).fillRect(r.x, r.y, r.w * progress, r.h);
  for (const m of marks) g.lineStyle(1.6, BLUE_HEX, 0.8).lineBetween(r.x + r.w * m, r.y - 3, r.x + r.w * m, r.y + r.h + 3);
  if (cap < 1) {
    const x = r.x + r.w * cap;
    g.lineStyle(2.4, BLUE_HEX, 1);
    for (let y = r.y - 7; y < r.y + r.h + 7; y += 5) g.lineBetween(x, y, x, Math.min(y + 3, r.y + r.h + 7));
  }
  wobblyRect(g, r.x, r.y, r.w, r.h, 9, 1.4, BLUE_HEX);
}
