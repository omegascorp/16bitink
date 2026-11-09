import { ARMY_SLOTS } from '../../logic/army';
import type { BuildingId } from '../../logic/buildings';
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
/** The rows of buttons beside the armies, each as high as a slot. */
const GRID_ROWS = 2;
export type TownButton = 'hall' | 'fort' | 'guild' | 'smith' | 'tavern' | 'store' | 'ride' | 'leave';

/** The buttons a town shows: the Guild, the Blacksmith and the Storehouse only once they stand, the Tavern once it stands on a map with heroes to hire (`hires`), "Ride here" while the picked hero is `away`. */
export function townButtons(built: readonly BuildingId[], hires = false, away = false): TownButton[] {
  const has = (b: BuildingId): boolean => built.includes(b);
  return ['hall', 'fort', ...(has('mageGuild1') ? ['guild' as const] : []), ...(has('blacksmith') ? ['smith' as const] : []), ...(hires && has('tavern') ? ['tavern' as const] : []), ...(has('storehouse') ? ['store' as const] : []), ...(away ? ['ride' as const] : []), 'leave'];
}

/** `cells` buttons' width, side by side. */
export const cellsW = (cells: number): number => cells * BTN.w + (cells - 1) * BTN.gap;
/** `count` buttons in a row, over the armies on a stacked strip. */
export const buttonsW = (count: number): number => cellsW(count);
/** A button's width in the stacked strip's row on a `w` wide screen: narrower than usual when all of them wouldn't fit. */
export const narrowButtonW = (count: number, w: number): number => Math.min(BTN.w, Math.floor((w - PAD * 2 - (count - 1) * BTN.gap) / count));
const gridCols = (count: number): number => Math.max(2, Math.ceil(count / GRID_ROWS));
/** `count` buttons in their grid, beside the armies. */
export const buttonsGridW = (count: number): number => cellsW(gridCols(count));

/** Where each of `count` buttons sits in the grid; the last takes the rest of its row, so there's no hole. */
export function buttonGrid(count: number): { col: number; row: number; span: number }[] {
  const cols = gridCols(count);
  return Array.from({ length: count }, (_, i) => {
    const col = i % cols;
    return { col, row: Math.floor(i / cols), span: i === count - 1 ? cols - col : 1 };
  });
}

/** The strip's own width round the armies and the town's lines when they all share a row. */
const wideRound = (count: number): number => GAP + GAP + buttonsGridW(count) + PAD * 2 + 8;
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

/** The strip's layout for a `w` × `h` screen, over a purse bar `purseH` high, with `buttons` buttons: whether it stacks, how big its slots are, and how wide the town's lines. */
export function stripLayout(w: number, h: number, purseH: number, buttons = 4): { narrow: boolean; slot: number; townW: number } {
  const round = wideRound(buttons);
  const wide = slotIn(w - round - TOWN_W.min, h * HEIGHT_SHARE.wide - PAD * 2);
  if (wide >= WIDE_SLOT) return { narrow: false, slot: wide, townW: Math.min(TOWN_W.max, w - round - armiesW(wide)) };
  return { narrow: true, slot: slotIn(w - PAD * 2, h * HEIGHT_SHARE.narrow - NARROW_ROUND - purseH), townW: TOWN_W.max };
}
