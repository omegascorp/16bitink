import type Phaser from 'phaser';
import { BOOK, UI } from '../art/palette';

/** A line in italic parchment while something is painted ("the armies form up…"), centred on (x, y). */
export function loadingText(scene: Phaser.Scene, x: number, y: number, text: string, size: number): Phaser.GameObjects.Text {
  return scene.add.text(x, y, text, { fontFamily: BOOK, fontStyle: 'italic', fontSize: `${size}px`, color: UI.muted, align: 'center', padding: { x: size * 0.2, y: 4 } }).setOrigin(0.5);
}
