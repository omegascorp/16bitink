/**
 * What search engines read: robots.txt, the sitemap, page titles, the
 * schema.org structured data and each game's FAQ. Built from the catalog,
 * so a new game is listed the day it ships.
 */

import { COMPANY } from '../data/company';
import { findGame, isPurchasable, listedGames, type CatalogGame } from '../data/games';
import { FLASH_GAMES, FLASH_PAGE } from '../data/flashGames';
import { listedGamesLike, ourTitle, type GamesLikePage } from '../data/gamesLike';

/** Pages that are private, per player or for machines: nothing to find in a search. */
const PRIVATE_PATHS = ['/admin', '/api/', '/account', '/redeem', '/purchase/', '/auth/', '/unsubscribe'] as const;

/** Public pages besides the home page and the games. */
const INFO_PATHS = ['/about', '/terms', '/privacy'] as const;

export function robotsTxt(site: URL): string {
  return ['User-agent: *', ...PRIVATE_PATHS.map((p) => `Disallow: ${p}`), '', `Sitemap: ${new URL('/sitemap.xml', site)}`, ''].join('\n');
}

const lastChanged = (game: CatalogGame): string | undefined => game.updated ?? game.released;

const urlEntry = (loc: URL, lastmod?: string): string => `  <url><loc>${loc}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}</url>`;

export function sitemapXml(
  site: URL,
  games: readonly CatalogGame[] = listedGames(new Date()),
  gamesLike: readonly GamesLikePage[] = listedGamesLike(new Date()),
): string {
  const newest = games.map(lastChanged).filter((d): d is string => Boolean(d)).sort().at(-1);
  const entries = [
    urlEntry(new URL('/', site), newest),
    ...games.map((g) => urlEntry(new URL(`/games/${g.slug}`, site), lastChanged(g))),
    ...(gamesLike.length ? [urlEntry(new URL('/games-like', site), gamesLike.map((p) => p.updated).sort().at(-1))] : []),
    ...gamesLike.map((p) => urlEntry(new URL(`/games-like/${p.slug}`, site), p.updated)),
    urlEntry(new URL('/flash-games', site), FLASH_PAGE.updated),
    ...INFO_PATHS.map((p) => urlEntry(new URL(p, site))),
  ];
  return ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">', ...entries, '</urlset>', ''].join('\n');
}

const titleCase = (text: string): string => text.replace(/(^|[\s-])([a-z])/g, (_, gap: string, c: string) => gap + c.toUpperCase());

/** "InkFish: Free Fish-Eat-Fish Game in Your Browser | 16bit.ink": the search phrase first, the tagline stays on the page. */
export function gameTitle(game: CatalogGame): string {
  return game.kind ? `${game.title}: Free ${titleCase(game.kind)} in Your Browser | 16bit.ink` : `${game.title}: ${game.tagline} | 16bit.ink`;
}

/** "$4.99" → "4.99" (USD is the only currency the catalog shows). */
const amount = (price: string): string => price.replace(/[^0-9.]/g, '');

const publisher = (site: URL): Record<string, unknown> => ({ '@type': 'Organization', name: '16bit.ink', url: new URL('/', site).href, legalName: COMPANY.name });

export function gameJsonLd(game: CatalogGame, site: URL): Record<string, unknown> {
  const url = new URL(`/games/${game.slug}`, site).href;
  const demo = { '@type': 'Offer', name: `Free demo${game.demo ? `: ${game.demo}` : ''}`, price: '0', priceCurrency: 'USD', availability: 'https://schema.org/InStock', url };
  const full =
    isPurchasable(game) && game.price
      ? [{ '@type': 'Offer', name: 'Full game, one-time purchase', price: amount(game.price), priceCurrency: 'USD', availability: 'https://schema.org/InStock', url }]
      : [];
  return {
    '@context': 'https://schema.org',
    '@type': 'VideoGame',
    name: game.title,
    description: game.description.join(' '),
    url,
    ...(game.cover ? { image: new URL(game.cover, site).href } : {}),
    ...(game.genre ? { genre: game.genre } : {}),
    gamePlatform: 'Web browser',
    applicationCategory: 'Game',
    operatingSystem: 'Any (runs in a web browser)',
    playMode: 'SinglePlayer',
    isAccessibleForFree: true,
    ...(game.released ? { datePublished: game.released } : {}),
    ...(game.updated ? { dateModified: game.updated } : {}),
    publisher: publisher(site),
    offers: [demo, ...full],
  };
}

export function siteJsonLd(site: URL): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: '16bit.ink',
    url: new URL('/', site).href,
    description: 'Small browser games drawn in a pen-and-ink style. Free to start, no download, a new game every Sunday.',
    publisher: publisher(site),
  };
}

export interface FaqEntry {
  readonly q: string;
  readonly a: string;
}

/** "A", "A and B", "A, B and C" (or "A, B or C"). */
const listOf = (items: readonly string[], last: 'and' | 'or' = 'and'): string =>
  items.length < 2 ? (items[0] ?? '') : `${items.slice(0, -1).join(', ')} ${last} ${items[items.length - 1]}`;

/** "For fans of Zuma and Luxor.": the games a game plays like, for the people searching for them. */
export function fansOfLine(game: CatalogGame): string | undefined {
  return game.fansOf?.games.length ? `For fans of ${listOf(game.fansOf.games)}.` : undefined;
}

/** "Is InkGecko like Zuma?": what's alike, what's its own, and that it's no relation (the names belong to their makers). */
function fansOfFaq(game: CatalogGame): readonly FaqEntry[] {
  const { games = [], how = '' } = game.fansOf ?? {};
  if (!games.length) return [];
  return [{ q: `Is ${game.title} like ${games[0]}?`, a: `${how} ${game.title} is our own game and isn’t made by or connected to the makers of ${listOf(games, 'or')}.` }];
}

/** The questions people ask before playing a browser game, answered from the catalog. */
export function gameFaq(game: CatalogGame): readonly FaqEntry[] {
  const price =
    isPurchasable(game) && game.price
      ? ` The rest of the game is a one-time purchase of ${game.price}: no subscription, no ads and nothing more to buy.`
      : ' The rest of the game is coming soon.';
  return [
    { q: `Is ${game.title} free to play?`, a: `Yes. The whole first chapter is free, with no sign-up and no ads.${price}` },
    ...fansOfFaq(game),
    {
      q: `Do I need to download ${game.title}?`,
      a: `No. ${game.title} runs full-screen in your web browser, on a computer, phone or tablet. You can also add it to your home screen and open it like an app.`,
    },
    {
      q: 'Does my progress save?',
      a: 'Yes, in your browser, as you play. Sign in with Google or your email if you want to carry on from the same place on another device.',
    },
    { q: 'Are there more games like this?', a: 'Yes. 16bit.ink releases a new small game every Sunday, all in the same pen-and-ink style.' },
  ];
}

export function faqJsonLd(faq: readonly FaqEntry[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  };
}

/** Structured data as the body of a `<script type="application/ld+json">`, safe from early `</script>` endings. */
export function jsonLdScript(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

/** Longest title a results page shows whole. */
const MAX_TITLE = 65;

/**
 * "Games Like Motherload You Can Play Today | 16bit.ink": the phrase people type, first, matching the h1.
 * A long name drops the tail ("Games Like Heroes of Might and Magic III | 16bit.ink").
 */
export function gamesLikeTitle(page: GamesLikePage): string {
  const long = `Games Like ${page.classic} You Can Play Today | 16bit.ink`;
  return long.length <= MAX_TITLE ? long : `Games Like ${page.classic} | 16bit.ink`;
}

/** The page's own questions, then whose game is whose (the classic's name belongs to its makers). */
export function gamesLikeFaq(page: GamesLikePage): readonly FaqEntry[] {
  const title = ourTitle(page);
  return [
    ...page.faq,
    {
      q: `Is ${title} made by the makers of ${page.classic}?`,
      a: `No. ${title} is our own game, made at 16bit.ink, and it is not made by or connected to the makers of ${page.classic}. We name ${page.classic} only to compare.`,
    },
  ];
}

/** An Article (who wrote it and when) and the ranked list of games it recommends, ours first. */
export function gamesLikeJsonLd(page: GamesLikePage, site: URL): readonly Record<string, unknown>[] {
  const url = new URL(`/games-like/${page.slug}`, site).href;
  const game = findGame(page.game);
  const ours = { name: ourTitle(page), url: new URL(`/games/${page.game}`, site).href };
  const items = [ours, ...page.alternatives.map((a) => ({ name: a.name, url: a.url }))];
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: page.heading,
      description: page.description,
      url,
      ...(game?.cover ? { image: new URL(game.cover, site).href } : {}),
      datePublished: page.published,
      dateModified: page.updated,
      author: { '@type': 'Person', name: page.author, url: new URL('/about', site).href },
      publisher: publisher(site),
      about: { '@type': 'VideoGame', name: page.classic },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: page.heading,
      itemListOrder: 'https://schema.org/ItemListOrderAscending',
      itemListElement: items.map((item, i) => ({ '@type': 'ListItem', position: i + 1, name: item.name, url: item.url })),
    },
  ];
}

/** The index of "games like" pages: a collection, each page in the order shown. */
export function gamesLikeIndexJsonLd(pages: readonly GamesLikePage[], site: URL): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Games like the classics',
    url: new URL('/games-like', site).href,
    publisher: publisher(site),
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: pages.map((p, i) => ({ '@type': 'ListItem', position: i + 1, name: p.heading, url: new URL(`/games-like/${p.slug}`, site).href })),
    },
  };
}

/** "Flash Games You Can Still Play, and Where | 16bit.ink". */
export const flashTitle = (): string => 'Flash Games You Can Still Play, and Where | 16bit.ink';

/** An Article (who wrote it and when) and the games it lists, in order. */
export function flashJsonLd(site: URL): readonly Record<string, unknown>[] {
  const url = new URL('/flash-games', site).href;
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: FLASH_PAGE.heading,
      description: FLASH_PAGE.description,
      url,
      datePublished: FLASH_PAGE.published,
      dateModified: FLASH_PAGE.updated,
      author: { '@type': 'Person', name: FLASH_PAGE.author, url: new URL('/about', site).href },
      publisher: publisher(site),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: FLASH_PAGE.heading,
      itemListElement: FLASH_GAMES.map((g, i) => ({ '@type': 'ListItem', position: i + 1, name: g.name, url: g.playNow[0]?.url })),
    },
  ];
}
