import { rosterHero } from '../../logic/roster';

/** Heroes whose art is keyed by the side they first rode for. */
const SIDE_ART: Readonly<Record<string, string>> = { rowan: 'player', kassander: 'rival' };

/** Which of the drawn heroes (`drawn`, HERO_ART's keys) stands for `who`, or for player hero `heroId`. */
export function heroArtId(drawn: readonly string[], who: 'player' | 'rival', heroId?: string): string {
  const has = (k: string): boolean => drawn.includes(k);
  if (heroId && heroId !== 'rival' && heroId !== 'player' && has(heroId)) return heroId;
  // The first two drawn are keyed by side: Rowan is 'player', Kassander 'rival', whichever side they ride for.
  const bySide = heroId ? SIDE_ART[heroId] : undefined;
  if (bySide && has(bySide)) return bySide;
  // Not drawn yet (ART paints the roster's): a Cleric looks like Ianthe, a Knight like the side's first (Rowan, or Kassander for the rival).
  const rostered = heroId ? rosterHero(heroId) : undefined;
  // An Egyptian one looks like Egypt's: a Cleric Neferet, a Knight Paser (else Sethi), before the Greeks' stand-ins.
  const egypt = rostered?.faction === 'kemet' ? (rostered.heroClass === 'cleric' ? ['neferet'] : ['paser', 'sethi']).find(has) : undefined;
  if (egypt) return egypt;
  if (rostered?.heroClass === 'cleric' && has('ianthe')) return 'ianthe';
  if (has(who)) return who;
  return has('player') ? 'player' : drawn[0]!;
}
