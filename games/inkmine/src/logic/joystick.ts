/**
 * The on-screen stick for touch screens: where the thumb lands is its
 * centre, and how far it has pulled from there, past a dead zone, reads as
 * the arrow keys would (walk left or right, drill down or up). A pull
 * mostly one way counts only that way; a true diagonal counts as both. In
 * CSS pixels.
 */
export const STICK = {
  /** Pull from the centre that reaches the rim, px. */
  radius: 52,
  /** Share of the radius ignored round the centre, so a resting thumb doesn't drift. */
  deadZone: 0.3,
  /** A pull's lesser axis counts too only above this share of its greater one (about 30° off the axis). */
  diagonal: 0.58,
} as const;

export interface StickDirection {
  readonly ix: -1 | 0 | 1;
  readonly iy: -1 | 0 | 1;
}

const sign = (v: number): -1 | 0 | 1 => (v > 0 ? 1 : v < 0 ? -1 : 0);

/** The arrow keys a pull of (dx, dy) stands for. */
export function stickDirection(dx: number, dy: number): StickDirection {
  const d = Math.hypot(dx, dy);
  if (d <= STICK.radius * STICK.deadZone) return { ix: 0, iy: 0 };
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  const big = Math.max(ax, ay);
  return {
    ix: ax >= big * STICK.diagonal ? sign(dx) : 0,
    iy: ay >= big * STICK.diagonal ? sign(dy) : 0,
  };
}

/** Where to draw the knob for a pull of (dx, dy): the pull, kept within the rim. */
export function knobOffset(dx: number, dy: number): { readonly x: number; readonly y: number } {
  const d = Math.hypot(dx, dy);
  if (d <= STICK.radius) return { x: dx, y: dy };
  return { x: (dx / d) * STICK.radius, y: (dy / d) * STICK.radius };
}
