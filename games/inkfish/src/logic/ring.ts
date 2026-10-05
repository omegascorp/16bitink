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

/** Ordinary fish live within this far of the view's centre, either way round the ring, whatever its width. */
export const SHOAL_HALF = 1800;
/** How much further out a fish may stray before it's gone: well clear of where new ones appear. */
const SHOAL_SLACK = 200;

/**
 * Half the width of the shoal band around a view `viewW` wide on a ring
 * `width` around: SHOAL_HALF, widened to keep clear of a very wide view, and
 * never more than half the ring.
 */
export function shoalReach(viewW: number, width: number): number {
  return Math.min(width / 2 - SHOAL_SLACK, Math.max(SHOAL_HALF, viewW / 2 + 400));
}

/** A fish this far round the ring from the view has left the shoal (see shoalReach). */
export function outsideShoal(x: number, viewX: number, viewW: number, width: number): boolean {
  return Math.abs(nearestOnRing(x, viewX, width) - viewX) > shoalReach(viewW, width) + SHOAL_SLACK;
}
