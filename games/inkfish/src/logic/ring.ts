/**
 * The sea is a ring: swim off one side and you come in on the other, with no
 * edge to see. Positions are not wrapped into [0, width); instead everything
 * is kept at its copy nearest the camera, so distances between nearby things
 * stay plain subtraction and the player can swim on in one direction for good.
 */

/** Most of the ring the camera may show at once: the rest is room for whatever straddles the far side. */
export const RING_VIEW_SHARE = 0.7;

/** How far the camera may travel either way, world px (a few hours of swimming one way). */
export const RING_REACH = 1e7;

/** The copy of `x` on a ring `width` around that is nearest `center`. */
export function nearestOnRing(x: number, center: number, width: number): number {
  const d = x - center;
  const half = width / 2;
  if (d <= half && d >= -half) return x;
  return x - width * Math.round(d / width);
}

/** `x` folded into [0, width). */
export function ringX(x: number, width: number): number {
  return x - width * Math.floor(x / width);
}

/** The nearest wavelength to `wave` that fits a whole number of times around the ring, so a wave meets itself. */
export function ringWavelength(wave: number, width: number): number {
  const turns = Math.max(1, Math.round(width / (2 * Math.PI * wave)));
  return width / (2 * Math.PI * turns);
}

/** The widest view of a ring `width` around: never so wide that something could be due on both sides at once. */
export function ringViewWidth(width: number): number {
  return width * RING_VIEW_SHARE;
}

/**
 * Off to the side of a view (centre `viewX`, `viewW` wide) by more than
 * `margin` px. Nothing is ever more than half the ring away, so the reach is
 * capped just short of that.
 */
export function pastView(x: number, viewX: number, viewW: number, width: number, margin: number): boolean {
  const reach = Math.min(viewW / 2 + margin, width / 2 - 50);
  return Math.abs(nearestOnRing(x, viewX, width) - viewX) > reach;
}
