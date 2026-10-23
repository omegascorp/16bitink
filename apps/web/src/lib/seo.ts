/**
 * What search engines read: robots.txt, the sitemap, page titles, the
 * schema.org structured data and each game's FAQ. Built from the catalog,
 * so a new game is listed the day it ships.
 */

import { COMPANY } from '../data/company';
import { isPurchasable, listedGames, type CatalogGame } from '../data/games';

/** Pages that are private, per player or for machines: nothing to find in a search. */
const PRIVATE_PATHS = ['/admin', '/api/', '/account', '/redeem', '/purchase/', '/auth/', '/unsubscribe'] as const;

/** Public pages besides the home page and the games. */
const INFO_PATHS = ['/about', '/terms', '/privacy'] as const;

export function robotsTxt(site: URL): string {
  return ['User-agent: *', ...PRIVATE_PATHS.map((p) => `Disallow: ${p}`), '', `Sitemap: ${new URL('/sitemap.xml', site)}`, ''].join('\n');
}

const lastChanged = (game: CatalogGame): string | undefined => game.updated ?? game.released;

const urlEntry = (loc: URL, lastmod?: string): string => `  <url><loc>${loc}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}</url>`;

export function sitemapXml(site: URL, games: readonly CatalogGame[] = listedGames(new Date())): string {
  const newest = games.map(lastChanged).filter((d): d is string => Boolean(d)).sort().at(-1);
  const entries = [
    urlEntry(new URL('/', site), newest),
    ...games.map((g) => urlEntry(new URL(`/games/${g.slug}`, site), lastChanged(g))),
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
      a: 'Yes, in your browser, as you play. Sign in with Google if you want to carry on from the same place on another device.',
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
