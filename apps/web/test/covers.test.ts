import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { playableGames } from '../src/data/games';
import { COVER_FORMATS, COVER_WIDTHS, coverSrcset, coverVariant, coverVariantName, loopSources } from '../src/lib/covers';

const publicFile = (url: string): string => fileURLToPath(new URL(`../public${url}`, import.meta.url));

describe('coverVariantName', () => {
  it('names a resized copy of a cover', () => {
    expect(coverVariantName('/covers/inkfish.png', 640, 'webp')).toBe('inkfish-640.webp');
    expect(coverVariantName('/covers/inkmine.png', 1200, 'avif')).toBe('inkmine-1200.avif');
  });
});

describe('coverVariant', () => {
  it('points at the bundled copy', () => {
    expect(coverVariant('/covers/inkfish.png', 640, 'webp')).toMatch(/inkfish-640(\.[\w-]+)?\.webp$/);
  });

  it('refuses a cover with no copies, rather than linking to nothing', () => {
    expect(() => coverVariant('/covers/nope.png', 640, 'webp')).toThrow('nope-640.webp');
  });

  it('lists every width of a format for srcset, smallest first', () => {
    const [small, large] = coverSrcset('/covers/inkcrab.png', 'webp').split(', ');
    expect(small).toMatch(/inkcrab-640\S*\.webp 640w$/);
    expect(large).toMatch(/inkcrab-1200\S*\.webp 1200w$/);
  });
});

describe('loopSources', () => {
  it('offers the small webm first and the mp4 for Safari', () => {
    const [webm, mp4] = loopSources('inkfish');
    expect(webm).toEqual({ src: expect.stringMatching(/inkfish\S*\.webm$/), type: 'video/webm' });
    expect(mp4).toEqual({ src: expect.stringMatching(/inkfish\S*\.mp4$/), type: 'video/mp4' });
  });
});

describe('cover files', () => {
  it('every playable game has its master cover and every size and format (pnpm --filter @16bitink/web covers)', () => {
    for (const game of playableGames()) {
      expect(game.cover, game.slug).toBeDefined();
      expect(existsSync(publicFile(game.cover!)), game.cover).toBe(true);
      for (const format of COVER_FORMATS) {
        for (const width of COVER_WIDTHS) expect(() => coverVariant(game.cover!, width, format), game.slug).not.toThrow();
      }
    }
  });

  it('every game with a gameplay loop has both of its video files (scripts/loops.mjs)', () => {
    for (const game of playableGames().filter((g) => g.loop)) {
      expect(() => loopSources(game.slug), game.slug).not.toThrow();
    }
  });
});
