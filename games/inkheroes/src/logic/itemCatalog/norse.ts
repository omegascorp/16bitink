import type { ItemDef, SetDef } from '../items';

/** The Norse (chapter 3): the green, blue and purple sets and the pieces never in a set, found as random drops. Numbers in docs/inkheroes-design.md (Loot, Norse gear). The gray sets' armor is in `items.ts`, as the Greeks' and Egypt's are. */
export const NORSE_ITEMS = {
  // Raider set (green fighter)
  raiderHelm: { name: 'Raider Helm', slot: 'helm', quality: 'green', set: 'raider', faction: 'norse', gives: { defense: 1, sight: 1 } },
  raiderMail: { name: 'Raider Mail', slot: 'cuirass', quality: 'green', set: 'raider', faction: 'norse', gives: { defense: 1, gold: 50 } },
  raiderBracers: { name: 'Raider Bracers', slot: 'bracers', quality: 'green', set: 'raider', faction: 'norse', gives: { attack: 1, sight: 1 } },
  oarsmanBelt: { name: 'Oarsman Belt', slot: 'belt', quality: 'green', set: 'raider', faction: 'norse', gives: { morale: 1, gold: 50 } },
  raiderGreaves: { name: 'Raider Greaves', slot: 'greaves', quality: 'green', set: 'raider', faction: 'norse', gives: { defense: 1, sight: 1 } },
  longshipBoots: { name: 'Longship Boots', slot: 'boots', quality: 'green', set: 'raider', faction: 'norse', gives: { attack: 1, travel: 1 } },
  // Skald set (green mystic)
  skaldCap: { name: 'Skald Cap', slot: 'helm', quality: 'green', set: 'skald', faction: 'norse', gives: { power: 1, sight: 1 } },
  skaldCoat: { name: 'Skald Coat', slot: 'cuirass', quality: 'green', set: 'skald', faction: 'norse', gives: { knowledge: 1, gold: 50 } },
  skaldArmbands: { name: 'Skald Armbands', slot: 'bracers', quality: 'green', set: 'skald', faction: 'norse', gives: { knowledge: 1, sight: 1 } },
  sagaSash: { name: 'Saga Sash', slot: 'belt', quality: 'green', set: 'skald', faction: 'norse', gives: { luck: 1, gold: 50 } },
  skaldLeggings: { name: 'Skald Leggings', slot: 'greaves', quality: 'green', set: 'skald', faction: 'norse', gives: { power: 1, sight: 1 } },
  wandererShoes: { name: 'Wanderer Shoes', slot: 'boots', quality: 'green', set: 'skald', faction: 'norse', gives: { power: 1, travel: 1 } },
  // Tyr set (blue fighter)
  tyrHelm: { name: 'Tyr Helm', slot: 'helm', quality: 'blue', set: 'tyr', faction: 'norse', gives: { defense: 2 } },
  tyrByrnie: { name: 'Tyr Byrnie', slot: 'cuirass', quality: 'blue', set: 'tyr', faction: 'norse', gives: { defense: 2 } },
  tyrBracers: { name: 'Tyr Bracers', slot: 'bracers', quality: 'blue', set: 'tyr', faction: 'norse', gives: { attack: 2 } },
  fenrirBelt: { name: 'Fenrir Belt', slot: 'belt', quality: 'blue', set: 'tyr', faction: 'norse', gives: { morale: 1, defense: 1 } },
  tyrGreaves: { name: 'Tyr Greaves', slot: 'greaves', quality: 'blue', set: 'tyr', faction: 'norse', gives: { attack: 1, defense: 1 } },
  wolfskinBoots: { name: 'Wolfskin Boots', slot: 'boots', quality: 'blue', set: 'tyr', faction: 'norse', gives: { attack: 1, travel: 1 } },
  // Runemaster set (blue mystic)
  runemasterHood: { name: 'Runemaster Hood', slot: 'helm', quality: 'blue', set: 'runemaster', faction: 'norse', gives: { power: 2 } },
  runemasterRobe: { name: 'Runemaster Robe', slot: 'cuirass', quality: 'blue', set: 'runemaster', faction: 'norse', gives: { knowledge: 2 } },
  runemasterWraps: { name: 'Runemaster Wraps', slot: 'bracers', quality: 'blue', set: 'runemaster', faction: 'norse', gives: { knowledge: 1, power: 1 } },
  runeCord: { name: 'Rune Cord', slot: 'belt', quality: 'blue', set: 'runemaster', faction: 'norse', gives: { luck: 1, power: 1 } },
  runemasterLeggings: { name: 'Runemaster Leggings', slot: 'greaves', quality: 'blue', set: 'runemaster', faction: 'norse', gives: { knowledge: 1, power: 1 } },
  runemasterBoots: { name: 'Runemaster Boots', slot: 'boots', quality: 'blue', set: 'runemaster', faction: 'norse', gives: { knowledge: 1, travel: 1 } },
  // Jarl set (purple fighter)
  jarlHelm: { name: 'Jarl’s Helm', slot: 'helm', quality: 'purple', set: 'jarl', faction: 'norse', gives: { defense: 2, morale: 1 } },
  jarlByrnie: { name: 'Jarl’s Byrnie', slot: 'cuirass', quality: 'purple', set: 'jarl', faction: 'norse', gives: { defense: 2, attack: 1 } },
  jarlBracers: { name: 'Jarl’s Bracers', slot: 'bracers', quality: 'purple', set: 'jarl', faction: 'norse', gives: { attack: 2, defense: 1 } },
  goldStuddedBelt: { name: 'Gold-Studded Belt', slot: 'belt', quality: 'purple', set: 'jarl', faction: 'norse', gives: { morale: 2, attack: 1 } },
  jarlGreaves: { name: 'Jarl’s Greaves', slot: 'greaves', quality: 'purple', set: 'jarl', faction: 'norse', gives: { defense: 2, attack: 1 } },
  jarlBoots: { name: 'Jarl’s Boots', slot: 'boots', quality: 'purple', set: 'jarl', faction: 'norse', gives: { attack: 2, travel: 1 } },
  // Allfather set (purple mystic)
  allfatherHat: { name: 'Allfather’s Hat', slot: 'helm', quality: 'purple', set: 'allfather', faction: 'norse', gives: { power: 2, luck: 1 } },
  allfatherCloak: { name: 'Allfather’s Cloak', slot: 'cuirass', quality: 'purple', set: 'allfather', faction: 'norse', gives: { knowledge: 2, power: 1 } },
  allfatherArmrings: { name: 'Allfather’s Armrings', slot: 'bracers', quality: 'purple', set: 'allfather', faction: 'norse', gives: { knowledge: 2, luck: 1 } },
  ravenBelt: { name: 'Raven Belt', slot: 'belt', quality: 'purple', set: 'allfather', faction: 'norse', gives: { luck: 2, knowledge: 1 } },
  allfatherLeggings: { name: 'Allfather’s Leggings', slot: 'greaves', quality: 'purple', set: 'allfather', faction: 'norse', gives: { power: 2, knowledge: 1 } },
  sleipnirBoots: { name: 'Sleipnir Boots', slot: 'boots', quality: 'purple', set: 'allfather', faction: 'norse', gives: { knowledge: 2, travel: 1 } },
  // non-set, gray
  handAxe: { name: 'Hand Axe', slot: 'weapon', quality: 'gray', faction: 'norse', gives: { attack: 1 } },
  lindenShield: { name: 'Linden Shield', slot: 'shield', quality: 'gray', faction: 'norse', gives: { defense: 1 } },
  boneCharm: { name: 'Bone Charm', slot: 'amulet', quality: 'gray', faction: 'norse', gives: { luck: 1 } },
  boneRing: { name: 'Bone Ring', slot: 'ring1', quality: 'gray', faction: 'norse', gives: { knowledge: 1 } },
  ironRing: { name: 'Iron Ring', slot: 'ring1', quality: 'gray', faction: 'norse', gives: { morale: 1 } },
  // non-set, green
  seax: { name: 'Seax', slot: 'weapon', quality: 'green', faction: 'norse', gives: { attack: 1, sight: 1 } },
  paintedShield: { name: 'Painted Shield', slot: 'shield', quality: 'green', faction: 'norse', gives: { defense: 1, gold: 50 } },
  hammerAmulet: { name: 'Hammer Amulet', slot: 'amulet', quality: 'green', faction: 'norse', gives: { power: 1, sight: 1 } },
  amberRing: { name: 'Amber Ring', slot: 'ring1', quality: 'green', faction: 'norse', gives: { morale: 1, gold: 50 } },
  ravenRing: { name: 'Raven Ring', slot: 'ring1', quality: 'green', faction: 'norse', gives: { luck: 1, sight: 1 } },
  // non-set, blue
  beardedAxe: { name: 'Bearded Axe', slot: 'weapon', quality: 'blue', faction: 'norse', gives: { attack: 2 } },
  bossShield: { name: 'Boss Shield', slot: 'shield', quality: 'blue', faction: 'norse', gives: { defense: 2 } },
  valknutAmulet: { name: 'Valknut Amulet', slot: 'amulet', quality: 'blue', faction: 'norse', gives: { knowledge: 2 } },
  runestoneRing: { name: 'Runestone Ring', slot: 'ring1', quality: 'blue', faction: 'norse', gives: { power: 2 } },
  ringOfFreyr: { name: 'Ring of Freyr', slot: 'ring1', quality: 'blue', faction: 'norse', gives: { defense: 1, morale: 1 } },
  // non-set, purple
  seaKingsSword: { name: 'Sea-King’s Sword', slot: 'weapon', quality: 'purple', faction: 'norse', gives: { attack: 2, morale: 1 } },
  shieldOfTyr: { name: 'Shield of Tyr', slot: 'shield', quality: 'purple', faction: 'norse', gives: { defense: 2, attack: 1 } },
  mjolnirPendant: { name: 'Mjolnir Pendant', slot: 'amulet', quality: 'purple', faction: 'norse', gives: { luck: 2, power: 1 } },
  draupnirRing: { name: 'Draupnir Ring', slot: 'ring1', quality: 'purple', faction: 'norse', gives: { knowledge: 2, luck: 1 } },
  fenrirRing: { name: 'Fenrir Ring', slot: 'ring1', quality: 'purple', faction: 'norse', gives: { power: 2, knowledge: 1 } },
} as const satisfies Record<string, ItemDef>;

export const NORSE_SETS: readonly SetDef[] = [
  { id: 'hide', name: 'Hide set', quality: 'gray', faction: 'norse', role: 'fighter' },
  { id: 'volva', name: 'Volva set', quality: 'gray', faction: 'norse', role: 'mystic' },
  { id: 'raider', name: 'Raider set', quality: 'green', faction: 'norse', role: 'fighter', bonus: { 2: { morale: 1 }, 4: { attack: 1 }, 6: { attack: 1, defense: 1 } } },
  { id: 'skald', name: 'Skald set', quality: 'green', faction: 'norse', role: 'mystic', bonus: { 2: { luck: 1 }, 4: { power: 1 }, 6: { power: 1, knowledge: 1 } } },
  { id: 'tyr', name: 'Tyr set', quality: 'blue', faction: 'norse', role: 'fighter', bonus: { 2: { defense: 1 }, 4: { attack: 1, defense: 1 }, 6: { speed: 1 } } },
  { id: 'runemaster', name: 'Runemaster set', quality: 'blue', faction: 'norse', role: 'mystic', bonus: { 2: { power: 1 }, 4: { power: 1, knowledge: 1 }, 6: { speed: 1 } } },
  { id: 'jarl', name: 'Jarl set', quality: 'purple', faction: 'norse', role: 'fighter', bonus: { 2: { attack: 1, defense: 1 }, 4: { speed: 1 }, 6: { attack: 1, defense: 1, morale: 1 } } },
  { id: 'allfather', name: 'Allfather set', quality: 'purple', faction: 'norse', role: 'mystic', bonus: { 2: { power: 1, knowledge: 1 }, 4: { speed: 1 }, 6: { power: 1, knowledge: 1, luck: 1 } } },
];
