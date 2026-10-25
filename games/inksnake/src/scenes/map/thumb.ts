import Phaser from 'phaser';
import { ART_RES, BLUE_HEX } from '../../art/palette';
import { snakeArt } from '../../art/snakes/index';
import { bakeBoard, bakeCovers, freeTexture, TEX } from '../../art/textures';
import { SNAKE_W } from '../../art/types';
import { SNAKE_SPECS } from '../../logic/species';
import { BOARD, type LevelDef, type Place } from '../../level/types';

/**
 * A level's real board in miniature, for its card: the same painting the
 * level is played on (baked now, and kept for when it starts), its cover,
 * and the snake's head where it starts. Fits `w` × `h`, centred on (0, 0)
 * of the returned container.
 */
export function boardPreview(scene: Phaser.Scene, level: LevelDef, place: Place, w: number, h: number): Phaser.GameObjects.Container {
  const k = Math.min(w / BOARD.w, h / BOARD.h);
  const parts: Phaser.GameObjects.GameObject[] = [scene.add.image(0, 0, bakeBoard(scene, level, place)).setOrigin(0).setScale(1 / ART_RES)];
  const covers = bakeCovers(scene, level, place);
  if (covers) parts.push(scene.add.image(0, 0, covers).setOrigin(0).setScale(1 / ART_RES));
  const art = snakeArt(level.snake);
  const key = TEX.head(level.snake, 'shut', 0);
  if (scene.textures.exists(key)) {
    // Drawn big enough to find in the miniature.
    const size = (SNAKE_SPECS[level.snake].width / SNAKE_W) * 2.6;
    parts.push(scene.add.image(level.start.x, level.start.y, key).setRotation(level.heading).setScale(size / art.head.res));
  }
  const board = scene.add.container(-(BOARD.w * k) / 2, -(BOARD.h * k) / 2, parts).setScale(k);
  const frame = scene.add.graphics();
  frame.lineStyle(1.6, BLUE_HEX, 0.9).strokeRect(-(BOARD.w * k) / 2, -(BOARD.h * k) / 2, BOARD.w * k, BOARD.h * k);
  return scene.add.container(0, 0, [board, frame]);
}

/** Frees a preview's baked board (when its card closes without playing). */
export function dropPreview(scene: Phaser.Scene, level: LevelDef): void {
  for (const key of [TEX.board(level.id), TEX.covers(level.id)]) freeTexture(scene, key);
}
