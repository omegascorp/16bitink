import Phaser from 'phaser';
import { itemQuality, type ItemId } from '../../logic/items';
import { drawSocket } from '../battle/pixelFrames';
import { putBuffer, UI_TEX } from '../battle/pixelUi';
import { QUALITY_RIM } from '../battle/rankLook';
import { ITEM_CELL, ITEM_STEP, itemCellsSize } from './itemGrid';

export { ITEM_CELL, itemCols } from './itemGrid';

/** The picked place's glow: the titles' gold, faint. */
const PICK_GLOW = 0xf8d26e;
const PICK_ALPHA = 0.28;

export interface ItemCellsSpec {
  /** The pieces in order; places past them are empty. */
  readonly items: readonly ItemId[];
  /** How many places to draw. */
  readonly count: number;
  readonly cols: number;
  readonly picked: number | null;
  /** A tap on place `i`, full or empty (an empty one is where a picked piece goes). */
  onTap(i: number): void;
}

/**
 * A bag's or a store's pieces as a grid of framed icons, each framed in its
 * grade's colour, the picked one in gold. Every place answers a tap, so a
 * piece picked elsewhere can be sent to an empty one.
 */
export class ItemCells {
  readonly root: Phaser.GameObjects.Container;
  readonly w: number;
  readonly h: number;
  private readonly keys: string[] = [];

  constructor(private readonly scene: Phaser.Scene, spec: ItemCellsSpec) {
    this.root = scene.add.container(0, 0);
    const size = itemCellsSize(spec.count, spec.cols);
    this.w = size.w;
    this.h = size.h;
    const cols = Math.max(1, Math.min(spec.count, spec.cols));
    for (let i = 0; i < spec.count; i++) {
      const item = spec.items[i];
      const x = (i % cols) * ITEM_STEP;
      const y = Math.floor(i / cols) * ITEM_STEP;
      const key = putBuffer(scene, drawSocket(ITEM_CELL, spec.picked === i ? 'gold' : item ? QUALITY_RIM[itemQuality(item)] : 'bronze'));
      this.keys.push(key);
      const frame = scene.add.image(x, y, key).setOrigin(0).setInteractive();
      frame.on('pointerup', () => spec.onTap(i));
      this.root.add(frame);
      // The gold rim alone is too close to bronze to read: the picked place glows too.
      if (spec.picked === i) this.root.add(scene.add.rectangle(x + 3, y + 3, ITEM_CELL - 6, ITEM_CELL - 6, PICK_GLOW, PICK_ALPHA).setOrigin(0));
      if (item) this.root.add(scene.add.image(x + ITEM_CELL / 2, y + ITEM_CELL / 2, UI_TEX.item(item)).setScale(0.5));
    }
  }

  setPosition(x: number, y: number): this {
    this.root.setPosition(x, y);
    return this;
  }

  destroy(): void {
    this.root.destroy();
    for (const k of this.keys) if (this.scene.textures.exists(k)) this.scene.textures.remove(k);
  }
}
