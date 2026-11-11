import type { LevelDef } from './types';

/**
 * The sprites only some levels use (with the charms' tokens, painted for
 * a level's own charms). The boot paints the rest (marbles, the gecko,
 * wells, burrows) so the first screen comes up
 * sooner; these are painted in the background after it, and a level paints
 * any of its own that aren't done yet as it starts.
 */
export const EXTRAS = ['dragonfly', 'fruit', 'bud', 'stone', 'geode', 'twine', 'hedgehog', 'sheen', 'lantern', 'leaf', 'gilt', 'rain'] as const;
export type Extra = (typeof EXTRAS)[number];

/** The extra sprites `level` may show. A boss level takes them all: bosses turn marbles to stone, change colours and more. */
export function extrasFor(level: LevelDef): readonly Extra[] {
  if (level.boss) return EXTRAS;
  const has = (c: LevelDef['charms'][number]): boolean => level.charms.includes(c);
  const need: Record<Extra, boolean> = {
    dragonfly: has('dragonfly'),
    fruit: level.fruit === true,
    bud: (level.buds ?? 0) > 0,
    // A burrow that opens late is shut with a stone till then.
    stone: (level.stones ?? 0) > 0 || level.tracks.some((t) => (t.opensAt ?? 0) > 0),
    geode: has('geode'),
    twine: (level.twine ?? 0) > 0,
    hedgehog: has('hedgehog'),
    sheen: (level.chameleons ?? 0) > 0,
    lantern: level.dark === true || has('lantern'),
    leaf: (level.leaves ?? 0) > 0,
    gilt: level.mode?.kind === 'gold',
    rain: has('rain'),
  };
  return EXTRAS.filter((e) => need[e]);
}
