import type Phaser from 'phaser';

/** How the player moves Nib: tap the floor to send Nib there, or walk with a joystick / arrow keys. */
export type ControlMode = 'tap' | 'stick';
const CONTROLS_KEY = 'inkpin.controls';

/** A computer with a mouse: Nib walks by keyboard or a click, and there's no joystick to choose. */
export function isDesktop(): boolean {
  try {
    return window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  } catch {
    return false;
  }
}

export function readControls(): ControlMode {
  if (isDesktop()) return 'tap';
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
