import type { CatalogGame } from '../data/games';

/**
 * Web app manifests. The catalog installs as "16bit.ink" under the brand icon;
 * each game installs as its own app (its own `id`) under the game's icon.
 * Icons are rendered by scripts/icons.mjs into public/icons/.
 */

const PAPER = '#f4eddc';
const BRAND_ICON = '16bitink';

export interface ManifestIcon {
  readonly src: string;
  readonly sizes: string;
  readonly type: 'image/png';
  readonly purpose: 'any' | 'maskable';
}

export interface WebManifest {
  readonly id: string;
  readonly name: string;
  readonly short_name: string;
  readonly description: string;
  readonly start_url: string;
  readonly scope: string;
  readonly display: 'standalone' | 'fullscreen';
  readonly orientation?: 'any' | 'landscape' | 'portrait';
  readonly background_color: string;
  readonly theme_color: string;
  readonly icons: readonly ManifestIcon[];
}

function icons(name: string): ManifestIcon[] {
  const png = (file: string, sizes: string, purpose: ManifestIcon['purpose']): ManifestIcon => ({
    src: `/icons/${file}.png`, sizes, type: 'image/png', purpose,
  });
  return [
    png(`${name}-192`, '192x192', 'any'),
    png(`${name}-512`, '512x512', 'any'),
    png(`${name}-maskable-512`, '512x512', 'maskable'),
  ];
}

/** The iOS home-screen icon for a game's play page, or for the catalog when no game is given. */
export function appleTouchIcon(game?: CatalogGame): string {
  return `/icons/${game?.icon ?? BRAND_ICON}-180.png`;
}

export function siteManifest(): WebManifest {
  return {
    id: '/',
    name: '16bit.ink',
    short_name: '16bit.ink',
    description: 'Pen-and-ink style browser games.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: PAPER,
    theme_color: PAPER,
    icons: icons(BRAND_ICON),
  };
}

export function gameManifest(game: CatalogGame): WebManifest {
  const paper = game.theme?.paper ?? PAPER;
  const path = `/play/${game.slug}`;
  return {
    id: path,
    name: game.title,
    short_name: game.title,
    description: game.tagline,
    start_url: path,
    // The whole site, not just the play page: checkout returns to /purchase/success,
    // which should open inside the installed game rather than in a browser tab.
    scope: '/',
    display: 'fullscreen',
    orientation: game.orientation ?? 'any',
    background_color: paper,
    theme_color: paper,
    icons: icons(game.icon ?? BRAND_ICON),
  };
}
