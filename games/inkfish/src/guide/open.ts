import type { GuideEntry } from './types';

/** Fact cards for chapters 4-6: the coral reef, the shipwreck and the drop-off into open ocean. */
export const OPEN_GUIDE = {
  // Representative species: the blue-green chromis of Indo-Pacific coral thickets.
  chromis: {
    latin: 'Chromis viridis',
    length: 'up to 10 cm',
    weight: 'a few grams',
    lifespan: 'not well known; a few years',
    speed: 'hovers in shoals; darts into coral when scared',
    depth: '1-20 m',
    range: 'Indo-Pacific reefs, East Africa to the central Pacific',
    eats: 'zooplankton, fish eggs, tiny crustaceans',
    fact: 'Whole shoals hang over one branching coral and vanish into it in a flash when a predator comes near.',
  },
  // Representative species: the orange-and-white ocellaris clownfish.
  clownfish: {
    latin: 'Amphiprion ocellaris',
    length: 'up to 11 cm',
    weight: 'a few grams',
    lifespan: '3-6 years wild, 12+ in aquariums',
    speed: 'slow, paddles with its pectoral fins near home',
    depth: '1-15 m',
    range: 'Eastern Indian Ocean and western Pacific reefs',
    eats: 'zooplankton, algae, small crustaceans',
    fact: 'All clownfish hatch male; when the female of a group dies, the biggest male turns female.',
  },
  // Representative species: the queen angelfish (blue body, yellow fins, blue crown spot).
  angelfish: {
    latin: 'Holacanthus ciliaris',
    length: 'up to 45 cm',
    weight: 'up to 1.6 kg',
    lifespan: 'up to 15 years',
    speed: 'slow, graceful glider; quick turns',
    depth: '1-70 m',
    range: 'Western Atlantic: Florida, Caribbean, to Brazil',
    eats: 'sponges, algae, tunicates, soft corals',
    fact: 'It is named for the blue crown spot on its forehead, ringed in electric blue like a jewel.',
  },
  // Representative species: the queen parrotfish (teal with pink-edged scales).
  parrotfish: {
    latin: 'Scarus vetula',
    length: 'up to 61 cm',
    weight: 'not well recorded',
    lifespan: 'up to ~16 years',
    speed: 'rows along with its pectoral fins',
    depth: '3-25 m',
    range: 'Western Atlantic: Florida, Bahamas, Caribbean',
    eats: 'algae scraped off dead coral and rock',
    fact: 'At night it can wrap itself in a sleeping bag of mucus that hides its scent from predators.',
  },
  // Representative species: the Picasso triggerfish (the art's pattern).
  triggerfish: {
    latin: 'Rhinecanthus aculeatus',
    length: 'up to 30 cm',
    weight: 'not well recorded',
    lifespan: 'not well known',
    speed: 'slow, waves its dorsal and anal fins; fast charges',
    depth: '0-50 m',
    range: 'Indo-Pacific reef flats and lagoons, Red Sea to Hawaii',
    eats: 'crabs, sea urchins, worms, molluscs, algae',
    fact: 'It locks its first spine upright with the second, wedging itself in a crevice so it cannot be pulled out.',
  },
  // Representative species: the red lionfish.
  lionfish: {
    latin: 'Pterois volitans',
    length: 'up to ~45 cm',
    weight: 'up to 1.4 kg',
    lifespan: 'up to ~10 years',
    speed: 'slow hover; sudden gulping strike',
    depth: '2-55 m native, deeper where invasive',
    range: 'Indo-Pacific; invasive in the Caribbean and W Atlantic',
    eats: 'small fish, shrimp, crabs',
    fact: 'Brought to the Atlantic by aquarium releases, it now spreads across Caribbean reefs with no natural enemies.',
  },
  // Representative species: the yellow boxfish (yellow with dark spots).
  boxfish: {
    latin: 'Ostracion cubicus',
    length: 'up to 45 cm',
    weight: 'not well recorded',
    lifespan: 'about 4-10 years',
    speed: 'slow; sculls with its fins, body stays rigid',
    depth: '1-50 m, rarely to 280 m',
    range: 'Indo-Pacific reefs and lagoons, Red Sea to Hawaii',
    eats: 'algae, small worms, crustaceans, molluscs',
    fact: 'When stressed it oozes a toxin from its skin that can poison other fish in the water around it.',
  },
  // Representative species: the glassy sweeper of Caribbean reefs and wrecks.
  sweeper: {
    latin: 'Pempheris schomburgkii',
    length: 'up to 16 cm',
    weight: 'not recorded; a few tens of grams',
    lifespan: 'unknown',
    speed: 'slow, tight-packed shoal; quick to scatter',
    depth: '1-30 m',
    range: 'Western Atlantic: Florida and the Bahamas to Brazil',
    eats: 'zooplankton, at night',
    fact: 'By day thousands pack into caves and wrecks; at dusk they pour out to feed in open water and come back before sunrise.',
  },
  // Representative species: the northern red snapper, a famous wreck and reef fish.
  snapper: {
    latin: 'Lutjanus campechanus',
    length: 'up to 1 m',
    weight: 'up to 23 kg',
    lifespan: 'up to 57 years',
    speed: 'strong cruiser; quick dashes at prey',
    depth: '10-190 m',
    range: 'Gulf of Mexico and US Atlantic coast',
    eats: 'fish, shrimp, crabs, squid',
    fact: 'Red snapper crowd around shipwrecks and oil rigs, and a big one can be older than its captain.',
  },
  // Representative species: the crevalle jack (dark gill-cover spot, tail scutes).
  jack: {
    latin: 'Caranx hippos',
    length: 'up to 1.2 m',
    weight: 'up to 32 kg',
    lifespan: 'up to ~20 years',
    speed: 'powerful, fast swimmer; hunts in packs',
    depth: '1-350 m',
    range: 'Atlantic, both sides, warm coastal waters',
    eats: 'small fish, shrimp, squid',
    fact: 'Packs of jacks herd baitfish against the surface, then charge through so hard the water boils.',
  },
  // Representative species: the green moray of Caribbean reefs and wrecks.
  moray: {
    latin: 'Gymnothorax funebris',
    length: 'up to 2.5 m',
    weight: 'up to 29 kg',
    lifespan: 'not well known',
    speed: 'slow, snaking swimmer; lunges from its hole',
    depth: '1-50 m',
    range: 'Western Atlantic: Bermuda, Caribbean, to Brazil',
    eats: 'fish, crabs, shrimp, octopus',
    fact: 'Its skin is really blue-grey; the green comes from a coat of yellow slime.',
  },
  // Representative species: the spotted scorpionfish of the western Atlantic.
  scorpionfish: {
    latin: 'Scorpaena plumieri',
    length: 'up to 45 cm',
    weight: 'up to 1.6 kg',
    lifespan: 'not well known',
    speed: 'sits still for hours; strikes in a split second',
    depth: '1-70 m',
    range: 'Western Atlantic reefs and rocky bottoms',
    eats: 'small fish, crabs, shrimp',
    fact: 'When threatened it flashes the hidden inner side of its pectoral fins, black with white spots, as a warning.',
  },
  // Representative species: the Atlantic cod.
  cod: {
    latin: 'Gadus morhua',
    length: 'up to 2 m',
    weight: 'up to 96 kg',
    lifespan: 'up to 25 years',
    speed: 'slow, steady cruiser near the bottom',
    depth: '0-600 m, mostly 150-200 m',
    range: 'North Atlantic and Arctic edges',
    eats: 'fish, crabs, worms, squid',
    fact: 'The barbel on its chin tastes the seabed, so cod can find food in the dark.',
  },
  angler: {
    latin: 'Melanocetus johnsonii',
    length: 'females up to 18 cm, males 3 cm',
    weight: 'not well recorded',
    lifespan: 'unknown',
    speed: 'slow drifter; waits with its lure out',
    depth: '100-4500 m, mostly 100-1500 m',
    range: 'Deep sea of the Atlantic, Indian and Pacific oceans',
    eats: 'fish, shrimp, squid',
    fact: 'Its glowing lure is lit by bacteria, and it can swallow prey bigger than itself.',
  },
  grouper: {
    latin: 'Epinephelus itajara',
    length: 'up to 2.5 m',
    weight: 'up to 455 kg',
    lifespan: 'up to 37 years',
    speed: 'slow and lazy; explosive gulping lunge',
    depth: '0-50 m',
    range: 'Atlantic: Florida, Gulf of Mexico, Caribbean, Brazil',
    eats: 'crabs, lobsters, fish, octopus, small turtles',
    fact: 'It warns off intruders with a deep boom made by thumping its swim bladder, felt as much as heard.',
  },
  // Representative species: the grey reef shark (the art's black-edged tail).
  shark: {
    latin: 'Carcharhinus amblyrhynchos',
    length: 'up to 2.5 m',
    weight: 'up to 34 kg',
    lifespan: 'up to 25 years',
    speed: 'steady patrolling cruise; fast bursts',
    depth: '0-280 m, rarely to 1000 m',
    range: 'Indo-Pacific coral reefs, often near drop-offs',
    eats: 'reef fish, squid, octopus, crabs',
    fact: 'Before it attacks, it hunches its back and drops its fins in a jerky threat dance.',
  },
  // Representative species: the European anchovy.
  anchovy: {
    latin: 'Engraulis encrasicolus',
    length: 'up to 20 cm',
    weight: 'tens of grams',
    lifespan: 'up to 5 years, usually 2-3',
    speed: 'fast, dense schools; all turn as one',
    depth: '0-400 m',
    range: 'East Atlantic, Mediterranean and Black Sea',
    eats: 'zooplankton, copepods, fish eggs',
    fact: 'It feeds by swimming with its huge mouth gaping open, sieving plankton like a living net.',
  },
  // Representative species: the Atlantic mackerel (tiger-striped back).
  mackerel: {
    latin: 'Scomber scombrus',
    length: 'up to 60 cm',
    weight: 'up to 3.4 kg',
    lifespan: 'up to 17 years',
    speed: 'never stops swimming; fast schooling bursts',
    depth: '0-200 m, rarely to 1000 m',
    range: 'North Atlantic and Mediterranean',
    eats: 'zooplankton, small fish, shrimp',
    fact: 'It has no swim bladder, so it must keep swimming or slowly sink.',
  },
  // Representative species: the tropical two-wing flyingfish.
  flyingfish: {
    latin: 'Exocoetus volitans',
    length: 'up to 30 cm',
    weight: 'not well recorded',
    lifespan: 'not well known; short-lived',
    speed: 'leaves the water at 70+ km/h, then glides',
    depth: '0-20 m, at the surface',
    range: 'Tropical and subtropical open oceans worldwide',
    eats: 'zooplankton, small crustaceans',
    fact: 'The longest flying fish flight ever filmed lasted 45 seconds.',
  },
  mahi: {
    latin: 'Coryphaena hippurus',
    length: 'up to 2.1 m',
    weight: 'up to 40 kg',
    lifespan: 'up to 4 years',
    speed: 'very fast; bursts reported near 90 km/h',
    depth: '0-85 m, mostly near the surface',
    range: 'Tropical and subtropical oceans worldwide',
    eats: 'flying fish, squid, small fish, crabs',
    fact: 'One of the fastest-growing fish: it rarely lives past 4 years, yet can reach 40 kg.',
  },
  // Representative species: the Atlantic bonito (oblique back stripes).
  bonito: {
    latin: 'Sarda sarda',
    length: 'up to 90 cm',
    weight: 'up to 11 kg',
    lifespan: 'up to 5 years',
    speed: 'fast, tireless schooling hunter',
    depth: '0-200 m',
    range: 'Atlantic, Mediterranean and Black Sea',
    eats: 'small fish, squid, shrimp',
    fact: 'A small cousin of the tuna, it hunts in schools that churn the surface white.',
  },
  // Representative species: the houndfish, the largest common needlefish.
  needlefish: {
    latin: 'Tylosurus crocodilus',
    length: 'up to 1.5 m',
    weight: 'up to 6.4 kg',
    lifespan: 'not well known',
    speed: 'fast; skips and leaps over the surface',
    depth: '0-13 m',
    range: 'Tropical seas worldwide, near reefs and coasts',
    eats: 'small fish',
    fact: 'Startled by lights at night, houndfish leap from the water and have speared fishermen with their beaks.',
  },
  swordfish: {
    latin: 'Xiphias gladius',
    length: 'up to 4.5 m',
    weight: 'up to 650 kg',
    lifespan: 'at least 9 years',
    speed: '~1 body length a second; fast bursts',
    depth: '0-550 m, rarely to 2900 m',
    range: 'Tropical and temperate oceans worldwide',
    eats: 'squid, mackerel, herring, other fish',
    fact: 'A special heater organ warms its eyes and brain, keeping its vision sharp in cold, dark depths.',
  },
} as const satisfies Record<
  | 'chromis'
  | 'clownfish'
  | 'angelfish'
  | 'parrotfish'
  | 'triggerfish'
  | 'lionfish'
  | 'boxfish'
  | 'sweeper'
  | 'snapper'
  | 'jack'
  | 'moray'
  | 'scorpionfish'
  | 'cod'
  | 'angler'
  | 'grouper'
  | 'shark'
  | 'anchovy'
  | 'mackerel'
  | 'flyingfish'
  | 'mahi'
  | 'bonito'
  | 'needlefish'
  | 'swordfish',
  GuideEntry
>;
