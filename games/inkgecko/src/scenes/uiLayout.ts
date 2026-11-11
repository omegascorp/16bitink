import { frameBox, FULL_BOARD, type Box, type Framing } from '../logic/framing';
import { STICK } from '../logic/joystick';
import type { Pt } from '../logic/path';

/**
 * Where the interface goes, as plain numbers (no Phaser, so it can be
 * tested): how big a card may draw, how big a finger's target must be,
 * where the board sits, and where the HUD's pieces go round it.
 */

/** The smallest touch target, CSS px (Apple's and Google's guidance). */
export const MIN_TOUCH = 44;
/** Room kept round a card on screen, layout units. */
const CARD_ROOM = { x: 44, y: 40 } as const;
/** Room kept for the HUD above and below an upright board, CSS px. */
const UPRIGHT_HUD = 56;
/** A touch screen held sideways keeps a column this wide either side of the board for the HUD, CSS px... */
const SIDE_COL = 60;
/** ...or, where that would shrink the board more, a strip along the top. */
const TOP_STRIP = { margin: 8, row: 54 } as const;
/** The thumbstick's ring with its rim, and the Spit and Swap buttons, CSS px (drawn the same size on any screen). */
export const TOUCH = { stick: STICK.radius + 8, fire: 42, swap: 28, edge: 12 } as const;
/** A touch screen's board is never drawn bigger than this, CSS px per board px. */
const MAX_TOUCH_ZOOM = 1.6;

export interface Size {
  readonly width: number;
  readonly height: number;
}

/** A phone held upright: the board turns a quarter to fill it. */
export function uprightScreen(width: number, height: number): boolean {
  return height > width * 1.15;
}

/**
 * How a card w × h draws in a view: shrunk to fit a short screen,
 * and allowed to grow up to `grow` where there's room (an upright phone,
 * whose interface scale is set by its narrow width, has height to spare).
 */
export function cardFit(view: Size, card: { readonly w: number; readonly h: number }, grow = 1): number {
  return Math.max(0.3, Math.min(grow, (view.height - CARD_ROOM.y) / card.h, (view.width - CARD_ROOM.x) / card.w));
}

/** A hit area at least MIN_TOUCH CSS px across for a part `visual` units across, drawn at `scale` CSS px per unit. */
export function hitSize(visual: number, scale: number): number {
  return Math.max(visual + 8, MIN_TOUCH / Math.max(0.01, scale));
}

/**
 * How the HUD sits round the board: over it (a laptop: the whole board,
 * pieces along its top), in columns beside it or a strip above it (a
 * touch screen held sideways), or in strips above and below it (upright).
 */
export type HudMode = 'over' | 'sides' | 'top' | 'upright';

/** Where the board draws on screen and how the HUD sits round it. */
export interface Stage {
  readonly mode: HudMode;
  /** Laid out for fingers: the thumbstick and buttons show, and the tag keeps to the clock. */
  readonly touch: boolean;
  /** The board turned a quarter (upright). */
  readonly turned: boolean;
  readonly framing: Framing;
  /** How far the board's view is moved down the screen from its centre, CSS px (to clear the top strip). */
  readonly shiftY: number;
  /** Free screen either side of the board's box (landscape) or above and below it (upright), CSS px. */
  readonly room: number;
}

/**
 * Lays the board out on a screen. A laptop shows the whole board, as big
 * as fits, with the HUD over it. A touch screen shows the level's `box`
 * (its lines and gecko: bare ground round them is cut) and keeps the HUD
 * off it: upright in strips above and below; sideways in columns either
 * side or a strip along the top, whichever leaves the board bigger.
 */
export function stagePlan(css: Size, uiScale: number, box: Box, touch: boolean): Stage {
  const show = touch ? box : FULL_BOARD;
  const cap = touch ? MAX_TOUCH_ZOOM : Infinity;
  const wide = show.x1 - show.x0;
  if (uprightScreen(css.width, css.height)) {
    const framing = frameBox({ width: css.width, height: css.height - UPRIGHT_HUD * 2 }, show, true, cap);
    return { mode: 'upright', touch, turned: true, framing, shiftY: 0, room: Math.max(UPRIGHT_HUD, (css.height - wide * framing.zoom) / 2) };
  }
  const beside = (framing: Framing): number => Math.max(0, (css.width - wide * framing.zoom) / 2);
  if (!touch) {
    const framing = frameBox(css, show, false);
    return { mode: 'over', touch, turned: false, framing, shiftY: 0, room: beside(framing) };
  }
  const sides = frameBox({ width: css.width - SIDE_COL * 2, height: css.height }, show, false, cap);
  const strip = (TOP_STRIP.margin + TOP_STRIP.row) * uiScale;
  const top = frameBox({ width: css.width, height: css.height - strip }, show, false, cap);
  if (sides.zoom >= top.zoom) return { mode: 'sides', touch, turned: false, framing: sides, shiftY: 0, room: Math.max(SIDE_COL, beside(sides)) };
  return { mode: 'top', touch, turned: false, framing: top, shiftY: strip / 2, room: beside(top) };
}

export interface HudPlan {
  readonly mode: HudMode;
  readonly upright: boolean;
  /** Extra scale for the HUD's pieces (upright phones draw them bigger: they have the room). */
  readonly k: number;
  /** The level's tag: its top-left corner; `compact` is the clock alone (touch screens). */
  readonly tag: Pt & { readonly compact: boolean };
  /** The meter: the centre of its row, or the top centre of its column. */
  readonly meter: Pt & { readonly column: boolean; readonly scale: number };
  /** The round buttons' centres: pause, then sound (a touch screen held sideways keeps sound on the pause card). */
  readonly buttons: readonly Pt[];
  /** The hint note's centre line, and the widest it may be (clear of the stick and the buttons). */
  readonly hintY: number;
  readonly hintW: number;
  /** Touch: the thumbstick's ring, and the Spit and Swap buttons, centres. */
  readonly stick: Pt;
  readonly fire: Pt;
  readonly swap: Pt;
}

export interface HudSizes {
  /** A round button's diameter, the gap kept from the edges, and the meter's height, units. */
  readonly button: number;
  readonly margin: number;
  readonly meterH: number;
  /** The compact tag's width, and the meter column's width and height, units. */
  readonly tagW: number;
  readonly colW: number;
  readonly colH: number;
}

/**
 * Lays the HUD out round the board (see Stage), in the view's units
 * (`uiScale` CSS px each). The thumbstick sits in the lower-left corner and
 * the Spit button (Swap just above it) in the lower-right, at the same size
 * on any screen. The hint sits at the bottom, or mid-board on rail levels
 * (the gecko runs along the bottom there).
 */
export function hudPlan(view: Size, stage: Stage, uiScale: number, rail: boolean, s: HudSizes): HudPlan {
  const { width, height } = view;
  const u = (cssPx: number): number => cssPx / uiScale;
  /** The stick and buttons along `bottom`; `col` centres them in a column that wide down each side (CSS px), as far as they fit. */
  const corners = (bottom: number, col = 0): Pick<HudPlan, 'stick' | 'fire' | 'swap'> => {
    const fire = { x: width - u(Math.max(col / 2, TOUCH.edge + TOUCH.fire)), y: bottom - u(TOUCH.fire) };
    // Swap sits just above Spit: straight above it in a column, else a little in towards the board.
    const lean = col > 0 ? 0 : u(TOUCH.fire * 0.7);
    return {
      stick: { x: u(Math.max(col / 2, TOUCH.edge + TOUCH.stick)), y: bottom - u(TOUCH.stick) },
      fire,
      swap: { x: fire.x - lean, y: fire.y - u(TOUCH.fire + 12 + TOUCH.swap) },
    };
  };
  if (stage.mode === 'upright') {
    const k = Math.min(1.3, Math.max(1, width / 560));
    const b = s.button * k;
    const room = u(stage.room);
    const top = s.margin + b / 2;
    const meterY = height - Math.max(s.margin + (s.meterH * k) / 2, room / 2);
    const hintY = meterY - (s.meterH * k) / 2 - 44 * k;
    return {
      mode: stage.mode, upright: true, k,
      tag: { x: s.margin, y: s.margin, compact: stage.touch },
      meter: { x: width / 2, y: meterY, column: false, scale: 1 },
      buttons: [{ x: width - s.margin - b / 2, y: top }, { x: width - s.margin - b * 1.5 - 10 * k, y: top }],
      hintY,
      hintW: (width - s.margin * 2) / k,
      ...corners(hintY - 40 * k - s.margin),
    };
  }
  const b = s.button;
  const hintY = rail ? height * 0.5 : height - 40;
  /** A bottom hint's width between the stick and the buttons (a mid-board one has the whole width). */
  const clearOfControls = (c: Pick<HudPlan, 'stick' | 'fire'>): number => (rail ? width : 2 * Math.min(width / 2 - c.stick.x - u(TOUCH.stick), c.fire.x - u(TOUCH.fire) - width / 2)) - s.margin * 2;
  if (stage.mode === 'sides') {
    const col = u(stage.room) / 2;
    const controls = corners(height - u(TOUCH.edge), stage.room);
    // The meter column keeps on screen, and shrinks on a short screen to stay clear of Swap.
    const right = Math.max(col, s.colW / 2 + 4);
    const room = controls.swap.y - u(TOUCH.swap) - 10 - s.margin;
    return {
      mode: stage.mode, upright: false, k: 1,
      tag: { x: Math.max(4, col - s.tagW / 2), y: s.margin + b + 10, compact: true },
      meter: { x: width - right, y: s.margin, column: true, scale: Math.min(1, room / s.colH) },
      buttons: [{ x: Math.max(col, b / 2 + 4), y: s.margin + b / 2 }],
      hintY,
      hintW: clearOfControls(controls),
      ...controls,
    };
  }
  if (stage.mode === 'top') {
    const y = s.margin + b / 2;
    const controls = corners(height - u(TOUCH.edge));
    return {
      mode: stage.mode, upright: false, k: 1,
      tag: { x: s.margin, y: y - 20, compact: true },
      meter: { x: width / 2, y, column: false, scale: 1 },
      buttons: [{ x: width - s.margin - b / 2, y }, { x: width - s.margin - b * 1.5 - 10, y }],
      hintY,
      hintW: clearOfControls(controls),
      ...controls,
    };
  }
  // Over the board: the buttons stack down the paper beside it when there's room there.
  const side = u(stage.room);
  const stacked = side >= b + s.margin * 2;
  const x = stacked ? width - side / 2 : width - s.margin - b / 2;
  const controls = corners(height - u(TOUCH.edge));
  return {
    mode: stage.mode, upright: false, k: 1,
    tag: { x: s.margin, y: s.margin, compact: false },
    meter: { x: width / 2, y: s.margin + s.meterH / 2, column: false, scale: 1 },
    buttons: stacked ? [{ x, y: s.margin + b / 2 }, { x, y: s.margin + b * 1.5 + 12 }] : [{ x, y: s.margin + b / 2 }, { x: x - b - 10, y: s.margin + b / 2 }],
    // Rail levels: mid-board, clear of the lines that start along the top and the branch along the bottom.
    hintY,
    hintW: stage.touch ? clearOfControls(controls) : width - s.margin * 2,
    ...controls,
  };
}
