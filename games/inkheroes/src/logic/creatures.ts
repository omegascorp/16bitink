import type { Amount } from './resources';

/** A people (`crown` the Greeks, `kemet` Egypt, `norse` the Norse), the wild neutrals, or the war machines. */
export type Faction = 'crown' | 'kemet' | 'norse' | 'neutral' | 'machine';
/** The peoples who hold towns and lead heroes. */
export type TownFaction = Extract<Faction, 'crown' | 'kemet' | 'norse'>;

export interface CreatureDef {
  readonly id: CreatureId;
  readonly name: string;
  readonly plural: string;
  readonly faction: Faction;
  readonly level: number;
  readonly attack: number;
  readonly defense: number;
  readonly minDmg: number;
  readonly maxDmg: number;
  readonly hp: number;
  readonly speed: number;
  /** Units a week from its town dwelling. */
  readonly growth: number;
  readonly cost: Amount;
  /** Shooters only: arrows per battle. */
  readonly shots?: number;
  readonly flies?: boolean;
  /** No morale, immune to mind spells. */
  readonly undead?: boolean;
  /** Its strikes are never answered. */
  readonly noRetaliation?: boolean;
  /** Answers this many strikes a round (default 1). */
  readonly retaliations?: number;
  /** +5% damage for each hex moved before a melee strike. */
  readonly charge?: boolean;
  /** After a melee strike it flies back to the hex it started from, if it lived and the hex is free. */
  readonly swoop?: boolean;
  /** Its melee strike hits every enemy stack beside it. */
  readonly cleave?: boolean;
  /** At the start of each of its turns its top creature heals this many HP. */
  readonly regen?: number;
  /** The chance a melee strike that lands turns the target to stone, losing it its next turn. */
  readonly petrify?: number;
  /** The chance a strike that lands curses a living target: it deals its least damage (the Curse of Set). */
  readonly curse?: number;
  /** Once a battle, wiped out, it rises again: with half the creatures it had (at least 1), or all of them. */
  readonly rebirth?: 'half' | 'all';
  /** Answers every strike, however many come in a round. */
  readonly guardian?: boolean;
  /** Shots against it do half damage. */
  readonly shieldWall?: boolean;
  /** Its shots do full damage at any range. */
  readonly noRangePenalty?: boolean;
  /** A shooter that strikes as hard hand to hand (a thrower of boulders). */
  readonly noMeleePenalty?: boolean;
  /** A strike that lands poisons a living target: at the start of each of its next 3 turns it loses this share of the damage that strike dealt. */
  readonly poison?: number;
  /** Raises its own army's morale. */
  readonly morale?: number;
  /** Takes two hexes on the battlefield: its head and the one behind it (H3's double-wide). Same as `hexes: 2`. */
  readonly wide?: boolean;
  /** How many hexes it fills in a row on the battlefield: its head and those behind it (1 unless set; `wide` means 2). */
  readonly hexes?: 1 | 2 | 3;
  /** An upgrade: the line's base unit, and which of its five levels (its rank) this is (2 to 5; a base unit is 1). Towns raise a line to 3; 4 and 5 are trained at map sites. */
  readonly line?: CreatureId;
  readonly tier?: 2 | 3 | 4 | 5;
  /** +1 Attack (2 for rage that counts double) for each tenth of its starting count it has lost this battle, up to 10 tenths. */
  readonly rage?: 1 | 2;
  /** Its melee strike also hits the unit in the hex behind its target (a dragon's breath). */
  readonly breath?: boolean;
  /** A shooter that shoots twice, when it hasn't moved this turn. */
  readonly shootsTwice?: boolean;
  /** On skis: in a battle on snow, +2 Speed, and it may move and then shoot in the same turn. */
  readonly skis?: boolean;
  /** A war machine bought at the Blacksmith: how its faction deals with walls. It never moves, acts by itself, and can't hold the field alone. */
  readonly machine?: 'catapult' | 'ramp' | 'ram';
  /** A catapult's stones a round, and the chances each misses or lands a double blow. */
  readonly stones?: { readonly throws: number; readonly miss: number; readonly crit: number };
  /** A siege ramp: the round it is ready by, and (the finest) a second ramp's, at another stretch. */
  readonly ramp?: { readonly ready: number; readonly second?: number };
  /** A battering ram: the gate falls at the end of round `round`; `towers`, the wall beside the gate cracks too (breaches at wallGateNorth and wallGateSouth). */
  readonly ram?: { readonly round: number; readonly towers?: boolean };
}

const def = <T extends CreatureDef>(c: T): T => c;

/** Every creature, by id. Numbers are in docs/inkheroes-design.md. */
export const CREATURES = {
  spearman: def({ id: 'spearman', name: 'Hoplite', plural: 'Hoplites', faction: 'crown', level: 1, attack: 4, defense: 5, minDmg: 1, maxDmg: 3, hp: 10, speed: 4, growth: 14, cost: { gold: 60 } }),
  bowman: def({ id: 'bowman', name: 'Slinger', plural: 'Slingers', faction: 'crown', level: 2, attack: 6, defense: 3, minDmg: 2, maxDmg: 3, hp: 10, speed: 4, growth: 9, cost: { gold: 100 }, shots: 12 }),
  griffin: def({ id: 'griffin', name: 'Griffin', plural: 'Griffins', faction: 'crown', level: 3, attack: 8, defense: 8, minDmg: 3, maxDmg: 6, hp: 25, speed: 6, growth: 7, cost: { gold: 200 }, flies: true, retaliations: 2, wide: true }),
  swordsman: def({ id: 'swordsman', name: 'Minotaur', plural: 'Minotaurs', faction: 'crown', level: 4, attack: 10, defense: 12, minDmg: 6, maxDmg: 9, hp: 35, speed: 5, growth: 4, cost: { gold: 300 } }),
  monk: def({ id: 'monk', name: 'Centaur', plural: 'Centaurs', faction: 'crown', level: 5, attack: 12, defense: 7, minDmg: 10, maxDmg: 12, hp: 30, speed: 5, growth: 3, cost: { gold: 400 }, shots: 12, wide: true }),
  lancer: def({ id: 'lancer', name: 'Companion', plural: 'Companions', faction: 'crown', level: 6, attack: 15, defense: 15, minDmg: 15, maxDmg: 25, hp: 100, speed: 7, growth: 2, cost: { gold: 1000 }, charge: true, wide: true }),
  seraph: def({ id: 'seraph', name: 'Titan', plural: 'Titans', faction: 'crown', level: 7, attack: 20, defense: 20, minDmg: 50, maxDmg: 50, hp: 200, speed: 12, growth: 1, cost: { gold: 3000, gems: 1 }, flies: true, morale: 1 }),
  // The upgrades: each line's level 2 and level 3, the same unit better armed (docs/inkheroes-design.md).
  spearman2: def({ id: 'spearman2', name: 'Phalangite', plural: 'Phalangites', faction: 'crown', level: 1, attack: 6, defense: 6, minDmg: 2, maxDmg: 3, hp: 12, speed: 5, growth: 14, cost: { gold: 80 }, line: 'spearman', tier: 2 }),
  spearman3: def({ id: 'spearman3', name: 'Spartan', plural: 'Spartans', faction: 'crown', level: 1, attack: 7, defense: 8, minDmg: 2, maxDmg: 4, hp: 15, speed: 5, growth: 14, cost: { gold: 100 }, retaliations: 2, line: 'spearman', tier: 3 }),
  bowman2: def({ id: 'bowman2', name: 'Achaean Slinger', plural: 'Achaean Slingers', faction: 'crown', level: 2, attack: 6, defense: 4, minDmg: 2, maxDmg: 4, hp: 10, speed: 6, growth: 9, cost: { gold: 130 }, shots: 16, line: 'bowman', tier: 2 }),
  bowman3: def({ id: 'bowman3', name: 'Rhodian Slinger', plural: 'Rhodian Slingers', faction: 'crown', level: 2, attack: 8, defense: 5, minDmg: 3, maxDmg: 4, hp: 12, speed: 6, growth: 9, cost: { gold: 160 }, shots: 20, noRangePenalty: true, line: 'bowman', tier: 3 }),
  griffin2: def({ id: 'griffin2', name: 'War Griffin', plural: 'War Griffins', faction: 'crown', level: 3, attack: 9, defense: 9, minDmg: 3, maxDmg: 6, hp: 25, speed: 9, growth: 7, cost: { gold: 240 }, flies: true, retaliations: 3, wide: true, line: 'griffin', tier: 2 }),
  griffin3: def({ id: 'griffin3', name: 'Golden Griffin', plural: 'Golden Griffins', faction: 'crown', level: 3, attack: 10, defense: 10, minDmg: 4, maxDmg: 7, hp: 30, speed: 10, growth: 7, cost: { gold: 290 }, flies: true, retaliations: 4, wide: true, line: 'griffin', tier: 3 }),
  swordsman2: def({ id: 'swordsman2', name: 'Minotaur Guard', plural: 'Minotaur Guards', faction: 'crown', level: 4, attack: 12, defense: 13, minDmg: 6, maxDmg: 10, hp: 40, speed: 6, growth: 4, cost: { gold: 360 }, line: 'swordsman', tier: 2 }),
  swordsman3: def({ id: 'swordsman3', name: 'Minotaur Lord', plural: 'Minotaur Lords', faction: 'crown', level: 4, attack: 14, defense: 14, minDmg: 7, maxDmg: 11, hp: 45, speed: 6, growth: 4, cost: { gold: 430 }, noRetaliation: true, line: 'swordsman', tier: 3 }),
  monk2: def({ id: 'monk2', name: 'Centaur Marksman', plural: 'Centaur Marksmen', faction: 'crown', level: 5, attack: 12, defense: 9, minDmg: 10, maxDmg: 12, hp: 30, speed: 7, growth: 3, cost: { gold: 450 }, shots: 16, wide: true, line: 'monk', tier: 2 }),
  monk3: def({ id: 'monk3', name: 'Centaur Sage', plural: 'Centaur Sages', faction: 'crown', level: 5, attack: 14, defense: 10, minDmg: 11, maxDmg: 13, hp: 35, speed: 7, growth: 3, cost: { gold: 520 }, shots: 20, wide: true, morale: 1, line: 'monk', tier: 3 }),
  lancer2: def({ id: 'lancer2', name: 'Royal Companion', plural: 'Royal Companions', faction: 'crown', level: 6, attack: 16, defense: 16, minDmg: 20, maxDmg: 25, hp: 100, speed: 9, growth: 2, cost: { gold: 1200 }, charge: true, wide: true, line: 'lancer', tier: 2 }),
  lancer3: def({ id: 'lancer3', name: 'Cataphract', plural: 'Cataphracts', faction: 'crown', level: 6, attack: 18, defense: 18, minDmg: 22, maxDmg: 28, hp: 120, speed: 10, growth: 2, cost: { gold: 1500 }, charge: true, wide: true, shieldWall: true, line: 'lancer', tier: 3 }),
  seraph2: def({ id: 'seraph2', name: 'Elder Titan', plural: 'Elder Titans', faction: 'crown', level: 7, attack: 22, defense: 22, minDmg: 50, maxDmg: 55, hp: 240, speed: 14, growth: 1, cost: { gold: 3600, gems: 2 }, flies: true, morale: 1, line: 'seraph', tier: 2 }),
  seraph3: def({ id: 'seraph3', name: 'Titan Lord', plural: 'Titan Lords', faction: 'crown', level: 7, attack: 26, defense: 24, minDmg: 55, maxDmg: 60, hp: 280, speed: 16, growth: 1, cost: { gold: 4400, gems: 3 }, flies: true, morale: 1, cleave: true, line: 'seraph', tier: 3 }),
  // Rarity (docs/inkheroes-design.md, "Rarity: five ranks"): each line's Epic (4, an Arena of Heroes) and Legendary (5, the Forge of Hephaestus) ranks, the line's last step taken twice more.
  spearman4: def({ id: 'spearman4', name: 'Myrmidon', plural: 'Myrmidons', faction: 'crown', level: 1, attack: 8, defense: 10, minDmg: 3, maxDmg: 5, hp: 18, speed: 6, growth: 14, cost: { gold: 130 }, retaliations: 2, line: 'spearman', tier: 4 }),
  spearman5: def({ id: 'spearman5', name: 'Champion of Ares', plural: 'Champions of Ares', faction: 'crown', level: 1, attack: 9, defense: 12, minDmg: 4, maxDmg: 6, hp: 21, speed: 7, growth: 14, cost: { gold: 170 }, retaliations: 3, shieldWall: true, line: 'spearman', tier: 5 }),
  bowman4: def({ id: 'bowman4', name: 'Stormslinger', plural: 'Stormslingers', faction: 'crown', level: 2, attack: 10, defense: 6, minDmg: 4, maxDmg: 5, hp: 14, speed: 7, growth: 9, cost: { gold: 205 }, shots: 20, noRangePenalty: true, line: 'bowman', tier: 4 }),
  bowman5: def({ id: 'bowman5', name: 'Slinger of Zeus', plural: 'Slingers of Zeus', faction: 'crown', level: 2, attack: 12, defense: 7, minDmg: 5, maxDmg: 6, hp: 16, speed: 8, growth: 9, cost: { gold: 265 }, shots: 30, noRangePenalty: true, noMeleePenalty: true, line: 'bowman', tier: 5 }),
  griffin4: def({ id: 'griffin4', name: 'Royal Griffin', plural: 'Royal Griffins', faction: 'crown', level: 3, attack: 11, defense: 11, minDmg: 5, maxDmg: 8, hp: 35, speed: 11, growth: 7, cost: { gold: 365 }, flies: true, retaliations: 4, wide: true, line: 'griffin', tier: 4 }),
  griffin5: def({ id: 'griffin5', name: 'Griffin of Apollo', plural: 'Griffins of Apollo', faction: 'crown', level: 3, attack: 12, defense: 12, minDmg: 6, maxDmg: 9, hp: 40, speed: 12, growth: 7, cost: { gold: 465 }, flies: true, retaliations: 6, morale: 1, wide: true, line: 'griffin', tier: 5 }),
  swordsman4: def({ id: 'swordsman4', name: 'Minotaur Champion', plural: 'Minotaur Champions', faction: 'crown', level: 4, attack: 16, defense: 15, minDmg: 8, maxDmg: 12, hp: 50, speed: 7, growth: 4, cost: { gold: 535 }, noRetaliation: true, line: 'swordsman', tier: 4 }),
  swordsman5: def({ id: 'swordsman5', name: 'Minotaur King', plural: 'Minotaur Kings', faction: 'crown', level: 4, attack: 18, defense: 16, minDmg: 9, maxDmg: 13, hp: 55, speed: 8, growth: 4, cost: { gold: 675 }, noRetaliation: true, cleave: true, line: 'swordsman', tier: 5 }),
  monk4: def({ id: 'monk4', name: 'Centaur Warlord', plural: 'Centaur Warlords', faction: 'crown', level: 5, attack: 16, defense: 11, minDmg: 12, maxDmg: 14, hp: 40, speed: 8, growth: 3, cost: { gold: 625 }, shots: 20, wide: true, morale: 1, line: 'monk', tier: 4 }),
  monk5: def({ id: 'monk5', name: 'Heir of Chiron', plural: 'Heirs of Chiron', faction: 'crown', level: 5, attack: 18, defense: 12, minDmg: 13, maxDmg: 15, hp: 45, speed: 9, growth: 3, cost: { gold: 765 }, shots: 20, wide: true, morale: 1, noMeleePenalty: true, line: 'monk', tier: 5 }),
  lancer4: def({ id: 'lancer4', name: 'Agema Guard', plural: 'Agema Guards', faction: 'crown', level: 6, attack: 20, defense: 20, minDmg: 24, maxDmg: 31, hp: 140, speed: 11, growth: 2, cost: { gold: 1950, gems: 1 }, charge: true, wide: true, shieldWall: true, line: 'lancer', tier: 4 }),
  lancer5: def({ id: 'lancer5', name: 'Pegasus Rider', plural: 'Pegasus Riders', faction: 'crown', level: 6, attack: 22, defense: 22, minDmg: 26, maxDmg: 34, hp: 160, speed: 12, growth: 2, cost: { gold: 2550, gems: 2 }, charge: true, wide: true, shieldWall: true, flies: true, line: 'lancer', tier: 5 }),
  seraph4: def({ id: 'seraph4', name: 'Storm Titan', plural: 'Storm Titans', faction: 'crown', level: 7, attack: 30, defense: 26, minDmg: 60, maxDmg: 65, hp: 320, speed: 17, growth: 1, cost: { gold: 5600, gems: 4 }, flies: true, morale: 1, cleave: true, line: 'seraph', tier: 4 }),
  seraph5: def({ id: 'seraph5', name: 'Titan of Olympus', plural: 'Titans of Olympus', faction: 'crown', level: 7, attack: 34, defense: 28, minDmg: 65, maxDmg: 70, hp: 360, speed: 18, growth: 1, cost: { gold: 7200, gems: 5 }, flies: true, morale: 1, cleave: true, regen: 20, line: 'seraph', tier: 5 }),
  goblin: def({ id: 'goblin', name: 'Satyr', plural: 'Satyrs', faction: 'neutral', level: 1, attack: 4, defense: 2, minDmg: 1, maxDmg: 2, hp: 5, speed: 5, growth: 15, cost: { gold: 40 } }),
  skeleton: def({ id: 'skeleton', name: 'Spartoi', plural: 'Spartoi', faction: 'neutral', level: 1, attack: 5, defense: 4, minDmg: 1, maxDmg: 3, hp: 6, speed: 4, growth: 12, cost: { gold: 60 }, undead: true }),
  wolf: def({ id: 'wolf', name: 'Wolf', plural: 'Wolves', faction: 'neutral', level: 2, attack: 6, defense: 3, minDmg: 2, maxDmg: 4, hp: 10, speed: 7, growth: 8, cost: { gold: 100 }, wide: true }),
  bandit: def({ id: 'bandit', name: 'Brigand', plural: 'Brigands', faction: 'neutral', level: 2, attack: 8, defense: 3, minDmg: 2, maxDmg: 4, hp: 10, speed: 6, growth: 8, cost: { gold: 100 }, noRetaliation: true }),
  // War machines (the Blacksmith's): each faction's own way past a town's walls. They stand out of reach at the back of the hero's side.
  catapult: def({ id: 'catapult', name: 'Catapult', plural: 'Catapults', faction: 'machine', level: 1, attack: 0, defense: 10, minDmg: 0, maxDmg: 0, hp: 1000, speed: 20, growth: 0, cost: { gold: 1500 }, machine: 'catapult', stones: { throws: 1, miss: 0.1, crit: 0.3 }, retaliations: 0 }),
  catapult2: def({ id: 'catapult2', name: 'Bronze Catapult', plural: 'Bronze Catapults', faction: 'machine', level: 2, attack: 0, defense: 10, minDmg: 0, maxDmg: 0, hp: 1000, speed: 20, growth: 0, cost: { gold: 3000 }, machine: 'catapult', stones: { throws: 1, miss: 0.05, crit: 0.6 }, retaliations: 0 }),
  catapult3: def({ id: 'catapult3', name: 'Syracusan Catapult', plural: 'Syracusan Catapults', faction: 'machine', level: 3, attack: 0, defense: 10, minDmg: 0, maxDmg: 0, hp: 1000, speed: 20, growth: 0, cost: { gold: 5000 }, machine: 'catapult', stones: { throws: 2, miss: 0.05, crit: 0.6 }, retaliations: 0 }),
  // Egypt's: workers raise an earthen ramp against a stretch of wall the player picks, and the army walks up it.
  ramp: def({ id: 'ramp', name: 'Earth Ramp', plural: 'Earth Ramps', faction: 'machine', level: 1, attack: 0, defense: 10, minDmg: 0, maxDmg: 0, hp: 1000, speed: 20, growth: 0, cost: { gold: 1500 }, machine: 'ramp', ramp: { ready: 3 }, retaliations: 0 }),
  ramp2: def({ id: 'ramp2', name: 'Brick Ramp', plural: 'Brick Ramps', faction: 'machine', level: 2, attack: 0, defense: 10, minDmg: 0, maxDmg: 0, hp: 1000, speed: 20, growth: 0, cost: { gold: 3000 }, machine: 'ramp', ramp: { ready: 2 }, retaliations: 0 }),
  ramp3: def({ id: 'ramp3', name: 'Ramp of the Pyramid Builders', plural: 'Ramps of the Pyramid Builders', faction: 'machine', level: 3, attack: 0, defense: 10, minDmg: 0, maxDmg: 0, hp: 1000, speed: 20, growth: 0, cost: { gold: 5000 }, machine: 'ramp', ramp: { ready: 2, second: 3 }, retaliations: 0 }),
  ogre: def({ id: 'ogre', name: 'Cyclops', plural: 'Cyclopes', faction: 'neutral', level: 4, attack: 13, defense: 7, minDmg: 6, maxDmg: 12, hp: 40, speed: 4, growth: 4, cost: { gold: 300 } }),
  // Each map after the first brings new neutrals, each with a way of fighting of its own (docs/inkheroes-design.md).
  boar: def({ id: 'boar', name: 'Erymanthian Boar', plural: 'Erymanthian Boars', faction: 'neutral', level: 3, attack: 9, defense: 6, minDmg: 3, maxDmg: 6, hp: 24, speed: 6, growth: 6, cost: { gold: 180 }, charge: true, wide: true }),
  stymphalian: def({ id: 'stymphalian', name: 'Stymphalian Bird', plural: 'Stymphalian Birds', faction: 'neutral', level: 2, attack: 8, defense: 3, minDmg: 2, maxDmg: 4, hp: 8, speed: 9, growth: 8, cost: { gold: 120 }, flies: true, swoop: true }),
  hydra: def({ id: 'hydra', name: 'Lernaean Hydra', plural: 'Lernaean Hydras', faction: 'neutral', level: 5, attack: 13, defense: 10, minDmg: 8, maxDmg: 12, hp: 60, speed: 5, growth: 3, cost: { gold: 600 }, wide: true, cleave: true, regen: 10 }),
  basilisk: def({ id: 'basilisk', name: 'Basilisk', plural: 'Basilisks', faction: 'neutral', level: 3, attack: 8, defense: 9, minDmg: 3, maxDmg: 5, hp: 22, speed: 5, growth: 6, cost: { gold: 200 }, petrify: 0.25 }),
  // The Two Lands (chapter 2): Egypt's seven lines, level by level as even with the Greeks' (docs/inkheroes-design.md).
  levy: def({ id: 'levy', name: 'Nile Levy', plural: 'Nile Levies', faction: 'kemet', level: 1, attack: 4, defense: 5, minDmg: 1, maxDmg: 3, hp: 10, speed: 4, growth: 14, cost: { gold: 60 } }),
  nubian: def({ id: 'nubian', name: 'Nubian Archer', plural: 'Nubian Archers', faction: 'kemet', level: 2, attack: 6, defense: 3, minDmg: 2, maxDmg: 3, hp: 10, speed: 4, growth: 9, cost: { gold: 100 }, shots: 12 }),
  jackal: def({ id: 'jackal', name: 'Jackal Warrior', plural: 'Jackal Warriors', faction: 'kemet', level: 3, attack: 9, defense: 6, minDmg: 3, maxDmg: 6, hp: 22, speed: 7, growth: 7, cost: { gold: 200 } }),
  chariot: def({ id: 'chariot', name: 'War Chariot', plural: 'War Chariots', faction: 'kemet', level: 4, attack: 10, defense: 10, minDmg: 5, maxDmg: 9, hp: 35, speed: 8, growth: 4, cost: { gold: 300 }, charge: true, hexes: 3 }),
  mummy: def({ id: 'mummy', name: 'Mummy', plural: 'Mummies', faction: 'kemet', level: 5, attack: 11, defense: 11, minDmg: 8, maxDmg: 12, hp: 40, speed: 4, growth: 3, cost: { gold: 400 }, undead: true, curse: 0.25 }),
  sphinx: def({ id: 'sphinx', name: 'Sphinx', plural: 'Sphinxes', faction: 'kemet', level: 6, attack: 15, defense: 16, minDmg: 15, maxDmg: 25, hp: 110, speed: 6, growth: 2, cost: { gold: 1000 }, wide: true, guardian: true }),
  bennu: def({ id: 'bennu', name: 'Bennu', plural: 'Bennu', faction: 'kemet', level: 7, attack: 20, defense: 18, minDmg: 40, maxDmg: 50, hp: 180, speed: 11, growth: 1, cost: { gold: 3000, gems: 1 }, flies: true, rebirth: 'half' }),
  levy2: def({ id: 'levy2', name: 'Spearman of Amun', plural: 'Spearmen of Amun', faction: 'kemet', level: 1, attack: 6, defense: 5, minDmg: 2, maxDmg: 3, hp: 12, speed: 5, growth: 14, cost: { gold: 80 }, line: 'levy', tier: 2 }),
  levy3: def({ id: 'levy3', name: 'Shardana Guard', plural: 'Shardana Guards', faction: 'kemet', level: 1, attack: 7, defense: 8, minDmg: 2, maxDmg: 4, hp: 15, speed: 5, growth: 14, cost: { gold: 100 }, shieldWall: true, line: 'levy', tier: 3 }),
  nubian2: def({ id: 'nubian2', name: 'Medjay Archer', plural: 'Medjay Archers', faction: 'kemet', level: 2, attack: 7, defense: 4, minDmg: 2, maxDmg: 4, hp: 10, speed: 6, growth: 9, cost: { gold: 130 }, shots: 16, line: 'nubian', tier: 2 }),
  nubian3: def({ id: 'nubian3', name: 'Bowman of Ta-Seti', plural: 'Bowmen of Ta-Seti', faction: 'kemet', level: 2, attack: 8, defense: 5, minDmg: 3, maxDmg: 4, hp: 12, speed: 6, growth: 9, cost: { gold: 170 }, shots: 20, noRangePenalty: true, line: 'nubian', tier: 3 }),
  jackal2: def({ id: 'jackal2', name: 'Sentinel of Anubis', plural: 'Sentinels of Anubis', faction: 'kemet', level: 3, attack: 10, defense: 7, minDmg: 3, maxDmg: 7, hp: 25, speed: 8, growth: 7, cost: { gold: 240 }, line: 'jackal', tier: 2 }),
  jackal3: def({ id: 'jackal3', name: 'Hand of Anubis', plural: 'Hands of Anubis', faction: 'kemet', level: 3, attack: 11, defense: 8, minDmg: 4, maxDmg: 8, hp: 28, speed: 8, growth: 7, cost: { gold: 290 }, noRetaliation: true, line: 'jackal', tier: 3 }),
  chariot2: def({ id: 'chariot2', name: 'Royal Chariot', plural: 'Royal Chariots', faction: 'kemet', level: 4, attack: 12, defense: 11, minDmg: 6, maxDmg: 10, hp: 40, speed: 9, growth: 4, cost: { gold: 360 }, charge: true, hexes: 3, line: 'chariot', tier: 2 }),
  chariot3: def({ id: 'chariot3', name: 'Chariot of Horus', plural: 'Chariots of Horus', faction: 'kemet', level: 4, attack: 14, defense: 12, minDmg: 7, maxDmg: 11, hp: 45, speed: 10, growth: 4, cost: { gold: 430 }, charge: true, hexes: 3, cleave: true, line: 'chariot', tier: 3 }),
  mummy2: def({ id: 'mummy2', name: 'Royal Mummy', plural: 'Royal Mummies', faction: 'kemet', level: 5, attack: 12, defense: 12, minDmg: 9, maxDmg: 13, hp: 45, speed: 5, growth: 3, cost: { gold: 450 }, undead: true, curse: 0.35, line: 'mummy', tier: 2 }),
  mummy3: def({ id: 'mummy3', name: 'Pharaoh’s Mummy', plural: 'Pharaoh’s Mummies', faction: 'kemet', level: 5, attack: 14, defense: 13, minDmg: 10, maxDmg: 14, hp: 50, speed: 5, growth: 3, cost: { gold: 520 }, undead: true, curse: 0.5, regen: 10, line: 'mummy', tier: 3 }),
  sphinx2: def({ id: 'sphinx2', name: 'Guardian Sphinx', plural: 'Guardian Sphinxes', faction: 'kemet', level: 6, attack: 16, defense: 17, minDmg: 18, maxDmg: 25, hp: 110, speed: 7, growth: 2, cost: { gold: 1200 }, wide: true, guardian: true, line: 'sphinx', tier: 2 }),
  sphinx3: def({ id: 'sphinx3', name: 'Great Sphinx', plural: 'Great Sphinxes', faction: 'kemet', level: 6, attack: 18, defense: 19, minDmg: 20, maxDmg: 28, hp: 130, speed: 8, growth: 2, cost: { gold: 1500 }, wide: true, guardian: true, petrify: 0.2, line: 'sphinx', tier: 3 }),
  bennu2: def({ id: 'bennu2', name: 'Golden Bennu', plural: 'Golden Bennu', faction: 'kemet', level: 7, attack: 22, defense: 20, minDmg: 45, maxDmg: 55, hp: 210, speed: 13, growth: 1, cost: { gold: 3600, gems: 2 }, flies: true, rebirth: 'half', line: 'bennu', tier: 2 }),
  bennu3: def({ id: 'bennu3', name: 'Bennu of Ra', plural: 'Bennu of Ra', faction: 'kemet', level: 7, attack: 25, defense: 22, minDmg: 50, maxDmg: 60, hp: 250, speed: 15, growth: 1, cost: { gold: 4400, gems: 3 }, flies: true, rebirth: 'all', line: 'bennu', tier: 3 }),
  // Egypt's Epic (4, an Arena of Heroes) and Legendary (5, the Temple of Ra) ranks, as the Greeks'.
  levy4: def({ id: 'levy4', name: 'Guard of Pharaoh', plural: 'Guards of Pharaoh', faction: 'kemet', level: 1, attack: 8, defense: 11, minDmg: 3, maxDmg: 5, hp: 18, speed: 6, growth: 14, cost: { gold: 130 }, shieldWall: true, line: 'levy', tier: 4 }),
  levy5: def({ id: 'levy5', name: 'Champion of Montu', plural: 'Champions of Montu', faction: 'kemet', level: 1, attack: 9, defense: 14, minDmg: 4, maxDmg: 6, hp: 21, speed: 7, growth: 14, cost: { gold: 170 }, shieldWall: true, retaliations: 2, line: 'levy', tier: 5 }),
  nubian4: def({ id: 'nubian4', name: 'Royal Bowman', plural: 'Royal Bowmen', faction: 'kemet', level: 2, attack: 9, defense: 6, minDmg: 4, maxDmg: 5, hp: 14, speed: 7, growth: 9, cost: { gold: 230 }, shots: 20, noRangePenalty: true, line: 'nubian', tier: 4 }),
  nubian5: def({ id: 'nubian5', name: 'Archer of Neith', plural: 'Archers of Neith', faction: 'kemet', level: 2, attack: 10, defense: 7, minDmg: 5, maxDmg: 6, hp: 16, speed: 8, growth: 9, cost: { gold: 310 }, shots: 20, noRangePenalty: true, noMeleePenalty: true, line: 'nubian', tier: 5 }),
  jackal4: def({ id: 'jackal4', name: 'Champion of Anubis', plural: 'Champions of Anubis', faction: 'kemet', level: 3, attack: 12, defense: 9, minDmg: 5, maxDmg: 9, hp: 31, speed: 9, growth: 7, cost: { gold: 365 }, noRetaliation: true, line: 'jackal', tier: 4 }),
  jackal5: def({ id: 'jackal5', name: 'Chosen of Anubis', plural: 'Chosen of Anubis', faction: 'kemet', level: 3, attack: 13, defense: 10, minDmg: 6, maxDmg: 10, hp: 34, speed: 10, growth: 7, cost: { gold: 465 }, noRetaliation: true, poison: 0.1, line: 'jackal', tier: 5 }),
  chariot4: def({ id: 'chariot4', name: 'Pharaoh’s Chariot', plural: 'Pharaoh’s Chariots', faction: 'kemet', level: 4, attack: 16, defense: 13, minDmg: 8, maxDmg: 12, hp: 50, speed: 11, growth: 4, cost: { gold: 535 }, charge: true, hexes: 3, cleave: true, line: 'chariot', tier: 4 }),
  chariot5: def({ id: 'chariot5', name: 'Chariot of the Sun', plural: 'Chariots of the Sun', faction: 'kemet', level: 4, attack: 18, defense: 14, minDmg: 9, maxDmg: 13, hp: 55, speed: 12, growth: 4, cost: { gold: 675 }, charge: true, hexes: 3, cleave: true, noRetaliation: true, line: 'chariot', tier: 5 }),
  mummy4: def({ id: 'mummy4', name: 'Undying Pharaoh', plural: 'Undying Pharaohs', faction: 'kemet', level: 5, attack: 16, defense: 14, minDmg: 11, maxDmg: 15, hp: 55, speed: 6, growth: 3, cost: { gold: 625 }, undead: true, curse: 0.5, regen: 10, line: 'mummy', tier: 4 }),
  mummy5: def({ id: 'mummy5', name: 'Avatar of Osiris', plural: 'Avatars of Osiris', faction: 'kemet', level: 5, attack: 18, defense: 15, minDmg: 12, maxDmg: 16, hp: 60, speed: 7, growth: 3, cost: { gold: 765 }, undead: true, curse: 0.5, regen: 10, rebirth: 'half', line: 'mummy', tier: 5 }),
  sphinx4: def({ id: 'sphinx4', name: 'Sun Sphinx', plural: 'Sun Sphinxes', faction: 'kemet', level: 6, attack: 20, defense: 21, minDmg: 22, maxDmg: 31, hp: 150, speed: 9, growth: 2, cost: { gold: 1950, gems: 1 }, wide: true, guardian: true, petrify: 0.2, line: 'sphinx', tier: 4 }),
  sphinx5: def({ id: 'sphinx5', name: 'Sphinx of Giza', plural: 'Sphinxes of Giza', faction: 'kemet', level: 6, attack: 22, defense: 23, minDmg: 24, maxDmg: 34, hp: 170, speed: 10, growth: 2, cost: { gold: 2550, gems: 2 }, wide: true, guardian: true, petrify: 0.2, cleave: true, line: 'sphinx', tier: 5 }),
  bennu4: def({ id: 'bennu4', name: 'Bennu of Heliopolis', plural: 'Bennu of Heliopolis', faction: 'kemet', level: 7, attack: 28, defense: 24, minDmg: 55, maxDmg: 65, hp: 290, speed: 16, growth: 1, cost: { gold: 5600, gems: 4 }, flies: true, rebirth: 'all', line: 'bennu', tier: 4 }),
  bennu5: def({ id: 'bennu5', name: 'Eternal Bennu', plural: 'Eternal Bennu', faction: 'kemet', level: 7, attack: 31, defense: 26, minDmg: 60, maxDmg: 70, hp: 330, speed: 17, growth: 1, cost: { gold: 7200, gems: 5 }, flies: true, rebirth: 'all', regen: 30, line: 'bennu', tier: 5 }),
  // Egypt's lands bring their own neutrals (chapter 2). Growth and cost set their strength for the rival, as the Greeks' neutrals'.
  hyena: def({ id: 'hyena', name: 'Hyena', plural: 'Hyenas', faction: 'neutral', level: 1, attack: 4, defense: 3, minDmg: 1, maxDmg: 3, hp: 7, speed: 6, growth: 14, cost: { gold: 50 } }),
  raider: def({ id: 'raider', name: 'Sand Raider', plural: 'Sand Raiders', faction: 'neutral', level: 2, attack: 7, defense: 3, minDmg: 2, maxDmg: 4, hp: 10, speed: 6, growth: 8, cost: { gold: 110 }, shots: 8 }),
  scorpion: def({ id: 'scorpion', name: 'Giant Scorpion', plural: 'Giant Scorpions', faction: 'neutral', level: 3, attack: 8, defense: 9, minDmg: 3, maxDmg: 6, hp: 22, speed: 5, growth: 6, cost: { gold: 200 }, poison: 0.1 }),
  crocodile: def({ id: 'crocodile', name: 'Nile Crocodile', plural: 'Nile Crocodiles', faction: 'neutral', level: 3, attack: 9, defense: 8, minDmg: 4, maxDmg: 6, hp: 26, speed: 4, growth: 6, cost: { gold: 200 }, hexes: 3, noRetaliation: true }),
  petsuchos: def({ id: 'petsuchos', name: 'Petsuchos', plural: 'Petsuchoi', faction: 'neutral', level: 6, attack: 16, defense: 14, minDmg: 15, maxDmg: 22, hp: 120, speed: 5, growth: 1, cost: { gold: 1500 }, hexes: 3, regen: 10 }),
  // Abu's desert: the cobra's spit poisons as the scorpion's sting, the lion charges.
  cobra: def({ id: 'cobra', name: 'Spitting Cobra', plural: 'Spitting Cobras', faction: 'neutral', level: 2, attack: 7, defense: 4, minDmg: 2, maxDmg: 3, hp: 9, speed: 6, growth: 8, cost: { gold: 120 }, shots: 6, poison: 0.1 }),
  lion: def({ id: 'lion', name: 'Desert Lion', plural: 'Desert Lions', faction: 'neutral', level: 4, attack: 12, defense: 9, minDmg: 6, maxDmg: 10, hp: 38, speed: 7, growth: 4, cost: { gold: 320 }, hexes: 3, charge: true }),
  // The Red Land: the Serpent of Apep, coiled over the sunken tomb's prize; it poisons as the scorpion and heals as the Hydra.
  // Part 4's mountain (Othrys): the Gigantes, sons of Gaia, guard the Titans' forge and throw boulders as hard as they strike.
  gigas: def({ id: 'gigas', name: 'Gigas', plural: 'Gigantes', faction: 'neutral', level: 7, attack: 19, defense: 16, minDmg: 30, maxDmg: 40, hp: 220, speed: 6, growth: 1, cost: { gold: 3500 }, shots: 4, noMeleePenalty: true, wide: true }),
  // The Delta: Ammit, the Devourer, guards the House of the Benben at Iunu; no one answers its strikes.
  ammit: def({ id: 'ammit', name: 'Ammit', plural: 'Ammits', faction: 'neutral', level: 7, attack: 19, defense: 17, minDmg: 30, maxDmg: 40, hp: 220, speed: 7, growth: 1, cost: { gold: 3500 }, hexes: 3, noRetaliation: true }),
  apep: def({ id: 'apep', name: 'Serpent of Apep', plural: 'Serpents of Apep', faction: 'neutral', level: 6, attack: 17, defense: 13, minDmg: 14, maxDmg: 20, hp: 110, speed: 5, growth: 1, cost: { gold: 1500 }, hexes: 3, poison: 0.1, regen: 10 }),
  // The Norse Kingdoms (chapter 3): the aggressive people, high Attack and low Defense; rage is their mark (docs/inkheroes-design.md).
  shieldmaiden: def({ id: 'shieldmaiden', name: 'Shieldmaiden', plural: 'Shieldmaidens', faction: 'norse', level: 1, attack: 5, defense: 4, minDmg: 1, maxDmg: 3, hp: 10, speed: 4, growth: 14, cost: { gold: 60 } }),
  hunter: def({ id: 'hunter', name: 'Hunter', plural: 'Hunters', faction: 'norse', level: 2, attack: 6, defense: 3, minDmg: 2, maxDmg: 3, hp: 10, speed: 4, growth: 9, cost: { gold: 100 }, shots: 12 }),
  berserker: def({ id: 'berserker', name: 'Berserker', plural: 'Berserkers', faction: 'norse', level: 3, attack: 10, defense: 4, minDmg: 3, maxDmg: 6, hp: 22, speed: 6, growth: 7, cost: { gold: 200 }, rage: 1 }),
  dwarf: def({ id: 'dwarf', name: 'Dwarf', plural: 'Dwarves', faction: 'norse', level: 4, attack: 9, defense: 13, minDmg: 5, maxDmg: 8, hp: 38, speed: 4, growth: 4, cost: { gold: 300 } }),
  // The War Boar's line is `warBoar…`: `boar` is the Erymanthian Boar, a chapter-1 neutral that maps and saves already name.
  warBoar: def({ id: 'warBoar', name: 'War Boar', plural: 'War Boars', faction: 'norse', level: 5, attack: 13, defense: 9, minDmg: 10, maxDmg: 14, hp: 45, speed: 6, growth: 3, cost: { gold: 400 }, wide: true }),
  valkyrie: def({ id: 'valkyrie', name: 'Valkyrie', plural: 'Valkyries', faction: 'norse', level: 6, attack: 16, defense: 14, minDmg: 16, maxDmg: 24, hp: 95, speed: 9, growth: 2, cost: { gold: 1000 }, flies: true, wide: true }),
  dragon: def({ id: 'dragon', name: 'Frost Dragon', plural: 'Frost Dragons', faction: 'norse', level: 7, attack: 21, defense: 18, minDmg: 40, maxDmg: 50, hp: 200, speed: 11, growth: 1, cost: { gold: 3000, gems: 1 }, flies: true, breath: true, wide: true }),
  shieldmaiden2: def({ id: 'shieldmaiden2', name: 'Spear Maiden', plural: 'Spear Maidens', faction: 'norse', level: 1, attack: 7, defense: 5, minDmg: 2, maxDmg: 3, hp: 12, speed: 5, growth: 14, cost: { gold: 80 }, line: 'shieldmaiden', tier: 2 }),
  shieldmaiden3: def({ id: 'shieldmaiden3', name: 'Jarl’s Shieldmaiden', plural: 'Jarl’s Shieldmaidens', faction: 'norse', level: 1, attack: 8, defense: 7, minDmg: 2, maxDmg: 4, hp: 15, speed: 5, growth: 14, cost: { gold: 100 }, cleave: true, line: 'shieldmaiden', tier: 3 }),
  hunter2: def({ id: 'hunter2', name: 'Ski Bowman', plural: 'Ski Bowmen', faction: 'norse', level: 2, attack: 7, defense: 3, minDmg: 2, maxDmg: 4, hp: 10, speed: 5, growth: 9, cost: { gold: 130 }, shots: 16, skis: true, line: 'hunter', tier: 2 }),
  hunter3: def({ id: 'hunter3', name: 'Archer of Ullr', plural: 'Archers of Ullr', faction: 'norse', level: 2, attack: 8, defense: 4, minDmg: 3, maxDmg: 4, hp: 12, speed: 6, growth: 9, cost: { gold: 170 }, shots: 20, skis: true, shootsTwice: true, line: 'hunter', tier: 3 }),
  berserker2: def({ id: 'berserker2', name: 'Bear Warrior', plural: 'Bear Warriors', faction: 'norse', level: 3, attack: 11, defense: 5, minDmg: 3, maxDmg: 7, hp: 25, speed: 7, growth: 7, cost: { gold: 240 }, rage: 1, line: 'berserker', tier: 2 }),
  berserker3: def({ id: 'berserker3', name: 'Berserker of Odin', plural: 'Berserkers of Odin', faction: 'norse', level: 3, attack: 13, defense: 6, minDmg: 4, maxDmg: 8, hp: 28, speed: 8, growth: 7, cost: { gold: 290 }, rage: 2, line: 'berserker', tier: 3 }),
  dwarf2: def({ id: 'dwarf2', name: 'Dwarf Guard', plural: 'Dwarf Guards', faction: 'norse', level: 4, attack: 11, defense: 14, minDmg: 6, maxDmg: 9, hp: 42, speed: 4, growth: 4, cost: { gold: 360 }, line: 'dwarf', tier: 2 }),
  dwarf3: def({ id: 'dwarf3', name: 'Rune-Forged Dwarf', plural: 'Rune-Forged Dwarves', faction: 'norse', level: 4, attack: 12, defense: 16, minDmg: 7, maxDmg: 10, hp: 48, speed: 5, growth: 4, cost: { gold: 430 }, shieldWall: true, line: 'dwarf', tier: 3 }),
  warBoar2: def({ id: 'warBoar2', name: 'Iron Boar', plural: 'Iron Boars', faction: 'norse', level: 5, attack: 14, defense: 11, minDmg: 11, maxDmg: 15, hp: 50, speed: 6, growth: 3, cost: { gold: 450 }, wide: true, line: 'warBoar', tier: 2 }),
  warBoar3: def({ id: 'warBoar3', name: 'Boar of Freyr', plural: 'Boars of Freyr', faction: 'norse', level: 5, attack: 16, defense: 12, minDmg: 12, maxDmg: 16, hp: 55, speed: 7, growth: 3, cost: { gold: 520 }, wide: true, guardian: true, line: 'warBoar', tier: 3 }),
  valkyrie2: def({ id: 'valkyrie2', name: 'Battle Valkyrie', plural: 'Battle Valkyries', faction: 'norse', level: 6, attack: 17, defense: 16, minDmg: 18, maxDmg: 26, hp: 100, speed: 10, growth: 2, cost: { gold: 1200 }, flies: true, wide: true, line: 'valkyrie', tier: 2 }),
  valkyrie3: def({ id: 'valkyrie3', name: 'Valkyrie of Odin', plural: 'Valkyries of Odin', faction: 'norse', level: 6, attack: 19, defense: 17, minDmg: 20, maxDmg: 28, hp: 115, speed: 11, growth: 2, cost: { gold: 1500 }, flies: true, wide: true, morale: 1, line: 'valkyrie', tier: 3 }),
  dragon2: def({ id: 'dragon2', name: 'Ice Dragon', plural: 'Ice Dragons', faction: 'norse', level: 7, attack: 23, defense: 20, minDmg: 45, maxDmg: 55, hp: 230, speed: 13, growth: 1, cost: { gold: 3600, gems: 2 }, flies: true, breath: true, wide: true, line: 'dragon', tier: 2 }),
  dragon3: def({ id: 'dragon3', name: 'Fáfnir’s Kin', plural: 'Fáfnir’s Kin', faction: 'norse', level: 7, attack: 26, defense: 22, minDmg: 50, maxDmg: 60, hp: 270, speed: 15, growth: 1, cost: { gold: 4400, gems: 3 }, flies: true, breath: true, wide: true, noRetaliation: true, line: 'dragon', tier: 3 }),
  // The Norse Epic (4, an Arena of Heroes) and Legendary (5, Mímir's Well) ranks, from the Rarity formula.
  shieldmaiden4: def({ id: 'shieldmaiden4', name: 'Lagertha’s Guard', plural: 'Lagertha’s Guards', faction: 'norse', level: 1, attack: 9, defense: 9, minDmg: 3, maxDmg: 5, hp: 18, speed: 6, growth: 14, cost: { gold: 130 }, cleave: true, line: 'shieldmaiden', tier: 4 }),
  shieldmaiden5: def({ id: 'shieldmaiden5', name: 'Einherjar', plural: 'Einherjar', faction: 'norse', level: 1, attack: 10, defense: 11, minDmg: 4, maxDmg: 6, hp: 21, speed: 7, growth: 14, cost: { gold: 170 }, cleave: true, rebirth: 'half', line: 'shieldmaiden', tier: 5 }),
  hunter4: def({ id: 'hunter4', name: 'Huntsman of Skadi', plural: 'Huntsmen of Skadi', faction: 'norse', level: 2, attack: 9, defense: 5, minDmg: 4, maxDmg: 5, hp: 14, speed: 7, growth: 9, cost: { gold: 230 }, shots: 20, skis: true, shootsTwice: true, line: 'hunter', tier: 4 }),
  hunter5: def({ id: 'hunter5', name: 'Archer of Ýdalir', plural: 'Archers of Ýdalir', faction: 'norse', level: 2, attack: 10, defense: 6, minDmg: 5, maxDmg: 6, hp: 16, speed: 8, growth: 9, cost: { gold: 310 }, shots: 20, skis: true, shootsTwice: true, noMeleePenalty: true, line: 'hunter', tier: 5 }),
  berserker4: def({ id: 'berserker4', name: 'Úlfheðinn', plural: 'Úlfheðnar', faction: 'norse', level: 3, attack: 15, defense: 7, minDmg: 5, maxDmg: 9, hp: 31, speed: 9, growth: 7, cost: { gold: 365 }, rage: 2, line: 'berserker', tier: 4 }),
  berserker5: def({ id: 'berserker5', name: 'Chosen of Odin', plural: 'Chosen of Odin', faction: 'norse', level: 3, attack: 17, defense: 8, minDmg: 6, maxDmg: 10, hp: 34, speed: 10, growth: 7, cost: { gold: 465 }, rage: 2, noRetaliation: true, line: 'berserker', tier: 5 }),
  dwarf4: def({ id: 'dwarf4', name: 'Dwarf Lord', plural: 'Dwarf Lords', faction: 'norse', level: 4, attack: 13, defense: 18, minDmg: 8, maxDmg: 11, hp: 54, speed: 6, growth: 4, cost: { gold: 535 }, shieldWall: true, line: 'dwarf', tier: 4 }),
  dwarf5: def({ id: 'dwarf5', name: 'Son of Ivaldi', plural: 'Sons of Ivaldi', faction: 'norse', level: 4, attack: 14, defense: 20, minDmg: 9, maxDmg: 12, hp: 60, speed: 7, growth: 4, cost: { gold: 675 }, shieldWall: true, guardian: true, line: 'dwarf', tier: 5 }),
  warBoar4: def({ id: 'warBoar4', name: 'Hildisvíni', plural: 'Hildisvíni', faction: 'norse', level: 5, attack: 18, defense: 13, minDmg: 13, maxDmg: 17, hp: 60, speed: 8, growth: 3, cost: { gold: 625 }, wide: true, guardian: true, line: 'warBoar', tier: 4 }),
  warBoar5: def({ id: 'warBoar5', name: 'Gullinbursti', plural: 'Gullinbursti', faction: 'norse', level: 5, attack: 20, defense: 14, minDmg: 14, maxDmg: 18, hp: 65, speed: 9, growth: 3, cost: { gold: 765 }, wide: true, guardian: true, cleave: true, line: 'warBoar', tier: 5 }),
  valkyrie4: def({ id: 'valkyrie4', name: 'Valkyrie Captain', plural: 'Valkyrie Captains', faction: 'norse', level: 6, attack: 21, defense: 18, minDmg: 22, maxDmg: 30, hp: 130, speed: 12, growth: 2, cost: { gold: 1950, gems: 1 }, flies: true, wide: true, morale: 1, line: 'valkyrie', tier: 4 }),
  valkyrie5: def({ id: 'valkyrie5', name: 'Valkyrie of Fólkvangr', plural: 'Valkyries of Fólkvangr', faction: 'norse', level: 6, attack: 23, defense: 19, minDmg: 24, maxDmg: 32, hp: 145, speed: 13, growth: 2, cost: { gold: 2550, gems: 2 }, flies: true, wide: true, morale: 1, noRetaliation: true, line: 'valkyrie', tier: 5 }),
  dragon4: def({ id: 'dragon4', name: 'Elder Dragon', plural: 'Elder Dragons', faction: 'norse', level: 7, attack: 29, defense: 24, minDmg: 55, maxDmg: 65, hp: 310, speed: 16, growth: 1, cost: { gold: 5600, gems: 4 }, flies: true, breath: true, wide: true, noRetaliation: true, line: 'dragon', tier: 4 }),
  dragon5: def({ id: 'dragon5', name: 'Níðhöggr', plural: 'Níðhöggr', faction: 'norse', level: 7, attack: 32, defense: 26, minDmg: 60, maxDmg: 70, hp: 350, speed: 17, growth: 1, cost: { gold: 7200, gems: 5 }, flies: true, breath: true, wide: true, noRetaliation: true, poison: 0.1, line: 'dragon', tier: 5 }),
  // The north's neutrals (chapter 3). Growth and cost set their strength for the rival, as the other neutrals'.
  wolfWinter: def({ id: 'wolfWinter', name: 'Winter Wolf', plural: 'Winter Wolves', faction: 'neutral', level: 2, attack: 6, defense: 3, minDmg: 2, maxDmg: 4, hp: 10, speed: 7, growth: 8, cost: { gold: 100 }, wide: true }),
  draugr: def({ id: 'draugr', name: 'Draugr', plural: 'Draugar', faction: 'neutral', level: 2, attack: 6, defense: 5, minDmg: 2, maxDmg: 3, hp: 14, speed: 3, growth: 8, cost: { gold: 110 }, undead: true }),
  troll: def({ id: 'troll', name: 'Troll', plural: 'Trolls', faction: 'neutral', level: 5, attack: 13, defense: 9, minDmg: 10, maxDmg: 14, hp: 45, speed: 4, growth: 3, cost: { gold: 500 }, regen: 5 }),
  barrowKing: def({ id: 'barrowKing', name: 'Barrow King', plural: 'Barrow Kings', faction: 'neutral', level: 5, attack: 12, defense: 12, minDmg: 10, maxDmg: 14, hp: 50, speed: 4, growth: 2, cost: { gold: 600 }, undead: true, curse: 0.25 }),
  frostGiant: def({ id: 'frostGiant', name: 'Frost Giant', plural: 'Frost Giants', faction: 'neutral', level: 6, attack: 17, defense: 14, minDmg: 18, maxDmg: 26, hp: 130, speed: 5, growth: 1, cost: { gold: 1500 }, wide: true, guardian: true }),
  skoll: def({ id: 'skoll', name: 'Sköll', plural: 'Sköll', faction: 'neutral', level: 7, attack: 22, defense: 18, minDmg: 35, maxDmg: 45, hp: 240, speed: 10, growth: 1, cost: { gold: 3500 }, hexes: 3, cleave: true }),
  // The Norse war machine: a battering ram that breaks the gate, and only the gate.
  ram: def({ id: 'ram', name: 'Ram', plural: 'Rams', faction: 'machine', level: 1, attack: 0, defense: 10, minDmg: 0, maxDmg: 0, hp: 1000, speed: 20, growth: 0, cost: { gold: 1500 }, machine: 'ram', ram: { round: 3 }, retaliations: 0 }),
  ram2: def({ id: 'ram2', name: 'Iron Ram', plural: 'Iron Rams', faction: 'machine', level: 2, attack: 0, defense: 10, minDmg: 0, maxDmg: 0, hp: 1000, speed: 20, growth: 0, cost: { gold: 3000 }, machine: 'ram', ram: { round: 2 }, retaliations: 0 }),
  ram3: def({ id: 'ram3', name: 'Ram of the Sea-Kings', plural: 'Rams of the Sea-Kings', faction: 'machine', level: 3, attack: 0, defense: 10, minDmg: 0, maxDmg: 0, hp: 1000, speed: 20, growth: 0, cost: { gold: 5000 }, machine: 'ram', ram: { round: 2, towers: true }, retaliations: 0 }),
} as const;

export type CreatureId =
  | 'spearman' | 'bowman' | 'griffin' | 'swordsman' | 'monk' | 'lancer' | 'seraph'
  | 'spearman2' | 'spearman3' | 'bowman2' | 'bowman3' | 'griffin2' | 'griffin3' | 'swordsman2' | 'swordsman3'
  | 'monk2' | 'monk3' | 'lancer2' | 'lancer3' | 'seraph2' | 'seraph3'
  | 'spearman4' | 'spearman5' | 'bowman4' | 'bowman5' | 'griffin4' | 'griffin5' | 'swordsman4' | 'swordsman5'
  | 'monk4' | 'monk5' | 'lancer4' | 'lancer5' | 'seraph4' | 'seraph5'
  | 'goblin' | 'skeleton' | 'wolf' | 'bandit' | 'ogre'
  | 'boar' | 'stymphalian' | 'hydra' | 'basilisk'
  | 'catapult' | 'catapult2' | 'catapult3' | 'ramp' | 'ramp2' | 'ramp3'
  | 'levy' | 'nubian' | 'jackal' | 'chariot' | 'mummy' | 'sphinx' | 'bennu'
  | 'levy2' | 'levy3' | 'nubian2' | 'nubian3' | 'jackal2' | 'jackal3' | 'chariot2' | 'chariot3'
  | 'mummy2' | 'mummy3' | 'sphinx2' | 'sphinx3' | 'bennu2' | 'bennu3'
  | 'levy4' | 'levy5' | 'nubian4' | 'nubian5' | 'jackal4' | 'jackal5' | 'chariot4' | 'chariot5'
  | 'mummy4' | 'mummy5' | 'sphinx4' | 'sphinx5' | 'bennu4' | 'bennu5'
  | 'hyena' | 'raider' | 'scorpion' | 'crocodile' | 'petsuchos' | 'cobra' | 'lion' | 'apep' | 'gigas' | 'ammit'
  | 'shieldmaiden' | 'hunter' | 'berserker' | 'dwarf' | 'warBoar' | 'valkyrie' | 'dragon'
  | 'shieldmaiden2' | 'shieldmaiden3' | 'hunter2' | 'hunter3' | 'berserker2' | 'berserker3' | 'dwarf2' | 'dwarf3'
  | 'warBoar2' | 'warBoar3' | 'valkyrie2' | 'valkyrie3' | 'dragon2' | 'dragon3'
  | 'shieldmaiden4' | 'shieldmaiden5' | 'hunter4' | 'hunter5' | 'berserker4' | 'berserker5' | 'dwarf4' | 'dwarf5'
  | 'warBoar4' | 'warBoar5' | 'valkyrie4' | 'valkyrie5' | 'dragon4' | 'dragon5'
  | 'wolfWinter' | 'draugr' | 'troll' | 'barrowKing' | 'frostGiant' | 'skoll'
  | 'ram' | 'ram2' | 'ram3';
export const CREATURE_IDS = Object.keys(CREATURES) as CreatureId[];

export const creature = (id: CreatureId): CreatureDef => CREATURES[id];
/** The war machines, worst first. */
export const MACHINES = ['catapult', 'catapult2', 'catapult3', 'ramp', 'ramp2', 'ramp3', 'ram', 'ram2', 'ram3'] as const satisfies readonly CreatureId[];
export type MachineId = (typeof MACHINES)[number];
export const isMachine = (id: CreatureId): boolean => !!creature(id).machine;
/** Whether a company can man a tower: a shooter that takes one hex. */
export const canManTower = (id: CreatureId): boolean => !!creature(id).shots && sizeOf(id) === 1 && !creature(id).machine;
/** How many hexes a unit of this kind fills on the battlefield: its `hexes`, else 2 for `wide`, else 1. */
export const sizeOf = (id: CreatureId): 1 | 2 | 3 => creature(id).hexes ?? (creature(id).wide ? 2 : 1);
export const isCreatureId = (v: unknown): v is CreatureId => typeof v === 'string' && (CREATURE_IDS as string[]).includes(v);

/** The base unit of `id`'s line (itself for a base unit). */
export const lineOf = (id: CreatureId): CreatureId => creature(id).line ?? id;
/** Which of its line's five levels `id` is: 1 (base) to 5 (Legendary). */
export const tierOf = (id: CreatureId): 1 | 2 | 3 | 4 | 5 => creature(id).tier ?? 1;
/** A line's units, base first: [base] for a unit without upgrades. */
export const lineUnits = (base: CreatureId): CreatureId[] =>
  [base, ...CREATURE_IDS.filter((c) => creature(c).line === base).sort((a, b) => tierOf(a) - tierOf(b))];

/** The size words for a map monster's count, H3 style. */
const SIZE_WORDS: readonly (readonly [number, string])[] = [
  [1000, 'a legion of'], [500, 'zounds of'], [250, 'a swarm of'], [100, 'a throng of'], [50, 'a horde of'], [20, 'lots of'], [10, 'a pack of'], [5, 'several'], [1, 'a few'],
];

/** "a pack of Wolves": how a map monster reads before you fight it. */
export function sizeWord(count: number): string {
  return (SIZE_WORDS.find(([min]) => count >= min) ?? SIZE_WORDS[SIZE_WORDS.length - 1]!)[1];
}

/** What a creature's ways of fighting add to its plain stats. */
const traitsWorth = (c: CreatureDef): number =>
  (c.shots ? 1.3 : 1) * (c.flies ? 1.15 : 1) * (c.charge ? 1.1 : 1) * (c.swoop ? 1.1 : 1) * (c.cleave ? 1.25 : 1) * (c.regen ? 1.15 : 1) * (1 + (c.petrify ?? 0))
  * (1 + (c.curse ?? 0) * 0.4) * (c.rebirth ? (c.rebirth === 'all' ? 1.3 : 1.15) : 1) * (c.guardian ? 1.1 : 1) * (c.shieldWall ? 1.05 : 1) * (c.noRangePenalty ? 1.05 : 1) * (c.noMeleePenalty ? 1.05 : 1) * (1 + (c.poison ?? 0))
  * (1 + (c.rage ?? 0) * 0.1) * (c.breath ? 1.15 : 1) * (c.shootsTwice ? 1.2 : 1) * (c.skis ? 1.05 : 1);

/** A rough fighting strength, for the AI and for monsters' join/flee checks. */
export function strengthOf(id: CreatureId, count: number): number {
  const c = creature(id);
  const dmg = (c.minDmg + c.maxDmg) / 2;
  return count * Math.sqrt(c.hp * dmg * (1 + (c.attack + c.defense) / 20)) * traitsWorth(c);
}
