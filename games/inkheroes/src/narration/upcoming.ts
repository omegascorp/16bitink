import type { Adventure } from '../logic/adventure';
import { isLineId, type LineId } from './lines';

/**
 * Which narrated lines come next (spec, "Narration"), so their recordings
 * can be fetched a little ahead, never in the game's own loading. Pure: no
 * Phaser, no audio.
 */

/** Chapter 1's places and people the lines name. */
const EUDORA = 'eudora-town';
const KORAX = 'korax-town';

/** The lines the Black Banner can still tell, in the order they'd come. */
function bannerLines(adv: Adventure): LineId[] {
  const eudora = adv.towns.find((t) => t.id === EUDORA);
  const korax = adv.towns.find((t) => t.id === KORAX);
  const foe = adv.rival?.hero;
  return [
    ...(eudora?.ally && eudora.owner === 'neutral' ? ['eudora-joins', 'eudora-lost'] as const : []),
    ...(foe && korax?.owner === 'rival' ? ['kassander-flees', 'korax-taken'] as const : []),
    ...(foe ? ['kassander-beaten'] as const : []),
    'chapter-won' as const,
  ];
}

/** What each part can tell next, by the part in play. */
function storyLines(adv: Adventure): LineId[] {
  if (adv.mapId === 'ashford') return ['part-thornwood'];
  if (adv.mapId === 'thornwood') return ['part-blackBanner'];
  if (adv.mapId === 'blackBanner') return bannerLines(adv);
  if (adv.mapId === 'nekhen') return ['part-abu'];
  if (adv.mapId === 'abu') return ['abu-won', 'part-redLand'];
  if (adv.mapId === 'red-land') return ['twoLands-won'];
  return [];
}

/** The next `n` lines: those on the cards waiting now first, then what the story tells next. */
export function upcoming(adv: Adventure, n: number): LineId[] {
  const waiting = adv.prompts.flatMap((p) => (p.kind === 'message' && isLineId(p.line) ? [p.line] : []));
  return [...new Set([...waiting, ...storyLines(adv)])].slice(0, n);
}
