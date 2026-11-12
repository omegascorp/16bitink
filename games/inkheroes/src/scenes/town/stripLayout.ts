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
export const BTN = { w: 56, gap: 3 } as const;
/** The rows of buttons beside the armies, each as high as a slot. */
const GRID_ROWS = 2;
export type TownButton = 'hall' | 'fort' | 'guild' | 'smith' | 'tavern' | 'store' | 'portal' | 'army' | 'leave';

/**
 * The buttons a town shows: the Guild, the Blacksmith and the Storehouse
 * only once they stand, the Tavern once it stands on a map with heroes to
 * hire (`hires`), the Portal from its second level while a hero of ours is
 * `inside`.
 */
export function townButtons(built: readonly BuildingId[], hires = false, inside = false): TownButton[] {
  const has = (b: BuildingId): boolean => built.includes(b);
  const portal = inside && has('portal2');
  return ['hall', 'fort', ...(has('mageGuild1') ? ['guild' as const] : []), ...(has('blacksmith') ? ['smith' as const] : []), ...(hires && has('tavern') ? ['tavern' as const] : []), ...(has('storehouse') ? ['store' as const] : []), ...(portal ? ['portal' as const] : []), 'leave'];
}

/** `cells` buttons' width, side by side. */
export const cellsW = (cells: number): number => cells * BTN.w + (cells - 1) * BTN.gap;
/** `count` buttons in a row. */
export const buttonsW = (count: number): number => cellsW(count);
const gridCols = (count: number): number => Math.max(2, Math.ceil(count / GRID_ROWS));
/** `count` buttons in their grid, beside the armies. */
export const buttonsGridW = (count: number): number => cellsW(gridCols(count));

/** Where each of `count` buttons sits in the grid (`cols` across); the last takes the rest of its row, so there's no hole. */
export function buttonGrid(count: number, cols = gridCols(count)): { col: number; row: number; span: number }[] {
  return Array.from({ length: count }, (_, i) => {
    const col = i % cols;
    return { col, row: Math.floor(i / cols), span: i === count - 1 ? cols - col : 1 };
  });
}

/** The strip's own width round the armies and the town's lines when they all share a row. */
const wideRound = (count: number): number => GAP + GAP + buttonsGridW(count) + PAD * 2 + 8;
/** Beside the armies only while their slots stay this big: the buttons on them need it. Smaller, the strip stacks. */
const WIDE_SLOT = 48;
/** How much of the screen's height the strip may take, and the army drawer on a phone: the town needs the rest. */
const HEIGHT_SHARE = { wide: 0.32, drawer: 0.5 } as const;
/** The army drawer's height without its armies when the town's lines stack over them. */
export const STACKED_ROUND = PAD + LINE * 2 + ROW_GAP + PAD;
/**
 * Shorter than this (a phone on its side), or too narrow for the strip, the
 * town takes the whole screen: its buttons go down a rail on the right and
 * the armies into a drawer the Army button opens.
 */
export const RAIL_BELOW_H = 480;
/** The rail: its padding, and its buttons' height (an icon over its label needs the least). */
export const RAIL = { pad: 6, minBtnH: 48, maxBtnH: 56 } as const;
/** Below this, the town's lines in the drawer stack over the armies instead of standing beside them. */
const DRAWER_SIDE_SLOT = 40;

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

/** The rail's buttons: the strip's, with Army (the drawer) before Leave. */
export function railButtons(names: readonly TownButton[]): TownButton[] {
  const at = names.indexOf('leave');
  return at < 0 ? [...names, 'army'] : [...names.slice(0, at), 'army', ...names.slice(at)];
}

/** The rail down the right: how many columns of buttons, how high each, and how wide it is. */
export interface RailPlan {
  readonly cols: number;
  readonly rows: number;
  readonly btnH: number;
  readonly w: number;
}

/** The army drawer: how wide it is, its slots, how wide the town's lines beside them, or whether those stack over them. */
export interface DrawerPlan {
  readonly w: number;
  readonly slot: number;
  readonly townW: number;
  readonly stacked: boolean;
}

export type TownLayout = { readonly kind: 'strip'; readonly slot: number; readonly townW: number } | { readonly kind: 'rail'; readonly rail: RailPlan; readonly drawer: DrawerPlan };

/** `count` buttons down a rail over a purse bar `purseH` high on a screen `h` high: one column while they fit, else more. */
export function railPlan(h: number, purseH: number, count: number): RailPlan {
  const room = h - purseH + 2 - RAIL.pad * 2;
  const fits = Math.max(1, Math.floor((room + BTN.gap) / (RAIL.minBtnH + BTN.gap)));
  const cols = Math.ceil(count / fits);
  const rows = Math.ceil(count / cols);
  const btnH = Math.max(RAIL.minBtnH, Math.min(RAIL.maxBtnH, Math.floor((room - (rows - 1) * BTN.gap) / rows)));
  return { cols, rows, btnH, w: RAIL.pad * 2 + cellsW(cols) };
}

/** The army drawer `w` wide on a screen `h` high: the town's lines beside the armies, or over them when that leaves the slots too small. */
export function drawerPlan(w: number, h: number): DrawerPlan {
  const tall = h * HEIGHT_SHARE.drawer - PAD * 2;
  const beside = slotIn(w - PAD * 2 - TOWN_W.min - GAP, tall);
  if (beside >= DRAWER_SIDE_SLOT) return { w, slot: beside, townW: Math.min(TOWN_W.max, w - PAD * 2 - GAP - armiesW(beside)), stacked: false };
  return { w, slot: slotIn(w - PAD * 2, h * HEIGHT_SHARE.drawer - STACKED_ROUND), townW: TOWN_W.max, stacked: true };
}

/** The drawer's height. */
export const drawerH = (d: DrawerPlan): number => (d.stacked ? STACKED_ROUND : PAD * 2) + armyH(d.slot);

/**
 * The town screen's layout for a `w` × `h` screen, over a purse bar `purseH`
 * high, with `buttons` of the strip's buttons: the strip along the foot where
 * it fits on a tall screen, else the rail and the army drawer.
 */
export function townLayout(w: number, h: number, purseH: number, buttons = 4): TownLayout {
  const round = wideRound(buttons);
  const wide = slotIn(w - round - TOWN_W.min, h * HEIGHT_SHARE.wide - PAD * 2);
  if (wide >= WIDE_SLOT && h >= RAIL_BELOW_H) return { kind: 'strip', slot: wide, townW: Math.min(TOWN_W.max, w - round - armiesW(wide)) };
  const rail = railPlan(h, purseH, buttons + 1);
  // The drawer runs the screen's width when the rail's buttons end above it (a phone held upright), else stops at the rail.
  const across = drawerPlan(w, h);
  const railEnd = RAIL.pad * 2 + rail.rows * rail.btnH + (rail.rows - 1) * BTN.gap;
  const fits = railEnd <= h - purseH + 2 - drawerH(across);
  return { kind: 'rail', rail, drawer: fits ? across : drawerPlan(w - rail.w, h) };
}
