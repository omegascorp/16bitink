import Phaser from 'phaser';
import { INK_HEX, PAPER_HEX } from '../../art/palette';
import { knobOffset, STICK } from '../../logic/joystick';
import type { StickHold } from '../game/input';
import { uiScaleOf } from '../hidpi';

/**
 * The thumbstick on screen, in ink on paper discs: a faint ring in the
 * lower-left corner says where it is, and under a thumb a base where the
 * thumb landed with a knob that follows it to the rim. Drawn at the same
 * CSS size however the HUD is scaled.
 */
export class ThumbStick {
  private readonly g: Phaser.GameObjects.Graphics;
  private rest = { x: 0, y: 0 };
  private drawn: StickHold | null | undefined;

  constructor(private readonly scene: Phaser.Scene) {
    this.g = scene.add.graphics();
  }

  /** Where the resting ring sits, in the HUD's units. */
  place(x: number, y: number): void {
    this.rest = { x, y };
    this.drawn = undefined;
  }

  setVisible(on: boolean): void {
    this.g.setVisible(on);
  }

  /** Redraws for the thumb as it is now (null: no thumb on the stick). */
  update(hold: StickHold | null): void {
    if (hold === this.drawn) return;
    this.drawn = hold;
    const g = this.g.clear();
    // CSS px to the HUD's units.
    const s = 1 / uiScaleOf(this.scene);
    const r = STICK.radius * s;
    if (!hold) {
      g.lineStyle(1.6 * s, INK_HEX, 0.3).strokeCircle(this.rest.x, this.rest.y, r);
      g.fillStyle(INK_HEX, 0.2).fillCircle(this.rest.x, this.rest.y, 6 * s);
      return;
    }
    const x = hold.x * s;
    const y = hold.y * s;
    g.fillStyle(PAPER_HEX, 0.45).fillCircle(x, y, r + 8 * s);
    g.lineStyle(2 * s, INK_HEX, 0.6).strokeCircle(x, y, r + 8 * s);
    const k = knobOffset(hold.dx, hold.dy);
    g.fillStyle(PAPER_HEX, 0.9).fillCircle(x + k.x * s, y + k.y * s, STICK.knob * s);
    g.lineStyle(2 * s, INK_HEX, 0.8).strokeCircle(x + k.x * s, y + k.y * s, STICK.knob * s);
  }
}
