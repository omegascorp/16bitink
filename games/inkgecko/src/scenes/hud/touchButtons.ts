import Phaser from 'phaser';
import { MARBLE_R, MARBLE_RES } from '../../art/marbleArt';
import { BOIL, INK_HEX } from '../../art/palette';
import { TEX } from '../../art/textures';
import type { ColourId } from '../../logic/colours';
import type { Pt } from '../../logic/path';
import { uiScaleOf } from '../hidpi';
import { TOUCH } from '../uiLayout';
import { roundPlate } from '../uiPaint';

/** A round button on screen, CSS px: its centre and how far from it a finger still presses it. */
export interface Disc {
  readonly x: number;
  readonly y: number;
  readonly r: number;
}

/** A finger still counts as on a button this far past its rim, CSS px. */
const SLACK = 10;
/** The paper plates let the board show through a little: the corners they sit in may hold a burrow or a well. */
const PLATE_ALPHA = 0.78;

/** One round paper button holding a marble, drawn the same CSS size on any screen. */
class MarbleButton {
  readonly root: Phaser.GameObjects.Container;
  private readonly face: Phaser.GameObjects.Image;
  private readonly shadow: Phaser.GameObjects.Image;
  private readonly marble: Phaser.GameObjects.Image;
  private readonly extra: Phaser.GameObjects.Graphics;
  private at: Pt = { x: 0, y: 0 };

  constructor(scene: Phaser.Scene, private readonly r: number, marbleR: number) {
    const plate = roundPlate(scene, r * 2);
    this.face = plate.face.setAlpha(PLATE_ALPHA);
    this.shadow = plate.shadow;
    this.marble = scene.add.image(0, 0, TEX.marble('red', 0)).setScale(marbleR / MARBLE_R / MARBLE_RES);
    this.extra = scene.add.graphics();
    this.root = scene.add.container(0, 0, [this.shadow, this.face, this.extra, this.marble]);
  }

  get graphics(): Phaser.GameObjects.Graphics {
    return this.extra;
  }

  /** Centres it at `at` (HUD units); its size stays in CSS px whatever the HUD's scale. */
  place(at: Pt, uiScale: number): void {
    this.at = at;
    this.root.setPosition(at.x, at.y).setScale(1 / uiScale);
  }

  disc(uiScale: number): Disc {
    return { x: this.at.x * uiScale, y: this.at.y * uiScale, r: this.r + SLACK };
  }

  show(colour: ColourId, frame: number, down: boolean): void {
    this.marble.setTexture(TEX.marble(colour, frame));
    const dy = down ? 2.5 : 0;
    this.face.setY(dy);
    this.marble.setY(dy);
    this.extra.setY(dy);
    this.shadow.setAlpha((down ? 0.4 : 0.8) * PLATE_ALPHA);
  }
}

/**
 * Touch: the Spit button in the lower-right corner, holding the marble in
 * the gecko's mouth, and the smaller Swap button above it, holding the one
 * on its tail, with a pair of arrows round it. The HUD draws them; the
 * game's input reads the presses (so a finger on a button never stops the
 * thumb on the stick from being read).
 */
export class TouchButtons {
  private readonly fire: MarbleButton;
  private readonly swap: MarbleButton;
  private visible = true;

  constructor(private readonly scene: Phaser.Scene) {
    this.fire = new MarbleButton(scene, TOUCH.fire, TOUCH.fire * 0.5);
    this.swap = new MarbleButton(scene, TOUCH.swap, TOUCH.swap * 0.42);
    drawSwapArrows(this.swap.graphics, TOUCH.swap * 0.72);
  }

  place(fire: Pt, swap: Pt): void {
    const s = uiScaleOf(this.scene);
    this.fire.place(fire, s);
    this.swap.place(swap, s);
  }

  setVisible(on: boolean): void {
    this.visible = on;
    this.fire.root.setVisible(on);
    this.swap.root.setVisible(on);
  }

  /** Where the buttons are, CSS px, or null while they're hidden. */
  discs(): { readonly fire: Disc; readonly swap: Disc } | null {
    if (!this.visible) return null;
    const s = uiScaleOf(this.scene);
    return { fire: this.fire.disc(s), swap: this.swap.disc(s) };
  }

  update(loaded: ColourId, next: ColourId, fireDown: boolean, swapDown: boolean, time: number): void {
    const f = Math.floor(time / 160) % BOIL;
    this.fire.show(loaded, f, fireDown);
    this.swap.show(next, (f + 1) % BOIL, swapDown);
  }
}

/** Two curved arrows chasing each other round a circle of radius r: "swap". */
function drawSwapArrows(g: Phaser.GameObjects.Graphics, r: number): void {
  g.lineStyle(2.2, INK_HEX, 0.75);
  for (const start of [-2.6, 0.54]) {
    const end = start + 1.9;
    g.beginPath();
    g.arc(0, 0, r, start, end);
    g.strokePath();
    const tip = { x: Math.cos(end) * r, y: Math.sin(end) * r };
    // The arrowhead points along the arc, the way it turns.
    const along = end + Math.PI / 2;
    const back = (a: number): Pt => ({ x: tip.x - Math.cos(along + a) * 6, y: tip.y - Math.sin(along + a) * 6 });
    const l = back(0.5);
    const rr = back(-0.5);
    g.lineBetween(tip.x, tip.y, l.x, l.y);
    g.lineBetween(tip.x, tip.y, rr.x, rr.y);
  }
}
