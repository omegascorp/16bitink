import { NEFERET, PASER } from '../../level/recruits';
import type { HeroDef } from '../../level/types';
import { SPECIALTY_GOLD } from '../specialty';

/**
 * Egypt's heroes (docs/inkheroes-design.md, "The Egyptian heroes"): the
 * table's ten, five Knights and five Clerics, each with a specialty, as the
 * Greeks' (greek.ts). Data only: a map names its story heroes itself, and
 * the Taverns of a map without its own recruits hire from here. Paser's and
 * Neferet's numbers are their first part's, Sethi's the Red Land's; the rest
 * start where a Tavern's hire does. Imhotep carries two Ankhs, for the Rite
 * he is best at.
 */

/** Sethi as the Red Land holds him (src/level/redLand.ts places him, with his ramp and a lord's army). */
export const SETHI: HeroDef = {
  id: 'sethi', name: 'Sethi', heroClass: 'knight', x: 0, y: 0, faction: 'kemet',
  attack: 3, defense: 3, power: 1, knowledge: 1, skills: { offense: 1 }, spells: [],
  army: [{ creature: 'levy', count: 10 }, { creature: 'nubian', count: 4 }, { creature: 'jackal', count: 2 }],
  specialty: { kind: 'line', line: 'jackal' },
  blurb: "Set's lord at Nubt, who rides with the jackal-headed guard.",
};

export const KEMET_ROSTER: readonly HeroDef[] = [
  { ...PASER, specialty: { kind: 'line', line: 'chariot' } },
  SETHI,
  {
    id: 'apepi', name: 'Apepi', heroClass: 'knight', x: 0, y: 0, faction: 'kemet',
    attack: 2, defense: 2, power: 1, knowledge: 1, skills: { offense: 1, leadership: 1 }, spells: [],
    army: [{ creature: 'levy', count: 10 }, { creature: 'nubian', count: 4 }],
    specialty: { kind: 'line', line: 'sphinx' },
    blurb: 'The Hyksos king at Avaris, who took the name of the serpent of chaos.',
  },
  {
    id: 'weni', name: 'Weni', heroClass: 'knight', x: 0, y: 0, faction: 'kemet',
    attack: 2, defense: 2, power: 1, knowledge: 1, skills: { leadership: 1 }, spells: [],
    army: [{ creature: 'levy', count: 16 }, { creature: 'nubian', count: 6 }],
    specialty: { kind: 'line', line: 'levy' },
    blurb: 'The old general who raised the levies of every nome.',
  },
  {
    id: 'ahmose', name: 'Ahmose', heroClass: 'knight', x: 0, y: 0, faction: 'kemet',
    attack: 2, defense: 1, power: 1, knowledge: 1, skills: { archery: 1 }, spells: [],
    army: [{ creature: 'levy', count: 6 }, { creature: 'nubian', count: 7 }],
    specialty: { kind: 'line', line: 'nubian' },
    blurb: 'The marine, son of Ebana, who fought at the walls of Avaris.',
  },
  { ...NEFERET, specialty: { kind: 'spell', spell: 'ward' } },
  {
    id: 'imhotep', name: 'Imhotep', heroClass: 'cleric', x: 0, y: 0, faction: 'kemet',
    attack: 1, defense: 1, power: 2, knowledge: 2, skills: { wisdom: 1, mysticism: 1 }, spells: ['rebirth'], gear: { book: 'novicePapyrus' }, ankhs: 2,
    army: [{ creature: 'levy', count: 8 }, { creature: 'nubian', count: 5 }],
    specialty: { kind: 'spell', spell: 'rebirth' },
    blurb: 'The builder of the first pyramid, a healer who knew the Rite of Osiris.',
  },
  {
    id: 'tiye', name: 'Tiye', heroClass: 'cleric', x: 0, y: 0, faction: 'kemet',
    attack: 1, defense: 1, power: 2, knowledge: 2, skills: { wisdom: 1 }, spells: ['curse'], gear: { book: 'novicePapyrus' },
    army: [{ creature: 'levy', count: 8 }, { creature: 'nubian', count: 5 }],
    specialty: { kind: 'spell', spell: 'curse' },
    blurb: "The great royal wife, wise in the court's ways and Set's curses.",
  },
  {
    id: 'khaemwaset', name: 'Khaemwaset', heroClass: 'cleric', x: 0, y: 0, faction: 'kemet',
    attack: 1, defense: 1, power: 2, knowledge: 2, skills: { wisdom: 1 }, spells: ['ward'], gear: { book: 'novicePapyrus' },
    army: [{ creature: 'levy', count: 8 }, { creature: 'nubian', count: 3 }, { creature: 'mummy', count: 1 }],
    specialty: { kind: 'line', line: 'mummy' },
    blurb: 'The prince-priest who restored the old tombs, and keeps their dead.',
  },
  {
    id: 'nebet', name: 'Nebet', heroClass: 'cleric', x: 0, y: 0, faction: 'kemet',
    attack: 1, defense: 1, power: 2, knowledge: 2, skills: { wisdom: 1, logistics: 1 }, spells: ['ward'], gear: { book: 'novicePapyrus' },
    army: [{ creature: 'levy', count: 10 }, { creature: 'nubian', count: 4 }],
    specialty: { kind: 'gold', gold: SPECIALTY_GOLD },
    blurb: 'The first woman to be vizier, who knew where every grain was stored.',
  },
];
