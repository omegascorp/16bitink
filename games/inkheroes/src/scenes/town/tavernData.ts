import type { HeroDef, MapDef } from '../../level/types';
import { type Adventure } from '../../logic/adventure';
import { CLASSES } from '../../logic/hero';
import { cantHireHero, HERO_COST, recruitsLeft, tavernHeroes } from '../../logic/heroes';
import { specialtyOf } from '../../logic/roster';
import type { Specialty } from '../../logic/specialty';
import { specialtyLine } from '../hud/heroSheetData';
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

/** One of the roster's heroes a Tavern offers: who, their class, specialty, and whether Hire is lit. */
export interface TavernCard {
  readonly hero: HeroDef;
  readonly title: string;
  readonly specialty: { readonly spec: Specialty; readonly text: string } | null;
  readonly enabled: boolean;
}

/** A Tavern of a map without its own recruits: the roster's two, the price, and what hiring means or why it can't be done. */
export interface TavernChoice {
  readonly cards: readonly TavernCard[];
  readonly price: string;
  readonly note: string;
}

/** What `town`'s Tavern offers from the roster on map `def` (the map names no recruits of its own). */
export function tavernChoice(adv: Adventure, def: MapDef, town: Town): TavernChoice {
  const price = `${HERO_COST.gold} gold`;
  const why = cantHireHero(adv, def, town);
  const cards = tavernHeroes(adv, def, town).map((hero): TavernCard => {
    const spec = specialtyOf(hero);
    return { hero, title: CLASSES[hero.heroClass].name, specialty: spec ? { spec, text: specialtyLine(spec) } : null, enabled: !why };
  });
  // Can't hire now (the purse, the gate, the cap): the cards stand unlit, the note says why.
  return { cards, price, note: why ?? `Joins you in ${town.name}'s gate, ready to ride today.` };
}

/** The roster Tavern's parts: a card per hero (face, name, class, specialty, Hire). */
export const CHOICE = { cardW: 200, face: 44, line: 15, gap: 6, pad: 6, hire: 34 } as const;
const CARD_H = CHOICE.pad + CHOICE.face + CHOICE.gap + CHOICE.line * 3 + CHOICE.gap + CHOICE.hire + CHOICE.pad;

/** The roster Tavern for `room`: the two cards side by side when they fit, else one over the other; the note at the foot. */
export function choiceLayout(room: { w: number; h: number }): { w: number; h: number; side: boolean; card: { w: number; h: number } } {
  const w = Math.min(TAVERN.maxW, room.w);
  const side = w >= CHOICE.cardW * 2 + TAVERN.gap + TAVERN.pad * 2;
  const cardW = side ? Math.floor((w - TAVERN.pad * 2 - TAVERN.gap) / 2) : w - TAVERN.pad * 2;
  const body = side ? CARD_H : CARD_H * 2 + TAVERN.gap;
  return { w, h: TAVERN.head + body + TAVERN.gap + TAVERN.foot + TAVERN.pad, side, card: { w: cardW, h: CARD_H } };
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
