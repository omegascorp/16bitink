import type Phaser from 'phaser';
import { ARMY_SLOTS, type Army } from '../../logic/army';
import { badgeTexture, faceOf, PX_TEX, unitArt } from '../battle/pixelAssets';
import { drawPortrait, drawSocket, SLOT, SLOT_GAP, type RimName } from '../battle/pixelFrames';
import { putBuffer } from '../battle/pixelUi';

/** A portrait's frame round the cut, UI pixels. */
const FRAME = 4;

/**
 * An army's seven slots as portraits in frames, each with its count (the
 * town's garrison and visitor, the hero's sheet), `slot` pixels across. A
 * slot can be lit (picked). Portraits are cut once per creature and rim and
 * kept. Set `onPress` to hear a press on a slot (ArmyDrag does).
 */
export class ArmyRow {
  readonly root: Phaser.GameObjects.Container;
  /** A slot was pressed. */
  onPress: ((i: number, pointer: Phaser.Input.Pointer) => void) | null = null;
  private readonly slots: { img: Phaser.GameObjects.Image; badge: Phaser.GameObjects.Image }[] = [];
  private readonly keys = new Map<string, string>();

  constructor(private readonly scene: Phaser.Scene, private readonly slot: number = SLOT) {
    const parts: Phaser.GameObjects.GameObject[] = [];
    for (let i = 0; i < ARMY_SLOTS; i++) {
      const x = i * (slot + SLOT_GAP);
      const img = scene.add.image(x, 0, this.empty('dim')).setOrigin(0);
      const badge = scene.add.image(x + slot - 1, slot - 1, '__DEFAULT').setOrigin(1, 1).setVisible(false);
      img.setInteractive();
      img.on('pointerdown', (p: Phaser.Input.Pointer) => this.onPress?.(i, p));
      this.slots.push({ img, badge });
      parts.push(img, badge);
    }
    this.root = scene.add.container(0, 0, parts);
  }

  private empty(rim: RimName): string {
    const id = `empty-${rim}`;
    let key = this.keys.get(id);
    if (!key) {
      key = putBuffer(this.scene, drawSocket(this.slot, rim));
      this.keys.set(id, key);
    }
    return key;
  }

  private face(creature: string, rim: RimName): string {
    const id = `${creature}-${rim}`;
    let key = this.keys.get(id);
    if (!key) {
      key = putBuffer(this.scene, drawPortrait(faceOf(this.scene, PX_TEX.unit(creature, 'idle'), unitArt(creature), this.slot - FRAME), rim, false, false, this.slot));
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

  /** The slot's picture now, for a copy that follows the pointer. */
  textureOf(i: number): string {
    return this.slots[i]!.img.texture.key;
  }

  /** The slot at world point (x, y), or -1. */
  slotAt(x: number, y: number): number {
    return this.slots.findIndex((s) => s.img.getBounds().contains(x, y));
  }

  /** Dims slot `i` while its company is being carried off (null: none). */
  carry(i: number | null): void {
    this.slots.forEach((s, k) => {
      s.img.setAlpha(k === i ? 0.4 : 1);
      s.badge.setAlpha(k === i ? 0.4 : 1);
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
