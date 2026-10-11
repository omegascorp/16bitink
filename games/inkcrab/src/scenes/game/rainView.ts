import Phaser from 'phaser';
import { BLUE_HEX } from '../../art/palette';
import { surfaceRow, type Terrain } from '../../logic/terrain';

/** Over the beach and its creatures, under the fog, the coach's arrow and floating words. */
const DEPTH = 6.4;
/** The squall's slate-grey light, laid over the view: at its darkest, still well short of hiding anything. */
const GLOOM_HEX = 0x3b4658;
const GLOOM = 0.17;
/** The rain sheet repeats every CELL world px; DROPS streaks fall in each cell at a full downpour. */
const CELL = 128;
const DROPS = 22;
/** World px a second the rain falls, and drifts sideways on the monsoon wind. */
const FALL = 420;
const WIND = -90;
/** A streak's length (world px) and pen. */
const STREAK = 9;
const INK_ALPHA = 0.42;
/** Splashes a column throws up a second, at a full downpour. */
const SPLASHES = 5;

/** Deterministic 0..1 noise. */
function hash(a: number, b: number): number {
  let h = Math.imul(a | 0, 374761393) ^ Math.imul(b | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/**
 * Monsoon rain over the beach: the light dims to a slate grey and slanting
 * pen streaks fall across the view, as thick as the rain is hard, stopping
 * at the first thing they hit (sand, a boat, a stilt house's floor, never
 * the shelter under it), with little splashes where they land.
 */
export class RainView {
  private readonly g: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, private readonly terrain: Terrain, private readonly tile: number) {
    this.g = scene.add.graphics().setDepth(DEPTH);
  }

  /** `rain` 0..1 how hard it's raining; `view` the camera's world view; `time` in seconds. */
  update(rain: number, view: Phaser.Geom.Rectangle, time: number): void {
    const g = this.g.clear();
    if (rain <= 0.01) return;
    g.fillStyle(GLOOM_HEX, GLOOM * rain).fillRect(view.x, view.y, view.width, view.height);
    this.streaks(g, rain, view, time);
    this.splashes(g, rain, view, time);
  }

  /** A sheet of drops repeating every CELL px, falling and drifting, cut off where they meet the ground. */
  private streaks(g: Phaser.GameObjects.Graphics, rain: number, view: Phaser.Geom.Rectangle, time: number): void {
    const count = Math.round(DROPS * rain);
    const slant = (WIND / FALL) * STREAK;
    g.lineStyle(1, BLUE_HEX, INK_ALPHA * (0.5 + rain * 0.5));
    g.beginPath();
    for (let cy = Math.floor(view.y / CELL) - 1; cy * CELL < view.bottom; cy++) {
      for (let cx = Math.floor(view.x / CELL) - 1; cx * CELL < view.right + CELL; cx++) {
        for (let i = 0; i < count; i++) {
          const speed = 0.85 + hash(i, 7) * 0.3;
          const x = cx * CELL + ((((hash(i, 1) * CELL + WIND * time * speed) % CELL) + CELL) % CELL);
          const y = cy * CELL + ((hash(i, 2) * CELL + FALL * time * speed) % CELL);
          if (x < view.x || x > view.right || y < view.y || y - STREAK > view.bottom) continue;
          const ground = this.groundY(x);
          if (y - STREAK >= ground) continue;
          const tipY = Math.min(y, ground);
          const k = (tipY - (y - STREAK)) / STREAK;
          g.moveTo(x - slant, y - STREAK);
          g.lineTo(x - slant + slant * k, tipY);
        }
      }
    }
    g.strokePath();
  }

  /** Little ticks thrown up off the ground here and there, flickering as the drops land. */
  private splashes(g: Phaser.GameObjects.Graphics, rain: number, view: Phaser.Geom.Rectangle, time: number): void {
    const T = this.tile;
    const beat = Math.floor(time * SPLASHES);
    g.lineStyle(1, BLUE_HEX, INK_ALPHA * rain);
    for (let col = Math.max(0, Math.floor(view.x / T)); col <= Math.min(this.terrain.width - 1, Math.ceil(view.right / T)); col++) {
      if (hash(col, beat) > 0.45 * rain) continue;
      const x = (col + hash(col, beat + 1)) * T;
      const y = surfaceRow(this.terrain, col) * T;
      if (y < view.y || y > view.bottom) continue;
      g.lineBetween(x, y - 0.5, x - 2.2, y - 3.2);
      g.lineBetween(x + 0.5, y - 0.5, x + 2.4, y - 3);
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
