export type GameStatus = 'playable' | 'sketching';

/** Colours for the play page splash, matching the game's first screen. */
export interface GameTheme {
  readonly paper: string;
  readonly ink: string;
  readonly accent: string;
}

/** Web fonts the game draws with; loaded before it mounts. */
export interface GameFonts {
  /** Google Fonts css2 query, e.g. `family=Caveat:wght@500;700`. */
  readonly googleCss: string;
  /** CSS font shorthands to await, e.g. `32px Caveat`. */
  readonly await: readonly string[];
}

export interface CatalogGame {
  readonly slug: string;
  readonly title: string;
  readonly tagline: string;
  readonly description: readonly string[];
  readonly status: GameStatus;
  readonly cover?: string;
  /** Display price for the full-game unlock; the charged amount lives in Stripe. */
  readonly price?: string;
  /**
   * Stripe Price lookup key for the full-game unlock. Set it on the price
   * in the Stripe dashboard; change prices there without redeploying.
   */
  readonly stripeLookupKey?: string;
  readonly theme?: GameTheme;
  readonly fonts?: GameFonts;
  readonly features?: readonly string[];
  readonly controls?: readonly string[];
}

export const GAMES: readonly CatalogGame[] = [
  {
    slug: 'inkfish',
    title: 'InkFish',
    tagline: 'Eat smaller fish. Grow. Don’t get eaten.',
    description: [
      'A fish-eat-fish game drawn entirely in pen and ink. Start as a doodle-sized fry in a sketchbook tide pool and eat your way up the food chain.',
      'Chain meals into an Ink Frenzy, dodge fishing hooks and jellyfish, and splash shrink-ink to turn predators into lunch.',
    ],
    status: 'playable',
    cover: '/covers/inkfish.png',
    price: '$4.99',
    stripeLookupKey: 'inkfish_full',
    theme: { paper: '#f4eddc', ink: '#1b1a1f', accent: '#1f3f8a' },
    fonts: { googleCss: 'family=Caveat:wght@500;700', await: ['32px Caveat'] },
    features: [
      'Chapter 1 free: 5 levels, no sign-up',
      'Full game: 3 more chapters, new fish and hazards',
      'One-time purchase, no ads, no energy timers',
    ],
    controls: ['Mouse / finger: swim', 'Space, right-click or the dash button: dash', 'Esc / P: pause'],
  },
  {
    slug: 'pixel-quill',
    title: 'Untitled #2',
    tagline: 'Still in the sketchbook.',
    description: ['Something with birds. Probably.'],
    status: 'sketching',
  },
  {
    slug: 'blot',
    title: 'Untitled #3',
    tagline: 'A pencil draft.',
    description: ['Ink spills, physics, puzzles.'],
    status: 'sketching',
  },
];

export function findGame(slug: string): CatalogGame | undefined {
  return GAMES.find((g) => g.slug === slug);
}

export function isPurchasable(game: CatalogGame | undefined): game is CatalogGame & { stripeLookupKey: string } {
  return game?.status === 'playable' && typeof game.stripeLookupKey === 'string';
}

export const playableGames = (): CatalogGame[] => GAMES.filter((g) => g.status === 'playable');
