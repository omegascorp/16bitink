import type { MapDef } from '../level/types';
import type { Adventure } from './adventure';
import type { AdventureSave } from './save';

/**
 * Free play: the chapter's last part won, the player stays in the land
 * (the chapter-done card's Keep exploring). The adventure goes on as ever,
 * days, heroes, towns, the rival, the weeks, but its goal never fires again
 * (src/logic/adventure.ts checkGoal). The chapter counts as won from the
 * recorded win (src/logic/save.ts recordWin), never from the game's status,
 * so a lost day in free play can't un-win it. Only the menu's Start over
 * throws the game away.
 */
export function keepExploring(adv: Adventure): Adventure {
  if (adv.freePlay && adv.status !== 'won') return adv;
  return { ...adv, status: adv.status === 'won' ? 'playing' : adv.status, freePlay: true };
}

/** A save turned to free play: the game now and this morning (so Replay the day stays in free play). The part's start is kept as it was: starting the part again plays it anew. */
export function freePlaySave(save: AdventureSave): AdventureSave {
  return { ...save, current: keepExploring(save.current), dayStart: keepExploring(save.dayStart) };
}

/** Where a chapter's saved game picks up. */
export type SavedStanding =
  /** The part was won (or the chapter played on in free play) and a next part is built: the chapter rides on into it, from `from`. */
  | { readonly kind: 'ride'; readonly from: Adventure; readonly next: MapDef }
  /** The chapter's last part built was won: the land is played on in free play. */
  | { readonly kind: 'free'; readonly save: AdventureSave }
  /** A game going on (in free play or not), from `current` (this morning's, after a lost battle). */
  | { readonly kind: 'play'; readonly current: Adventure };

/**
 * What saved game `saved` on part `def` resumes as (`next`: the part after
 * it, if built), or null with nothing to resume. A game in free play whose
 * chapter has since grown a new part rides on into it.
 */
export function savedStanding(saved: AdventureSave, next: MapDef | undefined): SavedStanding | null {
  if (saved.current.status === 'won') return next ? { kind: 'ride', from: saved.current, next } : { kind: 'free', save: freePlaySave(saved) };
  // Closed on the defeat card: come back to this morning, as "Replay the day" would.
  const current = saved.current.status === 'lost' ? saved.dayStart : saved.current;
  if (current.status !== 'playing') return null;
  if (current.freePlay && next) return { kind: 'ride', from: current, next };
  return { kind: 'play', current };
}
