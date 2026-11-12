import type { GamesLikePage } from '../types';

export const snake: GamesLikePage = {
  slug: 'snake',
  classic: 'Snake',
  game: 'inksnake',
  heading: 'Games like Snake you can play today',
  description:
    'Miss Snake from your old Nokia? Play InkSnake free in your browser with no ads, or try Google’s Snake, Slither.io, Snakebird, Snake Pass and more.',
  answer:
    'If you miss Snake, try InkSnake: steer a snake that never stops, eat to grow longer and never bite your own body, with real snakes, coiling round prey too big to swallow and a hawk diving at you. It plays free in any browser, with no ads. Google’s own Snake game still plays the classic rules.',
  oursWhy: [
    'InkSnake keeps the rules everyone learned on a Nokia: the snake never stops, every meal makes it longer, and biting your own body ends the run. Then it makes the snake real. You start as a corn snake on a farm, swallowing mice and frogs whole, and you can watch each meal slide down its body. A rat is too big to swallow, so you circle round it and squeeze.',
    'Crows peck your tail, a red-tailed hawk circles and dives, and each of the ten chapters is a new species with its own trick: a hognose that plays dead, a sidewinder that buries itself in the dunes, a flying snake gliding between treetops. It runs in any browser with no ads: the farm’s ten levels are free and the rest is a one-time $4.99.',
  ],
  alternatives: [
    {
      name: 'Google Snake',
      madeBy: 'Google',
      platforms: 'Browser',
      price: 'Free',
      why: 'The classic rules, built into Google: search “snake game” and play, with a settings menu and daily challenges.',
      url: 'https://www.google.com/fbx?fbx=snake_arcade',
    },
    {
      name: 'Slither.io',
      madeBy: 'Steve Howse, 2016',
      platforms: 'Browser, iPhone, Android',
      price: 'Free, with a paid option to remove ads',
      why: 'Snake as a crowd: every other snake is another player, and the goal is to be the longest on the server. Run your head into another snake and your run is over.',
      url: 'https://apps.apple.com/us/app/slither-io/id1091944550',
    },
    {
      name: 'Snake.io',
      madeBy: 'Kooapps, 2016',
      platforms: 'Browser, iPhone, Android',
      price: 'Free, with ads and in-app purchases',
      why: 'Classic eat-and-grow Snake played online against others. There are ad-free versions on Apple Arcade and Netflix.',
      url: 'https://snake.io/',
    },
    {
      name: 'Snakebird',
      madeBy: 'Noumenon Games, 2015',
      platforms: 'PC, Mac, Linux, iPhone, Android; Snakebird Complete also on Switch',
      price: 'Paid on PC and Switch; free to try on phones, with a one-time unlock',
      why: 'Snake turned into a puzzle game: every fruit your snake-bird eats makes it longer, and getting your length and shape right is the whole puzzle.',
      url: 'https://store.steampowered.com/app/357300/Snakebird/',
    },
    {
      name: 'Snake Pass',
      madeBy: 'Sumo Digital, 2017',
      platforms: 'PC, Switch, PlayStation 4, Xbox',
      price: 'Paid',
      why: 'You are the snake in a 3D world: there is no jumping, so you coil round bamboo poles and climb with real snake physics.',
      url: 'https://store.steampowered.com/app/544330/Snake_Pass/',
    },
  ],
  compare: [
    { label: 'Made by', classic: 'Taneli Armanto at Nokia; first on the Nokia 6110, announced in late 1997', ours: '16bit.ink, 2026' },
    { label: 'Plays on', classic: 'Nokia phones; today, Google’s Snake in a browser', ours: 'Any browser: computer, phone or tablet' },
    { label: 'The snake', classic: 'A line of pixels', ours: 'Ten real species, from a corn snake to an anaconda' },
    { label: 'Danger', classic: 'The walls and your own body', ours: 'Your own body, plus crows, a hawk and a boss in every chapter' },
    { label: 'Ads', classic: 'None on Nokia phones or in Google’s version', ours: 'None, ever' },
    { label: 'Price', classic: 'Came free with the phone; Google’s version is free', ours: 'First 10 levels free; full game $4.99 one-time' },
  ],
  sections: [
    {
      heading: 'Where did Snake come from?',
      paragraphs: [
        'Snake goes back to Blockade, an arcade game by Gremlin Industries from 1976, in which two players steered lines that grew behind them and tried not to crash. Home versions soon followed, from Atari’s Surround in 1977 to Nibbles, which came with MS-DOS from 1991 as a QBasic example.',
        'It became famous on phones. Taneli Armanto programmed Snake for Nokia, and it first shipped on the Nokia 6110, announced at the end of 1997. Snake II, which first came on the Nokia 7110, was on the hugely popular Nokia 3310 in 2000. By 2009, Nokia estimated, Snake had been on some 350 million of its phones, and in 2012 the Museum of Modern Art in New York added it to its collection.',
      ],
    },
    {
      heading: 'Can you still play Snake?',
      paragraphs: [
        'Yes. Google has a free Snake game built into search: search for “snake game” and it comes up, with settings to change the board and a daily challenge. HMD, which makes Nokia phones today, put Snake on its 2024 remake of the Nokia 3210.',
      ],
    },
  ],
  faq: [
    {
      q: 'Who made the original Snake?',
      a: 'The idea goes back to Blockade, a 1976 arcade game by Gremlin Industries. The Snake most people remember was programmed by Taneli Armanto for Nokia and first came on the Nokia 6110.',
    },
    {
      q: 'Can I play Nokia Snake online?',
      a: 'Google’s free Snake game plays the same classic rules in a browser: search for “snake game”. InkSnake keeps those rules too, adds real snakes and their hunters, and plays in any browser.',
    },
    {
      q: 'Is Slither.io like Snake?',
      a: 'Yes: it is Snake played online against other people. You eat to grow longer, the longest snake on the server leads, and running into another snake ends your run.',
    },
    {
      q: 'What games are like Snake?',
      a: 'InkSnake, which you can play free in a browser, plus Google Snake, Slither.io, Snake.io, Snakebird and Snake Pass.',
    },
  ],
  sources: [
    { label: 'Wikipedia: Snake (video game genre)', url: 'https://en.wikipedia.org/wiki/Snake_(video_game_genre)' },
    { label: 'Wikipedia: Blockade', url: 'https://en.wikipedia.org/wiki/Blockade_(video_game)' },
    { label: 'Wikipedia: Snake (1998 video game)', url: 'https://en.wikipedia.org/wiki/Snake_(1998_video_game)' },
    { label: 'Nokia (2009): History of Nokia part 2, Snake', url: 'https://blogs.windows.com/devices/2009/01/20/history-of-nokia-part-2-snake/' },
    { label: 'Wikipedia: Nokia 3310', url: 'https://en.wikipedia.org/wiki/Nokia_3310' },
    { label: 'HMD: Nokia 3210', url: 'https://www.hmd.com/en_int/nokia-3210' },
    { label: 'Wikipedia: Slither.io', url: 'https://en.wikipedia.org/wiki/Slither.io' },
    { label: 'Wikipedia: Snakebird', url: 'https://en.wikipedia.org/wiki/Snakebird_(video_game)' },
    { label: 'Wikipedia: Snake Pass', url: 'https://en.wikipedia.org/wiki/Snake_Pass_(video_game)' },
  ],
  author: 'Hayk',
  published: '2026-10-27',
  updated: '2026-10-27',
};
