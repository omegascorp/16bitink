import type { Profile } from '../logic/economy';
import { hasBeat } from '../logic/story';
import { hasWorld } from './planets';

/**
 * The first screen for a profile, by scene key: the world it's on, or the
 * starship if it was left aboard; the star map if the demo's over (the
 * first course set and the next world not here), or if it's at a world
 * whose ground didn't load (the full game, offline).
 */
export function firstScene(p: Profile): readonly [string, object | undefined] {
  if (!hasWorld(p.at)) return ['System', { selected: p.at }];
  if (p.docked && hasBeat(p, 'course') && p.at === 'graphite' && !hasWorld('mycel')) return ['System', {}];
  return p.docked ? ['Ship', { remote: false, tab: 'starship' }] : ['Game', undefined];
}
