import { FPS_LONG } from '../descent/frame';
import { SECTIONS, VOICE_S, WORDS } from './words';

/**
 * When everything happens, in seconds of the video, read off the narration
 * (words.ts) so every beat lands on the word that names it. Section numbers
 * follow script.md: 0 cold open, 1 you, 2 goliath grouper, 3 tiger shark,
 * 4 great white, 5 the game, 6 saltwater crocodile, 7 Greenland shark,
 * 8 whale shark, 9 humpback, 10 sperm whale, 11 the end.
 */

const bare = (s: string): string => s.toLowerCase().replace(/[^a-z0-9'-]/g, '');

/** When `text` is first said at or after `after` seconds (a word or a few words in a row). */
export function said(text: string, after = 0): number {
  const want = text.split(/\s+/).map(bare);
  for (let i = 0; i + want.length <= WORDS.length; i++) {
    if (WORDS[i]!.start < after) continue;
    if (want.every((w, k) => bare(WORDS[i + k]!.text) === w)) return WORDS[i]!.start;
  }
  throw new Error(`"${text}" isn't said after ${after}s`);
}

/** When the words starting with `text` (said at or after `after`) end. */
export function saidEnd(text: string, after = 0): number {
  const start = said(text, after);
  const i = WORDS.findIndex((w) => w.start === start);
  return WORDS[i + text.split(/\s+/).length - 1]!.end;
}

export const sectionStart = (i: number): number => SECTIONS[i]!.start;
export const sectionEnd = (i: number): number => SECTIONS[i]!.end;

/** How long the end card holds after the last word: YouTube's shortest end screen. */
export const END_HOLD_S = 5;
/** The video's length: the end card's hold after the last word, in whole frames. */
export const VIDEO_S = Math.round((Math.max(WORDS[WORDS.length - 1]!.end, VOICE_S - 0.2) + END_HOLD_S) * FPS_LONG) / FPS_LONG;

const s = sectionStart;

/** The beats, section by section. */
export const T = {
  // 0 · cold open: the kayak gulp, "you", the eight mouths
  swallowed: said('swallowed', s(0)),
  kayakAll: said('kayak and all', s(0)),
  inside: said('inside', s(0)),
  spat: said('spat', s(0)),
  grape: said('grape', s(0)),
  question: said("so here's", s(0)),
  you: said('you', s(0)),
  keep: said('keep', s(0)),
  smallest: said('smallest mouth', s(0)),
  biggest: said('biggest throat', s(0)),
  onlyOne: said('only one', s(0)),
  notTheOne: said("it's not the one", s(0)),
  // 1 · you
  meal: said('meal', s(1)),
  thatsYou: said("that's you", s(1)),
  average: said('average', s(1)),
  fiveNine: said('five foot', s(1)),
  shoulders: said('shoulders', s(1)),
  sixteen: said('sixteen', s(1)),
  anything: said('anything', s(1)),
  downThroat: said('down its throat', s(1)),
  testIt: said("let's test", s(1)),
  // 2 · goliath grouper
  grouper: said('goliath', s(2)),
  grouperPounds: said('eight hundred', s(2)),
  trashLid: said('trash', s(2)),
  y2014: said('2014', s(2)),
  florida: said('florida', s(2)),
  blacktip: said('four-foot', s(2)),
  grouperBite: said('bite', s(2)),
  divers: said('following', s(2)),
  grouperNoRecord: said("there's no record", s(2)),
  skinny: said('a four-foot shark is', s(2)),
  youreNot: said("you're not", s(2)),
  grouperNo: said('no', said('verdict', s(2))),
  // 3 · tiger shark
  tiger: said('tiger', s(3)),
  eatAnything: said('anything', s(3)),
  redSea: said('red sea', s(3)),
  cans: said('cans', s(3)),
  bottle: said('bottle', s(3)),
  sacks: said('burlap', s(3)),
  garbage: said('garbage', s(3)),
  butEven: said('but even', s(3)),
  asks: said('asks', s(3)),
  tigerNo: said('no', said('verdict', s(3))),
  // 4 · great white
  jaws: said('jaws', s(4)),
  greatWhite: said('great white', s(4)),
  twentyFeet: said('twenty', s(4)),
  fatal: said('fatal', s(4)),
  seal: said('seal', s(4)),
  bites: said('bites', s(4)),
  tears: said('tears', s(4)),
  shakes: said('shakes', s(4)),
  notWhole4: said("doesn't do", s(4)),
  honestly: said('honestly', s(4)),
  jawsLied: said('lied', s(4)),
  whiteNo: said('no', said('verdict', s(4))),
  // 5 · the game
  game: s(5),
  inkfish: said('inkfish', s(5)),
  eatUp: said('eat your way up', s(5)),
  free: said('chapter', s(5)),
  site5: said('16bit.ink', s(5)),
  // 6 · saltwater crocodile
  hasEaten: said('has eaten', s(6)),
  croc: said('saltwater', s(6)),
  crocTwenty: said('twenty', s(6)),
  crocPounds: said('thousand', s(6)),
  chew: said("can't chew", s(6)),
  smallPrey: said('small prey', s(6)),
  wholeCroc: said('whole', said('small prey', s(6))),
  rocks: said('rocks', s(6)),
  anythingBig: said('anything big', s(6)),
  rolls: said('rolls', s(6)),
  crocTears: said('tears', s(6)),
  crocNo: said('no', said('verdict', s(6))),
  notWhole: said('not whole', s(6)),
  // 7 · Greenland shark
  greenland: said('greenland', s(7)),
  twentyOne: said('twenty-one', s(7)),
  slower: said('slower', s(7)),
  reindeer: said('reindeer', s(7)),
  polarBear: said('polar', s(7)),
  moose: said('moose', s(7)),
  freezing: said('freezing', s(7)),
  mostlyDead: said('and mostly', s(7)),
  greenlandNo: said('no', said('verdict', s(7))),
  // 8 · whale shark
  goBig: said("let's go big", s(8)),
  whaleShark: said('whale shark', s(8)),
  bus: said('school bus', s(8)),
  fiveFeet: said('five feet', s(8)),
  fit: said("you'd fit", s(8)),
  itsThroat: said('its throat', s(8)),
  fourInches: said('four inches', s(8)),
  tiny: said('tiny', s(8)),
  gotIn: said('and if you got', s(8)),
  spit: said('spit', s(8)),
  whaleSharkNo: said('no', said('verdict', s(8))),
  // 9 · humpback
  humpback: said('humpback', s(9)),
  y2021: said('2021', s(9)),
  capeCod: said('cape cod', s(9)),
  packard: said('michael', s(9)),
  bump: said('bump', s(9)),
  everything: said('everything went', s(9)),
  dark: said('dark', s(9)),
  thirty: said('thirty seconds', s(9)),
  thisIsIt: said('this is it', s(9)),
  cameUp: said('came up', s(9)),
  spat9: said('spat', s(9)),
  humpbackThroat: said("a humpback's", s(9)),
  fifteen: said('fifteen', s(9)),
  yourShoulders: said('your shoulders', s(9)),
  sixteen9: said('sixteen', s(9)),
  close: said('close', s(9)),
  humpbackNo: said('no', said('but', said('close', s(9)))),
  // 10 · sperm whale
  whosLeft: said("so who's left", s(10)),
  sperm: said('sperm whale', s(10)),
  sixty: said('sixty', s(10)),
  squid: said('giant squid', s(10)),
  swallowWhole: said('whole', s(10)),
  ninety: said('ninety', s(10)),
  onlyThroat: said('the only one', s(10)),
  aPerson: said('swallow a person', s(10)),
  could: said('could', s(10)),
  story: said('famous story', s(10)),
  y1891: said('1891', s(10)),
  bartley: said('james', s(10)),
  foundAlive: said('found alive', s(10)),
  fake: said('fake', s(10)),
  whaler: said('whaler', s(10)),
  twist: said('because', s(10)),
  noRecord: said('no record', s(10)),
  notInterested: said('the one animal', s(10)),
  wantsSquid: said('wants squid', s(10)),
  notSquid: said("you're not squid", s(10)),
  // 11 · the end
  end: s(11),
  site: said('16bit.ink', s(11)),
} as const;

/** The eight animals, smallest to biggest: the stamp card's order. */
export const ANIMALS = ['grouper', 'tiger', 'white', 'croc', 'greenland', 'whaleShark', 'humpback', 'sperm'] as const;
export type Animal = (typeof ANIMALS)[number];

/** Which section of the script each animal is in. */
export const SECTION_OF: Readonly<Record<Animal, number>> = {
  grouper: 2, tiger: 3, white: 4, croc: 6, greenland: 7, whaleShark: 8, humpback: 9, sperm: 10,
};

/**
 * Each animal's shoulder test: the card slides in (`card`), the bar drops onto
 * the throat (`drop`), and the stamp thumps down (`stamp`).
 */
export interface Test {
  readonly card: number;
  readonly drop: number;
  readonly stamp: number;
}

export const TESTS: Readonly<Record<Animal, Test>> = {
  grouper: { card: T.skinny, drop: T.youreNot, stamp: T.grouperNo },
  tiger: { card: T.butEven, drop: T.asks, stamp: T.tigerNo },
  white: { card: T.honestly, drop: T.jawsLied, stamp: T.whiteNo },
  croc: { card: T.crocTears - 0.3, drop: T.crocTears + 0.6, stamp: T.crocNo },
  greenland: { card: T.mostlyDead, drop: T.mostlyDead + 1.6, stamp: T.greenlandNo },
  whaleShark: { card: T.itsThroat, drop: T.gotIn, stamp: T.whaleSharkNo },
  humpback: { card: T.humpbackThroat, drop: T.sixteen9, stamp: T.humpbackNo },
  sperm: { card: T.onlyThroat, drop: T.aPerson, stamp: T.could },
};

/** The test card leaves this long after its stamp lands. */
export const CARD_HOLD_S = 1.0;

/** The cut-aways' windows (scenes.ts draws them; while one is on, it fills the frame instead of the stage). */
export const FLORIDA = { from: T.y2014 - 0.3, to: T.divers - 1.45 } as const;
export const DIVERS = { from: FLORIDA.to, to: T.skinny - 0.1 } as const;
export const SEAL = { from: T.seal - 1.2, to: T.notWhole4 - 0.15 } as const;
export const CROC_EYES = { from: T.hasEaten - 2.2, to: T.croc - 0.3 } as const;
export const ICE_WALK = { from: T.slower - 0.5, to: T.reindeer - 1.1 } as const;
export const CAPE_COD = { from: T.y2021 - 0.5, to: T.humpbackThroat - 0.2 } as const;
export const CLIPPING = { from: T.story - 0.4, to: T.twist - 0.15 } as const;
