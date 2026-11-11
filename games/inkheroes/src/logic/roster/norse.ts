import type { HeroDef } from '../../level/types';
import { SPECIALTY_GOLD } from '../specialty';

/**
 * The Norse heroes (docs/inkheroes-design.md, chapter 3, "Heroes"): ten,
 * five Knights and five Clerics, each with a specialty, as the Greeks'
 * (greek.ts) and Egypt's (kemet.ts). Data only: a map names its story heroes
 * itself, and the Taverns of a map without its own recruits hire from here.
 * Hervor's and Eirik's numbers are first guesses for their parts (the map
 * that places them may change them); the rest start where a Tavern's hire
 * does. Hervor has no rune staff until part 2, as the chapter opens with a
 * fighter. Eirik and Gunnhild are the chapter's villains: never offered at
 * our Taverns (the chapter's `villains`, src/level/maps.ts).
 */

/** Hervor, the shieldmaiden of Hlaðir: chapter 3's first hero. */
export const HERVOR: HeroDef = {
  id: 'hervor', name: 'Hervor', heroClass: 'knight', x: 0, y: 0, faction: 'norse',
  attack: 2, defense: 2, power: 1, knowledge: 1, skills: { offense: 1 }, spells: [],
  army: [{ creature: 'shieldmaiden', count: 18 }, { creature: 'hunter', count: 7 }],
  specialty: { kind: 'line', line: 'berserker' },
  blurb: 'The shieldmaiden of Hlaðir, whose father and his eleven brothers were berserkers.',
};

/** Heid, the völva: the chapter's second hero, hired at Uppsala from part 2. */
export const HEID: HeroDef = {
  id: 'heid', name: 'Heid', heroClass: 'cleric', x: 0, y: 0, faction: 'norse',
  attack: 1, defense: 1, power: 2, knowledge: 2, skills: { wisdom: 1 }, spells: ['thurisaz'], gear: { book: 'noviceRuneStaff' },
  army: [{ creature: 'shieldmaiden', count: 15 }, { creature: 'hunter', count: 8 }],
  specialty: { kind: 'spell', spell: 'thurisaz' },
  blurb: 'The völva of the Völuspá, who reads the winter and calls down Thor’s lightning.',
};

/** Eirik Bloodaxe: part 3's rival, from Avaldsnes. */
export const EIRIK: HeroDef = {
  id: 'eirik', name: 'Eirik Bloodaxe', heroClass: 'knight', x: 0, y: 0, faction: 'norse',
  attack: 3, defense: 2, power: 1, knowledge: 1, skills: { offense: 1 }, spells: [],
  army: [{ creature: 'shieldmaiden', count: 12 }, { creature: 'hunter', count: 4 }, { creature: 'berserker', count: 2 }],
  specialty: { kind: 'line', line: 'shieldmaiden' },
  blurb: 'The king who killed his brothers for the crown.',
};

/** Gunnhild, Mother of Kings: part 4's lord, the first Cleric lord. */
export const GUNNHILD: HeroDef = {
  id: 'gunnhild', name: 'Gunnhild', heroClass: 'cleric', x: 0, y: 0, faction: 'norse',
  attack: 1, defense: 1, power: 2, knowledge: 2, skills: { wisdom: 1, mysticism: 1 }, spells: ['isa'], gear: { book: 'noviceRuneStaff' },
  army: [{ creature: 'shieldmaiden', count: 10 }, { creature: 'hunter', count: 5 }],
  specialty: { kind: 'spell', spell: 'isa' },
  blurb: '“Mother of Kings”, who learned seiðr in the far north and sang the winter.',
};

/** The chapter's villains: never offered at the player's Taverns. */
export const NORSE_VILLAINS: readonly string[] = [EIRIK.id, GUNNHILD.id];

export const NORSE_ROSTER: readonly HeroDef[] = [
  HERVOR,
  EIRIK,
  {
    id: 'einar', name: 'Einar Thambarskelfir', heroClass: 'knight', x: 0, y: 0, faction: 'norse',
    attack: 2, defense: 1, power: 1, knowledge: 1, skills: { archery: 1 }, spells: [],
    army: [{ creature: 'shieldmaiden', count: 6 }, { creature: 'hunter', count: 7 }],
    specialty: { kind: 'line', line: 'hunter' },
    blurb: 'The archer of Svolder, who drew the strongest bow in Norway.',
  },
  {
    id: 'sigurd', name: 'Sigurd', heroClass: 'knight', x: 0, y: 0, faction: 'norse',
    attack: 2, defense: 2, power: 1, knowledge: 1, skills: { leadership: 1 }, spells: [],
    army: [{ creature: 'shieldmaiden', count: 12 }, { creature: 'hunter', count: 4 }],
    specialty: { kind: 'line', line: 'dwarf' },
    blurb: 'The dragon-slayer, raised by the dwarf smith Regin.',
  },
  {
    id: 'harald', name: 'Harald Hardrada', heroClass: 'knight', x: 0, y: 0, faction: 'norse',
    attack: 2, defense: 2, power: 1, knowledge: 1, skills: { leadership: 1, logistics: 1 }, spells: [],
    army: [{ creature: 'shieldmaiden', count: 10 }, { creature: 'hunter', count: 4 }],
    specialty: { kind: 'gold', gold: SPECIALTY_GOLD },
    blurb: 'The king who came home from Byzantium rich in gold.',
  },
  HEID,
  GUNNHILD,
  {
    id: 'thorbjorg', name: 'Thorbjorg', heroClass: 'cleric', x: 0, y: 0, faction: 'norse',
    attack: 1, defense: 1, power: 2, knowledge: 2, skills: { wisdom: 1 }, spells: ['tiwaz'], gear: { book: 'noviceRuneStaff' },
    army: [{ creature: 'shieldmaiden', count: 8 }, { creature: 'hunter', count: 5 }],
    specialty: { kind: 'spell', spell: 'tiwaz' },
    blurb: 'The “little völva” of the Greenland saga.',
  },
  {
    id: 'brynhild', name: 'Brynhild', heroClass: 'cleric', x: 0, y: 0, faction: 'norse',
    attack: 1, defense: 1, power: 2, knowledge: 2, skills: { wisdom: 1 }, spells: ['tiwaz'], gear: { book: 'noviceRuneStaff' },
    army: [{ creature: 'shieldmaiden', count: 8 }, { creature: 'hunter', count: 5 }],
    specialty: { kind: 'line', line: 'valkyrie' },
    blurb: 'The valkyrie who defied Odin.',
  },
  {
    id: 'egil', name: 'Egil Skallagrimsson', heroClass: 'cleric', x: 0, y: 0, faction: 'norse',
    attack: 1, defense: 1, power: 2, knowledge: 2, skills: { wisdom: 1, mysticism: 1 }, spells: ['isa'], gear: { book: 'noviceRuneStaff' },
    army: [{ creature: 'shieldmaiden', count: 8 }, { creature: 'hunter', count: 5 }],
    specialty: { kind: 'line', line: 'warBoar' },
    blurb: 'Skald and rune-master, of half-troll stock, who raised a cursing pole against Eirik and Gunnhild.',
  },
];
