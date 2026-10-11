import type { ShellGuide } from './types';

/** Fact cards for every shell in InkCrab: the snails that grew them, beach by beach. */
export const SHELL_GUIDE: ShellGuide = {
  // Beach 1: Atoll Sketchbook
  // "Periwinkle": the common periwinkle, the shore's classic small dark snail.
  periwinkle: {
    latin: 'Littorina littorea',
    size: 'up to ~5 cm tall',
    habitat: 'rocky shores and harbour walls, mid to low tide',
    range: 'NE Atlantic; introduced to NE North America',
    eats: 'seaweeds and the film of algae on rocks',
    fact: 'It can seal its door and survive for days out of water, waiting for the tide to come back.',
  },
  // "Snail shell": the grove snail, matching the art's yellow shell with dark spiral bands; it lives on coastal dunes.
  snail: {
    latin: 'Cepaea nemoralis',
    size: '~2-2.5 cm across',
    habitat: 'coastal dunes, hedges and woods (a land snail)',
    range: 'Europe; introduced to North America',
    eats: 'dead and living plants, fungi',
    fact: 'Its shell comes in yellow, pink or brown with up to five dark bands, so no two look quite alike.',
  },
  // "Nerite": the bleeding tooth nerite, matching the art's black-and-white zigzags and red-stained teeth.
  nerite: {
    latin: 'Nerita peloronta',
    size: '~2-4 cm across',
    habitat: 'wave-splashed rocks high on the shore',
    range: 'Caribbean, Bahamas, Florida and Bermuda',
    eats: 'algae scraped off the rocks',
    fact: 'It is named for the blood-red patch around the white teeth of its opening.',
  },
  // "Top shell": the commercial top shell, matching the art's straight cone with red stripes and pearly base.
  topshell: {
    latin: 'Rochia nilotica',
    size: 'up to ~15 cm across',
    habitat: 'coral reef flats and shallow reefs',
    range: 'Indo-West Pacific; introduced to many Pacific isles',
    eats: 'algae grazed off dead coral',
    fact: 'Before plastic, its thick mother-of-pearl was cut into millions of shiny buttons.',
  },
  // "Whelk": the red whelk, a big tan high-spired whelk of sandy and muddy seabeds.
  whelk: {
    latin: 'Neptunea antiqua',
    size: 'often 10-15 cm long',
    habitat: 'sand and mud from the low shore to deep water',
    range: 'NE Atlantic, Norway to the Bay of Biscay',
    eats: 'clams, worms and dead animals',
    fact: 'Big hermit crabs move into its empty shells, often with a ragworm lodger sharing the space.',
  },
  // "Moon snail": the shark eye, matching the art's pale globe with a purplish band.
  moonsnail: {
    latin: 'Neverita duplicata',
    size: '~5-9 cm across',
    habitat: 'sandy beaches and flats, low tide and below',
    range: 'W Atlantic, Cape Cod to the Gulf of Mexico',
    eats: 'clams, drilled open',
    fact: 'It ploughs under the sand on a huge foot and drills a neat round hole into clams to eat them.',
  },
  // "Triton": the Atlantic triton's trumpet, matching the art's brown crescents and toothed orange lip.
  triton: {
    latin: 'Charonia variegata',
    size: 'often 20-30 cm long',
    habitat: 'reefs, rocks and seagrass, shallow to ~60 m',
    range: 'tropical W Atlantic, Bermuda to Brazil',
    eats: 'sea stars, sea urchins and sea cucumbers',
    fact: 'It chases down sea stars and calms them with its saliva before eating them.',
  },
  // "Tun shell": the banded tun, matching the art's thin globe ringed with brown-banded ribs.
  tun: {
    latin: 'Tonna sulcosa',
    size: 'up to ~13 cm long',
    habitat: 'sandy bottoms near reefs, shallow water',
    range: 'Indo-West Pacific',
    eats: 'sea cucumbers',
    fact: 'Tuns glide over the sand at night on a huge foot, hunting sea cucumbers to swallow whole.',
  },
  // "Conch": the queen conch, matching the art's knobbed spire and flared pink lip.
  conch: {
    latin: 'Aliger gigas',
    size: 'up to ~30 cm long',
    habitat: 'seagrass beds and sand near reefs',
    range: 'Caribbean, Bahamas, Bermuda and Florida',
    eats: 'algae and seagrass scraps',
    fact: 'It leaps along the bottom by digging in its claw-like lid, and can make rare pink pearls.',
  },

  // Beach 2: Dune Sea
  // "Desert snail": Boissier's desert snail, matching the art's chalk-white, low-spired shell.
  desertsnail: {
    latin: 'Sphincterochila boissieri',
    size: '~2 cm across',
    habitat: 'stony desert ground (a land snail)',
    range: 'Negev and Sinai deserts, Middle East',
    eats: 'lichens and algae on stones and soil',
    fact: 'Its white shell reflects most of the sun, so it can sleep sealed inside through desert summers.',
  },
  // "Turban shell": the southern African Turbo cidaris, matching the art's beaded cords and green-brown mottling.
  turban: {
    latin: 'Turbo cidaris',
    size: '~4-6 cm across',
    habitat: 'rocky shores and gullies, low tide and below',
    range: 'southern Africa',
    eats: 'seaweeds',
    fact: 'It shuts its door with a thick, stony lid, almost as hard as the shell itself.',
  },
  // "Olive shell": the tent olive, matching the art's tented zigzags; it lives where desert meets sea in the Gulf of California.
  olive: {
    latin: 'Oliva porphyria',
    size: 'up to ~12 cm long',
    habitat: 'sandy bottoms, buried by day',
    range: 'E Pacific, Gulf of California to Panama',
    eats: 'small clams, crabs and dead animals',
    fact: 'The biggest olive shell, it stays so glossy because its living mantle covers and polishes it.',
  },
  // "Murex": the ramose murex, matching the art's rows of frilled fronds.
  murex: {
    latin: 'Chicoreus ramosus',
    size: 'up to ~30 cm long',
    habitat: 'reefs, rubble and sand, shallow water',
    range: 'Indo-West Pacific, incl. the Red Sea',
    eats: 'clams, oysters and barnacles',
    fact: 'The largest murex in the world, it pries or drills open clams and oysters to eat them.',
  },
  // "Helmet shell": the tessellate helmet of West Africa, matching the art's brown-checkered dome.
  helmet: {
    latin: 'Cassis tessellata',
    size: 'large; ~10-30 cm long',
    habitat: 'sandy bottoms in shallow water',
    range: 'tropical West Africa',
    eats: 'sea urchins and sand dollars',
    fact: 'Helmets hunt sea urchins, softening a hole through the spiny shell with acid saliva.',
  },

  // Beach 3: Tide Pool Notes
  // "Flat periwinkle": the flat periwinkle, matching the art's bright yellow, flat-topped bead.
  flatwinkle: {
    latin: 'Littorina obtusata',
    size: '~1-1.5 cm across',
    habitat: 'on wrack seaweeds on sheltered rocky shores',
    range: 'N Atlantic, both sides',
    eats: 'wrack seaweeds',
    fact: 'Its yellow and olive shells look just like the air bladders of the seaweed it lives on.',
  },
  // "Dog whelk": the Atlantic dog whelk, matching the art's stout, banded, thick-lipped shell.
  dogwhelk: {
    latin: 'Nucella lapillus',
    size: 'usually ~3 cm long',
    habitat: 'rocky shores among barnacles and mussels',
    range: 'N Atlantic, both sides',
    eats: 'barnacles and mussels',
    fact: 'It drills through a mussel shell with its rasping tongue, a job that can take it days.',
  },
  // "Painted top shell": the painted top shell, matching the art's pink cone flecked red-purple.
  paintedtop: {
    latin: 'Calliostoma zizyphinum',
    size: 'up to ~3 cm tall',
    habitat: 'rocks and kelp, low shore to ~300 m',
    range: 'NE Atlantic and the Mediterranean',
    eats: 'hydroids, algae films and detritus',
    fact: 'Its pearly cone can be pink, purple, yellow or even pure white.',
  },
  // "Necklace shell": the large necklace shell, matching the art's fawn globe with a row of brown spots.
  necklace: {
    latin: 'Euspira catena',
    size: 'up to ~3 cm tall',
    habitat: 'sandy shores, low tide and below',
    range: 'NE Atlantic and the Mediterranean',
    eats: 'clams and other snails, drilled open',
    fact: 'It lays its eggs in a rubbery collar of sand glued together with slime.',
  },
  // "Frog shell": the Mediterranean frog shell, the nearest frog shell to these cold European pools.
  frogshell: {
    latin: 'Bursa scrobilator',
    size: '~5-8 cm long',
    habitat: 'rocky and stony bottoms, shallow water',
    range: 'Mediterranean and nearby E Atlantic',
    eats: 'bristle worms',
    fact: 'Frog shells hunt worms in their burrows, reaching in with a long, stretchy snout.',
  },
  // "Knobbed whelk": the knobbed whelk, matching the art's crown of knobs and orange mouth.
  knobbedwhelk: {
    latin: 'Busycon carica',
    size: 'up to ~23 cm long',
    habitat: 'sandy and muddy bays, low tide to shallow water',
    range: 'W Atlantic, Cape Cod to Florida',
    eats: 'clams and oysters',
    fact: 'It chips open clams by using the edge of its own shell as a wedge.',
  },

  // Beach 4: Mangrove Margins
  // "Mangrove periwinkle": the rough mangrove periwinkle, which lives up on the roots and trunks.
  mangrovewinkle: {
    latin: 'Littoraria scabra',
    size: '~2-4 cm tall',
    habitat: 'mangrove roots, trunks and leaves above the water',
    range: 'Indo-Pacific mangroves, E Africa to the Pacific',
    eats: 'algae and fungi on bark and leaves',
    fact: 'It climbs the mangrove trunks as the tide rises, keeping just above the water.',
  },
  // "River nerite": the brackish nerites of the genus Neritina, matching the art's olive-black shell with fine yellow lines.
  rivernerite: {
    latin: 'Neritina',
    size: '~1-3 cm across',
    habitat: 'river mouths, creeks and mangrove mud',
    range: 'tropical coasts and rivers worldwide',
    eats: 'algae scraped off stones, wood and roots',
    fact: 'Its babies drift out to sea, then the young snails crawl back up the rivers to live.',
  },
  // "Mud creeper": the giant mud creeper, matching the art's long dark latticed cone with a flared lip.
  mudcreeper: {
    latin: 'Terebralia palustris',
    size: 'up to ~15 cm long',
    habitat: 'mangrove mud, in the shade of the trees',
    range: 'Indo-West Pacific, E Africa to N Australia',
    eats: 'fallen mangrove leaves; young ones eat mud films',
    fact: 'Crowds of them gather on a freshly fallen mangrove leaf and munch it away.',
  },
  // "Telescope snail": the telescope snail, matching the art's tall straight chocolate cone.
  telescope: {
    latin: 'Telescopium telescopium',
    size: '~8-12 cm long',
    habitat: 'open mud flats and pools in mangroves',
    range: 'Indo-West Pacific, India to N Australia',
    eats: 'algae and scraps sifted from the mud',
    fact: 'At low tide it slides over the mud, eating the thin film of food on its surface.',
  },
  // "Mud whelk": the spiral melongena, a big knobbed, long-canalled whelk of mangrove mud flats.
  mudwhelk: {
    latin: 'Volegalea cochlidium',
    size: 'often ~10 cm long',
    habitat: 'mangrove mud flats and estuaries',
    range: 'Indo-West Pacific, India to SE Asia',
    eats: 'clams, barnacles and dead animals',
    fact: 'A hunter of the mud flats, it tracks down clams and barnacles at low tide.',
  },

  // Beach 5: Ash & Basalt
  // "Drupe": the purple drupe, matching the art's white shell with black knobs and violet mouth.
  drupe: {
    latin: 'Drupa morum',
    size: '~3-5 cm long',
    habitat: 'surf-battered reef and rock, shallow water',
    range: 'tropical Indo-Pacific',
    eats: 'bristle worms',
    fact: 'Its thick knobbly shell and narrow toothed mouth help keep out shell-crushing crabs.',
  },
  // "Horn shell": ceriths of the genus Cerithium, as the art names it, such as the fly-specked cerith of the Galapagos.
  hornshell: {
    latin: 'Cerithium',
    size: '~2-5 cm long',
    habitat: 'sand, rubble and rocks in shallow water',
    range: 'warm seas worldwide',
    eats: 'algae and detritus',
    fact: 'Hermit crabs often move into its slim, light shells, which are common on warm shores.',
  },
  // "Spindle shell": the Galapagos-to-Mexico spindle Fusinus dupetitthouarsi, matching the art's pale corded spindle.
  spindle: {
    latin: 'Fusinus dupetitthouarsi',
    size: 'up to ~25 cm long',
    habitat: 'sand and mud, shallow to deep water',
    range: 'E Pacific, Gulf of California to Ecuador',
    eats: 'worms and other small animals',
    fact: 'Its long canal holds a breathing tube that it sweeps about to smell out food.',
  },
  // "Bonnet": the checkered bonnet of the eastern Pacific, matching the art's rows of tan squares.
  bonnet: {
    latin: 'Semicassis centiquadrata',
    size: '~5-8 cm long',
    habitat: 'sandy bottoms, shallow water',
    range: 'E Pacific, Gulf of California to Peru',
    eats: 'sand dollars and sea urchins',
    fact: 'Bonnets bury themselves in the sand by day and come out at night to hunt.',
  },
  // "Harp shell": the Panamic harp, matching the art's rose shell strung with ribs.
  harp: {
    latin: 'Harpa crenata',
    size: 'up to ~10 cm long',
    habitat: 'sandy bottoms, shallow water',
    range: 'E Pacific, Gulf of California to Peru',
    eats: 'crabs, wrapped up in its foot',
    fact: 'Grabbed by a predator, a harp snail can shed the back of its own foot and escape.',
  },

  // Beach 6: Fog & Kelp
  // "Black turban": the black turban snail, as the art names it.
  blackturban: {
    latin: 'Tegula funebralis',
    size: '~2-4 cm across',
    habitat: 'rocky shores, mid tide, in big clusters',
    range: 'E Pacific, Vancouver Island to Baja California',
    eats: 'seaweeds and algae films',
    fact: 'Its empty shells are a favourite home of the hermit crabs that share its rocks.',
  },
  // "Kelp snail": Norris's top snail, as the art names it.
  kelpsnail: {
    latin: 'Norrisia norrisii',
    size: 'up to ~5 cm across',
    habitat: 'on giant kelp and rocks in kelp forests',
    range: 'E Pacific, California to Baja California',
    eats: 'giant kelp',
    fact: 'Its brown shell sits on a bright orange-red foot, easy to spot on the kelp.',
  },
  // "Kellet's whelk": Kellet's whelk, as the art names it.
  kellets: {
    latin: 'Kelletia kelletii',
    size: 'up to ~17 cm long',
    habitat: 'rocky reefs and kelp forests, ~2-70 m deep',
    range: 'E Pacific, Monterey Bay to Baja California',
    eats: 'dead animals, worms and other snails',
    fact: 'Since the 1980s its range has crept north from Southern California to Monterey Bay.',
  },
  // "Oregon triton": the Oregon hairy triton, as the art names it.
  oregontriton: {
    latin: 'Fusitriton oregonensis',
    size: 'up to ~13 cm long',
    habitat: 'rocky bottoms, low shore to deep water',
    range: 'N Pacific, Japan to Alaska and California',
    eats: 'sea urchins, sea squirts and dead animals',
    fact: 'Oregon chose it as its state seashell, hairy coat and all.',
  },
  // "Wavy turban": the wavy turban snail, as the art names it.
  wavyturban: {
    latin: 'Megastraea undosa',
    size: 'up to ~15 cm across',
    habitat: 'rocky reefs and kelp forests, shallow water',
    range: 'E Pacific, California to Baja California',
    eats: 'giant kelp and other seaweeds',
    fact: 'One of the biggest turban snails in the eastern Pacific, it grazes the kelp forests.',
  },

  // Beach 7: Wreck Cove
  // "Nassa": the bruised nassa, as the art names it.
  nassa: {
    latin: 'Nassarius vibex',
    size: '~1-1.5 cm long',
    habitat: 'sand and mud flats, shallow water',
    range: 'W Atlantic, Cape Cod to Brazil and the Gulf',
    eats: 'dead animals',
    fact: 'It smells carrion from afar, and a crowd of them can swarm a dead fish in minutes.',
  },
  // "Fig shell": the common fig shell, as the art names it.
  figshell: {
    latin: 'Ficus communis',
    size: 'up to ~10 cm long',
    habitat: 'sandy bottoms offshore',
    range: 'W Atlantic, North Carolina to the Gulf',
    eats: 'small animals of the sandy seabed',
    fact: 'When alive, it wraps its thin shell in folds of its mantle and glides on a broad foot.',
  },
  // "Tulip shell": the banded tulip, as the art names it.
  tulip: {
    latin: 'Cinctura hunteria',
    size: 'up to ~10 cm long',
    habitat: 'seagrass, sand and mud flats, shallow water',
    range: 'W Atlantic, North Carolina to the Gulf',
    eats: 'other snails, even other tulips',
    fact: 'A snail that hunts snails, it will even attack and eat other tulip shells.',
  },
  // "Lightning whelk": the Gulf lightning whelk, as the art names it (some authors use S. perversum).
  lightningwhelk: {
    latin: 'Sinistrofulgur sinistrum',
    size: 'up to ~40 cm long',
    habitat: 'sand and seagrass flats, shallow water',
    range: 'Gulf of Mexico and SE United States',
    eats: 'clams',
    fact: 'Its opening is on the left, unlike most shells, and the Calusa people made tools from it.',
  },
  // "Horse conch": the Florida horse conch, as the art names it.
  horseconch: {
    latin: 'Triplofusus giganteus',
    size: 'up to ~60 cm long',
    habitat: 'sand, seagrass and oyster bars, shallow water',
    range: 'W Atlantic, North Carolina to the Gulf',
    eats: 'other big snails, even lightning whelks',
    fact: "Florida's state shell, its empty shells give giant hermit crabs a home.",
  },

  // Beach 8: Monsoon Harbour
  // "Auger shell": the subulate auger, as the art names it.
  auger: {
    latin: 'Terebra subulata',
    size: '~10-15 cm long',
    habitat: 'sandy bottoms near reefs, shallow water',
    range: 'Indo-Pacific, E Africa to the central Pacific',
    eats: 'worms in the sand',
    fact: 'Augers are cousins of cone snails, and many hunt worms in the sand with venom.',
  },
  // "Babylon": the spiral babylon, as the art names it.
  babylon: {
    latin: 'Babylonia spirata',
    size: '~5-7 cm long',
    habitat: 'sandy and muddy bottoms, shallow water',
    range: 'N Indian Ocean, incl. the coasts of India',
    eats: 'dead animals',
    fact: 'Fishers in India catch it in baited pots for its meat and its pretty shell.',
  },
  // "Cone shell": the textile cone, as the art names it.
  cone: {
    latin: 'Conus textile',
    size: 'up to ~15 cm long',
    habitat: 'sand and rubble near coral reefs',
    range: 'Indo-Pacific, incl. the Red Sea and India',
    eats: 'other snails',
    fact: 'It harpoons other snails with a venomous tooth, so never pick up a living cone shell.',
  },
  // "Spider conch": the common spider conch, as the art names it.
  spiderconch: {
    latin: 'Lambis lambis',
    size: '~15-25 cm long',
    habitat: 'sand, seagrass and reef flats, shallow water',
    range: 'Indo-Pacific, E Africa to the central Pacific',
    eats: 'algae',
    fact: 'It moves by vaulting: it digs in its claw-like lid and heaves its heavy shell forward.',
  },
  // "Indian volute": the Indian volute (melon shell), as the art names it.
  volute: {
    latin: 'Melo melo',
    size: '~15-25 cm long',
    habitat: 'sand and mud bottoms, shallow water',
    range: 'Bay of Bengal to the South China Sea',
    eats: 'other snails',
    fact: 'It can make rare orange melo pearls, among the most prized pearls in the world.',
  },

  // Beach 9: Frost Shingle
  // "Wentletrap": the Greenland wentletrap, as the art names it.
  wentletrap: {
    latin: 'Epitonium greenlandicum',
    size: '~2-4 cm tall',
    habitat: 'sand and gravel, shallow to deep cold water',
    range: 'Arctic and N Atlantic',
    eats: 'sea anemones',
    fact: 'Its name comes from the Dutch for a spiral staircase, and it feeds on sea anemones.',
  },
  // "Arctic moon snail": the Arctic moon snail, as the art names it.
  arcticmoon: {
    latin: 'Cryptonatica affinis',
    size: '~2-4 cm across',
    habitat: 'sand and mud, shallow to deep cold water',
    range: 'Arctic, N Atlantic and N Pacific',
    eats: 'clams, drilled open',
    fact: 'It drills a neat bevelled hole through a clam shell, then eats the clam inside.',
  },
  // "Neptune whelk": Neptunea despecta, as the art names it.
  neptunewhelk: {
    latin: 'Neptunea despecta',
    size: '~10-15 cm long',
    habitat: 'cold seabed, sand, mud and gravel',
    range: 'N Atlantic and the Arctic',
    eats: 'clams, worms and dead animals',
    fact: 'Inside its egg capsules, the first young to grow eat the spare "nurse eggs" laid with them.',
  },
  // "Arctic whelk": the common (waved) whelk, as the art names it.
  arcticwhelk: {
    latin: 'Buccinum undatum',
    size: 'up to ~11 cm long',
    habitat: 'sand, mud and gravel, low shore to deep water',
    range: 'N Atlantic, both sides',
    eats: 'clams, worms and dead animals',
    fact: 'Its empty shells are the classic home of the big common hermit crab of the North Atlantic.',
  },
  // "Iceland whelk": Volutopsius norwegicus, as the art names it.
  icelandwhelk: {
    latin: 'Volutopsius norwegicus',
    size: '~10 cm long or more',
    habitat: 'cold seabed offshore',
    range: 'N Atlantic, Norway to Iceland and Greenland',
    eats: 'dead animals and small seabed creatures',
    fact: 'Like other whelks, it smells out food by tasting the water through its breathing tube.',
  },

  // Beach 10: Moonlit Bay
  // "Tiger moon snail": Natica tigrina, as the art names it.
  tigermoon: {
    latin: 'Natica tigrina',
    size: '~2-4 cm across',
    habitat: 'sandy and muddy bottoms, shallow water',
    range: 'Indo-West Pacific, incl. N Australia',
    eats: 'clams, drilled open',
    fact: 'It hunts under the sand, wrapping a clam in its big foot while it drills through the shell.',
  },
  // "Giant tun": Tonna galea, as the art names it.
  gianttun: {
    latin: 'Tonna galea',
    size: 'up to ~25 cm long',
    habitat: 'sandy bottoms, shallow to deep water',
    range: 'warm seas: Atlantic, Mediterranean, Indo-Pacific',
    eats: 'sea cucumbers',
    fact: 'It swallows sea cucumbers whole, using saliva that contains acid to subdue them.',
  },
  // "Horned helmet": Cassis cornuta, as the art names it.
  hornedhelmet: {
    latin: 'Cassis cornuta',
    size: 'up to ~35 cm long',
    habitat: 'sandy lagoons and reef flats',
    range: 'Indo-Pacific, E Africa to the central Pacific',
    eats: 'sea urchins',
    fact: 'The biggest helmet shell in the world, it roams sandy reef lagoons hunting sea urchins.',
  },
  // "Triton's trumpet": the giant triton, as the art names it.
  tritonstrumpet: {
    latin: 'Charonia tritonis',
    size: 'up to ~50 cm long',
    habitat: 'coral reefs, shallow water',
    range: 'Indo-Pacific, E Africa to the central Pacific',
    eats: 'sea stars, incl. crown-of-thorns starfish',
    fact: 'One of few animals that eat crown-of-thorns starfish, its shell has long been blown as a trumpet.',
  },
  // "Baler shell": the baler, as the art names it.
  baler: {
    latin: 'Melo amphora',
    size: 'up to ~50 cm long',
    habitat: 'sand and mud bottoms, shallow water',
    range: 'N Australia, New Guinea and Indonesia',
    eats: 'other snails',
    fact: 'Named for bailing water out of canoes, it is one of the largest snail shells in the world.',
  },
};
