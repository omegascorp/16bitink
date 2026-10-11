import Phaser from 'phaser';
import { BLUE_HEX, PAPER_HEX } from '../art/palette';

const CLOUD_HEX = 0x6f7c93;
const RAIN_HEX = 0x5f86b8;

/**
 * The rain clock: a round gauge with a cloud in it. A wash sweeps round it
 * as the spell goes by (`progress` 0..1 through the current dry spell or
 * downpour), grey while it's dry and blue while it pours, and rain falls
 * from the cloud during a downpour.
 */
export function drawRainClock(g: Phaser.GameObjects.Graphics, x: number, y: number, r: number, progress: number, pouring: boolean): void {
  g.fillStyle(PAPER_HEX, 0.9).fillCircle(x, y, r);
  // The spell's sweep, clockwise from the top.
  const start = -Math.PI / 2;
  g.fillStyle(pouring ? RAIN_HEX : CLOUD_HEX, pouring ? 0.45 : 0.22);
  g.slice(x, y, r, start, start + Math.max(0.001, progress) * Math.PI * 2, false).fillPath();
  // A cloud: three bumps on a flat base.
  const cy = y - r * 0.12;
  g.fillStyle(pouring ? CLOUD_HEX : PAPER_HEX, 1);
  for (const [dx, dy, k] of [[-0.32, 0.06, 0.26], [0.02, -0.08, 0.34], [0.34, 0.06, 0.24]] as const) g.fillCircle(x + dx * r, cy + dy * r, k * r);
  g.fillRect(x - r * 0.56, cy + 0.02 * r, r * 1.12, r * 0.28);
  g.lineStyle(1.6, BLUE_HEX, 1);
  g.beginPath();
  g.arc(x - 0.32 * r, cy + 0.06 * r, 0.26 * r, Math.PI * 0.55, Math.PI * 1.6);
  g.arc(x + 0.02 * r, cy - 0.08 * r, 0.34 * r, Math.PI * 1.1, Math.PI * 1.95);
  g.arc(x + 0.34 * r, cy + 0.06 * r, 0.24 * r, Math.PI * 1.45, Math.PI * 0.45);
  g.lineTo(x - 0.5 * r, cy + 0.3 * r);
  g.strokePath();
  if (pouring) {
    g.lineStyle(1.6, RAIN_HEX, 1);
    for (const dx of [-0.34, -0.06, 0.22]) g.lineBetween(x + dx * r, cy + 0.42 * r, x + (dx - 0.08) * r, cy + 0.72 * r);
  }
  g.lineStyle(2, BLUE_HEX, 1).strokeCircle(x, y, r);
}
