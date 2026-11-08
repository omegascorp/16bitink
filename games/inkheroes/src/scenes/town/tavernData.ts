import type { HeroDef, MapDef } from '../../level/types';
import { type Adventure } from '../../logic/adventure';
import { CLASSES } from '../../logic/hero';
import { cantHireHero, HERO_COST, recruitsLeft } from '../../logic/heroes';
import { RANK_NAMES, SKILLS } from '../../logic/skills';
import { SPELLS } from '../../logic/spells';
import type { Town } from '../../logic/town';

/** The hero waiting at a Tavern, as things stand. */
export interface TavernOffer {
  /** The hero for hire; null when every one already rides with the player. */
  readonly hero: HeroDef | null;
  /** "Cleric", and what they know: "Basic Wisdom · Bless, Healing". */
  readonly title: string;
  readonly knows: string;
  readonly price: string;
  /** What hiring means, or why they can't be hired. */
  readonly note: string;
  /** The Hire button, lit when the purse reaches; null when hiring here can't be done at all. */
  readonly hire: { readonly enabled: boolean } | null;
}

/** What `town`'s Tavern offers on map `def`. */
export function tavernOffer(adv: Adventure, def: MapDef, town: Town): TavernOffer {
  const price = `${HERO_COST.gold} gold`;
  const hero = recruitsLeft(adv, def)[0] ?? null;
  const why = cantHireHero(adv, def, town);
  if (!hero) return { hero: null, title: '', knows: '', price, note: why ?? '', hire: null };
  const skills = Object.entries(hero.skills).map(([id, rank]) => `${RANK_NAMES[rank ?? 0]} ${SKILLS[id as keyof typeof SKILLS].name}`);
  const spells = hero.gear?.book ? hero.spells.map((s) => SPELLS[s].name) : [];
  const knows = [skills.join(', '), spells.join(', ')].filter(Boolean).join(' · ');
  const base = { hero, title: CLASSES[hero.heroClass].name, knows, price };
  if (!why) return { ...base, note: `Joins you in ${town.name}'s gate, ready to ride today.`, hire: { enabled: true } };
  return { ...base, note: why, hire: why === `A hero costs ${HERO_COST.gold} gold.` ? { enabled: false } : null };
}

/** The Tavern room's parts, UI pixels. */
export const TAVERN = { maxW: 440, pad: 8, gap: 6, head: 30, figure: 150, line: 15, foot: 50 } as const;
/** The words beside the figure (or under the face): name and class, the blurb (two lines), stats, what they know (two lines), the army. */
const DETAIL_H = TAVERN.line * 2 + TAVERN.line * 2 + TAVERN.gap + 16 + TAVERN.gap + TAVERN.line * 2 + TAVERN.gap + 36;

/** The Tavern room for `room` (what the town leaves it): wide, the hero's figure beside the words; else their face over them. */
export function tavernLayout(room: { w: number; h: number }): { w: number; h: number; side: boolean } {
  const w = Math.min(TAVERN.maxW, room.w);
  const side = w >= TAVERN.maxW;
  const body = side ? Math.max(TAVERN.figure, DETAIL_H) : DETAIL_H;
  return { w, h: TAVERN.head + body + TAVERN.gap + TAVERN.foot + TAVERN.pad, side };
}
