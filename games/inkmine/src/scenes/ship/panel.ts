import Phaser from 'phaser';
import type { Profile } from '../../logic/economy';
import type { SlotRef } from '../../logic/inventory';
import { createRng } from '../../logic/rng';
import type { Tab } from '../../logic/tech';
import { bakeUi, fibres } from '../kit/paint';
import { plate, PLATE_BODY } from '../kit/plate';
import { SEPIA } from '../kit/type';

export const SOFT_INK = SEPIA;
/** Where a section's rows start, under its heading. */
export const SECTION_BODY = PLATE_BODY + 4;
/** A section's side padding. */
export const PAD = 22;

/** What the ship page remembers across a redraw (a redraw is a scene restart). */
export interface ShipUi {
  /** A line to show at the top after printing something. */
  readonly news?: string;
  /** The stack picked up to move. */
  readonly selected?: SlotRef;
  /** The jettison button was pressed once: the next press throws the stack away. */
  readonly confirm?: boolean;
  /** The tab showing: the suit or the ship. */
  readonly tab?: Tab;
  /** The technology slot the detail card shows (a techKey). */
  readonly focus?: string;
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

/** A plate behind a section, drawn once its rows are measured, with its heading. */
export function section(scene: Phaser.Scene, x: number, y: number, w: number, h: number, title: string, seed: number): void {
  plate(scene, x, y, w, h, { title, seed });
}

/** A hairline between two rows of a section. */
export function divider(scene: Phaser.Scene, x: number, y: number, w: number): void {
  scene.add.graphics().lineStyle(0.6, 0x1f2a55, 0.28).lineBetween(x + PAD, y, x + w - PAD, y);
}

const DESK = 512;

/** The page under the plates: a big sheet of laid paper, tiled. */
export function desk(scene: Phaser.Scene, w: number, h: number): void {
  const key = bakeUi(scene, 'ui-desk', DESK, DESK, (ctx) => {
    ctx.fillStyle = '#ece3cd';
    ctx.fillRect(0, 0, DESK, DESK);
    const rng = createRng(3);
    fibres(ctx, rng, 0, 0, DESK, DESK);
    // Laid lines: the faint ribbing of handmade paper.
    ctx.strokeStyle = 'rgba(120, 100, 60, 1)';
    for (let y = 0; y < DESK; y += 6) {
      ctx.globalAlpha = 0.025 + rng() * 0.02;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(DESK, y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  });
  scene.add.tileSprite(0, 0, w, h, key).setOrigin(0).setTileScale(0.5).setDepth(-10);
}
