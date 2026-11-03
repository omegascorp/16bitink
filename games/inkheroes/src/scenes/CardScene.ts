import Phaser from 'phaser';
import type { PlateKind } from '../art/uiArtParts';
import { PixelCard } from './battle/pixelCard';
import { pixelUiCamera } from './pixelScreen';

export interface CardButton {
  readonly label: string;
  /** A second line under the label (a skill's effect). */
  readonly note?: string;
  readonly kind?: PlateKind;
  readonly onClick: () => void;
}

export interface CardSpec {
  readonly title: string;
  readonly body: string;
  readonly buttons: readonly CardButton[];
  /** Laurels to show (victory), out of 3. */
  readonly blots?: number;
}

/**
 * A card over the map, the town or the menu, as the battle's pixel card on
 * the art's grid: a title, some text, laurels for a won map, its buttons.
 * Any button closes the card before running its action.
 */
export class CardScene extends Phaser.Scene {
  constructor() {
    super('Card');
  }

  create(spec: CardSpec): void {
    let card: PixelCard | null = null;
    // Two taps in one frame must not answer the card twice (stop() only takes effect next frame).
    let answered = false;
    const root = this.add.container(0, 0);
    const draw = (size: { w: number; h: number }, quiet: boolean): void => {
      card?.dispose();
      card = new PixelCard(this, root, spec, size, () => {
        answered = true;
        this.scene.stop();
      }, quiet);
    };
    const fit = pixelUiCamera(this, (size) => {
      if (!answered) draw(size, true);
    });
    draw(fit(), false);
  }
}

/** Opens a card (closing any card already open). */
export function openCard(scene: Phaser.Scene, spec: CardSpec): void {
  if (scene.scene.isActive('Card')) scene.scene.stop('Card');
  scene.scene.launch('Card', spec);
  scene.scene.bringToTop('Card');
}
