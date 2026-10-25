import type { SnakeInput } from '../../src/logic/snake';
import type { World } from '../../src/logic/world';

/**
 * A chapter's own habits for the test bot (using its snake's ability,
 * handling its enemies): return input to use this frame, or null to let
 * the shared bot decide. One file per chapter in this folder, named after
 * its place (barrens.ts…); test/bot.ts picks them up by the level's place.
 */
export type BotHook = (w: World) => SnakeInput | null;
