import Phaser from 'phaser';
import { BLUE_HEX, PAPER_HEX } from '../art/palette';

const CALM_HEX = 0x8aa0a8;
const GUST_HEX = 0x5f9fc0;

/**
 * The wind clock: a round gauge with a windsock in it. A wash sweeps round
 * it as the spell goes by (`progress` 0..1 through the current calm or
 * gust), grey while it's calm and blue while it gusts. The sock points
 * the way the (coming) gust blows, `dir`: it hangs limp in a calm and
 * streams out straight in a gust.
 */
export function drawWindClock(g: Phaser.GameObjects.Graphics, x: number, y: number, r: number, progress: number, gusting: boolean, dir: 1 | -1): void {
  g.fillStyle(PAPER_HEX, 0.9).fillCircle(x, y, r);
  const start = -Math.PI / 2;
  g.fillStyle(gusting ? GUST_HEX : CALM_HEX, gusting ? 0.45 : 0.22);
  g.slice(x, y, r, start, start + Math.max(0.001, progress) * Math.PI * 2, false).fillPath();
  // The pole, and the sock off its top: straight out in a gust, drooping in a calm.
  const poleX = x - dir * r * 0.5;
  const top = y - r * 0.5;
  g.lineStyle(1.6, BLUE_HEX, 1).lineBetween(poleX, y + r * 0.6, poleX, top);
  const droop = gusting ? 0.06 : 0.5;
  const len = r * 0.95;
  const tipX = poleX + dir * len * (1 - droop * 0.4);
  const tipY = top + len * droop;
  const mouth = r * 0.22;
  const tail = r * 0.1;
  g.fillStyle(gusting ? GUST_HEX : PAPER_HEX, 1);
  g.fillTriangle(poleX, top - mouth, poleX, top + mouth, tipX, tipY);
  g.beginPath();
  g.moveTo(poleX, top - mouth);
  g.lineTo(tipX, tipY - tail);
  g.lineTo(tipX, tipY + tail);
  g.lineTo(poleX, top + mouth);
  g.strokePath();
  // Its stripes.
  for (const k of [0.33, 0.66]) {
    const sx = poleX + (tipX - poleX) * k;
    const sy = top + (tipY - top) * k;
    const half = mouth + (tail - mouth) * k;
    g.lineBetween(sx, sy - half, sx, sy + half);
  }
  g.lineStyle(2, BLUE_HEX, 1).strokeCircle(x, y, r);
}
