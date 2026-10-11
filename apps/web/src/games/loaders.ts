import type { GameModule } from '@16bitink/game-sdk';

/**
 * Client-side game registry: slug -> lazy import of the game package.
 * Each entry becomes its own chunk, so players only download the game
 * they open (shared deps like Phaser are split into a common chunk).
 *
 * To add a game: add its package as a dependency and one line here.
 * The type makes the compiler reject a package whose default export
 * isn't a GameModule.
 */
export const GAME_LOADERS: Readonly<Record<string, () => Promise<{ default: GameModule }>>> = {
  inkfish: () => import('@16bitink/inkfish'),
  inkcrab: () => import('@16bitink/inkcrab'),
};
