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
/** Chapter 3's town that opens its gates in part 2. */
const UPPSALA = 'uppsala-town';

/** The lines the Black Banner can still tell, in the order they'd come. */
function bannerLines(adv: Adventure): LineId[] {
  const eudora = adv.towns.find((t) => t.id === EUDORA);
  const korax = adv.towns.find((t) => t.id === KORAX);
  const foe = adv.rival?.hero;
  return [
    ...(eudora?.ally && eudora.owner === 'neutral' ? ['eudora-joins', 'eudora-lost'] as const : []),
    ...(foe && korax?.owner === 'rival' ? ['kassander-flees', 'korax-taken'] as const : []),
    ...(foe ? ['kassander-beaten'] as const : []),
    'blackBanner-won' as const,
    'part-othrys' as const,
  ];
}

/** The lines Uppsala can still tell: its gates opening (Heid's news), Aun first seen, the part's win. */
function uppsalaLines(adv: Adventure): LineId[] {
  const town = adv.towns.find((t) => t.id === UPPSALA);
  const aun = adv.objects.find((o) => o.id === 'aun');
  return [
    ...(town?.ally && town.owner === 'neutral' ? ['uppsala-joins'] as const : []),
    ...(aun && !aun.gone ? ['aun'] as const : []),
    'uppsala-won' as const,
  ];
}

/** Chapter 3's part 3: Eirik's ring fort and the market town both race for. */
const KAUPANG = 'kaupang-town';
const AVALDSNES = 'avaldsnes-town';

/** The lines the Bloodaxe can still tell: Eirik first seen, Kaupang lost to him, his flight, the part's win. */
function bloodaxeLines(adv: Adventure): LineId[] {
  const kaupang = adv.towns.find((t) => t.id === KAUPANG);
  const avaldsnes = adv.towns.find((t) => t.id === AVALDSNES);
  const riding = !!adv.rival?.hero;
  return [
    ...(riding && !adv.rival?.seen ? ['eirik'] as const : []),
    ...(kaupang?.owner === 'neutral' ? ['kaupang-lost'] as const : []),
    ...(riding && avaldsnes?.owner === 'rival' ? ['eirik-flees'] as const : []),
    'bloodaxe-won' as const,
  ];
}

/** The lines Halogaland can still tell: Gunnhild first seen, Eirik's return, Skoll, Tyrfing, the chapter's ending. */
function halogalandLines(adv: Adventure): LineId[] {
  const riding = [...(adv.rival?.hero ? [adv.rival.hero] : []), ...(adv.rival?.others ?? [])];
  const left = (id: string): boolean => adv.objects.some((o) => o.id === id && !o.gone && !o.looted);
  return [
    ...(riding.some((h) => h.id === 'gunnhild') && !adv.rival?.seen ? ['gunnhild'] as const : []),
    ...(riding.some((h) => h.id === 'eirik') && !adv.rival?.captainSeen ? ['eirik-returns'] as const : []),
    ...(left('skoll') ? ['skoll'] as const : []),
    ...(left('angantyr-barrow') ? ['tyrfing'] as const : []),
    'longWinter-won' as const,
  ];
}

/** What each part can tell next, by the part in play. */
function storyLines(adv: Adventure): LineId[] {
  if (adv.mapId === 'ashford') return ['part-thornwood'];
  if (adv.mapId === 'thornwood') return ['part-blackBanner'];
  if (adv.mapId === 'blackBanner') return bannerLines(adv);
  if (adv.mapId === 'othrys') return ['othrys-won', 'chapter-won'];
  if (adv.mapId === 'nekhen') return ['part-abu'];
  if (adv.mapId === 'abu') return ['abu-won', 'part-redLand'];
  if (adv.mapId === 'red-land') return ['redLand-won', 'part-delta'];
  if (adv.mapId === 'delta') return ['twoLands-won'];
  // Hladir: the giant first seen on the ice, then the part's win and Uppsala's story.
  if (adv.mapId === 'hladir') return ['hrimgrimnir', 'hladir-won', 'part-uppsala'];
  if (adv.mapId === 'uppsala') return uppsalaLines(adv);
  if (adv.mapId === 'bloodaxe') return [...bloodaxeLines(adv), 'part-halogaland'];
  if (adv.mapId === 'halogaland') return halogalandLines(adv);
  return [];
}

/** The next `n` lines: those on the cards waiting now first, then what the story tells next. */
export function upcoming(adv: Adventure, n: number): LineId[] {
  const waiting = adv.prompts.flatMap((p) => (p.kind === 'message' && isLineId(p.line) ? [p.line] : []));
  return [...new Set([...waiting, ...storyLines(adv)])].slice(0, n);
}
