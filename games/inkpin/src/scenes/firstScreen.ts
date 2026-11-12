import type { Progress } from './progress';

/** Where the game opens: a new player goes straight into level 1, everyone else to the Atlas map. */
export type FirstScreen = { readonly scene: 'game'; readonly level: 0 } | { readonly scene: 'menu' };

/**
 * A player who has won nothing has only level 1 to choose on the map, and
 * first-time players who met the map instead often left there, so they start
 * in the level. A dev page's ?level= / sampler (`devStart`) is left to the map's own hand-off.
 */
export function firstScreen(progress: Progress, devStart = false): FirstScreen {
  if (devStart) return { scene: 'menu' };
  return Object.keys(progress.levels).length === 0 ? { scene: 'game', level: 0 } : { scene: 'menu' };
}
