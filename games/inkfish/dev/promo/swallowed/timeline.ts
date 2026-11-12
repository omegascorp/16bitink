import { FPS_LONG } from '../descent/frame';
import { SECTIONS, VOICE_S, WORDS } from './words';

/**
 * When everything happens, in seconds of the video, read off the narration
 * (words.ts) so every beat lands on the word that names it. Sections follow
 * script.md's blocks, 0-based: 0 cold open, 1 grouper + the game, 2 pike +
 * lionfish, 3 frogfish + pelican eel, 4 the black swallower and the end.
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

const s = (i: number): number => SECTIONS[i]!.start;
const e = (i: number): number => SECTIONS[i]!.end;

/** How long the end card holds after the last word: YouTube's shortest end screen. */
export const END_HOLD_S = 5;
export const VIDEO_S = Math.round((Math.max(WORDS[WORDS.length - 1]!.end, VOICE_S - 0.2) + END_HOLD_S) * FPS_LONG) / FPS_LONG;

export const T = {
  // 0 · cold open
  over: said('over', s(0)),
  balloon: said('balloon', s(0)),
  nobodyKnows: said('nobody knows', s(0)),
  fourTimes: said('four times', s(0)),
  soToday: said('so today', s(0)),
  smallest: said('smallest', s(0)),
  everyNumber: said('every number', s(0)),
  measuredOpen: said('measured', s(0)),
  // 1 · grouper + the game
  first: said('first', s(1)),
  goliath: said('goliath', s(1)),
  reeling: said('reeling', s(1)),
  grouperSwallowed: said('swallowed', s(1)),
  nobodyMeasured: said('nobody measured', s(1)),
  eight: said('eight', s(1)),
  atLeast: said('at least', s(1)),
  half: said('half', s(1)),
  quick: said('quick one', s(1)),
  eatUp: said('eat your way', s(1)),
  free: said('free', s(1)),
  gameEnd: e(1),
  // 2 · pike + lionfish
  pike: said('pike', s(2)),
  anotherPike: said('another pike', s(2)),
  pond: said('pond', s(2)),
  twoThirds: said('two-thirds', s(2)),
  siblings: said('worst siblings', s(2)),
  lionfish: said("and you've", s(2)),
  thirty: said('30', s(2)),
  couldnt: said("couldn't", s(2)),
  // 3 · frogfish + pelican eel
  frogfish: said('frogfish', s(3)),
  sits: said('sits', s(3)),
  bam: said('bam', s(3)),
  backbone: said('backbone', s(3)),
  itself: said('itself', s(3)),
  bigger: said('even bigger', s(3)),
  stretches: said('stretches', s(3)),
  soTheFish: said('so the fish', s(3)),
  biggestMouth: said('biggest mouth', s(3)),
  pelican: said('pelican', s(3)),
  crustaceans: said('crustaceans', s(3)),
  // 4 · the black swallower
  champion: said('champion', s(4)),
  swallower: said('black swallower', s(4)),
  y2007: said('2007', s(4)),
  mackerel: said('snake mackerel', s(4)),
  inches34: said('34', s(4)),
  fourHalf: said('four and a half', s(4)),
  folded: said('folded', s(4)),
  twist: said("here's the twist", s(4)),
  rot: said('rot', s(4)),
  floats: said('floats', s(4)),
  howMany: said("that's how", s(4)),
  fromJuly: said('so that little', s(4)),
  floatUp: said('float up', said('so that little', s(4))),
  outro: said('and if you like', s(4)),
  inkfishFree: said('InkFish', said('and if you like', s(4))),
} as const;

export const sectionStart = s;
export const sectionEnd = e;
