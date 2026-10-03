import Phaser from 'phaser';
import type { TwistId } from '../../levels/types';

const RED = 0xa3342b;
const BLUE = 0x1f3f8a;

/**
 * A tiny pen glyph for a level twist, drawn above its node on the map so
 * you can see what's coming. Each glyph fits a ~16px box centred on (x, y).
 */
export function drawTwistIcon(g: Phaser.GameObjects.Graphics, twist: TwistId, x: number, y: number, ink: number, alpha: number): void {
  switch (twist) {
    case 'collect':
      // An ink bottle: a squat body full of blue, a short neck, a cork.
      g.fillStyle(BLUE, alpha).fillRoundedRect(x - 5.5, y - 2, 11, 9, 2);
      g.lineStyle(1.2, ink, alpha).strokeRoundedRect(x - 5.5, y - 2, 11, 9, 2).strokeRect(x - 2, y - 5, 4, 3);
      g.fillStyle(0xb98a55, alpha).fillRect(x - 2.2, y - 8.5, 4.4, 3.5);
      return;
    case 'current':
      g.lineStyle(1.8, ink, alpha);
      for (const dx of [-5, 2]) g.beginPath().moveTo(x + dx - 2, y - 5).lineTo(x + dx + 3, y).lineTo(x + dx - 2, y + 5).strokePath();
      return;
    case 'bounty':
      // Several small marked fish: three little circled dots.
      for (const [dx, dy] of [[-4.5, 3.5], [4.5, 3.5], [0, -4.5]] as const) {
        g.lineStyle(1.3, RED, alpha).strokeCircle(x + dx, y + dy, 3.4);
        g.fillStyle(RED, alpha).fillCircle(x + dx, y + dy, 1.1);
      }
      return;
    case 'boss':
      // One big quarry: a crosshair.
      g.lineStyle(1.8, RED, alpha).strokeCircle(x, y, 6.5);
      g.lineStyle(1.4, RED, alpha)
        .lineBetween(x - 9.5, y, x - 3, y).lineBetween(x + 3, y, x + 9.5, y)
        .lineBetween(x, y - 9.5, x, y - 3).lineBetween(x, y + 3, x, y + 9.5);
      g.fillStyle(RED, alpha).fillCircle(x, y, 1.6);
      return;
    case 'rush':
      g.lineStyle(1.5, ink, alpha).strokeCircle(x, y, 6.5);
      g.lineBetween(x, y, x, y - 4.5).lineBetween(x, y, x + 3.5, y + 1);
      return;
    case 'survive':
      g.lineStyle(1.5, ink, alpha);
      g.strokeTriangle(x - 5, y - 7, x + 5, y - 7, x, y).strokeTriangle(x - 5, y + 7, x + 5, y + 7, x, y);
      g.fillStyle(ink, alpha).fillTriangle(x - 3, y + 6, x + 3, y + 6, x, y + 3);
      return;
    case 'storm':
      g.lineStyle(1.8, ink, alpha).beginPath().moveTo(x + 3, y - 8).lineTo(x - 3, y + 0.5).lineTo(x + 3, y - 0.5).lineTo(x - 2, y + 8).strokePath();
      return;
    case 'dark': {
      // A crescent moon: the outer arc on the left, a shallower one cutting it on the right.
      const pts: Phaser.Math.Vector2[] = [];
      for (let i = 0; i <= 12; i++) {
        const a = Math.PI * 0.3 + (i / 12) * Math.PI * 1.4;
        pts.push(new Phaser.Math.Vector2(x + Math.cos(a) * 7, y + Math.sin(a) * 7));
      }
      for (let i = 12; i >= 0; i--) {
        const a = Math.PI * 0.42 + (i / 12) * Math.PI * 1.16;
        pts.push(new Phaser.Math.Vector2(x + 3.5 + Math.cos(a) * 5.6, y + Math.sin(a) * 5.6));
      }
      g.fillStyle(ink, alpha).fillPoints(pts, true);
      return;
    }
    default:
  }
}
