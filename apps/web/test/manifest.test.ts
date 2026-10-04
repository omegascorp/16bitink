import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { findGame, playableGames } from '../src/data/games';
import { appleTouchIcon, gameManifest, siteManifest } from '../src/lib/manifest';

const PUBLIC = join(import.meta.dirname, '..', 'public');

describe('site manifest', () => {
  const m = siteManifest();

  it('installs the catalog under the brand icon', () => {
    expect(m).toMatchObject({ id: '/', start_url: '/', scope: '/', name: '16bit.ink' });
    expect(m.icons.map((i) => i.src)).toContain('/icons/16bitink-512.png');
  });

  it('does not claim the art is hand-drawn', () => {
    expect(m.description).not.toMatch(/hand-drawn/i);
  });
});

describe('game manifest', () => {
  const inkfish = findGame('inkfish')!;
  const m = gameManifest(inkfish);

  it('installs as its own app, separate from the catalog', () => {
    expect(m.id).toBe('/play/inkfish');
    expect(m.id).not.toBe(siteManifest().id);
    expect(m).toMatchObject({ name: 'InkFish', start_url: '/play/inkfish', display: 'fullscreen' });
  });

  it('keeps the whole site in scope so checkout returns inside the app', () => {
    expect(m.scope).toBe('/');
  });

  it('uses the game icon and theme', () => {
    expect(m.icons.map((i) => i.src)).toContain('/icons/inkfish-512.png');
    expect(m.theme_color).toBe(inkfish.theme?.paper);
    expect(appleTouchIcon(inkfish)).toBe('/icons/inkfish-180.png');
  });

  it('falls back to the brand icon for a game without one', () => {
    const plain = { ...inkfish, icon: undefined };
    expect(gameManifest(plain).icons.map((i) => i.src)).toContain('/icons/16bitink-512.png');
    expect(appleTouchIcon(plain)).toBe('/icons/16bitink-180.png');
  });
});

describe('icon files', () => {
  it('exist for every icon a manifest or page points at', () => {
    const manifests = [siteManifest(), ...playableGames().map(gameManifest)];
    const srcs = new Set([
      ...manifests.flatMap((m) => m.icons.map((i) => i.src)),
      appleTouchIcon(),
      ...playableGames().map((g) => appleTouchIcon(g)),
    ]);
    for (const src of srcs) expect(existsSync(join(PUBLIC, src)), src).toBe(true);
  });

  it('offers a maskable icon in every manifest', () => {
    for (const m of [siteManifest(), ...playableGames().map(gameManifest)]) {
      expect(m.icons.some((i) => i.purpose === 'maskable'), m.id).toBe(true);
    }
  });
});
