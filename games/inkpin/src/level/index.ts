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
import { BAD_AIR } from './ch3/badAir';
import { BLASTING_CHAMBER } from './ch3/blastingChamber';
import { BURIAL_GOLD } from './ch3/burialGold';
import { DEEP_SHAFT } from './ch3/deepShaft';
import { LAMP_IN_THE_TOMB } from './ch3/lampInTheTomb';
import { PUFF_FROG } from './ch3/puffFrog';
import { SEALED_DOOR } from './ch3/sealedDoor';
import { SUN_BARGE } from './ch3/sunBarge';
import { TOMB_GUARDIAN } from './ch3/tombGuardian';
import { WEIGHING_ROOM } from './ch3/weighingRoom';
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

/** The Ink Atlas's five ruins, one chapter each (50 levels in all), in the order Nib visits them. */
export const CHAPTER_NAMES: readonly string[] = [
  'The Jungle Temple',
  'The Volcano Shrine',
  'The Desert Tomb',
  'The Frozen Monastery',
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

/**
 * Chapter 3, the Desert Tomb, in order: levels 21–30, added one file at a
 * time from src/level/ch3/. While it's empty the chapter is a draft on the map.
 */
/**
 * Only finished levels are listed: an unfinished one would take a later level's
 * number (a draft boss showed as "Level 27"). Drafts that miss the curve, kept
 * for their rebuild and not played: PUFF_FROG (24), BURIAL_GOLD (25),
 * TOMB_GUARDIAN (30). See docs/inkpin-ch3-status.md.
 */
export const CHAPTER_3: readonly LevelDef[] = [SEALED_DOOR, BAD_AIR, BLASTING_CHAMBER, PUFF_FROG, BURIAL_GOLD, WEIGHING_ROOM, DEEP_SHAFT];
export const CHAPTER_3_DRAFTS: readonly LevelDef[] = [TOMB_GUARDIAN, LAMP_IN_THE_TOMB, SUN_BARGE];

/** The built chapters' levels, by chapter; a chapter with none is still a draft on the map. */
export const CHAPTERS: readonly (readonly LevelDef[])[] = [CHAPTER_1, CHAPTER_2, CHAPTER_3];

/** Every built level in play order: a level opens once the one before it is won, across chapters. */
export const LEVELS: readonly LevelDef[] = CHAPTERS.flat();
