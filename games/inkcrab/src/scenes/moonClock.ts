import Phaser from 'phaser';
import { BLUE_HEX, PAPER_HEX } from '../art/palette';

const NIGHT_HEX = 0x2a3566;
const MOON_HEX = 0xf3eccb;
const CLOUD_HEX = 0x6f7c93;

/**
 * The moon clock: a round gauge of night sky with the moon in it. A wash
 * sweeps round it as the spell goes by (`progress` 0..1 through the current
 * moonlight or dark), and while it's dark a cloud lies over the moon.
 */
export function drawMoonClock(g: Phaser.GameObjects.Graphics, x: number, y: number, r: number, progress: number, dark: boolean): void {
  g.fillStyle(NIGHT_HEX, 0.85).fillCircle(x, y, r);
  const start = -Math.PI / 2;
  g.fillStyle(PAPER_HEX, dark ? 0.12 : 0.25);
  g.slice(x, y, r, start, start + Math.max(0.001, progress) * Math.PI * 2, false).fillPath();
  g.fillStyle(MOON_HEX, 1).fillCircle(x, y - r * 0.08, r * 0.42);
  g.lineStyle(1.4, BLUE_HEX, 1).strokeCircle(x, y - r * 0.08, r * 0.42);
  if (dark) {
    const cy = y + r * 0.05;
    g.fillStyle(CLOUD_HEX, 1);
    for (const [dx, dy, k] of [[-0.32, 0.06, 0.26], [0.02, -0.08, 0.34], [0.34, 0.06, 0.24]] as const) g.fillCircle(x + dx * r, cy + dy * r, k * r);
    g.fillRect(x - r * 0.56, cy + 0.02 * r, r * 1.12, r * 0.28);
  }
  g.lineStyle(2, BLUE_HEX, 1).strokeCircle(x, y, r);
}
