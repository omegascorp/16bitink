import { describe, expect, it } from 'vitest';
import { findGame, listedGames } from '../src/data/games';
import { GAMES_LIKE, findGamesLike, gamesLikeFor, listedGamesLike, ourTitle } from '../src/data/gamesLike';
import { gamesLikeFaq, gamesLikeIndexJsonLd, gamesLikeJsonLd, gamesLikeTitle, sitemapXml } from '../src/lib/seo';

const SITE = new URL('https://16bit.ink');
/** After every catalog game's release day. */
const LATER = new Date('2030-01-01T00:00:00Z');
const words = (text: string): number => text.trim().split(/\s+/).length;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

describe('"games like" pages', () => {
  it('have unique, URL-safe slugs', () => {
    expect(new Set(GAMES_LIKE.map((p) => p.slug)).size).toBe(GAMES_LIKE.length);
    for (const p of GAMES_LIKE) expect(p.slug).toMatch(/^[a-z0-9-]{1,40}$/);
  });

  it('each lead to a playable game of ours, or wait for one still on its branch', () => {
    for (const p of GAMES_LIKE) {
      // Once the game is in the catalog, drop `coming` so the page goes up with it.
      if (p.coming) expect(findGame(p.game), `${p.slug}: ${p.game} is in the catalog now, remove coming`).toBeUndefined();
      else expect(findGame(p.game)?.status, p.slug).toBe('playable');
    }
  });

  it('stay down while their game is still coming', () => {
    const waiting = GAMES_LIKE.filter((p) => p.coming);
    for (const p of waiting) expect(listedGamesLike(LATER).includes(p), p.slug).toBe(false);
  });

  it('name our game from the catalog, or from `coming` until it is in', () => {
    expect(ourTitle(findGamesLike('motherload')!)).toBe('InkMine');
    expect(ourTitle({ ...GAMES_LIKE[0]!, game: 'inknext', coming: 'InkNext' })).toBe('InkNext');
  });

  it('answer the search in the opening, short enough to be quoted whole', () => {
    for (const p of GAMES_LIKE) {
      expect(p.answer, p.slug).toContain(ourTitle(p));
      expect(p.answer, p.slug).toContain(p.classic);
      expect(words(p.answer), p.slug).toBeLessThanOrEqual(60);
    }
  });

  it('list other games too, with a link for each, not only ours', () => {
    for (const p of GAMES_LIKE) {
      expect(p.alternatives.length, p.slug).toBeGreaterThanOrEqual(3);
      for (const a of p.alternatives) {
        expect(a.url, `${p.slug}: ${a.name}`).toMatch(/^https:\/\//);
        expect(a.why.length, `${p.slug}: ${a.name}`).toBeGreaterThan(20);
      }
    }
  });

  it('compare the classic with our game row by row', () => {
    for (const p of GAMES_LIKE) {
      expect(p.compare.length, p.slug).toBeGreaterThanOrEqual(4);
      for (const row of p.compare) expect(row.classic && row.ours, `${p.slug}: ${row.label}`).toBeTruthy();
    }
  });

  it('say how each handles ads: having none is what sets ours apart from the portal versions', () => {
    for (const p of GAMES_LIKE) {
      const ads = p.compare.find((row) => row.label === 'Ads');
      expect(ads?.ours, p.slug).toMatch(/^None/);
    }
  });

  it('cite their sources and are dated', () => {
    for (const p of GAMES_LIKE) {
      expect(p.sources.length, p.slug).toBeGreaterThanOrEqual(2);
      // http only where a source's own https is broken (XGen's certificate expired in Jan 2026).
      for (const s of p.sources) expect(s.url, p.slug).toMatch(/^https?:\/\//);
      expect(p.published, p.slug).toMatch(DATE);
      expect(p.updated, p.slug).toMatch(DATE);
      expect(p.updated >= p.published, p.slug).toBe(true);
    }
  });

  it('are found by slug, and by the game they lead to', () => {
    expect(findGamesLike('motherload')?.game).toBe('inkmine');
    expect(findGamesLike('nope')).toBeUndefined();
    expect(gamesLikeFor('inkmine').map((p) => p.slug)).toEqual(['motherload']);
    expect(gamesLikeFor('inkcrab')).toEqual([]);
  });

  it('can lead several old games to the same game of ours, one page each', () => {
    const fishy = { ...GAMES_LIKE[0]!, slug: 'fishy', classic: 'Fishy', game: 'inkfish' };
    const frenzy = { ...fishy, slug: 'feeding-frenzy', classic: 'Feeding Frenzy' };
    expect(gamesLikeFor('inkfish', [fishy, frenzy]).map((p) => p.slug)).toEqual(['fishy', 'feeding-frenzy']);
  });

  it('give each old game one page only', () => {
    expect(new Set(GAMES_LIKE.map((p) => p.classic.toLowerCase())).size).toBe(GAMES_LIKE.length);
  });

  it('are listed only once the game they lead to is out', () => {
    const page = { ...GAMES_LIKE[0]!, game: 'inkgecko' };
    expect(listedGamesLike(new Date('2026-10-21T23:59:59Z'), [page])).toEqual([]);
    expect(listedGamesLike(new Date('2026-10-22T00:00:00Z'), [page])).toEqual([page]);
  });
});

describe('"games like" titles', () => {
  it('lead with the search phrase and fit a results page', () => {
    for (const p of GAMES_LIKE) {
      const title = gamesLikeTitle(p);
      expect(title, p.slug).toMatch(new RegExp(`^Games Like ${p.classic}`));
      expect(title.length, p.slug).toBeLessThanOrEqual(65);
    }
  });

  it('drop the tail for a long name rather than run over', () => {
    const long = { ...GAMES_LIKE[0]!, classic: 'Heroes of Might and Magic III' };
    expect(gamesLikeTitle(long)).toBe('Games Like Heroes of Might and Magic III | 16bit.ink');
  });
});

describe('"games like" FAQ', () => {
  it('says our game is ours and not connected to the classic\'s makers', () => {
    for (const p of GAMES_LIKE) {
      const faq = gamesLikeFaq(p);
      expect(faq.length, p.slug).toBeGreaterThanOrEqual(3);
      expect(faq.some((f) => f.a.includes(`not made by or connected to the makers of ${p.classic}`)), p.slug).toBe(true);
    }
  });
});

describe('"games like" structured data', () => {
  const page = findGamesLike('motherload')!;
  const [article, list] = gamesLikeJsonLd(page, SITE) as Record<string, unknown>[];

  it('is an Article with an author and its dates', () => {
    expect(article).toMatchObject({
      '@type': 'Article',
      url: 'https://16bit.ink/games-like/motherload',
      datePublished: page.published,
      dateModified: page.updated,
      author: { '@type': 'Person', name: page.author },
    });
  });

  it('ranks our game first, then every alternative in order', () => {
    const items = (list as { itemListElement: { position: number; name: string }[] }).itemListElement;
    expect(items[0]).toMatchObject({ position: 1, name: 'InkMine' });
    expect(items.slice(1).map((i) => i.name)).toEqual(page.alternatives.map((a) => a.name));
    expect(items.map((i) => i.position)).toEqual(items.map((_, i) => i + 1));
  });
});

describe('sitemap', () => {
  it('lists each "games like" page, dated by its last update', () => {
    const xml = sitemapXml(SITE, listedGames(LATER), listedGamesLike(LATER));
    for (const p of listedGamesLike(LATER)) expect(xml).toContain(`<loc>https://16bit.ink/games-like/${p.slug}</loc><lastmod>${p.updated}</lastmod>`);
    for (const p of GAMES_LIKE.filter((g) => g.coming)) expect(xml).not.toContain(`/games-like/${p.slug}<`);
  });

  it('lists the index of "games like" pages, dated by the newest, only while there are any', () => {
    const pages = listedGamesLike(LATER);
    const newest = pages.map((p) => p.updated).sort().at(-1);
    expect(sitemapXml(SITE, listedGames(LATER), pages)).toContain(`<loc>https://16bit.ink/games-like</loc><lastmod>${newest}</lastmod>`);
    expect(sitemapXml(SITE, listedGames(LATER), [])).not.toContain('/games-like');
  });
});

describe('"games like" index structured data', () => {
  it('lists every page it links to, in order', () => {
    const pages = listedGamesLike(LATER);
    const ld = gamesLikeIndexJsonLd(pages, SITE) as { '@type': string; mainEntity: { itemListElement: { position: number; url: string }[] } };
    expect(ld['@type']).toBe('CollectionPage');
    expect(ld.mainEntity.itemListElement.map((i) => i.url)).toEqual(pages.map((p) => `https://16bit.ink/games-like/${p.slug}`));
  });
});
