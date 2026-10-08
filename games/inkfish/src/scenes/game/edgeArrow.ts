import type Phaser from 'phaser';

interface Point {
  readonly x: number;
  readonly y: number;
}

const INK = 0x1b1a1f;

/**
 * An arrowhead at the edge of the screen pointing at `target` off-screen,
 * kept clear of the HUD along the top. `size` scales it (1 = a goal arrow).
 */
export function drawEdgeArrow(
  g: Phaser.GameObjects.Graphics, view: Phaser.Geom.Rectangle, zoom: number, target: Point, color: number, size = 1,
): void {
  const cx = view.centerX;
  const cy = view.centerY;
  const dx = target.x - cx;
  const dy = target.y - cy;
  const side = 42 / zoom;
  const top = 120 / zoom;
  const halfH = (view.height - side - top) / 2;
  const midY = view.top + top + halfH;
  const t = Math.min((view.width / 2 - side) / Math.abs(dx || 1e-6), halfH / Math.abs(target.y - midY || 1e-6));
  const x = cx + dx * t;
  const y = midY + (target.y - midY) * t;
  const a = Math.atan2(dy, dx);
  const s = (16 * size) / zoom;
  const pt = (ang: number, len: number): Point => ({ x: x + Math.cos(ang) * len, y: y + Math.sin(ang) * len });
  const tip = pt(a, s);
  const l = pt(a + 2.5, s);
  const r = pt(a - 2.5, s);
  g.fillStyle(color, 0.9).fillTriangle(tip.x, tip.y, l.x, l.y, r.x, r.y);
  g.lineStyle(1.4 / zoom, INK, 0.8).strokeTriangle(tip.x, tip.y, l.x, l.y, r.x, r.y);
}
