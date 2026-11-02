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
import { CHAPTER_1 } from './index';

/**
 * The full game's levels. SERVER-ONLY: imported by content/paid.ts (served by
 * /api/content/inkpin to verified owners), the dev page and the tests. The
 * game's client code must never import this file or src/level/ch2|ch3
 * (test/paywall.test.ts checks).
 */

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

/** Chapter 3, the Desert Tomb, in order. */
export const CHAPTER_3: readonly LevelDef[] = [
  SEALED_DOOR,
  BAD_AIR,
  BLASTING_CHAMBER,
  PUFF_FROG,
  BURIAL_GOLD,
  WEIGHING_ROOM,
  DEEP_SHAFT,
  SUN_BARGE,
  LAMP_IN_THE_TOMB,
  TOMB_GUARDIAN,
];
/** Levels built for iteration, but not playable until their level and curve checks pass (the dev page's ?draft=). */
export const CHAPTER_3_DRAFTS: readonly LevelDef[] = [];

/** Chapter 1 and the paid chapters, as the tests and the dev page see them. */
export const ALL_CHAPTERS: readonly (readonly LevelDef[])[] = [CHAPTER_1, CHAPTER_2, CHAPTER_3];

/** Every built level in play order (not the drafts). */
export const ALL_LEVELS: readonly LevelDef[] = ALL_CHAPTERS.flat();

