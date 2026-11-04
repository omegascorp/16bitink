import type Phaser from 'phaser';
import type { Town } from '../../logic/town';
import { PixelButton, putBuffer, texturePixels } from '../battle/pixelUi';
import { shrinkSmooth } from '../town/townPictures';
import { townListKey } from './townListData';

/** A row's height and the gap between rows, UI pixels. */
export const TOWN_ROW_H = 36;
const ROW_GAP = 2;
/** How much smaller than the map's sprite a picture is painted, and how it is shown: twice as sharp as a UI pixel. */
const PICTURE_SHRINK = 3;
const PICTURE_SCALE = 0.5;

export interface TownListHost {
  /** The texture of a town's sprite on the map. */
  textureOf(t: Town): string;
  onOpen(id: string): void;
}

/**
 * The player's towns as a stack of rows, each the town's own picture (as it
 * stands on the map, so it grows with the town) and its name; a tap opens
 * that town. `root` is the bottom left corner: the rows rise from it.
 */
export class TownList {
  readonly root: Phaser.GameObjects.Container;
  private rows: PixelButton[] = [];
  private pictures: string[] = [];
  private shown: string | null = null;

  constructor(private readonly scene: Phaser.Scene, private readonly w: number, private readonly host: TownListHost) {
    this.root = scene.add.container(0, 0);
  }

  /** Shows `towns`; `here`, on the town screen, is the one open: framed in gold, and a tap on it does nothing. */
  set(towns: readonly Town[], here?: string): void {
    const key = townListKey(towns, here);
    if (key === this.shown) return;
    this.shown = key;
    this.clear();
    towns.forEach((t, i) => {
      const picture = putBuffer(this.scene, shrinkSmooth(texturePixels(this.scene, this.host.textureOf(t)), PICTURE_SHRINK));
      this.pictures.push(picture);
      const row = new PixelButton(this.scene, { w: this.w, h: TOWN_ROW_H, label: t.name, picture: { key: picture, scale: PICTURE_SCALE }, ...(t.id === here ? { rim: 'gold' as const } : {}), onClick: () => t.id !== here && this.host.onOpen(t.id) });
      row.setPosition(0, -(towns.length - i) * (TOWN_ROW_H + ROW_GAP) + ROW_GAP);
      this.rows.push(row);
      this.root.add(row.root);
    });
  }

  private clear(): void {
    for (const r of this.rows) r.destroy();
    for (const k of this.pictures) if (this.scene.textures.exists(k)) this.scene.textures.remove(k);
    this.rows = [];
    this.pictures = [];
  }

  destroy(): void {
    this.clear();
    this.root.destroy();
  }
}
