import Phaser from 'phaser';
import { BLUE_HEX, PAPER_HEX } from '../art/palette';

const WATER_HEX = 0x5f9fb8;

/**
 * The tide clock: a round gauge filling with water as the tide comes in
 * and emptying as it goes out (`level` 0 low .. 1 high), with an arrow
 * for which way it's going.
 */
export function drawTideClock(g: Phaser.GameObjects.Graphics, x: number, y: number, r: number, level: number, rising: boolean): void {
  g.fillStyle(PAPER_HEX, 0.9).fillCircle(x, y, r);
  // Water: the part of the disc below its surface line.
  const surface = y + r - level * 2 * r;
  const pts: Phaser.Math.Vector2[] = [];
  const steps = 32;
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    const px = x + Math.cos(a) * r;
    const py = y + Math.sin(a) * r;
    pts.push(new Phaser.Math.Vector2(px, Math.max(py, surface)));
  }
  g.fillStyle(WATER_HEX, 0.55).fillPoints(pts, true);
  // A wavy surface line across it.
  if (level > 0.02 && level < 0.98) {
    const half = Math.sqrt(Math.max(0, r * r - (surface - y) ** 2));
    g.lineStyle(1.4, BLUE_HEX, 0.8).beginPath();
    for (let i = 0; i <= 10; i++) {
      const px = x - half + (i / 10) * half * 2;
      const py = surface + Math.sin(i * 1.4) * 1.2;
      if (i === 0) g.moveTo(px, py);
      else g.lineTo(px, py);
    }
    g.strokePath();
  }
  g.lineStyle(2, BLUE_HEX, 1).strokeCircle(x, y, r);
  // The arrow: up while it's coming in, down while it goes out.
  const ax = x + r + 10;
  const dir = rising ? -1 : 1;
  g.lineStyle(2, BLUE_HEX, 1);
  g.lineBetween(ax, y - dir * 9, ax, y + dir * 9);
  g.lineBetween(ax, y + dir * 9, ax - 5, y + dir * 3);
  g.lineBetween(ax, y + dir * 9, ax + 5, y + dir * 3);
}
