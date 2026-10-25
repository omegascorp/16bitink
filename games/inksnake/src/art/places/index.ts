import type { Place } from '../../level/types';
import { CHAPTER_PLACES_ART } from '../chapters/index';
import { FARM } from './farm';
import type { PlaceArt } from './types';

/** Each chapter's place, painted; places not painted yet fall back to the farm. */
const PLACE_ART: Partial<Record<Place, PlaceArt>> = { farm: FARM, ...CHAPTER_PLACES_ART };

export function placeArt(place: Place): PlaceArt {
  return PLACE_ART[place] ?? FARM;
}
