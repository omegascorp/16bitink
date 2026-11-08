/**
 * Whether a button's pointer events add up to a click (no Phaser, so it can be
 * tested). Kept apart from how the button looks: a touch sends `over` after
 * `down` (and `out` after `up`), so a hover look must not undo the press.
 */

export type PressEvent = 'over' | 'out' | 'down' | 'up';

export interface PressStep {
  /** Held down on the button, waiting for its release. */
  readonly pressed: boolean;
  /** This event ended a click. */
  readonly click: boolean;
}

/** The press after `ev`, from `pressed` before it; an off button never presses. */
export function pressStep(pressed: boolean, ev: PressEvent, enabled: boolean): PressStep {
  if (ev === 'down') return { pressed: enabled, click: false };
  if (ev === 'out') return { pressed: false, click: false };
  if (ev === 'up') return { pressed: false, click: pressed && enabled };
  return { pressed, click: false };
}

/** How long a finger rests on something to ask about it (a touch's right click), ms. */
export const LONG_PRESS_MS = 450;
/** How far a long press may wander and still count, CSS px. */
const LONG_PRESS_SLOP = 12;

/** Whether a touch held `heldMs` that moved `movedCss` from where it went down is a long press. */
export function isLongPress(heldMs: number, movedCss: number): boolean {
  return heldMs >= LONG_PRESS_MS && movedCss <= LONG_PRESS_SLOP;
}
