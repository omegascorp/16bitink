/**
 * Where things go on a small screen (a phone, either way up), worked out
 * apart from Phaser: the touch buttons' corner, the narrator's strip kept
 * clear of it, and story cards fitted to the screen. Sizes are in a scene's
 * layout units; a scene drawn at interface scale `scale` has 1/scale of
 * them per CSS pixel.
 */

/** A round button: its middle and radius. */
export interface Disc {
  readonly x: number;
  readonly y: number;
  readonly r: number;
}

export interface PadButtons {
  readonly jump: Disc;
  readonly bag: Disc;
  readonly pulse: Disc;
}

/** The touch buttons' sizes in CSS pixels, scaled back up from the interface scale so they stay thumb-sized. */
export const PAD = { jump: 46, bag: 32, margin: 26, bagGap: 18, pulseGap: 22 } as const;

/** Where the right thumb's buttons sit on a screen `width`×`height`: Jump in the corner, Bag beside it, Pulse above. */
export function padButtons(width: number, height: number, scale: number): PadButtons {
  const css = (px: number): number => px / scale;
  const jr = css(PAD.jump);
  const br = css(PAD.bag);
  const m = css(PAD.margin);
  const jump = { x: width - m - jr, y: height - m - jr, r: jr };
  const bag = { x: jump.x - jr - br - css(PAD.bagGap), y: jump.y - jr * 0.9, r: br };
  const pulse = { x: jump.x - jr * 0.2, y: jump.y - jr - br - css(PAD.pulseGap), r: br };
  return { jump, bag, pulse };
}

/** How much of the bottom-right corner the buttons take: from the right edge, and up from the bottom. */
export interface Corner {
  readonly side: number;
  readonly rise: number;
}

/** The corner the buttons take, with the Pulse button when `armed`. */
export function padCorner(width: number, height: number, scale: number, armed: boolean): Corner {
  const { jump, bag, pulse } = padButtons(width, height, scale);
  const discs = armed ? [jump, bag, pulse] : [jump, bag];
  return {
    side: width - Math.min(...discs.map((d) => d.x - d.r)),
    rise: height - Math.min(...discs.map((d) => d.y - d.r)),
  };
}

/** The narrator's strip: its widest, how far up from the bottom it sits, the narrowest it may get between the buttons, and how far it keeps from them. */
export const STRIP_FIT = { w: 700, lift: 78, min: 520, clear: 12, edge: 16 } as const;

/** Where the strip goes: its middle, its width, and how far up it sits. */
export interface StripPlace {
  readonly x: number;
  readonly w: number;
  readonly lift: number;
}

/**
 * Where the narrator's strip sits on a screen `width` wide: low and centred,
 * but clear of the touch buttons' `corner` while they show. On a wide screen
 * (a phone on its side) it stays centred between them if it can, else
 * slides left of them; on a narrow one it goes up over them.
 */
export function stripPlace(width: number, corner: Corner | null): StripPlace {
  const low = { x: width / 2, w: Math.min(STRIP_FIT.w, width - STRIP_FIT.edge * 2), lift: STRIP_FIT.lift };
  if (!corner) return low;
  const free = width - corner.side - STRIP_FIT.clear;
  const centred = Math.min(low.w, (free - width / 2) * 2);
  if (centred >= STRIP_FIT.min) return { ...low, w: centred };
  const beside = Math.min(low.w, free - STRIP_FIT.edge);
  if (beside >= STRIP_FIT.min) return { ...low, x: (STRIP_FIT.edge + free) / 2, w: beside };
  return { ...low, lift: Math.max(STRIP_FIT.lift, corner.rise + STRIP_FIT.clear) };
}

/** A card fitted to the screen keeps this clear above and below it, and at its sides when it widens; it grows no wider than `wide`. */
export const CARD_FIT = { gap: 12, wide: 900 } as const;

/** Whether a card `h` tall (plus `margin` round it for its shadow) fits a screen `viewH` tall. */
export function cardFits(h: number, viewH: number, margin: number): boolean {
  return h + margin * 2 <= viewH - CARD_FIT.gap * 2;
}

/** How wide a card may grow on a screen `viewW` wide, so its text takes fewer lines. */
export function cardWidest(viewW: number, margin: number): number {
  return Math.min(CARD_FIT.wide, viewW - (CARD_FIT.gap + margin) * 2);
}

/** The scale a card `h` tall draws at to fit a screen `viewH` tall, its button on it: 1, or less on a short screen. */
export function cardScale(h: number, viewH: number, margin: number): number {
  return cardFits(h, viewH, margin) ? 1 : (viewH - CARD_FIT.gap * 2) / (h + margin * 2);
}
