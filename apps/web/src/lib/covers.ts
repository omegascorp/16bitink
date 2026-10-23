/**
 * Game covers in the sizes and formats the pages ask for. The PNG in
 * public/covers/ is the master (and the social preview, which needs a URL
 * that never changes); scripts/covers.mjs renders the copies named here into
 * src/assets/covers/. Those and the gameplay loops are bundled, so their URLs
 * carry a content hash and are cached for a year (`/_astro/…`).
 */

/** Bundled covers and loops: `../assets/covers/inkfish-640.webp` -> its hashed URL. */
const ASSETS = import.meta.glob<string>('../assets/{covers,loops}/*', { eager: true, query: '?url', import: 'default' });

/** The bundled URL of `src/assets/<dir>/<name>`; throws for a file that isn't there (test/covers.test.ts checks every game's). */
function assetUrl(dir: 'covers' | 'loops', name: string): string {
  const url = ASSETS[`../assets/${dir}/${name}`];
  if (!url) throw new Error(`Missing src/assets/${dir}/${name}`);
  return url;
}

/** 640 for phones, 1200 for desktop and 2x screens. */
export const COVER_WIDTHS = [640, 1200] as const;
/** Best first: AVIF is the smallest, WebP the fallback every current browser has. */
export const COVER_FORMATS = ['avif', 'webp'] as const;
export type CoverFormat = (typeof COVER_FORMATS)[number];

/** `/covers/inkfish.png`, 640, `webp` -> `inkfish-640.webp`. */
export function coverVariantName(cover: string, width: number, format: CoverFormat): string {
  const base = cover.slice(cover.lastIndexOf('/') + 1).replace(/\.[a-z0-9]+$/i, '');
  return `${base}-${width}.${format}`;
}

/** `/covers/inkfish.png`, 640, `webp` -> the URL of `src/assets/covers/inkfish-640.webp`. */
export function coverVariant(cover: string, width: number, format: CoverFormat): string {
  return assetUrl('covers', coverVariantName(cover, width, format));
}

/** Every width of one format, as an `<img srcset>`. */
export function coverSrcset(cover: string, format: CoverFormat): string {
  return COVER_WIDTHS.map((width) => `${coverVariant(cover, width, format)} ${width}w`).join(', ');
}

export interface VideoSource {
  readonly src: string;
  readonly type: string;
}

/** A game's silent gameplay loop (scripts/loops.mjs): the small WebM first, MP4 for Safari. */
export function loopSources(slug: string): readonly VideoSource[] {
  return [
    { src: assetUrl('loops', `${slug}.webm`), type: 'video/webm' },
    { src: assetUrl('loops', `${slug}.mp4`), type: 'video/mp4' },
  ];
}
