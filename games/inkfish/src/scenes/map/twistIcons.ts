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
      g.fillStyle(BLUE, alpha).fillCircle(x, y + 2, 5).fillTriangle(x - 4.4, y + 0.2, x + 4.4, y + 0.2, x, y - 8);
      return;
    case 'current':
      g.lineStyle(1.8, ink, alpha);
      for (const dx of [-5, 2]) g.beginPath().moveTo(x + dx - 2, y - 5).lineTo(x + dx + 3, y).lineTo(x + dx - 2, y + 5).strokePath();
      return;
    case 'bounty':
      g.lineStyle(1.6, RED, alpha);
      for (let a = 0; a < Math.PI * 2; a += 0.9) g.beginPath().arc(x, y, 6.5, a, a + 0.55).strokePath();
      g.fillStyle(RED, alpha).fillCircle(x, y, 1.8);
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
