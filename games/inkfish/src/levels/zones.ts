import type { ChapterInfo, PlayerFishId, ZoneId } from './types';

/**
 * The whole ocean, top to bottom. One chapter per zone, in depth order:
 * the map draws them along a seabed that slopes from the shore into a
 * trench. Public data: the map shows every zone, owned or not.
 *
 * To grow the game, append a zone here and add its recipe to the paid
 * content; nothing else needs to change.
 */
export const LEVELS_PER_CHAPTER = 10;

export const ZONE_INFO: readonly ChapterInfo[] = [
  { id: 1, zone: 'tidepool', name: 'Tide Pool Sketchbook', player: 'inkling', depth: [0, 5] },
  { id: 2, zone: 'seagrass', name: 'Seagrass Margins', player: 'goby', depth: [5, 15] },
  { id: 3, zone: 'kelp', name: 'Kelp Forest', player: 'perchfry', depth: [15, 30] },
  { id: 4, zone: 'reef', name: 'Crosshatch Reef', player: 'butterfly', depth: [30, 50] },
  { id: 5, zone: 'wreck', name: 'Shipwreck Sketches', player: 'tuna', depth: [50, 120] },
  { id: 6, zone: 'dropoff', name: 'The Drop-off', player: 'mako', depth: [120, 200] },
  { id: 7, zone: 'twilight', name: 'Twilight Ink', player: 'lanternfish', depth: [200, 1000] },
  { id: 8, zone: 'midnight', name: 'Midnight Blot', player: 'viperfish', depth: [1000, 4000] },
  { id: 9, zone: 'abyss', name: 'The Abyssal Plain', player: 'loosejaw', depth: [4000, 6000] },
  { id: 10, zone: 'trench', name: 'The Hadal Trench', player: 'snailfish', depth: [6000, 11000] },
];

export const ZONE_IDS: readonly ZoneId[] = ZONE_INFO.map((z) => z.zone);
/** One new player fish per chapter, in chapter order. */
export const PLAYER_FISH: readonly PlayerFishId[] = ZONE_INFO.map((z) => z.player);

export const PLAYER_FISH_NAMES: Readonly<Record<PlayerFishId, string>> = {
  inkling: 'inkling', goby: 'goby', perchfry: 'perch fry', butterfly: 'butterflyfish', tuna: 'young tuna',
  mako: 'mako shark pup', lanternfish: 'lanternfish', loosejaw: 'stoplight loosejaw', viperfish: 'viperfish', snailfish: 'snailfish',
};

/** Zones with open sky above: you can leap out, and boats fish from the surface. Deeper, the top of the screen is just more dark water. */
export const ZONE_SKY: Readonly<Record<ZoneId, boolean>> = {
  tidepool: true, seagrass: true, kelp: true, reef: true, wreck: true,
  dropoff: true, twilight: false, midnight: false, abyss: false, trench: false,
};

/** How dark the water is drawn in a zone, 0 (sunlit) .. 1 (pitch black). */
export const ZONE_DARKNESS: Readonly<Record<ZoneId, number>> = {
  tidepool: 0, seagrass: 0.08, kelp: 0.15, reef: 0.22, wreck: 0.32,
  dropoff: 0.42, twilight: 0.55, midnight: 0.7, abyss: 0.8, trench: 0.88,
};

/**
 * Below the reach of sunlight, a layer of night over the scenery that only
 * living light shines through (scenes/game/deepLight.ts). Per zone: how dark
 * (0 = none) and its colour, from the last blue of twilight to black.
 */
export const ZONE_NIGHT: Readonly<Record<ZoneId, { readonly alpha: number; readonly color: number }>> = {
  tidepool: { alpha: 0, color: 0 }, seagrass: { alpha: 0, color: 0 }, kelp: { alpha: 0, color: 0 },
  reef: { alpha: 0, color: 0 }, wreck: { alpha: 0, color: 0 }, dropoff: { alpha: 0, color: 0 },
  twilight: { alpha: 0.72, color: 0x0b2150 },
  midnight: { alpha: 0.8, color: 0x07112e },
  abyss: { alpha: 0.85, color: 0x050a1c },
  trench: { alpha: 0.88, color: 0x030614 },
};

export function zoneInfo(chapterId: number): ChapterInfo {
  const z = ZONE_INFO.find((c) => c.id === chapterId);
  if (!z) throw new Error(`No zone for chapter ${chapterId}`);
  return z;
}
