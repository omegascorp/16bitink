import type Phaser from 'phaser';
import { BLUE } from '../art/palette';

/** The prospector's hand: notes written into the world (fxView), the beacon's label, and the loading line. Printed type is in kit/type.ts. */
export const HAND_FONT = '"Caveat", "Patrick Hand", "Comic Sans MS", cursive';

/** Handwriting, centred. */
export function inkText(scene: Phaser.Scene, x: number, y: number, text: string, size: number, color: string = BLUE): Phaser.GameObjects.Text {
  return scene.add.text(x, y, text, { fontFamily: HAND_FONT, fontSize: `${size}px`, color, padding: { x: size * 0.2, y: 4 } }).setOrigin(0.5);
}
