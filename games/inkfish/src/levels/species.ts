/**
 * Every fish you can meet, from the tide pool to the trench. Pure data: the
 * art lives in art/fish/species, behaviour in scenes/game/fish.ts.
 *
 * behaviour:
 *   school  darts away from anything bigger (prey fish)
 *   cruise  swims across, bobbing gently
 *   chase   hunts the player when it's bigger (pike-like)
 *   lunge   lurks, then strikes fast at close range (ambush hunters)
 *   wave    swims in S-curves (eels)
 *   puff    inflates when you come close (puffers)
 *   hover   barely moves, drifts in place (deep-sea floaters)
 */
export type Behaviour = 'school' | 'cruise' | 'chase' | 'lunge' | 'wave' | 'puff' | 'hover';

export interface SpeciesInfo {
  /** Singular display name, lower case. */
  readonly name: string;
  readonly plural: string;
  readonly behaviour: Behaviour;
  /** Cruising speed range, world units per second. */
  readonly cruise: readonly [number, number];
  /** Touching it hurts even when it's not hunting you. */
  readonly spiky?: boolean;
  /** Eats smaller fish it bumps into. */
  readonly hunter?: boolean;
  /** Only ever appears as a chapter's giant. */
  readonly giant?: boolean;
  /** One-line field note shown when the species first appears. */
  readonly note: string;
}

const s = (
  name: string, plural: string, behaviour: Behaviour, cruise: readonly [number, number], note: string,
  flags: { spiky?: boolean; hunter?: boolean; giant?: boolean } = {},
): SpeciesInfo => ({ name, plural, behaviour, cruise, note, ...flags });

export const SPECIES_INFO = {
  // Tide pool
  minnow: s('minnow', 'minnows', 'school', [90, 140], 'Quick little snacks.'),
  blenny: s('blenny', 'blennies', 'cruise', [40, 70], 'A pool-hopper with a frowning face.'),
  perch: s('perch', 'perch', 'cruise', [60, 95], 'Striped and greedy.', { hunter: true }),
  sculpin: s('sculpin', 'sculpins', 'lunge', [25, 45], 'Sits still, then snaps.', { hunter: true }),
  puffer: s('puffer', 'puffers', 'puff', [35, 55], 'Puffs up and pricks. Never touch a big one.', { spiky: true }),
  pike: s('pike', 'pike', 'chase', [70, 100], 'Chases anything smaller.', { hunter: true }),
  // Seagrass
  sandlance: s('sand lance', 'sand lances', 'school', [100, 150], 'Slender shoals that flash like needles.'),
  pipefish: s('pipefish', 'pipefish', 'hover', [20, 35], 'A drifting twig with a snout.'),
  wrasse: s('wrasse', 'wrasses', 'cruise', [55, 85], 'Busy, bright and bold.'),
  filefish: s('filefish', 'filefish', 'cruise', [30, 50], 'Rough skin and one sharp spine.', { spiky: true }),
  mullet: s('mullet', 'mullet', 'school', [80, 120], 'Leaps and grazes in groups.'),
  // Kelp forest
  sardine: s('sardine', 'sardines', 'school', [100, 150], 'Silver crowds. Eat your fill.'),
  kelpfish: s('kelpfish', 'kelpfish', 'hover', [25, 45], 'Looks just like a kelp blade.'),
  rockfish: s('rockfish', 'rockfish', 'cruise', [45, 75], 'Spiny-finned and stubborn.', { spiky: true }),
  garibaldi: s('garibaldi', 'garibaldis', 'cruise', [50, 80], 'Bright orange and territorial.'),
  sheephead: s('sheephead', 'sheephead', 'chase', [60, 90], 'Big buck teeth that crack shells.', { hunter: true }),
  eel: s('eel', 'eels', 'wave', [100, 130], 'Slips through the dark in S-curves.', { hunter: true }),
  // Reef
  chromis: s('chromis', 'chromis', 'school', [90, 130], 'Tiny blue clouds over the coral.'),
  clownfish: s('clownfish', 'clownfish', 'cruise', [45, 70], 'Never far from home.'),
  angelfish: s('angelfish', 'angelfish', 'cruise', [40, 65], 'Tall, flat and elegant.'),
  parrotfish: s('parrotfish', 'parrotfish', 'cruise', [50, 80], 'Beaked, and it crunches coral.'),
  triggerfish: s('triggerfish', 'triggerfish', 'chase', [55, 85], 'Grumpy. Defends its patch.', { hunter: true }),
  lionfish: s('lionfish', 'lionfish', 'hover', [25, 40], 'Venomous spines. Do not touch.', { spiky: true, hunter: true }),
  boxfish: s('boxfish', 'boxfish', 'hover', [25, 40], 'A swimming box with a tiny tail.'),
  // Wreck
  herring: s('herring', 'herring', 'school', [100, 150], 'Shoals of silver around the hull.'),
  snapper: s('snapper', 'snapper', 'cruise', [60, 90], 'Snaps up anything small.', { hunter: true }),
  jack: s('jack', 'jacks', 'chase', [90, 130], 'Fast, and hunts in packs.', { hunter: true }),
  moray: s('moray', 'morays', 'wave', [60, 90], 'Lives in the portholes. Mind the teeth.', { hunter: true }),
  scorpionfish: s('scorpionfish', 'scorpionfish', 'lunge', [20, 35], 'Camouflaged and venomous.', { spiky: true, hunter: true }),
  cod: s('cod', 'cod', 'cruise', [50, 80], 'A whiskered bottom-feeder.', { hunter: true }),
  angler: s('angler', 'anglers', 'lunge', [25, 40], 'Follow the light, become dinner.', { hunter: true }),
  // Drop-off
  anchovy: s('anchovy', 'anchovies', 'school', [110, 160], 'Open-water snack clouds.'),
  mackerel: s('mackerel', 'mackerel', 'cruise', [100, 140], 'Tiger-striped speedsters.'),
  flyingfish: s('flying fish', 'flying fish', 'school', [120, 170], 'Wing-like fins for leaping.'),
  mahi: s('mahi-mahi', 'mahi-mahi', 'chase', [100, 140], 'Blunt-headed and fast.', { hunter: true }),
  bonito: s('bonito', 'bonito', 'chase', [110, 150], 'A small tuna on the hunt.', { hunter: true }),
  needlefish: s('needlefish', 'needlefish', 'cruise', [110, 150], 'A beak full of tiny teeth.', { hunter: true }),
  // Twilight
  bristlemouth: s('bristlemouth', 'bristlemouths', 'school', [70, 110], 'The most common fish on Earth.'),
  pearleye: s('pearleye', 'pearleyes', 'cruise', [40, 70], 'Eyes that look straight up.'),
  barreleye: s('barreleye', 'barreleyes', 'hover', [20, 35], 'A see-through head with tube eyes.'),
  sabertooth: s('sabertooth', 'sabertooths', 'chase', [60, 90], 'Long fangs, quick temper.', { hunter: true }),
  dragonfish: s('dragonfish', 'dragonfish', 'lunge', [35, 55], 'Glows in red, a light no one else can see.', { hunter: true }),
  // Midnight
  bigscale: s('bigscale', 'bigscales', 'school', [50, 80], 'Small and plentiful in the deep.'),
  fangtooth: s('fangtooth', 'fangtooths', 'lunge', [30, 50], 'The biggest teeth for its size.', { hunter: true }),
  gulper: s('gulper eel', 'gulper eels', 'wave', [40, 65], 'All mouth. Can swallow bigger fish.', { hunter: true }),
  blackdragon: s('black dragonfish', 'black dragonfish', 'wave', [50, 75], 'A barbel lure and a black body.', { hunter: true }),
  whalefish: s('whalefish', 'whalefish', 'cruise', [30, 50], 'Tiny eyes, huge mouth.'),
  // Abyss
  rattail: s('rattail', 'rattails', 'cruise', [35, 60], 'Big head, whip tail.', { hunter: true }),
  tripodfish: s('tripodfish', 'tripodfish', 'hover', [10, 20], 'Stands on stilts, waiting.'),
  cuskeel: s('cusk-eel', 'cusk-eels', 'wave', [40, 65], 'Lives deeper than almost anything.', { hunter: true }),
  lizardfish: s('lizardfish', 'lizardfish', 'lunge', [25, 45], 'A toothy grin from the mud.', { hunter: true }),
  halosaur: s('halosaur', 'halosaurs', 'wave', [40, 60], 'A long snout and a longer tail.'),
  // Trench
  blobfish: s('blobfish', 'blobfish', 'hover', [10, 20], 'Not so blobby at home.'),
  ghostshark: s('ghost shark', 'ghost sharks', 'cruise', [40, 60], 'Not a shark. A pale ancient wanderer.', { spiky: true }),
  snipeeel: s('snipe eel', 'snipe eels', 'wave', [50, 75], 'Thin as a thread, beak like a bird.'),
  // Giants: one per chapter, the boss of the last level.
  bass: s('striped bass', 'striped bass', 'chase', [70, 100], 'The old boss of the pool.', { hunter: true, giant: true }),
  tarpon: s('tarpon', 'tarpon', 'chase', [80, 110], 'A silver king with huge scales.', { hunter: true, giant: true }),
  lingcod: s('lingcod', 'lingcod', 'chase', [60, 90], 'A kelp-forest gape with needle teeth.', { hunter: true, giant: true }),
  grouper: s('goliath grouper', 'goliath groupers', 'chase', [50, 80], 'As big as a door.', { hunter: true, giant: true }),
  shark: s('reef shark', 'reef sharks', 'chase', [90, 120], 'Circles the wreck, always.', { hunter: true, giant: true }),
  swordfish: s('swordfish', 'swordfish', 'chase', [110, 150], 'Slashes with its bill.', { hunter: true, giant: true }),
  oarfish: s('oarfish', 'oarfish', 'wave', [50, 80], 'The longest bony fish in the sea.', { hunter: true, giant: true }),
  sleepershark: s('sleeper shark', 'sleeper sharks', 'chase', [50, 75], 'Slow, silent, enormous.', { hunter: true, giant: true }),
  goblinshark: s('goblin shark', 'goblin sharks', 'chase', [60, 90], 'Its jaws shoot forward.', { hunter: true, giant: true }),
  coelacanth: s('coelacanth', 'coelacanths', 'chase', [50, 80], 'A living fossil, older than dinosaurs.', { hunter: true, giant: true }),
} as const satisfies Record<string, SpeciesInfo>;

export type SpeciesId = keyof typeof SPECIES_INFO;

export const ALL_SPECIES = Object.keys(SPECIES_INFO) as SpeciesId[];

export const speciesInfo = (id: SpeciesId): SpeciesInfo => SPECIES_INFO[id];
