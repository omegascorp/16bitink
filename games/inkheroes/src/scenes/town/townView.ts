import Phaser from 'phaser';
import { DISPLAY, UI } from '../../art/palette';
import { TEX } from '../../art/textures';
import { townPieces } from '../../art/townscape';
import { PIECE_SLOT, SLOTS, TOWN_RES, TOWN_VIEW, type TownPiece } from '../../art/townscape/types';
import { BUILDINGS, type BuildingId } from '../../logic/buildings';

/** Brightens a building under the pointer (added to its colours). */
const LIFT = 0x22201a;

export interface TownViewOpts {
  /** A building was tapped. */
  readonly onPick: (building: BuildingId) => void;
  /** Just built: inks itself in. */
  readonly fresh?: BuildingId;
}

/** The pieces a town with `built` shows (for baking before the view is made). */
export const shownPieces = (built: readonly BuildingId[]): TownPiece[] => townPieces(built).map((p) => p.piece);

/**
 * The townscape: the painted ground with each built building standing in
 * its slot, back to front. A building lightens and names itself under the
 * pointer, and a tap picks it. Its textures must be baked (townJobs).
 */
export function townView(scene: Phaser.Scene, built: readonly BuildingId[], opts: TownViewOpts): Phaser.GameObjects.Container {
  const c = scene.add.container(0, 0);
  c.add(scene.add.image(0, 0, TEX.townGround).setOrigin(0).setScale(1 / TOWN_RES));
  const label = scene.add.text(0, 0, '', { fontFamily: DISPLAY, fontStyle: '700', fontSize: '18px', color: UI.title, backgroundColor: 'rgba(26,15,11,0.9)', padding: { x: 12, y: 5 } }).setOrigin(0.5, 1).setVisible(false);
  for (const { piece, building } of townPieces(built)) {
    const slot = SLOTS[PIECE_SLOT[piece]];
    const fr = slot.frame;
    const img = scene.add.image(slot.x, slot.y, TEX.town(piece)).setOrigin(fr.ox / fr.w, fr.oy / fr.h).setScale(1 / TOWN_RES);
    img.setInteractive({ pixelPerfect: true, alphaTolerance: 40, useHandCursor: true });
    img.on('pointerover', () => {
      img.setTint(LIFT).setTintMode(Phaser.TintModes.ADD);
      label.setText(BUILDINGS[building].name).setPosition(slot.x, Math.max(30, slot.y - fr.oy + 26)).setVisible(true);
    });
    img.on('pointerout', () => {
      img.clearTint();
      label.setVisible(false);
    });
    img.on('pointerup', () => opts.onPick(building));
    c.add(img);
    if (building === opts.fresh) inkIn(scene, img);
  }
  c.add(label);
  return c;
}

/** A new building rises into place. */
function inkIn(scene: Phaser.Scene, img: Phaser.GameObjects.Image): void {
  const y = img.y;
  img.setAlpha(0).setY(y + 10);
  scene.tweens.add({ targets: img, alpha: 1, y, duration: 700, ease: 'Cubic.easeOut' });
}

export { TOWN_VIEW };
