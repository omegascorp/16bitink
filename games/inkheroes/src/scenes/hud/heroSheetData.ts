import { armyMorale } from '../../logic/army';
import { CLASSES, dailyMp, maxMana, sightOf, xpForLevel, type Hero } from '../../logic/hero';
import { tilesOf } from '../../logic/map';
import { gearBonus, hasSpellbook, withGear } from '../../logic/items';
import { RANK_NAMES, skillValue, SKILLS, type SkillId } from '../../logic/skills';
import { SPELLS, type SpellId } from '../../logic/spells';
import type { StatName } from '../../art/pixel/ui';

/** A line of the sheet: its icon, label and value. */
export interface SheetRow {
  readonly icon: StatName;
  readonly label: string;
  readonly value: string;
}

/** What the hero sheet shows, in words (no Phaser here, so it can be tested). */
export interface HeroSheet {
  readonly name: string;
  readonly title: string;
  /** Experience: the words, and how far through this level (0 to 1). */
  readonly xp: { readonly value: string; readonly part: number };
  /** The four stats, each saying what it does. */
  readonly stats: readonly (SheetRow & { readonly says: string })[];
  readonly lines: readonly SheetRow[];
  readonly skills: readonly { readonly name: string; readonly says: string }[];
  readonly spells: readonly { readonly id: SpellId; readonly name: string }[];
  /** Whether the hero has a spellbook: without one the sheet says nothing of spells. */
  readonly magic: boolean;
  /** Said in place of the spells when there are none to show. */
  readonly spellsNote: string | null;
}

/** Morale and luck as the game says them: +2, 0, -1. */
const signed = (n: number): string => (n > 0 ? `+${n}` : String(n));

/** A stat with what the gear adds: 5 (+2). */
const withWorn = (total: number, worn = 0): string => (worn ? `${total} (+${worn})` : String(total));

/** The sheet for `h`. */
export function heroSheet(h: Hero): HeroSheet {
  const from = xpForLevel(h.level);
  const to = xpForLevel(h.level + 1);
  const geared = withGear(h);
  const worn = gearBonus(h);
  const magic = hasSpellbook(h);
  const spells = magic ? h.spells.map((id) => ({ id, name: SPELLS[id].name })) : [];
  return {
    name: h.name,
    title: `${CLASSES[h.heroClass].name} · level ${h.level}`,
    xp: { value: `${h.xp} / ${to}`, part: Math.min(1, Math.max(0, (h.xp - from) / (to - from))) },
    stats: [
      { icon: 'attack', label: 'Attack', value: withWorn(geared.attack, worn.attack), says: 'Adds to the Attack of all your units' },
      { icon: 'defense', label: 'Defense', value: withWorn(geared.defense, worn.defense), says: 'Adds to the Defense of all your units' },
      ...(magic ? [
        { icon: 'power', label: 'Spell Power', value: withWorn(geared.power, worn.power), says: 'Makes your spells stronger' },
        { icon: 'knowledge', label: 'Knowledge', value: withWorn(geared.knowledge, worn.knowledge), says: 'Each point gives 10 mana' },
      ] as const : []),
    ],
    lines: [
      { icon: 'speed', label: 'Movement', value: `${tilesOf(h.mp)} / ${tilesOf(dailyMp(h))} tiles` },
      ...(magic ? [{ icon: 'mana', label: 'Mana', value: `${h.mana} / ${maxMana(h)}` } as const] : []),
      { icon: 'morale', label: 'Morale', value: signed(skillValue(h.skills, 'leadership') + armyMorale(h.army) + (worn.morale ?? 0)) },
      { icon: 'luck', label: 'Luck', value: signed(skillValue(h.skills, 'luck') + (worn.luck ?? 0)) },
      { icon: 'sight', label: 'Sight', value: `${sightOf(h)} tiles` },
    ],
    skills: (Object.entries(h.skills) as [SkillId, 1 | 2 | 3][]).filter(([, rank]) => rank > 0).map(([id, rank]) => ({
      name: `${RANK_NAMES[rank]} ${SKILLS[id].name}`,
      says: SKILLS[id].says(SKILLS[id].values[rank - 1]!),
    })),
    spells,
    magic,
    spellsNote: spells.length ? null : 'No spells learned yet',
  };
}
