import type { ItemDef, SetDef } from '../items';

/** the Greeks (chapter 1): the green, blue and purple sets and the pieces never in a set, found as random drops. Numbers in docs/inkheroes-design.md (Loot). */
export const CROWN_ITEMS = {
  // Corinthian set (green fighter)
  corinthianHelm: { name: 'Corinthian Helm', slot: 'helm', quality: 'green', set: 'corinthian', faction: 'crown', gives: { defense: 1, sight: 1 } },
  bellCuirass: { name: 'Bell Cuirass', slot: 'cuirass', quality: 'green', set: 'corinthian', faction: 'crown', gives: { defense: 1, gold: 50 } },
  isthmianBracers: { name: 'Isthmian Bracers', slot: 'bracers', quality: 'green', set: 'corinthian', faction: 'crown', gives: { attack: 1, sight: 1 } },
  hopliteBelt: { name: 'Hoplite Belt', slot: 'belt', quality: 'green', set: 'corinthian', faction: 'crown', gives: { morale: 1, gold: 50 } },
  corinthianGreaves: { name: 'Corinthian Greaves', slot: 'greaves', quality: 'green', set: 'corinthian', faction: 'crown', gives: { defense: 1, sight: 1 } },
  isthmianBoots: { name: 'Isthmian Boots', slot: 'boots', quality: 'green', set: 'corinthian', faction: 'crown', gives: { attack: 1, travel: 1 } },
  // Delphic set (green mystic)
  delphicLaurel: { name: 'Delphic Laurel', slot: 'helm', quality: 'green', set: 'delphic', faction: 'crown', gives: { power: 1, sight: 1 } },
  pythiaChiton: { name: 'Pythia’s Chiton', slot: 'cuirass', quality: 'green', set: 'delphic', faction: 'crown', gives: { knowledge: 1, gold: 50 } },
  tripodArmbands: { name: 'Tripod Armbands', slot: 'bracers', quality: 'green', set: 'delphic', faction: 'crown', gives: { knowledge: 1, sight: 1 } },
  laurelSash: { name: 'Laurel Sash', slot: 'belt', quality: 'green', set: 'delphic', faction: 'crown', gives: { luck: 1, gold: 50 } },
  delphicLeggings: { name: 'Delphic Leggings', slot: 'greaves', quality: 'green', set: 'delphic', faction: 'crown', gives: { power: 1, sight: 1 } },
  omphalosSandals: { name: 'Omphalos Sandals', slot: 'boots', quality: 'green', set: 'delphic', faction: 'crown', gives: { power: 1, travel: 1 } },
  // Spartan set (blue fighter)
  spartanHelm: { name: 'Spartan Helm', slot: 'helm', quality: 'blue', set: 'spartan', faction: 'crown', gives: { defense: 2 } },
  spartanCuirass: { name: 'Spartan Cuirass', slot: 'cuirass', quality: 'blue', set: 'spartan', faction: 'crown', gives: { defense: 2 } },
  spartanBracers: { name: 'Spartan Bracers', slot: 'bracers', quality: 'blue', set: 'spartan', faction: 'crown', gives: { attack: 2 } },
  agogeBelt: { name: 'Agoge Belt', slot: 'belt', quality: 'blue', set: 'spartan', faction: 'crown', gives: { morale: 1, defense: 1 } },
  spartanGreaves: { name: 'Spartan Greaves', slot: 'greaves', quality: 'blue', set: 'spartan', faction: 'crown', gives: { attack: 1, defense: 1 } },
  laconianBoots: { name: 'Laconian Boots', slot: 'boots', quality: 'blue', set: 'spartan', faction: 'crown', gives: { attack: 1, travel: 1 } },
  // Orphic set (blue mystic)
  orphicCirclet: { name: 'Orphic Circlet', slot: 'helm', quality: 'blue', set: 'orphic', faction: 'crown', gives: { power: 2 } },
  orphicRobe: { name: 'Orphic Robe', slot: 'cuirass', quality: 'blue', set: 'orphic', faction: 'crown', gives: { knowledge: 2 } },
  lyreArmbands: { name: 'Lyre Armbands', slot: 'bracers', quality: 'blue', set: 'orphic', faction: 'crown', gives: { knowledge: 1, power: 1 } },
  mysterySash: { name: 'Mystery Sash', slot: 'belt', quality: 'blue', set: 'orphic', faction: 'crown', gives: { luck: 1, power: 1 } },
  orphicLeggings: { name: 'Orphic Leggings', slot: 'greaves', quality: 'blue', set: 'orphic', faction: 'crown', gives: { knowledge: 1, power: 1 } },
  katabasisSandals: { name: 'Katabasis Sandals', slot: 'boots', quality: 'blue', set: 'orphic', faction: 'crown', gives: { knowledge: 1, travel: 1 } },
  // Myrmidon set (purple fighter)
  myrmidonHelm: { name: 'Myrmidon Helm', slot: 'helm', quality: 'purple', set: 'myrmidon', faction: 'crown', gives: { defense: 2, morale: 1 } },
  myrmidonCuirass: { name: 'Myrmidon Cuirass', slot: 'cuirass', quality: 'purple', set: 'myrmidon', faction: 'crown', gives: { defense: 2, attack: 1 } },
  myrmidonBracers: { name: 'Myrmidon Bracers', slot: 'bracers', quality: 'purple', set: 'myrmidon', faction: 'crown', gives: { attack: 2, defense: 1 } },
  girdleOfAres: { name: 'Girdle of Ares', slot: 'belt', quality: 'purple', set: 'myrmidon', faction: 'crown', gives: { morale: 2, attack: 1 } },
  myrmidonGreaves: { name: 'Myrmidon Greaves', slot: 'greaves', quality: 'purple', set: 'myrmidon', faction: 'crown', gives: { defense: 2, attack: 1 } },
  pelianBoots: { name: 'Pelian Boots', slot: 'boots', quality: 'purple', set: 'myrmidon', faction: 'crown', gives: { attack: 2, travel: 1 } },
  // Eleusinian set (purple mystic)
  eleusinianCrown: { name: 'Eleusinian Crown', slot: 'helm', quality: 'purple', set: 'eleusinian', faction: 'crown', gives: { power: 2, luck: 1 } },
  mysteriesRobe: { name: 'Mysteries Robe', slot: 'cuirass', quality: 'purple', set: 'eleusinian', faction: 'crown', gives: { knowledge: 2, power: 1 } },
  poppyArmlets: { name: 'Poppy Armlets', slot: 'bracers', quality: 'purple', set: 'eleusinian', faction: 'crown', gives: { knowledge: 2, luck: 1 } },
  sheafGirdle: { name: 'Sheaf Girdle', slot: 'belt', quality: 'purple', set: 'eleusinian', faction: 'crown', gives: { luck: 2, knowledge: 1 } },
  eleusinianLeggings: { name: 'Eleusinian Leggings', slot: 'greaves', quality: 'purple', set: 'eleusinian', faction: 'crown', gives: { power: 2, knowledge: 1 } },
  persephonesSandals: { name: 'Persephone’s Sandals', slot: 'boots', quality: 'purple', set: 'eleusinian', faction: 'crown', gives: { knowledge: 2, travel: 1 } },
  // non-set, gray
  bronzeXiphos: { name: 'Bronze Xiphos', slot: 'weapon', quality: 'gray', faction: 'crown', gives: { attack: 1 } },
  woodenAspis: { name: 'Wooden Aspis', slot: 'shield', quality: 'gray', faction: 'crown', gives: { defense: 1 } },
  evilEyeCharm: { name: 'Evil Eye Charm', slot: 'amulet', quality: 'gray', faction: 'crown', gives: { luck: 1 } },
  oliveWoodRing: { name: 'Olive Wood Ring', slot: 'ring1', quality: 'gray', faction: 'crown', gives: { knowledge: 1 } },
  bronzeSignet: { name: 'Bronze Signet', slot: 'ring1', quality: 'gray', faction: 'crown', gives: { defense: 1 } },
  // non-set, green
  hopliteDory: { name: 'Hoplite Dory', slot: 'weapon', quality: 'green', faction: 'crown', gives: { attack: 1, sight: 1 } },
  hoplonShield: { name: 'Hoplon Shield', slot: 'shield', quality: 'green', faction: 'crown', gives: { defense: 1, gold: 50 } },
  athenianOwlCharm: { name: 'Athenian Owl Charm', slot: 'amulet', quality: 'green', faction: 'crown', gives: { knowledge: 1, sight: 1 } },
  drachmaRing: { name: 'Drachma Ring', slot: 'ring1', quality: 'green', faction: 'crown', gives: { luck: 1, gold: 50 } },
  meanderRing: { name: 'Meander Ring', slot: 'ring1', quality: 'green', faction: 'crown', gives: { morale: 1, sight: 1 } },
  // non-set, blue
  kopisBlade: { name: 'Kopis Blade', slot: 'weapon', quality: 'blue', faction: 'crown', gives: { attack: 2 } },
  argiveShield: { name: 'Argive Shield', slot: 'shield', quality: 'blue', faction: 'crown', gives: { defense: 2 } },
  gorgoneionAmulet: { name: 'Gorgoneion Amulet', slot: 'amulet', quality: 'blue', faction: 'crown', gives: { defense: 1, morale: 1 } },
  pegasusSignet: { name: 'Pegasus Signet', slot: 'ring1', quality: 'blue', faction: 'crown', gives: { knowledge: 1, luck: 1 } },
  amethystRing: { name: 'Amethyst Ring', slot: 'ring1', quality: 'blue', faction: 'crown', gives: { power: 2 } },
  // non-set, purple
  argonautXiphos: { name: 'Argonaut Xiphos', slot: 'weapon', quality: 'purple', faction: 'crown', gives: { attack: 2, morale: 1 } },
  aegisOfAthena: { name: 'Aegis of Athena', slot: 'shield', quality: 'purple', faction: 'crown', gives: { defense: 2, morale: 1 } },
  heliodorPendant: { name: 'Heliodor Pendant', slot: 'amulet', quality: 'purple', faction: 'crown', gives: { luck: 2, knowledge: 1 } },
  polykratesRing: { name: 'Ring of Polykrates', slot: 'ring1', quality: 'purple', faction: 'crown', gives: { luck: 2, power: 1 } },
  gygesRing: { name: 'Ring of Gyges', slot: 'ring1', quality: 'purple', faction: 'crown', gives: { knowledge: 2, luck: 1 } },
} as const satisfies Record<string, ItemDef>;

export const CROWN_SETS: readonly SetDef[] = [
  { id: 'bronze', name: 'Bronze set', quality: 'gray', faction: 'crown', role: 'fighter' },
  { id: 'linen', name: 'Linen set', quality: 'gray', faction: 'crown', role: 'mystic' },
  { id: 'corinthian', name: 'Corinthian set', quality: 'green', faction: 'crown', role: 'fighter', bonus: { 2: { morale: 1 }, 4: { defense: 1 }, 6: { attack: 1, defense: 1 } } },
  { id: 'delphic', name: 'Delphic set', quality: 'green', faction: 'crown', role: 'mystic', bonus: { 2: { luck: 1 }, 4: { knowledge: 1 }, 6: { power: 1, knowledge: 1 } } },
  { id: 'spartan', name: 'Spartan set', quality: 'blue', faction: 'crown', role: 'fighter', bonus: { 2: { defense: 1 }, 4: { attack: 1, defense: 1 }, 6: { speed: 1 } } },
  { id: 'orphic', name: 'Orphic set', quality: 'blue', faction: 'crown', role: 'mystic', bonus: { 2: { power: 1 }, 4: { power: 1, knowledge: 1 }, 6: { speed: 1 } } },
  { id: 'myrmidon', name: 'Myrmidon set', quality: 'purple', faction: 'crown', role: 'fighter', bonus: { 2: { attack: 1, defense: 1 }, 4: { speed: 1 }, 6: { attack: 1, defense: 1, morale: 1 } } },
  { id: 'eleusinian', name: 'Eleusinian set', quality: 'purple', faction: 'crown', role: 'mystic', bonus: { 2: { power: 1, knowledge: 1 }, 4: { speed: 1 }, 6: { power: 1, knowledge: 1, luck: 1 } } },
];
