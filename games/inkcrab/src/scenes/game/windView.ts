import Phaser from 'phaser';
import { BLUE_HEX } from '../../art/palette';
import { surfaceRow, type Terrain } from '../../logic/terrain';

/** Over the beach and its creatures, under the fog, the coach's arrow and floating words. */
const DEPTH = 6.4;
/** The streaks repeat every CELL world px; STREAKS of them in each cell in a full gust. */
const CELL = 160;
const STREAKS = 7;
/** World px a second the streaks race along in a full gust. */
const RACE = 520;
/** A streak's length (world px) at full strength, and its pen. */
const STREAK = 34;
const INK_ALPHA = 0.36;
/** Spindrift: specks of snow and sand lifted off the surface, per column, in a full gust. */
const DRIFT = 0.5;
/** World px over the surface the spindrift rides. */
const DRIFT_HIGH = 10;

/** Deterministic 0..1 noise. */
function hash(a: number, b: number): number {
  let h = Math.imul(a | 0, 374761393) ^ Math.imul(b | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/**
 * The wind over the beach: long, wavering pen streaks racing the way it
 * blows, as many as the gust is strong, and spindrift skimming off the
 * surface. Nothing is drawn in a calm.
 */
export class WindView {
  private readonly g: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, private readonly terrain: Terrain, private readonly tile: number) {
    this.g = scene.add.graphics().setDepth(DEPTH);
  }

  /** `wind` signed -1..1 (see logic/wind.ts); `view` the camera's world view; `time` in seconds. */
  update(wind: number, view: Phaser.Geom.Rectangle, time: number): void {
    const g = this.g.clear();
    const strength = Math.abs(wind);
    if (strength <= 0.02) return;
    const dir = Math.sign(wind);
    this.streaks(g, strength, dir, view, time);
    this.spindrift(g, strength, dir, view, time);
  }

  /** A sheet of streaks repeating every CELL px, racing along, each a little curve, never drawn in the sand. */
  private streaks(g: Phaser.GameObjects.Graphics, strength: number, dir: number, view: Phaser.Geom.Rectangle, time: number): void {
    const count = Math.round(STREAKS * strength);
    const len = STREAK * (0.4 + strength * 0.6);
    g.lineStyle(1, BLUE_HEX, INK_ALPHA * strength);
    for (let cy = Math.floor(view.y / CELL) - 1; cy * CELL < view.bottom; cy++) {
      for (let cx = Math.floor(view.x / CELL) - 1; cx * CELL < view.right + CELL; cx++) {
        for (let i = 0; i < count; i++) {
          const speed = 0.8 + hash(i, 5) * 0.4;
          const x = cx * CELL + ((((hash(i, 1) * CELL + dir * RACE * strength * speed * time) % CELL) + CELL) % CELL);
          const y = cy * CELL + hash(i + cy * 31, 2) * CELL;
          if (x < view.x - len || x > view.right + len || y < view.y || y > view.bottom) continue;
          const tailX = x - dir * len;
          if (y >= this.groundY(x) || y >= this.groundY(tailX)) continue;
          const sway = (hash(i, 3) - 0.5) * 6 + Math.sin(time * 3 + i) * 1.5;
          g.beginPath();
          g.moveTo(tailX, y);
          g.lineTo((tailX + x) / 2, y + sway * 0.5);
          g.lineTo(x, y + sway);
          g.strokePath();
        }
      }
    }
  }

  /** Specks blown along just over the surface, in short dashes. */
  private spindrift(g: Phaser.GameObjects.Graphics, strength: number, dir: number, view: Phaser.Geom.Rectangle, time: number): void {
    const T = this.tile;
    g.lineStyle(1, BLUE_HEX, INK_ALPHA * strength);
    for (let col = Math.max(0, Math.floor(view.x / T)); col <= Math.min(this.terrain.width - 1, Math.ceil(view.right / T)); col++) {
      if (hash(col, 11) > DRIFT * strength) continue;
      const travel = ((hash(col, 12) * T * 6 + dir * RACE * 0.6 * strength * time) % (T * 6) + T * 6) % (T * 6);
      const x = col * T + travel - T * 3;
      const ground = this.groundY(x);
      if (!Number.isFinite(ground)) continue;
      const y = ground - 2 - hash(col, 13) * DRIFT_HIGH;
      if (y < view.y || y > view.bottom) continue;
      g.lineBetween(x, y, x - dir * (3 + strength * 4), y + 0.6);
    }
  }

  /** World y of the first solid thing under world x. */
  private groundY(x: number): number {
    const col = Math.floor(x / this.tile);
    if (col < 0 || col >= this.terrain.width) return Infinity;
    return surfaceRow(this.terrain, col) * this.tile;
  }

  destroy(): void {
    this.g.destroy();
  }
}
