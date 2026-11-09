import { IANTHE } from '../../level/recruits';
import type { HeroDef } from '../../level/types';
import { SPECIALTY_GOLD } from '../specialty';

/**
 * The Olympian League's heroes (docs/inkheroes-design.md, "The Greek
 * heroes"): the table's ten, six Knights and four Clerics, each with a specialty, as
 * each H3 town has its own. Data only, never tied to a campaign map: a map
 * names its story heroes itself (with the campaign's numbers), and the
 * Taverns of a map without its own recruits hire from here. x and y are
 * where they stand when hired. Rowan's and Ianthe's numbers are their
 * first part's; Nyktimos's those Lykaon's Taverns hired; Auge
 * takes the place (and the numbers) of his old second captain, Mainalos.
 */

/** Rowan as the Border March opens (src/level/chapter1.ts places him). */
export const ROWAN: HeroDef = {
  id: 'rowan', name: 'Rowan', heroClass: 'knight', x: 0, y: 0,
  attack: 2, defense: 2, power: 1, knowledge: 1, skills: { leadership: 1 }, spells: [],
  army: [{ creature: 'spearman', count: 18 }, { creature: 'bowman', count: 7 }],
  specialty: { kind: 'line', line: 'spearman' },
  blurb: "The League's captain, first into the shield wall.",
};

export const GREEK_ROSTER: readonly HeroDef[] = [
  ROWAN,
  {
    id: 'kassander', name: 'Kassander', heroClass: 'knight', x: 0, y: 0,
    attack: 2, defense: 2, power: 1, knowledge: 1, skills: { offense: 1 }, spells: [],
    army: [{ creature: 'spearman', count: 9 }, { creature: 'bowman', count: 3 }, { creature: 'swordsman', count: 1 }],
    specialty: { kind: 'line', line: 'swordsman' },
    blurb: 'Lord of the Black Banner, who keeps a pen of minotaurs.',
  },
  {
    id: 'lykaon', name: 'Lykaon', heroClass: 'knight', x: 0, y: 0,
    attack: 2, defense: 2, power: 1, knowledge: 1, skills: { offense: 1, leadership: 1 }, spells: [],
    army: [{ creature: 'spearman', count: 10 }, { creature: 'bowman', count: 4 }],
    specialty: { kind: 'line', line: 'lancer' },
    blurb: 'The wolf-king of Arcadia, who rides with the Companions.',
  },
  {
    id: 'nyktimos', name: 'Nyktimos', heroClass: 'knight', x: 0, y: 0,
    attack: 2, defense: 1, power: 1, knowledge: 1, skills: { offense: 1 }, spells: [],
    army: [{ creature: 'spearman', count: 10 }, { creature: 'bowman', count: 4 }],
    specialty: { kind: 'line', line: 'griffin' },
    blurb: "Lykaon's eldest son, who flies the mountain griffins.",
  },
  {
    id: 'atalanta', name: 'Atalanta', heroClass: 'knight', x: 0, y: 0,
    attack: 2, defense: 1, power: 1, knowledge: 1, skills: { archery: 1 }, spells: [],
    army: [{ creature: 'spearman', count: 6 }, { creature: 'bowman', count: 7 }],
    specialty: { kind: 'line', line: 'bowman' },
    blurb: 'The huntress of Arcadia, who outran every suitor.',
  },
  {
    id: 'peleus', name: 'Peleus', heroClass: 'knight', x: 0, y: 0,
    attack: 1, defense: 2, power: 1, knowledge: 1, skills: { leadership: 1, logistics: 1 }, spells: [],
    army: [{ creature: 'spearman', count: 12 }, { creature: 'bowman', count: 4 }],
    specialty: { kind: 'gold', gold: SPECIALTY_GOLD },
    blurb: 'King of Phthia, father of Achilles, rich in herds.',
  },
  { ...IANTHE, specialty: { kind: 'spell', spell: 'cure' } },
  {
    id: 'auge', name: 'Auge', heroClass: 'cleric', x: 0, y: 0,
    attack: 1, defense: 1, power: 2, knowledge: 2, skills: { wisdom: 1 }, spells: ['slow'], gear: { book: 'noviceSpellbook' },
    army: [{ creature: 'spearman', count: 8 }, { creature: 'bowman', count: 5 }],
    specialty: { kind: 'spell', spell: 'slow' },
    blurb: 'Priestess of Athena Alea at Tegea, who makes the swift go heavy.',
  },
  {
    id: 'kallisto', name: 'Kallisto', heroClass: 'cleric', x: 0, y: 0,
    attack: 1, defense: 1, power: 2, knowledge: 2, skills: { wisdom: 1 }, spells: ['lightningBolt'], gear: { book: 'noviceSpellbook' },
    army: [{ creature: 'spearman', count: 8 }, { creature: 'bowman', count: 5 }],
    specialty: { kind: 'spell', spell: 'lightningBolt' },
    blurb: "Lykaon's daughter, a huntress of Artemis who calls down Zeus's bolt.",
  },
  {
    id: 'melampus', name: 'Melampus', heroClass: 'cleric', x: 0, y: 0,
    attack: 1, defense: 1, power: 2, knowledge: 2, skills: { wisdom: 1, mysticism: 1 }, spells: ['bless'], gear: { book: 'noviceSpellbook' },
    army: [{ creature: 'spearman', count: 8 }, { creature: 'bowman', count: 3 }, { creature: 'monk', count: 1 }],
    specialty: { kind: 'line', line: 'monk' },
    blurb: 'The seer who understood the speech of animals, and of centaurs.',
  },
];

/** Ids a roster hero had before (a save with one in play loads them as the hero now). */
export const RENAMED: Readonly<Record<string, string>> = { mainalos: 'auge' };
