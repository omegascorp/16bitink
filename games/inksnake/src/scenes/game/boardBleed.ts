import Phaser from 'phaser';
import { ART_RES, PAPER_HEX } from '../../art/palette';
import { BOARD } from '../../level/types';

/** How far past the board's edges the mirrored ground fades out into paper, board px. */
const FADE = 420;
/** The wash at the end of the fade: a breath of ground still shows through. */
const FADE_TO = 0.9;

/**
 * Lays the board's ground (texture `key`, at depth `depth`) and lets it go on
 * past the board's edges, mirrored, so it reaches the screen's edges
 * whatever the screen's shape. The mirrored part washes out into paper away
 * from the board, so tracks and props near an edge read as a soft
 * reflection, not as part of the garden.
 */
export function layGround(scene: Phaser.Scene, key: string, depth: number): void {
  for (const sx of [-1, 0, 1]) {
    for (const sy of [-1, 0, 1]) {
      scene.add.image(sx * BOARD.w, sy * BOARD.h, key).setOrigin(0).setScale(1 / ART_RES).setFlip(sx !== 0, sy !== 0).setDepth(depth);
    }
  }
  const { w, h } = BOARD;
  const g = scene.add.graphics().setDepth(depth);
  const band = (x: number, y: number, bw: number, bh: number, a: readonly [number, number, number, number]): void => {
    g.fillGradientStyle(PAPER_HEX, PAPER_HEX, PAPER_HEX, PAPER_HEX, a[0], a[1], a[2], a[3]);
    g.fillRect(x, y, bw, bh);
  };
  // The four sides, clear at the board's edge and washed out FADE beyond it; their corners overlap and wash out a little more.
  band(-FADE, -FADE, FADE, h + FADE * 2, [FADE_TO, 0, FADE_TO, 0]);
  band(w, -FADE, FADE, h + FADE * 2, [0, FADE_TO, 0, FADE_TO]);
  band(-FADE, -FADE, w + FADE * 2, FADE, [FADE_TO, FADE_TO, 0, 0]);
  band(-FADE, h, w + FADE * 2, FADE, [0, 0, FADE_TO, FADE_TO]);
  // Beyond the fade, paper (the mirrors reach a whole board out; no screen shows that far).
  g.fillStyle(PAPER_HEX, FADE_TO);
  g.fillRect(-w, -h, w - FADE, h * 3);
  g.fillRect(w + FADE, -h, w - FADE, h * 3);
  g.fillRect(-FADE, -h, w + FADE * 2, h - FADE);
  g.fillRect(-FADE, h + FADE, w + FADE * 2, h - FADE);
}
