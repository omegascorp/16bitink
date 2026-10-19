/**
 * Game covers in the sizes and formats the pages ask for. The PNG in
 * public/covers/ is the master (and the social preview); scripts/covers.mjs
 * renders the copies named here next to it.
 */

/** 640 for phones, 1200 for desktop and 2x screens. */
export const COVER_WIDTHS = [640, 1200] as const;
/** Best first: AVIF is the smallest, WebP the fallback every current browser has. */
export const COVER_FORMATS = ['avif', 'webp'] as const;
export type CoverFormat = (typeof COVER_FORMATS)[number];

/** `/covers/inkfish.png`, 640, `webp` -> `/covers/inkfish-640.webp`. */
export function coverVariant(cover: string, width: number, format: CoverFormat): string {
  return `${cover.replace(/\.[a-z0-9]+$/i, '')}-${width}.${format}`;
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
    { src: `/loops/${slug}.webm`, type: 'video/webm' },
    { src: `/loops/${slug}.mp4`, type: 'video/mp4' },
  ];
}
