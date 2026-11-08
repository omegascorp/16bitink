/** The game being built (ITCH_GAME), resolved by vite.config.ts to its package's GameModule. */
declare module 'virtual:itch-game' {
  import type { GameModule } from '@16bitink/game-sdk';
  const game: GameModule;
  export default game;
}

/** Set by vite.config.ts from the catalog entry of the game being built. */
declare const __ITCH_EDITION__: {
  readonly slug: string;
  readonly price?: string;
  /** CSS font shorthands to await before mounting, e.g. `32px Caveat`. */
  readonly fonts: readonly string[];
};
