import type { CreatureGuide } from './types';

/** Fact cards for every creature in InkCrab: the shore's crabs, critters and hunters, then the birds overhead. */
export const CREATURE_GUIDE: CreatureGuide = {
  // Beach 1: Atoll Sketchbook
  // "Hermit crab": the Caribbean hermit crab, the best-studied shell-swapper and the rivals of Wreck Cove.
  hermit: {
    latin: 'Coenobita clypeatus',
    size: 'most a few cm; big ones fist-sized',
    weight: 'not well recorded',
    lifespan: '10+ years; perhaps decades in care',
    speed: 'slow, steady walker; a good climber',
    habitat: 'land near the shore; borrowed snail shells',
    range: 'Caribbean, Florida and the Bahamas to Venezuela',
    eats: 'fruit, leaves, rotting wood, carrion',
    fact: 'Hermit crabs line up by size beside a roomy empty shell, then swap in a chain, each into the next one\'s shell.',
  },
  // "Sea slater": the sea slater of Atlantic shores, matching the art's Ligia.
  slater: {
    latin: 'Ligia oceanica',
    size: 'up to ~3 cm long',
    weight: 'not recorded; well under a gram',
    lifespan: 'up to ~3 years',
    speed: 'scuttles fast for cover when disturbed',
    habitat: 'rock crevices and strandline above high tide',
    range: 'NE Atlantic coasts of Europe',
    eats: 'seaweed, diatoms, rotting plant and animal matter',
    fact: 'A woodlouse of the sea, it breathes air and hardly swims, so it lives just above the waves, never in them.',
  },
  // "Ghost crab": the Atlantic ghost crab, the pale sprinter of sandy beaches.
  ghostcrab: {
    latin: 'Ocypode quadrata',
    size: 'shell up to ~5 cm across',
    weight: 'not recorded',
    lifespan: '~3 years',
    speed: 'sprints over 1.5 m/s, mostly sideways',
    habitat: 'deep burrows in dry sand above the tide line',
    range: 'W Atlantic beaches, Rhode Island to Brazil',
    eats: 'mole crabs, coquina clams, insects, turtle hatchlings',
    fact: 'It growls at rivals by grinding the teeth inside its stomach.',
  },
  // "Tiger beetle": the beach tiger beetles as a group, matching the art's green-and-cream wing cases.
  beetle: {
    latin: 'Cicindelinae',
    size: 'most 1-2 cm long',
    weight: 'not recorded; a fraction of a gram',
    lifespan: '1-4 years, most of it as a larva',
    speed: 'among the fastest runners of all insects',
    habitat: 'open, sunny sand: beaches, dunes, riverbanks',
    range: 'worldwide except Antarctica; ~2,800 species',
    eats: 'small insects, sand hoppers, spiders',
    fact: 'It runs so fast its eyes can\'t keep up, so it stops in quick bursts to look again for its prey.',
  },

  // Beach 2: Dune Sea
  // "Darkling beetle": the Namib fog-basking beetle, matching the art's stilt legs and black dome.
  darkling: {
    latin: 'Onymacris unguicularis',
    size: '~2 cm long',
    weight: 'not recorded; a small beetle',
    lifespan: 'not well known',
    speed: 'quick on long stilt legs over hot sand',
    habitat: 'bare dune crests and slopes',
    range: 'Namib Desert, Namibia and southern Angola',
    eats: 'wind-blown plant scraps and detritus',
    fact: 'On foggy mornings it stands on its head on a dune crest so fog drips down its back into its mouth.',
  },
  // "Antlion": pit-building antlion larvae as a group (Myrmeleon and kin), as in the art's sand pit.
  antlion: {
    latin: 'Myrmeleontidae',
    size: 'larva ~1-1.5 cm long',
    weight: 'not recorded; a fraction of a gram',
    lifespan: 'larva 1-3 years; adult weeks',
    speed: 'walks backwards; waits buried in its pit',
    habitat: 'cone-shaped pits in dry, loose sand',
    range: 'worldwide in warm, dry places; ~2,000 species',
    eats: 'ants and other insects that slip into its pit',
    fact: 'It flicks sand at insects on the pit wall, starting little landslides that tumble them into its jaws.',
  },
  // "Sandfish": the sandfish skink, the sand-swimming lizard of North Africa and Arabia.
  skink: {
    latin: 'Scincus scincus',
    size: 'up to ~20 cm long',
    weight: 'not recorded; a small, slim lizard',
    lifespan: 'not well recorded in the wild',
    speed: 'swims through sand by wriggling',
    habitat: 'loose, wind-blown sand of desert dunes',
    range: 'North Africa and the Middle East',
    eats: 'beetles, larvae and other insects',
    fact: 'It tucks its legs flat against its body and swims through loose sand by wriggling like a snake.',
  },
  // "Raven": the common raven, matching the art's shaggy throat and heavy bristled beak.
  raven: {
    latin: 'Corvus corax',
    size: 'wingspan up to ~1.5 m',
    weight: 'up to ~2 kg',
    lifespan: 'up to ~23 years wild, 40+ in captivity',
    speed: 'struts and hops; soars and tumbles in flight',
    habitat: 'deserts, coasts, mountains and tundra',
    range: 'across the Northern Hemisphere',
    eats: 'carrion, eggs, small animals, insects, scraps',
    fact: 'One of the cleverest birds: ravens solve puzzles, plan ahead, and even play games in the air.',
  },

  // Beach 3: Tide Pool Notes
  // "Shore crab": the green shore crab, as the art names it.
  shorecrab: {
    latin: 'Carcinus maenas',
    size: 'shell up to ~9 cm across',
    weight: 'not well recorded',
    lifespan: '~3-6 years',
    speed: 'quick sideways scuttle',
    habitat: 'rock pools, mudflats, estuaries, under weed',
    range: 'native NE Atlantic; invasive on five continents',
    eats: 'mussels, clams, snails, worms, small crabs',
    fact: 'It is one of the world\'s 100 worst invasive species, spreading by ship from Europe to five continents.',
  },
  // "Blenny": the shanny, the rock-pool blenny the art names.
  blenny: {
    latin: 'Lipophrys pholis',
    size: 'usually up to ~16 cm long',
    weight: 'not recorded',
    lifespan: 'several years; 10+ reported',
    speed: 'darts between rocks; hops on wet rock',
    habitat: 'rock pools and crevices on the shore',
    range: 'NE Atlantic, Norway to Morocco; Madeira',
    eats: 'barnacles, small crabs, worms, seaweed',
    fact: 'Left by the tide, it breathes air under damp seaweed for hours, and it homes back to its own crevice.',
  },
  // "Sculpin": the long-spined sea scorpion, a rock-pool sculpin, as the art names it.
  sculpin: {
    latin: 'Taurulus bubalis',
    size: 'usually under ~18 cm long',
    weight: 'not recorded',
    lifespan: 'not well recorded',
    speed: 'sits still on the bottom; sudden lunges',
    habitat: 'rock pools, weedy rocks, shallow seabed',
    range: 'NE Atlantic, Iceland and Norway to Portugal',
    eats: 'small crabs, shrimp, small fish',
    fact: 'Grabbed by a predator, it flares the long spines on its gill covers, making it a painful mouthful.',
  },
  // "Octopus": the common octopus, as the art names it.
  octopus: {
    latin: 'Octopus vulgaris',
    size: 'up to ~1.3 m with arms',
    weight: 'up to ~10 kg, usually far less',
    lifespan: '1-2 years',
    speed: 'crawls on its arms; jets away fast',
    habitat: 'dens in rocky crevices, shore to ~200 m',
    range: 'warm and temperate seas; Atlantic, Mediterranean',
    eats: 'crabs, clams, snails, fish',
    fact: 'With no bones, it can squeeze through any gap bigger than its hard beak.',
  },
  // "Gull": the European herring gull, as the art names it.
  gull: {
    latin: 'Larus argentatus',
    size: 'wingspan up to ~1.55 m',
    weight: 'up to ~1.5 kg',
    lifespan: 'up to 30+ years',
    speed: 'strides and hops; glides on the wind',
    habitat: 'coasts, harbours, cliffs, towns',
    range: 'NW Europe and Scandinavia; Baltic coasts',
    eats: 'crabs, shellfish, fish, eggs, scraps',
    fact: 'Its chicks peck the red spot on a parent\'s bill to make it cough up their food.',
  },

  // Beach 4: Mangrove Margins
  // "Fiddler crab": the porcelain fiddler crab, an Indo-Pacific Austruca like the art's.
  fiddler: {
    latin: 'Austruca annulipes',
    size: 'shell ~2 cm across',
    weight: 'not recorded',
    lifespan: '~2 years; not well recorded',
    speed: 'quick sideways dash to its burrow',
    habitat: 'burrows in sandy mud near mangroves',
    range: 'Indian Ocean coasts, East Africa to SE Asia',
    eats: 'algae, bacteria and detritus sifted from mud',
    fact: 'The male\'s big claw can be nearly half his weight; he waves it to court females and warn rivals.',
  },
  // "Mudskipper": the barred mudskipper, a widespread Periophthalmus of mangrove mud.
  mudskipper: {
    latin: 'Periophthalmus argentilineatus',
    size: 'usually under ~15 cm long',
    weight: 'not recorded; a small fish',
    lifespan: 'not well recorded',
    speed: 'skips across mud with a flick of its tail',
    habitat: 'mangrove mudflats, out of water at low tide',
    range: 'Indian Ocean and W Pacific, E Africa to Samoa',
    eats: 'insects, small crabs, worms',
    fact: 'A fish that lives mostly on land: it breathes through its skin and carries water in its gill chambers.',
  },
  // "Heron": the striated heron, as the art names it.
  heron: {
    latin: 'Butorides striata',
    size: 'wingspan up to ~60 cm',
    weight: 'around 200 g',
    lifespan: 'not well recorded',
    speed: 'stands still, then stabs like lightning',
    habitat: 'mangroves, mudflats, creeks, reefs',
    range: 'tropics of Africa, Asia, Australia, S America',
    eats: 'fish, mudskippers, crabs, insects, frogs',
    fact: 'It goes bait-fishing, dropping insects or bread on the water to lure fish within reach.',
  },
  // "Tree crab": the mangrove tree crab, as the art names it.
  treecrab: {
    latin: 'Aratus pisonii',
    size: 'shell up to ~3 cm across',
    weight: 'not recorded',
    lifespan: 'not well recorded',
    speed: 'scuttles fast up roots and trunks',
    habitat: 'mangrove roots, trunks and branches',
    range: 'tropical Americas: Florida to Brazil; E Pacific',
    eats: 'fresh mangrove leaves, insects, small animals',
    fact: 'It lives up in the trees eating mangrove leaves, and comes down mainly to release its larvae into the sea.',
  },

  // Beach 5: Ash & Basalt
  // "Lava lizard": the Galapagos lava lizard, the islands' most widespread Microlophus.
  lavalizard: {
    latin: 'Microlophus albemarlensis',
    size: '~15-25 cm with tail; males bigger',
    weight: 'not recorded; a small lizard',
    lifespan: 'not well recorded',
    speed: 'quick dashes between lava rocks',
    habitat: 'lava fields, rocky shores, dry scrub',
    range: 'Galapagos Islands only',
    eats: 'insects, spiders, some leaves and flowers',
    fact: 'Males do push-ups on the rocks to show off and to warn rivals off their patch of lava.',
  },
  // "Sally Lightfoot crab": Grapsus grapsus, as the art names it.
  sallycrab: {
    latin: 'Grapsus grapsus',
    size: 'shell up to ~8 cm across',
    weight: 'not recorded',
    lifespan: 'not well recorded',
    speed: 'very fast; leaps from rock to rock',
    habitat: 'wave-splashed rocks and lava shores',
    range: 'E Pacific, Mexico to Peru; Galapagos',
    eats: 'algae, carrion, small animals',
    fact: 'It picks ticks off the skin of marine iguanas, and young ones are sooty black to hide on the lava.',
  },

  // Beach 6: Fog & Kelp
  // "Kelp crab": the northern kelp crab, as the art names it.
  kelpcrab: {
    latin: 'Pugettia producta',
    size: 'shell up to ~10 cm long',
    weight: 'not recorded',
    lifespan: 'not well recorded',
    speed: 'slow climber; grips kelp with hooked legs',
    habitat: 'kelp beds, seaweed and rocky shores',
    range: 'NE Pacific, Alaska to Baja California',
    eats: 'kelp and seaweed; barnacles, mussels',
    fact: 'Hooked leg tips let it cling to kelp in surging waves, and it eats the very kelp it hides in.',
  },
  // "Dungeness crab": Metacarcinus magister, as the art names it.
  dungeness: {
    latin: 'Metacarcinus magister',
    size: 'shell up to ~25 cm across',
    weight: '~1 kg, sometimes more',
    lifespan: 'up to ~10 years',
    speed: 'walks sideways; buries itself fast',
    habitat: 'sandy bottoms, eelgrass beds, bays',
    range: 'NE Pacific, Alaska to California',
    eats: 'clams, small crabs, fish, worms',
    fact: 'Oregon\'s state crustacean, it buries itself in sand with only its eyes and antennae poking out.',
  },
  // "Raccoon": the common raccoon, a regular forager on Pacific Northwest beaches.
  raccoon: {
    latin: 'Procyon lotor',
    size: 'up to ~95 cm long with tail',
    weight: 'up to ~9 kg, rarely more',
    lifespan: 'most 2-3 years wild; 20 in captivity',
    speed: 'runs up to ~24 km/h; climbs and swims',
    habitat: 'woods, shores, marshes and towns',
    range: 'N and Central America; introduced elsewhere',
    eats: 'crabs, clams, fish, eggs, fruit, nuts',
    fact: 'Its front paws are packed with touch nerves, so it finds crabs under stones by feel alone.',
  },

  // Beach 7: Wreck Cove
  // "Porcelain crab": the green porcelain crab, a Caribbean Petrolisthes like the art's.
  porcelaincrab: {
    latin: 'Petrolisthes armatus',
    size: 'shell up to ~1.5 cm across',
    weight: 'not recorded; under a gram',
    lifespan: 'not well recorded',
    speed: 'quick sideways scuttle under rocks',
    habitat: 'under rocks, oyster reefs, shore rubble',
    range: 'W Atlantic, Florida to Brazil; spreading north',
    eats: 'plankton and detritus combed from the water',
    fact: 'Not a true crab but a cousin of hermit crabs, it sweeps food from the water with feathery mouthparts.',
  },
  // "Stone crab": the Florida stone crab, as the art names it.
  stonecrab: {
    latin: 'Menippe mercenaria',
    size: 'shell up to ~13 cm across',
    weight: 'not well recorded; heavy claws',
    lifespan: 'up to ~7 years',
    speed: 'slow walker; hides in burrows and rocks',
    habitat: 'rocky shores, oyster reefs, seagrass',
    range: 'W Atlantic, North Carolina to the Gulf of Mexico',
    eats: 'oysters, clams, snails, worms',
    fact: 'Fishers take one claw and put the crab back; it can grow the claw again over several molts.',
  },
  // "Blue crab": the Atlantic blue crab, as the art names it.
  bluecrab: {
    latin: 'Callinectes sapidus',
    size: 'shell up to ~23 cm across',
    weight: 'usually under ~0.5 kg',
    lifespan: '1-3 years, rarely 4',
    speed: 'fast swimmer with paddle-shaped back legs',
    habitat: 'bays, estuaries, seagrass, muddy shallows',
    range: 'W Atlantic, Nova Scotia to Argentina',
    eats: 'clams, snails, fish, worms, other crabs',
    fact: 'Its scientific name, Callinectes sapidus, means beautiful savory swimmer.',
  },

  // Beach 8: Monsoon Harbour
  // "Sand bubbler crab": Dotilla myctiroides, a sand bubbler of Indian shores like the art's.
  bubbler: {
    latin: 'Dotilla myctiroides',
    size: 'shell ~1 cm across',
    weight: 'not recorded; under a gram',
    lifespan: 'not well recorded',
    speed: 'quick scurry back to its burrow',
    habitat: 'wet sand of sheltered beaches and flats',
    range: 'Indian Ocean and W Pacific coasts',
    eats: 'algae and bits of food sifted from sand',
    fact: 'Each tiny sand ball is a mouthful sifted clean of food; at low tide they pattern whole beaches.',
  },
  // "Mud crab": the giant mud crab, as the art names it.
  mudcrab: {
    latin: 'Scylla serrata',
    size: 'shell up to ~25 cm across',
    weight: 'up to ~3 kg',
    lifespan: '~3-4 years',
    speed: 'walks sideways; swims with paddle legs',
    habitat: 'burrows in mangrove mud and estuaries',
    range: 'Indo-West Pacific, East Africa to Australia',
    eats: 'snails, clams, crabs, worms, carrion',
    fact: 'Its huge claws crush snail and clam shells; it shelters in a mud burrow and hunts at night.',
  },
  // "Water monitor": the Asian water monitor, as the art names it.
  monitor: {
    latin: 'Varanus salvator',
    size: 'up to ~2.5 m long',
    weight: 'up to ~20 kg, usually far less',
    lifespan: '15+ years in captivity',
    speed: 'strong swimmer; quick on land too',
    habitat: 'riverbanks, mangroves, swamps, shores',
    range: 'South and Southeast Asia',
    eats: 'fish, crabs, frogs, birds, eggs, carrion',
    fact: 'One of the biggest lizards on Earth, it can stay underwater for up to half an hour.',
  },

  // Beach 9: Frost Shingle
  // "Sea spider": the sea spiders as a group (Nymphon, Pycnogonum and kin), as the art names them.
  seaspider: {
    latin: 'Pycnogonida',
    size: 'most legspans ~1 cm; deep giants ~70 cm',
    weight: 'not recorded; most weigh next to nothing',
    lifespan: 'not well known',
    speed: 'very slow; picks its way on long legs',
    habitat: 'seaweed, rocks and pools; shore to deep sea',
    range: 'all oceans, richest in polar seas',
    eats: 'juices sucked from anemones, sponges, hydroids',
    fact: 'It has so little body that its gut runs down into its legs, and it breathes through its skin.',
  },
  // "Snow crab": Chionoecetes opilio, as the art names it, a Labrador fishery crab.
  snowcrab: {
    latin: 'Chionoecetes opilio',
    size: 'shell up to ~15 cm across',
    weight: 'up to ~1.3 kg; females far smaller',
    lifespan: 'perhaps 15-20 years',
    speed: 'walks on long, flat legs',
    habitat: 'cold mud and sand seafloor, near freezing',
    range: 'NW Atlantic, Arctic and North Pacific',
    eats: 'worms, clams, brittle stars, small crabs',
    fact: 'It lives in water barely above freezing, and once grown it stops molting for good.',
  },
  // "Arctic fox": Vulpes lagopus, as the art names it.
  arcticfox: {
    latin: 'Vulpes lagopus',
    size: 'up to ~1 m long with tail',
    weight: 'up to ~9 kg, usually 3-5 kg',
    lifespan: '3-6 years wild; longer in captivity',
    speed: 'trots far; pounces on prey under snow',
    habitat: 'tundra, sea ice and Arctic coasts',
    range: 'circumpolar Arctic, Labrador to Siberia',
    eats: 'lemmings, birds, eggs, fish, carrion',
    fact: 'Its fur is so warm it doesn\'t start to shiver until the air drops to about -70 C.',
  },

  // Beach 10: Moonlit Bay
  // "Brittle star": the brittle stars as a group (Ophiocoma, Ophiolepis and kin), as the art names them.
  brittlestar: {
    latin: 'Ophiuroidea',
    size: 'most a few cm across the disc',
    weight: 'not recorded; most a few grams',
    lifespan: 'varies; poorly known',
    speed: 'rows itself along with its arms',
    habitat: 'under rocks and in sand; shore to abyss',
    range: 'all oceans; over 2,000 species',
    eats: 'detritus, plankton, small animals',
    fact: 'Grabbed by an arm, it snaps that arm off to escape and simply grows a new one.',
  },
  // "Horn-eyed ghost crab": Ocypode ceratophthalmus, as the art names it.
  horneyed: {
    latin: 'Ocypode ceratophthalmus',
    size: 'shell up to ~5 cm across',
    weight: 'not recorded',
    lifespan: 'not well recorded',
    speed: 'fast sprinter, on the tips of its legs',
    habitat: 'burrows in sandy beaches above the tide',
    range: 'Indo-Pacific, East Africa to Hawaii',
    eats: 'small crabs, insects, carrion, turtle hatchlings',
    fact: 'It keeps its gills wet by wicking water up from damp sand through tufts of hair between its legs.',
  },
  // "Coconut crab": Birgus latro, as the art names it, the biggest crab on land.
  coconutcrab: {
    latin: 'Birgus latro',
    size: 'legspan up to ~1 m',
    weight: 'up to ~4 kg',
    lifespan: 'may live ~40-60 years',
    speed: 'slow walker; climbs palm trees',
    habitat: 'coastal forest and burrows on islands',
    range: 'Indian and Pacific Ocean islands',
    eats: 'coconuts, fruit, nuts, carrion, other crabs',
    fact: 'Young ones carry snail shells like any hermit crab, then outgrow them and grow their own armour.',
  },

  // Birds
  // "Kestrel": the common kestrel, matching the art's grey-headed, rufous-backed male.
  kestrel: {
    latin: 'Falco tinnunculus',
    size: 'wingspan up to ~82 cm',
    weight: 'up to ~300 g',
    lifespan: 'most only a few years in the wild',
    speed: 'hovers on the wind, then drops on prey',
    habitat: 'open country, dunes, coasts, farmland',
    range: 'Europe, Africa and Asia',
    eats: 'voles, mice, lizards, large insects',
    fact: 'It can see ultraviolet light, which makes the urine trails of voles glow for it.',
  },
  // "Hawk": the Galapagos hawk, as the art names it, on the Galapagos-like basalt beach.
  hawk: {
    latin: 'Buteo galapagoensis',
    size: 'wingspan up to ~1.4 m',
    weight: 'around 1 kg; females bigger',
    lifespan: 'not well recorded',
    speed: 'soars and hangs on the wind',
    habitat: 'lava fields, shores, scrub and highlands',
    range: 'Galapagos Islands only',
    eats: 'lizards, young iguanas, locusts, rats, chicks',
    fact: 'A female may have up to eight mates, and all of them help raise the chicks.',
  },
  // "Kingfisher": the belted kingfisher, as the art names it, of Pacific Northwest shores.
  kingfisher: {
    latin: 'Megaceryle alcyon',
    size: 'wingspan up to ~58 cm',
    weight: 'up to ~180 g',
    lifespan: 'not well recorded',
    speed: 'hovers, then plunges headfirst',
    habitat: 'rivers, lakes, estuaries and coasts',
    range: 'North America; winters to Central America',
    eats: 'fish, crayfish, crabs, insects',
    fact: 'Unusually for birds, the female is the more colourful one, with an extra rusty band across her belly.',
  },
  // "Osprey": Pandion haliaetus, as the art names it.
  osprey: {
    latin: 'Pandion haliaetus',
    size: 'wingspan up to ~1.8 m',
    weight: 'up to ~2 kg',
    lifespan: 'up to ~25 years',
    speed: 'hovers, then plunges feet-first',
    habitat: 'coasts, rivers and lakes with fish',
    range: 'every continent except Antarctica',
    eats: 'almost only live fish',
    fact: 'It carries its catch head-first, like a torpedo, so the fish cuts through the wind.',
  },
  // "Brahminy kite": Haliastur indus, as the art names it, over the Malabar harbour.
  brahminy: {
    latin: 'Haliastur indus',
    size: 'wingspan up to ~1.25 m',
    weight: 'up to ~670 g',
    lifespan: 'not well recorded',
    speed: 'soars and wheels in slow circles',
    habitat: 'coasts, harbours, mangroves, rivers',
    range: 'India and SE Asia to Australia',
    eats: 'fish, crabs, frogs, carrion, scraps',
    fact: 'In India it is seen as Garuda, the bird that carries the god Vishnu.',
  },
  // "Snowy owl": Bubo scandiacus, as the art names it, over the Labrador shingle.
  snowyowl: {
    latin: 'Bubo scandiacus',
    size: 'wingspan up to ~1.5 m',
    weight: 'up to ~3 kg; females bigger',
    lifespan: '~10 years wild; 28 in captivity',
    speed: 'slow, steady wingbeats; hunts by day',
    habitat: 'Arctic tundra; open coasts in winter',
    range: 'circumpolar Arctic; winters farther south',
    eats: 'lemmings, voles, hares, seabirds',
    fact: 'One owl may eat more than 1,600 lemmings in a year.',
  },
};
