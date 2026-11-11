import type Phaser from 'phaser';
import { knobOffset, type Pt } from '../../logic/stick';
import type { StickHold } from '../boardInput';
import { roundButtonFace, UI_RES, UI_TEX } from '../uiPaint';

/** The knob's diameter. */
const KNOB = 42;

/**
 * The thumbstick on screen, painted: a dashed pencil ring in the lower-left
 * corner says where it is, and under a thumb a well pressed into a paper
 * disc where the thumb landed, with a round knob that follows it to the rim.
 */
export class ThumbStick {
  private readonly rest: Phaser.GameObjects.Image;
  private readonly base: Phaser.GameObjects.Image;
  private readonly knob: Phaser.GameObjects.Container;
  private at: Pt = { x: 0, y: 0 };
  private shown = true;

  constructor(scene: Phaser.Scene) {
    this.rest = scene.add.image(0, 0, UI_TEX.stickRest).setScale(1 / UI_RES);
    this.base = scene.add.image(0, 0, UI_TEX.stickBase).setScale(1 / UI_RES).setVisible(false);
    this.knob = roundButtonFace(scene, KNOB).setVisible(false);
  }

  /** Where the resting ring sits. */
  place(x: number, y: number): void {
    this.at = { x, y };
    this.rest.setPosition(x, y);
  }

  get restAt(): Pt {
    return this.at;
  }

  setVisible(on: boolean): void {
    this.shown = on;
    this.rest.setVisible(on && !this.base.visible);
    if (!on) this.update(null);
  }

  /** The thumb as it is now (null: no thumb on the stick). */
  update(hold: StickHold | null): void {
    const held = hold !== null && this.shown;
    this.base.setVisible(held);
    this.knob.setVisible(held);
    this.rest.setVisible(this.shown && !held);
    if (!hold || !held) return;
    const k = knobOffset(hold.dx, hold.dy);
    this.base.setPosition(hold.x, hold.y);
    this.knob.setPosition(hold.x + k.x, hold.y + k.y);
  }
}
