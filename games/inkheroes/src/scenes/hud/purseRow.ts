import type Phaser from 'phaser';
import { RESOURCES, type Purse } from '../../logic/resources';
import { TextLabel, UI_TEX } from '../battle/pixelUi';

/** The purse bar's height, and the room each amount takes (gold runs to five figures), UI pixels. */
export const PURSE_BAR_H = 22;
const PURSE_W = { gold: 62, other: 48 } as const;
/** The widest the seven amounts take. */
export const PURSE_ROW_W = PURSE_W.gold + (RESOURCES.length - 1) * PURSE_W.other;
const ICON = 16;
const LINE = 15;

/** The seven resources in a row, each its pixel icon and amount (the map's top bar, the town's bottom one). */
export class PurseRow {
  private readonly icons: Phaser.GameObjects.Image[];
  private readonly amounts: TextLabel[];

  constructor(scene: Phaser.Scene, depth: number) {
    this.icons = RESOURCES.map((r) => scene.add.image(0, 0, UI_TEX.res(r)).setOrigin(0).setDepth(depth));
    this.amounts = RESOURCES.map(() => {
      const t = new TextLabel(scene, { align: 'left', anchor: { x: 0, y: 0 } });
      t.img.setDepth(depth);
      return t;
    });
  }

  /** Lays the row out from `x` in a bar of PURSE_BAR_H whose top is `top`; the x it ends at. */
  place(x: number, top: number): number {
    let at = x;
    RESOURCES.forEach((r, i) => {
      this.icons[i]!.setPosition(at, top + Math.floor((PURSE_BAR_H - 2 - ICON) / 2) - 1);
      this.amounts[i]!.setPosition(at + ICON + 3, top + Math.floor((PURSE_BAR_H - 2 - LINE) / 2));
      at += r === 'gold' ? PURSE_W.gold : PURSE_W.other;
    });
    return at;
  }

  set(purse: Purse): void {
    RESOURCES.forEach((r, i) => this.amounts[i]!.setText(String(purse[r])));
  }

  destroy(): void {
    for (const t of this.amounts) t.destroy();
    for (const i of this.icons) i.destroy();
  }
}
