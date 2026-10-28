import type Phaser from 'phaser';

/** How the player moves Nib: tap the floor to send Nib there, or walk with a joystick / arrow keys. */
export type ControlMode = 'tap' | 'stick';
const CONTROLS_KEY = 'inkpin.controls';

export function readControls(): ControlMode {
  try {
    return window.localStorage.getItem(CONTROLS_KEY) === 'stick' ? 'stick' : 'tap';
  } catch {
    return 'tap';
  }
}

export function saveControls(mode: ControlMode): void {
  try {
    window.localStorage.setItem(CONTROLS_KEY, mode);
  } catch {
    // Storage blocked: the choice lasts for this visit.
  }
}

/** Marks a pointer press as handled by the interface, which sits above the board and hears it first. */
export function hudTake(p: Phaser.Input.Pointer): void {
  (p as Phaser.Input.Pointer & { hudAt?: number }).hudAt = p.downTime;
}

/** True when the interface already handled this press. */
export function hudTook(p: Phaser.Input.Pointer): boolean {
  return (p as Phaser.Input.Pointer & { hudAt?: number }).hudAt === p.downTime;
}
