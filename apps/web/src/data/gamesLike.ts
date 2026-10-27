/**
 * "Games like …" pages: one per well-known older game that one of ours plays like, for the people
 * searching for it. One game of ours can have several (InkFish: Fishy, Feeding Frenzy), but an old
 * game gets its own page only when people search for it by name and it has its own story to tell;
 * otherwise mention it on a bigger page (Luxor on Zuma's). Each is written by hand and fact-checked: real history with sources, an honest
 * comparison, and other good games besides ours. Name the classic only to compare, never as if our
 * game were it.
 */

import { findGame, isOut } from './games';

export interface Alternative {
  readonly name: string;
  /** "Image & Form, 2013". */
  readonly madeBy: string;
  /** "PC, Switch, PlayStation, Xbox". */
  readonly platforms: string;
  /** "Paid", "Free in a browser". */
  readonly price: string;
  /** What it shares with the classic, and what's its own. */
  readonly why: string;
  /** Its official page. */
  readonly url: string;
}

export interface CompareRow {
  readonly label: string;
  readonly classic: string;
  readonly ours: string;
}

export interface Section {
  readonly heading: string;
  /** The first paragraph answers the heading by itself. */
  readonly paragraphs: readonly string[];
}

export interface GamesLikePage {
  /** The path after /games-like/, e.g. "motherload". */
  readonly slug: string;
  /** The older game's name, as people type it. */
  readonly classic: string;
  /** Our game's catalog slug. */
  readonly game: string;
  /** The page's h1. */
  readonly heading: string;
  /** The meta description. */
  readonly description: string;
  /** The opening: answers the search in a few sentences that can be quoted whole. */
  readonly answer: string;
  /** About the classic: what it was, then where it can still be played. */
  readonly sections: readonly Section[];
  /** Why ours is on the list, in a paragraph or two, after the comparison table. */
  readonly oursWhy: readonly string[];
  readonly compare: readonly CompareRow[];
  /** Other games like the classic, best first; ours is listed above them. */
  readonly alternatives: readonly Alternative[];
  readonly faq: readonly { readonly q: string; readonly a: string }[];
  readonly sources: readonly { readonly label: string; readonly url: string }[];
  readonly author: string;
  /** YYYY-MM-DD. */
  readonly published: string;
  /** YYYY-MM-DD: bump it whenever the facts are checked again or the page changes. */
  readonly updated: string;
}

export const GAMES_LIKE: readonly GamesLikePage[] = [
  {
    slug: 'motherload',
    classic: 'Motherload',
    game: 'inkmine',
    heading: 'Games like Motherload you can play today',
    description:
      'Miss Motherload, the 2004 Flash mining game? Play InkMine free in your browser with no ads, or try Super Motherload, SteamWorld Dig, Dome Keeper and more.',
    answer:
      'If you loved Motherload, try InkMine: you drill down for ore and climb back before your drill energy and air run out, on small alien moons, with a story. It plays free in any browser, with no ads. For more, try Super Motherload, SteamWorld Dig and Dome Keeper.',
    oursWhy: [
      'InkMine is our own take on the same push-your-luck loop. A wormhole threw you onto a small moon no chart has. Every block costs drill energy and every trip costs air, so you are always weighing one more vein against the climb home.',
      'There is no money and no shop: what you dig is what you build with. You print the parts your wrecked lander needs, meet aliens who speak no language you know, and fly on from world to world. It runs in any browser, on a phone too, with no ads: the first world is free and the rest is a one-time $4.99.',
    ],
    alternatives: [
      {
        name: 'Super Motherload',
        madeBy: 'XGen Studios, 2013',
        platforms: 'PC, PlayStation 4, PlayStation 3',
        price: 'Paid',
        why: 'The official sequel. Same mining pod, Mars again, now with local co-op for up to four players and a new world every game. The Steam version comes with the original Motherload Goldium Edition.',
        url: 'https://store.steampowered.com/app/269110',
      },
      {
        name: 'SteamWorld Dig',
        madeBy: 'Image & Form, 2013',
        platforms: 'PC, Switch, PlayStation, Xbox, 3DS, Wii U',
        price: 'Paid',
        why: 'The closest in feel: dig straight down, carry your ore back up to a little mining town, sell it and upgrade your tools. A western-flavoured robot story ties it together.',
        url: 'https://store.steampowered.com/app/252410/SteamWorld_Dig/',
      },
      {
        name: 'SteamWorld Dig 2',
        madeBy: 'Image & Form, 2017',
        platforms: 'PC, Switch, PlayStation, Xbox',
        price: 'Paid',
        why: 'The same dig, sell and upgrade loop, grown into a bigger adventure with new tools that open up new areas and hand-made puzzle caves.',
        url: 'https://store.steampowered.com/app/571310/SteamWorld_Dig_2/',
      },
      {
        name: 'A Game About Digging A Hole',
        madeBy: 'DoubleBee, 2025',
        platforms: 'PC, PlayStation 5, Xbox Series X|S, Switch',
        price: 'Paid',
        why: 'Motherload in first person, in your back garden: dig, sell what you find, upgrade and dig deeper. Players on its Steam forum call it exactly that.',
        url: 'https://store.steampowered.com/app/3244220/',
      },
      {
        name: 'Dome Keeper',
        madeBy: 'Bippinbits, 2022',
        platforms: 'PC, Mac, Linux, Xbox Series X|S',
        price: 'Paid, with a free demo',
        why: 'Mine under your dome and haul resources back to upgrade it, then race up to defend it from the next wave of monsters. A roguelike, so every run starts fresh.',
        url: 'https://store.steampowered.com/app/1637320/Dome_Keeper/',
      },
      {
        name: 'Mr. Driller',
        madeBy: 'Namco, 1999',
        platforms: 'Arcade, then many consoles',
        price: 'Paid',
        why: 'Pure drilling against an air meter that keeps running down, while blocks fall in from above. No shop or upgrades, just how deep you can get.',
        url: 'https://en.wikipedia.org/wiki/Mr._Driller_(video_game)',
      },
    ],
    compare: [
      { label: 'Made by', classic: 'XGen Studios, 2004', ours: '16bit.ink, 2026' },
      { label: 'Where', classic: 'Under the surface of Mars', ours: 'Small alien moons, after a wormhole crash' },
      { label: 'What runs out', classic: 'Fuel, and your hull wears down', ours: 'Drill energy and air' },
      { label: 'What you dig for', classic: 'Cash for upgrades and items', ours: 'Ore to print repairs and gear: there is no money' },
      { label: 'Story', classic: 'Light, with a twist deep down', ours: 'A crash-landing, aliens to meet and a way home to find' },
      { label: 'Plays on', classic: 'Computer browsers, through a Flash emulator', ours: 'Any browser: computer, phone or tablet' },
      { label: 'Ads', classic: 'In the free browser versions; the paid Goldium Edition has none', ours: 'None, ever' },
      { label: 'Price', classic: 'Free in a browser; Goldium Edition $9.99', ours: 'First world free; full game $4.99 one-time' },
    ],
    sections: [
      {
        heading: 'What was Motherload?',
        paragraphs: [
          'Motherload is a free Flash mining game by XGen Studios, released on September 29, 2004. You pilot a mining pod down through the rock of Mars in search of the Motherload, a fabled cache of rare and valuable minerals.',
          'Every trip down is a gamble. The pod burns fuel as it digs and flies, the hull takes damage from lava and hidden gas pockets, earthquakes can wreck your tunnels, and the cargo bay only holds so much. Back on the surface you sell what you carried at the mineral depot and spend the cash on upgrades and on items like reserve fuel tanks, hull repair nanites and dynamite. XGen says it tips its hat to Dig Dug and Boulder Dash.',
          'XGen’s own counter puts it at over 19 million plays, and many players remember it from Miniclip. Deep down it has a story twist people still talk about; we won’t spoil it here.',
        ],
      },
      {
        heading: 'Can you still play Motherload?',
        paragraphs: [
          'Yes. Flash itself is gone: Adobe ended support for Flash Player on December 31, 2020 and began blocking Flash content on January 12, 2021. But XGen Studios now runs the original on its own website through Ruffle, a Flash emulator, and CrazyGames hosts it the same way for desktop browsers.',
          'For a copy to keep, the Goldium Edition ($9.99, Windows) adds more upgrades, a challenge mode and hidden easter eggs with no ads, and it comes free with Super Motherload on Steam.',
        ],
      },
    ],
    faq: [
      {
        q: 'Is there a Motherload 2?',
        a: 'The official sequel is Super Motherload by XGen Studios, released in 2013 for PlayStation 4 and PlayStation 3 and in 2014 for Windows. It keeps the mining pod and Mars and adds local co-op for up to four players.',
      },
      {
        q: 'Who made Motherload?',
        a: 'XGen Studios, a Canadian studio, released Motherload as a free Flash game in 2004. XGen was founded by Skye Boyes, who led the team that made it.',
      },
      {
        q: 'Can I play Motherload on my phone?',
        a: 'Not really: the original was made for a computer and a keyboard, and CrazyGames lists it for desktop only. InkMine has the same dig-down, get-back-up loop and plays in a phone browser with touch controls.',
      },
      {
        q: 'What games are like Motherload?',
        a: 'InkMine, which you can play free in a browser, plus Super Motherload, SteamWorld Dig, SteamWorld Dig 2, A Game About Digging A Hole, Dome Keeper and Mr. Driller.',
      },
    ],
    sources: [
      { label: 'XGen Studios: Motherload (play page and instructions)', url: 'http://www.xgenstudios.com/game.php?keyword=motherload' },
      { label: 'XGen Studios home page (release date, play count)', url: 'http://www.xgenstudios.com/' },
      { label: 'XGen Studios: Motherload Goldium Edition', url: 'http://www.xgenstudios.com/motherload-goldium/' },
      { label: 'Wikipedia: Super Motherload', url: 'https://en.wikipedia.org/wiki/Super_Motherload' },
      { label: 'Steam: Super Motherload', url: 'https://store.steampowered.com/app/269110' },
      { label: 'Adobe: Flash Player end of life', url: 'https://www.adobe.com/products/flashplayer/end-of-life.html' },
      { label: 'CrazyGames: Motherload', url: 'https://www.crazygames.com/game/motherload' },
      { label: 'Steam forum: “So basically First person Miniclip’s "MotherLoad"”', url: 'https://steamcommunity.com/app/3244220/discussions/0/783166390287737006' },
      { label: 'Wikipedia: SteamWorld Dig', url: 'https://en.wikipedia.org/wiki/SteamWorld_Dig' },
      { label: 'Wikipedia: XGen Studios', url: 'https://en.wikipedia.org/wiki/XGen_Studios' },
      { label: 'Wikipedia: Dome Keeper', url: 'https://en.wikipedia.org/wiki/Dome_Keeper' },
    ],
    author: 'Hayk',
    published: '2026-10-27',
    updated: '2026-10-27',
  },
  {
    slug: 'feeding-frenzy',
    classic: 'Feeding Frenzy',
    game: 'inkfish',
    heading: 'Games like Feeding Frenzy you can play today',
    description:
      'Miss Feeding Frenzy, PopCap’s 2004 fish-eat-fish game? Play InkFish free in your browser with no ads, or try Feeding Frenzy 2, SHARK! SHARK!, Hungry Shark World and more.',
    answer:
      'If you miss Feeding Frenzy, try InkFish: you start as the smallest fish, eat anything smaller and grow until the fish that hunted you become lunch, chaining meals into an Ink Frenzy. It plays free in any browser, with no ads. For more, try Feeding Frenzy 2, SHARK! SHARK! and Hungry Shark World.',
    oursWhy: [
      'InkFish plays the same way at heart: you start as a doodle-sized fry, eat anything smaller than you and grow until the fish that hunted you become lunch. Chain meals quickly and you build an Ink Frenzy, our own take on the frenzy bonus.',
      'Each level has its own surprises: fishing hooks and jellyfish drift through, and things sink from above, like a battery that shocks predators or a plastic bag you really shouldn’t eat. There are a hundred levels across ten zones, playable in any browser on a computer or phone, with no ads: the first ten levels are free and the rest is a one-time $4.99.',
    ],
    alternatives: [
      {
        name: 'Feeding Frenzy 2: Shipwreck Showdown',
        madeBy: 'Sprout Games and PopCap, 2006',
        platforms: 'PC, Xbox One, Xbox Series X|S',
        price: 'Paid',
        why: 'The sequel, and still on sale: the same eat-and-grow rules over 60 new levels of reefs, caves and sunken ships, with local multiplayer for up to four on Xbox.',
        url: 'https://store.steampowered.com/app/3390/Feeding_Frenzy_2_Deluxe/',
      },
      {
        name: 'SHARK! SHARK!',
        madeBy: 'BBG Entertainment, 2023',
        platforms: 'PC, Mac, Switch, PlayStation, Xbox',
        price: 'Paid',
        why: 'A remake of the 1982 Intellivision game that had the same idea two decades before Feeding Frenzy: eat smaller fish, grow and dodge the sharks. Up to four players, and the 1982 original comes with it.',
        url: 'https://store.steampowered.com/app/2410640/',
      },
      {
        name: 'Hungry Shark World',
        madeBy: 'Future Games of London and Ubisoft, 2016',
        platforms: 'iPhone, Android, Switch, Xbox',
        price: 'Free with ads and in-app purchases on phones; paid on consoles',
        why: 'The eat-and-grow idea as a shark with an appetite for everything: eat, grow and unlock ever bigger sharks across open seas.',
        url: 'https://www.nintendo.com/us/store/products/hungry-shark-world-switch/',
      },
      {
        name: 'Feed and Grow: Fish',
        madeBy: 'Old B1ood, 2016',
        platforms: 'PC',
        price: 'Paid, in Early Access',
        why: 'Feeding Frenzy in 3D, as some of its players put it: hunt, eat and grow into a bigger fish. It is still in Early Access, and its makers have not updated it in years.',
        url: 'https://store.steampowered.com/app/429050/',
      },
      {
        name: 'Osmos',
        madeBy: 'Hemisphere Games, 2009',
        platforms: 'PC, Mac, Linux, iPhone, Android',
        price: 'Paid',
        why: 'The same law of the sea, made abstract and calm: absorb the motes smaller than you and steer clear of the bigger ones.',
        url: 'https://www.osmos-game.com',
      },
    ],
    compare: [
      { label: 'Made by', classic: 'Sprout Games, published by PopCap, 2004', ours: '16bit.ink, 2026' },
      { label: 'Plays on', classic: 'Xbox One and Series X|S today; first PC and Mac', ours: 'Any browser: computer, phone or tablet' },
      { label: 'Levels', classic: '40, playing five different sea creatures', ours: '100, across ten zones' },
      { label: 'The bonus', classic: 'Eat fast for a Feeding Frenzy, keep it up for a Double Frenzy', ours: 'Chain meals into an Ink Frenzy' },
      { label: 'Hazards', classic: 'Depth charges, mines and jellyfish', ours: 'Fishing hooks, jellyfish and things sinking from above' },
      { label: 'Ads', classic: 'None: it is a paid game', ours: 'None, ever' },
      { label: 'Price', classic: '$4.99 on the Xbox Store', ours: 'First 10 levels free; full game $4.99 one-time' },
    ],
    sections: [
      {
        heading: 'What was Feeding Frenzy?',
        paragraphs: [
          'Feeding Frenzy is a fish-eat-fish arcade game made by Sprout Games and published by PopCap, released in 2004 for Windows and Mac. You start small, eat the fish smaller than you and avoid the bigger ones, and by the end of a level you can eat almost anything in the sea.',
          'Eating quickly in a row sets off a Feeding Frenzy for bonus points, and keeping it going gives a Double Frenzy. Across 40 levels you play five sea creatures, starting with Andy the angelfish, while dodging depth charges, mines and jellyfish.',
          'It came to Xbox Live Arcade, first on the original Xbox and in 2006 on Xbox 360, and a sequel, Feeding Frenzy 2: Shipwreck Showdown, followed the same year with 60 new levels. The idea itself is older: Shark! Shark!, a 1982 Intellivision game, also had you eat smaller fish and grow while dodging sharks.',
        ],
      },
      {
        heading: 'Can you still play Feeding Frenzy?',
        paragraphs: [
          'Yes, on Xbox: Feeding Frenzy and Feeding Frenzy 2 are both sold on the Xbox Store for $4.99 and play on Xbox One and Xbox Series X|S. On PC, Steam sells Feeding Frenzy 2 Deluxe for Windows, but we could not find the first game on sale for PC anywhere today.',
        ],
      },
    ],
    faq: [
      {
        q: 'Is there a Feeding Frenzy 3?',
        a: 'No. The series stopped at Feeding Frenzy 2: Shipwreck Showdown in 2006, which later came to Xbox 360 and PlayStation 3.',
      },
      {
        q: 'Who made Feeding Frenzy?',
        a: 'Sprout Games developed it and PopCap Games published it in 2004. PopCap is now part of Electronic Arts, which publishes the game on the Xbox Store.',
      },
      {
        q: 'Can I play Feeding Frenzy on my phone?',
        a: 'There was a version for older Java phones, but we found none for today’s iPhone or Android phones. InkFish plays the same way in a phone browser, steered with your finger.',
      },
      {
        q: 'What games are like Feeding Frenzy?',
        a: 'InkFish, which you can play free in a browser, plus Feeding Frenzy 2, SHARK! SHARK!, Hungry Shark World, Feed and Grow: Fish and Osmos.',
      },
    ],
    sources: [
      { label: 'Wikipedia: Feeding Frenzy', url: 'https://en.wikipedia.org/wiki/Feeding_Frenzy_(video_game)' },
      { label: 'Wikipedia: Feeding Frenzy 2: Shipwreck Showdown', url: 'https://en.wikipedia.org/wiki/Feeding_Frenzy_2:_Shipwreck_Showdown' },
      { label: 'Xbox Store: Feeding Frenzy', url: 'https://www.xbox.com/en-US/games/store/feeding-frenzy/BRBRQCVTJG2D' },
      { label: 'Xbox Store: Feeding Frenzy 2', url: 'https://www.xbox.com/en-US/games/store/feeding-frenzy-2/BQ192SFB694X' },
      { label: 'Steam: Feeding Frenzy 2 Deluxe', url: 'https://store.steampowered.com/app/3390/Feeding_Frenzy_2_Deluxe/' },
      { label: 'Wikipedia: Shark! Shark!', url: 'https://en.wikipedia.org/wiki/Shark!_Shark!' },
      { label: 'Google Play: Hungry Shark World', url: 'https://play.google.com/store/apps/details?id=com.ubisoft.hungrysharkworld' },
      { label: 'Steam forum: “Spiritual Successor to Feeding Frenzy?”', url: 'https://steamcommunity.com/app/429050/discussions/0/1471969431588858028/' },
    ],
    author: 'Hayk',
    published: '2026-10-27',
    updated: '2026-10-27',
  },
  {
    slug: 'zuma',
    classic: 'Zuma',
    game: 'inkgecko',
    heading: 'Games like Zuma you can play today',
    description:
      'Miss Zuma? Play InkGecko, a marble shooter free in your browser with no ads, or try Zuma’s Revenge!, Luxor, Tumblebugs and more. Plus where to play Zuma now.',
    answer:
      'If you miss Zuma, try InkGecko: a gecko spits marbles into a rolling chain, three of a colour pop, and closing a gap rolls the line back for a combo. It plays free in any browser, with no ads at all. For more, try Zuma’s Revenge!, Luxor and Tumblebugs.',
    oursWhy: [
      'InkGecko is a marble shooter of the same family. A line of coloured marbles rolls along a garden path towards an old well, and your gecko spits marbles into it. Three of a colour pop, and when the colours either side of a gap match, the line rolls back for a combo. Its skin turns the colour of the marble in its mouth.',
      'Each of its ten gardens adds a trick of its own, from tunnels and twined pairs to chameleon marbles and bank shots off barn walls, and each garden ends with a boss. There are no ads, not between levels and not ever: the first garden’s ten levels are free and the rest is a one-time $4.99. Many free marble shooters online are paid for with ads instead; Megazuma on Playgama, for one, shows an ad before the game even starts.',
    ],
    alternatives: [
      {
        name: 'Zuma’s Revenge!',
        madeBy: 'PopCap Games, 2009',
        platforms: 'PC',
        price: 'Paid',
        why: 'The official sequel: the same stone frog and rolling chains, now with boss fights and new power-ups.',
        url: 'https://store.steampowered.com/app/3620/Zumas_Revenge/',
      },
      {
        name: 'Luxor',
        madeBy: 'MumboJumbo, 2005',
        platforms: 'PC; Luxor Evolved also on Switch, PlayStation 4, Xbox One',
        price: 'Paid',
        why: 'The same chain-shooting idea in ancient Egypt: you slide along the bottom of the screen and fire spheres up at the line before it reaches your pyramids. A long series followed.',
        url: 'https://store.steampowered.com/app/15970/Luxor/',
      },
      {
        name: 'Tumblebugs',
        madeBy: 'Wildfire Studios, 2005',
        platforms: 'PC',
        price: 'Paid',
        why: 'Fire coloured bugs into a rolling line of bugs and match them before they roll into the Black Bug Empire’s lair: the Zuma rules with a cheerful insect story.',
        url: 'https://store.steampowered.com/app/1843880/',
      },
      {
        name: 'Puzzle Bobble Everybubble!',
        madeBy: 'Taito, 2023',
        platforms: 'Switch, PC',
        price: 'Paid',
        why: 'A cousin rather than a twin: you aim and match colours the same way, but at a grid of bubbles creeping down instead of a rolling chain.',
        url: 'https://store.steampowered.com/app/3990960/',
      },
      {
        name: 'Marble Mission',
        madeBy: 'MOBIRIX',
        platforms: 'iPhone, Android',
        price: 'Free, with ads and in-app purchases',
        why: 'A phone marble shooter in the Zuma mould, close to it in look and rules, for playing on the go.',
        url: 'https://apps.apple.com/app/id1380019068',
      },
    ],
    compare: [
      { label: 'Made by', classic: 'PopCap Games, 2003', ours: '16bit.ink, 2026' },
      { label: 'Who shoots', classic: 'A stone frog idol', ours: 'A gecko whose skin turns the colour of its marble' },
      { label: 'Where', classic: 'Jungle temples; the chain heads for a golden skull', ours: 'Ten gardens; the chain heads for an old well' },
      { label: 'Extras', classic: 'Backwards, Slow-down, Accuracy and Explosion balls', ours: 'A new trick in every garden and a boss at the end of each' },
      { label: 'Plays on', classic: 'Windows (Zuma Deluxe on Steam, which also lists an old Mac version)', ours: 'Any browser: computer, phone or tablet' },
      { label: 'Ads', classic: 'None in Zuma Deluxe, a paid game; free copies online, like Megazuma, show them', ours: 'None, ever' },
      { label: 'Price', classic: '$4.99 on Steam', ours: 'First 10 levels free; full game $4.99 one-time' },
    ],
    sections: [
      {
        heading: 'What was Zuma?',
        paragraphs: [
          'Zuma is a marble-shooting puzzle game developed and published by PopCap Games, released on December 12, 2003. From a stone frog idol deep in a jungle temple you fire coloured balls into a chain rolling along a track. Three or more of a colour vanish, and the chain must never reach the golden skull at its end.',
          'Special balls push the chain backwards, slow it down, show exactly where your shot will land or blow up the balls around them. Zuma Deluxe came to Windows, Mac, Xbox Live Arcade and PlayStation Network, Zuma’s Revenge! followed in 2009, and PopCap has been part of Electronic Arts since 2011.',
          'The idea came a little earlier: Mitchell Corporation’s 1998 arcade game Puzz Loop also had you shoot apart a chain of balls. Mitchell said Zuma infringed on it; PopCap said Zuma was not an exact clone. Luxor took up the same idea in 2005, in ancient Egypt.',
        ],
      },
      {
        heading: 'Can you still play Zuma?',
        paragraphs: [
          'Yes, on Windows: Steam still sells Zuma Deluxe and Zuma’s Revenge! for $4.99 each. Zuma Blitz, the Facebook version, closed on March 31, 2017, and we found no free official version to play online.',
          'The free games online with “Zuma” in their names, such as Megazuma on Playgama (made by Jim Games), come from other studios and are paid for with ads.',
        ],
      },
    ],
    faq: [
      {
        q: 'Is Zuma free?',
        a: 'The official Zuma games are paid: Zuma Deluxe and Zuma’s Revenge! cost $4.99 each on Steam. The free Zuma-style games online come from other studios and often show ads. InkGecko is free to start with no ads, and the full game is a one-time $4.99.',
      },
      {
        q: 'Is there a new Zuma game?',
        a: 'Not from PopCap for a long time. The last new one we know of was Zuma Blitz on Facebook, which ran from 2010 until it closed in 2017; the last for PC was Zuma’s Revenge! in 2009. Later releases, such as Zuma’s Revenge! on iPhone and Nintendo DS, were ports.',
      },
      {
        q: 'Who made Zuma?',
        a: 'PopCap Games, which developed and published it in 2003. PopCap has been owned by Electronic Arts since 2011.',
      },
      {
        q: 'What games are like Zuma?',
        a: 'InkGecko, which you can play free in a browser with no ads, plus Zuma’s Revenge!, Luxor, Tumblebugs, Puzzle Bobble Everybubble! and Marble Mission.',
      },
    ],
    sources: [
      { label: 'Wikipedia: Zuma', url: 'https://en.wikipedia.org/wiki/Zuma_(video_game)' },
      { label: 'Steam: Zuma Deluxe', url: 'https://store.steampowered.com/app/3330/Zuma_Deluxe/' },
      { label: 'Steam: Zuma’s Revenge!', url: 'https://store.steampowered.com/app/3620/Zumas_Revenge/' },
      { label: 'EA: Zuma Blitz retirement notice', url: 'https://www.ea.com/notices/zuma-blitz' },
      { label: 'Wikipedia: Puzz Loop', url: 'https://en.wikipedia.org/wiki/Puzz_Loop' },
      { label: 'Wikipedia: Luxor', url: 'https://en.wikipedia.org/wiki/Luxor_(video_game)' },
      { label: 'Playgama: Megazuma', url: 'https://playgama.com/game/megazuma' },
      { label: 'App Store: Marble Mission', url: 'https://apps.apple.com/app/id1380019068' },
      { label: 'Steam forum: “I wish there was a new Zuma”', url: 'https://steamcommunity.com/app/3620/discussions/0/619568192934752623' },
    ],
    author: 'Hayk',
    published: '2026-10-27',
    updated: '2026-10-27',
  },
  {
    slug: 'fishy',
    classic: 'Fishy',
    game: 'inkfish',
    heading: 'Games like Fishy you can play today',
    description:
      'Miss Fishy, XGen’s Flash fish-eat-fish game? Play InkFish free in your browser with no ads, or play the original again. Plus Agar.io, flOw, Feeding Frenzy and more.',
    answer:
      'If you miss Fishy, the old XGen Flash game, try InkFish: you start as the smallest fish, eat anything smaller and grow until you rule the water. It plays free in any browser, phone included, with no ads. You can still play the original on XGen’s site, and Agar.io plays by the same rule.',
    oursWhy: [
      'InkFish keeps Fishy’s simple rule: anything smaller is food, anything bigger is trouble. You start as a doodle-sized fry and eat your way up until the fish that hunted you become lunch, steering with the mouse or a finger instead of the arrow keys.',
      'Around that rule it builds levels with their own surprises: chained meals build an Ink Frenzy, fishing hooks and jellyfish drift through, and things sink from above, like a battery that shocks predators. There are a hundred levels across ten zones, playable in any browser, with no ads: the first ten levels are free and the rest is a one-time $4.99.',
    ],
    alternatives: [
      {
        name: 'Agar.io',
        madeBy: 'Matheus Valadares, published by Miniclip, 2015',
        platforms: 'Browser, iPhone, Android',
        price: 'Free, with ads and in-app purchases',
        why: 'Fishy’s rule, online with other people: you are a cell among other players’ cells, eating the smaller ones and running from the bigger ones.',
        url: 'https://agar.io',
      },
      {
        name: 'flOw',
        madeBy: 'Jenova Chen and Nicholas Clark, 2006',
        platforms: 'Browser (Flash, so today through Flashpoint or a Flash emulator); later PlayStation',
        price: 'Free',
        why: 'Another free Flash game from the same years: a creature in the deep eats smaller organisms to grow. thatgamecompany later remade it for PlayStation.',
        url: 'https://interactive.usc.edu/projects/cloud/flowing/',
      },
      {
        name: 'Feeding Frenzy',
        madeBy: 'Sprout Games and PopCap, 2004',
        platforms: 'Xbox One, Xbox Series X|S',
        price: 'Paid',
        why: 'The bigger, paid cousin from a year later: eat smaller fish and grow over 40 levels, with a frenzy bonus for eating fast.',
        url: 'https://www.xbox.com/en-US/games/store/feeding-frenzy/BRBRQCVTJG2D',
      },
      {
        name: 'Spore',
        madeBy: 'Maxis, 2008',
        platforms: 'PC',
        price: 'Paid',
        why: 'Its first stage is Fishy in a tide pool: steer a microbe, eat to grow and dodge predators, before your creature evolves onto land.',
        url: 'https://store.steampowered.com/app/17390/',
      },
    ],
    compare: [
      { label: 'Made by', classic: 'XGen Studios, 2003', ours: '16bit.ink, 2026' },
      { label: 'Controls', classic: 'Arrow keys', ours: 'Mouse or finger, plus a dash' },
      { label: 'Goal', classic: 'Become the biggest fish in the pond', ours: 'Grow from fry to the top of the food chain, level after level' },
      { label: 'Levels', classic: 'A run of levels, plus Fishy Classic without them', ours: '100, across ten zones, with hooks, jellyfish and things sinking from above' },
      { label: 'Plays on', classic: 'Computer browsers through a Flash emulator; iPhone and iPad since 2018', ours: 'Any browser: computer, phone or tablet' },
      { label: 'Ads', classic: 'Ad banners around the free browser version', ours: 'None, ever' },
      { label: 'Price', classic: 'Free in a browser; $0.99 on iPhone', ours: 'First 10 levels free; full game $4.99 one-time' },
    ],
    sections: [
      {
        heading: 'What was Fishy?',
        paragraphs: [
          'Fishy is a free Flash game by XGen Studios, the Canadian studio that later made Motherload, first put up on Newgrounds as “! Fishy !” in February 2003. You steer a small fish with the arrow keys, eat the fish smaller than you, avoid the bigger ones, and grow until you become the biggest fish in the pond.',
          'It takes seconds to learn, and on Newgrounds alone it has passed four million views. Many other games have borrowed its name since, which is why searching for “Fishy” turns up several different fish games.',
        ],
      },
      {
        heading: 'Can you still play Fishy?',
        paragraphs: [
          'Yes. Adobe retired Flash Player at the end of 2020, but XGen Studios runs the original on its own website through Ruffle, a Flash emulator, next to Fishy Classic, a version without levels. It is also preserved, playable, in the Flashpoint Archive, and XGen sells a phone version on the App Store for $0.99.',
        ],
      },
    ],
    faq: [
      {
        q: 'Who made Fishy?',
        a: 'XGen Studios, a Canadian studio, which also made Motherload. It went up on Newgrounds as “! Fishy !” in 2003.',
      },
      {
        q: 'Can I play Fishy on my phone?',
        a: 'XGen released Fishy for iPhone and iPad in 2018, for $0.99. InkFish plays the same eat-and-grow game in any phone browser, steered with your finger, and is free to start.',
      },
      {
        q: 'Is Fishy the same game as Feeding Frenzy?',
        a: 'No. Both have you eat smaller fish to grow, but Fishy is a free Flash game by XGen Studios from 2003, and Feeding Frenzy is a Sprout Games and PopCap game from 2004, sold for PC and later Xbox.',
      },
      {
        q: 'What games are like Fishy?',
        a: 'InkFish, which you can play free in a browser, plus Agar.io, flOw, Feeding Frenzy and the first stage of Spore.',
      },
    ],
    sources: [
      { label: 'XGen Studios: Fishy', url: 'http://www.xgenstudios.com/game.php?keyword=fishy' },
      { label: 'Newgrounds wiki: ! Fishy !', url: 'https://newgrounds.wiki.gg/wiki/!_Fishy_!' },
      { label: 'Flashpoint Archive: ! Fishy !', url: 'https://flashpointproject.github.io/flashpoint-database/search/#bcbc81ab-b5ba-4afe-839d-40e8a25271e0' },
      { label: 'App Store: Fishy', url: 'https://apps.apple.com/us/app/fishy/id1281575578' },
      { label: 'Wikipedia: XGen Studios', url: 'https://en.wikipedia.org/wiki/XGen_Studios' },
      { label: 'Wikipedia: Agar.io', url: 'https://en.wikipedia.org/wiki/Agar.io' },
      { label: 'Wikipedia: flOw', url: 'https://en.wikipedia.org/wiki/Flow_(video_game)' },
      { label: 'Adobe: Flash Player end of life', url: 'https://www.adobe.com/products/flashplayer/end-of-life.html' },
    ],
    author: 'Hayk',
    published: '2026-10-27',
    updated: '2026-10-27',
  },
];

export const findGamesLike = (slug: string): GamesLikePage | undefined => GAMES_LIKE.find((p) => p.slug === slug);

/** The pages for people searching for the old games ours plays like: one per old game, so a game can have several. */
export const gamesLikeFor = (gameSlug: string, pages: readonly GamesLikePage[] = GAMES_LIKE): GamesLikePage[] =>
  pages.filter((p) => p.game === gameSlug);

/** Pages whose game is out: a page never sends people to a game they can't play yet. */
export function listedGamesLike(now: Date, pages: readonly GamesLikePage[] = GAMES_LIKE): GamesLikePage[] {
  return pages.filter((p) => {
    const game = findGame(p.game);
    return game?.status === 'playable' && isOut(game, now);
  });
}
