import type { SfxId } from './recipes';

/**
 * The sound for the news the lander's page scribbles after something's
 * done there: a warm chord for anything printed, repaired or mended, a
 * rising tone for a tank or the suit filled, a dull one for a no. Other news
 * (the call recorded) is left to its own card.
 */
export function newsSound(news: string | undefined): SfxId | null {
  if (!news) return null;
  if (/repaired!$|mended!$|^Printed:|drive core is in/i.test(news)) return 'mended';
  if (/is full$|^No /.test(news)) return 'dull';
  if (/filled$|^(Air|Cell) \+/.test(news)) return 'fed';
  return null;
}
