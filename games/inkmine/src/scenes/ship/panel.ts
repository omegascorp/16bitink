import type Phaser from 'phaser';
import { BLUE_HEX, PAPER_HEX } from '../../art/palette';
import type { Profile } from '../../logic/economy';
import type { SlotRef } from '../../logic/inventory';
import { inkText, wobblyRect } from '../ui';

export const SOFT_INK = '#4a463e';

/** What the ship page remembers across a redraw (a redraw is a scene restart). */
export interface ShipUi {
  /** A line to show at the top after printing something. */
  readonly news?: string;
  /** The stack picked up to move. */
  readonly selected?: SlotRef;
  /** The jettison button was pressed once: the next press throws the stack away. */
  readonly confirm?: boolean;
}

/** What a panel needs from the page: the profile, and a way to change it (saving and redrawing). */
export interface ShipPage {
  readonly scene: Phaser.Scene;
  readonly profile: Profile;
  readonly ui: ShipUi;
  commit(p: Profile, ui?: ShipUi): void;
  /** Redraws with new page state only. */
  setUi(ui: ShipUi): void;
}

/** A paper frame behind a section, drawn once its rows are measured, with its title. */
export function section(scene: Phaser.Scene, x: number, y: number, w: number, h: number, title: string, seed: number): void {
  const g = scene.add.graphics().setDepth(-1);
  g.fillStyle(PAPER_HEX, 1).fillRect(x, y, w, h);
  wobblyRect(g, x, y, w, h, seed, 1.6, BLUE_HEX);
  inkText(scene, x + 16, y + 24, title, 30).setOrigin(0, 0.5);
}
