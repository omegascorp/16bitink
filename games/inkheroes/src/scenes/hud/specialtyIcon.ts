import type Phaser from 'phaser';
import type { Specialty } from '../../logic/specialty';
import { faceOf, PX_TEX, unitArt } from '../battle/pixelAssets';
import { drawPortrait } from '../battle/pixelFrames';
import { putBuffer, UI_TEX } from '../battle/pixelUi';

/** Where ART's painted specialty icon for hero `id` will load (32 px); until it does, a stand-in is drawn. */
export const SPECIALTY_TEX = (id: string): string => `pxui-specialty-${id}`;

/**
 * Hero `id`'s specialty icon, `size` across, at (x, y): ART's own when it
 * is loaded, else the line's unit face, the spell's icon or the gold icon.
 * A face cut for it is a texture of its own: its key goes in `keys`, for
 * the caller to remove with the rest.
 */
export function specialtyIcon(scene: Phaser.Scene, id: string, spec: Specialty, x: number, y: number, size: number, keys: string[]): Phaser.GameObjects.Image {
  const key = iconKey(scene, id, spec, size, keys);
  return scene.add.image(x, y, key).setOrigin(0).setDisplaySize(size, size);
}

function iconKey(scene: Phaser.Scene, id: string, spec: Specialty, size: number, keys: string[]): string {
  const painted = SPECIALTY_TEX(id);
  if (scene.textures.exists(painted)) return painted;
  if (spec.kind === 'spell') return UI_TEX.spell(spec.spell);
  if (spec.kind === 'gold') return UI_TEX.res('gold');
  const unit = PX_TEX.unit(spec.line, 'idle');
  if (!scene.textures.exists(unit)) return UI_TEX.stat('attack');
  const key = putBuffer(scene, drawPortrait(faceOf(scene, unit, unitArt(spec.line), size - 4), 'bronze', false, false, size));
  keys.push(key);
  return key;
}
