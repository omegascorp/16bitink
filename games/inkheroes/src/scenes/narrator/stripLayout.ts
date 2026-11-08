/**
 * Where the narrator's strip goes and how its parts sit (spec, "Narration"),
 * in UI pixels. Plain numbers, no Phaser, so they can be tested. Each
 * screen says where it has room (see `StripRoom`): the map at its bottom
 * left, beside the hero's panel, when that's wide enough, else under the
 * top bar; the town under its Sound button, clear of the town strip; any
 * other screen under its top corner buttons.
 */

/** A free stretch of the screen for the strip: `w` wide from `x`, its top (`from: 'top'`) or its bottom edge at `y`. */
export interface StripRoom {
  readonly x: number;
  readonly w: number;
  readonly y: number;
  readonly from: 'top' | 'bottom';
}

export interface Box {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

export const STRIP = {
  /** Widest: about 42 characters of subtitle a line, and the buttons. */
  maxW: 400,
  /** Narrowest that still reads: less room than this, and the map puts it at the top. */
  minW: 300,
  pad: 6,
  /** The buttons: pause and skip square, Read wider, a gap between. */
  button: { w: 28, h: 26, read: 28, gap: 3 },
  /** Between the speaker's name and the subtitle, and above the progress line. */
  gap: 3,
  /** The progress line along the foot. */
  bar: 2,
} as const;

/** The screens' corner buttons (Sound, Win, Build all): the strip sits just under them. */
export const UNDER_CORNER_BUTTONS = 30;

/** Room on a screen with nothing more to say: under its corner buttons, across it. */
export const defaultRoom = (screen: { w: number }, top = UNDER_CORNER_BUTTONS): StripRoom => ({ x: 4, w: screen.w - 8, y: top, from: 'top' });

/**
 * The map's room: at the bottom left, up to the hero's panel (whose left
 * edge is `panelX`), when that leaves STRIP.minW; else across the top,
 * under the bar (and the date, where a narrow screen moves it there).
 */
export function mapRoom(screen: { w: number; h: number }, panelX: number, topClear: number): StripRoom {
  const beside = panelX - 8;
  return beside >= STRIP.minW ? { x: 4, w: beside, y: screen.h - 2, from: 'bottom' } : defaultRoom(screen, topClear);
}

/** The width of the buttons' row at the strip's right. */
export const buttonsW = (): number => STRIP.button.w * 2 + STRIP.button.read + STRIP.button.gap * 2;

/** The strip's box in `room`, for text `textH` tall under a name `nameH` tall: as wide as it may be, centred in a room at the top. */
export function stripBox(room: StripRoom, nameH: number, textH: number): Box {
  const w = Math.min(STRIP.maxW, room.w);
  const h = Math.max(STRIP.pad * 2 + nameH + STRIP.gap + textH + STRIP.gap + STRIP.bar, STRIP.button.h + STRIP.pad * 2);
  const x = room.from === 'top' ? room.x + Math.floor((room.w - w) / 2) : room.x;
  const y = room.from === 'top' ? room.y : room.y - h;
  return { x, y, w, h };
}

/** How wide the subtitle may run in a strip `w` wide (the buttons take the right). */
export const textWidth = (w: number): number => w - STRIP.pad * 3 - buttonsW();
