import type Phaser from 'phaser';

/** A computer with a mouse: Nib walks by keyboard, and the thumbstick stays hidden until a touch. */
export function isDesktop(): boolean {
  try {
    return window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  } catch {
    return false;
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
