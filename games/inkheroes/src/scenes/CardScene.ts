import Phaser from 'phaser';
import type { StatName } from '../art/pixel/ui';
import type { PlateKind } from '../art/uiArtParts';
import { PixelBuildCard, previewReady, type CardView } from './battle/pixelBuildCard';
import { PixelCard } from './battle/pixelCard';
import type { DwellingPreview } from './battle/unitCard';
import { PixelHeroSheet, type SheetSource } from './hud/pixelHeroSheet';
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
  /** The hero sheet: drawn in place of the text, with this face and army. */
  readonly sheet?: SheetSource;
  /** A picture above the text (a texture key): a piece of gear just won. */
  readonly picture?: string;
  /** What it gives, picked out in gold with its icon above the text. */
  readonly perk?: { readonly icon: StatName; readonly text: string };
  /** Laurels to show (victory), out of 3. */
  readonly blots?: number;
  /** A building that hires a unit: its picture and stats (or the old and new unit of an upgrade) go above the text. */
  readonly preview?: DwellingPreview;
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
    let card: CardView | null = null;
    // Two taps in one frame must not answer the card twice (stop() only takes effect next frame).
    let answered = false;
    const root = this.add.container(0, 0);
    const draw = (size: { w: number; h: number }, quiet: boolean): void => {
      card?.dispose();
      const done = (): void => {
        answered = true;
        this.scene.stop();
      };
      card = spec.sheet ? new PixelHeroSheet(this, root, spec, spec.sheet, size, done, quiet) : spec.preview && previewReady(this, spec.preview) ? new PixelBuildCard(this, root, spec, spec.preview, size, done, quiet) : new PixelCard(this, root, spec, size, done, quiet);
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
