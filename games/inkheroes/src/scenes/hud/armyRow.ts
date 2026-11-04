import type Phaser from 'phaser';
import { ARMY_SLOTS, type Army } from '../../logic/army';
import { badgeTexture, faceOf, PX_TEX, unitArt } from '../battle/pixelAssets';
import { drawPortrait, drawSocket, SLOT, SLOT_GAP, type RimName } from '../battle/pixelFrames';
import { putBuffer } from '../battle/pixelUi';

/** How wide a row of seven slots is, UI pixels. */
export const ARMY_ROW_W = ARMY_SLOTS * (SLOT + SLOT_GAP) - SLOT_GAP;

/**
 * An army's seven slots as faces in frames, each with its count (the map's
 * hero panel, the town's garrison and visitor). A slot can be lit (picked)
 * and tapped. Faces are cut once per creature and rim and kept.
 */
export class ArmyRow {
  readonly root: Phaser.GameObjects.Container;
  private readonly slots: { img: Phaser.GameObjects.Image; badge: Phaser.GameObjects.Image }[] = [];
  private readonly keys = new Map<string, string>();

  constructor(private readonly scene: Phaser.Scene, onTap?: (i: number) => void) {
    const parts: Phaser.GameObjects.GameObject[] = [];
    for (let i = 0; i < ARMY_SLOTS; i++) {
      const x = i * (SLOT + SLOT_GAP);
      const img = scene.add.image(x, 0, this.empty('dim')).setOrigin(0);
      const badge = scene.add.image(x + SLOT - 1, SLOT - 1, '__DEFAULT').setOrigin(1, 1).setVisible(false);
      if (onTap) {
        img.setInteractive();
        img.on('pointerup', () => onTap(i));
      }
      this.slots.push({ img, badge });
      parts.push(img, badge);
    }
    this.root = scene.add.container(0, 0, parts);
  }

  private empty(rim: RimName): string {
    const id = `empty-${rim}`;
    let key = this.keys.get(id);
    if (!key) {
      key = putBuffer(this.scene, drawSocket(SLOT, rim));
      this.keys.set(id, key);
    }
    return key;
  }

  private face(creature: string, rim: RimName): string {
    const id = `${creature}-${rim}`;
    let key = this.keys.get(id);
    if (!key) {
      key = putBuffer(this.scene, drawPortrait(faceOf(this.scene, PX_TEX.unit(creature, 'idle'), unitArt(creature)), rim, false, false));
      this.keys.set(id, key);
    }
    return key;
  }

  /** Shows `army` (null: seven dim empty slots), the `lit` slot in gold. */
  set(army: Army | null, lit: number | null = null): void {
    this.slots.forEach((s, i) => {
      const slot = army?.[i] ?? null;
      const rim: RimName = i === lit ? 'gold' : army ? 'bronze' : 'dim';
      s.img.setTexture(slot ? this.face(slot.creature, rim) : this.empty(rim));
      s.badge.setVisible(!!slot);
      if (slot) s.badge.setTexture(badgeTexture(this.scene, 0, slot.count));
    });
  }

  setPosition(x: number, y: number): this {
    this.root.setPosition(Math.round(x), Math.round(y));
    return this;
  }

  destroy(): void {
    this.root.destroy();
    for (const k of this.keys.values()) if (this.scene.textures.exists(k)) this.scene.textures.remove(k);
    this.keys.clear();
  }
}
