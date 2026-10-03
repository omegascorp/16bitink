import type { SpeciesId, ZoneId } from '../../levels/types';

/** Two locals per zone swim above the map's route: a taste of who lives there (each really spawns in that chapter). */
export const ZONE_FAUNA: Readonly<Record<ZoneId, readonly SpeciesId[]>> = {
  tidepool: ['minnow', 'blenny'], seagrass: ['wrasse', 'pipefish'], kelp: ['garibaldi', 'sheephead'], reef: ['clownfish', 'angelfish'],
  wreck: ['snapper', 'moray'], dropoff: ['mackerel', 'mahi'], twilight: ['pearleye', 'dragonfish'], midnight: ['fangtooth', 'whalefish'],
  abyss: ['rattail', 'tripodfish'], trench: ['angler', 'blobfish'],
};

/** Map fauna textures (light only): call before building the map. */
export function mapFauna(): SpeciesId[] {
  return Object.values(ZONE_FAUNA).flat();
}
