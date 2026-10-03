import type { GuideEntry } from './types';

/** Fact cards for chapters 1-3: tide pool, seagrass meadow and kelp forest, plus their giants. */
export const SHALLOW_GUIDE = {
  // Tide pool
  // "Minnow": the Atlantic silverside, the classic silver shore-schooling baitfish.
  minnow: {
    latin: 'Menidia menidia',
    length: 'up to 15 cm',
    weight: 'not recorded; a slim baitfish',
    lifespan: 'up to 2 years',
    speed: 'quick schooling darter; not measured',
    depth: '0-3 m; moves offshore in winter',
    range: 'NW Atlantic, Canada to Florida; beaches, salt marshes',
    eats: 'copepods, mysids, shrimp, worms, small squid',
    fact: 'The water temperature it grows up in decides whether a silverside becomes male or female.',
  },
  // "Blenny": the tompot blenny, matching the art's branched cirri over the eyes.
  blenny: {
    latin: 'Parablennius gattorugine',
    length: 'up to 30 cm',
    weight: 'not recorded',
    lifespan: '~4 years wild, up to 9 in aquaria',
    speed: 'hops and perches on rocks; short dashes',
    depth: '3-32 m; also low-shore rock pools',
    range: 'NE Atlantic and Mediterranean; rocky shores, seaweed',
    eats: 'small crustaceans, molluscs, worms',
    fact: 'Males guard eggs from several females in a rock crevice home.',
  },
  // "Perch": the European perch, which also lives in the brackish Baltic Sea.
  perch: {
    latin: 'Perca fluviatilis',
    length: 'up to 60 cm',
    weight: 'up to 4.8 kg',
    lifespan: 'up to 22 years',
    speed: 'slow cruiser; quick dashes at prey',
    depth: '1-30 m, mostly 3-4 m',
    range: 'Europe to Siberia; lakes, rivers, brackish Baltic',
    eats: 'insect larvae, crustaceans, small fish',
    fact: 'A freshwater fish that also thrives in the brackish Baltic, hunting mostly at sunrise and sunset.',
  },
  // "Sculpin": the shorthorn sculpin, a spiny-headed shore ambusher.
  sculpin: {
    latin: 'Myoxocephalus scorpius',
    length: 'up to 78 cm, usually far smaller',
    weight: 'up to ~1.3 kg',
    lifespan: 'up to 18 years',
    speed: 'sits on the bottom; sudden lunges',
    depth: '0-450 m, mostly shallow',
    range: 'N Atlantic and Arctic, incl. Baltic; rocky coasts',
    eats: 'fish, crabs, shrimp, worms',
    fact: 'Antifreeze proteins in its blood let it survive icy Arctic water.',
  },
  // "Puffer": the northern puffer, a prickly inshore puffer of the NW Atlantic.
  puffer: {
    latin: 'Sphoeroides maculatus',
    length: 'up to 36 cm',
    weight: 'not recorded',
    lifespan: '~6 years',
    speed: 'slow; steers with small fins',
    depth: 'shallow bays to 180 m',
    range: 'NW Atlantic, Newfoundland to Florida; bays, eelgrass',
    eats: 'clams, crabs, shrimp, snails, small fish',
    fact: 'It gulps water to swell into a prickly ball; fishmongers once sold it as "sea squab".',
  },
  // "Pike": the northern pike, which also hunts the brackish Baltic coast.
  pike: {
    latin: 'Esox lucius',
    length: 'up to 1.5 m',
    weight: 'up to 28 kg',
    lifespan: 'up to 30 years',
    speed: 'lurks still; bursts to ~25 km/h',
    depth: '0-30 m, mostly 1-5 m',
    range: 'N America and Eurasia; lakes, rivers, Baltic coast',
    eats: 'fish, frogs, crayfish, ducklings',
    fact: 'It strikes from a standstill, bending into an S and accelerating faster than almost any fish.',
  },

  // Seagrass meadow
  // "Sand lance": the American sand lance.
  sandlance: {
    latin: 'Ammodytes americanus',
    length: 'up to 23 cm',
    weight: 'not recorded',
    lifespan: 'up to 12 years',
    speed: 'fast schooling swimmer; dives into sand',
    depth: '0-73 m',
    range: 'NW Atlantic, Labrador to Delaware; sandy shallows',
    eats: 'copepods, other zooplankton',
    fact: 'It dives headfirst into the sand to hide, and spends its nights buried.',
  },
  // "Pipefish": the northern pipefish of Atlantic eelgrass beds.
  pipefish: {
    latin: 'Syngnathus fuscus',
    length: 'up to 33 cm',
    weight: 'not recorded; pencil thin',
    lifespan: 'not measured',
    speed: 'slow; drifts upright, fins flutter',
    depth: '0-49 m, mostly shallow eelgrass',
    range: 'NW Atlantic and Gulf of Mexico; seagrass, estuaries',
    eats: 'copepods, amphipods, tiny shrimp',
    fact: 'Like its seahorse cousins, the male carries the eggs in a brood pouch until they hatch.',
  },
  // "Wrasse": the slippery dick, a common wrasse over W Atlantic seagrass and reefs.
  wrasse: {
    latin: 'Halichoeres bivittatus',
    length: 'up to 35 cm',
    weight: 'up to ~150 g',
    lifespan: 'not measured',
    speed: 'rows with its pectoral fins; always on the move',
    depth: '1-15 m',
    range: 'W Atlantic, N Carolina to Brazil; reefs, seagrass, sand',
    eats: 'crabs, snails, worms, small fish',
    fact: 'It buries itself in the sand to sleep at night.',
  },
  // "Filefish": the fringed filefish, a seagrass specialist with a belly flap.
  filefish: {
    latin: 'Monacanthus ciliatus',
    length: 'up to 20 cm',
    weight: 'not recorded',
    lifespan: 'not measured',
    speed: 'slow; sculls with dorsal and anal fins',
    depth: '1-50 m',
    range: 'W and E Atlantic, Caribbean; seagrass beds',
    eats: 'seagrass, algae, small crustaceans',
    fact: 'It hangs head-down among seagrass blades and shifts its colours to blend in.',
  },
  // "Mullet": the flathead grey mullet.
  mullet: {
    latin: 'Mugil cephalus',
    length: 'up to 1 m',
    weight: 'up to ~12 kg reported',
    lifespan: 'up to 16 years',
    speed: 'fast schooling swimmer; leaps clear of the water',
    depth: '0-120 m, mostly 0-10 m',
    range: 'Warm and temperate coasts worldwide; estuaries',
    eats: 'detritus, algae, tiny bottom animals',
    fact: 'Mullet often leap clear of the water, and scientists still argue about why.',
  },

  // Kelp forest
  // "Sardine": the Pacific sardine.
  sardine: {
    latin: 'Sardinops sagax',
    length: 'up to 40 cm',
    weight: 'up to ~490 g',
    lifespan: 'up to 25 years',
    speed: 'steady schooling cruiser; not measured',
    depth: '0-200 m',
    range: 'Pacific and S Indian Ocean coasts, incl. California',
    eats: 'copepods, krill, other plankton',
    fact: 'California sardine stocks crashed in the 1940s-50s, emptying the canneries of Cannery Row.',
  },
  // "Kelpfish": the giant kelpfish.
  kelpfish: {
    latin: 'Heterostichus rostratus',
    length: 'up to 61 cm',
    weight: 'not recorded',
    lifespan: 'up to 4 years',
    speed: 'sways like a kelp blade; quick short dashes',
    depth: '0-40 m',
    range: 'E Pacific, California to Baja California; kelp beds',
    eats: 'small crustaceans, molluscs, small fish',
    fact: 'It can turn green, brown or red to match the seaweed it hides in.',
  },
  // "Rockfish": the vermilion rockfish, red with dark bars radiating from the eye.
  rockfish: {
    latin: 'Sebastes miniatus',
    length: 'up to 91 cm',
    weight: 'up to 6.8 kg',
    lifespan: 'up to 60 years',
    speed: 'hovers near rocks; short bursts',
    depth: '15-470 m, mostly 50-270 m',
    range: 'NE Pacific, Alaska to Baja California; rocky reefs',
    eats: 'fish, squid, krill, crabs',
    fact: 'Like all rockfish it gives birth to live larvae, hundreds of thousands at a time.',
  },
  garibaldi: {
    latin: 'Hypsypops rubicundus',
    length: 'up to ~36 cm',
    weight: 'not recorded',
    lifespan: 'up to 57 years',
    speed: 'rows with pectoral fins; patrols its patch',
    depth: '0-30 m',
    range: 'Monterey Bay to Baja California; rocky reefs, kelp',
    eats: 'sponges, worms, other small invertebrates',
    fact: 'California\'s state marine fish; one was aged at 57 years, a damselfish record.',
  },
  // "Sheephead": the California sheephead.
  sheephead: {
    latin: 'Semicossyphus pulcher',
    length: 'up to 91 cm',
    weight: 'up to 16 kg',
    lifespan: 'up to 53 years',
    speed: 'rows with pectoral fins; steady cruiser',
    depth: '0-150 m, mostly 3-30 m',
    range: 'California to Gulf of California; kelp, rocky reefs',
    eats: 'sea urchins, crabs, lobsters, molluscs',
    fact: 'Every sheephead starts life as a female; the biggest turn into males.',
  },
  // "Eel": the wolf-eel, the eel-shaped hunter of NE Pacific kelp and rocky reefs.
  eel: {
    latin: 'Anarrhichthys ocellatus',
    length: 'up to 2.4 m',
    weight: 'up to 18 kg',
    lifespan: '~20 years wild, 25+ in aquaria',
    speed: 'slow, eel-like swimmer; stays near its den',
    depth: '1-226 m',
    range: 'N Pacific, Japan and Alaska to S California; reefs',
    eats: 'crabs, sea urchins, clams, snails, fish',
    fact: 'Not a true eel but a wolffish; pairs share one den and crunch urchins with strong jaws.',
  },

  // Chapter giants
  bass: {
    latin: 'Morone saxatilis',
    length: 'up to 2 m',
    weight: 'up to 57 kg',
    lifespan: 'up to 30 years',
    speed: 'strong migrating swimmer; sprints against currents',
    depth: 'surf zone and shallow coast; rivers',
    range: 'NW Atlantic coast, St. Lawrence to Florida; rivers',
    eats: 'fish, crabs, squid, worms',
    fact: 'It lives at sea but swims up rivers into fresh water to spawn.',
  },
  tarpon: {
    latin: 'Megalops atlanticus',
    length: 'up to 2.5 m',
    weight: 'up to 161 kg',
    lifespan: 'up to 55 years',
    speed: '~4 km/h cruising; famous leaping runs',
    depth: '0-40 m, mostly 0-15 m',
    range: 'Atlantic, Nova Scotia to Brazil, W Africa; coasts',
    eats: 'sardines, anchovies, mullet, crabs',
    fact: 'It gulps air at the surface into a lung-like swim bladder, so it survives in stale, low-oxygen water.',
  },
  lingcod: {
    latin: 'Ophiodon elongatus',
    length: 'up to 1.5 m',
    weight: 'up to 59 kg',
    lifespan: 'up to 25 years',
    speed: 'waits on rocks; fast short lunges',
    depth: '0-475 m',
    range: 'NE Pacific, Alaska to Baja California; rocky reefs',
    eats: 'fish, octopus, squid, crabs',
    fact: 'Neither a ling nor a cod but a greenling, and its raw flesh can be bright blue-green.',
  },
} as const satisfies Record<
  | 'minnow' | 'blenny' | 'perch' | 'sculpin' | 'puffer' | 'pike'
  | 'sandlance' | 'pipefish' | 'wrasse' | 'filefish' | 'mullet'
  | 'sardine' | 'kelpfish' | 'rockfish' | 'garibaldi' | 'sheephead' | 'eel'
  | 'bass' | 'tarpon' | 'lingcod',
  GuideEntry
>;
