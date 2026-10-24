import type { BuildingId } from '../../logic/buildings';
import { DWELLINGS } from './dwellings';
import { drawTownGround } from './ground';
import { HALLS } from './halls';
import { TRADES } from './trades';
import { PIECE_SLOT, SLOT_ORDER, type TownDrawer, type TownPiece } from './types';
import { WALLS } from './walls';

/** Every building's painting (see types.ts for the contract). */
export const TOWN_ART: Readonly<Record<TownPiece, TownDrawer>> = { ...WALLS, ...HALLS, ...DWELLINGS, ...TRADES };

/** Each slot's drawings, best first, with the building that shows it. */
const LADDERS: readonly (readonly [TownPiece, BuildingId])[][] = [
  [['hall-capitol', 'capitol'], ['hall-city', 'cityHall'], ['hall-town', 'townHall'], ['hall-village', 'villageHall']],
  [['walls-castle', 'castle'], ['walls-citadel', 'citadel'], ['walls-fort', 'fort']],
  [['guild-2', 'mageGuild2'], ['guild-1', 'mageGuild1']],
  ...(['tavern', 'blacksmith', 'marketplace', 'guardhouse', 'archeryRange', 'griffinTower', 'barracks', 'monastery', 'stables', 'tiltyard', 'seraphSpire'] as const).map((id) => [[id, id] as const]),
];

/** What a town with `built` shows, one drawing a slot, back to front, with the building each stands for. */
export function townPieces(built: readonly BuildingId[]): { piece: TownPiece; building: BuildingId }[] {
  const shown = LADDERS.flatMap((ladder) => {
    const top = ladder.find(([, b]) => built.includes(b));
    return top ? [{ piece: top[0], building: top[1] }] : [];
  });
  return shown.sort((a, b) => SLOT_ORDER.indexOf(PIECE_SLOT[a.piece]) - SLOT_ORDER.indexOf(PIECE_SLOT[b.piece]));
}

export { drawTownGround };
