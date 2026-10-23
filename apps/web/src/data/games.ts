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
  /** What people type into a search box to find a game like this, e.g. "fish-eat-fish game": used in the page title and FAQ. */
  readonly kind?: string;
  /**
   * Well-known games this one plays like, for people searching for them: shown as "For fans of …" and
   * answered in the FAQ. `how` says honestly what's alike and what's its own; name other games only
   * to compare, never as if this were one of them.
   */
  readonly fansOf?: { readonly games: readonly string[]; readonly how: string };
  /** Genres for search engines' structured data. */
  readonly genre?: readonly string[];
  /** A path to type from a video, e.g. "fish" for 16bit.ink/fish: it opens the game page and is counted as its own source. */
  readonly short?: string;
  readonly description: readonly string[];
  readonly status: GameStatus;
  readonly cover?: string;
  /** Has a silent gameplay loop in src/assets/loops/ (made by scripts/loops.mjs), played over the cover. */
  readonly loop?: boolean;
  /** Release day (YYYY-MM-DD, UTC): the home page marks a game "New" for NEW_FOR_DAYS from it. */
  readonly released?: string;
  /** Last day the game itself changed (YYYY-MM-DD, UTC): bump it with each release. */
  readonly updated?: string;
  /** How much game there is: chapters, and levels when counted; `ready` below `chapters` means the rest is still being made. */
  readonly size?: { readonly chapters: number; readonly ready?: number; readonly levels?: number };
  /** What the free demo gives, in a few words: "10 levels free". */
  readonly demo?: string;
  /** Display price for the full-game unlock; the charged amount lives in Stripe. */
  readonly price?: string;
  /**
   * Stripe Price lookup key for the full-game unlock. Set it on the price
   * in the Stripe dashboard; change prices there without redeploying.
   */
  readonly stripeLookupKey?: string;
  readonly theme?: GameTheme;
  /** Home-screen icon set in public/icons/ (rendered by scripts/icons.mjs); the brand icon if unset. */
  readonly icon?: string;
  /** Screen orientation once installed. */
  readonly orientation?: 'any' | 'landscape' | 'portrait';
  readonly fonts?: GameFonts;
  readonly features?: readonly string[];
  readonly controls?: readonly string[];
}

export const GAMES: readonly CatalogGame[] = [
  {
    slug: 'inkfish',
    title: 'InkFish',
    tagline: 'Eat smaller fish. Grow. Don’t get eaten.',
    kind: 'fish-eat-fish game',
    fansOf: {
      games: ['Feeding Frenzy', 'Hungry Shark'],
      how: 'It plays the same way at heart: you start as the smallest fish in the water, eat anything smaller than you and grow until the fish that hunted you become lunch. InkFish adds its own ideas: chained meals build an Ink Frenzy, hooks and jellyfish drift through, and things sink from above, like a battery that shocks predators.',
    },
    genre: ['Arcade', 'Casual', 'Survival'],
    short: 'fish',
    description: [
      'A fish-eat-fish game drawn entirely in pen and ink. Start as a doodle-sized fry in a sketchbook tide pool and eat your way up the food chain.',
      'Chain meals into an Ink Frenzy, dodge fishing hooks and jellyfish, and grab what sinks from above: a battery to shock predators into lunch, or a plastic bag you really shouldn’t eat.',
    ],
    status: 'playable',
    cover: '/covers/inkfish.png',
    loop: true,
    released: '2026-10-03',
    updated: '2026-10-16',
    size: { chapters: 10, levels: 100 },
    demo: '10 levels free',
    price: '$4.99',
    stripeLookupKey: 'inkfish_full',
    theme: { paper: '#f4eddc', ink: '#1b1a1f', accent: '#1f3f8a' },
    icon: 'inkfish',
    orientation: 'landscape',
    fonts: { googleCss: 'family=Caveat:wght@500;700', await: ['32px Caveat'] },
    features: [
      'Chapter 1 free: 10 levels, no sign-up',
      'Full game: 90 more levels across 9 deeper zones',
      'One-time purchase: no subscription, no ads, no energy timers',
    ],
    controls: ['Mouse / finger: swim', 'Space, click or the dash button: dash', 'Esc / P / ❚❚: pause', 'M / ♪: sound on/off'],
  },
  {
    slug: 'inkcrab',
    title: 'InkCrab',
    tagline: 'Eat. Grow. Find a bigger shell.',
    kind: 'hermit crab game',
    fansOf: {
      games: ['Another Crab’s Treasure', 'Feeding Frenzy'],
      how: 'Like Another Crab’s Treasure, you are a hermit crab trading up into bigger shells, but InkCrab is a small 2D arcade game, not a Soulslike. Like Feeding Frenzy, you eat to grow: dig through the sand, outgrow your shell, race rival crabs to the next one and hide from gulls, foxes and the tide.',
    },
    genre: ['Arcade', 'Casual', 'Survival'],
    short: 'crab',
    description: [
      'A hermit crab game drawn in ballpoint pen. Dig through a beach cut open like an ant farm, eat what you find, and trade up into ever-bigger shells, but swapping leaves you soft and defenceless for a moment.',
      'Out-race rival crabs to empty shells, lead a vacancy chain of little crabs behind you, and keep out of sight of gulls, foxes and the rising tide across ten beaches, from coral atolls to frozen shingle.',
    ],
    status: 'playable',
    cover: '/covers/inkcrab.png',
    loop: true,
    released: '2026-10-11',
    updated: '2026-10-17',
    size: { chapters: 10, levels: 100 },
    demo: '10 levels free',
    price: '$4.99',
    stripeLookupKey: 'inkcrab_full',
    theme: { paper: '#f5f0e1', ink: '#26316a', accent: '#b3322b' },
    icon: 'inkcrab',
    orientation: 'landscape',
    fonts: { googleCss: 'family=Caveat:wght@500;700', await: ['32px Caveat'] },
    features: [
      'Beach 1 free: 10 levels, no sign-up',
      'Full game: 90 more levels across 9 more beaches',
      'One-time purchase: no subscription, no ads, no energy timers',
    ],
    controls: [
      'Arrows / WASD or the stick: walk and aim',
      'Space or the jump button: jump',
      'X / C or tap a tile: dig / place sand',
      '↑ + C or stick up + dig: build a step to climb',
      'E / Enter or tap a shell: move house',
      'Hold Z or the hide button: hide in your shell',
      'Esc / P / ❚❚: pause',
    ],
  },
  {
    slug: 'inkmine',
    title: 'InkMine',
    tagline: 'Dig. Repair. Find your way home.',
    kind: 'space mining game',
    fansOf: {
      games: ['Motherload', 'SteamWorld Dig'],
      how: 'Yes, the loop is the same: drill down for ore and get back up before your drill energy and air run out. InkMine puts it on small alien worlds with a story: a wormhole threw you onto a moon no chart has, you print the parts your wrecked lander needs to fly again, and you meet aliens who speak no language you know.',
    },
    genre: ['Adventure', 'Mining', 'Exploration'],
    short: 'mine',
    description: [
      'A mining game drawn in ballpoint pen. A wild wormhole tore your ship apart and threw you down onto a small grey moon, among stars no chart has. Dig for copper, graphite, silver and ice, and print what the wreck of your lander needs to fly again.',
      'Every block costs drill energy and every trip costs air. Follow a strange call over the horizon to the Lamplighters, who speak no language you know, trade them silver from deep down for a drive core, and climb back up to your starship, waiting dark in orbit.',
    ],
    status: 'playable',
    cover: '/covers/inkmine.png',
    loop: true,
    released: '2026-10-17',
    updated: '2026-10-19',
    size: { chapters: 10, ready: 3 },
    demo: 'First world free',
    price: '$4.99',
    stripeLookupKey: 'inkmine_full',
    theme: { paper: '#f4eddc', ink: '#1f2a55', accent: '#4a2f7a' },
    icon: 'inkmine',
    orientation: 'landscape',
    fonts: {
      googleCss: 'family=Caveat:wght@500;700&family=EB+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500',
      await: ['32px Caveat', '32px "EB Garamond"', '600 32px "EB Garamond"', 'italic 32px "EB Garamond"'],
    },
    features: [
      'Chapter 1 free: Graphite, your lander and your starship, no sign-up',
      'Full game: Mycel, a fungal moon with an alien wreck, and Brine, a purple sea world to swim and flood',
      'New worlds round the orange star arrive as free updates',
      'One-time purchase: no subscription, no ads, no energy timers',
    ],
    controls: [
      'Arrows / WASD or the stick: walk; push into rock to drill (up and down too)',
      'Space or the jump button: jump; hold it for the jetpack',
      'L or the bag button at the lander: go aboard; away from it: inventory',
      'Inventory or tap a gauge: feed the drill or the air',
      'Esc / P: inventory and pause',
      'M / ♪: sound on/off',
    ],
  },
  {
    slug: 'inkgecko',
    title: 'InkGecko',
    tagline: 'Spit. Match three. Keep them from the well.',
    kind: 'marble shooter game',
    fansOf: {
      games: ['Zuma', 'Luxor'],
      how: 'Yes, it is the same kind of marble shooter: a line of coloured marbles rolls along a path, your gecko spits marbles into it, and three of a colour pop before the line reaches the end. Close a gap between two matching colours and the line rolls back for a combo. Each of InkGecko’s ten gardens adds its own trick, from tunnels and twined pairs to bank shots off barn walls.',
    },
    genre: ['Puzzle', 'Arcade', 'Casual'],
    short: 'gecko',
    description: [
      'A marble shooter drawn in ballpoint pen. A gecko sits on a garden path and spits painted marbles into a line rolling towards an old well. Three of a colour pop, and when the colours either side of the gap match, the line rolls back for a combo.',
      'Its skin turns the colour of the marble in its mouth. Ten gardens, from a lily pond and a greenhouse to an old barn and a garden at night, each with a new trick: tunnels, windfalls, twined pairs, chameleon marbles, bank shots off barn walls and broken columns to glance off.',
    ],
    status: 'playable',
    cover: '/covers/inkgecko.png',
    loop: true,
    // Listed on the home page from this day (see isOut); its pages answer before that, for a look ahead of launch.
    released: '2026-10-22',
    updated: '2026-10-22',
    size: { chapters: 10, levels: 100 },
    demo: '10 levels free',
    price: '$4.99',
    stripeLookupKey: 'inkgecko_full',
    theme: { paper: '#f5f0e1', ink: '#26316a', accent: '#5f8f4e' },
    icon: 'inkgecko',
    orientation: 'landscape',
    fonts: { googleCss: 'family=Caveat:wght@500;700', await: ['32px Caveat'] },
    features: [
      'Garden 1 free: 10 levels, no sign-up',
      'Full game: 90 more levels across 9 more gardens, each with its own new trick',
      'One-time purchase: no subscription, no ads, no energy timers',
    ],
    controls: [
      'Mouse / finger: aim and spit',
      'Right-click, Space or tap the gecko: swap marbles',
      'A / D or arrows: run along the branch; W / Enter: spit',
      'Q / E or tap a lily pad: hop',
      'Esc / P / ❚❚: pause',
      'M / ♪: sound on/off',
    ],
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

/** A new game comes out every Sunday: it stays marked new until the next one has had a day. */
export const NEW_FOR_DAYS = 8;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Out, and released within the last NEW_FOR_DAYS days. */
export function isNew(game: CatalogGame, now: Date): boolean {
  const released = game.released ? Date.parse(`${game.released}T00:00:00Z`) : Number.NaN;
  if (!Number.isFinite(released)) return false;
  const age = now.getTime() - released;
  return age >= 0 && age < NEW_FOR_DAYS * DAY_MS;
}

/** Out by `now`: its release day has begun (UTC). Undated games are out. */
export function isOut(game: CatalogGame, now: Date): boolean {
  if (!game.released) return true;
  const released = Date.parse(`${game.released}T00:00:00Z`);
  return Number.isFinite(released) && now.getTime() >= released;
}

/**
 * Every playable game, released or not: what the site serves, sells and
 * counts. A game dated ahead can be played and bought by link before its day.
 */
export const playableGames = (): CatalogGame[] => GAMES.filter((g) => g.status === 'playable');

/** What the home page and the sitemap list: playable games whose release day has come. */
export const listedGames = (now: Date): CatalogGame[] => playableGames().filter((g) => isOut(g, now));

/** A release day as a timestamp; NaN when undated or unreadable. */
const releasedAt = (game: CatalogGame): number => (game.released ? Date.parse(`${game.released}T00:00:00Z`) : Number.NaN);

/** Newest release first; games out the same day keep their catalog order, and undated ones go last. */
export function newestFirst(games: readonly CatalogGame[]): CatalogGame[] {
  const key = (g: CatalogGame): number => {
    const at = releasedAt(g);
    return Number.isFinite(at) ? at : Number.NEGATIVE_INFINITY;
  };
  // Array.prototype.sort is stable, so ties stay in catalog order.
  return [...games].sort((a, b) => key(b) - key(a) || 0);
}

/** The home page's games: this week's game first (the featured one), then the rest newest first. */
export const homeGames = (now: Date): CatalogGame[] => newestFirst(listedGames(now));
