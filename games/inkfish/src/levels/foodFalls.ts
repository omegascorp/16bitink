import type { ZoneId } from './types';

/**
 * Food falls: what sinks through a "Food fall" level (the `collect` goal).
 * Each zone has its own, something that really drifts down through that
 * water: bread a child tosses in, fruit from the seagrape trees, kelp torn
 * loose by the swell, marine snow, a spring bloom settling on the abyss.
 * Never bugs and never dead animals: it should feel like a treat. Whatever
 * reaches the seabed goes to the zone's scavengers instead.
 */
export type FoodId = 'bread' | 'seagrape' | 'kelp' | 'sponge' | 'sargassum' | 'butterfly' | 'snow' | 'pickle' | 'fluff' | 'seagrass';

export interface FoodSpec {
  readonly id: FoodId;
  /** One of them ("a bread crumb") and more than one ("10 bread crumbs"). */
  readonly one: string;
  readonly many: string;
  /** Where it comes from, a line for the intro card. */
  readonly lore: string;
  /** Who takes what reaches the seabed: one ("a shore crab got it") and many ("before the shore crabs get them"). */
  readonly scavenger: { readonly one: string; readonly many: string };
}

export const FOODS: Readonly<Record<FoodId, FoodSpec>> = {
  bread: {
    id: 'bread', one: 'bread crumb', many: 'bread crumbs', scavenger: { one: 'shore crab', many: 'shore crabs' },
    lore: 'A child on the rocks is tossing bread to the fish.',
  },
  seagrape: {
    id: 'seagrape', one: 'sea grape', many: 'sea grapes', scavenger: { one: 'blue crab', many: 'blue crabs' },
    lore: 'Seagrape trees lean over the beach and drop their fruit into the bay.',
  },
  kelp: {
    id: 'kelp', one: 'kelp tip', many: 'kelp tips', scavenger: { one: 'sea urchin', many: 'sea urchins' },
    lore: 'The swell is tearing tender kelp tips loose, and they drift down.',
  },
  sponge: {
    id: 'sponge', one: 'sponge crumb', many: 'sponge crumbs', scavenger: { one: 'hermit crab', many: 'hermit crabs' },
    lore: 'A hawksbill turtle is tearing into sponges above, and the crumbs drift down.',
  },
  sargassum: {
    id: 'sargassum', one: 'clump of sargassum', many: 'clumps of sargassum', scavenger: { one: 'spider crab', many: 'spider crabs' },
    lore: 'A floating raft of sargassum weed is breaking up overhead.',
  },
  butterfly: {
    id: 'butterfly', one: 'sea butterfly', many: 'sea butterflies', scavenger: { one: 'squat lobster', many: 'squat lobsters' },
    lore: 'Sea butterflies, tiny swimming snails, fold their wings and sink.',
  },
  snow: {
    id: 'snow', one: 'flake of marine snow', many: 'flakes of marine snow', scavenger: { one: 'brittle star', many: 'brittle stars' },
    lore: 'Marine snow: flakes of life from the sunlit water, falling like snow.',
  },
  pickle: {
    id: 'pickle', one: 'sea pickle', many: 'sea pickles', scavenger: { one: 'sea star', many: 'sea stars' },
    lore: 'Sea pickles: glowing tubes of plankton, sinking into the dark.',
  },
  fluff: {
    id: 'fluff', one: 'clump of green fluff', many: 'clumps of green fluff', scavenger: { one: 'sea pig', many: 'sea pigs' },
    lore: 'A spring bloom far above has settled into green fluff, drifting down months later.',
  },
  seagrass: {
    id: 'seagrass', one: 'seagrass leaf', many: 'seagrass leaves', scavenger: { one: 'swarm of amphipods', many: 'amphipods' },
    lore: 'A storm swept seagrass out of the shallows, and it took months to sink this far.',
  },
};

/** Each zone's food fall, shallowest first. */
export const ZONE_FOOD: Readonly<Record<ZoneId, FoodId>> = {
  tidepool: 'bread', seagrass: 'seagrape', kelp: 'kelp', reef: 'sponge', wreck: 'sargassum',
  dropoff: 'butterfly', twilight: 'snow', midnight: 'pickle', abyss: 'fluff', trench: 'seagrass',
};

export const FOOD_IDS = Object.keys(FOODS) as FoodId[];

/** The food that falls in a zone. */
export function foodOf(zone: ZoneId): FoodSpec {
  return FOODS[ZONE_FOOD[zone]];
}

/** Capitalised, for the HUD and pop-ups ("Beetles 3/10"). */
export const capital = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);
