/**
 * "Flash games you can still play": well-known Flash games, each with a legal way to play it today
 * (its maker's site, an official remaster, Newgrounds or the Flashpoint Archive, never an
 * "unblocked" portal), and our own take where one of ours plays like it. Fact-checked like the
 * "games like" pages.
 */

import type { Section } from './gamesLike';

export interface FlashGame {
  readonly name: string;
  readonly maker: string;
  readonly year: number;
  /** What it was, in a sentence or two. */
  readonly what: string;
  /** Where to play it today, legally; the first is the best. */
  readonly playNow: readonly { readonly label: string; readonly url: string }[];
  /** The slug of our "games like" page for it, when one of ours plays like it. */
  readonly gamesLike?: string;
}

export interface FlashPage {
  readonly heading: string;
  readonly description: string;
  /** The opening: answers the search by itself, short enough to be quoted whole. */
  readonly answer: string;
  /** Before the list: what happened to Flash and the ways to play it now. */
  readonly sections: readonly Section[];
  readonly faq: readonly { readonly q: string; readonly a: string }[];
  readonly sources: readonly { readonly label: string; readonly url: string }[];
  readonly author: string;
  /** YYYY-MM-DD. */
  readonly published: string;
  /** YYYY-MM-DD: bump it whenever the facts are checked again or the page changes. */
  readonly updated: string;
}

export const FLASH_GAMES: readonly FlashGame[] = [
  {
    name: 'Alien Hominid',
    maker: 'Tom Fulp and Dan Paladin',
    year: 2002,
    what: 'A run-and-gun shooter first put up on Newgrounds: a little yellow alien crash-lands on Earth and blasts its way past FBI agents. It grew into The Behemoth’s console games.',
    playNow: [{ label: 'Alien Hominid HD on Steam', url: 'https://store.steampowered.com/app/1285360/' }, { label: 'Flashpoint Archive', url: 'https://flashpointarchive.org/' }],
  },
  {
    name: 'Fishy',
    maker: 'XGen Studios',
    year: 2003,
    what: 'Steer a small fish with the arrow keys, eat the smaller ones and avoid the bigger ones until you are the biggest fish in the pond.',
    playNow: [
      { label: 'XGen Studios’ own site', url: 'http://www.xgenstudios.com/game.php?keyword=fishy' },
      { label: 'iPhone and iPad', url: 'https://apps.apple.com/us/app/fishy/id1281575578' },
      { label: 'Flashpoint Archive', url: 'https://flashpointarchive.org/' },
    ],
    gamesLike: 'fishy',
  },
  {
    name: 'Motherload',
    maker: 'XGen Studios',
    year: 2004,
    what: 'Pilot a mining pod down under the surface of Mars, sell what you dig and buy upgrades, and get back up before your fuel runs out.',
    playNow: [
      { label: 'XGen Studios’ own site', url: 'http://www.xgenstudios.com/game.php?keyword=motherload' },
      { label: 'Super Motherload on Steam, with the Goldium Edition', url: 'https://store.steampowered.com/app/269110/Super_Motherload/' },
      { label: 'Flashpoint Archive', url: 'https://flashpointarchive.org/' },
    ],
    gamesLike: 'motherload',
  },
  {
    name: 'The Fancy Pants Adventures',
    maker: 'Brad Borne',
    year: 2006,
    what: 'A fast, flowing platformer starring a stick figure in triangle-shaped pants, all momentum, slopes and slides.',
    playNow: [{ label: 'Classic Pack on Steam (Early Access)', url: 'https://store.steampowered.com/app/1668460/' }, { label: 'Flashpoint Archive', url: 'https://flashpointarchive.org/' }],
  },
  {
    name: 'Line Rider',
    maker: 'Boštjan Čadež',
    year: 2006,
    what: 'Draw a track with your mouse, press play and watch a little sledder ride it: part toy, part physics art.',
    playNow: [{ label: 'linerider.com, free in your browser', url: 'https://www.linerider.com/' }, { label: 'Flashpoint Archive', url: 'https://flashpointarchive.org/' }],
  },
  {
    name: 'Bloons Tower Defense',
    maker: 'Ninja Kiwi',
    year: 2007,
    what: 'Place dart-throwing monkeys along a track to pop wave after wave of balloons. It started the Bloons TD series, which is still going with Bloons TD 6.',
    playNow: [
      { label: 'Ninja Kiwi Archive on Steam (free)', url: 'https://store.steampowered.com/app/1275350/Ninja_Kiwi_Archive/' },
      { label: 'Bloons TD 6 on Steam', url: 'https://store.steampowered.com/app/960090/Bloons_TD_6/' },
      { label: 'Flashpoint Archive', url: 'https://flashpointarchive.org/' },
    ],
  },
  {
    name: 'Papa’s Pizzeria',
    maker: 'Flipline Studios',
    year: 2007,
    what: 'Run a pizza shop: take orders, add the toppings, bake and slice, and earn tips for getting each pizza right.',
    playNow: [{ label: 'Papa’s Pizzeria Deluxe on Steam', url: 'https://store.steampowered.com/app/3259470/' }, { label: 'Flashpoint Archive', url: 'https://flashpointarchive.org/' }],
  },
  {
    name: 'The Impossible Quiz',
    maker: 'Splapp-me-do',
    year: 2007,
    what: '110 trick questions in which the obvious answer is almost always the wrong one.',
    playNow: [{ label: 'Flashpoint Archive', url: 'https://flashpointarchive.org/' }],
  },
  {
    name: 'QWOP',
    maker: 'Bennett Foddy',
    year: 2008,
    what: 'Run 100 metres by working a sprinter’s thighs and calves with the Q, W, O and P keys, and fall over a lot.',
    playNow: [{ label: 'Bennett Foddy’s own site', url: 'https://www.foddy.net/legacy/Athletics.html' }, { label: 'Flashpoint Archive', url: 'https://flashpointarchive.org/' }],
  },
  {
    name: 'Meat Boy',
    maker: 'Edmund McMillen and Jonathan McEntee',
    year: 2008,
    what: 'A brutally hard platformer about a cube of meat, which grew into Super Meat Boy.',
    playNow: [{ label: 'Super Meat Boy on Steam', url: 'https://store.steampowered.com/app/40800/Super_Meat_Boy/' }, { label: 'Flashpoint Archive', url: 'https://flashpointarchive.org/' }],
  },
  {
    name: 'Happy Wheels',
    maker: 'Jim Bonacci',
    year: 2010,
    what: 'A gory ragdoll physics game, ridden on courses the players built themselves.',
    playNow: [
      { label: 'Total Jerkface, its maker’s site', url: 'https://totaljerkface.com/happy_wheels.tjf' },
      { label: 'Steam', url: 'https://store.steampowered.com/app/4705510/Happy_Wheels/' },
    ],
  },
  {
    name: 'Kingdom Rush',
    maker: 'Ironhide Game Studio',
    year: 2011,
    what: 'A fantasy tower defense game first released in the browser, which went on to be a hit on phones and PC.',
    playNow: [{ label: 'Steam', url: 'https://store.steampowered.com/app/246420/Kingdom_Rush/' }, { label: 'Flashpoint Archive', url: 'https://flashpointarchive.org/' }],
  },
];

export const FLASH_PAGE: FlashPage = {
  heading: 'Flash games you can still play, and where',
  description:
    'Flash died in 2020, but most of its best games didn’t. Where to play Line Rider, Bloons, Motherload, Fishy, QWOP, Happy Wheels and more today.',
  answer:
    'Most famous Flash games can still be played. Many have official new versions, like Bloons on Steam or Happy Wheels on its maker’s site; others run in your browser through Ruffle, a Flash emulator; and the Flashpoint Archive has saved more than 200,000 web games to play on your own computer.',
  sections: [
    {
      heading: 'What happened to Flash?',
      paragraphs: [
        'Adobe ended support for Flash Player on December 31, 2020, and from January 12, 2021 it blocked Flash content from running. Browsers removed the plugin around the same time, and the games built on it stopped working.',
      ],
    },
    {
      heading: 'How to play Flash games now',
      paragraphs: [
        'There are three good ways. First, look for an official version: many makers rebuilt their games for today, from Ninja Kiwi’s free archive on Steam to Happy Wheels and QWOP on their makers’ own sites.',
        'Second, Ruffle, a free and open-source Flash emulator, runs many old games right in the browser. Newgrounds, the Internet Archive and XGen Studios use it, so some games still play on their old pages.',
        'Third, Ruffle can’t play everything yet, so for the rest there is the Flashpoint Archive: a non-profit preservation project that has saved more than 200,000 web games and animations, with a free launcher to play them on your own computer.',
      ],
    },
  ],
  faq: [
    {
      q: 'Can you still play Flash games?',
      a: 'Yes. Many have official new versions, many run in the browser through the Ruffle emulator, and the Flashpoint Archive has preserved more than 200,000 web games to play on your own computer.',
    },
    {
      q: 'What is Ruffle?',
      a: 'A free, open-source Flash Player emulator written in Rust. It runs in the browser through WebAssembly, so sites can play their old Flash games without the plugin; Newgrounds and the Internet Archive both use it.',
    },
    {
      q: 'What is the Flashpoint Archive?',
      a: 'A non-profit project, started in 2017, that preserves web games and animations: more than 200,000 so far. Its free launcher lets you play them on your own computer.',
    },
    {
      q: 'Are there new games like the old Flash games?',
      a: 'Yes. We make small browser games in a pen-and-ink style, some in the spirit of Flash classics: InkMine plays like Motherload and InkFish like Fishy. They are free to start, with no ads.',
    },
  ],
  sources: [
    { label: 'Adobe: Flash Player end of life', url: 'https://www.adobe.com/products/flashplayer/end-of-life-alternative.html' },
    { label: 'Ruffle', url: 'https://ruffle.rs/' },
    { label: 'Wikipedia: Ruffle', url: 'https://en.wikipedia.org/wiki/Ruffle_(software)' },
    { label: 'Flashpoint Archive', url: 'https://flashpointarchive.org/' },
    { label: 'Wikipedia: Flashpoint Archive', url: 'https://en.wikipedia.org/wiki/Flashpoint_Archive' },
    { label: 'Internet Archive: Flash animations live forever (2020)', url: 'https://blog.archive.org/2020/11/19/flash-animations-live-forever-at-the-internet-archive/' },
    { label: 'Wikipedia: Line Rider', url: 'https://en.wikipedia.org/wiki/Line_Rider' },
    { label: 'Wikipedia: Bloons Tower Defense', url: 'https://en.wikipedia.org/wiki/Bloons_Tower_Defense' },
    { label: 'Wikipedia: Happy Wheels', url: 'https://en.wikipedia.org/wiki/Happy_Wheels' },
    { label: 'Wikipedia: QWOP', url: 'https://en.wikipedia.org/wiki/QWOP' },
    { label: 'Wikipedia: Alien Hominid', url: 'https://en.wikipedia.org/wiki/Alien_Hominid' },
    { label: 'Wikipedia: Super Meat Boy', url: 'https://en.wikipedia.org/wiki/Super_Meat_Boy' },
    { label: 'Wikipedia: Kingdom Rush', url: 'https://en.wikipedia.org/wiki/Kingdom_Rush' },
  ],
  author: 'Hayk',
  published: '2026-10-27',
  updated: '2026-10-27',
};
