import type { Place } from '../../level/types';
import type { BandMaker } from './band';
import { DRY_BANDS } from './dryPlaces';
import { HIGH_BANDS } from './highPlaces';
import { WET_BANDS } from './wetPlaces';

/** The band painters of chapters 2–10, by place (the farm's is farmBand.ts). */
export const PLACE_BANDS: Readonly<Record<Exclude<Place, 'farm'>, BandMaker>> = { ...DRY_BANDS, ...WET_BANDS, ...HIGH_BANDS };
