import { ARMY_SLOTS } from '../../logic/army';
import { SLOT, SLOT_GAP } from '../battle/pixelFrames';

/** The hero's portrait on the map's panel and their sheet. */
export const HERO_SLOT = 44;
/** The biggest an army's slot is drawn. */
export const SLOT_MAX = 60;

/** How wide a row of seven slots is, UI pixels. */
export const armyRowW = (slot: number): number => ARMY_SLOTS * (slot + SLOT_GAP) - SLOT_GAP;

/** The biggest slot whose row of seven fits `room` (even, so a cut sits square in it), and no smaller than the turn order's. */
export function fitSlot(room: number): number {
  const fit = Math.floor((room + SLOT_GAP) / ARMY_SLOTS) - SLOT_GAP;
  return Math.max(SLOT, Math.min(SLOT_MAX, fit - (fit % 2)));
}

/** How many a position `part` of the way along the split slider takes: at least one, and one stays. */
export const splitCount = (part: number, count: number): number => Math.max(1, Math.min(count - 1, Math.round(part * count)));
