import { dailyMp, type Hero } from '../../logic/hero';
import { tilesOf } from '../../logic/map';

/** How much of a day's travel a hero has left, 0 to 1 (a Stables' extra shows as full). */
export const travelLeft = (h: Hero): number => Math.max(0, Math.min(1, h.mp / Math.max(1, dailyMp(h))));

/** What the hero list shows: another hero hired or fallen, another picked, or travel used redraws it. */
export const heroListKey = (heroes: readonly Hero[], picked: string): string => `${picked}>${heroes.map((h) => `${h.id}:${tilesOf(h.mp)}`).join('|')}`;

/** The list in the order it keeps: as the heroes were hired, so picking one doesn't shuffle the row. */
export function heroListOrder(heroes: readonly Hero[], hired: readonly string[]): Hero[] {
  const at = (h: Hero): number => {
    const i = hired.indexOf(h.id);
    return i < 0 ? hired.length : i;
  };
  return [...heroes].sort((a, b) => at(a) - at(b));
}
