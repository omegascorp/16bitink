import type Phaser from 'phaser';
import type { Hero } from '../../logic/hero';
import { faceOf, heroArt, PX_TEX } from '../battle/pixelAssets';
import { drawPortrait, SLOT, SLOT_GAP } from '../battle/pixelFrames';
import { putBuffer } from '../battle/pixelUi';
import { heroListKey, travelLeft } from './heroListData';

/** The travel bar under a face: its height and the gap above it, UI pixels. */
const BAR = { h: 3, gap: 1 } as const;
const BAR_BACK = 0x160e09;
const BAR_FILL = 0x8fd860;
/** The list's height: a face and its bar. */
export const HERO_LIST_H = SLOT + BAR.gap + BAR.h;

/**
 * The player's heroes as a row of faces (the turn order's 32 px cut, a
 * hero's own art when drawn), the picked one framed in gold and the rest
 * in plain iron, each with a bar of the travel left today; a tap picks that
 * hero. `root` is the row's bottom left corner: the faces stand on it.
 */
export class HeroList {
  readonly root: Phaser.GameObjects.Container;
  /** Each face drawn so far, by hero and frame: cut once, kept while the list lives. */
  private readonly faces = new Map<string, string>();
  private shown: string | null = null;

  constructor(private readonly scene: Phaser.Scene, private readonly onPick: (id: string) => void) {
    this.root = scene.add.container(0, 0);
  }

  /** The row's width for `n` heroes. */
  static width(n: number): number {
    return n * SLOT + Math.max(0, n - 1) * SLOT_GAP;
  }

  /** Shows `heroes` in that order, `picked` in gold; none at all with fewer than two (there's no one else to pick). */
  set(heroes: readonly Hero[], picked: string): void {
    const list = heroes.length > 1 ? heroes : [];
    const key = heroListKey(list, picked);
    if (key === this.shown) return;
    this.shown = key;
    this.root.removeAll(true);
    list.forEach((h, i) => {
      const x = i * (SLOT + SLOT_GAP);
      const img = this.scene.add.image(x, -HERO_LIST_H, this.face(h.id, h.id === picked)).setOrigin(0).setInteractive();
      img.on('pointerup', () => this.onPick(h.id));
      const barY = -BAR.h;
      const back = this.scene.add.rectangle(x, barY, SLOT, BAR.h, BAR_BACK).setOrigin(0);
      const fill = this.scene.add.rectangle(x, barY, Math.round(SLOT * travelLeft(h)), BAR.h, BAR_FILL).setOrigin(0);
      this.root.add([img, back, fill]);
    });
  }

  /** Whether any faces show. */
  get visible(): boolean {
    return this.root.length > 0;
  }

  /** Hero `id`'s face, framed in gold when `picked`. */
  private face(id: string, picked: boolean): string {
    const at = `${id}|${picked}`;
    let key = this.faces.get(at);
    if (!key) {
      const art = heroArt('player', id);
      key = putBuffer(this.scene, drawPortrait(faceOf(this.scene, PX_TEX.hero(art.id, 'idle'), art.art), picked ? 'gold' : 'dim', false, false));
      this.faces.set(at, key);
    }
    return key;
  }

  destroy(): void {
    this.root.destroy();
    for (const k of this.faces.values()) if (this.scene.textures.exists(k)) this.scene.textures.remove(k);
    this.faces.clear();
  }
}
