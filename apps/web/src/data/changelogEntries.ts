import type { ChangelogEntry } from './changelog';

/** The changelog's words (see changelog.ts). Newest first; each game's last entry is its release day. */

export const SITE_ENTRIES: readonly ChangelogEntry[] = [
  {
    date: "2026-11-12",
    title: "Reload when graphics fail to start",
    changes: [
      "When a game can't start its graphics but your browser supports them, the button now offers to reload the page, which fixes it, instead of a Try again that kept failing.",
    ],
  },
  {
    date: "2026-10-24",
    title: "Sign in by email link",
    changes: [
      "Added sign in with a magic link sent to your email, so you no longer need a Google account to save your progress.",
    ],
  },
  {
    date: "2026-10-20",
    title: "Ad-free for owners",
    changes: [
      "Players who own a game no longer see ads.",
    ],
  },
  {
    date: "2026-10-19",
    title: "Fix for stale game pages",
    changes: [
      "Fixed games failing to load when a page had been left open or reopened after an update; the page now reloads itself to fetch the new version.",
    ],
  },
  {
    date: "2026-10-15",
    title: "Sign in to save progress",
    changes: [
      "Added a Sign in to save your progress button on the result screen for players who are not signed in.",
    ],
  },
  {
    date: "2026-10-14",
    title: "Proper loading screen",
    changes: [
      "Added a loading bar that shows the game downloading and then drawing its art.",
    ],
  },
  {
    date: "2026-10-11",
    title: "Sign in before buying",
    changes: [
      "Buying a game now requires signing in first, so your purchase is tied to your account.",
    ],
  },
  {
    date: "2026-10-10",
    title: "Save mixing fix",
    changes: [
      "Fixed a save made while signed out being merged into every account that signed in on the same device.",
    ],
  },
  {
    date: "2026-10-04",
    title: "Progress saved to your account",
    changes: [
      "Your progress is now saved to your account, so you can pick up on another device.",
    ],
  },
  {
    date: "2026-10-03",
    title: "Sign in and buy the full game",
    changes: [
      "Added sign in with Google.",
      "Added buying the full version of a game with a card.",
    ],
  },
];

export const GAME_ENTRIES: Readonly<Record<string, readonly ChangelogEntry[]>> = {
  inkfish: [
    {
      date: "2026-11-12",
      title: "Faster start",
      changes: [
        "The game starts faster, most of all on Android phones.",
      ],
    },
    {
      date: "2026-10-14",
      title: "Food falls replace ink levels",
      changes: [
        "Replaced the ink-collecting levels with food-fall levels: treats sink through the water, such as bread, sea grapes, kelp and marine snow, and you catch them before the seabed scavengers do.",
      ],
    },
    {
      date: "2026-10-12",
      title: "Faceless cusk",
      changes: [
        "Replaced the blobfish in the deep zone with the faceless cusk.",
      ],
    },
    {
      date: "2026-10-08",
      title: "Special skills",
      changes: [
        "Gave each chapter's fish an ability of its own, loosely true to life. The active ones, ink and flash, have their own button next to dash, or the E key, and a cooldown ring.",
        "Added arrows at the screen edge that point to sea events happening off screen.",
      ],
    },
    {
      date: "2026-10-07",
      title: "Random sea events",
      changes: [
        "Added random sea events that start with a banner telling you what to do, such as a dragonfly hatch, a bait ball, seabirds feeding, a riptide and jellyfish drifting in. Each zone has its own, so no two minutes play the same.",
        "Fixed fish tails and added more fish to the water.",
        "After finishing level 10, the game now offers the full version.",
      ],
    },
    {
      date: "2026-10-06",
      title: "Unique bosses",
      changes: [
        "Gave every chapter's boss its own look and its own way of attacking.",
        "Replaced the goblin shark boss with a black seadevil.",
        "Fixed the giant squid's swimming animation.",
      ],
    },
    {
      date: "2026-10-05",
      title: "Bigger seas",
      changes: [
        "Made every sea larger, and made the sea wrap around: swim off one side and you come in on the other.",
        "Fixed the rubber duck decoy: it now pops up where you ate it, and hunters chase it instead of you.",
        "Optimized the game so it loads and runs faster.",
      ],
    },
    {
      date: "2026-10-04",
      title: "Touch controls",
      changes: [
        "Added an on-screen joystick for phones.",
        "Improved the phone layout and menu.",
        "Later levels now have 4 or 5 stages instead of 3.",
        "Replaced the herring with the glassy sweeper on the reef.",
      ],
    },
    {
      date: "2026-10-03",
      title: "InkFish launches",
      changes: [
        "Launched InkFish: start as a doodle-sized fry and eat your way up the food chain through 10 chapters and 100 levels. Chapter 1 is free.",
        "Chain meals into an Ink Frenzy, dodge hooks and jellyfish, and grab what sinks from above, such as a battery that shocks predators.",
        "Added a level map, a glossary of every fish you meet, missions and sound effects.",
        "The last chapters go dark and deep and end with a giant squid.",
      ],
    },
  ],
  inkcrab: [
    {
      date: "2026-11-12",
      title: "Faster start and easier first levels",
      changes: [
        "Pen Test now has a first meal just past the start, and the walking hint points at the nearest food.",
        "Margin Wall's cowries now lie on the way to the shelf, the first one just under the sand past the start, so you learn to dig for a prize and reach the wall carrying sand to build with.",
        "The hint for something buried just under the sand now says to stand over it and dig down, and it keeps pointing at a cowry until you have dug one up.",
        "Fixed the note on marked sea slaters: they don't hunt you, you only need to grow past them to eat them.",
        "The game starts several times faster: it now draws only the beach you are about to play, and draws the next one while you look at the map or your results.",
      ],
    },
    {
      date: "2026-10-20",
      title: "Better digging lessons",
      changes: [
        "The tutorial now teaches building a step to reach a shell that is too high to jump to.",
        "Hints now point at the buried find you should dig for.",
      ],
    },
    {
      date: "2026-10-15",
      title: "Walk and jump lessons",
      changes: [
        "Added walking and jumping lessons to beach 1, showing the keys or touch controls and pointing at ledges you can hop onto.",
      ],
    },
    {
      date: "2026-10-14",
      title: "Clearer tutorial",
      changes: [
        "The tutorial now highlights the button or key to press at the moment you need it.",
        "Added a warning that out of your shell anything can catch you, so move when no one is about.",
      ],
    },
    {
      date: "2026-10-13",
      title: "Touch buttons",
      changes: [
        "Added on-screen Jump, Dig and Grab buttons for phones, and rewrote the hints to match.",
      ],
    },
    {
      date: "2026-10-11",
      title: "InkCrab launches",
      changes: [
        "Launched InkCrab: a hermit crab game across ten beaches, from coral atolls to frozen shingle. Beach 1 is free.",
        "Dig through sand cut open like an ant farm, eat to grow, and trade up into bigger shells.",
        "Race rival crabs to empty shells, lead a vacancy chain of little crabs, and hide from gulls, foxes and the rising tide.",
      ],
    },
  ],
  inkmine: [
    {
      date: "2026-11-12",
      title: "Faster start",
      changes: [
        "The game starts faster on Chrome, and the loading bar now moves while the planet is drawn instead of the page freezing.",
      ],
    },
    {
      date: "2026-10-19",
      title: "A narrator for the story",
      changes: [
        "Added an opening that tells who you are and what you were doing when the wormhole took your ship.",
        "Story moments are now told by a narrator while you keep playing, instead of cards that stop the game.",
      ],
    },
    {
      date: "2026-10-18",
      title: "Chapter 4: Talus",
      changes: [
        "Added Talus, a red desert world twice as wide as the moons, with salt flats, mesas and barrel plants.",
        "Added loose rock: dig out what holds a boulder up and it falls, hurting you or crushing creatures below.",
        "Added dust storms that warn you, shove you downwind and hit you in the open, so you must find cover.",
        "Added the boulder crab, sand skate and dew beetle, and the sleeping Rockslide.",
        "Added the long tank for the trip to Talus, and the wreck of the search party's ship.",
        "Rearranged the touch buttons: Jump in the corner, Bag beside it, Pulse above.",
      ],
    },
    {
      date: "2026-10-18",
      title: "Chapter 3: Brine",
      changes: [
        "Added Brine, a purple sea world where you swim, flood tunnels and dive below the reef.",
        "Met the Tidesingers, an ocean people who trade knowledge for metal.",
        "Added bubble jellies, rasp eels and the sleeping Leviathan, which noise wakes.",
        "Fetch the drive crystal beside the Leviathan, fly the Aster crew home to Mycel, and follow their star chart to Talus.",
      ],
    },
    {
      date: "2026-10-17",
      title: "Chapter 2: Mycel",
      changes: [
        "Added Mycel, a fungal moon with a forest of giant caps and the wreck of the Aster, an alien species.",
        "Follow a distress call to the Aster's wreck, study their broken gear and print your own, including the pulse, a ring of force that is your first weapon.",
        "Added puffballs, snap tendrils and grazers, and the Mother Mycel guarding her chamber.",
        "Wake the sleeping Aster at their camp to learn where the crew went next.",
      ],
    },
    {
      date: "2026-10-17",
      title: "InkMine launches",
      changes: [
        "Launched InkMine: a wormhole throws you onto Graphite, a small grey moon. Chapter 1 is free.",
        "Dig for copper, graphite, silver and ice, print the parts your wrecked lander needs, and mind your drill energy and air.",
        "Meet the Lamplighters, who speak no language you know, trade them silver for a drive core, and fly up to your starship.",
        "Redrew your starship to show what the wormhole broke.",
      ],
    },
  ],
  inkgecko: [
    {
      date: "2026-11-11",
      title: "Phone controls and a bigger board",
      changes: [
        "Added an on-screen joystick for phones that stays put: pull it to aim, or to run along the branch, and it keeps going even if your thumb slips off the glass for a moment.",
        "Added a Spit button holding the marble in the gecko's mouth and a Swap button holding the one on its tail, so letting go of the joystick no longer spits. Tapping the board still aims and spits.",
        "On phones the board draws bigger, with the bare ground round each level trimmed, and the score, clock and buttons sit beside it instead of over the lines.",
        "The garden now carries on past the edges of the board instead of showing a mirrored copy of it.",
        "On phones, level cards skip the picture of the board and show the rest bigger, and long hints wrap to fit the screen.",
        "The game starts faster: art used only by later levels is drawn after the first screen shows.",
      ],
    },
    {
      date: "2026-10-24",
      title: "A twist on every level",
      changes: [
        "Gave levels their own twists, such as gusts of wind that bend shots, lines that lurch forward or draw back, lines at different speeds, drifting leaves, a gecko that paces, and one-life levels.",
        "Added new goals: hold out for a time, fill the bar before the clock runs out, or pop only golden marbles.",
        "Added a boss on level 10 of every garden, from the Mole and the Bullfrog to the Barn Cat, the Stone Lion and the Owl, each testing that garden's new trick.",
      ],
    },
    {
      date: "2026-10-22",
      title: "InkGecko launches",
      changes: [
        "Launched InkGecko: a marble shooter in ten gardens, from a lily pond and a greenhouse to an old barn and a garden at night. Garden 1 is free.",
        "Spit marbles into a line rolling toward the well; three of a colour pop, and a matching gap rolls the line back for a combo.",
        "Each garden adds a trick: tunnels, windfalls, twined pairs, chameleon marbles and bank shots off barn walls.",
      ],
    },
  ],
  inksnake: [
    {
      date: "2026-11-12",
      title: "One Bite made fairer",
      changes: [
        "Level 7, One Bite, now asks you to grow to 400 instead of 540, so a single life feels tense rather than unfair.",
      ],
    },
    {
      date: "2026-10-25",
      title: "Touch joystick",
      changes: [
        "Added an on-screen joystick for steering on phones.",
      ],
    },
    {
      date: "2026-10-25",
      title: "InkSnake launches",
      changes: [
        "Launched InkSnake: Snake with real snakes, across ten chapters and 100 levels. The farm is free.",
        "Steer a corn snake round a farm, swallowing mice and frogs whole, and coil round prey too big to swallow.",
        "Crows peck your tail, a hawk circles and dives, and the Old Tomcat waits at the end of the farm.",
        "Nine more snakes, each in its own place with its own trick, from a hognose that plays dead to a king cobra and an anaconda.",
      ],
    },
  ],
  inkpin: [
    {
      date: "2026-11-12",
      title: "Straight into the first level",
      changes: [
        "On your first visit the game opens right in level 1 instead of on the map. After that it opens on the map as before.",
      ],
    },
    {
      date: "2026-11-11",
      title: "Thumbstick, zoom and a new look",
      changes: [
        "A new look for the whole interface: the level's name and goal on a page of Nib's journal, painted buttons with drawn icons, the tips on taped notes, and a new results page and map cards.",
        "Added a thumbstick for phones in the lower-left corner: push it to walk Nib, or up and down to climb a vine. It keeps walking even if your thumb slips off the glass for a moment, and the round button still jumps.",
        "You can zoom now: pinch, or use the + and − buttons (ctrl + wheel or the + − keys on a computer). Zoom out to see a whole level, or in to see the details.",
        "On phones, levels open zoomed in, and the stick, buttons, hearts and coins sit round the level instead of over it, so they never cover Nib or a pin.",
        "On phones, each tip fades once there's been time to read it, a tap closes it, and the new ? button brings it back. Level cards skip the picture, and the map opens closer, with bigger level circles.",
        "Removed tap-to-go: tapping the floor no longer sends Nib walking, so a missed pin tap can't move him by mistake.",
      ],
    },
    {
      date: "2026-11-01",
      title: "InkPin launches",
      changes: [
        "Launched InkPin: pull the golden pins in the right order so the gold reaches Nib, a raccoon ruin explorer, and the lava, bad air and guards miss them. Chapter 1, the Jungle Temple, is free.",
        "Added the Volcano Shrine and the Desert Tomb: 30 levels in all.",
        "Water cools lava into stone, gas blasts cracked walls, and coins pour like sand.",
        "Each ruin has its own guards: boars, porcupines, salamanders, armadillos and frogs.",
      ],
    },
  ],
  inkheroes: [
    {
      date: "2026-11-09",
      title: "Portals and portal hunts",
      changes: [
        "Added the Portal, a town building with three levels.",
        "Portal: every town with one shares a single store, as big as their stores together, so gear left in one town can be picked up in another.",
        "Summoning Portal: each week it calls a band of monsters you can see in advance (how many, how tough against your army, the experience, and the gear it may carry). The hero guarding the town can fight it, and that ends their day. Lose, and the army is lost but the hero comes home.",
        "Great Portal: a hero can step through to any other town of yours that has one, which uses up the rest of their day.",
        "Rival lords build Portals too, use them to bring a hero home to defend, and send their guards against the weekly band.",
        "Egypt's Portals are the Shrine of Wepwawet, the Gate of the Duat and the Great Gate of Wepwawet.",
      ],
    },
    {
      date: "2026-11-09",
      title: "Epic and Legendary units",
      changes: [
        "Units now come in five ranks, each with its own colour: Common, Uncommon and Rare from towns, and two higher ranks earned at special places.",
        "An Arena of Heroes trains one company a week from Rare to Epic, and each chapter has one guarded legendary site, the Forge of Hephaestus and the Temple of Ra, that trains an Epic company to Legendary.",
        "Every unit has new art for both new ranks: purple trim at Epic, orange at Legendary.",
        "Unit cards, the turn order and army slots show each unit's rank in its colour; gear's top grade is orange too.",
      ],
    },
    {
      date: "2026-11-09",
      title: "Gear cards, towns and smoother loading",
      changes: [
        "Tap any piece of gear for its card: what it gives, its set and which set bonuses are on, and for a piece in the bag, how it compares with what you wear now. Loot and shop cards list set bonuses too.",
        "Click the gate half of your town to ride your hero in, or the top half to open it without entering; the cursor shows which.",
        "Tap a company twice on the hero's sheet to see its card and compare it with its earlier levels.",
        "Fixed the game freezing at the end of loading a map, and the loading screen's clouds now drift.",
        "Smoother sky gradients, and the title now reads InkHeroes.",
        "Gear dropped by a beaten hero when your bag is full now shows on the map right away.",
      ],
    },
    {
      date: "2026-11-09",
      title: "Upgrades that look the part",
      changes: [
        "Redrew the upgraded units so each level looks clearly better armed than the one before, keeping the same weapon all the way up.",
        "Hoplites: the Hoplite now wears a linen tunic and carries a wooden shield, the Phalangite a linen corselet and a long spear, the Spartan full bronze and a crimson cloak.",
        "The Slinger’s upgrades now keep the sling and throw stones: the Peltast is now the Achaean Slinger and the Cretan Archer the Rhodian Slinger, hired at the Achaean Camp and the Rhodian Range.",
        "New art for the Golden Griffin, Minotaur Guard and Lord, Centaur Marksman and Sage, Royal Companion, Elder Titan, Titan Lord, and the Bronze and Syracusan Catapults.",
        "Egypt: new art for the Levy’s upgrades (the Khopesh Warrior keeps the spear and is now the Spearman of Amun), the Medjay Archer, Bowman of Ta-Seti, Hand of Anubis, Royal Mummy and Great Sphinx.",
      ],
    },
    {
      date: "2026-11-09",
      title: "Loot, lairs and spoils",
      changes: [
        "Added random gear drops from beaten monster groups, and some chests now hold a piece of gear. Armor belongs to sets in four grades with set bonuses.",
        "Added lairs, dens and tombs that send out one new group each week.",
        "Added selling spare gear at the Marketplace.",
        "Beating a rival hero in battle now takes the gear they wore. Rival lords wear gear too.",
        "Fighters and mystics now have their own armor sets, and the Gear tab shows your set progress.",
      ],
    },
    {
      date: "2026-11-09",
      title: "Chapter 2, part 4: the Delta",
      changes: [
        "Added the Delta, the last part of chapter 2: marshes, fields, Iunu and the desert edge, with the Hyksos king Apepi at Avaris.",
        "Added Ammit, a three-hex monster whose strikes cannot be answered, guarding the House of the Benben. It drops the Crook and Flail.",
        "Added crocodile marshes and lion rocks to hire from, and mastaba banks.",
        "Added Egypt's third upgrades: Chariot of Horus, Great Sphinx and Pharaoh's Mummy.",
        "Added ten Egyptian heroes, and narration for the Delta and the end of the chapter.",
      ],
    },
    {
      date: "2026-11-09",
      title: "Chapter 1, part 4: Othrys",
      changes: [
        "Added Othrys, a fourth map that finishes the Greek city. Explore the coast, Mount Othrys and the Arcadian highlands freely.",
        "Added Lykaon, the wolf-king of Arcadia, a rival lord who plays smarter than Kassander.",
        "Added Gigantes guarding the Helm of Kronos on the mountain's forge, and Titan Lords and Centaur Sages to hire.",
        "Added learning stones, dwellings to hire troops from, and banks to raid.",
        "The rival's other heroes now ride on the map too.",
      ],
    },
    {
      date: "2026-11-09",
      title: "Greek heroes and Marketplace",
      changes: [
        "Added ten Greek heroes, each with their own face, army and specialty, including Atalanta, Peleus, Auge, Kallisto and Melampus. Taverns now offer a choice of two.",
        "Added the Marketplace: trade one resource for another, with better rates for each Marketplace you own.",
      ],
    },
    {
      date: "2026-11-09",
      title: "Chapter 2: The Two Lands",
      changes: [
        "Added chapter 2, set in Egypt, with a new people, new heroes Neferet and Paser, and the Sacred Rites: Curse of Set, Ward of Isis and Rite of Osiris.",
        "Added three maps: Nekhen, where the Petsuchos holds the sluice; Abu, the fort at the cataract; and the Red Land, where the rival lord Sethi races you.",
        "Added Egypt's siege ramp: choose which stretch of wall your army climbs over.",
        "Added Egyptian spell art.",
      ],
    },
    {
      date: "2026-11-08",
      title: "Phone fixes",
      changes: [
        "Fixed battle, town and spellbook screens and their taps so InkHeroes plays on phones.",
      ],
    },
    {
      date: "2026-11-08",
      title: "InkHeroes launches in early access",
      changes: [
        "Launched InkHeroes: a turn-based strategy game in pixel art, set among the myths of ancient Greece. Chapter 1, The Border March, is free.",
        "Lead the knight Rowan across three maps that grow into one land, taking mines and chests, and fighting on a hex battlefield.",
        "Grow your towns one building a day, hire Hoplites, Slingers, Griffins and Minotaurs, and find a spellbook.",
        "Hire the priestess Ianthe, buy a Catapult for walls, and race the rival lord Kassander for Eudora before storming Korax.",
        "A narrator tells the story.",
      ],
    },
  ],
};
