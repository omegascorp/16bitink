import { FPS_LONG } from '../descent/frame';
import type { Monster } from './species';
import { SECTIONS, VOICE_S, WORDS } from './words';

/**
 * When everything happens, in seconds of the video, read off the narration
 * (words.ts) so every beat lands on the word that names it. Section numbers
 * follow script.md: 0 cold open, 1 you, 2 frilled shark, 3 manatee,
 * 4 oarfish, 5 the game, 6 basking shark, 7 giant squid, 8 sperm whale,
 * 9 blue whale, 10 the siphonophore, 11 the end.
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
  // 0 · cold open: the engravings, the tear, the real eye, the row, the string
  monsters: said('monsters', s(0)),
  serpents: said('sea serpents', s(0)),
  island: said('squid the size', s(0)),
  whaleShip: said('a whale that sank', s(0)),
  thing: said("here's the thing", s(0)),
  justMaking: said('just', s(0)),
  real: said('real animal', s(0)),
  lining: said('lining', s(0)),
  yourSize: said('your size', s(0)),
  hundredFeet: said('a hundred feet', s(0)),
  megalodon: said('megalodon', s(0)),
  godzilla: said('godzilla', s(0)),
  longest: said('the longest', s(0)),
  oneAnimal: said('one animal', s(0)),
  // 1 · you
  forScale: said('for scale', s(1)),
  thatsYou: said("that's you", s(1)),
  fiveNine: said('five foot', s(1)),
  keepEye: said('keep an eye', s(1)),
  small: said('small', s(1)),
  // 2 · frilled shark
  frilledFirst: said('first', s(2)),
  frilled: said('frilled', s(2)),
  eel: said('eel', s(2)),
  teeth: said('three hundred', s(2)),
  trident: said('trident', s(2)),
  pregnant: said('pregnant', s(2)),
  years: said('years', s(2)),
  scientist: said('the scientist', s(2)),
  y1884: said('1884', s(2)),
  serpentStories: said('sea-serpent', s(2)),
  sixHalf: said('six and a half', s(2)),
  warming: said('warming', s(2)),
  // 3 · manatee
  mermaid: said('mermaid', s(3)),
  y1493: said('1493', s(3)),
  columbus: said('christopher', s(3)),
  pretty: said('pretty', s(3)),
  manatees: said('manatees', s(3)),
  thirteen: said('thirteen', s(3)),
  salad: said('salad', s(3)),
  rude: said('rude', s(3)),
  // 4 · oarfish
  realSerpent: said('real sea serpent', s(4)),
  oarfish: said('oarfish', s(4)),
  twentySix: said('twenty-six', s(4)),
  crest: said('red crest', s(4)),
  straightUp: said('standing', s(4)),
  japan: said('japan', s(4)),
  earthquake: said('earthquake', s(4)),
  checked: said('scientists checked', s(4)),
  noLink: said('no link', s(4)),
  badDay: said('bad day', s(4)),
  // 5 · the game
  game: said('game', s(5)),
  eatUp: said('eat your way', s(5)),
  free: said('free', s(5)),
  // 6 · basking shark
  y1977: said('1977', s(6)),
  rotten: said('rotten', s(6)),
  neck: said('long neck', s(6)),
  flippers: said('flippers', s(6)),
  papers: said('the papers', s(6)),
  dinosaurs: said('dinosaurs', s(6)),
  mostLikely: said('most likely', s(6)),
  basking: said('basking', s(6)),
  thirty: said('thirty', s(6)),
  plankton: said('plankton', s(6)),
  rots: said('rots', s(6)),
  jaw: said('jaw', s(6)),
  plesiosaur: said('plesiosaur', s(6)),
  nessie: said('sorry', s(6)),
  // 7 · giant squid
  kraken: said('kraken', s(7)),
  y1750s: said('1750s', s(7)),
  around: said('around', s(7)),
  mistaking: said('mistaking', s(7)),
  islandWord: said('island', s(7)),
  realOne: said('the real one', s(7)),
  giantSquid: said('giant squid', s(7)),
  forty: said('forty', s(7)),
  plates: said('dinner', s(7)),
  colossal: said('colossal', s(7)),
  nobody: said('nobody', s(7)),
  y2012: said('2012', s(7)),
  dark: said('forty feet', said('2012', s(7))),
  watching: said('watching', s(7)),
  // 8 · sperm whale
  fiftyTwo: said('fifty-two', s(8)),
  hunts: said('hunts', s(8)),
  sperm: said('sperm', s(8)),
  brain: said('brain', s(8)),
  y1820: said('1820', s(8)),
  essex: said('essex', s(8)),
  twice: said('twice', s(8)),
  sank: said('sank', s(8)),
  drifted: said('the crew', s(8)),
  threeMonths: said('three months', s(8)),
  melville: said('thirty years', s(8)),
  mobyDick: said('moby-dick', s(8)),
  wasReal: said('so yes', s(8)),
  fight: said('but honestly', s(8)),
  // 9 · blue whale
  noSailor: said('and then', s(9)),
  blue: said('blue whale', s(9)),
  hundred: said('a hundred feet', s(9)),
  heavier: said('heavier', s(9)),
  heart: said('heart', s(9)),
  twoBeats: said('two beats', s(9)),
  biggestEver: said("it's the biggest", s(9)),
  seventeen: said('seventeen', s(9)),
  // 10 · the siphonophore
  wins: said('wins', s(10)),
  notLength: said('not on length', s(10)),
  y2020: said('2020', s(10)),
  filmed: said('filmed this', s(10)),
  string: said('pale string', s(10)),
  coiled: said('coiled', s(10)),
  oneFifty: said('a hundred and fifty', s(10)),
  longer: said('longer than', s(10)),
  siphonophore: said('siphonophore', s(10)),
  notOne: said("and it isn't", s(10)),
  clones: said('thousands', s(10)),
  oneJob: said('each with', s(10)),
  swim: said('some swim', s(10)),
  sting: said('some sting', s(10)),
  eat: said('some eat', s(10)),
  crowd: said('so is it', s(10)),
  argue: said('scientists still', s(10)),
  eitherWay: said('either way', s(10)),
  allReal: said('every monster', s(10)),
  weirder: said('the real ones', s(10)),
  // 11 · end
  end: said('every animal', s(11)),
} as const;

/** When each animal's section starts and when it's named, so the row knows when each one arrives. */
export const ARRIVE: Readonly<Record<Monster, number>> = {
  frilled: T.frilled - 0.3,
  manatee: T.manatees - 0.4,
  oarfish: T.oarfish - 0.6,
  basking: T.mostLikely,
  squid: T.realOne,
  sperm: T.fiftyTwo - 0.2,
  blue: T.blue - 0.6,
};
