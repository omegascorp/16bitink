import Phaser from 'phaser';
import { GECKO_RES } from '../../art/geckoArt';
import { ART_RES, BLUE_HEX } from '../../art/palette';
import { bakeBoard, bakeCovers, TEX } from '../../art/textures';
import type { Place } from '../../level/levels';
import { BOARD, type LevelDef } from '../../level/types';
import { buildPath, pointAt } from '../../logic/path';

/** The board's burrow and well sprites are baked at this many texture px per unit. */
const PLACE_RES = 3;
const GECKO_TINT = 0x6f9d57;

/**
 * A level's real board in miniature, for its card: the same painting the
 * level is played on (baked now, and kept for when it starts), its tunnels,
 * burrows and wells, and the gecko where it starts. Fits `w` × `h`, centred
 * on (0, 0) of the returned container.
 */
export function boardPreview(scene: Phaser.Scene, level: LevelDef, place: Place, w: number, h: number): Phaser.GameObjects.Container {
  const k = Math.min(w / BOARD.w, h / BOARD.h);
  const parts: Phaser.GameObjects.GameObject[] = [scene.add.image(0, 0, bakeBoard(scene, level, place)).setOrigin(0).setScale(1 / ART_RES)];
  for (const t of level.tracks) {
    const path = buildPath(t.points);
    const start = pointAt(path, 0);
    const end = pointAt(path, path.length);
    parts.push(scene.add.image(start.x, start.y, TEX.burrow(0)).setScale(1 / PLACE_RES));
    parts.push(scene.add.image(end.x, end.y, TEX.well(0)).setScale(1 / PLACE_RES));
  }
  const covers = bakeCovers(scene, level);
  if (covers) parts.push(scene.add.image(0, 0, covers).setOrigin(0).setScale(1 / ART_RES));
  const s = level.shooter;
  const at = s.kind === 'pivot' ? s : s.kind === 'hop' ? s.pads[0]! : { x: (s.x0 + s.x1) / 2, y: s.y };
  for (const key of [TEX.geckoSkin('idle', 0), TEX.geckoLines('idle', 0)]) {
    const img = scene.add.image(at.x, at.y, key).setScale(1 / GECKO_RES);
    if (key.includes('skin')) img.setTint(GECKO_TINT);
    parts.push(img);
  }
  const board = scene.add.container(-(BOARD.w * k) / 2, -(BOARD.h * k) / 2, parts).setScale(k);
  const frame = scene.add.graphics();
  frame.lineStyle(1.6, BLUE_HEX, 0.9).strokeRect(-(BOARD.w * k) / 2, -(BOARD.h * k) / 2, BOARD.w * k, BOARD.h * k);
  return scene.add.container(0, 0, [board, frame]);
}

/** Frees a preview's baked board (when its card closes without playing). */
export { dropBoard as dropPreview } from '../../art/textures';
