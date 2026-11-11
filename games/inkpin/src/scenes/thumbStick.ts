import type Phaser from 'phaser';
import { INK_HEX, PAPER_HEX } from '../art/palette';
import { knobOffset, STICK, type Pt } from '../logic/stick';
import type { StickHold } from './boardInput';

/**
 * The thumbstick on screen, in ink on paper discs (as InkGecko's): a faint
 * ring in the lower-left corner says where it is, and under a thumb a base
 * where the thumb landed with a knob that follows it to the rim. In the
 * HUD's units, which are CSS px.
 */
export class ThumbStick {
  private readonly g: Phaser.GameObjects.Graphics;
  private rest: Pt = { x: 0, y: 0 };
  private hold: StickHold | null = null;

  constructor(scene: Phaser.Scene) {
    this.g = scene.add.graphics();
  }

  /** Where the resting ring sits. */
  place(x: number, y: number): void {
    this.rest = { x, y };
    this.draw();
  }

  get restAt(): Pt {
    return this.rest;
  }

  get visible(): boolean {
    return this.g.visible;
  }

  setVisible(on: boolean): void {
    this.g.setVisible(on);
  }

  /** The thumb as it is now (null: no thumb on the stick). */
  update(hold: StickHold | null): void {
    this.hold = hold;
    this.draw();
  }

  private draw(): void {
    const g = this.g.clear();
    const r = STICK.radius;
    const hold = this.hold;
    if (!hold) {
      g.fillStyle(PAPER_HEX, 0.35).fillCircle(this.rest.x, this.rest.y, r);
      g.lineStyle(1.8, INK_HEX, 0.4).strokeCircle(this.rest.x, this.rest.y, r);
      g.fillStyle(INK_HEX, 0.3).fillCircle(this.rest.x, this.rest.y, 8);
      return;
    }
    g.fillStyle(PAPER_HEX, 0.55).fillCircle(hold.x, hold.y, r + 6);
    g.lineStyle(2.5, INK_HEX, 0.7).strokeCircle(hold.x, hold.y, r + 6);
    const k = knobOffset(hold.dx, hold.dy);
    g.fillStyle(INK_HEX, 0.8).fillCircle(hold.x + k.x, hold.y + k.y, STICK.knob);
  }
}
