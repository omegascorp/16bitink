import { BIRD_INFO, ZONE_BIRDS, type BirdId } from '../logic/birds';
import { SPECIES_INFO } from '../levels/species';
import type { Chapter, PlayerFishId, SpeciesId } from '../levels/types';
import { PLAYER_FISH_NAMES } from '../levels/zones';
import type { GuideId } from './types';

/**
 * Which creatures the guide lists for each chapter: the fish you swim as,
 * then everyone you can meet there in the order they turn up (fish, giants,
 * seabed critters), then the birds overhead. A creature that lives in several
 * chapters is listed under the first.
 */
export interface GuidePage {
  readonly chapter: number;
  readonly ids: readonly GuideId[];
}

function chapterCreatures(ch: Chapter): GuideId[] {
  const fish: SpeciesId[] = [];
  const bottom: SpeciesId[] = [];
  for (const level of ch.levels) {
    fish.push(...level.spawns.map((s) => s.species));
    if (level.objective.kind === 'boss' || level.objective.kind === 'bounty') fish.push(level.objective.species);
    bottom.push(...level.bottom.map((s) => s.species));
  }
  const birds: BirdId[] = [...(ZONE_BIRDS[ch.zone]?.kinds ?? [])];
  return [ch.player, ...fish, ...bottom, ...birds];
}

export function guidePages(chapters: readonly Chapter[]): GuidePage[] {
  const listed = new Set<GuideId>();
  return [...chapters].sort((a, b) => a.id - b.id).map((ch) => ({
    chapter: ch.id,
    ids: chapterCreatures(ch).filter((id) => !listed.has(id) && Boolean(listed.add(id))),
  }));
}

export function guideName(id: GuideId): string {
  if (id in PLAYER_FISH_NAMES) return PLAYER_FISH_NAMES[id as PlayerFishId];
  if (id in BIRD_INFO) return BIRD_INFO[id as BirdId].name;
  return SPECIES_INFO[id as SpeciesId].name;
}

/** Which kind of picture to show. */
export function guideArt(id: GuideId): 'fish' | 'bird' {
  return id in BIRD_INFO ? 'bird' : 'fish';
}
