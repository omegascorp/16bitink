import type { LevelDef } from '../logic/level';
import { BLACK_STEPS } from './ch2/blackSteps';
import { CALDERA } from './ch2/caldera';
import { EMBER_LIGHT } from './ch2/emberLight';
import { FIRE_AND_FLOOD } from './ch2/fireFlood';
import { FIRE_IDOL } from './ch2/fireIdol';
import { JUST_ENOUGH } from './ch2/justEnough';
import { PUMICE_RAFT } from './ch2/pumiceRaft';
import { RUBY_HOARD } from './ch2/rubyHoard';
import { SPRINGS } from './ch2/springs';
import { STONE_BRIDGE } from './ch2/stoneBridge';
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
export const CHAPTER_1: readonly LevelDef[] = [DOOR, GOLD_RUSH, CISTERN, GUARD, CELLAR, PIN_OVER_PIN, WELL, STAIR, TORCHES, IDOL_HALL];

/** Chapter 2, the Volcano Shrine, in order. */
export const CHAPTER_2: readonly LevelDef[] = [
  BLACK_STEPS,
  PUMICE_RAFT,
  STONE_BRIDGE,
  SPRINGS,
  RUBY_HOARD,
  JUST_ENOUGH,
  CALDERA,
  FIRE_AND_FLOOD,
  EMBER_LIGHT,
  FIRE_IDOL,
];

/** The built chapters' levels, by chapter; a chapter with none is still a draft on the map. */
export const CHAPTERS: readonly (readonly LevelDef[])[] = [CHAPTER_1, CHAPTER_2];

/** Every built level in play order: a level opens once the one before it is won, across chapters. */
export const LEVELS: readonly LevelDef[] = CHAPTERS.flat();
