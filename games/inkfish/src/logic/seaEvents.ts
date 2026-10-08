import { SPECIES_INFO, type SpeciesInfo } from '../levels/species';
import type { LevelDef, SpeciesId, ZoneId } from '../levels/types';
import { rangeOf, type Rng } from './rng';

/**
 * Sea events: now and then something happens in the water for a little
 * while, so no two minutes of a level play the same. Each zone has three of
 * its own, and each level uses one or two of them, so new surprises keep
 * turning up as a chapter goes on. A banner announces each one as it starts.
 */
export type SeaEventId = 'hatch' | 'baitball' | 'seabirds' | 'prowler' | 'riptide' | 'fleet' | 'jellies' | 'spill' | 'bloom';

/** Where an event can happen: under open sky, down in the dark, or anywhere. */
type Waters = 'sky' | 'deep' | 'any';

export interface SeaEventInfo {
  /** Banner title. */
  readonly title: string;
  /** Banner line: what to do about it. */
  readonly line: string;
  /** Short name for the HUD while it lasts. */
  readonly name: string;
  readonly seconds: number;
  readonly waters: Waters;
  /** A threat rather than a treat: the banner is red. */
  readonly danger: boolean;
}

export const SEA_EVENTS: Readonly<Record<SeaEventId, SeaEventInfo>> = {
  hatch: {
    title: 'Dragonfly hatch!', name: 'Dragonfly hatch', seconds: 20, waters: 'sky', danger: false,
    line: 'Leap out of the water to snap them up. Several in one leap make a combo.',
  },
  baitball: {
    title: 'Bait ball!', name: 'Bait ball', seconds: 15, waters: 'any', danger: false,
    line: 'A school of small fish rushes in. Feast while it lasts!',
  },
  seabirds: {
    title: 'Seabirds feeding!', name: 'Seabirds', seconds: 18, waters: 'sky', danger: true,
    line: 'Big birds are diving. Stay deep, or leap for the small ones.',
  },
  prowler: {
    title: 'A hunter is coming!', name: 'Hunter', seconds: 20, waters: 'any', danger: true,
    line: 'Hide in the weed, outswim it, or lead it into the jellyfish.',
  },
  riptide: {
    title: 'Strong current!', name: 'Current', seconds: 15, waters: 'any', danger: false,
    line: 'The water surges sideways. Swim against it, or ride it.',
  },
  fleet: {
    title: 'Fishing fleet!', name: 'Fishing fleet', seconds: 15, waters: 'sky', danger: true,
    line: 'Hooks are dropping all around. Watch for the dotted lines.',
  },
  jellies: {
    title: 'Jelly drift!', name: 'Jelly drift', seconds: 18, waters: 'any', danger: true,
    line: 'A swarm of jellyfish drifts through. Lure hunters into them.',
  },
  spill: {
    title: 'Something is sinking!', name: 'Spill', seconds: 12, waters: 'any', danger: false,
    line: 'A load of junk rains down. Grab the good stuff, dodge the rest.',
  },
  bloom: {
    title: 'Glow bloom!', name: 'Glow bloom', seconds: 18, waters: 'deep', danger: false,
    line: 'The water lights up around you: you can see much further.',
  },
};

/**
 * Each zone's own three events, in the order they turn up in its chapter
 * (see LEVEL_SLOTS). The third level of a chapter always has a current, so
 * the riptide only ever takes the second slot; where hunters arrive late in
 * a chapter (kelp, reef), the hunter takes the third.
 */
export const ZONE_EVENTS: Readonly<Record<ZoneId, readonly [SeaEventId, SeaEventId, SeaEventId]>> = {
  tidepool: ['hatch', 'baitball', 'prowler'],
  seagrass: ['seabirds', 'riptide', 'hatch'],
  kelp: ['fleet', 'riptide', 'prowler'],
  reef: ['jellies', 'baitball', 'seabirds'],
  wreck: ['spill', 'prowler', 'fleet'],
  dropoff: ['seabirds', 'prowler', 'baitball'],
  twilight: ['bloom', 'baitball', 'prowler'],
  midnight: ['prowler', 'bloom', 'jellies'],
  abyss: ['spill', 'riptide', 'bloom'],
  trench: ['bloom', 'riptide', 'jellies'],
};

/**
 * Which of the zone's three events each level uses, by its place in the
 * chapter. The first two levels have none (a new fish and a new twist are
 * enough), nor does the giant's. Each event gets a level to itself before it
 * is paired with another.
 */
const LEVEL_SLOTS: readonly (readonly number[])[] = [[], [], [0], [1], [0, 1], [2], [1, 2], [0, 2], [2], []];

/** When events happen, in seconds of play: the first one, then the gap after each one ends. */
export const EVENT_TIMING = { first: [35, 50], gap: [50, 70] } as const;

/** Whether this event can happen in this level at all. */
function fits(id: SeaEventId, level: LevelDef, sky: boolean): boolean {
  const { waters } = SEA_EVENTS[id];
  if ((waters === 'sky' && !sky) || (waters === 'deep' && sky)) return false;
  if (id === 'riptide') return !level.modifiers.current;
  if (id === 'prowler') return prowlerSpecies(level) !== null;
  if (id === 'fleet') return level.hazards.hookEverySec > 0;
  return true;
}

/** The one or two events a level can have, out of its zone's three. */
export function eventsFor(level: LevelDef, zone: ZoneId, sky: boolean): readonly SeaEventId[] {
  if (level.objective.kind === 'boss') return [];
  const roster = ZONE_EVENTS[zone];
  const slots = LEVEL_SLOTS[level.index] ?? [];
  return slots.map((i) => roster[i]!).filter((id) => fits(id, level, sky));
}

/** A random event from `options`, never the same as the last one when there's a choice. */
export function pickEvent(options: readonly SeaEventId[], last: SeaEventId | null, rng: Rng): SeaEventId | null {
  const fresh = options.length > 1 ? options.filter((id) => id !== last) : options;
  return fresh.length ? fresh[Math.floor(rng() * fresh.length)]! : null;
}

/** Seconds until the next event: the first comes a little sooner. */
export function eventGap(rng: Rng, first: boolean): number {
  const [lo, hi] = first ? EVENT_TIMING.first : EVENT_TIMING.gap;
  return rangeOf(rng, lo, hi);
}

/** The hunter sent after you: the level's biggest open-water hunter (never the staple prey). */
export function prowlerSpecies(level: LevelDef): SpeciesId | null {
  const hunters = level.spawns.slice(1).filter((s) => {
    const info = SPECIES_INFO[s.species] as SpeciesInfo;
    return info.hunter === true && !info.bottom && !info.giant;
  });
  const biggest = [...hunters].sort((a, b) => b.size[1] - a.size[1])[0];
  return biggest?.species ?? null;
}

/** The hunter comes this much bigger than you, so it's a real threat whatever your size. */
export const PROWLER_SCALE = 1.7;
/** How fast it closes in, px/s: a little slower than you cruise, so a dash or a hiding place gets you clear. */
export const PROWLER_SPEED = 250;

/** HUD line while an event lasts, e.g. "Bait ball 0:12". */
export function eventStatus(id: SeaEventId, secondsLeft: number): string {
  const s = Math.max(0, Math.ceil(secondsLeft));
  return `${SEA_EVENTS[id].name} 0:${String(s).padStart(2, '0')}`;
}

interface Spot {
  readonly x: number;
  readonly y: number;
}

/**
 * Where to point the player during an event that happens somewhere in
 * particular: the nearest of its `parts` (the hunter, the jellies, the
 * school, the swarm), but only while none of them is in `view`. Null when
 * some of it is in sight or it has no place.
 */
export function eventPointer<T extends Spot>(
  parts: readonly T[], view: { readonly left: number; readonly right: number; readonly top: number; readonly bottom: number }, from: Spot,
): T | null {
  const seen = (p: Spot): boolean => p.x >= view.left && p.x <= view.right && p.y >= view.top && p.y <= view.bottom;
  if (!parts.length || parts.some(seen)) return null;
  const dist = (p: Spot): number => Math.hypot(p.x - from.x, p.y - from.y);
  return parts.reduce((best, p) => (dist(p) < dist(best) ? p : best));
}
