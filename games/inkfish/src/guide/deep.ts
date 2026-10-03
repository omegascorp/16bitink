import type { GuideEntry } from './types';

/** Fact cards for the deep-sea fish: twilight zone to the trench (chapters 7 to 10), plus their giants. */
export const DEEP_GUIDE = {
  // ---------------------------------------------------------------- twilight
  // Representative species: Cyclothone braueri, a common twilight-zone bristlemouth.
  bristlemouth: {
    latin: 'Cyclothone braueri',
    length: 'up to 4.6 cm',
    weight: 'under 1 g',
    lifespan: 'about 1-2 years',
    speed: 'slow drifter; hangs still in the water',
    depth: '200-900 m (found 10-2,000 m)',
    range: 'Atlantic, Indian and Pacific Oceans; open sea',
    eats: 'copepods, tiny crustaceans',
    fact: 'Bristlemouths may number in the hundreds of trillions, making them the most common vertebrates on Earth.',
  },
  // Representative species: Benthalbella dentata, the northern pearleye.
  pearleye: {
    latin: 'Benthalbella dentata',
    length: 'up to 26 cm',
    weight: 'not recorded',
    lifespan: 'unknown',
    speed: 'not measured; ambush hunter',
    depth: '500-1,000 m (found 98-3,400 m)',
    range: 'North Pacific, Alaska to Mexico and Japan',
    eats: 'small fish, squid, crustaceans',
    fact: 'Its tube eyes point upward to spot the dark outlines of prey against the faint light from above.',
  },
  barreleye: {
    latin: 'Macropinna microstoma',
    length: 'up to 15 cm',
    weight: 'not recorded',
    lifespan: 'unknown',
    speed: 'hovers almost motionless on big fins',
    depth: '600-800 m',
    range: 'North Pacific, Bering Sea to Japan and Baja',
    eats: 'small crustaceans, jellies, siphonophore catch',
    fact: 'Its glowing green eyes sit inside a clear, fluid-filled head and can rotate to look up or forward.',
  },
  // Representative species: Evermannella balbo, the Balbo sabretooth.
  sabertooth: {
    latin: 'Evermannella balbo',
    length: 'up to 17 cm',
    weight: 'not recorded',
    lifespan: 'unknown',
    speed: 'not measured; ambush hunter',
    depth: '400-1,000 m (found from 100 m)',
    range: 'Atlantic Ocean and Mediterranean; open sea',
    eats: 'small fish, squid, crustaceans',
    fact: 'A deep-sea cousin of lizardfish, its tube eyes peer up for prey outlined by faint light above.',
  },
  // Scaly dragonfish: matches the art (hexagon scale pattern, fins far back); the loosejaw is the player fish.
  dragonfish: {
    latin: 'Stomias boa',
    length: 'up to ~32 cm',
    weight: 'not recorded',
    lifespan: 'unknown',
    speed: 'not measured; slow drifter, sudden lunge',
    depth: '200-1,500 m (rises at night)',
    range: 'Temperate and subtropical oceans worldwide',
    eats: 'lanternfish, small fish, shrimp',
    fact: 'It dangles a glowing barbel from its chin as a lure, and climbs hundreds of metres each night to feed.',
  },

  // ---------------------------------------------------------------- midnight
  // Representative species: Poromitra crassiceps, the crested bigscale.
  bigscale: {
    latin: 'Poromitra crassiceps',
    length: 'up to 16 cm',
    weight: 'not recorded',
    lifespan: 'unknown',
    speed: 'slow swimmer',
    depth: '750-2,700 m (found from 164 m)',
    range: 'Atlantic, Indian and Pacific Oceans; open sea',
    eats: 'copepods, krill, small crustaceans',
    fact: 'Its spongy head is riddled with sensory pores that feel the tiny movements of prey in the dark.',
  },
  fangtooth: {
    latin: 'Anoplogaster cornuta',
    length: 'up to 16-18 cm',
    weight: 'not recorded',
    lifespan: 'unknown',
    speed: 'slow swimmer; waits for prey',
    depth: '500-2,000 m (found to ~5,000 m)',
    range: 'Tropical and temperate oceans worldwide',
    eats: 'fish, squid, crustaceans',
    fact: 'Its lower fangs are so long that two sockets beside its brain let it close its mouth.',
  },
  gulper: {
    latin: 'Eurypharynx pelecanoides',
    length: 'up to 1 m',
    weight: 'not recorded; mostly mouth and tail',
    lifespan: 'unknown',
    speed: 'slow; wriggles like an eel',
    depth: '1,200-1,400 m (found 500-7,600 m)',
    range: 'Tropical and temperate oceans worldwide',
    eats: 'small crustaceans, small fish, squid',
    fact: 'Despite a mouth that could swallow big fish, it mostly eats tiny shrimp; its tail tip glows.',
  },
  // Representative species: Idiacanthus atlanticus, the black dragonfish.
  blackdragon: {
    latin: 'Idiacanthus atlanticus',
    length: 'females up to ~40 cm; males ~5 cm',
    weight: 'not recorded',
    lifespan: 'unknown',
    speed: 'not measured; lunging ambusher',
    depth: '500-2,000 m (females rise at night)',
    range: 'Southern Ocean and southern temperate seas',
    eats: 'small fish, crustaceans',
    fact: 'Its larvae have eyes on stalks up to a third of their body length.',
  },
  // Representative species: Cetostoma regani, the pink flabby whalefish.
  whalefish: {
    latin: 'Cetostoma regani',
    length: 'up to 25 cm',
    weight: 'not recorded',
    lifespan: 'unknown',
    speed: 'not measured; slow, flabby swimmer',
    depth: '700-1,200 m by day (110-700 m at night)',
    range: 'Tropical and subtropical oceans worldwide',
    eats: 'crustaceans, small fish',
    fact: 'Its larvae, males and females looked so different they were once sorted into three separate families.',
  },
  // ---------------------------------------------------------------- abyss
  // Representative species: the abyssal grenadier, the classic deep-sea rattail.
  rattail: {
    latin: 'Coryphaenoides armatus',
    length: 'up to 1 m',
    weight: 'not well recorded',
    lifespan: 'unknown',
    speed: 'slow cruiser near the seafloor',
    depth: '2,000-4,700 m (found 280-5,180 m)',
    range: 'Abyssal plains of all oceans except the Arctic',
    eats: 'fish, squid, crustaceans, carrion',
    fact: 'It is often among the first fish to arrive when bait or a dead whale lands on the abyssal floor.',
  },
  tripodfish: {
    latin: 'Bathypterois grallator',
    length: 'up to 43 cm',
    weight: 'not recorded',
    lifespan: 'unknown',
    speed: 'stands still on its fins; swims rarely',
    depth: '880-4,720 m',
    range: 'Atlantic, Indian and Pacific Oceans; seafloor',
    eats: 'copepods, small drifting crustaceans',
    fact: 'It perches on three stiff fin rays facing the current, catching food drifting past.',
  },
  // Representative species: the Galathea cusk-eel, once the deepest fish ever caught.
  cuskeel: {
    latin: 'Abyssobrotula galatheae',
    length: 'up to ~17 cm',
    weight: 'not recorded',
    lifespan: 'unknown',
    speed: 'not measured; eel-like wriggler',
    depth: '3,110-7,965 m',
    range: 'Deep trenches and abyss of all major oceans',
    eats: 'unknown; likely small bottom animals',
    fact: 'One trawled from the Puerto Rico Trench in 1970 long held the record as the deepest fish ever caught.',
  },
  // Representative species: Bathysaurus mollis, the highfin deep-sea lizardfish.
  lizardfish: {
    latin: 'Bathysaurus mollis',
    length: 'up to 78 cm',
    weight: 'not recorded',
    lifespan: 'unknown',
    speed: 'sits still, then lunges',
    depth: '2,000-4,900 m (found from 1,550 m)',
    range: 'Abyssal floor of all oceans',
    eats: 'fish, squid, shrimp',
    fact: 'Each fish is both male and female, handy where a mate may be hard to find.',
  },
  // Representative species: Halosauropsis macrochir, the abyssal halosaur.
  halosaur: {
    latin: 'Halosauropsis macrochir',
    length: 'up to ~76 cm',
    weight: 'not recorded',
    lifespan: 'unknown',
    speed: 'slow; noses along the bottom',
    depth: '1,100-3,300 m',
    range: 'Continental slopes and abyss of all oceans',
    eats: 'worms, crustaceans, echinoderms',
    fact: 'Halosaurs are distant cousins of eels and start life as flat, see-through eel-like larvae.',
  },
  // ---------------------------------------------------------------- trench
  blobfish: {
    latin: 'Psychrolutes marcidus',
    length: 'up to 30 cm',
    weight: 'not well recorded',
    lifespan: 'unknown',
    speed: 'floats just above the seafloor',
    depth: '600-1,200 m',
    range: 'Off southeast Australia and New Zealand',
    eats: 'crabs, sea urchins, molluscs, anything drifting by',
    fact: 'It only looks like a blob out of water; at depth, pressure holds it in a normal fish shape.',
  },
  // Representative species: Hydrolagus affinis, a deep ghost shark (chimaeras do not reach the hadal zone).
  ghostshark: {
    latin: 'Hydrolagus affinis',
    length: 'up to 1.3 m',
    weight: 'not recorded',
    lifespan: 'unknown',
    speed: 'slow glider; flaps its big pectoral fins',
    depth: '300-3,000 m',
    range: 'North Atlantic, slopes and Mid-Atlantic Ridge',
    eats: 'crabs, molluscs, worms, small fish',
    fact: 'Ghost sharks split from true sharks around 400 million years ago and carry a venomous spine.',
  },
  // Representative species: Nemichthys scolopaceus, the slender snipe eel.
  snipeeel: {
    latin: 'Nemichthys scolopaceus',
    length: 'up to 1.3 m',
    weight: 'not recorded; very thin',
    lifespan: 'unknown',
    speed: 'hangs head-down; slow undulation',
    depth: '100-1,000 m (found to 4,300 m)',
    range: 'Tropical and temperate oceans worldwide',
    eats: 'shrimp and krill snagged on its teeth',
    fact: 'Its beak-like jaws curve apart and never close; they likely snag shrimp by their long antennae.',
  },
  // ---------------------------------------------------------------- giants
  oarfish: {
    latin: 'Regalecus glesne',
    length: 'up to 8 m',
    weight: 'up to 272 kg',
    lifespan: 'unknown',
    speed: 'slow; ripples its long dorsal fin',
    depth: '20-1,000 m',
    range: 'Tropical and temperate oceans worldwide',
    eats: 'krill, small shrimp, small fish, squid',
    fact: 'The longest bony fish in the sea, it often hangs upright in the water, head pointing up.',
  },
  // Representative species: Pacific sleeper shark (matches the art); the Greenland shark is its cousin.
  sleepershark: {
    latin: 'Somniosus pacificus',
    length: 'up to 4.4 m measured (maybe 7 m)',
    weight: 'several hundred kg; max not recorded',
    lifespan: 'unknown',
    speed: '~1 km/h cruising; among the slowest fish',
    depth: '0-2,200 m',
    range: 'North Pacific and Arctic edge, cold water',
    eats: 'fish, squid, octopus, seals, carrion',
    fact: 'Its cousin the Greenland shark may live about 400 years, the longest of any known vertebrate.',
  },
  goblinshark: {
    latin: 'Mitsukurina owstoni',
    length: 'up to ~3.8 m (maybe 6 m)',
    weight: 'up to ~210 kg',
    lifespan: 'unknown',
    speed: 'slow swimmer; jaws shoot out at 3 m/s',
    depth: '270-960 m (found 30-1,300 m)',
    range: 'Patchy worldwide; most often off Japan',
    eats: 'fish, squid, crustaceans',
    fact: 'Its jaws catapult forward to grab prey, the fastest and farthest jaw launch of any shark.',
  },
  coelacanth: {
    latin: 'Latimeria chalumnae',
    length: 'up to 2 m',
    weight: 'up to ~100 kg',
    lifespan: 'up to ~100 years',
    speed: 'slow drifter; paddles its lobed fins',
    depth: '150-700 m (rests in caves by day)',
    range: 'West Indian Ocean: Comoros, Mozambique, S Africa',
    eats: 'fish, squid, octopus',
    fact: 'Thought extinct for 66 million years until a living one was caught off South Africa in 1938.',
  },
  giantsquid: {
    latin: 'Architeuthis dux',
    length: 'up to ~13 m with tentacles (females)',
    weight: 'up to ~275 kg',
    lifespan: 'probably under 5 years',
    speed: 'slow cruiser; jets backwards in bursts',
    depth: '300-1,000 m',
    range: 'All oceans; most often found off New Zealand and Japan',
    eats: 'deep-sea fish, other squid',
    fact: 'Its eyes are up to 27 cm across, the biggest of any animal, and it was first filmed alive only in 2004.',
  },
} as const satisfies Record<
  | 'bristlemouth'
  | 'pearleye'
  | 'barreleye'
  | 'sabertooth'
  | 'dragonfish'
  | 'bigscale'
  | 'fangtooth'
  | 'gulper'
  | 'blackdragon'
  | 'whalefish'
  | 'rattail'
  | 'tripodfish'
  | 'cuskeel'
  | 'lizardfish'
  | 'halosaur'
  | 'blobfish'
  | 'ghostshark'
  | 'snipeeel'
  | 'oarfish'
  | 'sleepershark'
  | 'goblinshark'
  | 'coelacanth'
  | 'giantsquid',
  GuideEntry
>;
