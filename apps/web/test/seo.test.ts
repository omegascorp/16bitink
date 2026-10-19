import { describe, expect, it } from 'vitest';
import { findGame, playableGames } from '../src/data/games';
import { gameFaq, gameJsonLd, gameTitle, jsonLdScript, robotsTxt, siteJsonLd, sitemapXml } from '../src/lib/seo';

const SITE = new URL('https://16bit.ink');
const inkfish = findGame('inkfish')!;

describe('robots.txt', () => {
  const robots = robotsTxt(SITE);

  it('keeps crawlers out of private and machine-only pages', () => {
    for (const path of ['/admin', '/api/', '/account', '/redeem', '/purchase/', '/auth/', '/unsubscribe']) {
      expect(robots).toContain(`Disallow: ${path}`);
    }
  });

  it('leaves the catalog and the games open and points at the sitemap', () => {
    expect(robots).not.toMatch(/Disallow: \/games/);
    expect(robots).not.toMatch(/Disallow: \/play/);
    expect(robots).toContain('Sitemap: https://16bit.ink/sitemap.xml');
  });
});

describe('sitemap.xml', () => {
  const xml = sitemapXml(SITE);

  it('lists the home page, the info pages and every playable game', () => {
    expect(xml).toContain('<loc>https://16bit.ink/</loc>');
    for (const path of ['/about', '/terms', '/privacy']) expect(xml).toContain(`<loc>https://16bit.ink${path}</loc>`);
    for (const g of playableGames()) expect(xml).toContain(`<loc>https://16bit.ink/games/${g.slug}</loc>`);
  });

  it('dates each game page by its last update', () => {
    expect(xml).toContain(`<loc>https://16bit.ink/games/inkfish</loc><lastmod>${inkfish.updated}</lastmod>`);
  });

  it('dates the home page by the newest game change', () => {
    const newest = playableGames().map((g) => g.updated ?? g.released ?? '').sort().at(-1);
    expect(xml).toContain(`<loc>https://16bit.ink/</loc><lastmod>${newest}</lastmod>`);
  });

  it('leaves out games still in the sketchbook and private pages', () => {
    expect(xml).not.toContain('pixel-quill');
    expect(xml).not.toContain('/admin');
    expect(xml).not.toContain('/redeem');
  });

  it('is a well-formed urlset', () => {
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect(xml.trimEnd().endsWith('</urlset>')).toBe(true);
  });
});

describe('game titles', () => {
  it('lead with what people search for and stay short enough for a results page', () => {
    for (const g of playableGames()) {
      const title = gameTitle(g);
      expect(title, g.slug).toContain(g.title);
      expect(title.toLowerCase(), g.slug).toContain(g.kind!.toLowerCase());
      expect(title.length, g.slug).toBeLessThanOrEqual(65);
    }
  });
});

describe('structured data', () => {
  it('describes a game as a free-to-start VideoGame playable in a browser', () => {
    const ld = gameJsonLd(inkfish, SITE);
    expect(ld).toMatchObject({
      '@context': 'https://schema.org',
      '@type': 'VideoGame',
      name: 'InkFish',
      url: 'https://16bit.ink/games/inkfish',
      image: 'https://16bit.ink/covers/inkfish.png',
      gamePlatform: 'Web browser',
      isAccessibleForFree: true,
      datePublished: inkfish.released,
    });
  });

  it('offers the free demo and the one-time full game at the catalog price', () => {
    const offers = gameJsonLd(inkfish, SITE).offers as readonly Record<string, unknown>[];
    expect(offers.map((o) => [o.price, o.priceCurrency])).toEqual([
      ['0', 'USD'],
      ['4.99', 'USD'],
    ]);
  });

  it('offers only the demo for a game with nothing to buy', () => {
    const free = { ...inkfish, price: undefined, stripeLookupKey: undefined };
    const offers = gameJsonLd(free, SITE).offers as readonly Record<string, unknown>[];
    expect(offers).toHaveLength(1);
    expect(offers[0]).toMatchObject({ price: '0' });
  });

  it('names the site and who runs it', () => {
    expect(siteJsonLd(SITE)).toMatchObject({ '@type': 'WebSite', name: '16bit.ink', url: 'https://16bit.ink/' });
  });

  it('cannot close its script tag early', () => {
    const script = jsonLdScript({ name: '</script><script>alert(1)</script>' });
    expect(script).not.toContain('</script>');
    expect(JSON.parse(script)).toEqual({ name: '</script><script>alert(1)</script>' });
  });
});

describe('game FAQ', () => {
  it('answers the questions people search before playing, for every game', () => {
    for (const g of playableGames()) {
      const faq = gameFaq(g);
      expect(faq.map((f) => f.q), g.slug).toEqual([
        `Is ${g.title} free to play?`,
        `Do I need to download ${g.title}?`,
        'Does my progress save?',
        'Are there more games like this?',
      ]);
      for (const f of faq) expect(f.a.length, `${g.slug}: ${f.q}`).toBeGreaterThan(20);
    }
  });

  it('states the one-time price only when the full game is for sale', () => {
    expect(gameFaq(inkfish)[0]!.a).toContain('one-time purchase of $4.99');
    const free = { ...inkfish, price: undefined, stripeLookupKey: undefined };
    expect(gameFaq(free)[0]!.a).not.toContain('$');
  });
});
