import type { LevelDef } from '../logic/level';
import { CELLAR } from './cellar';
import { CISTERN } from './cistern';
import { DOOR } from './door';
import { GOLD_RUSH } from './goldRush';
import { GUARD } from './guard';
import { IDOL_HALL } from './idolHall';
import { PIN_OVER_PIN } from './pinOverPin';
import { STAIR } from './stair';
import { TORCHES } from './torches';
import { WELL } from './well';

/** The Ink Atlas's ruins, one chapter each, in the order Nib visits them. */
export const CHAPTER_NAMES: readonly string[] = [
  'The Jungle Temple',
  'The Volcano Shrine',
  'The Desert Tomb',
  'The Frozen Monastery',
  'The Alchemist’s Ruin',
  'The Clockwork Citadel',
  'The Lost City in the Canopy',
  'The Pirate King’s Sea Cave',
  'The Cloud Fortress',
  'The Dragon’s Hoard',
];

/** Levels planned in each chapter. */
export const LEVELS_PER_CHAPTER = 10;

/** Chapter 1, the Jungle Temple, in order. */
export const LEVELS: readonly LevelDef[] = [DOOR, GOLD_RUSH, CISTERN, GUARD, CELLAR, PIN_OVER_PIN, WELL, STAIR, TORCHES, IDOL_HALL];
