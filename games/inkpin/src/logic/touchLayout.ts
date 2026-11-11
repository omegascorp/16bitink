import { STICK, type Pt } from './stick';

/**
 * Where the interface goes on a touch screen, as plain numbers (no Phaser,
 * so it can be tested), CSS px. The board keeps out of the edges the
 * interface takes (Insets), so no pin, ledge or Nib ever lies under a
 * control: held sideways the controls stand in a column down each side and
 * the haul along the top; held upright the page and haul take the top and
 * the controls a band along the bottom.
 */

/** How far in from each edge the interface reaches over the board. */
export interface Insets {
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly left: number;
  /** Laid out for fingers: the camera opens closer (TOUCH_SHOWN). */
  readonly touch: boolean;
}

/** How much of a level a touch screen shows when it opens (board px), so its pins and Nib are big enough to tap and see. */
export const TOUCH_SHOWN = { w: 560, h: 460 } as const;

/** The sizes the plan works with, CSS px. */
export const TOUCH_SIZES = { edge: 12, button: 46, zoom: 40, jump: 66, gap: 10, status: 44, title: 40 } as const;

export interface TouchPlan {
  readonly insets: Insets;
  /** Round buttons' centres. */
  readonly map: Pt;
  readonly restart: Pt;
  readonly hint: Pt;
  readonly zoomIn: Pt;
  readonly zoomOut: Pt;
  readonly stick: Pt;
  readonly jump: Pt;
  /** The haul's top-left corner. */
  readonly status: Pt;
  /** The level's name: its top-left corner and the most it may be across, or null where there's no room. */
  readonly title: (Pt & { readonly maxW: number }) | null;
  /** The tip: the middle of its bottom edge and the most it may be across. */
  readonly tip: Pt & { readonly maxW: number };
  /** The way out once the goal is met: its centre. */
  readonly leave: Pt;
}

/** A level name narrower than this isn't worth showing. */
const TITLE_MIN = 120;

/** Lays the touch interface out on a width × height screen; `statusW` is the haul's width. */
export function touchPlan(width: number, height: number, statusW: number): TouchPlan {
  const s = TOUCH_SIZES;
  const r = STICK.radius;
  if (height > width) return upright(width, height, statusW);
  // Sideways: a column down each side, as wide as the stick's ring.
  const col = 2 * (s.edge + r) + 8;
  const mid = col / 2;
  const top = s.edge + s.button / 2;
  const rowY = height - s.edge - r - 6;
  const zoomTop = s.edge + s.button + s.gap + s.zoom / 2;
  const statusX = width - col - statusW;
  const titleW = statusX - col - 12;
  const strip = 8 + s.status + 6;
  return {
    insets: { top: strip, right: col, bottom: 8, left: col, touch: true },
    map: { x: mid, y: top },
    hint: { x: mid, y: s.edge + s.button + s.gap + s.button / 2 },
    restart: { x: width - mid, y: top },
    zoomIn: { x: width - mid, y: zoomTop },
    zoomOut: { x: width - mid, y: zoomTop + s.zoom + s.gap },
    stick: { x: mid, y: rowY },
    jump: { x: width - mid, y: rowY },
    status: { x: statusX, y: 8 },
    title: titleW >= TITLE_MIN ? { x: col, y: 6, maxW: titleW } : null,
    tip: { x: width / 2, y: height - 10, maxW: width - col * 2 - 16 },
    leave: { x: width / 2, y: height - 80 },
  };
}

/** Upright: the page and the haul along the top, the stick, the zoom and tip buttons and the jump button in a band along the bottom. */
function upright(width: number, height: number, statusW: number): TouchPlan {
  const s = TOUCH_SIZES;
  const r = STICK.radius;
  const top = s.edge + s.button / 2;
  const rowY = height - s.edge - 10 - r;
  const band = height - (rowY - r - 12);
  const statusY = s.edge + s.button + 6;
  const stickX = s.edge + r + 14;
  const jumpX = width - s.edge - 6 - s.jump / 2;
  // The zoom and tip buttons sit midway between the stick's ring and the jump button.
  const between = (stickX + r + jumpX - s.jump / 2) / 2;
  const titleX = s.edge + s.button + 8;
  return {
    insets: { top: statusY + s.status + 8, right: 6, bottom: band, left: 6, touch: true },
    map: { x: s.edge + s.button / 2, y: top },
    restart: { x: width - s.edge - s.button / 2, y: top },
    zoomOut: { x: between - s.zoom - s.gap, y: rowY },
    hint: { x: between, y: rowY },
    zoomIn: { x: between + s.zoom + s.gap, y: rowY },
    stick: { x: stickX, y: rowY },
    jump: { x: jumpX, y: rowY },
    status: { x: (width - statusW) / 2, y: statusY },
    title: { x: titleX, y: 6, maxW: width - titleX * 2 },
    tip: { x: width / 2, y: height - band - 8, maxW: width - 24 },
    leave: { x: width / 2, y: height - band - 80 },
  };
}

/** How long a tip stays up on a touch screen before it fades, ms: time to read it, no longer. */
export function tipHoldMs(line: string): number {
  return Math.min(9000, 2600 + line.length * 55);
}
