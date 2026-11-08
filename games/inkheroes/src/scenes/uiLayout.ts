/**
 * Plain layout numbers (no Phaser, so they can be tested): how big a card may
 * draw and how big a finger's target must be.
 */

/** The smallest touch target, CSS px (Apple's and Google's guidance). */
export const MIN_TOUCH = 44;
/** Room kept round a card on screen, layout units. */
const CARD_ROOM = { x: 32, y: 32 } as const;

export interface Size {
  readonly width: number;
  readonly height: number;
}

/** How big a card w × h draws in a view: shrunk to fit a small screen, never grown past `grow`. */
export function cardFit(view: Size, card: { readonly w: number; readonly h: number }, grow = 1): number {
  return Math.max(0.3, Math.min(grow, (view.height - CARD_ROOM.y) / card.h, (view.width - CARD_ROOM.x) / card.w));
}

/** A hit area at least MIN_TOUCH CSS px across for a part `visual` units across, drawn at `scale` CSS px per unit. */
export function hitSize(visual: number, scale: number): number {
  return Math.max(visual + 8, MIN_TOUCH / Math.max(0.01, scale));
}
