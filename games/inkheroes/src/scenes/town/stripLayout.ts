import { ARMY_SLOTS } from '../../logic/army';
import { SLOT, SLOT_GAP } from '../battle/pixelFrames';
import { armyRowW, SLOT_MAX } from '../hud/armySlots';

export const PAD = 6;
export const GAP = 8;
export const LINE = 15;
export const ROW_GAP = 4;
/** The space between the face heading a row and its seven slots. */
export const HEAD_GAP = 6;
/** The town's lines beside the armies: wide when there's room, and how far they can give way (they wrap). */
const TOWN_W = { max: 150, min: 110 } as const;
export const BTN = { w: 56, gap: 3, narrowH: 56 } as const;
/** The buttons in a row, over the armies on a stacked strip. */
export const BUTTONS_W = 4 * (BTN.w + BTN.gap) - BTN.gap;
/** The buttons two by two, beside the armies: each as high as a slot. */
export const BUTTONS_GRID_W = 2 * BTN.w + BTN.gap;
/** The strip's own width round the armies and the town's lines when they all share a row. */
const WIDE_ROUND = GAP + GAP + BUTTONS_GRID_W + PAD * 2 + 8;
/** Beside the armies only while their slots stay this big: the buttons on them need it. Smaller, the strip stacks. */
const WIDE_SLOT = 48;
/** How much of the screen's height the strip may take, wide and stacked: the town needs the rest. */
const HEIGHT_SHARE = { wide: 0.32, narrow: 0.55 } as const;
/** The stacked strip's height without its armies. */
export const NARROW_ROUND = PAD + BTN.narrowH + ROW_GAP + LINE * 2 + ROW_GAP + PAD;

/** Both rows of armies, high. */
export const armyH = (slot: number): number => slot * 2 + ROW_GAP;
/** A row of armies, wide: a face (the town's crest, the hero) then the seven slots. */
export const armiesW = (slot: number): number => slot + HEAD_GAP + armyRowW(slot);

/** The biggest slot that fits `room` across and `tall` down, in whole even pixels (the turn order's at least). */
function slotIn(room: number, tall: number): number {
  const across = Math.floor((room - HEAD_GAP - SLOT_GAP * (ARMY_SLOTS - 1)) / (ARMY_SLOTS + 1));
  const down = Math.floor((tall - ROW_GAP) / 2);
  const fit = Math.min(SLOT_MAX, across, down);
  return Math.max(SLOT, fit - (fit % 2));
}

/** The strip's layout for a `w` × `h` screen, over a purse bar `purseH` high: whether it stacks, how big its slots are, and how wide the town's lines. */
export function stripLayout(w: number, h: number, purseH: number): { narrow: boolean; slot: number; townW: number } {
  const wide = slotIn(w - WIDE_ROUND - TOWN_W.min, h * HEIGHT_SHARE.wide - PAD * 2);
  if (wide >= WIDE_SLOT) return { narrow: false, slot: wide, townW: Math.min(TOWN_W.max, w - WIDE_ROUND - armiesW(wide)) };
  return { narrow: true, slot: slotIn(w - PAD * 2, h * HEIGHT_SHARE.narrow - NARROW_ROUND - purseH), townW: TOWN_W.max };
}
