import type { ItemDef, SetDef } from '../items';

/** Egypt (chapter 2): the green, blue and purple sets and the pieces never in a set, found as random drops. Numbers in docs/inkheroes-design.md (Loot). */
export const KEMET_ITEMS = {
  // Medjay set (green fighter)
  medjayHelm: { name: 'Medjay Helm', slot: 'helm', quality: 'green', set: 'medjay', faction: 'kemet', gives: { defense: 1, sight: 1 } },
  medjayCorselet: { name: 'Medjay Corselet', slot: 'cuirass', quality: 'green', set: 'medjay', faction: 'kemet', gives: { defense: 1, gold: 50 } },
  archersBracers: { name: 'Archer’s Bracers', slot: 'bracers', quality: 'green', set: 'medjay', faction: 'kemet', gives: { attack: 1, sight: 1 } },
  medjayGirdle: { name: 'Medjay Girdle', slot: 'belt', quality: 'green', set: 'medjay', faction: 'kemet', gives: { morale: 1, gold: 50 } },
  medjayGreaves: { name: 'Medjay Greaves', slot: 'greaves', quality: 'green', set: 'medjay', faction: 'kemet', gives: { defense: 1, sight: 1 } },
  desertBoots: { name: 'Desert Boots', slot: 'boots', quality: 'green', set: 'medjay', faction: 'kemet', gives: { attack: 1, travel: 1 } },
  // Lapis set (green mystic)
  lapisDiadem: { name: 'Lapis Diadem', slot: 'helm', quality: 'green', set: 'lapis', faction: 'kemet', gives: { power: 1, sight: 1 } },
  lapisCollar: { name: 'Lapis Collar', slot: 'cuirass', quality: 'green', set: 'lapis', faction: 'kemet', gives: { knowledge: 1, gold: 50 } },
  lapisBangles: { name: 'Lapis Bangles', slot: 'bracers', quality: 'green', set: 'lapis', faction: 'kemet', gives: { knowledge: 1, sight: 1 } },
  lapisGirdle: { name: 'Lapis Girdle', slot: 'belt', quality: 'green', set: 'lapis', faction: 'kemet', gives: { luck: 1, gold: 50 } },
  lapisAnklets: { name: 'Lapis Anklets', slot: 'greaves', quality: 'green', set: 'lapis', faction: 'kemet', gives: { power: 1, sight: 1 } },
  papyrusSandals: { name: 'Papyrus Sandals', slot: 'boots', quality: 'green', set: 'lapis', faction: 'kemet', gives: { power: 1, travel: 1 } },
  // Sekhmet set (blue fighter)
  lionessHelm: { name: 'Lioness Helm', slot: 'helm', quality: 'blue', set: 'sekhmet', faction: 'kemet', gives: { defense: 2 } },
  lionessCuirass: { name: 'Lioness Cuirass', slot: 'cuirass', quality: 'blue', set: 'sekhmet', faction: 'kemet', gives: { defense: 2 } },
  lionessBracers: { name: 'Lioness Bracers', slot: 'bracers', quality: 'blue', set: 'sekhmet', faction: 'kemet', gives: { attack: 2 } },
  sekhmetBelt: { name: 'Sekhmet Belt', slot: 'belt', quality: 'blue', set: 'sekhmet', faction: 'kemet', gives: { morale: 1, defense: 1 } },
  lionessGreaves: { name: 'Lioness Greaves', slot: 'greaves', quality: 'blue', set: 'sekhmet', faction: 'kemet', gives: { attack: 1, defense: 1 } },
  lionessSandals: { name: 'Lioness Sandals', slot: 'boots', quality: 'blue', set: 'sekhmet', faction: 'kemet', gives: { attack: 1, travel: 1 } },
  // Thoth set (blue mystic)
  ibisCrown: { name: 'Ibis Crown', slot: 'helm', quality: 'blue', set: 'thoth', faction: 'kemet', gives: { power: 2 } },
  scribesCollar: { name: 'Scribe’s Collar', slot: 'cuirass', quality: 'blue', set: 'thoth', faction: 'kemet', gives: { knowledge: 2 } },
  thothsBangles: { name: 'Thoth’s Bangles', slot: 'bracers', quality: 'blue', set: 'thoth', faction: 'kemet', gives: { knowledge: 1, power: 1 } },
  scribesGirdle: { name: 'Scribe’s Girdle', slot: 'belt', quality: 'blue', set: 'thoth', faction: 'kemet', gives: { luck: 1, power: 1 } },
  thothsAnklets: { name: 'Thoth’s Anklets', slot: 'greaves', quality: 'blue', set: 'thoth', faction: 'kemet', gives: { knowledge: 1, power: 1 } },
  ibisSandals: { name: 'Ibis Sandals', slot: 'boots', quality: 'blue', set: 'thoth', faction: 'kemet', gives: { knowledge: 1, travel: 1 } },
  // Horus set (purple fighter)
  horusFalconHelm: { name: 'Horus Falcon Helm', slot: 'helm', quality: 'purple', set: 'horus', faction: 'kemet', gives: { defense: 2, morale: 1 } },
  falconCuirass: { name: 'Gilded Falcon Cuirass', slot: 'cuirass', quality: 'purple', set: 'horus', faction: 'kemet', gives: { defense: 2, attack: 1 } },
  horusBracers: { name: 'Horus Bracers', slot: 'bracers', quality: 'purple', set: 'horus', faction: 'kemet', gives: { attack: 2, defense: 1 } },
  goldenFalconBelt: { name: 'Golden Falcon Belt', slot: 'belt', quality: 'purple', set: 'horus', faction: 'kemet', gives: { morale: 2, attack: 1 } },
  horusGreaves: { name: 'Horus Greaves', slot: 'greaves', quality: 'purple', set: 'horus', faction: 'kemet', gives: { defense: 2, attack: 1 } },
  wingedSunSandals: { name: 'Winged Sun Sandals', slot: 'boots', quality: 'purple', set: 'horus', faction: 'kemet', gives: { attack: 2, travel: 1 } },
  // Isis set (purple mystic)
  isisCrown: { name: 'Isis Crown', slot: 'helm', quality: 'purple', set: 'isis', faction: 'kemet', gives: { power: 2, luck: 1 } },
  wingedCollarOfIsis: { name: 'Winged Collar of Isis', slot: 'cuirass', quality: 'purple', set: 'isis', faction: 'kemet', gives: { knowledge: 2, power: 1 } },
  isisBangles: { name: 'Isis Bangles', slot: 'bracers', quality: 'purple', set: 'isis', faction: 'kemet', gives: { knowledge: 2, luck: 1 } },
  tyetGirdle: { name: 'Tyet Girdle', slot: 'belt', quality: 'purple', set: 'isis', faction: 'kemet', gives: { luck: 2, knowledge: 1 } },
  isisAnklets: { name: 'Isis Anklets', slot: 'greaves', quality: 'purple', set: 'isis', faction: 'kemet', gives: { power: 2, knowledge: 1 } },
  sandalsOfIsis: { name: 'Sandals of Isis', slot: 'boots', quality: 'purple', set: 'isis', faction: 'kemet', gives: { knowledge: 2, travel: 1 } },
  // non-set, gray
  bronzeKhopesh: { name: 'Bronze Khopesh', slot: 'weapon', quality: 'gray', faction: 'kemet', gives: { attack: 1 } },
  hideShield: { name: 'Hide Shield', slot: 'shield', quality: 'gray', faction: 'kemet', gives: { defense: 1 } },
  scarabAmulet: { name: 'Scarab Amulet', slot: 'amulet', quality: 'gray', faction: 'kemet', gives: { luck: 1 } },
  faienceRing: { name: 'Faience Ring', slot: 'ring1', quality: 'gray', faction: 'kemet', gives: { knowledge: 1 } },
  copperSignet: { name: 'Copper Signet', slot: 'ring1', quality: 'gray', faction: 'kemet', gives: { morale: 1 } },
  // non-set, green
  nubianKhopesh: { name: 'Nubian Khopesh', slot: 'weapon', quality: 'green', faction: 'kemet', gives: { attack: 1, sight: 1 } },
  oxHideShield: { name: 'Ox-Hide Shield', slot: 'shield', quality: 'green', faction: 'kemet', gives: { defense: 1, gold: 50 } },
  ankhAmulet: { name: 'Ankh Amulet', slot: 'amulet', quality: 'green', faction: 'kemet', gives: { power: 1, sight: 1 } },
  carnelianRing: { name: 'Carnelian Ring', slot: 'ring1', quality: 'green', faction: 'kemet', gives: { morale: 1, gold: 50 } },
  catSealRing: { name: 'Cat Seal Ring', slot: 'ring1', quality: 'green', faction: 'kemet', gives: { luck: 1, sight: 1 } },
  // non-set, blue
  electrumKhopesh: { name: 'Electrum Khopesh', slot: 'weapon', quality: 'blue', faction: 'kemet', gives: { attack: 2 } },
  kushiteShield: { name: 'Kushite Shield', slot: 'shield', quality: 'blue', faction: 'kemet', gives: { defense: 2 } },
  wedjatAmulet: { name: 'Wedjat Amulet', slot: 'amulet', quality: 'blue', faction: 'kemet', gives: { knowledge: 2 } },
  lapisSignet: { name: 'Lapis Signet', slot: 'ring1', quality: 'blue', faction: 'kemet', gives: { power: 2 } },
  ptahRing: { name: 'Ring of Ptah', slot: 'ring1', quality: 'blue', faction: 'kemet', gives: { defense: 1, morale: 1 } },
  // non-set, purple
  nubianGoldKhopesh: { name: 'Nubian Gold Khopesh', slot: 'weapon', quality: 'purple', faction: 'kemet', gives: { attack: 2, morale: 1 } },
  shieldOfAmun: { name: 'Shield of Amun', slot: 'shield', quality: 'purple', faction: 'kemet', gives: { defense: 2, attack: 1 } },
  heartScarab: { name: 'Heart Scarab', slot: 'amulet', quality: 'purple', faction: 'kemet', gives: { luck: 2, power: 1 } },
  cartoucheRing: { name: 'Royal Cartouche Ring', slot: 'ring1', quality: 'purple', faction: 'kemet', gives: { knowledge: 2, luck: 1 } },
  uraeusRing: { name: 'Uraeus Ring', slot: 'ring1', quality: 'purple', faction: 'kemet', gives: { power: 2, knowledge: 1 } },
} as const satisfies Record<string, ItemDef>;

export const KEMET_SETS: readonly SetDef[] = [
  { id: 'scale', name: 'Scale set', quality: 'gray', faction: 'kemet', role: 'fighter' },
  { id: 'faience', name: 'Faience set', quality: 'gray', faction: 'kemet', role: 'mystic' },
  { id: 'medjay', name: 'Medjay set', quality: 'green', faction: 'kemet', role: 'fighter', bonus: { 2: { morale: 1 }, 4: { attack: 1 }, 6: { attack: 1, defense: 1 } } },
  { id: 'lapis', name: 'Lapis set', quality: 'green', faction: 'kemet', role: 'mystic', bonus: { 2: { luck: 1 }, 4: { power: 1 }, 6: { power: 1, knowledge: 1 } } },
  { id: 'sekhmet', name: 'Sekhmet set', quality: 'blue', faction: 'kemet', role: 'fighter', bonus: { 2: { defense: 1 }, 4: { attack: 1, defense: 1 }, 6: { speed: 1 } } },
  { id: 'thoth', name: 'Thoth set', quality: 'blue', faction: 'kemet', role: 'mystic', bonus: { 2: { power: 1 }, 4: { power: 1, knowledge: 1 }, 6: { speed: 1 } } },
  { id: 'horus', name: 'Horus set', quality: 'purple', faction: 'kemet', role: 'fighter', bonus: { 2: { attack: 1, defense: 1 }, 4: { speed: 1 }, 6: { attack: 1, defense: 1, morale: 1 } } },
  { id: 'isis', name: 'Isis set', quality: 'purple', faction: 'kemet', role: 'mystic', bonus: { 2: { power: 1, knowledge: 1 }, 4: { speed: 1 }, 6: { power: 1, knowledge: 1, luck: 1 } } },
];
