import Phaser from 'phaser';
import type { Ability } from '../../logic/abilities/index';
import { paintedButton } from '../uiPaint';

const W = 150;
const H = 54;

/**
 * The snake's ability on screen: a painted button that's held down (play
 * dead, bury, lure while it's held; one press for the rest). It dims while
 * the ability recharges and bobs while it's in use. The keyboard's E or
 * Shift does the same; the label says so on a screen with a keyboard.
 */
export class AbilityButton {
  readonly root: Phaser.GameObjects.Container;
  private shownCharge = -1;

  constructor(scene: Phaser.Scene, private readonly ability: Ability, keys: boolean, onHold: (held: boolean) => void) {
    this.root = paintedButton(scene, 0, 0, keys ? `${ability.label} · E` : ability.label, () => undefined, { width: W, height: H, size: 24, kind: 'sky' });
    // Held, not clicked: the press itself is the action.
    this.root.on('pointerdown', () => onHold(true));
    this.root.on('pointerup', () => onHold(false));
    this.root.on('pointerout', () => onHold(false));
  }

  static readonly size = { w: W, h: H } as const;

  update(time: number): void {
    const c = this.ability.charge;
    if (c !== this.shownCharge) {
      this.shownCharge = c;
      this.root.setAlpha(c >= 1 ? 1 : 0.45 + 0.35 * c);
    }
    this.root.setAngle(this.ability.active ? Math.sin(time / 90) * 2.5 : 0);
  }

  /** Whether a press at (x, y), in the HUD's units, is on the button. */
  contains(x: number, y: number, k: number): boolean {
    return Math.abs(x - this.root.x) < (W / 2) * k + 8 && Math.abs(y - this.root.y) < (H / 2) * k + 8;
  }
}
