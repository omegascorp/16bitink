import { GAMES, type GameFonts, type GameTheme } from '../../web/src/data/games';

/** What the itch.io edition of one game needs from the catalog: read from apps/web's GAMES, the one source of truth. */
export interface Edition {
  readonly slug: string;
  readonly title: string;
  readonly tagline: string;
  readonly price?: string;
  readonly theme: GameTheme;
  readonly fonts?: GameFonts;
}

const DEFAULT_THEME: GameTheme = { paper: '#f4eddc', ink: '#1b1a1f', accent: '#1f3f8a' };

/** Every playable game, as an itch.io edition. */
export function editions(): readonly Edition[] {
  return GAMES.filter((g) => g.status === 'playable').map((g) => ({
    slug: g.slug,
    title: g.title,
    tagline: g.tagline,
    ...(g.price ? { price: g.price } : {}),
    theme: g.theme ?? DEFAULT_THEME,
    ...(g.fonts ? { fonts: g.fonts } : {}),
  }));
}

/** The edition for `slug`; throws with the valid slugs when there's none, so a typo fails the build. */
export function findEdition(slug: string): Edition {
  const all = editions();
  const edition = all.find((e) => e.slug === slug);
  if (!edition) throw new Error(`No playable game "${slug}". Pick one of: ${all.map((e) => e.slug).join(', ')}`);
  return edition;
}
