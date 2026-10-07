import Phaser from 'phaser';
import { BLUE_HEX, PAPER_HEX } from '../../art/palette';
import type { Beach } from '../../logic/sim';

const WATER_HEX = 0x5f9fb8;
/** Rows between the faint wavy lines inside the water. */
const LINE_GAP = 7;

/**
 * The water, drawn over the beach as the notebook draws it: a watercolour
 * wash with horizontal wavy ink lines, and a firmer wavy line along its
 * surface. The open sea's surface follows the tide smoothly; pools sit at
 * their rims. A dashed pencil line marks how high the tide comes.
 * The wash is laid under the sand, reaching a tile into it, so it fills
 * the corners where the inked sand edge cuts across a tile; the lines and
 * a faint tint go over the crab and the creatures, so what's under water
 * looks it.
 */
export class WaterView {
  private readonly g: Phaser.GameObjects.Graphics;
  private readonly wash: Phaser.GameObjects.Graphics;
  private readonly mark: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, private readonly beach: Beach) {
    this.g = scene.add.graphics().setDepth(5.5);
    this.wash = scene.add.graphics().setDepth(0.95);
    // Behind the sand, so it shows only across open air, as a line on the cliff would.
    this.mark = scene.add.graphics().setDepth(0.9);
    this.drawHighWaterMark();
  }

  update(view: Phaser.Geom.Rectangle, time: number): void {
    const g = this.g.clear();
    const wash = this.wash.clear();
    const w = this.beach.water;
    if (!w) return;
    const T = this.beach.tileSize;
    const seaY = this.beach.seaY;
    const x0 = Math.max(0, Math.floor(view.x / T) - 1);
    const x1 = Math.min(w.width - 1, Math.ceil(view.right / T) + 1);
    const y0 = Math.max(0, Math.floor(view.y / T) - 1);
    const y1 = Math.min(w.height - 1, Math.ceil(view.bottom / T) + 1);
    const wave = (x: number, y: number, amp: number): number => y + Math.sin(x * 0.18 + time / 420) * amp + Math.sin(x * 0.07 - time / 700) * amp * 0.6;
    for (let y = y0; y <= y1; y++) {
      let x = x0;
      while (x <= x1) {
        if (!w.wet[y * w.width + x]) {
          x++;
          continue;
        }
        // A run of water along the row: one wash rectangle, one set of lines.
        const start = x;
        while (x <= x1 && w.wet[y * w.width + x]) x++;
        const left = start * T;
        const right = x * T;
        const sea = w.sea[y * w.width + start] === 1;
        // The sea's surface sits at the tide, part way down its top row.
        const top = sea ? Math.max(y * T, seaY) : y * T;
        const bottom = (y + 1) * T;
        if (top >= bottom) continue;
        // Into the sand a tile either side, and a tile down under each floored tile (never over water, which would darken in bands).
        // Paper first, so the faraway beach doesn't show through the water.
        for (const [color, alpha] of [[PAPER_HEX, 1], [WATER_HEX, 0.38]] as const) {
          wash.fillStyle(color, alpha).fillRect(left - T, top, right - left + 2 * T, bottom - top);
          for (let cx = start; cx < x; cx++) if (y + 1 < w.height && !w.wet[(y + 1) * w.width + cx]) wash.fillRect(cx * T, bottom, T, T);
        }
        g.fillStyle(WATER_HEX, 0.1).fillRect(left, top, right - left, bottom - top);
        const surface = y === 0 || !w.wet[(y - 1) * w.width + start] || (sea && top > y * T);
        if (surface) this.line(g, left, right, top, 1.5, 0.85, wave);
        for (let ly = Math.ceil(top / LINE_GAP) * LINE_GAP + 3; ly < bottom; ly += LINE_GAP) this.line(g, left, right, ly, 0.9, 0.22, wave);
      }
    }
  }

  private line(g: Phaser.GameObjects.Graphics, left: number, right: number, y: number, width: number, alpha: number, wave: (x: number, y: number, amp: number) => number): void {
    g.lineStyle(width, BLUE_HEX, alpha).beginPath();
    for (let x = left; x <= right; x += 4) {
      const px = Math.min(x, right);
      const py = wave(px, y, width > 1 ? 1.1 : 0.7);
      if (x === left) g.moveTo(px, py);
      else g.lineTo(px, py);
    }
    g.strokePath();
  }

  /** How high the tide comes: a dashed pencil line across the level. */
  private drawHighWaterMark(): void {
    const tide = this.beach.tide;
    if (!tide) return;
    const T = this.beach.tileSize;
    const y = tide.high * T;
    const width = this.beach.terrain.width * T;
    this.mark.lineStyle(1.2, BLUE_HEX, 0.3);
    for (let x = 0; x < width; x += 14) this.mark.lineBetween(x, y, x + 7, y);
  }
}
